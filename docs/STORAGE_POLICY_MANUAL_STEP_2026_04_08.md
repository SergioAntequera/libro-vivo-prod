# Storage Policy Manual Step

El bootstrap de `public` ya se puede automatizar desde este repo, y los buckets se pueden sincronizar por API con `service_role`.

Queda una limitacion real de privilegios:

- `storage.objects` no es propiedad del usuario Postgres externo usado por `SUPABASE_DB_URL`
- por eso, al aplicar policies por SQL remoto sale `must be owner of table objects`

La solucion operativa es:

1. Mantener el extracto bruto:
   [020_current_live_storage_bootstrap_2026_04_08.sql](c:/Users/santequera/Documents/Proyecto/libro-vivo-prod/supabase/baseline/020_current_live_storage_bootstrap_2026_04_08.sql)
2. Ejecutar en el `SQL Editor` del proyecto `libro-vivo-prod` la version segura:
   [021_current_live_storage_bootstrap_sql_editor_safe_2026_04_08.sql](c:/Users/santequera/Documents/Proyecto/libro-vivo-prod/supabase/baseline/021_current_live_storage_bootstrap_sql_editor_safe_2026_04_08.sql)
3. Verificar luego que `pg_policies` para `storage.objects` coincide con el proyecto antiguo

Buckets:

- se sincronizan por API con `npm run prod:storage:buckets:sync`

Policies:

- el archivo `020` conserva `ALTER TABLE` y `DROP POLICY`, utiles como referencia pero no aptos para el `SQL Editor` actual
- el archivo `021` evita esas sentencias y crea solo las policies que faltan
- siguen siendo el unico paso manual pendiente de storage mientras no tengamos una via privilegiada equivalente al SQL Editor
