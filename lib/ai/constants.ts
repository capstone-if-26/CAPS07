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
