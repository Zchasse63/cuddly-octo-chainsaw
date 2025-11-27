import { Stack } from 'expo-router';
import { useTheme } from '../../src/theme/ThemeContext';

export default function OnboardingLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: colors.background.primary,
        },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="goals" />
      <Stack.Screen name="experience" />
      <Stack.Screen name="frequency" />
      <Stack.Screen name="activities" />
      <Stack.Screen name="equipment" />
      <Stack.Screen name="limitations" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="complete" />
    </Stack>
  );
}
