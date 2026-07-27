"use client";

import { useMemo, useState } from "react";
import { CalendarClock, MapPin, Clock, FileText, LinkIcon, Phone, Users, Pencil, Check, X, Share2 } from "lucide-react";
import { useSupabaseData } from "@/lib/hooks/use-supabase-data";
import { useUserRole } from "@/lib/hooks/use-user-role";
import type { ProdukcniDen } from "@/lib/produkce-dny";

/* Parse "D. M. YYYY" → timestamp (nerozpoznané dozadu). */
function ts(datum: string): number {
  const m = (datum || "").match(/(\d{1,2})\.\s*(\d{1,2})\.?\s*(\d{4})?/);
  if (!m) return Number.MAX_SAFE_INTEGER;
  const y = m[3] ? +m[3] : new Date().getFullYear();
  return new Date(y, +m[2] - 1, +m[1]).getTime();
}

const C = {
  card: "oklch(1 0 0 / 0.03)", border: "oklch(1 0 0 / 0.08)",
  soft: "oklch(0.55 0 0)", text: "oklch(0.92 0 0)", accent: "oklch(0.80 0.20 265)",
};
const iStyle: React.CSSProperties = { width: "100%", background: "oklch(1 0 0 / 0.05)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 8, color: C.text, padding: "6px 9px", fontSize: 12.5, outline: "none", fontFamily: "inherit" };
const fmtKc = (n: number) => new Intl.NumberFormat("cs-CZ").format(n || 0) + ",- Kč";

type Detail = Pick<ProdukcniDen, "casZacatek" | "casKonec" | "sraz" | "scenar" | "podklady" | "kontakt" | "poznamka">;

/**
 * „Nejbližší projekty" — akce z produkčních dní (ov-produkce-dny).
 * Admin vidí vše + edituje detaily; označení lidé vidí své akce a svou odměnu
 * (cizí odměny server skryje). Umístěno nahoře na /shooting.
 */
export function NejblizsiProjekty({ showWhenEmpty = false }: { showWhenEmpty?: boolean }) {
  const [dny, setDny] = useSupabaseData<ProdukcniDen[]>("ov-produkce-dny", () => []);
  const { user } = useUserRole();
  const isAdmin = !!user?.roles.includes("admin");
  const [editId, setEditId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Detail>({});
  const [sharedId, setSharedId] = useState<number | null>(null);

  // Sdílet akci → vygeneruj token (jednou), ulož a zkopíruj /a/[token]
  const shareAkce = async (d: ProdukcniDen) => {
    let token = d.shareToken;
    if (!token) {
      token = crypto.randomUUID().replace(/-/g, "");
      setDny((prev) => (prev ?? []).map((x) => (x.id === d.id ? { ...x, shareToken: token } : x)));
    }
    try { await navigator.clipboard.writeText(`${window.location.origin}/a/${token}`); } catch { /* zkopíruje ručně */ }
    setSharedId(d.id);
    setTimeout(() => setSharedId(null), 2500);
  };

  const upcoming = useMemo(
    () => [...(dny ?? [])].sort((a, b) => ts(a.datum) - ts(b.datum)),
    [dny]
  );

  if (!upcoming.length && !showWhenEmpty) return null;

  const startEdit = (d: ProdukcniDen) => {
    setEditId(d.id);
    setDraft({ casZacatek: d.casZacatek, casKonec: d.casKonec, sraz: d.sraz, scenar: d.scenar, podklady: d.podklady, kontakt: d.kontakt, poznamka: d.poznamka });
  };
  const saveEdit = (id: number) => {
    setDny((prev) => (prev ?? []).map((d) => (d.id === id ? { ...d, ...draft } : d)));
    setEditId(null);
  };

  const Row = ({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) => (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 7, fontSize: 12.5, color: C.text }}>
      <Icon size={13} style={{ color: C.soft, marginTop: 2, flexShrink: 0 }} />
      <span style={{ minWidth: 0 }}>{children}</span>
    </div>
  );

  return (
    <div style={{ marginBottom: 28, background: "oklch(0.62 0.27 265 / 0.06)", border: "1px solid oklch(0.62 0.27 265 / 0.25)", borderRadius: 14, padding: 18 }}>
      <p style={{ fontSize: 15, fontWeight: 800, color: "oklch(0.97 0 0)", margin: "0 0 14px", display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-outfit)" }}>
        <CalendarClock size={18} style={{ color: C.accent }} /> Nejbližší projekty
      </p>

      {upcoming.length === 0 && (
        <div style={{ background: C.card, border: `1px dashed ${C.border}`, borderRadius: 12, padding: "18px 16px", textAlign: "center" }}>
          <p style={{ fontSize: 14, color: C.text, margin: 0, fontWeight: 600 }}>Zatím žádné produkční dny.</p>
          <p style={{ fontSize: 12.5, color: C.soft, margin: "6px 0 0" }}>Zapiš je u klienta (Měsíční klienti → „Zapsat produkční den") nebo u jednorázovky — pak se objeví tady.</p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {upcoming.map((d) => {
          const editing = editId === d.id;
          return (
            <div key={d.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: 0, fontFamily: "var(--font-outfit)" }}>{d.projekt}</p>
                  <p style={{ fontSize: 12, color: C.soft, margin: "2px 0 0" }}>{d.klient}{d.datum ? ` · ${d.datum}` : ""}{d.popis ? ` · ${d.popis}` : ""}</p>
                </div>
                {isAdmin && !editing && (
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button onClick={() => shareAkce(d)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 8, background: "oklch(0.67 0.155 155 / 0.12)", border: "1px solid oklch(0.67 0.155 155 / 0.3)", color: "oklch(0.78 0.16 155)", fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}>
                      {sharedId === d.id ? <Check size={12} /> : <Share2 size={12} />} {sharedId === d.id ? "Zkopírováno" : "Sdílet akci"}
                    </button>
                    <button onClick={() => startEdit(d)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 8, background: "oklch(0.62 0.27 265 / 0.12)", border: "1px solid oklch(0.62 0.27 265 / 0.28)", color: C.accent, fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}>
                      <Pencil size={12} /> Detaily
                    </button>
                  </div>
                )}
                {isAdmin && editing && (
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button onClick={() => saveEdit(d.id)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 8, background: "oklch(0.67 0.155 155 / 0.16)", border: "1px solid oklch(0.67 0.155 155 / 0.35)", color: "oklch(0.78 0.16 155)", fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}><Check size={12} /> Uložit</button>
                    <button onClick={() => setEditId(null)} style={{ display: "flex", alignItems: "center", padding: "5px 8px", borderRadius: 8, background: "oklch(1 0 0 / 0.05)", border: "1px solid oklch(1 0 0 / 0.1)", color: C.soft, cursor: "pointer" }}><X size={12} /></button>
                  </div>
                )}
              </div>

              {editing ? (
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <input style={iStyle} value={draft.casZacatek ?? ""} onChange={(e) => setDraft((p) => ({ ...p, casZacatek: e.target.value }))} placeholder="Začátek (8:00)" />
                    <input style={iStyle} value={draft.casKonec ?? ""} onChange={(e) => setDraft((p) => ({ ...p, casKonec: e.target.value }))} placeholder="Konec (16:00)" />
                  </div>
                  <input style={iStyle} value={draft.sraz ?? ""} onChange={(e) => setDraft((p) => ({ ...p, sraz: e.target.value }))} placeholder="Sraz — místo + čas" />
                  <textarea style={{ ...iStyle, minHeight: 60, resize: "vertical" }} value={draft.scenar ?? ""} onChange={(e) => setDraft((p) => ({ ...p, scenar: e.target.value }))} placeholder="Scénář / průběh dne" />
                  <input style={iStyle} value={draft.podklady ?? ""} onChange={(e) => setDraft((p) => ({ ...p, podklady: e.target.value }))} placeholder="Odkaz na podklady (Drive…)" />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <input style={iStyle} value={draft.kontakt ?? ""} onChange={(e) => setDraft((p) => ({ ...p, kontakt: e.target.value }))} placeholder="Kontakt na místě" />
                    <input style={iStyle} value={draft.poznamka ?? ""} onChange={(e) => setDraft((p) => ({ ...p, poznamka: e.target.value }))} placeholder="Poznámka" />
                  </div>
                </div>
              ) : (
                <div style={{ display: "grid", gap: 6 }}>
                  {(d.casZacatek || d.casKonec) && <Row icon={Clock}>{d.casZacatek}{d.casKonec ? `–${d.casKonec}` : ""}</Row>}
                  {d.sraz && <Row icon={MapPin}>Sraz: {d.sraz}</Row>}
                  {d.lokace && <Row icon={MapPin}>{d.lokace}</Row>}
                  {d.scenar && <Row icon={FileText}>{d.scenar}</Row>}
                  {d.podklady && <Row icon={LinkIcon}><a href={d.podklady} target="_blank" rel="noopener noreferrer" style={{ color: C.accent }}>Podklady →</a></Row>}
                  {d.kontakt && <Row icon={Phone}>{d.kontakt}</Row>}
                  {d.poznamka && <Row icon={FileText}>{d.poznamka}</Row>}
                </div>
              )}

              {/* Lidé — jméno + úkol; odměna jen tvoje (server skryje cizí) */}
              {d.people?.length > 0 && (
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.border}`, display: "flex", flexDirection: "column", gap: 5 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: C.soft, display: "flex", alignItems: "center", gap: 5, margin: 0 }}><Users size={11} /> Tým</p>
                  {d.people.map((p, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
                      <span style={{ color: C.text, fontWeight: 600, minWidth: 90 }}>{p.jmeno}</span>
                      <span style={{ color: C.soft, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.ukol}</span>
                      {typeof p.odmena === "number" && <span style={{ color: "oklch(0.72 0.16 155)", fontWeight: 600, flexShrink: 0 }}>{fmtKc(p.odmena)}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
