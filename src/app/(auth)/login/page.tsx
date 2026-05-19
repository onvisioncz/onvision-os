"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, AlertCircle, Smartphone, ArrowLeft } from "lucide-react";

type Step = "credentials" | "totp";

/* ── Shared background ──────────────────────────────────────────────────────── */
const BG_STYLE = {
  background: `
    radial-gradient(ellipse 80% 60% at 50% -10%,
      oklch(0.62 0.27 265 / 0.08) 0%,
      transparent 60%
    ),
    oklch(0.09 0.008 222)
  `,
};

const GRID_BG = {
  backgroundImage: `
    linear-gradient(oklch(0.62 0.27 265) 1px, transparent 1px),
    linear-gradient(90deg, oklch(0.62 0.27 265) 1px, transparent 1px)
  `,
  backgroundSize: "48px 48px",
};

/* ── Logo component ─────────────────────────────────────────────────────────── */
function Logo() {
  return (
    <div className="flex flex-col items-center mb-8">
      <motion.div
        className="relative mb-6"
        style={{ width: 112, height: 112 }}
        initial={{ scale: 0.75, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
      >
        <motion.div
          className="absolute"
          style={{
            inset: -14,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(83,83,246,0.35) 0%, transparent 65%)",
            pointerEvents: "none",
          }}
          animate={{ opacity: [0.4, 1, 0.4], scale: [0.92, 1.04, 0.92] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute"
          style={{
            inset: -5,
            borderRadius: "50%",
            background: "conic-gradient(from 0deg, transparent 0%, transparent 50%, rgba(83,83,246,0.25) 68%, rgba(120,100,255,0.8) 80%, rgba(200,185,255,1) 88%, rgba(120,100,255,0.8) 95%, transparent 100%)",
            WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 4px), white calc(100% - 4px))",
            mask: "radial-gradient(farthest-side, transparent calc(100% - 4px), white calc(100% - 4px))",
            filter: "blur(0.8px)",
            pointerEvents: "none",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute"
          style={{
            inset: -5,
            borderRadius: "50%",
            background: "conic-gradient(from 0deg, transparent 0%, transparent 86%, rgba(255,255,255,0.95) 89%, transparent 92%, transparent 100%)",
            WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 5px), white calc(100% - 5px))",
            mask: "radial-gradient(farthest-side, transparent calc(100% - 5px), white calc(100% - 5px))",
            filter: "blur(1.5px)",
            pointerEvents: "none",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/onvision-mark.png"
          alt="OnVision"
          width={112}
          height={112}
          style={{ display: "block", borderRadius: "50%", position: "relative", zIndex: 1 }}
        />
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
  );
}

/* ── Error box ──────────────────────────────────────────────────────────────── */
function ErrorBox({ message }: { message: string }) {
  return (
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
      {message}
    </motion.div>
  );
}

/* ── Step 1: Credentials ────────────────────────────────────────────────────── */
function CredentialsStep({
  onSuccess,
}: {
  onSuccess: (factorId: string) => void;
}) {
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
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError("Nesprávný e-mail nebo heslo.");
      setLoading(false);
      return;
    }

    // Check if MFA is required
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
      // User has MFA enrolled — get factor ID
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totpFactor = factors?.totp?.[0];
      if (totpFactor) {
        onSuccess(totpFactor.id);
        return;
      }
    }

    // No MFA required → go straight to dashboard
    window.location.href = "/dashboard";
  }

  const inputStyle = {
    background: "oklch(1 0 0 / 0.04)",
    border: "1px solid oklch(1 0 0 / 0.09)",
    fontFamily: "var(--font-jakarta)",
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      {error && <ErrorBox message={error} />}

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
          style={inputStyle}
          onFocus={e => (e.target.style.borderColor = "oklch(0.62 0.27 265 / 0.5)")}
          onBlur={e  => (e.target.style.borderColor = "oklch(1 0 0 / 0.09)")}
        />
      </div>

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
            style={inputStyle}
            onFocus={e => (e.target.style.borderColor = "oklch(0.62 0.27 265 / 0.5)")}
            onBlur={e  => (e.target.style.borderColor = "oklch(1 0 0 / 0.09)")}
          />
          <button
            type="button"
            onClick={() => setShowPw(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[--muted-foreground] hover:text-[--foreground] transition-colors btn-tactile"
          >
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

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
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Přihlašuji...
          </span>
        ) : "Přihlásit se"}
      </motion.button>
    </form>
  );
}

/* ── Step 2: TOTP verification ──────────────────────────────────────────────── */
function TotpStep({
  factorId,
  onBack,
}: {
  factorId: string;
  onBack: () => void;
}) {
  const [code, setCode]       = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const inputRefs             = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  function handleChange(idx: number, val: string) {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next  = [...code];
    next[idx]   = digit;
    setCode(next);
    if (digit && idx < 5) {
      inputRefs.current[idx + 1]?.focus();
    }
  }

  function handleKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !code[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && idx > 0) inputRefs.current[idx - 1]?.focus();
    if (e.key === "ArrowRight" && idx < 5) inputRefs.current[idx + 1]?.focus();
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const next = [...code];
    for (let i = 0; i < digits.length; i++) next[i] = digits[i];
    setCode(next);
    const focusIdx = Math.min(digits.length, 5);
    inputRefs.current[focusIdx]?.focus();
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    const fullCode = code.join("");
    if (fullCode.length !== 6) return;

    setLoading(true);
    setError(null);

    const supabase = createClient();

    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError || !challenge) {
      setError("Nepodařilo se vytvořit ověření. Zkuste znovu.");
      setLoading(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: fullCode,
    });

    if (verifyError) {
      setError("Nesprávný kód. Zkontrolujte čas v aplikaci a zkuste znovu.");
      setCode(["", "", "", "", "", ""]);
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
      setLoading(false);
      return;
    }

    window.location.href = "/dashboard";
  }

  const codeComplete = code.every(d => d !== "");

  return (
    <form onSubmit={handleVerify} className="space-y-5">
      {/* Icon header */}
      <div className="flex flex-col items-center gap-3 py-2">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{ background: "oklch(0.62 0.27 265 / 0.12)", border: "1px solid oklch(0.62 0.27 265 / 0.25)" }}
        >
          <Smartphone className="w-5 h-5" style={{ color: "oklch(0.78 0.18 265)" }} />
        </div>
        <div className="text-center">
          <p className="text-[14px] font-semibold" style={{ color: "oklch(0.92 0.005 265)", fontFamily: "var(--font-outfit)" }}>
            Dvoufázové ověření
          </p>
          <p className="text-[12px] mt-0.5" style={{ color: "oklch(0.45 0.005 222)" }}>
            Zadejte 6místný kód z aplikace Google Authenticator nebo Authy
          </p>
        </div>
      </div>

      {error && <ErrorBox message={error} />}

      {/* 6-digit input */}
      <div className="flex gap-2 justify-center" onPaste={handlePaste}>
        {code.map((digit, idx) => (
          <input
            key={idx}
            ref={el => { inputRefs.current[idx] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={e => handleChange(idx, e.target.value)}
            onKeyDown={e => handleKeyDown(idx, e)}
            className="w-11 h-12 text-center rounded-[8px] text-[18px] font-bold outline-none transition-all"
            style={{
              background: "oklch(1 0 0 / 0.05)",
              border: digit
                ? "1px solid oklch(0.62 0.27 265 / 0.6)"
                : "1px solid oklch(1 0 0 / 0.1)",
              color: "oklch(0.96 0.01 265)",
              fontFamily: "var(--font-outfit)",
              caretColor: "oklch(0.62 0.27 265)",
            }}
            onFocus={e => (e.target.style.borderColor = "oklch(0.62 0.27 265 / 0.7)")}
            onBlur={e  => (e.target.style.borderColor = digit ? "oklch(0.62 0.27 265 / 0.6)" : "oklch(1 0 0 / 0.1)")}
          />
        ))}
      </div>

      <motion.button
        type="submit"
        disabled={loading || !codeComplete}
        className="btn-tactile w-full py-2.5 rounded-[8px] text-[13px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: "oklch(0.62 0.27 265)",
          color: "oklch(0.97 0.004 265)",
          fontFamily: "var(--font-outfit)",
        }}
        whileHover={!loading && codeComplete ? { filter: "brightness(1.08)" } : {}}
        transition={{ duration: 0.15 }}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Ověřuji...
          </span>
        ) : "Ověřit"}
      </motion.button>

      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 mx-auto text-[12px] transition-colors"
        style={{ color: "oklch(0.42 0.005 222)" }}
        onMouseEnter={e => (e.currentTarget.style.color = "oklch(0.62 0.005 222)")}
        onMouseLeave={e => (e.currentTarget.style.color = "oklch(0.42 0.005 222)")}
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Zpět na přihlášení
      </button>
    </form>
  );
}

/* ── Main page ──────────────────────────────────────────────────────────────── */
export default function LoginPage() {
  const [step, setStep]         = useState<Step>("credentials");
  const [factorId, setFactorId] = useState<string | null>(null);

  function handleMfaRequired(id: string) {
    setFactorId(id);
    setStep("totp");
  }

  function handleBack() {
    setStep("credentials");
    setFactorId(null);
    // Sign out the partial session so user can re-enter credentials
    createClient().auth.signOut();
  }

  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center p-4"
      style={BG_STYLE}
    >
      {/* Grid texture */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.025]"
        style={GRID_BG}
      />

      <motion.div
        className="relative w-full max-w-[380px]"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      >
        <Logo />

        {/* Card */}
        <div className="card p-6" style={{ borderColor: "oklch(1 0 0 / 0.09)" }}>
          <AnimatePresence mode="wait">
            {step === "credentials" ? (
              <motion.div
                key="credentials"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
              >
                <CredentialsStep onSuccess={handleMfaRequired} />
              </motion.div>
            ) : (
              <motion.div
                key="totp"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
              >
                <TotpStep factorId={factorId!} onBack={handleBack} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-[--muted-foreground] mt-5">
          OnVision s.r.o. · Interní systém · Přístup pouze pro oprávněné osoby
        </p>
      </motion.div>
    </div>
  );
}
