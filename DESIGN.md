# OnVision — Design tokeny

Zdroj pravdy pro vizuální identitu. Odvozeno z **OnVision Brand & UI Manuál 2026**.
Veškerá nová UI a komponenty se drží těchto hodnot.

> Vibe: „NASA meets Creative Agency" — čistý, datový, prémiový, kyber-industriální.
> Tón: sebevědomě, věcně, lidsky. Energie a pohyb (sport v DNA). Žádné korporátní fráze.
> Krédo: **Odliš se. Zaujmi. Ukaž sílu brandu.**

## Barvy

### Fialová (akce + identita)
| Token | HEX | Použití |
|-------|-----|---------|
| Signal Purple | `#5B5EFF` | logo, akcent, UI zvýraznění |
| Action Purple | `#4B4DEA` | hlavní tlačítka |
| Deep Purple | `#3535CC` | stisk / active |
| Violet Glow | `#8C64FF` | gradient akcent |

### Modrá (podklad)
| Token | HEX | Použití |
|-------|-----|---------|
| Night Navy | `#0D0D18` | primární podklad |
| Navy Mid | `#11111C` | sekundární plochy |
| Navy Card | `#16161F` | karty / panely |
| Pure White | `#FFFFFF` | text / negativ |

### Tónové škály
- Fialová: `#EDEDFE` → `#C7C8FB` → `#7B7EFF` → `#5B5EFF` → `#4B4DEA` → `#3535CC`
- Navy: `#3A3A4A` → `#2A2A38` → `#1E1E2A` → `#16161F` → `#11111C` → `#0D0D18`
- Text na tmavém: bílá s 60–92 % průhledností; jemné linky 8–14 %.

### Rozložení (doporučené)
Navy **62 %** · Bílá **20 %** · Fialová **12 %** · Akcent **6 %**.
Fialová je **signál** — používá se cíleně na akci, nikdy plošně.

## Firemní gradient
Indigové záře nad noční modří (jeden gradient na vizuál, jemný a difuzní):
```css
background:
  radial-gradient(ellipse 80% 60% at 92% 2%, rgba(75,77,234,.32), transparent 58%),
  radial-gradient(ellipse 65% 70% at 8% 90%, rgba(75,77,234,.40), transparent 58%),
  #0D0D18;
```

## Typografie
- **Nadpisy / Display / UI:** Space Grotesk (`--font-heading`) — Medium / SemiBold / Bold
- **Text:** Inter (`--font-sans`) — Regular / Medium / SemiBold / Bold
- **Sociální sítě & grafika:** Syne Bold (výhradně, NE v UI)

### Velikostní škála
| Úroveň | Font | Velikost / váha |
|--------|------|-----------------|
| Display XL | Space Grotesk | 64px / 700 |
| Display L | Space Grotesk | 40px / 700 |
| Heading M | Space Grotesk | 24px / 600 |
| Body | Inter | 16px / 400 · line-height 1.78 |
| Caption / Label | Space Grotesk | 11px / 600 · tracking .2em · UPPERCASE |

## Tlačítka
| Vlastnost | Hodnota |
|-----------|---------|
| Radius | 4px (ostrý, moderní) |
| Font | Inter 600 · 13px · tracking .05em |
| Padding (primary) | 15 × 32 |
| Primary | fill `#4B4DEA`, bílý text; active `#3535CC` (scale .96) |
| Ghost | outline → při hoveru výplň bílá, text do navy |
| Nav CTA | jemný rámeček 15 % bílé, decentní |

## Logo
- Varianty: **„On"** (ikona/favicon), **„OnVision"** (základní), plná s popiskem (dokumenty).
- Min. velikost: web 140 px / ikona 24 px. Ochranná zóna = výška „O" (1×X).
- Na tmavém vždy **bílé** logo. Zákazy: neroztahovat, nenaklánět, neměnit barvu, žádné stíny/efekty.

## Implementace v appce
- CSS proměnné v `globals.css`: `--primary`, `--background`, `--card`, `--border`, `--foreground`, `--muted-foreground`, `--font-heading`, `--font-sans`.
- E-maily: brandovaná šablona v `src/lib/email/template.ts` (navy + gradient hlavička + patička s údaji).
- Pozn.: appka dnes používá pro primární akcent `oklch(0.62 0.27 265)` (blízko Signal Purple). Při větším designovém průchodu sjednotit přesně na `#5B5EFF` / `#4B4DEA`.
