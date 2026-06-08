import { neon } from "@neondatabase/serverless";
import { getModuleLogger } from "@/lib/utils/logger";

const log = getModuleLogger("api/health");

export async function GET() {
  const start = Date.now();
  log.debug({}, "health.db_check_requested");

  try {
    const sql = neon(process.env.DATABASE_URL!);
    const result = await sql`SELECT version()`;
    log.info({ status: 200, duration: Date.now() - start }, "health.db_check_passed");
    return Response.json({ status: "ok", db: result[0].version });
  } catch (error) {
    log.error({ err: error, status: 500, duration: Date.now() - start }, "health.db_check_failed");
    return Response.json({ status: "error", message: String(error) }, { status: 500 });
  }
}
