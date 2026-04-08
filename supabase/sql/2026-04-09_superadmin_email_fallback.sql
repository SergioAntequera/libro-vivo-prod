-- Libro Vivo - Superadmin bootstrap fallback by email
-- Fecha: 2026-04-09
--
-- Objetivo:
-- - mantener el superadmin de Sergio incluso si el perfil todavia no existe
-- - dejar el mismo criterio disponible para policies basadas en is_superadmin_auth()

create or replace function public.is_superadmin_auth()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'superadmin'
    )
    or lower(coalesce(auth.jwt() ->> 'email', '')) = 'sergioantequera@hotmail.es';
$$;

revoke all on function public.is_superadmin_auth() from public;
grant execute on function public.is_superadmin_auth() to authenticated;
