/**
 * Produkční dny — zápis natáčecího/produkčního dne u měsíčního nebo
 * jednorázového projektu: koho jsme přiřadili, jaký má úkol a jakou odměnu.
 *
 * Z jednoho zápisu se odvozuje:
 *   • úkol pro každého člověka (BEZ ceny — vidí jen své zadání)
 *   • notifikace pro každého člověka (že byl přidán na zakázku)
 *   • přehled odměn po lidech („co platíme")
 *   • veřejný náhled pro člověka — jen JEHO úkol a odměna, nikdy celková
 *     cena zakázky ani odměny ostatních.
 *
 * Čisté funkce, plně testovatelné. Uloženo v klíči ov-produkce-dny
 * (čte/píše jen admin + fakturace).
 */

export interface DenPerson {
  jmeno: string;        // křestní jméno (párování úkolů/notifikací)
  email?: string;       // pro cílení notifikace (jen účty, co existují)
  ukol: string;         // co má daný člověk udělat
  odmena: number;       // Kč — jeho odměna za den (nikdy se neposílá ostatním)
}

export interface ProdukcniDen {
  id: number;
  zdroj: "monthly" | "oneoff";
  projekt: string;      // název projektu / zakázky
  klient: string;
  datum: string;        // "D. M. YYYY" nebo ISO
  popis: string;        // co se natáčí (scénář v kostce)
  lokace?: string;
  people: DenPerson[];
  createdAt: string;
  createdBy?: string;
  // ── Detaily akce (doplňují se na /shooting; vidí je i označení lidé) ──
  casZacatek?: string;  // začátek (např. "8:00")
  casKonec?: string;    // konec
  sraz?: string;        // místo + čas srazu
  scenar?: string;      // scénář / průběh dne (delší text)
  podklady?: string;    // odkaz na podklady (Drive, moodboard…)
  kontakt?: string;     // kontakt na místě (jméno + telefon)
  poznamka?: string;    // volná poznámka
  shareToken?: string;  // veřejný odkaz na akci /a/[token] (bez cen)
}

/* ── Odvozené úkoly (bez ceny) ──────────────────────────────────────────────── */
export interface DerivedTask {
  id: number; nazev: string; projekt: string; prirazeno: string;
  priorita: string; status: string; deadline: string;
}

/** Pro každého člověka jeden úkol — jen jeho zadání, ŽÁDNÁ částka. */
export function tasksForDen(den: ProdukcniDen, baseId: number): DerivedTask[] {
  return (den.people ?? []).filter((p) => p.jmeno?.trim() && p.ukol?.trim()).map((p, i) => ({
    id: baseId + i,
    nazev: p.ukol.trim(),
    projekt: `${den.projekt}${den.lokace ? ` · ${den.lokace}` : ""}`,
    prirazeno: p.jmeno.trim(),
    priorita: "Střední",
    status: "Nové",
    deadline: den.datum || "",
  }));
}

/* ── Odvozené notifikace ────────────────────────────────────────────────────── */
export interface DerivedNotif {
  id: string; type: "task_assigned"; title: string; body: string;
  url: string; createdAt: string; targetEmail: string | null;
}

/** Notifikace „byl jsi přidán na produkční den" — cílená jen na daného člověka.
 *  Lidé bez e-mailu (externisté bez účtu) se vynechají — ti dostanou sdílený odkaz. */
export function notifsForDen(den: ProdukcniDen): DerivedNotif[] {
  return (den.people ?? []).filter((p) => p.email && p.jmeno?.trim()).map((p) => ({
    id: `den-${den.id}-${p.email}`,
    type: "task_assigned" as const,
    title: `Přidán na produkční den · ${den.projekt}`,
    body: `${den.datum}${den.lokace ? ` · ${den.lokace}` : ""} — tvůj úkol: ${p.ukol}`,
    url: "/ukoly",
    createdAt: den.createdAt,
    targetEmail: p.email!,
  }));
}

/* ── Odměny po lidech („co platíme") ────────────────────────────────────────── */
export interface OdmenaRow { jmeno: string; email?: string; celkem: number; pocetDni: number }

/** Souhrn odměn napříč dny pro daný měsíc (nebo všechny). */
export function odmenyByPerson(dny: ProdukcniDen[], mesicFilter?: (den: ProdukcniDen) => boolean): OdmenaRow[] {
  const map = new Map<string, OdmenaRow>();
  (dny ?? []).filter((d) => !mesicFilter || mesicFilter(d)).forEach((d) => {
    (d.people ?? []).forEach((p) => {
      const key = p.jmeno.trim().toLowerCase();
      if (!key) return;
      const cur = map.get(key) ?? { jmeno: p.jmeno.trim(), email: p.email, celkem: 0, pocetDni: 0 };
      cur.celkem += p.odmena || 0;
      cur.pocetDni += 1;
      map.set(key, cur);
    });
  });
  return [...map.values()].sort((a, b) => b.celkem - a.celkem);
}

/* ── Veřejný náhled pro člověka — bez celkové ceny a odměn ostatních ─────────── */
export interface PersonDenView {
  projekt: string; klient: string; datum: string; popis: string;
  lokace: string; mujUkol: string; mojeOdmena: number;
}

/* ── Veřejný náhled akce (sdílený odkaz pro lidi bez loginu) ─────────────────── */
export interface PublicDenView {
  projekt: string; klient: string; datum: string;
  casZacatek: string; casKonec: string; sraz: string; lokace: string;
  scenar: string; podklady: string; kontakt: string; poznamka: string;
  tym: { jmeno: string; ukol: string }[];  // jména + úkoly, ŽÁDNÉ odměny
}

/** Veřejný pohled na akci — logistika + tým (jména + úkoly).
 *  ŽÁDNÉ odměny, žádná celková cena. Bezpečné pro sdílený odkaz. */
export function publicDenView(den: ProdukcniDen): PublicDenView {
  return {
    projekt: den.projekt, klient: den.klient, datum: den.datum,
    casZacatek: den.casZacatek ?? "", casKonec: den.casKonec ?? "",
    sraz: den.sraz ?? "", lokace: den.lokace ?? "",
    scenar: den.scenar ?? "", podklady: den.podklady ?? "",
    kontakt: den.kontakt ?? "", poznamka: den.poznamka ?? "",
    tym: (den.people ?? []).map((p) => ({ jmeno: p.jmeno, ukol: p.ukol })),
  };
}

/** Co daný člověk vidí o produkčním dni — JEN jeho úkol a jeho odměna.
 *  Nikdy neobsahuje celkovou cenu zakázky ani odměny/úkoly ostatních. */
export function personDenView(den: ProdukcniDen, jmeno: string): PersonDenView | null {
  const me = (den.people ?? []).find((p) => p.jmeno.trim().toLowerCase() === jmeno.trim().toLowerCase());
  if (!me) return null;
  return {
    projekt: den.projekt, klient: den.klient, datum: den.datum,
    popis: den.popis ?? "", lokace: den.lokace ?? "",
    mujUkol: me.ukol, mojeOdmena: me.odmena || 0,
  };
}
