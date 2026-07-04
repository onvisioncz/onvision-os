/**
 * Kontrola měsíční fakturace — kdo z aktivních klientů ještě nemá fakturu.
 *
 * Audit: měsíční uzávěrka je křehká, snadno se zapomene někoho vyfakturovat.
 * Tahle čistá funkce porovná aktivní měsíční klienty s vystavenými fakturami
 * za daný měsíc a vrátí, kdo ještě chybí. Plně testovatelné.
 */

export interface ClientLite {
  name: string;
  aktivni?: boolean;
  pausal?: number;
}

export interface IssuedLite {
  klient?: string;
  klientNazev?: string;
  mesicSluzby?: number; // 1–12, 0 = jednorázová
  rokSluzby?: number;
  datumVystaveni?: string;
}

export interface InvoicingStatus {
  invoiced: ClientLite[];
  pending: ClientLite[];
  month: number;
  year: number;
}

function norm(s: string | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

/** Má klient vystavenou fakturu za daný měsíc/rok? */
function hasInvoice(client: ClientLite, invoices: IssuedLite[], month: number, year: number): boolean {
  const cn = norm(client.name);
  return invoices.some((inv) => {
    const matchName = norm(inv.klient) === cn || norm(inv.klientNazev) === cn;
    if (!matchName) return false;
    // Primárně dle mesicSluzby/rokSluzby; fallback dle data vystavení.
    if (inv.mesicSluzby && inv.mesicSluzby > 0) {
      return inv.mesicSluzby === month && (!inv.rokSluzby || inv.rokSluzby === year);
    }
    if (inv.datumVystaveni) {
      const m = inv.datumVystaveni.match(/(\d{4})-(\d{2})/); // ISO
      if (m) return Number(m[2]) === month && Number(m[1]) === year;
      const cz = inv.datumVystaveni.match(/(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/); // CZ D.M.YYYY
      if (cz) return Number(cz[2]) === month && Number(cz[3]) === year;
    }
    return false;
  });
}

export function invoicingStatus(
  clients: ClientLite[],
  invoices: IssuedLite[],
  month: number,
  year: number
): InvoicingStatus {
  const active = (clients ?? []).filter((c) => c.aktivni !== false && (c.name ?? "").trim() !== "");
  const invoiced: ClientLite[] = [];
  const pending: ClientLite[] = [];
  for (const c of active) {
    if (hasInvoice(c, invoices ?? [], month, year)) invoiced.push(c);
    else pending.push(c);
  }
  return { invoiced, pending, month, year };
}
