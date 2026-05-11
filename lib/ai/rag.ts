import { generateText, stepCountIs, streamText, tool } from "ai";
import { model } from "@/lib/openrouter";
import { retrieveRelevantChunks } from "@/lib/pinecone/utils";
import { stripSummaryMarkdownArtifacts } from "@/lib/format-plain-summary";
import { z } from "zod";

import type {
  AgenticQuestion,
  AgenticRagStreamParams,
  RetrievedMatch,
  SummaryParams,
} from "./type";

import {
  normalizeNamespaces,
  dedupeMatches,
  formatRetrievedContext,
  buildReferenceAppendix,
  buildDocsCatalog,
  buildShortTermMemoryString,
  shouldForceQuestionTool,
  normalizeQuestionToolInput,
  formatAgenticEvent,
  getToolQuery,
  getQuestionEvent,
  getSourceEvents,
} from "./utils";
import {
  getAgenticRagPrompt,
  getCreateQuizPrompt,
  getGenerateConversationSummaryPrompt,
} from "./prompts";
import { ASK_USER_QUESTION_TOOL_DESCRIPTION, RETRIEVE_POLICY_CONTEXT_DESCRIPTION } from "./constants";

export type {
  AgenticRagStreamEvent,
  AgenticQuestionOption,
  AgenticQuestion,
  RetrievedMatch,
  AgenticKnowledgeDocument,
  AgenticRagFinishPayload,
  AgenticRagStreamParams,
} from "./type";

export { formatRetrievedContext } from "./utils";

export function createAgenticRagStream(params: AgenticRagStreamParams) {
  const availableNamespaces = normalizeNamespaces(
    params.availableDocuments.map((doc) => doc.namespace),
  );
  const fallbackNamespaces = normalizeNamespaces([
    ...params.defaultNamespaces,
    ...availableNamespaces,
    process.env.PINECONE_NAMESPACE || "pojk-22-2023-perlindungan-konsumen",
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

  const { systemPrompt, userPrompt } = getAgenticRagPrompt(
    params.longTermMemory,
    shortTermMemoryStr,
    docsCatalog,
    params.question,
  );

  return streamText({
    model,
    system: systemPrompt,
    prompt: userPrompt,
    temperature: 0.2,
    topP: 0.9,
    stopWhen: forceQuestionTool ? stepCountIs(1) : stepCountIs(4),
    toolChoice: forceQuestionTool
      ? { type: "tool", toolName: "ask_user_question" }
      : "auto",
    tools: {
      retrieve_policy_context: tool({
        description: RETRIEVE_POLICY_CONTEXT_DESCRIPTION,
        inputSchema: z.object({
          query: z.string().min(1),
          namespaces: z.array(z.string()).optional(),
          topK: z.number().int().min(1).max(12).optional(),
        }),
        execute: async ({ query, namespaces, topK: requestedTopK }) => {
          const validNamespaces = (namespaces || []).filter((ns) =>
            namespaceSet.has(ns),
          );
          const namespacesToUse =
            validNamespaces.length > 0 ? validNamespaces : fallbackNamespaces;

          console.log("[AgenticRAG][ToolCall] retrieve_policy_context", {
            query,
            namespacesRequested: namespaces || [],
            namespacesUsed: namespacesToUse,
            topK: requestedTopK || topK,
          });

          const matches = await retrieveRelevantChunks(
            query,
            namespacesToUse,
            requestedTopK || topK,
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

            const textPreview = String(match.metadata.text || "")
              .replace(/\s+/g, " ")
              .trim()
              .slice(0, 400);

            return {
              citationNumber,
              citation: `[${citationNumber}]`,
              chunkId: match.id,
              score: Number(match.score.toFixed(4)),
              documentName: String(match.metadata.document_name || ""),
              sectionPath: String(match.metadata.section_path || ""),
              chunkType: String(match.metadata.chunk_type || ""),
              chunkIndex: match.metadata.chunk_index,
              textPreview,
            };
          });

          retrievedMatches.push(...serializedMatches);

          return {
            namespacesUsed: namespacesToUse,
            context: formatRetrievedContext(
              matches,
              1800,
              citationIndexByChunkId,
            ),
            sources: sourcesWithCitation,
          };
        },
      }),
      ask_user_question: tool({
        description: ASK_USER_QUESTION_TOOL_DESCRIPTION,
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
            status: "question_sent",
            instruction:
              "Wait for the user to answer this question before continuing.",
            question,
          };
        },
      }),
    },
    onStepFinish: (step) => {
      console.log("[AgenticRAG][Step]", {
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
            typeof toolResult.output === "object" && toolResult.output !== null
              ? {
                  namespacesUsed: (
                    toolResult.output as { namespacesUsed?: string[] }
                  ).namespacesUsed,
                  sourceCount: Array.isArray(
                    (toolResult.output as { sources?: unknown[] }).sources,
                  )
                    ? (toolResult.output as { sources?: unknown[] }).sources
                        ?.length
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
      const answerWithReferences = buildReferenceAppendix(
        answerText,
        citationMatchMap,
      );

      await params.onFinish?.({
        answer: answerWithReferences,
        matches: dedupeMatches(retrievedMatches),
      });
    },
  });
}

export function toAgenticEventStreamResponse(
  streamResult: ReturnType<typeof createAgenticRagStream>,
  headers: HeadersInit,
) {
  const eventStream = streamResult.fullStream.pipeThrough(
    new TransformStream({
      transform(chunk, controller) {
        switch (chunk.type) {
          case "start":
            controller.enqueue(
              formatAgenticEvent({
                type: "task",
                status: "running",
                title: "Sedang berpikir",
              }),
            );
            break;

          case "tool-call": {
            if (chunk.toolName === "ask_user_question") {
              controller.enqueue(
                formatAgenticEvent({
                  type: "task",
                  status: "running",
                  title: "Menyiapkan pertanyaan",
                }),
              );
              const questionEvent = getQuestionEvent(chunk.input);
              if (questionEvent) {
                controller.enqueue(formatAgenticEvent(questionEvent));
              }
              break;
            }

            const query = getToolQuery(chunk.input);
            controller.enqueue(
              formatAgenticEvent({
                type: "task",
                status: "running",
                title: "Mencari dokumen",
                detail: query ? `"${query}"` : undefined,
              }),
            );
            break;
          }

          case "tool-result":
            if (chunk.toolName === "ask_user_question") {
              break;
            }

            controller.enqueue(
              formatAgenticEvent({
                type: "task",
                status: "done",
                title: "Membaca dokumen",
              }),
            );
            for (const event of getSourceEvents(chunk.output)) {
              controller.enqueue(formatAgenticEvent(event));
            }
            break;

          case "text-start":
            controller.enqueue(
              formatAgenticEvent({
                type: "task",
                status: "running",
                title: "Membuat jawaban",
              }),
            );
            break;

          case "text-delta":
            controller.enqueue(
              formatAgenticEvent({
                type: "text",
                text: chunk.text,
              }),
            );
            break;

          case "tool-error":
          case "error":
            controller.enqueue(
              formatAgenticEvent({
                type: "task",
                status: "error",
                title: "Terjadi kendala saat memproses",
              }),
            );
            break;
        }
      },
    }),
  );

  return new Response(eventStream, {
    status: 200,
    headers: {
      ...headers,
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}

export async function generateConversationSummary(
  params: SummaryParams,
): Promise<string> {
  const shortTermMemoryStr = buildShortTermMemoryString(params.shortTermMemory);

  const { systemPrompt, userPrompt } = getGenerateConversationSummaryPrompt(
    params.previousSummary,
    shortTermMemoryStr,
    params.question,
    params.answer,
  );

  try {
    const { text } = await generateText({
      model,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.1,
      topP: 0.9,
    });

    const summary = stripSummaryMarkdownArtifacts(text.trim());
    return summary || params.previousSummary || "";
  } catch {
    return params.previousSummary || "";
  }
}

export async function generateQuiz(chats: string) {
  const { systemPrompt, userPrompt } = getCreateQuizPrompt(chats);

  try {
    const { text } = await generateText({
      model,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.1,
      topP: 0.8,
      presencePenalty: 0,
      frequencyPenalty: 0,
    });

    const sanitizedText = text
      .replace(/```json/gi, "")
      .replace(/```/gi, "")
      .trim();
    const parsedObject = JSON.parse(sanitizedText);
    if (!parsedObject.quiz || !Array.isArray(parsedObject.quiz)) {
      throw new Error(
        "Skema JSON yang dihasilkan LLM tidak valid atau kehilangan array 'quiz'.",
      );
    }

    return parsedObject.quiz;
  } catch (error) {
    throw new Error(
      `Gagal menghasilkan kuis: ${error instanceof Error ? error.message : "Parsing JSON gagal"}`,
    );
  }
}
