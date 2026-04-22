import { generateText } from 'ai';
import { model } from '@/lib/openrouter';
import { retrieveRelevantChunks } from '@/lib/pinecone/utils';
import { ScoredPineconeRecord, RecordMetadata } from '@pinecone-database/pinecone';
import { Chats } from '@/modules/chats/type';

/**
 * Menyusun potongan dokumen (chunks) menjadi sebuah string teks kohesif 
 * agar bisa disuntikkan ke dalam Context Window LLM.
 */
export function formatRetrievedContext(
  matches: ScoredPineconeRecord<RecordMetadata>[],
  maxCharsPerChunk: number = 1800 // Membatasi ukuran konteks untuk mencegah Context Overflow
): string {
  return matches.map((m, index) => {
    const md = m.metadata || {};
    const score = (m.score || 0).toFixed(4);

    // Potong teks jika terlalu panjang
    const text = String(md.text || '').substring(0, maxCharsPerChunk);

    const sourceBits: string[] = [];

    // Mengekstrak metadata yang relevan berdasarkan skema Typescript kita
    const keysToExtract = ["document_name", "section_path", "chunk_type", "effective_date"];
    for (const key of keysToExtract) {
      if (md[key]) {
        sourceBits.push(`${key}=${md[key]}`);
      }
    }

    // Format output dengan referensi indeks [1], [2], dst untuk sitasi
    return `[${index + 1}] score=${score}\nchunk_id=${m.id}\n${sourceBits.join(' | ')}\n${text}`;
  }).join('\n\n');
}

export interface RagResponse {
  question: string;
  answer: string;
  summary: string;
  matches: {
    id: string;
    score: number;
    metadata: Record<string, unknown>;
  }[];
}

/**
 * End-to-End RAG Pipeline: Vector Retrieval + Context Formatting + LLM Generation
 */
export async function generateRagAnswer(
  question: string,
  namespaces: string[],
  longTermMemory: string,
  shortTermMemory: Chats[] | [],
  topK: number = 6
): Promise<RagResponse> {

  // 1. Ambil dokumen relevan dari Pinecone
  const matches = await retrieveRelevantChunks(question, namespaces, topK);

  // 2. Format menjadi konteks string
  const contextText = formatRetrievedContext(matches);

  // Format short term memory string
  const shortTermMemoryStr = shortTermMemory.map(m => `${m.senderType}: ${m.content}`).join('\n');

  // 3. Konfigurasi System Prompt
  const systemPrompt = `
    You are an internal company policy assistant for Otoritas Jasa Keuangan (OJK).

    === FUNDAMENTAL RULES ===
    1. SOURCE OF TRUTH: You must extract facts and answer the question STRICTLY using the provided "Context" block. 
    2. STRUCTURAL FREEDOM: While facts must be strictly extracted from the Context, you have FULL AUTHORITY to reformat, decompress, and restructure flattened text into readable formats. DO NOT copy flattened inline lists verbatim.
    3. ROLE OF MEMORY: Use "Long-term memory" and "Short-term memory" ONLY to understand the flow of conversation or resolve pronouns (e.g., "itu", "dia"). Do NOT use memory as a source of factual answers.
    4. NO HALLUCINATION: If the "Context" block does not contain the answer, you must output EXACTLY: "Saya tidak dapat menemukan informasi tersebut dalam dokumen kebijakan yang tersedia." Do not guess.
    5. TONE: Maintain a formal, authoritative, and practical tone in Indonesian.

    === INLINE DE-FLATTENING & FORMATTING RULES (CRITICAL) ===
    Chunking algorithms often compress lists into a single paragraph. You MUST decompress these back into readable bullet points.

    1. INLINE LIST CONVERSION: 
      If you detect inline enumerations such as 1., 2., (1), (2), a., b., 1), 2), i., ii., etc inside a paragraph, you MUST break them down into standard Markdown bullet points ("- ").
      
      EXAMPLE TRANSFORMATION:
      Context text: "Ketentuan meliputi: (1) Pelindungan sesuai Pasal 97; (2) Aturan lama berlaku; (3) Definisi baru."
      Your Output Action: Convert into bullet points separated by the literal JSON newline character (\n).
      Desired Result in JSON: "Ketentuan meliputi:\n- Pelindungan sesuai Pasal 97\n- Aturan lama berlaku\n- Definisi baru"

    2. JSON NEWLINE USAGE:
      Since your output is strictly JSON, you must use the exact string "\n" to represent a line break. Do NOT output raw formatting or actual line breaks that would invalidate JSON parsing.
      
    3. ENUMERATIONS USAGE:
      - Use bullet points ONLY for actual lists (multiple items of the same type).
      - Preserve high-level sections as plain text (e.g., "Definisi:", "Fungsi:").

    4. FORBIDDEN:
      - DO NOT flatten everything into bullets
      - DO NOT convert section titles and new paragraph into bullet points
      - DO NOT invent structure not present in Context

    === CONTEXT SWITCHING & SUMMARY RULES ===
    Analyze the "Current Question" against the "Memory":
    - CASE A (Continuation): If the current question is related to the memory, answer it using the context, and UPDATE the existing summary by adding the new key takeaway.
    - CASE B (Context Drift / New Topic): If the current question has completely NO relationship with the memory, treat it as a brand-new topic. DO NOT force a connection. For the summary, APPEND the new topic to the existing summary without deleting the history of previous topics. 

    === OUTPUT FORMAT ===
    You must respond STRICTLY in valid JSON format.
    Do not include markdown wrappers (like \`\`\`json), explanations, or extra text.
    Only output valid JSON.

    {
      "answer": "<The factual answer derived strictly from Context, or the exact fallback phrase if not found>",
      "summary": "<The cumulative summary. Maintain a running list of topics discussed so far, updated with the latest interaction. Keep it concise.>"
    }`;

  // 4. Injeksi Kueri dan Konteks ke User Prompt
  const userPrompt = `
    --- PAST CONVERSATION STATE ---
    [Long-Term Memory (Cumulative Summary)]:
    ${longTermMemory || 'Belum ada topik sebelumnya.'}

    [Short-Term Memory (Recent Messages)]:
    ${shortTermMemoryStr || 'Belum ada pesan terbaru.'}

    --- CURRENT TASK ---
    [Current Question]:
    ${question}

    [Context (Policy Documents)]:
    ${contextText}
  `;

  // 5. Eksekusi LLM via Vercel AI SDK dengan Retry (Maks 2x Retry)
  let attempt = 0;
  const maxRetries = 2;
  let parsedResult = { answer: '', summary: '' };

  while (attempt <= maxRetries) {
    try {
      const { text } = await generateText({
        model: model,
        system: systemPrompt,
        prompt: userPrompt,
        temperature: 0.1,
        topP: 0.9,
        topK: 5,
      });
      // bersihkan text dari kemungkinan markdown code block
      const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedResult = JSON.parse(cleanText);

      if (!parsedResult.answer || typeof parsedResult.summary !== 'string') {
        throw new Error('Invalid JSON format keys: answer and summary are missing');
      }
      break;
    } catch (err) {
      attempt++;
      if (attempt > maxRetries) {
        throw new Error(`LLM Error / Failed to parse JSON after 3 attempts. Last error: ${err}`);
      }
      // wait a bit before retry just in case
      await new Promise(res => setTimeout(res, 1000));
    }
  }

  return {
    question,
    answer: parsedResult.answer,
    summary: parsedResult.summary,
    matches: matches.map(m => ({
      id: m.id,
      score: m.score || 0,
      metadata: m.metadata || {}
    }))
  };
}

/**
 * Generate answer directly without retrieving from Pinecone namespaces
 * used for casual or general non-business questions.
 */
export async function generateDirectAnswer(
  question: string,
  longTermMemory: string,
  shortTermMemory: Chats[] | []
): Promise<RagResponse> {
  const shortTermMemoryStr = shortTermMemory.map(m => `${m.senderType}: ${m.content}`).join('\n');

  const systemPrompt = `
    You are a professional conversational assistant for Otoritas Jasa Keuangan (OJK).

    === FUNDAMENTAL RULES ===
    1. CONVERSATIONAL MODE: You are handling a casual greeting, conversational feedback, or an out-of-context query. There is NO policy document provided.
    2. APPROPRIATE RESPONSE: Respond naturally, politely, and professionally in formal Indonesian. Acknowledge greetings or feedback gracefully. 
    3. BOUNDARIES: Do NOT attempt to answer specific policy or procedural questions here. If the user asks a specific business question by mistake, politely instruct them to ask the question clearly so the retrieval system can process it.

    === CONTEXT SWITCHING & SUMMARY RULES ===
    Analyze the "Current Question" against the "Memory":
    - CASE A (Continuation): If the current message is a follow-up or feedback to the memory, acknowledge it and UPDATE the existing summary.
    - CASE B (Context Drift / New Topic): If it's a completely new casual topic (like a greeting), respond appropriately and APPEND this interaction to the summary.

    === OUTPUT FORMAT ===
    You must respond STRICTLY in valid JSON format.
    Do not include markdown wrappers (like \`\`\`json).
    Only output valid JSON.
    
    {
      "answer": "<The appropriate response to the user>",
      "summary": "<The updated cumulative summary>"
    }
  `;

  const userPrompt = `
    --- PAST CONVERSATION STATE ---
    [Long-Term Memory (Cumulative Summary)]:
    ${longTermMemory || 'Belum ada topik sebelumnya.'}

    [Short-Term Memory (Recent Messages)]:
    ${shortTermMemoryStr || 'Belum ada pesan terbaru.'}

    --- CURRENT TASK ---
    [Current Question]:
    ${question}
    `;

  let attempt = 0;
  const maxRetries = 2;
  let parsedResult = { answer: '', summary: '' };

  while (attempt <= maxRetries) {
    try {
      const { text } = await generateText({
        model: model,
        system: systemPrompt,
        prompt: userPrompt,
        temperature: 0.1,
        topP: 0.9,
      });
      const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedResult = JSON.parse(cleanText);

      if (!parsedResult.answer || typeof parsedResult.summary !== 'string') {
        throw new Error('Invalid JSON format keys: answer and summary are missing');
      }
      break;
    } catch (err) {
      attempt++;
      if (attempt > maxRetries) {
        throw new Error(`LLM Error / Failed to parse JSON after 3 attempts. Last error: ${err}`);
      }
      await new Promise(res => setTimeout(res, 1000));
    }
  }

  return {
    question,
    answer: parsedResult.answer,
    summary: parsedResult.summary,
    matches: [] // No matches since no retrieval was performed
  };
}