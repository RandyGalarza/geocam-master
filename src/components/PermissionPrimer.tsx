import type { PermissionState } from '@/types/geo';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface Props {
  title: string;
  description: string;
  state: PermissionState;
  onRequest: () => void;
  onOpenSettings: () => void;
}

export function PermissionPrimer({
  title,
  description,
  state,
  onRequest,
  onOpenSettings,
}: Props) {
  const isBlocked = state === 'blocked';

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Text style={styles.iconText}>{isBlocked ? '🔒' : '📷'}</Text>
      </View>

      <Text style={styles.title}>{title}</Text>

      <Text style={styles.description}>
        {isBlocked
          ? 'Desactivaste este permiso de forma permanente o el sistema lo bloqueó. Para continuar, debes habilitarlo manualmente en los Ajustes del dispositivo.'
          : description}
      </Text>

      <View style={styles.badge}>
        <Text style={styles.badgeText}>
          Estado:{' '}
          <Text style={styles.badgeBold}>
            {isBlocked ? 'Bloqueado (Ajustes necesarios)' : 'Acceso no concedido'}
          </Text>
        </Text>
      </View>

      <Pressable
        onPress={isBlocked ? onOpenSettings : onRequest}
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        accessibilityRole="button"
        accessibilityLabel={isBlocked ? 'Abrir Ajustes' : 'Permitir acceso'}
      >
        <Text style={styles.buttonText}>
          {isBlocked ? 'Abrir Ajustes' : 'Permitir acceso'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0a0a0a',
    paddingHorizontal: 28,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1f1f23',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2e2e33',
  },
  iconText: {
    fontSize: 32,
  },
  title: {
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
  },
  description: {
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
    color: '#a1a1aa',
    marginBottom: 20,
    maxWidth: 320,
  },
  badge: {
    backgroundColor: '#18181b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#27272a',
    marginBottom: 28,
  },
  badgeText: {
    color: '#71717a',
    fontSize: 12,
  },
  badgeBold: {
    color: '#fbbf24',
    fontWeight: '600',
  },
  button: {
    borderRadius: 9999,
    backgroundColor: '#10b981',
    paddingHorizontal: 28,
    paddingVertical: 14,
    minWidth: 200,
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    fontWeight: '700',
    color: '#09090b',
    fontSize: 16,
  },
});
