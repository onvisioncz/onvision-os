"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Pencil, Trash2, X, Check, Shield,
  Smartphone, KeyRound, CheckCircle2, AlertTriangle, Copy,
} from "lucide-react";
import { useSupabaseData } from "@/lib/hooks/use-supabase-data";
import { useUserRole } from "@/lib/hooks/use-user-role";
import { createClient } from "@/lib/supabase/client";
import {
  UserConfig, Role, DEFAULT_USERS,
  ROLE_LABELS, ROLE_COLORS,
} from "@/lib/roles";

/* ── Helpers ─────────────────────────────────────────────────────────────── */
const ALL_ROLES: Role[] = ["admin", "fakturace", "produkce", "grafik", "smm", "pm"];

const PRESET_COLORS = [
  "oklch(0.62 0.27 265)",
  "oklch(0.72 0.2 310)",
  "oklch(0.67 0.155 155)",
  "oklch(0.75 0.19 48)",
  "oklch(0.68 0.18 180)",
  "oklch(0.65 0.22 25)",
  "oklch(0.70 0.18 0)",
  "oklch(0.78 0.18 180)",
];

const ALL_CLIENTS = [
  "IMTOS", "FIRESTA", "SK STAVOS BRNO SLATINA", "MTB CZ",
  "BEHEJ BRNO", "TOFFI", "SENIMED", "EASTGATE BRNO", "POWERPLATE",
  "OnVision",
];

function initFromName(name: string) {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const emptyUser = (): Omit<UserConfig, "aktivni"> & { aktivni: boolean } => ({
  email: "",
  displayName: "",
  roles: [],
  clients: [],
  color: PRESET_COLORS[0],
  initials: "",
  aktivni: true,
});

/* ── Role badge ──────────────────────────────────────────────────────────── */
function RoleBadge({ role }: { role: Role }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
      style={{
        background: `${ROLE_COLORS[role]}22`,
        color: ROLE_COLORS[role],
        border: `1px solid ${ROLE_COLORS[role]}44`,
      }}
    >
      {ROLE_LABELS[role]}
    </span>
  );
}

/* ── MFA Section ─────────────────────────────────────────────────────────── */
type MfaStatus = "loading" | "none" | "enrolled";
type EnrollStep = "idle" | "scanning" | "verifying";

function MfaSection() {
  const [status, setStatus]         = useState<MfaStatus>("loading");
  const [enrollStep, setEnrollStep] = useState<EnrollStep>("idle");
  const [qrCode, setQrCode]         = useState<string | null>(null);
  const [secret, setSecret]         = useState<string | null>(null);
  const [enrollFactorId, setEnrollFactorId] = useState<string | null>(null);
  const [code, setCode]             = useState(["", "", "", "", "", ""]);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [unenrollConfirm, setUnenrollConfirm] = useState(false);
  const [copied, setCopied]         = useState(false);
  const inputRefs                   = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    loadStatus();
  }, []);

  useEffect(() => {
    if (enrollStep === "scanning") {
      // Focus first digit after QR appears
      setTimeout(() => inputRefs.current[0]?.focus(), 300);
    }
  }, [enrollStep]);

  async function loadStatus() {
    const supabase = createClient();
    const { data } = await supabase.auth.mfa.listFactors();
    const verified = data?.totp?.filter(f => f.status === "verified") ?? [];
    setStatus(verified.length > 0 ? "enrolled" : "none");
  }

  async function startEnroll() {
    const supabase = createClient();
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    if (error || !data) return;

    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
    setEnrollFactorId(data.id);
    setCode(["", "", "", "", "", ""]);
    setVerifyError(null);
    setEnrollStep("scanning");
  }

  function handleCodeChange(idx: number, val: string) {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next  = [...code];
    next[idx]   = digit;
    setCode(next);
    if (digit && idx < 5) inputRefs.current[idx + 1]?.focus();
  }

  function handleCodeKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !code[idx] && idx > 0) inputRefs.current[idx - 1]?.focus();
    if (e.key === "ArrowLeft"  && idx > 0) inputRefs.current[idx - 1]?.focus();
    if (e.key === "ArrowRight" && idx < 5) inputRefs.current[idx + 1]?.focus();
  }

  function handleCodePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const next = [...code];
    for (let i = 0; i < digits.length; i++) next[i] = digits[i];
    setCode(next);
    inputRefs.current[Math.min(digits.length, 5)]?.focus();
  }

  async function verifyEnroll() {
    if (!enrollFactorId) return;
    const fullCode = code.join("");
    if (fullCode.length !== 6) return;

    setVerifyLoading(true);
    setVerifyError(null);

    const supabase = createClient();
    const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId: enrollFactorId });
    if (challengeErr || !challenge) {
      setVerifyError("Chyba ověření. Zkuste znovu.");
      setVerifyLoading(false);
      return;
    }

    const { error: verifyErr } = await supabase.auth.mfa.verify({
      factorId: enrollFactorId,
      challengeId: challenge.id,
      code: fullCode,
    });

    if (verifyErr) {
      setVerifyError("Nesprávný kód. Zkontrolujte čas v aplikaci.");
      setCode(["", "", "", "", "", ""]);
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
      setVerifyLoading(false);
      return;
    }

    setStatus("enrolled");
    setEnrollStep("idle");
    setQrCode(null);
    setSecret(null);
    setVerifyLoading(false);
  }

  async function cancelEnroll() {
    if (enrollFactorId) {
      const supabase = createClient();
      await supabase.auth.mfa.unenroll({ factorId: enrollFactorId });
    }
    setEnrollStep("idle");
    setQrCode(null);
    setSecret(null);
    setEnrollFactorId(null);
  }

  async function unenroll() {
    const supabase = createClient();
    const { data } = await supabase.auth.mfa.listFactors();
    const factor = data?.totp?.find(f => f.status === "verified");
    if (factor) {
      await supabase.auth.mfa.unenroll({ factorId: factor.id });
    }
    setStatus("none");
    setUnenrollConfirm(false);
  }

  function copySecret() {
    if (secret) {
      navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const codeComplete = code.every(d => d !== "");

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center py-16">
        <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none" style={{ color: "oklch(0.42 0.005 222)" }}>
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-lg">

      {/* Status card */}
      <div
        className="p-5 rounded-[12px]"
        style={{
          background: status === "enrolled"
            ? "oklch(0.67 0.155 155 / 0.06)"
            : "oklch(1 0 0 / 0.03)",
          border: status === "enrolled"
            ? "1px solid oklch(0.67 0.155 155 / 0.22)"
            : "1px solid oklch(1 0 0 / 0.08)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{
              background: status === "enrolled"
                ? "oklch(0.67 0.155 155 / 0.15)"
                : "oklch(1 0 0 / 0.06)",
            }}
          >
            {status === "enrolled"
              ? <CheckCircle2 className="w-5 h-5" style={{ color: "oklch(0.72 0.18 155)" }} />
              : <Shield className="w-5 h-5" style={{ color: "oklch(0.42 0.005 222)" }} />
            }
          </div>
          <div className="flex-1">
            <p className="text-[14px] font-semibold" style={{ color: "oklch(0.92 0.005 265)", fontFamily: "var(--font-outfit)" }}>
              {status === "enrolled" ? "Dvoufázové ověření je aktivní" : "Dvoufázové ověření není aktivní"}
            </p>
            <p className="text-[12px] mt-0.5" style={{ color: "oklch(0.42 0.005 222)" }}>
              {status === "enrolled"
                ? "Váš účet je chráněn TOTP kódem. Při přihlášení budete vyzvání k zadání kódu z aplikace."
                : "Aktivujte 2FA pro lepší ochranu vašeho účtu. Budete potřebovat Google Authenticator nebo Authy."}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-4 flex gap-2">
          {status === "none" && enrollStep === "idle" && (
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={startEnroll}
              className="flex items-center gap-2 px-4 py-2 rounded-[8px] text-[13px] font-semibold"
              style={{
                background: "oklch(0.62 0.27 265 / 0.15)",
                color: "oklch(0.78 0.18 265)",
                border: "1px solid oklch(0.62 0.27 265 / 0.3)",
              }}
            >
              <Smartphone className="w-3.5 h-3.5" />
              Aktivovat 2FA
            </motion.button>
          )}

          {status === "enrolled" && !unenrollConfirm && (
            <button
              onClick={() => setUnenrollConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-[8px] text-[13px] font-medium transition-colors"
              style={{
                background: "oklch(0.62 0.22 25 / 0.08)",
                color: "oklch(0.68 0.18 25)",
                border: "1px solid oklch(0.62 0.22 25 / 0.2)",
              }}
            >
              <X className="w-3.5 h-3.5" />
              Deaktivovat 2FA
            </button>
          )}

          {status === "enrolled" && unenrollConfirm && (
            <div className="flex items-center gap-2">
              <span className="text-[12px]" style={{ color: "oklch(0.68 0.18 25)" }}>
                Opravdu deaktivovat?
              </span>
              <button
                onClick={unenroll}
                className="px-3 py-1.5 rounded-[6px] text-[12px] font-semibold"
                style={{ background: "oklch(0.62 0.22 25 / 0.15)", color: "oklch(0.68 0.18 25)", border: "1px solid oklch(0.62 0.22 25 / 0.3)" }}
              >
                Ano, deaktivovat
              </button>
              <button
                onClick={() => setUnenrollConfirm(false)}
                className="px-3 py-1.5 rounded-[6px] text-[12px]"
                style={{ color: "oklch(0.42 0.005 222)" }}
              >
                Zrušit
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Enrollment flow */}
      <AnimatePresence>
        {enrollStep === "scanning" && qrCode && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="p-5 rounded-[12px] space-y-5"
            style={{
              background: "oklch(1 0 0 / 0.03)",
              border: "1px solid oklch(0.62 0.27 265 / 0.2)",
            }}
          >
            <div>
              <h3 className="text-[14px] font-semibold" style={{ color: "oklch(0.92 0.005 265)", fontFamily: "var(--font-outfit)" }}>
                1. Naskenujte QR kód
              </h3>
              <p className="text-[12px] mt-1" style={{ color: "oklch(0.42 0.005 222)" }}>
                Otevřete Google Authenticator nebo Authy a naskenujte tento QR kód.
              </p>
            </div>

            {/* QR Code */}
            <div className="flex justify-center">
              <div
                className="p-3 rounded-[10px]"
                style={{ background: "oklch(0.98 0.003 265)" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrCode}
                  alt="QR kód pro 2FA"
                  width={160}
                  height={160}
                  style={{ display: "block", imageRendering: "pixelated" }}
                />
              </div>
            </div>

            {/* Manual secret */}
            {secret && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "oklch(0.38 0.005 222)" }}>
                  Nebo zadejte ručně
                </p>
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-[7px]"
                  style={{ background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.09)" }}
                >
                  <code className="flex-1 text-[12px] font-mono break-all" style={{ color: "oklch(0.72 0.01 265)" }}>
                    {secret}
                  </code>
                  <button onClick={copySecret} className="shrink-0 transition-colors" style={{ color: copied ? "oklch(0.72 0.18 155)" : "oklch(0.42 0.005 222)" }}>
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            )}

            <div className="border-t" style={{ borderColor: "oklch(1 0 0 / 0.07)" }} />

            {/* Step 2: verify */}
            <div>
              <h3 className="text-[14px] font-semibold mb-1" style={{ color: "oklch(0.92 0.005 265)", fontFamily: "var(--font-outfit)" }}>
                2. Zadejte kód z aplikace
              </h3>
              <p className="text-[12px] mb-4" style={{ color: "oklch(0.42 0.005 222)" }}>
                Aplikace vám zobrazí 6místný kód — zadejte ho níže pro potvrzení.
              </p>

              {verifyError && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-[7px] text-[12px] mb-4"
                  style={{
                    background: "oklch(0.62 0.22 25 / 0.08)",
                    border: "1px solid oklch(0.62 0.22 25 / 0.2)",
                    color: "oklch(0.75 0.18 25)",
                  }}
                >
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {verifyError}
                </motion.div>
              )}

              {/* 6-digit input */}
              <div className="flex gap-2 mb-4" onPaste={handleCodePaste}>
                {code.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={el => { inputRefs.current[idx] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleCodeChange(idx, e.target.value)}
                    onKeyDown={e => handleCodeKeyDown(idx, e)}
                    className="w-10 h-11 text-center rounded-[7px] text-[16px] font-bold outline-none transition-all"
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
                    onBlur={e => (e.target.style.borderColor = digit ? "oklch(0.62 0.27 265 / 0.6)" : "oklch(1 0 0 / 0.1)")}
                  />
                ))}
              </div>

              <div className="flex gap-2">
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={verifyEnroll}
                  disabled={!codeComplete || verifyLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-[8px] text-[13px] font-semibold disabled:opacity-50"
                  style={{
                    background: "oklch(0.62 0.27 265)",
                    color: "oklch(0.97 0.004 265)",
                    fontFamily: "var(--font-outfit)",
                  }}
                >
                  {verifyLoading ? (
                    <>
                      <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Ověřuji...
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-3.5 h-3.5" />
                      Aktivovat 2FA
                    </>
                  )}
                </motion.button>

                <button
                  onClick={cancelEnroll}
                  className="px-4 py-2 rounded-[8px] text-[13px]"
                  style={{ color: "oklch(0.42 0.005 222)" }}
                >
                  Zrušit
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info note */}
      {status === "none" && enrollStep === "idle" && (
        <div
          className="flex items-start gap-3 px-4 py-3 rounded-[9px] text-[12px]"
          style={{
            background: "oklch(0.62 0.27 265 / 0.05)",
            border: "1px solid oklch(0.62 0.27 265 / 0.12)",
            color: "oklch(0.55 0.01 265)",
          }}
        >
          <Smartphone className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "oklch(0.62 0.27 265 / 0.6)" }} />
          <span>
            Doporučujeme aktivovat 2FA pro všechny členy týmu. Podporované aplikace: Google Authenticator, Authy, 1Password, Bitwarden.
          </span>
        </div>
      )}
    </div>
  );
}

/* ── Main ─────────────────────────────────────────────────────────────────── */
type Tab = "users" | "roles" | "security";

export default function NastaveniPage() {
  const { user: currentUser } = useUserRole();
  const [users, setUsers] = useSupabaseData<UserConfig[]>(
    "ov-user-roles",
    () => DEFAULT_USERS
  );

  const [modalOpen, setModalOpen]   = useState(false);
  const [editIndex, setEditIndex]   = useState<number | null>(null);
  const [form, setForm]             = useState<UserConfig>(emptyUser() as UserConfig);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [activeTab, setActiveTab]   = useState<Tab>("security");

  const isAdmin = currentUser?.roles.includes("admin") ?? false;

  // Admin tabs + security for everyone
  const tabs: { id: Tab; label: string }[] = [
    ...(isAdmin ? [
      { id: "users" as Tab, label: "Uživatelé" },
      { id: "roles" as Tab, label: "Role a přístupy" },
    ] : []),
    { id: "security" as Tab, label: "Zabezpečení" },
  ];

  function openAdd() {
    setForm(emptyUser() as UserConfig);
    setEditIndex(null);
    setModalOpen(true);
  }

  function openEdit(idx: number) {
    setForm({ ...users[idx] });
    setEditIndex(idx);
    setModalOpen(true);
  }

  function saveUser() {
    const finalInitials = form.initials || initFromName(form.displayName);
    const updated = { ...form, initials: finalInitials };
    if (editIndex !== null) {
      setUsers(prev => prev.map((u, i) => i === editIndex ? updated : u));
    } else {
      setUsers(prev => [...prev, updated]);
    }
    setModalOpen(false);
  }

  function deleteUser(idx: number) {
    setUsers(prev => prev.filter((_, i) => i !== idx));
    setDeleteConfirm(null);
  }

  function toggleRole(role: Role) {
    setForm(prev => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter(r => r !== role)
        : [...prev.roles, role],
    }));
  }

  function toggleClient(client: string) {
    setForm(prev => ({
      ...prev,
      clients: prev.clients.includes(client)
        ? prev.clients.filter(c => c !== client)
        : [...prev.clients, client],
    }));
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[22px] font-bold tracking-tight" style={{ color: "oklch(0.96 0.01 265)", fontFamily: "var(--font-outfit)" }}>
          Nastavení
        </h1>
        <p className="text-[13px] mt-0.5" style={{ color: "oklch(0.45 0.005 222)" }}>
          {isAdmin ? "Správa uživatelů, rolí a přístupů" : "Zabezpečení účtu"}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-[8px] w-fit" style={{ background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.08)" }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-4 py-1.5 rounded-[6px] text-[13px] font-medium transition-all"
            style={activeTab === tab.id ? {
              background: "oklch(0.62 0.27 265 / 0.15)",
              color: "oklch(0.78 0.18 265)",
              border: "1px solid oklch(0.62 0.27 265 / 0.25)",
            } : {
              color: "oklch(0.45 0.005 222)",
              border: "1px solid transparent",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Users tab */}
      {activeTab === "users" && isAdmin && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <motion.button
              onClick={openAdd}
              whileTap={{ scale: 0.96 }}
              className="flex items-center gap-2 px-4 py-2 rounded-[8px] text-[13px] font-semibold"
              style={{
                background: "oklch(0.62 0.27 265 / 0.15)",
                color: "oklch(0.78 0.18 265)",
                border: "1px solid oklch(0.62 0.27 265 / 0.3)",
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              Přidat uživatele
            </motion.button>
          </div>

          <div className="space-y-2">
            {users.map((u, idx) => (
              <motion.div
                key={u.email}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-4 p-4 rounded-[10px]"
                style={{
                  background: "oklch(1 0 0 / 0.03)",
                  border: "1px solid oklch(1 0 0 / 0.07)",
                }}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0"
                  style={{
                    background: u.color,
                    color: "oklch(0.97 0.004 265)",
                    fontFamily: "var(--font-outfit)",
                  }}
                >
                  {u.initials}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[14px] font-semibold" style={{ color: "oklch(0.92 0.005 265)" }}>
                      {u.displayName}
                    </span>
                    {!u.aktivni && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "oklch(0.5 0.005 222 / 0.3)", color: "oklch(0.5 0.005 222)" }}>
                        Neaktivní
                      </span>
                    )}
                    {u.roles.map(r => <RoleBadge key={r} role={r} />)}
                  </div>
                  <p className="text-[12px] mt-0.5 truncate" style={{ color: "oklch(0.42 0.005 222)" }}>
                    {u.email}
                    {u.clients.length > 0 && ` · ${u.clients.join(", ")}`}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => openEdit(idx)}
                    className="p-1.5 rounded-[6px]"
                    style={{ color: "oklch(0.42 0.005 222)" }}
                    title="Upravit"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </motion.button>
                  {deleteConfirm === idx ? (
                    <div className="flex items-center gap-1">
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => deleteUser(idx)}
                        className="p-1.5 rounded-[6px] text-red-400"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setDeleteConfirm(null)}
                        className="p-1.5 rounded-[6px]"
                        style={{ color: "oklch(0.42 0.005 222)" }}
                      >
                        <X className="w-3.5 h-3.5" />
                      </motion.button>
                    </div>
                  ) : (
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setDeleteConfirm(idx)}
                      className="p-1.5 rounded-[6px]"
                      style={{ color: "oklch(0.42 0.005 222)" }}
                      title="Smazat"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </motion.button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Roles tab */}
      {activeTab === "roles" && isAdmin && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {ALL_ROLES.map(role => (
              <div
                key={role}
                className="p-4 rounded-[10px] space-y-3"
                style={{
                  background: "oklch(1 0 0 / 0.03)",
                  border: `1px solid ${ROLE_COLORS[role]}33`,
                }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: ROLE_COLORS[role] }} />
                  <span className="text-[14px] font-semibold" style={{ color: "oklch(0.92 0.005 265)" }}>
                    {ROLE_LABELS[role]}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {users
                    .filter(u => u.roles.includes(role) && u.aktivni)
                    .map(u => (
                      <div
                        key={u.email}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-full"
                        style={{ background: `${u.color}20`, border: `1px solid ${u.color}44` }}
                      >
                        <div className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold" style={{ background: u.color }}>
                          {u.initials}
                        </div>
                        <span className="text-[11px]" style={{ color: "oklch(0.78 0.005 265)" }}>
                          {u.displayName.split(" ")[0]}
                        </span>
                      </div>
                    ))}
                  {users.filter(u => u.roles.includes(role) && u.aktivni).length === 0 && (
                    <span className="text-[11px]" style={{ color: "oklch(0.35 0.005 222)" }}>Nikdo</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Security tab */}
      {activeTab === "security" && <MfaSection />}

      {/* ── Add/Edit Modal ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0"
              style={{ background: "oklch(0.05 0.008 222 / 0.85)" }}
              onClick={() => setModalOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 12 }}
              transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
              className="relative w-full max-w-lg rounded-[14px] overflow-hidden"
              style={{
                background: "oklch(0.12 0.008 222)",
                border: "1px solid oklch(1 0 0 / 0.1)",
                boxShadow: "0 24px 64px oklch(0 0 0 / 0.6)",
              }}
            >
              <div className="flex items-center justify-between px-6 pt-5 pb-4" style={{ borderBottom: "1px solid oklch(1 0 0 / 0.07)" }}>
                <h2 className="text-[16px] font-bold" style={{ color: "oklch(0.96 0.01 265)", fontFamily: "var(--font-outfit)" }}>
                  {editIndex !== null ? "Upravit uživatele" : "Přidat uživatele"}
                </h2>
                <button onClick={() => setModalOpen(false)} style={{ color: "oklch(0.42 0.005 222)" }}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "oklch(0.42 0.005 222)" }}>Jméno</label>
                    <input
                      value={form.displayName}
                      onChange={e => setForm(p => ({
                        ...p,
                        displayName: e.target.value,
                        initials: p.initials || initFromName(e.target.value),
                      }))}
                      placeholder="Adam Mendrek"
                      className="w-full px-3 py-2 rounded-[7px] text-[13px] outline-none"
                      style={{
                        background: "oklch(1 0 0 / 0.05)",
                        border: "1px solid oklch(1 0 0 / 0.1)",
                        color: "oklch(0.92 0.005 265)",
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "oklch(0.42 0.005 222)" }}>Iniciály</label>
                    <input
                      value={form.initials}
                      onChange={e => setForm(p => ({ ...p, initials: e.target.value.toUpperCase().slice(0, 2) }))}
                      placeholder="AM"
                      maxLength={2}
                      className="w-full px-3 py-2 rounded-[7px] text-[13px] outline-none"
                      style={{
                        background: "oklch(1 0 0 / 0.05)",
                        border: "1px solid oklch(1 0 0 / 0.1)",
                        color: "oklch(0.92 0.005 265)",
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "oklch(0.42 0.005 222)" }}>Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="jmeno@onvision.cz"
                    className="w-full px-3 py-2 rounded-[7px] text-[13px] outline-none"
                    style={{
                      background: "oklch(1 0 0 / 0.05)",
                      border: "1px solid oklch(1 0 0 / 0.1)",
                      color: "oklch(0.92 0.005 265)",
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "oklch(0.42 0.005 222)" }}>Barva avataru</label>
                  <div className="flex gap-2 flex-wrap">
                    {PRESET_COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => setForm(p => ({ ...p, color: c }))}
                        className="w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                        style={{
                          background: c,
                          outline: form.color === c ? `2px solid oklch(0.92 0.005 265)` : "2px solid transparent",
                          outlineOffset: "2px",
                        }}
                      >
                        {form.color === c && <Check className="w-3 h-3 text-white" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "oklch(0.42 0.005 222)" }}>Role</label>
                  <div className="flex flex-wrap gap-2">
                    {ALL_ROLES.map(role => {
                      const active = form.roles.includes(role);
                      return (
                        <button
                          key={role}
                          onClick={() => toggleRole(role)}
                          className="px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all"
                          style={active ? {
                            background: `${ROLE_COLORS[role]}22`,
                            color: ROLE_COLORS[role],
                            border: `1px solid ${ROLE_COLORS[role]}66`,
                          } : {
                            background: "oklch(1 0 0 / 0.04)",
                            color: "oklch(0.42 0.005 222)",
                            border: "1px solid oklch(1 0 0 / 0.08)",
                          }}
                        >
                          {ROLE_LABELS[role]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "oklch(0.42 0.005 222)" }}>
                    Klienti (zodpovědnost)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {ALL_CLIENTS.map(client => {
                      const active = form.clients.includes(client);
                      return (
                        <button
                          key={client}
                          onClick={() => toggleClient(client)}
                          className="px-2.5 py-1 rounded-[5px] text-[11px] font-medium transition-all"
                          style={active ? {
                            background: "oklch(0.62 0.27 265 / 0.15)",
                            color: "oklch(0.78 0.18 265)",
                            border: "1px solid oklch(0.62 0.27 265 / 0.3)",
                          } : {
                            background: "oklch(1 0 0 / 0.04)",
                            color: "oklch(0.42 0.005 222)",
                            border: "1px solid oklch(1 0 0 / 0.08)",
                          }}
                        >
                          {client}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between py-2">
                  <label className="text-[13px] font-medium" style={{ color: "oklch(0.78 0.005 265)" }}>Aktivní účet</label>
                  <button
                    onClick={() => setForm(p => ({ ...p, aktivni: !p.aktivni }))}
                    className="relative w-10 h-5 rounded-full transition-colors"
                    style={{ background: form.aktivni ? "oklch(0.62 0.27 265)" : "oklch(0.25 0.005 222)" }}
                  >
                    <div
                      className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                      style={{ transform: form.aktivni ? "translateX(22px)" : "translateX(2px)" }}
                    />
                  </button>
                </div>
              </div>

              <div className="flex gap-2 justify-end px-6 py-4" style={{ borderTop: "1px solid oklch(1 0 0 / 0.07)" }}>
                <button
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-[8px] text-[13px] font-medium"
                  style={{ background: "oklch(1 0 0 / 0.05)", color: "oklch(0.55 0.005 222)", border: "1px solid oklch(1 0 0 / 0.08)" }}
                >
                  Zrušit
                </button>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={saveUser}
                  disabled={!form.email || !form.displayName || form.roles.length === 0}
                  className="px-5 py-2 rounded-[8px] text-[13px] font-semibold"
                  style={{
                    background: form.email && form.displayName && form.roles.length > 0
                      ? "oklch(0.62 0.27 265)"
                      : "oklch(0.62 0.27 265 / 0.3)",
                    color: "oklch(0.97 0.004 265)",
                  }}
                >
                  {editIndex !== null ? "Uložit" : "Přidat"}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
