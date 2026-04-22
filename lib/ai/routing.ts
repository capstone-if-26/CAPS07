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
  rewritten_query: string;
}

export async function routeIntentAndNamespaces(
  query: string,
  documents: DocumentInfo[],
  longTermMemory: string = "",
  shortTermMemory: any[] = []
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

  const docsContext = documents.map(doc =>
    `Name: ${doc.name}\nNamespace: ${doc.namespace}\nDescription: ${doc.description}`
  ).join('\n---\n');

  const systemPrompt = `
    You are an advanced Contextual Query Rewriter and Semantic Router Agent. 
    Your objective is to analyze the user's latest input, map it against the available internal knowledge inventory, determine its semantic intent, and reconstruct the query into a formal format.

    === 1. KNOWLEDGE INVENTORY (AVAILABLE NAMESPACES) ===
    You must read and understand these available documents BEFORE analyzing the query.
    ---
    ${docsContext}
    ---

    === 2. INPUT DATA ===
    - Long-Term Memory (LTM): ${longTermMemory}
    - Short-Term Memory (STM): ${JSON.stringify(shortTermMemory)}
    - Current Message: ${query}

    === 3. PROCESSING LOGIC & COGNITIVE SEQUENCE ===

    STEP A: Context Adhesion (Memory Check)
    Evaluate if the Current Message relies on STM/LTM. If yes, resolve missing subjects or implicit references. 

    STEP B:SYNONYM NORMALIZATION (MANDATORY PREPROCESSING)
    Before performing Inventory Matching, you MUST normalize informal or synonymous terms into their formal domain equivalents.

    Apply the following mappings strictly:

    - "pinjol" → "fintech lending"
    - "pinjaman online" → "fintech lending"
    - "financial technology lending" → "fintech lending"

    Rules:
    1. ALWAYS replace informal terms with the standardized term.
    2. DO NOT keep the original informal term in the rewritten query.
    3. DO NOT include both versions (no duplication like "fintech lending (pinjol)").
    4. Apply normalization BEFORE intent classification and rewriting.

    STEP C: Inventory Matching (Crucial Step)
    Scan the resolved query. Does it mention, imply, or conceptually align with ANY of the documents or entities listed in the KNOWLEDGE INVENTORY? 
    (e.g., specific regulations, OJK, POJK, SEOJK, SLIK, iDebKu, pinjol, fintech, SIPENA OJK, SPRINT OJK, IASC, or general financial/legal policies).

    STEP D: Intent Classification
    Based strictly on the result of STEP B, classify the intent:
    - "business": If there is ANY alignment with the Knowledge Inventory, or if it requires domain-specific internal knowledge. (MANDATORY if internal terms are detected).
    - "general": Public knowledge strictly outside the scope of the Knowledge Inventory.
    - "casual": Greetings, small talk, conversational feedback.

    STEP E: Query Rewriting
    - If Continuation: Inject specific entities from STM/LTM into the Current Message. Rewrite into formal, academic Indonesian.
    - If Context Drift: DO NOT inject past context. Rewrite ONLY the Current Message into formal, academic Indonesian.

    === 4. STRICT OUTPUT FORMAT ===
    You must output ONLY valid JSON. 
    CRITICAL: You must generate the JSON keys in the EXACT order specified below to simulate Chain-of-Thought reasoning.

    {
      "inventory_analysis": "<Briefly explain if the query matches anything in the Knowledge Inventory>",
      "namespaces": ["<namespace_1>", "<namespace_2>"], // Array of relevant namespaces. Empty array [] if no match.
      "intent": "business" | "general" | "casual", // Must be "business" if namespaces array is NOT empty
      "confidence": <number between 0.0 and 1.0>,
      "rewritten_query": "<The formalized and resolved query>"
      "reason": "<Briefly explain why this intent was chosen>"
    }
      
    IMPORTANT:
    - Intent classification MUST be independent from document completeness
    - DO NOT say documents are insufficient as a reason to change intent
    - DO NOT output anything except JSON`;

  let attempt = 0;
  const maxRetries = 2;

  while (attempt <= maxRetries) {
    try {
      const { text } = await generateText({
        model: routingModel,
        system: systemPrompt,
        prompt: `User query: ${query}\n\nInstruction: Output strictly JSON with intent, namespaces, reason, and rewritten_query fields.`,
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
          needs_namespace_routing: false,
          rewritten_query: query,
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
          needs_namespace_routing: false,
          rewritten_query: query,
        };
      }

      await new Promise(res => setTimeout(res, 1000));
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