import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openrouter(
      process.env.OPENROUTER_MODEL || "nvidia/nemotron-3-super-120b-a12b:free",
    ),
    messages,
  });

  return result.toTextStreamResponse();
}
