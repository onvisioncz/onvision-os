/**
 * Nedělní upomínka na týdenní výhled — běží v neděli večer. Kdo ze správců
 * sítí ještě neodevzdal výhled na příští týden, dostane push do mobilu.
 *
 * Deadline je neděle 18:00 (Europe/Prague). Cron je naplánovaný na 17:00 UTC
 * (= 19:00 CEST / 18:00 CET), aby byl vždy PO deadline; pojistka
 * `pastSundayDeadline` navíc zabrání upomínce, kdyby cron běžel dřív.
 * Admin může ručně otestovat přes ?force=1.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { identityFromEmail } from "@/lib/agent/identity";
import { sendPushTo } from "@/lib/push/notify";
import {
  isoWeekKey, missingAuthors, type OutlookEntry, type OutlookSubmits, pastSundayDeadline,
} from "@/lib/weekly-outlook";
import { DEFAULT_USERS } from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function readKey<T>(sb: ReturnType<typeof createAdminClient>, key: string): Promise<T | null> {
  const { data, error } = await sb.from("app_data").select("value").eq("key", key).maybeSingle();
  if (error) throw new Error(`readKey(${key}): ${error.message}`);
  return (data?.value ?? null) as T | null;
}

const nameOf = (email: string) => DEFAULT_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase())?.displayName ?? email;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  let authed = !!secret && req.headers.get("authorization") === `Bearer ${secret}`;
  let isAdminUser = false;
  if (!authed) {
    try {
      const cookieSb = await createClient();
      const { data: { user } } = await cookieSb.auth.getUser();
      isAdminUser = !!(user?.email && identityFromEmail(user.email)?.isAdmin);
      authed = isAdminUser;
    } catch { /* ignore */ }
  }
  if (!authed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const now = new Date();
  const force = req.nextUrl.searchParams.get("force") === "1" && isAdminUser;
  // Pojistka: neupomínat před nedělní 18:00 (kromě ručního admin testu).
  if (!force && !pastSundayDeadline(now)) {
    return NextResponse.json({ ok: true, skipped: "not past Sunday 18:00 (Prague)" });
  }

  // Výhled se v neděli odevzdává na PŘÍŠTÍ týden → cílový klíč je týden začínající zítra.
  const tomorrow = new Date(now.getTime() + 86_400_000);
  const weekKey = isoWeekKey(tomorrow);

  const sb = createAdminClient();
  const [entries, submits] = await Promise.all([
    readKey<OutlookEntry[]>(sb, "ov-weekly-outlook"),
    readKey<OutlookSubmits>(sb, "ov-weekly-outlook-submits"),
  ]);

  const missing = missingAuthors(entries ?? [], submits ?? {}, weekKey);

  let sent = 0;
  for (const emailAddr of missing) {
    const n = await sendPushTo(sb, {
      targetEmail: emailAddr,
      title: "Chybí týdenní výhled ⏰",
      body: `${nameOf(emailAddr)}, ještě jsi neodevzdal(a) týdenní výhled na příští týden. Doplň ho prosím.`,
      url: "/tydenni-vyhled",
      tag: "vyhled-reminder",
    });
    sent += n;
  }

  return NextResponse.json({ ok: true, weekKey, missing, pushSent: sent });
}
