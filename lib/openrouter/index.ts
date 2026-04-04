import { openRouterClient } from './client';

const MODEL_NAME = process.env.LLM_MODEL || 'nvidia/nemotron-3-nano-30b-a3b:free';

export const model = openRouterClient(MODEL_NAME);

export { openRouterClient };