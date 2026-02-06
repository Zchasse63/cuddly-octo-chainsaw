import { View, Animated, useColorScheme } from 'react-native';
import { useEffect, useRef } from 'react';
import { useOfflineAware } from '../../hooks/useOfflineAware';
import { lightColors, darkColors } from '../../theme/tokens';

export function ConnectionStatus() {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? darkColors : lightColors;
  const { isOnline, isSyncing } = useOfflineAware();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Animate on status change
  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1.2,
      friction: 3,
      useNativeDriver: true,
    }).start(() => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }).start();
    });
  }, [isOnline, isSyncing, scaleAnim]);

  // Determine color based on connection state
  const getStatusColor = () => {
    if (!isOnline) return colors.semantic.error;
    if (isSyncing) return '#FFA500';
    return colors.semantic.success;
  };

  return (
    <View
      style={{
        position: 'absolute',
        top: 50,
        right: 16,
        zIndex: 1000,
      }}
    >
      <Animated.View
        style={{
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: getStatusColor(),
          transform: [{ scale: scaleAnim }],
          shadowColor: getStatusColor(),
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.5,
          shadowRadius: 3,
          elevation: 5,
        }}
      />
    </View>
  );
}
