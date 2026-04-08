# Production SQL

SQL allowlisted para reconstruir el schema productivo de `libro-vivo-prod`.

Origen:
- repo fuente: `../libro-vivo`
- allowlist: `supabase/allowlists/production-sql-allowlist-2026-04-08.txt`

Reglas:
- aqui solo viven SQL incluidos en la allowlist productiva
- no copiar `WIPE_*`, `*_gate*`, `*_audit*`, tests ni `archive/dev`
- el orden de aplicacion es el orden lexicografico de estos ficheros

Total copiados: 75
