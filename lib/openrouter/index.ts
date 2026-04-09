import { openRouterClient } from './client';

const MODEL_NAME = process.env.LLM_MODEL || 'nvidia/nemotron-3-nano-30b-a3b:free';
const ROUTING_MODEL = process.env.ROUTING_MODEL || 'openrouter/free';

export const model = openRouterClient(MODEL_NAME);
export const routingModel = openRouterClient(ROUTING_MODEL);

export { openRouterClient };