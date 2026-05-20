import { createClient } from "@/lib/supabase/server";
import { DEFAULT_USERS, type Role } from "@/lib/roles";
import { NextRequest, NextResponse } from "next/server";

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
  "ov-shooting-plan":       ["admin", "produkce"],
  "ov-outputs":             ["admin", "produkce", "grafik", "smm"],
  "ov-calendar-events":     ["admin", "pm", "smm"],
  "ov-reports-archive":     ["admin", "smm"],
  "ov-investice":           ["admin"],
  "ov-finance-predplatne":  ["admin", "fakturace"],
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
  return NextResponse.json({ ok: true });
}
