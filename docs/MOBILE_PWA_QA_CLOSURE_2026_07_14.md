# Cierre QA PWA movil - 2026-07-14

## Alcance cerrado

- La PWA movil se exporta para `/mobile` y apunta al Supabase de produccion `wmmaxlykngeszwvvifqj`.
- Se corrigio la busqueda y seleccion de lugares dentro de recuerdos en web.
- El estado vacio de recuerdos dirige al flujo actual de creacion de planes.
- El mapa web ya no usa un lienzo vacio: muestra OpenStreetMap con la region activa.
- Las fotos de planes, los adjuntos del chat y los medios de recuerdos y capsulas conservan el gesto de usuario requerido por Safari.
- El borrado de recuerdos y planes usa RPC autenticadas con autorizacion por creador, owner/editor o superadmin.
- Los planes incorporan estado de preparacion, participantes y personas externas en el esquema activo.
- La descarga del libro anual envia el token de sesion y descarga el PDF autenticado.
- Se añadieron politicas de Storage para portadas de planes.

## Base de datos

- Migracion aplicada: `supabase/sql/2026-07-14_mobile_qa_member_actions.sql`.
- Copia previa de la funcion sustituida: `docs/PROD_SCHEMA_BACKUP_2026_07_14_MOBILE_QA.sql`.
- La migracion solo añade columnas con valores por defecto, funciones y politicas. No reescribe ni elimina filas existentes.
- Las RPC `delete_garden_page` y `delete_garden_seed` existen y rechazan llamadas anonimas.

## Verificaciones ejecutadas

- `libro-vivo-mobile`: `npm run typecheck` correcto.
- `libro-vivo-mobile`: escaneo UTF-8 de `app/` y `src/` correcto.
- `libro-vivo-mobile`: `npm run export:web` correcto.
- `libro-vivo-prod`: `npm run mobile:pwa:check` correcto.
- `libro-vivo-prod`: `npm run typecheck` correcto.
- `libro-vivo-prod`: `npm run build` correcto.
- El bundle contiene el host de produccion y las rutas/RPC nuevas.

## Riesgo residual no bloqueante

- El bundle web principal pesa aproximadamente 3.64 MB y Workbox no lo precarga con el limite actual. La PWA funciona conectada; la apertura totalmente offline desde cero queda para la fase especifica de rendimiento/offline.
- Push remoto, camara, microfono, mapas nativos y cola offline requieren QA nativa en un development build cuando haya un dispositivo/entorno nativo disponible.
