/**
 * Obnova z koše — vrátí smazanou položku zpět do jejího zdrojového klíče.
 * Jen pro adminy. Koš plní automaticky /api/sync při každém smazání.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_USERS } from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface TrashEntry {
  id: string; srcKey: string; item: unknown; label: string;
  deletedAt: string; deletedBy: string;
}
type IdItem = { id?: unknown; cislo?: unknown };
function itemKey(x: IdItem): unknown {
  return x?.id ?? x?.cislo ?? null;
}

async function isAdmin(db: ReturnType<typeof createAdminClient>, email: string): Promise<boolean> {
  try {
    const { data } = await db.from("app_data").select("value").eq("key", "ov-user-roles").maybeSingle();
    const users: typeof DEFAULT_USERS = Array.isArray(data?.value) ? data.value : DEFAULT_USERS;
    return (users.find((u) => u.email.toLowerCase() === email.toLowerCase())?.roles ?? []).includes("admin");
  } catch {
    return (DEFAULT_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase())?.roles ?? []).includes("admin");
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const db = createAdminClient(); // data přes service-role (RLS lockdown)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isAdmin(db, user.email))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { trashId?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Neplatný JSON" }, { status: 400 }); }
  const trashId = body.trashId;
  if (!trashId) return NextResponse.json({ error: "Chybí trashId" }, { status: 400 });

  // 1) Najdi záznam v koši
  const { data: trashData } = await db.from("app_data").select("value").eq("key", "ov-trash").maybeSingle();
  const trash: TrashEntry[] = Array.isArray(trashData?.value) ? (trashData!.value as TrashEntry[]) : [];
  const entry = trash.find((e) => e.id === trashId);
  if (!entry) return NextResponse.json({ error: "Položka v koši nenalezena" }, { status: 404 });

  // 2) Načti zdrojový klíč a vlož položku zpět (pokud tam už není)
  const { data: srcData } = await db.from("app_data").select("value").eq("key", entry.srcKey).maybeSingle();
  const arr: IdItem[] = Array.isArray(srcData?.value) ? (srcData!.value as IdItem[]) : [];
  const k = itemKey(entry.item as IdItem);
  const already = k != null && arr.some((x) => itemKey(x) === k);
  const nextArr = already ? arr : [...arr, entry.item as IdItem];

  if (!already) {
    const { error } = await db.from("app_data").upsert(
      { key: entry.srcKey, value: nextArr, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 3) Odeber záznam z koše
  const nextTrash = trash.filter((e) => e.id !== trashId);
  await db.from("app_data").upsert(
    { key: "ov-trash", value: nextTrash, updated_at: new Date().toISOString() },
    { onConflict: "key" }
  );

  return NextResponse.json({ ok: true, restored: !already, srcKey: entry.srcKey });
}
