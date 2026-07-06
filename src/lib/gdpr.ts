/* ── GDPR: informace o zpracování + evidence souhlasů ─────────────────────────
 * Generátor textů a evidence stavu pro klienty. POZOR: šablony jsou vzor,
 * který má před ostrým použitím schválit právník / DPO firmy. Nejde o právní
 * radu — jen o praktickou přípravu dokumentů předvyplněných firemními údaji. */

export interface Spravce {
  nazev: string; ico: string; adresa: string; email: string; web: string;
}

export const ONVISION_SPRAVCE: Spravce = {
  nazev: "OnVision s.r.o.",
  ico: "23052341",
  adresa: "Křenová 64/13, 602 00 Brno",
  email: "info@onvision.cz",
  web: "www.onvision.cz",
};

/* ── Evidence stavu GDPR u klienta ──────────────────────────────────────────── */
export type ConsentStav = "informovan" | "souhlas" | "odmitnuto" | "nevyrizeno";

export interface ConsentRecord {
  id: number;
  klient: string;          // název klienta (dle IČO)
  stav: ConsentStav;
  datum: string;           // ISO datum, kdy byl informován / dal souhlas
  zpusob: string;          // e-mail / osobně / smlouva / web…
  poznamka?: string;
  by?: string;             // kdo to zaevidoval
  updatedAt: string;
}

export const CONSENT_STAV_LABEL: Record<ConsentStav, string> = {
  informovan: "Informován",
  souhlas: "Souhlas udělen",
  odmitnuto: "Odmítnuto",
  nevyrizeno: "Nevyřízeno",
};

/* ── Text: Informace o zpracování osobních údajů (pro klienta) ───────────────── */
export function privacyNoticeText(klient: string, s: Spravce = ONVISION_SPRAVCE): string {
  const dnes = "____________"; // datum doplní uživatel při tisku
  return `INFORMACE O ZPRACOVÁNÍ OSOBNÍCH ÚDAJŮ

Správce údajů:
${s.nazev}, IČO ${s.ico}, se sídlem ${s.adresa}
E-mail: ${s.email}, web: ${s.web}

Klient / smluvní partner: ${klient}

1) Jaké údaje zpracováváme
Kontaktní a identifikační údaje kontaktních osob klienta (jméno a příjmení,
pracovní pozice, e-mail, telefon), fakturační a identifikační údaje (IČO, DIČ,
sídlo), údaje nezbytné pro plnění zakázky a vzájemnou komunikaci.

2) Účel zpracování
- plnění smlouvy a poskytování sjednaných služeb,
- vzájemná komunikace a řízení zakázky,
- fakturace a vedení účetnictví,
- plnění zákonných povinností správce.

3) Právní základ (dle čl. 6 GDPR)
- plnění smlouvy (čl. 6 odst. 1 písm. b),
- plnění právní povinnosti — účetnictví, daně (čl. 6 odst. 1 písm. c),
- oprávněný zájem správce — ochrana práv, evidence zakázek (čl. 6 odst. 1 písm. f).

4) Doba uchování
Po dobu trvání spolupráce a dále po dobu vyžadovanou právními předpisy
(účetní a daňové doklady zpravidla 10 let). Poté jsou údaje vymazány.

5) Příjemci údajů
Údaje mohou být předány zpracovatelům správce: účetní/daňový poradce,
poskytovatelé IT a cloudových služeb (hosting, úložiště dat), případně
subdodavatelé nezbytní pro splnění zakázky. Se zpracovateli má správce
uzavřené odpovídající smlouvy. Údaje nejsou předávány mimo EU bez záruk.

6) Vaše práva
Máte právo na přístup k údajům, jejich opravu, výmaz, omezení zpracování,
přenositelnost, právo vznést námitku a právo podat stížnost u Úřadu pro
ochranu osobních údajů (www.uoou.cz). Práva uplatníte na e-mailu ${s.email}.

7) Zpracování osobních údajů třetích osob
Pokud v rámci zakázky předáte správci osobní údaje třetích osob (např. osob
zachycených na fotografiích či videích), odpovídáte za získání jejich souhlasu,
nebo se strany dohodnou na uzavření zpracovatelské smlouvy.

Datum: ${dnes}                     ${s.nazev}

Tento dokument je informativní; podpis stvrzuje seznámení s obsahem.`;
}

/* ── Text: Souhlas s pořízením a užitím podobizny (model release) ────────────── */
export function modelReleaseText(opts: {
  osoba?: string; ucel?: string; s?: Spravce;
}): string {
  const s = opts.s ?? ONVISION_SPRAVCE;
  const osoba = opts.osoba?.trim() || "____________________";
  const ucel = opts.ucel?.trim() || "propagace klienta na sociálních sítích a webu";
  return `SOUHLAS S POŘÍZENÍM A UŽITÍM PODOBIZNY

Já, níže podepsaný/á: ${osoba}

uděluji společnosti ${s.nazev}, IČO ${s.ico}, se sídlem ${s.adresa},
souhlas s pořízením fotografií a/nebo audiovizuálních záznamů mé osoby (podobizny)
a s jejich užitím pro účel: ${ucel}.

Souhlas se vztahuje na zveřejnění na sociálních sítích, webových stránkách a
v propagačních materiálech. Souhlas uděluji na dobu 5 let, není-li níže uvedeno
jinak, a beru na vědomí, že jej mohu kdykoli písemně odvolat na e-mailu ${s.email};
odvolání nemá vliv na zákonnost zpracování před odvoláním.

Za užití podobizny mi nenáleží odměna. Prohlašuji, že jsem starší 18 let
(za nezletilého podepisuje zákonný zástupce).

Datum: ____________     Podpis: ____________________`;
}

/* ── Stav GDPR napříč klienty (kdo je pokrytý, kdo chybí) ────────────────────── */
export interface GdprClientStatus {
  klient: string;
  record: ConsentRecord | null;
  covered: boolean;   // má informovan/souhlas
}

const norm = (s: string) => (s || "").toLowerCase().trim();

export function gdprStatusForClients(
  clientNames: string[],
  records: ConsentRecord[]
): GdprClientStatus[] {
  return clientNames.map((klient) => {
    const record =
      records
        .filter((r) => norm(r.klient) === norm(klient))
        .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""))[0] ?? null;
    const covered = !!record && (record.stav === "informovan" || record.stav === "souhlas");
    return { klient, record, covered };
  });
}

export function gdprSummary(statuses: GdprClientStatus[]): {
  total: number; covered: number; missing: number; missingNames: string[];
} {
  const covered = statuses.filter((s) => s.covered).length;
  const missingNames = statuses.filter((s) => !s.covered).map((s) => s.klient);
  return { total: statuses.length, covered, missing: missingNames.length, missingNames };
}
