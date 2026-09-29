import { useGeoPhotos } from '@/context/GeoPhotosContext';
import { useGeoLocation } from '@/hooks/useGeoLocation';
import type { Coords, GeoPhoto } from '@/types/geo';
import { useMemo, useState } from 'react';
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

export default function MapaWebScreen() {
  const insets = useSafeAreaInsets();
  const { photos, removePhoto } = useGeoPhotos();
  const geo = useGeoLocation();

  const [showUnlocatedSheet, setShowUnlocatedSheet] = useState(false);

  const locatedPhotos = useMemo<(GeoPhoto & { coords: Coords })[]>(
    () => photos.filter((p: GeoPhoto): p is GeoPhoto & { coords: Coords } => p.coords !== null),
    [photos]
  );

  const unlocatedPhotos = useMemo<GeoPhoto[]>(
    () => photos.filter((p: GeoPhoto) => p.coords === null),
    [photos]
  );

  const handleDeletePhoto = (photo: GeoPhoto) => {
    Alert.alert(
      '¿Eliminar foto?',
      'Esta foto se eliminará permanentemente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => removePhoto(photo.id),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.topHeader, { top: insets.top + 8 }]}>
        <View style={styles.topHeaderLeft}>
          <Text style={styles.topHeaderTitle}>GeoCam Map (OpenStreetMap Web)</Text>
          <Text style={styles.topHeaderSubtitle}>
            {locatedPhotos.length} en mapa · {unlocatedPhotos.length} sin coords
          </Text>
        </View>
      </View>

      <View style={styles.webFallbackContainer}>
        <Text style={styles.webFallbackIcon}>🗺️</Text>
        <Text style={styles.webFallbackTitle}>Visualización OpenStreetMap</Text>
        <Text style={styles.webFallbackSubtitle}>
          GeoCam utiliza los mapas Open Source de OpenStreetMap (`tile.openstreetmap.org`).
        </Text>

        <View style={styles.statsCard}>
          <Text style={styles.statsText}>
            Fotos con coordenadas registradas: <Text style={styles.statsBold}>{locatedPhotos.length}</Text>
          </Text>
          <Text style={styles.statsText}>
            Fotos sin ubicación: <Text style={styles.statsBold}>{unlocatedPhotos.length}</Text>
          </Text>
          {geo.coords && (
            <Text style={styles.statsText}>
              Tu GPS actual: <Text style={styles.statsBold}>{geo.coords.latitude.toFixed(4)}, {geo.coords.longitude.toFixed(4)}</Text>
            </Text>
          )}
        </View>

        {locatedPhotos.length > 0 && (
          <View style={styles.photosGridContainer}>
            <Text style={styles.gridTitle}>Fotos con coordenadas ({locatedPhotos.length})</Text>
            <FlatList
              data={locatedPhotos}
              keyExtractor={(item) => item.id}
              numColumns={3}
              renderItem={({ item }) => (
                <View style={styles.gridItem}>
                  <Image source={{ uri: item.uri }} style={styles.gridThumb} />
                  <Text style={styles.gridCoordsText} numberOfLines={1}>
                    {item.coords.latitude.toFixed(3)}, {item.coords.longitude.toFixed(3)}
                  </Text>
                </View>
              )}
            />
          </View>
        )}
      </View>

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
  webFallbackContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    paddingTop: 80,
  },
  webFallbackIcon: {
    fontSize: 48,
    marginBottom: 12,
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
    maxWidth: 400,
  },
  statsCard: {
    backgroundColor: '#18181b',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  statsText: {
    color: '#d4d4d8',
    fontSize: 14,
  },
  statsBold: {
    fontWeight: 'bold',
    color: '#10b981',
  },
  photosGridContainer: {
    marginTop: 20,
    width: '100%',
    maxWidth: 360,
  },
  gridTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  gridItem: {
    width: '31%',
    margin: '1%',
    alignItems: 'center',
  },
  gridThumb: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  gridCoordsText: {
    color: '#71717a',
    fontSize: 10,
    marginTop: 2,
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
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
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
