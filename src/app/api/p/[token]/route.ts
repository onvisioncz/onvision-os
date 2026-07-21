/**
 * Veřejné API pro externistu u jednorázovky (bez loginu, token v URL).
 *   GET  → info o projektu BEZ CENY + jeho úkoly/brief
 *   POST → externista vyplní vstupní info (lokace, technika, scénář…) a/nebo
 *          odevzdá výstup (odkaz na stažení). Zapisuje se do projektu.
 * Cena (castka) se přes tenhle endpoint NIKDY neposílá ven.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KEY = "ov-oneoffs-projects";
type SB = ReturnType<typeof createAdminClient>;

interface ExternBrief {
  lokace?: string; technika?: string; scenar?: string; poznamka?: string;
  outputLink?: string; outputNote?: string; updatedAt?: string;
}
interface Project {
  id: number; title: string; klient: string; column: string; typ: string;
  datum: string; castka: number; clenove: string[];
  checklist: { text: string; done: boolean; prirazeno?: string }[];
  poznamka: string; shareToken?: string; externBrief?: ExternBrief;
}

async function readProjects(sb: SB): Promise<Project[]> {
  const { data } = await sb.from("app_data").select("value").eq("key", KEY).maybeSingle();
  return Array.isArray(data?.value) ? (data!.value as Project[]) : [];
}

const COL_LABEL: Record<string, string> = {
  poptavka: "Poptávka", nabidka: "Nabídka", potvrzeno: "Potvrzeno", preprodukce: "Pre-produkce",
  nataceni: "Produkční den", postprodukce: "Post-produkce", schvaleni: "Schválení", dokonceno: "Dokončeno",
};

/** Projekt bez ceny — bezpečný veřejný tvar. */
function publicView(p: Project) {
  return {
    title: p.title, klient: p.klient, typ: p.typ, datum: p.datum,
    faze: COL_LABEL[p.column] ?? p.column,
    tym: p.clenove ?? [],
    ukoly: (p.checklist ?? []).map((c) => ({ text: c.text, done: !!c.done, prirazeno: c.prirazeno })),
    poznamka: p.poznamka ?? "",
    brief: p.externBrief ?? {},
  };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token || token.length < 12) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const sb = createAdminClient();
  const project = (await readProjects(sb)).find((p) => p.shareToken === token);
  if (!project) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(publicView(project));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token || token.length < 12) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const sb = createAdminClient();
  const projects = await readProjects(sb);
  const idx = projects.findIndex((p) => p.shareToken === token);
  if (idx === -1) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  // Ochrana veřejného zápisu: limity délky, ať držitel tokenu nenafoukne úložiště.
  const clip = (s: unknown, n: number) => String(s ?? "").trim().slice(0, n);
  const cur = projects[idx].externBrief ?? {};
  const next: ExternBrief = {
    lokace: clip(body.lokace ?? cur.lokace, 400),
    technika: clip(body.technika ?? cur.technika, 600),
    scenar: clip(body.scenar ?? cur.scenar, 4000),
    poznamka: clip(body.poznamka ?? cur.poznamka, 2000),
    outputLink: clip(body.outputLink ?? cur.outputLink, 600),
    outputNote: clip(body.outputNote ?? cur.outputNote, 1000),
    updatedAt: new Date().toISOString(),
  };
  projects[idx] = { ...projects[idx], externBrief: next };
  await sb.from("app_data").upsert({ key: KEY, value: projects, updated_at: new Date().toISOString() }, { onConflict: "key" });
  return NextResponse.json({ ok: true });
}
