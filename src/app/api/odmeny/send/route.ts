/**
 * Odeslání e-mailů modulu odměn — vždy na akci uživatele (žádné samovolné rozesílání).
 *
 *   POST { month, kind: "person", personId }   → pošle danému spolupracovníkovi
 *   POST { month, kind: "summary", to: [...] }  → pošle souhrn účetní/vedení
 *
 * Auth: cookie session + role admin nebo fakturace.
 */
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { identityFromEmail } from "@/lib/agent/identity";
import { sendMail, isEmailConfigured } from "@/lib/email/gmail";
import {
  ODMENY_KEY,
  mailProSpolupracovnika,
  mailSouhrn,
  type OdmenaPerson,
} from "@/lib/odmeny";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 });

  const identity = identityFromEmail(user.email);
  if (!identity || !(identity.isAdmin || identity.roles.includes("fakturace"))) {
    return NextResponse.json({ error: "Nemáš oprávnění odesílat odměny." }, { status: 403 });
  }

  if (!isEmailConfigured()) {
    return NextResponse.json({ error: "E-mail není nakonfigurován." }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.month || !body?.kind) {
    return NextResponse.json({ error: "Chybí month nebo kind." }, { status: 400 });
  }
  const month: string = body.month;

  // načti data odměn
  const { data } = await supabase.from("app_data").select("value").eq("key", ODMENY_KEY).maybeSingle();
  const lidi: OdmenaPerson[] = Array.isArray(data?.value) ? (data!.value as OdmenaPerson[]) : [];

  /* ── Souhrn pro účetní / vedení ─────────────────────────────────────── */
  if (body.kind === "summary") {
    const to: string[] = Array.isArray(body.to) ? body.to.filter(Boolean) : [];
    if (!to.length) return NextResponse.json({ error: "Chybí příjemci souhrnu." }, { status: 400 });

    const mail = mailSouhrn(lidi, month);
    const results = await Promise.all(
      to.map((addr) => sendMail({ to: addr, subject: mail.subject, text: mail.text, html: mail.html }))
    );
    const sent = results.filter((r) => r.ok).length;
    const error = results.find((r) => !r.ok)?.error;
    return NextResponse.json({ ok: sent > 0, sent, error });
  }

  /* ── Konkrétní spolupracovník ───────────────────────────────────────── */
  if (body.kind === "person") {
    const person = lidi.find((p) => p.id === body.personId);
    if (!person) return NextResponse.json({ error: "Osoba nenalezena." }, { status: 404 });
    if (person.typ === "DPP") return NextResponse.json({ error: "DPP se nefakturuje — slouží jen pro evidenci a CSV." }, { status: 400 });
    if (!person.email) return NextResponse.json({ error: `${person.jmeno} nemá e-mail.` }, { status: 400 });

    const mail = mailProSpolupracovnika(person, month);
    const result = await sendMail({ to: person.email, subject: mail.subject, text: mail.text, html: mail.html });
    if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 502 });

    // označ jako odeslané
    person.mesice = person.mesice ?? {};
    person.mesice[month] = { ...(person.mesice[month] ?? {}), mailOdeslan: true };
    await supabase
      .from("app_data")
      .upsert({ key: ODMENY_KEY, value: lidi, updated_at: new Date().toISOString() }, { onConflict: "key" });

    return NextResponse.json({ ok: true, sentTo: person.email });
  }

  return NextResponse.json({ error: "Neznámý kind." }, { status: 400 });
}
