import { GeoPhotosProvider, useGeoPhotos } from '@/context/GeoPhotosContext';
import { useShake } from '@/hooks/useShake';
import { Tabs } from 'expo-router';
import { Alert, StyleSheet, Text } from 'react-native';

function TabLayoutContent() {
  const { photos, clearAll } = useGeoPhotos();

  // R4. Custom Hook useShake: al agitar el teléfono, un Alert pregunta si se borran todas las fotos
  useShake(() => {
    if (photos.length === 0) {
      Alert.alert('GeoCam', 'No hay fotos guardadas para borrar.');
      return;
    }

    Alert.alert(
      '¿Borrar todas las fotos?',
      `Se eliminarán permanentemente las ${photos.length} fotos registradas. Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar todas',
          style: 'destructive',
          onPress: () => {
            clearAll();
            Alert.alert('Fotos eliminadas', 'Se han borrado todas las fotos del estado global.');
          },
        },
      ]
    );
  });

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#10b981',
        tabBarInactiveTintColor: '#71717a',
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tabs.Screen
        name="geocam"
        options={{
          title: 'GeoCam',
          tabBarLabel: 'GeoCam',
          tabBarIcon: ({ focused }) => (
            <Text style={[styles.tabIcon, focused && styles.tabIconFocused]}>📷</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="mapa"
        options={{
          title: 'Mapa',
          tabBarLabel: 'Mapa',
          tabBarIcon: ({ focused }) => (
            <Text style={[styles.tabIcon, focused && styles.tabIconFocused]}>🗺️</Text>
          ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  return (
    <GeoPhotosProvider>
      <TabLayoutContent />
    </GeoPhotosProvider>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#121214',
    borderTopColor: '#27272a',
    borderTopWidth: 1,
    height: 60,
    paddingBottom: 6,
    paddingTop: 6,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  tabIcon: {
    fontSize: 20,
    opacity: 0.7,
  },
  tabIconFocused: {
    opacity: 1,
    transform: [{ scale: 1.15 }],
  },
});
