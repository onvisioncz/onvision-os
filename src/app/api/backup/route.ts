/**
 * Záloha všech dat: stáhne kompletní obsah app_data jako JSON soubor.
 * Celý byznys žije v jedné KV tabulce — tohle je pojistka na jedno kliknutí.
 * Jen pro adminy.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_USERS } from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const me = DEFAULT_USERS.find((u) => u.email.toLowerCase() === user.email!.toLowerCase());
  if (!me?.roles.includes("admin")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await supabase
    .from("app_data")
    .select("key, value, updated_at")
    .order("key");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const backup = {
    exportedAt: new Date().toISOString(),
    exportedBy: user.email,
    app: "OnVision OS",
    keys: data?.length ?? 0,
    data: Object.fromEntries((data ?? []).map((r) => [r.key, { value: r.value, updated_at: r.updated_at }])),
  };

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="onvision-os-zaloha-${stamp}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
