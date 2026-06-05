export const DEFAULT_MODEL_NAME =
  process.env.LLM_MODEL || "nvidia/nemotron-3-nano-30b-a3b:free";

export const DEFAULT_NAMESPACE =
  process.env.PINECONE_NAMESPACE || "pojk-22-2023-perlindungan-konsumen";

export const SUMMARY_SNAPSHOT_MAX_MESSAGES = 80;
export const SUMMARY_SNAPSHOT_MAX_CONTENT = 32000;
