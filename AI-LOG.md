# Registro de Auditoría de IA (AI-LOG)

**Estudiante(s):** Randy Galarza
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

---

## 2. Código Generado vs. Código Modificado

| Elemento | ¿Qué generó la IA? | Problema Detectado | ¿Qué se modificó / corrigió? |
|---|---|---|---|
| **`useShake.ts`** | Suscripción a `Accelerometer` en `useEffect` sin configurar `setUpdateInterval`, modificando refs directamente durante render (`onShakeRef.current = onShake`), disparando decenas de veces el callback por agitada. | Fuga de recursos, violaciones de React Compiler / React 19 (`react-hooks/refs`), y comportamiento errático en UI. | Se agregó `Accelerometer.isAvailableAsync()`, `Accelerometer.setUpdateInterval(100)`, cooldown de 1000 ms, actualización de la ref dentro de `useEffect`, y cleanup seguro con `.remove()`. |
| **`useCamera.ts`** | Typo en la importación `from 'expocamera'` y uso de parámetros implícitamente tipados como `any` en `setFacing`. | Fallo de resolución de módulo en TypeScript y advertencias de tipado estricto. | Se corrigió la importación a `'expo-camera'`, se tipó estrictamente `(currentFacing: CameraType)`, y se añadió captura de errores hacia el estado de la UI. |
| **`GeoCamScreen`** | Controles de cámara anidados como elementos hijos dentro de `<CameraView>`. | Comportamiento inconsistente y no soportado en las versiones modernas de `expo-camera`. | Se colocaron todos los controles (obturador, switch, galería, miniatura) como hermanos absolutos superpuestos con `StyleSheet.absoluteFill`. |
| **`useGeoLocation.ts`** | Llamada a `watchPositionAsync` sin registrar logs de limpieza ni verificar montaje seguro. | Difícil trazabilidad para comprobar el cese del GPS al cambiar de pestaña; riesgo de fuga de batería. | Se añadió bandera `cancelled`, cancelación inmediata si se desmonta antes de resolver la promesa, método `subscription?.remove()`, y el log: `[useGeoLocation] Deteniendo seguimiento GPS (cleanup)`. |
| **`expo-image-picker`** | Uso de la enumeración `ImagePicker.MediaTypeOptions.Images`. | API obsoleta en el SDK actual de Expo. | Se reemplazó por la nueva especificación del SDK 57: `mediaTypes: ['images']`. |
| **`mapa.tsx`** | Intento de `require('react-native-maps')` dinámico y falta de dependencias en `useEffect`. | Advertencias del linter `@typescript-eslint/no-require-imports` y `react-hooks/exhaustive-deps`. | Se convirtió a importaciones ES6 con fallback seguro para web, tipado explícito de colecciones `(GeoPhoto & { coords: Coords })[]` y array de dependencias exhaustivo. |
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