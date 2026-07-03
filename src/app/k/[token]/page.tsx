"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { embedUrl, type ClientApproval, type ReportLink } from "@/lib/clientshare";

const C = { bg: "#0D0D18", card: "#16161F", mid: "#11111C", text: "#fff", soft: "rgba(255,255,255,0.62)", muted: "rgba(255,255,255,0.4)", accent: "#5B5EFF", green: "#4ade80", amber: "#f0b23e", border: "rgba(255,255,255,0.1)" };
const H = "'Space Grotesk', system-ui, sans-serif";

interface Invoice { cislo: string; castka: number; datumVystaveni: string; datumSplatnosti: string; stav: string }
interface Data { klient: string; reportLinks: ReportLink[]; approvals: ClientApproval[]; invoices: Invoice[] }

const fmtKc = (n: number) => new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(n || 0);

export default function ClientSharePage() {
  const params = useParams();
  const token = String(params.token);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<"schvaleni" | "reporty" | "faktury" | "nps">("schvaleni");

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/k/${token}`);
      if (!res.ok) { setNotFound(true); return; }
      setData(await res.json());
    } catch { setNotFound(true); }
    finally { setLoading(false); }
  }, [token]);
  useEffect(() => { load(); }, [load]);

  const wrap: React.CSSProperties = {
    minHeight: "100vh", background: "radial-gradient(ellipse 70% 60% at 92% 0%, rgba(75,77,234,.26), transparent 58%),radial-gradient(ellipse 62% 58% at 4% 96%, rgba(75,77,234,.28), transparent 58%)," + C.bg,
    color: C.text, fontFamily: "'Inter', system-ui, sans-serif", padding: "36px 18px",
  };

  if (loading) return <div style={wrap}><p style={{ color: C.soft, textAlign: "center", marginTop: 60 }}>Načítám…</p></div>;
  if (notFound || !data) return <div style={wrap}><div style={{ textAlign: "center", marginTop: 70, color: C.soft }}><div style={{ fontFamily: H, fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 8 }}>OnVision</div>Odkaz nenalezen nebo vypršel.</div></div>;

  const tabs: [typeof tab, string][] = [["schvaleni", "Ke schválení"], ["reporty", "Reporty"], ["faktury", "Faktury"], ["nps", "Spokojenost"]];

  return (
    <div style={wrap}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ fontFamily: H, fontSize: 22, fontWeight: 700 }}>OnVision</div>
        <h1 style={{ fontFamily: H, fontSize: 26, fontWeight: 700, margin: "14px 0 4px" }}>Klientská nástěnka</h1>
        <p style={{ color: C.soft, marginBottom: 22 }}>{data.klient}</p>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 22 }}>
          {tabs.map(([id, lbl]) => (
            <button key={id} onClick={() => setTab(id)} style={{ padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "1px solid " + (tab === id ? "transparent" : C.border), background: tab === id ? C.accent : "transparent", color: tab === id ? "#fff" : C.soft }}>{lbl}</button>
          ))}
        </div>

        {tab === "schvaleni" && <Schvaleni approvals={data.approvals} token={token} onChange={load} />}
        {tab === "reporty" && <Reporty links={data.reportLinks} />}
        {tab === "faktury" && <Faktury invoices={data.invoices} />}
        {tab === "nps" && <Nps token={token} />}

        <p style={{ color: C.muted, fontSize: 12, marginTop: 34, textAlign: "center" }}>OnVision s.r.o. · www.onvision.cz</p>
      </div>
    </div>
  );
}

/* ── Schválení + komentáře ── */
function Schvaleni({ approvals, token, onChange }: { approvals: ClientApproval[]; token: string; onChange: () => void }) {
  if (approvals.length === 0) return <Empty text="Nic ke schválení. Jakmile budeme mít obsah, objeví se tady." />;
  return <div style={{ display: "grid", gap: 16 }}>{approvals.map((a) => <ApprovalCard key={a.id} a={a} token={token} onChange={onChange} />)}</div>;
}

function ApprovalCard({ a, token, onChange }: { a: ClientApproval; token: string; onChange: () => void }) {
  const [cas, setCas] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const emb = embedUrl(a.videoUrl);
  const statusColor = a.status === "Schváleno" ? C.green : a.status === "Vráceno" ? C.amber : C.soft;

  const post = async (payload: Record<string, unknown>) => {
    setBusy(true);
    try { await fetch(`/api/k/${token}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); await onChange(); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 14, padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontFamily: H, fontWeight: 700, fontSize: 16 }}>{a.nazev}</div>
        <span style={{ fontSize: 12, fontWeight: 700, color: statusColor }}>{a.status}</span>
      </div>
      {a.popis ? <p style={{ color: C.soft, fontSize: 14, margin: "0 0 12px" }}>{a.popis}</p> : null}
      {emb ? <iframe src={emb} allowFullScreen style={{ width: "100%", aspectRatio: "16/9", border: 0, borderRadius: 10, marginBottom: 12 }} />
        : a.videoUrl ? <a href={a.videoUrl} target="_blank" rel="noopener noreferrer" style={{ color: C.accent, fontSize: 14 }}>Otevřít video →</a> : null}

      {/* Comments */}
      {(a.comments?.length ?? 0) > 0 && (
        <div style={{ margin: "10px 0", display: "grid", gap: 6 }}>
          {a.comments.map((c) => (
            <div key={c.id} style={{ fontSize: 13, background: C.mid, borderRadius: 8, padding: "8px 10px" }}>
              <span style={{ color: C.accent, fontWeight: 700 }}>{c.autor}{c.cas ? ` · ${c.cas}` : ""}</span>
              <span style={{ color: C.soft }}> — {c.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Add comment */}
      <div style={{ display: "flex", gap: 6, margin: "10px 0" }}>
        <input value={cas} onChange={(e) => setCas(e.target.value)} placeholder="0:14" style={{ width: 64, padding: "8px 10px", borderRadius: 7, background: C.mid, border: "1px solid " + C.border, color: C.text, fontSize: 13 }} />
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Poznámka k záběru…" style={{ flex: 1, padding: "8px 10px", borderRadius: 7, background: C.mid, border: "1px solid " + C.border, color: C.text, fontSize: 13 }} />
        <button disabled={busy || !text.trim()} onClick={() => { post({ action: "comment", approvalId: a.id, cas, text }); setCas(""); setText(""); }} style={{ padding: "8px 14px", borderRadius: 7, border: 0, background: "rgba(91,94,255,0.2)", color: C.accent, fontWeight: 600, fontSize: 13, cursor: "pointer", opacity: busy || !text.trim() ? 0.5 : 1 }}>Přidat</button>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button disabled={busy} onClick={() => post({ action: "approve", approvalId: a.id, status: "Schváleno" })} style={{ padding: "9px 18px", borderRadius: 8, border: 0, background: "linear-gradient(120deg,#4B4DEA,#8C64FF)", color: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>✓ Schválit</button>
        <button disabled={busy} onClick={() => post({ action: "approve", approvalId: a.id, status: "Vráceno" })} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid " + C.border, background: "transparent", color: C.soft, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>↩ Vrátit k úpravě</button>
      </div>
    </div>
  );
}

function Reporty({ links }: { links: ReportLink[] }) {
  if (!links?.length) return <Empty text="Zatím žádné reporty." />;
  return <div style={{ display: "grid", gap: 10 }}>{links.map((r, i) => (
    <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: "14px 16px", textDecoration: "none", color: C.text }}>
      <span style={{ fontWeight: 600 }}>{r.title || "Report"}</span><span style={{ color: C.accent }}>Otevřít →</span>
    </a>
  ))}</div>;
}

function Faktury({ invoices }: { invoices: Invoice[] }) {
  if (!invoices?.length) return <Empty text="Žádné faktury." />;
  return (
    <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 12, overflow: "hidden" }}>
      {invoices.map((inv, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderTop: i ? "1px solid " + C.border : 0 }}>
          <div><div style={{ fontWeight: 600, fontSize: 14 }}>{inv.cislo}</div><div style={{ color: C.muted, fontSize: 12 }}>splatnost {inv.datumSplatnosti}</div></div>
          <div style={{ textAlign: "right" }}><div style={{ fontFamily: H, fontWeight: 700 }}>{fmtKc(inv.castka)}</div><div style={{ fontSize: 12, color: inv.stav === "Zaplacena" ? C.green : C.amber }}>{inv.stav}</div></div>
        </div>
      ))}
    </div>
  );
}

function Nps({ token }: { token: string }) {
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [done, setDone] = useState(false);
  const submit = async () => {
    if (score === null) return;
    await fetch(`/api/k/${token}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "nps", score, comment }) });
    setDone(true);
  };
  if (done) return <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: 22, textAlign: "center" }}><p style={{ fontSize: 15 }}>Děkujeme za hodnocení!</p></div>;
  return (
    <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: 20 }}>
      <p style={{ fontSize: 15, margin: "0 0 14px" }}>Jak pravděpodobně byste nás doporučili? (0–10)</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
        {Array.from({ length: 11 }, (_, n) => (
          <button key={n} onClick={() => setScore(n)} style={{ width: 38, height: 38, borderRadius: 8, border: "1px solid " + C.border, cursor: "pointer", fontWeight: 700, background: score === n ? C.accent : "transparent", color: score === n ? "#fff" : C.soft }}>{n}</button>
        ))}
      </div>
      <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Co bychom mohli zlepšit? (nepovinné)" style={{ width: "100%", minHeight: 70, padding: 10, borderRadius: 8, background: C.mid, border: "1px solid " + C.border, color: C.text, fontSize: 14, boxSizing: "border-box" }} />
      <button disabled={score === null} onClick={submit} style={{ marginTop: 12, padding: "11px 24px", borderRadius: 8, border: 0, background: "linear-gradient(120deg,#4B4DEA,#8C64FF)", color: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer", opacity: score === null ? 0.5 : 1 }}>Odeslat hodnocení</button>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: 28, textAlign: "center", color: C.soft, fontSize: 14 }}>{text}</div>;
}
