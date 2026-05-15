"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function TopBar() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function handleBack() {
    router.back();
  }

  return (
    <div
      className="sticky top-0 z-40 flex items-center justify-end px-4 py-2.5 gap-2"
      style={{
        background: "oklch(0.09 0.008 222 / 0.85)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid oklch(1 0 0 / 0.055)",
      }}
    >
      {/* Zpět */}
      <motion.button
        onClick={handleBack}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-[12px] font-medium"
        style={{
          color: "oklch(0.50 0.005 222)",
          background: "oklch(1 0 0 / 0.04)",
          border: "1px solid oklch(1 0 0 / 0.07)",
          fontFamily: "var(--font-jakarta)",
        }}
        whileHover={{
          color: "oklch(0.78 0.005 222)",
          background: "oklch(1 0 0 / 0.07)",
        }}
        whileTap={{ scale: 0.96 }}
        transition={{ duration: 0.12 }}
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Zpět
      </motion.button>

      {/* Divider */}
      <div className="w-px h-4" style={{ background: "oklch(1 0 0 / 0.09)" }} />

      {/* Odhlásit */}
      <motion.button
        onClick={handleLogout}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-[12px] font-medium"
        style={{
          color: "oklch(0.50 0.005 222)",
          background: "oklch(1 0 0 / 0.04)",
          border: "1px solid oklch(1 0 0 / 0.07)",
          fontFamily: "var(--font-jakarta)",
        }}
        whileHover={{
          color: "oklch(0.72 0.18 25)",
          background: "oklch(0.62 0.22 25 / 0.08)",
          borderColor: "oklch(0.62 0.22 25 / 0.2)",
        }}
        whileTap={{ scale: 0.96 }}
        transition={{ duration: 0.12 }}
      >
        <LogOut className="w-3.5 h-3.5" />
        Odhlásit
      </motion.button>
    </div>
  );
}
