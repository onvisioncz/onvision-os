-- AI rate-limiting — tabulka počítadla + bezpečná funkce.
-- Spusť jednou v Supabase → SQL Editor.
--
-- Tabulka má zapnuté RLS bez politik => přihlášený uživatel k ní NEMÁ přímý
-- přístup a nemůže si počítadlo vynulovat. Zapisuje jen funkce (SECURITY
-- DEFINER), kterou appka volá. Tím je limit nepodvoditelný z prohlížeče.

create table if not exists public.ai_usage (
  email        text primary key,
  window_start timestamptz not null default now(),
  count        int not null default 0
);

alter table public.ai_usage enable row level security;
-- žádné policies → běžní uživatelé tabulku nevidí ani nezapisují

create or replace function public.check_ai_rate_limit(
  p_email  text,
  p_limit  int,
  p_window int
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.ai_usage%rowtype;
begin
  select * into rec from public.ai_usage where email = p_email for update;

  if not found then
    insert into public.ai_usage(email, window_start, count) values (p_email, now(), 1);
    return true;
  end if;

  if now() - rec.window_start > make_interval(secs => p_window) then
    update public.ai_usage set window_start = now(), count = 1 where email = p_email;
    return true;
  elsif rec.count < p_limit then
    update public.ai_usage set count = count + 1 where email = p_email;
    return true;
  else
    return false; -- překročen limit
  end if;
end;
$$;

grant execute on function public.check_ai_rate_limit(text, int, int)
  to authenticated, service_role, anon;
