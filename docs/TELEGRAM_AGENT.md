# Telegram agent OnVision

Řízení agentury z mobilu. Pošleš botovi text nebo hlasovku, agent čte CRM a po
potvrzení i zapisuje (např. zadá úkol → příjemce dostane push notifikaci).

## Architektura

```
Telegram (text / hlasovka)
        │
        ▼
/api/telegram  ── ověří secret + whitelist ID
        │
        ▼
runAgent()  ── Claude s nástroji (tool use)
        │            ├─ READ: list_tasks, list_invoices  → odpoví hned
        │            └─ WRITE: create_task → návrh + tlačítka Potvrdit/Zrušit
        ▼
app_data (Supabase)  +  push notifikace příjemci
```

Soubory:
- `src/lib/supabase/admin.ts` — service-role klient (webhook nemá cookie session)
- `src/lib/agent/identity.ts` — whitelist Telegram ID → OnVision role, mapování jmen
- `src/lib/agent/tools.ts` — definice a vykonání nástrojů nad `app_data`
- `src/lib/agent/run.ts` — agentní smyčka (sdílený "mozek")
- `src/lib/push/notify.ts` — odeslání push i bez cookie
- `src/app/api/telegram/route.ts` — webhook

## Nastavení (jednorázově)

1. **Vytvoř bota:** v Telegramu napiš `@BotFather` → `/newbot` → zkopíruj token.
2. **Vyplň klíče:** zkopíruj `.env.telegram.example` hodnoty do `.env.local`
   a zároveň do Vercel → Project → Settings → Environment Variables (Production).
   - `TELEGRAM_BOT_TOKEN` z BotFather
   - `TELEGRAM_WEBHOOK_SECRET` = `openssl rand -hex 32`
   - `GROQ_API_KEY` z https://console.groq.com (na hlasovky)
   - `TELEGRAM_USER_MAP` zatím s placeholdery (ID doplníš v kroku 4)
3. **Nasaď** (push do mainu → Vercel build).
4. **Zjisti svá Telegram ID:** napiš botovi cokoli. Dostaneš „Nemáš přístup",
   ale ve Vercel logu se objeví `neznámé ID 123456789`. Tato čísla vlož do
   `TELEGRAM_USER_MAP` (Adam i Honza) a znovu nasaď.
5. **Zaregistruj webhook** (jednou, dosaď TOKEN a SECRET):
   ```
   https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://onvision-os.vercel.app/api/telegram&secret_token=<SECRET>
   ```
   Ověření: `https://api.telegram.org/bot<TOKEN>/getWebhookInfo`

## Bezpečnost

- Webhook ověřuje `X-Telegram-Bot-Api-Secret-Token` proti `TELEGRAM_WEBHOOK_SECRET`.
- Dál pustí jen ID z `TELEGRAM_USER_MAP`; ostatní dostanou „Nemáš přístup".
- `list_invoices` smí jen admin / fakturace.
- Zápis (create_task) se provede až po kliknutí na **Potvrdit**.

## Příklady

- „Co je dnes urgentní?“ → vypíše úkoly se statusem/prioritou
- „Kolik máme faktur po splatnosti?“ → (jen admin/fakturace)
- „Dej Adamovi úkol natočit promo pro Firestu do pátku“ → návrh → Potvrdit → push Adamovi
- 🎙️ hlasovka s tímtéž → přepis → stejný tok

## Další kroky (roadmapa)

- Stavová konverzace (paměť vlákna) pro doptávání
- Více zápisových nástrojů (události v kalendáři, posun statusu)
- WhatsApp kanál (Meta Business API — tokeny už v projektu jsou)
- Kanálově sdílený `/api/agent` i pro in-app AI overlay
