"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Trash2, AlertTriangle, Camera, Check, CalendarClock, X, Edit2, ChevronLeft, ChevronRight,
  ImagePlus, Loader2,
} from "lucide-react";
import { useSupabaseData } from "@/lib/hooks/use-supabase-data";
import { useUserRole } from "@/lib/hooks/use-user-role";
import { uploadThumb, resolveThumbUrl } from "@/lib/thumbs";
import { createClient } from "@/lib/supabase/client";
import {
  GEAR_KEY, GEAR_RES_KEY, GEAR_KATEGORIE, todayISO, reservedNow, hasConflict, nextReservation, fmtDate,
  type GearItem, type GearReservation, type GearKategorie,
} from "@/lib/gear";

const RED = "oklch(0.65 0.22 25)";
const GREEN = "oklch(0.67 0.155 155)";
const PRIMARY = "oklch(0.62 0.27 265)";
const iCls = "px-3 py-2 rounded-[7px] text-[13px] outline-none";
const iStyle = { background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" } as const;

type GearForm = { id: number | null; nazev: string; kategorie: GearKategorie; poznamka: string; fotoUrl: string };
const emptyForm: GearForm = { id: null, nazev: "", kategorie: "Kamera", poznamka: "", fotoUrl: "" };

/** Fotka kusu techniky: umí storage: cesty (podepsaná URL) i běžné URL.
 *  Rozbitá/žádná fotka → ikona kamery místo rozbitého obrázku. */
function GearPhoto({ fotoUrl, nazev }: { fotoUrl?: string; nazev: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setFailed(false);
    if (!fotoUrl?.trim()) { setSrc(null); return; }
    if (!fotoUrl.startsWith("storage:")) { setSrc(fotoUrl); return; }
    resolveThumbUrl(fotoUrl, createClient())
      .then((u) => { if (alive) setSrc(u); })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [fotoUrl]);

  if (!src || failed) {
    return (
      <div className="w-full h-32 flex items-center justify-center" style={{ background: "var(--background)" }}>
        <Camera className="w-6 h-6" style={{ color: "var(--muted-foreground)", opacity: 0.4 }} />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={nazev} className="w-full h-32 object-cover" onError={() => setFailed(true)} />
  );
}

export default function TechnikaPage() {
  const { user, loading: roleLoading } = useUserRole();
  const [gear, setGear] = useSupabaseData<GearItem[]>(GEAR_KEY, () => []);
  const [reservations, setReservations] = useSupabaseData<GearReservation[]>(GEAR_RES_KEY, () => []);

  const [gearForm, setGearForm] = useState<GearForm | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  /** Nahraje vybranou fotku (komprese → Supabase storage) a uloží storage: cestu. */
  const onPickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !gearForm) return;
    setUploading(true);
    try {
      const stored = await uploadThumb(file);
      setGearForm((f) => (f ? { ...f, fotoUrl: stored } : f));
      flash("Fotka nahrána ✓");
    } catch (err) {
      flash(`Nahrání selhalo: ${err instanceof Error ? err.message : "chyba"}`);
    } finally {
      setUploading(false);
    }
  };
  const [res, setRes] = useState<{ gearId: number; kdo: string; od: string; do: string; projekt: string }>({ gearId: 0, kdo: "", od: todayISO(), do: todayISO(), projekt: "" });
  const [toast, setToast] = useState<string | null>(null);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 3500); };

  const isAdmin = !!user && user.roles.includes("admin");
  const canReserve = !!user && (user.roles.includes("admin") || user.roles.includes("produkce") || user.roles.includes("grafik") || user.roles.includes("smm"));
  const kdo = res.kdo || user?.displayName || "";
  const conflict = useMemo(() => res.gearId ? hasConflict(reservations, res.gearId, res.od, res.do) : undefined, [reservations, res]);

  const saveGear = () => {
    if (!gearForm?.nazev.trim()) return;
    if (gearForm.id) {
      setGear((prev) => prev.map((g) => g.id === gearForm.id ? { ...g, nazev: gearForm.nazev.trim(), kategorie: gearForm.kategorie, poznamka: gearForm.poznamka.trim(), fotoUrl: gearForm.fotoUrl.trim() } : g));
    } else {
      setGear((prev) => [...prev, { id: Date.now(), nazev: gearForm.nazev.trim(), kategorie: gearForm.kategorie, poznamka: gearForm.poznamka.trim(), fotoUrl: gearForm.fotoUrl.trim() }]);
    }
    setGearForm(null);
  };
  const delGear = (id: number) => { setGear((prev) => prev.filter((g) => g.id !== id)); setReservations((prev) => prev.filter((r) => r.gearId !== id)); };

  const reserve = async () => {
    if (!res.gearId || !res.od || !res.do || conflict) return;
    const g = gear.find((x) => x.id === res.gearId);
    setReservations((prev) => [...prev, { id: Date.now(), gearId: res.gearId, kdo, od: res.od, do: res.do, projekt: res.projekt.trim(), createdAt: new Date().toISOString() }]);
    try {
      await fetch("/api/push/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "broadcast", title: "Nová rezervace techniky", body: `${kdo} si rezervoval ${g?.nazev ?? "techniku"} (${fmtDate(res.od)}–${fmtDate(res.do)})${res.projekt ? ` · ${res.projekt}` : ""}`, url: "/technika", tag: "gear" }) });
    } catch { /* bonus */ }
    flash(`Rezervováno: ${g?.nazev}`);
    setRes({ gearId: 0, kdo: "", od: todayISO(), do: todayISO(), projekt: "" });
  };
  const delRes = (id: number) => setReservations((prev) => prev.filter((r) => r.id !== id));

  if (roleLoading) return <div className="p-8 text-[13px] text-[--muted-foreground]">Načítám…</div>;
  if (!user) return <div className="p-8 text-[14px] text-[--muted-foreground]">Nepřihlášen.</div>;

  const upcoming = [...reservations].filter((r) => r.do >= todayISO()).sort((a, b) => a.od.localeCompare(b.od));

  return (
    <div className="p-5 md:p-7 max-w-[1000px] mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.01em]" style={{ fontFamily: "var(--font-heading)" }}>Rezervace techniky</h1>
          <p className="text-[13px] text-[--muted-foreground]">Sklad s fotkami, kdo si co půjčuje — obsazené svítí červeně</p>
        </div>
        {isAdmin && <button onClick={() => setGearForm({ ...emptyForm })} className="btn-tactile flex items-center gap-1.5 px-3.5 py-2 rounded-[8px] text-[13px] font-semibold" style={{ background: PRIMARY, color: "white" }}><Plus className="w-4 h-4" /> Přidat techniku</button>}
      </div>

      {/* Add / edit gear */}
      {gearForm && (
        <div className="p-4 rounded-[10px] mb-4 space-y-2" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="flex flex-wrap items-center gap-2">
            <input className={iCls} style={{ ...iStyle, flex: 1, minWidth: 160 }} placeholder="Název (Sony FX3…)" value={gearForm.nazev} onChange={(e) => setGearForm({ ...gearForm, nazev: e.target.value })} />
            <select className={iCls} style={iStyle} value={gearForm.kategorie} onChange={(e) => setGearForm({ ...gearForm, kategorie: e.target.value as GearKategorie })}>{GEAR_KATEGORIE.map((k) => <option key={k} value={k}>{k}</option>)}</select>
          </div>
          <input className={`${iCls} w-full`} style={iStyle} placeholder="Popis — co to je, stav, příslušenství…" value={gearForm.poznamka} onChange={(e) => setGearForm({ ...gearForm, poznamka: e.target.value })} />
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="btn-tactile flex items-center gap-1.5 px-3 py-2 rounded-[7px] text-[12px] font-semibold disabled:opacity-50"
              style={{ background: "oklch(0.62 0.27 265 / 0.12)", border: "1px solid oklch(0.62 0.27 265 / 0.3)", color: PRIMARY }}>
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
              {uploading ? "Nahrávám…" : gearForm.fotoUrl ? "Vyměnit fotku" : "Nahrát fotku"}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickPhoto} />
            {gearForm.fotoUrl && !uploading && (
              <span className="flex items-center gap-1.5 text-[11px]" style={{ color: GREEN }}>
                <Check className="w-3 h-3" /> Fotka připravena
                <button onClick={() => setGearForm({ ...gearForm, fotoUrl: "" })} className="btn-tactile text-[--muted-foreground] ml-1" title="Odebrat fotku"><X className="w-3 h-3" /></button>
              </span>
            )}
            <input className={iCls} style={{ ...iStyle, flex: 1, minWidth: 180 }} placeholder="…nebo vlož URL fotky (nepovinné)" value={gearForm.fotoUrl.startsWith("storage:") ? "" : gearForm.fotoUrl} onChange={(e) => setGearForm({ ...gearForm, fotoUrl: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <button onClick={saveGear} disabled={!gearForm.nazev.trim()} className="btn-tactile px-3 py-2 rounded-[7px] text-[12px] font-semibold disabled:opacity-40" style={{ background: PRIMARY, color: "white" }}>{gearForm.id ? "Uložit" : "Přidat"}</button>
            <button onClick={() => setGearForm(null)} className="btn-tactile px-3 py-2 rounded-[7px] text-[12px]" style={{ border: "1px solid var(--border)" }}>Zrušit</button>
          </div>
        </div>
      )}

      {/* Reserve form */}
      {canReserve && gear.length > 0 && (
        <div className="p-4 rounded-[12px] mb-6" style={{ background: "oklch(0.62 0.27 265 / 0.06)", border: "1px solid oklch(0.62 0.27 265 / 0.18)" }}>
          <div className="text-[13px] font-semibold mb-2 flex items-center gap-2"><CalendarClock className="w-4 h-4" style={{ color: PRIMARY }} /> Rezervovat techniku</div>
          <div className="flex flex-wrap items-end gap-2">
            <div><label className="text-[11px] text-[--muted-foreground]">Kus</label><select className={iCls} style={{ ...iStyle, minWidth: 160 }} value={res.gearId} onChange={(e) => setRes({ ...res, gearId: Number(e.target.value) })}><option value={0}>— vyber —</option>{gear.map((g) => <option key={g.id} value={g.id}>{g.nazev}</option>)}</select></div>
            <div><label className="text-[11px] text-[--muted-foreground]">Od</label><input type="date" className={iCls} style={iStyle} value={res.od} onChange={(e) => setRes({ ...res, od: e.target.value })} /></div>
            <div><label className="text-[11px] text-[--muted-foreground]">Do</label><input type="date" className={iCls} style={iStyle} value={res.do} min={res.od} onChange={(e) => setRes({ ...res, do: e.target.value })} /></div>
            <div><label className="text-[11px] text-[--muted-foreground]">Kdo</label><input className={iCls} style={{ ...iStyle, width: 120 }} value={kdo} onChange={(e) => setRes({ ...res, kdo: e.target.value })} /></div>
            <div className="flex-1"><label className="text-[11px] text-[--muted-foreground]">Projekt</label><input className={iCls} style={{ ...iStyle, width: "100%" }} placeholder="Na co" value={res.projekt} onChange={(e) => setRes({ ...res, projekt: e.target.value })} /></div>
            <button onClick={reserve} disabled={!res.gearId || !!conflict} className="btn-tactile flex items-center gap-1.5 px-3.5 py-2 rounded-[7px] text-[13px] font-semibold disabled:opacity-40" style={{ background: PRIMARY, color: "white" }}><Check className="w-4 h-4" /> Rezervovat</button>
          </div>
          {conflict && <div className="flex items-center gap-2 mt-2 text-[12px]" style={{ color: RED }}><AlertTriangle className="w-3.5 h-3.5" /> Kolize — {gear.find((g) => g.id === res.gearId)?.nazev} je v tomto termínu už rezervovaný ({conflict.kdo}, {fmtDate(conflict.od)}–{fmtDate(conflict.do)}).</div>}
        </div>
      )}

      {/* Calendar */}
      {gear.length > 0 && <Calendar gear={gear} reservations={reservations} />}

      {/* Inventory */}
      <h2 className="text-[12px] font-bold uppercase tracking-[0.1em] text-[--muted-foreground] mb-3 mt-8">Sklad ({gear.length})</h2>
      {gear.length === 0 ? (
        <div className="rounded-[12px] p-8 text-center" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <Camera className="w-7 h-7 mx-auto mb-2" style={{ color: PRIMARY, opacity: 0.6 }} />
          <p className="text-[13px] text-[--muted-foreground]">Zatím žádná technika. {isAdmin ? "Přidej první tlačítkem nahoře." : "Admin přidá techniku."}</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 mb-8">
          {gear.map((g) => {
            const now = reservedNow(reservations, g.id);
            const next = !now ? nextReservation(reservations, g.id) : undefined;
            return (
              <div key={g.id} className="rounded-[12px] overflow-hidden" style={{ background: "var(--card)", border: `1px solid ${now ? "oklch(0.65 0.22 25 / 0.45)" : "var(--border)"}` }}>
                <GearPhoto fotoUrl={g.fotoUrl} nazev={g.nazev} />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[14px] font-bold">{g.nazev}</div>
                      <div className="text-[11px] text-[--muted-foreground]">{g.kategorie}{g.poznamka ? ` · ${g.poznamka}` : ""}</div>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1">
                        <button onClick={() => setGearForm({ id: g.id, nazev: g.nazev, kategorie: g.kategorie, poznamka: g.poznamka, fotoUrl: g.fotoUrl ?? "" })} className="btn-tactile p-1 rounded-[5px] opacity-60" style={{ border: "1px solid var(--border)" }}><Edit2 className="w-3 h-3" /></button>
                        <button onClick={() => delGear(g.id)} className="btn-tactile p-1 rounded-[5px] opacity-60" style={{ border: "1px solid var(--border)" }}><Trash2 className="w-3 h-3" /></button>
                      </div>
                    )}
                  </div>
                  <div className="mt-3">
                    {now ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-[6px] text-[11px] font-bold" style={{ color: RED, background: "oklch(0.65 0.22 25 / 0.12)" }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: RED }} /> Rezervováno · {now.kdo} do {fmtDate(now.do)}</span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-[6px] text-[11px] font-bold" style={{ color: GREEN, background: "oklch(0.67 0.155 155 / 0.12)" }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: GREEN }} /> Volné{next ? ` · další ${fmtDate(next.od)}` : ""}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upcoming reservations */}
      {upcoming.length > 0 && (
        <>
          <h2 className="text-[12px] font-bold uppercase tracking-[0.1em] text-[--muted-foreground] mb-3">Nadcházející rezervace</h2>
          <div className="rounded-[10px] overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            <table className="w-full text-left text-[13px]"><tbody>
              {upcoming.map((r) => {
                const g = gear.find((x) => x.id === r.gearId);
                return (
                  <tr key={r.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                    <td className="px-4 py-2.5 font-medium">{g?.nazev ?? "—"}</td>
                    <td className="px-4 py-2.5 text-[--muted-foreground]">{r.kdo}</td>
                    <td className="px-4 py-2.5">{fmtDate(r.od)} – {fmtDate(r.do)}</td>
                    <td className="px-4 py-2.5 text-[--muted-foreground]">{r.projekt}</td>
                    <td className="px-4 py-2.5 text-right">{(isAdmin || r.kdo === user.displayName) && <button onClick={() => delRes(r.id)} className="btn-tactile p-1 rounded-[5px]" style={{ border: "1px solid var(--border)" }}><X className="w-3 h-3" /></button>}</td>
                  </tr>
                );
              })}
            </tbody></table>
          </div>
        </>
      )}

      <AnimatePresence>
        {toast && <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-[8px] text-[13px] font-medium shadow-lg" style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }}>{toast}</motion.div>}
      </AnimatePresence>
    </div>
  );
}

/* ── Měsíční kalendář obsazenosti ── */
function Calendar({ gear, reservations }: { gear: GearItem[]; reservations: GearReservation[] }) {
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [gearId, setGearId] = useState(0);

  const y = month.getFullYear(), m = month.getMonth();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const firstWeekday = (new Date(y, m, 1).getDay() + 6) % 7; // Po=0
  const label = month.toLocaleDateString("cs-CZ", { month: "long", year: "numeric" });
  const iso = (d: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const bookingFor = (dayIso: string) => reservations.find((r) => (gearId === 0 || r.gearId === gearId) && r.od <= dayIso && dayIso <= r.do);

  const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <div className="rounded-[12px] p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div className="text-[13px] font-semibold flex items-center gap-2"><CalendarClock className="w-4 h-4" style={{ color: PRIMARY }} /> Obsazenost</div>
        <div className="flex items-center gap-2">
          <select className="px-2.5 py-1.5 rounded-[7px] text-[12px] outline-none" style={iStyle} value={gearId} onChange={(e) => setGearId(Number(e.target.value))}>
            <option value={0}>Všechna technika</option>
            {gear.map((g) => <option key={g.id} value={g.id}>{g.nazev}</option>)}
          </select>
          <button onClick={() => setMonth(new Date(y, m - 1, 1))} className="btn-tactile p-1.5 rounded-[7px]" style={{ border: "1px solid var(--border)" }}><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-[13px] font-semibold min-w-[120px] text-center capitalize" style={{ fontFamily: "var(--font-heading)" }}>{label}</span>
          <button onClick={() => setMonth(new Date(y, m + 1, 1))} className="btn-tactile p-1.5 rounded-[7px]" style={{ border: "1px solid var(--border)" }}><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {["Po", "Út", "St", "Čt", "Pá", "So", "Ne"].map((d) => <div key={d} className="text-[10px] font-bold text-center text-[--muted-foreground] uppercase pb-1">{d}</div>)}
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const b = bookingFor(iso(d));
          const isToday = iso(d) === todayISO();
          return (
            <div key={i} title={b ? `${b.kdo}${b.projekt ? ` · ${b.projekt}` : ""}` : "Volné"} className="rounded-[6px] text-center py-2 text-[12px]"
              style={{ background: b ? "oklch(0.65 0.22 25 / 0.16)" : "var(--background)", color: b ? RED : "var(--foreground)", border: isToday ? "1px solid " + PRIMARY : "1px solid transparent", fontWeight: b ? 700 : 400 }}>
              {d}
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 mt-3 text-[11px] text-[--muted-foreground]">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: "oklch(0.65 0.22 25 / 0.4)" }} /> obsazeno</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[3px]" style={{ border: "1px solid " + PRIMARY }} /> dnes</span>
        <span>najetím na den uvidíš kdo a na co</span>
      </div>
    </div>
  );
}
