"use client";

import { useState, useEffect } from "react";
import { Download, CheckCircle2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type State = "hidden" | "available" | "installing" | "installed";

/* ── Sidebar install button ────────────────────────────────────────────── */
export function PwaInstallButton() {
  const [state, setState] = useState<State>("hidden");
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if already installed (standalone mode)
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setState("installed");
      return;
    }

    // Check if prompt was already captured before this component mounted
    if (window.__pwaInstallPrompt) {
      setPrompt(window.__pwaInstallPrompt);
      setState("available");
    }

    // Listen for future prompt events
    const listener = (e: BeforeInstallPromptEvent) => {
      setPrompt(e);
      setState("available");
    };
    window.__pwaInstallListeners = window.__pwaInstallListeners ?? [];
    window.__pwaInstallListeners.push(listener);

    // Also listen for app installed event
    const onInstalled = () => setState("installed");
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.__pwaInstallListeners = (window.__pwaInstallListeners ?? []).filter(
        (fn) => fn !== listener
      );
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function handleInstall() {
    if (!prompt) return;
    setState("installing");
    try {
      await prompt.prompt();
      const result = await prompt.userChoice;
      setState(result.outcome === "accepted" ? "installed" : "available");
      window.__pwaInstallPrompt = null;
    } catch {
      setState("available");
    }
  }

  if (state === "hidden" as string) return null;

  return (
    <AnimatePresence>
      {(state === "available" || state === "installing" || state === "installed") && (
        <motion.button
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          onClick={state === "available" ? handleInstall : undefined}
          disabled={state === "installing" || state === "installed"}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            width: "100%",
            padding: "7px 12px",
            borderRadius: 8,
            border: "1px solid",
            borderColor: state === "installed"
              ? "oklch(0.68 0.18 155 / 0.3)"
              : "oklch(0.62 0.27 265 / 0.3)",
            background: state === "installed"
              ? "oklch(0.68 0.18 155 / 0.08)"
              : "oklch(0.62 0.27 265 / 0.1)",
            color: state === "installed"
              ? "oklch(0.68 0.18 155)"
              : "oklch(0.72 0.18 265)",
            fontSize: 11,
            fontWeight: 600,
            cursor: state === "available" ? "pointer" : "default",
            fontFamily: "var(--font-jakarta)",
          }}
        >
          {state === "installed" ? (
            <CheckCircle2 style={{ width: 13, height: 13, flexShrink: 0 }} />
          ) : (
            <Download style={{ width: 13, height: 13, flexShrink: 0 }} />
          )}
          <span>
            {state === "installed"
              ? "Aplikace nainstalována"
              : state === "installing"
              ? "Instaluji…"
              : "Nainstalovat aplikaci"}
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}

/* ── Dashboard banner (shows once, dismissible) ────────────────────────── */
export function PwaInstallBanner() {
  const [state, setState] = useState<"hidden" | "visible" | "installing">("hidden");
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if (localStorage.getItem("pwa-banner-dismissed")) return;

    if (window.__pwaInstallPrompt) {
      setPrompt(window.__pwaInstallPrompt);
      setState("visible");
    }

    const listener = (e: BeforeInstallPromptEvent) => {
      if (localStorage.getItem("pwa-banner-dismissed")) return;
      setPrompt(e);
      setState("visible");
    };
    window.__pwaInstallListeners = window.__pwaInstallListeners ?? [];
    window.__pwaInstallListeners.push(listener);

    return () => {
      window.__pwaInstallListeners = (window.__pwaInstallListeners ?? []).filter(
        (fn) => fn !== listener
      );
    };
  }, []);

  function dismiss() {
    localStorage.setItem("pwa-banner-dismissed", "1");
    setState("hidden");
  }

  async function handleInstall() {
    if (!prompt) return;
    setState("installing");
    try {
      await prompt.prompt();
      const result = await prompt.userChoice;
      if (result.outcome === "accepted") {
        setState("hidden");
        localStorage.setItem("pwa-banner-dismissed", "1");
      } else {
        setState("visible");
      }
    } catch {
      setState("visible");
    }
  }

  return (
    <AnimatePresence>
      {state === "visible" || state === "installing" ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 16px",
            margin: "0 0 16px 0",
            borderRadius: 10,
            background: "oklch(0.62 0.27 265 / 0.1)",
            border: "1px solid oklch(0.62 0.27 265 / 0.25)",
          }}
        >
          {/* Icon */}
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: "oklch(0.62 0.27 265 / 0.15)",
              border: "1px solid oklch(0.62 0.27 265 / 0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon-192.png" alt="OnVision OS" style={{ width: 24, height: 24, borderRadius: 4 }} />
          </div>

          {/* Text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "oklch(0.92 0.005 265)", fontFamily: "var(--font-outfit)", margin: 0 }}>
              Nainstalovat OnVision OS
            </p>
            <p style={{ fontSize: 10, color: "oklch(0.52 0.005 222)", margin: "2px 0 0 0", fontFamily: "var(--font-jakarta)" }}>
              Přidej na plochu — funguje jako normální aplikace
            </p>
          </div>

          {/* Install button */}
          <button
            onClick={handleInstall}
            disabled={state === "installing"}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "6px 14px",
              borderRadius: 7,
              background: "oklch(0.62 0.27 265)",
              border: "none",
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              flexShrink: 0,
              fontFamily: "var(--font-jakarta)",
            }}
          >
            <Download style={{ width: 12, height: 12 }} />
            {state === "installing" ? "…" : "Instalovat"}
          </button>

          {/* Dismiss */}
          <button
            onClick={dismiss}
            style={{
              background: "transparent",
              border: "none",
              color: "oklch(0.38 0.005 222)",
              cursor: "pointer",
              padding: 4,
              flexShrink: 0,
            }}
            aria-label="Zavřít"
          >
            <X style={{ width: 14, height: 14 }} />
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
