/**
 * Supabase auth helper pro Edge Runtime routes.
 * Node.js routes (bez `export const runtime = "edge"`) použij místo toho
 * createClient() z ./server.ts.
 */
import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";

/**
 * Ověří session z cookies requestu a vrátí User nebo null.
 * Bezpečný — interně volá auth.getUser() přes Supabase server-to-server,
 * ne jen auth.getSession() (která spoléhá jen na JWT bez server-side ověření).
 */
export async function getUserFromRequest(req: NextRequest) {
  const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) return null;

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: () => {}, // Edge — read-only cookies
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  return user ?? null;
}

/** Convenience wrapper — vrátí 401 Response pokud user není přihlášen. */
export const EDGE_UNAUTHORIZED = new Response(
  JSON.stringify({ error: "Unauthorized" }),
  { status: 401, headers: { "Content-Type": "application/json" } }
);
