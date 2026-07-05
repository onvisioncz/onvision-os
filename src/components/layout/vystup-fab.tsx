"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquareDashed } from "lucide-react";
import OutputsPage from "@/app/(app)/outputs/page";

/**
 * Floating "Výstupy" button — bottom-right. Otevírá výstupy jako velký
 * zavíratelný popup (ne fullscreen). Fullscreen je dostupný přes lištu vlevo.
 */
export function VystupyFab() {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  // Zavření na Esc
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Skryj na fullscreen výstupech
  if (path === "/outputs") return null;

  return (
    <>
      <div className="fixed bottom-6 right-6 z-40 md:flex hidden">
        <motion.button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-4 py-3 rounded-full cursor-pointer select-none"
          style={{
            background: "oklch(0.12 0.018 265)",
            border: "1px solid oklch(0.62 0.27 265 / 0.35)",
            color: "oklch(0.72 0.18 265)",
            fontFamily: "var(--font-outfit)",
            fontSize: 13,
            fontWeight: 600,
          }}
          initial={false}
          animate={{ boxShadow: "0 4px 24px oklch(0.62 0.27 265 / 0.22)" }}
          whileHover={{
            scale: 1.04,
            background: "oklch(0.62 0.27 265)",
            color: "oklch(0.97 0.004 265)",
            borderColor: "oklch(0.72 0.18 265)",
          }}
          whileTap={{ scale: 0.95 }}
        >
          <MessageSquareDashed className="w-4 h-4 shrink-0" />
          <span>Výstupy</span>
        </motion.button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
            style={{ background: "oklch(0 0 0 / 0.55)", backdropFilter: "blur(4px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              className="w-full max-w-[1100px] h-[85vh] rounded-[16px] overflow-hidden flex flex-col"
              style={{
                background: "oklch(0.09 0.012 265)",
                border: "1px solid oklch(1 0 0 / 0.1)",
                boxShadow: "0 24px 80px oklch(0 0 0 / 0.6)",
              }}
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              transition={{ duration: 0.18 }}
              onClick={(e) => e.stopPropagation()}
            >
              <OutputsPage onClose={() => setOpen(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
