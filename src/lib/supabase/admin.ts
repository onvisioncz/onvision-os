/**
 * Supabase service-role klient (admin) — POUZE pro server.
 *
 * Použij ho v server-to-server kontextech, kde NENÍ uživatelská cookie session,
 * typicky v Telegram webhooku (volá ho Telegram, ne přihlášený prohlížeč).
 * Obchází Row Level Security — nikdy ho neimportuj do klientského kódu.
 *
 * Pro běžné, cookie-ověřené routy použij createClient() z ./server.ts.
 */
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Chybí NEXT_PUBLIC_SUPABASE_URL nebo SUPABASE_SERVICE_ROLE_KEY pro admin klienta."
    );
  }

  return createSupabaseClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
