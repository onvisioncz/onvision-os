/**
 * Historie MRR a klíčových metrik v čase — aby systém uměl říct nejen
 * „kolik teď", ale „jak se to hýbe". Bez tohohle nejde dělat trend ani
 * detekce anomálií (propad MRR, nárůst pohledávek).
 *
 * Snímek se ukládá 1× denně (dedup na den) do klíče `ov-mrr-history`.
 * Čisté funkce, plně testovatelné.
 */

export interface MrrSnapshot {
  date: string;            // ISO YYYY-MM-DD
  mrr: number;             // recurring příjem (paušály + reklama aktivních)
  klientu: number;         // počet aktivních retainer klientů
  pohledavky: number;      // suma po splatnosti
  rizik: number;           // počet klientů v health riziku
}

const MAX_HISTORY = 400;   // ~13 měsíců denních snímků

/** Přidá/nahradí snímek pro daný den, seřadí a ořízne historii. */
export function appendSnapshot(history: MrrSnapshot[], snap: MrrSnapshot): MrrSnapshot[] {
  const rest = (history ?? []).filter((s) => s.date !== snap.date);
  return [...rest, snap].sort((a, b) => a.date.localeCompare(b.date)).slice(-MAX_HISTORY);
}

/** Nejbližší snímek starý alespoň `days` dní vůči poslednímu (pro srovnání). */
export function snapshotDaysAgo(history: MrrSnapshot[], days: number): MrrSnapshot | null {
  if (!history?.length) return null;
  const latest = history[history.length - 1];
  const cutoff = Date.parse(latest.date + "T00:00:00Z") - days * 86_400_000;
  // nejnovější snímek, který je <= cutoff
  let best: MrrSnapshot | null = null;
  for (const s of history) {
    if (Date.parse(s.date + "T00:00:00Z") <= cutoff) best = s;
  }
  return best;
}

export interface Trend {
  from: MrrSnapshot;
  to: MrrSnapshot;
  deltaAbs: number;
  deltaPct: number;        // vůči starší hodnotě; 0 když starší = 0
  direction: "up" | "down" | "flat";
}

/** Trend MRR mezi posledním snímkem a snímkem starým ~`days` dní. */
export function mrrTrend(history: MrrSnapshot[], days = 30): Trend | null {
  if (!history?.length) return null;
  const to = history[history.length - 1];
  const from = snapshotDaysAgo(history, days);
  if (!from || from.date === to.date) return null;
  const deltaAbs = to.mrr - from.mrr;
  const deltaPct = from.mrr !== 0 ? (deltaAbs / from.mrr) * 100 : 0;
  const direction = Math.abs(deltaPct) < 0.5 ? "flat" : deltaAbs > 0 ? "up" : "down";
  return { from, to, deltaAbs, deltaPct, direction };
}

export interface Anomaly { metric: "mrr" | "pohledavky"; message: string; deltaPct: number }

/**
 * Anomálie mezi posledními dvěma snímky (den na den nebo poslední pár):
 *  - propad MRR o víc než `mrrDropPct` %
 *  - skok pohledávek o víc než `arGrowPct` % (a aspoň o 5 000 Kč)
 */
export function detectAnomalies(history: MrrSnapshot[], mrrDropPct = 5, arGrowPct = 30): Anomaly[] {
  if (!history || history.length < 2) return [];
  const to = history[history.length - 1];
  const from = history[history.length - 2];
  const out: Anomaly[] = [];

  if (from.mrr > 0) {
    const pct = ((to.mrr - from.mrr) / from.mrr) * 100;
    if (pct <= -mrrDropPct) out.push({ metric: "mrr", deltaPct: pct, message: `MRR kleslo o ${Math.abs(Math.round(pct))} % (${Math.round(from.mrr).toLocaleString("cs-CZ")} → ${Math.round(to.mrr).toLocaleString("cs-CZ")} Kč)` });
  }
  if (to.pohledavky - from.pohledavky >= 5000 && from.pohledavky > 0) {
    const pct = ((to.pohledavky - from.pohledavky) / from.pohledavky) * 100;
    if (pct >= arGrowPct) out.push({ metric: "pohledavky", deltaPct: pct, message: `Pohledávky po splatnosti vzrostly o ${Math.round(pct)} % (${Math.round(from.pohledavky).toLocaleString("cs-CZ")} → ${Math.round(to.pohledavky).toLocaleString("cs-CZ")} Kč)` });
  }
  return out;
}
