/**
 * Veřejné API pro akci / produkční den (sdílený odkaz pro lidi bez loginu).
 * Vrací logistiku akce + tým (jména + úkoly). ŽÁDNÉ odměny ani celková cena
 * se přes tenhle endpoint nikdy neposílají ven.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicDenView, type ProdukcniDen } from "@/lib/produkce-dny";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KEY = "ov-produkce-dny";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token || token.length < 12) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const sb = createAdminClient();
  const { data } = await sb.from("app_data").select("value").eq("key", KEY).maybeSingle();
  const dny: ProdukcniDen[] = Array.isArray(data?.value) ? (data!.value as ProdukcniDen[]) : [];
  const den = dny.find((d) => d.shareToken === token);
  if (!den) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json(publicDenView(den));
}
