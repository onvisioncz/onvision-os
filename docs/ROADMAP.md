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
- [ ] 6. **Řetězec Call sheet → Výkazy → Ziskovost → Cashflow** *(M)*
- [ ] 7. **Výstupy → Delivery / Klient. sdílení** jedním klikem *(S)*
- [ ] 8. **Technika ↔ Shooting/Call sheet** — rezervace se tvoří z call sheetu, kolize hlídané *(M)*
- [ ] 9. **Odměny „podle projektů" ← Výkazy** (hodiny × sazba = automatický náklad) *(S)*
- [ ] 10. **Klient jako hub** — u klienta vidíš vše (faktury, projekty, odměny, ziskovost, sdílení, NPS) *(M)*

## 🤖 AI vrstva
- [ ] 11. **Nasadit Telegram agenta** — hlas/mobil, už postavený *(S)*
- [ ] 12. **AI co-pilot agentury** — zná celý byznys (RAG nad daty), ptáš se přirozeně *(L)*
- [ ] 13. **AI týdenní klientské reporty** — Meta + AI → auto report klientovi *(M)*
- [ ] 14. **AI přepis natáčení → střihové poznámky** *(M)*
- [ ] 15. **AI návrhy odpovědí** v inboxu / na komentáře klientů *(M)*

## ✨ Leštění & UX
- [ ] 16. **Liquid glass plošně** — čitelné inputy/panely v celé appce *(M)*
- [ ] 17. **Onboarding + delightful empty states** *(S)*
- [ ] 18. **Mikro-interakce & pohyb** — Emil Kowalski úroveň *(M)*
- [ ] 19. **Mobilní průchod** klíčových toků (PWA) *(M)*
- [ ] 20. **Design QA sweep** — konzistence napříč 32 moduly *(M)*
- [ ] 21. **Skeletony při načítání** místo prázdna *(S)*

## 🛡️ Spolehlivost & důvěra
- [ ] 22. **Testy na peníze** (ziskovost, cashflow, odměny, faktury) *(M)*
- [ ] 23. **RLS pravidla** — až přibydou lidé s omezeným přístupem *(M)* — viz `docs/SECURITY.md`
- [ ] 24. **Error boundaries + retry + offline stavy** *(S)*
- [ ] 25. **Audit log** — kdo co kdy změnil *(S)*

## 🚀 Klient-facing & wow
- [ ] 26. **Klientské stránky dotáhnout** — animace, video, galerie *(M)*
- [ ] 27. **Delivery: náhledy/thumbnaily + heslo na odkaz** *(S)*
- [ ] 28. **Lokace/Technika: upload fotek přímo do CRM** (ne jen URL) *(S)*
- [ ] 29. **Podpis/souhlas klienta** u schválení *(S)*
- [ ] 30. **Veřejný showreel/portfolio** auto z top výstupů *(M)*

## 📊 Data & růst
- [ ] 31. **Trendy v čase** — obrat/marže/výstupy měsíc po měsíci *(S)*
- [ ] 32. **Utilizace týmu** — % vytížení z výkazů *(S)*
- [ ] 33. **Predikce churnu klienta** — signály odchodu *(M)*

---

**Doporučené top 3:** 1 (⌘K), 2 (dashboard v2), 11 (Telegram agent).

## Hotovo v této fázi (kontext)
Moduly: odměny, ziskovost, cashflow & výhledy, call sheety (+AI+PDF+mail+počasí+úkoly),
technika (foto+kalendář), výkazy, delivery, lokace, klientský share (schvalování s
komentáři + reporty + faktury + NPS), AI obsah, pondělní digest, zápis→úkoly.
Infra: keepalive cron, AI rate-limiting, spend cap, brandové fonty, liquid-glass styly.
