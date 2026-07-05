/**
 * Barometr firmy — jedno skóre 0–100, které jednateli řekne „jak na tom
 * jsme?" ze čtyř pilířů, které už systém měří:
 *
 *   Peníze (35 %)   — kladná marže, žádný cash gap, nízké pohledávky
 *   Klienti (30 %)  — kolik retainerů je v riziku churnu (health)
 *   Růst (20 %)     — trend MRR + pokrytí pipeline
 *   Provoz (15 %)   — úkoly po termínu / v termínu
 *
 * Vrací skóre, pásmo a nejsilnější „taháky" (co pomáhá / co brzdí),
 * ať jednatel hned ví, kam se dívat. Čisté funkce, plně testovatelné.
 */

export interface VitalsInput {
  mrr: number;                 // měsíční recurring příjem
  monthlyExpenses: number;     // měsíční recurring výdaje
  balance: number;             // aktuální zůstatek
  cashGap: boolean;            // hrozí díra v 6měs. projekci?
  overdueTotal: number;        // suma faktur po splatnosti
  clientsActive: number;       // počet aktivních retainerů
  clientsAtRisk: number;       // z toho v health riziku
  mrrTrendPct: number | null;  // % změna MRR za ~30 dní (null = bez historie)
  weightedPipeline: number;    // vážený výhled otevřených dealů
  openTasks: number;
  lateTasks: number;
}

export type VitalsBand = "výborně" | "dobře" | "pozor" | "kriticky";
export interface VitalsDriver { pilar: string; positive: boolean; text: string }
export interface VitalsPillar { key: string; label: string; score: number; weight: number }
export interface VitalsResult {
  score: number;
  band: VitalsBand;
  color: string;
  pillars: VitalsPillar[];
  drivers: VitalsDriver[];
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function companyVitals(i: VitalsInput): VitalsResult {
  const net = i.mrr - i.monthlyExpenses;

  // ── Peníze ──
  let penize = 60;
  if (i.mrr > 0) {
    const margin = net / i.mrr;                 // -∞..1
    penize = 50 + margin * 60;                  // 30 % marže ≈ 68
  }
  if (i.cashGap) penize -= 35;
  if (i.mrr > 0) penize -= Math.min(30, (i.overdueTotal / i.mrr) * 30); // 1 měsíc dluhu = −30
  penize = clamp(penize);

  // ── Klienti (churn) ──
  const riskRatio = i.clientsActive > 0 ? i.clientsAtRisk / i.clientsActive : 0;
  const klienti = clamp(100 - riskRatio * 130); // 1 z ~1.3 v riziku = 0

  // ── Růst ──
  let rust = 60;
  if (i.mrrTrendPct != null) rust = 60 + i.mrrTrendPct * 3; // +10 % MRR ≈ 90
  const coverage = i.mrr > 0 ? i.weightedPipeline / i.mrr : 0; // pipeline vs měsíční MRR
  rust += Math.min(20, coverage * 6);           // 3× MRR v pipeline = +18
  rust = clamp(rust);

  // ── Provoz ──
  const lateRatio = i.openTasks > 0 ? i.lateTasks / i.openTasks : 0;
  const provoz = clamp(100 - lateRatio * 90);

  const pillars: VitalsPillar[] = [
    { key: "penize", label: "Peníze", score: penize, weight: 0.35 },
    { key: "klienti", label: "Klienti", score: klienti, weight: 0.30 },
    { key: "rust", label: "Růst", score: rust, weight: 0.20 },
    { key: "provoz", label: "Provoz", score: provoz, weight: 0.15 },
  ];

  const score = clamp(pillars.reduce((s, p) => s + p.score * p.weight, 0));
  const band: VitalsBand = score >= 80 ? "výborně" : score >= 60 ? "dobře" : score >= 40 ? "pozor" : "kriticky";
  const color = score >= 80 ? "oklch(0.7 0.17 155)" : score >= 60 ? "oklch(0.72 0.16 130)" : score >= 40 ? "oklch(0.78 0.165 75)" : "oklch(0.62 0.24 25)";

  // ── Taháky: nejlepší a nejhorší pilíř + konkrétní důvody ──
  const drivers: VitalsDriver[] = [];
  if (i.cashGap) drivers.push({ pilar: "Peníze", positive: false, text: "hrozí cash gap v 6měsíční projekci" });
  if (i.clientsAtRisk > 0) drivers.push({ pilar: "Klienti", positive: false, text: `${i.clientsAtRisk} z ${i.clientsActive} klientů v riziku churnu` });
  if (i.overdueTotal > 0 && i.mrr > 0 && i.overdueTotal / i.mrr > 0.3) drivers.push({ pilar: "Peníze", positive: false, text: `${Math.round(i.overdueTotal).toLocaleString("cs-CZ")} Kč po splatnosti` });
  if (i.lateTasks > 0 && lateRatio > 0.25) drivers.push({ pilar: "Provoz", positive: false, text: `${i.lateTasks} úkolů po termínu` });
  if (i.mrrTrendPct != null && i.mrrTrendPct <= -5) drivers.push({ pilar: "Růst", positive: false, text: `MRR kleslo o ${Math.abs(Math.round(i.mrrTrendPct))} %` });
  // pozitiva
  if (net > 0 && !i.cashGap) drivers.push({ pilar: "Peníze", positive: true, text: `měsíční přebytek ${Math.round(net).toLocaleString("cs-CZ")} Kč` });
  if (i.mrrTrendPct != null && i.mrrTrendPct >= 5) drivers.push({ pilar: "Růst", positive: true, text: `MRR roste o ${Math.round(i.mrrTrendPct)} %` });
  if (i.clientsActive > 0 && i.clientsAtRisk === 0) drivers.push({ pilar: "Klienti", positive: true, text: "žádný klient v riziku" });

  return { score, band, color, pillars, drivers: drivers.slice(0, 5) };
}
