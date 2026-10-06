# Registro de Auditoría de IA (AI-LOG)

**Estudiante(s):** Randy Galarza - Loreley Gonzales
**Semana:** 6  
**Proyecto:** GeoCam – Extensión a App de Dos Pestañas (GeoCam + Mapa)  

---

## 1. Prompts Utilizados

### Prompt 1 (Custom Hook useShake)
> *"Escribe un Custom Hook en React Native con TypeScript que detecte cuando el usuario agita el teléfono usando expo-sensors, con umbral configurable y prevención de múltiples disparos consecutivos."*

### Prompt 2 (Manejo de Estado Global Inmutable)
> *"Crea un GeoPhotosContext con TypeScript en React Native para Expo Router que permita almacenar fotos capturadas e importadas, con operaciones inmutables addPhoto, removePhoto y clearAll, y un hook useGeoPhotos."*

### Prompt 3 (Pestaña Mapa con Marcadores y Lista de Fotos sin Coordenadas)
> *"Genera una pantalla de Mapa en Expo Router app/(tabs)/mapa.tsx con react-native-maps donde cada foto con coordenadas tenga un Marker que muestre su miniatura al presionarlo, un botón flotante para desplegar fotos 'Sin ubicación' en una hoja modal, y centrado automático en la posición del usuario o la última foto."*

### Prompt 4 (Importación desde Galería con Distinción Visual)
> *"Añade un botón para importar fotos desde la galería usando expo-image-picker, etiquetando la foto con source: 'gallery' y las coordenadas actuales o null si no hay permiso, diferenciándola visualmente de las fotos de cámara."*

### Prompt 5 (Solución de Error de Acelerómetro)
> *"Corrige el error 'Acelerómetro: this._nativeModule.addListener is not a function' al usar expo-sensors en Expo Go / React Native."*

### Prompt 6 (Migración de Mapa a OpenStreetMap Libre)
> *"El mapa no se está mostrando correctamente (pantalla beige vacía con logo de Google). Cambia la visualización del mapa a OpenStreetMap (Open Source) libre con Leaflet y react-native-webview sin depender de servicios o claves de Google Maps."*

---

## 2. Código Generado vs. Código Modificado

| Elemento | ¿Qué generó la IA? | Problema Detectado | ¿Qué se modificó / corrigió? |
|---|---|---|---|
| **`useShake.ts`** | Suscripción a `Accelerometer` en `useEffect` invocando `addListener` directamente sobre `_nativeModule`. | Error de ejecución `this._nativeModule.addListener is not a function` en Expo Go / SDK 57, fuga de recursos y alertas en rojo en la UI. | Se agregó puente con `NativeEventEmitter` de React Native como fallback, verificación previa de compatibilidad y degradación elegante (`isAvailable: false, error: null`) para no romper la UI. |
| **`useCamera.ts`** | Typo en la importación `from 'expocamera'` y uso de parámetros implícitamente tipados como `any` en `setFacing`. | Fallo de resolución de módulo en TypeScript y advertencias de tipado estricto. | Se corrigió la importación a `'expo-camera'`, se tipó strictly `(currentFacing: CameraType)`, y se añadió captura de errores hacia el estado de la UI. |
| **`GeoCamScreen`** | Controles de cámara anidados como elementos hijos dentro de `<CameraView>`. | Comportamiento inconsistente y no soportado en las versiones modernas de `expo-camera`. | Se colocaron todos los controles (obturador, switch, galería, miniatura) como hermanos absolutos superpuestos con `StyleSheet.absoluteFill`. |
| **`useGeoLocation.ts`** | Llamada a `watchPositionAsync` sin registrar logs de limpieza ni verificar montaje seguro. | Difícil trazabilidad para comprobar el cese del GPS al cambiar de pestaña; riesgo de fuga de batería. | Se añadió bandera `cancelled`, cancelación inmediata si se desmonta antes de resolver la promesa, método `subscription?.remove()`, y el log: `[useGeoLocation] Deteniendo seguimiento GPS (cleanup)`. |
| **`expo-image-picker`** | Uso de la enumeración `ImagePicker.MediaTypeOptions.Images`. | API obsoleta en el SDK actual de Expo. | Se reemplazó por la nueva especificación del SDK 57: `mediaTypes: ['images']`. |
| **`mapa.tsx`** | Uso de `mapType="none"` con `<UrlTile>` defectuoso en `react-native-maps`. | El mapa se mostraba completamente en blanco/beige con el logo de Google al no contar con clave de API activada. | Se migró a **OpenStreetMap (Open Source)** libre usando Leaflet en `react-native-webview` (`tile.openstreetmap.org`), manteniendo marcadores interactivos con miniatura, distinción por origen (`camera` vs `gallery`), tarjeta de previsualización, modal de fotos sin ubicación y centrado GPS. |
| **`mapa.web.tsx`** | Falta de componente de respaldo para la plataforma web. | Errores de compilación o fallos al ejecutar `npx expo start --web`. | Se creó el componente `mapa.web.tsx` para renderizado fluido en navegadores web sin interferir con la versión nativa. |
| **Manejo de Permisos** | Sugerencia de solicitar todos los permisos (cámara y ubicación) inmediatamente al abrir la aplicación. | Pésima experiencia de usuario (UX) y rechazo en revisiones de App Store / Play Store. | Se implementó la solicitud de permisos en contexto (solo cuando el usuario va a capturar o mediante banners informativos no bloqueantes). Si se niega la ubicación, la cámara sigue funcionando. |

---

## 3. Alucinaciones o Errores Detectados

1. **`import { Camera } from 'expo-camera'` y `Camera.requestCameraPermissionsAsync()`**:
   - *Alucinación/Obsolescencia:* La IA insistió inicialmente en usar el componente clásico `Camera` y métodos estáticos de clase.
   - *Corrección:* Se reemplazó por el componente moderno `CameraView` y el hook `useCameraPermissions()` de Expo SDK actual.

2. **`import * as Permissions from 'expo-permissions'`**:
   - *Alucinación/Obsolescencia:* La IA sugirió este paquete para consultar el estado global de permisos.
   - *Corrección:* `expo-permissions` está retirado y obsoleto. Cada módulo de Expo gestiona sus propios permisos (`Location.requestForegroundPermissionsAsync()`, `useCameraPermissions()`).

3. **`requestBackgroundPermissionsAsync` para geolocalizar fotos**:
   - *Alucinación/Exceso de Privilegios:* La IA propuso solicitar permisos de ubicación en segundo plano.
   - *Corrección:* Rechazado; solo se requiere foreground location (`requestForegroundPermissionsAsync`).

4. **Uso de `className` sin motor Tailwind/NativeWind configurado**:
   - *Alucinación:* La IA generó clases utilitarias de Tailwind en JSX (`className="flex-1 bg-black"`), asumiendo erróneamente que funcionaban por defecto en React Native.
   - *Corrección:* Se implementaron estilos limpios y de alto rendimiento utilizando `StyleSheet.create` de React Native.


---

## 4. Auditoría Módulo SQLite CRUD Persistente (Drizzle ORM & Expo SQLite)

### Prompts Utilizados
1. **Prompt 7 (Configuración Drizzle ORM & Expo SQLite):**
   > *"Convierte la GeoCam en un módulo CRUD completo con Drizzle ORM y SQLite (`expo-sqlite`). Configura drizzle.config.ts, babel.config.js con babel-plugin-inline-import, metro.config.js para bundle de archivos .sql, y la protección en _layout.tsx con useMigrations."*
2. **Prompt 8 (Esquema Drizzle & Dual Migrations):**
   > *"Crea el esquema db/schema.ts con tablas albums (id, name, createdAt) y photos (id, uri, latitude, longitude, source, note, favorite, albumId, createdAt). Genera dos migraciones automáticas con drizzle-kit generate sin editar SQL a mano."*
3. **Prompt 9 (Repositorio y Live Queries):**
   > *"Implementa db/repositories/photos.ts y db/repositories/albums.ts utilizando listQuery con filtros (like, albumId, favorite), withLocationQuery con isNotNull(photos.latitude), y hooks reactivos usePhotos y useAlbums con useLiveQuery."*
4. **Prompt 10 (Archivos Permanentes & CRUD Screen):**
   > *"Crea services/photoFiles.ts usando expo-file-system para copiar fotos de la caché a Paths.document/photos/ al guardar y borrarlas al eliminar la foto. Implementa la pantalla app/foto/[id].tsx para ver, editar nota, marcar favorito, cambiar álbum y eliminar con Alert de confirmación."*

### Decisiones Arquitectónicas & Correcciones
- **Aislamiento de Drizzle:** Las pantallas (`geocam.tsx`, `mapa.tsx`, `foto/[id].tsx`) no importan nada directamente de `drizzle-orm` ni de la base de datos. Toda la interacción pasa exclusivamente por los hooks (`usePhotos`, `useAlbums`) y repositorios (`db/repositories/photos.ts`).
- **Navegación Typed Routes:** Se ajustaron los parámetros dinámicos de ruta en Expo Router (`router.push('/foto/' + id as any)`) para solucionar restricciones de compilación con `typedRoutes: true`.
- **Persistencia de Archivos en Disco:** Se migró al API moderno de `expo-file-system` (`Paths.document`, `Directory`, `File`) para garantizar copia síncrona/asíncrona limpia a la carpeta de documentos de la aplicación.

---

**Auditoría finalizada:** Proyecto verificado con `npx tsc --noEmit` sin errores de compilación y 2 migraciones SQL generadas e integradas.