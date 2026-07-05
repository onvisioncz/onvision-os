/**
 * Content pilíře — vyváženost obsahu klienta. SMM manažeři plánují podle
 * pilířů (edukace / promo / za oponou…). Tenhle výpočet ukáže, jestli
 * plán není třeba z 90 % promo a které pilíře se vůbec nevyužívají.
 *
 * Čisté funkce, plně testovatelné.
 */

export interface BalancePost {
  klient?: string;
  pillar?: string;   // id pilíře
  datum?: string;    // ISO, volitelně pro filtr měsíce
}

export interface BalancePillar {
  id: string;
  klient: string;
  label: string;
  emoji?: string;
  color?: string;
}

export interface PillarSlice {
  id: string;
  label: string;
  emoji?: string;
  color?: string;
  count: number;
  pct: number;       // 0–100 z celkového počtu postů klienta
}

export interface PillarBalance {
  klient: string;
  total: number;
  slices: PillarSlice[];      // vč. „Nezařazeno" jako poslední, pokud existuje
  unused: PillarSlice[];      // definované pilíře s 0 posty
  dominant: PillarSlice | null; // pilíř nad prahem dominance
  vyvazene: boolean;          // žádný pilíř nedominuje a ≤1 nevyužitý
}

const norm = (s: string) => (s || "").toLowerCase().trim();

/**
 * Rozložení postů klienta do jeho pilířů.
 * @param dominanceThreshold podíl (0–1), nad kterým pilíř „dominuje" (default 0.6)
 * @param ym volitelný měsíc "YYYY-MM"; když je zadán, počítají se jen posty toho měsíce
 */
export function pillarBalance(
  posts: BalancePost[],
  pillars: BalancePillar[],
  klient: string,
  dominanceThreshold = 0.6,
  ym?: string
): PillarBalance {
  const k = norm(klient);
  const clientPillars = (pillars ?? []).filter((p) => norm(p.klient) === k);
  const clientPosts = (posts ?? [])
    .filter((p) => norm(p.klient ?? "") === k)
    .filter((p) => (ym ? (p.datum ?? "").slice(0, 7) === ym : true));

  const total = clientPosts.length;
  const countFor = (id: string) => clientPosts.filter((p) => (p.pillar ?? "") === id).length;

  const slices: PillarSlice[] = clientPillars.map((p) => {
    const count = countFor(p.id);
    return { id: p.id, label: p.label, emoji: p.emoji, color: p.color, count, pct: total ? Math.round((count / total) * 100) : 0 };
  });

  // Posty bez pilíře (nebo s neznámým id)
  const knownIds = new Set(clientPillars.map((p) => p.id));
  const nezarazeno = clientPosts.filter((p) => !p.pillar || !knownIds.has(p.pillar)).length;
  if (nezarazeno > 0) {
    slices.push({ id: "__none__", label: "Nezařazeno", count: nezarazeno, pct: total ? Math.round((nezarazeno / total) * 100) : 0 });
  }

  const defined = slices.filter((s) => s.id !== "__none__");
  const unused = defined.filter((s) => s.count === 0);
  const dominant = total > 0
    ? defined.find((s) => s.count / total >= dominanceThreshold) ?? null
    : null;
  const vyvazene = total > 0 && !dominant && unused.length <= 1;

  // Seřaď podle počtu sestupně (Nezařazeno vždy na konec)
  slices.sort((a, b) => (a.id === "__none__" ? 1 : b.id === "__none__" ? -1 : b.count - a.count));

  return { klient, total, slices, unused, dominant, vyvazene };
}
