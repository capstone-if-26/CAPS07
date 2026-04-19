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
  const systemPrompt = `You are an internal company policy assistant for Otoritas Jasa Keuangan (OJK).

Rules:
- Use STRICTLY the provided context.
- If the context does not contain the answer, reply exacty: "Saya tidak dapat menemukan informasi tersebut dalam dokumen kebijakan yang tersedia."
- Do not hallucinate, guess, or inject external knowledge.
- Cite chunk numbers like [1] when referencing specific rules.
- Maintain a formal, authoritative, and practical tone in Indonesian.

Always respond in STRICT JSON.
Do not include markdown, explanation, or extra text.
Only output valid JSON.
Format WAJIB:
{
  "answer": "<jawaban utama ke user>",
  "summary": "<ringkasan kumulatif percakapan terbaru>"
}
`;

  // 4. Injeksi Kueri dan Konteks ke User Prompt
  const userPrompt = `Long-term memory (summary):\n${longTermMemory || 'Belum ada percakapan sebelumnya.'}\n\nShort-term memory (last messages):\n${shortTermMemoryStr || 'Belum ada pesan terbaru.'}\n\nCurrent Question:\n${question}\n\nContext:\n${contextText}\n\nInstruction: Output strictly JSON with answer and summary fields.`;

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

  const systemPrompt = `You are a helpful and intelligent assistant for Otoritas Jasa Keuangan (OJK).
You are answering a general/casual query. Be polite and concise in Indonesian.
  
Always respond in STRICT JSON.
Do not include markdown, explanation, or extra text.
Only output valid JSON.
Format WAJIB:
{
  "answer": "<jawaban utama ke user>",
  "summary": "<ringkasan kumulatif percakapan terbaru>"
}
`;

  const userPrompt = `Long-term memory (summary):\n${longTermMemory || 'Belum ada percakapan sebelumnya.'}\n\nShort-term memory (last messages):\n${shortTermMemoryStr || 'Belum ada pesan terbaru.'}\n\nCurrent Question:\n${question}\n\nInstruction: Output strictly JSON with answer and summary fields.`;

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