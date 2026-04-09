import { generateText } from 'ai';
import { routingModel } from '@/lib/openrouter';

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
}

export async function routeIntentAndNamespaces(
  query: string,
  documents: DocumentInfo[]
): Promise<RoutingResult> {
  if (!documents || documents.length === 0) {
    return { 
      intent: "general", 
      confidence: 1.0, 
      reason: "No documents available", 
      needs_namespace_routing: false 
    };
  }

  const docsContext = documents.map(doc => 
    `Name: ${doc.name}\nNamespace: ${doc.namespace}\nDescription: ${doc.description}`
  ).join('\n---\n');

  const systemPrompt = `You are a strict intent classification and routing system.

    Your job has TWO DISTINCT STEPS:

    STEP 1 — INTENT CLASSIFICATION (MANDATORY, DO NOT SKIP):
    Classify the user query into ONE of these:

    - "casual": greetings, small talk, chit-chat
    - "general": public/general knowledge that does NOT depend on internal/company-specific documents
    - "business": ANY query that references, depends on, or is likely related to internal documents, regulations, policies, or domain-specific knowledge

    CRITICAL RULES:
    - If the query mentions ANY specific document, regulation, law, policy, code, or internal terminology → MUST be "business"
    - If the query requires domain-specific knowledge (legal, financial regulation, internal SOP, etc.) → MUST be "business"
    - DO NOT downgrade to "general" just because documents may be incomplete or unclear
    - DO NOT evaluate whether the documents contain the answer — ONLY classify intent

    STEP 2 — NAMESPACE ROUTING:
    - ONLY if intent = "business"
    - Select relevant namespaces from the list
    - If unsure, return an EMPTY array (do NOT change intent)

    Available documents:
    ---
    ${docsContext}
    ---

    STRICT OUTPUT FORMAT:
    {
      "intent": "general" | "casual" | "business",
      "confidence": number,
      "reason": "Short explanation focused ONLY on intent classification",
      "needs_namespace_routing": boolean,
      "namespaces": string[] // ONLY if intent = "business"
    }

    IMPORTANT:
    - Intent classification MUST be independent from document completeness
    - DO NOT say documents are insufficient as a reason to change intent
    - DO NOT output anything except JSON
    `;

  let attempt = 0;
  const maxRetries = 2;

  while (attempt <= maxRetries) {
    try {
      const { text } = await generateText({
        model: routingModel,
        system: systemPrompt,
        prompt: `User query: ${query}\n\nInstruction: Output strictly JSON with namespaces and reason fields.`,
        temperature: 0.1,
        topP: 0.9,
      });

      const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedResult: RoutingResult = JSON.parse(cleanText);

      // Validate intent
      const validIntents = ["general", "casual", "business"];
      if (!validIntents.includes(parsedResult.intent)) {
        return {
          intent: "general",
          confidence: 0.0,
          reason: "Invalid intent from model",
          needs_namespace_routing: false
        };
      }

      // Namespace filtering (anti hallucination)
      if (parsedResult.intent === "business") {
        const validNamespaces = documents.map(d => d.namespace);

        parsedResult.namespaces = Array.isArray(parsedResult.namespaces)
          ? parsedResult.namespaces.filter(ns => validNamespaces.includes(ns))
          : [];
      } else {
        delete parsedResult.namespaces;
      }

      return parsedResult;

    } catch (err) {
      attempt++;

      if (attempt > maxRetries) {
        console.error('LLM Routing failed:', err);

        return { 
          intent: "general",
          confidence: 0.0,
          reason: "Fallback due to routing error",
          needs_namespace_routing: false
        };
      }

      await new Promise(res => setTimeout(res, 1000));
    }
  }

  return {
    intent: "general",
    confidence: 0.0,
    reason: "Unexpected fallback",
    needs_namespace_routing: false
  };
}