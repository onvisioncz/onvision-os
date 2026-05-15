"use client";

import { useState, useMemo } from "react";
import { useSupabaseData } from "@/lib/hooks/use-supabase-data";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, X, Edit2, ChevronDown, TrendingUp, TrendingDown,
  Wallet, BarChart3, CheckCircle2, Clock, AlertCircle,
  FileText, Receipt, Paperclip, Download,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
} from "recharts";

/* ── Types ──────────────────────────────────────────────────────────────────── */
type Tab          = "prehled" | "prijmy" | "vydaje" | "bilance" | "faktury" | "doklady";
type MonthStatus  = "UZAVŘENO" | "PROBÍHÁ" | "NEPROBĚHLO";
type ItemStatus   = "Zaplaceno" | "Čeká" | "Storno";
type IncomeType   = "Měsíční klient" | "Jednorázový" | "Ostatní";
type ExpenseType  = "Software" | "Provize" | "Pojištění" | "Mzdy" | "Marketing" | "Nájem" | "Ostatní";

interface MonthSummary {
  mesic: string;
  prijemCelkovy: number;
  vydaje: number;
  prijemCisty: number;
  stav: MonthStatus;
  schvaleno: string;
  poznamka: string;
}
interface IncomeItem {
  id: number;
  mesic: string;
  klient: string;
  typ: IncomeType;
  datumZaplaceni: string;
  castka: number;
  stav: ItemStatus;
}
interface ExpenseItem {
  id: number;
  mesic: string;
  dodavatel: string;
  typ: ExpenseType;
  datumZaplaceni: string;
  castka: number;
  stav: ItemStatus;
  poznamka?: string;
}

type FakturaStav = "Zaplacena" | "Čeká na platbu" | "Po splatnosti" | "Storno";
interface Faktura {
  id: number;
  cislo: string;
  klient: string;
  popis: string;
  castka: number;
  castkaBezvat: number;
  dph: 21 | 15 | 0;
  datum: string;
  splatnost: string;
  stav: FakturaStav;
  soubor: string;
}

type DokladTyp = "Faktura přijatá" | "Pokladní doklad" | "Bankovní výpis" | "Smlouva" | "Jiné";
type DokladKat = "Software" | "Mzdy" | "Pojištění" | "Provize" | "Marketing" | "Vybavení" | "Jiné";
type DokladStav = "Zpracováno" | "Čeká na zpracování";
interface Doklad {
  id: number;
  typ: DokladTyp;
  dodavatel: string;
  popis: string;
  castka: number;
  datum: string;
  kategorie: DokladKat;
  stav: DokladStav;
  soubor: string;
}

/* ── Seed data ──────────────────────────────────────────────────────────────── */
const MONTHS_CZ = ["Leden","Únor","Březen","Duben","Květen","Červen","Červenec","Srpen","Září","Říjen","Listopad","Prosinec"];

const SUMMARIES: MonthSummary[] = [
  { mesic: "Leden",    prijemCelkovy: 266500,  vydaje: 90893,  prijemCisty: 175607, stav: "UZAVŘENO",    schvaleno: "Adam ✅", poznamka: "Zkontrolováno" },
  { mesic: "Únor",     prijemCelkovy: 295000,  vydaje: 98343,  prijemCisty: 196657, stav: "UZAVŘENO",    schvaleno: "Adam ✅", poznamka: "Zkontrolováno" },
  { mesic: "Březen",   prijemCelkovy: 349500,  vydaje: 122644, prijemCisty: 226856, stav: "UZAVŘENO",    schvaleno: "Adam ✅", poznamka: "Zkontrolováno" },
  { mesic: "Duben",    prijemCelkovy: 279500,  vydaje: 101956, prijemCisty: 177544, stav: "PROBÍHÁ",    schvaleno: "", poznamka: "2 platby čekají" },
  { mesic: "Květen",   prijemCelkovy: 0,       vydaje: 0,      prijemCisty: 0,      stav: "NEPROBĚHLO",  schvaleno: "", poznamka: "" },
  { mesic: "Červen",   prijemCelkovy: 0,       vydaje: 0,      prijemCisty: 0,      stav: "NEPROBĚHLO",  schvaleno: "", poznamka: "" },
  { mesic: "Červenec", prijemCelkovy: 0,       vydaje: 0,      prijemCisty: 0,      stav: "NEPROBĚHLO",  schvaleno: "", poznamka: "" },
  { mesic: "Srpen",    prijemCelkovy: 0,       vydaje: 0,      prijemCisty: 0,      stav: "NEPROBĚHLO",  schvaleno: "", poznamka: "" },
  { mesic: "Září",     prijemCelkovy: 0,       vydaje: 0,      prijemCisty: 0,      stav: "NEPROBĚHLO",  schvaleno: "", poznamka: "" },
  { mesic: "Říjen",    prijemCelkovy: 0,       vydaje: 0,      prijemCisty: 0,      stav: "NEPROBĚHLO",  schvaleno: "", poznamka: "" },
  { mesic: "Listopad", prijemCelkovy: 0,       vydaje: 0,      prijemCisty: 0,      stav: "NEPROBĚHLO",  schvaleno: "", poznamka: "" },
  { mesic: "Prosinec", prijemCelkovy: 0,       vydaje: 0,      prijemCisty: 0,      stav: "NEPROBĚHLO",  schvaleno: "", poznamka: "" },
];

const INCOME_SEED: IncomeItem[] = [
  // ── Leden — reálná data ze Sheets ──────────────────────────────────────────
  { id:  1, mesic: "Leden", klient: "SENIMED s.r.o.",                  typ: "Měsíční klient", datumZaplaceni: "13.2.2026", castka: 25000, stav: "Zaplaceno" },
  { id:  2, mesic: "Leden", klient: "STAVOS Brno, a.s.",               typ: "Měsíční klient", datumZaplaceni: "12.2.2026", castka: 30000, stav: "Zaplaceno" },
  { id:  3, mesic: "Leden", klient: "FIRESTA-Fišer a.s.",              typ: "Měsíční klient", datumZaplaceni: "5.3.2026",  castka: 28500, stav: "Zaplaceno" },
  { id:  4, mesic: "Leden", klient: "IMTOS spol. s r.o.",              typ: "Měsíční klient", datumZaplaceni: "11.2.2026", castka: 25000, stav: "Zaplaceno" },
  { id:  5, mesic: "Leden", klient: "Power Plate Česko",               typ: "Měsíční klient", datumZaplaceni: "11.2.2026", castka: 12000, stav: "Zaplaceno" },
  { id:  6, mesic: "Leden", klient: "ACsport.cz",                      typ: "Měsíční klient", datumZaplaceni: "9.2.2026",  castka: 15000, stav: "Zaplaceno" },
  { id:  7, mesic: "Leden", klient: "SK Brno Slatina",                 typ: "Měsíční klient", datumZaplaceni: "16.2.2026", castka: 12000, stav: "Zaplaceno" },
  { id:  8, mesic: "Leden", klient: "DIAM s.r.o.",                     typ: "Měsíční klient", datumZaplaceni: "11.2.2026", castka: 30000, stav: "Zaplaceno" },
  { id:  9, mesic: "Leden", klient: "MTB CZ s.r.o.",                   typ: "Měsíční klient", datumZaplaceni: "18.2.2026", castka: 30000, stav: "Zaplaceno" },
  { id: 10, mesic: "Leden", klient: "CKTCH Brno",                      typ: "Jednorázový",    datumZaplaceni: "19.1.2026", castka: 20000, stav: "Zaplaceno" },
  { id: 11, mesic: "Leden", klient: "Brno Open Game Business",         typ: "Jednorázový",    datumZaplaceni: "28.2.2026", castka: 39000, stav: "Zaplaceno" },
  // ── Únor — reálná data ze Sheets ───────────────────────────────────────────
  { id: 12, mesic: "Únor",  klient: "SENIMED s.r.o.",                  typ: "Měsíční klient", datumZaplaceni: "13.3.2026", castka: 47500, stav: "Zaplaceno" },
  { id: 13, mesic: "Únor",  klient: "STAVOS Brno, a.s.",               typ: "Měsíční klient", datumZaplaceni: "6.3.2026",  castka: 30000, stav: "Zaplaceno" },
  { id: 14, mesic: "Únor",  klient: "FIRESTA-Fišer a.s.",              typ: "Měsíční klient", datumZaplaceni: "4.4.2026",  castka: 28500, stav: "Zaplaceno" },
  { id: 15, mesic: "Únor",  klient: "IMTOS spol. s r.o.",              typ: "Měsíční klient", datumZaplaceni: "12.3.2026", castka: 25000, stav: "Zaplaceno" },
  { id: 16, mesic: "Únor",  klient: "Power Plate Česko",               typ: "Měsíční klient", datumZaplaceni: "10.3.2026", castka: 12000, stav: "Zaplaceno" },
  { id: 17, mesic: "Únor",  klient: "ACsport.cz",                      typ: "Měsíční klient", datumZaplaceni: "15.3.2026", castka: 15000, stav: "Zaplaceno" },
  { id: 18, mesic: "Únor",  klient: "SK Brno Slatina",                 typ: "Měsíční klient", datumZaplaceni: "19.3.2026", castka: 12000, stav: "Zaplaceno" },
  { id: 19, mesic: "Únor",  klient: "DIAM s.r.o.",                     typ: "Měsíční klient", datumZaplaceni: "12.3.2026", castka: 30000, stav: "Zaplaceno" },
  { id: 20, mesic: "Únor",  klient: "MTB CZ s.r.o.",                   typ: "Měsíční klient", datumZaplaceni: "11.3.2026", castka: 30000, stav: "Zaplaceno" },
  { id: 21, mesic: "Únor",  klient: "NERA Displays s.r.o.",            typ: "Jednorázový",    datumZaplaceni: "24.3.2026", castka: 35000, stav: "Zaplaceno" },
  { id: 22, mesic: "Únor",  klient: "TEKMA spol. s r.o.",              typ: "Jednorázový",    datumZaplaceni: "6.3.2026",  castka: 30000, stav: "Zaplaceno" },
  // ── Březen — reálná data ze Sheets ────────────────────────────────────────
  { id: 23, mesic: "Březen", klient: "SENIMED s.r.o.",                 typ: "Měsíční klient", datumZaplaceni: "10.4.2026", castka: 47000, stav: "Zaplaceno" },
  { id: 24, mesic: "Březen", klient: "IMTOS spol. s r.o.",             typ: "Měsíční klient", datumZaplaceni: "13.4.2026", castka: 35000, stav: "Zaplaceno" },
  { id: 25, mesic: "Březen", klient: "STAVOS Brno, a.s.",              typ: "Měsíční klient", datumZaplaceni: "17.4.2026", castka: 30000, stav: "Zaplaceno" },
  { id: 26, mesic: "Březen", klient: "FIRESTA-Fišer a.s.",             typ: "Měsíční klient", datumZaplaceni: "5.5.2026",  castka: 28500, stav: "Zaplaceno" },
  { id: 27, mesic: "Březen", klient: "Power Plate Česko",              typ: "Měsíční klient", datumZaplaceni: "7.4.2026",  castka: 12000, stav: "Zaplaceno" },
  { id: 28, mesic: "Březen", klient: "ACsport.cz",                     typ: "Měsíční klient", datumZaplaceni: "17.4.2026", castka: 15000, stav: "Zaplaceno" },
  { id: 29, mesic: "Březen", klient: "SK Brno Slatina",                typ: "Měsíční klient", datumZaplaceni: "14.4.2026", castka: 12000, stav: "Zaplaceno" },
  { id: 30, mesic: "Březen", klient: "DIAM s.r.o.",                    typ: "Měsíční klient", datumZaplaceni: "13.4.2026", castka: 30000, stav: "Zaplaceno" },
  { id: 31, mesic: "Březen", klient: "MTB CZ s.r.o.",                  typ: "Měsíční klient", datumZaplaceni: "14.4.2026", castka: 30000, stav: "Zaplaceno" },
  { id: 32, mesic: "Březen", klient: "TEKMA spol. s r.o.",             typ: "Jednorázový",    datumZaplaceni: "27.3.2026", castka: 60000, stav: "Zaplaceno" },
  { id: 33, mesic: "Březen", klient: "SENIMED s.r.o.",                 typ: "Jednorázový",    datumZaplaceni: "27.3.2026", castka: 35000, stav: "Zaplaceno" },
  { id: 34, mesic: "Březen", klient: "Sport Lubas s.r.o.",             typ: "Jednorázový",    datumZaplaceni: "16.3.2026", castka: 15000, stav: "Zaplaceno" },
  // ── Duben — reálná data (PROBÍHÁ, 2 platby čekají) ───────────────────────
  { id: 35, mesic: "Duben",  klient: "SENIMED s.r.o.",                 typ: "Měsíční klient", datumZaplaceni: "7.5.2026",  castka: 47000, stav: "Zaplaceno" },
  { id: 36, mesic: "Duben",  klient: "IMTOS spol. s r.o.",             typ: "Měsíční klient", datumZaplaceni: "11.5.2026", castka: 35000, stav: "Zaplaceno" },
  { id: 37, mesic: "Duben",  klient: "STAVOS Brno, a.s.",              typ: "Měsíční klient", datumZaplaceni: "11.5.2026", castka: 30000, stav: "Zaplaceno" },
  { id: 38, mesic: "Duben",  klient: "FIRESTA-Fišer a.s.",             typ: "Měsíční klient", datumZaplaceni: "4.6.2026",  castka: 28500, stav: "Čeká" },
  { id: 39, mesic: "Duben",  klient: "Power Plate Česko",              typ: "Měsíční klient", datumZaplaceni: "13.5.2026", castka: 12000, stav: "Zaplaceno" },
  { id: 40, mesic: "Duben",  klient: "ACsport.cz",                     typ: "Měsíční klient", datumZaplaceni: "—",         castka: 15000, stav: "Čeká" },
  { id: 41, mesic: "Duben",  klient: "SK Brno Slatina",                typ: "Měsíční klient", datumZaplaceni: "—",         castka: 12000, stav: "Čeká" },
  { id: 42, mesic: "Duben",  klient: "DIAM s.r.o.",                    typ: "Měsíční klient", datumZaplaceni: "11.5.2026", castka: 30000, stav: "Zaplaceno" },
  { id: 43, mesic: "Duben",  klient: "MTB CZ s.r.o.",                  typ: "Měsíční klient", datumZaplaceni: "7.5.2026",  castka: 30000, stav: "Zaplaceno" },
  { id: 44, mesic: "Duben",  klient: "SENIMED s.r.o.",                 typ: "Jednorázový",    datumZaplaceni: "21.4.2026", castka:  5000, stav: "Zaplaceno" },
  { id: 45, mesic: "Duben",  klient: "Cukrárna TOFFI",                 typ: "Jednorázový",    datumZaplaceni: "13.4.2026", castka:  4000, stav: "Zaplaceno" },
  { id: 46, mesic: "Duben",  klient: "TEKMA spol. s r.o.",             typ: "Jednorázový",    datumZaplaceni: "14.4.2026", castka:  6000, stav: "Zaplaceno" },
  { id: 47, mesic: "Duben",  klient: "Mo.one a.s.",                    typ: "Jednorázový",    datumZaplaceni: "27.4.2026", castka: 25000, stav: "Zaplaceno" },
];

const EXPENSE_SEED: ExpenseItem[] = [
  // ── Leden — reálná data ze Sheets ──────────────────────────────────────────
  { id:  1, mesic: "Leden", dodavatel: "Adam Mendrek",          typ: "Mzdy",      datumZaplaceni: "2.2.2026",  castka: 16900, stav: "Zaplaceno", poznamka: "DPP" },
  { id:  2, mesic: "Leden", dodavatel: "Jan Kříž",              typ: "Mzdy",      datumZaplaceni: "2.2.2026",  castka: 16900, stav: "Zaplaceno", poznamka: "DPP" },
  { id:  3, mesic: "Leden", dodavatel: "Tereza Burianová",      typ: "Mzdy",      datumZaplaceni: "2.2.2026",  castka:  5500, stav: "Zaplaceno", poznamka: "DPP" },
  { id:  4, mesic: "Leden", dodavatel: "Dominika Mendrek",      typ: "Mzdy",      datumZaplaceni: "2.2.2026",  castka:  3000, stav: "Zaplaceno", poznamka: "DPP" },
  { id:  5, mesic: "Leden", dodavatel: "Tomáš Dang",            typ: "Mzdy",      datumZaplaceni: "2.2.2026",  castka:  2500, stav: "Zaplaceno", poznamka: "DPP" },
  { id:  6, mesic: "Leden", dodavatel: "Zdeněk Dolíhal",        typ: "Provize",   datumZaplaceni: "3.2.2026",  castka: 20000, stav: "Zaplaceno", poznamka: "Faktura" },
  { id:  7, mesic: "Leden", dodavatel: "Martin Fiala",          typ: "Provize",   datumZaplaceni: "2.2.2026",  castka:  3000, stav: "Zaplaceno", poznamka: "Faktura" },
  { id:  8, mesic: "Leden", dodavatel: "Matty Hořák",           typ: "Provize",   datumZaplaceni: "2.2.2026",  castka: 12000, stav: "Zaplaceno", poznamka: "Faktura" },
  { id:  9, mesic: "Leden", dodavatel: "Patrik Petr",           typ: "Provize",   datumZaplaceni: "2.2.2026",  castka:  3000, stav: "Zaplaceno", poznamka: "Faktura" },
  { id: 10, mesic: "Leden", dodavatel: "Jiří Juhaňák",          typ: "Provize",   datumZaplaceni: "31.1.2026", castka:  3900, stav: "Zaplaceno", poznamka: "Provize — Brno Open Game" },
  { id: 11, mesic: "Leden", dodavatel: "ChatGPT",               typ: "Software",  datumZaplaceni: "2.2.2026",  castka:   499, stav: "Zaplaceno", poznamka: "AI" },
  { id: 12, mesic: "Leden", dodavatel: "Apple",                 typ: "Software",  datumZaplaceni: "2.2.2026",  castka:   670, stav: "Zaplaceno", poznamka: "Meta Verified — modrý štítek" },
  { id: 13, mesic: "Leden", dodavatel: "Apple",                 typ: "Software",  datumZaplaceni: "2.2.2026",  castka:   249, stav: "Zaplaceno", poznamka: "iCloud — úložiště" },
  { id: 14, mesic: "Leden", dodavatel: "Adobe",                 typ: "Software",  datumZaplaceni: "2.2.2026",  castka:   608, stav: "Zaplaceno", poznamka: "PS+LR edit fotek" },
  { id: 15, mesic: "Leden", dodavatel: "Freepik",               typ: "Software",  datumZaplaceni: "2.2.2026",  castka:   488, stav: "Zaplaceno", poznamka: "Šablony" },
  { id: 16, mesic: "Leden", dodavatel: "Higgsfield",            typ: "Software",  datumZaplaceni: "2.2.2026",  castka:   550, stav: "Zaplaceno", poznamka: "AI" },
  { id: 17, mesic: "Leden", dodavatel: "Artlist.io",            typ: "Software",  datumZaplaceni: "2.2.2026",  castka:   484, stav: "Zaplaceno", poznamka: "Hudba" },
  { id: 18, mesic: "Leden", dodavatel: "Google",                typ: "Software",  datumZaplaceni: "2.2.2026",  castka:   250, stav: "Zaplaceno", poznamka: "Úložiště" },
  { id: 19, mesic: "Leden", dodavatel: "Direct",                typ: "Pojištění", datumZaplaceni: "2.2.2026",  castka:   395, stav: "Zaplaceno", poznamka: "Pojištění" },
  // ── Únor — reálná data ze Sheets ───────────────────────────────────────────
  { id: 20, mesic: "Únor",  dodavatel: "Adam Mendrek",          typ: "Mzdy",      datumZaplaceni: "2.3.2026",  castka: 16500, stav: "Zaplaceno", poznamka: "DPP" },
  { id: 21, mesic: "Únor",  dodavatel: "Jan Kříž",              typ: "Mzdy",      datumZaplaceni: "2.3.2026",  castka: 16500, stav: "Zaplaceno", poznamka: "DPP" },
  { id: 22, mesic: "Únor",  dodavatel: "Tereza Burianová",      typ: "Mzdy",      datumZaplaceni: "2.3.2026",  castka:  8500, stav: "Zaplaceno", poznamka: "DPP" },
  { id: 23, mesic: "Únor",  dodavatel: "Dominika Mendrek",      typ: "Mzdy",      datumZaplaceni: "2.3.2026",  castka:  3000, stav: "Zaplaceno", poznamka: "DPP" },
  { id: 24, mesic: "Únor",  dodavatel: "Tomáš Dang",            typ: "Mzdy",      datumZaplaceni: "2.3.2026",  castka:  3500, stav: "Zaplaceno", poznamka: "DPP" },
  { id: 25, mesic: "Únor",  dodavatel: "Zdeněk Dolíhal",        typ: "Provize",   datumZaplaceni: "6.3.2026",  castka: 20000, stav: "Zaplaceno", poznamka: "Faktura" },
  { id: 26, mesic: "Únor",  dodavatel: "Martin Fiala",          typ: "Provize",   datumZaplaceni: "2.3.2026",  castka:  3000, stav: "Zaplaceno", poznamka: "Faktura" },
  { id: 27, mesic: "Únor",  dodavatel: "Matty Hořák",           typ: "Provize",   datumZaplaceni: "2.3.2026",  castka:  3000, stav: "Zaplaceno", poznamka: "Faktura" },
  { id: 28, mesic: "Únor",  dodavatel: "Patrik Petr",           typ: "Provize",   datumZaplaceni: "2.3.2026",  castka:  4150, stav: "Zaplaceno", poznamka: "Faktura" },
  { id: 29, mesic: "Únor",  dodavatel: "Monika Kudličková",     typ: "Provize",   datumZaplaceni: "5.3.2026",  castka: 13500, stav: "Zaplaceno", poznamka: "Faktura" },
  { id: 30, mesic: "Únor",  dodavatel: "Martin Fiala",          typ: "Provize",   datumZaplaceni: "2.3.2026",  castka:  2500, stav: "Zaplaceno", poznamka: "Uznávací provize — SENIMED" },
  { id: 31, mesic: "Únor",  dodavatel: "ChatGPT",               typ: "Software",  datumZaplaceni: "1.3.2026",  castka:   499, stav: "Zaplaceno", poznamka: "AI" },
  { id: 32, mesic: "Únor",  dodavatel: "Apple",                 typ: "Software",  datumZaplaceni: "1.3.2026",  castka:   670, stav: "Zaplaceno", poznamka: "Meta Verified" },
  { id: 33, mesic: "Únor",  dodavatel: "Apple",                 typ: "Software",  datumZaplaceni: "1.3.2026",  castka:   249, stav: "Zaplaceno", poznamka: "iCloud" },
  { id: 34, mesic: "Únor",  dodavatel: "Adobe",                 typ: "Software",  datumZaplaceni: "1.3.2026",  castka:   608, stav: "Zaplaceno", poznamka: "PS+LR edit fotek" },
  { id: 35, mesic: "Únor",  dodavatel: "Freepik",               typ: "Software",  datumZaplaceni: "1.3.2026",  castka:   488, stav: "Zaplaceno", poznamka: "Šablony" },
  { id: 36, mesic: "Únor",  dodavatel: "Higgsfield",            typ: "Software",  datumZaplaceni: "1.3.2026",  castka:   550, stav: "Zaplaceno", poznamka: "AI" },
  { id: 37, mesic: "Únor",  dodavatel: "Artlist.io",            typ: "Software",  datumZaplaceni: "1.3.2026",  castka:   484, stav: "Zaplaceno", poznamka: "Hudba" },
  { id: 38, mesic: "Únor",  dodavatel: "Google",                typ: "Software",  datumZaplaceni: "1.3.2026",  castka:   250, stav: "Zaplaceno", poznamka: "Úložiště" },
  { id: 39, mesic: "Únor",  dodavatel: "Direct",                typ: "Pojištění", datumZaplaceni: "1.3.2026",  castka:   395, stav: "Zaplaceno", poznamka: "Pojištění" },
  // ── Březen — reálná data ze Sheets ────────────────────────────────────────
  { id: 40, mesic: "Březen", dodavatel: "Adam Mendrek",         typ: "Mzdy",      datumZaplaceni: "1.4.2026",  castka: 16500, stav: "Zaplaceno", poznamka: "DPP" },
  { id: 41, mesic: "Březen", dodavatel: "Jan Kříž",             typ: "Mzdy",      datumZaplaceni: "1.4.2026",  castka: 16500, stav: "Zaplaceno", poznamka: "DPP" },
  { id: 42, mesic: "Březen", dodavatel: "Tereza Burianová",     typ: "Mzdy",      datumZaplaceni: "1.4.2026",  castka:  8500, stav: "Zaplaceno", poznamka: "DPP" },
  { id: 43, mesic: "Březen", dodavatel: "Dominika Mendrek",     typ: "Mzdy",      datumZaplaceni: "1.4.2026",  castka:  3000, stav: "Zaplaceno", poznamka: "DPP" },
  { id: 44, mesic: "Březen", dodavatel: "Tomáš Dang",           typ: "Mzdy",      datumZaplaceni: "1.4.2026",  castka:  5000, stav: "Zaplaceno", poznamka: "DPP" },
  { id: 45, mesic: "Březen", dodavatel: "Zdeněk Dolíhal",       typ: "Provize",   datumZaplaceni: "2.4.2026",  castka: 21500, stav: "Zaplaceno", poznamka: "Faktura" },
  { id: 46, mesic: "Březen", dodavatel: "Martin Fiala",         typ: "Provize",   datumZaplaceni: "1.4.2026",  castka:  3000, stav: "Zaplaceno", poznamka: "Faktura" },
  { id: 47, mesic: "Březen", dodavatel: "Matty Hořák",          typ: "Provize",   datumZaplaceni: "1.4.2026",  castka:  3000, stav: "Zaplaceno", poznamka: "Faktura" },
  { id: 48, mesic: "Březen", dodavatel: "David Mačala",         typ: "Provize",   datumZaplaceni: "1.4.2026",  castka:  3500, stav: "Zaplaceno", poznamka: "Faktura" },
  { id: 49, mesic: "Březen", dodavatel: "Patrik Petr",          typ: "Provize",   datumZaplaceni: "1.4.2026",  castka:  3750, stav: "Zaplaceno", poznamka: "Faktura" },
  { id: 50, mesic: "Březen", dodavatel: "Monika Kudličková",    typ: "Provize",   datumZaplaceni: "7.4.2026",  castka:  6000, stav: "Zaplaceno", poznamka: "Faktura" },
  { id: 51, mesic: "Březen", dodavatel: "Michael Weiser",       typ: "Provize",   datumZaplaceni: "2.4.2026",  castka: 28700, stav: "Zaplaceno", poznamka: "Faktura" },
  { id: 52, mesic: "Březen", dodavatel: "Apple",                typ: "Software",  datumZaplaceni: "1.4.2026",  castka:   670, stav: "Zaplaceno", poznamka: "Meta Verified" },
  { id: 53, mesic: "Březen", dodavatel: "Apple",                typ: "Software",  datumZaplaceni: "1.4.2026",  castka:   249, stav: "Zaplaceno", poznamka: "iCloud" },
  { id: 54, mesic: "Březen", dodavatel: "Adobe",                typ: "Software",  datumZaplaceni: "1.4.2026",  castka:   608, stav: "Zaplaceno", poznamka: "PS+LR edit fotek" },
  { id: 55, mesic: "Březen", dodavatel: "Freepik",              typ: "Software",  datumZaplaceni: "1.4.2026",  castka:   488, stav: "Zaplaceno", poznamka: "Šablony" },
  { id: 56, mesic: "Březen", dodavatel: "Higgsfield",           typ: "Software",  datumZaplaceni: "1.4.2026",  castka:   550, stav: "Zaplaceno", poznamka: "AI" },
  { id: 57, mesic: "Březen", dodavatel: "Artlist.io",           typ: "Software",  datumZaplaceni: "1.4.2026",  castka:   484, stav: "Zaplaceno", poznamka: "Hudba" },
  { id: 58, mesic: "Březen", dodavatel: "Google",               typ: "Software",  datumZaplaceni: "1.4.2026",  castka:   250, stav: "Zaplaceno", poznamka: "Úložiště" },
  { id: 59, mesic: "Březen", dodavatel: "Direct",               typ: "Pojištění", datumZaplaceni: "1.4.2026",  castka:   395, stav: "Zaplaceno", poznamka: "Pojištění" },
  // ── Duben — reálná data ze Sheets (PROBÍHÁ) ───────────────────────────────
  { id: 60, mesic: "Duben",  dodavatel: "Adam Mendrek",         typ: "Mzdy",      datumZaplaceni: "4.5.2026",  castka: 16500, stav: "Zaplaceno", poznamka: "DPP" },
  { id: 61, mesic: "Duben",  dodavatel: "Jan Kříž",             typ: "Mzdy",      datumZaplaceni: "4.5.2026",  castka: 16500, stav: "Zaplaceno", poznamka: "DPP" },
  { id: 62, mesic: "Duben",  dodavatel: "Tereza Burianová",     typ: "Mzdy",      datumZaplaceni: "4.5.2026",  castka:  7500, stav: "Zaplaceno", poznamka: "DPP" },
  { id: 63, mesic: "Duben",  dodavatel: "Dominika Mendrek",     typ: "Mzdy",      datumZaplaceni: "4.5.2026",  castka:  3000, stav: "Zaplaceno", poznamka: "DPP" },
  { id: 64, mesic: "Duben",  dodavatel: "Tomáš Dang",           typ: "Mzdy",      datumZaplaceni: "4.5.2026",  castka:  4500, stav: "Zaplaceno", poznamka: "DPP" },
  { id: 65, mesic: "Duben",  dodavatel: "Zdeněk Dolíhal",       typ: "Provize",   datumZaplaceni: "7.5.2026",  castka: 20000, stav: "Zaplaceno", poznamka: "Faktura" },
  { id: 66, mesic: "Duben",  dodavatel: "Martin Fiala",         typ: "Provize",   datumZaplaceni: "4.5.2026",  castka:  3500, stav: "Zaplaceno", poznamka: "Faktura" },
  { id: 67, mesic: "Duben",  dodavatel: "Matty Hořák",          typ: "Provize",   datumZaplaceni: "7.5.2026",  castka:  9500, stav: "Zaplaceno", poznamka: "Faktura" },
  { id: 68, mesic: "Duben",  dodavatel: "David Mačala",         typ: "Provize",   datumZaplaceni: "13.5.2026", castka:  3500, stav: "Zaplaceno", poznamka: "Faktura" },
  { id: 69, mesic: "Duben",  dodavatel: "Patrik Petr",          typ: "Provize",   datumZaplaceni: "5.5.2026",  castka:  7300, stav: "Zaplaceno", poznamka: "Faktura" },
  { id: 70, mesic: "Duben",  dodavatel: "Monika Kudličková",    typ: "Provize",   datumZaplaceni: "10.5.2026", castka:  7500, stav: "Zaplaceno", poznamka: "Faktura" },
  { id: 71, mesic: "Duben",  dodavatel: "Apple",                typ: "Software",  datumZaplaceni: "1.5.2026",  castka:   670, stav: "Zaplaceno", poznamka: "Meta Verified" },
  { id: 72, mesic: "Duben",  dodavatel: "Apple",                typ: "Software",  datumZaplaceni: "1.5.2026",  castka:   249, stav: "Zaplaceno", poznamka: "iCloud" },
  { id: 73, mesic: "Duben",  dodavatel: "Adobe",                typ: "Software",  datumZaplaceni: "1.5.2026",  castka:   608, stav: "Zaplaceno", poznamka: "PS+LR edit fotek" },
  { id: 74, mesic: "Duben",  dodavatel: "Artlist.io",           typ: "Software",  datumZaplaceni: "1.5.2026",  castka:   484, stav: "Zaplaceno", poznamka: "Hudba" },
  { id: 75, mesic: "Duben",  dodavatel: "Google",               typ: "Software",  datumZaplaceni: "1.5.2026",  castka:   250, stav: "Zaplaceno", poznamka: "Úložiště" },
  { id: 76, mesic: "Duben",  dodavatel: "Direct",               typ: "Pojištění", datumZaplaceni: "1.5.2026",  castka:   395, stav: "Zaplaceno", poznamka: "Pojištění" },
];

/* ── Faktury seed ───────────────────────────────────────────────────────────── */
const FAKTURY_SEED: Faktura[] = [
  // ── Leden ──
  { id:  1, cislo:"FV-2026-001", klient:"SENIMED s.r.o.",        popis:"Social media management — Leden",   castka:30250, castkaBezvat:25000, dph:21, datum:"31. 1. 2026", splatnost:"13. 2. 2026", stav:"Zaplacena",      soubor:"FV-2026-001.pdf" },
  { id:  2, cislo:"FV-2026-002", klient:"STAVOS Brno, a.s.",     popis:"Foto/video dokumentace — Leden",    castka:36300, castkaBezvat:30000, dph:21, datum:"31. 1. 2026", splatnost:"12. 2. 2026", stav:"Zaplacena",      soubor:"" },
  { id:  3, cislo:"FV-2026-003", klient:"FIRESTA-Fišer a.s.",    popis:"Social media management — Leden",   castka:34485, castkaBezvat:28500, dph:21, datum:"31. 1. 2026", splatnost:"5. 3. 2026",  stav:"Zaplacena",      soubor:"FV-2026-003.pdf" },
  { id:  4, cislo:"FV-2026-004", klient:"IMTOS spol. s r.o.",    popis:"Social media management — Leden",   castka:30250, castkaBezvat:25000, dph:21, datum:"31. 1. 2026", splatnost:"11. 2. 2026", stav:"Zaplacena",      soubor:"" },
  { id:  5, cislo:"FV-2026-005", klient:"Power Plate Česko",     popis:"Social media content — Leden",      castka:14520, castkaBezvat:12000, dph:21, datum:"31. 1. 2026", splatnost:"11. 2. 2026", stav:"Zaplacena",      soubor:"FV-2026-005.pdf" },
  { id:  6, cislo:"FV-2026-006", klient:"ACsport.cz",            popis:"Social media management — Leden",   castka:18150, castkaBezvat:15000, dph:21, datum:"31. 1. 2026", splatnost:"9. 2. 2026",  stav:"Zaplacena",      soubor:"" },
  { id:  7, cislo:"FV-2026-007", klient:"SK Brno Slatina",       popis:"Social media content — Leden",      castka:14520, castkaBezvat:12000, dph:21, datum:"31. 1. 2026", splatnost:"16. 2. 2026", stav:"Zaplacena",      soubor:"" },
  { id:  8, cislo:"FV-2026-008", klient:"DIAM s.r.o.",           popis:"Social media management — Leden",   castka:36300, castkaBezvat:30000, dph:21, datum:"31. 1. 2026", splatnost:"11. 2. 2026", stav:"Zaplacena",      soubor:"FV-2026-008.pdf" },
  { id:  9, cislo:"FV-2026-009", klient:"MTB CZ s.r.o.",         popis:"Social media management — Leden",   castka:36300, castkaBezvat:30000, dph:21, datum:"31. 1. 2026", splatnost:"18. 2. 2026", stav:"Zaplacena",      soubor:"" },
  { id: 10, cislo:"FV-2026-010", klient:"CKTCH Brno",            popis:"Výroční video — dokumentace",       castka:24200, castkaBezvat:20000, dph:21, datum:"19. 1. 2026", splatnost:"2. 2. 2026",  stav:"Zaplacena",      soubor:"FV-2026-010.pdf" },
  { id: 11, cislo:"FV-2026-011", klient:"Brno Open Game Business",popis:"Event coverage — Brno Open Game", castka:47190, castkaBezvat:39000, dph:21, datum:"15. 1. 2026", splatnost:"28. 2. 2026", stav:"Zaplacena",      soubor:"" },
  // ── Únor — měsíční klienti ──
  { id: 12, cislo:"FV-2026-012", klient:"SENIMED s.r.o.",        popis:"Social media management — Únor",    castka:30250, castkaBezvat:25000, dph:21, datum:"28. 2. 2026", splatnost:"12. 3. 2026", stav:"Zaplacena",      soubor:"FV-2026-012.pdf" },
  { id: 13, cislo:"FV-2026-013", klient:"STAVOS Brno, a.s.",     popis:"Foto/video dokumentace — Únor",     castka:36300, castkaBezvat:30000, dph:21, datum:"28. 2. 2026", splatnost:"11. 3. 2026", stav:"Zaplacena",      soubor:"" },
  // ── Březen ──
  { id: 14, cislo:"FV-2026-014", klient:"SENIMED s.r.o.",        popis:"Social media management — Březen",  castka:30250, castkaBezvat:25000, dph:21, datum:"31. 3. 2026", splatnost:"13. 4. 2026", stav:"Zaplacena",      soubor:"FV-2026-014.pdf" },
  { id: 15, cislo:"FV-2026-015", klient:"FIRESTA-Fišer a.s.",    popis:"Social media management — Březen",  castka:34485, castkaBezvat:28500, dph:21, datum:"31. 3. 2026", splatnost:"5. 4. 2026",  stav:"Zaplacena",      soubor:"" },
  { id: 16, cislo:"FV-2026-016", klient:"SK Brno Slatina",       popis:"FINAL FOUR live coverage",          castka:21780, castkaBezvat:18000, dph:21, datum:"16. 5. 2026", splatnost:"30. 5. 2026", stav:"Čeká na platbu", soubor:"" },
  { id: 17, cislo:"FV-2026-017", klient:"IMTOS spol. s r.o.",    popis:"Social media management — Květen",  castka:30250, castkaBezvat:25000, dph:21, datum:"9. 5. 2026",  splatnost:"31. 5. 2026", stav:"Čeká na platbu", soubor:"" },
];

/* ── Doklady seed ───────────────────────────────────────────────────────────── */
const DOKLADY_SEED: Doklad[] = [
  // ── Leden — reálné doklady ──
  { id:  1, typ:"Faktura přijatá", dodavatel:"Adobe",            popis:"PS+LR edit fotek — Leden",          castka:   608, datum:"2. 2. 2026",  kategorie:"Software",  stav:"Zpracováno",         soubor:"adobe-jan.pdf" },
  { id:  2, typ:"Faktura přijatá", dodavatel:"ChatGPT",          popis:"AI — Leden",                        castka:   499, datum:"2. 2. 2026",  kategorie:"Software",  stav:"Zpracováno",         soubor:"" },
  { id:  3, typ:"Faktura přijatá", dodavatel:"Higgsfield",       popis:"AI video — Leden",                  castka:   550, datum:"2. 2. 2026",  kategorie:"Software",  stav:"Zpracováno",         soubor:"" },
  { id:  4, typ:"Faktura přijatá", dodavatel:"Artlist.io",       popis:"Hudba — Leden",                     castka:   484, datum:"2. 2. 2026",  kategorie:"Software",  stav:"Zpracováno",         soubor:"artlist-jan.pdf" },
  { id:  5, typ:"Faktura přijatá", dodavatel:"Freepik",          popis:"Šablony — Leden",                   castka:   488, datum:"2. 2. 2026",  kategorie:"Software",  stav:"Zpracováno",         soubor:"" },
  { id:  6, typ:"Faktura přijatá", dodavatel:"Apple",            popis:"iCloud úložiště — Leden",           castka:   249, datum:"2. 2. 2026",  kategorie:"Software",  stav:"Zpracováno",         soubor:"" },
  { id:  7, typ:"Faktura přijatá", dodavatel:"Apple",            popis:"Meta Verified — modrý štítek",      castka:   670, datum:"2. 2. 2026",  kategorie:"Software",  stav:"Zpracováno",         soubor:"" },
  { id:  8, typ:"Faktura přijatá", dodavatel:"Google",           popis:"Úložiště — Leden",                  castka:   250, datum:"2. 2. 2026",  kategorie:"Software",  stav:"Zpracováno",         soubor:"" },
  { id:  9, typ:"Faktura přijatá", dodavatel:"Direct",           popis:"Pojištění — Leden",                 castka:   395, datum:"2. 2. 2026",  kategorie:"Pojištění", stav:"Zpracováno",         soubor:"direct-jan.pdf" },
  { id: 10, typ:"Pokladní doklad", dodavatel:"Zdeněk Dolíhal",   popis:"Faktura — Leden",                   castka: 20000, datum:"3. 2. 2026",  kategorie:"Mzdy",      stav:"Zpracováno",         soubor:"zd-jan.pdf" },
  { id: 11, typ:"Pokladní doklad", dodavatel:"Matty Hořák",      popis:"Faktura — Leden",                   castka: 12000, datum:"2. 2. 2026",  kategorie:"Mzdy",      stav:"Zpracováno",         soubor:"" },
  { id: 12, typ:"Pokladní doklad", dodavatel:"Martin Fiala",     popis:"Faktura — Leden",                   castka:  3000, datum:"2. 2. 2026",  kategorie:"Mzdy",      stav:"Zpracováno",         soubor:"" },
  { id: 13, typ:"Pokladní doklad", dodavatel:"Patrik Petr",      popis:"Faktura — Leden",                   castka:  3000, datum:"2. 2. 2026",  kategorie:"Mzdy",      stav:"Zpracováno",         soubor:"" },
  { id: 14, typ:"Pokladní doklad", dodavatel:"Adam Mendrek",     popis:"DPP — Leden",                       castka: 16900, datum:"2. 2. 2026",  kategorie:"Mzdy",      stav:"Zpracováno",         soubor:"dpp-am-jan.pdf" },
  { id: 15, typ:"Pokladní doklad", dodavatel:"Jan Kříž",         popis:"DPP — Leden",                       castka: 16900, datum:"2. 2. 2026",  kategorie:"Mzdy",      stav:"Zpracováno",         soubor:"dpp-jk-jan.pdf" },
  { id: 16, typ:"Pokladní doklad", dodavatel:"Tereza Burianová", popis:"DPP — Leden",                       castka:  5500, datum:"2. 2. 2026",  kategorie:"Mzdy",      stav:"Zpracováno",         soubor:"" },
  { id: 17, typ:"Pokladní doklad", dodavatel:"Dominika Mendrek", popis:"DPP — Leden",                       castka:  3000, datum:"2. 2. 2026",  kategorie:"Mzdy",      stav:"Zpracováno",         soubor:"" },
  { id: 18, typ:"Pokladní doklad", dodavatel:"Tomáš Dang",       popis:"DPP — Leden",                       castka:  2500, datum:"2. 2. 2026",  kategorie:"Mzdy",      stav:"Zpracováno",         soubor:"" },
  { id: 19, typ:"Pokladní doklad", dodavatel:"Jiří Juhaňák",     popis:"Provize — Brno Open Game Business", castka:  3900, datum:"31. 1. 2026", kategorie:"Jiné",      stav:"Zpracováno",         soubor:"" },
  // ── Únor ──
  { id: 20, typ:"Faktura přijatá", dodavatel:"Adobe",            popis:"PS+LR edit fotek — Únor",           castka:   608, datum:"1. 3. 2026",  kategorie:"Software",  stav:"Zpracováno",         soubor:"adobe-feb.pdf" },
  { id: 21, typ:"Pokladní doklad", dodavatel:"Zdeněk Dolíhal",   popis:"Faktura — Únor",                    castka: 20000, datum:"3. 3. 2026",  kategorie:"Mzdy",      stav:"Zpracováno",         soubor:"zd-feb.pdf" },
  { id: 22, typ:"Faktura přijatá", dodavatel:"Direct",           popis:"Pojištění — Únor",                  castka:   395, datum:"1. 3. 2026",  kategorie:"Pojištění", stav:"Zpracováno",         soubor:"direct-feb.pdf" },
  // ── Březen ──
  { id: 23, typ:"Faktura přijatá", dodavatel:"Adobe",            popis:"PS+LR edit fotek — Březen",         castka:   608, datum:"1. 4. 2026",  kategorie:"Software",  stav:"Zpracováno",         soubor:"adobe-mar.pdf" },
  { id: 24, typ:"Pokladní doklad", dodavatel:"Zdeněk Dolíhal",   popis:"Faktura — Březen",                  castka: 20000, datum:"3. 4. 2026",  kategorie:"Mzdy",      stav:"Zpracováno",         soubor:"zd-mar.pdf" },
  { id: 25, typ:"Faktura přijatá", dodavatel:"Direct",           popis:"Pojištění — Březen",                castka:   395, datum:"1. 4. 2026",  kategorie:"Pojištění", stav:"Zpracováno",         soubor:"direct-mar.pdf" },
];

/* ── Helpers ────────────────────────────────────────────────────────────────── */
function fKc(n: number): string {
  if (!n) return "—";
  return n.toLocaleString("cs-CZ") + " Kč";
}
function fKcShort(n: number): string {
  if (!n) return "—";
  if (n >= 1000) return (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + "k Kč";
  return n.toLocaleString("cs-CZ") + " Kč";
}

/* ── Style helpers ──────────────────────────────────────────────────────────── */
function monthStatusStyle(s: MonthStatus) {
  if (s === "UZAVŘENO")   return { color: "oklch(0.67 0.155 155)", bg: "oklch(0.67 0.155 155 / 0.08)", border: "oklch(0.67 0.155 155 / 0.2)" };
  if (s === "PROBÍHÁ")    return { color: "oklch(0.62 0.27 265)", bg: "oklch(0.62 0.27 265 / 0.08)", border: "oklch(0.62 0.27 265 / 0.2)" };
  return                         { color: "oklch(0.35 0.005 222)", bg: "oklch(1 0 0 / 0.03)",          border: "oklch(1 0 0 / 0.07)" };
}
function itemStatusStyle(s: ItemStatus) {
  if (s === "Zaplaceno") return { color: "oklch(0.67 0.155 155)", icon: <CheckCircle2 className="w-3 h-3" /> };
  if (s === "Čeká")      return { color: "oklch(0.78 0.165 75)",  icon: <Clock className="w-3 h-3" /> };
  return                        { color: "oklch(0.65 0.22 25)",   icon: <AlertCircle className="w-3 h-3" /> };
}
function incomeTypeStyle(t: string) {
  if (t === "Měsíční klient") return { color: "oklch(0.62 0.27 265)", bg: "oklch(0.62 0.27 265 / 0.1)", border: "oklch(0.62 0.27 265 / 0.2)" };
  if (t === "Jednorázový")    return { color: "oklch(0.72 0.18 290)",  bg: "oklch(0.64 0.21 290 / 0.1)",  border: "oklch(0.64 0.21 290 / 0.2)" };
  return                             { color: "oklch(0.55 0.005 222)", bg: "oklch(1 0 0 / 0.05)",          border: "oklch(1 0 0 / 0.1)" };
}
function expenseTypeStyle(t: string) {
  if (t === "Mzdy")      return { color: "oklch(0.72 0.18 290)",  bg: "oklch(0.64 0.21 290 / 0.08)", border: "oklch(0.64 0.21 290 / 0.18)" };
  if (t === "Provize")   return { color: "oklch(0.78 0.165 75)",  bg: "oklch(0.74 0.165 75 / 0.08)", border: "oklch(0.74 0.165 75 / 0.18)" };
  if (t === "Software")  return { color: "oklch(0.62 0.27 265)", bg: "oklch(0.62 0.27 265 / 0.08)",border: "oklch(0.62 0.27 265 / 0.18)" };
  if (t === "Marketing") return { color: "oklch(0.72 0.18 340)",  bg: "oklch(0.72 0.18 340 / 0.08)", border: "oklch(0.72 0.18 340 / 0.18)" };
  return                        { color: "oklch(0.55 0.005 222)", bg: "oklch(1 0 0 / 0.05)",          border: "oklch(1 0 0 / 0.1)" };
}

/* ── Shared UI ──────────────────────────────────────────────────────────────── */
function Badge({ label, color, bg, border }: { label: string; color: string; bg: string; border: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-[5px] text-[11px] font-semibold whitespace-nowrap"
      style={{ color, background: bg, border: `1px solid ${border}` }}>
      {label}
    </span>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-semibold text-[--muted-foreground] uppercase tracking-[0.08em]">{label}</label>
      {children}
    </div>
  );
}
const iCls = "w-full px-3 py-2 rounded-[7px] text-[13px] text-[--foreground] outline-none transition-all";
const iSty = { background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.09)", fontFamily: "var(--font-jakarta)" };
function FInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)}
      className={iCls} style={iSty}
      onFocus={e => (e.target.style.borderColor = "oklch(0.62 0.27 265 / 0.5)")}
      onBlur={e  => (e.target.style.borderColor = "oklch(1 0 0 / 0.09)")} />
  );
}
function FSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)}
        className={`${iCls} appearance-none pr-8 cursor-pointer`} style={{ ...iSty, color: "var(--foreground)" }}>
        {options.map(o => <option key={o} value={o} style={{ background: "oklch(0.12 0.008 222)" }}>{o}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[--muted-foreground]" />
    </div>
  );
}

/* ── Month header row ───────────────────────────────────────────────────────── */
function MonthHeader({ mesic, total, count, color }: { mesic: string; total: number; count: number; color: string }) {
  return (
    <div className="flex items-center gap-2.5 pt-4 pb-1.5 px-1">
      <span className="text-[11px] font-bold uppercase tracking-[0.1em]"
        style={{ fontFamily: "var(--font-outfit)", color }}>
        {mesic}
      </span>
      <span className="flex-1 h-px" style={{ background: `${color}33` }} />
      <span className="text-[10px] text-[--muted-foreground]">
        {count} {count === 1 ? "položka" : count < 5 ? "položky" : "položek"} · {fKc(total)}
      </span>
    </div>
  );
}

/* ── Stat card ──────────────────────────────────────────────────────────────── */
function StatCard({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div className="card px-5 py-4">
      <p className="text-[10px] text-[--muted-foreground] font-medium uppercase tracking-[0.06em] mb-2 leading-tight">{label}</p>
      <p className="num leading-none" style={{ fontSize: "clamp(22px,3.5vw,30px)", fontWeight: 700, fontFamily: "var(--font-outfit)", color, letterSpacing: "-0.02em" }}>{value}</p>
      {sub && <p className="text-[11px] text-[--muted-foreground] mt-1.5">{sub}</p>}
    </div>
  );
}

/* ── Chart tooltip ──────────────────────────────────────────────────────────── */
function ChartTip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; color: string; value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card px-3.5 py-2.5 text-[12px] shadow-xl" style={{ minWidth: 160 }}>
      <p className="text-[--muted-foreground] mb-2 font-medium">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
            <span className="text-[--muted-foreground]">{p.name}</span>
          </span>
          <span className="num text-[--foreground] font-semibold">{fKcShort(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

/* ── PŘEHLED tab ────────────────────────────────────────────────────────────── */
const SCHVALITEL = ["—", "Adam", "Honza", "Dominika"] as const;
const MONTH_STATUSES: MonthStatus[] = ["UZAVŘENO", "PROBÍHÁ", "NEPROBĚHLO"];

function PrehledTab({
  summaries,
  setSummaries,
}: {
  summaries: MonthSummary[];
  setSummaries: (fn: (prev: MonthSummary[]) => MonthSummary[]) => void;
}) {
  function updateRow(mesic: string, patch: Partial<MonthSummary>) {
    setSummaries(prev => prev.map(s => s.mesic === mesic ? { ...s, ...patch } : s));
  }
  const chartData = summaries.filter(s => s.prijemCelkovy > 0).map(s => ({
    m: s.mesic.slice(0, 3),
    "Příjmy":  s.prijemCelkovy / 1000,
    "Výdaje":  s.vydaje / 1000,
    "Čistý":   s.prijemCisty / 1000,
  }));

  const totalPrijem  = summaries.reduce((s, m) => s + m.prijemCelkovy, 0);
  const totalVydaje  = summaries.reduce((s, m) => s + m.vydaje, 0);
  const totalCisty   = summaries.reduce((s, m) => s + m.prijemCisty, 0);
  const closed       = summaries.filter(s => s.stav === "UZAVŘENO").length;

  return (
    <div className="space-y-4">
      {/* YTD stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Příjmy YTD"   value={fKcShort(totalPrijem)} color="oklch(0.67 0.155 155)" sub={`${closed} uzavřených měsíců`} />
        <StatCard label="Výdaje YTD"   value={fKcShort(totalVydaje)} color="oklch(0.65 0.22 25)"   sub="Celkové náklady" />
        <StatCard label="Čistý zisk YTD" value={fKcShort(totalCisty)} color="oklch(0.62 0.27 265)" sub={`Marže ${totalPrijem > 0 ? Math.round((totalCisty/totalPrijem)*100) : 0}%`} />
        <StatCard label="Uzavřených měsíců" value={`${closed} / 12`} color="var(--foreground)" sub="2026" />
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[14px] font-bold text-[--foreground]" style={{ fontFamily: "var(--font-outfit)", letterSpacing: "-0.02em" }}>Vývoj financí 2026</p>
              <p className="text-[11px] text-[--muted-foreground] mt-0.5">tis. Kč · měsíčně</p>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-[--muted-foreground]">
              {[["Příjmy","oklch(0.67 0.155 155)"],["Výdaje","oklch(0.65 0.22 25)"],["Čistý","oklch(0.62 0.27 265)"]].map(([n, c]) => (
                <span key={n} className="flex items-center gap-1.5">
                  <span className="w-3 h-[2px] rounded" style={{ background: c }} />{n}
                </span>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                {[["gP","oklch(0.67 0.155 155)"],["gV","oklch(0.65 0.22 25)"],["gC","oklch(0.62 0.27 265)"]].map(([id, c]) => (
                  <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={c} stopOpacity={0.18} />
                    <stop offset="100%" stopColor={c} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="m" tick={{ fill: "oklch(0.40 0.005 222)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "oklch(0.40 0.005 222)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}k`} />
              <Tooltip content={<ChartTip />} cursor={{ stroke: "oklch(1 0 0 / 0.06)", strokeWidth: 1 }} />
              <Area type="monotone" dataKey="Příjmy" stroke="oklch(0.67 0.155 155)" strokeWidth={2} fill="url(#gP)" dot={false} />
              <Area type="monotone" dataKey="Výdaje" stroke="oklch(0.65 0.22 25)"   strokeWidth={2} fill="url(#gV)" dot={false} />
              <Area type="monotone" dataKey="Čistý"  stroke="oklch(0.62 0.27 265)" strokeWidth={2} fill="url(#gC)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Monthly summary table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3.5 border-b flex items-center gap-2" style={{ borderColor: "oklch(1 0 0 / 0.07)" }}>
          <BarChart3 className="w-3.5 h-3.5" style={{ color: "oklch(0.62 0.27 265)" }} />
          <p className="text-[13px] font-semibold text-[--foreground]" style={{ fontFamily: "var(--font-outfit)" }}>Měsíční přehled 2026</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid oklch(1 0 0 / 0.07)" }}>
                {["Měsíc", "Příjem celkový", "Výdaje", "Čistý příjem", "Marže", "Stav", "Schváleno"].map(h => (
                  <th key={h} className={`px-4 py-3 text-left text-[10px] font-semibold text-[--muted-foreground] uppercase tracking-[0.07em] ${["Marže","Schváleno"].includes(h) ? "hidden md:table-cell" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {summaries.map(s => {
                const ss = monthStatusStyle(s.stav);
                const marze = s.prijemCelkovy > 0 ? Math.round((s.prijemCisty / s.prijemCelkovy) * 100) : 0;
                return (
                  <tr key={s.mesic} className="border-b transition-colors hover:bg-white/[0.015]" style={{ borderColor: "oklch(1 0 0 / 0.05)" }}>
                    <td className="px-4 py-3 text-[13px] font-semibold text-[--foreground]" style={{ fontFamily: "var(--font-outfit)" }}>{s.mesic}</td>
                    <td className="px-4 py-3 num text-[13px] font-semibold" style={{ color: s.prijemCelkovy ? "oklch(0.67 0.155 155)" : "oklch(0.30 0.005 222)", fontFamily: "var(--font-outfit)" }}>{fKc(s.prijemCelkovy)}</td>
                    <td className="px-4 py-3 num text-[13px]" style={{ color: s.vydaje ? "oklch(0.65 0.22 25)" : "oklch(0.30 0.005 222)", fontFamily: "var(--font-outfit)" }}>{fKc(s.vydaje)}</td>
                    <td className="px-4 py-3 num text-[13px] font-bold" style={{ color: s.prijemCisty ? "oklch(0.62 0.27 265)" : "oklch(0.30 0.005 222)", fontFamily: "var(--font-outfit)" }}>{fKc(s.prijemCisty)}</td>
                    <td className="px-4 py-3 num text-[12px] hidden md:table-cell" style={{ color: marze ? "var(--foreground)" : "oklch(0.30 0.005 222)" }}>{marze ? `${marze}%` : "—"}</td>
                    {/* Stav — inline select s viditelnou šipkou */}
                    <td className="px-4 py-2.5">
                      <div className="relative inline-flex items-center group">
                        <select
                          value={s.stav}
                          onChange={e => updateRow(s.mesic, { stav: e.target.value as MonthStatus })}
                          className="appearance-none pl-2.5 pr-7 py-1 rounded-[6px] text-[10px] font-bold tracking-[0.05em] outline-none cursor-pointer"
                          style={{
                            color: ss.color,
                            background: ss.bg,
                            border: `1px solid ${ss.border}`,
                            fontFamily: "var(--font-jakarta)",
                            boxShadow: "inset 0 0 0 0 transparent",
                          }}
                        >
                          {MONTH_STATUSES.map(v => (
                            <option key={v} value={v} style={{ background: "#111", color: "#eee" }}>{v}</option>
                          ))}
                        </select>
                        {/* Chevron — always visible, uses same color as badge */}
                        <svg
                          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 opacity-70"
                          viewBox="0 0 10 6" fill="none"
                          style={{ color: ss.color }}
                        >
                          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </td>
                    {/* Schváleno — inline select */}
                    <td className="px-4 py-2.5 hidden md:table-cell">
                      <div className="relative inline-flex items-center">
                        <select
                          value={s.schvaleno.replace(" ✅", "") || "—"}
                          onChange={e => {
                            const val = e.target.value;
                            updateRow(s.mesic, { schvaleno: val === "—" ? "" : val + (s.stav === "UZAVŘENO" ? " ✅" : "") });
                          }}
                          className="appearance-none pl-2.5 pr-7 py-1 rounded-[6px] text-[11px] font-semibold outline-none cursor-pointer"
                          style={{
                            color: s.schvaleno ? "oklch(0.72 0.155 155)" : "oklch(0.45 0.005 222)",
                            border: `1px solid ${s.schvaleno ? "oklch(0.67 0.155 155 / 0.25)" : "oklch(1 0 0 / 0.12)"}`,
                            background: s.schvaleno ? "oklch(0.67 0.155 155 / 0.09)" : "oklch(1 0 0 / 0.04)",
                            fontFamily: "var(--font-jakarta)",
                          }}
                        >
                          {SCHVALITEL.map(v => (
                            <option key={v} value={v} style={{ background: "#111", color: "#eee" }}>{v}</option>
                          ))}
                        </select>
                        <svg
                          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 opacity-60"
                          viewBox="0 0 10 6" fill="none"
                          style={{ color: s.schvaleno ? "oklch(0.67 0.155 155)" : "oklch(0.45 0.005 222)" }}
                        >
                          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── PŘÍJMY tab ─────────────────────────────────────────────────────────────── */
const EMPTY_INCOME: Omit<IncomeItem, "id"> = { mesic: "Leden", klient: "", typ: "Měsíční klient", datumZaplaceni: "", castka: 0, stav: "Zaplaceno" };

function PrijmyTab({ items, setItems }: { items: IncomeItem[]; setItems: (fn: (p: IncomeItem[]) => IncomeItem[]) => void }) {
  const [modal, setModal]   = useState<IncomeItem | null | "new">(null);
  const [mesicF, setMesicF] = useState("Vše");

  const filtered = useMemo(() => {
    const base = mesicF === "Vše" ? items : items.filter(i => i.mesic === mesicF);
    return [...base].sort((a, b) => MONTHS_CZ.indexOf(b.mesic) - MONTHS_CZ.indexOf(a.mesic));
  }, [items, mesicF]);

  const grouped = useMemo(() => {
    const g: { mesic: string; items: IncomeItem[] }[] = [];
    const seen: Record<string, number> = {};
    filtered.forEach(it => {
      if (seen[it.mesic] === undefined) { seen[it.mesic] = g.length; g.push({ mesic: it.mesic, items: [] }); }
      g[seen[it.mesic]].items.push(it);
    });
    return g;
  }, [filtered]);

  const total      = items.reduce((s, i) => s + i.castka, 0);
  const monthly    = items.filter(i => i.typ === "Měsíční klient").reduce((s, i) => s + i.castka, 0);
  const oneoff     = items.filter(i => i.typ === "Jednorázový").reduce((s, i) => s + i.castka, 0);
  const pending    = items.filter(i => i.stav === "Čeká").reduce((s, i) => s + i.castka, 0);

  function save(data: Omit<IncomeItem,"id"> & { id?: number }) {
    if (data.id !== undefined) setItems(p => p.map(i => i.id === data.id ? { ...data, id: data.id! } : i));
    else setItems(p => [...p, { ...data, id: Date.now() }]);
    setModal(null);
  }

  const months = ["Vše", ...MONTHS_CZ];

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Celkem příjmy"    value={fKcShort(total)}   color="oklch(0.67 0.155 155)" />
        <StatCard label="Měsíční klienti"  value={fKcShort(monthly)} color="oklch(0.62 0.27 265)" />
        <StatCard label="Jednorázové"      value={fKcShort(oneoff)}  color="oklch(0.72 0.18 290)" />
        <StatCard label="Čeká na platbu"   value={fKcShort(pending)} color="oklch(0.78 0.165 75)" />
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-1 flex-wrap flex-1">
          {months.map(m => (
            <motion.button key={m} onClick={() => setMesicF(m)} whileTap={{ scale: 0.95 }}
              className="px-3 py-1.5 rounded-[6px] text-[11px] font-semibold btn-tactile whitespace-nowrap"
              style={mesicF === m
                ? { background: "oklch(0.67 0.155 155 / 0.1)", color: "oklch(0.67 0.155 155)", border: "1px solid oklch(0.67 0.155 155 / 0.25)" }
                : { background: "transparent", color: "oklch(0.40 0.005 222)", border: "1px solid oklch(1 0 0 / 0.06)" }}>
              {m}
            </motion.button>
          ))}
        </div>
        <motion.button onClick={() => setModal("new")} whileTap={{ scale: 0.96 }}
          className="btn-tactile flex items-center gap-2 px-3.5 py-2 rounded-[8px] text-[13px] font-semibold shrink-0"
          style={{ background: "oklch(0.67 0.155 155)", color: "oklch(0.09 0.008 222)", fontFamily: "var(--font-outfit)" }}>
          <Plus className="w-3.5 h-3.5" /> Přidat příjem
        </motion.button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid oklch(1 0 0 / 0.07)" }}>
                {["Klient", "Typ", "Datum", "Částka", "Stav", ""].map((h, i) => (
                  <th key={i} className={`px-4 py-3 text-left text-[10px] font-semibold text-[--muted-foreground] uppercase tracking-[0.07em] ${h === "Datum" ? "hidden lg:table-cell" : h === "" ? "w-8" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grouped.map(group => (
                <>
                  <tr key={`gh-${group.mesic}`}>
                    <td colSpan={6} className="px-4">
                      <MonthHeader mesic={group.mesic} total={group.items.reduce((s,i) => s+i.castka,0)} count={group.items.length} color="oklch(0.67 0.155 155)" />
                    </td>
                  </tr>
                  {group.items.map(item => {
                    const is = itemStatusStyle(item.stav);
                    const ts = incomeTypeStyle(item.typ);
                    return (
                      <tr key={item.id} className="group border-b hover:bg-white/[0.015] transition-colors" style={{ borderColor: "oklch(1 0 0 / 0.05)" }}>
                        <td className="px-4 py-3 text-[13px] font-semibold text-[--foreground]" style={{ fontFamily: "var(--font-outfit)", letterSpacing: "-0.01em" }}>{item.klient}</td>
                        <td className="px-4 py-3"><Badge label={item.typ} {...ts} /></td>
                        <td className="px-4 py-3 text-[12px] text-[--muted-foreground] hidden lg:table-cell">{item.datumZaplaceni || "—"}</td>
                        <td className="px-4 py-3 num text-[13px] font-bold text-right" style={{ color: "oklch(0.67 0.155 155)", fontFamily: "var(--font-outfit)" }}>{fKc(item.castka)}</td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: is.color }}>{is.icon}{item.stav}</span>
                        </td>
                        <td className="pr-4 pl-2 py-3">
                          <motion.button onClick={() => setModal(item)} whileTap={{ scale: 0.9 }}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded-[5px] btn-tactile transition-opacity"
                            style={{ color: "oklch(0.45 0.005 222)" }}>
                            <Edit2 className="w-3.5 h-3.5" />
                          </motion.button>
                        </td>
                      </tr>
                    );
                  })}
                </>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="py-12 text-center text-[13px] text-[--muted-foreground]">Žádné příjmy.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {modal !== null && (
          <IncomeModal item={modal === "new" ? null : modal} onClose={() => setModal(null)} onSave={save} />
        )}
      </AnimatePresence>
    </div>
  );
}

function IncomeModal({ item, onClose, onSave }: { item: IncomeItem | null; onClose: () => void; onSave: (d: Omit<IncomeItem,"id"> & { id?: number }) => void }) {
  const [f, setF] = useState<Omit<IncomeItem,"id">>(item ? { ...item } : { ...EMPTY_INCOME });
  const set = (k: keyof typeof f) => (v: string) => setF(p => ({ ...p, [k]: k === "castka" ? Number(v.replace(/\D/g,"")) || 0 : v }));
  return (
    <ModalWrap title={item ? "Upravit příjem" : "Přidat příjem"} onClose={onClose}
      onSave={() => onSave({ ...f, ...(item ? { id: item.id } : {}) })}>
      <Field label="Měsíc"><FSelect value={f.mesic} onChange={set("mesic")} options={MONTHS_CZ} /></Field>
      <Field label="Klient"><FInput value={f.klient} onChange={set("klient")} placeholder="Název klienta" /></Field>
      <Field label="Typ výnosu"><FSelect value={f.typ} onChange={set("typ")} options={["Měsíční klient","Jednorázový","Ostatní"]} /></Field>
      <Field label="Datum zaplacení"><FInput value={f.datumZaplaceni} onChange={set("datumZaplaceni")} placeholder="15.6.2026" /></Field>
      <Field label="Částka (Kč)"><FInput value={f.castka ? String(f.castka) : ""} onChange={set("castka")} placeholder="25000" /></Field>
      <Field label="Stav"><FSelect value={f.stav} onChange={set("stav")} options={["Zaplaceno","Čeká","Storno"]} /></Field>
    </ModalWrap>
  );
}

/* ── VÝDAJE tab ─────────────────────────────────────────────────────────────── */
const EMPTY_EXPENSE: Omit<ExpenseItem, "id"> = { mesic: "Leden", dodavatel: "", typ: "Software", datumZaplaceni: "", castka: 0, stav: "Zaplaceno", poznamka: "" };

function VydajeTab({ items, setItems }: { items: ExpenseItem[]; setItems: (fn: (p: ExpenseItem[]) => ExpenseItem[]) => void }) {
  const [modal, setModal]   = useState<ExpenseItem | null | "new">(null);
  const [mesicF, setMesicF] = useState("Vše");

  const filtered = useMemo(() => {
    const base = mesicF === "Vše" ? items : items.filter(i => i.mesic === mesicF);
    return [...base].sort((a, b) => MONTHS_CZ.indexOf(b.mesic) - MONTHS_CZ.indexOf(a.mesic));
  }, [items, mesicF]);

  const grouped = useMemo(() => {
    const g: { mesic: string; items: ExpenseItem[] }[] = [];
    const seen: Record<string, number> = {};
    filtered.forEach(it => {
      if (seen[it.mesic] === undefined) { seen[it.mesic] = g.length; g.push({ mesic: it.mesic, items: [] }); }
      g[seen[it.mesic]].items.push(it);
    });
    return g;
  }, [filtered]);

  const total   = items.reduce((s, i) => s + i.castka, 0);
  const mzdy    = items.filter(i => i.typ === "Mzdy").reduce((s, i) => s + i.castka, 0);
  const soft    = items.filter(i => i.typ === "Software").reduce((s, i) => s + i.castka, 0);
  const provize = items.filter(i => i.typ === "Provize").reduce((s, i) => s + i.castka, 0);

  function save(data: Omit<ExpenseItem,"id"> & { id?: number }) {
    if (data.id !== undefined) setItems(p => p.map(i => i.id === data.id ? { ...data, id: data.id! } : i));
    else setItems(p => [...p, { ...data, id: Date.now() }]);
    setModal(null);
  }

  const months = ["Vše", ...MONTHS_CZ];

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Celkem výdaje" value={fKcShort(total)}   color="oklch(0.65 0.22 25)" />
        <StatCard label="Mzdy"          value={fKcShort(mzdy)}    color="oklch(0.72 0.18 290)" />
        <StatCard label="Software"      value={fKcShort(soft)}    color="oklch(0.62 0.27 265)" />
        <StatCard label="Provize"       value={fKcShort(provize)} color="oklch(0.78 0.165 75)" />
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-1 flex-wrap flex-1">
          {months.map(m => (
            <motion.button key={m} onClick={() => setMesicF(m)} whileTap={{ scale: 0.95 }}
              className="px-3 py-1.5 rounded-[6px] text-[11px] font-semibold btn-tactile whitespace-nowrap"
              style={mesicF === m
                ? { background: "oklch(0.65 0.22 25 / 0.1)", color: "oklch(0.65 0.22 25)", border: "1px solid oklch(0.65 0.22 25 / 0.25)" }
                : { background: "transparent", color: "oklch(0.40 0.005 222)", border: "1px solid oklch(1 0 0 / 0.06)" }}>
              {m}
            </motion.button>
          ))}
        </div>
        <motion.button onClick={() => setModal("new")} whileTap={{ scale: 0.96 }}
          className="btn-tactile flex items-center gap-2 px-3.5 py-2 rounded-[8px] text-[13px] font-semibold shrink-0"
          style={{ background: "oklch(0.65 0.22 25)", color: "oklch(0.98 0.005 222)", fontFamily: "var(--font-outfit)" }}>
          <Plus className="w-3.5 h-3.5" /> Přidat výdaj
        </motion.button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid oklch(1 0 0 / 0.07)" }}>
                {["Dodavatel", "Typ", "Poznámka", "Datum", "Částka", "Stav", ""].map((h, i) => (
                  <th key={i} className={`px-4 py-3 text-left text-[10px] font-semibold text-[--muted-foreground] uppercase tracking-[0.07em] ${["Poznámka","Datum"].includes(h) ? "hidden lg:table-cell" : h === "" ? "w-8" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grouped.map(group => (
                <>
                  <tr key={`gh-${group.mesic}`}>
                    <td colSpan={7} className="px-4">
                      <MonthHeader mesic={group.mesic} total={group.items.reduce((s,i) => s+i.castka,0)} count={group.items.length} color="oklch(0.65 0.22 25)" />
                    </td>
                  </tr>
                  {group.items.map(item => {
                    const is = itemStatusStyle(item.stav);
                    const ts = expenseTypeStyle(item.typ);
                    return (
                      <tr key={item.id} className="group border-b hover:bg-white/[0.015] transition-colors" style={{ borderColor: "oklch(1 0 0 / 0.05)" }}>
                        <td className="px-4 py-3 text-[13px] font-semibold text-[--foreground]" style={{ fontFamily: "var(--font-outfit)", letterSpacing: "-0.01em" }}>{item.dodavatel}</td>
                        <td className="px-4 py-3"><Badge label={item.typ} {...ts} /></td>
                        <td className="px-4 py-3 text-[12px] text-[--muted-foreground] hidden lg:table-cell max-w-[200px] truncate">{item.poznamka || "—"}</td>
                        <td className="px-4 py-3 text-[12px] text-[--muted-foreground] hidden lg:table-cell">{item.datumZaplaceni || "—"}</td>
                        <td className="px-4 py-3 num text-[13px] font-bold text-right" style={{ color: "oklch(0.65 0.22 25)", fontFamily: "var(--font-outfit)" }}>{fKc(item.castka)}</td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: is.color }}>{is.icon}{item.stav}</span>
                        </td>
                        <td className="pr-4 pl-2 py-3">
                          <motion.button onClick={() => setModal(item)} whileTap={{ scale: 0.9 }}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded-[5px] btn-tactile transition-opacity"
                            style={{ color: "oklch(0.45 0.005 222)" }}>
                            <Edit2 className="w-3.5 h-3.5" />
                          </motion.button>
                        </td>
                      </tr>
                    );
                  })}
                </>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="py-12 text-center text-[13px] text-[--muted-foreground]">Žádné výdaje.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {modal !== null && (
          <ExpenseModal item={modal === "new" ? null : modal} onClose={() => setModal(null)} onSave={save} />
        )}
      </AnimatePresence>
    </div>
  );
}

function ExpenseModal({ item, onClose, onSave }: { item: ExpenseItem | null; onClose: () => void; onSave: (d: Omit<ExpenseItem,"id"> & { id?: number }) => void }) {
  const [f, setF] = useState<Omit<ExpenseItem,"id">>(item ? { ...item } : { ...EMPTY_EXPENSE });
  const set = (k: keyof typeof f) => (v: string) => setF(p => ({ ...p, [k]: k === "castka" ? Number(v.replace(/\D/g,"")) || 0 : v }));
  return (
    <ModalWrap title={item ? "Upravit výdaj" : "Přidat výdaj"} onClose={onClose}
      onSave={() => onSave({ ...f, ...(item ? { id: item.id } : {}) })}>
      <Field label="Měsíc"><FSelect value={f.mesic} onChange={set("mesic")} options={MONTHS_CZ} /></Field>
      <Field label="Dodavatel"><FInput value={f.dodavatel} onChange={set("dodavatel")} placeholder="Adobe, Google..." /></Field>
      <Field label="Typ nákladu"><FSelect value={f.typ} onChange={set("typ")} options={["Software","Provize","Pojištění","Mzdy","Marketing","Nájem","Ostatní"]} /></Field>
      <Field label="Datum zaplacení"><FInput value={f.datumZaplaceni} onChange={set("datumZaplaceni")} placeholder="15.6.2026" /></Field>
      <Field label="Částka (Kč)"><FInput value={f.castka ? String(f.castka) : ""} onChange={set("castka")} placeholder="5000" /></Field>
      <Field label="Stav"><FSelect value={f.stav} onChange={set("stav")} options={["Zaplaceno","Čeká","Storno"]} /></Field>
      <Field label="Poznámka (volitelné)">
        <FInput value={f.poznamka ?? ""} onChange={set("poznamka")} placeholder="Upřesnění..." />
      </Field>
    </ModalWrap>
  );
}

/* ── BILANCE tab ────────────────────────────────────────────────────────────── */
function BilanceTab({ incomes, expenses }: { incomes: IncomeItem[]; expenses: ExpenseItem[] }) {
  const byMonth = MONTHS_CZ.map(m => {
    const inc = incomes.filter(i => i.mesic === m).reduce((s, i) => s + i.castka, 0);
    const exp = expenses.filter(i => i.mesic === m).reduce((s, i) => s + i.castka, 0);
    return { m: m.slice(0, 3), mesic: m, inc, exp, net: inc - exp, hasData: inc > 0 || exp > 0 };
  }).filter(d => d.hasData);

  const totalNet  = byMonth.reduce((s, d) => s + d.net, 0);
  const totalInc  = byMonth.reduce((s, d) => s + d.inc, 0);
  const totalExp  = byMonth.reduce((s, d) => s + d.exp, 0);
  const avgMarze  = totalInc > 0 ? Math.round((totalNet / totalInc) * 100) : 0;
  const bestMonth = byMonth.length ? byMonth.reduce((a, b) => a.net > b.net ? a : b) : null;

  // Expense breakdown by type
  const byType = ["Mzdy","Software","Provize","Pojištění","Marketing","Nájem","Ostatní"].map(t => ({
    t, val: expenses.filter(e => e.typ === t).reduce((s, e) => s + e.castka, 0),
  })).filter(x => x.val > 0).sort((a, b) => b.val - a.val);

  const TYPE_COLORS: Record<string, string> = {
    Mzdy: "oklch(0.72 0.18 290)", Software: "oklch(0.62 0.27 265)", Provize: "oklch(0.78 0.165 75)",
    Pojištění: "oklch(0.67 0.155 155)", Marketing: "oklch(0.72 0.18 340)", Nájem: "oklch(0.65 0.22 25)", Ostatní: "oklch(0.45 0.005 222)",
  };

  return (
    <div className="space-y-4">
      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Čistý zisk celkem"  value={fKcShort(totalNet)} color="oklch(0.62 0.27 265)" sub={`${avgMarze}% marže`} />
        <StatCard label="Celkem příjmy"      value={fKcShort(totalInc)} color="oklch(0.67 0.155 155)" />
        <StatCard label="Celkem výdaje"      value={fKcShort(totalExp)} color="oklch(0.65 0.22 25)" />
        <StatCard label="Nejlepší měsíc"     value={bestMonth ? fKcShort(bestMonth.net) : "—"} color="oklch(0.74 0.165 75)" sub={bestMonth?.mesic} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4">
        {/* Net income bar chart */}
        <div className="card p-5">
          <p className="text-[14px] font-bold text-[--foreground] mb-0.5" style={{ fontFamily: "var(--font-outfit)", letterSpacing: "-0.02em" }}>Čistý příjem po měsících</p>
          <p className="text-[11px] text-[--muted-foreground] mb-4">Příjmy − Výdaje · tis. Kč</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byMonth.map(d => ({ ...d, inc: d.inc/1000, exp: d.exp/1000, net: d.net/1000 }))} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barCategoryGap="30%">
              <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="m" tick={{ fill: "oklch(0.40 0.005 222)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "oklch(0.40 0.005 222)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}k`} />
              <Tooltip content={<ChartTip />} cursor={{ fill: "oklch(1 0 0 / 0.03)" }} />
              <Bar dataKey="inc" name="Příjmy" radius={[3,3,0,0]}>
                {byMonth.map((_, i) => <Cell key={i} fill="oklch(0.67 0.155 155 / 0.6)" />)}
              </Bar>
              <Bar dataKey="exp" name="Výdaje" radius={[3,3,0,0]}>
                {byMonth.map((_, i) => <Cell key={i} fill="oklch(0.65 0.22 25 / 0.6)" />)}
              </Bar>
              <Bar dataKey="net" name="Čistý" radius={[3,3,0,0]}>
                {byMonth.map((_, i) => <Cell key={i} fill="oklch(0.62 0.27 265)" />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Expense breakdown donut-style */}
        <div className="card p-5 min-w-[220px]">
          <p className="text-[13px] font-bold text-[--foreground] mb-0.5" style={{ fontFamily: "var(--font-outfit)", letterSpacing: "-0.02em" }}>Struktura výdajů</p>
          <p className="text-[11px] text-[--muted-foreground] mb-4">Podle kategorie</p>
          <div className="space-y-3">
            {byType.map(({ t, val }) => {
              const pct = totalExp > 0 ? (val / totalExp) * 100 : 0;
              const c   = TYPE_COLORS[t] ?? "oklch(0.45 0.005 222)";
              return (
                <div key={t}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="flex items-center gap-2 text-[12px] text-[--foreground]">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c }} />{t}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[--muted-foreground]">{Math.round(pct)}%</span>
                      <span className="num text-[12px] font-semibold text-[--foreground]" style={{ fontFamily: "var(--font-outfit)", minWidth: 70, textAlign: "right" }}>{fKcShort(val)}</span>
                    </div>
                  </div>
                  <div className="h-[3px] rounded-full" style={{ background: "oklch(1 0 0 / 0.07)" }}>
                    <motion.div className="h-full rounded-full" style={{ background: c }}
                      initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Monthly net table */}
          <div className="mt-5 pt-4 border-t space-y-1.5" style={{ borderColor: "oklch(1 0 0 / 0.07)" }}>
            <p className="text-[10px] font-semibold text-[--muted-foreground] uppercase tracking-[0.07em] mb-2.5">Čistý příjem / měsíc</p>
            {byMonth.map(d => (
              <div key={d.mesic} className="flex items-center justify-between">
                <span className="text-[11px] text-[--muted-foreground]">{d.mesic}</span>
                <span className="num text-[12px] font-bold" style={{ color: d.net >= 0 ? "oklch(0.62 0.27 265)" : "oklch(0.65 0.22 25)", fontFamily: "var(--font-outfit)" }}>
                  {fKcShort(d.net)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Shared modal wrapper ───────────────────────────────────────────────────── */
function ModalWrap({ title, onClose, onSave, children }: {
  title: string; onClose: () => void; onSave: () => void; children: React.ReactNode;
}) {
  return (
    <motion.div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ background: "oklch(0 0 0 / 0.6)", backdropFilter: "blur(4px)" }}
      onClick={onClose}>
      <motion.div className="relative w-full md:max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-[16px] md:rounded-[14px]"
        style={{ background: "oklch(0.11 0.008 222)", border: "1px solid oklch(1 0 0 / 0.09)" }}
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "oklch(1 0 0 / 0.08)" }}>
          <h2 className="text-[15px] font-bold text-[--foreground]" style={{ fontFamily: "var(--font-outfit)", letterSpacing: "-0.02em" }}>{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-[6px] btn-tactile text-[--muted-foreground] hover:text-[--foreground] transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
        <div className="flex items-center justify-end gap-2.5 px-5 py-4 border-t" style={{ borderColor: "oklch(1 0 0 / 0.08)" }}>
          <button onClick={onClose} className="px-4 py-2 rounded-[7px] text-[13px] font-medium text-[--muted-foreground] btn-tactile"
            style={{ background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.08)" }}>Zrušit</button>
          <motion.button onClick={onSave} whileHover={{ filter: "brightness(1.08)" }} whileTap={{ scale: 0.96 }}
            className="px-4 py-2 rounded-[7px] text-[13px] font-semibold btn-tactile"
            style={{ background: "oklch(0.62 0.27 265)", color: "oklch(0.97 0.004 265)", fontFamily: "var(--font-outfit)" }}>
            Uložit
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Faktura stav badge ─────────────────────────────────────────────────────── */
function FakturaStavBadge({ stav }: { stav: FakturaStav }) {
  const map: Record<FakturaStav, { color: string; bg: string; border: string }> = {
    "Zaplacena":      { color:"oklch(0.67 0.155 155)", bg:"oklch(0.67 0.155 155 / 0.1)",  border:"oklch(0.67 0.155 155 / 0.2)" },
    "Čeká na platbu": { color:"oklch(0.78 0.165 75)",  bg:"oklch(0.74 0.165 75 / 0.1)",   border:"oklch(0.74 0.165 75 / 0.2)"  },
    "Po splatnosti":  { color:"oklch(0.65 0.22 25)",   bg:"oklch(0.65 0.22 25 / 0.1)",    border:"oklch(0.65 0.22 25 / 0.2)"   },
    "Storno":         { color:"oklch(0.40 0.005 222)", bg:"oklch(1 0 0 / 0.05)",           border:"oklch(1 0 0 / 0.08)"          },
  };
  const s = map[stav];
  return (
    <span className="px-2 py-0.5 rounded-[5px] text-[10px] font-bold whitespace-nowrap"
      style={{ color:s.color, background:s.bg, border:`1px solid ${s.border}` }}>
      {stav}
    </span>
  );
}

/* ── Doklad stav badge ──────────────────────────────────────────────────────── */
function DokladStavBadge({ stav }: { stav: DokladStav }) {
  const ok = stav === "Zpracováno";
  return (
    <span className="px-2 py-0.5 rounded-[5px] text-[10px] font-bold whitespace-nowrap"
      style={{
        color:   ok ? "oklch(0.67 0.155 155)"      : "oklch(0.78 0.165 75)",
        background: ok ? "oklch(0.67 0.155 155 / 0.1)" : "oklch(0.74 0.165 75 / 0.1)",
        border: `1px solid ${ok ? "oklch(0.67 0.155 155 / 0.2)" : "oklch(0.74 0.165 75 / 0.2)"}`,
      }}>
      {stav}
    </span>
  );
}

/* ── File chip ──────────────────────────────────────────────────────────────── */
function FileChip({ soubor }: { soubor: string }) {
  if (!soubor) return <span className="text-[--muted-foreground] opacity-30"><Paperclip className="w-3.5 h-3.5"/></span>;
  return (
    <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-[5px]"
      style={{ color:"oklch(0.62 0.27 265)", background:"oklch(0.62 0.27 265 / 0.08)", border:"1px solid oklch(0.62 0.27 265 / 0.18)" }}>
      <Paperclip className="w-3 h-3"/>{soubor}
    </span>
  );
}

/* ── FakturyTab ─────────────────────────────────────────────────────────────── */
const F_EMPTY: Omit<Faktura,"id"> = { cislo:"", klient:"", popis:"", castka:0, castkaBezvat:0, dph:21, datum:"", splatnost:"", stav:"Čeká na platbu", soubor:"" };

function FakturyTab({ items, setItems }: { items:Faktura[]; setItems:(fn:(p:Faktura[])=>Faktura[])=>void }) {
  const [modal,    setModal]    = useState<Faktura|null|"new">(null);
  const [stavF,    setStavF]    = useState("Vše");
  const [uploadSim, setUploadSim] = useState<Record<number,string>>({});

  const filtered = useMemo(()=>{
    const base = stavF==="Vše" ? items : items.filter(f=>f.stav===stavF);
    return [...base].sort((a,b)=>b.cislo.localeCompare(a.cislo));
  },[items,stavF]);

  const zaplaceno   = items.filter(f=>f.stav==="Zaplacena").reduce((s,f)=>s+f.castka,0);
  const ceka        = items.filter(f=>f.stav==="Čeká na platbu").reduce((s,f)=>s+f.castka,0);
  const poSplatnosti= items.filter(f=>f.stav==="Po splatnosti").reduce((s,f)=>s+f.castka,0);
  const celkem      = items.reduce((s,f)=>s+f.castka,0);

  function save(data: Omit<Faktura,"id">&{id?:number}) {
    if(data.id!==undefined) setItems(p=>p.map(f=>f.id===data.id?{...data,id:data.id!}:f));
    else setItems(p=>[...p,{...data,id:Date.now()}]);
    setModal(null);
  }

  const iCls = "w-full px-3 py-2 rounded-[7px] text-[13px] text-[--foreground] outline-none transition-all";
  const iSty = { background:"oklch(1 0 0 / 0.04)", border:"1px solid oklch(1 0 0 / 0.09)", fontFamily:"var(--font-jakarta)" };
  function FI({ value, onChange, placeholder }: { value:string; onChange:(v:string)=>void; placeholder?:string }) {
    return <input value={value} placeholder={placeholder} onChange={e=>onChange(e.target.value)} className={iCls} style={iSty}/>;
  }
  function FS({ value, onChange, options }: { value:string; onChange:(v:string)=>void; options:string[] }) {
    return (
      <div className="relative"><select value={value} onChange={e=>onChange(e.target.value)}
        className={`${iCls} appearance-none pr-8 cursor-pointer`} style={{...iSty,color:"var(--foreground)"}}>
        {options.map(o=><option key={o} value={o} style={{background:"oklch(0.12 0.008 222)"}}>{o}</option>)}
      </select></div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px rounded-[12px] overflow-hidden" style={{background:"oklch(1 0 0 / 0.06)"}}>
        {[
          { label:"Celkem YTD",       value:celkem,       color:"oklch(0.62 0.27 265)" },
          { label:"Zaplaceno",        value:zaplaceno,    color:"oklch(0.67 0.155 155)" },
          { label:"Čeká na platbu",   value:ceka,         color:"oklch(0.78 0.165 75)"  },
          { label:"Po splatnosti",    value:poSplatnosti, color:"oklch(0.65 0.22 25)"   },
        ].map(s=>(
          <div key={s.label} className="px-4 py-4" style={{background:"var(--card)"}}>
            <p className="text-[10px] text-[--muted-foreground] font-medium uppercase tracking-[0.06em] mb-1.5">{s.label}</p>
            <p className="num leading-none" style={{fontSize:"clamp(16px,2.5vw,24px)",fontWeight:700,fontFamily:"var(--font-outfit)",color:s.color,letterSpacing:"-0.02em"}}>
              {fKcShort(s.value)}
            </p>
          </div>
        ))}
      </div>

      {/* Filter + Add */}
      <div className="flex items-center gap-2 flex-wrap">
        {["Vše","Zaplacena","Čeká na platbu","Po splatnosti","Storno"].map(s=>(
          <motion.button key={s} onClick={()=>setStavF(s)} whileTap={{scale:0.95}}
            className="px-3 py-1.5 rounded-[6px] text-[11px] font-semibold btn-tactile"
            style={stavF===s
              ?{background:"oklch(0.62 0.27 265 / 0.1)",color:"oklch(0.62 0.27 265)",border:"1px solid oklch(0.62 0.27 265 / 0.25)"}
              :{background:"transparent",color:"oklch(0.40 0.005 222)",border:"1px solid oklch(1 0 0 / 0.06)"}}>
            {s}
          </motion.button>
        ))}
        <motion.button onClick={()=>setModal("new")} whileTap={{scale:0.96}}
          className="ml-auto btn-tactile flex items-center gap-2 px-3.5 py-2 rounded-[8px] text-[13px] font-semibold shrink-0"
          style={{background:"oklch(0.62 0.27 265)",color:"oklch(0.09 0.008 222)",fontFamily:"var(--font-outfit)"}}>
          <Plus className="w-3.5 h-3.5"/> Nová faktura
        </motion.button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{borderBottom:"1px solid oklch(1 0 0 / 0.07)"}}>
                {["Číslo","Klient","Popis","Datum","Splatnost","Částka","Stav","Soubor",""].map((h,i)=>(
                  <th key={i} className={`px-4 py-3 text-left text-[10px] font-semibold text-[--muted-foreground] uppercase tracking-[0.07em] ${h==="Soubor"||h==="Popis"?"hidden md:table-cell":h===""?"w-8":""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(f=>(
                <motion.tr key={f.id} className="group border-b hover:bg-white/[0.015] transition-colors" style={{borderColor:"oklch(1 0 0 / 0.05)"}}>
                  <td className="px-4 py-3 text-[12px] font-mono text-[--muted-foreground] whitespace-nowrap">{f.cislo}</td>
                  <td className="px-4 py-3 text-[13px] font-semibold text-[--foreground] max-w-[160px] truncate" style={{fontFamily:"var(--font-outfit)"}}>{f.klient}</td>
                  <td className="px-4 py-3 text-[12px] text-[--muted-foreground] hidden md:table-cell max-w-[200px] truncate">{f.popis}</td>
                  <td className="px-4 py-3 text-[12px] text-[--muted-foreground] whitespace-nowrap">{f.datum}</td>
                  <td className="px-4 py-3 text-[12px] whitespace-nowrap" style={{color: f.stav==="Po splatnosti"?"oklch(0.65 0.22 25)":"oklch(0.50 0.005 222)"}}>{f.splatnost}</td>
                  <td className="px-4 py-3 num text-[13px] font-bold whitespace-nowrap" style={{fontFamily:"var(--font-outfit)",color:"oklch(0.62 0.27 265)"}}>{fKc(f.castka)}</td>
                  <td className="px-4 py-3"><FakturaStavBadge stav={f.stav}/></td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {uploadSim[f.id]
                      ? <FileChip soubor={uploadSim[f.id]}/>
                      : <div>
                          <FileChip soubor={f.soubor}/>
                          {!f.soubor&&(
                            <label className="cursor-pointer ml-1 text-[10px] px-2 py-0.5 rounded-[5px] inline-flex items-center gap-1"
                              style={{color:"oklch(0.62 0.27 265)",background:"oklch(0.62 0.27 265 / 0.06)",border:"1px solid oklch(0.62 0.27 265 / 0.15)"}}>
                              <Plus className="w-2.5 h-2.5"/>
                              <input type="file" className="hidden" onChange={e=>{if(e.target.files?.[0])setUploadSim(p=>({...p,[f.id]:e.target.files![0].name}));}}/>
                              Nahrát
                            </label>
                          )}
                        </div>
                    }
                  </td>
                  <td className="pr-4 pl-2 py-3 w-8">
                    <motion.button onClick={()=>setModal(f)} whileTap={{scale:0.9}}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-[5px] btn-tactile transition-opacity" style={{color:"oklch(0.45 0.005 222)"}}>
                      <Edit2 className="w-3.5 h-3.5"/>
                    </motion.button>
                  </td>
                </motion.tr>
              ))}
              {filtered.length===0&&<tr><td colSpan={9} className="py-12 text-center text-[13px] text-[--muted-foreground]">Žádné faktury.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {modal!==null&&(
          <motion.div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
            initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            style={{background:"oklch(0 0 0 / 0.6)",backdropFilter:"blur(4px)"}} onClick={()=>setModal(null)}>
            <motion.div className="relative w-full md:max-w-xl max-h-[90vh] overflow-y-auto rounded-t-[16px] md:rounded-[14px]"
              style={{background:"oklch(0.11 0.008 222)",border:"1px solid oklch(1 0 0 / 0.09)"}}
              initial={{y:40,opacity:0}} animate={{y:0,opacity:1}} exit={{y:40,opacity:0}}
              transition={{duration:0.3,ease:[0.23,1,0.32,1]}} onClick={e=>e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{borderColor:"oklch(1 0 0 / 0.08)"}}>
                <h2 className="text-[15px] font-bold text-[--foreground]" style={{fontFamily:"var(--font-outfit)",letterSpacing:"-0.02em"}}>
                  {modal==="new"?"Nová faktura":"Upravit fakturu"}
                </h2>
                <button onClick={()=>setModal(null)} className="p-1.5 rounded-[6px] text-[--muted-foreground]"><X className="w-4 h-4"/></button>
              </div>
              {(() => {
                const init = modal==="new" ? {...F_EMPTY} : {...modal as Faktura};
                return <FakturaForm initial={init} onSave={save} isNew={modal==="new"}/>;
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FakturaForm({ initial, onSave, isNew }: { initial: Omit<Faktura,"id">&{id?:number}; onSave:(d:Omit<Faktura,"id">&{id?:number})=>void; isNew:boolean }) {
  const [f, setF] = useState(initial);
  const set = (k: keyof typeof f) => (v: string) => setF(p=>({...p,[k]: k==="castka"||k==="castkaBezvat"||k==="dph" ? Number(v)||0 : v}));
  const iCls = "w-full px-3 py-2 rounded-[7px] text-[13px] text-[--foreground] outline-none transition-all";
  const iSty = { background:"oklch(1 0 0 / 0.04)", border:"1px solid oklch(1 0 0 / 0.09)", fontFamily:"var(--font-jakarta)" };
  return (
    <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-1.5"><label className="block text-[10px] font-semibold text-[--muted-foreground] uppercase tracking-[0.08em]">Číslo faktury</label>
        <input value={f.cislo} onChange={e=>set("cislo")(e.target.value)} className={iCls} style={iSty} placeholder="FV-2026-016"/></div>
      <div className="space-y-1.5"><label className="block text-[10px] font-semibold text-[--muted-foreground] uppercase tracking-[0.08em]">Klient</label>
        <input value={f.klient} onChange={e=>set("klient")(e.target.value)} className={iCls} style={iSty} placeholder="Název klienta"/></div>
      <div className="md:col-span-2 space-y-1.5"><label className="block text-[10px] font-semibold text-[--muted-foreground] uppercase tracking-[0.08em]">Popis</label>
        <input value={f.popis} onChange={e=>set("popis")(e.target.value)} className={iCls} style={iSty} placeholder="Popis plnění"/></div>
      <div className="space-y-1.5"><label className="block text-[10px] font-semibold text-[--muted-foreground] uppercase tracking-[0.08em]">Datum vydání</label>
        <input value={f.datum} onChange={e=>set("datum")(e.target.value)} className={iCls} style={iSty} placeholder="31. 5. 2026"/></div>
      <div className="space-y-1.5"><label className="block text-[10px] font-semibold text-[--muted-foreground] uppercase tracking-[0.08em]">Splatnost</label>
        <input value={f.splatnost} onChange={e=>set("splatnost")(e.target.value)} className={iCls} style={iSty} placeholder="14. 6. 2026"/></div>
      <div className="space-y-1.5"><label className="block text-[10px] font-semibold text-[--muted-foreground] uppercase tracking-[0.08em]">Částka bez DPH (Kč)</label>
        <input value={f.castkaBezvat||""} onChange={e=>set("castkaBezvat")(e.target.value)} className={iCls} style={iSty} type="number" placeholder="25000"/></div>
      <div className="space-y-1.5"><label className="block text-[10px] font-semibold text-[--muted-foreground] uppercase tracking-[0.08em]">Částka s DPH (Kč)</label>
        <input value={f.castka||""} onChange={e=>set("castka")(e.target.value)} className={iCls} style={iSty} type="number" placeholder="30250"/></div>
      <div className="space-y-1.5"><label className="block text-[10px] font-semibold text-[--muted-foreground] uppercase tracking-[0.08em]">Stav</label>
        <div className="relative"><select value={f.stav} onChange={e=>set("stav")(e.target.value)} className={`${iCls} appearance-none pr-8 cursor-pointer`} style={{...iSty,color:"var(--foreground)"}}>
          {["Zaplacena","Čeká na platbu","Po splatnosti","Storno"].map(o=><option key={o} value={o} style={{background:"oklch(0.12 0.008 222)"}}>{o}</option>)}
        </select></div></div>
      <div className="space-y-1.5"><label className="block text-[10px] font-semibold text-[--muted-foreground] uppercase tracking-[0.08em]">Soubor</label>
        <input value={f.soubor} onChange={e=>set("soubor")(e.target.value)} className={iCls} style={iSty} placeholder="FV-2026-016.pdf"/></div>
      <div className="md:col-span-2 flex justify-end pt-2 border-t" style={{borderColor:"oklch(1 0 0 / 0.08)"}}>
        <motion.button onClick={()=>onSave(f)} whileTap={{scale:0.96}}
          className="px-4 py-2 rounded-[7px] text-[13px] font-semibold btn-tactile"
          style={{background:"oklch(0.62 0.27 265)",color:"oklch(0.09 0.008 222)",fontFamily:"var(--font-outfit)"}}>
          {isNew?"Vytvořit fakturu":"Uložit změny"}
        </motion.button>
      </div>
    </div>
  );
}

/* ── DokladyTab ─────────────────────────────────────────────────────────────── */
const D_EMPTY: Omit<Doklad,"id"> = { typ:"Faktura přijatá", dodavatel:"", popis:"", castka:0, datum:"", kategorie:"Software", stav:"Čeká na zpracování", soubor:"" };

function DokladyTab({ items, setItems }: { items:Doklad[]; setItems:(fn:(p:Doklad[])=>Doklad[])=>void }) {
  const [modal,  setModal]  = useState<Doklad|null|"new">(null);
  const [katF,   setKatF]   = useState("Vše");
  const [uploadSim, setUploadSim] = useState<Record<number,string>>({});

  const filtered = useMemo(()=>{
    const base = katF==="Vše" ? items : items.filter(d=>d.kategorie===katF);
    return [...base].sort((a,b)=>b.datum.localeCompare(a.datum));
  },[items,katF]);

  const celkem     = items.reduce((s,d)=>s+d.castka,0);
  const zpracovano = items.filter(d=>d.stav==="Zpracováno").reduce((s,d)=>s+d.castka,0);
  const ceka       = items.filter(d=>d.stav==="Čeká na zpracování").reduce((s,d)=>s+d.castka,0);

  const katColors: Record<string,string> = {
    Software:"oklch(0.62 0.27 265)", Mzdy:"oklch(0.67 0.155 155)", Pojištění:"oklch(0.65 0.22 25)",
    Provize:"oklch(0.78 0.165 75)", Marketing:"oklch(0.74 0.165 75)", Vybavení:"oklch(0.72 0.18 290)", Jiné:"oklch(0.50 0.005 222)",
  };

  function save(data: Omit<Doklad,"id">&{id?:number}) {
    if(data.id!==undefined) setItems(p=>p.map(d=>d.id===data.id?{...data,id:data.id!}:d));
    else setItems(p=>[...p,{...data,id:Date.now()}]);
    setModal(null);
  }

  const iCls = "w-full px-3 py-2 rounded-[7px] text-[13px] text-[--foreground] outline-none transition-all";
  const iSty = { background:"oklch(1 0 0 / 0.04)", border:"1px solid oklch(1 0 0 / 0.09)", fontFamily:"var(--font-jakarta)" };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-px rounded-[12px] overflow-hidden" style={{background:"oklch(1 0 0 / 0.06)"}}>
        {[
          { label:"Celkem výdajů",    value:celkem,     color:"oklch(0.65 0.22 25)"   },
          { label:"Zpracováno",       value:zpracovano, color:"oklch(0.67 0.155 155)" },
          { label:"Čeká na zprac.",   value:ceka,       color:"oklch(0.78 0.165 75)"  },
        ].map(s=>(
          <div key={s.label} className="px-4 py-4" style={{background:"var(--card)"}}>
            <p className="text-[10px] text-[--muted-foreground] font-medium uppercase tracking-[0.06em] mb-1.5">{s.label}</p>
            <p className="num leading-none" style={{fontSize:"clamp(16px,2.5vw,24px)",fontWeight:700,fontFamily:"var(--font-outfit)",color:s.color,letterSpacing:"-0.02em"}}>{fKcShort(s.value)}</p>
          </div>
        ))}
      </div>

      {/* Category filter + add */}
      <div className="flex items-center gap-2 flex-wrap">
        {["Vše","Software","Mzdy","Pojištění","Provize","Marketing","Vybavení","Jiné"].map(k=>(
          <motion.button key={k} onClick={()=>setKatF(k)} whileTap={{scale:0.95}}
            className="px-3 py-1.5 rounded-[6px] text-[11px] font-semibold btn-tactile"
            style={katF===k
              ?{background:`${(katColors[k]||"oklch(0.62 0.27 265)").replace(")","/0.12)")}`,color:katColors[k]||"oklch(0.62 0.27 265)",border:`1px solid ${(katColors[k]||"oklch(0.62 0.27 265)").replace(")","/0.25)")}`}
              :{background:"transparent",color:"oklch(0.40 0.005 222)",border:"1px solid oklch(1 0 0 / 0.06)"}}>
            {k}
          </motion.button>
        ))}
        <motion.button onClick={()=>setModal("new")} whileTap={{scale:0.96}}
          className="ml-auto btn-tactile flex items-center gap-2 px-3.5 py-2 rounded-[8px] text-[13px] font-semibold shrink-0"
          style={{background:"oklch(0.65 0.22 25)",color:"oklch(0.98 0 0)",fontFamily:"var(--font-outfit)"}}>
          <Plus className="w-3.5 h-3.5"/> Přidat doklad
        </motion.button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{borderBottom:"1px solid oklch(1 0 0 / 0.07)"}}>
                {["Typ","Dodavatel","Popis","Datum","Kategorie","Částka","Stav","Soubor",""].map((h,i)=>(
                  <th key={i} className={`px-4 py-3 text-left text-[10px] font-semibold text-[--muted-foreground] uppercase tracking-[0.07em] ${h==="Popis"||h==="Soubor"?"hidden md:table-cell":h===""?"w-8":""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(d=>{
                const c = katColors[d.kategorie] || "oklch(0.50 0.005 222)";
                return (
                  <motion.tr key={d.id} className="group border-b hover:bg-white/[0.015] transition-colors" style={{borderColor:"oklch(1 0 0 / 0.05)"}}>
                    <td className="px-4 py-3 text-[11px] text-[--muted-foreground] whitespace-nowrap">
                      <span className="flex items-center gap-1.5"><Receipt className="w-3 h-3 shrink-0"/>{d.typ}</span>
                    </td>
                    <td className="px-4 py-3 text-[13px] font-semibold text-[--foreground] max-w-[140px] truncate" style={{fontFamily:"var(--font-outfit)"}}>{d.dodavatel}</td>
                    <td className="px-4 py-3 text-[12px] text-[--muted-foreground] hidden md:table-cell max-w-[180px] truncate">{d.popis}</td>
                    <td className="px-4 py-3 text-[12px] text-[--muted-foreground] whitespace-nowrap">{d.datum}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-[5px] text-[10px] font-bold whitespace-nowrap"
                        style={{color:c,background:`${c.replace(")","/0.1)")}`,border:`1px solid ${c.replace(")","/0.2)")}`}}>
                        {d.kategorie}
                      </span>
                    </td>
                    <td className="px-4 py-3 num text-[13px] font-bold whitespace-nowrap" style={{fontFamily:"var(--font-outfit)",color:"oklch(0.65 0.22 25)"}}>{fKc(d.castka)}</td>
                    <td className="px-4 py-3"><DokladStavBadge stav={d.stav}/></td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {uploadSim[d.id]
                        ? <FileChip soubor={uploadSim[d.id]}/>
                        : <div>
                            <FileChip soubor={d.soubor}/>
                            {!d.soubor&&(
                              <label className="cursor-pointer ml-1 text-[10px] px-2 py-0.5 rounded-[5px] inline-flex items-center gap-1"
                                style={{color:"oklch(0.65 0.22 25)",background:"oklch(0.65 0.22 25 / 0.06)",border:"1px solid oklch(0.65 0.22 25 / 0.15)"}}>
                                <Plus className="w-2.5 h-2.5"/>
                                <input type="file" className="hidden" onChange={e=>{if(e.target.files?.[0])setUploadSim(p=>({...p,[d.id]:e.target.files![0].name}));}}/>
                                Nahrát
                              </label>
                            )}
                          </div>
                      }
                    </td>
                    <td className="pr-4 pl-2 py-3 w-8">
                      <motion.button onClick={()=>setModal(d)} whileTap={{scale:0.9}}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-[5px] btn-tactile transition-opacity" style={{color:"oklch(0.45 0.005 222)"}}>
                        <Edit2 className="w-3.5 h-3.5"/>
                      </motion.button>
                    </td>
                  </motion.tr>
                );
              })}
              {filtered.length===0&&<tr><td colSpan={9} className="py-12 text-center text-[13px] text-[--muted-foreground]">Žádné doklady.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {modal!==null&&(
          <motion.div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
            initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            style={{background:"oklch(0 0 0 / 0.6)",backdropFilter:"blur(4px)"}} onClick={()=>setModal(null)}>
            <motion.div className="relative w-full md:max-w-xl max-h-[90vh] overflow-y-auto rounded-t-[16px] md:rounded-[14px]"
              style={{background:"oklch(0.11 0.008 222)",border:"1px solid oklch(1 0 0 / 0.09)"}}
              initial={{y:40,opacity:0}} animate={{y:0,opacity:1}} exit={{y:40,opacity:0}}
              transition={{duration:0.3,ease:[0.23,1,0.32,1]}} onClick={e=>e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{borderColor:"oklch(1 0 0 / 0.08)"}}>
                <h2 className="text-[15px] font-bold" style={{fontFamily:"var(--font-outfit)",letterSpacing:"-0.02em",color:"var(--foreground)"}}>
                  {modal==="new"?"Přidat doklad":"Upravit doklad"}
                </h2>
                <button onClick={()=>setModal(null)} className="p-1.5 rounded-[6px] text-[--muted-foreground]"><X className="w-4 h-4"/></button>
              </div>
              {(() => {
                const init = modal==="new" ? {...D_EMPTY} : {...modal as Doklad};
                return (
                  <DokladForm initial={init} onSave={save} isNew={modal==="new"}/>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DokladForm({ initial, onSave, isNew }: { initial: Omit<Doklad,"id">&{id?:number}; onSave:(d:Omit<Doklad,"id">&{id?:number})=>void; isNew:boolean }) {
  const [f, setF] = useState(initial);
  const set = (k: keyof typeof f) => (v: string) => setF(p=>({...p,[k]: k==="castka"?Number(v)||0:v}));
  const iCls = "w-full px-3 py-2 rounded-[7px] text-[13px] text-[--foreground] outline-none transition-all";
  const iSty = { background:"oklch(1 0 0 / 0.04)", border:"1px solid oklch(1 0 0 / 0.09)", fontFamily:"var(--font-jakarta)" };
  return (
    <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-1.5"><label className="block text-[10px] font-semibold text-[--muted-foreground] uppercase tracking-[0.08em]">Typ dokladu</label>
        <div className="relative"><select value={f.typ} onChange={e=>set("typ")(e.target.value)} className={`${iCls} appearance-none pr-8 cursor-pointer`} style={{...iSty,color:"var(--foreground)"}}>
          {["Faktura přijatá","Pokladní doklad","Bankovní výpis","Smlouva","Jiné"].map(o=><option key={o} value={o} style={{background:"oklch(0.12 0.008 222)"}}>{o}</option>)}
        </select></div></div>
      <div className="space-y-1.5"><label className="block text-[10px] font-semibold text-[--muted-foreground] uppercase tracking-[0.08em]">Dodavatel</label>
        <input value={f.dodavatel} onChange={e=>set("dodavatel")(e.target.value)} className={iCls} style={iSty} placeholder="Název dodavatele"/></div>
      <div className="md:col-span-2 space-y-1.5"><label className="block text-[10px] font-semibold text-[--muted-foreground] uppercase tracking-[0.08em]">Popis</label>
        <input value={f.popis} onChange={e=>set("popis")(e.target.value)} className={iCls} style={iSty} placeholder="Popis výdaje"/></div>
      <div className="space-y-1.5"><label className="block text-[10px] font-semibold text-[--muted-foreground] uppercase tracking-[0.08em]">Datum</label>
        <input value={f.datum} onChange={e=>set("datum")(e.target.value)} className={iCls} style={iSty} placeholder="1. 5. 2026"/></div>
      <div className="space-y-1.5"><label className="block text-[10px] font-semibold text-[--muted-foreground] uppercase tracking-[0.08em]">Částka (Kč)</label>
        <input value={f.castka||""} onChange={e=>set("castka")(e.target.value)} className={iCls} style={iSty} type="number" placeholder="1573"/></div>
      <div className="space-y-1.5"><label className="block text-[10px] font-semibold text-[--muted-foreground] uppercase tracking-[0.08em]">Kategorie</label>
        <div className="relative"><select value={f.kategorie} onChange={e=>set("kategorie")(e.target.value)} className={`${iCls} appearance-none pr-8 cursor-pointer`} style={{...iSty,color:"var(--foreground)"}}>
          {["Software","Mzdy","Pojištění","Provize","Marketing","Vybavení","Jiné"].map(o=><option key={o} value={o} style={{background:"oklch(0.12 0.008 222)"}}>{o}</option>)}
        </select></div></div>
      <div className="space-y-1.5"><label className="block text-[10px] font-semibold text-[--muted-foreground] uppercase tracking-[0.08em]">Stav</label>
        <div className="relative"><select value={f.stav} onChange={e=>set("stav")(e.target.value)} className={`${iCls} appearance-none pr-8 cursor-pointer`} style={{...iSty,color:"var(--foreground)"}}>
          {["Zpracováno","Čeká na zpracování"].map(o=><option key={o} value={o} style={{background:"oklch(0.12 0.008 222)"}}>{o}</option>)}
        </select></div></div>
      <div className="space-y-1.5"><label className="block text-[10px] font-semibold text-[--muted-foreground] uppercase tracking-[0.08em]">Soubor</label>
        <input value={f.soubor} onChange={e=>set("soubor")(e.target.value)} className={iCls} style={iSty} placeholder="doklad.pdf"/></div>
      <div className="md:col-span-2 flex justify-end pt-2 border-t" style={{borderColor:"oklch(1 0 0 / 0.08)"}}>
        <motion.button onClick={()=>onSave(f)} whileTap={{scale:0.96}}
          className="px-4 py-2 rounded-[7px] text-[13px] font-semibold btn-tactile"
          style={{background:"oklch(0.65 0.22 25)",color:"oklch(0.98 0 0)",fontFamily:"var(--font-outfit)"}}>
          {isNew?"Přidat doklad":"Uložit změny"}
        </motion.button>
      </div>
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────────────────────── */
const TABS: { id: Tab; label: string; icon: React.ReactNode; color: string }[] = [
  { id: "prehled", label: "Přehled",  icon: <BarChart3 className="w-3.5 h-3.5" />,    color: "oklch(0.62 0.27 265)" },
  { id: "prijmy",  label: "Příjmy",   icon: <TrendingUp className="w-3.5 h-3.5" />,   color: "oklch(0.67 0.155 155)" },
  { id: "vydaje",  label: "Výdaje",   icon: <TrendingDown className="w-3.5 h-3.5" />, color: "oklch(0.65 0.22 25)" },
  { id: "bilance", label: "Bilance",  icon: <Wallet className="w-3.5 h-3.5" />,       color: "oklch(0.74 0.165 75)" },
  { id: "faktury", label: "Faktury",  icon: <FileText className="w-3.5 h-3.5" />,     color: "oklch(0.72 0.18 290)" },
  { id: "doklady", label: "Doklady",  icon: <Receipt className="w-3.5 h-3.5" />,      color: "oklch(0.72 0.18 340)" },
];

export default function FinancePage() {
  const [tab,       setTab]      = useState<Tab>("prehled");
  const [summaries, setSummaries] = useSupabaseData<MonthSummary[]>("ov-finance-summaries", () => SUMMARIES);
  const [incomes,   setIncomes]  = useSupabaseData<IncomeItem[]>("ov-finance-incomes", () => INCOME_SEED);
  const [expenses,  setExpenses] = useSupabaseData<ExpenseItem[]>("ov-finance-expenses", () => EXPENSE_SEED);
  const [faktury,   setFaktury]  = useSupabaseData<Faktura[]>("ov-finance-faktury", () => FAKTURY_SEED);
  const [doklady,   setDoklady]  = useSupabaseData<Doklad[]>("ov-finance-doklady", () => DOKLADY_SEED);

  return (
    <div className="p-4 md:p-7 space-y-4 md:space-y-5 min-h-screen"
      style={{ background: `radial-gradient(ellipse 60% 40% at 100% 0%, oklch(0.62 0.27 265 / 0.04) 0%, transparent 70%), var(--background)` }}>

      {/* Header */}
      <motion.div className="flex items-start justify-between gap-3"
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[9px] flex items-center justify-center shrink-0"
            style={{ background: "oklch(0.62 0.27 265 / 0.12)", border: "1px solid oklch(0.62 0.27 265 / 0.2)" }}>
            <Wallet className="w-4 h-4" style={{ color: "oklch(0.62 0.27 265)" }} />
          </div>
          <div>
            <h1 className="text-[22px] md:text-[28px] leading-none text-[--foreground]"
              style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, letterSpacing: "-0.03em" }}>Finance</h1>
            <p className="text-[12px] text-[--muted-foreground] mt-1">OnVision s.r.o. · 2026</p>
          </div>
        </div>
      </motion.div>

      {/* Tab bar */}
      <motion.div className="flex items-center gap-1 flex-wrap"
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}>
        {TABS.map(t => {
          const active = tab === t.id;
          return (
            <motion.button key={t.id} onClick={() => setTab(t.id)} whileTap={{ scale: 0.95 }}
              className="relative flex items-center gap-2 px-4 py-2 rounded-[8px] text-[13px] font-semibold btn-tactile transition-colors"
              style={active
                ? { background: `${t.color.replace(")", " / 0.12)")}`, color: t.color, border: `1px solid ${t.color.replace(")", " / 0.25)")}` }
                : { background: "transparent", color: "oklch(0.40 0.005 222)", border: "1px solid oklch(1 0 0 / 0.06)" }}
              transition={{ duration: 0.12 }}>
              {t.icon}
              <span className="hidden sm:inline">{t.label}</span>
              {active && (
                <motion.span layoutId="tab-indicator" className="absolute inset-0 rounded-[8px] pointer-events-none"
                  style={{ boxShadow: `inset 0 0 0 1px ${t.color.replace(")", " / 0.25)")}` }}
                  transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }} />
              )}
            </motion.button>
          );
        })}
      </motion.div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div key={tab}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}>
          {tab === "prehled" && <PrehledTab summaries={summaries} setSummaries={fn => setSummaries(fn)} />}
          {tab === "prijmy"  && <PrijmyTab  items={incomes}  setItems={fn => setIncomes(fn)} />}
          {tab === "vydaje"  && <VydajeTab  items={expenses} setItems={fn => setExpenses(fn)} />}
          {tab === "bilance" && <BilanceTab incomes={incomes} expenses={expenses} />}
          {tab === "faktury" && <FakturyTab items={faktury}  setItems={fn => setFaktury(fn)} />}
          {tab === "doklady" && <DokladyTab items={doklady}  setItems={fn => setDoklady(fn)} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
