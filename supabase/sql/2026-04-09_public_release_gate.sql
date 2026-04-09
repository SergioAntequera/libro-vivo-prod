-- Libro Vivo - Cerrojo publico ceremonial previo al login
-- Fecha: 2026-04-09
--
-- Objetivo:
-- - Bloquear / y /login hasta que la ceremonia publica de /release se complete.
-- - Persistir solo el estado final en settings para no crear tablas nuevas.

alter table public.settings
  add column if not exists release_unlocked_at timestamptz;

alter table public.settings
  add column if not exists release_left_name text;

alter table public.settings
  add column if not exists release_left_confirmed_at timestamptz;

alter table public.settings
  add column if not exists release_right_name text;

alter table public.settings
  add column if not exists release_right_confirmed_at timestamptz;

comment on column public.settings.release_unlocked_at is
  'Fecha en la que se desbloquea el acceso publico tras completar la ceremonia de /release.';

comment on column public.settings.release_left_name is
  'Nombre temporal del primer gesto ceremonial de /release. Se limpia al desbloquear.';

comment on column public.settings.release_left_confirmed_at is
  'Marca temporal del primer gesto ceremonial de /release. Se limpia al desbloquear.';

comment on column public.settings.release_right_name is
  'Nombre temporal del segundo gesto ceremonial de /release. Se limpia al desbloquear.';

comment on column public.settings.release_right_confirmed_at is
  'Marca temporal del segundo gesto ceremonial de /release. Se limpia al desbloquear.';
