import { useAuth } from '@/context/AuthContext';
import { usePhotos } from '@/hooks/usePhotos';
import { getPersistedSyncState, syncPending } from '@/../services/cloudPhotos';
import { photosSyncState } from '@/../db/repositories/photos';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SyncStatusScreen() {
  const { session } = useAuth();
  const { photos } = usePhotos();
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<{ pending: number; lastSyncedAt: number | null }>({ pending: 0, lastSyncedAt: null });
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState('Aún no se sincronizó en esta sesión.');
  const [error, setError] = useState('');
  const refresh = async () => { if (session) setState(await photosSyncState(session.user.id)); };
  useEffect(() => { let active = true; if (session) void Promise.all([photosSyncState(session.user.id), getPersistedSyncState(session.user.id)]).then(([value, persisted]) => { if (active) { setState({ pending: value.pending, lastSyncedAt: persisted.syncedAt }); setResult(`${persisted.uploaded} subidas · ${persisted.downloaded} bajadas`); setError(persisted.error ?? ''); } }); return () => { active = false; }; }, [photos.length, session]);
  const synchronize = async () => {
    if (!session || running) return;
    setRunning(true); setError('');
    try { const outcome = await syncPending(session.user.id, () => {}); setResult(`${outcome.uploaded} subidas · ${outcome.downloaded} bajadas`); if (outcome.failures.length) setError(outcome.failures.join('\n')); await refresh(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Error desconocido'); }
    finally { setRunning(false); }
  };
  return <View style={[styles.page, { paddingTop: Math.max(insets.top, 28) }]}><Text style={styles.eyebrow}>CUENTA</Text><Text style={styles.title}>Sincronización</Text><View style={styles.card}><Text style={styles.label}>Fotos pendientes</Text><Text style={styles.count}>{state.pending}</Text><Text style={styles.label}>Última sincronización completada</Text><Text style={styles.value}>{state.lastSyncedAt ? new Date(state.lastSyncedAt).toLocaleString() : 'Sin datos todavía'}</Text><Text style={styles.label}>Resultado reciente</Text><Text style={styles.value}>{result}</Text>{error ? <Text style={styles.error}>{error}</Text> : null}<Pressable onPress={() => void synchronize()} disabled={running} style={styles.button}>{running ? <ActivityIndicator color="#06271b" /> : <Text style={styles.buttonText}>Sincronizar ahora</Text>}</Pressable></View></View>;
}

const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: '#0b1210', paddingHorizontal: 18 }, eyebrow: { color: '#6ee7b7', fontSize: 11, fontWeight: '800', letterSpacing: 1.8 }, title: { color: '#f4f7f5', fontSize: 28, fontWeight: '800', marginTop: 6 }, card: { backgroundColor: '#151f1b', borderRadius: 18, borderColor: '#26352e', borderWidth: 1, padding: 18, gap: 13, marginTop: 22 }, label: { color: '#9baa9f', fontSize: 12, fontWeight: '700' }, count: { color: '#a7f3d0', fontSize: 40, fontWeight: '800' }, value: { color: '#e2ece5', fontSize: 14 }, error: { color: '#fca5a5', fontSize: 12, lineHeight: 18 }, button: { alignItems: 'center', justifyContent: 'center', minHeight: 46, borderRadius: 13, backgroundColor: '#6ee7b7', marginTop: 8 }, buttonText: { color: '#06271b', fontWeight: '800' } });
