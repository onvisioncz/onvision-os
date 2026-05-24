# OnVision OS — Vizuální redesign

**Datum:** 2026-05-21  
**Status:** Schváleno uživatelem

---

## Cíl

Přepracovat vizuální styl OnVision OS tak, aby odpovídal brandingu webu onvision.cz — tmavé pozadí s indigo/fialovými záblesky v rozích, glass karty s blur efektem a sytý kontrast typografie.

---

## Design tokeny

### Pozadí
- Základ: `#141420` (lehce nasvícená tmavá — ne čistá černá)
- Nebula gradienty (CSS na `body` nebo dedikovaný `div`):
  - Top-right: `rgba(83, 53, 230, 0.72)` — indigo
  - Bottom-left: `rgba(55, 35, 200, 0.75)` — deep blue
  - Center: `rgba(60, 40, 180, 0.22)` — subtle fill

### Karty (glass efekt)
- Background: `rgba(12, 10, 35, 0.55)`
- `backdrop-filter: blur(28px) saturate(1.4)`
- Border: `rgba(255,255,255,0.09)`
- Border-radius: `14px`

### Barvy
- Brand cyan: `#00D1FF` (primární akcent — ceny, trendy, CTA)
- Brand indigo: `#5353F6` (logo, gradienty)
- Violet: `#a78bfa` (sekundární akcent)
- Text primary: `#e8e6f5`
- Text muted: `rgba(255,255,255,0.38)`

### Typografie
- Font: **Plus Jakarta Sans** (již přítomen v projektu jako `--font-jakarta`)
- Greeting nadpis: 38px / weight 700 / tracking -0.03em
- "Dobré ráno," bíle, jméno uživatele gradientem `#00D1FF → #5353F6 → #a78bfa`

---

## Layout změny

### Dashboard horní řádek (nový)
Dva bloky vedle sebe `grid-template-columns: 1fr 1fr`:

1. **Greeting karta** — datum, "Dobré ráno, [jméno].", popis dne, akční tlačítka
2. **AI Asistent karta** — zelený status dot, "Návrh dne" suggestion box, text input + send button

### Sidebar logo
- Skutečný `onvision-mark.png` s rotující conic-gradient ring
- "OnVision OS" bíle (weight 800)
- "CRM Systém" jako podtitulek (muted)

---

## Soubory k úpravě

| Soubor | Co se mění |
|---|---|
| `src/app/globals.css` | Background token, card token, nebula CSS |
| `src/app/(app)/layout.tsx` | Přidat nebula `div` do layoutu |
| `src/app/(app)/dashboard/page.tsx` | Top-row grid (greeting + AI widget) |
| `src/components/layout/sidebar-nav.tsx` | Logo subtitle "CRM Systém" |

---

## Reference

Vizuální mockup: `/Users/jankriz/onvision-os/design-preview.html`
