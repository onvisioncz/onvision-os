"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, X, Check, Shield, Users, ChevronDown } from "lucide-react";
import { useSupabaseData } from "@/lib/hooks/use-supabase-data";
import { useUserRole } from "@/lib/hooks/use-user-role";
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

/* ── Main ─────────────────────────────────────────────────────────────────── */
export default function NastaveniPage() {
  const { user: currentUser } = useUserRole();
  const [users, setUsers] = useSupabaseData<UserConfig[]>(
    "ov-user-roles",
    () => DEFAULT_USERS
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [form, setForm] = useState<UserConfig>(emptyUser() as UserConfig);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"users" | "roles">("users");

  const isAdmin = currentUser?.roles.includes("admin") ?? false;

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

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Shield className="w-12 h-12 mx-auto mb-3" style={{ color: "oklch(0.38 0.005 222)" }} />
          <p className="text-[14px] font-medium" style={{ color: "oklch(0.55 0.005 222)" }}>
            Tato sekce je pouze pro administrátory.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight" style={{ color: "oklch(0.96 0.01 265)", fontFamily: "var(--font-outfit)" }}>
            Nastavení
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: "oklch(0.45 0.005 222)" }}>
            Správa uživatelů, rolí a přístupů
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-[8px] w-fit" style={{ background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.08)" }}>
        {(["users", "roles"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-1.5 rounded-[6px] text-[13px] font-medium transition-all"
            style={activeTab === tab ? {
              background: "oklch(0.62 0.27 265 / 0.15)",
              color: "oklch(0.78 0.18 265)",
              border: "1px solid oklch(0.62 0.27 265 / 0.25)",
            } : {
              color: "oklch(0.45 0.005 222)",
              border: "1px solid transparent",
            }}
          >
            {tab === "users" ? "Uživatelé" : "Role a přístupy"}
          </button>
        ))}
      </div>

      {activeTab === "users" && (
        <div className="space-y-3">
          {/* Add button */}
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

          {/* User list */}
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
                {/* Avatar */}
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

                {/* Info */}
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

                {/* Actions */}
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

      {activeTab === "roles" && (
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
              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-5 pb-4" style={{ borderBottom: "1px solid oklch(1 0 0 / 0.07)" }}>
                <h2 className="text-[16px] font-bold" style={{ color: "oklch(0.96 0.01 265)", fontFamily: "var(--font-outfit)" }}>
                  {editIndex !== null ? "Upravit uživatele" : "Přidat uživatele"}
                </h2>
                <button onClick={() => setModalOpen(false)} style={{ color: "oklch(0.42 0.005 222)" }}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
                {/* Name + Email */}
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

                {/* Avatar color */}
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

                {/* Roles */}
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

                {/* Clients */}
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

                {/* Active toggle */}
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

              {/* Footer */}
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
