import { useGeoPhotos } from '@/context/GeoPhotosContext';
import { useGeoLocation } from '@/hooks/useGeoLocation';
import type { Coords, GeoPhoto } from '@/types/geo';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Dimensions,
    FlatList,
    Image,
    Linking,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Importar MapView solo en plataformas nativas
let MapView: any = null;
let Marker: any = null;
let Callout: any = null;
let UrlTile: any = null;

// Usar importación condicional para evitar errores en web
if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const maps = require('react-native-maps');
    MapView = maps.default;
    Marker = maps.Marker;
    Callout = maps.Callout;
    UrlTile = maps.UrlTile;
  } catch {
    // Maps no está disponible
  }
}

const DEFAULT_REGION = {
  latitude: 4.6097,
  longitude: -74.0817,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export default function MapaScreen() {
  const insets = useSafeAreaInsets();
  const { photos, removePhoto } = useGeoPhotos();
  const geo = useGeoLocation();
  const mapRef = useRef<any>(null);

  const [selectedPhoto, setSelectedPhoto] = useState<GeoPhoto | null>(null);
  const [showUnlocatedSheet, setShowUnlocatedSheet] = useState(false);

  // Separar fotos con y sin coordenadas
  const locatedPhotos = useMemo<(GeoPhoto & { coords: Coords })[]>(
    () => photos.filter((p: GeoPhoto): p is GeoPhoto & { coords: Coords } => p.coords !== null),
    [photos]
  );

  const unlocatedPhotos = useMemo<GeoPhoto[]>(
    () => photos.filter((p: GeoPhoto) => p.coords === null),
    [photos]
  );

  // Determinar región inicial:
  // "El mapa se centra en tu ubicación o, sin permiso, en la última foto."
  const initialRegion = useMemo(() => {
    if (geo.permission === 'granted' && geo.coords) {
      return {
        latitude: geo.coords.latitude,
        longitude: geo.coords.longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      };
    }

    const lastWithCoords = photos.find((p: GeoPhoto) => p.coords !== null);
    if (lastWithCoords && lastWithCoords.coords) {
      return {
        latitude: lastWithCoords.coords.latitude,
        longitude: lastWithCoords.coords.longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      };
    }

    return DEFAULT_REGION;
  }, [geo.permission, geo.coords, photos]);

  // Si llega la ubicación del usuario o se agrega la primera foto con coords, centrar
  useEffect(() => {
    if (!mapRef.current || !MapView) return;

    if (geo.permission === 'granted' && geo.coords) {
      mapRef.current.animateToRegion(
        {
          latitude: geo.coords.latitude,
          longitude: geo.coords.longitude,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        },
        600
      );
    } else {
      const lastWithCoords = photos.find((p: GeoPhoto) => p.coords !== null);
      if (lastWithCoords && lastWithCoords.coords) {
        mapRef.current.animateToRegion(
          {
            latitude: lastWithCoords.coords.latitude,
            longitude: lastWithCoords.coords.longitude,
            latitudeDelta: 0.015,
            longitudeDelta: 0.015,
          },
          600
        );
      }
    }
  }, [geo.coords, geo.permission, photos]);

  const handleCenterOnUser = () => {
    if (!MapView) return;
    
    if (geo.permission !== 'granted' || !geo.coords) {
      Alert.alert(
        'Ubicación no disponible',
        geo.permission === 'blocked'
          ? 'El permiso de ubicación está bloqueado. Ábrelo en Ajustes.'
          : 'Concede el permiso de ubicación para centrarte en tu posición.'
      );
      return;
    }

    mapRef.current?.animateToRegion(
      {
        latitude: geo.coords.latitude,
        longitude: geo.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      600
    );
  };

  const handleDeletePhoto = (photo: GeoPhoto) => {
    Alert.alert(
      '¿Eliminar foto?',
      'Esta foto se eliminará permanentemente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            removePhoto(photo.id);
            if (selectedPhoto?.id === photo.id) {
              setSelectedPhoto(null);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* MAPA O FALLBACK WEB */}
      {Platform.OS === 'web' || !MapView ? (
        <View style={styles.webFallbackContainer}>
          <Text style={styles.webFallbackTitle}>Visualización del Mapa</Text>
          <Text style={styles.webFallbackSubtitle}>
            `react-native-maps` requiere un entorno nativo (Android/iOS).
          </Text>
          <View style={styles.statsCard}>
            <Text style={styles.statsText}>
              Fotos con coordenadas: <Text style={styles.statsBold}>{locatedPhotos.length}</Text>
            </Text>
            <Text style={styles.statsText}>
              Fotos sin ubicación: <Text style={styles.statsBold}>{unlocatedPhotos.length}</Text>
            </Text>
          </View>
        </View>
      ) : (
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={initialRegion}
          mapType={Platform.OS === 'android' ? 'none' : 'standard'}
          showsUserLocation={geo.permission === 'granted'}
          showsMyLocationButton={false}
        >
          <UrlTile
            urlTemplate="https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
            maximumZ={19}
            tileSize={256}
            shouldReplaceMapContent={Platform.OS === 'ios'}
          />
          {locatedPhotos.map((photo: GeoPhoto & { coords: Coords }) => (
            <Marker
              key={photo.id}
              coordinate={{
                latitude: photo.coords.latitude,
                longitude: photo.coords.longitude,
              }}
              onPress={() => setSelectedPhoto(photo)}
            >
              <View
                style={[
                  styles.markerContainer,
                  photo.source === 'gallery'
                    ? styles.markerGalleryBorder
                    : styles.markerCameraBorder,
                ]}
              >
                <Image source={{ uri: photo.uri }} style={styles.markerThumb} />
                <View
                  style={[
                    styles.markerBadge,
                    photo.source === 'gallery'
                      ? styles.badgeGalleryBg
                      : styles.badgeCameraBg,
                  ]}
                >
                  <Text style={styles.markerBadgeIcon}>
                    {photo.source === 'gallery' ? '🖼️' : '📷'}
                  </Text>
                </View>
              </View>

              <Callout tooltip onPress={() => setSelectedPhoto(photo)}>
                <View style={styles.calloutBubble}>
                  <Text style={styles.calloutTitle}>
                    {photo.source === 'gallery' ? 'Foto de Galería' : 'Foto de Cámara'}
                  </Text>
                  <Text style={styles.calloutSubtitle}>
                    {photo.coords.latitude.toFixed(4)}, {photo.coords.longitude.toFixed(4)}
                  </Text>
                </View>
              </Callout>
            </Marker>
          ))}
        </MapView>
      )}

      {/* HEADER SUPERIOR CON BOTÓN DE CENTRAR Y RESUMEN */}
      <View style={[styles.topHeader, { top: insets.top + 8 }]}>
        <View style={styles.topHeaderLeft}>
          <Text style={styles.topHeaderTitle}>GeoCam Map</Text>
          <Text style={styles.topHeaderSubtitle}>
            {locatedPhotos.length} en mapa · {unlocatedPhotos.length} sin coords
          </Text>
        </View>

        <Pressable
          onPress={handleCenterOnUser}
          style={({ pressed }) => [styles.headerIconButton, pressed && styles.pressed]}
          accessibilityLabel="Centrar en mi ubicación"
          accessibilityRole="button"
        >
          <Text style={styles.headerIconText}>🎯</Text>
        </Pressable>
      </View>

      {Platform.OS !== 'web' && (
        <Text
          style={[styles.mapAttribution, { bottom: Math.max(insets.bottom, 16) + 8 }]}
          accessibilityRole="link"
          onPress={() => Linking.openURL('https://carto.com/attributions')}
        >
          © OpenStreetMap contributors · © CARTO
        </Text>
      )}

      {/* BOTÓN FLOTANTE: FOTOS SIN UBICACIÓN */}
      <Pressable
        onPress={() => setShowUnlocatedSheet(true)}
        style={({ pressed }) => [
          styles.unlocatedFloatingButton,
          { bottom: Math.max(insets.bottom, 16) + 16 },
          pressed && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Ver fotos sin ubicación"
      >
        <Text style={styles.unlocatedButtonIcon}>📁</Text>
        <Text style={styles.unlocatedButtonText}>
          Sin ubicación ({unlocatedPhotos.length})
        </Text>
      </Pressable>

      {/* TARJETA PREVIEW DE FOTO SELECCIONADA EN EL MAPA */}
      {selectedPhoto && (
        <View style={[styles.previewCard, { bottom: Math.max(insets.bottom, 16) + 72 }]}>
          <Image source={{ uri: selectedPhoto.uri }} style={styles.previewImage} />
          <View style={styles.previewDetails}>
            <View style={styles.previewHeaderRow}>
              <View
                style={[
                  styles.previewSourceBadge,
                  selectedPhoto.source === 'gallery'
                    ? styles.badgeGalleryBg
                    : styles.badgeCameraBg,
                ]}
              >
                <Text style={styles.previewSourceBadgeText}>
                  {selectedPhoto.source === 'gallery' ? '🖼️ Galería' : '📷 Cámara'}
                </Text>
              </View>
              <Text style={styles.previewDate}>
                {new Date(selectedPhoto.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>

            {selectedPhoto.coords ? (
              <Text style={styles.previewCoords}>
                📍 {selectedPhoto.coords.latitude.toFixed(5)},{' '}
                {selectedPhoto.coords.longitude.toFixed(5)}
              </Text>
            ) : (
              <Text style={styles.previewNoCoords}>⚠️ Sin ubicación</Text>
            )}

            <View style={styles.previewActions}>
              <Pressable
                onPress={() => handleDeletePhoto(selectedPhoto)}
                style={styles.deleteButton}
              >
                <Text style={styles.deleteButtonText}>Eliminar</Text>
              </Pressable>
              <Pressable
                onPress={() => setSelectedPhoto(null)}
                style={styles.closeCardButton}
              >
                <Text style={styles.closeCardButtonText}>Cerrar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* MODAL / LISTA "FOTOS SIN UBICACIÓN" */}
      <Modal
        visible={showUnlocatedSheet}
        animationType="slide"
        transparent
        onRequestClose={() => setShowUnlocatedSheet(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Fotos Sin Ubicación</Text>
                <Text style={styles.modalSubtitle}>
                  Fotos capturadas o importadas cuando la ubicación no estaba activa
                </Text>
              </View>
              <Pressable
                onPress={() => setShowUnlocatedSheet(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </Pressable>
            </View>

            {unlocatedPhotos.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>🎉</Text>
                <Text style={styles.emptyTitle}>No hay fotos sin ubicación</Text>
                <Text style={styles.emptyDescription}>
                  Todas las fotos actuales cuentan con coordenadas GPS registradas.
                </Text>
              </View>
            ) : (
              <FlatList
                data={unlocatedPhotos}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                  <View style={styles.unlocatedItem}>
                    <Image source={{ uri: item.uri }} style={styles.unlocatedItemThumb} />
                    <View style={styles.unlocatedItemInfo}>
                      <View style={styles.itemBadgeRow}>
                        <View
                          style={[
                            styles.previewSourceBadge,
                            item.source === 'gallery'
                              ? styles.badgeGalleryBg
                              : styles.badgeCameraBg,
                          ]}
                        >
                          <Text style={styles.previewSourceBadgeText}>
                            {item.source === 'gallery' ? '🖼️ Galería' : '📷 Cámara'}
                          </Text>
                        </View>
                        <Text style={styles.itemDate}>
                          {new Date(item.createdAt).toLocaleString()}
                        </Text>
                      </View>
                      <Text style={styles.itemNotice}>Ubicación no registrada</Text>
                    </View>
                    <Pressable
                      onPress={() => handleDeletePhoto(item)}
                      style={styles.itemDeleteButton}
                    >
                      <Text style={styles.itemDeleteText}>🗑️</Text>
                    </Pressable>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  webFallbackContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#18181b',
  },
  webFallbackTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  webFallbackSubtitle: {
    fontSize: 14,
    color: '#a1a1aa',
    textAlign: 'center',
    marginBottom: 20,
  },
  statsCard: {
    backgroundColor: '#27272a',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    width: '100%',
    maxWidth: 320,
  },
  statsText: {
    color: '#d4d4d8',
    fontSize: 14,
  },
  statsBold: {
    fontWeight: 'bold',
    color: '#10b981',
  },
  topHeader: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(24, 24, 27, 0.92)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 10,
  },
  topHeaderLeft: {
    flex: 1,
  },
  topHeaderTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  topHeaderSubtitle: {
    color: '#a1a1aa',
    fontSize: 12,
    marginTop: 2,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconText: {
    fontSize: 18,
  },
  mapAttribution: {
    position: 'absolute',
    left: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    color: '#334155',
    fontSize: 10,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 3,
    overflow: 'hidden',
    zIndex: 8,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  markerContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 5,
  },
  markerCameraBorder: {
    borderWidth: 3,
    borderColor: '#38bdf8',
  },
  markerGalleryBorder: {
    borderWidth: 3,
    borderColor: '#f59e0b',
  },
  markerThumb: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  markerBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  badgeCameraBg: {
    backgroundColor: '#0284c7',
  },
  badgeGalleryBg: {
    backgroundColor: '#d97706',
  },
  markerBadgeIcon: {
    fontSize: 9,
  },
  calloutBubble: {
    backgroundColor: '#18181b',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  calloutTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  calloutSubtitle: {
    color: '#a1a1aa',
    fontSize: 10,
    fontFamily: 'monospace',
  },
  unlocatedFloatingButton: {
    position: 'absolute',
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: '#3f3f46',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 5,
    gap: 8,
    zIndex: 10,
  },
  unlocatedButtonIcon: {
    fontSize: 16,
  },
  unlocatedButtonText: {
    color: '#f4f4f5',
    fontWeight: '600',
    fontSize: 13,
  },
  previewCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: '#18181b',
    borderRadius: 16,
    flexDirection: 'row',
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 15,
  },
  previewImage: {
    width: 76,
    height: 76,
    borderRadius: 10,
  },
  previewDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  previewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewSourceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  previewSourceBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  previewDate: {
    color: '#71717a',
    fontSize: 11,
  },
  previewCoords: {
    color: '#34d399',
    fontSize: 12,
    fontFamily: 'monospace',
    marginVertical: 4,
  },
  previewNoCoords: {
    color: '#f87171',
    fontSize: 12,
    fontWeight: '600',
    marginVertical: 4,
  },
  previewActions: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  deleteButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  deleteButtonText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
  },
  closeCardButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  closeCardButtonText: {
    color: '#a1a1aa',
    fontSize: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#18181b',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: Dimensions.get('window').height * 0.75,
    paddingHorizontal: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderColor: '#27272a',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  modalSubtitle: {
    color: '#a1a1aa',
    fontSize: 12,
    marginTop: 4,
    maxWidth: 260,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    color: '#a1a1aa',
    fontSize: 14,
    fontWeight: 'bold',
  },
  listContent: {
    paddingBottom: 20,
  },
  unlocatedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27272a',
    padding: 10,
    borderRadius: 12,
    marginBottom: 10,
    gap: 12,
  },
  unlocatedItemThumb: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  unlocatedItemInfo: {
    flex: 1,
  },
  itemBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  itemDate: {
    color: '#71717a',
    fontSize: 11,
  },
  itemNotice: {
    color: '#f87171',
    fontSize: 11,
  },
  itemDeleteButton: {
    padding: 8,
  },
  itemDeleteText: {
    fontSize: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 10,
  },
  emptyIcon: {
    fontSize: 36,
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyDescription: {
    color: '#71717a',
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 240,
  },
});
