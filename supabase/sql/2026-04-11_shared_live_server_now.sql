-- Libro Vivo - Hora de servidor para colaboracion en vivo
-- Fecha: 2026-04-11
--
-- Objetivo:
-- - Evitar depender del reloj del cliente para decidir frescura de presencia.
-- - Exponer una referencia UTC del servidor/base para shared-live.

create or replace function public.shared_live_server_now()
returns timestamptz
language sql
stable
as $$
  select timezone('utc', clock_timestamp());
$$;

grant execute on function public.shared_live_server_now() to authenticated;
grant execute on function public.shared_live_server_now() to service_role;
