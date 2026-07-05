/**
 * Konzistence postů — hlídá, aby žádný klient nezůstal „potichu" na sítích.
 * Per klient spočítá, kolik postů je tento měsíc publikováno a kolik
 * naplánováno, porovná s cílem a označí rizika (nic naplánováno = churn).
 *
 * Čisté funkce, plně testovatelné.
 */

export interface CadencePost {
  klient?: string;
  datum?: string;    // ISO YYYY-MM-DD
  status?: string;   // "publikovano" = hotovo, ostatní = v plánu
}

export interface CadenceClient {
  name?: string;
  aktivni?: boolean;
  postyMesic?: number;   // volitelný cíl postů/měsíc
}

export type CadenceBand = "ok" | "pozadu" | "ticho";

export interface CadenceRow {
  klient: string;
  publikovano: number;
  naplanovano: number;
  celkem: number;
  cil: number;
  band: CadenceBand;
}

const norm = (s: string) => (s || "").toLowerCase().trim();
const PUBLISHED = "publikovano";

/** Měsíční klíč "YYYY-MM" z ISO data. */
export const ymOf = (iso: string) => (iso || "").slice(0, 7);

/**
 * Rozpad kadence per aktivní klient pro daný měsíc `ym` ("YYYY-MM").
 * @param defaultTarget cíl postů/měsíc, když klient nemá vlastní `postyMesic`
 */
export function cadenceByClient(
  posts: CadencePost[],
  clients: CadenceClient[],
  ym: string,
  defaultTarget = 8
): CadenceRow[] {
  const active = (clients ?? []).filter((c) => c.aktivni !== false && (c.name ?? "").trim());
  const monthPosts = (posts ?? []).filter((p) => ymOf(p.datum ?? "") === ym);

  return active
    .map((c) => {
      const mine = monthPosts.filter((p) => {
        const a = norm(p.klient ?? ""), b = norm(c.name!);
        return !!a && (a === b || a.includes(b) || b.includes(a));
      });
      const publikovano = mine.filter((p) => norm(p.status ?? "") === PUBLISHED).length;
      const naplanovano = mine.length - publikovano;
      const celkem = mine.length;
      const cil = c.postyMesic && c.postyMesic > 0 ? c.postyMesic : defaultTarget;
      const band: CadenceBand = celkem === 0 ? "ticho" : celkem < cil ? "pozadu" : "ok";
      return { klient: c.name!, publikovano, naplanovano, celkem, cil, band };
    })
    .sort((a, b) => {
      const rank = { ticho: 0, pozadu: 1, ok: 2 } as const;
      return rank[a.band] - rank[b.band] || a.celkem - b.celkem;
    });
}

export interface CadenceSummary { ticho: number; pozadu: number; ok: number; klientu: number }

export function cadenceSummary(rows: CadenceRow[]): CadenceSummary {
  return {
    ticho: rows.filter((r) => r.band === "ticho").length,
    pozadu: rows.filter((r) => r.band === "pozadu").length,
    ok: rows.filter((r) => r.band === "ok").length,
    klientu: rows.length,
  };
}
