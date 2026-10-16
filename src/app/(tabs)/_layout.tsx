import { Tabs } from 'expo-router';
import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';
import { Platform, StyleSheet, View } from 'react-native';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: [styles.tabBar, { paddingBottom: Math.max(insets.bottom, 8) }],
        tabBarActiveTintColor: '#a7f3d0',
        tabBarInactiveTintColor: '#829087',
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
      }}
    >
      <Tabs.Screen
        name="geocam"
        options={{
          title: 'GeoCam',
          tabBarLabel: 'GeoCam',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              focused={focused}
              color={color}
              iosName="camera.fill"
              materialName="photo_camera"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="galeria"
        options={{
          title: 'Galería',
          tabBarLabel: 'Galería',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              focused={focused}
              color={color}
              iosName="photo.on.rectangle.angled"
              materialName="photo_library"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="mapa"
        options={{
          title: 'Mapa',
          tabBarLabel: 'Mapa',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused} color={color} iosName="map.fill" materialName="map" />
          ),
        }}
      />
    </Tabs>
  );
}

function TabIcon({
  focused,
  color,
  iosName,
  materialName,
}: {
  focused: boolean;
  color: ColorValue;
  iosName: SFSymbol;
  materialName: AndroidSymbol;
}) {
  return (
    <View style={[styles.iconContainer, focused && styles.iconContainerFocused]}>
      <SymbolView
        name={{ ios: iosName, android: materialName, web: materialName }}
        size={21}
        tintColor={color}
        fallback={
          <View
            style={[
              styles.fallbackIcon,
              { borderColor: color },
              Platform.OS !== 'web' && styles.fallbackIconNative,
            ]}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#101714',
    borderTopColor: 'rgba(167, 243, 208, 0.14)',
    borderTopWidth: 1,
    paddingBottom: 8,
    paddingTop: 9,
    elevation: 16,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  tabBarItem: {
    paddingVertical: 2,
  },
  iconContainer: {
    width: 48,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
  },
  iconContainerFocused: {
    backgroundColor: 'rgba(52, 211, 153, 0.14)',
  },
  fallbackIcon: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 2,
  },
  fallbackIconNative: {
    borderRadius: 9,
  },
});
