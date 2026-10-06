import { db } from '@/../db/client';
import migrations from '@/../drizzle/migrations';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, Text, View, useColorScheme } from 'react-native';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { success, error } = useMigrations(db, migrations);

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
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Cargando base de datos...</Text>
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="foto/[id]" options={{ headerShown: false, presentation: 'card' }} />
      </Stack>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#09090b',
    padding: 24,
  },
  loadingText: {
    color: '#a1a1aa',
    marginTop: 12,
    fontSize: 14,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 15,
    textAlign: 'center',
  },
});

