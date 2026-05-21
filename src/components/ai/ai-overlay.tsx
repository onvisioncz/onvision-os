"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AiPage } from "@/app/(app)/ai/page";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AiOverlay({ open, onClose }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Blurred backdrop — same as chat */}
          <motion.div
            key="ai-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 49,
              background: "oklch(0 0 0 / 0.35)",
              backdropFilter: "blur(2px)",
              WebkitBackdropFilter: "blur(2px)",
            }}
          />

          {/* Panel slides in from the right */}
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
            }}
          >
            <AiPage />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
