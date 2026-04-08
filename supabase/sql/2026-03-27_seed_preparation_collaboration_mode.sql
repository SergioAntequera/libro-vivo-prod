-- Libro Vivo - Seed preparation collaboration mode
-- Fecha: 2026-03-27
--
-- Objetivo:
-- - Introducir el modo de colaboracion del dossier de preparacion.
-- - Permitir distinguir entre borradores "lo preparo yo por ahora"
--   y borradores "lo preparamos en conjunto".

alter table public.seed_preparation_profiles
add column if not exists collaboration_mode text;

update public.seed_preparation_profiles
set collaboration_mode = coalesce(nullif(trim(collaboration_mode), ''), 'solo_for_now')
where collaboration_mode is null
   or trim(collaboration_mode) = '';

alter table public.seed_preparation_profiles
alter column collaboration_mode set default 'solo_for_now';

alter table public.seed_preparation_profiles
alter column collaboration_mode set not null;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'seed_preparation_profiles_collaboration_mode_check'
      and conrelid = 'public.seed_preparation_profiles'::regclass
  ) then
    alter table public.seed_preparation_profiles
      drop constraint seed_preparation_profiles_collaboration_mode_check;
  end if;

  alter table public.seed_preparation_profiles
    add constraint seed_preparation_profiles_collaboration_mode_check
    check (collaboration_mode in ('solo_for_now', 'shared'));
end $$;
