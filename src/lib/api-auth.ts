/* ── Serverová autorizace pro API routy ───────────────────────────────────────
 * Zjistí role uživatele z uloženého rosteru. Čte přes service-role klienta,
 * protože app_data je pod RLS zamčené pro uživatelský token. */

import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_USERS, type Role } from "@/lib/roles";

export async function rolesForEmail(email: string | null | undefined): Promise<Role[]> {
  const mail = (email ?? "").toLowerCase();
  if (!mail) return [];
  const fallback = () => DEFAULT_USERS.find((u) => u.email.toLowerCase() === mail)?.roles ?? [];
  try {
    const db = createAdminClient();
    const { data } = await db.from("app_data").select("value").eq("key", "ov-user-roles").maybeSingle();
    const users: typeof DEFAULT_USERS = Array.isArray(data?.value) ? data.value : DEFAULT_USERS;
    return users.find((u) => u.email.toLowerCase() === mail)?.roles ?? fallback();
  } catch {
    return fallback();
  }
}

export async function hasAnyRole(email: string | null | undefined, allowed: Role[]): Promise<boolean> {
  const roles = await rolesForEmail(email);
  if (roles.includes("admin")) return true;
  return allowed.some((r) => roles.includes(r));
}
