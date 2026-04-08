# Bootstrap Status

Fecha: 2026-04-08

## Estado inicial

El repo limpio `libro-vivo-prod` ya:

- conectaba al proyecto Supabase nuevo
- instalaba dependencias con `npm ci`
- pasaba `npm run typecheck`
- pasaba `npm run build`
- tenia una allowlist SQL provisional de `75` ficheros

## Bloqueo inicial

Se ejecuto:

```bash
npm run prod:sql:apply
```

Resultado:

- fallo en el primer fichero: `supabase/sql/2026-03-05_canvas_config.sql`
- error: `relation "public.profiles" does not exist`

## Lectura tecnica inicial

El historico SQL conservado en `supabase/sql/` no arrancaba desde base vacia.

La secuencia actual asumia que algunas tablas core ya existian antes:

- `profiles`
- `pages`
- `seeds`
- `year_notes`
- `season_notes`
- probablemente otras tablas fundacionales relacionadas

Por tanto:

- la allowlist incremental servia para reconstruir parte del historico reciente
- pero no bastaba por si sola para bootstrapear un proyecto nuevo vacio

## Resolucion aplicada

Ya esta resuelto:

1. se extrajo el baseline vivo de `public` desde el proyecto antiguo
2. se genero un seed pack limpio solo con configuracion y sistema
3. se aplico `baseline + seed data` en `libro-vivo-prod`
4. se sincronizaron los buckets de storage por API

Artefactos:

- [000_current_live_public_schema_2026_04_08.sql](c:/Users/santequera/Documents/Proyecto/libro-vivo-prod/supabase/baseline/000_current_live_public_schema_2026_04_08.sql)
- [010_current_live_public_seed_data_2026_04_08.sql](c:/Users/santequera/Documents/Proyecto/libro-vivo-prod/supabase/baseline/010_current_live_public_seed_data_2026_04_08.sql)

## Bloqueo actual

Solo queda `storage.objects`:

- el SQL remoto falla con `must be owner of table objects`
- por tanto, las policies de storage deben ejecutarse en `SQL Editor`

Referencia:

- [020_current_live_storage_bootstrap_2026_04_08.sql](c:/Users/santequera/Documents/Proyecto/libro-vivo-prod/supabase/baseline/020_current_live_storage_bootstrap_2026_04_08.sql)
- [021_current_live_storage_bootstrap_sql_editor_safe_2026_04_08.sql](c:/Users/santequera/Documents/Proyecto/libro-vivo-prod/supabase/baseline/021_current_live_storage_bootstrap_sql_editor_safe_2026_04_08.sql)
- [STORAGE_POLICY_MANUAL_STEP_2026_04_08.md](c:/Users/santequera/Documents/Proyecto/libro-vivo-prod/docs/STORAGE_POLICY_MANUAL_STEP_2026_04_08.md)
