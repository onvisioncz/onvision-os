"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { MessageSquareDashed } from "lucide-react";

/** Floating "Výstupy" button — bottom-right, visible on all app pages except /outputs itself */
export function VystupyFab() {
  const path = usePathname();
  // Hide on the outputs page itself
  if (path === "/outputs") return null;

  return (
    <div className="fixed bottom-6 right-6 z-40 md:flex hidden">
      <Link href="/outputs">
        <motion.div
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
        </motion.div>
      </Link>
    </div>
  );
}
