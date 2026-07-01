"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, CornerDownLeft, ArrowRight, Plus } from "lucide-react";

/* Cíle a rychlé akce. Skupina "akce" = vytvoření/nástroj. */
interface Cmd { label: string; href: string; group: "Přejít na" | "Akce" | "Nástroje"; keywords?: string }

const COMMANDS: Cmd[] = [
  // Přejít na
  { label: "Dashboard", href: "/dashboard", group: "Přejít na" },
  { label: "Upozornění", href: "/inbox", group: "Přejít na" },
  { label: "Úkoly", href: "/ukoly", group: "Přejít na" },
  { label: "Měsíční klienti", href: "/projects/monthly", group: "Přejít na", keywords: "retainer paušál" },
  { label: "Jednorázovky", href: "/projects/oneoffs", group: "Přejít na" },
  { label: "Výkazy hodin", href: "/vykazy", group: "Přejít na", keywords: "time tracking" },
  { label: "Finance", href: "/finance", group: "Přejít na" },
  { label: "Ziskovost", href: "/ziskovost", group: "Přejít na", keywords: "marže zisk" },
  { label: "Cashflow & výhledy", href: "/cashflow", group: "Přejít na", keywords: "cashflow předpověď" },
  { label: "Fakturace", href: "/fakturace", group: "Přejít na", keywords: "faktury" },
  { label: "Odměny", href: "/odmeny", group: "Přejít na", keywords: "výplaty osvč dpp" },
  { label: "Investice", href: "/investice", group: "Přejít na" },
  { label: "Klienti", href: "/klienti", group: "Přejít na" },
  { label: "SMM", href: "/smm", group: "Přejít na" },
  { label: "Reporty", href: "/reporty", group: "Přejít na" },
  { label: "Kalendář", href: "/calendar", group: "Přejít na" },
  { label: "Výstupy", href: "/outputs", group: "Přejít na" },
  { label: "Delivery", href: "/delivery", group: "Přejít na", keywords: "sdílení klient stažení" },
  { label: "Klientská sdílení", href: "/klient-share", group: "Přejít na", keywords: "portál schválení nps" },
  { label: "Reklamy", href: "/ads", group: "Přejít na", keywords: "meta ads" },
  { label: "Produkční plán", href: "/shooting", group: "Přejít na", keywords: "natáčení" },
  { label: "Call sheety", href: "/call-sheet", group: "Přejít na", keywords: "natáčení produkční list" },
  { label: "Technika", href: "/technika", group: "Přejít na", keywords: "rezervace kamera sklad" },
  { label: "Lokace", href: "/lokace", group: "Přejít na", keywords: "místa natáčení" },
  { label: "Kreativa", href: "/produkce", group: "Přejít na" },
  { label: "Nastavení", href: "/nastaveni", group: "Přejít na" },
  // Akce
  { label: "Nový úkol", href: "/ukoly", group: "Akce", keywords: "vytvořit task" },
  { label: "Nová faktura", href: "/fakturace", group: "Akce" },
  { label: "Nový call sheet", href: "/call-sheet", group: "Akce", keywords: "natáčení" },
  { label: "Rezervovat techniku", href: "/technika", group: "Akce", keywords: "kamera" },
  { label: "Nová delivery klientovi", href: "/delivery", group: "Akce" },
  { label: "Zapsat hodiny", href: "/vykazy", group: "Akce", keywords: "výkaz" },
  // Nástroje
  { label: "AI obsah (captiony, hashtagy)", href: "/smm-ai", group: "Nástroje", keywords: "smm generovat" },
  { label: "Zápis z porady → úkoly", href: "/zapis", group: "Nástroje", keywords: "ai poznámky" },
  { label: "AI asistent", href: "/ai", group: "Nástroje" },
];

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const openPalette = useCallback(() => { setOpen(true); setQ(""); setActive(0); }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((o) => !o); setQ(""); setActive(0); }
      if (e.key === "Escape") setOpen(false);
    };
    const onCustom = () => openPalette();
    window.addEventListener("keydown", onKey);
    window.addEventListener("ov-command-palette", onCustom);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("ov-command-palette", onCustom); };
  }, [openPalette]);

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 30); }, [open]);

  const results = useMemo(() => {
    const nq = norm(q.trim());
    if (!nq) return COMMANDS;
    return COMMANDS.filter((c) => norm(c.label).includes(nq) || (c.keywords && norm(c.keywords).includes(nq)));
  }, [q]);

  useEffect(() => { setActive(0); }, [q]);

  const go = (c: Cmd) => { setOpen(false); router.push(c.href); };

  const onListKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter" && results[active]) { e.preventDefault(); go(results[active]); }
  };

  // seskupení pro render
  const groups = useMemo(() => {
    const order = ["Přejít na", "Akce", "Nástroje"] as const;
    const map = new Map<string, { cmd: Cmd; idx: number }[]>();
    results.forEach((cmd, idx) => { const arr = map.get(cmd.group) ?? []; arr.push({ cmd, idx }); map.set(cmd.group, arr); });
    return order.filter((g) => map.has(g)).map((g) => ({ group: g, items: map.get(g)! }));
  }, [results]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)}
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4" style={{ background: "rgba(4,4,10,0.6)", backdropFilter: "blur(4px)" }}>
          <motion.div initial={{ scale: 0.97, y: -8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.97, y: -8 }} onClick={(e) => e.stopPropagation()} onKeyDown={onListKey}
            className="glass-panel w-full max-w-[560px] overflow-hidden" style={{ boxShadow: "0 24px 60px -12px rgba(0,0,0,0.6)" }}>
            <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.09)" }}>
              <Search className="w-4 h-4 text-[--muted-foreground]" />
              <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Hledej stránku nebo akci…" className="flex-1 bg-transparent outline-none text-[14px] text-[--foreground] placeholder:text-[--muted-foreground]" />
              <kbd className="text-[10px] px-1.5 py-0.5 rounded border text-[--muted-foreground]" style={{ borderColor: "rgba(255,255,255,0.12)" }}>Esc</kbd>
            </div>
            <div className="max-h-[52vh] overflow-y-auto py-2">
              {results.length === 0 ? (
                <div className="px-4 py-6 text-center text-[13px] text-[--muted-foreground]">Nic nenalezeno.</div>
              ) : groups.map(({ group, items }) => (
                <div key={group} className="mb-1">
                  <div className="px-4 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[--muted-foreground]">{group}</div>
                  {items.map(({ cmd, idx }) => (
                    <button key={cmd.href + cmd.label} onMouseEnter={() => setActive(idx)} onClick={() => go(cmd)}
                      className="w-full flex items-center gap-3 px-4 py-2 text-left text-[13.5px]"
                      style={{ background: idx === active ? "rgba(91,94,255,0.16)" : "transparent", color: idx === active ? "#fff" : "var(--foreground)" }}>
                      {cmd.group === "Přejít na" ? <ArrowRight className="w-3.5 h-3.5 opacity-60" /> : <Plus className="w-3.5 h-3.5 opacity-60" />}
                      <span className="flex-1">{cmd.label}</span>
                      {idx === active && <CornerDownLeft className="w-3.5 h-3.5 opacity-50" />}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
