/**
 * Exporty pro účetní — čisté transformace faktur na CSV.
 *
 * Faktury žijí ve dvou skladech (ov-issued-invoices + ov-finance-faktury);
 * export je sloučí a deduplikuje podle čísla (stejná logika jako overdue.ts),
 * takže účetní dostane jeden kompletní seznam bez duplicit.
 */
import type { AnyInvoice } from "./overdue";

export interface CsvInvoiceRow {
  cislo: string;
  klient: string;
  castka: number;
  stav: string;
  datumVystaveni: string;
  datumSplatnosti: string;
}

/** Sloučí sklady faktur, dedup dle čísla (fallback klient|částka). */
export function mergeInvoices(...sources: AnyInvoice[][]): CsvInvoiceRow[] {
  const seen = new Set<string>();
  const rows: CsvInvoiceRow[] = [];
  for (const list of sources) {
    for (const inv of list ?? []) {
      const key = (inv.cislo || `${inv.klient ?? inv.klientNazev ?? ""}|${inv.castka ?? 0}`)
        .trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({
        cislo: inv.cislo ?? "",
        klient: inv.klientNazev ?? inv.klient ?? "",
        castka: Number(inv.castka ?? 0),
        stav: inv.stav ?? "",
        datumVystaveni: inv.datumVystaveni ?? inv.datum ?? "",
        datumSplatnosti: inv.datumSplatnosti ?? inv.splatnost ?? "",
      });
    }
  }
  return rows;
}

/** Escapuje jednu buňku pro CSV (oddělovač ; dle českého Excelu). */
export function csvCell(v: string | number): string {
  const s = String(v ?? "");
  if (/[";\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * CSV pro účetní. Oddělovač ";", UTF-8 BOM (aby Excel korektně zobrazil
 * diakritiku), částky jako čisté číslo bez symbolu.
 */
export function invoicesToCsv(...sources: AnyInvoice[][]): string {
  const rows = mergeInvoices(...sources);
  const header = ["Číslo", "Klient", "Částka", "Stav", "Datum vystavení", "Datum splatnosti"];
  const lines = [header.map(csvCell).join(";")];
  for (const r of rows) {
    lines.push([
      csvCell(r.cislo),
      csvCell(r.klient),
      csvCell(r.castka),
      csvCell(r.stav),
      csvCell(r.datumVystaveni),
      csvCell(r.datumSplatnosti),
    ].join(";"));
  }
  return "﻿" + lines.join("\r\n");
}
