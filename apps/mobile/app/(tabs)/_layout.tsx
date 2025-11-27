import { Tabs, useRouter } from 'expo-router';
import { StyleSheet, Platform, TouchableOpacity, Image } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Home, MessageCircle, Play, User } from 'lucide-react-native';
import { useTheme } from '../../src/theme/ThemeContext';
import { heights, fontSize, fontWeight, spacing, borderRadius } from '../../src/theme/tokens';
import { useAuthStore } from '../../src/stores/auth';

// Profile Avatar Component for Header
function ProfileAvatar() {
  const { colors } = useTheme();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/profile');
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[
        styles.avatarContainer,
        { backgroundColor: colors.background.tertiary },
      ]}
    >
      {user?.user_metadata?.avatar_url ? (
        <Image
          source={{ uri: user.user_metadata.avatar_url }}
          style={styles.avatarImage}
        />
      ) : (
        <User size={20} color={colors.text.secondary} />
      )}
    </TouchableOpacity>
  );
}

export default function TabLayout() {
  const { isDark, colors } = useTheme();

  const handleTabPress = () => {
    Haptics.selectionAsync();
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.background.primary,
        },
        headerTintColor: colors.text.primary,
        headerTitleStyle: {
          fontWeight: fontWeight.semibold,
          fontSize: fontSize.md,
        },
        headerRight: () => <ProfileAvatar />,
        headerRightContainerStyle: {
          paddingRight: spacing.md,
        },
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: isDark
            ? 'rgba(28, 28, 30, 0.95)'
            : 'rgba(255, 255, 255, 0.95)',
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
      {/* 3 Main Tabs: Home - Chat - Run */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerTitle: 'VoiceFit',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          headerTitle: 'AI Coach',
          tabBarIcon: ({ color, size }) => (
            <MessageCircle size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="run"
        options={{
          title: 'Run',
          headerTitle: 'Running',
          tabBarIcon: ({ color, size }) => <Play size={size} color={color} />,
        }}
      />

      {/* Hidden tabs - accessible via navigation but not in tab bar */}
      <Tabs.Screen
        name="workout"
        options={{
          href: null, // Hidden from tab bar
        }}
      />
      <Tabs.Screen
        name="coach"
        options={{
          href: null, // Redirect to chat
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href: null, // Accessed via header avatar
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
  },
});
