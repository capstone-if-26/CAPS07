import { Pinecone } from "@pinecone-database/pinecone";

export async function GET() {
  try {
    const pc = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
    const index = pc.index(process.env.PINECONE_INDEX_NAME!);
    const stats = await index.describeIndexStats();
    return Response.json({ status: "ok", stats });
  } catch (error) {
    return Response.json(
      { status: "error", message: String(error) },
      { status: 500 },
    );
  }
}
