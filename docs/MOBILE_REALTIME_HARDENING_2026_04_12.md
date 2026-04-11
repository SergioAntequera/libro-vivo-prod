# Mobile Realtime Hardening

Fecha: 2026-04-12

## Canon

- Repo productivo: `libro-vivo-prod`
- Rama productiva: `main`
- Supabase productivo: `wmmaxlykngeszwvvifqj`
- Dominio publico: `https://www.libro-vivo.es`

## Objetivo

Portar al repo productivo el endurecimiento del flujo colaborativo movil para:

- chat de jardin
- presencia compartida
- nacimiento compartido de flor
- sellado conjunto

sin depender solo de presencia efimera del cliente.

## Causa raiz detectada

### Chat

El chat mezclaba dos senales distintas:

- el estado visual de conexion se apoyaba en el canal live/presence
- los mensajes reales entraban por `postgres_changes`

Eso permitia que la UI pareciera conectada mientras el canal que entregaba mensajes podia estar degradado. En movil real eso se traducia en mensajes que solo aparecian tras refrescos o con retraso.

### Nacimiento compartido

El ritual dependia demasiado de presencia fresca del cliente. En movil real:

- los heartbeats pueden espaciarse
- una pestana puede perder foco o dormirse
- un participante podia dejar de ver al otro

Ademas, el estado `ready` no estaba suficientemente protegido frente a rescrituras de autosave, por lo que un flujo legitimo podia perder el `si` persistido y romper la simetria del sellado.

## Cambios funcionales incluidos

### Presencia compartida durable

Se anade una capa `shared-live` server-backed:

- `src/app/api/shared-live/route.ts`
- `src/lib/sharedLiveApi.ts`
- `src/lib/sharedLiveSessions.ts`
- `src/lib/useSharedPresenceSessions.ts`

Esta capa permite refrescar presencia compartida desde servidor y no depender solo del estado efimero del canal realtime.

### Chat

Archivo principal:

- `src/components/chat/useGardenChatRoom.ts`

Cambios:

- separacion de salud del canal de base de datos y del canal de typing
- `liveConnected` ya refleja la conectividad que importa para mensajes
- refresh de presencia al recuperar foco y conectividad
- fallback polling mas robusto cuando el canal de mensajes no esta sano
- presencia de miembros derivada de `shared-live`, no de tracking efimero local

### Ritual de nacimiento compartido

Archivos:

- `src/components/pageDetail/usePageFlowerBirthData.ts`
- `src/components/pageDetail/usePageFlowerBirthRitual.ts`
- `src/app/page/[id]/page.tsx`
- `src/lib/useSharedRitualChannel.ts`
- `src/lib/flowerBirthRitual.ts`
- `src/components/pageDetail/savePageDetail.ts`
- `src/components/pageDetail/cancelPageDetailEdit.ts`

Cambios:

- `ready_at` entra en el modelo y se conserva en lecturas y escrituras
- el cambio de `ready` se persiste de forma explicita
- el autosave deja de pisar `ready_at`
- la UI del ritual reconoce `ready` persistido ademas del estado live
- durante el ritual pendiente se refrescan ratings y ritual con polling controlado

## Configuracion de cache

Archivo:

- `next.config.mjs`

Se endurece `next-pwa` para evitar cache agresiva sobre GET genericos y rutas tipo API o Supabase que pueden estropear consistencia y realtime en movil.

## SQL nuevas

Aplicar en este orden:

1. `supabase/sql/2026-04-10_flower_birth_ritual_ready_state.sql`
2. `supabase/sql/2026-04-11_shared_live_server_now.sql`
3. `supabase/sql/2026-04-11_shared_live_sessions.sql`

## Estado de verificacion

Verificado en local sobre `libro-vivo-prod`:

- `npm run build` pasa

Pendiente antes de dar por cerrado en produccion:

- aplicar las 3 SQL en `wmmaxlykngeszwvvifqj`
- smoke real con dos moviles sobre:
  - registro y login
  - invitacion al mismo jardin
  - chat bidireccional
  - nacimiento compartido
  - sellado conjunto

## Riesgos abiertos

- `/activity` sigue siendo una ruta sospechosa de lentitud en movil y debe perfilarse aparte
- aunque el build esta bien, la verificacion definitiva de colaboracion depende de probar con dos dispositivos reales tras aplicar SQL

## Checklist de despliegue

1. Confirmar que el proyecto activo es `libro-vivo-prod` en `main`
2. Hacer commit y push de este bloque
3. Aplicar las 3 SQL en Supabase prod
4. Forzar deploy en Vercel si no salta solo
5. Ejecutar smoke manual con dos moviles
6. Si falla algo, revisar primero:
   - `shared_live_sessions`
   - `ready_at` en `flower_birth_ritual_ratings`
   - estado del chat en ambos lados sin recargar

## Punto de reanudacion

Si retomamos mas tarde, el siguiente paso correcto es:

- aplicar SQL en prod
- probar dos moviles reales
- documentar resultados y, solo si falla algo, hacer un fix pequeno y especifico
