/**
 * Aktivita týmu: poslední přihlášení z Supabase Auth (admin API).
 * Jen pro adminy — data o přihlášeních jsou citlivá.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_USERS } from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const me = DEFAULT_USERS.find((u) => u.email.toLowerCase() === user.email!.toLowerCase());
  if (!me?.roles.includes("admin")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (error) throw error;
    const logins: Record<string, string | null> = {};
    for (const u of data.users) {
      if (u.email) logins[u.email.toLowerCase()] = u.last_sign_in_at ?? null;
    }
    return NextResponse.json({ logins });
  } catch (e) {
    console.error("[team/activity]", e);
    // Fail-soft: stránka funguje i bez přihlašovacích dat
    return NextResponse.json({ logins: {} });
  }
}
