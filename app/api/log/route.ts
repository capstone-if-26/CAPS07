import { NextRequest } from "next/server";
import { getModuleLogger } from "@/lib/utils/logger";
import { buildFailedResponse, buildSuccessResponse } from "@/lib/utils/response";

const log = getModuleLogger("api/log");

const SENSITIVE_KEYS = new Set([
  "password",
  "token",
  "secret",
  "authorization",
  "cookie",
]);

const VALID_LEVELS = new Set(["warn", "error"]);

function sanitize(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([k]) => !SENSITIVE_KEYS.has(k.toLowerCase())),
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { level, message, meta, timestamp } = body as {
      level: unknown;
      message: unknown;
      meta: unknown;
      timestamp: unknown;
    };

    if (typeof level !== "string" || !VALID_LEVELS.has(level)) {
      return buildFailedResponse("level harus 'warn' atau 'error'", null, 400);
    }

    if (typeof message !== "string") {
      return buildFailedResponse("message harus berupa string", null, 400);
    }

    const safeMessage = message.slice(0, 1000);
    const safeMeta =
      meta && typeof meta === "object" && !Array.isArray(meta)
        ? sanitize(meta as Record<string, unknown>)
        : undefined;

    log[level as "warn" | "error"](
      { ...safeMeta, source: "client", client_timestamp: timestamp },
      safeMessage,
    );

    return buildSuccessResponse(null, "Log diterima", 200);
  } catch {
    return buildFailedResponse("Gagal memproses log", null, 500);
  }
}
