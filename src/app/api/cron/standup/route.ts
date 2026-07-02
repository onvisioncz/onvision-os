/**
 * Ranní stand-up push (po–pá ráno, viz vercel.json). Každému členovi týmu
 * pošle jeho denní přehled: úkoly po termínu + úkoly na dnešek. Kdo nemá
 * nic, nedostane nic (žádný spam).
 *
 * Spuštění: Vercel cron (CRON_SECRET), nebo přihlášený admin otevře URL.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { identityFromEmail } from "@/lib/agent/identity";
import { sendPushTo } from "@/lib/push/notify";
import { DEFAULT_USERS } from "@/lib/roles";
import { parseDeadline, daysUntil } from "@/lib/dates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Task { nazev: string; prirazeno: string; status: string; deadline: string }

const firstName = (s: string) => (s || "").trim().split(/\s+/)[0].toLowerCase();
const ALIASES: Record<string, string[]> = { jan: ["jan", "honza"] };
const belongsTo = (assigned: string, memberFirst: string) => {
  const a = firstName(assigned);
  return a === memberFirst || (ALIASES[memberFirst] ?? []).includes(a);
};

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
  const { data } = await sb.from("app_data").select("value").eq("key", "ov-ukoly-tasks").maybeSingle();
  const tasks: Task[] = Array.isArray(data?.value) ? (data!.value as Task[]) : [];
  const open = tasks.filter((t) => t.status !== "Hotovo");

  let sent = 0;
  const results: Record<string, string> = {};

  for (const u of DEFAULT_USERS.filter((x) => x.aktivni)) {
    const fn = firstName(u.displayName);
    const mine = open.filter((t) => belongsTo(t.prirazeno, fn));
    if (!mine.length) continue;

    const overdue = mine.filter((t) => { const d = parseDeadline(t.deadline); return d && daysUntil(d) < 0; });
    const today = mine.filter((t) => { const d = parseDeadline(t.deadline); return d && daysUntil(d) === 0; });
    if (!overdue.length && !today.length) continue;

    const parts: string[] = [];
    if (today.length) parts.push(`dnes: ${today.map((t) => t.nazev).slice(0, 3).join(", ")}`);
    if (overdue.length) parts.push(`po termínu: ${overdue.length}`);

    const n = await sendPushTo(sb, {
      targetEmail: u.email,
      title: `Dobré ráno, ${u.displayName.split(" ")[0]} ☀️`,
      body: parts.join(" · "),
      url: "/ukoly",
      tag: "standup",
    });
    sent += n;
    results[u.displayName] = `${today.length} dnes / ${overdue.length} po termínu → ${n} push`;
  }

  return NextResponse.json({ ok: true, sent, results });
}
