/**
 * Veřejné API klientského share (bez loginu, token v URL).
 *   GET  → data klienta (schválení, reporty, faktury)
 *   POST → akce klienta: approve / comment / nps
 * Token váže vše na jednoho klienta; zápisy ověřují příslušnost.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  SHARES_KEY, APPROVALS_KEY, NPS_KEY,
  type ClientShare, type ClientApproval, type NpsRating,
} from "@/lib/clientshare";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SB = ReturnType<typeof createAdminClient>;
async function readKey<T>(sb: SB, key: string): Promise<T | null> {
  const { data } = await sb.from("app_data").select("value").eq("key", key).maybeSingle();
  return (data?.value as T) ?? null;
}
async function writeKey(sb: SB, key: string, value: unknown) {
  await sb.from("app_data").upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
}
async function clientForToken(sb: SB, token: string): Promise<string | null> {
  const shares = (await readKey<ClientShare[]>(sb, SHARES_KEY)) ?? [];
  return shares.find((s) => s.token === token)?.klient ?? null;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const sb = createAdminClient();
  const shares = (await readKey<ClientShare[]>(sb, SHARES_KEY)) ?? [];
  const share = shares.find((s) => s.token === token);
  if (!share) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const approvals = ((await readKey<ClientApproval[]>(sb, APPROVALS_KEY)) ?? []).filter((a) => a.klient === share.klient);
  const invRaw = (await readKey<Record<string, unknown>[]>(sb, "ov-issued-invoices")) ?? [];
  const invoices = invRaw
    .filter((i) => i.klient === share.klient)
    .map((i) => ({ cislo: i.cislo, castka: i.castka, datumVystaveni: i.datumVystaveni, datumSplatnosti: i.datumSplatnosti, stav: i.stav }));

  return NextResponse.json({ klient: share.klient, reportLinks: share.reportLinks ?? [], approvals, invoices });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const sb = createAdminClient();
  const klient = await clientForToken(sb, token);
  if (!klient) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body?.action) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  if (body.action === "approve" || body.action === "comment") {
    const approvals = (await readKey<ClientApproval[]>(sb, APPROVALS_KEY)) ?? [];
    const idx = approvals.findIndex((a) => a.id === body.approvalId && a.klient === klient);
    if (idx === -1) return NextResponse.json({ error: "not_found" }, { status: 404 });

    if (body.action === "approve") {
      approvals[idx].status = body.status === "Schváleno" ? "Schváleno" : "Vráceno";
    } else {
      if (!body.text?.trim()) return NextResponse.json({ error: "empty" }, { status: 400 });
      approvals[idx].comments = [...(approvals[idx].comments ?? []), {
        id: Date.now(), cas: (body.cas ?? "").trim(), text: body.text.trim(), autor: "Klient", createdAt: new Date().toISOString(),
      }];
    }
    await writeKey(sb, APPROVALS_KEY, approvals);
    return NextResponse.json({ ok: true, approval: approvals[idx] });
  }

  if (body.action === "nps") {
    const score = Number(body.score);
    if (isNaN(score) || score < 0 || score > 10) return NextResponse.json({ error: "bad_score" }, { status: 400 });
    const nps = (await readKey<NpsRating[]>(sb, NPS_KEY)) ?? [];
    nps.push({ id: Date.now(), klient, score, comment: (body.comment ?? "").trim(), createdAt: new Date().toISOString() });
    await writeKey(sb, NPS_KEY, nps);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "unknown_action" }, { status: 400 });
}
