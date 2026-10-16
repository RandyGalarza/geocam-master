import { usePhotos } from '@/hooks/usePhotos';
import type { GeoPhoto } from '@/types/geo';
import { router, useIsFocused } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function GalleryScreen() {
  const { photos, refresh } = usePhotos();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isFocused = useIsFocused();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState('');

  const galleryItems = useMemo(() => {
    const occurrences = new Map<string, number>();

    return photos.map((photo) => {
      const baseKey = JSON.stringify([photo.id, photo.createdAt, photo.uri]);
      const occurrence = occurrences.get(baseKey) ?? 0;
      occurrences.set(baseKey, occurrence + 1);
      return { photo, key: occurrence === 0 ? baseKey : `${baseKey}:${occurrence}` };
    });
  }, [photos]);
  const numColumns = width >= 1200 ? 5 : width >= 900 ? 4 : width >= 600 ? 3 : 2;

  useEffect(() => {
    if (!isFocused) return;
    let active = true;
    void refresh()
      .then(() => {
        if (active) setRefreshError('');
      })
      .catch((error: unknown) => {
        if (active) {
          setRefreshError(
            error instanceof Error ? error.message : 'No se pudieron actualizar las fotos.'
          );
        }
      });
    return () => {
      active = false;
    };
  }, [isFocused, refresh]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshError('');
    try {
      await refresh();
    } catch (error) {
      setRefreshError(
        error instanceof Error ? error.message : 'No se pudieron actualizar las fotos.'
      );
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View style={[styles.page, { paddingTop: Math.max(insets.top, 24) }]}>
      <Text style={styles.eyebrow}>TUS RECUERDOS</Text>
      <View style={styles.headingRow}>
        <Text style={styles.heading}>Galería</Text>
        <Text style={styles.count}>{photos.length}</Text>
      </View>
      <Text style={styles.subheading}>
        Todas tus fotos en un solo lugar. Las sincronizadas llevan una marca de nube.
      </Text>
      {refreshError ? <Text style={styles.refreshError}>{refreshError}</Text> : null}
      <FlatList
        key={numColumns}
        data={galleryItems}
        keyExtractor={(item) => item.key}
        numColumns={numColumns}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void handleRefresh()}
            tintColor="#6ee7b7"
            colors={['#6ee7b7']}
          />
        }
        renderItem={({ item }) => <GalleryPhoto photo={item.photo} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <SymbolView
              name={{ ios: 'photo.on.rectangle.angled', android: 'photo_library', web: 'photo_library' }}
              size={36}
              tintColor="#6ee7b7"
            />
            <Text style={styles.emptyTitle}>Aún no hay fotos</Text>
            <Text style={styles.emptyText}>
              Las fotos que tomes o importes aparecerán aquí.
            </Text>
          </View>
        }
      />
    </View>
  );
}

function GalleryPhoto({ photo }: { photo: GeoPhoto }) {
  const [imageFailed, setImageFailed] = useState(false);
  const createdAt = new Date(photo.createdAt);
  const formattedDate = Number.isNaN(createdAt.getTime())
    ? 'Fecha no disponible'
    : createdAt.toLocaleDateString();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Abrir foto${photo.note ? `: ${photo.note}` : ''}`}
      onPress={() => router.push(`/foto/${photo.id}` as never)}
      style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
    >
      {imageFailed ? (
        <View style={[styles.image, styles.imageMissing]}>
          <SymbolView
            name={{ ios: 'photo', android: 'image', web: 'image' }}
            size={30}
            tintColor="#829087"
          />
          <Text style={styles.imageMissingText}>Imagen no disponible</Text>
        </View>
      ) : (
        <Image
          source={{ uri: photo.uri }}
          style={styles.image}
          resizeMode="cover"
          onError={() => setImageFailed(true)}
        />
      )}
      {photo.isInCloud && (
        <View style={styles.cloudBadge}>
          <SymbolView
            name={{ ios: 'icloud.fill', android: 'cloud_done', web: 'cloud_done' }}
            size={14}
            tintColor="#06271b"
          />
          <Text style={styles.cloudBadgeText}>NUBE</Text>
        </View>
      )}
      <View style={styles.caption}>
        <Text numberOfLines={1} style={styles.captionTitle}>
          {photo.note || (photo.source === 'camera' ? 'Foto' : 'Imagen')}
        </Text>
        <Text style={styles.captionDate}>
          {formattedDate}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#0b1210',
    paddingHorizontal: 18,
  },
  eyebrow: {
    color: '#6ee7b7',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.8,
    marginBottom: 7,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heading: {
    color: '#f4f7f5',
    fontSize: 29,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  count: {
    color: '#a7f3d0',
    backgroundColor: 'rgba(52, 211, 153, 0.14)',
    overflow: 'hidden',
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 4,
    fontSize: 13,
    fontWeight: '700',
  },
  subheading: {
    color: '#9baa9f',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 18,
  },
  refreshError: {
    color: '#fca5a5',
    fontSize: 12,
    marginTop: -10,
    marginBottom: 10,
  },
  grid: {
    paddingBottom: 24,
    flexGrow: 1,
  },
  row: {
    gap: 10,
  },
  tile: {
    flex: 1,
    marginBottom: 10,
    backgroundColor: '#151f1b',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#26352e',
  },
  tilePressed: {
    opacity: 0.82,
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#19231e',
  },
  imageMissing: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 8,
  },
  imageMissingText: {
    color: '#a6b3aa',
    fontSize: 11,
    textAlign: 'center',
  },
  cloudBadge: {
    position: 'absolute',
    top: 9,
    right: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#6ee7b7',
  },
  cloudBadgeText: {
    color: '#06271b',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  caption: {
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  captionTitle: {
    color: '#d8e4dc',
    fontSize: 12,
    fontWeight: '600',
  },
  captionDate: {
    color: '#829087',
    fontSize: 10,
    marginTop: 3,
  },
  empty: {
    flex: 1,
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    color: '#f4f7f5',
    fontSize: 17,
    fontWeight: '700',
    marginTop: 14,
  },
  emptyText: {
    color: '#9baa9f',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
    textAlign: 'center',
  },
});
