/**
 * Párování plateb z banky — čisté funkce, plně otestované.
 *
 * Účetní/fakturace nahrají CSV výpis z banky (FIO, KB, ČSOB, Raiffeisen…),
 * my z něj vytáhneme příchozí platby (částka, variabilní symbol, datum) a
 * napárujeme je na nezaplacené faktury podle VS + částky. Uživatel pak jedním
 * klikem označí fakturu jako zaplacenou. Žádné ruční odškrtávání.
 *
 * Nic se nikam neposílá — CSV se parsuje v prohlížeči.
 */
import type { AnyInvoice } from "./overdue";

export interface BankTx {
  amount: number;      // kladná = příchozí platba
  vs: string;          // variabilní symbol (jen číslice)
  date: string;        // ISO nebo původní řetězec
  message: string;     // zpráva pro příjemce / poznámka
  counterparty: string;
}

export type Confidence = "high" | "medium" | "low";

export interface MatchSuggestion {
  invoiceCislo: string;
  invoiceKlient: string;
  invoiceCastka: number;
  tx: BankTx;
  confidence: Confidence;
  reason: string;
}

/* ── Parsování čísla v českém i anglickém formátu ───────────────────────── */
export function parseAmount(raw: string): number {
  let s = (raw ?? "").trim().replace(/\s/g, "").replace(/[^\d.,-]/g, "");
  if (s === "" || s === "-") return NaN;
  // Když jsou obě oddělovače, poslední je desetinný.
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) {
    if (lastComma > lastDot) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (lastComma > -1) {
    // jen čárka → desetinná čárka
    s = s.replace(",", ".");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

/* ── Detekce oddělovače a hlaviček ──────────────────────────────────────── */
function splitCsvLine(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
    else if (c === delim && !inQ) { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim().replace(/^"|"$/g, ""));
}

const COL_KEYS = {
  amount: ["částka", "castka", "amount", "objem", "suma", "hodnota"],
  vs: ["vs", "variabilní", "variabilni", "var. symbol", "variabilní symbol", "variablesymbol"],
  date: ["datum", "date", "proveden", "zaúčtování", "zauctovani"],
  message: ["zpráva", "zprava", "poznámka", "poznamka", "message", "detail", "popis"],
  counterparty: ["protistrana", "název", "nazev", "účet", "ucet", "counterparty", "odesílatel", "odesilatel"],
};

function findCol(headers: string[], keys: string[]): number {
  const low = headers.map((h) => h.toLowerCase());
  for (const k of keys) {
    const idx = low.findIndex((h) => h.includes(k));
    if (idx > -1) return idx;
  }
  return -1;
}

/** Rozparsuje CSV výpis z banky na příchozí transakce. */
export function parseBankCsv(text: string): BankTx[] {
  const lines = (text ?? "").split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length < 2) return [];
  // Oddělovač: víc středníků než čárek → ";"
  const semis = (lines[0].match(/;/g) ?? []).length;
  const commas = (lines[0].match(/,/g) ?? []).length;
  const delim = semis >= commas ? ";" : ",";

  const headers = splitCsvLine(lines[0], delim);
  const cAmount = findCol(headers, COL_KEYS.amount);
  const cVs = findCol(headers, COL_KEYS.vs);
  const cDate = findCol(headers, COL_KEYS.date);
  const cMsg = findCol(headers, COL_KEYS.message);
  const cCp = findCol(headers, COL_KEYS.counterparty);
  if (cAmount === -1) return []; // bez částky nemá smysl párovat

  const out: BankTx[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i], delim);
    const amount = parseAmount(cells[cAmount] ?? "");
    if (!Number.isFinite(amount) || amount <= 0) continue; // jen příchozí platby
    out.push({
      amount,
      vs: (cVs > -1 ? cells[cVs] ?? "" : "").replace(/\D/g, ""),
      date: cDate > -1 ? (cells[cDate] ?? "").trim() : "",
      message: cMsg > -1 ? (cells[cMsg] ?? "").trim() : "",
      counterparty: cCp > -1 ? (cells[cCp] ?? "").trim() : "",
    });
  }
  return out;
}

/* ── Párování na nezaplacené faktury ────────────────────────────────────── */
function invoiceVs(inv: AnyInvoice): string {
  return (inv.cislo ?? "").replace(/\D/g, "");
}

/**
 * Napáruje transakce na nezaplacené faktury.
 *   high   = VS i částka sedí
 *   medium = jen částka sedí (a je jednoznačná), nebo VS sedí a částka skoro
 *   low    = VS sedí, ale částka ne (nebo naopak) — jen k ruční kontrole
 */
export function matchPayments(transactions: BankTx[], invoices: AnyInvoice[]): MatchSuggestion[] {
  const unpaid = invoices.filter((i) => {
    const st = i.stav ?? "";
    return st !== "Zaplacena" && st !== "Storno";
  });
  const suggestions: MatchSuggestion[] = [];

  for (const tx of transactions) {
    let best: MatchSuggestion | null = null;
    const amountMatches = unpaid.filter((inv) => Math.round(Number(inv.castka ?? 0)) === Math.round(tx.amount));

    for (const inv of unpaid) {
      const vs = invoiceVs(inv);
      const vsHit = tx.vs !== "" && vs !== "" && tx.vs === vs;
      const amtHit = Math.round(Number(inv.castka ?? 0)) === Math.round(tx.amount);

      let confidence: Confidence | null = null;
      let reason = "";
      if (vsHit && amtHit) { confidence = "high"; reason = "VS i částka sedí"; }
      else if (amtHit && amountMatches.length === 1) { confidence = "medium"; reason = "částka sedí jednoznačně (bez VS)"; }
      else if (vsHit && !amtHit) { confidence = "low"; reason = "VS sedí, ale částka se liší"; }
      else continue;

      const cand: MatchSuggestion = {
        invoiceCislo: inv.cislo ?? "",
        invoiceKlient: inv.klientNazev ?? inv.klient ?? "?",
        invoiceCastka: Number(inv.castka ?? 0),
        tx, confidence, reason,
      };
      const rank = { high: 3, medium: 2, low: 1 };
      if (!best || rank[cand.confidence] > rank[best.confidence]) best = cand;
    }
    if (best) suggestions.push(best);
  }
  return suggestions;
}
