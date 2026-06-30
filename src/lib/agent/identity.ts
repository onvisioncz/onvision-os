/**
 * Identita pro agenta — kdo agentovi zadává příkaz a jakou má roli.
 *
 * Agent může být osloven dvěma kanály:
 *   1) z appky (přihlášený uživatel přes cookie) → identityFromEmail()
 *   2) z Telegramu (žádná cookie) → identityFromTelegramId()
 *
 * Telegram je VEŘEJNÝ endpoint. Pustíme dál jen čísla z whitelistu
 * (env TELEGRAM_USER_MAP), namapovaná na OnVision e-mail = roli.
 */
import { DEFAULT_USERS, type Role, type UserConfig } from "@/lib/roles";

export interface AgentIdentity {
  email: string;
  displayName: string;
  roles: Role[];
  clients: string[];
  isAdmin: boolean;
}

function toIdentity(u: UserConfig): AgentIdentity {
  return {
    email: u.email,
    displayName: u.displayName,
    roles: u.roles,
    clients: u.clients,
    isAdmin: u.roles.includes("admin"),
  };
}

/** Najde OnVision uživatele podle e-mailu (case-insensitive). */
export function identityFromEmail(email: string | null | undefined): AgentIdentity | null {
  if (!email) return null;
  const u = DEFAULT_USERS.find(
    (x) => x.email.toLowerCase() === email.toLowerCase() && x.aktivni
  );
  return u ? toIdentity(u) : null;
}

/**
 * Mapa Telegram číselné ID → OnVision e-mail.
 * Nastav v env jako JSON, např.:
 *   TELEGRAM_USER_MAP={"123456789":"info@onvision.cz","987654321":"jan@onvision.cz"}
 * (Své Telegram ID zjistíš tak, že botovi napíšeš — neznámé ID se zaloguje.)
 */
function telegramUserMap(): Record<string, string> {
  const raw = process.env.TELEGRAM_USER_MAP;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed;
  } catch {
    console.error("[agent] TELEGRAM_USER_MAP není platný JSON — bot nikoho nepustí dál.");
    return {};
  }
}

/** Vrátí identitu jen pro Telegram ID na whitelistu, jinak null (= odmítnout). */
export function identityFromTelegramId(telegramId: number | string): AgentIdentity | null {
  const email = telegramUserMap()[String(telegramId)];
  return email ? identityFromEmail(email) : null;
}

/** Seznam aktivních uživatelů — pro mapování "přiřaď to Adamovi" na reálné jméno. */
export function activeUsers(): AgentIdentity[] {
  return DEFAULT_USERS.filter((u) => u.aktivni).map(toIdentity);
}

/**
 * Fuzzy mapování zadaného jména ("Adam", "adamovi", "AM") na kanonický displayName.
 * Vrátí null, když nenajde jednoznačnou shodu.
 */
export function resolveAssignee(input: string): AgentIdentity | null {
  const q = input.trim().toLowerCase();
  if (!q) return null;
  const users = activeUsers();

  // přesná shoda na displayName / e-mail / iniciály
  const exact = users.find(
    (u) =>
      u.displayName.toLowerCase() === q ||
      u.email.toLowerCase() === q ||
      u.email.split("@")[0].toLowerCase() === q
  );
  if (exact) return exact;

  // shoda na křestní jméno nebo začátek (handles "adamovi" → "adam")
  const firstNameMatches = users.filter((u) => {
    const first = u.displayName.split(" ")[0].toLowerCase();
    return q.startsWith(first) || first.startsWith(q) || u.displayName.toLowerCase().includes(q);
  });
  return firstNameMatches.length === 1 ? firstNameMatches[0] : null;
}
