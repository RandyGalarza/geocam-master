import { supabase } from '@/lib/supabase';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) return Alert.alert('Datos incompletos', 'Escribe correo y contraseña.');
    setBusy(true);
    try {
      const result = register
        ? await supabase.auth.signUp({ email: email.trim(), password })
        : await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (result.error) throw result.error;
      if (register && !result.data.session) Alert.alert('Revisa tu correo', 'Confirma tu correo para iniciar sesión.');
    } catch (error) {
      Alert.alert(register ? 'No se pudo registrar' : 'No se pudo iniciar sesión', error instanceof Error ? error.message : 'Intenta de nuevo.');
    } finally { setBusy(false); }
  };

  return <View style={styles.page}>
    <Text style={styles.title}>GeoCam</Text><Text style={styles.subtitle}>{register ? 'Crear cuenta' : 'Iniciar sesión'}</Text>
    <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Correo electrónico" placeholderTextColor="#71717a" autoCapitalize="none" keyboardType="email-address" />
    <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Contraseña" placeholderTextColor="#71717a" secureTextEntry />
    <Pressable style={styles.primary} onPress={submit} disabled={busy}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{register ? 'Registrarme' : 'Entrar'}</Text>}</Pressable>
    <Pressable onPress={() => setRegister(!register)}><Text style={styles.link}>{register ? 'Ya tengo cuenta · Iniciar sesión' : 'Crear una cuenta'}</Text></Pressable>
  </View>;
}

const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: '#09090b', justifyContent: 'center', padding: 24, gap: 14 }, title: { color: '#10b981', fontSize: 34, fontWeight: '800', textAlign: 'center' }, subtitle: { color: '#fff', fontSize: 20, textAlign: 'center', marginBottom: 14 }, input: { backgroundColor: '#18181b', color: '#fff', padding: 15, borderRadius: 10 }, primary: { backgroundColor: '#059669', padding: 15, borderRadius: 10, alignItems: 'center' }, primaryText: { color: '#fff', fontWeight: '700' }, link: { textAlign: 'center', color: '#34d399', padding: 12 } });
