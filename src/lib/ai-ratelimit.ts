/**
 * Rate-limiting AI volání — ochrana proti zneužití Claude API.
 *
 * Volá bezpečnou Postgres funkci `check_ai_rate_limit` (SECURITY DEFINER) přes
 * service-role klíč. Počítadlo je v tabulce, ke které přihlášený uživatel nemá
 * přímý přístup — nedá se obejít zápisem do app_data.
 *
 * Čistý fetch (žádný supabase-js) → funguje na Node i Edge runtime.
 * Fail-open: když limiter selže, request pustíme (tvrdou pojistkou je spend
 * limit na Anthropic účtu) — AI se kvůli chybě limiteru nikdy nerozbije.
 *
 * Limit lze ladit přes env: AI_RATE_LIMIT (počet) / AI_RATE_WINDOW_SEC (okno).
 */
const LIMIT = Number(process.env.AI_RATE_LIMIT ?? 40);
const WINDOW = Number(process.env.AI_RATE_WINDOW_SEC ?? 300);

export const RATE_LIMIT_MSG = "Příliš mnoho AI požadavků. Zkus to prosím za chvíli.";

/** Vrátí true = povolit, false = překročen limit. */
export async function aiRateLimitOk(email: string | null | undefined): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !email) return true; // fail-open

  try {
    const res = await fetch(`${url}/rest/v1/rpc/check_ai_rate_limit`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_email: email, p_limit: LIMIT, p_window: WINDOW }),
    });
    if (!res.ok) return true; // fail-open při chybě limiteru
    return (await res.json()) === true;
  } catch {
    return true; // fail-open
  }
}
