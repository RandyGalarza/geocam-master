import { PermissionPrimer } from '@/components/PermissionPrimer';
import { useAlbums } from '@/hooks/useAlbums';
import { useCamera } from '@/hooks/useCamera';
import { useGeoLocation } from '@/hooks/useGeoLocation';
import { usePhotos } from '@/hooks/usePhotos';
import { useShake } from '@/hooks/useShake';
import { CameraView } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useIsFocused, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function GeoCamScreen() {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const router = useRouter();

  const {
    cameraRef,
    permissionState,
    requestPermission,
    openSettings,
    facing,
    toggleFacing,
    onCameraReady,
    onCameraUnavailable,
    onMountError,
    takePhoto,
    isReady,
    isCapturing,
    error: cameraError,
  } = useCamera();

  const geo = useGeoLocation({ watch: true, enabled: isFocused });

  // Estado de búsqueda y filtros para C4 (useLiveQuery)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const [favoriteOnlyFilter, setFavoriteOnlyFilter] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  const { photos, addPhoto, clearAll } = usePhotos({
    search: searchQuery,
    albumId: selectedAlbumId,
    favoriteOnly: favoriteOnlyFilter,
  });

  const { albums } = useAlbums();
  const [isPickingImage, setIsPickingImage] = useState(false);

  const shake = useShake(
    () => {
      if (photos.length === 0) {
        Alert.alert('GeoCam', 'No hay fotos guardadas para borrar.');
        return;
      }

      Alert.alert(
        '¿Borrar todas las fotos?',
        `Se eliminarán permanentemente las fotos y sus archivos registrados en la base de datos. Esta acción no se puede deshacer.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Borrar todas',
            style: 'destructive',
            onPress: () => {
              clearAll();
              Alert.alert('Fotos eliminadas', 'Se han borrado todas las fotos de SQLite y del almacenamiento.');
            },
          },
        ]
      );
    },
    { enabled: isFocused }
  );

  useEffect(() => {
    if (!isFocused || permissionState !== 'granted') onCameraUnavailable();
  }, [isFocused, onCameraUnavailable, permissionState]);

  // Última foto del conjunto filtrado
  const lastPhoto = photos.length > 0 ? photos[0] : null;
  const visibleErrors: string[] = [];
  if (geo.error) visibleErrors.push(`GPS: ${geo.error}`);
  if (cameraError) visibleErrors.push(`Cámara: ${cameraError}`);
  if (shake.error) visibleErrors.push(`Acelerómetro: ${shake.error}`);

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
        error={cameraError}
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

    const coords =
      geo.permission === 'granted' ? geo.coords ?? (await geo.getCurrent()) : null;

    await addPhoto({
      uri: photo.uri,
      coords,
      source: 'camera',
      albumId: selectedAlbumId,
    });
  };

  // Importar imagen desde la galería
  const handlePickFromGallery = async () => {
    if (isPickingImage) return;
    setIsPickingImage(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const coords =
          geo.permission === 'granted' ? geo.coords ?? (await geo.getCurrent()) : null;

        await addPhoto({
          uri: asset.uri,
          coords,
          source: 'gallery',
          albumId: selectedAlbumId,
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
      {/* CameraView */}
      {isFocused && (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing={facing}
          onCameraReady={onCameraReady}
          onMountError={onMountError}
        />
      )}

      {/* Banner superior de ubicación */}
      {geo.permission !== 'granted' && geo.permission !== 'checking' && (
        <Pressable
          onPress={geo.permission === 'blocked' ? geo.openSettings : geo.requestPermission}
          style={[styles.locationBanner, { top: insets.top + 10 }]}
        >
          <Text style={styles.locationBannerIcon}>
            {geo.permission === 'blocked' ? '⚙️' : '📍'}
          </Text>
          <View style={styles.locationBannerTextContainer}>
            <Text style={styles.locationBannerTitle}>
              {geo.permission === 'blocked'
                ? 'Ubicación bloqueada'
                : geo.permission === 'denied'
                  ? 'Permiso de ubicación denegado'
                  : 'Ubicación desactivada'}
            </Text>
            <Text style={styles.locationBannerSubtitle}>
              {geo.permission === 'blocked'
                ? 'La cámara funciona sin GPS. Toca para abrir Ajustes.'
                : 'Toca para conceder permiso y etiquetar tus fotos.'}
            </Text>
          </View>
        </Pressable>
      )}

      {/* Coordenadas en vivo y botón de Búsqueda / Filtros (C4) */}
      <View style={[styles.topControlsRow, { top: insets.top + 12 }]}>
        {geo.permission === 'granted' && geo.coords ? (
          <View style={styles.liveCoordsBox}>
            <View style={styles.liveCoordsHeader}>
              <View style={styles.liveDot} />
              <Text style={styles.liveCoordsTitle}>GPS EN VIVO</Text>
            </View>
            <Text style={styles.liveCoordsText}>
              {geo.coords.latitude.toFixed(5)}, {geo.coords.longitude.toFixed(5)}
            </Text>
          </View>
        ) : (
          <View />
        )}

        {/* BOTÓN FILTROS Y BÚSQUEDA (C4) */}
        <Pressable
          onPress={() => setShowFilterPanel(true)}
          style={[
            styles.filterTriggerBtn,
            (searchQuery.length > 0 || selectedAlbumId !== null || favoriteOnlyFilter) &&
              styles.filterTriggerBtnActive,
          ]}
        >
          <Text style={styles.filterTriggerBtnText}>
            🔍 Filtros ({photos.length})
          </Text>
        </Pressable>
      </View>

      {visibleErrors.length > 0 && (
        <View style={[styles.errorToast, { top: insets.top + 70 }]}>
          {visibleErrors.map((error, index) => (
            <Text key={`${index}-${error}`} style={styles.errorToastText}>
              ⚠️ {error}
            </Text>
          ))}
        </View>
      )}

      {/* Controles inferiores */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 20) + 12 }]}>
        {/* Miniatura de la última foto con navegación a foto/[id] (C3) */}
        <View style={styles.thumbnailWrapper}>
          {lastPhoto ? (
            <Pressable
              onPress={() => router.push(`/foto/${lastPhoto.id}` as any)}
              style={styles.thumbnailContainer}
            >
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
            </Pressable>
          ) : (
            <View style={styles.thumbnailPlaceholder} />
          )}
        </View>

        {/* Botón de captura */}
        <Pressable
          onPress={handleCapture}
          disabled={!isReady || isCapturing || isPickingImage}
          style={({ pressed }) => [
            styles.shutterButton,
            pressed && styles.shutterButtonPressed,
            (!isReady || isCapturing) && styles.shutterButtonDisabled,
          ]}
        >
          {isCapturing || !isReady ? (
            <ActivityIndicator size="small" color="#000000" />
          ) : (
            <View style={styles.shutterInner} />
          )}
        </Pressable>

        {/* Botones laterales: Galería e Invertir Cámara */}
        <View style={styles.sideButtons}>
          <Pressable
            onPress={handlePickFromGallery}
            disabled={isPickingImage || isCapturing}
            style={({ pressed }) => [
              styles.iconButton,
              styles.galleryButton,
              pressed && styles.iconButtonPressed,
            ]}
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
          >
            <Text style={styles.switchButtonIcon}>↻</Text>
          </Pressable>
        </View>
      </View>

      {/* PANEL DE FILTROS Y BÚSQUEDA DE FOTOS (C4: useLiveQuery) */}
      <Modal
        visible={showFilterPanel}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFilterPanel(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Búsqueda y Filtros</Text>
              <Pressable onPress={() => setShowFilterPanel(false)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseText}>✕</Text>
              </Pressable>
            </View>

            {/* BUSCADOR POR NOTA (like) */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>🔎 Buscar en notas (like)</Text>
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Escribe palabras clave de la nota..."
                placeholderTextColor="#71717a"
              />
            </View>

            {/* FILTRO POR FAVORITAS */}
            <Pressable
              onPress={() => setFavoriteOnlyFilter(!favoriteOnlyFilter)}
              style={[
                styles.filterCheckbox,
                favoriteOnlyFilter && styles.filterCheckboxActive,
              ]}
            >
              <Text style={styles.filterCheckboxText}>
                {favoriteOnlyFilter ? '⭐ Solo fotos Favoritas (Activo)' : '☆ Ver todas (Mostrar no favoritas también)'}
              </Text>
            </Pressable>

            {/* FILTRO POR ÁLBUM */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>📁 Filtrar por Álbum</Text>
              <Pressable
                onPress={() => setSelectedAlbumId(null)}
                style={[
                  styles.albumFilterChip,
                  selectedAlbumId === null && styles.albumFilterChipActive,
                ]}
              >
                <Text style={styles.albumFilterChipText}>Todos los álbumes</Text>
              </Pressable>

              {albums.map((alb) => (
                <Pressable
                  key={alb.id}
                  onPress={() => setSelectedAlbumId(alb.id)}
                  style={[
                    styles.albumFilterChip,
                    selectedAlbumId === alb.id && styles.albumFilterChipActive,
                  ]}
                >
                  <Text style={styles.albumFilterChipText}>📁 {alb.name}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.resultCountText}>
              Fotos encontradas en vivo: {photos.length}
            </Text>

            <Pressable onPress={() => setShowFilterPanel(false)} style={styles.applyFiltersBtn}>
              <Text style={styles.applyFiltersBtnText}>Ver fotos ({photos.length})</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  topControlsRow: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  liveCoordsBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
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
  },
  liveCoordsText: {
    color: '#e4e4e7',
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: '600',
  },
  filterTriggerBtn: {
    backgroundColor: 'rgba(24, 24, 27, 0.88)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  filterTriggerBtnActive: {
    borderColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  filterTriggerBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  errorToast: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: 'rgba(127, 29, 29, 0.92)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    zIndex: 12,
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
    paddingTop: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    zIndex: 10,
  },
  thumbnailWrapper: {
    width: 54,
    height: 54,
  },
  thumbnailContainer: {
    position: 'relative',
  },
  thumbnailImage: {
    width: 54,
    height: 54,
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
  thumbnailPlaceholder: {
    width: 54,
    height: 54,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
  shutterButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#ffffff',
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterButtonPressed: {
    transform: [{ scale: 0.94 }],
  },
  shutterButtonDisabled: {
    opacity: 0.5,
  },
  shutterInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ffffff',
  },
  sideButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(39, 39, 42, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonPressed: {
    opacity: 0.7,
  },
  galleryButton: {},
  galleryButtonIcon: {
    fontSize: 20,
  },
  switchButton: {},
  switchButtonIcon: {
    color: '#ffffff',
    fontSize: 22,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#18181b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    color: '#a1a1aa',
    fontWeight: 'bold',
  },
  filterSection: {
    gap: 6,
  },
  filterSectionTitle: {
    color: '#a1a1aa',
    fontSize: 12,
    fontWeight: '600',
  },
  searchInput: {
    backgroundColor: '#27272a',
    color: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  filterCheckbox: {
    padding: 12,
    backgroundColor: '#27272a',
    borderRadius: 8,
  },
  filterCheckboxActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  filterCheckboxText: {
    color: '#f59e0b',
    fontWeight: '600',
    fontSize: 13,
  },
  albumFilterChip: {
    padding: 10,
    backgroundColor: '#27272a',
    borderRadius: 8,
    marginVertical: 2,
  },
  albumFilterChipActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  albumFilterChipText: {
    color: '#ffffff',
    fontSize: 13,
  },
  resultCountText: {
    color: '#10b981',
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  applyFiltersBtn: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyFiltersBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});