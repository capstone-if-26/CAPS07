import { createOpenAI } from '@ai-sdk/openai';

const apiKey = process.env.OPENROUTER_API_KEY;

if (!apiKey) {
  throw new Error('OPENROUTER_API_KEY environment variable is missing.');
}

// Kita menginisialisasi custom provider yang mengarahkan semua request 
// ke base URL OpenRouter, bukan ke server OpenAI.
export const openRouterClient = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey,
  // Headers khusus yang diminta oleh spesifikasi OpenRouter
  headers: {
    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    'X-Title': 'Enterprise Next.js Platform', 
  },
  // Kompatibilitas untuk Edge Runtime di Next.js
  fetch: fetch, 
});