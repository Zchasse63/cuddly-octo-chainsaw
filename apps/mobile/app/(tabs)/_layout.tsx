import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Home, MessageCircle, Play, User, Dumbbell } from 'lucide-react-native';
import { useTheme } from '../../src/theme/ThemeContext';
import { heights, fontSize, fontWeight } from '../../src/theme/tokens';

export default function TabLayout() {
  const { isDark, colors } = useTheme();

  const handleTabPress = () => {
    Haptics.selectionAsync();
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: isDark
            ? 'rgba(28, 28, 30, 0.8)'
            : 'rgba(255, 255, 255, 0.8)',
          borderTopWidth: 0,
          height: heights.tabBar,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.accent.blue,
        tabBarInactiveTintColor: colors.text.tertiary,
        tabBarLabelStyle: {
          fontSize: fontSize.xs,
          fontWeight: fontWeight.medium,
        },
      }}
      screenListeners={{
        tabPress: handleTabPress,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: 'Workout',
          tabBarIcon: ({ color, size }) => <Dumbbell size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="coach"
        options={{
          title: 'Coach',
          tabBarIcon: ({ color, size }) => (
            <MessageCircle size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="run"
        options={{
          title: 'Run',
          tabBarIcon: ({ color, size }) => <Play size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
