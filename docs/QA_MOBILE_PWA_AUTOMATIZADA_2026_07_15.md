# QA automatizada de la PWA movil

Fecha: 2026-07-15

## Objetivo

La suite `qa:mobile:pwa:public` valida la PWA movil desplegada sin iniciar sesion y sin modificar datos. Todas las peticiones distintas de `GET`, `HEAD` u `OPTIONS` se bloquean antes de salir del navegador.

## Ejecucion

Produccion:

```powershell
npm.cmd run qa:mobile:pwa:public
```

Servidor local de produccion:

```powershell
npm.cmd run qa:mobile:pwa:public -- --base-url=http://127.0.0.1:3800/mobile
```

Los informes y capturas se guardan en `tmp/qa-mobile-pwa-public/`, que esta ignorado por Git.

## Cobertura

- HTML de entrada, MIME y contenido del bundle JavaScript.
- Identidad de release, entorno y backend Supabase esperado.
- Manifest, modo instalable e iconos requeridos.
- Registro, instalacion y control efectivo del service worker.
- Manifiesto de precache accesible y sin archivos privados de Next.
- Recarga offline de la pantalla de acceso.
- Rutas profundas de capsulas, ajustes, mapa, planes y recuerdos.
- Login en viewport iPhone: validacion, ojo de contrasena, alta y recuperacion.
- Layout de login en escritorio, fuentes cargadas, imagenes y overflow.
- Errores JavaScript, consola, red, HTTP y cualquier intento de escritura.

## Guardias de build

`postbuild` ejecuta `scripts/fix-pwa-precache-path.mjs`. Corrige el path incorrecto que `next-pwa` genera para el manifiesto de precache y elimina entradas privadas `/_next/server/` que no se pueden servir al navegador.

`mobile:pwa:check` y `mobile:pwa:check:sw` fallan si el bundle movil, el registrador, el worker o el precache quedan desalineados.

## Limite deliberado

Esta suite no prueba credenciales ni datos de produccion. Los flujos autenticados de pareja, jardines e invitaciones pertenecen a `qa:couple:mobile` y solo deben ejecutarse contra un proyecto de QA cuyo identificador pase la guardia del script. `qa:couple:reset` es destructivo para ese proyecto y nunca debe apuntar a produccion.
