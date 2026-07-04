/**
 * Denní záloha — point-in-time obnova celého systému.
 *
 * Celý byznys žije v jedné KV tabulce app_data. Ruční /api/backup je pojistka
 * na jedno kliknutí, ale spoléhá na to, že si někdo vzpomene. Tenhle cron
 * dumpne KAŽDÝ DEN celý obsah app_data do ODDĚLENÉHO storage bucketu
 * `ov-backups` (mimo tabulku), takže i když někdo omylem přepíše/smaže klíč
 * nebo se poškodí tabulka, existuje datovaný snapshot k obnově.
 *
 * Rotace: drží posledních BACKUP_KEEP_DAYS snapshotů, starší maže.
 *
 * Zabezpečení: Vercel Cron posílá `Authorization: Bearer <CRON_SECRET>`.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "ov-backups";
const BACKUP_KEEP_DAYS = 30;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  try {
    const sb = createAdminClient();

    // 1) Dump celé app_data tabulky
    const { data, error } = await sb
      .from("app_data")
      .select("key, value, updated_at")
      .order("key");
    if (error) throw error;

    const backup = {
      exportedAt: new Date().toISOString(),
      app: "OnVision OS",
      kind: "daily-cron-backup",
      keys: data?.length ?? 0,
      data: Object.fromEntries(
        (data ?? []).map((r) => [r.key, { value: r.value, updated_at: r.updated_at }])
      ),
    };
    const json = JSON.stringify(backup);
    const bytes = new TextEncoder().encode(json);

    // 2) Zajisti, že bucket existuje (idempotentně — chybu "už existuje" ignoruj)
    await sb.storage.createBucket(BUCKET, { public: false }).catch(() => {});

    // 3) Nahraj datovaný snapshot (upsert — opakovaný běh ve stejný den přepíše)
    const stamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const path = `backup-${stamp}.json`;
    const { error: upErr } = await sb.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: "application/json", upsert: true });
    if (upErr) throw upErr;

    // 4) Rotace — smaž snapshoty starší než BACKUP_KEEP_DAYS
    let pruned = 0;
    try {
      const { data: files } = await sb.storage.from(BUCKET).list("", { limit: 1000 });
      const cutoff = Date.now() - BACKUP_KEEP_DAYS * 86_400_000;
      const old = (files ?? [])
        .filter((f) => f.name.startsWith("backup-") && f.name.endsWith(".json"))
        .filter((f) => {
          const d = f.name.slice("backup-".length, "backup-".length + 10);
          const t = Date.parse(d);
          return Number.isFinite(t) && t < cutoff;
        })
        .map((f) => f.name);
      if (old.length) {
        await sb.storage.from(BUCKET).remove(old);
        pruned = old.length;
      }
    } catch { /* rotace nikdy nesmí shodit zálohu */ }

    return NextResponse.json({
      ok: true,
      path,
      keys: backup.keys,
      bytes: bytes.length,
      pruned,
      backedUpAt: backup.exportedAt,
    });
  } catch (e) {
    console.error("[backup] chyba:", e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "backup selhal" }, { status: 500 });
  }
}
