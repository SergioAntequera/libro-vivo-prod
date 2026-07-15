# Observabilidad del backend

## Cobertura implementada

- `src/instrumentation.ts` registra arranque y errores no controlados capturados por Next.js.
- Todas las rutas que usan `requireAuthenticatedRoute` generan un `request-id` estable y registran rechazos de sesión o rol con códigos técnicos.
- La exportación de cuenta registra éxito, duración, número de datasets y avisos, sin registrar el contenido exportado.
- La solicitud, cancelación y job de eliminación registran resultado y contadores, nunca emails, ids de usuario ni secretos.
- Las respuestas observadas incluyen `X-Request-ID` para correlacionar un error mostrado en cliente con el log del servidor.
- El sanitizador elimina emails, JWT, UUID, cookies, autorizaciones, contraseñas, secretos, teléfonos y claves de API.
- Las rutas se registran sin query string; los ids dinámicos se sustituyen por `:id`.

## Formato

Cada línea es JSON y contiene como máximo:

- `timestamp`, `service`, `event` y `level`;
- `requestId`, área, operación, método y ruta sanitizada;
- duración y contadores técnicos de baja cardinalidad.

Esto permite crear búsquedas y alertas en Vercel Logs sin depender todavía de un proveedor externo.

## Activación externa pendiente

La aplicación no tiene configurado un proyecto Sentry de backend. Cuando exista:

1. instalar y configurar `@sentry/nextjs` siguiendo la convención de `instrumentation.ts` de Next.js;
2. reutilizar las mismas reglas de redacción antes de enviar eventos;
3. configurar DSN, organización, proyecto y token solo en Vercel/CI;
4. validar en staging un error controlado y comprobar sourcemaps;
5. crear alertas para auth, jobs, exportación, media y errores no controlados.

No se debe enviar contenido de recuerdos, mensajes, formularios, archivos, emails ni tokens al proveedor.

## Verificación

```powershell
npm run test:server-telemetry
npm run typecheck
npm run build
```

La convención `instrumentation.ts` y `onRequestError` está soportada de forma estable por Next.js 16. El callback debe permanecer ligero y no bloquear la respuesta con integraciones lentas.
