import { Chats } from "@/modules/chats/type";
import { OJK_INTENTS } from "./constants";

export type AgenticRagStreamEvent =
  | {
      type: "task";
      status: "running" | "done" | "error";
      title: string;
      detail?: string;
    }
  | { type: "source"; source: { title: string; href: string } }
  | { type: "question"; question: AgenticQuestion }
  | { type: "text"; text: string };

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

export type SummaryParams = {
  previousSummary: string;
  shortTermMemory: Chats[] | [];
  question: string;
  answer: string;
};

// Routing types
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

// Intent types
export type OjkIntent = (typeof OJK_INTENTS)[number];

export type IntentClassification = {
  intent: OjkIntent;
  isOjkRelevant: boolean;
  confidence: number;
  reason: string;
};

export type IntentRequirementsMap = Record<OjkIntent, string[]>;
