# Puerta de calidad de la PWA móvil

Fecha: 2026-07-15

## Objetivo

Evitar que una publicación de `/mobile` dependa de una comprobación visual manual. La puerta valida código, build, seguridad, PWA instalable, navegación offline, accesibilidad y regresiones de tamaño.

## Comandos

- `npm run qa:release:local`: puerta previa a publicar. Ejecuta audit de producción, typecheck, build, contratos del bundle y service worker, y tests del backend sensible.
- `npm run qa:mobile:pwa:public`: comprobación de solo lectura contra `https://www.libro-vivo.es/mobile`.
- `npm run security:audit:prod`: falla desde severidad moderada si una dependencia de producción tiene una vulnerabilidad conocida.

La QA pública bloquea cualquier método distinto de `GET`, `HEAD` u `OPTIONS`. No crea cuentas, jardines, recuerdos ni modifica datos de producción.

## Cobertura pública

- El HTML carga un entry JavaScript versionado y nunca HTML servido como `.js`.
- `build-info.json` identifica release, entorno y backend de producción.
- Manifest, iconos, scope, start URL y service worker son válidos.
- Las rutas profundas de cápsulas, ajustes, mapa, planes y recuerdos sirven el shell y redirigen a login sin sesión.
- Login, registro y recuperación pasan WCAG 2.1 A/AA con Axe en perfil iPhone; login también se valida en escritorio.
- El ojo de contraseña, estados disabled, fuentes, imágenes, overflow y navegación de auth funcionan.
- La PWA vuelve a abrir el login sin conexión después de quedar controlada por el service worker.
- No hay errores de JavaScript, consola, red ni respuestas HTTP fallidas durante el recorrido.

## Presupuestos actuales

| Métrica | Límite |
| --- | ---: |
| Entry JavaScript raw | 4.500.000 bytes |
| Entry JavaScript gzip | 1.100.000 bytes |
| Entry JavaScript Brotli | 850.000 bytes |
| Nodos DOM del login | 1.500 |
| Recursos del login | 120 |

Línea base del 2026-07-15: 3.915.853 bytes raw, 968.604 gzip, 720.414 Brotli, 79 nodos y 10 recursos en iPhone.

## Automatización

`.github/workflows/quality-gates.yml` ejecuta la puerta local en cada push y pull request. Cuando GitHub recibe un `deployment_status` de producción exitoso, ejecuta Playwright contra la PWA pública y conserva el informe JSON, el resumen Markdown y las capturas durante 14 días.

## Riesgo que permanece fuera de esta puerta

La suite pública no puede validar pantallas autenticadas sin crear o usar una cuenta real, y tampoco sustituye la QA nativa de cámara, push, mapas y cola offline en un development build. Esos recorridos siguen necesitando un entorno staging operativo y dispositivos físicos.
