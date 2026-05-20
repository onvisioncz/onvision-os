import { createClient } from "@/lib/supabase/server";
import { DEFAULT_USERS, type Role } from "@/lib/roles";
import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";

// web-push requires Node.js crypto — force Node.js runtime (not Edge)
export const runtime = "nodejs";

/* ── Configure VAPID once at module load ────────────────────────────────── */
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL ?? "mailto:onvisionczech@gmail.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

/* ── Push helper ────────────────────────────────────────────────────────── */
interface PushSubRecord {
  email: string;
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } };
}

async function sendPushToEmails(
  supabase: Awaited<ReturnType<typeof createClient>>,
  emails: string[],
  payload: { title: string; body: string; url?: string; tag?: string }
) {
  if (!process.env.VAPID_PUBLIC_KEY) return; // push not configured
  try {
    const { data } = await supabase
      .from("app_data")
      .select("value")
      .eq("key", "ov-push-subscriptions")
      .maybeSingle();

    const subs: PushSubRecord[] = Array.isArray(data?.value) ? data.value : [];
    const targets = emails.length > 0
      ? subs.filter((s) => emails.includes(s.email))
      : subs; // empty = broadcast to all

    const msg = JSON.stringify(payload);
    await Promise.allSettled(targets.map((s) => webpush.sendNotification(s.subscription, msg)));
  } catch {
    // Push failures are non-fatal
  }
}

const UNAUTHORIZED = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const FORBIDDEN     = NextResponse.json({ error: "Forbidden" },     { status: 403 });

/* ── Auth helper ────────────────────────────────────────────────────────────── */
async function getAuthenticatedClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase: null, user: null };
  return { supabase, user };
}

/* ── Role-based write permissions per key ───────────────────────────────────── */
// Lists which roles may write to each key. "admin" always has full access.
// Keys NOT listed here are admin-only by default.
const KEY_WRITE_ROLES: Record<string, Role[]> = {
  "ov-user-roles":          ["admin"],
  "ov-monthly-clients":     ["admin"],
  "ov-finance-summaries":   ["admin", "fakturace"],
  "ov-issued-invoices":     ["admin", "fakturace"],
  "ov-schvaleni-items":     ["admin", "fakturace"],
  "ov-finance-incomes":     ["admin", "fakturace"],
  "ov-pipeline-deals":      ["admin"],
  "ov-oneoffs-projects":    ["admin", "produkce"],
  "ov-ukoly-tasks":         ["admin", "pm", "produkce", "grafik", "smm", "fakturace"],
  "ov-ads-campaigns":       ["admin", "smm"],
  "ov-smm-plan":            ["admin", "smm"],
  "ov-smm-posts":           ["admin", "smm"],
  "ov-smm-hashtag-sets":    ["admin", "smm"],
  "ov-smm-pillars":         ["admin", "smm"],
  "ov-shooting-plan":       ["admin", "produkce"],
  "ov-outputs":             ["admin", "produkce", "grafik", "smm"],
  "ov-output-messages":    ["admin", "produkce", "grafik", "smm", "pm", "fakturace"],
  "ov-calendar-events":     ["admin", "pm", "smm"],
  "ov-reports-archive":     ["admin", "smm"],
  "ov-investice":           ["admin"],
  "ov-finance-predplatne":  ["admin", "fakturace"],
  // push subscriptions — every authenticated user can write their own
  "ov-push-subscriptions":  ["admin", "pm", "produkce", "grafik", "smm", "fakturace"],
};

/* ── Fetch user roles from DB (falls back to DEFAULT_USERS) ─────────────────── */
async function getUserRoles(
  supabase: Awaited<ReturnType<typeof createClient>>,
  email: string
): Promise<Role[]> {
  try {
    const { data } = await supabase
      .from("app_data")
      .select("value")
      .eq("key", "ov-user-roles")
      .maybeSingle();

    const users: typeof DEFAULT_USERS = Array.isArray(data?.value)
      ? data.value
      : DEFAULT_USERS;

    const config = users.find((u) => u.email === email);
    return config?.roles ?? [];
  } catch {
    // On DB error fall back to hardcoded defaults — fail open for reads, fail
    // closed for writes (checked below)
    const config = DEFAULT_USERS.find((u) => u.email === email);
    return config?.roles ?? [];
  }
}

/* ── GET /api/sync?key=... ──────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const { supabase } = await getAuthenticatedClient();
  if (!supabase) return UNAUTHORIZED;

  const key = req.nextUrl.searchParams.get("key");
  if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });

  const { data, error } = await supabase
    .from("app_data")
    .select("value")
    .eq("key", key)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ value: data?.value ?? null });
}

/* ── POST /api/sync  { key, value } ────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  const { supabase, user } = await getAuthenticatedClient();
  if (!supabase || !user) return UNAUTHORIZED;

  let body: { key?: string; value?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Neplatný JSON" }, { status: 400 });
  }

  const { key, value } = body;
  if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });

  // ── Role check ───────────────────────────────────────────────────────────────
  const userRoles = await getUserRoles(supabase, user.email!);
  const isAdmin   = userRoles.includes("admin");

  if (!isAdmin) {
    const allowed = KEY_WRITE_ROLES[key];
    if (!allowed) {
      // Unknown key — admin only
      return FORBIDDEN;
    }
    const hasPermission = allowed.some((r) => userRoles.includes(r));
    if (!hasPermission) return FORBIDDEN;
  }

  // ── Write ────────────────────────────────────────────────────────────────────
  const { error } = await supabase
    .from("app_data")
    .upsert(
      { key, value, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // ── Push notifications (fire-and-forget, never blocks the response) ──────
  void triggerPush(supabase, key, value, user.email!);

  return NextResponse.json({ ok: true });
}

/* ── Push trigger logic ─────────────────────────────────────────────────── */
async function triggerPush(
  supabase: Awaited<ReturnType<typeof createClient>>,
  key: string,
  value: unknown,
  authorEmail: string
) {
  // ── New task assigned ─────────────────────────────────────────────────
  if (key === "ov-ukoly-tasks" && Array.isArray(value)) {
    // Read previous value to detect additions
    const { data: prev } = await supabase
      .from("app_data")
      .select("value")
      .eq("key", "ov-ukoly-tasks")
      .maybeSingle();

    const oldIds = new Set<string>(
      Array.isArray(prev?.value)
        ? (prev.value as Array<{ id?: string }>).map((t) => t.id ?? "")
        : []
    );

    const newTasks = (value as Array<{ id?: string; prirazeno?: string; nazev?: string }>)
      .filter((t) => t.id && !oldIds.has(t.id) && t.prirazeno);

    for (const task of newTasks) {
      // Find the user record to get their email
      const { data: rolesData } = await supabase
        .from("app_data")
        .select("value")
        .eq("key", "ov-user-roles")
        .maybeSingle();
      const users: Array<{ email: string; displayName?: string }> =
        Array.isArray(rolesData?.value) ? rolesData.value : DEFAULT_USERS;

      const assignee = users.find(
        (u) => (u.displayName ?? u.email.split("@")[0]).toLowerCase() === (task.prirazeno ?? "").toLowerCase()
      );
      const targetEmail = assignee?.email;
      if (!targetEmail) continue;

      await sendPushToEmails(supabase, [targetEmail], {
        title: "Nový úkol 📋",
        body: task.nazev ? `„${task.nazev}" — přiřazeno tobě` : "Byl ti přiřazen nový úkol",
        url: "/ukoly",
        tag: `task-${task.id}`,
      });
    }
  }

  // ── New output message uploaded ───────────────────────────────────────
  if (key === "ov-output-messages" && Array.isArray(value)) {
    const { data: prev } = await supabase
      .from("app_data")
      .select("value")
      .eq("key", "ov-output-messages")
      .maybeSingle();

    const oldIds = new Set<string>(
      Array.isArray(prev?.value)
        ? (prev.value as Array<{ id?: string }>).map((o) => o.id ?? "")
        : []
    );

    const added = (value as Array<{
      id?: string;
      authorName?: string;
      nazev?: string;
      projektNazev?: string;
      type?: string;
    }>).filter((o) => o.id && !oldIds.has(o.id) && o.type !== "zprava");

    if (added.length > 0) {
      const newest = added[added.length - 1];
      const typeLabel: Record<string, string> = {
        grafika: "Grafika", foto: "Foto", video: "Video",
        dokument: "Dokument", odkaz: "Odkaz",
      };
      const co = newest.nazev || typeLabel[newest.type ?? ""] || "Výstup";
      const kde = newest.projektNazev ? ` · ${newest.projektNazev}` : "";
      const kdo = newest.authorName ? `${newest.authorName}: ` : "";

      const { data: subsData } = await supabase
        .from("app_data")
        .select("value")
        .eq("key", "ov-push-subscriptions")
        .maybeSingle();
      const subs: PushSubRecord[] = Array.isArray(subsData?.value) ? subsData.value : [];

      if (subs.length > 0) {
        await sendPushToEmails(supabase, subs.map((s) => s.email), {
          title: "Nový výstup 📁",
          body: `${kdo}${co}${kde}`,
          url: "/outputs",
          tag: "new-output",
        });
      }
    }
  }
}
