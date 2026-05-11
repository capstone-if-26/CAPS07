// Routing constants
export const ROUTING_MODEL_PRIMARY = process.env.ROUTING_MODEL_PRIMARY;
export const ROUTING_MODEL_FALLBACK = process.env.ROUTING_MODEL_FALLBACK;
export const ROUTING_MODEL_FAST = process.env.ROUTING_MODEL_FAST;
export const ROUTING_MODEL_BACKUP = process.env.ROUTING_MODEL_BACKUP;
export const ROUTING_MAX_RETRIES = parseInt(
  process.env.ROUTING_MAX_RETRIES || "2",
  10,
);

export const ROUTING_TEMPERATURE = process.env.ROUTING_TEMPERATURE;
export const ROUTING_TOP_P = process.env.ROUTING_TOP_P;
export const ROUTING_TOP_K = process.env.ROUTING_TOP_K;
export const ROUTING_SEED = process.env.ROUTING_SEED;
export const ROUTING_RESPONSE_CONFIDENCE_THRESHOLD = parseFloat(
  process.env.ROUTING_RESPONSE_CONFIDENCE_THRESHOLD || "0.7",
);

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