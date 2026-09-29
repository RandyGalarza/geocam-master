import { PermissionPrimer } from '@/components/PermissionPrimer';
import { useGeoPhotos } from '@/context/GeoPhotosContext';
import { useCamera } from '@/hooks/useCamera';
import { useGeoLocation } from '@/hooks/useGeoLocation';
import { CameraView } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function GeoCamScreen() {
  const insets = useSafeAreaInsets();
  const {
    cameraRef,
    permissionState,
    requestPermission,
    openSettings,
    facing,
    toggleFacing,
    onCameraReady,
    takePhoto,
    isCapturing,
    error: cameraError,
  } = useCamera();

  const geo = useGeoLocation({ watch: true });
  const { photos, addPhoto } = useGeoPhotos();
  const [isPickingImage, setIsPickingImage] = useState(false);

  // Última foto del estado global
  const lastPhoto = photos.length > 0 ? photos[0] : null;

  if (permissionState === 'checking') {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.checkingText}>Verificando permisos de cámara...</Text>
      </View>
    );
  }

  if (permissionState !== 'granted') {
    return (
      <PermissionPrimer
        title="GeoCam necesita tu cámara"
        description="Usamos la cámara exclusivamente para capturar fotos geolocalizadas que tú decidas guardar."
        state={permissionState}
        onRequest={requestPermission}
        onOpenSettings={openSettings}
      />
    );
  }

  // Capturar foto con la cámara
  const handleCapture = async () => {
    if (isCapturing) return;
    const photo = await takePhoto();
    if (!photo) return;

    // Degradación elegante: si no hay permiso de ubicación, coords queda en null
    const coords =
      geo.permission === 'granted'
        ? geo.coords ?? (await geo.getCurrent())
        : null;

    addPhoto({
      uri: photo.uri,
      coords,
      source: 'camera',
    });
  };

  // Importar imagen desde la galería (R2)
  const handlePickFromGallery = async () => {
    if (isPickingImage) return;
    setIsPickingImage(true);
    try {
      // mediaTypes: ['images'] conforme al SDK 57 de Expo
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];

        // Obtener ubicación actual si está concedida, o null si fue negada
        const coords =
          geo.permission === 'granted'
            ? geo.coords ?? (await geo.getCurrent())
            : null;

        addPhoto({
          uri: asset.uri,
          coords,
          source: 'gallery',
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No se pudo seleccionar la imagen';
      Alert.alert('Error de Galería', msg);
    } finally {
      setIsPickingImage(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* CameraView sin hijos: los controles van como hermanos absolutos */}
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        onCameraReady={onCameraReady}
      />

      {/* Banner superior de ubicación: pedir en contexto sin bloquear la cámara */}
      {geo.permission !== 'granted' && geo.permission !== 'checking' && (
        <Pressable
          onPress={geo.permission === 'blocked' ? geo.openSettings : geo.requestPermission}
          style={[styles.locationBanner, { top: insets.top + 10 }]}
          accessibilityRole="button"
          accessibilityLabel="Activar ubicación"
        >
          <Text style={styles.locationBannerIcon}>
            {geo.permission === 'blocked' ? '⚙️' : '📍'}
          </Text>
          <View style={styles.locationBannerTextContainer}>
            <Text style={styles.locationBannerTitle}>
              {geo.permission === 'blocked'
                ? 'Ubicación bloqueada'
                : 'Ubicación desactivada'}
            </Text>
            <Text style={styles.locationBannerSubtitle}>
              {geo.permission === 'blocked'
                ? 'Toca para abrir Ajustes y etiquetar tus fotos'
                : 'Toca para conceder permiso y etiquetar fotos'}
            </Text>
          </View>
        </Pressable>
      )}

      {/* Coordenadas en vivo si están disponibles */}
      {geo.permission === 'granted' && geo.coords && (
        <View style={[styles.liveCoordsBox, { top: insets.top + 12 }]}>
          <View style={styles.liveCoordsHeader}>
            <View style={styles.liveDot} />
            <Text style={styles.liveCoordsTitle}>GPS EN VIVO</Text>
          </View>
          <Text style={styles.liveCoordsText}>
            {geo.coords.latitude.toFixed(5)}, {geo.coords.longitude.toFixed(5)}
          </Text>
          <Text style={styles.liveCoordsAccuracy}>
            ±{Math.round(geo.coords.accuracy ?? 0)} m
          </Text>
        </View>
      )}

      {/* Indicador de error de cámara si ocurre */}
      {cameraError && (
        <View style={[styles.errorToast, { top: insets.top + 70 }]}>
          <Text style={styles.errorToastText}>⚠️ {cameraError}</Text>
        </View>
      )}

      {/* Controles inferiores (hermanos con posición absoluta) */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 20) + 12 }]}>
        {/* Miniatura de la última foto tomada o importada */}
        <View style={styles.thumbnailWrapper}>
          {lastPhoto ? (
            <View style={styles.thumbnailContainer}>
              <Image
                source={{ uri: lastPhoto.uri }}
                style={[
                  styles.thumbnailImage,
                  lastPhoto.source === 'gallery'
                    ? styles.galleryThumbnailBorder
                    : styles.cameraThumbnailBorder,
                ]}
              />
              <View
                style={[
                  styles.sourceBadge,
                  lastPhoto.source === 'gallery'
                    ? styles.galleryBadgeBg
                    : styles.cameraBadgeBg,
                ]}
              >
                <Text style={styles.sourceBadgeText}>
                  {lastPhoto.source === 'gallery' ? '🖼️' : '📷'}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.thumbnailPlaceholder} />
          )}
        </View>

        {/* Botón de captura */}
        <Pressable
          onPress={handleCapture}
          disabled={isCapturing || isPickingImage}
          style={({ pressed }) => [
            styles.shutterButton,
            pressed && styles.shutterButtonPressed,
            isCapturing && styles.shutterButtonDisabled,
          ]}
          accessibilityLabel="Tomar foto"
          accessibilityRole="button"
        >
          {isCapturing ? (
            <ActivityIndicator size="small" color="#000000" />
          ) : (
            <View style={styles.shutterInner} />
          )}
        </Pressable>

        {/* Botones laterales: Galería (R2) y Toggle Facing */}
        <View style={styles.sideButtons}>
          <Pressable
            onPress={handlePickFromGallery}
            disabled={isPickingImage || isCapturing}
            style={({ pressed }) => [
              styles.iconButton,
              styles.galleryButton,
              pressed && styles.iconButtonPressed,
            ]}
            accessibilityLabel="Importar foto desde la galería"
            accessibilityRole="button"
          >
            {isPickingImage ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.galleryButtonIcon}>🖼️</Text>
            )}
          </Pressable>

          <Pressable
            onPress={toggleFacing}
            style={({ pressed }) => [
              styles.iconButton,
              styles.switchButton,
              pressed && styles.iconButtonPressed,
            ]}
            accessibilityLabel="Cambiar de cámara frontal a trasera"
            accessibilityRole="button"
          >
            <Text style={styles.switchButtonIcon}>↻</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  checkingText: {
    color: '#a1a1aa',
    fontSize: 14,
  },
  locationBanner: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.95)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
    zIndex: 10,
  },
  locationBannerIcon: {
    fontSize: 22,
    marginRight: 10,
  },
  locationBannerTextContainer: {
    flex: 1,
  },
  locationBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1c1917',
  },
  locationBannerSubtitle: {
    fontSize: 11,
    color: '#44403c',
    marginTop: 1,
  },
  liveCoordsBox: {
    position: 'absolute',
    left: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    zIndex: 10,
  },
  liveCoordsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    gap: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  liveCoordsTitle: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  liveCoordsText: {
    color: '#e4e4e7',
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: '600',
  },
  liveCoordsAccuracy: {
    color: '#a1a1aa',
    fontFamily: 'monospace',
    fontSize: 10,
  },
  errorToast: {
    position: 'absolute',
    left: 20,
    right: 20,
    backgroundColor: '#ef4444',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    zIndex: 20,
  },
  errorToastText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  thumbnailWrapper: {
    width: 60,
    alignItems: 'flex-start',
  },
  thumbnailContainer: {
    position: 'relative',
  },
  thumbnailImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
  },
  cameraThumbnailBorder: {
    borderWidth: 2,
    borderColor: '#38bdf8',
  },
  galleryThumbnailBorder: {
    borderWidth: 2,
    borderColor: '#f59e0b',
  },
  sourceBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  cameraBadgeBg: {
    backgroundColor: '#0284c7',
  },
  galleryBadgeBg: {
    backgroundColor: '#d97706',
  },
  sourceBadgeText: {
    fontSize: 10,
  },
  thumbnailPlaceholder: {
    width: 56,
    height: 56,
  },
  shutterButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  shutterButtonPressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.8,
  },
  shutterButtonDisabled: {
    opacity: 0.5,
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ffffff',
  },
  sideButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: 100,
    justifyContent: 'flex-end',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  iconButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.92 }],
  },
  galleryButton: {
    backgroundColor: 'rgba(245, 158, 11, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.6)',
  },
  galleryButtonIcon: {
    fontSize: 20,
  },
  switchButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  switchButtonIcon: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: 'bold',
  },
});