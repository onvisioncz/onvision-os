"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("Nesprávný e-mail nebo heslo.");
      setLoading(false);
      return;
    }

    window.location.href = "/dashboard";
  }

  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center p-4"
      style={{
        background: `
          radial-gradient(ellipse 80% 60% at 50% -10%,
            oklch(0.62 0.27 265 / 0.08) 0%,
            transparent 60%
          ),
          oklch(0.09 0.008 222)
        `,
      }}
    >
      {/* Subtle grid texture */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `
            linear-gradient(oklch(0.62 0.27 265) 1px, transparent 1px),
            linear-gradient(90deg, oklch(0.62 0.27 265) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />

      <motion.div
        className="relative w-full max-w-[380px]"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <motion.div
            className="mb-4"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{
              scale: 1,
              opacity: 1,
              filter: [
                "drop-shadow(0 0 0px rgba(80, 80, 255, 0))",
                "drop-shadow(0 0 18px rgba(80, 80, 255, 0.85))",
                "drop-shadow(0 0 0px rgba(80, 80, 255, 0))",
              ],
            }}
            transition={{
              scale: { duration: 0.4, delay: 0.1, ease: [0.23, 1, 0.32, 1] },
              opacity: { duration: 0.4, delay: 0.1 },
              filter: { duration: 3, delay: 0.5, repeat: Infinity, ease: "easeInOut" },
            }}
          >
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-label="OnVision logo">
              <circle cx="32" cy="32" r="32" fill="oklch(0.62 0.27 265)" />
              <circle cx="32" cy="32" r="31" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
              {/* "O" — bold filled donut */}
              <ellipse cx="20.5" cy="32" rx="11.5" ry="14.5" fill="white" />
              <ellipse cx="20.5" cy="32" rx="6.5" ry="9.8" fill="oklch(0.62 0.27 265)" />
              {/* "n" — left stem */}
              <rect x="35" y="17" width="5.5" height="30" rx="2.5" fill="white" />
              {/* "n" — arch + right stem */}
              <path
                d="M40.5 26.5 C40.5 17 51.5 17 51.5 26.5 L51.5 47 L46 47 L46 28 C46 24 40.5 24 40.5 28 Z"
                fill="white"
              />
            </svg>
          </motion.div>
          <h1
            className="text-[24px] text-[--foreground] leading-none"
            style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, letterSpacing: "-0.03em" }}
          >
            OnVision OS
          </h1>
          <p className="text-[13px] text-[--muted-foreground] mt-1.5">
            Přihlaste se do svého účtu
          </p>
        </div>

        {/* Card */}
        <div
          className="card p-6"
          style={{ borderColor: "oklch(1 0 0 / 0.09)" }}
        >
          <form onSubmit={handleLogin} className="space-y-4">

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2.5 px-3.5 py-3 rounded-[8px] text-[13px]"
                style={{
                  background: "oklch(0.62 0.22 25 / 0.08)",
                  border: "1px solid oklch(0.62 0.22 25 / 0.2)",
                  color: "oklch(0.75 0.18 25)",
                }}
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </motion.div>
            )}

            {/* Email */}
            <div>
              <label className="block text-[11px] font-semibold text-[--muted-foreground] uppercase tracking-[0.08em] mb-1.5">
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="adam@onvision.cz"
                required
                className="w-full px-3.5 py-2.5 rounded-[8px] text-[13px] text-[--foreground] placeholder:text-[--muted-foreground] outline-none transition-all"
                style={{
                  background: "oklch(1 0 0 / 0.04)",
                  border: "1px solid oklch(1 0 0 / 0.09)",
                  fontFamily: "var(--font-jakarta)",
                }}
                onFocus={e => (e.target.style.borderColor = "oklch(0.62 0.27 265 / 0.5)")}
                onBlur={e  => (e.target.style.borderColor = "oklch(1 0 0 / 0.09)")}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-[11px] font-semibold text-[--muted-foreground] uppercase tracking-[0.08em] mb-1.5">
                Heslo
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-3.5 py-2.5 pr-10 rounded-[8px] text-[13px] text-[--foreground] placeholder:text-[--muted-foreground] outline-none transition-all"
                  style={{
                    background: "oklch(1 0 0 / 0.04)",
                    border: "1px solid oklch(1 0 0 / 0.09)",
                    fontFamily: "var(--font-jakarta)",
                  }}
                  onFocus={e => (e.target.style.borderColor = "oklch(0.62 0.27 265 / 0.5)")}
                  onBlur={e  => (e.target.style.borderColor = "oklch(1 0 0 / 0.09)")}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[--muted-foreground] hover:text-[--foreground] transition-colors btn-tactile"
                >
                  {showPw
                    ? <EyeOff className="w-4 h-4" />
                    : <Eye className="w-4 h-4" />
                  }
                </button>
              </div>
            </div>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading}
              className="btn-tactile w-full py-2.5 rounded-[8px] text-[13px] font-semibold mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: "oklch(0.62 0.27 265)",
                color: "oklch(0.97 0.004 265)",
                fontFamily: "var(--font-outfit)",
              }}
              whileHover={!loading ? { filter: "brightness(1.08)" } : {}}
              transition={{ duration: 0.15 }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Přihlašuji...
                </span>
              ) : "Přihlásit se"}
            </motion.button>

          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-[--muted-foreground] mt-5">
          OnVision s.r.o. · Interní systém · Přístup pouze pro oprávněné osoby
        </p>
      </motion.div>
    </div>
  );
}
