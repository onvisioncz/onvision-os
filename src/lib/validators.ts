/**
 * České validace pro fakturaci — čisté funkce, plně otestované.
 *
 * Audit hlásil, že formuláře přijmou jakékoli IČO/DIČ/IBAN bez kontroly.
 * Tyhle funkce ověří formát i kontrolní součet, takže se nevystaví faktura
 * na nesmyslné údaje.
 */

export interface ValidationResult {
  valid: boolean;
  msg?: string;      // lidsky čitelný důvod při nevalidním vstupu
  normalized?: string; // očištěný tvar (bez mezer apod.)
}

const OK: ValidationResult = { valid: true };

/* ── IČO ─────────────────────────────────────────────────────────────────
 * 8 číslic, poslední je kontrolní (mod 11 s vahami 8..2).
 * Algoritmus dle Ministerstva financí ČR.
 */
export function validateIco(input: string): ValidationResult {
  const ico = (input ?? "").replace(/\s/g, "");
  if (ico === "") return { valid: false, msg: "IČO je prázdné" };
  if (!/^\d{8}$/.test(ico)) return { valid: false, msg: "IČO musí mít 8 číslic" };

  const digits = ico.split("").map(Number);
  let sum = 0;
  for (let i = 0; i < 7; i++) sum += digits[i] * (8 - i);
  const mod = sum % 11;
  // Kontrolní číslice: (11 - mod) % 10, se speciálním případem mod === 1 → 0
  let check: number;
  if (mod === 0) check = 1;
  else if (mod === 1) check = 0;
  else check = 11 - mod;

  if (check !== digits[7]) {
    return { valid: false, msg: "Neplatné IČO (kontrolní součet nesedí)", normalized: ico };
  }
  return { valid: true, normalized: ico };
}

/* ── DIČ ─────────────────────────────────────────────────────────────────
 * CZ + 8–10 číslic. U 8místného kmene odpovídá IČO (ověříme kontrolní součet).
 */
export function validateDic(input: string): ValidationResult {
  const dic = (input ?? "").replace(/\s/g, "").toUpperCase();
  if (dic === "") return { valid: false, msg: "DIČ je prázdné" };
  const m = dic.match(/^CZ(\d{8,10})$/);
  if (!m) return { valid: false, msg: "DIČ musí být ve tvaru CZ + 8 až 10 číslic" };
  const body = m[1];
  // 8místný kmen = IČO → ověř kontrolní součet
  if (body.length === 8) {
    const ico = validateIco(body);
    if (!ico.valid) return { valid: false, msg: "DIČ (8místné) neodpovídá platnému IČO", normalized: dic };
  }
  return { valid: true, normalized: dic };
}

/* ── IBAN ────────────────────────────────────────────────────────────────
 * Obecná ISO 13616 kontrola (mod-97 == 1). Pro CZ navíc délka 24.
 */
export function validateIban(input: string): ValidationResult {
  const iban = (input ?? "").replace(/\s/g, "").toUpperCase();
  if (iban === "") return { valid: false, msg: "IBAN je prázdný" };
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(iban)) return { valid: false, msg: "Neplatný formát IBANu" };
  if (iban.length < 15 || iban.length > 34) return { valid: false, msg: "IBAN má neplatnou délku" };
  if (iban.startsWith("CZ") && iban.length !== 24) {
    return { valid: false, msg: "Český IBAN musí mít 24 znaků", normalized: iban };
  }
  // Přesuň první 4 znaky na konec a převeď písmena na čísla (A=10..Z=35)
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const ch of rearranged) {
    const code = ch >= "A" && ch <= "Z" ? (ch.charCodeAt(0) - 55).toString() : ch;
    for (const d of code) {
      remainder = (remainder * 10 + Number(d)) % 97;
    }
  }
  if (remainder !== 1) return { valid: false, msg: "Neplatný IBAN (kontrolní součet)", normalized: iban };
  return { valid: true, normalized: iban };
}

/* ── Pomocník: rychlá kontrola bez zprávy ──────────────────────────────── */
export function isValidIco(v: string): boolean { return validateIco(v).valid; }
export function isValidDic(v: string): boolean { return validateDic(v).valid; }
export function isValidIban(v: string): boolean { return validateIban(v).valid; }

export const _internal = { OK };
