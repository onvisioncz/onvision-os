/**
 * Keepalive cron — drží Supabase free-tier projekt vzhůru.
 *
 * Supabase uspí databázi po 7 dnech nečinnosti. Tato routa pošle jeden lehký
 * dotaz do app_data; Vercel Cron ji volá každé 2 dny (viz vercel.json), takže
 * 7denní časovač nikdy nedoběhne a projekt se nepozastaví.
 *
 * Zabezpečení: pokud je nastaven CRON_SECRET, Vercel u cron volání automaticky
 * přidá hlavičku `Authorization: Bearer <CRON_SECRET>`. Cizí požadavky odmítneme.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  // ── Ověření, že volá Vercel Cron (ne kdokoli) ──────────────────────────
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // ── Lehký dotaz, který "probudí" databázi ──────────────────────────────
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("app_data").select("key").limit(1);
    if (error) throw error;

    return NextResponse.json({ ok: true, pingedAt: new Date().toISOString() });
  } catch (e) {
    console.error("[keepalive] chyba:", e);
    return NextResponse.json({ ok: false, error: "ping selhal" }, { status: 500 });
  }
}
