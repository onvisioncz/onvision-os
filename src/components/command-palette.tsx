"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, CornerDownLeft, ArrowRight, Plus } from "lucide-react";

interface Cmd { label: string; href: string; group: "Přejít na" | "Akce" | "Nástroje"; keywords?: string }

const COMMANDS: Cmd[] = [
  { label: "Můj den", href: "/dnes", group: "Přejít na", keywords: "dnes moje úkoly natáčení hodiny" },
  { label: "Dashboard", href: "/dashboard", group: "Přejít na" },
  { label: "Gameplán", href: "/gameplan", group: "Přejít na", keywords: "strategie plán posun AI brief" },
  { label: "Upozornění", href: "/inbox", group: "Přejít na" },
  { label: "Úkoly", href: "/ukoly", group: "Přejít na" },
  { label: "Cíle & benchmarky", href: "/cile", group: "Přejít na", keywords: "obrat zisk marže targets" },
  { label: "Zápis → úkoly", href: "/zapis", group: "Přejít na", keywords: "porada meeting AI extrakce" },
  { label: "AI obsah", href: "/smm-ai", group: "Přejít na", keywords: "generování příspěvky" },
  { label: "SMM Studio", href: "/smm-studio", group: "Přejít na", keywords: "carousel grid koláž instagram slidy" },
  { label: "Schválení", href: "/schvaleni", group: "Přejít na", keywords: "nabídky approval" },
  { label: "Tým", href: "/tym", group: "Přejít na", keywords: "lidé zaměstnanci přihlášení aktivita vytížení" },
  { label: "Měsíční klienti", href: "/projects/monthly", group: "Přejít na", keywords: "retainer paušál" },
  { label: "Jednorázovky", href: "/projects/oneoffs", group: "Přejít na" },
  { label: "Výkazy hodin", href: "/vykazy", group: "Přejít na", keywords: "time tracking" },
  { label: "Finance", href: "/finance", group: "Přejít na" },
  { label: "Ziskovost", href: "/ziskovost", group: "Přejít na", keywords: "marže zisk" },
  { label: "Cashflow & výhledy", href: "/cashflow", group: "Přejít na", keywords: "předpověď" },
  { label: "Fakturace", href: "/fakturace", group: "Přejít na", keywords: "faktury" },
  { label: "Odměny", href: "/odmeny", group: "Přejít na", keywords: "výplaty osvč dpp" },
  { label: "Investice", href: "/investice", group: "Přejít na" },
  { label: "Klienti", href: "/klienti", group: "Přejít na" },
  { label: "SMM", href: "/smm", group: "Přejít na" },
  { label: "Reporty", href: "/reporty", group: "Přejít na" },
  { label: "Kalendář", href: "/calendar", group: "Přejít na" },
  { label: "Výstupy", href: "/outputs", group: "Přejít na" },
  { label: "Delivery", href: "/delivery", group: "Přejít na", keywords: "sdílení stažení" },
  { label: "Klientská sdílení", href: "/klient-share", group: "Přejít na", keywords: "portál schválení nps" },
  { label: "Reklamy", href: "/ads", group: "Přejít na", keywords: "meta ads" },
  { label: "Produkční plán", href: "/shooting", group: "Přejít na", keywords: "natáčení" },
  { label: "Call sheety", href: "/call-sheet", group: "Přejít na", keywords: "produkční list" },
  { label: "Technika", href: "/technika", group: "Přejít na", keywords: "rezervace kamera sklad" },
  { label: "Lokace", href: "/lokace", group: "Přejít na", keywords: "místa" },
  { label: "Kreativa", href: "/produkce", group: "Přejít na" },
  { label: "Nastavení", href: "/nastaveni", group: "Přejít na" },
  { label: "Nový úkol", href: "/ukoly", group: "Akce", keywords: "vytvořit task" },
  { label: "Nová faktura", href: "/fakturace", group: "Akce" },
  { label: "Nový call sheet", href: "/call-sheet", group: "Akce", keywords: "natáčení" },
  { label: "Rezervovat techniku", href: "/technika", group: "Akce", keywords: "kamera" },
  { label: "Nová delivery klientovi", href: "/delivery", group: "Akce" },
  { label: "Zapsat hodiny", href: "/vykazy", group: "Akce", keywords: "výkaz" },
  { label: "AI obsah (captiony, hashtagy)", href: "/smm-ai", group: "Nástroje", keywords: "smm" },
  { label: "Zápis z porady → úkoly", href: "/zapis", group: "Nástroje", keywords: "ai poznámky" },
  { label: "AI asistent", href: "/ai", group: "Nástroje" },
];

interface Entity { label: string; sub: string; href: string }
interface FlatItem { label: string; sub?: string; href: string; group: string; action?: "create-task" }

const norm = (s: string) => (s || "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
const arr = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? (v as Record<string, unknown>[]) : []);
const str = (v: unknown) => (v == null ? "" : String(v));

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [entities, setEntities] = useState<Entity[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const loadedRef = useRef(false);

  const loadEntities = useCallback(async () => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    const keys = ["ov-monthly-clients", "ov-ukoly-tasks", "ov-issued-invoices", "ov-gear", "ov-lokace", "ov-call-sheets", "ov-oneoffs-projects"];
    try {
      const res = await Promise.all(keys.map((k) => fetch(`/api/sync?key=${k}`).then((r) => r.json()).catch(() => ({}))));
      const v = (i: number) => arr(res[i]?.value);
      const e: Entity[] = [];
      v(0).forEach((c) => str(c.name) && e.push({ label: str(c.name), sub: "Klient", href: "/klienti" }));
      v(1).forEach((t) => str(t.nazev) && e.push({ label: str(t.nazev), sub: `Úkol${t.prirazeno ? ` · ${str(t.prirazeno)}` : ""}`, href: "/ukoly" }));
      v(2).forEach((f) => (str(f.cislo) || str(f.klient)) && e.push({ label: `${str(f.cislo)} ${str(f.klient)}`.trim(), sub: "Faktura", href: "/fakturace" }));
      v(3).forEach((g) => str(g.nazev) && e.push({ label: str(g.nazev), sub: "Technika", href: "/technika" }));
      v(4).forEach((l) => str(l.nazev) && e.push({ label: str(l.nazev), sub: "Lokace", href: "/lokace" }));
      v(5).forEach((cs) => str(cs.nazev) && e.push({ label: str(cs.nazev), sub: "Call sheet", href: "/call-sheet" }));
      v(6).forEach((p) => str(p.title) && e.push({ label: str(p.title), sub: `Projekt${p.klient ? ` · ${str(p.klient)}` : ""}`, href: "/projects/oneoffs" }));
      setEntities(e);
    } catch { /* data hledání je bonus */ }
  }, []);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === "k") { ev.preventDefault(); setOpen((o) => !o); setQ(""); setActive(0); loadEntities(); }
      if (ev.key === "Escape") setOpen(false);
    };
    const onCustom = () => { setOpen(true); setQ(""); setActive(0); loadEntities(); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("ov-command-palette", onCustom);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("ov-command-palette", onCustom); };
  }, [loadEntities]);

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 30); }, [open]);
  useEffect(() => { setActive(0); }, [q]);

  const flat = useMemo<FlatItem[]>(() => {
    const nq = norm(q.trim());
    const items: FlatItem[] = [];
    const trimmed = q.trim();
    // Rychlé založení úkolu z čehokoliv, co uživatel napsal
    if (trimmed.length >= 3) {
      const clean = trimmed.replace(/^(úkol|ukol|task|todo)\s*:?\s*/i, "").trim() || trimmed;
      items.push({ label: `Vytvořit úkol: „${clean}"`, href: "/ukoly", group: "Rychlá akce", action: "create-task" });
    }
    if (nq) entities.filter((e) => norm(e.label).includes(nq) || norm(e.sub).includes(nq)).slice(0, 8).forEach((e) => items.push({ ...e, group: "Výsledky" }));
    const cmds = nq ? COMMANDS.filter((c) => norm(c.label).includes(nq) || (c.keywords && norm(c.keywords).includes(nq))) : COMMANDS;
    cmds.forEach((c) => items.push({ label: c.label, href: c.href, group: c.group }));
    return items;
  }, [q, entities]);

  const createTask = useCallback(async (rawText: string) => {
    const nazev = rawText.replace(/^(úkol|ukol|task|todo)\s*:?\s*/i, "").trim();
    if (!nazev) return;
    try {
      const cur = await fetch("/api/sync?key=ov-ukoly-tasks").then((r) => r.json()).catch(() => ({}));
      const tasks = arr(cur?.value);
      const id = Math.max(0, ...tasks.map((t) => Number(t.id) || 0)) + 1;
      const next = [...tasks, { id, nazev, projekt: "", prirazeno: "", priorita: "Střední", status: "Nové", deadline: "" }];
      await fetch("/api/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: "ov-ukoly-tasks", value: next }) });
    } catch { /* offline — úkol se neztratí, jen se nezaloží; uživatel to uvidí */ }
  }, []);

  const go = (it: FlatItem) => {
    setOpen(false);
    if (it.action === "create-task") { void createTask(q); router.push("/ukoly"); return; }
    router.push(it.href);
  };

  const onListKey = (ev: React.KeyboardEvent) => {
    if (ev.key === "ArrowDown") { ev.preventDefault(); setActive((a) => Math.min(a + 1, flat.length - 1)); }
    else if (ev.key === "ArrowUp") { ev.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (ev.key === "Enter" && flat[active]) { ev.preventDefault(); go(flat[active]); }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)}
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4" style={{ background: "rgba(4,4,10,0.6)", backdropFilter: "blur(4px)" }}>
          <motion.div initial={{ scale: 0.97, y: -8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.97, y: -8 }} onClick={(e) => e.stopPropagation()} onKeyDown={onListKey}
            className="glass-panel w-full max-w-[560px] overflow-hidden" style={{ boxShadow: "0 24px 60px -12px rgba(0,0,0,0.6)" }}>
            <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.09)" }}>
              <Search className="w-4 h-4 text-[--muted-foreground]" />
              <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Hledej stránku, klienta, fakturu, úkol…" className="flex-1 bg-transparent outline-none text-[14px] text-[--foreground] placeholder:text-[--muted-foreground]" />
              <kbd className="text-[10px] px-1.5 py-0.5 rounded border text-[--muted-foreground]" style={{ borderColor: "rgba(255,255,255,0.12)" }}>Esc</kbd>
            </div>
            <div className="max-h-[54vh] overflow-y-auto py-2">
              {flat.length === 0 ? (
                <div className="px-4 py-6 text-center text-[13px] text-[--muted-foreground]">Nic nenalezeno.</div>
              ) : flat.map((it, idx) => {
                const newGroup = idx === 0 || flat[idx - 1].group !== it.group;
                return (
                  <div key={`${it.group}-${it.href}-${it.label}-${idx}`}>
                    {newGroup && <div className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[--muted-foreground]">{it.group}</div>}
                    <button onMouseEnter={() => setActive(idx)} onClick={() => go(it)}
                      className="w-full flex items-center gap-3 px-4 py-2 text-left text-[13.5px]"
                      style={{ background: idx === active ? "rgba(91,94,255,0.16)" : "transparent", color: idx === active ? "#fff" : "var(--foreground)" }}>
                      {it.action === "create-task" ? <Plus className="w-3.5 h-3.5" style={{ color: "#5B5EFF" }} /> : it.group === "Výsledky" ? <Search className="w-3.5 h-3.5 opacity-50" /> : it.group === "Přejít na" ? <ArrowRight className="w-3.5 h-3.5 opacity-60" /> : <Plus className="w-3.5 h-3.5 opacity-60" />}
                      <span className="flex-1 truncate">{it.label}{it.sub && <span className="text-[--muted-foreground] text-[12px]"> · {it.sub}</span>}</span>
                      {idx === active && <CornerDownLeft className="w-3.5 h-3.5 opacity-50" />}
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
