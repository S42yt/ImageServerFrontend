import { cookies } from "next/headers";

// Server-side session id, issued by middleware.ts. "" if somehow absent.
export async function getSessionId(): Promise<string> {
  const store = await cookies();
  return store.get("session_id")?.value ?? "";
}
