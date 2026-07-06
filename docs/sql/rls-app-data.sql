-- ══════════════════════════════════════════════════════════════════════════
-- OnVision OS — zamčení tabulky app_data pomocí Row Level Security (RLS)
-- ══════════════════════════════════════════════════════════════════════════
--
-- CO TO DĚLÁ:
--   Uzavře PŘÍMÝ přístup k datům z prohlížeče. Do zavedení RLS mohl kdokoli
--   přihlášený (i technicky zdatný člen týmu) obejít /api/sync a přečíst si
--   celou databázi přímo — včetně cen klientů a výplat. Po zavedení RLS vede
--   jediná cesta k datům přes ověřené serverové routy, které hlídají oprávnění.
--
--   Server používá SERVICE ROLE klíč, který RLS obchází — aplikace funguje dál.
--   Prohlížeč (anon i přihlášený) na tabulku přímo NEDOSÁHNE.
--
-- KDE SPUSTIT: Supabase → SQL Editor → vlož a spusť.
-- REVERT (kdyby bylo potřeba): alter table public.app_data disable row level security;
-- ══════════════════════════════════════════════════════════════════════════

-- 1) Zapni RLS na tabulce
alter table public.app_data enable row level security;

-- 2) Zruš VŠECHNY existující politiky (ať nezůstane žádná stará permisivní)
do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'app_data'
  loop
    execute format('drop policy if exists %I on public.app_data', pol.policyname);
  end loop;
end $$;

-- 3) Jediná výjimka pro prohlížeč: přihlášení mohou ČÍST pouze týmový chat.
--    Je potřeba kvůli živým aktualizacím chatu (Supabase Realtime respektuje RLS).
--    Chat je interní a nejméně citlivý; všechno ostatní (ceny, výplaty, faktury,
--    smlouvy, pipeline…) zůstává pro prohlížeč nedostupné.
create policy "team_chat_realtime_read"
  on public.app_data
  for select
  to authenticated
  using (key = 'ov-team-chat');

-- 4) ŽÁDNÉ politiky pro insert/update/delete pro anon ani authenticated →
--    zápis z prohlížeče je zakázán. Zapisuje výhradně server (service role).
--
--    (Pokud bys chtěl zamknout i chat úplně, smaž politiku z bodu 3 — chat pak
--     ztratí živé aktualizace a bude se načítat jen při otevření okna.)

-- ── Ověření po spuštění ──────────────────────────────────────────────────────
-- V SQL editoru:  select * from pg_policies where tablename = 'app_data';
-- Očekávaný stav: RLS enabled + jediná politika team_chat_realtime_read.
