import { generateText, stepCountIs, streamText, tool } from 'ai';
import { model } from '@/lib/openrouter';
import { retrieveRelevantChunks } from '@/lib/pinecone/utils';
import { ScoredPineconeRecord, RecordMetadata } from '@pinecone-database/pinecone';
import { Chats } from '@/modules/chats/type';
import { z } from 'zod';

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
  intent: string;
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
  const citationIndexByChunkId = new Map<string, number>();
  const citationMatchMap = new Map<number, RetrievedMatch>();
  let nextCitationIndex = 1;

  const systemPrompt = `You are Sahabat Keuangan, an assistant for OJK.

You are allowed to use tools and decide the best strategy for each user question.

Decision policy:
- For casual/general queries, answer directly without tools.
- For policy, regulation, legal-financial, and internal-document questions, call retrieve_policy_context first.
- If answer confidence is low, call retrieve_policy_context before finalizing the answer.
- You may call the tool multiple times with refined queries.

Response rules:
- Respond in Indonesian.
- Keep responses clear, practical, and concise.
- Never reveal chain-of-thought, internal planning, or tool mechanics.
- If relevant context still does not contain the answer, reply exactly: "Saya tidak dapat menemukan informasi tersebut dalam dokumen kebijakan yang tersedia."
- If you used retrieved context, cite with chunk indices like [1], [2].
- After your answer, include a short "Referensi" section that maps each used citation number to document name and section path.
- The reference format must be markdown bullets, for example: "- [1] POJK X | section: Bab I/Definisi".`;

  const userPrompt = `Long-term memory (summary):
${params.longTermMemory || 'Belum ada percakapan sebelumnya.'}

Short-term memory (last messages):
${shortTermMemoryStr}

Available knowledge base documents:
${docsCatalog}

Current user question:
${params.question}`;

  const promptWithIntent = `${userPrompt}

Recognized intent category: ${params.intent}`;

  return streamText({
    model,
    system: systemPrompt,
    prompt: promptWithIntent,
    temperature: 0.2,
    topP: 0.9,
    stopWhen: stepCountIs(4),
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

            return {
              citationNumber,
              citation: `[${citationNumber}]`,
              chunkId: match.id,
              score: Number(match.score.toFixed(4)),
              documentName: String(match.metadata.document_name || ''),
              sectionPath: String(match.metadata.section_path || ''),
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
      const answerWithReferences = buildReferenceAppendix(text.trim(), citationMatchMap);

      await params.onFinish?.({
        answer: answerWithReferences,
        matches: dedupeMatches(retrievedMatches),
      });
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
- Do not use markdown or bullet points.`;

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

    const summary = text.trim();
    return summary || params.previousSummary || '';
  } catch {
    return params.previousSummary || '';
  }
}