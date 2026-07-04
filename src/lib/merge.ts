/**
 * 3-way merge polí objektů podle `id` — jádro optimistického zámku.
 *
 * Když dva lidé editují stejný klíč (např. ov-ukoly-tasks) naráz, server
 * odmítne starší zápis (compare-and-swap přes updated_at). Klient pak místo
 * přepsání provede sloučení: vezme AKTUÁLNÍ serverovou hodnotu (remote),
 * svoji rozpracovanou (local) a poslední, kterou od serveru viděl (base),
 * a spočítá výsledek tak, aby:
 *   - se NEZTRATILY cizí změny (položky, které přidal/upravil druhý člověk),
 *   - se NEVZKŘÍSILY položky, které někdo smazal,
 *   - vlastní editace měly přednost na úrovni položky.
 *
 * Merge se použije jen když všechny tři strany jsou pole objektů se
 * stabilním `id`. Jinak volající spadne na "poslední vyhrává" (dnešní chování).
 */

export type WithId = { id?: string | number };

/** Pole objektů, kde má KAŽDÁ položka definované `id`? (podmínka pro merge) */
export function isMergeableArray(v: unknown): v is WithId[] {
  return (
    Array.isArray(v) &&
    v.every(
      (x) =>
        x != null &&
        typeof x === "object" &&
        "id" in x &&
        (x as WithId).id != null
    )
  );
}

function eq(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * base   = poslední hodnota, kterou klient viděl od serveru
 * local  = co chce klient uložit (jeho rozpracovaná verze)
 * remote = co je právě teď na serveru (od jiného člověka)
 */
export function threeWayMergeById<T extends WithId>(
  base: T[],
  local: T[],
  remote: T[]
): T[] {
  const baseById = new Map(base.map((x) => [x.id, x]));
  const localById = new Map(local.map((x) => [x.id, x]));
  const baseIds = new Set(base.map((x) => x.id));
  const localIds = new Set(local.map((x) => x.id));

  // Položky, které smazal LOKÁLNÍ uživatel (byly v base, nejsou v local)
  const deletedByLocal = new Set(
    [...baseIds].filter((id) => !localIds.has(id))
  );

  const result: T[] = [];
  const placed = new Set<string | number | undefined>();

  // 1) Projdi remote (zachovává pořadí serveru + cizí přírůstky)
  for (const r of remote) {
    if (deletedByLocal.has(r.id)) continue; // lokál to smazal → respektuj
    placed.add(r.id);
    const l = localById.get(r.id);
    if (l === undefined) {
      result.push(r); // jen na serveru (přidal/nechal druhý) → ponech
      continue;
    }
    const b = baseById.get(r.id);
    const localChanged = !eq(l, b);
    // Lokál položku změnil → jeho verze vyhrává. Jinak vezmi serverovou
    // (druhý ji mohl upravit).
    result.push(localChanged ? l : r);
  }

  // 2) Přidej NOVÉ lokální položky (nejsou na serveru ani v base)
  for (const l of local) {
    if (placed.has(l.id)) continue;
    if (baseIds.has(l.id)) continue; // byla v base, teď není na serveru = remote smazal → respektuj
    result.push(l); // čistě nová lokální položka
    placed.add(l.id);
  }

  return result;
}

/**
 * Vysokoúrovňový slučovač pro sync hook. Vrátí sloučenou hodnotu, nebo
 * `null` když sloučit nelze (volající pak nechá "poslední vyhrává").
 */
export function mergeForSync(
  base: unknown,
  local: unknown,
  remote: unknown
): unknown | null {
  if (
    isMergeableArray(base) &&
    isMergeableArray(local) &&
    isMergeableArray(remote)
  ) {
    return threeWayMergeById(base, local, remote);
  }
  return null;
}
