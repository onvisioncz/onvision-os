/* ── Access-control pro KV sklad (app_data) ───────────────────────────────────
 * Jediné místo, kde se rozhoduje, KDO smí ČÍST a ZAPISOVAT který klíč.
 * Vynucuje se serverově v /api/sync (GET i POST) — UI schovávání je jen kosmetika,
 * skutečná ochrana citlivých dat (ceny klientů, výplaty, faktury, smlouvy) je tady.
 *
 * INVARIANT (hlídá test sync-acl.test.ts): READ role každého klíče musí být
 * NADMNOŽINOU jeho WRITE rolí. Jinak by „zapisovatel" načetl prázdno a přepsal
 * reálná data. Když přidáš klíč do WRITE, musí mít odpovídající READ přístup. */

import type { Role } from "@/lib/roles";

/* ── Zápis: role ───────────────────────────────────────────────────────────────
 * Klíč NEUVEDENÝ zde smí zapisovat jen admin (default deny). */
export const KEY_WRITE_ROLES: Record<string, Role[]> = {
  "ov-user-roles":          ["admin"],
  "ov-monthly-clients":     ["admin"],
  "ov-finance-summaries":   ["admin", "fakturace"],
  "ov-issued-invoices":     ["admin", "fakturace"],
  "ov-schvaleni-items":     ["admin", "fakturace"],
  "ov-finance-incomes":     ["admin", "fakturace"],
  "ov-finance-expenses":    ["admin", "fakturace"],
  "ov-finance-faktury":     ["admin", "fakturace"],
  "ov-finance-doklady":     ["admin", "fakturace"],
  "ov-cile":                ["admin", "fakturace"],
  "ov-odmeny":              ["admin", "fakturace", "ucetni"],
  "ov-vyhledy-zustatek":    ["admin", "fakturace"],
  "ov-pipeline-deals":      ["admin"],
  "ov-oneoffs-projects":    ["admin", "produkce"],
  "ov-ukoly-tasks":         ["admin", "pm", "produkce", "grafik", "smm", "fakturace"],
  "ov-ads-campaigns":       ["admin", "smm"],
  "ov-smm-plan":            ["admin", "smm"],
  "ov-smm-posts":           ["admin", "smm"],
  "ov-smm-hashtag-sets":    ["admin", "smm"],
  "ov-smm-pillars":         ["admin", "smm"],
  "ov-shooting-plan":       ["admin", "produkce"],
  "ov-shooting-days":       ["admin", "produkce"],
  "ov-absence":             ["admin", "produkce", "pm", "smm", "grafik"],
  "ov-shoot-checklists":    ["admin", "produkce", "pm"],
  "ov-produkce-zdenek":     ["admin", "produkce"],
  "ov-produkce-matej":      ["admin", "produkce"],
  "ov-produkce-grafici":    ["admin", "produkce", "grafik"],
  "ov-produkce-pending":    ["admin", "produkce"],
  "ov-outputs":             ["admin", "produkce", "grafik", "smm"],
  "ov-output-messages":     ["admin", "produkce", "grafik", "smm", "pm", "fakturace"],
  "ov-calendar-events":     ["admin", "pm", "smm"],
  "ov-reports-archive":     ["admin", "smm"],
  "ov-investice":           ["admin"],
  "ov-finance-predplatne":  ["admin", "fakturace"],
  "ov-push-subscriptions":  ["admin", "pm", "produkce", "grafik", "smm", "fakturace"],
  "ov-team-chat":           ["admin", "pm", "produkce", "grafik", "smm", "fakturace"],
  "ov-inbox-state":         ["admin", "pm", "produkce", "grafik", "smm", "fakturace", "ucetni"],
  "ov-contracts":           ["admin", "fakturace"],
  "ov-time-entries":        ["admin", "pm", "produkce", "grafik", "smm", "fakturace", "ucetni"],
  "ov-gear":                ["admin", "produkce", "grafik", "smm", "pm"],
  "ov-gear-reservations":   ["admin", "produkce", "grafik", "smm", "pm"],
  "ov-call-sheets":         ["admin", "produkce", "pm"],
  "ov-lokace":              ["admin", "produkce"],
  "ov-client-voice":        ["admin", "smm", "pm"],
  "ov-vyhledy-vystupy":     ["admin", "fakturace"],
  "ov-weekly-outlook":         ["admin", "smm", "pm"],
  "ov-weekly-outlook-submits": ["admin", "smm", "pm"],
  "ov-gdpr-consents":       ["admin", "fakturace"],
};

/* ── Zápis: konkrétní e-maily (nad rámec rolí) ─────────────────────────────── */
export const KEY_WRITE_EMAILS: Record<string, string[]> = {
  "ov-ads": ["tomas@onvision.cz"],
};

/* ── Čtení: role ────────────────────────────────────────────────────────────────
 * Klíč NEUVEDENÝ zde smí číst kdokoli přihlášený (provozní data — jména klientů,
 * úkoly, výstupy, technika, kalendář). Uvedené klíče jsou citlivé.
 * READ role je vždy nadmnožinou WRITE rolí téhož klíče (viz invariant). */
export const KEY_READ_ROLES: Record<string, Role[]> = {
  "ov-odmeny":              ["admin", "fakturace", "ucetni"],
  "ov-finance-summaries":   ["admin", "fakturace", "ucetni"],
  "ov-finance-incomes":     ["admin", "fakturace", "ucetni"],
  "ov-finance-expenses":    ["admin", "fakturace", "ucetni"],
  "ov-finance-faktury":     ["admin", "fakturace", "ucetni"],
  "ov-finance-doklady":     ["admin", "fakturace", "ucetni"],
  "ov-finance-predplatne":  ["admin", "fakturace", "ucetni"],
  "ov-issued-invoices":     ["admin", "fakturace", "ucetni"],
  "ov-schvaleni-items":     ["admin", "fakturace"],
  "ov-cile":                ["admin", "fakturace"],
  "ov-vyhledy-zustatek":    ["admin", "fakturace"],
  "ov-vyhledy-vystupy":     ["admin", "fakturace"],
  "ov-pipeline-deals":      ["admin", "fakturace"],
  "ov-oneoffs-projects":    ["admin", "fakturace", "produkce"],
  "ov-client-costs":        ["admin", "fakturace"],
  "ov-investice":           ["admin"],
  "ov-contracts":           ["admin", "fakturace"],
  "ov-gdpr-consents":       ["admin", "fakturace"],
  "ov-audit-log":           ["admin"],
  "ov-ads":                 ["admin"],
  "ov-ads-campaigns":       ["admin", "smm"],
  // Sazby týmu (Kč/h) a historie MRR — citlivá čísla, jen finance/vedení.
  "ov-team-rates":          ["admin", "fakturace", "ucetni"],
  "ov-mrr-history":         ["admin", "fakturace", "ucetni"],
  // Ryze vedení: AI konverzace, strategický plán, rychlé poznámky, zálohy, koš.
  "ov-ai-chats":            ["admin"],
  "ov-gameplan":            ["admin"],
  "ov-quick-notes":         ["admin"],
  "ov-backups":             ["admin"],
  "ov-trash":               ["admin"],
};

/* ── Čtení: konkrétní e-maily (nad rámec rolí) ─────────────────────────────── */
export const KEY_READ_EMAILS: Record<string, string[]> = {
  "ov-ads": ["tomas@onvision.cz"],
};

/* ── Redakce citlivých polí ───────────────────────────────────────────────────
 * Klíče míchající data pro všechny (jména/loga klientů) s citlivými (ceny).
 * Serverově odstřihneme peněžní pole těm, kdo je nemají vidět. */
export const FINANCE_READ_ROLES: Role[] = ["admin", "fakturace", "ucetni"];

export function canWriteKey(key: string, roles: Role[], email: string): boolean {
  if (roles.includes("admin")) return true;
  const allowedRoles = KEY_WRITE_ROLES[key];
  const allowedEmails = KEY_WRITE_EMAILS[key];
  if (!allowedRoles && !allowedEmails) return false; // neznámý klíč = jen admin
  const roleOk = allowedRoles?.some((r) => roles.includes(r)) ?? false;
  const emailOk = allowedEmails?.includes((email ?? "").toLowerCase()) ?? false;
  return roleOk || emailOk;
}

export function canReadKey(key: string, roles: Role[], email: string): boolean {
  if (roles.includes("admin")) return true;
  const allowedRoles = KEY_READ_ROLES[key];
  const allowedEmails = KEY_READ_EMAILS[key];
  if (!allowedRoles && !allowedEmails) return true; // neomezené provozní data
  const roleOk = allowedRoles?.some((r) => roles.includes(r)) ?? false;
  const emailOk = allowedEmails?.includes((email ?? "").toLowerCase()) ?? false;
  return roleOk || emailOk;
}

/** Klíč potřebuje dotaz na role při čtení (buď je gated, nebo se redaguje). */
export function readNeedsRoles(key: string): boolean {
  return key in KEY_READ_ROLES || key in KEY_READ_EMAILS || key === "ov-monthly-clients";
}

export function redactForRead(key: string, value: unknown, roles: Role[]): unknown {
  if (roles.includes("admin")) return value;
  if (key === "ov-monthly-clients" && Array.isArray(value)) {
    const privileged = FINANCE_READ_ROLES.some((r) => roles.includes(r));
    if (privileged) return value;
    return value.map((c) => {
      if (c && typeof c === "object") {
        const rest = { ...(c as Record<string, unknown>) };
        delete rest.pausal;
        delete rest.reklama;
        return rest;
      }
      return c;
    });
  }
  return value;
}
