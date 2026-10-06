import { useGeoLocation } from '@/hooks/useGeoLocation';
import { usePhotos } from '@/hooks/usePhotos';
import type { Coords, GeoPhoto } from '@/types/geo';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

const DEFAULT_CENTER = {
  latitude: 4.6097,
  longitude: -74.0817,
};

function createOpenStreetMapHtml(initialLat: number, initialLng: number): string {
  const centerJson = JSON.stringify([initialLat, initialLng]);

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin=""/>
  <style>
    html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; background: #09090b; }
    .leaflet-container { background: #18181b; }
    .photo-marker-wrapper { position: relative; width: 44px; height: 44px; border-radius: 22px; border: 3px solid #38bdf8; background: #000; box-shadow: 0 4px 10px rgba(0,0,0,0.5); overflow: hidden; }
    .photo-marker-wrapper.gallery { border-color: #f59e0b; }
    .photo-marker-img { width: 100%; height: 100%; object-fit: cover; }
    .photo-marker-icon { position: absolute; bottom: 0; right: 0; background: #0284c7; color: #fff; font-size: 10px; width: 16px; height: 16px; border-radius: 8px; display: flex; align-items: center; justify-content: center; border: 1px solid #fff; }
    .photo-marker-wrapper.gallery .photo-marker-icon { background: #d97706; }
    .leaflet-control-attribution { font-size: 9px !important; background: rgba(24, 24, 27, 0.85) !important; color: #a1a1aa !important; }
    .leaflet-control-attribution a { color: #38bdf8 !important; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>
  <script>
    (function() {
      if (!window.L) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: 'No se pudo cargar la librería Leaflet.' }));
        }
        return;
      }

      var map = L.map('map', { zoomControl: false, attributionControl: true }).setView(${centerJson}, 13);
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Mapa OpenStreetMap (Open Source)
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(map);

      var markersGroup = L.layerGroup().addTo(map);

      function escapeHtml(str) {
        return String(str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      }

      window.GeoCamMap = {
        setPhotos: function(photos) {
          markersGroup.clearLayers();
          photos.forEach(function(photo) {
            var isGallery = photo.source === 'gallery';
            var wrapperClass = 'photo-marker-wrapper' + (isGallery ? ' gallery' : '');
            var iconSymbol = isGallery ? '🖼️' : '📷';
            
            var html = '<div class="' + wrapperClass + '">' +
              '<img class="photo-marker-img" src="' + escapeHtml(photo.uri) + '" onerror="this.style.display=\\'none\\'" />' +
              '<div class="photo-marker-icon">' + iconSymbol + '</div>' +
              '</div>';

            var customIcon = L.divIcon({
              className: '',
              html: html,
              iconSize: [44, 44],
              iconAnchor: [22, 22]
            });

            var marker = L.marker([photo.latitude, photo.longitude], { icon: customIcon });
            marker.on('click', function() {
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'photo', photoId: photo.id }));
              }
            });
            markersGroup.addLayer(marker);
          });
        },
        center: function(lat, lng, zoom) {
          map.setView([lat, lng], zoom || 15, { animate: true });
        }
      };

      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
      }
    })();
  </script>
</body>
</html>`;
}

export default function MapaScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { photos, photosWithLocation, removePhoto } = usePhotos();
  const geo = useGeoLocation();
  const webViewRef = useRef<WebView>(null);

  const [selectedPhoto, setSelectedPhoto] = useState<GeoPhoto | null>(null);
  const [showUnlocatedSheet, setShowUnlocatedSheet] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // Fotos con coordenadas obtenidas vía withLocationQuery (isNotNull(latitude))
  const locatedPhotos = useMemo<(GeoPhoto & { coords: Coords })[]>(
    () => photosWithLocation.filter((p): p is GeoPhoto & { coords: Coords } => p.coords !== null),
    [photosWithLocation]
  );

  // Fotos sin coordenadas
  const unlocatedPhotos = useMemo<GeoPhoto[]>(
    () => photos.filter((p) => p.coords === null),
    [photos]
  );

  // Centro inicial del mapa
  const initialCenter = useMemo(() => {
    if (geo.permission === 'granted' && geo.coords) {
      return {
        latitude: geo.coords.latitude,
        longitude: geo.coords.longitude,
      };
    }

    const lastWithCoords = locatedPhotos.length > 0 ? locatedPhotos[0] : null;
    if (lastWithCoords && lastWithCoords.coords) {
      return {
        latitude: lastWithCoords.coords.latitude,
        longitude: lastWithCoords.coords.longitude,
      };
    }

    return DEFAULT_CENTER;
  }, [geo.permission, geo.coords, locatedPhotos]);

  const mapHtml = useMemo(
    () => createOpenStreetMapHtml(initialCenter.latitude, initialCenter.longitude),
    [initialCenter.latitude, initialCenter.longitude]
  );

  // Enviar marcadores al mapa cuando cambien las fotos o cuando el mapa esté listo
  useEffect(() => {
    if (!mapReady) return;
    const markerPhotos = locatedPhotos.map((photo) => ({
      id: photo.id,
      uri: photo.uri,
      source: photo.source,
      latitude: photo.coords.latitude,
      longitude: photo.coords.longitude,
    }));
    const serialized = JSON.stringify(markerPhotos).replace(/</g, '\\u003c');
    webViewRef.current?.injectJavaScript(
      `window.GeoCamMap && window.GeoCamMap.setPhotos(${serialized}); true;`
    );
  }, [locatedPhotos, mapReady]);

  // Centrar el mapa al obtener ubicación o nueva foto
  useEffect(() => {
    if (!mapReady) return;
    if (geo.permission === 'granted' && geo.coords) {
      webViewRef.current?.injectJavaScript(
        `window.GeoCamMap && window.GeoCamMap.center(${geo.coords.latitude}, ${geo.coords.longitude}, 15); true;`
      );
    } else if (locatedPhotos.length > 0) {
      const lastWithCoords = locatedPhotos[0];
      webViewRef.current?.injectJavaScript(
        `window.GeoCamMap && window.GeoCamMap.center(${lastWithCoords.coords.latitude}, ${lastWithCoords.coords.longitude}, 15); true;`
      );
    }
  }, [geo.coords, geo.permission, mapReady, locatedPhotos]);

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (typeof data !== 'object' || data === null) return;

      if (data.type === 'ready') {
        setMapReady(true);
        setMapError(null);
      } else if (data.type === 'error' && typeof data.message === 'string') {
        setMapError(data.message);
      } else if (data.type === 'photo' && typeof data.photoId === 'string') {
        const found = locatedPhotos.find((p) => p.id === data.photoId);
        if (found) setSelectedPhoto(found);
      }
    } catch {
      // Ignorar mensajes malformados
    }
  };

  const handleCenterOnUser = async () => {
    if (geo.permission === 'blocked') {
      Alert.alert(
        'Ubicación bloqueada',
        'Activa el permiso de ubicación desde Ajustes para centrar el mapa en tu posición.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Abrir Ajustes', onPress: geo.openSettings },
        ]
      );
      return;
    }

    const permissionGranted =
      geo.permission === 'granted' || (await geo.requestPermission());
    if (!permissionGranted) return;

    const coords = geo.coords ?? (await geo.getCurrent());
    if (!coords) return;

    webViewRef.current?.injectJavaScript(
      `window.GeoCamMap && window.GeoCamMap.center(${coords.latitude}, ${coords.longitude}, 16); true;`
    );
  };

  const handleDeletePhoto = (photo: GeoPhoto) => {
    Alert.alert(
      '¿Eliminar foto?',
      'Esta foto se eliminará permanentemente de SQLite y del dispositivo.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await removePhoto(photo.id);
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
      {/* MAPA OPENSTREETMAP (LEAFLET + WEBVIEW) */}
      <WebView
        ref={webViewRef}
        style={styles.map}
        source={{ html: mapHtml }}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        allowFileAccess
        mixedContentMode="always"
        onMessage={handleMessage}
        onError={({ nativeEvent }) => setMapError(nativeEvent.description)}
      />

      {/* HEADER SUPERIOR CON CONTROLES Y RESUMEN */}
      <View style={[styles.topHeader, { top: insets.top + 8 }]}>
        <View style={styles.topHeaderLeft}>
          <Text style={styles.topHeaderTitle}>GeoCam Map (OpenStreetMap)</Text>
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

      {(geo.error || mapError) && (
        <View style={[styles.mapError, { top: insets.top + 68 }]}>
          {geo.error && <Text style={styles.mapErrorText}>Ubicación: {geo.error}</Text>}
          {mapError && <Text style={styles.mapErrorText}>Mapa: {mapError}</Text>}
        </View>
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
          <Pressable onPress={() => router.push(`/foto/${selectedPhoto.id}` as any)}>
            <Image source={{ uri: selectedPhoto.uri }} style={styles.previewImage} />
          </Pressable>

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
                onPress={() => router.push(`/foto/${selectedPhoto.id}` as any)}
                style={styles.detailButton}
              >
                <Text style={styles.detailButtonText}>Ver detalle ➔</Text>
              </Pressable>
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
                    <Pressable onPress={() => {
                      setShowUnlocatedSheet(false);
                      router.push(`/foto/${item.id}` as any);
                    }}>
                      <Image source={{ uri: item.uri }} style={styles.unlocatedItemThumb} />
                    </Pressable>
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
  map: {
    ...StyleSheet.absoluteFill,
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
  mapError: {
    position: 'absolute',
    left: 16,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: 'rgba(127, 29, 29, 0.94)',
    zIndex: 12,
  },
  mapErrorText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
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
  badgeCameraBg: {
    backgroundColor: '#0284c7',
  },
  badgeGalleryBg: {
    backgroundColor: '#d97706',
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
    gap: 8,
    alignItems: 'center',
  },
  detailButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  detailButtonText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '600',
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
