/**
 * Měsíční příprava odměn — předpřipraví odměny ke kontrole a odeslání.
 *
 * Běží 1. v měsíci (viz vercel.json). Spočítá odměny za PŘEDCHOZÍ (uzavřený)
 * měsíc a pošle adminům push notifikaci „připraveno ke kontrole" s odkazem
 * na /odmeny. NIC nerozesílá spolupracovníkům — finální odeslání je vždy
 * na klik v appce.
 *
 * Zabezpečení: CRON_SECRET (Vercel přidá Authorization hlavičku u cron volání).
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushTo } from "@/lib/push/notify";
import { DEFAULT_USERS } from "@/lib/roles";
import {
  ODMENY_KEY, celkemZaMesic, fmtKc, monthKey, monthLabel,
  castkaZaMesic, type OdmenaPerson,
} from "@/lib/odmeny";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const supabase = createAdminClient();

    // odměny za předchozí (uzavřený) měsíc
    const now = new Date();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const key = monthKey(prev);

    const { data } = await supabase.from("app_data").select("value").eq("key", ODMENY_KEY).maybeSingle();
    const lidi: OdmenaPerson[] = Array.isArray(data?.value) ? (data!.value as OdmenaPerson[]) : [];
    const aktivni = lidi.filter((p) => p.aktivni && castkaZaMesic(p, key) > 0);
    const celkem = celkemZaMesic(lidi, key);

    if (aktivni.length === 0) {
      return NextResponse.json({ ok: true, month: key, prepared: 0, note: "žádné odměny k přípravě" });
    }

    // push adminům — připraveno ke kontrole
    const admini = DEFAULT_USERS.filter((u) => u.aktivni && u.roles.includes("admin"));
    let pushed = 0;
    for (const a of admini) {
      pushed += await sendPushTo(supabase, {
        targetEmail: a.email,
        title: `Odměny ${monthLabel(key)} připravené`,
        body: `${aktivni.length} spolupracovníků, celkem ${fmtKc(celkem)}. Zkontroluj a odešli.`,
        url: "/odmeny",
        tag: "odmeny-prepare",
      });
    }

    return NextResponse.json({ ok: true, month: key, prepared: aktivni.length, total: celkem, pushed });
  } catch (e) {
    console.error("[odmeny-prepare] chyba:", e);
    return NextResponse.json({ ok: false, error: "příprava selhala" }, { status: 500 });
  }
}
