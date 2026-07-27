"use client";

import { use, useEffect, useState } from "react";

const C = { bg: "#0D0D18", card: "#16161F", text: "#fff", soft: "rgba(255,255,255,0.62)", accent: "#5B5EFF", border: "rgba(255,255,255,0.09)" };

interface View {
  projekt: string; klient: string; datum: string;
  casZacatek: string; casKonec: string; sraz: string; lokace: string;
  scenar: string; podklady: string; kontakt: string; poznamka: string;
  tym: { jmeno: string; ukol: string }[];
}

const wrap: React.CSSProperties = {
  minHeight: "100vh", margin: 0,
  background:
    "radial-gradient(ellipse 70% 60% at 92% 0%, rgba(75,77,234,.24), transparent 58%)," +
    "radial-gradient(ellipse 62% 58% at 4% 96%, rgba(75,77,234,.26), transparent 58%)," + C.bg,
  color: C.text, fontFamily: "'Inter', system-ui, sans-serif",
  display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 18px",
};
const cardS: React.CSSProperties = { width: "100%", maxWidth: 620, background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 22, marginBottom: 16 };
const labelS: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: C.soft, marginBottom: 8 };

function Line({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", gap: 10, fontSize: 14, marginBottom: 8 }}>
      <span style={{ color: C.soft, minWidth: 92, flexShrink: 0 }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

export default function AkceSharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [view, setView] = useState<View | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "notfound">("loading");

  useEffect(() => {
    fetch(`/api/a/${token}`).then(async (r) => {
      if (!r.ok) { setState("notfound"); return; }
      setView(await r.json()); setState("ok");
    }).catch(() => setState("notfound"));
  }, [token]);

  if (state === "loading") return <div style={{ ...wrap, justifyContent: "center", color: C.soft }}>Načítám…</div>;
  if (state === "notfound" || !view) return (
    <div style={{ ...wrap, justifyContent: "center", textAlign: "center" }}>
      <div style={cardS}>
        <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Odkaz nenalezen</p>
        <p style={{ color: C.soft, fontSize: 14 }}>Zkontroluj prosím odkaz, nebo si vyžádej nový.</p>
      </div>
    </div>
  );

  const cas = [view.casZacatek, view.casKonec].filter(Boolean).join("–");

  return (
    <div style={wrap}>
      <div style={cardS}>
        <p style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: C.soft, marginBottom: 8 }}>OnVision · Detaily akce</p>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 4px", letterSpacing: "-0.02em" }}>{view.projekt}</h1>
        <p style={{ color: C.soft, fontSize: 13 }}>{view.klient}{view.datum ? ` · ${view.datum}` : ""}</p>
      </div>

      {(cas || view.sraz || view.lokace || view.kontakt) && (
        <div style={cardS}>
          <p style={labelS}>Logistika</p>
          <Line label="Čas" value={cas} />
          <Line label="Sraz" value={view.sraz} />
          <Line label="Lokace" value={view.lokace} />
          <Line label="Kontakt" value={view.kontakt} />
        </div>
      )}

      {(view.scenar || view.podklady || view.poznamka) && (
        <div style={cardS}>
          <p style={labelS}>Scénář &amp; podklady</p>
          {view.scenar && <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: view.podklady || view.poznamka ? 12 : 0 }}>{view.scenar}</p>}
          {view.podklady && <a href={view.podklady} target="_blank" rel="noopener noreferrer" style={{ color: C.accent, fontSize: 14, fontWeight: 600, display: "inline-block", marginBottom: view.poznamka ? 10 : 0 }}>Otevřít podklady →</a>}
          {view.poznamka && <p style={{ fontSize: 13, color: C.soft }}>{view.poznamka}</p>}
        </div>
      )}

      {view.tym.length > 0 && (
        <div style={cardS}>
          <p style={labelS}>Tým · {view.tym.length}</p>
          {view.tym.map((t, i) => (
            <div key={i} style={{ display: "flex", gap: 10, fontSize: 14, padding: "7px 0", borderBottom: i < view.tym.length - 1 ? `1px solid ${C.border}` : "none" }}>
              <span style={{ fontWeight: 600, minWidth: 100 }}>{t.jmeno}</span>
              <span style={{ color: C.soft }}>{t.ukol}</span>
            </div>
          ))}
        </div>
      )}

      <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, marginTop: 8 }}>OnVision s.r.o. · detaily akce · odkaz jen pro účastníky</p>
    </div>
  );
}
