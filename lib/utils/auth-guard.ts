import { auth } from "@/modules/auth/service";
import { buildFailedResponse } from "@/lib/utils/response";
import type { NextRequest } from "next/server";
import type { NextResponse } from "next/server";

type AuthResult =
  | { session: Awaited<ReturnType<typeof auth.api.getSession>>; errorResponse: null }
  | { session: null; errorResponse: NextResponse };

export async function requireAuth(req: NextRequest): Promise<AuthResult> {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return {
      session: null,
      errorResponse: buildFailedResponse(
        "Sesi tidak valid. Silakan login kembali.",
        null,
        401,
      ) as NextResponse,
    };
  }
  return { session, errorResponse: null };
}
