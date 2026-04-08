-- Libro Vivo - handle_new_user without Carmen bootstrap special case
-- Fecha: 2026-04-09
--
-- Objetivo:
-- - mantener solo a Sergio como bootstrap privilegiado
-- - dejar al resto de cuentas nuevas con rol gardener_a por defecto

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, name, role, avatar_url)
  values (
    new.id,
    case
      when lower(new.email) = 'sergioantequera@hotmail.es' then 'Sergio'
      else coalesce(split_part(new.email, '@', 1), 'Jardinero')
    end,
    case
      when lower(new.email) = 'sergioantequera@hotmail.es' then 'superadmin'
      else 'gardener_a'
    end,
    null
  )
  on conflict (id) do nothing;

  return new;
end;
$$;
