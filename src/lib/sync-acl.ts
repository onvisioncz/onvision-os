/* ── Access-control pro KV sklad (app_data) ───────────────────────────────────
 * Jediné místo, kde se rozhoduje, KDO smí ČÍST a ZAPISOVAT který klíč.
 * Vynucuje se serverově v /api/sync (GET i POST) — UI schovávání je jen kosmetika,
 * skutečná ochrana citlivých dat (ceny klientů, výplaty, faktury, smlouvy) je tady.
 *
 * INVARIANT (hlídá test sync-acl.test.ts): READ role každého klíče musí být
 * NADMNOŽINOU jeho WRITE rolí. Jinak by „zapisovatel" načetl prázdno a přepsal
 * reálná data. Když přidáš klíč do WRITE, musí mít odpovídající READ přístup. */

import type { Role } from "@/lib/roles";
import { isMine, canSeeAllTasks } from "./task-owner";

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
  "ov-odmeny":              ["admin", "fakturace"],
  "ov-vyhledy-zustatek":    ["admin", "fakturace"],
  "ov-pipeline-deals":      ["admin"],
  "ov-oneoffs-projects":    ["admin", "produkce"],
  "ov-ukoly-tasks":         ["admin", "pm", "produkce", "grafik", "smm", "fakturace"],
  "ov-ads-campaigns":       ["admin"],
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
  "ov-odmeny":              ["admin", "fakturace"],
  "ov-finance-summaries":   ["admin", "fakturace"],
  "ov-finance-incomes":     ["admin", "fakturace"],
  "ov-finance-expenses":    ["admin", "fakturace"],
  "ov-finance-faktury":     ["admin", "fakturace"],
  "ov-finance-doklady":     ["admin", "fakturace"],
  "ov-finance-predplatne":  ["admin", "fakturace"],
  "ov-issued-invoices":     ["admin", "fakturace"],
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
  "ov-ads-campaigns":       ["admin"],
  // Sazby týmu (Kč/h) a historie MRR — citlivá čísla, jen finance/vedení.
  "ov-team-rates":          ["admin", "fakturace"],
  "ov-mrr-history":         ["admin", "fakturace"],
  // Ryze vedení: AI konverzace, strategický plán, rychlé poznámky, zálohy, koš.
  "ov-ai-chats":            ["admin"],
  "ov-gameplan":            ["admin"],
  "ov-weekly-brief":        ["admin"],
  "ov-monthly-review":      ["admin"],
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
export const FINANCE_READ_ROLES: Role[] = ["admin", "fakturace"];

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
  return key in KEY_READ_ROLES || key in KEY_READ_EMAILS
    || key === "ov-monthly-clients" || key === "ov-notif-events" || key === "ov-ukoly-tasks";
}

export function redactForRead(key: string, value: unknown, roles: Role[], myFirst = ""): unknown {
  if (roles.includes("admin")) return value;
  // Úkoly: každý čte JEN svoje přiřazené (admin + pm vidí vše kvůli koordinaci).
  // Úkol s částkou v poznámce tak nikdy nedoputuje k nikomu jinému než adresátovi.
  if (key === "ov-ukoly-tasks" && Array.isArray(value)) {
    if (canSeeAllTasks(roles)) return value;
    return value.filter((t) =>
      t && typeof t === "object" && isMine(String((t as Record<string, unknown>).prirazeno ?? ""), myFirst)
    );
  }
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
  // Jednorázovky: produkce potřebuje projekty pro práci, ale ceny vidí jen
  // jednatelé + fakturace. Ostatním se castka serverově odstřihne.
  if (key === "ov-oneoffs-projects" && Array.isArray(value)) {
    const privileged = FINANCE_READ_ROLES.some((r) => roles.includes(r));
    if (privileged) return value;
    return value.map((p) => {
      if (p && typeof p === "object") {
        const rest = { ...(p as Record<string, unknown>) };
        delete rest.castka;
        return rest;
      }
      return p;
    });
  }
  // Notifikační eventy: položky označené adminOnly (selfcheck nálezy s
  // částkami, cash-gap…) se ne-adminům server-side odfiltrují.
  if (key === "ov-notif-events" && Array.isArray(value)) {
    return value.filter((e) => !(e && typeof e === "object" && (e as Record<string, unknown>).adminOnly === true));
  }
  return value;
}

/* ── Ochrana redagovaných polí při zápisu ─────────────────────────────────────
 * Kdo dostal data BEZ cen (produkce u jednorázovek), nesmí je uložením smazat.
 * Před zápisem se citlivá pole obnoví z existující hodnoty v DB (párování dle id). */
export function mergeProtectedWrite(key: string, incoming: unknown, existing: unknown, roles: Role[], myFirst = ""): unknown {
  if (roles.includes("admin")) return incoming;
  // Úkoly: kdo nevidí vše, smí měnit/mazat JEN svoje. Cizí existující úkoly se
  // zachovají z DB beze změny; nové úkoly (id, které v DB není) projdou — to je
  // legitimní „zadal jsem kolegovi úkol" (např. z checklistu jednorázovky).
  if (key === "ov-ukoly-tasks" && Array.isArray(incoming)) {
    if (canSeeAllTasks(roles)) return incoming;
    const prev = (Array.isArray(existing) ? existing : [])
      .filter((t): t is Record<string, unknown> => !!t && typeof t === "object");
    const prevIds = new Set(prev.map((t) => t.id));
    const others = prev.filter((t) => !isMine(String(t.prirazeno ?? ""), myFirst));
    const allowed = incoming.filter((t) => {
      if (!t || typeof t !== "object") return false;
      const rec = t as Record<string, unknown>;
      const mine = isMine(String(rec.prirazeno ?? ""), myFirst);
      return mine || !prevIds.has(rec.id); // svoje cokoliv; cizí jen NOVÉ
    });
    return [...others, ...allowed];
  }
  if (key === "ov-oneoffs-projects" && Array.isArray(incoming)) {
    const privileged = FINANCE_READ_ROLES.some((r) => roles.includes(r));
    if (privileged) return incoming;
    const prevById = new Map(
      (Array.isArray(existing) ? existing : [])
        .filter((p): p is Record<string, unknown> => !!p && typeof p === "object")
        .map((p) => [p.id, p])
    );
    return incoming.map((p) => {
      if (p && typeof p === "object") {
        const prev = prevById.get((p as Record<string, unknown>).id);
        return { ...(p as Record<string, unknown>), castka: (prev?.castka as number | undefined) ?? 0 };
      }
      return p;
    });
  }
  return incoming;
}
