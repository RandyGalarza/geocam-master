# Registro de Auditoría de IA (AI-LOG)
**Estudiante(s):** Randy Galarza, Lorelei Gonzalez
**Semana:** 9
**Proyecto:** GeoCam sincronizada – Taller Integrador 2
## 1. Prompts Utilizados
- "Escribe una función que sincronice mi tabla photos de SQLite (Drizzle)
con Supabase en ambos sentidos usando TanStack Query."
## 2. Código Generado vs. Código Modificado
- **¿Qué generó la IA?:** Un useMutation que primero subía todas las filas
locales con insert y luego reemplazaba la tabla local con un select de la
remota.
- **¿Qué modifiqué/corregí?:** Invertí el orden (bajar y luego subir), cambié
insert por upsert con onConflict en client_id, y reemplacé el "borrar y
volver a llenar" por una comparación fila por fila con remoteWins(), porque
la versión de la IA borraba las fotos tomadas sin conexión.
## 3. Alucinaciones o Errores Detectados
- La IA usó useQuery(['sync'], syncAll, { cacheTime: 0 }), que es la firma de
La IA genera Problema Corrección
insert en lugar de upsert al reintentar Error de llave
duplicada o filas
repetidas
upsert con onConflict:
'client_id'
Usar el id autoincremental para
emparejar con la nube
El id 5 de un teléfono
no es el id 5 de otro
UUID en clientId
syncedAt: new Date() al terminar de
subir
Pierde ediciones
hechas durante la
subida
syncedAt igual al updatedAt que se
subió
Cursor de bajada con updated_at del
teléfono
Se saltan cambios
hechos sin conexión
y subidos tarde
Cursor con server_updated_at
DELETE directo para borrar Los demás teléfonos
nunca se enteran
Borrado lógico con deletedAt
Consulta con fetch dentro de
useEffect "porque es más simple"
Sin caché, sin
reintentos, con
condiciones de
carrera
useQuery
Guía Semana 9: TanStack Query y Sincronización Offline-First
Page 22 of 23
la versión 4. En la versión 5 instalada el proyecto no compilaba. Lo
corregí
a useQuery({ queryKey: ['sync'], queryFn, gcTime: 0 }) según la guía de
migración oficial.

### Trabajo asignado de sincronización y feed

- Se añadió `deleted_at` local/remoto y el borrado lógico; las fotos no sincronizadas se eliminan localmente, las ya publicadas conservan su marca hasta completar la propagación.
- El ciclo en `services/cloudPhotos.ts` sube por `client_id`, mantiene fallos aislados por fila, aplica cambios por `updatedAt`, descarga archivos nuevos y elimina Storage/local al confirmar tombstones.
- Se añadió Nube con cursor compuesto, búsqueda demorada, caché TanStack persistente y estado offline; además, una ruta de sincronización con pendientes, último resultado/error y acción manual.
- README documenta diagrama, conflicto, matriz y estado del GIF. El GIF existente no es una grabación offline; esta sesión no tuvo dispositivo/emulador ni backend Supabase accesible, por eso los escenarios integrados se consignan como no ejecutados.
- Esta iteración pasó `npx tsc --noEmit`, `npx expo lint` y `git diff --check`. No se ejecutaron pruebas E2E ni se validó el SQL en el proyecto remoto.
