"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { AiPage } from "@/app/(app)/ai/page";

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * AI workspace jako pravý panel. Plné pozadí + backdrop + zavření
 * (klik mimo, Esc, křížek) — stejný vzor jako týmový chat.
 */
export function AiOverlay({ open, onClose }: Props) {
  // Esc zavírá
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop — klik zavře */}
          <motion.div
            key="ai-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: "fixed", inset: 0, zIndex: 49,
              background: "oklch(0 0 0 / 0.45)",
              backdropFilter: "blur(3px)",
              WebkitBackdropFilter: "blur(3px)",
            }}
          />

          {/* Panel — plné neprůhledné pozadí, ať neprosvítá appka */}
          <motion.div
            key="ai-panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
            style={{
              position: "fixed",
              right: 0,
              top: 0,
              bottom: 0,
              width: "min(960px, 100vw)",
              zIndex: 50,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              background: "#0B0B14",
              borderLeft: "1px solid rgba(255,255,255,0.10)",
              boxShadow: "-24px 0 64px rgba(0,0,0,0.55)",
            }}
          >
            {/* Zavírací křížek — vždy viditelný nad obsahem */}
            <button
              onClick={onClose}
              aria-label="Zavřít AI workspace"
              className="btn-tactile"
              style={{
                position: "absolute", top: 12, right: 14, zIndex: 60,
                width: 32, height: 32, borderRadius: 9,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.65)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <X style={{ width: 15, height: 15 }} />
            </button>
            <AiPage />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
