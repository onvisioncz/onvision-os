"use client";

/**
 * Koš — obnovitelně smazané položky (30 dní).
 *
 * Koš se plní AUTOMATICKY na úrovni /api/sync: kdykoli se z byznys klíče
 * (úkoly, faktury, klienti, projekty, výstupy, kalendář, rezervace…) odebere
 * položka, server ji sem uloží. Admin ji tu může vrátit zpět nebo smazat
 * navždy. Nic navíc nemusí dělat jednotlivé stránky.
 */
import { useState } from "react";
import { useSupabaseData } from "@/lib/hooks/use-supabase-data";
import { Trash2, RotateCcw, Undo2 } from "lucide-react";
import { DEFAULT_USERS } from "@/lib/roles";

interface TrashEntry {
  id: string; srcKey: string; item: unknown; label: string;
  deletedAt: string; deletedBy: string;
}

const KEY_LABELS: Record<string, string> = {
  "ov-ukoly-tasks": "Úkol",
  "ov-issued-invoices": "Faktura",
  "ov-finance-faktury": "Faktura",
  "ov-monthly-clients": "Měsíční klient",
  "ov-oneoffs-projects": "Jednorázovka",
  "ov-outputs": "Výstup",
  "ov-output-messages": "Zpráva výstupu",
  "ov-calendar-events": "Událost kalendáře",
  "ov-pipeline-deals": "Obchod (pipeline)",
  "ov-gear-reservations": "Rezervace techniky",
  "ov-shooting-plan": "Produkční plán",
  "ov-schvaleni-items": "Schvalování",
};

function tsRel(ts: string): string {
  const d = new Date(ts);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "právě teď";
  if (min < 60) return `před ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `před ${h} h`;
  const days = Math.floor(h / 24);
  if (days < 30) return `před ${days} d`;
  return d.toLocaleDateString("cs-CZ");
}

export default function KosPage() {
  const [trash, setTrash] = useSupabaseData<TrashEntry[]>("ov-trash", () => []);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const sorted = [...trash].sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));

  const restore = async (entry: TrashEntry) => {
    setBusy(entry.id); setMsg(null);
    try {
      const res = await fetch("/api/trash/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trashId: entry.id }),
      });
      const json = await res.json();
      if (!res.ok) { setMsg(json.error ?? "Obnova selhala"); return; }
      // Server už položku z koše odebral — srovnej lokální stav.
      setTrash((prev) => prev.filter((e) => e.id !== entry.id));
      setMsg(json.restored ? `Obnoveno: ${entry.label}` : `Položka už existovala — jen odebráno z koše`);
    } catch {
      setMsg("Chyba sítě při obnově");
    } finally {
      setBusy(null);
    }
  };

  const purge = (entry: TrashEntry) => {
    setTrash((prev) => prev.filter((e) => e.id !== entry.id));
    setMsg(`Smazáno navždy: ${entry.label}`);
  };

  return (
    <div className="p-5 md:p-7 max-w-[900px] mx-auto">
      <div className="mb-4">
        <h1 className="text-[22px] font-bold tracking-[-0.01em] flex items-center gap-2" style={{ fontFamily: "var(--font-heading)" }}>
          <Trash2 className="w-5 h-5" style={{ color: "#5B5EFF" }} /> Koš
        </h1>
        <p className="text-[13px] text-[--muted-foreground]">
          Smazané položky se sem ukládají automaticky a jdou 30 dní vrátit zpět. Jen pro admina.
        </p>
      </div>

      {msg && (
        <div className="mb-3 px-3 py-2 rounded-[10px] text-[13px]" style={{ background: "rgba(91,94,255,0.1)", border: "1px solid rgba(91,94,255,0.3)", color: "#5B5EFF" }}>
          {msg}
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="glass-card p-10 flex flex-col items-center text-center">
          <Undo2 className="w-8 h-8 mb-2 opacity-30" />
          <p className="text-[14px] font-semibold">Koš je prázdný</p>
          <p className="text-[12px] text-[--muted-foreground] mt-1">Nic smazaného k obnovení. Pojistka běží na pozadí.</p>
        </div>
      ) : (
        <div className="glass-card divide-y" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          {sorted.map((e) => {
            const person = DEFAULT_USERS.find((u) => u.email.toLowerCase() === (e.deletedBy ?? "").toLowerCase());
            return (
              <div key={e.id} className="flex items-center gap-3 px-4 py-3" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <span className="text-[10px] font-bold uppercase tracking-[0.06em] px-2 py-1 rounded-[6px] shrink-0"
                  style={{ background: "rgba(255,255,255,0.05)", color: "var(--muted-foreground)" }}>
                  {KEY_LABELS[e.srcKey] ?? e.srcKey}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold truncate">{e.label || "položka"}</p>
                  <p className="text-[11px] text-[--muted-foreground]">
                    smazal(a) {person?.displayName ?? e.deletedBy} · {tsRel(e.deletedAt)}
                  </p>
                </div>
                <button onClick={() => restore(e)} disabled={busy === e.id}
                  className="btn-tactile flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold shrink-0 disabled:opacity-40"
                  style={{ background: "rgba(91,94,255,0.14)", border: "1px solid rgba(91,94,255,0.35)", color: "#5B5EFF" }}>
                  <RotateCcw className="w-3.5 h-3.5" /> {busy === e.id ? "Vracím…" : "Obnovit"}
                </button>
                <button onClick={() => purge(e)} title="Smazat navždy"
                  className="btn-tactile flex items-center gap-1 px-2 py-1.5 rounded-[8px] text-[11px] shrink-0"
                  style={{ color: "oklch(0.6 0.2 25)" }}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
