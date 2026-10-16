import { getById } from '@/../db/repositories/photos';
import { useAlbums } from '@/hooks/useAlbums';
import { usePhotos } from '@/hooks/usePhotos';
import type { GeoPhoto } from '@/types/geo';
import { mapDbPhotoToGeoPhoto } from '@/utils/photoMapper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
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
import { useAuth } from '@/context/AuthContext';
import { deleteRemotePhoto } from '@/../services/cloudPhotos';

export default function PhotoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { removePhoto, updatePhoto } = usePhotos();
  const { session } = useAuth();
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
        if (!session) return;
        const raw = await getById(id, session.user.id);
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
  }, [id, session]);

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
            try {
              if (!session) throw new Error('Inicia sesión para eliminar fotos.');
              const raw = await getById(photo.id, session.user.id);
              if (!raw) throw new Error('La foto ya no está disponible.');
              if (raw.syncedAt !== null) await deleteRemotePhoto({ remotePath: raw.remotePath, clientId: raw.clientId, localUri: raw.uri });
              await removePhoto(photo.id);
              router.back();
            } catch (error) {
              Alert.alert('No se eliminó la foto', error instanceof Error ? error.message : 'Comprueba tu conexión e inténtalo de nuevo.');
            }
          },
        },
      ]
    );
  };

  const currentAlbum = albums.find((a) => a.id === photo.albumId);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver"
          onPress={() => router.back()}
          style={styles.iconBtn}
        >
          <SymbolView
            name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
            size={20}
            tintColor="#dce8e0"
          />
        </Pressable>

        <View style={styles.headerHeading}>
          <Text style={styles.headerEyebrow}>TUS RECUERDOS</Text>
          <Text style={styles.headerTitle}>Detalle de foto</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Eliminar foto"
          onPress={handleDeletePhoto}
          style={styles.deleteBtn}
        >
          <SymbolView
            name={{ ios: 'trash', android: 'delete', web: 'delete' }}
            size={19}
            tintColor="#fda4af"
          />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 24) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.imageCard}>
          <Image source={{ uri: photo.uri }} style={styles.image} resizeMode="cover" />

          {photo.isInCloud && (
            <View style={styles.cloudBadge}>
              <SymbolView
                name={{ ios: 'icloud.fill', android: 'cloud_done', web: 'cloud_done' }}
                size={15}
                tintColor="#06271b"
              />
              <Text style={styles.cloudBadgeText}>En la nube</Text>
            </View>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={photo.favorite ? 'Quitar de favoritas' : 'Marcar como favorita'}
            onPress={handleToggleFavorite}
            style={({ pressed }) => [styles.favoriteBadge, pressed && styles.pressed]}
          >
            <SymbolView
              name={{
                ios: photo.favorite ? 'star.fill' : 'star',
                android: photo.favorite ? 'star' : 'star_outline',
                web: photo.favorite ? 'star' : 'star_outline',
              }}
              size={16}
              tintColor={photo.favorite ? '#fbbf24' : '#f4f7f5'}
            />
            <Text style={styles.favoriteBadgeText}>
              {photo.favorite ? 'Favorita' : 'Marcar favorita'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.badgeRow}>
            <View style={[styles.sourceBadge, photo.source === 'gallery' ? styles.galleryBg : styles.cameraBg]}>
              <SymbolView
                name={{
                  ios: photo.source === 'gallery' ? 'photo' : 'camera.fill',
                  android: photo.source === 'gallery' ? 'photo' : 'photo_camera',
                  web: photo.source === 'gallery' ? 'photo' : 'photo_camera',
                }}
                size={14}
                tintColor="#d7f8e8"
              />
              <Text style={styles.sourceBadgeText}>
                {photo.source === 'gallery' ? 'Importada' : 'Cámara'}
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
            <View style={styles.locationRow}>
              <View style={styles.locationIcon}>
                <SymbolView
                  name={{ ios: 'location.fill', android: 'location_on', web: 'location_on' }}
                  size={17}
                  tintColor="#6ee7b7"
                />
              </View>
              <View style={styles.locationTextGroup}>
                <Text style={styles.locationLabel}>Ubicación guardada</Text>
                <Text style={styles.coordsText}>
                  {photo.coords.latitude.toFixed(5)}, {photo.coords.longitude.toFixed(5)}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.noLocationRow}>
              <SymbolView
                name={{ ios: 'location.slash', android: 'location_off', web: 'location_off' }}
                size={16}
                tintColor="#a1afa6"
              />
              <Text style={styles.noCoordsText}>Sin ubicación GPS</Text>
            </View>
          )}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeading}>
            <View style={styles.sectionIcon}>
              <SymbolView
                name={{ ios: 'folder.fill', android: 'folder', web: 'folder' }}
                size={17}
                tintColor="#6ee7b7"
              />
            </View>
            <View style={styles.sectionTitleGroup}>
              <Text style={styles.sectionTitle}>Álbum</Text>
              <Text style={styles.sectionHint}>Organiza tus recuerdos</Text>
            </View>
          </View>
          <View style={styles.albumRow}>
            <Text style={styles.albumValueText}>
              {currentAlbum ? currentAlbum.name : 'Sin álbum asignado'}
            </Text>
            <Pressable
              onPress={() => setShowAlbumModal(true)}
              style={({ pressed }) => [styles.changeAlbumBtn, pressed && styles.pressed]}
            >
              <Text style={styles.changeAlbumBtnText}>Cambiar</Text>
              <SymbolView
                name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                size={15}
                tintColor="#a7f3d0"
              />
            </Pressable>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeading}>
            <View style={styles.sectionIcon}>
              <SymbolView
                name={{ ios: 'text.alignleft', android: 'edit_note', web: 'edit_note' }}
                size={17}
                tintColor="#6ee7b7"
              />
            </View>
            <View style={styles.sectionTitleGroup}>
              <Text style={styles.sectionTitle}>Nota</Text>
              <Text style={styles.sectionHint}>Añade contexto a esta foto</Text>
            </View>
          </View>
          <TextInput
            style={styles.noteInput}
            value={noteText}
            onChangeText={setNoteText}
            placeholder="¿Qué quieres recordar de este momento?"
            placeholderTextColor="#829087"
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
              <>
                <Text style={styles.saveNoteBtnText}>Guardar nota</Text>
                <SymbolView
                  name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                  size={17}
                  tintColor="#06271b"
                />
              </>
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
                <SymbolView
                  name={{ ios: 'xmark', android: 'close', web: 'close' }}
                  size={16}
                  tintColor="#aab8af"
                />
              </Pressable>
            </View>

            <Pressable
              onPress={() => handleSelectAlbum(null)}
              style={[styles.albumOption, photo.albumId === null && styles.albumOptionSelected]}
            >
              <SymbolView
                name={{ ios: 'folder', android: 'folder_off', web: 'folder_off' }}
                size={18}
                tintColor="#aab8af"
              />
              <Text style={styles.albumOptionText}>Sin álbum</Text>
              {photo.albumId === null && (
                <SymbolView
                  name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                  size={17}
                  tintColor="#6ee7b7"
                />
              )}
            </Pressable>

            {albums.map((alb) => (
              <Pressable
                key={alb.id}
                onPress={() => handleSelectAlbum(alb.id)}
                style={[styles.albumOption, photo.albumId === alb.id && styles.albumOptionSelected]}
              >
                <SymbolView
                  name={{ ios: 'folder.fill', android: 'folder', web: 'folder' }}
                  size={18}
                  tintColor="#6ee7b7"
                />
                <Text style={styles.albumOptionText}>{alb.name}</Text>
                {photo.albumId === alb.id && (
                  <SymbolView
                    name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                    size={17}
                    tintColor="#6ee7b7"
                  />
                )}
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
                  placeholder="Nombre del nuevo álbum"
                  placeholderTextColor="#829087"
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
    backgroundColor: '#0b1210',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  notFoundText: {
    color: '#f4f7f5',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: '#1b2821',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#31443a',
  },
  backButtonText: {
    color: '#a7f3d0',
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(167, 243, 208, 0.10)',
    gap: 12,
    minHeight: 66,
  },
  headerHeading: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  headerEyebrow: {
    color: '#6ee7b7',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.7,
  },
  headerTitle: {
    color: '#f4f7f5',
    fontSize: 15,
    fontWeight: '700',
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: '#17211b',
    borderWidth: 1,
    borderColor: '#28382f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: 'rgba(251, 113, 133, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(251, 113, 133, 0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
    gap: 14,
  },
  imageCard: {
    position: 'relative',
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#17211b',
    borderWidth: 1,
    borderColor: 'rgba(167, 243, 208, 0.14)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 8,
  },
  image: {
    width: '100%',
    height: 340,
    backgroundColor: '#17211b',
  },
  favoriteBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(11, 18, 16, 0.88)',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  favoriteBadgeText: {
    color: '#f4f7f5',
    fontWeight: '700',
    fontSize: 12,
  },
  cloudBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#6ee7b7',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 14,
  },
  cloudBadgeText: {
    color: '#06271b',
    fontSize: 11,
    fontWeight: '800',
  },
  infoCard: {
    backgroundColor: '#131c17',
    padding: 16,
    borderRadius: 20,
    gap: 15,
    borderWidth: 1,
    borderColor: '#26352e',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
  },
  cameraBg: {
    backgroundColor: 'rgba(14, 165, 233, 0.16)',
  },
  galleryBg: {
    backgroundColor: 'rgba(245, 158, 11, 0.16)',
  },
  sourceBadgeText: {
    color: '#d7f8e8',
    fontSize: 11,
    fontWeight: '700',
  },
  dateText: {
    flexShrink: 1,
    color: '#aab8af',
    fontSize: 11,
    textAlign: 'right',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: 'rgba(167, 243, 208, 0.10)',
  },
  locationIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: 'rgba(52, 211, 153, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationTextGroup: {
    flex: 1,
    gap: 3,
  },
  locationLabel: {
    color: '#aab8af',
    fontSize: 11,
    fontWeight: '600',
  },
  coordsText: {
    color: '#e2f5e9',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  noLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(167, 243, 208, 0.10)',
  },
  noCoordsText: {
    color: '#a1afa6',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: '#131c17',
    padding: 16,
    borderRadius: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: '#26352e',
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 13,
    backgroundColor: 'rgba(52, 211, 153, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitleGroup: {
    flex: 1,
    gap: 2,
  },
  sectionTitle: {
    color: '#f4f7f5',
    fontSize: 14,
    fontWeight: '700',
  },
  sectionHint: {
    color: '#829087',
    fontSize: 11,
  },
  albumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(167, 243, 208, 0.10)',
  },
  albumValueText: {
    flex: 1,
    color: '#d8e4dc',
    fontSize: 14,
    fontWeight: '600',
  },
  changeAlbumBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(52, 211, 153, 0.11)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 11,
  },
  changeAlbumBtnText: {
    color: '#a7f3d0',
    fontSize: 12,
    fontWeight: '700',
  },
  noteInput: {
    backgroundColor: '#0d1511',
    color: '#f4f7f5',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2a3b31',
    padding: 14,
    fontSize: 14,
    textAlignVertical: 'top',
    minHeight: 96,
    lineHeight: 20,
  },
  saveNoteBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#6ee7b7',
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
  },
  saveNoteBtnText: {
    color: '#06271b',
    fontWeight: '800',
    fontSize: 14,
  },
  pressed: {
    opacity: 0.8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.66)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#111a15',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    borderColor: '#2a3b31',
    padding: 20,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    color: '#f4f7f5',
    fontSize: 18,
    fontWeight: '800',
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 13,
    backgroundColor: '#1b2821',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#31443a',
  },
  albumOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 13,
    paddingVertical: 13,
    backgroundColor: '#17211b',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#26352e',
  },
  albumOptionSelected: {
    borderColor: '#34d399',
    backgroundColor: 'rgba(52, 211, 153, 0.10)',
  },
  albumOptionText: {
    flex: 1,
    color: '#e2ece5',
    fontSize: 14,
    fontWeight: '600',
  },
  newAlbumBox: {
    marginTop: 4,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#26352e',
    gap: 10,
  },
  newAlbumTitle: {
    color: '#aab8af',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  newAlbumRow: {
    flexDirection: 'row',
    gap: 9,
  },
  newAlbumInput: {
    flex: 1,
    backgroundColor: '#0d1511',
    color: '#f4f7f5',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#2a3b31',
    fontSize: 13,
  },
  createAlbumBtn: {
    backgroundColor: '#6ee7b7',
    paddingHorizontal: 18,
    justifyContent: 'center',
    borderRadius: 13,
  },
  createAlbumBtnText: {
    color: '#06271b',
    fontWeight: '800',
    fontSize: 13,
  },
});
