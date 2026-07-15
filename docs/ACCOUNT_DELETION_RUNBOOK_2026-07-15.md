# Eliminación de cuenta: runbook seguro

## Estado

La implementación está preparada en código, pero debe permanecer desactivada hasta completar la prueba destructiva en un proyecto de staging. No se debe ejecutar la migración ni habilitar el job por primera vez contra producción.

## Comportamiento

- La persona confirma escribiendo `ELIMINAR MI CUENTA` y vuelve a autenticarse.
- La solicitud tiene siete días de margen y puede cancelarse mientras siga pendiente.
- Al vencer el plazo, el job bloquea el acceso, elimina membresías y datos personales, y anonimiza el perfil como `Cuenta eliminada`.
- Los jardines donde no existe otra persona activa se eliminan con todo su contenido relacional y sus objetos de Supabase Storage.
- En jardines compartidos se conserva el contenido para las demás personas, pero se elimina la identidad pública del autor.
- Auth usa borrado suave para conservar las claves técnicas exigidas por autorías históricas y evitar romper claves foráneas.
- Las cuentas `superadmin` están bloqueadas: antes hay que transferir la administración.

## Protección de entorno

El backend no funciona solo por desplegar el código. Exige simultáneamente:

```dotenv
ACCOUNT_DELETION_ENABLED=true
ACCOUNT_DELETION_ALLOWED_PROJECT_REF=<ref-exacta-del-proyecto>
ACCOUNT_DELETION_GRACE_DAYS=7
ACCOUNT_DELETION_CRON_SECRET=<secreto-largo-y-aleatorio>
```

`ACCOUNT_DELETION_ALLOWED_PROJECT_REF` debe coincidir con la referencia extraída de `NEXT_PUBLIC_SUPABASE_URL`. Si falta o no coincide, las operaciones destructivas responden con error y no ejecutan cambios.

## Puesta en marcha en staging

1. Crear una copia lógica o snapshot verificable del proyecto de staging.
2. Aplicar `supabase/sql/2026-07-15_account_deletion_foundation.sql` solo en staging.
3. Configurar las cuatro variables anteriores con la referencia de staging.
4. Crear dos usuarios QA y un jardín compartido; crear además un jardín personal para el usuario que se eliminará.
5. Añadir recuerdos, mensajes, reacciones, avatar, fotos, audio, vídeo, cápsulas e invitaciones.
6. Solicitar la eliminación desde móvil/PWA y comprobar que la fecha es siete días posterior.
7. Cancelar una vez y confirmar que la cuenta sigue activa y los datos no cambian.
8. Volver a solicitarla. Solo en staging, adelantar `scheduled_for` mediante SQL para hacerla vencida.
9. Ejecutar `POST /api/jobs/account-deletions` con `Authorization: Bearer <ACCOUNT_DELETION_CRON_SECRET>`.
10. Verificar que el login deja de funcionar, el jardín personal desaparece, los archivos privados se borran y el jardín compartido sigue íntegro con autoría anónima.
11. Ejecutar el job una segunda vez y verificar idempotencia: cero efectos nuevos y ningún error.
12. Revisar `account_deletion_requests`: estado `completed`, sin `failure_code`, con `storage_cleaned_at`.

## Activación de producción

Solo después de aprobar el checklist de staging:

1. Hacer backup de producción y verificar que puede restaurarse.
2. Aplicar la migración durante una ventana controlada.
3. Desplegar API y PWA con `ACCOUNT_DELETION_ENABLED=false`.
4. Ejecutar smoke tests de login, lectura y escritura para cuentas normales.
5. Configurar la referencia exacta de producción, el secreto del job y activar la función.
6. Programar el job diario o cada hora. El endpoint procesa como máximo 20 solicitudes por ejecución y limita cada solicitud a 10 intentos automáticos.
7. Monitorizar estados `failed`, sin registrar emails, tokens ni contenido personal en logs.

## Recuperación

- `pending`: la persona puede cancelar desde la app.
- `failed`: el perfil puede estar ya bloqueado; corregir la causa y reejecutar el job. El proceso es idempotente.
- `processing` atascado: inspeccionar Storage y Auth, marcar `failed` con un código técnico sin datos personales y reejecutar.
- Nunca restaurar una cuenta completada reutilizando su usuario Auth. Una restauración excepcional requiere revisión manual de privacidad y consentimiento.
