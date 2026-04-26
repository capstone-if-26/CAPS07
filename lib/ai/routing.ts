import { generateText } from "ai";
import { routingModel } from "@/lib/openrouter";
import { getRoutingPrompt } from "./prompts";

export interface DocumentInfo {
  name: string;
  namespace: string;
  description: string;
}

export interface RoutingResult {
  intent: "general" | "casual" | "business";
  confidence: number;
  reason: string;
  needs_namespace_routing: boolean;
  namespaces?: string[];
  rewritten_query: string;
  sub_intent?: string | null;
}

export async function routeIntentAndNamespaces(
  query: string,
  documents: DocumentInfo[],
  longTermMemory: string = "",
  shortTermMemory: any[] = [],
): Promise<RoutingResult> {
  if (!documents || documents.length === 0) {
    return {
      intent: "general",
      confidence: 1.0,
      reason: "No documents available",
      needs_namespace_routing: false,
      rewritten_query: query,
    };
  }

  const docsContext = documents
    .map(
      (doc) =>
        `Name: ${doc.name}\nNamespace: ${doc.namespace}\nDescription: ${doc.description}`,
    )
    .join("\n---\n");

  const { systemPrompt, userPrompt } = getRoutingPrompt(
    docsContext,
    query,
    longTermMemory,
    shortTermMemory,
  );

  let attempt = 0;
  const maxRetries = 2;

  while (attempt <= maxRetries) {
    try {
      const { text } = await generateText({
        model: routingModel,
        system: systemPrompt,
        prompt: userPrompt,
        temperature: 0,
        topP: 1,
        topK: 2,
        seed: 42,
      });

      const cleanText = text
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
      const parsedResult: RoutingResult = JSON.parse(cleanText);

      // Validate intent
      const validIntents = ["general", "casual", "business"];
      if (!validIntents.includes(parsedResult.intent)) {
        return {
          intent: "general",
          confidence: 0.0,
          reason: "Invalid intent from model",
          needs_namespace_routing: false,
          rewritten_query: query,
        };
      }

      // Namespace filtering (anti hallucination)
      if (parsedResult.intent === "business") {
        const validNamespaces = documents.map((d) => d.namespace);

        parsedResult.namespaces = Array.isArray(parsedResult.namespaces)
          ? parsedResult.namespaces.filter((ns) => validNamespaces.includes(ns))
          : [];
      } else {
        delete parsedResult.namespaces;
      }

      return parsedResult;
    } catch (err) {
      attempt++;

      if (attempt > maxRetries) {
        console.error("LLM Routing failed:", err);

        return {
          intent: "general",
          confidence: 0.0,
          reason: "Fallback due to routing error",
          needs_namespace_routing: false,
          rewritten_query: query,
        };
      }

      await new Promise((res) => setTimeout(res, 1000));
    }
  }

  return {
    intent: "general",
    confidence: 0.0,
    reason: "Unexpected fallback",
    needs_namespace_routing: false,
    rewritten_query: query,
  };
}
