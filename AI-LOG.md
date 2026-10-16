# Registro de Auditoría de IA (AI-LOG)

**Estudiante(s):** Randy Galarza, Loreley Gonzales
**Semana:** 8
**Proyecto:** GeoCam en la nube

## 1. Prompts Utilizados

- "Web ERROR [ReferenceError: SharedArrayBuffer is not defined] en `db/client.ts` al abrir la base SQLite."
- "Sigue saliendo el error `SharedArrayBuffer is not defined`."
- Se compartió el stack trace que localizó el timeout en `invokeWorkerSync`, llamado por `openDatabaseSync`.
- Se reportó el error "Object not found" al mostrar las fotos de la pestaña Nube.
- "Edita este AI-LOG con todo lo que hicimos hoy."
- "Mejora visualmente la aplicación y arregla la barra: en el móvil los iconos aparecen como un cuadrado con una X."
- "Cambia la pestaña Nube por Galería, muestra todas las imágenes de Fotos y añade un indicador a las que están en la nube."
- "Agrega la función de actualizar deslizando hacia abajo desde la parte superior del teléfono."
- "Mejora visualmente el detalle de foto."
- "La pestaña Fotos no actualiza la última imagen capturada y el mapa web falla al formatear coordenadas indefinidas."
- "Encountered two children with the same key en la lista de la pestaña Galería."
- Se compartió una captura de Galería web con imágenes vacías, fechas inválidas y tarjetas demasiado anchas.
- Se reportó que el mapa no se mostraba en la versión web y se compartió una captura donde aparecía solo una tarjeta informativa.
- "Actualiza el AI-LOG."
- "Antes de entregar, verifica C7: documentación, autenticación, rutas privadas, persistencia segura, RLS, sincronización, variables de entorno y migraciones."

## 2. Código Generado vs. Código Modificado

- **¿Qué generó la IA?:** Un cliente web de SQLite asíncrono con Drizzle, migraciones web, consultas asíncronas para fotos y álbumes, y un adaptador web para archivos. También modificó el lanzador web para servir las URL del navegador con los encabezados COOP/COEP requeridos por Expo SQLite.
- **¿Qué se corrigió durante el trabajo?:** La primera explicación se centró en abrir la URL correcta y configurar los encabezados. Las pruebas confirmaron que `SharedArrayBuffer` estaba disponible en la URL con proxy, pero `openDatabaseSync` igualmente agotaba el tiempo de espera porque bloqueaba el hilo principal mientras esperaba al worker. Se cambió la inicialización web a `openDatabaseAsync`; Android/iOS conservan el cliente síncrono.
- **Corrección de la pestaña Nube:** Se añadió la recuperación del objeto desde la copia local cuando Supabase informa que el objeto no existe. Si no hay copia local, el error se muestra solo en esa tarjeta para que no oculte el resto de la galería. La lectura de archivos usa `fetch` en web y `File.bytes()` en nativo.
- **Corrección visual de la barra:** Se reemplazaron los emojis de las pestañas por iconos tipados de `expo-symbols` (SF Symbols en iOS y Material Symbols en Android/web), con un fallback visual y estilos para el estado activo. Se conservó la paleta oscura verde/menta y se ajustó el espacio inferior a las áreas seguras del dispositivo.
- **Galería:** La pestaña Nube se reemplazó por Galería. La pantalla muestra todas las fotos locales en una cuadrícula, permite abrir el detalle y señala con una etiqueta las fotos que tienen una copia en Storage. El estado de sincronización se deriva de `remotePath` en la base local.
- **Actualizar Galería:** Se añadió el gesto nativo de deslizar hacia abajo con un indicador de carga. Al soltar, se vuelven a consultar las fotos locales; si falla, la pantalla informa el error.
- **Detalle de foto:** Se mejoró la jerarquía visual de la pantalla con una imagen destacada, controles con iconos multiplataforma, insignia de sincronización, metadatos de ubicación más legibles y tarjetas coherentes para álbum y nota. También se actualizó el selector de álbumes.
- **Actualización de Fotos y mapa web:** Galería vuelve a consultar la base al enfocarse para mostrar capturas recientes aunque la pestaña se haya mantenido montada. La consulta de fotos con ubicación exige latitud y longitud, y el mapa web descarta coordenadas nulas o no finitas antes de mostrarlas.
- **Claves de Galería:** Se generan claves de lista a partir del id, la fecha y la URI de cada foto; las entradas idénticas reciben un sufijo de ocurrencia para mantener claves únicas incluso ante datos duplicados.
- **Galería web:** El adaptador SQLite web ahora transforma las filas de consultas `all` en arrays, el formato que Drizzle espera para mapear columnas; esto evita que los campos de fotos (URI, fecha y origen) lleguen como `undefined`. La cuadrícula se adapta al ancho web, y las fechas inválidas tienen un texto de reserva.
- **Mapa web:** La vista previa anterior solo mostraba estadísticas y miniaturas; `react-native-maps` y `react-native-webview` no proporcionaban el mapa en el navegador. Se reemplazó por Leaflet y React Leaflet, con teselas de OpenStreetMap, marcadores para fotos geolocalizadas, popups para abrir cada foto, botón para centrar en la ubicación actual y una lista modal de fotos sin coordenadas. La implementación nativa con WebView no se modificó.
- **Dependencias del mapa:** Se añadieron `leaflet`, `react-leaflet` y los tipos de desarrollo `@types/leaflet`; se actualizaron `package.json` y `package-lock.json`.
- **Revisión previa a entrega:** Se retiró de la pantalla de acceso una cuenta de prueba con credenciales fijas y se sincronizó el README con el nombre real de la pestaña Galería y el índice de álbumes de la migración vigente.
- **Correcciones finales C7:** Expo Doctor detectó una ruta de icono iOS inválida y dependencias Expo con versiones patch atrasadas. Se eliminó el override iOS inválido para usar el icono general configurado en `app.json` y se alinearon las dependencias con `npx expo install --fix`.

## 3. Alucinaciones o Errores Detectados

- La hipótesis inicial de que bastaba con usar el proxy con encabezados COOP/COEP no resolvía el error de SQLite: aun con `crossOriginIsolated === true` y `SharedArrayBuffer` disponible, `openDatabaseSync` terminaba en `Sync operation timeout`. El stack trace permitió identificar la espera síncrona del worker; se corrigió usando la API asíncrona en web.
- Una fila visible en PostgreSQL no garantiza que el archivo exista en Supabase Storage. La captura mostraba "Object not found" al firmar la URL. La lista ahora maneja ese caso por foto e intenta restaurar el archivo desde la base local, pero esa recuperación todavía debe probarse contra el proyecto Supabase real.
- Los emojis de la barra no se renderizaban de forma fiable en el móvil y aparecían como glifos sustitutos. Se usaron símbolos nativos multiplataforma en lugar de agregar una dependencia nueva.
- La vista anterior de Nube consultaba solamente las filas remotas y no presentaba toda la colección local. Galería consulta la lista completa de fotos locales; las imágenes sincronizadas se distinguen sin duplicar las que también están guardadas en el dispositivo.
- La validación local no confirma las políticas desplegadas, la existencia del bucket ni el contenido remoto. Esos puntos quedan pendientes de verificación en Supabase.
- Los iconos pasaron las validaciones de TypeScript y lint, pero todavía no se verificaron visualmente en un dispositivo físico.
- Las teselas del mapa web requieren conexión a Internet y el servicio de OpenStreetMap; se conserva la atribución visible requerida por el proveedor.
- La exportación web del mapa terminó correctamente, aunque Metro mostró advertencias sobre URLs de imágenes locales referenciadas por el CSS de Leaflet; los iconos de marcador usados por GeoCam son círculos propios y no dependen de esos recursos.
- La revisión estática no demuestra que las políticas RLS ya estén desplegadas ni que el acceso cruzado falle realmente con dos cuentas. Tampoco sustituye la prueba de cerrar y reiniciar la aplicación nativa con una sesión válida.
- La validación estática no demuestra que las políticas RLS estén desplegadas ni que el aislamiento funcione realmente entre dos cuentas. Tampoco sustituye una prueba de cierre total y reinicio de la aplicación en un dispositivo nativo.
- La persistencia nativa está configurada con SecureStore, pero no se verificó en esta sesión con una instalación móvil cerrada y reabierta; el comportamiento y límites de almacenamiento del dispositivo deben confirmarse en una prueba real.
- El registro y el inicio de sesión manejan errores en la interfaz; el cierre de sesión informa errores con `Alert`. Las pruebas reales contra Supabase no se ejecutaron durante esta revisión.

## 4. Validación Realizada

- Se abrió la app web hasta la pantalla de inicio de sesión, con `SharedArrayBuffer` deliberadamente no disponible; SQLite y las migraciones asíncronas se inicializaron sin el error original.
- Se comprobó que las URL web del lanzador incluyen `Cross-Origin-Embedder-Policy` y `Cross-Origin-Opener-Policy`.
- `npx tsc --noEmit`, `npx expo lint` y `git diff --check` finalizaron sin errores.
- Tras el cambio de iconos, `npx tsc --noEmit`, `npx expo lint` y `git diff --check` volvieron a finalizar sin errores.
- Tras reemplazar Nube por Galería, `npx tsc --noEmit`, `npx expo lint` y `git diff --check` finalizaron sin errores.
- Tras añadir la actualización por gesto, `npx tsc --noEmit`, `npx expo lint` y `git diff --check` finalizaron sin errores.
- Tras el rediseño del detalle de foto, `npx tsc --noEmit`, `npx expo lint` y `git diff --check` finalizaron sin errores.
- Tras corregir la actualización de Galería y el filtrado de coordenadas web, `npx tsc --noEmit`, `npx expo lint` y `git diff --check` finalizaron sin errores.
- Tras corregir las claves duplicadas de Galería, `npx tsc --noEmit`, `npx expo lint` y `git diff --check` finalizaron sin errores.
- Tras corregir el mapeo de filas SQLite web y adaptar la cuadrícula de Galería, `npx tsc --noEmit`, `npx expo lint`, `git diff --check` y la exportación web finalizaron sin errores.
- Tras añadir el mapa web interactivo, `npx tsc --noEmit`, `npx expo lint` y `git diff --check` finalizaron sin errores; `npx expo export --platform web` completó la exportación con las advertencias de CSS indicadas arriba.
- En la revisión C7 se verificó que README, AI-LOG, SQL de Supabase, migración `0002`, GIF, `.env.example` y `.gitignore` están versionados; `.env` está ignorado y no aparece en el historial Git. No se encontraron claves de servicio o claves privadas en el código.
- Tras retirar las credenciales fijas, corregir el README y alinear dependencias, `npx tsc --noEmit`, `npx expo lint`, `npx expo-doctor` (21/21) y `git diff --check` finalizaron sin errores. Se quitó la configuración iOS de icono que apuntaba a un directorio no reconocido; Expo usa el icono general del proyecto.
