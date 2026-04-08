-- 2026-03-26
-- Perfil ligero en home: identidad minima persistente
-- - apellidos opcionales
-- - pronombre opcional para futuras referencias dentro de la app

alter table if exists public.profiles
  add column if not exists last_name text,
  add column if not exists pronoun text;
