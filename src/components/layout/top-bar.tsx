"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Undo2, LogOut, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function TopBar() {
  const router = useRouter();
  const [undoFeedback, setUndoFeedback] = useState(false);
  // Track last focused editable element so we can refocus before execCommand
  const lastInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  useEffect(() => {
    function onFocusin(e: FocusEvent) {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA") {
        lastInputRef.current = t as HTMLInputElement | HTMLTextAreaElement;
      }
    }
    document.addEventListener("focusin", onFocusin);
    return () => document.removeEventListener("focusin", onFocusin);
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function handleUndo() {
    const target = lastInputRef.current;
    if (target && document.body.contains(target)) {
      // Refocus the last edited field, then undo
      target.focus();
      document.execCommand("undo");
    }
    setUndoFeedback(true);
    setTimeout(() => setUndoFeedback(false), 900);
  }

  return (
    <div
      className="sticky top-0 z-40 flex items-center justify-end px-4 py-2 gap-2"
      style={{
        background: "oklch(0.09 0.008 222 / 0.88)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid oklch(1 0 0 / 0.055)",
      }}
    >
      {/* Vrátit zpět (Undo) */}
      <motion.button
        onClick={handleUndo}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-[12px] font-medium overflow-hidden"
        style={{
          color: undoFeedback ? "oklch(0.67 0.155 155)" : "oklch(0.48 0.005 222)",
          background: undoFeedback ? "oklch(0.67 0.155 155 / 0.1)" : "oklch(1 0 0 / 0.04)",
          border: `1px solid ${undoFeedback ? "oklch(0.67 0.155 155 / 0.3)" : "oklch(1 0 0 / 0.07)"}`,
          fontFamily: "var(--font-jakarta)",
          transition: "color 0.2s, background 0.2s, border-color 0.2s",
        }}
        whileHover={!undoFeedback ? {
          color: "oklch(0.75 0.005 222)",
          background: "oklch(1 0 0 / 0.07)",
        } : {}}
        whileTap={{ scale: 0.95 }}
        transition={{ duration: 0.12 }}
        title="Vrátit zpět poslední změnu (Ctrl+Z)"
      >
        <AnimatePresence mode="wait" initial={false}>
          {undoFeedback ? (
            <motion.span
              key="check"
              className="flex items-center gap-1.5"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              <Check className="w-3.5 h-3.5" />
              Vráceno
            </motion.span>
          ) : (
            <motion.span
              key="undo"
              className="flex items-center gap-1.5"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              <Undo2 className="w-3.5 h-3.5" />
              Zpět
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Divider */}
      <div className="w-px h-4" style={{ background: "oklch(1 0 0 / 0.08)" }} />

      {/* Odhlásit */}
      <motion.button
        onClick={handleLogout}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-[12px] font-medium"
        style={{
          color: "oklch(0.48 0.005 222)",
          background: "oklch(1 0 0 / 0.04)",
          border: "1px solid oklch(1 0 0 / 0.07)",
          fontFamily: "var(--font-jakarta)",
        }}
        whileHover={{
          color: "oklch(0.72 0.18 25)",
          background: "oklch(0.62 0.22 25 / 0.08)",
          borderColor: "oklch(0.62 0.22 25 / 0.25)",
        }}
        whileTap={{ scale: 0.95 }}
        transition={{ duration: 0.12 }}
      >
        <LogOut className="w-3.5 h-3.5" />
        Odhlásit
      </motion.button>
    </div>
  );
}
