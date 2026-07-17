"use client";

import { use, useEffect, useState } from "react";

const C = { bg: "#0D0D18", card: "#16161F", text: "#fff", soft: "rgba(255,255,255,0.62)", accent: "#5B5EFF", border: "rgba(255,255,255,0.09)" };

interface Brief { lokace?: string; technika?: string; scenar?: string; poznamka?: string; outputLink?: string; outputNote?: string; updatedAt?: string }
interface View {
  title: string; klient: string; typ: string; datum: string; faze: string;
  tym: string[]; ukoly: { text: string; done: boolean; prirazeno?: string }[];
  poznamka: string; brief: Brief;
}

const wrap: React.CSSProperties = {
  minHeight: "100vh", margin: 0,
  background:
    "radial-gradient(ellipse 70% 60% at 92% 0%, rgba(75,77,234,.24), transparent 58%)," +
    "radial-gradient(ellipse 62% 58% at 4% 96%, rgba(75,77,234,.26), transparent 58%)," + C.bg,
  color: C.text, fontFamily: "'Inter', system-ui, sans-serif",
  display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 18px",
};
const cardS: React.CSSProperties = { width: "100%", maxWidth: 620, background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, marginBottom: 16 };
const labelS: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: C.soft, marginBottom: 6 };
const inputS: React.CSSProperties = { width: "100%", background: "rgba(255,255,255,0.05)", border: `1px solid ${C.border}`, borderRadius: 9, color: C.text, padding: "10px 12px", fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box" };

export default function ProjectSharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [view, setView] = useState<View | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "notfound">("loading");
  const [f, setF] = useState<Brief>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/p/${token}`).then(async (r) => {
      if (!r.ok) { setState("notfound"); return; }
      const v: View = await r.json();
      setView(v); setF(v.brief ?? {}); setState("ok");
    }).catch(() => setState("notfound"));
  }, [token]);

  const submit = async () => {
    setSaving(true); setSaved(false);
    try {
      const r = await fetch(`/api/p/${token}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      if (r.ok) setSaved(true);
    } finally { setSaving(false); }
  };

  if (state === "loading") return <div style={{ ...wrap, justifyContent: "center", color: C.soft }}>Načítám…</div>;
  if (state === "notfound" || !view) return (
    <div style={{ ...wrap, justifyContent: "center", textAlign: "center" }}>
      <div style={cardS}>
        <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Odkaz nenalezen</p>
        <p style={{ color: C.soft, fontSize: 14 }}>Zkontroluj prosím odkaz, nebo si vyžádej nový.</p>
      </div>
    </div>
  );

  const set = (k: keyof Brief, v: string) => setF((p) => ({ ...p, [k]: v }));

  return (
    <div style={wrap}>
      {/* Hlavička projektu — bez ceny */}
      <div style={cardS}>
        <p style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: C.soft, marginBottom: 8 }}>OnVision · Externí spolupráce</p>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 6px", letterSpacing: "-0.02em" }}>{view.title}</h1>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", color: C.soft, fontSize: 13 }}>
          <span style={{ padding: "3px 9px", borderRadius: 99, background: "rgba(91,94,255,0.14)", color: "#a9abff", fontWeight: 600 }}>{view.typ}</span>
          <span>{view.klient}</span>
          {view.datum && <span>· {view.datum}</span>}
          <span>· {view.faze}</span>
        </div>
        {view.tym.length > 0 && <p style={{ color: C.soft, fontSize: 13, marginTop: 10 }}>Tým: {view.tym.join(", ")}</p>}
        {view.poznamka && <p style={{ fontSize: 14, lineHeight: 1.6, marginTop: 12 }}>{view.poznamka}</p>}
      </div>

      {/* Úkoly / podklady */}
      {view.ukoly.length > 0 && (
        <div style={cardS}>
          <p style={{ ...labelS, marginBottom: 12 }}>Co je potřeba</p>
          {view.ukoly.map((u, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "7px 0", borderBottom: i < view.ukoly.length - 1 ? `1px solid ${C.border}` : "none" }}>
              <span style={{ width: 16, height: 16, marginTop: 2, borderRadius: 4, flexShrink: 0, background: u.done ? "#3fbf6f" : "rgba(255,255,255,0.06)", border: u.done ? "none" : `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>{u.done ? "✓" : ""}</span>
              <span style={{ fontSize: 14, color: u.done ? C.soft : C.text, textDecoration: u.done ? "line-through" : "none" }}>{u.text}{u.prirazeno ? ` · ${u.prirazeno}` : ""}</span>
            </div>
          ))}
        </div>
      )}

      {/* Vstupní info od externisty */}
      <div style={cardS}>
        <p style={{ ...labelS, marginBottom: 4 }}>Doplň informace k projektu</p>
        <p style={{ color: C.soft, fontSize: 13, marginBottom: 16 }}>Vyplň, co je za tebe potřeba domluvit. Uloží se rovnou do systému OnVision.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div><label style={labelS}>Lokace</label><input style={inputS} value={f.lokace ?? ""} onChange={(e) => set("lokace", e.target.value)} placeholder="Kde se točí / fotí" /></div>
          <div><label style={labelS}>Technika</label><input style={inputS} value={f.technika ?? ""} onChange={(e) => set("technika", e.target.value)} placeholder="Co si vezmeš (kamera, objektivy, světla…)" /></div>
          <div><label style={labelS}>Scénář / poznámky</label><textarea style={{ ...inputS, minHeight: 100, resize: "vertical" }} value={f.scenar ?? ""} onChange={(e) => set("scenar", e.target.value)} placeholder="Postup, záběry, nápady…" /></div>
        </div>
      </div>

      {/* Výstup */}
      <div style={cardS}>
        <p style={{ ...labelS, marginBottom: 4 }}>Odevzdání výstupu</p>
        <p style={{ color: C.soft, fontSize: 13, marginBottom: 16 }}>Až budeš hotový/á, vlož odkaz na stažení (Drive, WeTransfer…).</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div><label style={labelS}>Odkaz na stažení</label><input style={inputS} value={f.outputLink ?? ""} onChange={(e) => set("outputLink", e.target.value)} placeholder="https://…" /></div>
          <div><label style={labelS}>Poznámka k výstupu</label><input style={inputS} value={f.outputNote ?? ""} onChange={(e) => set("outputNote", e.target.value)} placeholder="Např. verze, heslo k archivu…" /></div>
        </div>
      </div>

      <div style={{ width: "100%", maxWidth: 620, display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={submit} disabled={saving} style={{ flex: 1, background: C.accent, color: "#fff", border: "none", borderRadius: 10, padding: "13px", fontSize: 15, fontWeight: 700, cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
          {saving ? "Ukládám…" : "Uložit a odeslat"}
        </button>
        {saved && <span style={{ color: "#3fbf6f", fontSize: 14, fontWeight: 600 }}>✓ Uloženo, díky!</span>}
      </div>
      <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, marginTop: 20 }}>OnVision s.r.o. · bezpečný odkaz jen pro tento projekt</p>
    </div>
  );
}
