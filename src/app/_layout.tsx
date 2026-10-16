import { useDatabaseMigrations } from '@/../db/useDatabaseMigrations';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ActivityIndicator, StatusBar, StyleSheet, Text, View, useColorScheme } from 'react-native';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { success, error } = useDatabaseMigrations();

  useEffect(() => {
    if (success) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [success]);

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Error al ejecutar migraciones: {error.message}</Text>
      </View>
    );
  }

  if (!success) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#34d399" />
        <Text style={styles.loadingText}>Cargando base de datos...</Text>
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
      <AuthProvider><RootNavigator /></AuthProvider>
    </ThemeProvider>
  );
}

function RootNavigator() {
  const { session, isLoading } = useAuth();
  if (isLoading) return <View style={styles.centerContainer}><ActivityIndicator color="#10b981" /></View>;
  return <Stack screenOptions={{ headerShown: false }}>
    <Stack.Protected guard={!!session}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="foto/[id]" options={{ presentation: 'card' }} />
    </Stack.Protected>
    <Stack.Protected guard={!session}><Stack.Screen name="login" /></Stack.Protected>
  </Stack>;
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0b1210',
    padding: 24,
  },
  loadingText: {
    color: '#a6b3aa',
    marginTop: 12,
    fontSize: 14,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 15,
    textAlign: 'center',
  },
});
