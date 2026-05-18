"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Sparkles, Trash2, Copy, Check,
  ChevronDown, X, Bot,
} from "lucide-react";
import { useUserRole } from "@/lib/hooks/use-user-role";

/* ── Types ─────────────────────────────────────────────────────────────── */
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  ts: number;
}

/* ── OnVision system prompt ─────────────────────────────────────────────── */
function buildSystemPrompt(clientCtx?: string) {
  return `Jsi AI asistent kreativní agentury OnVision se sídlem v Brně. OnVision tvoří vizuální obsah, kampaně a online přítomnost pro firmy.

Co OnVision dělá:
- Social media management (Instagram, Facebook, LinkedIn, TikTok)
- Videoprodukcí a fotografie (reelsy, branded content, eventová produkce)
- Grafický design a branding (loga, vizuály, grafiky pro sociální sítě)
- Kreativní kampaně a reklamní produkce (Ads, outdoor, performance)

Tým:
- Adam Mendrek — CEO a kreativní ředitel
- Jan Kříž — management a koordinace
- Zdeněk Dolíhal — kameraman a střihač
- Matěj Hořák — fotograf
- a další

Měsíční klienti agentury (pravidelná spolupráce):
IMTOS (průmyslové stroje), FIRESTA (požární bezpečnost a servis), SK STAVOS BRNO SLATINA (stavební klub), MTB CZ (horská kola a sport), BEHEJ BRNO (běžecká komunita v Brně), TOFFI (cukrovinky a sweet branding), SENIMED (zdravotní pomůcky a péče), EASTGATE BRNO (nákupní centrum), POWERPLATE (fitness vibrační platformy), OnVision (vlastní agentura).

Pravidla chování:
- Vždy odpovídej v češtině — přirozeně, ne formálně
- Buď stručný a praktický. Žádné zbytečné úvody ani omluvy
- Pro copy a captions: nabídni 2–3 varianty (například: "Formální / Casual / Energický")
- Hashtags: vždy mix populárních + niche + brand hashtagů
- Rozumíš českému marketingovému prostředí a sociálním sítím v ČR
- Pokud dostaneš otázku o klientovi, využij kontext výše${clientCtx ? `\n\nAktuální kontext: Uživatel pracuje s klientem ${clientCtx}. Odpovědi přizpůsob tomuto klientovi.` : ""}`;
}

/* ── Quick action suggestions ───────────────────────────────────────────── */
const QUICK_ACTIONS = [
  {
    emoji: "📅",
    label: "Plán obsahu na měsíc",
    prompt: "Vymysli obsahový plán pro Instagram na tento měsíc — 12 příspěvků (3 týdně). Navrhni témata a formáty (foto, reel, carousel, story).",
  },
  {
    emoji: "✍️",
    label: "Napiš caption",
    prompt: "Napiš 3 varianty Instagram captionu — Formální, Casual a Energický. Každý caption max 3 věty + 10 hashtagů.",
  },
  {
    emoji: "🎬",
    label: "Nápad na Reels",
    prompt: "Vymysli 5 nápadů na krátké Reels (15–30 sekund) které by mohly virálně šířit. Popiš koncept, hook první sekundy a CTA.",
  },
  {
    emoji: "📋",
    label: "Kreativní brief",
    prompt: "Pomoz mi sestavit kreativní brief pro nový projekt. Zeptej se mě na potřebné informace (klient, cíl, cílová skupina, formát, deadline) a poté brief sestav.",
  },
  {
    emoji: "📣",
    label: "Kampaň — nápady",
    prompt: "Navrhni 3 koncepty kampaně pro sociální sítě. Každý koncept: název, hlavní myšlenka, formáty obsahu, délka kampaně.",
  },
  {
    emoji: "🔍",
    label: "Analýza klienta",
    prompt: "Analyzuj komunikaci a obsah tohoto klienta. Co funguje, co chybí, co bych doporučil zlepšit na sociálních sítích?",
  },
];

/* ── Markdown-lite renderer ─────────────────────────────────────────────── */
function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("### ")) {
      elements.push(
        <p key={key++} className="text-[13px] font-bold mt-3 mb-1" style={{ color: "oklch(0.88 0.01 265)" }}>
          {line.slice(4)}
        </p>
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <p key={key++} className="text-[14px] font-bold mt-3 mb-1" style={{ color: "oklch(0.92 0.01 265)" }}>
          {line.slice(3)}
        </p>
      );
    } else if (line.startsWith("**") && line.endsWith("**") && line.length > 4) {
      elements.push(
        <p key={key++} className="text-[13px] font-semibold" style={{ color: "oklch(0.88 0.005 265)" }}>
          {line.slice(2, -2)}
        </p>
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <div key={key++} className="flex gap-2 items-start">
          <span className="mt-[5px] shrink-0 w-1 h-1 rounded-full" style={{ background: "oklch(0.62 0.27 265)" }} />
          <span className="text-[13px] leading-relaxed" style={{ color: "oklch(0.78 0.005 265)" }}>
            {inlineFormat(line.slice(2))}
          </span>
        </div>
      );
    } else if (/^\d+\.\s/.test(line)) {
      const num = line.match(/^(\d+)\.\s(.*)/)!;
      elements.push(
        <div key={key++} className="flex gap-2 items-start">
          <span className="text-[11px] font-bold shrink-0 mt-0.5 w-4 text-right" style={{ color: "oklch(0.62 0.27 265)" }}>
            {num[1]}.
          </span>
          <span className="text-[13px] leading-relaxed" style={{ color: "oklch(0.78 0.005 265)" }}>
            {inlineFormat(num[2])}
          </span>
        </div>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={key++} className="h-2" />);
    } else {
      elements.push(
        <p key={key++} className="text-[13px] leading-relaxed" style={{ color: "oklch(0.78 0.005 265)" }}>
          {inlineFormat(line)}
        </p>
      );
    }
  }

  return elements;
}

function inlineFormat(text: string): React.ReactNode {
  // Bold: **text**
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return <strong key={i} style={{ color: "oklch(0.88 0.005 265)", fontWeight: 600 }}>{p.slice(2, -2)}</strong>;
    }
    return p;
  });
}

/* ── Message bubble ─────────────────────────────────────────────────────── */
function MessageBubble({ msg, isStreaming }: { msg: ChatMessage; isStreaming?: boolean }) {
  const isUser = msg.role === "user";
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
      className={`flex gap-3 group ${isUser ? "flex-row-reverse" : ""}`}
    >
      {/* Avatar */}
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
        style={isUser ? {
          background: "oklch(0.62 0.27 265)",
          color: "oklch(0.97 0.004 265)",
        } : {
          background: "oklch(0.16 0.01 265)",
          border: "1px solid oklch(0.62 0.27 265 / 0.35)",
          color: "oklch(0.72 0.18 265)",
        }}
      >
        {isUser
          ? <span className="text-[10px] font-bold">Ty</span>
          : <Bot className="w-3.5 h-3.5" />
        }
      </div>

      <div className={`max-w-[80%] flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
        {/* Bubble */}
        <div
          className="px-4 py-3 rounded-[14px] relative"
          style={isUser ? {
            background: "oklch(0.62 0.27 265 / 0.18)",
            border: "1px solid oklch(0.62 0.27 265 / 0.28)",
            borderBottomRightRadius: 4,
          } : {
            background: "oklch(1 0 0 / 0.04)",
            border: "1px solid oklch(1 0 0 / 0.09)",
            borderBottomLeftRadius: 4,
          }}
        >
          {isUser ? (
            <p className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: "oklch(0.88 0.005 265)" }}>
              {msg.content}
            </p>
          ) : (
            <div className="space-y-0.5">
              {msg.content ? renderMarkdown(msg.content) : null}
              {isStreaming && (
                <motion.span
                  className="inline-block w-1.5 h-4 rounded-sm ml-0.5 align-middle"
                  style={{ background: "oklch(0.62 0.27 265)" }}
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut" }}
                />
              )}
            </div>
          )}
        </div>

        {/* Copy button — AI only */}
        {!isUser && !isStreaming && msg.content && (
          <motion.button
            onClick={copy}
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            className="flex items-center gap-1 px-2 py-0.5 rounded-[6px] text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ color: "oklch(0.42 0.005 222)", background: "oklch(1 0 0 / 0.04)" }}
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? "Zkopírováno" : "Kopírovat"}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

/* ── Main ───────────────────────────────────────────────────────────────── */
export default function AiPage() {
  const { user } = useUserRole();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [clientCtx, setClientCtx] = useState<string>("");
  const [showClientPicker, setShowClientPicker] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const KLIENTI = [
    "IMTOS", "FIRESTA", "SK STAVOS BRNO SLATINA", "MTB CZ",
    "BEHEJ BRNO", "TOFFI", "SENIMED", "EASTGATE BRNO", "POWERPLATE", "OnVision",
  ];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [input]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `u${Date.now()}`,
      role: "user",
      content: text.trim(),
      ts: Date.now(),
    };

    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setLoading(true);

    // Placeholder AI message
    const aiId = `a${Date.now()}`;
    setMessages(prev => [...prev, { id: aiId, role: "assistant", content: "", ts: Date.now() }]);

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/ai/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortRef.current.signal,
        body: JSON.stringify({
          systemPrompt: buildSystemPrompt(clientCtx || undefined),
          messages: history.map(m => ({ role: m.role, content: m.content })),
          maxTokens: 4096,
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error("Stream failed");
      }

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
            if (
              parsed.type === "content_block_delta" &&
              parsed.delta?.type === "text_delta"
            ) {
              const chunk: string = parsed.delta.text;
              setMessages(prev => prev.map(m =>
                m.id === aiId ? { ...m, content: m.content + chunk } : m
              ));
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setMessages(prev => prev.map(m =>
        m.id === aiId
          ? { ...m, content: "Nastala chyba při komunikaci s AI. Zkus to znovu." }
          : m
      ));
    } finally {
      setLoading(false);
    }
  }, [messages, loading, clientCtx]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function clearChat() {
    abortRef.current?.abort();
    setMessages([]);
    setLoading(false);
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-screen" style={{ fontFamily: "var(--font-jakarta)" }}>

      {/* Header */}
      <div
        className="shrink-0 px-5 py-4 flex items-center justify-between"
        style={{ borderBottom: "1px solid oklch(1 0 0 / 0.07)", background: "oklch(0.09 0.008 222)" }}
      >
        <div className="flex items-center gap-3">
          {/* AI icon */}
          <div
            className="w-8 h-8 rounded-[10px] flex items-center justify-center"
            style={{ background: "oklch(0.62 0.27 265 / 0.15)", border: "1px solid oklch(0.62 0.27 265 / 0.3)" }}
          >
            <Sparkles className="w-4 h-4" style={{ color: "oklch(0.72 0.18 265)" }} />
          </div>
          <div>
            <h1
              className="text-[16px] font-bold tracking-tight leading-none"
              style={{ color: "oklch(0.96 0.01 265)", fontFamily: "var(--font-outfit)" }}
            >
              AI Asistent
            </h1>
            <p className="text-[11px] mt-0.5" style={{ color: "oklch(0.38 0.005 222)" }}>
              Claude Opus &middot; OnVision kontext
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Client context selector */}
          <div className="relative">
            <button
              onClick={() => setShowClientPicker(p => !p)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[11px] font-semibold transition-all"
              style={clientCtx ? {
                background: "oklch(0.62 0.27 265 / 0.12)",
                border: "1px solid oklch(0.62 0.27 265 / 0.28)",
                color: "oklch(0.75 0.18 265)",
              } : {
                background: "oklch(1 0 0 / 0.05)",
                border: "1px solid oklch(1 0 0 / 0.1)",
                color: "oklch(0.42 0.005 222)",
              }}
            >
              {clientCtx ? (
                <>
                  <span className="text-[10px]">📌</span>
                  {clientCtx}
                  <button
                    onClick={e => { e.stopPropagation(); setClientCtx(""); }}
                    className="ml-1"
                    style={{ color: "oklch(0.5 0.005 222)" }}
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </>
              ) : (
                <>
                  Klient
                  <ChevronDown className="w-3 h-3" />
                </>
              )}
            </button>

            <AnimatePresence>
              {showClientPicker && (
                <motion.div
                  initial={{ opacity: 0, y: 4, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.96 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-full mt-1 z-30 rounded-[10px] overflow-hidden py-1 min-w-[180px]"
                  style={{
                    background: "oklch(0.14 0.008 222)",
                    border: "1px solid oklch(1 0 0 / 0.12)",
                    boxShadow: "0 8px 24px oklch(0 0 0 / 0.4)",
                  }}
                >
                  <p className="px-4 py-1.5 text-[9px] font-bold uppercase tracking-wider" style={{ color: "oklch(0.35 0.005 222)" }}>
                    Přidej klientský kontext
                  </p>
                  {KLIENTI.map(k => (
                    <button
                      key={k}
                      onClick={() => { setClientCtx(k); setShowClientPicker(false); }}
                      className="w-full text-left px-4 py-2 text-[12px] font-medium hover:bg-white/5 transition-colors"
                      style={{ color: clientCtx === k ? "oklch(0.75 0.18 265)" : "oklch(0.62 0.005 222)" }}
                    >
                      {k}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Clear button */}
          {messages.length > 0 && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={clearChat}
              className="p-2 rounded-[8px]"
              style={{ color: "oklch(0.38 0.005 222)", background: "oklch(1 0 0 / 0.04)" }}
              title="Smazat konverzaci"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </motion.button>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          /* ── Empty state + quick actions ── */
          <div className="flex flex-col items-center justify-center min-h-full px-6 py-12 gap-8">
            <div className="text-center space-y-3">
              <motion.div
                className="w-16 h-16 rounded-[18px] flex items-center justify-center mx-auto"
                style={{
                  background: "oklch(0.62 0.27 265 / 0.12)",
                  border: "1px solid oklch(0.62 0.27 265 / 0.22)",
                }}
                animate={{ boxShadow: ["0 0 0px oklch(0.62 0.27 265 / 0)", "0 0 24px oklch(0.62 0.27 265 / 0.25)", "0 0 0px oklch(0.62 0.27 265 / 0)"] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                <Sparkles className="w-7 h-7" style={{ color: "oklch(0.72 0.18 265)" }} />
              </motion.div>
              <div>
                <h2 className="text-[20px] font-bold" style={{ color: "oklch(0.94 0.01 265)", fontFamily: "var(--font-outfit)" }}>
                  {user?.displayName ? `Čím mohu pomoci, ${user.displayName.split(" ")[0]}?` : "Čím mohu pomoci?"}
                </h2>
                <p className="text-[13px] mt-1" style={{ color: "oklch(0.38 0.005 222)" }}>
                  Jsem Claude — znám OnVision, vaše klienty a vím, co děláte.
                </p>
              </div>
            </div>

            {/* Quick action grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-2xl">
              {QUICK_ACTIONS.map((action, i) => (
                <motion.button
                  key={i}
                  onClick={() => sendMessage(action.prompt)}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex flex-col items-start gap-2 p-4 rounded-[12px] text-left"
                  style={{
                    background: "oklch(1 0 0 / 0.04)",
                    border: "1px solid oklch(1 0 0 / 0.09)",
                  }}
                >
                  <span className="text-xl">{action.emoji}</span>
                  <span className="text-[12px] font-semibold leading-snug" style={{ color: "oklch(0.72 0.005 265)" }}>
                    {action.label}
                  </span>
                </motion.button>
              ))}
            </div>
          </div>
        ) : (
          /* ── Message list ── */
          <div className="px-4 py-6 space-y-5 max-w-3xl mx-auto">
            {messages.map((msg, i) => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                isStreaming={loading && i === messages.length - 1 && msg.role === "assistant"}
              />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input bar */}
      <div
        className="shrink-0 px-4 pb-4 pt-3"
        style={{ borderTop: "1px solid oklch(1 0 0 / 0.07)", background: "oklch(0.09 0.008 222)" }}
      >
        <div className="max-w-3xl mx-auto">
          {clientCtx && (
            <div className="mb-2 flex items-center gap-1.5">
              <span className="text-[10px]" style={{ color: "oklch(0.42 0.005 222)" }}>
                Kontext:
              </span>
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: "oklch(0.62 0.27 265 / 0.12)", color: "oklch(0.72 0.18 265)", border: "1px solid oklch(0.62 0.27 265 / 0.2)" }}
              >
                📌 {clientCtx}
              </span>
            </div>
          )}

          <div
            className="flex items-end gap-3 px-4 py-3 rounded-[16px]"
            style={{
              background: "oklch(1 0 0 / 0.05)",
              border: "1px solid oklch(1 0 0 / 0.1)",
            }}
          >
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Napiš dotaz nebo vyber akci nahoře..."
              disabled={loading}
              className="flex-1 bg-transparent outline-none resize-none text-[13px] leading-relaxed"
              style={{
                color: "oklch(0.88 0.005 265)",
                minHeight: "22px",
                maxHeight: "140px",
                caretColor: "oklch(0.72 0.18 265)",
              }}
            />
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all"
              style={{
                background: input.trim() && !loading ? "oklch(0.62 0.27 265)" : "oklch(0.62 0.27 265 / 0.15)",
                color: input.trim() && !loading ? "oklch(0.97 0.004 265)" : "oklch(0.42 0.005 222)",
              }}
            >
              {loading ? (
                <motion.div
                  className="w-3.5 h-3.5 rounded-full"
                  style={{ border: "2px solid oklch(0.62 0.27 265 / 0.3)", borderTopColor: "oklch(0.62 0.27 265)" }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </motion.button>
          </div>
          <p className="text-[10px] text-center mt-2" style={{ color: "oklch(0.28 0.005 222)" }}>
            Enter pro odeslání &middot; Shift+Enter nový řádek &middot; Claude Opus 4.5
          </p>
        </div>
      </div>
    </div>
  );
}
