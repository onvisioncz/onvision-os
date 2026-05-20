import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const UNAUTHORIZED = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const META_API = "https://graph.facebook.com/v20.0";

/* ── Types ─────────────────────────────────────────────────────────────── */
interface Task {
  id: number;
  nazev: string;
  projekt: string;
  prirazeno: string;
  priorita: "Nízká" | "Střední" | "Vysoká" | "Urgentní";
  status: "Nové" | "Probíhá" | "Review" | "Hotovo";
  deadline: string;
}
interface Deal {
  id: number;
  klient: string;
  faze: string;
  hodnota: number;
  pravdepodobnost: number;
}
interface Approval {
  id: number;
  typ: string;
  klient: string;
  popis: string;
  castka?: number;
  status: "Čeká" | "Schváleno" | "Zamítnuto";
}
interface RetainerClient {
  id: number;
  name: string;
  pausal: number;
  aktivni: boolean;
}
interface Invoice {
  id: number;
  klient: string;
  castka: number;
  stav: string;
  mesicSluzby?: string;
  rokSluzby?: number;
}
interface MonthSummary {
  mesic: string;
  prijemCelkovy: number;
  vydaje: number;
  prijemCisty: number;
}
interface SmmPost {
  id: string;
  klient: string;
  status: string;
  datum: string;
}

export interface BriefingInsight {
  id: string;
  severity: "high" | "medium" | "low" | "positive";
  icon: string;
  text: string;
  link?: string;
  cta?: string;
}

export interface BriefingResponse {
  greeting: string;
  summary: string;
  insights: BriefingInsight[];
  generatedAt: string;
}

/* ── Safe JSON helper ───────────────────────────────────────────────────── */
async function safeJson(p: Promise<Response>): Promise<Record<string, unknown> | null> {
  try {
    const res = await p;
    const json = await res.json();
    if (json?.error) return null;
    return json;
  } catch {
    return null;
  }
}

/* ── Claude call ────────────────────────────────────────────────────────── */
async function callClaude(systemPrompt: string, userPrompt: string, apiKey: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-opus-4-5",
      max_tokens: 1200,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });
  if (!res.ok) throw new Error(`Claude API error: ${res.status}`);
  const data = await res.json();
  return (data.content?.[0]?.text ?? "").trim();
}

/* ── POST /api/dashboard/briefing ───────────────────────────────────────── */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return UNAUTHORIZED;

  const body = await req.json().catch(() => ({}));
  const userName: string = body.userName ?? user.email?.split("@")[0] ?? "kolego";

  const anthropicKey = process.env.ANTHROPIC_API_KEY ?? "";
  if (!anthropicKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 500 });
  }

  // ── Load all data from Supabase ──────────────────────────────────────────
  const [
    tasksRes, dealsRes, approvalsRes, clientsRes,
    invoicesRes, summariesRes, smmRes,
  ] = await Promise.allSettled([
    supabase.from("app_data").select("value").eq("key", "ov-ukoly-tasks").maybeSingle(),
    supabase.from("app_data").select("value").eq("key", "ov-pipeline-deals").maybeSingle(),
    supabase.from("app_data").select("value").eq("key", "ov-schvaleni-items").maybeSingle(),
    supabase.from("app_data").select("value").eq("key", "ov-monthly-clients").maybeSingle(),
    supabase.from("app_data").select("value").eq("key", "ov-issued-invoices").maybeSingle(),
    supabase.from("app_data").select("value").eq("key", "ov-finance-summaries").maybeSingle(),
    supabase.from("app_data").select("value").eq("key", "ov-smm-plan").maybeSingle(),
  ]);

  const tasks: Task[]           = tasksRes.status     === "fulfilled" && Array.isArray(tasksRes.value.data?.value)     ? tasksRes.value.data.value     : [];
  const deals: Deal[]           = dealsRes.status     === "fulfilled" && Array.isArray(dealsRes.value.data?.value)     ? dealsRes.value.data.value     : [];
  const approvals: Approval[]   = approvalsRes.status === "fulfilled" && Array.isArray(approvalsRes.value.data?.value) ? approvalsRes.value.data.value : [];
  const clients: RetainerClient[] = clientsRes.status === "fulfilled" && Array.isArray(clientsRes.value.data?.value)   ? clientsRes.value.data.value   : [];
  const invoices: Invoice[]     = invoicesRes.status  === "fulfilled" && Array.isArray(invoicesRes.value.data?.value)  ? invoicesRes.value.data.value  : [];
  const summaries: MonthSummary[] = summariesRes.status === "fulfilled" && Array.isArray(summariesRes.value.data?.value) ? summariesRes.value.data.value : [];
  const smmPosts: SmmPost[]     = smmRes.status       === "fulfilled" && Array.isArray(smmRes.value.data?.value)       ? smmRes.value.data.value       : [];

  // ── Meta API quick stats ─────────────────────────────────────────────────
  const token  = process.env.META_LONG_LIVED_TOKEN ?? "";
  const igId   = process.env.ONVISION_IG_ID ?? "";
  let igFollowers = 0;
  let igReach30d  = 0;

  if (token && igId) {
    try {
      const now   = Math.floor(Date.now() / 1000);
      const ago30 = now - 30 * 24 * 3600;
      const [profile, insights] = await Promise.allSettled([
        safeJson(fetch(`${META_API}/${igId}?fields=followers_count&access_token=${token}`)),
        safeJson(fetch(`${META_API}/${igId}/insights?metric=reach&period=day&metric_type=total_value&since=${ago30}&until=${now}&access_token=${token}`)),
      ]);
      if (profile.status === "fulfilled" && profile.value) {
        igFollowers = (profile.value.followers_count as number) ?? 0;
      }
      if (insights.status === "fulfilled" && insights.value) {
        const arr = (insights.value.data ?? []) as Array<{ total_value?: { value: number } }>;
        igReach30d = arr[0]?.total_value?.value ?? 0;
      }
    } catch {
      // Meta API optional — continue without it
    }
  }

  // ── Derive key facts ──────────────────────────────────────────────────────
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const in3days = new Date(today.getTime() + 3 * 24 * 3600 * 1000).toISOString().split("T")[0];
  const in7days = new Date(today.getTime() + 7 * 24 * 3600 * 1000).toISOString().split("T")[0];

  const activeTasks = tasks.filter(t => t.status !== "Hotovo");
  const urgentTasks = activeTasks.filter(t => t.priorita === "Urgentní");
  const dueSoonTasks = activeTasks.filter(t => t.deadline && t.deadline >= todayStr && t.deadline <= in3days);
  const overdueTasks = activeTasks.filter(t => t.deadline && t.deadline < todayStr);

  const pendingApprovals = approvals.filter(a => a.status === "Čeká");

  const unpaidInvoices = invoices.filter(inv => inv.stav === "Nezaplaceno" || inv.stav === "Po splatnosti");
  const overdueInvoices = invoices.filter(inv => inv.stav === "Po splatnosti");

  const smmPending = smmPosts.filter(p => p.status === "ke_schvaleni");
  const smmDueSoon = smmPosts.filter(p => p.datum >= todayStr && p.datum <= in7days && p.status !== "publikovano");

  const activeDeals = deals.filter(d => d.faze !== "Uzavřeno" && d.faze !== "Ztraceno");
  const dealTotal = activeDeals.reduce((s, d) => s + (d.hodnota ?? 0), 0);

  const latestSummary = summaries.length > 0 ? summaries[summaries.length - 1] : null;
  const prevSummary   = summaries.length > 1 ? summaries[summaries.length - 2] : null;
  const profitDiff    = latestSummary && prevSummary
    ? Math.round(((latestSummary.prijemCisty - prevSummary.prijemCisty) / Math.max(prevSummary.prijemCisty, 1)) * 100)
    : null;

  const activeClientsCount = clients.filter(c => c.aktivni).length;

  // ── Build Claude prompt ──────────────────────────────────────────────────
  const systemPrompt = `Jsi interní AI asistent kreativní agentury OnVision. Tvůj úkol je každé ráno připravit stručný, ale výstižný briefing pro jednatele. Piš v češtině, profesionálně, ale přímočaře. BEZ omáčky, BEZ intro fráze, BEZ "Samozřejmě".

Vrátíš POUZE validní JSON (bez markdown backticks) v tomto formátu:
{
  "greeting": "string — personalizovaný pozdrav podle denní doby, max 1 věta",
  "summary": "string — 1 věta shrnutí co je dnes nejdůležitější",
  "insights": [
    {
      "id": "unique-string",
      "severity": "high|medium|low|positive",
      "icon": "emoji",
      "text": "string — konkrétní zjištění s čísly",
      "link": "/cesta-v-app nebo null",
      "cta": "krátký text CTA nebo null"
    }
  ]
}

Pravidla pro insights:
- severity "high": věci co hoří (po splatnosti, urgentní, deadline dnes/zítra)
- severity "medium": věci co čekají nebo jsou brzy (deadline do 3 dnů, ke schválení)
- severity "low": informativní (pipeline, počty)
- severity "positive": dobré zprávy (finance v plusu, klient spokojen)
- Vždy uváděj konkrétní čísla, jména klientů, hodnoty
- Max 7 insights celkem, min 3
- Seřaď od nejdůležitějšího
- Pokud není žádné varování, dej aspoň 2 pozitivní insights
- "link" vyber z: /ukoly, /fakturace, /finance, /smm, /pipeline, /klienti, /reporty`;

  const userPrompt = `Dnešní datum: ${todayStr}
Jméno jednatele: ${userName}
Denní hodina: ${today.getHours()}

ÚKOLY:
- Aktivní: ${activeTasks.length}, Urgentní: ${urgentTasks.length}, Po deadlinu: ${overdueTasks.length}
- Deadline do 3 dnů: ${dueSoonTasks.map(t => `"${t.nazev}" (${t.prirazeno}, ${t.deadline})`).join(", ") || "žádné"}
- Urgentní: ${urgentTasks.map(t => `"${t.nazev}" (${t.prirazeno})`).join(", ") || "žádné"}
- Po deadlinu: ${overdueTasks.slice(0, 3).map(t => `"${t.nazev}" (${t.deadline})`).join(", ") || "žádné"}

SCHVÁLENÍ ČEKAJÍ: ${pendingApprovals.length}
${pendingApprovals.slice(0, 3).map(a => `- ${a.typ}: ${a.klient} — ${a.popis}${a.castka ? ` (${a.castka.toLocaleString("cs-CZ")} Kč)` : ""}`).join("\n") || "Žádné"}

FAKTURACE:
- Nezaplaceno celkem: ${unpaidInvoices.length} faktur
- Po splatnosti: ${overdueInvoices.length} faktur — ${overdueInvoices.slice(0, 3).map(inv => `${inv.klient} ${inv.castka?.toLocaleString("cs-CZ")} Kč`).join(", ") || "žádné"}

PIPELINE:
- Aktivní dealy: ${activeDeals.length}, celková hodnota: ${dealTotal.toLocaleString("cs-CZ")} Kč
- Dealy: ${activeDeals.slice(0, 4).map(d => `${d.klient} (${d.faze}, ${d.hodnota?.toLocaleString("cs-CZ")} Kč)`).join(", ") || "žádné"}

SMM:
- Ke schválení: ${smmPending.length} příspěvků
- Plánováno tento týden: ${smmDueSoon.length} příspěvků

FINANCE:
${latestSummary ? `- Poslední uzavřený měsíc (${latestSummary.mesic}): příjem ${latestSummary.prijemCelkovy.toLocaleString("cs-CZ")} Kč, zisk ${latestSummary.prijemCisty.toLocaleString("cs-CZ")} Kč${profitDiff !== null ? `, ${profitDiff > 0 ? "+" : ""}${profitDiff} % vs předchozí měsíc` : ""}` : "Žádná data"}

INSTAGRAM (OnVision):
- Sledující: ${igFollowers > 0 ? igFollowers.toLocaleString("cs-CZ") : "data nedostupná"}
- Dosah posledních 30 dní: ${igReach30d > 0 ? igReach30d.toLocaleString("cs-CZ") : "data nedostupná"}

KLIENTI:
- Aktivní retainer klienti: ${activeClientsCount}`;

  // ── Call Claude and parse ────────────────────────────────────────────────
  let briefing: BriefingResponse;
  try {
    const raw = await callClaude(systemPrompt, userPrompt, anthropicKey);
    const parsed = JSON.parse(raw);
    briefing = {
      greeting: parsed.greeting ?? `Dobrý den, ${userName}.`,
      summary:  parsed.summary  ?? "Přehled aktuální situace.",
      insights: Array.isArray(parsed.insights) ? parsed.insights : [],
      generatedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error("[dashboard/briefing] Parse error:", err);
    // Fallback: build basic briefing from data
    const fallbackInsights: BriefingInsight[] = [];
    if (urgentTasks.length > 0) {
      fallbackInsights.push({ id: "ut", severity: "high", icon: "🔥", text: `${urgentTasks.length} urgentní úkol${urgentTasks.length > 1 ? "y" : ""} čekají na řešení.`, link: "/ukoly", cta: "Zobrazit" });
    }
    if (overdueInvoices.length > 0) {
      fallbackInsights.push({ id: "oi", severity: "high", icon: "💸", text: `${overdueInvoices.length} faktur${overdueInvoices.length > 1 ? "y" : "a"} jsou po splatnosti.`, link: "/fakturace", cta: "Zobrazit" });
    }
    if (pendingApprovals.length > 0) {
      fallbackInsights.push({ id: "pa", severity: "medium", icon: "⏳", text: `${pendingApprovals.length} položek čeká na schválení.`, link: "/dashboard", cta: "Zobrazit" });
    }
    if (latestSummary) {
      fallbackInsights.push({ id: "fin", severity: "positive", icon: "💰", text: `Finance ${latestSummary.mesic}: zisk ${latestSummary.prijemCisty.toLocaleString("cs-CZ")} Kč.`, link: "/finance" });
    }
    briefing = {
      greeting: `Dobrý den, ${userName}.`,
      summary: "Přehled situace za dnes.",
      insights: fallbackInsights,
      generatedAt: new Date().toISOString(),
    };
  }

  return NextResponse.json(briefing);
}
