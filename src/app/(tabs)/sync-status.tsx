import { useAuth } from '@/context/AuthContext';
import { formatCloudError, getSyncStatus, syncPending } from '@/../services/cloudPhotos';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type SyncStatus = Awaited<ReturnType<typeof getSyncStatus>>;

export default function SyncStatusScreen() {
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [running, setRunning] = useState(false);
  const [screenError, setScreenError] = useState('');
  const refresh = useCallback(async () => {
    if (session) setStatus(await getSyncStatus(session.user.id));
  }, [session]);

  useEffect(() => {
    let active = true;
    if (session) void getSyncStatus(session.user.id).then((next) => { if (active) setStatus(next); }).catch((error: unknown) => { if (active) setScreenError(formatCloudError(error)); });
    return () => { active = false; };
  }, [session]);

  const synchronize = async () => {
    if (!session || running) return;
    setRunning(true);
    setScreenError('');
    try {
      const result = await syncPending(session.user.id, () => {});
      if (result.failures.length) setScreenError(result.failures.join('\n'));
      await refresh();
    } catch (error) {
      setScreenError(formatCloudError(error));
    } finally {
      setRunning(false);
    }
  };

  return <View style={[styles.page, { paddingTop: Math.max(insets.top, 28) }]}>
    <Text style={styles.eyebrow}>CUENTA</Text>
    <Text style={styles.title}>Sincronización</Text>
    <View style={styles.card}>
      <Text style={styles.label}>Fotos pendientes</Text>
      <Text style={styles.count}>{status?.pending ?? '—'}</Text>
      <Text style={styles.label}>Última sincronización exitosa</Text>
      <Text style={styles.value}>{status?.lastSyncedAt ? new Date(status.lastSyncedAt).toLocaleString() : 'Sin datos todavía'}</Text>
      <Text style={styles.label}>Resultado más reciente</Text>
      <Text style={styles.value}>{status ? `${status.uploaded} subidas · ${status.downloaded} bajadas` : 'Cargando…'}</Text>
      {screenError || status?.error ? <Text style={styles.error}>{screenError || status?.error}</Text> : null}
      <Pressable onPress={() => void synchronize()} disabled={running} style={styles.button}>
        {running ? <ActivityIndicator color="#06271b" /> : <Text style={styles.buttonText}>Sincronizar ahora</Text>}
      </Pressable>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#0b1210', paddingHorizontal: 18 },
  eyebrow: { color: '#6ee7b7', fontSize: 11, fontWeight: '800', letterSpacing: 1.8 },
  title: { color: '#f4f7f5', fontSize: 28, fontWeight: '800', marginTop: 6 },
  card: { backgroundColor: '#151f1b', borderRadius: 18, borderColor: '#26352e', borderWidth: 1, padding: 18, gap: 13, marginTop: 22 },
  label: { color: '#9baa9f', fontSize: 12, fontWeight: '700' },
  count: { color: '#a7f3d0', fontSize: 40, fontWeight: '800' },
  value: { color: '#e2ece5', fontSize: 14 },
  error: { color: '#fca5a5', fontSize: 12, lineHeight: 18 },
  button: { alignItems: 'center', justifyContent: 'center', minHeight: 46, borderRadius: 13, backgroundColor: '#6ee7b7', marginTop: 8 },
  buttonText: { color: '#06271b', fontWeight: '800' },
});
