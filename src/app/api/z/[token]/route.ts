/**
 * Veřejné API pro měsíční náhled produkce jednoho člověka (bez loginu, token
 * v URL). Zaměstnanec si zkontroluje, co se natáčelo/dělalo a bilanci dní.
 * Přes tenhle endpoint se NIKDY neposílají částky ani data jiných lidí.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildPersonView, type ProdPerson, type ProdData,
  type RawZ, type RawM, type RawG, type RawPending,
} from "@/lib/produkce-share";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SB = ReturnType<typeof createAdminClient>;
const SHARES_KEY = "ov-produkce-shares";
const VALID: ProdPerson[] = ["zdenek", "matej", "monika", "patrik"];

interface Share { token: string; person: ProdPerson; createdAt?: string }

async function readVal<T>(sb: SB, key: string): Promise<T[]> {
  const { data } = await sb.from("app_data").select("value").eq("key", key).maybeSingle();
  return Array.isArray(data?.value) ? (data!.value as T[]) : [];
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token || token.length < 12) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const sb = createAdminClient();
  const shares = await readVal<Share>(sb, SHARES_KEY);
  const share = shares.find((s) => s.token === token);
  if (!share || !VALID.includes(share.person)) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Načteme jen to, co daná osoba potřebuje (žádná data ostatních nad rámec view).
  const data: ProdData = {};
  if (share.person === "zdenek") {
    data.zdenek = await readVal<RawZ>(sb, "ov-produkce-zdenek");
    data.pending = await readVal<RawPending>(sb, "ov-produkce-pending");
  } else if (share.person === "matej") {
    data.matej = await readVal<RawM>(sb, "ov-produkce-matej");
  } else {
    data.grafici = await readVal<RawG>(sb, "ov-produkce-grafici");
  }

  return NextResponse.json(buildPersonView(share.person, data));
}
