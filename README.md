# libro-vivo-prod

Repo limpio de despliegue para `Libro Vivo`.

Objetivo:
- separar el entorno de release del repo de trabajo diario
- reconstruir solo el producto necesario para produccion
- conectar este repo a `Vercel`
- apuntarlo al proyecto Supabase limpio `libro-vivo-prod`

## Entorno Supabase asociado

- project ref: `wmmaxlykngeszwvvifqj`
- project url: `https://wmmaxlykngeszwvvifqj.supabase.co`
- estado DB pooler: `verificado`

## Reglas de este directorio

1. No copiar `tmp`, `archive`, logs ni experimentos locales.
2. No copiar SQL de test, wipe, audit o fixtures manuales.
3. No guardar aqui `.env.local` con secretos si luego se va a versionar.
4. Todo lo que entre aqui debe ser candidato real a produccion.

## Flujo de bootstrap real

1. Extraer `baseline` vivo del schema `public` desde el proyecto antiguo.
2. Extraer `seed data` de sistema desde el proyecto antiguo.
3. Aplicar `baseline + seed data` sobre `libro-vivo-prod`.
4. Sincronizar buckets de `storage` por API.
5. Ejecutar las policies de `storage.objects` en `SQL Editor`.
6. Validar runtime, auth, storage y luego conectar a `Vercel`.
7. Cerrar el lanzamiento desde `/admin/release` con el ultimo click ceremonial.

## Scripts utiles

- `node scripts/check-db-connection.mjs`
  - comprueba la conexion a `libro-vivo-prod` o al proyecto antiguo segun la variable indicada
- `node scripts/extract-current-schema-baseline.mjs`
  - genera el baseline vivo del schema `public` desde el proyecto antiguo
- `node scripts/extract-current-seed-data.mjs`
  - genera un seed pack limpio de tablas de sistema, sin contenido de usuario
- `node scripts/extract-current-storage-bootstrap.mjs`
  - genera el bootstrap SQL de buckets y policies de `storage`
- `node scripts/sync-storage-buckets-via-api.mjs`
  - crea o actualiza buckets en `libro-vivo-prod` usando `service_role`
- `node scripts/classify-sql-files.mjs`
  - clasifica el historico de `supabase/sql` en `KEEP_CANDIDATE / REVIEW / DROP / META`
- `node scripts/extract-runtime-supabase-usage.mjs`
  - extrae tablas, RPC y buckets usados de verdad por `src/` y `scripts/`
- `node scripts/check-current-project-runtime-coverage.mjs`
  - verifica por API que las tablas y buckets usados por el runtime existen en el proyecto indicado por `.env.local`
- `node scripts/map-sql-candidates-to-runtime.mjs`
  - cruza los SQL candidatos con tablas/RPC realmente usados por el runtime
- `node scripts/generate-production-sql-allowlist.mjs`
  - genera la allowlist provisional SQL de produccion
- `node scripts/materialize-allowlisted-sql.mjs`
  - copia al repo limpio los SQL incluidos en la allowlist
- `node scripts/materialize-app-skeleton.mjs`
  - copia el esqueleto minimo de app al repo limpio
- `node scripts/apply-production-sql-allowlist.mjs`
  - deja constancia del intento historico de bootstrap via allowlist
- `node scripts/apply-production-bootstrap.mjs`
  - aplica `baseline + seed data` sobre una base vacia
- `node scripts/apply-storage-bootstrap.mjs`
  - intenta aplicar el SQL de storage; si falla por ownership, remite al paso manual documentado

## Artefactos ya generados

- [docs/SQL_FILE_CLASSIFICATION_2026_04_08.md](c:/Users/santequera/Documents/Proyecto/libro-vivo-prod/docs/SQL_FILE_CLASSIFICATION_2026_04_08.md)
- [reports/sql-file-classification-2026-04-08.json](c:/Users/santequera/Documents/Proyecto/libro-vivo-prod/reports/sql-file-classification-2026-04-08.json)
- [docs/RUNTIME_SUPABASE_USAGE_2026_04_08.md](c:/Users/santequera/Documents/Proyecto/libro-vivo-prod/docs/RUNTIME_SUPABASE_USAGE_2026_04_08.md)
- [reports/runtime-supabase-usage-2026-04-08.json](c:/Users/santequera/Documents/Proyecto/libro-vivo-prod/reports/runtime-supabase-usage-2026-04-08.json)
- [docs/CURRENT_PROJECT_RUNTIME_COVERAGE_2026_04_08.md](c:/Users/santequera/Documents/Proyecto/libro-vivo-prod/docs/CURRENT_PROJECT_RUNTIME_COVERAGE_2026_04_08.md)
- [reports/current-project-runtime-coverage-2026-04-08.json](c:/Users/santequera/Documents/Proyecto/libro-vivo-prod/reports/current-project-runtime-coverage-2026-04-08.json)
- [docs/SQL_RUNTIME_LINKAGE_2026_04_08.md](c:/Users/santequera/Documents/Proyecto/libro-vivo-prod/docs/SQL_RUNTIME_LINKAGE_2026_04_08.md)
- [reports/sql-runtime-linkage-2026-04-08.json](c:/Users/santequera/Documents/Proyecto/libro-vivo-prod/reports/sql-runtime-linkage-2026-04-08.json)
- [docs/SUPABASE_LIVE_INVENTORY_2026_04_08.md](c:/Users/santequera/Documents/Proyecto/libro-vivo-prod/docs/SUPABASE_LIVE_INVENTORY_2026_04_08.md)
- [docs/PRODUCTION_SQL_ALLOWLIST_2026_04_08.md](c:/Users/santequera/Documents/Proyecto/libro-vivo-prod/docs/PRODUCTION_SQL_ALLOWLIST_2026_04_08.md)
- [reports/production-sql-allowlist-2026-04-08.json](c:/Users/santequera/Documents/Proyecto/libro-vivo-prod/reports/production-sql-allowlist-2026-04-08.json)
- [production-sql-allowlist-2026-04-08.txt](c:/Users/santequera/Documents/Proyecto/libro-vivo-prod/supabase/allowlists/production-sql-allowlist-2026-04-08.txt)
- [000_current_live_public_schema_2026_04_08.sql](c:/Users/santequera/Documents/Proyecto/libro-vivo-prod/supabase/baseline/000_current_live_public_schema_2026_04_08.sql)
- [010_current_live_public_seed_data_2026_04_08.sql](c:/Users/santequera/Documents/Proyecto/libro-vivo-prod/supabase/baseline/010_current_live_public_seed_data_2026_04_08.sql)
- [020_current_live_storage_bootstrap_2026_04_08.sql](c:/Users/santequera/Documents/Proyecto/libro-vivo-prod/supabase/baseline/020_current_live_storage_bootstrap_2026_04_08.sql)
- [021_current_live_storage_bootstrap_sql_editor_safe_2026_04_08.sql](c:/Users/santequera/Documents/Proyecto/libro-vivo-prod/supabase/baseline/021_current_live_storage_bootstrap_sql_editor_safe_2026_04_08.sql)
- [STORAGE_POLICY_MANUAL_STEP_2026_04_08.md](c:/Users/santequera/Documents/Proyecto/libro-vivo-prod/docs/STORAGE_POLICY_MANUAL_STEP_2026_04_08.md)

## Estado real hoy

- `libro-vivo-prod` conecta a su base nueva por `Session Pooler`
- el repo limpio conecta tambien al proyecto antiguo por Postgres
- el inventario heuristico ha dejado:
  - `95 DROP`
  - `6 META`
  - `2 REVIEW`
  - `74 KEEP_CANDIDATE`
- el runtime actual referencia:
  - `77` tablas
  - `6` RPC
  - `4` buckets
- el proyecto nuevo confirma:
  - `77/77` tablas runtime existentes
  - `4/4` buckets runtime existentes
- el repo limpio ya:
  - instala dependencias con `npm ci`
  - pasa `npm run typecheck`
  - pasa `npm run build`
  - genera y aplica el baseline vivo de `public`
  - genera y aplica el seed data de sistema sin traer usuarios, jardines ni paginas
  - sincroniza buckets de storage por API

## Bloqueo que queda

- las policies de `storage.objects` no se pueden aplicar por el usuario Postgres externo porque Supabase devuelve `must be owner of table objects`
- los buckets ya se sincronizan por API con `service_role`
- el archivo bruto [020_current_live_storage_bootstrap_2026_04_08.sql](c:/Users/santequera/Documents/Proyecto/libro-vivo-prod/supabase/baseline/020_current_live_storage_bootstrap_2026_04_08.sql) conserva `ALTER TABLE` y `DROP POLICY`, por eso falla en `SQL Editor`
- para el paso manual hay que ejecutar [021_current_live_storage_bootstrap_sql_editor_safe_2026_04_08.sql](c:/Users/santequera/Documents/Proyecto/libro-vivo-prod/supabase/baseline/021_current_live_storage_bootstrap_sql_editor_safe_2026_04_08.sql) siguiendo [STORAGE_POLICY_MANUAL_STEP_2026_04_08.md](c:/Users/santequera/Documents/Proyecto/libro-vivo-prod/docs/STORAGE_POLICY_MANUAL_STEP_2026_04_08.md)
