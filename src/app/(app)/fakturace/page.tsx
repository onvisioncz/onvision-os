"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Download, X, ChevronDown,
  CheckCircle2, AlertCircle, Edit2, History,
  Clock, TrendingUp, Trash2, CheckCheck,
} from "lucide-react";
import { useSupabaseData } from "@/lib/hooks/use-supabase-data";
import {
  buildInvoice, buildCisloFaktury, buildSpdString, buildOneTimeInvoice,
  fmtDate, DODAVATELE,
  type InvoiceClient, type InvoiceData, type DodavatelKlic,
} from "@/lib/invoice";
import QRCode from "qrcode";

/* ── Dynamic import — entire PDF stack is client-only ────────────────────── */
const InvoiceDownloadButton = dynamic(
  () => import("@/components/InvoiceDownloadButton").then((m) => m.InvoiceDownloadButton),
  { ssr: false, loading: () => (
    <button disabled className="flex items-center gap-2 px-4 py-2 rounded-[7px] text-[13px] font-semibold opacity-40 cursor-not-allowed"
      style={{ background: "oklch(0.62 0.27 265)", color: "oklch(0.97 0.004 265)", fontFamily: "var(--font-outfit)" }}>
      <Download className="w-3.5 h-3.5" />
      Načítám...
    </button>
  )}
);

/* ── Issued invoice record ───────────────────────────────────────────────── */
export interface IssuedInvoice {
  id: number;
  cislo: string;
  klient: string;           // display / brand name
  klientNazev: string;      // legal name
  castka: number;
  datumVystaveni: string;
  datumSplatnosti: string;
  popis: string;            // service description line
  mesicSluzby: number;      // 0 = one-time
  rokSluzby: number;        // 0 = one-time
  vystavovatel: DodavatelKlic;
  stav: "Zaplacena" | "Čeká na platbu";
  datumZaplaceni?: string;
  typ: "Měsíční" | "Jednorázová";
}

/* ── Finance income helper ───────────────────────────────────────────────── */
const MONTHS_LONG = [
  "Leden","Únor","Březen","Duben","Květen","Červen",
  "Červenec","Srpen","Září","Říjen","Listopad","Prosinec",
];

async function addIncomeToFinance(invoice: IssuedInvoice): Promise<boolean> {
  try {
    const res = await fetch("/api/sync?key=ov-finance-incomes");
    const { value } = await res.json();
    const incomes: Array<Record<string, unknown>> = Array.isArray(value) ? value : [];
    const maxId = incomes.length > 0 ? Math.max(...incomes.map(i => Number(i.id) || 0)) : 0;
    const mesicName = invoice.mesicSluzby > 0
      ? MONTHS_LONG[invoice.mesicSluzby - 1]
      : new Date().toLocaleString("cs-CZ", { month: "long" }).replace(/^\w/, c => c.toUpperCase());
    const newItem = {
      id: maxId + 1,
      mesic: mesicName,
      klient: invoice.klientNazev || invoice.klient,
      typ: invoice.typ === "Měsíční" ? "Měsíční klient" : "Jednorázový",
      datumZaplaceni: "—",
      castka: invoice.castka,
      stav: "Čeká",
    };
    const updated = [...incomes, newItem];
    const saveRes = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "ov-finance-incomes", value: updated }),
    });
    return saveRes.ok;
  } catch {
    return false;
  }
}

async function addFakturaToFinance(invoice: IssuedInvoice): Promise<boolean> {
  try {
    const res = await fetch("/api/sync?key=ov-finance-faktury");
    const { value } = await res.json();
    const faktury: Array<Record<string, unknown>> = Array.isArray(value) ? value : [];
    const maxId = faktury.length > 0 ? Math.max(...faktury.map(f => Number(f.id) || 0)) : 0;
    const newFaktura = {
      id: maxId + 1,
      cislo: invoice.cislo,
      klient: invoice.klientNazev || invoice.klient,
      popis: invoice.popis,
      castka: invoice.castka,
      castkaBezvat: invoice.castka,   // not VAT registered
      dph: 0,
      datum: invoice.datumVystaveni,
      splatnost: invoice.datumSplatnosti,
      stav: "Čeká na platbu",
      soubor: "",
    };
    const updated = [newFaktura, ...faktury];
    const saveRes = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "ov-finance-faktury", value: updated }),
    });
    return saveRes.ok;
  } catch {
    return false;
  }
}

async function addToFinance(invoice: IssuedInvoice): Promise<boolean> {
  const [incOk, fakOk] = await Promise.all([
    addIncomeToFinance(invoice),
    addFakturaToFinance(invoice),
  ]);
  return incOk && fakOk;
}

/* ── Retainer client shape ───────────────────────────────────────────────── */
interface RetainerClient {
  id: number;
  name: string;
  logo: string;
  color: string;
  pausal: number;
  reklama?: number;
  aktivni: boolean;
  fakturace: "s.r.o." | "IČO";
  zodpovedna?: string;
  fakturaRada?: number;
  ico?: string;
  dic?: string;
  adresa?: string;
  pscMesto?: string;
  zeme?: string;
  popisSluzby?: string;
}

/* ── Known client data ───────────────────────────────────────────────────── */
interface ClientInvoiceEntry extends Partial<InvoiceClient> {
  popisDetailSablona?: string;
  dodavatelKlic?: DodavatelKlic;
  splatnostDni?: number;
}
const CLIENT_INVOICE_DATA: Record<string, ClientInvoiceEntry> = {
  "IMTOS": {
    dodavatelKlic: "onvision",
    fakturaRada: 14,
    nazev: "IMTOS, spol. s r.o.",
    ulice: "Technická 818/4", psc: "664 48", mesto: "Moravany", zeme: "Česká republika",
    ico: "46967079", dic: "CZ46967079",
    castka: 35000,
    popisSluzby: "Kreativní produkce a digitální strategie obsahu: LinkedIn, Facebook & Instagram",
    popisDetailSablona: "pro IMTOS, spol. s r.o. ({MM}/{RRRR})",
  },
  "EASTGATE": {
    dodavatelKlic: "onvision",
    fakturaRada: 12,
    nazev: "STAVOS Brno, a.s.",
    ulice: "U Svitavy 1077/2", psc: "618 00", mesto: "Brno", zeme: "Česká republika",
    ico: "65277911", dic: "CZ65277911",
    castka: 30000,
    popisSluzby: "Kreativní produkce a digitální strategie obsahu: Facebook & Instagram",
    popisDetailSablona: "pro EASTGATE Brno ({MM}/{RRRR})",
  },
  "SENIMED": {
    dodavatelKlic: "onvision",
    fakturaRada: 15,
    nazev: "SENIMED s.r.o.",
    ulice: "Okruhová 1135/44", psc: "155 00", mesto: "Praha 13", zeme: "Česká republika",
    ico: "27224988", dic: "CZ699004146",
    castka: 47000,
    popisSluzby: "Kreativní produkce a digitální strategie obsahu: Facebook & Instagram",
    popisDetailSablona: "pro SENIMED s.r.o. & Betaglukan ({MM}/{RRRR})",
  },
  "FIRESTA": {
    dodavatelKlic: "onvision",
    fakturaRada: 11,
    nazev: "FIRESTA-Fišer, rekonstrukce, stavby a.s.",
    ulice: "Mlýnská 388/68", psc: "602 00", mesto: "Brno", zeme: "Česká republika",
    ico: "25317628", dic: "CZ25317628",
    castka: 28500,
    splatnostDni: 21,
    popisSluzby: "Kreativní produkce a digitální strategie obsahu: LinkedIn & Instagram",
    popisDetailSablona: "pro Firesta-Fišer, rekonstrukce, stavby a.s. ({MM}/{RRRR})",
  },
  "TOFFI": {
    dodavatelKlic: "jan",
    fakturaRada: 2,
    nazev: "DIAM, s.r.o.",
    ulice: "Kaštanová 516/127C", psc: "620 00", mesto: "Brno", zeme: "Česká republika",
    ico: "25557866", dic: "CZ25557866",
    castka: 30000,
    popisSluzby: "Kreativní produkce a digitální strategie obsahu: Facebook & Instagram",
    popisDetailSablona: "pro cukrárnu TOFFI ({MM}/{RRRR})",
  },
  "BEHEJ": {
    dodavatelKlic: "jan",
    fakturaRada: 3,
    nazev: "MARATON Brno, z.s.",
    ulice: "Gorazdova 91/2", psc: "602 00", mesto: "Brno", zeme: "Česká republika",
    ico: "01417762", dic: "CZ01417762",
    castka: 15000,
    popisSluzby: "Kreativní produkce a digitální strategie obsahu: Facebook & Instagram",
    popisDetailSablona: "pro Behejbrno.com ({MM}/{RRRR})",
  },
  "POWERPLATE": {
    dodavatelKlic: "adam",
    fakturaRada: 0,
    nazev: "VIBE 35 FITNESS, s.r.o.",
    ulice: "Mlýnská 495/8A", psc: "602 00", mesto: "Brno", zeme: "Česká republika",
    ico: "19417748",
    castka: 12000,
    popisSluzby: "Kreativní produkce a digitální strategie obsahu: Facebook & Instagram",
    popisDetailSablona: "pro Power plate Česko ({MM}/{RRRR})",
  },
  "SLATINA": {
    dodavatelKlic: "adam",
    fakturaRada: 0,
    nazev: "SK Brno Slatina, z. s.",
    ulice: "U Svitavy 1077/2", psc: "618 00", mesto: "Brno", zeme: "Česká republika",
    ico: "04747062", dic: "CZ04747062",
    castka: 12000,
    popisSluzby: "Kreativní produkce a digitální strategie obsahu: Facebook & Instagram",
    popisDetailSablona: "pro SK Brno Slatina, z. s. ({MM}/{RRRR})",
  },
};

/* ── Resolve detail line from template ───────────────────────────────────── */
function resolvePopisDetail(sablona: string | undefined, nazev: string, mesic: number, rok: number): string {
  const mm = String(mesic).padStart(2, "0");
  const template = sablona ?? `pro ${nazev} ({MM}/{RRRR})`;
  return template.replace("{MM}", mm).replace("{RRRR}", String(rok));
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function fKc(n: number) { return n.toLocaleString("cs-CZ") + " Kč"; }

const MONTHS = [
  "Leden","Únor","Březen","Duben","Květen","Červen",
  "Červenec","Srpen","Září","Říjen","Listopad","Prosinec",
];

const iSty: React.CSSProperties = {
  background: "oklch(1 0 0 / 0.04)",
  border: "1px solid oklch(1 0 0 / 0.09)",
  fontFamily: "var(--font-jakarta)",
};
const iCls = "w-full px-3 py-2 rounded-[7px] text-[13px] text-[--foreground] outline-none transition-all";

function FInput({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <input value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} className={iCls} style={iSty}
      onFocus={e => (e.target.style.borderColor = "oklch(0.62 0.27 265 / 0.5)")}
      onBlur={e => (e.target.style.borderColor = "oklch(1 0 0 / 0.09)")} />
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-semibold text-[--muted-foreground] uppercase tracking-[0.08em]">
        {label}
      </label>
      {children}
    </div>
  );
}

/* ── Vystavovatel badge ───────────────────────────────────────────────────── */
const DODAVATEL_LABELS: Record<DodavatelKlic, { label: string; color: string }> = {
  onvision: { label: "OnVision", color: "oklch(0.62 0.27 265)" },
  jan:      { label: "Jan K.",   color: "oklch(0.67 0.155 155)" },
  adam:     { label: "Adam M.",  color: "oklch(0.74 0.165 75)" },
};

function DodavatelBadge({ klic }: { klic: DodavatelKlic }) {
  const { label, color } = DODAVATEL_LABELS[klic];
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
      style={{ background: `${color.replace(")", " / 0.12)")}`, color, border: `1px solid ${color.replace(")", " / 0.22)")}` }}>
      {label}
    </span>
  );
}

/* ── Invoice row card ────────────────────────────────────────────────────── */
function InvoiceCard({
  client,
  onIssue,
}: {
  client: RetainerClient;
  onIssue: (client: RetainerClient) => void;
}) {
  const knownKey = Object.keys(CLIENT_INVOICE_DATA).find(
    k => client.name.toUpperCase().includes(k)
  );
  const known = knownKey ? CLIENT_INVOICE_DATA[knownKey] : undefined;
  const ready = !!(known?.fakturaRada !== undefined && known?.ico);

  return (
    <div
      className="card flex items-center gap-4 px-5 py-4"
      style={{ borderLeft: `3px solid ${client.color}` }}
    >
      <div
        className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 font-bold text-[13px]"
        style={{
          background: client.color.replace(")", " / 0.12)"),
          border: `1px solid ${client.color.replace(")", " / 0.22)")}`,
          color: client.color,
          fontFamily: "var(--font-outfit)",
        }}
      >
        {client.logo}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-bold text-[--foreground] truncate" style={{ fontFamily: "var(--font-outfit)", letterSpacing: "-0.02em" }}>
          {client.name}
        </p>
        <p className="text-[11px] text-[--muted-foreground] mt-0.5">
          {fKc(client.pausal)}/měsíc
          {client.reklama ? ` + ${fKc(client.reklama)} reklama` : ""}
          {" · "}
          {client.fakturace === "s.r.o." ? "OnVision s.r.o." : `IČO · ${client.zodpovedna ?? ""}`}
        </p>
      </div>

      {ready ? (
        <span className="hidden sm:flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
          style={{ background: "oklch(0.67 0.155 155 / 0.1)", color: "oklch(0.67 0.155 155)", border: "1px solid oklch(0.67 0.155 155 / 0.2)" }}>
          <CheckCircle2 className="w-3 h-3" />
          Připraveno
        </span>
      ) : (
        <span className="hidden sm:flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
          style={{ background: "oklch(0.74 0.165 75 / 0.1)", color: "oklch(0.74 0.165 75)", border: "1px solid oklch(0.74 0.165 75 / 0.2)" }}>
          <AlertCircle className="w-3 h-3" />
          Chybí údaje
        </span>
      )}

      <motion.button
        onClick={() => onIssue(client)}
        whileTap={{ scale: 0.95 }}
        className="btn-tactile flex items-center gap-2 px-3.5 py-2 rounded-[8px] text-[12px] font-semibold shrink-0"
        style={ready
          ? { background: "oklch(0.62 0.27 265)", color: "oklch(0.97 0.004 265)", fontFamily: "var(--font-outfit)" }
          : { background: "oklch(1 0 0 / 0.05)", color: "oklch(0.45 0.005 222)", border: "1px solid oklch(1 0 0 / 0.1)" }
        }
      >
        <FileText className="w-3.5 h-3.5" />
        {ready ? "Vystavit fakturu" : "Doplnit údaje"}
      </motion.button>
    </div>
  );
}

/* ── Issue modal ─────────────────────────────────────────────────────────── */
function IssueModal({
  client,
  onClose,
  onDownloaded,
}: {
  client: RetainerClient;
  onClose: () => void;
  onDownloaded: (invoice: IssuedInvoice) => void;
}) {
  const now = new Date();
  const defaultMesic = now.getMonth() === 0 ? 12 : now.getMonth();
  const defaultRok = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

  const [mesic, setMesic] = useState(defaultMesic);
  const [rok, setRok] = useState(defaultRok);

  const knownKey = Object.keys(CLIENT_INVOICE_DATA).find(
    k => client.name.toUpperCase().includes(k)
  );
  const known = knownKey ? CLIENT_INVOICE_DATA[knownKey] : {};

  const dodavatelKlic: DodavatelKlic = (known?.dodavatelKlic ?? "onvision") as DodavatelKlic;
  const splatnostDni = known?.splatnostDni ?? 7;

  const [castka, setCastka] = useState(String(known?.castka ?? client.pausal));
  const [popis, setPopis] = useState(known?.popisSluzby ?? "Kreativní produkce a digitální marketing");
  const [fakturaRada, setFakturaRada] = useState(String(known?.fakturaRada ?? ""));
  const [manualCislo, setManualCislo] = useState("");
  const [ico, setIco] = useState(known?.ico ?? "");
  const [dic, setDic] = useState(known?.dic ?? "");
  const [nazev, setNazev] = useState(known?.nazev ?? client.name);
  const [ulice, setUlice] = useState(known?.ulice ?? "");
  const [psc, setPsc] = useState(known?.psc ?? "");
  const [mesto, setMesto] = useState(known?.mesto ?? "");
  const [zeme, setZeme] = useState(known?.zeme ?? "Česká republika");
  const [pdfReady, setPdfReady] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | undefined>(undefined);
  const [popisDetail, setPopisDetail] = useState<string | null>(null);

  // Post-download state
  const [downloaded, setDownloaded] = useState(false);
  const [incomeLoading, setIncomeLoading] = useState(false);
  const [incomeAdded, setIncomeAdded] = useState(false);

  const isManualNumber = known?.fakturaRada === 0;

  const autoDetail = useMemo(
    () => resolvePopisDetail(known?.popisDetailSablona, nazev, mesic, rok),
    [known?.popisDetailSablona, nazev, mesic, rok],
  );
  const prevMesicRok = `${mesic}/${rok}`;
  useEffect(() => { setPopisDetail(null); }, [prevMesicRok]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(() => setPdfReady(true), 400);
    return () => clearTimeout(t);
  }, [mesic, rok, castka, popis, fakturaRada, ico, manualCislo]);

  const baseInvoiceData = useMemo<InvoiceData | null>(() => {
    if (!ico) return null;
    if (isManualNumber) {
      if (!manualCislo) return null;
    } else {
      if (!fakturaRada) return null;
    }
    const invoiceClient: InvoiceClient = {
      nazev, ulice, psc, mesto, zeme, ico, dic: dic || undefined,
      fakturaRada: parseInt(fakturaRada) || 0,
      castka: parseInt(castka) || 0,
      popisSluzby: popis,
    };
    const base = buildInvoice(invoiceClient, mesic, rok, dodavatelKlic);
    if (splatnostDni !== 7) {
      const vystaveniParts = base.datumVystaveni.split(".");
      const vystaveniDate = new Date(
        parseInt(vystaveniParts[2]),
        parseInt(vystaveniParts[1]) - 1,
        parseInt(vystaveniParts[0]),
      );
      const splatnost = new Date(vystaveniDate);
      splatnost.setDate(splatnost.getDate() + splatnostDni);
      base.datumSplatnosti = fmtDate(splatnost);
    }
    if (isManualNumber && manualCislo) {
      return { ...base, cislo: manualCislo, variabilniSymbol: manualCislo };
    }
    return base;
  }, [mesic, rok, castka, popis, fakturaRada, ico, dic, nazev, ulice, psc, mesto, zeme, manualCislo, isManualNumber, dodavatelKlic, splatnostDni]);

  useEffect(() => {
    if (!baseInvoiceData) { setQrDataUrl(undefined); return; }
    const spd = buildSpdString(
      baseInvoiceData.dodavatel,
      baseInvoiceData.odberatel.castka,
      baseInvoiceData.variabilniSymbol,
      `Faktura ${baseInvoiceData.cislo}`,
    );
    QRCode.toDataURL(spd, { errorCorrectionLevel: "M", margin: 1, width: 200 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(undefined));
  }, [baseInvoiceData]);

  const invoiceData = useMemo<InvoiceData | null>(() => {
    if (!baseInvoiceData) return null;
    return { ...baseInvoiceData, popisDetail: popisDetail ?? autoDetail, qrDataUrl };
  }, [baseInvoiceData, popisDetail, autoDetail, qrDataUrl]);

  const fileName = invoiceData
    ? `${invoiceData.cislo}_${nazev.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`
    : "faktura.pdf";

  const canGenerate = isManualNumber ? (!!ico && !!manualCislo) : (!!fakturaRada && !!ico);

  const buildIssuedInvoice = useCallback((): IssuedInvoice | null => {
    if (!invoiceData) return null;
    const mm = String(mesic).padStart(2, "0");
    return {
      id: Date.now(),
      cislo: invoiceData.cislo,
      klient: client.name,
      klientNazev: nazev,
      castka: invoiceData.odberatel.castka,
      datumVystaveni: invoiceData.datumVystaveni,
      datumSplatnosti: invoiceData.datumSplatnosti,
      popis: `${invoiceData.odberatel.popisSluzby} — ${mm}/${rok}`,
      mesicSluzby: mesic,
      rokSluzby: rok,
      vystavovatel: dodavatelKlic,
      stav: "Čeká na platbu",
      typ: "Měsíční",
    };
  }, [invoiceData, client.name, nazev, mesic, rok, dodavatelKlic]);

  const handleDownloaded = useCallback(() => {
    const inv = buildIssuedInvoice();
    if (!inv) return;
    setDownloaded(true);
    onDownloaded(inv);
  }, [buildIssuedInvoice, onDownloaded]);

  const handleAddToIncome = useCallback(async () => {
    const inv = buildIssuedInvoice();
    if (!inv) return;
    setIncomeLoading(true);
    const ok = await addToFinance(inv);
    setIncomeLoading(false);
    if (ok) setIncomeAdded(true);
  }, [buildIssuedInvoice]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ background: "oklch(0 0 0 / 0.65)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <motion.div
        className="relative w-full md:max-w-2xl max-h-[94vh] overflow-y-auto rounded-t-[16px] md:rounded-[14px]"
        style={{ background: "rgba(12, 10, 35, 0.55)", backdropFilter: "blur(24px) saturate(1.3)", WebkitBackdropFilter: "blur(24px) saturate(1.3)", border: "1px solid rgba(255,255,255,0.09)" }}
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 z-10"
          style={{ borderColor: "oklch(1 0 0 / 0.08)", background: "rgba(12, 10, 35, 0.75)", backdropFilter: "blur(24px) saturate(1.3)", WebkitBackdropFilter: "blur(24px) saturate(1.3)" }}>
          <div>
            <h2 className="text-[15px] font-bold text-[--foreground]"
              style={{ fontFamily: "var(--font-outfit)", letterSpacing: "-0.02em" }}>
              Vystavit fakturu — {client.name}
            </h2>
            {invoiceData && (
              <p className="text-[11px] text-[--muted-foreground] mt-0.5">
                č. {invoiceData.cislo} · splatnost {invoiceData.datumSplatnosti}
              </p>
            )}
          </div>
          <button onClick={onClose}
            className="p-1.5 rounded-[6px] btn-tactile text-[--muted-foreground]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Month + year */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fakturovaný měsíc">
              <div className="relative">
                <select value={mesic} onChange={e => { setMesic(+e.target.value); setPdfReady(false); }}
                  className={`${iCls} appearance-none pr-8 cursor-pointer`}
                  style={{ ...iSty, color: "var(--foreground)" }}>
                  {MONTHS.map((m, i) => (
                    <option key={i} value={i + 1} style={{ background: "oklch(0.12 0.008 222)" }}>{m}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[--muted-foreground]" />
              </div>
            </Field>
            <Field label="Rok">
              <FInput value={String(rok)} onChange={v => { setRok(+v || rok); setPdfReady(false); }} placeholder="2026" />
            </Field>
          </div>

          {/* Invoice number */}
          {isManualNumber ? (
            <Field label="Číslo faktury">
              <FInput value={manualCislo} onChange={v => { setManualCislo(v); setPdfReady(false); }} placeholder={`${new Date().getFullYear()}001`} />
            </Field>
          ) : fakturaRada ? (
            <div className="flex items-center gap-3 px-4 py-3 rounded-[8px]"
              style={{ background: "oklch(0.62 0.27 265 / 0.08)", border: "1px solid oklch(0.62 0.27 265 / 0.2)" }}>
              <FileText className="w-4 h-4 shrink-0" style={{ color: "oklch(0.75 0.2 265)" }} />
              <div>
                <p className="text-[11px] text-[--muted-foreground]">Číslo faktury</p>
                <p className="text-[15px] font-bold" style={{ fontFamily: "var(--font-outfit)", color: "oklch(0.75 0.2 265)", letterSpacing: "0.04em" }}>
                  {buildCisloFaktury(rok, parseInt(fakturaRada) || 0, mesic)}
                </p>
              </div>
              {invoiceData && (
                <div className="ml-auto text-right">
                  <p className="text-[11px] text-[--muted-foreground]">Celkem k úhradě</p>
                  <p className="text-[15px] font-bold" style={{ fontFamily: "var(--font-outfit)", color: "oklch(0.67 0.155 155)" }}>
                    {fKc(parseInt(castka) || 0)}
                  </p>
                </div>
              )}
            </div>
          ) : null}

          {/* Amounts */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Částka (Kč)">
              <FInput value={castka} onChange={v => { setCastka(v.replace(/\D/g,"")); setPdfReady(false); }} placeholder="35000" />
            </Field>
            {!isManualNumber && (
              <Field label="Řadová řada klienta">
                <FInput value={fakturaRada} onChange={v => { setFakturaRada(v.replace(/\D/g,"")); setPdfReady(false); }} placeholder="14" />
              </Field>
            )}
          </div>

          {/* Service description */}
          <Field label="Popis služby">
            <input value={popis} onChange={e => { setPopis(e.target.value); setPdfReady(false); }}
              className={iCls} style={iSty}
              onFocus={e => (e.target.style.borderColor = "oklch(0.62 0.27 265 / 0.5)")}
              onBlur={e => (e.target.style.borderColor = "oklch(1 0 0 / 0.09)")}
              placeholder="Kreativní produkce a digitální strategie obsahu..." />
          </Field>

          <Field label="Detail (2. řádek popisu)">
            <FInput
              value={popisDetail ?? autoDetail}
              onChange={v => { setPopisDetail(v); setPdfReady(false); }}
              placeholder={autoDetail}
            />
          </Field>

          {/* Client legal info */}
          <div>
            <p className="text-[10px] font-bold text-[--muted-foreground] uppercase tracking-[0.08em] mb-3 flex items-center gap-2">
              <Edit2 className="w-3 h-3" /> Fakturační údaje odběratele
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Field label="Název firmy">
                  <FInput value={nazev} onChange={v => { setNazev(v); setPdfReady(false); }} placeholder="IMTOS, spol. s r.o." />
                </Field>
              </div>
              <Field label="IČ">
                <FInput value={ico} onChange={v => { setIco(v); setPdfReady(false); }} placeholder="46967079" />
              </Field>
              <Field label="DIČ (volitelné)">
                <FInput value={dic} onChange={v => { setDic(v); setPdfReady(false); }} placeholder="CZ46967079" />
              </Field>
              <Field label="Ulice">
                <FInput value={ulice} onChange={v => { setUlice(v); setPdfReady(false); }} placeholder="Technická 818/4" />
              </Field>
              <Field label="PSČ Město">
                <div className="flex gap-2">
                  <FInput value={psc} onChange={v => { setPsc(v); setPdfReady(false); }} placeholder="664 48" />
                  <FInput value={mesto} onChange={v => { setMesto(v); setPdfReady(false); }} placeholder="Moravany" />
                </div>
              </Field>
              <div className="col-span-2">
                <Field label="Země">
                  <FInput value={zeme} onChange={v => { setZeme(v); setPdfReady(false); }} placeholder="Česká republika" />
                </Field>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-4 border-t sticky bottom-0"
          style={{ borderColor: "oklch(1 0 0 / 0.08)", background: "rgba(12, 10, 35, 0.75)", backdropFilter: "blur(24px) saturate(1.3)", WebkitBackdropFilter: "blur(24px) saturate(1.3)" }}>

          {downloaded ? (
            /* Post-download state */
            <div className="flex items-center gap-2.5 w-full">
              <div className="flex items-center gap-2 text-[12px] font-medium mr-auto"
                style={{ color: "oklch(0.67 0.155 155)" }}>
                <CheckCheck className="w-3.5 h-3.5" />
                {incomeAdded ? "Přidáno do Finance (Příjmy + Faktury)" : "Faktura stažena a uložena do historie"}
              </div>
              {!incomeAdded && (
                <motion.button
                  onClick={handleAddToIncome}
                  disabled={incomeLoading}
                  whileTap={{ scale: 0.96 }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-[7px] text-[12px] font-semibold disabled:opacity-50"
                  style={{ background: "oklch(0.67 0.155 155 / 0.12)", color: "oklch(0.67 0.155 155)", border: "1px solid oklch(0.67 0.155 155 / 0.25)", fontFamily: "var(--font-outfit)" }}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  {incomeLoading ? "Ukládám..." : "Přidat do Finance"}
                </motion.button>
              )}
              <button onClick={onClose}
                className="px-4 py-2 rounded-[7px] text-[13px] font-medium text-[--muted-foreground] btn-tactile"
                style={{ background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.08)" }}>
                Zavřít
              </button>
            </div>
          ) : (
            /* Normal state */
            <>
              <button onClick={onClose}
                className="px-4 py-2 rounded-[7px] text-[13px] font-medium text-[--muted-foreground] btn-tactile"
                style={{ background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.08)" }}>
                Zrušit
              </button>

              {invoiceData ? (
                <InvoiceDownloadButton
                  data={invoiceData}
                  fileName={fileName}
                  onDownload={handleDownloaded}
                />
              ) : (
                <button disabled
                  className="flex items-center gap-2 px-4 py-2 rounded-[7px] text-[13px] font-semibold opacity-40 cursor-not-allowed"
                  style={{ background: "oklch(0.62 0.27 265)", color: "oklch(0.97 0.004 265)", fontFamily: "var(--font-outfit)" }}>
                  <Download className="w-3.5 h-3.5" />
                  {!canGenerate ? "Vyplňte IČ a číslo faktury" : "Připravuji..."}
                </button>
              )}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── One-time invoice section ────────────────────────────────────────────── */
function OneTimeSection({ onDownloaded }: { onDownloaded: (invoice: IssuedInvoice) => void }) {
  const today = fmtDate(new Date());
  const todayPlus7 = fmtDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const yearPrefix = `${new Date().getFullYear()}`;

  const [dodavatelKlic, setDodavatelKlic] = useState<DodavatelKlic>("onvision");
  const [cislo, setCislo] = useState("");
  const [datumVystaveni, setDatumVystaveni] = useState(today);
  const [datumSplatnosti, setDatumSplatnosti] = useState(todayPlus7);
  const [datumPlneni, setDatumPlneni] = useState(today);
  const [popisSluzby, setPopisSluzby] = useState("");
  const [popisDetail, setPopisDetail] = useState("");
  const [castka, setCastka] = useState("");
  const [nazev, setNazev] = useState("");
  const [ico, setIco] = useState("");
  const [dic, setDic] = useState("");
  const [ulice, setUlice] = useState("");
  const [psc, setPsc] = useState("");
  const [mesto, setMesto] = useState("");
  const [zeme, setZeme] = useState("Česká republika");
  const [qrDataUrl, setQrDataUrl] = useState<string | undefined>(undefined);

  // Post-download state
  const [downloaded, setDownloaded] = useState(false);
  const [incomeLoading, setIncomeLoading] = useState(false);
  const [incomeAdded, setIncomeAdded] = useState(false);

  const isValid = !!(cislo && ico && nazev && castka);

  const invoiceData = useMemo<InvoiceData | null>(() => {
    if (!isValid) return null;
    const odberatel: InvoiceClient = {
      nazev, ulice, psc, mesto, zeme, ico, dic: dic || undefined,
      fakturaRada: 0,
      castka: parseInt(castka) || 0,
      popisSluzby,
    };
    return buildOneTimeInvoice(
      cislo, odberatel, dodavatelKlic,
      datumVystaveni, datumSplatnosti, datumPlneni,
      popisDetail || popisSluzby,
    );
  }, [isValid, cislo, nazev, ulice, psc, mesto, zeme, ico, dic, castka, popisSluzby, popisDetail, dodavatelKlic, datumVystaveni, datumSplatnosti, datumPlneni]);

  useEffect(() => {
    if (!invoiceData) { setQrDataUrl(undefined); return; }
    const spd = buildSpdString(
      invoiceData.dodavatel, invoiceData.odberatel.castka,
      invoiceData.variabilniSymbol, `Faktura ${invoiceData.cislo}`,
    );
    QRCode.toDataURL(spd, { errorCorrectionLevel: "M", margin: 1, width: 200 })
      .then(setQrDataUrl).catch(() => setQrDataUrl(undefined));
  }, [invoiceData]);

  const invoiceWithQr = useMemo<InvoiceData | null>(() => {
    if (!invoiceData) return null;
    return { ...invoiceData, qrDataUrl };
  }, [invoiceData, qrDataUrl]);

  const fileName = invoiceWithQr
    ? `${invoiceWithQr.cislo}_${nazev.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`
    : "faktura.pdf";

  const buildIssuedInvoice = useCallback((): IssuedInvoice | null => {
    if (!invoiceWithQr) return null;
    return {
      id: Date.now(),
      cislo,
      klient: nazev,
      klientNazev: nazev,
      castka: parseInt(castka) || 0,
      datumVystaveni,
      datumSplatnosti,
      popis: popisSluzby || popisDetail || cislo,
      mesicSluzby: 0,
      rokSluzby: 0,
      vystavovatel: dodavatelKlic,
      stav: "Čeká na platbu",
      typ: "Jednorázová",
    };
  }, [invoiceWithQr, cislo, nazev, castka, datumVystaveni, datumSplatnosti, popisSluzby, popisDetail, dodavatelKlic]);

  const handleDownloaded = useCallback(() => {
    const inv = buildIssuedInvoice();
    if (!inv) return;
    setDownloaded(true);
    onDownloaded(inv);
  }, [buildIssuedInvoice, onDownloaded]);

  const handleAddToIncome = useCallback(async () => {
    const inv = buildIssuedInvoice();
    if (!inv) return;
    setIncomeLoading(true);
    const ok = await addToFinance(inv);
    setIncomeLoading(false);
    if (ok) setIncomeAdded(true);
  }, [buildIssuedInvoice]);

  return (
    <div className="rounded-[12px] p-5 space-y-5"
      style={{ background: "oklch(1 0 0 / 0.03)", border: "1px solid oklch(1 0 0 / 0.08)" }}>
      <div>
        <h2 className="text-[15px] font-bold text-[--foreground] mb-0.5"
          style={{ fontFamily: "var(--font-outfit)", letterSpacing: "-0.02em" }}>
          Jednorázová faktura
        </h2>
        <p className="text-[11px] text-[--muted-foreground]">
          Ad-hoc faktura s ručně zadanými údaji a datem
        </p>
      </div>

      <Field label="Vystavovatel">
        <div className="relative">
          <select value={dodavatelKlic} onChange={e => setDodavatelKlic(e.target.value as DodavatelKlic)}
            className={`${iCls} appearance-none pr-8 cursor-pointer`}
            style={{ ...iSty, color: "var(--foreground)" }}>
            <option value="onvision" style={{ background: "oklch(0.12 0.008 222)" }}>OnVision s.r.o.</option>
            <option value="jan" style={{ background: "oklch(0.12 0.008 222)" }}>Jan Kříž</option>
            <option value="adam" style={{ background: "oklch(0.12 0.008 222)" }}>Adam Mendrek</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[--muted-foreground]" />
        </div>
      </Field>

      <Field label="Číslo faktury">
        <FInput value={cislo} onChange={setCislo} placeholder={`${yearPrefix}001`} />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Datum vystavení"><FInput value={datumVystaveni} onChange={setDatumVystaveni} placeholder={today} /></Field>
        <Field label="Datum splatnosti"><FInput value={datumSplatnosti} onChange={setDatumSplatnosti} placeholder={todayPlus7} /></Field>
        <Field label="Datum plnění"><FInput value={datumPlneni} onChange={setDatumPlneni} placeholder={today} /></Field>
      </div>

      <Field label="Popis služby">
        <FInput value={popisSluzby} onChange={setPopisSluzby} placeholder="Kreativní produkce a digitální strategie obsahu..." />
      </Field>
      <Field label="Detail (2. řádek)">
        <FInput value={popisDetail} onChange={setPopisDetail} placeholder="Volitelný upřesňující text..." />
      </Field>
      <Field label="Částka (Kč)">
        <FInput value={castka} onChange={v => setCastka(v.replace(/\D/g, ""))} placeholder="10000" />
      </Field>

      <div>
        <p className="text-[10px] font-bold text-[--muted-foreground] uppercase tracking-[0.08em] mb-3 flex items-center gap-2">
          <Edit2 className="w-3 h-3" /> Fakturační údaje odběratele
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Field label="Název firmy"><FInput value={nazev} onChange={setNazev} placeholder="Název s.r.o." /></Field></div>
          <Field label="IČ"><FInput value={ico} onChange={setIco} placeholder="12345678" /></Field>
          <Field label="DIČ (volitelné)"><FInput value={dic} onChange={setDic} placeholder="CZ12345678" /></Field>
          <Field label="Ulice"><FInput value={ulice} onChange={setUlice} placeholder="Ulice 1/2" /></Field>
          <Field label="PSČ Město">
            <div className="flex gap-2">
              <FInput value={psc} onChange={setPsc} placeholder="600 00" />
              <FInput value={mesto} onChange={setMesto} placeholder="Brno" />
            </div>
          </Field>
          <div className="col-span-2"><Field label="Země"><FInput value={zeme} onChange={setZeme} placeholder="Česká republika" /></Field></div>
        </div>
      </div>

      {/* Post-download banner or download button */}
      <AnimatePresence mode="wait">
        {downloaded ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 px-4 py-3 rounded-[8px]"
            style={{ background: "oklch(0.67 0.155 155 / 0.08)", border: "1px solid oklch(0.67 0.155 155 / 0.2)" }}
          >
            <CheckCheck className="w-4 h-4 shrink-0" style={{ color: "oklch(0.67 0.155 155)" }} />
            <p className="text-[12px] font-medium flex-1" style={{ color: "oklch(0.67 0.155 155)" }}>
              {incomeAdded ? "Přidáno do Finance (Příjmy + Faktury)" : "Faktura stažena a uložena do historie"}
            </p>
            {!incomeAdded && (
              <motion.button
                onClick={handleAddToIncome}
                disabled={incomeLoading}
                whileTap={{ scale: 0.96 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-[12px] font-semibold disabled:opacity-50 shrink-0"
                style={{ background: "oklch(0.67 0.155 155 / 0.15)", color: "oklch(0.67 0.155 155)", border: "1px solid oklch(0.67 0.155 155 / 0.3)", fontFamily: "var(--font-outfit)" }}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                {incomeLoading ? "Ukládám..." : "Přidat do Finance"}
              </motion.button>
            )}
          </motion.div>
        ) : (
          <motion.div key="download" className="flex justify-end pt-1">
            {invoiceWithQr ? (
              <InvoiceDownloadButton data={invoiceWithQr} fileName={fileName} onDownload={handleDownloaded} label="Stáhnout PDF" />
            ) : (
              <button disabled
                className="flex items-center gap-2 px-4 py-2 rounded-[7px] text-[13px] font-semibold opacity-40 cursor-not-allowed"
                style={{ background: "oklch(0.62 0.27 265)", color: "oklch(0.97 0.004 265)", fontFamily: "var(--font-outfit)" }}>
                <Download className="w-3.5 h-3.5" />
                Vyplňte povinné údaje
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Issued invoices tab ─────────────────────────────────────────────────── */
function IssuedInvoicesTab({
  invoices,
  onChange,
}: {
  invoices: IssuedInvoice[];
  onChange: (next: IssuedInvoice[]) => void;
}) {
  const sorted = useMemo(
    () => [...invoices].sort((a, b) => b.id - a.id),
    [invoices],
  );

  const toggleStav = useCallback((id: number) => {
    onChange(invoices.map(inv =>
      inv.id !== id ? inv : {
        ...inv,
        stav: inv.stav === "Zaplacena" ? "Čeká na platbu" : "Zaplacena",
        datumZaplaceni: inv.stav === "Čeká na platbu" ? fmtDate(new Date()) : undefined,
      }
    ));
  }, [invoices, onChange]);

  const remove = useCallback((id: number) => {
    onChange(invoices.filter(inv => inv.id !== id));
  }, [invoices, onChange]);

  if (sorted.length === 0) {
    return (
      <motion.div
        className="flex flex-col items-center justify-center py-20 gap-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      >
        <div className="w-14 h-14 rounded-[14px] flex items-center justify-center"
          style={{ background: "oklch(0.62 0.27 265 / 0.08)", border: "1px solid oklch(0.62 0.27 265 / 0.15)" }}>
          <History className="w-6 h-6" style={{ color: "oklch(0.62 0.27 265 / 0.5)" }} />
        </div>
        <div className="text-center">
          <p className="text-[14px] font-semibold text-[--foreground]" style={{ fontFamily: "var(--font-outfit)" }}>
            Žádné vydané faktury
          </p>
          <p className="text-[12px] text-[--muted-foreground] mt-1">
            Každá stažená faktura se automaticky uloží sem
          </p>
        </div>
      </motion.div>
    );
  }

  const pending = sorted.filter(i => i.stav === "Čeká na platbu");
  const paid = sorted.filter(i => i.stav === "Zaplacena");
  const totalPending = pending.reduce((s, i) => s + i.castka, 0);

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Summary strip */}
      {pending.length > 0 && (
        <div className="flex items-center gap-4 px-5 py-3 rounded-[10px]"
          style={{ background: "oklch(0.74 0.165 75 / 0.07)", border: "1px solid oklch(0.74 0.165 75 / 0.18)" }}>
          <Clock className="w-4 h-4 shrink-0" style={{ color: "oklch(0.74 0.165 75)" }} />
          <p className="text-[13px] font-semibold flex-1" style={{ color: "oklch(0.74 0.165 75)", fontFamily: "var(--font-outfit)" }}>
            {pending.length} {pending.length === 1 ? "faktura čeká" : "faktury čekají"} na platbu
          </p>
          <p className="text-[13px] font-bold" style={{ color: "oklch(0.74 0.165 75)", fontFamily: "var(--font-outfit)" }}>
            {fKc(totalPending)}
          </p>
        </div>
      )}

      {/* Invoice rows */}
      <div className="flex flex-col gap-2">
        {sorted.map((inv, i) => (
          <motion.div
            key={inv.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="card px-4 md:px-5 py-3.5"
          >
            {/* Desktop layout */}
            <div className="hidden md:flex items-center gap-4">
              {/* Number */}
              <div className="shrink-0 min-w-[90px]">
                <p className="text-[13px] font-bold text-[--foreground]"
                  style={{ fontFamily: "var(--font-outfit)", letterSpacing: "0.04em" }}>
                  {inv.cislo}
                </p>
                <p className="text-[10px] text-[--muted-foreground] mt-0.5">{inv.datumVystaveni}</p>
              </div>

              {/* Client */}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-[--foreground] truncate" style={{ fontFamily: "var(--font-outfit)" }}>
                  {inv.klient}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <DodavatelBadge klic={inv.vystavovatel} />
                  {inv.mesicSluzby > 0 && (
                    <span className="text-[10px] text-[--muted-foreground]">
                      {String(inv.mesicSluzby).padStart(2,"0")}/{inv.rokSluzby}
                    </span>
                  )}
                  <span className="text-[10px] text-[--muted-foreground]">{inv.typ}</span>
                </div>
              </div>

              {/* Amount */}
              <div className="shrink-0 text-right">
                <p className="text-[14px] font-bold text-[--foreground]"
                  style={{ fontFamily: "var(--font-outfit)", letterSpacing: "-0.01em" }}>
                  {fKc(inv.castka)}
                </p>
                {inv.datumZaplaceni && inv.stav === "Zaplacena" && (
                  <p className="text-[10px] text-[--muted-foreground]">{inv.datumZaplaceni}</p>
                )}
              </div>

              {/* Status toggle */}
              <motion.button
                onClick={() => toggleStav(inv.id)}
                whileTap={{ scale: 0.92 }}
                className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-semibold transition-all"
                title="Kliknutím změnit stav"
                style={inv.stav === "Zaplacena"
                  ? { background: "oklch(0.67 0.155 155 / 0.1)", color: "oklch(0.67 0.155 155)", border: "1px solid oklch(0.67 0.155 155 / 0.2)" }
                  : { background: "oklch(0.74 0.165 75 / 0.1)", color: "oklch(0.74 0.165 75)", border: "1px solid oklch(0.74 0.165 75 / 0.2)" }
                }
              >
                {inv.stav === "Zaplacena"
                  ? <><CheckCircle2 className="w-3 h-3" /> Zaplacena</>
                  : <><Clock className="w-3 h-3" /> Čeká</>
                }
              </motion.button>

              {/* Delete */}
              <motion.button
                onClick={() => remove(inv.id)}
                whileTap={{ scale: 0.9 }}
                className="shrink-0 p-1.5 rounded-[6px] text-[--muted-foreground] btn-tactile opacity-40 hover:opacity-100 transition-opacity"
                title="Smazat záznam"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </motion.button>
            </div>

            {/* Mobile layout */}
            <div className="md:hidden">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-[--foreground]"
                    style={{ fontFamily: "var(--font-outfit)", letterSpacing: "0.04em" }}>
                    {inv.cislo}
                  </p>
                  <p className="text-[13px] font-semibold text-[--foreground] mt-0.5 truncate" style={{ fontFamily: "var(--font-outfit)" }}>
                    {inv.klient}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <DodavatelBadge klic={inv.vystavovatel} />
                    <span className="text-[10px] text-[--muted-foreground]">{inv.datumVystaveni}</span>
                    <span className="text-[10px] text-[--muted-foreground]">{inv.typ}</span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[14px] font-bold text-[--foreground]"
                    style={{ fontFamily: "var(--font-outfit)", letterSpacing: "-0.01em" }}>
                    {fKc(inv.castka)}
                  </p>
                  {inv.datumZaplaceni && inv.stav === "Zaplacena" && (
                    <p className="text-[10px] text-[--muted-foreground]">{inv.datumZaplaceni}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <motion.button
                  onClick={() => toggleStav(inv.id)}
                  whileTap={{ scale: 0.92 }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all"
                  title="Kliknutím změnit stav"
                  style={inv.stav === "Zaplacena"
                    ? { background: "oklch(0.67 0.155 155 / 0.1)", color: "oklch(0.67 0.155 155)", border: "1px solid oklch(0.67 0.155 155 / 0.2)" }
                    : { background: "oklch(0.74 0.165 75 / 0.1)", color: "oklch(0.74 0.165 75)", border: "1px solid oklch(0.74 0.165 75 / 0.2)" }
                  }
                >
                  {inv.stav === "Zaplacena"
                    ? <><CheckCircle2 className="w-3 h-3" /> Zaplacena</>
                    : <><Clock className="w-3 h-3" /> Čeká</>
                  }
                </motion.button>
                <motion.button
                  onClick={() => remove(inv.id)}
                  whileTap={{ scale: 0.9 }}
                  className="p-2 rounded-[6px] text-[--muted-foreground] btn-tactile opacity-60"
                  title="Smazat záznam"
                >
                  <Trash2 className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {paid.length > 0 && (
        <p className="text-[11px] text-[--muted-foreground] text-center pt-1">
          {paid.length} zaplacených · celkem {fKc(paid.reduce((s,i) => s+i.castka, 0))}
        </p>
      )}
    </motion.div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function FakturaPage() {
  const [clients] = useSupabaseData<RetainerClient[]>("ov-monthly-clients", () => []);
  const [issuedInvoices, setIssuedInvoices] = useSupabaseData<IssuedInvoice[]>("ov-issued-invoices", () => []);
  const [issuing, setIssuing] = useState<RetainerClient | null>(null);
  const [tab, setTab] = useState<"mesicni" | "jednorazove" | "vydane">("mesicni");

  const activeClients = useMemo(() => clients.filter(c => c.aktivni), [clients]);

  const pendingCount = useMemo(
    () => issuedInvoices.filter(i => i.stav === "Čeká na platbu").length,
    [issuedInvoices],
  );

  const handleIssue = useCallback((c: RetainerClient) => setIssuing(c), []);

  const handleDownloaded = useCallback((invoice: IssuedInvoice) => {
    setIssuedInvoices(prev => {
      // Deduplicate: if same cislo already exists, update it
      const exists = prev.some(i => i.cislo === invoice.cislo);
      if (exists) return prev;
      return [invoice, ...prev];
    });
  }, [setIssuedInvoices]);

  const tabs = [
    { key: "mesicni",    label: "Měsíční klienti", count: null },
    { key: "jednorazove", label: "Jednorázovky",   count: null },
    { key: "vydane",     label: "Vydané faktury",   count: pendingCount > 0 ? pendingCount : null },
  ] as const;

  return (
    <div className="p-4 md:p-7 min-h-screen" style={{ background: "var(--background)" }}>
      {/* Header */}
      <motion.div
        className="flex items-start justify-between gap-4 mb-6"
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[9px] flex items-center justify-center shrink-0"
            style={{ background: "oklch(0.62 0.27 265 / 0.12)", border: "1px solid oklch(0.62 0.27 265 / 0.2)" }}>
            <FileText className="w-4 h-4" style={{ color: "oklch(0.62 0.27 265)" }} />
          </div>
          <div>
            <h1 className="text-[22px] md:text-[28px] leading-none text-[--foreground]"
              style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, letterSpacing: "-0.03em" }}>
              Fakturace
            </h1>
            <p className="text-[12px] text-[--muted-foreground] mt-1">
              Generování faktur pro měsíční klienty · šablona OnVision
            </p>
          </div>
        </div>
      </motion.div>

      {/* Info banner */}
      <motion.div
        className="mb-5 flex items-start gap-3 px-4 py-3 rounded-[10px]"
        style={{ background: "oklch(0.62 0.27 265 / 0.07)", border: "1px solid oklch(0.62 0.27 265 / 0.18)" }}
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
      >
        <FileText className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "oklch(0.75 0.2 265)" }} />
        <div>
          <p className="text-[12px] font-semibold" style={{ color: "oklch(0.82 0.12 265)" }}>
            Faktury se vydávají 1. pracovní den v měsíci za předchozí měsíc
          </p>
          <p className="text-[11px] text-[--muted-foreground] mt-0.5">
            Datum vystavení, splatnosti (7 dní) a uskutečnění plnění se vypočítají automaticky.
            Pro klienty kde chybí řadová řada pošli Adamovi čísla a doplní se.
          </p>
        </div>
      </motion.div>

      {/* Tab switcher */}
      <div className="flex gap-1 mb-5 p-1 rounded-[10px] overflow-x-auto" style={{ background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.08)", width: "fit-content", maxWidth: "100%" }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="relative px-3 md:px-4 py-1.5 rounded-[8px] text-[12px] font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap"
            style={tab === t.key
              ? { background: "oklch(0.62 0.27 265)", color: "oklch(0.97 0.004 265)", fontFamily: "var(--font-outfit)" }
              : { color: "var(--muted-foreground)" }
            }
          >
            {t.key === "vydane" && <History className="w-3 h-3" />}
            {t.label}
            {t.count !== null && t.count > 0 && (
              <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                style={tab === t.key
                  ? { background: "oklch(0 0 0 / 0.2)" }
                  : { background: "oklch(0.74 0.165 75 / 0.18)", color: "oklch(0.74 0.165 75)" }
                }>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "mesicni" && (
        <motion.div
          className="flex flex-col gap-3"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          {activeClients.map(client => (
            <InvoiceCard key={client.id} client={client} onIssue={handleIssue} />
          ))}
          {activeClients.length === 0 && (
            <p className="text-[13px] text-[--muted-foreground] text-center py-12">
              Žádní aktivní klienti
            </p>
          )}
        </motion.div>
      )}

      {tab === "jednorazove" && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <OneTimeSection onDownloaded={handleDownloaded} />
        </motion.div>
      )}

      {tab === "vydane" && (
        <IssuedInvoicesTab
          invoices={issuedInvoices}
          onChange={setIssuedInvoices}
        />
      )}

      {/* Modal */}
      <AnimatePresence>
        {issuing && (
          <IssueModal
            key="issue-modal"
            client={issuing}
            onClose={() => setIssuing(null)}
            onDownloaded={handleDownloaded}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
