# Bezpečnost OnVision OS

Přehled současných ochran a roadmapa, co dořešit při růstu týmu.

## Současný stav ✅

### Přístup a autentizace
- Veškerý obsah appky je **za přihlášením** (Supabase Auth). Nepřihlášeného `proxy.ts` přesměruje na `/login`.
- **Role systém** v `src/lib/roles.ts`: `admin / fakturace / ucetni / produkce / grafik / smm / pm`.
  Navigace i přístup k routám se řídí `ROLE_ROUTES` (`canAccess`).

### AI / Claude API
- Klíč `ANTHROPIC_API_KEY` je **jen serverový** (nikdy v prohlížeči).
- Všechny AI routy (`/api/ai`, `/api/ai/stream`, `/api/dashboard/briefing`, `/api/reports/generate`)
  vyžadují přihlášení + mají **strop tokenů** na dotaz.
- **Rate-limiting per uživatel** (`src/lib/ai-ratelimit.ts` + funkce `check_ai_rate_limit`):
  40 dotazů / 5 min, tunable přes `AI_RATE_LIMIT` / `AI_RATE_WINDOW_SEC`.
  *(Aktivuje se až po spuštění `docs/sql/ai-rate-limit.sql`.)*
- **Anthropic účet:** Free tier (5 req/min), měsíční spend limit **$20**, e-mail alert při $10,
  předplacené kredity = fyzický strop výdajů. Auto-reload vypnutý.

### Cron / automatizace
- `/api/cron/*` chráněné `CRON_SECRET` (Vercel přidává Authorization hlavičku).
- Telegram webhook (až bude nasazen) chráněný secretem + whitelistem ID.

### E-maily
- Odesílání přes Gmail SMTP (heslo aplikace), odměny se posílají **jen na lidský klik**.

### Row Level Security (RLS) — současný stav
- Tabulka `app_data` (hlavní úložiště): RLS **zapnuté**, ale pravidla pouští
  **každého přihlášeného uživatele číst i zapisovat vše**.
- Tabulka `ai_usage` (rate-limit): RLS zapnuté **bez politik** → uživatel nemá přímý přístup
  (zapisuje jen SECURITY DEFINER funkce). Nepodvoditelné.

---

## Roadmapa: RLS při přidávání lidí 🔒

> **Trigger:** první člověk s OMEZENÝM přístupem (externí spolupracovník, účetní,
> klient s náhledem). Dokud je tým interní a důvěryhodný, současný stav stačí.

### Cíl
Omezit přístup k datům podle role na úrovni databáze — ne jen v appce.
Příklady pravidel:
- **grafik** → úkoly a výstupy, NE finance/odměny
- **ucetni** → odměny a fakturace, NE interní chaty/projekty
- **klient** (kdyby měl přístup) → jen vlastní reporty

### Co bude potřeba
1. **Rozdělit citlivá data.** Dnes je vše v jednom `app_data` (key-value). Citlivé okruhy
   (odměny, finance, chaty) přesunout do vlastních tabulek, nebo k řádkům doplnit
   „vlastníka/role" pro filtrování.
2. **Napsat RLS policies** pro každou tabulku (SELECT/INSERT/UPDATE/DELETE podle role z JWT
   nebo z mapování e-mail → role).
3. **Citlivé API přepsat** z „pustí vše" na role-aware (server-side kontrola + RLS jako pojistka).
4. **Otestovat**, že omezený účet reálně nevidí cizí data (ne jen že je skryté v UI).

### Poznámky
- Role systém v appce (`roles.ts`) je dobrý základ — RLS na něj naváže.
- RLS je **poslední obranná linie**: i kdyby appka měla chybu, databáze cizí data nepustí.
- Doporučený postup: nejdřív nejcitlivější okruh (odměny/finance), pak zbytek.

---

## Rychlý checklist „přidáváme člověka s omezeným přístupem"
- [ ] Přidat uživatele do `roles.ts` (nebo `ov-user-roles`) se správnou rolí
- [ ] Ověřit, že `ROLE_ROUTES` pouští jen co má
- [ ] **Nastavit RLS policies** pro citlivá data (viz roadmapa výše)
- [ ] Otestovat omezeným účtem, že nevidí finance/odměny/cizí projekty
