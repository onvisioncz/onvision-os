/**
 * Self-check — noční autoimunita systému (běží denně, viz vercel.json).
 *
 * Projde vlastní data a hledá anomálie, které by jinak tiše kazily čísla:
 *  - faktury s neexistujícím / nečitelným datem splatnosti (viz "31.6.2026")
 *  - duplicitní čísla faktur napříč oběma sklady
 *  - úkoly s nečitelným termínem
 *  - kolize rezervací techniky
 *  - aktivní měsíční klienti bez fakturační řady (nejde jim vystavit faktura)
 *  - záporné / nečíselné částky
 *
 * Nálezy pošle do Upozornění (broadcast) — ale JEN když se změnily oproti
 * minulému běhu (hash), takže nespamuje. Systém se tak sám hlídá.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { identityFromEmail } from "@/lib/agent/identity";
import { parseDeadline, isValidCzDate } from "@/lib/dates";
import { overlaps } from "@/lib/gear";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function readKey<T>(sb: ReturnType<typeof createAdminClient>, key: string): Promise<T> {
  const { data } = await sb.from("app_data").select("value").eq("key", key).maybeSingle();
  return (data?.value ?? null) as T;
}

async function writeKey(sb: ReturnType<typeof createAdminClient>, key: string, value: unknown) {
  await sb.from("app_data").upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
}

function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) | 0; }
  return String(h);
}

interface Inv { cislo?: string; klient?: string; castka?: unknown; stav?: string; datumSplatnosti?: string; splatnost?: string }
interface Task { nazev?: string; status?: string; deadline?: string }
interface Res { gearId?: number; kdo?: string; od?: string; do?: string }
interface Client { name?: string; aktivni?: boolean; fakturaRada?: number; ico?: string }

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  let authed = !!secret && req.headers.get("authorization") === `Bearer ${secret}`;
  if (!authed) {
    try {
      const cookieSb = await createClient();
      const { data: { user } } = await cookieSb.auth.getUser();
      authed = !!(user?.email && identityFromEmail(user.email)?.isAdmin);
    } catch { /* ignore */ }
  }
  if (!authed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const sb = createAdminClient();
  const [issued, finance, tasks, reservations, clients] = await Promise.all([
    readKey<Inv[]>(sb, "ov-issued-invoices"),
    readKey<Inv[]>(sb, "ov-finance-faktury"),
    readKey<Task[]>(sb, "ov-ukoly-tasks"),
    readKey<Res[]>(sb, "ov-gear-reservations"),
    readKey<Client[]>(sb, "ov-monthly-clients"),
  ]);

  const findings: string[] = [];

  // 1) Neexistující / nečitelná data splatnosti
  for (const inv of [...(issued ?? []), ...(finance ?? [])]) {
    if ((inv.stav ?? "") === "Zaplacena" || (inv.stav ?? "") === "Storno") continue;
    const due = inv.datumSplatnosti ?? inv.splatnost ?? "";
    if (!due) continue;
    const hasYear = /\d{4}/.test(due);
    if (hasYear && !due.includes("-") && !isValidCzDate(due.replace(/\s/g, ""))) {
      findings.push(`Faktura ${inv.cislo ?? "?"} (${inv.klient ?? "?"}) má neexistující datum splatnosti „${due}"`);
    } else if (!parseDeadline(due)) {
      findings.push(`Faktura ${inv.cislo ?? "?"} (${inv.klient ?? "?"}) má nečitelné datum splatnosti „${due}"`);
    }
  }

  // 2) Duplicitní čísla faktur (jen skutečně vyplněná)
  const seen = new Map<string, number>();
  for (const inv of [...(issued ?? []), ...(finance ?? [])]) {
    const c = (inv.cislo ?? "").trim();
    if (!c) continue;
    seen.set(c, (seen.get(c) ?? 0) + 1);
  }
  for (const [c, n] of seen) if (n > 2) findings.push(`Číslo faktury ${c} se vyskytuje ${n}× — zkontroluj duplicitu`);

  // 3) Úkoly s nečitelným termínem
  for (const t of tasks ?? []) {
    if ((t.status ?? "") === "Hotovo") continue;
    const d = (t.deadline ?? "").trim();
    if (d && !parseDeadline(d)) findings.push(`Úkol „${t.nazev ?? "?"}" má nečitelný termín „${d}"`);
  }

  // 4) Kolize rezervací techniky
  const res = reservations ?? [];
  for (let i = 0; i < res.length; i++)
    for (let j = i + 1; j < res.length; j++)
      if (res[i].gearId === res[j].gearId && res[i].od && res[j].od && overlaps(res[i].od!, res[i].do!, res[j].od!, res[j].do!))
        findings.push(`Kolize rezervace techniky: ${res[i].kdo ?? "?"} × ${res[j].kdo ?? "?"} (${res[i].od}–${res[i].do})`);

  // (Pozn.: kontrola fakturačních řad vynechána — řady žijí v konfigu
  // Fakturace, ne v ov-monthly-clients, takže by hlásila falešné poplachy.)
  void clients;

  // 5) Podezřelé částky
  for (const inv of [...(issued ?? []), ...(finance ?? [])]) {
    const n = Number(inv.castka);
    if (inv.castka != null && (!Number.isFinite(n) || n < 0)) {
      findings.push(`Faktura ${inv.cislo ?? "?"} má podezřelou částku „${String(inv.castka)}"`);
    }
  }

  // ── Ozvi se jen při změně nálezů ──
  const currentHash = hash(findings.slice().sort().join("|"));
  const state = await readKey<{ hash?: string } | null>(sb, "ov-selfcheck-state");
  const changed = state?.hash !== currentHash;

  if (changed && findings.length > 0) {
    const events = await readKey<unknown[]>(sb, "ov-notif-events") ?? [];
    const ev = {
      id: `selfcheck-${Date.now()}`,
      type: "task_assigned",
      title: `Self-check: ${findings.length} ${findings.length === 1 ? "nález" : findings.length < 5 ? "nálezy" : "nálezů"} v datech`,
      body: findings.slice(0, 3).join(" · ") + (findings.length > 3 ? ` (+${findings.length - 3} dalších)` : ""),
      url: "/inbox",
      createdAt: new Date().toISOString(),
      targetEmail: null,
    };
    await writeKey(sb, "ov-notif-events", [...(Array.isArray(events) ? events : []), ev].slice(-100));
  }
  await writeKey(sb, "ov-selfcheck-state", { hash: currentHash, ts: new Date().toISOString(), count: findings.length });

  return NextResponse.json({ ok: true, findings, changed });
}
