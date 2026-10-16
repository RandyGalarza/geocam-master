import { supabase } from '@/lib/supabase';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

const TEST_ACCOUNT = {
  email: 'randy123@gmail.com',
  password: '123456789',
};

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
    {!register && <Pressable
      style={styles.testAccount}
      onPress={() => {
        setRegister(false);
        setEmail(TEST_ACCOUNT.email);
        setPassword(TEST_ACCOUNT.password);
        setAuthMessage(null);
      }}
      disabled={busy}
    >
      <Text style={styles.testAccountText}>Usar cuenta de prueba</Text>
    </Pressable>}
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

const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: '#09090b', justifyContent: 'center', padding: 24, gap: 14 }, title: { color: '#10b981', fontSize: 34, fontWeight: '800', textAlign: 'center' }, subtitle: { color: '#fff', fontSize: 20, textAlign: 'center', marginBottom: 14 }, input: { backgroundColor: '#18181b', color: '#fff', padding: 15, borderRadius: 10 }, testAccount: { borderColor: '#10b981', borderWidth: 1, padding: 13, borderRadius: 10, alignItems: 'center' }, testAccountText: { color: '#6ee7b7', fontWeight: '700' }, primary: { backgroundColor: '#059669', padding: 15, borderRadius: 10, alignItems: 'center' }, primaryText: { color: '#fff', fontWeight: '700' }, link: { textAlign: 'center', color: '#34d399', padding: 12 }, messageBox: { borderRadius: 10, padding: 12, gap: 8 }, errorBox: { backgroundColor: '#451a1a' }, successBox: { backgroundColor: '#064e3b' }, messageText: { color: '#fff', lineHeight: 20 }, messageAction: { color: '#6ee7b7', fontWeight: '700' } });
