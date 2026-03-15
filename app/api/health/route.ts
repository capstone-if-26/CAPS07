import { neon } from "@neondatabase/serverless";

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const result = await sql`SELECT version()`;
    return Response.json({
      status: "ok",
      db: result[0].version,
    });
  } catch (error) {
    return Response.json(
      { status: "error", message: String(error) },
      { status: 500 },
    );
  }
}
