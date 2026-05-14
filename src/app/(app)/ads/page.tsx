"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, X, Edit2, Check, Search, Megaphone,
  CheckCircle2, Clock, AlertCircle, ChevronDown,
} from "lucide-react";

/* ── Types ──────────────────────────────────────────────────────────────────── */
type AdStatus   = "Probíhá" | "Probíhá vyhodnocení" | "Dokončeno";
type PayStatus  = "Odesláno" | "Neodesláno" | "—";
type FormatType = "VIDEO" | "VIDEO FB" | "VIDEO FB & IG" | "VIDEO SWIPE" |
                  "VIDEO SOUTĚŽ IG" | "VIDEO SOUTĚŽ FB" | "GRAFIKA" | "FOTO" | string;

interface Ad {
  id: number;
  mesic: string;
  klient: string;
  stav: AdStatus;
  datumZahajeni: string;
  datumUkonceni: string;
  format: FormatType;
  tema: string;
  cilReklamy: string;
  vysledek: string;
  castka: string;
  vyhodnotil: string;
  stavVyplaty: PayStatus;
  mesicniVyplata: string;
}

/* ── Seed data (z Google Sheets) ────────────────────────────────────────────── */
const SEED: Ad[] = [
  { id:  1, mesic: "ÚNOR",          klient: "EASTGATE Brno",    stav: "Dokončeno",            datumZahajeni: "4.2.2026",  datumUkonceni: "18.2.2026", format: "VIDEO",             tema: "Hlavní promo (Akviziční, Jonáš)",         cilReklamy: "PROKLIK NA WEB",    vysledek: "TRAFFIC (NÁVŠTĚVNOST)",               castka: "2 795 Kč",  vyhodnotil: "Jan KŘÍŽ",          stavVyplaty: "Odesláno",    mesicniVyplata: "" },
  { id:  2, mesic: "ÚNOR",          klient: "EASTGATE Brno",    stav: "Dokončeno",            datumZahajeni: "20.2.2026", datumUkonceni: "6.3.2026",  format: "GRAFIKA",           tema: "Západ slunce terasa EASTGATE",            cilReklamy: "PROKLIK NA WEB",    vysledek: "TRAFFIC (NÁVŠTĚVNOST)",               castka: "2 788 Kč",  vyhodnotil: "Tomáš DANG",        stavVyplaty: "Odesláno",    mesicniVyplata: "BŘEZEN 2026" },
  { id:  3, mesic: "ÚNOR / BŘEZEN", klient: "SENIMED s.r.o.",   stav: "Dokončeno",            datumZahajeni: "27.2.2026", datumUkonceni: "13.3.2026", format: "VIDEO",             tema: "Prodej léků SENIMED v AKESO Poliklinika", cilReklamy: "POVĚDOMÍ",          vysledek: "PROKLIK NA PROFIL FB + IG",           castka: "2 494 Kč",  vyhodnotil: "Tomáš DANG",        stavVyplaty: "Odesláno",    mesicniVyplata: "BŘEZEN 2026" },
  { id:  4, mesic: "ÚNOR / BŘEZEN", klient: "BehejBrno.com",    stav: "Dokončeno",            datumZahajeni: "27.2.2026", datumUkonceni: "7.4.2026",  format: "VIDEO",             tema: "Pozvánka CRAFT Brněnský půlmaraton",      cilReklamy: "PROKLIK NA WEB",    vysledek: "TRAFFIC + PŘIHLÁŠENÍ NA ZÁVOD (WEB)", castka: "5 051 Kč",  vyhodnotil: "Tomáš DANG",        stavVyplaty: "Odesláno",    mesicniVyplata: "DUBEN 2026" },
  { id:  5, mesic: "BŘEZEN",        klient: "EASTGATE Brno",    stav: "Dokončeno",            datumZahajeni: "11.3.2026", datumUkonceni: "25.3.2026", format: "VIDEO FB",          tema: "Byty 2+KK (Akviziční, Jonáš)",           cilReklamy: "PROKLIK NA WEB",    vysledek: "TRAFFIC (NÁVŠTĚVNOST)",               castka: "2 795 Kč",  vyhodnotil: "Tomáš DANG",        stavVyplaty: "Odesláno",    mesicniVyplata: "BŘEZEN 2026" },
  { id:  6, mesic: "BŘEZEN / DUBEN",klient: "MTB CZ",           stav: "Dokončeno",            datumZahajeni: "19.3.2026", datumUkonceni: "9.4.2026",  format: "GRAFIKA",           tema: "Naše služby",                             cilReklamy: "PROJEVENÝ ZÁJEM",   vysledek: "—",                                   castka: "3 142 Kč",  vyhodnotil: "Nevyhodnocuje se",  stavVyplaty: "Neodesláno",  mesicniVyplata: "" },
  { id:  7, mesic: "BŘEZEN / DUBEN",klient: "SENIMED s.r.o.",   stav: "Dokončeno",            datumZahajeni: "26.3.2026", datumUkonceni: "9.4.2026",  format: "VIDEO SWIPE",       tema: "Curenzym Anixi",                          cilReklamy: "PROJEVENÝ ZÁJEM",   vysledek: "ENGAGEMENT",                          castka: "1 395 Kč",  vyhodnotil: "Tomáš DANG",        stavVyplaty: "Odesláno",    mesicniVyplata: "DUBEN 2026" },
  { id:  8, mesic: "BŘEZEN / DUBEN",klient: "SENIMED s.r.o.",   stav: "Dokončeno",            datumZahajeni: "27.3.2026", datumUkonceni: "10.4.2026", format: "VIDEO SWIPE",       tema: "BETAGLUKAN IMU",                          cilReklamy: "PROJEVENÝ ZÁJEM",   vysledek: "ENGAGEMENT",                          castka: "1 395 Kč",  vyhodnotil: "Tomáš DANG",        stavVyplaty: "Odesláno",    mesicniVyplata: "DUBEN 2026" },
  { id:  9, mesic: "DUBEN",         klient: "Cukrárna TOFFI",   stav: "Dokončeno",            datumZahajeni: "23.4.2026", datumUkonceni: "30.4.2026", format: "FOTO",              tema: "Pobočka Olympie Brno",                    cilReklamy: "PROJEVENÝ ZÁJEM",   vysledek: "ENGAGEMENT",                          castka: "699 Kč",    vyhodnotil: "Nevyhodnocuje se",  stavVyplaty: "Neodesláno",  mesicniVyplata: "" },
  { id: 10, mesic: "DUBEN / KVĚTEN",klient: "SENIMED s.r.o.",   stav: "Probíhá vyhodnocení",  datumZahajeni: "24.4.2026", datumUkonceni: "12.5.2026", format: "VIDEO SOUTĚŽ IG",   tema: "Lactoflorene",                            cilReklamy: "PROJEVENÝ ZÁJEM",   vysledek: "ENGAGEMENT",                          castka: "",          vyhodnotil: "Tomáš DANG",        stavVyplaty: "—",           mesicniVyplata: "KVĚTEN 2026" },
  { id: 11, mesic: "DUBEN / KVĚTEN",klient: "SENIMED s.r.o.",   stav: "Probíhá vyhodnocení",  datumZahajeni: "24.4.2026", datumUkonceni: "12.5.2026", format: "VIDEO SOUTĚŽ FB",   tema: "Lactoflorene",                            cilReklamy: "PROJEVENÝ ZÁJEM",   vysledek: "ENGAGEMENT",                          castka: "",          vyhodnotil: "Tomáš DANG",        stavVyplaty: "—",           mesicniVyplata: "KVĚTEN 2026" },
  { id: 12, mesic: "KVĚTEN",        klient: "SK Brno Slatina",  stav: "Dokončeno",            datumZahajeni: "3.5.2026",  datumUkonceni: "13.5.2026", format: "VIDEO FB & IG",     tema: "FINAL FOUR",                              cilReklamy: "POVĚDOMÍ",          vysledek: "—",                                   castka: "1 000 Kč",  vyhodnotil: "Nevyhodnocuje se",  stavVyplaty: "Neodesláno",  mesicniVyplata: "" },
  { id: 13, mesic: "KVĚTEN",        klient: "MTB CZ",           stav: "Probíhá",              datumZahajeni: "6.5.2026",  datumUkonceni: "20.5.2026", format: "VIDEO FB & IG",     tema: "FPV Dron",                                cilReklamy: "PROJEVENÝ ZÁJEM",   vysledek: "ENGAGEMENT",                          castka: "",          vyhodnotil: "Nevyhodnocuje se",  stavVyplaty: "Neodesláno",  mesicniVyplata: "" },
  { id: 14, mesic: "KVĚTEN",        klient: "EASTGATE Brno",    stav: "Probíhá",              datumZahajeni: "6.5.2026",  datumUkonceni: "20.5.2026", format: "VIDEO FB",          tema: "Byty 3+KK (Akviziční, Jonáš)",           cilReklamy: "PROKLIK NA WEB",    vysledek: "TRAFFIC (NÁVŠTĚVNOST)",               castka: "",          vyhodnotil: "Tomáš DANG",        stavVyplaty: "—",           mesicniVyplata: "KVĚTEN 2026" },
  { id: 15, mesic: "KVĚTEN",        klient: "BehejBrno.com",    stav: "Probíhá",              datumZahajeni: "7.5.2026",  datumUkonceni: "18.5.2026", format: "GRAFIKA",           tema: "SUNRISE",                                 cilReklamy: "PROKLIK NA WEB",    vysledek: "TRAFFIC + PŘIHLÁŠENÍ NA ZÁVOD (WEB)", castka: "",          vyhodnotil: "Nevyhodnocuje se",  stavVyplaty: "Neodesláno",  mesicniVyplata: "" },
];

/* ── Config ─────────────────────────────────────────────────────────────────── */
const FORMAT_OPTIONS: FormatType[] = [
  "VIDEO", "VIDEO FB", "VIDEO FB & IG", "VIDEO SWIPE",
  "VIDEO SOUTĚŽ IG", "VIDEO SOUTĚŽ FB", "GRAFIKA", "FOTO",
];
const CIL_OPTIONS = ["PROKLIK NA WEB", "POVĚDOMÍ", "PROJEVENÝ ZÁJEM"];
const VYSLEDEK_OPTIONS = [
  "TRAFFIC (NÁVŠTĚVNOST)", "ENGAGEMENT", "PROKLIK NA PROFIL FB + IG",
  "TRAFFIC + PŘIHLÁŠENÍ NA ZÁVOD (WEB)", "—",
];
const VYHODNOTIL_OPTIONS = ["Jan KŘÍŽ", "Tomáš DANG", "Nevyhodnocuje se"];
const STATUS_OPTIONS: AdStatus[] = ["Probíhá", "Probíhá vyhodnocení", "Dokončeno"];

const EMPTY_AD: Omit<Ad, "id"> = {
  mesic: "", klient: "", stav: "Probíhá", datumZahajeni: "", datumUkonceni: "",
  format: "VIDEO", tema: "", cilReklamy: "PROKLIK NA WEB", vysledek: "TRAFFIC (NÁVŠTĚVNOST)",
  castka: "", vyhodnotil: "Jan KŘÍŽ", stavVyplaty: "—", mesicniVyplata: "",
};

/* ── Status helpers ─────────────────────────────────────────────────────────── */
function statusStyle(s: AdStatus) {
  if (s === "Probíhá")              return { color: "oklch(0.81 0.155 200)", bg: "oklch(0.81 0.155 200 / 0.1)",  border: "oklch(0.81 0.155 200 / 0.25)" };
  if (s === "Probíhá vyhodnocení")  return { color: "oklch(0.78 0.165 75)",  bg: "oklch(0.74 0.165 75 / 0.1)",   border: "oklch(0.74 0.165 75 / 0.25)" };
  return                                   { color: "oklch(0.67 0.155 155)", bg: "oklch(0.67 0.155 155 / 0.08)", border: "oklch(0.67 0.155 155 / 0.2)" };
}
function statusIcon(s: AdStatus) {
  if (s === "Probíhá")             return <Clock className="w-3 h-3" />;
  if (s === "Probíhá vyhodnocení") return <AlertCircle className="w-3 h-3" />;
  return <CheckCircle2 className="w-3 h-3" />;
}
function formatStyle(f: FormatType) {
  if (f.startsWith("VIDEO"))   return { color: "oklch(0.72 0.18 290)",   bg: "oklch(0.64 0.21 290 / 0.1)",   border: "oklch(0.64 0.21 290 / 0.2)" };
  if (f === "GRAFIKA")         return { color: "oklch(0.81 0.155 200)",  bg: "oklch(0.81 0.155 200 / 0.08)", border: "oklch(0.81 0.155 200 / 0.18)" };
  return                              { color: "oklch(0.55 0.005 222)",  bg: "oklch(1 0 0 / 0.05)",          border: "oklch(1 0 0 / 0.1)" };
}
function payStyle(s: PayStatus) {
  if (s === "Odesláno")  return { color: "oklch(0.67 0.155 155)", dot: "oklch(0.67 0.155 155)" };
  if (s === "Neodesláno") return { color: "oklch(0.65 0.22 25)",   dot: "oklch(0.65 0.22 25)" };
  return                         { color: "oklch(0.40 0.005 222)", dot: "oklch(0.35 0.005 222)" };
}

/* ── Badge ──────────────────────────────────────────────────────────────────── */
function Badge({ label, color, bg, border }: { label: string; color: string; bg: string; border: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[5px] text-[11px] font-semibold whitespace-nowrap"
      style={{ color, background: bg, border: `1px solid ${border}` }}
    >
      {label}
    </span>
  );
}

/* ── Modal field ────────────────────────────────────────────────────────────── */
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

const inputCls = `w-full px-3 py-2 rounded-[7px] text-[13px] text-[--foreground] outline-none transition-all`;
const inputStyle = { background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.09)", fontFamily: "var(--font-jakarta)" };

function Input({ value, onChange, placeholder, type = "text" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input
      type={type} value={value} placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      className={inputCls} style={inputStyle}
      onFocus={e => (e.target.style.borderColor = "oklch(0.81 0.155 200 / 0.5)")}
      onBlur={e  => (e.target.style.borderColor = "oklch(1 0 0 / 0.09)")}
    />
  );
}

function Select({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: string[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`${inputCls} appearance-none pr-8 cursor-pointer`}
        style={{ ...inputStyle, color: "var(--foreground)" }}
      >
        {options.map(o => <option key={o} value={o} style={{ background: "oklch(0.12 0.008 222)" }}>{o}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[--muted-foreground]" />
    </div>
  );
}

/* ── Stats strip ────────────────────────────────────────────────────────────── */
function StatsStrip({ ads }: { ads: Ad[] }) {
  const probiha     = ads.filter(a => a.stav === "Probíhá").length;
  const vyhodnoceni = ads.filter(a => a.stav === "Probíhá vyhodnocení").length;
  const dokonceno   = ads.filter(a => a.stav === "Dokončeno").length;
  const neodesláno  = ads.filter(a => a.stavVyplaty === "Neodesláno").length;

  const stats = [
    { label: "Celkem reklam",       value: ads.length,    color: "var(--foreground)" },
    { label: "Probíhá",             value: probiha,        color: "oklch(0.81 0.155 200)" },
    { label: "Probíhá vyhodnocení", value: vyhodnoceni,   color: "oklch(0.78 0.165 75)" },
    { label: "Dokončeno",           value: dokonceno,     color: "oklch(0.67 0.155 155)" },
    { label: "Neodesláno ❌",       value: neodesláno,   color: "oklch(0.65 0.22 25)" },
  ];

  return (
    <div
      className="grid grid-cols-2 md:grid-cols-5 gap-px rounded-[12px] overflow-hidden"
      style={{ background: "oklch(1 0 0 / 0.06)" }}
    >
      {stats.map(s => (
        <div key={s.label} className="px-4 py-4" style={{ background: "var(--card)" }}>
          <p className="text-[10px] text-[--muted-foreground] font-medium uppercase tracking-[0.06em] mb-1.5 leading-tight">
            {s.label}
          </p>
          <p className="num text-[28px] font-bold leading-none" style={{ fontFamily: "var(--font-outfit)", color: s.color, letterSpacing: "-0.02em" }}>
            {s.value}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ── Ad Row (table) ─────────────────────────────────────────────────────────── */
function AdRow({ ad, onEdit, onToggleDone }: {
  ad: Ad;
  onEdit: (ad: Ad) => void;
  onToggleDone: (id: number) => void;
}) {
  const ss = statusStyle(ad.stav);
  const fs = formatStyle(ad.format);
  const ps = payStyle(ad.stavVyplaty);

  return (
    <motion.tr
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
      className="group border-b"
      style={{ borderColor: "oklch(1 0 0 / 0.05)" }}
    >
      {/* Status toggle */}
      <td className="pl-4 pr-2 py-3 w-8">
        <motion.button
          onClick={() => onToggleDone(ad.id)}
          className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all btn-tactile"
          style={ad.stav === "Dokončeno"
            ? { borderColor: "oklch(0.67 0.155 155)", background: "oklch(0.67 0.155 155 / 0.15)" }
            : { borderColor: "oklch(0.25 0.005 222)", background: "transparent" }
          }
          whileHover={{ borderColor: "oklch(0.67 0.155 155)" }}
          whileTap={{ scale: 0.88 }}
          transition={{ duration: 0.12 }}
          title="Označit jako dokončeno"
        >
          {ad.stav === "Dokončeno" && (
            <Check className="w-2.5 h-2.5" style={{ color: "oklch(0.67 0.155 155)" }} />
          )}
        </motion.button>
      </td>

      {/* Měsíc */}
      <td className="px-3 py-3 text-[12px] text-[--muted-foreground] whitespace-nowrap font-medium" style={{ fontFamily: "var(--font-outfit)" }}>
        {ad.mesic}
      </td>

      {/* Klient */}
      <td className="px-3 py-3">
        <span className="text-[13px] font-semibold text-[--foreground]" style={{ fontFamily: "var(--font-outfit)", letterSpacing: "-0.01em" }}>
          {ad.klient}
        </span>
      </td>

      {/* Stav */}
      <td className="px-3 py-3">
        <span
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-[6px] text-[11px] font-semibold whitespace-nowrap"
          style={{ color: ss.color, background: ss.bg, border: `1px solid ${ss.border}` }}
        >
          {statusIcon(ad.stav)}
          {ad.stav}
        </span>
      </td>

      {/* Datum */}
      <td className="px-3 py-3 text-[12px] text-[--muted-foreground] whitespace-nowrap hidden lg:table-cell">
        {ad.datumZahajeni} — {ad.datumUkonceni}
      </td>

      {/* Formát */}
      <td className="px-3 py-3 hidden md:table-cell">
        <Badge label={ad.format} {...fs} />
      </td>

      {/* Téma */}
      <td className="px-3 py-3 hidden xl:table-cell">
        <span className="text-[12px] text-[--muted-foreground] max-w-[180px] truncate block" title={ad.tema}>
          {ad.tema}
        </span>
      </td>

      {/* Cíl */}
      <td className="px-3 py-3 hidden lg:table-cell">
        <span className="text-[11px] text-[--muted-foreground]">{ad.cilReklamy}</span>
      </td>

      {/* Částka */}
      <td className="px-3 py-3 text-right whitespace-nowrap">
        <span
          className="num text-[13px] font-semibold"
          style={{ color: ad.castka ? "var(--foreground)" : "oklch(0.30 0.005 222)", fontFamily: "var(--font-outfit)" }}
        >
          {ad.castka || "—"}
        </span>
      </td>

      {/* Výplata */}
      <td className="px-3 py-3 hidden md:table-cell whitespace-nowrap">
        <span className="flex items-center gap-1.5 text-[12px] font-medium" style={{ color: ps.color }}>
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: ps.dot }} />
          {ad.stavVyplaty}
        </span>
      </td>

      {/* Vyhodnotil */}
      <td className="px-3 py-3 hidden xl:table-cell">
        <span className="text-[11px] text-[--muted-foreground]">{ad.vyhodnotil}</span>
      </td>

      {/* Edit */}
      <td className="pr-4 pl-2 py-3 w-8">
        <motion.button
          onClick={() => onEdit(ad)}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-[5px] btn-tactile"
          style={{ color: "oklch(0.45 0.005 222)" }}
          whileHover={{ color: "oklch(0.81 0.155 200)", background: "oklch(0.81 0.155 200 / 0.08)" }}
          whileTap={{ scale: 0.90 }}
          transition={{ duration: 0.12 }}
        >
          <Edit2 className="w-3.5 h-3.5" />
        </motion.button>
      </td>
    </motion.tr>
  );
}

/* ── Mobile Ad Card ─────────────────────────────────────────────────────────── */
function AdCard({ ad, onEdit, onToggleDone }: {
  ad: Ad;
  onEdit: (ad: Ad) => void;
  onToggleDone: (id: number) => void;
}) {
  const ss = statusStyle(ad.stav);
  const ps = payStyle(ad.stavVyplaty);
  const fs = formatStyle(ad.format);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
      className="card p-4 space-y-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <motion.button
            onClick={() => onToggleDone(ad.id)}
            className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 btn-tactile"
            style={ad.stav === "Dokončeno"
              ? { borderColor: "oklch(0.67 0.155 155)", background: "oklch(0.67 0.155 155 / 0.15)" }
              : { borderColor: "oklch(0.25 0.005 222)", background: "transparent" }
            }
            whileTap={{ scale: 0.88 }}
            transition={{ duration: 0.12 }}
          >
            {ad.stav === "Dokončeno" && (
              <Check className="w-2.5 h-2.5" style={{ color: "oklch(0.67 0.155 155)" }} />
            )}
          </motion.button>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-[--foreground] leading-tight truncate" style={{ fontFamily: "var(--font-outfit)", letterSpacing: "-0.01em" }}>
              {ad.klient}
            </p>
            <p className="text-[11px] text-[--muted-foreground] mt-0.5">{ad.mesic}</p>
          </div>
        </div>
        <button onClick={() => onEdit(ad)} className="shrink-0 p-1.5 rounded-[6px] btn-tactile" style={{ color: "oklch(0.45 0.005 222)", background: "oklch(1 0 0 / 0.04)" }}>
          <Edit2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[5px] text-[11px] font-semibold" style={{ color: ss.color, background: ss.bg, border: `1px solid ${ss.border}` }}>
          {statusIcon(ad.stav)} {ad.stav}
        </span>
        <Badge label={ad.format} {...fs} />
      </div>

      <p className="text-[12px] text-[--muted-foreground] leading-snug">{ad.tema}</p>

      <div className="flex items-center justify-between pt-1 border-t" style={{ borderColor: "oklch(1 0 0 / 0.06)" }}>
        <span className="text-[11px]" style={{ color: ps.color }}>
          {ad.stavVyplaty}
        </span>
        <span className="num text-[14px] font-bold" style={{ fontFamily: "var(--font-outfit)", color: ad.castka ? "var(--foreground)" : "oklch(0.30 0.005 222)" }}>
          {ad.castka || "—"}
        </span>
      </div>
    </motion.div>
  );
}

/* ── Edit/Add Modal ─────────────────────────────────────────────────────────── */
function AdModal({
  ad, onClose, onSave,
}: {
  ad: Ad | null;
  onClose: () => void;
  onSave: (ad: Omit<Ad, "id"> & { id?: number }) => void;
}) {
  const [form, setForm] = useState<Omit<Ad, "id">>(ad ? { ...ad } : { ...EMPTY_AD });
  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        style={{ background: "oklch(0 0 0 / 0.6)", backdropFilter: "blur(4px)" }}
      >
        <motion.div
          className="relative w-full md:max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-[16px] md:rounded-[14px]"
          style={{ background: "oklch(0.11 0.008 222)", border: "1px solid oklch(1 0 0 / 0.09)" }}
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "oklch(1 0 0 / 0.08)" }}>
            <h2 className="text-[15px] font-bold text-[--foreground]" style={{ fontFamily: "var(--font-outfit)", letterSpacing: "-0.02em" }}>
              {ad ? "Upravit reklamu" : "Přidat reklamu"}
            </h2>
            <button onClick={onClose} className="p-1.5 rounded-[6px] btn-tactile text-[--muted-foreground] hover:text-[--foreground] transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form */}
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Měsíc">
              <Input value={form.mesic} onChange={set("mesic")} placeholder="např. KVĚTEN / ČERVEN" />
            </Field>
            <Field label="Klient">
              <Input value={form.klient} onChange={set("klient")} placeholder="Název klienta" />
            </Field>

            <Field label="Stav kampaně">
              <Select value={form.stav} onChange={v => set("stav")(v)} options={STATUS_OPTIONS} />
            </Field>
            <Field label="Stav reklamy">
              <Select value={form.stavVyplaty} onChange={set("stavVyplaty")} options={["Odesláno", "Neodesláno", "—"]} />
            </Field>

            <Field label="Datum zahájení">
              <Input value={form.datumZahajeni} onChange={set("datumZahajeni")} placeholder="1.6.2026" />
            </Field>
            <Field label="Datum ukončení">
              <Input value={form.datumUkonceni} onChange={set("datumUkonceni")} placeholder="15.6.2026" />
            </Field>

            <Field label="Formát">
              <Select value={form.format} onChange={set("format")} options={FORMAT_OPTIONS} />
            </Field>
            <Field label="Téma">
              <Input value={form.tema} onChange={set("tema")} placeholder="Popis tématu reklamy" />
            </Field>

            <Field label="Cíl reklamy">
              <Select value={form.cilReklamy} onChange={set("cilReklamy")} options={CIL_OPTIONS} />
            </Field>
            <Field label="Výsledek / metrika">
              <Select value={form.vysledek} onChange={set("vysledek")} options={VYSLEDEK_OPTIONS} />
            </Field>

            <Field label="Částka (Kč)">
              <Input value={form.castka} onChange={set("castka")} placeholder="2 500 Kč" />
            </Field>
            <Field label="Vyhodnotil">
              <Select value={form.vyhodnotil} onChange={set("vyhodnotil")} options={VYHODNOTIL_OPTIONS} />
            </Field>

            <Field label="Měsíční výplata">
              <Input value={form.mesicniVyplata} onChange={set("mesicniVyplata")} placeholder="ČERVEN 2026" />
            </Field>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2.5 px-5 py-4 border-t" style={{ borderColor: "oklch(1 0 0 / 0.08)" }}>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-[7px] text-[13px] font-medium text-[--muted-foreground] btn-tactile transition-colors hover:text-[--foreground]"
              style={{ background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.08)" }}
            >
              Zrušit
            </button>
            <motion.button
              onClick={() => onSave({ ...form, ...(ad ? { id: ad.id } : {}) })}
              className="px-4 py-2 rounded-[7px] text-[13px] font-semibold btn-tactile"
              style={{ background: "oklch(0.81 0.155 200)", color: "oklch(0.09 0.008 222)", fontFamily: "var(--font-outfit)" }}
              whileHover={{ filter: "brightness(1.08)" }}
              whileTap={{ scale: 0.96 }}
              transition={{ duration: 0.12 }}
            >
              {ad ? "Uložit změny" : "Přidat reklamu"}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ── Page ───────────────────────────────────────────────────────────────────── */
export default function AdsPage() {
  const [ads, setAds]           = useState<Ad[]>(SEED);
  const [filter, setFilter]     = useState<AdStatus | "Vše">("Vše");
  const [search, setSearch]     = useState("");
  const [modal, setModal]       = useState<Ad | null | "new">(null);

  const filtered = useMemo(() => {
    return ads
      .filter(a => filter === "Vše" || a.stav === filter)
      .filter(a => {
        if (!search) return true;
        const q = search.toLowerCase();
        return a.klient.toLowerCase().includes(q) || a.tema.toLowerCase().includes(q) || a.mesic.toLowerCase().includes(q);
      });
  }, [ads, filter, search]);

  function toggleDone(id: number) {
    setAds(prev => prev.map(a => {
      if (a.id !== id) return a;
      const next: AdStatus = a.stav === "Dokončeno" ? "Probíhá" : "Dokončeno";
      return { ...a, stav: next };
    }));
  }

  function handleSave(data: Omit<Ad, "id"> & { id?: number }) {
    if (data.id !== undefined) {
      setAds(prev => prev.map(a => a.id === data.id ? { ...data, id: data.id! } : a));
    } else {
      setAds(prev => [...prev, { ...data, id: Date.now() }]);
    }
    setModal(null);
  }

  const filterTabs: (AdStatus | "Vše")[] = ["Vše", "Probíhá", "Probíhá vyhodnocení", "Dokončeno"];

  return (
    <>
      <div
        className="p-4 md:p-7 space-y-4 md:space-y-5 min-h-screen"
        style={{
          background: `radial-gradient(ellipse 60% 40% at 100% 0%, oklch(0.81 0.155 200 / 0.04) 0%, transparent 70%), var(--background)`,
        }}
      >
        {/* Header */}
        <motion.div
          className="flex items-start justify-between gap-3"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-[9px] flex items-center justify-center shrink-0"
              style={{ background: "oklch(0.81 0.155 200 / 0.12)", border: "1px solid oklch(0.81 0.155 200 / 0.2)" }}
            >
              <Megaphone className="w-4 h-4" style={{ color: "oklch(0.81 0.155 200)" }} />
            </div>
            <div>
              <h1 className="text-[22px] md:text-[28px] leading-none text-[--foreground]"
                style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, letterSpacing: "-0.03em" }}>
                Reklamy
              </h1>
              <p className="text-[12px] text-[--muted-foreground] mt-1">Správa reklamních kampaní</p>
            </div>
          </div>
          <motion.button
            onClick={() => setModal("new")}
            className="btn-tactile flex items-center gap-2 px-3.5 py-2 rounded-[8px] text-[13px] font-semibold shrink-0"
            style={{ background: "oklch(0.81 0.155 200)", color: "oklch(0.09 0.008 222)", fontFamily: "var(--font-outfit)" }}
            whileHover={{ filter: "brightness(1.08)" }}
            whileTap={{ scale: 0.96 }}
            transition={{ duration: 0.12 }}
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Přidat reklamu</span>
            <span className="sm:hidden">Přidat</span>
          </motion.button>
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }}>
          <StatsStrip ads={ads} />
        </motion.div>

        {/* Filters */}
        <motion.div
          className="flex flex-col sm:flex-row gap-3"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[--muted-foreground]" />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Hledat klienta, téma..."
              className="w-full pl-8 pr-3 py-2 rounded-[8px] text-[13px] text-[--foreground] placeholder:text-[--muted-foreground] outline-none transition-all"
              style={{ background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.09)", fontFamily: "var(--font-jakarta)" }}
              onFocus={e => (e.target.style.borderColor = "oklch(0.81 0.155 200 / 0.5)")}
              onBlur={e  => (e.target.style.borderColor = "oklch(1 0 0 / 0.09)")}
            />
          </div>

          {/* Status tabs */}
          <div className="flex items-center gap-1 flex-wrap">
            {filterTabs.map(tab => {
              const active = filter === tab;
              const ss = tab !== "Vše" ? statusStyle(tab) : null;
              return (
                <motion.button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className="px-3 py-1.5 rounded-[6px] text-[11px] font-semibold btn-tactile whitespace-nowrap"
                  style={active
                    ? { background: ss?.bg ?? "oklch(1 0 0 / 0.08)", color: ss?.color ?? "var(--foreground)", border: `1px solid ${ss?.border ?? "oklch(1 0 0 / 0.12)"}` }
                    : { background: "transparent", color: "oklch(0.40 0.005 222)", border: "1px solid oklch(1 0 0 / 0.06)" }
                  }
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.12 }}
                >
                  {tab}
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Table — desktop */}
        <motion.div
          className="card overflow-hidden hidden md:block"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid oklch(1 0 0 / 0.07)" }}>
                  {["", "Měsíc", "Klient", "Stav", "Datum", "Formát", "Téma", "Cíl", "Částka", "Výplata", "Vyhodnotil", ""].map((h, i) => (
                    <th
                      key={i}
                      className={`px-3 py-3 text-left text-[10px] font-semibold text-[--muted-foreground] uppercase tracking-[0.07em] ${
                        h === "Datum"     ? "hidden lg:table-cell" :
                        h === "Formát"   ? "hidden md:table-cell" :
                        h === "Téma"     ? "hidden xl:table-cell" :
                        h === "Cíl"      ? "hidden lg:table-cell" :
                        h === "Výplata"  ? "hidden md:table-cell" :
                        h === "Vyhodnotil" ? "hidden xl:table-cell" :
                        h === ""         ? "w-8" : ""
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="popLayout">
                  {filtered.map(ad => (
                    <AdRow
                      key={ad.id}
                      ad={ad}
                      onEdit={a => setModal(a)}
                      onToggleDone={toggleDone}
                    />
                  ))}
                </AnimatePresence>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-[13px] text-[--muted-foreground]">
                      Žádné reklamy nenalezeny.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Cards — mobile */}
        <motion.div
          className="space-y-2.5 md:hidden"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <AnimatePresence mode="popLayout">
            {filtered.map(ad => (
              <AdCard
                key={ad.id}
                ad={ad}
                onEdit={a => setModal(a)}
                onToggleDone={toggleDone}
              />
            ))}
          </AnimatePresence>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-[13px] text-[--muted-foreground]">
              Žádné reklamy nenalezeny.
            </div>
          )}
        </motion.div>

      </div>

      {/* Modal */}
      <AnimatePresence>
        {modal !== null && (
          <AdModal
            ad={modal === "new" ? null : modal}
            onClose={() => setModal(null)}
            onSave={handleSave}
          />
        )}
      </AnimatePresence>
    </>
  );
}
