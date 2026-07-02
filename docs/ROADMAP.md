# OnVision OS — Roadmapa k award-winning

Menu vylepšení. Řekni čísla (např. „udělej 1, 8, 11") a stavíme.
Legenda úsilí: **S** = malé · **M** = střední · **L** = velké.
Odškrtávej hotové `[x]`.

## 🧠 Inteligence & cohese (aby 32 modulů byl jeden chytrý systém)
- [x] 1. **Command palette (⌘K)** — skok kamkoli + rychlé vytvoření *(M)*
- [x] 2. **Dashboard = nervové centrum v2** — signály ze VŠECH modulů na jedné obrazovce (cashflow díry, faktury, kolize, ztrátoví klienti, čekající schválení, NPS) *(M)*
- [x] 3. **Notifikační centrum** — jeden inbox pro všechny události napříč appkou *(M)*
- [x] 4. **Globální fulltext hledání** — klienti, úkoly, faktury, výstupy, lokace… *(M)*
- [x] 5. **Cíle & benchmarky** — nastav cíl (obrat/marže/výstupy), sleduj vs realita *(S)*

## 🔗 Propojení modulů (data zadáš jednou, tečou všude)
- [x] 6. **Řetězec Call sheet → Výkazy → Ziskovost → Cashflow** *(M)*
- [x] 7. **Výstupy → Delivery / Klient. sdílení** jedním klikem *(S)*
- [x] 8. **Technika ↔ Shooting/Call sheet** — rezervace se tvoří z call sheetu, kolize hlídané *(M)*
- [x] 9. **Odměny „podle projektů" ← Výkazy** (hodiny × sazba = automatický náklad) *(S)*
- [x] 10. **Klient jako hub** — u klienta vidíš vše (faktury, projekty, odměny, ziskovost, sdílení, NPS) *(M)*

## 🤖 AI vrstva
- [ ] 11. **Nasadit Telegram agenta** — hlas/mobil, už postavený *(S)*
- [x] 12. **AI co-pilot agentury** — týdenní brief (dashboard + Gameplán), dotazy nad daty („Zeptej se na data"), pondělní e-mail brief *(L)*
- [x] 13. **AI týdenní klientské reporty** — Meta + AI → auto report klientovi (modul Reporty) *(M)*
- [ ] 14. **AI přepis natáčení → střihové poznámky** *(M)*
- [x] 15. **AI návrhy odpovědí** — na námitky klientů ve Schválení (tlačítko + kopírovat) *(M)*

## ✨ Leštění & UX
- [x] 16. **Liquid glass plošně** — glass-card/panel/input sjednocené, brand navy povrchy *(M)*
- [x] 17. **Empty states** — sdílená EmptyState komponenta (Odměny, Klienti; rozšiřovat dál) *(S)*
- [ ] 18. **Mikro-interakce & pohyb** — Emil Kowalski úroveň *(M)*
- [x] 19. **Mobilní průchod** — opravený rozbitý grid, dolní lišta 4+Víc, PWA *(M)*
- [x] 20. **Design QA sweep** — brand barvy (Night Navy + Signal Purple), čitelnost, pravdivé deadliny, jednotná data (ISO+CZ), jeden zdroj pravdy pro faktury po splatnosti *(M)*
- [x] 21. **Skeletony při načítání** — SkeletonRows (Klienti; rozšiřovat dál) *(S)*

## 🛡️ Spolehlivost & důvěra
- [ ] 22. **Testy na peníze** (ziskovost, cashflow, odměny, faktury) *(M)*
- [ ] 23. **RLS pravidla** — až přibydou lidé s omezeným přístupem *(M)* — viz `docs/SECURITY.md`
- [x] 24. **Error boundaries + 404** — branded error.tsx / not-found.tsx (offline stavy zbývají) *(S)*
- [x] 25. **Audit log** — kdo co kdy změnil; feed „Poslední aktivita" na /tym + záloha dat jedním klikem (Nastavení → Data & záloha) *(S)*

## 🚀 Klient-facing & wow
- [ ] 26. **Klientské stránky dotáhnout** — animace, video, galerie *(M)*
- [ ] 27. **Delivery: náhledy/thumbnaily + heslo na odkaz** *(S)*
- [ ] 28. **Lokace/Technika: upload fotek přímo do CRM** (ne jen URL) *(S)*
- [ ] 29. **Podpis/souhlas klienta** u schválení *(S)*
- [ ] 30. **Veřejný showreel/portfolio** auto z top výstupů *(M)*

## 📊 Data & růst
- [ ] 31. **Trendy v čase** — obrat/marže/výstupy měsíc po měsíci *(S)*
- [x] 32. **Utilizace týmu** — % vytížení z výkazů na stránce /tym *(S)*
- [x] 33. **Churn radar** — klient 60+ dní bez faktury/hodin = signál v Nervovém centru; + Reference radar (NPS ≥ 9 → říct si o recenzi) *(M)*

---

**Doporučené top 3:** 1 (⌘K), 2 (dashboard v2), 11 (Telegram agent).

## Hotovo v této fázi (kontext)
Moduly: odměny, ziskovost, cashflow & výhledy, call sheety (+AI+PDF+mail+počasí+úkoly),
technika (foto+kalendář), výkazy, delivery, lokace, klientský share (schvalování s
komentáři + reporty + faktury + NPS), AI obsah, pondělní digest, zápis→úkoly.
Infra: keepalive cron, AI rate-limiting, spend cap, brandové fonty, liquid-glass styly.
