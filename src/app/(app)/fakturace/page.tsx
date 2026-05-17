"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Download, X, ChevronDown,
  CheckCircle2, AlertCircle, Edit2,
} from "lucide-react";
import { useSupabaseData } from "@/lib/hooks/use-supabase-data";
import {
  buildInvoice, buildCisloFaktury, buildSpdString,
  type InvoiceClient, type InvoiceData,
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

/* ── Retainer client shape (minimal — read from monthly clients) ─────────── */
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
  /* Invoice extras — set when ready */
  fakturaRada?: number;
  ico?: string;
  dic?: string;
  adresa?: string;       // "Ulice 1"
  pscMesto?: string;     // "664 48 Moravany"
  zeme?: string;
  popisSluzby?: string;  // main service description
}

/* ── Known client data ───────────────────────────────────────────────────── */
// popisDetailSablona: optional template for the 2nd description line.
// Use {MM} for zero-padded month and {RRRR} for 4-digit year of the service period.
// Falls back to "pro {nazev} ({MM}/{RRRR})" if omitted.
interface ClientInvoiceEntry extends Partial<InvoiceClient> {
  popisDetailSablona?: string;
}
const CLIENT_INVOICE_DATA: Record<string, ClientInvoiceEntry> = {
  "IMTOS": {
    fakturaRada: 14,
    nazev: "IMTOS, spol. s r.o.",
    ulice: "Technická 818/4",
    psc: "664 48",
    mesto: "Moravany",
    zeme: "Česká republika",
    ico: "46967079",
    dic: "CZ46967079",
    castka: 35000,
    popisSluzby: "Kreativní produkce a digitální strategie obsahu: LinkedIn, Facebook & Instagram",
    popisDetailSablona: "pro IMTOS, spol. s r.o. ({MM}/{RRRR})",
  },
};

/* ── Resolve detail line from template + month/year ─────────────────────── */
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

/* ── Invoice row card ────────────────────────────────────────────────────── */
function InvoiceCard({
  client,
  onIssue,
}: {
  client: RetainerClient;
  onIssue: (client: RetainerClient) => void;
}) {
  const known = CLIENT_INVOICE_DATA[client.name.toUpperCase().split(" ")[0]] ??
                CLIENT_INVOICE_DATA[client.name.split(" ")[0]];
  const ready = !!(known?.fakturaRada && known?.ico);

  return (
    <div
      className="card flex items-center gap-4 px-5 py-4"
      style={{ borderLeft: `3px solid ${client.color}` }}
    >
      {/* Avatar */}
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

      {/* Info */}
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

      {/* Status */}
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

      {/* Action */}
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
}: {
  client: RetainerClient;
  onClose: () => void;
}) {
  const now = new Date();
  const defaultMesic = now.getMonth() === 0 ? 12 : now.getMonth(); // previous month
  const defaultRok = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

  const [mesic, setMesic] = useState(defaultMesic);
  const [rok, setRok] = useState(defaultRok);

  // Merge known data
  const knownKey = Object.keys(CLIENT_INVOICE_DATA).find(
    k => client.name.toUpperCase().includes(k)
  );
  const known = knownKey ? CLIENT_INVOICE_DATA[knownKey] : {};
  const [castka, setCastka] = useState(String(known?.castka ?? client.pausal));
  const [popis, setPopis] = useState(known?.popisSluzby ?? "Kreativní produkce a digitální marketing");
  const [fakturaRada, setFakturaRada] = useState(String(known?.fakturaRada ?? ""));
  const [ico, setIco] = useState(known?.ico ?? "");
  const [dic, setDic] = useState(known?.dic ?? "");
  const [nazev, setNazev] = useState(known?.nazev ?? client.name);
  const [ulice, setUlice] = useState(known?.ulice ?? "");
  const [psc, setPsc] = useState(known?.psc ?? "");
  const [mesto, setMesto] = useState(known?.mesto ?? "");
  const [zeme, setZeme] = useState(known?.zeme ?? "Česká republika");
  const [pdfReady, setPdfReady] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | undefined>(undefined);
  // popisDetail: null = auto (resolved from template + month/year), string = manually overridden
  const [popisDetail, setPopisDetail] = useState<string | null>(null);

  // Auto-resolve detail from template whenever month/year changes (resets manual override)
  const autoDetail = useMemo(
    () => resolvePopisDetail(known?.popisDetailSablona, nazev, mesic, rok),
    [known?.popisDetailSablona, nazev, mesic, rok],
  );
  // Reset manual override when month or year changes so auto-value updates
  const prevMesicRok = `${mesic}/${rok}`;
  useEffect(() => { setPopisDetail(null); }, [prevMesicRok]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(() => setPdfReady(true), 400);
    return () => clearTimeout(t);
  }, [mesic, rok, castka, popis, fakturaRada, ico]);

  const baseInvoiceData = useMemo<InvoiceData | null>(() => {
    if (!fakturaRada || !ico) return null;
    const invoiceClient: InvoiceClient = {
      nazev, ulice, psc, mesto, zeme, ico, dic: dic || undefined,
      fakturaRada: parseInt(fakturaRada),
      castka: parseInt(castka) || 0,
      popisSluzby: popis,
    };
    return buildInvoice(invoiceClient, mesic, rok);
  }, [mesic, rok, castka, popis, fakturaRada, ico, dic, nazev, ulice, psc, mesto, zeme]);

  // Generate QR Platba data URL whenever invoice data changes
  useEffect(() => {
    if (!baseInvoiceData) { setQrDataUrl(undefined); return; }
    const spd = buildSpdString(
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
    return {
      ...baseInvoiceData,
      popisDetail: popisDetail ?? autoDetail,
      qrDataUrl,
    };
  }, [baseInvoiceData, popisDetail, autoDetail, qrDataUrl]);

  const fileName = invoiceData
    ? `${invoiceData.cislo}_${nazev.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`
    : "faktura.pdf";

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ background: "oklch(0 0 0 / 0.65)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <motion.div
        className="relative w-full md:max-w-2xl max-h-[94vh] overflow-y-auto rounded-t-[16px] md:rounded-[14px]"
        style={{ background: "oklch(0.11 0.008 222)", border: "1px solid oklch(1 0 0 / 0.09)" }}
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 z-10"
          style={{ borderColor: "oklch(1 0 0 / 0.08)", background: "oklch(0.11 0.008 222)" }}>
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

          {/* Invoice number preview */}
          {fakturaRada && (
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
          )}

          {/* Amounts */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Částka (Kč)">
              <FInput value={castka} onChange={v => { setCastka(v.replace(/\D/g,"")); setPdfReady(false); }} placeholder="35000" />
            </Field>
            <Field label="Řadová řada klienta">
              <FInput value={fakturaRada} onChange={v => { setFakturaRada(v.replace(/\D/g,"")); setPdfReady(false); }} placeholder="14" />
            </Field>
          </div>

          {/* Service description */}
          <Field label="Popis služby">
            <input value={popis} onChange={e => { setPopis(e.target.value); setPdfReady(false); }}
              className={iCls} style={iSty}
              onFocus={e => (e.target.style.borderColor = "oklch(0.62 0.27 265 / 0.5)")}
              onBlur={e => (e.target.style.borderColor = "oklch(1 0 0 / 0.09)")}
              placeholder="Kreativní produkce a digitální strategie obsahu..." />
          </Field>

          {/* Detail line — auto from template, editable */}
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
          style={{ borderColor: "oklch(1 0 0 / 0.08)", background: "oklch(0.11 0.008 222)" }}>
          <button onClick={onClose}
            className="px-4 py-2 rounded-[7px] text-[13px] font-medium text-[--muted-foreground] btn-tactile"
            style={{ background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.08)" }}>
            Zrušit
          </button>

          {invoiceData ? (
            <InvoiceDownloadButton data={invoiceData} fileName={fileName} />
          ) : (
            <button disabled
              className="flex items-center gap-2 px-4 py-2 rounded-[7px] text-[13px] font-semibold opacity-40 cursor-not-allowed"
              style={{ background: "oklch(0.62 0.27 265)", color: "oklch(0.97 0.004 265)", fontFamily: "var(--font-outfit)" }}>
              <Download className="w-3.5 h-3.5" />
              {!fakturaRada || !ico ? "Vyplňte IČ a řadovou řadu" : "Připravuji..."}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function FakturaPage() {
  const [clients] = useSupabaseData<RetainerClient[]>("ov-monthly-clients", () => []);
  const [issuing, setIssuing] = useState<RetainerClient | null>(null);

  const activeClients = useMemo(() => clients.filter(c => c.aktivni), [clients]);

  const handleIssue = useCallback((c: RetainerClient) => setIssuing(c), []);

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

      {/* Client list */}
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

      {/* Modal */}
      <AnimatePresence>
        {issuing && (
          <IssueModal key="issue-modal" client={issuing} onClose={() => setIssuing(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
