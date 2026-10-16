# AI-LOG — Semana 8: Supabase y sincronización

**Proyecto:** GeoCam · **Semana:** 8 · **Equipo:** Randy Galarza y Loreley Gonzales

## Trabajo de la semana

- Añadido acceso con Supabase Auth, errores visibles en registro/inicio/cierre y guard de rutas privadas.
- Persistencia de sesión nativa a través de SecureStore; no se configura AsyncStorage.
- Migración Drizzle `0002_owner_sync.sql` para `owner_id`, `client_id`, `updated_at`, `remote_path` y `synced_at`.
- Consultas locales de fotos y álbumes restringidas al `ownerId` de la sesión.
- Sincronización secuencial idempotente, manejo de errores por elemento y limpieza del objeto si falla la fila.
- Pestaña Nube con URL firmadas y suscripción Realtime.
- SQL de PostgreSQL, RLS, bucket privado y políticas incluido en `supabase/schema.sql`.

## Decisiones y correcciones

| Decisión | Motivo |
|---|---|
| Ruta remota `<userId>/<clientId>.jpg` | La política de Storage puede comprobar el primer segmento y el ID del objeto permanece estable en reintentos. |
| `upsert` de Storage y conflicto por `client_id` | Reintentar no crea nuevos objetos ni nuevas filas. |
| Archivo leído con `File.bytes()` | Envía bytes reales desde el archivo local y permite detectar tamaño cero antes de subir. |
| SecureStore para la sesión nativa | Credenciales locales cifradas y persistentes al reiniciar la app. |
| `owner_id` agregado mediante migración local | Impide que los repositorios expongan registros de otra sesión del mismo teléfono. |

## Validación pendiente en proyecto Supabase

Aplicar `supabase/schema.sql`, habilitar correo y ejecutar pruebas reales de sincronización, Realtime, URL firmada y aislamiento con dos cuentas. La auditoría del repositorio local no sustituye las pruebas contra un backend desplegado.
