# Registro de auditoría de IA (AI-LOG)

**Estudiantes:** Randy Galarza y Loreley Gonzalez
**Semana:** 9
**Proyecto:** GeoCam sincronizada – Taller Integrador 2

## 1. Prompts utilizados

### Prompts anteriores del proyecto

- «Escribe una función que sincronice mi tabla `photos` de SQLite (Drizzle) con Supabase en ambos sentidos usando TanStack Query».
- Se reportaron errores de SQLite web relacionados con `SharedArrayBuffer` y `Sync operation timeout`.
- Se reportó el error “Object not found” al mostrar fotos de la nube.
- Se solicitó cambiar Nube por Galería, mostrar las fotos locales e indicar cuáles estaban sincronizadas.
- Se solicitó agregar actualización por gesto, mejorar el detalle y corregir el mapa y las claves repetidas.
- Se solicitó revisar autenticación, rutas privadas, persistencia, RLS, sincronización, variables de entorno y migraciones.

### Prompts de hoy: borrados, feed y pruebas

- «Completa la sincronización con los borrados, agrega el feed paginado de la nube y documenta con pruebas que el diseño funciona».
- «Consume el feed de la nube con TanStack Query, con manejadores de UI completos, más la sincronización en dos sentidos entre SQLite y Supabase».
- «Verifica que Nube pagina por cursor, tiene infinite scroll y búsqueda en vivo; cubre carga, error con reintento, vacío y modo sin conexión».
- «Comprueba que las fotos pendientes se suben al recuperar la red, que una foto de otro teléfono aparece con imagen y ubicación, y que repetir la sincronización no duplica filas ni archivos».
- «Verifica que en un conflicto gana el cambio más reciente, que los borrados llegan a los otros teléfonos, que la regla de conflicto sea pura y que las pantallas no accedan directamente a Supabase o Drizzle».
- «Documenta en README la matriz con resultados observados y actualiza AI-LOG.md con los prompts y errores encontrados».
- Se compartieron los logs de Metro con avisos de `leaflet.css` y estilos `shadow*`; se pidió analizar esos mensajes y registrar el resultado.

## 2. Código generado y modificaciones

- Se mantuvo SQLite/Drizzle como almacenamiento local y Supabase como almacenamiento remoto. Se agregó `deletedAt` local y `deleted_at` remoto para representar borrados sincronizables.
- Se implementó el ciclo de subida y descarga en `services/cloudPhotos.ts`, con `client_id` estable, almacenamiento local persistente de imágenes recibidas, limpieza de archivos tras confirmar tombstones y manejo independiente de errores por foto.
- La regla pura de conflicto quedó en `services/photoConflict.mjs`: gana el `updatedAt` más reciente y, si hay empate, gana la versión remota.
- Se agregó la pestaña Nube con `useInfiniteQuery`, cursor compuesto, scroll infinito, búsqueda con espera al escribir y estados de carga, error/reintento, vacío y sin conexión. La caché de TanStack Query se persiste con AsyncStorage.
- Se agregó un coordinador global para iniciar la sincronización al recuperar conexión, además de una pantalla de estado con pendientes, último resultado/error y botón **Sincronizar ahora**.
- README documenta el ciclo, la regla de conflicto, la matriz y el estado de la evidencia visual. El GIF existente no muestra una prueba real en modo avión.
- Se registraron las advertencias de Metro. La exportación web completó el bundle pese a los avisos de URLs de imágenes del CSS de Leaflet; GeoCam usa marcadores propios. El aviso de DevTools es informativo. Los estilos `shadow*` obsoletos son una advertencia visual independiente.

## 3. Alucinaciones o errores detectados

| Error detectado | Problema | Corrección |
|---|---|---|
| Usar la firma de TanStack Query v4 en un proyecto con v5 | TypeScript no compila y las opciones de caché no corresponden a la versión instalada | Usar la API de objetos de v5 y `useInfiniteQuery` para el feed |
| Insertar filas en cada reintento o emparejar fotos por el ID local | Se pueden duplicar filas; los IDs locales no identifican la misma foto entre teléfonos | Usar `upsert` con `client_id` estable y una ruta de Storage determinista |
| Marcar como sincronizada una fila usando la hora de fin de la subida | Una edición concurrente puede quedar marcada como enviada aunque no se haya subido | Guardar en `syncedAt` la versión `updatedAt` enviada y dejar pendiente cualquier edición posterior |
| Borrar directamente una fila sincronizada | Los demás teléfonos no reciben el borrado y pueden recuperar la foto | Propagar un tombstone con `deletedAt`/`deleted_at` y limpiar los archivos después de confirmar el borrado remoto |
| Detener el lote al fallar una foto | Las fotos siguientes no se intentan | Capturar el error de cada foto por separado y reintentarla en el siguiente ciclo |
| Descargar solo metadatos o paginar con un cursor sin desempate | La imagen puede faltar y filas con la misma fecha pueden omitirse | Descargar la imagen a almacenamiento local y usar fecha más `client_id` como cursor |
| Suponer que `supabase/schema.sql` actualiza un proyecto Supabase existente automáticamente | La tabla remota continuaba sin `deleted_at`; las consultas y la sincronización fallaban con `column photos.deleted_at does not exist` | Se agregó una migración SQL idempotente y se indicó ejecutarla desde el SQL Editor del proyecto existente |
| Interpretar los avisos CSS de Leaflet como fallo del bundle | Se confunde una limitación de empaquetado de algunos iconos CSS con un error de compilación | Verificar el resultado de Metro: el bundle web terminó; GeoCam usa sus propios marcadores |

Las pruebas unitarias cubren versión local más nueva, versión remota más nueva, empate y tombstone remoto. La sincronización integrada con dos teléfonos, las políticas del proyecto Supabase y la grabación real del modo avión no se ejecutaron en esta sesión; se señalan como pendientes y no como resultados observados.

## 4. Validación realizada

| Verificación | Resultado |
|---|---|
| `npx tsc --noEmit` | Correcto |
| `npx expo lint` | Correcto |
| `git diff --check` | Correcto |
| `node --test tests/photoConflict.test.mjs` | 4 pruebas aprobadas, 0 fallidas |
| `npx expo export --platform web` | Correcto: `Web Bundled 28695ms` (1218 módulos) y exportado a `dist`; emitió avisos CSS de Leaflet que no impidieron el bundle |
| Prueba integrada con Supabase y dos teléfonos | No ejecutada en esta sesión |
| Prueba real en modo avión y GIF de evidencia | No ejecutada; el GIF existente corresponde a otro flujo |
