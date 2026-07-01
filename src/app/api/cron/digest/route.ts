/**
 * Pondělní AI digest pro vedení. Běží pondělí 7:00 (viz vercel.json).
 * Agreguje faktury po splatnosti, úkoly po termínu a nadcházející deadliny,
 * nechá to Claude shrnout a pošle mail adminům (Adam & Honza).
 *
 * Spuštění: Vercel cron (CRON_SECRET), nebo přihlášený admin otevře URL v prohlížeči.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { identityFromEmail, activeUsers } from "@/lib/agent/identity";
import { sendMail, isEmailConfigured } from "@/lib/email/gmail";
import { brandedEmailHtml } from "@/lib/email/template";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Invoice { klient: string; castka: number; stav: string; datumSplatnosti: string }
interface Task { nazev: string; prirazeno: string; status: string; deadline: string }

function parseCz(s: string, defYear: number): Date | null {
  const m = (s || "").match(/(\d{1,2})\.\s*(\d{1,2})\.?(?:\s*(\d{4}))?/);
  if (!m) return null;
  const d = new Date(m[3] ? +m[3] : defYear, +m[2] - 1, +m[1]);
  return isNaN(d.getTime()) ? null : d;
}

async function readKey<T>(sb: ReturnType<typeof createAdminClient>, key: string): Promise<T[]> {
  const { data } = await sb.from("app_data").select("value").eq("key", key).maybeSingle();
  return Array.isArray(data?.value) ? (data!.value as T[]) : [];
}

export async function GET(req: NextRequest) {
  // ── Auth: CRON_SECRET nebo přihlášený admin ──
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
  if (!isEmailConfigured()) return NextResponse.json({ error: "E-mail není nakonfigurován." }, { status: 503 });

  const sb = createAdminClient();
  const now = new Date();
  const year = now.getFullYear();
  const in7 = new Date(now.getTime() + 7 * 86400000);

  const invoices = await readKey<Invoice>(sb, "ov-issued-invoices");
  const tasks = await readKey<Task>(sb, "ov-ukoly-tasks");

  const overdueInv = invoices.filter((i) => i.stav !== "Zaplacena").filter((i) => { const d = parseCz(i.datumSplatnosti, year); return d && d < now; });
  const overdueTotal = overdueInv.reduce((s, i) => s + (i.castka || 0), 0);
  const lateTasks = tasks.filter((t) => t.status !== "Hotovo").filter((t) => { const d = parseCz(t.deadline, year); return d && d < now; });
  const soonTasks = tasks.filter((t) => t.status !== "Hotovo").filter((t) => { const d = parseCz(t.deadline, year); return d && d >= now && d <= in7; });

  const fmt = (n: number) => new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(n || 0);
  const dataText = `FAKTURY PO SPLATNOSTI (${overdueInv.length}, celkem ${fmt(overdueTotal)}):
${overdueInv.map((i) => `- ${i.klient}: ${fmt(i.castka)} (splatnost ${i.datumSplatnosti})`).join("\n") || "- žádné"}

ÚKOLY PO TERMÍNU (${lateTasks.length}):
${lateTasks.map((t) => `- ${t.nazev} (${t.prirazeno || "?"}, termín ${t.deadline})`).join("\n") || "- žádné"}

DEADLINY DO 7 DNÍ (${soonTasks.length}):
${soonTasks.map((t) => `- ${t.nazev} (${t.prirazeno || "?"}, ${t.deadline})`).join("\n") || "- žádné"}`;

  // ── Claude shrnutí ──
  const apiKey = process.env.ANTHROPIC_API_KEY;
  let summaryHtml = `<pre style="white-space:pre-wrap;font-family:inherit">${dataText}</pre>`;
  if (apiKey) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: "claude-sonnet-4-5", max_tokens: 900,
          system: "Jsi provozní ředitel agentury OnVision. Ze surových dat napiš stručný pondělní digest pro majitele (Adam & Honza): co hoří, na co se zaměřit, priority týdne. Věcně, v odrážkách, česky. HTML fragment (odstavce/odrážky), bez <html>.",
          messages: [{ role: "user", content: dataText }],
        }),
      });
      if (res.ok) { const d = await res.json(); summaryHtml = d.content?.[0]?.text ?? summaryHtml; }
    } catch { /* fallback na raw data */ }
  }

  const datum = now.toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric" });
  const html = brandedEmailHtml({ preheader: `Pondělní digest — ${datum}`, heading: `Pondělní digest · ${datum}`, bodyHtml: `<div style="font-size:14px;line-height:1.7">${summaryHtml}</div>` });
  const text = `Pondělní digest ${datum}\n\n${dataText}`;

  const admins = activeUsers().filter((u) => u.isAdmin);
  const results = await Promise.all(admins.map((a) => sendMail({ to: a.email, subject: `Pondělní digest — ${datum}`, text, html })));
  const sent = results.filter((r) => r.ok).length;

  return NextResponse.json({ ok: true, sent, overdueInvoices: overdueInv.length, lateTasks: lateTasks.length, soonTasks: soonTasks.length });
}
