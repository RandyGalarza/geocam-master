import { getById } from '@/../db/repositories/photos';
import { useAlbums } from '@/hooks/useAlbums';
import { usePhotos } from '@/hooks/usePhotos';
import type { GeoPhoto } from '@/types/geo';
import { mapDbPhotoToGeoPhoto } from '@/utils/photoMapper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PhotoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { removePhoto, updatePhoto } = usePhotos();
  const { albums, addAlbum } = useAlbums();

  const [photo, setPhoto] = useState<GeoPhoto | null>(null);
  const [loading, setLoading] = useState(true);
  const [noteText, setNoteText] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [showAlbumModal, setShowAlbumModal] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');

  useEffect(() => {
    async function loadPhoto() {
      if (!id) return;
      try {
        const raw = await getById(id);
        if (raw) {
          const mapped = mapDbPhotoToGeoPhoto(raw);
          setPhoto(mapped);
          setNoteText(mapped.note ?? '');
        } else {
          setPhoto(null);
        }
      } catch (err) {
        console.error('Error cargando foto:', err);
      } finally {
        setLoading(false);
      }
    }
    loadPhoto();
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  if (!photo) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.notFoundText}>Foto no encontrada</Text>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Volver</Text>
        </Pressable>
      </View>
    );
  }

  const handleToggleFavorite = async () => {
    const nextValue = !photo.favorite;
    await updatePhoto(photo.id, { favorite: nextValue });
    setPhoto({ ...photo, favorite: nextValue });
  };

  const handleSaveNote = async () => {
    setIsSavingNote(true);
    await updatePhoto(photo.id, { note: noteText.trim() });
    setPhoto({ ...photo, note: noteText.trim() });
    setIsSavingNote(false);
    Alert.alert('Nota guardada', 'La nota ha sido actualizada en la base de datos.');
  };

  const handleSelectAlbum = async (albumId: string | null) => {
    await updatePhoto(photo.id, { albumId });
    setPhoto({ ...photo, albumId });
    setShowAlbumModal(false);
  };

  const handleCreateNewAlbum = async () => {
    if (!newAlbumName.trim()) return;
    try {
      const created = await addAlbum(newAlbumName.trim());
      await updatePhoto(photo.id, { albumId: created.id });
      setPhoto({ ...photo, albumId: created.id });
      setNewAlbumName('');
      setShowAlbumModal(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo crear el álbum');
    }
  };

  const handleDeletePhoto = () => {
    Alert.alert(
      '¿Eliminar foto?',
      'Esta foto y su archivo permanente se eliminarán de forma definitiva.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await removePhoto(photo.id);
            router.back();
          },
        },
      ]
    );
  };

  const currentAlbum = albums.find((a) => a.id === photo.albumId);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* HEADER DE NAVEGACIÓN */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <Text style={styles.iconBtnText}>← Volver</Text>
        </Pressable>

        <Text style={styles.headerTitle}>Detalle de Foto</Text>

        <Pressable onPress={handleDeletePhoto} style={styles.deleteBtn}>
          <Text style={styles.deleteBtnText}>🗑️</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* IMAGEN DE LA FOTO */}
        <View style={styles.imageCard}>
          <Image source={{ uri: photo.uri }} style={styles.image} resizeMode="cover" />

          <Pressable onPress={handleToggleFavorite} style={styles.favoriteBadge}>
            <Text style={styles.favoriteBadgeText}>{photo.favorite ? '⭐ Favorita' : '☆ Marcar favorita'}</Text>
          </Pressable>
        </View>

        {/* METADATOS Y BADGES */}
        <View style={styles.infoCard}>
          <View style={styles.badgeRow}>
            <View style={[styles.sourceBadge, photo.source === 'gallery' ? styles.galleryBg : styles.cameraBg]}>
              <Text style={styles.sourceBadgeText}>
                {photo.source === 'gallery' ? '🖼️ Galería' : '📷 Cámara'}
              </Text>
            </View>
            <Text style={styles.dateText}>
              {new Date(photo.createdAt).toLocaleString([], {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>

          {photo.coords ? (
            <Text style={styles.coordsText}>
              📍 Coordenadas: {photo.coords.latitude.toFixed(5)}, {photo.coords.longitude.toFixed(5)}
            </Text>
          ) : (
            <Text style={styles.noCoordsText}>⚠️ Sin coordenadas GPS registradas</Text>
          )}
        </View>

        {/* GESTIÓN DE ÁLBUM */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>📁 Álbum</Text>
          <View style={styles.albumRow}>
            <Text style={styles.albumValueText}>
              {currentAlbum ? currentAlbum.name : 'Sin álbum asignado'}
            </Text>
            <Pressable onPress={() => setShowAlbumModal(true)} style={styles.changeAlbumBtn}>
              <Text style={styles.changeAlbumBtnText}>Cambiar álbum</Text>
            </Pressable>
          </View>
        </View>

        {/* EDITOR DE NOTA */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>📝 Nota descriptiva</Text>
          <TextInput
            style={styles.noteInput}
            value={noteText}
            onChangeText={setNoteText}
            placeholder="Añade una descripción o nota sobre esta foto..."
            placeholderTextColor="#71717a"
            multiline
            numberOfLines={3}
          />
          <Pressable
            onPress={handleSaveNote}
            disabled={isSavingNote}
            style={({ pressed }) => [styles.saveNoteBtn, pressed && styles.pressed]}
          >
            {isSavingNote ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.saveNoteBtnText}>Guardar nota</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>

      {/* MODAL PARA SELECCIONAR O CREAR ÁLBUM */}
      <Modal
        visible={showAlbumModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAlbumModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Mover a Álbum</Text>
              <Pressable onPress={() => setShowAlbumModal(false)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseText}>✕</Text>
              </Pressable>
            </View>

            <Pressable
              onPress={() => handleSelectAlbum(null)}
              style={[styles.albumOption, photo.albumId === null && styles.albumOptionSelected]}
            >
              <Text style={styles.albumOptionText}>🚫 Ningún álbum (Sin asignar)</Text>
            </Pressable>

            {albums.map((alb) => (
              <Pressable
                key={alb.id}
                onPress={() => handleSelectAlbum(alb.id)}
                style={[styles.albumOption, photo.albumId === alb.id && styles.albumOptionSelected]}
              >
                <Text style={styles.albumOptionText}>📁 {alb.name}</Text>
              </Pressable>
            ))}

            {/* CREAR NUEVO ÁLBUM */}
            <View style={styles.newAlbumBox}>
              <Text style={styles.newAlbumTitle}>Crear nuevo álbum</Text>
              <View style={styles.newAlbumRow}>
                <TextInput
                  style={styles.newAlbumInput}
                  value={newAlbumName}
                  onChangeText={setNewAlbumName}
                  placeholder="Nombre del nuevo álbum..."
                  placeholderTextColor="#71717a"
                />
                <Pressable onPress={handleCreateNewAlbum} style={styles.createAlbumBtn}>
                  <Text style={styles.createAlbumBtnText}>Crear</Text>
                </Pressable>
              </View>
            </View>
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
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  notFoundText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: '#27272a',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#10b981',
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  iconBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#18181b',
  },
  iconBtnText: {
    color: '#10b981',
    fontWeight: '600',
    fontSize: 13,
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: {
    fontSize: 16,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  imageCard: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#18181b',
  },
  image: {
    width: '100%',
    height: 300,
  },
  favoriteBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(24, 24, 27, 0.88)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  favoriteBadgeText: {
    color: '#f59e0b',
    fontWeight: 'bold',
    fontSize: 12,
  },
  infoCard: {
    backgroundColor: '#18181b',
    padding: 16,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sourceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  cameraBg: {
    backgroundColor: '#0284c7',
  },
  galleryBg: {
    backgroundColor: '#d97706',
  },
  sourceBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  dateText: {
    color: '#a1a1aa',
    fontSize: 12,
  },
  coordsText: {
    color: '#34d399',
    fontSize: 13,
    fontFamily: 'monospace',
  },
  noCoordsText: {
    color: '#f87171',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: '#18181b',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  albumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  albumValueText: {
    color: '#e4e4e7',
    fontSize: 14,
    fontWeight: '500',
  },
  changeAlbumBtn: {
    backgroundColor: '#27272a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  changeAlbumBtnText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '600',
  },
  noteInput: {
    backgroundColor: '#27272a',
    color: '#ffffff',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  saveNoteBtn: {
    backgroundColor: '#10b981',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveNoteBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  pressed: {
    opacity: 0.8,
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
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
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
  albumOption: {
    padding: 14,
    backgroundColor: '#27272a',
    borderRadius: 8,
  },
  albumOptionSelected: {
    borderWidth: 1,
    borderColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  albumOptionText: {
    color: '#ffffff',
    fontSize: 14,
  },
  newAlbumBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#27272a',
    gap: 8,
  },
  newAlbumTitle: {
    color: '#a1a1aa',
    fontSize: 12,
    fontWeight: '600',
  },
  newAlbumRow: {
    flexDirection: 'row',
    gap: 8,
  },
  newAlbumInput: {
    flex: 1,
    backgroundColor: '#27272a',
    color: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    fontSize: 13,
  },
  createAlbumBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 8,
  },
  createAlbumBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13,
  },
});

