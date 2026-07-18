"use client";

import { use, useEffect, useState } from "react";

const C = { bg: "#0D0D18", card: "#16161F", text: "#fff", soft: "rgba(255,255,255,0.62)", accent: "#5B5EFF", border: "rgba(255,255,255,0.09)" };

interface Entry { datum: string; projekt: string; detail: string; status: string; poznamka: string }
interface Month { mesic: string; items: Entry[] }
interface View {
  jmeno: string; role: string; zaznamu: number;
  months: Month[];
  balance: { nadpracovane: number; nevycerpane: number } | null;
  pendingList: { type: string; datum: string; projekt: string; mesicOrigin: string }[];
}

const wrap: React.CSSProperties = {
  minHeight: "100vh", margin: 0,
  background:
    "radial-gradient(ellipse 70% 60% at 92% 0%, rgba(75,77,234,.24), transparent 58%)," +
    "radial-gradient(ellipse 62% 58% at 4% 96%, rgba(75,77,234,.26), transparent 58%)," + C.bg,
  color: C.text, fontFamily: "'Inter', system-ui, sans-serif",
  display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 18px",
};
const cardS: React.CSSProperties = { width: "100%", maxWidth: 640, background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 22, marginBottom: 16 };
const labelS: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: C.soft };

export default function ProdukceSharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [view, setView] = useState<View | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "notfound">("loading");

  useEffect(() => {
    fetch(`/api/z/${token}`).then(async (r) => {
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

  return (
    <div style={wrap}>
      {/* Hlavička */}
      <div style={cardS}>
        <p style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: C.soft, marginBottom: 8 }}>OnVision · Měsíční přehled produkce</p>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 4px", letterSpacing: "-0.02em" }}>{view.jmeno}</h1>
        <p style={{ color: C.soft, fontSize: 13 }}>{view.role} · {view.zaznamu} záznamů</p>
      </div>

      {/* Bilance dní (jen paušál) */}
      {view.balance && (view.balance.nadpracovane > 0 || view.balance.nevycerpane > 0) && (
        <div style={cardS}>
          <p style={{ ...labelS, marginBottom: 12 }}>Bilance dní k vyrovnání</p>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1, background: "rgba(91,94,255,0.10)", border: "1px solid rgba(91,94,255,0.25)", borderRadius: 12, padding: 14 }}>
              <p style={{ fontSize: 30, fontWeight: 800, lineHeight: 1, color: "#a9abff" }}>{view.balance.nadpracovane}</p>
              <p style={{ color: C.soft, fontSize: 12, marginTop: 6 }}>nadpracované dny</p>
            </div>
            <div style={{ flex: 1, background: "rgba(255,180,80,0.08)", border: "1px solid rgba(255,180,80,0.22)", borderRadius: 12, padding: 14 }}>
              <p style={{ fontSize: 30, fontWeight: 800, lineHeight: 1, color: "#ffc266" }}>{view.balance.nevycerpane}</p>
              <p style={{ color: C.soft, fontSize: 12, marginTop: 6 }}>nevyčerpané dny</p>
            </div>
          </div>
          {view.pendingList.length > 0 && (
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
              {view.pendingList.map((p, i) => (
                <div key={i} style={{ display: "flex", gap: 8, fontSize: 13, alignItems: "center" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99, background: p.type === "NADPRACOVANÉ" ? "rgba(91,94,255,0.16)" : "rgba(255,180,80,0.16)", color: p.type === "NADPRACOVANÉ" ? "#a9abff" : "#ffc266" }}>{p.type}</span>
                  <span style={{ color: C.text }}>{p.projekt}</span>
                  <span style={{ color: C.soft }}>{p.datum} · {p.mesicOrigin}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Co se natáčelo/dělalo — po měsících */}
      {view.months.map((m) => (
        <div key={m.mesic} style={cardS}>
          <p style={{ ...labelS, marginBottom: 12 }}>{m.mesic} · {m.items.length}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {m.items.map((e, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 0", borderBottom: i < m.items.length - 1 ? `1px solid ${C.border}` : "none" }}>
                <span style={{ width: 46, flexShrink: 0, fontSize: 12, color: C.soft, paddingTop: 1 }}>{e.datum || "—"}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 600 }}>{e.projekt}</p>
                  <p style={{ fontSize: 12.5, color: C.soft, marginTop: 1 }}>{e.detail}{e.poznamka ? ` · ${e.poznamka}` : ""}</p>
                </div>
                <span style={{ fontSize: 14, flexShrink: 0 }}>{e.status}</span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {view.months.length === 0 && (
        <div style={cardS}><p style={{ color: C.soft, fontSize: 14, textAlign: "center" }}>Zatím žádné záznamy.</p></div>
      )}

      <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, marginTop: 8 }}>OnVision s.r.o. · náhledový odkaz jen pro tebe · nelze upravovat</p>
    </div>
  );
}
