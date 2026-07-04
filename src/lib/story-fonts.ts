/**
 * Kurátorovaný výběr Google Fonts pro Story Maker.
 *
 * Načítání za běhu: css2 <link> (bez API klíče) + document.fonts.load()
 * PŘED kreslením na canvas — jinak canvas potichu vykreslí fallback.
 * Všechny fonty jsou OFL/Apache — zdarma i pro komerční grafiku.
 */

export interface StoryFont {
  family: string;          // přesný název rodiny pro canvas i css2 URL
  label: string;
  cat: "sans" | "serif" | "display" | "script";
  weight: number;          // výchozí řez, který načítáme
}

export const STORY_FONTS: StoryFont[] = [
  // Sans — čisté, brandové
  { family: "Inter", label: "Inter", cat: "sans", weight: 600 },
  { family: "Space Grotesk", label: "Space Grotesk", cat: "sans", weight: 700 },
  { family: "Montserrat", label: "Montserrat", cat: "sans", weight: 700 },
  { family: "Oswald", label: "Oswald", cat: "sans", weight: 600 },
  { family: "Sora", label: "Sora", cat: "sans", weight: 700 },
  { family: "Syne", label: "Syne", cat: "sans", weight: 700 },
  // Display — poutače
  { family: "Anton", label: "Anton", cat: "display", weight: 400 },
  { family: "Bebas Neue", label: "Bebas Neue", cat: "display", weight: 400 },
  { family: "Archivo Black", label: "Archivo Black", cat: "display", weight: 400 },
  { family: "Righteous", label: "Righteous", cat: "display", weight: 400 },
  { family: "Unbounded", label: "Unbounded", cat: "display", weight: 700 },
  { family: "Abril Fatface", label: "Abril Fatface", cat: "display", weight: 400 },
  // Serif — editorial
  { family: "Playfair Display", label: "Playfair Display", cat: "serif", weight: 700 },
  { family: "DM Serif Display", label: "DM Serif Display", cat: "serif", weight: 400 },
  { family: "Cormorant Garamond", label: "Cormorant Garamond", cat: "serif", weight: 600 },
  { family: "Fraunces", label: "Fraunces", cat: "serif", weight: 600 },
  // Script / ručně psané
  { family: "Lobster", label: "Lobster", cat: "script", weight: 400 },
  { family: "Pacifico", label: "Pacifico", cat: "script", weight: 400 },
  { family: "Caveat", label: "Caveat", cat: "script", weight: 600 },
  { family: "Satisfy", label: "Satisfy", cat: "script", weight: 400 },
  { family: "Amatic SC", label: "Amatic SC", cat: "script", weight: 700 },
  { family: "Permanent Marker", label: "Permanent Marker", cat: "script", weight: 400 },
];

const loaded = new Set<string>();

/** css2 URL pro rodinu + řez. */
export function fontCssUrl(f: StoryFont): string {
  const fam = f.family.replace(/ /g, "+");
  return `https://fonts.googleapis.com/css2?family=${fam}:wght@${f.weight}&display=swap`;
}

/**
 * Načte font a POČKÁ, až je použitelný pro canvas.
 * Vrací false, když se nepovede (kreslí se fallbackem — nespadne nic).
 */
export async function ensureFontLoaded(f: StoryFont): Promise<boolean> {
  if (typeof document === "undefined") return false;
  const key = `${f.family}:${f.weight}`;
  if (loaded.has(key)) return true;
  try {
    // 1) Vlož stylesheet a POČKEJ na jeho zparsování — document.fonts.load
    //    umí spustit načtení jen fontů, které už dokument zná. Volat ho dřív
    //    je klasický race (font se pak načte, ale canvas už kreslil fallback).
    if (!document.querySelector(`link[data-story-font="${key}"]`)) {
      await new Promise<void>((resolve) => {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = fontCssUrl(f);
        link.setAttribute("data-story-font", key);
        link.onload = () => resolve();
        link.onerror = () => resolve(); // fallback řeší retry níže
        document.head.appendChild(link);
        setTimeout(resolve, 3000); // pojistka proti zaseknutí
      });
    }
    // 2) Načti font s pár opakováními (parsování css → registrace FontFace
    //    může doběhnout o tick později).
    const spec = `${f.weight} 48px "${f.family}"`;
    for (let i = 0; i < 6; i++) {
      await document.fonts.load(spec);
      if (document.fonts.check(spec)) {
        loaded.add(key);
        return true;
      }
      await new Promise((r) => setTimeout(r, 250));
    }
    return false;
  } catch {
    return false;
  }
}
