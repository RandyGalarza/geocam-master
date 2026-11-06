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

## Registro de la entrega de sincronización (6 nov 2026)

### Prompts relacionados con el trabajo

- «Completa la sincronización con los borrados, agrega el feed paginado de la nube y documenta con pruebas que el diseño funciona».
- «Consume el feed de la nube con TanStack Query, con manejadores de UI completos, más la sincronización en dos sentidos entre SQLite y Supabase».
- «Verifica que Nube pagina por cursor, tiene scroll infinito y búsqueda en vivo; cubre carga, error/reintento, vacío y modo sin conexión».
- «Comprueba que las fotos pendientes se suben al recuperar red, que las fotos de otro teléfono se descargan con imagen y ubicación, y que los reintentos no duplican datos».
- «Mantén la regla de conflicto pura en `services/`, documenta la matriz con los resultados reales y actualiza este AI-LOG».
- «Analiza los mensajes de Metro de Leaflet y registra los hallazgos en el AI-LOG».

### Hallazgos y correcciones

- La revisión del ciclo encontró que el `catch` de una subida no debe detener el lote: ahora cada foto falla de forma independiente y las siguientes continúan.
- Un tombstone no se marca localmente como completado hasta que Supabase confirma la marca y la eliminación del objeto. Si Storage falla, la foto permanece pendiente para reintento.
- El desempate vive en `services/photoConflict.mjs`, función pura: `updatedAt` más alto gana y, ante empate, gana el remoto. `node --test tests/photoConflict.test.mjs` pasó 4/4 pruebas unitarias: edición local reciente, edición remota reciente, empate y tombstone remoto.
- La sincronización automática quedó en un coordinador raíz para que también funcione si GeoCam no está visible. El feed conserva una clave de caché estable al alternar la red y cambia a URIs locales persistentes al entrar en modo avión.
- El log de Metro compartido terminó con `Web Bundled ... (1288 modules)`; por tanto el bundle web sí completó. Los avisos de `leaflet.css` señalan URLs locales de imágenes de controles/iconos que Metro no puede empaquetar desde ese CSS; los marcadores propios de GeoCam no dependen de esos iconos. El mensaje de React DevTools es informativo. React Native también reportó estilos `shadow*` obsoletos; se registran como deuda visual independiente, no como fallo de sincronización.
- No se ejecutó la matriz integrada con Supabase ni dos teléfonos durante esta sesión. README separa los resultados estáticos/unitarios de los pasos que todavía requieren dispositivos y backend real; el GIF compartido existente no es una grabación del modo avión.
