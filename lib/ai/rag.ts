import { generateText, stepCountIs, streamText, tool } from 'ai';
import { model } from '@/lib/openrouter';
import { retrieveRelevantChunks } from '@/lib/pinecone/utils';
import { stripSummaryMarkdownArtifacts } from '@/lib/format-plain-summary';
import { formatSourceListingLine } from '@/lib/format-source-title';
import { ScoredPineconeRecord, RecordMetadata } from '@pinecone-database/pinecone';
import { Chats } from '@/modules/chats/type';
import { z } from 'zod';

export type AgenticRagStreamEvent =
  | { type: 'task'; status: 'running' | 'done' | 'error'; title: string; detail?: string }
  | { type: 'source'; source: { title: string; href: string } }
  | { type: 'question'; question: AgenticQuestion }
  | { type: 'text'; text: string };

export type AgenticQuestionOption = {
  id: string;
  label: string;
};

export type AgenticQuestion = {
  id: string;
  question: string;
  options: AgenticQuestionOption[];
  customOptionLabel: string;
};

export function formatRetrievedContext(
  matches: ScoredPineconeRecord<RecordMetadata>[],
  maxCharsPerChunk: number = 1800,
  citationIndexByChunkId?: Map<string, number>
): string {
  return matches.map((m, index) => {
    const md = m.metadata || {};
    const score = (m.score || 0).toFixed(4);

    const text = String(md.text || '').substring(0, maxCharsPerChunk);

    const sourceBits: string[] = [];

    const keysToExtract = ["document_name", "section_path", "chunk_type", "effective_date"];
    for (const key of keysToExtract) {
      if (md[key]) {
        sourceBits.push(`${key}=${md[key]}`);
      }
    }

    const citationNumber = citationIndexByChunkId?.get(m.id) || (index + 1);

    return `[${citationNumber}] score=${score}\nchunk_id=${m.id}\n${sourceBits.join(' | ')}\n${text}`;
  }).join('\n\n');
}

export type RetrievedMatch = {
  id: string;
  score: number;
  metadata: Record<string, unknown>;
};

export interface AgenticKnowledgeDocument {
  name: string;
  namespace: string;
  description: string;
}

export interface AgenticRagFinishPayload {
  answer: string;
  matches: RetrievedMatch[];
}

export interface AgenticRagStreamParams {
  question: string;
  longTermMemory: string;
  shortTermMemory: Chats[] | [];
  availableDocuments: AgenticKnowledgeDocument[];
  defaultNamespaces: string[];
  topK?: number;
  onFinish?: (payload: AgenticRagFinishPayload) => Promise<void> | void;
}

type SummaryParams = {
  previousSummary: string;
  shortTermMemory: Chats[] | [];
  question: string;
  answer: string;
};

function normalizeNamespaces(values: string[]): string[] {
  return Array.from(new Set(values.map(v => v.trim()).filter(Boolean)));
}

function dedupeMatches(matches: RetrievedMatch[]): RetrievedMatch[] {
  const byId = new Map<string, RetrievedMatch>();

  for (const match of matches) {
    const existing = byId.get(match.id);
    if (!existing || match.score > existing.score) {
      byId.set(match.id, match);
    }
  }

  return Array.from(byId.values()).sort((a, b) => b.score - a.score);
}

function buildReferenceAppendix(
  answerText: string,
  citationMatchMap: Map<number, RetrievedMatch>
): string {
  if (/(^|\n)Referensi\s*:/i.test(answerText) && /-\s*\[\d+\]/.test(answerText)) {
    return answerText;
  }

  const citationRegex = /\[(\d+)\]/g;
  const citedNumbers = new Set<number>();

  for (const match of answerText.matchAll(citationRegex)) {
    const parsed = Number(match[1]);
    if (Number.isFinite(parsed)) {
      citedNumbers.add(parsed);
    }
  }

  const sortedCitations = Array.from(citedNumbers).sort((a, b) => a - b);
  if (sortedCitations.length === 0) {
    return answerText;
  }

  const referenceLines = sortedCitations
    .map((citationNumber) => {
      const match = citationMatchMap.get(citationNumber);
      if (!match) return null;

      const documentName = String(match.metadata.document_name || 'Dokumen Internal OJK');
      const sectionPath = String(match.metadata.section_path || '-');
      const chunkType = String(match.metadata.chunk_type || '-');

      return `- [${citationNumber}] ${documentName} | section: ${sectionPath} | type: ${chunkType}`;
    })
    .filter(Boolean)
    .join('\n');

  if (!referenceLines) {
    return answerText;
  }

  return `${answerText.trim()}\n\nReferensi:\n${referenceLines}`;
}

function buildDocsCatalog(docs: AgenticKnowledgeDocument[]): string {
  if (docs.length === 0) {
    return '- Belum ada dokumen yang terdaftar.';
  }

  return docs
    .map((doc, index) => {
      return `${index + 1}. namespace=${doc.namespace}\n   name=${doc.name}\n   description=${doc.description}`;
    })
    .join('\n');
}

function buildShortTermMemoryString(shortTermMemory: Chats[] | []): string {
  if (!shortTermMemory.length) {
    return 'Belum ada pesan terbaru.';
  }

  return shortTermMemory
    .map((message) => `${message.senderType ?? 'unknown'}: ${message.content ?? ''}`)
    .join('\n');
}

function shouldForceQuestionTool(question: string): boolean {
  const normalizedQuestion = question.toLowerCase();

  if (/^jawaban untuk pertanyaan\b/i.test(normalizedQuestion)) {
    return false;
  }

  const personalCasePattern =
    /\b(rekening saya|akun saya|uang saya|data saya|korban|kena tipu|kena penipuan|ditipu|tertipu|tipu|penipuan|scam|fraud|bodong|dibobol|uang hilang|hilang uang|rugi|kerugian|mau lapor|ingin lapor|bagaimana melapor|tidak tahu mau bagaimana|nggak tahu mau bagaimana|gak tahu mau bagaimana|tolong bantu|bantu saya|pinjol meneror|diteror|ancaman|transaksi mencurigakan|salah transfer)\b/i;
  const generalExplanationPattern =
    /\b(apa itu|jelaskan|definisi|contoh modus|tips|edukasi|literasi|peraturan|regulasi|pasal|syarat|prosedur umum)\b/i;

  return personalCasePattern.test(normalizedQuestion) && !generalExplanationPattern.test(normalizedQuestion);
}

function createQuestionId(question: string): string {
  const slug = question
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32);

  return `question-${slug || 'follow-up'}-${Date.now().toString(36)}`;
}

function normalizeQuestionToolInput(input: unknown): AgenticQuestion | null {
  if (typeof input !== 'object' || input === null) return null;

  const value = input as {
    question?: unknown;
    options?: unknown;
    customOptionLabel?: unknown;
  };
  const question = String(value.question || '').trim();
  if (!question) return null;

  const options = Array.isArray(value.options)
    ? value.options
        .map((option, index) => ({
          id: `option-${index + 1}`,
          label: String(option || '').trim(),
        }))
        .filter((option) => option.label.length > 0)
        .slice(0, 4)
    : [];

  if (options.length === 0) return null;

  const customOptionLabel = String(value.customOptionLabel || 'Tulis jawaban kamu').trim();

  return {
    id: createQuestionId(question),
    question,
    options,
    customOptionLabel: customOptionLabel || 'Tulis jawaban kamu',
  };
}

export function createAgenticRagStream(params: AgenticRagStreamParams) {
  const availableNamespaces = normalizeNamespaces(
    params.availableDocuments.map((doc) => doc.namespace)
  );
  const fallbackNamespaces = normalizeNamespaces([
    ...params.defaultNamespaces,
    ...availableNamespaces,
    process.env.PINECONE_NAMESPACE || 'pojk-22-2023-perlindungan-konsumen',
  ]);
  const namespaceSet = new Set(availableNamespaces);
  const topK = params.topK ?? 6;
  const shortTermMemoryStr = buildShortTermMemoryString(params.shortTermMemory);
  const docsCatalog = buildDocsCatalog(params.availableDocuments);
  const retrievedMatches: RetrievedMatch[] = [];
  const askedQuestions: AgenticQuestion[] = [];
  const citationIndexByChunkId = new Map<string, number>();
  const citationMatchMap = new Map<number, RetrievedMatch>();
  let nextCitationIndex = 1;
  const forceQuestionTool = shouldForceQuestionTool(params.question);

  const systemPrompt = `You are Sahabat Keuangan, an assistant for OJK.

You are allowed to use tools and decide the best strategy for each user question.

Decision policy:
- For casual/general queries, answer directly without tools.
- For policy, regulation, legal-financial, and internal-document questions, call retrieve_policy_context first.
- If answer confidence is low, call retrieve_policy_context before finalizing the answer.
- You may call the tool multiple times with refined queries.
- Ask follow-up questions frequently when the user describes a personal case, incident, complaint, fraud, loss, transaction problem, loan/investment issue, account problem, insurance claim, debt collection, bank/fintech/e-wallet problem, or says something broad like "Saya kena tipu", "Saya mau lapor", "Saya bermasalah", "akun saya dibobol", "uang saya hilang", or "pinjol meneror saya".
- For case intake, prefer ask_user_question before giving a final answer unless the user already provided enough specifics to act. Ask one focused question at a time, starting with the most important missing detail, such as case type, product/institution, chronology, amount/date, current status, or desired help.
- Keep case intake short: ask only 1 to 3 follow-up question turns for one case, then give practical next steps based on what is known.
- Use ask_user_question with up to four ready-made options because the interface always adds one custom answer option. Keep options short and mutually distinct. If you decide to ask_user_question, call that tool first in the assistant turn and do not write a final answer before or after it. After calling ask_user_question, do not guess; wait for the user's next answer.
- NEVER write a multiple-answer or multiple-choice question as a normal text response. ALWAYS use ask_user_question for any follow-up question that has selectable answers/options.
- A normal text response must not contain answer choices like "A/B/C", numbered options, radio options, "pilih salah satu", or similar multiple-answer question formats. Those must be sent only through ask_user_question.
- If the user answers a follow-up question through normal chat text, treat it as the answer to the pending question and continue the case intake or guidance.

Response rules:
- Respond in Indonesian.
- Keep responses clear, practical, and concise.
- Never reveal chain-of-thought, internal planning, or tool mechanics.
- If relevant context still does not contain the answer, reply exactly: "Saya tidak dapat menemukan informasi tersebut dalam dokumen kebijakan yang tersedia."
- If you used retrieved context, cite with chunk indices like [1], [2].
- Do not include a "Referensi" section in the answer. Source details are rendered separately by the interface.`;

  const userPrompt = `Long-term memory (summary):
${params.longTermMemory || 'Belum ada percakapan sebelumnya.'}

Short-term memory (last messages):
${shortTermMemoryStr}

Available knowledge base documents:
${docsCatalog}

Current user question:
${params.question}`;

  return streamText({
    model,
    system: systemPrompt,
    prompt: userPrompt,
    temperature: 0.2,
    topP: 0.9,
    stopWhen: forceQuestionTool ? stepCountIs(1) : stepCountIs(4),
    toolChoice: forceQuestionTool
      ? { type: 'tool', toolName: 'ask_user_question' }
      : 'auto',
    tools: {
      retrieve_policy_context: tool({
        description:
          'Retrieve policy/regulation chunks from vector database. Use this for OJK policy, compliance, legal, or document-grounded questions.',
        inputSchema: z.object({
          query: z.string().min(1),
          namespaces: z.array(z.string()).optional(),
          topK: z.number().int().min(1).max(12).optional(),
        }),
        execute: async ({ query, namespaces, topK: requestedTopK }) => {
          const validNamespaces = (namespaces || []).filter((ns) => namespaceSet.has(ns));
          const namespacesToUse = validNamespaces.length > 0 ? validNamespaces : fallbackNamespaces;

          console.log('[AgenticRAG][ToolCall] retrieve_policy_context', {
            query,
            namespacesRequested: namespaces || [],
            namespacesUsed: namespacesToUse,
            topK: requestedTopK || topK,
          });

          const matches = await retrieveRelevantChunks(
            query,
            namespacesToUse,
            requestedTopK || topK
          );

          const serializedMatches: RetrievedMatch[] = matches.map((match) => ({
            id: match.id,
            score: match.score || 0,
            metadata: (match.metadata || {}) as Record<string, unknown>,
          }));

          const sourcesWithCitation = serializedMatches.map((match) => {
            let citationNumber = citationIndexByChunkId.get(match.id);

            if (!citationNumber) {
              citationNumber = nextCitationIndex;
              nextCitationIndex++;
              citationIndexByChunkId.set(match.id, citationNumber);
              citationMatchMap.set(citationNumber, match);
            }

            const textPreview = String(match.metadata.text || '')
              .replace(/\s+/g, ' ')
              .trim()
              .slice(0, 400);

            return {
              citationNumber,
              citation: `[${citationNumber}]`,
              chunkId: match.id,
              score: Number(match.score.toFixed(4)),
              documentName: String(match.metadata.document_name || ''),
              sectionPath: String(match.metadata.section_path || ''),
              chunkType: String(match.metadata.chunk_type || ''),
              chunkIndex: match.metadata.chunk_index,
              textPreview,
            };
          });

          retrievedMatches.push(...serializedMatches);

          return {
            namespacesUsed: namespacesToUse,
            context: formatRetrievedContext(matches, 1800, citationIndexByChunkId),
            sources: sourcesWithCitation,
          };
        },
      }),
      ask_user_question: tool({
        description:
          'Ask the user a follow-up question with radio options. ALWAYS use this tool instead of normal text for clarification questions that include selectable answers/options.',
        inputSchema: z.object({
          question: z.string().min(1).max(220),
          options: z.array(z.string().min(1).max(80)).min(1).max(4),
          customOptionLabel: z.string().min(1).max(80).optional(),
        }),
        execute: async (input) => {
          const question = normalizeQuestionToolInput(input);
          if (question) {
            askedQuestions.push(question);
          }

          return {
            status: 'question_sent',
            instruction: 'Wait for the user to answer this question before continuing.',
            question,
          };
        },
      }),
    },
    onStepFinish: (step) => {
      console.log('[AgenticRAG][Step]', {
        stepNumber: step.stepNumber,
        finishReason: step.finishReason,
        reasoning: step.reasoningText || null,
        toolCalls: step.toolCalls.map((toolCall) => ({
          toolName: toolCall.toolName,
          input: toolCall.input,
        })),
        toolResults: step.toolResults.map((toolResult) => ({
          toolName: toolResult.toolName,
          outputSummary:
            typeof toolResult.output === 'object' && toolResult.output !== null
              ? {
                  namespacesUsed: (toolResult.output as { namespacesUsed?: string[] }).namespacesUsed,
                  sourceCount: Array.isArray((toolResult.output as { sources?: unknown[] }).sources)
                    ? (toolResult.output as { sources?: unknown[] }).sources?.length
                    : 0,
                }
              : toolResult.output,
        })),
      });
    },
    onFinish: async ({ text }) => {
      const trimmedText = text.trim();
      const latestQuestion = askedQuestions.at(-1);
      const answerText = latestQuestion
        ? `Pertanyaan lanjutan: ${latestQuestion.question}`
        : trimmedText;
      const answerWithReferences = buildReferenceAppendix(answerText, citationMatchMap);

      await params.onFinish?.({
        answer: answerWithReferences,
        matches: dedupeMatches(retrievedMatches),
      });
    },
  });
}

const encoder = new TextEncoder();

function formatAgenticEvent(event: AgenticRagStreamEvent): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
}

function getToolQuery(input: unknown): string {
  if (typeof input === 'object' && input !== null && 'query' in input) {
    return String((input as { query?: unknown }).query || '');
  }

  return '';
}

function getQuestionEvent(input: unknown): AgenticRagStreamEvent | null {
  const question = normalizeQuestionToolInput(input);
  if (!question) return null;

  return {
    type: 'question',
    question,
  };
}

function getSourceEvents(output: unknown): AgenticRagStreamEvent[] {
  if (typeof output !== 'object' || output === null || !('sources' in output)) {
    return [];
  }

  const sources = (output as { sources?: unknown }).sources;
  if (!Array.isArray(sources)) {
    return [];
  }

  return sources.flatMap((source) => {
    if (typeof source !== 'object' || source === null) return [];

    const item = source as {
      citation?: unknown;
      documentName?: unknown;
      sectionPath?: unknown;
      chunkType?: unknown;
      chunkIndex?: unknown;
      textPreview?: unknown;
    };
    const citation = String(item.citation || '');
    const documentName = String(item.documentName || 'Dokumen Internal OJK');
    const sectionPath = String(item.sectionPath || '');
    const chunkType = String(item.chunkType || '');
    const chunkIndex = item.chunkIndex;
    const textPreview = String(item.textPreview || '');

    return [{
      type: 'source' as const,
      source: {
        href: '#',
        title: formatSourceListingLine(citation, {
          documentName,
          sectionPath,
          chunkType,
          chunkIndex: chunkIndex as string | number | null | undefined,
          textPreview,
        }),
      },
    }];
  });
}

export function toAgenticEventStreamResponse(
  streamResult: ReturnType<typeof createAgenticRagStream>,
  headers: HeadersInit
) {
  const eventStream = streamResult.fullStream.pipeThrough(
    new TransformStream({
      transform(chunk, controller) {
        switch (chunk.type) {
          case 'start':
            controller.enqueue(formatAgenticEvent({
              type: 'task',
              status: 'running',
              title: 'Sedang berpikir',
            }));
            break;

          case 'tool-call': {
            if (chunk.toolName === 'ask_user_question') {
              controller.enqueue(formatAgenticEvent({
                type: 'task',
                status: 'running',
                title: 'Menyiapkan pertanyaan',
              }));
              const questionEvent = getQuestionEvent(chunk.input);
              if (questionEvent) {
                controller.enqueue(formatAgenticEvent(questionEvent));
              }
              break;
            }

            const query = getToolQuery(chunk.input);
            controller.enqueue(formatAgenticEvent({
              type: 'task',
              status: 'running',
              title: 'Mencari dokumen',
              detail: query ? `"${query}"` : undefined,
            }));
            break;
          }

          case 'tool-result':
            if (chunk.toolName === 'ask_user_question') {
              break;
            }

            controller.enqueue(formatAgenticEvent({
              type: 'task',
              status: 'done',
              title: 'Membaca dokumen',
            }));
            for (const event of getSourceEvents(chunk.output)) {
              controller.enqueue(formatAgenticEvent(event));
            }
            break;

          case 'text-start':
            controller.enqueue(formatAgenticEvent({
              type: 'task',
              status: 'running',
              title: 'Membuat jawaban',
            }));
            break;

          case 'text-delta':
            controller.enqueue(formatAgenticEvent({
              type: 'text',
              text: chunk.text,
            }));
            break;

          case 'tool-error':
          case 'error':
            controller.enqueue(formatAgenticEvent({
              type: 'task',
              status: 'error',
              title: 'Terjadi kendala saat memproses',
            }));
            break;
        }
      },
    })
  );

  return new Response(eventStream, {
    status: 200,
    headers: {
      ...headers,
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
    },
  });
}

export async function generateConversationSummary(params: SummaryParams): Promise<string> {
  const shortTermMemoryStr = buildShortTermMemoryString(params.shortTermMemory);

  const systemPrompt = `You summarize assistant conversations for memory updates.

Rules:
- Respond in Indonesian.
- Produce one concise cumulative summary paragraph.
- Keep important user intent, constraints, and resolved points.
- Plain text only: no markdown (no **, __, #, backticks, bullets, or link syntax).`;

  const userPrompt = `Previous summary:\n${params.previousSummary || 'Belum ada ringkasan sebelumnya.'}

Recent short-term messages:\n${shortTermMemoryStr}

Latest user question:\n${params.question}

Latest assistant answer:\n${params.answer}

Write an updated cumulative summary.`;

  try {
    const { text } = await generateText({
      model,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.1,
      topP: 0.9,
    });

    const summary = stripSummaryMarkdownArtifacts(text.trim());
    return summary || params.previousSummary || '';
  } catch {
    return params.previousSummary || '';
  }
}