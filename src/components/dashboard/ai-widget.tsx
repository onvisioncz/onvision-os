"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Send, Bot, ChevronDown } from "lucide-react";

/* ── Prop types (mirrors dashboard types — no import needed) ─────────────── */
interface Task {
  id: number;
  nazev: string;
  projekt: string;
  prirazeno: string;
  priorita: "Nízká" | "Střední" | "Vysoká" | "Urgentní";
  status: "Nové" | "Probíhá" | "Review" | "Hotovo";
  deadline: string;
}
interface Deal {
  id: number;
  klient: string;
  faze: string;
  hodnota: number;
  pravdepodobnost: number;
}
interface Approval {
  id: number;
  typ: string;
  klient: string;
  popis: string;
  castka?: number;
  status: "Čeká" | "Schváleno" | "Zamítnuto";
}
interface Client {
  id: number;
  name: string;
  pausal: number;
  aktivni: boolean;
}
interface MonthSummary {
  mesic: string;
  prijemCelkovy: number;
  vydaje: number;
  prijemCisty: number;
}

export interface DashboardAIWidgetProps {
  tasks: Task[];
  deals: Deal[];
  approvals: Approval[];
  clients: Client[];
  summaries: MonthSummary[];
  todayLabel: string;
  userName: string;
}

interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
}

/* ── Quick questions ─────────────────────────────────────────────────────── */
const QUICK = [
  { emoji: "🔥", label: "Nejdůležitější úkol?",       prompt: "Který úkol bych měl řešit jako první? Seřaď podle priority a deadlinu." },
  { emoji: "⏳", label: "Co čeká na schválení?",       prompt: "Co aktuálně čeká na moje schválení? Vypiš přehledně." },
  { emoji: "📊", label: "Jak vypadá pipeline?",        prompt: "Shrň mi aktuální stav obchodní pipeline — které dealy jsou nejblíže k uzavření?" },
  { emoji: "📋", label: "Shrnutí dnešní situace",      prompt: "Dej mi rychlé shrnutí: co hoří, co čeká, na co si dát pozor dnes." },
  { emoji: "📅", label: "Deadliny tento týden",        prompt: "Které úkoly mají deadline tento nebo příští týden? Seřaď chronologicky." },
  { emoji: "💰", label: "Finanční situace",            prompt: "Jak vypadá finanční situace? Shrň příjmy, výdaje a trend posledních měsíců." },
];

/* ── System prompt builder ───────────────────────────────────────────────── */
function buildSystemPrompt(props: DashboardAIWidgetProps): string {
  const { tasks, deals, approvals, clients, summaries, todayLabel } = props;

  const activeTasks = tasks.filter(t => t.status !== "Hotovo");
  const pendingApprovals = approvals.filter(a => a.status === "Čeká");
  const activeClients = clients.filter(c => c.aktivni);

  const taskLines = activeTasks.length > 0
    ? activeTasks.map(t =>
        `  - [${t.priorita}] ${t.nazev} | projekt: ${t.projekt} | přiřazeno: ${t.prirazeno} | deadline: ${t.deadline} | stav: ${t.status}`
      ).join("\n")
    : "  (žádné aktivní úkoly)";

  const dealLines = deals.length > 0
    ? deals.map(d =>
        `  - ${d.klient} | fáze: ${d.faze} | hodnota: ${d.hodnota.toLocaleString("cs-CZ")} Kč | pravděpodobnost: ${d.pravdepodobnost}%`
      ).join("\n")
    : "  (žádné dealy v pipeline)";

  const approvalLines = pendingApprovals.length > 0
    ? pendingApprovals.map(a =>
        `  - ${a.typ} | ${a.klient} | ${a.popis}${a.castka ? ` | ${a.castka.toLocaleString("cs-CZ")} Kč` : ""}`
      ).join("\n")
    : "  (nic nečeká na schválení)";

  const clientLines = activeClients.length > 0
    ? activeClients.map(c => `${c.name} (${c.pausal.toLocaleString("cs-CZ")} Kč/měs.)`).join(", ")
    : "(žádní aktivní klienti)";

  const financeLines = summaries.slice(-4).map(s =>
    `  - ${s.mesic}: příjmy ${s.prijemCelkovy.toLocaleString("cs-CZ")} Kč | výdaje ${s.vydaje.toLocaleString("cs-CZ")} Kč | čistý: ${s.prijemCisty.toLocaleString("cs-CZ")} Kč`
  ).join("\n") || "  (bez dat)";

  return `Jsi AI asistent přímo na dashboardu agentury OnVision. Odpovídáš stručně, jasně, česky. Žádné zbytečné úvody. Jsi přístupný jen pro jednatele — Adam Mendrek a Jan Kříž.

Dnešní datum: ${todayLabel}

=== AKTUÁLNÍ DATA ZE SYSTÉMU ===

ÚKOLY (aktivní: ${activeTasks.length} z ${tasks.length}):
${taskLines}

OBCHODNÍ PIPELINE (${deals.length} dealů):
${dealLines}

SCHVÁLENÍ čekající na akci (${pendingApprovals.length}):
${approvalLines}

AKTIVNÍ MĚSÍČNÍ KLIENTI (${activeClients.length}):
${clientLines}

FINANCE — posledních ${summaries.slice(-4).length} měsíce:
${financeLines}

=== KONEC DAT ===

Odpovídej na základě těchto dat. Pokud se ptají na něco co v datech není, řekni to upřímně.`;
}

/* ── Inline markdown (bold + bullet) ────────────────────────────────────── */
function renderSimple(text: string) {
  return text.split("\n").map((line, i) => {
    if (line.match(/^[-•]\s/)) return (
      <div key={i} className="flex gap-2 items-start">
        <span className="shrink-0 mt-[6px] w-1 h-1 rounded-full" style={{ background: "oklch(0.62 0.27 265)" }} />
        <span className="text-[12px] leading-relaxed" style={{ color: "oklch(0.78 0.005 265)" }}>
          {boldify(line.slice(2))}
        </span>
      </div>
    );
    if (/^\d+\.\s/.test(line)) {
      const m = line.match(/^(\d+)\.\s(.*)/)!;
      return (
        <div key={i} className="flex gap-1.5 items-start">
          <span className="text-[10px] font-bold shrink-0 mt-0.5" style={{ color: "oklch(0.62 0.27 265)" }}>{m[1]}.</span>
          <span className="text-[12px] leading-relaxed" style={{ color: "oklch(0.78 0.005 265)" }}>{boldify(m[2])}</span>
        </div>
      );
    }
    if (line.trim() === "") return <div key={i} className="h-1" />;
    return <p key={i} className="text-[12px] leading-relaxed" style={{ color: "oklch(0.78 0.005 265)" }}>{boldify(line)}</p>;
  });
}

function boldify(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**")
      ? <strong key={i} style={{ color: "oklch(0.9 0.005 265)", fontWeight: 600 }}>{p.slice(2, -2)}</strong>
      : p
  );
}

/* ── Widget ──────────────────────────────────────────────────────────────── */
export function DashboardAIWidget(props: DashboardAIWidgetProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  async function send(text: string) {
    if (!text.trim() || loading) return;

    const userMsg: ChatMsg = { id: `u${Date.now()}`, role: "user", content: text.trim() };
    const aiId = `a${Date.now()}`;

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setMessages(prev => [...prev, { id: aiId, role: "assistant", content: "" }]);

    const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));
    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/ai/stream", {
        method: "POST",
        signal: abortRef.current.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt: buildSystemPrompt(props),
          messages: history,
          model: "sonnet",
          maxTokens: 1024,
        }),
      });

      if (!res.ok || !res.body) throw new Error();
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === "content_block_delta" && parsed.delta?.type === "text_delta") {
              setMessages(prev => prev.map(m =>
                m.id === aiId ? { ...m, content: m.content + parsed.delta.text } : m
              ));
            }
          } catch { /* skip */ }
        }
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") return;
      setMessages(prev => prev.map(m =>
        m.id === aiId ? { ...m, content: "Nastala chyba. Zkus znovu." } : m
      ));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">

      {/* Expanded panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="flex flex-col rounded-[16px] overflow-hidden"
            style={{
              width: 360,
              height: 480,
              background: "oklch(0.10 0.008 222)",
              border: "1px solid oklch(1 0 0 / 0.12)",
              boxShadow: "0 24px 64px oklch(0 0 0 / 0.55), 0 0 0 1px oklch(0.62 0.27 265 / 0.08)",
            }}
          >
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between px-4 py-3"
              style={{ borderBottom: "1px solid oklch(1 0 0 / 0.08)" }}>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-[8px] flex items-center justify-center"
                  style={{ background: "oklch(0.62 0.27 265 / 0.15)", border: "1px solid oklch(0.62 0.27 265 / 0.3)" }}>
                  <Sparkles className="w-3.5 h-3.5" style={{ color: "oklch(0.72 0.18 265)" }} />
                </div>
                <div>
                  <p className="text-[13px] font-bold leading-none" style={{ color: "oklch(0.94 0.01 265)", fontFamily: "var(--font-outfit)" }}>
                    AI Asistent
                  </p>
                  <p className="text-[9px] mt-0.5" style={{ color: "oklch(0.35 0.005 222)" }}>
                    Ví o tvých datech v systému
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {messages.length > 0 && (
                  <button onClick={() => setMessages([])}
                    className="text-[9px] px-2 py-1 rounded-[5px]"
                    style={{ color: "oklch(0.38 0.005 222)", background: "oklch(1 0 0 / 0.04)" }}>
                    Smazat
                  </button>
                )}
                <button onClick={() => setOpen(false)} style={{ color: "oklch(0.38 0.005 222)" }}>
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages / quick actions */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
              {messages.length === 0 ? (
                <div className="space-y-2.5">
                  <p className="text-[10px] px-1 font-semibold uppercase tracking-wider" style={{ color: "oklch(0.32 0.005 222)" }}>
                    Zeptej se na cokoliv z tvého systému
                  </p>
                  {QUICK.map((q, i) => (
                    <motion.button
                      key={i}
                      onClick={() => send(q.prompt)}
                      whileTap={{ scale: 0.97 }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-left"
                      style={{ background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.08)" }}
                    >
                      <span className="text-base leading-none shrink-0">{q.emoji}</span>
                      <span className="text-[12px] font-medium" style={{ color: "oklch(0.65 0.005 265)" }}>
                        {q.label}
                      </span>
                    </motion.button>
                  ))}
                </div>
              ) : (
                <>
                  {messages.map((msg, i) => (
                    <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                      <div className="w-5 h-5 rounded-full shrink-0 mt-0.5 flex items-center justify-center text-[9px] font-bold"
                        style={msg.role === "user" ? {
                          background: "oklch(0.62 0.27 265)",
                          color: "oklch(0.97 0.004 265)",
                        } : {
                          background: "oklch(0.16 0.01 265)",
                          border: "1px solid oklch(0.62 0.27 265 / 0.3)",
                          color: "oklch(0.72 0.18 265)",
                        }}
                      >
                        {msg.role === "user" ? "Ty" : <Bot className="w-2.5 h-2.5" />}
                      </div>
                      <div className={`max-w-[85%] px-3 py-2 rounded-[10px] ${msg.role === "user" ? "" : ""}`}
                        style={msg.role === "user" ? {
                          background: "oklch(0.62 0.27 265 / 0.14)",
                          border: "1px solid oklch(0.62 0.27 265 / 0.22)",
                          borderBottomRightRadius: 3,
                        } : {
                          background: "oklch(1 0 0 / 0.04)",
                          border: "1px solid oklch(1 0 0 / 0.08)",
                          borderBottomLeftRadius: 3,
                        }}
                      >
                        {msg.role === "user" ? (
                          <p className="text-[12px] leading-relaxed whitespace-pre-wrap" style={{ color: "oklch(0.88 0.005 265)" }}>
                            {msg.content}
                          </p>
                        ) : (
                          <div className="space-y-0.5">
                            {renderSimple(msg.content)}
                            {loading && i === messages.length - 1 && (
                              <motion.span
                                className="inline-block w-1 h-3.5 rounded-sm ml-0.5 align-middle"
                                style={{ background: "oklch(0.62 0.27 265)" }}
                                animate={{ opacity: [1, 0] }}
                                transition={{ duration: 0.6, repeat: Infinity }}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </>
              )}
            </div>

            {/* Input */}
            <div className="shrink-0 px-3 pb-3 pt-2" style={{ borderTop: "1px solid oklch(1 0 0 / 0.07)" }}>
              <div className="flex items-center gap-2 px-3 py-2 rounded-[10px]"
                style={{ background: "oklch(1 0 0 / 0.05)", border: "1px solid oklch(1 0 0 / 0.1)" }}>
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") send(input); }}
                  placeholder="Zeptej se na cokoliv..."
                  className="flex-1 bg-transparent outline-none text-[12px]"
                  style={{ color: "oklch(0.88 0.005 265)" }}
                />
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  onClick={() => send(input)}
                  disabled={!input.trim() || loading}
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    background: input.trim() && !loading ? "oklch(0.62 0.27 265)" : "oklch(0.62 0.27 265 / 0.15)",
                    color: input.trim() && !loading ? "oklch(0.97 0.004 265)" : "oklch(0.42 0.005 222)",
                  }}
                >
                  {loading ? (
                    <motion.div className="w-3 h-3 rounded-full"
                      style={{ border: "1.5px solid oklch(0.62 0.27 265 / 0.3)", borderTopColor: "oklch(0.62 0.27 265)" }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                    />
                  ) : (
                    <Send className="w-3 h-3" />
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trigger button */}
      <motion.button
        onClick={() => setOpen(p => !p)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex items-center gap-2 px-4 py-3 rounded-full"
        style={{
          background: open ? "oklch(0.62 0.27 265)" : "oklch(0.12 0.01 265)",
          border: `1px solid ${open ? "oklch(0.72 0.18 265)" : "oklch(0.62 0.27 265 / 0.4)"}`,
          boxShadow: "0 4px 24px oklch(0.62 0.27 265 / 0.25)",
          color: open ? "oklch(0.97 0.004 265)" : "oklch(0.72 0.18 265)",
        }}
        animate={!open ? {
          boxShadow: ["0 4px 24px oklch(0.62 0.27 265 / 0.2)", "0 4px 32px oklch(0.62 0.27 265 / 0.4)", "0 4px 24px oklch(0.62 0.27 265 / 0.2)"],
        } : {}}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <Sparkles className="w-4 h-4" />
        <span className="text-[13px] font-semibold" style={{ fontFamily: "var(--font-outfit)" }}>
          {open ? "Zavřít" : "AI Asistent"}
        </span>
        {!open && messages.length > 0 && (
          <span className="w-2 h-2 rounded-full" style={{ background: "oklch(0.68 0.18 155)" }} />
        )}
      </motion.button>
    </div>
  );
}
