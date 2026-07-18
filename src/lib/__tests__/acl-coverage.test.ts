/**
 * Invariantní strážce ACL: každý datový klíč "ov-…" použitý ve zdrojáku musí
 * být buď v sync-acl (vědomé rozhodnutí o právech), nebo v seznamu
 * PUBLIC_OPERATIONAL níže (vědomé rozhodnutí, že je neškodný pro všechny
 * přihlášené). Nový klíč bez rozhodnutí = spadlý test. Tím se nikdy nestane,
 * že by citlivá data unikla jen proto, že někdo zapomněl na ACL.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { KEY_READ_ROLES, KEY_WRITE_ROLES, KEY_READ_EMAILS, KEY_WRITE_EMAILS } from "../sync-acl";

/** Klíče vědomě čitelné každým přihlášeným zaměstnancem (žádné částky/mzdy). */
const PUBLIC_OPERATIONAL = new Set([
  "ov-notif-events",        // eventy (adminOnly položky filtruje redactForRead)
  "ov-notif-last-seen",     // localStorage klíč banneru (není v DB)
  "ov-task-badge-seen",     // localStorage
  "ov-briefing-minimized",  // localStorage
  "ov-briefing-",           // prefix denního briefingu (bez částek)
  "ov-command-palette",     // localStorage historie příkazů
  "ov-nav-groups",          // localStorage stav navigace
  "ov-nebula",              // localStorage vizuální předvolba
  "ov-sync",                // BroadcastChannel název, není DB klíč
  "ov-team-chat-realtime",  // kanál realtime, není DB klíč
  "ov-client-approvals",    // schvalování obsahu klientem (bez částek)
  "ov-client-shares",       // sdílené odkazy pro klienty
  "ov-deliveries",          // delivery odkazy (tokeny, bez cen)
  "ov-nps",                 // hodnocení spokojenosti (bez částek)
  "ov-obsah-pipeline",      // obsahová pipeline (bez částek)
  "ov-selfcheck-state",     // jen hash + počet nálezů
  "ov-agent-pending",       // telegram pending mapa (server-only)
]);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

describe("ACL pokrytí: žádný klíč bez rozhodnutí o právech", () => {
  it("každý ov-* klíč ve zdrojáku je v sync-acl nebo v PUBLIC_OPERATIONAL", () => {
    const acl = new Set([
      ...Object.keys(KEY_READ_ROLES), ...Object.keys(KEY_WRITE_ROLES),
      ...Object.keys(KEY_READ_EMAILS), ...Object.keys(KEY_WRITE_EMAILS),
    ]);
    const used = new Set<string>();
    for (const file of walk(join(__dirname, "..", ".."))) {
      const src = readFileSync(file, "utf8");
      for (const m of src.matchAll(/"(ov-[a-z0-9-]+)"/g)) used.add(m[1]);
    }
    expect(used.size).toBeGreaterThan(30); // sanity: scan opravdu něco našel

    const unaccounted = [...used].filter((k) => !acl.has(k) && !PUBLIC_OPERATIONAL.has(k));
    expect(unaccounted, `Klíče bez rozhodnutí o právech (přidej do sync-acl, nebo vědomě do PUBLIC_OPERATIONAL): ${unaccounted.join(", ")}`).toEqual([]);
  });
});
