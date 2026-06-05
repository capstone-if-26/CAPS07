import { Pinecone } from "@pinecone-database/pinecone";
import { getModuleLogger } from "@/lib/utils/logger";

const log = getModuleLogger("api/pinecone-health");

export async function GET() {
  const start = Date.now();
  log.debug({}, "health.pinecone_check_requested");

  try {
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
    const index = pc.index(process.env.PINECONE_INDEX_NAME!);
    const stats = await index.describeIndexStats();
    log.info({ status: 200, duration: Date.now() - start }, "health.pinecone_check_passed");
    return Response.json({ status: "ok", stats });
  } catch (error) {
    log.error({ err: error, status: 500, duration: Date.now() - start }, "health.pinecone_check_failed");
    return Response.json({ status: "error", message: String(error) }, { status: 500 });
  }
}
