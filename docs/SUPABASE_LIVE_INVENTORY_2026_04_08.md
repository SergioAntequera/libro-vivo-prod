# Supabase Live Inventory

Fecha: 2026-04-08

Objetivo:
- extraer la foto viva del proyecto Supabase actual
- usar esa foto como fuente de verdad tecnica
- comparar despues esa foto con los SQL historicos y con el runtime del producto

Importante:
- este inventario se ejecuta contra el proyecto actual que hoy funciona
- no modifica datos
- solo lee metadata y configuracion

## Como usar este documento

1. Abre el proyecto Supabase actual, no el nuevo.
2. Ve a `SQL Editor`.
3. Ejecuta los bloques uno por uno.
4. Guarda las salidas o pegalas en el chat.

## Bloque 1. Tablas publicas

```sql
select
  schemaname,
  tablename,
  tableowner
from pg_tables
where schemaname = 'public'
order by tablename;
```

Esperado:
- inventario completo de tablas reales en `public`

## Bloque 2. Columnas y tipos

```sql
select
  table_name,
  ordinal_position,
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
order by table_name, ordinal_position;
```

Esperado:
- lista completa de columnas, tipos, nullability y defaults

## Bloque 3. Claves foraneas

```sql
select
  tc.table_name,
  kcu.column_name,
  ccu.table_name as foreign_table_name,
  ccu.column_name as foreign_column_name,
  tc.constraint_name
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
 and tc.table_schema = kcu.table_schema
join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name
 and ccu.table_schema = tc.table_schema
where tc.constraint_type = 'FOREIGN KEY'
  and tc.table_schema = 'public'
order by tc.table_name, kcu.column_name;
```

Esperado:
- mapa real de relaciones entre tablas

## Bloque 4. Funciones y RPC publicas

```sql
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as args,
  pg_get_function_result(p.oid) as returns,
  p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by p.proname, args;
```

Esperado:
- inventario de funciones reales de `public`

## Bloque 5. Triggers

```sql
select
  event_object_table as table_name,
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
from information_schema.triggers
where trigger_schema = 'public'
order by event_object_table, trigger_name, event_manipulation;
```

Esperado:
- triggers reales que existen hoy

## Bloque 6. RLS de tablas publicas

```sql
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
from pg_policies
where schemaname = 'public'
order by tablename, policyname, cmd;
```

Esperado:
- policies efectivas en `public`

## Bloque 7. Estado RLS por tabla

```sql
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as force_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
order by c.relname;
```

Esperado:
- confirmacion de que tablas tienen RLS activo

## Bloque 8. Buckets de storage

```sql
select
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
from storage.buckets
order by id;
```

Esperado:
- buckets reales del proyecto

## Bloque 9. Policies de storage.objects

```sql
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
order by policyname, cmd;
```

Esperado:
- policies reales de lectura y escritura para storage

## Bloque 10. Auth y referencias a auth.users

```sql
select
  tc.table_name,
  kcu.column_name,
  ccu.table_schema as foreign_schema_name,
  ccu.table_name as foreign_table_name,
  ccu.column_name as foreign_column_name,
  tc.constraint_name
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
 and tc.table_schema = kcu.table_schema
join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name
 and ccu.table_schema = tc.table_schema
where tc.constraint_type = 'FOREIGN KEY'
  and ccu.table_schema = 'auth'
  and ccu.table_name = 'users'
order by tc.table_name, kcu.column_name;
```

Esperado:
- tablas que dependen de `auth.users`

## Lo que necesito que me pases

Minimo:
- bloques 1, 4, 5, 6, 8 y 9

Ideal:
- los 10 bloques

## Que haremos con esto despues

1. comparar esta foto viva con el codigo
2. clasificar los SQL historicos
3. montar la allowlist de produccion
4. reconstruir el proyecto Supabase nuevo
