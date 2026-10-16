import { supabase } from '@/lib/supabase';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState<{ text: string; kind: 'error' | 'success' } | null>(null);

  const submit = async () => {
    if (!email.trim() || !password) {
      setAuthMessage({ text: 'Escribe tu correo y contraseña.', kind: 'error' });
      return;
    }
    setAuthMessage(null);
    setBusy(true);
    try {
      const result = register
        ? await supabase.auth.signUp({ email: email.trim(), password })
        : await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (result.error) throw result.error;
      if (register && !result.data.session) {
        setAuthMessage({ text: 'La cuenta se registró. Revisa tu correo y confirma la dirección antes de iniciar sesión.', kind: 'success' });
      }
    } catch (error) {
      setAuthMessage({ text: getAuthErrorMessage(error, register), kind: 'error' });
    } finally { setBusy(false); }
  };

  return <View style={styles.page}>
    <Text style={styles.title}>GeoCam</Text><Text style={styles.subtitle}>{register ? 'Crear cuenta' : 'Iniciar sesión'}</Text>
    <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Correo electrónico" placeholderTextColor="#71717a" autoCapitalize="none" keyboardType="email-address" />
    <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Contraseña" placeholderTextColor="#71717a" secureTextEntry />
    {authMessage && <View style={[styles.messageBox, authMessage.kind === 'error' ? styles.errorBox : styles.successBox]}>
      <Text style={styles.messageText}>{authMessage.text}</Text>
      {authMessage.kind === 'error' && register && isRateLimitMessage(authMessage.text) && <Pressable onPress={() => { setRegister(false); setAuthMessage(null); }}><Text style={styles.messageAction}>Probar iniciar sesión</Text></Pressable>}
    </View>}
    <Pressable style={styles.primary} onPress={submit} disabled={busy}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{register ? 'Registrarme' : 'Entrar'}</Text>}</Pressable>
    <Pressable onPress={() => { setRegister(!register); setAuthMessage(null); }}><Text style={styles.link}>{register ? 'Ya tengo cuenta · Iniciar sesión' : 'Crear una cuenta'}</Text></Pressable>
  </View>;
}

function isRateLimitMessage(message: string) {
  return /rate.?limit|too many|429|limitad[oa]/i.test(message);
}

function getAuthErrorMessage(error: unknown, isRegister: boolean) {
  const authError = error as { message?: string; code?: string; status?: number };
  const rawMessage = authError?.message ?? 'Intenta de nuevo.';
  if (authError?.status === 429 || authError?.code?.includes('rate_limit') || isRateLimitMessage(rawMessage)) {
    return isRegister
      ? 'Supabase limitó los correos de registro de este proyecto. Espera antes de volver a intentarlo. Si la cuenta ya se creó, prueba iniciar sesión. Para habilitar más registros, el administrador debe configurar SMTP personalizado en Supabase.'
      : 'Se alcanzó el límite temporal de intentos. Espera un momento y vuelve a intentarlo.';
  }
  return rawMessage;
}

const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: '#0b1210', justifyContent: 'center', padding: 24, gap: 14 }, title: { color: '#a7f3d0', fontSize: 38, fontWeight: '800', textAlign: 'center', letterSpacing: -1.2 }, subtitle: { color: '#f4f7f5', fontSize: 21, fontWeight: '600', textAlign: 'center', marginBottom: 18 }, input: { backgroundColor: '#151f1b', color: '#f4f7f5', padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#26352e', fontSize: 15 }, primary: { backgroundColor: '#34d399', padding: 16, borderRadius: 14, alignItems: 'center', shadowColor: '#34d399', shadowOpacity: 0.2, shadowRadius: 12, elevation: 3 }, primaryText: { color: '#062016', fontWeight: '800', fontSize: 15 }, link: { textAlign: 'center', color: '#a7f3d0', padding: 12, fontWeight: '600' }, messageBox: { borderRadius: 14, padding: 14, gap: 8 }, errorBox: { backgroundColor: '#351c1d', borderWidth: 1, borderColor: '#633333' }, successBox: { backgroundColor: '#123226', borderWidth: 1, borderColor: '#24563e' }, messageText: { color: '#f4f7f5', lineHeight: 20 }, messageAction: { color: '#a7f3d0', fontWeight: '700' } });
