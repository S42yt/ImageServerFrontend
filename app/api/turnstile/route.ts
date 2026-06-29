import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

// Reports whether the current session already passed Turnstile, so the
// uploader can skip the widget. Verified state is bound to the session id.
export async function GET() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session_id")?.value || "";
  const verifiedFor = cookieStore.get("turnstile_verified")?.value || "";
  return NextResponse.json({ verified: !!sessionId && verifiedFor === sessionId });
}
