import { useGeoLocation } from '@/hooks/useGeoLocation';
import { usePhotos } from '@/hooks/usePhotos';
import type { Coords, GeoPhoto } from '@/types/geo';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';
import { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import 'leaflet/dist/leaflet.css';

const DEFAULT_CENTER: [number, number] = [4.6097, -74.0817];

export default function MapaWebScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { photos, photosWithLocation } = usePhotos();
  const geo = useGeoLocation();
  const [showUnlocatedSheet, setShowUnlocatedSheet] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);

  const locatedPhotos = useMemo<(GeoPhoto & { coords: Coords })[]>(
    () =>
      photosWithLocation.filter(
        (photo): photo is GeoPhoto & { coords: Coords } =>
          photo.coords != null &&
          Number.isFinite(photo.coords.latitude) &&
          Number.isFinite(photo.coords.longitude)
      ),
    [photosWithLocation]
  );
  const unlocatedPhotos = useMemo(
    () => photos.filter((photo) => !photo.coords),
    [photos]
  );

  const center = useMemo<[number, number]>(() => {
    if (mapCenter) return mapCenter;
    if (geo.coords && Number.isFinite(geo.coords.latitude) && Number.isFinite(geo.coords.longitude)) {
      return [geo.coords.latitude, geo.coords.longitude];
    }
    const latestPhoto = locatedPhotos[0];
    if (latestPhoto) return [latestPhoto.coords.latitude, latestPhoto.coords.longitude];
    return DEFAULT_CENTER;
  }, [geo.coords, locatedPhotos, mapCenter]);

  const centerOnUser = async () => {
    setLocationError('');
    const permissionGranted =
      geo.permission === 'granted' || (await geo.requestPermission());
    if (!permissionGranted) {
      setLocationError('Permite el acceso a tu ubicación para centrar el mapa.');
      return;
    }
    const coords = geo.coords ?? (await geo.getCurrent());
    if (!coords) {
      setLocationError(geo.error ?? 'No se pudo obtener tu ubicación actual.');
      return;
    }
    setMapCenter([coords.latitude, coords.longitude]);
  };

  return (
    <View style={styles.container}>
      <MapContainer center={center} zoom={13} style={styles.map} scrollWheelZoom>
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <MapCenterSync center={center} />
        {locatedPhotos.map((photo) => (
          <CircleMarker
            key={photo.id}
            center={[photo.coords.latitude, photo.coords.longitude]}
            radius={10}
            pathOptions={{
              color: photo.source === 'camera' ? '#a7f3d0' : '#fbbf24',
              fillColor: photo.source === 'camera' ? '#10b981' : '#f59e0b',
              fillOpacity: 0.9,
              weight: 3,
            }}
          >
            <Popup>
              <View style={styles.popup}>
                <Image source={{ uri: photo.uri }} style={styles.popupImage} resizeMode="cover" />
                <Text style={styles.popupTitle}>
                  {photo.note || (photo.source === 'camera' ? 'Foto' : 'Imagen')}
                </Text>
                <Text style={styles.popupCoords}>
                  {photo.coords.latitude.toFixed(5)}, {photo.coords.longitude.toFixed(5)}
                </Text>
                <Pressable
                  onPress={() => router.push(`/foto/${photo.id}` as never)}
                  style={styles.popupButton}
                >
                  <Text style={styles.popupButtonText}>Ver foto</Text>
                </Pressable>
              </View>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      <View style={[styles.header, { top: Math.max(insets.top, 12) + 10 }]}>
        <View style={styles.headerIcon}>
          <SymbolView
            name={{ ios: 'map.fill', android: 'map', web: 'map' }}
            size={20}
            tintColor="#06271b"
          />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Mapa de recuerdos</Text>
          <Text style={styles.subtitle}>
            {locatedPhotos.length} {locatedPhotos.length === 1 ? 'foto' : 'fotos'} con ubicación
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Centrar el mapa en mi ubicación"
          onPress={() => void centerOnUser()}
          style={({ pressed }) => [styles.locateButton, pressed && styles.pressed]}
        >
          <SymbolView
            name={{ ios: 'location.fill', android: 'my_location', web: 'my_location' }}
            size={19}
            tintColor="#a7f3d0"
          />
        </Pressable>
      </View>

      {locationError ? (
        <View style={[styles.locationError, { top: Math.max(insets.top, 12) + 82 }]}>
          <Text style={styles.locationErrorText}>{locationError}</Text>
        </View>
      ) : null}

      <View style={[styles.legend, width < 520 && styles.legendCompact]}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.cameraDot]} />
          <Text style={styles.legendText}>Cámara</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.galleryDot]} />
          <Text style={styles.legendText}>Importada</Text>
        </View>
      </View>

      <Pressable
        onPress={() => setShowUnlocatedSheet(true)}
        style={({ pressed }) => [
          styles.unlocatedButton,
          { bottom: Math.max(insets.bottom, 12) + 12 },
          pressed && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Ver ${unlocatedPhotos.length} fotos sin ubicación`}
      >
        <SymbolView
          name={{ ios: 'folder.fill', android: 'folder', web: 'folder' }}
          size={17}
          tintColor="#a7f3d0"
        />
        <Text style={styles.unlocatedButtonText}>
          Sin ubicación ({unlocatedPhotos.length})
        </Text>
      </Pressable>

      <Modal
        visible={showUnlocatedSheet}
        animationType="slide"
        transparent
        onRequestClose={() => setShowUnlocatedSheet(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalSheet,
              {
                paddingBottom: Math.max(insets.bottom, 20),
                maxHeight: '80%',
                width: width > 680 ? 600 : '100%',
                alignSelf: 'center',
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Fotos sin ubicación</Text>
                <Text style={styles.modalSubtitle}>
                  No se guardaron coordenadas GPS para estas fotos.
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
                onPress={() => setShowUnlocatedSheet(false)}
                style={styles.closeButton}
              >
                <SymbolView
                  name={{ ios: 'xmark', android: 'close', web: 'close' }}
                  size={17}
                  tintColor="#d8e4dc"
                />
              </Pressable>
            </View>
            <FlatList
              data={unlocatedPhotos}
              keyExtractor={(photo) => photo.id}
              contentContainerStyle={styles.photoList}
              ListEmptyComponent={
                <Text style={styles.emptyText}>Todas tus fotos tienen ubicación.</Text>
              }
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    setShowUnlocatedSheet(false);
                    router.push(`/foto/${item.id}` as never);
                  }}
                  style={({ pressed }) => [styles.photoRow, pressed && styles.pressed]}
                >
                  <Image source={{ uri: item.uri }} style={styles.photoThumb} />
                  <View style={styles.photoInfo}>
                    <Text numberOfLines={1} style={styles.photoTitle}>
                      {item.note || (item.source === 'camera' ? 'Foto' : 'Imagen')}
                    </Text>
                    <Text style={styles.photoDate}>
                      {Number.isFinite(item.createdAt)
                        ? new Date(item.createdAt).toLocaleString()
                        : 'Fecha no disponible'}
                    </Text>
                  </View>
                  <SymbolView
                    name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                    size={17}
                    tintColor="#829087"
                  />
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

function MapCenterSync({ center }: { center: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#dce7e2',
    overflow: 'hidden',
  },
  map: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#dce7e2',
  },
  header: {
    position: 'absolute',
    left: 16,
    right: 16,
    maxWidth: 620,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 11,
    borderRadius: 18,
    backgroundColor: 'rgba(11, 18, 16, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(167, 243, 208, 0.18)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
    zIndex: 500,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#6ee7b7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: 3,
  },
  title: {
    color: '#f4f7f5',
    fontSize: 15,
    fontWeight: '800',
  },
  subtitle: {
    color: '#aab8af',
    fontSize: 12,
  },
  locateButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#1a2921',
    borderWidth: 1,
    borderColor: '#345141',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationError: {
    position: 'absolute',
    left: 18,
    right: 18,
    alignSelf: 'center',
    maxWidth: 600,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#3a1d20',
    zIndex: 500,
  },
  locationErrorText: {
    color: '#fecdd3',
    fontSize: 12,
  },
  legend: {
    position: 'absolute',
    left: 16,
    bottom: 22,
    flexDirection: 'row',
    gap: 13,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 15,
    backgroundColor: 'rgba(11, 18, 16, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(167, 243, 208, 0.14)',
    zIndex: 400,
  },
  legendCompact: {
    bottom: 72,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  cameraDot: {
    backgroundColor: '#10b981',
  },
  galleryDot: {
    backgroundColor: '#f59e0b',
  },
  legendText: {
    color: '#d8e4dc',
    fontSize: 11,
    fontWeight: '600',
  },
  unlocatedButton: {
    position: 'absolute',
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: '#101a14',
    borderWidth: 1,
    borderColor: '#345141',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.24,
    shadowRadius: 9,
    elevation: 6,
    zIndex: 500,
  },
  unlocatedButtonText: {
    color: '#e2ece5',
    fontSize: 12,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.8,
  },
  popup: {
    width: 190,
    gap: 6,
    paddingBottom: 3,
  },
  popupImage: {
    width: '100%',
    height: 105,
    borderRadius: 8,
    backgroundColor: '#19231e',
  },
  popupTitle: {
    color: '#14221a',
    fontSize: 13,
    fontWeight: '700',
  },
  popupCoords: {
    color: '#536259',
    fontSize: 11,
  },
  popupButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#087f5b',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  popupButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.62)',
  },
  modalSheet: {
    backgroundColor: '#111a15',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    borderWidth: 1,
    borderColor: '#2a3b31',
    padding: 20,
    gap: 15,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalTitle: {
    color: '#f4f7f5',
    fontSize: 19,
    fontWeight: '800',
  },
  modalSubtitle: {
    color: '#9baa9f',
    fontSize: 12,
    marginTop: 4,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: '#1b2821',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoList: {
    gap: 9,
    paddingBottom: 8,
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 9,
    backgroundColor: '#17211b',
    borderWidth: 1,
    borderColor: '#26352e',
    borderRadius: 14,
  },
  photoThumb: {
    width: 54,
    height: 54,
    borderRadius: 10,
    backgroundColor: '#19231e',
  },
  photoInfo: {
    flex: 1,
    gap: 4,
  },
  photoTitle: {
    color: '#e2ece5',
    fontSize: 13,
    fontWeight: '700',
  },
  photoDate: {
    color: '#829087',
    fontSize: 11,
  },
  emptyText: {
    color: '#aab8af',
    paddingVertical: 28,
    textAlign: 'center',
  },
});
