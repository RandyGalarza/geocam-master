import { useAuth } from '@/context/AuthContext';
import { listCloudPhotos } from '@/../services/cloudPhotos';
import { supabase } from '@/lib/supabase';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, View } from 'react-native';

type CloudPhoto = Awaited<ReturnType<typeof listCloudPhotos>>[number];
export default function CloudScreen() {
  const { session } = useAuth();
  const [photos, setPhotos] = useState<CloudPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    if (!session) return;
    try { setError(''); setPhotos(await listCloudPhotos(session.user.id)); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudieron cargar las fotos.'); }
    finally { setLoading(false); }
  }, [session]);
  useEffect(() => {
    const timer = setTimeout(() => { void refresh(); }, 0);
    if (!session) return;
    const channel = supabase.channel(`cloud-photos-${session.user.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'photos', filter: `user_id=eq.${session.user.id}` }, () => { void refresh(); }).subscribe();
    return () => { clearTimeout(timer); void supabase.removeChannel(channel); };
  }, [refresh, session]);
  return <View style={styles.page}><Text style={styles.heading}>Tus fotos en la nube</Text>
    {loading ? <ActivityIndicator color="#10b981" /> : error ? <Text style={styles.error}>{error}</Text> : <FlatList data={photos} keyExtractor={(p) => p.client_id} numColumns={2} contentContainerStyle={styles.grid} renderItem={({ item }) => <View style={styles.tile}>{item.signedUrl ? <Image source={{ uri: item.signedUrl }} style={styles.image} /> : <View style={[styles.image, styles.missingImage]}><Text style={styles.error}>{item.imageError}</Text></View>}<Text style={styles.caption}>{item.note || new Date(item.taken_at).toLocaleDateString()}</Text></View>} ListEmptyComponent={<Text style={styles.empty}>Todavía no hay fotos sincronizadas.</Text>} />}
  </View>;
}
const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: '#09090b', padding: 16, paddingTop: 56 }, heading: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 16 }, grid: { gap: 10 }, tile: { flex: 1, margin: 4, backgroundColor: '#18181b', borderRadius: 12, overflow: 'hidden' }, image: { width: '100%', aspectRatio: 1 }, missingImage: { justifyContent: 'center', alignItems: 'center', padding: 12 }, caption: { color: '#e4e4e7', padding: 8 }, empty: { color: '#a1a1aa', padding: 16 }, error: { color: '#fca5a5' } });
