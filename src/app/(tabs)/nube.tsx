import { useCloudPhotos } from '@/hooks/useCloudPhotos';
import { useAuth } from '@/context/AuthContext';
import { useNetworkState } from 'expo-network';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

export default function CloudFeedScreen() {
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const netInfo = useNetworkState();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timeout);
  }, [search]);
  const offline = netInfo.isConnected === false || netInfo.isInternetReachable === false;
  const query = useCloudPhotos(session?.user.id ?? '', debouncedSearch, offline);
  const data = useMemo(() => query.data?.pages.flatMap((page) => page.photos) ?? [], [query.data]);

  return <View style={[styles.page, { paddingTop: Math.max(insets.top, 24) }]}>
    <Text style={styles.eyebrow}>RECUERDOS COMPARTIDOS</Text>
    <Text style={styles.title}>Nube</Text>
    <TextInput style={styles.search} value={search} onChangeText={setSearch} placeholder="Buscar por nota" placeholderTextColor="#829087" />
    {offline && <Text style={styles.offline}>Sin conexión · mostrando datos guardados</Text>}
    {query.isPending && !offline ? <View style={styles.state}><ActivityIndicator color="#6ee7b7" /><Text style={styles.stateText}>Cargando fotos…</Text></View>
      : query.isError && !data.length && !offline ? <View style={styles.state}><Text style={styles.stateText}>No se pudo cargar la nube.</Text><Pressable style={styles.button} onPress={() => void query.refetch()}><Text style={styles.buttonText}>Reintentar</Text></Pressable></View>
        : <FlatList data={data} keyExtractor={(item) => item.client_id} onEndReached={() => { if (query.hasNextPage && !query.isFetchingNextPage && !offline) void query.fetchNextPage(); }} onEndReachedThreshold={0.5} contentContainerStyle={styles.list} renderItem={({ item }) => <Pressable onPress={() => router.push(`/foto/${item.client_id}` as never)} style={styles.card}>{item.signedUrl ? <Image source={{ uri: item.signedUrl }} style={styles.image} /> : <View style={[styles.image, styles.noImage]}><Text style={styles.muted}>Imagen no disponible</Text></View>}<View style={styles.caption}><Text style={styles.note}>{item.note || 'Sin nota'}</Text><Text style={styles.muted}>{item.latitude !== null && item.longitude !== null ? `${item.latitude.toFixed(5)}, ${item.longitude.toFixed(5)}` : 'Sin ubicación'}</Text><Text style={styles.muted}>{new Date(item.taken_at).toLocaleDateString()}</Text></View></Pressable>} ListEmptyComponent={<View style={styles.state}><Text style={styles.stateText}>{offline ? 'Sin conexión y sin copias guardadas todavía.' : 'No hay fotos en la nube.'}</Text></View>} ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator color="#6ee7b7" /> : null} />}
  </View>;
}

const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: '#0b1210', paddingHorizontal: 18 }, eyebrow: { color: '#6ee7b7', fontSize: 11, fontWeight: '800', letterSpacing: 1.8 }, title: { color: '#f4f7f5', fontSize: 29, fontWeight: '800', marginTop: 5 }, search: { backgroundColor: '#151f1b', borderColor: '#26352e', borderWidth: 1, borderRadius: 14, color: '#f4f7f5', padding: 13, marginTop: 16, marginBottom: 12 }, offline: { color: '#fbbf24', marginBottom: 8, fontSize: 12 }, list: { paddingBottom: 24, gap: 12 }, card: { borderRadius: 17, overflow: 'hidden', backgroundColor: '#151f1b', borderColor: '#26352e', borderWidth: 1 }, image: { width: '100%', aspectRatio: 1.2, backgroundColor: '#19231e' }, noImage: { alignItems: 'center', justifyContent: 'center' }, caption: { padding: 12, gap: 4 }, note: { color: '#e2ece5', fontWeight: '700', fontSize: 15 }, muted: { color: '#9baa9f', fontSize: 12 }, state: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 28 }, stateText: { color: '#aab8af', textAlign: 'center', lineHeight: 20 }, button: { backgroundColor: '#6ee7b7', paddingVertical: 11, paddingHorizontal: 20, borderRadius: 12 }, buttonText: { color: '#06271b', fontWeight: '800' } });
