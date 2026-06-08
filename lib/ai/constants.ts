// AI Model constants
export const DEFAULT_TOP_K = 5;
export const DEFAULT_TEMPERATURE = 0.1;
export const DEFAULT_TOP_P = 0.9;
export const DEFAULT_FREQUENCY_PENALTY = 0;
export const DEFAULT_PRESENCE_PENALTY = 0;

export const CHAT_TEMPERATURE = 0.5;
export const CHAT_TOP_P = 0.9;
export const CHAT_FREQUENCY_PENALTY = 0.3;
export const CHAT_PRESENCE_PENALTY = 0.2;

export const DEFAULT_MAX_TRIES = 2;

// Routing constants

export const RETRIEVE_POLICY_CONTEXT_DESCRIPTION = `
IMPORTANT:
For ANY question related to:
- OJK
- regulations
- compliance
- legal interpretation
- policy
- financial protection
- banking rules
- document-grounded answers
- financial fraud
- education

You MUST call retrieve_policy_context BEFORE answering.

Never answer from prior knowledge for policy questions.
Always ground answers using retrieved context.
`;

export const ASK_USER_QUESTION_TOOL_DESCRIPTION = `
Ask the user a follow-up question with radio options. ALWAYS use this tool instead of normal text for clarification questions that include selectable answers/options.
`;

// Intent constants
export const INTENT_CONTEXT_TURNS = 4;

export const OJK_INTENTS = [
  "Cek Legalitas Pinjol/Investasi",
  "Lapor Penipuan (OJK / IASC)",
  "Kenali Modus Penipuan",
  "Cek SLIK / Riwayat Kredit",
  "IASC — Anti-Scam Centre",
  "Panduan Produk Bank",
  "Hak Saya sebagai Konsumen",
  "Panduan Investasi & Kripto Aman",
  "Literasi & Tips Keuangan",
  "Lainnya",
] as const;
