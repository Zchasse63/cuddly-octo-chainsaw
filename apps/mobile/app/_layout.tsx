import '../global.css';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, useTheme } from '../src/theme/ThemeContext';
import { api, createTRPCClient } from '../src/lib/trpc';
import { useAuthStore } from '../src/stores/auth';

// Create query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
    },
  },
});

// Create tRPC client
const trpcClient = createTRPCClient();

function RootLayoutNav() {
  const { isDark, colors } = useTheme();
  const initialize = useAuthStore((state) => state.initialize);
  const isInitialized = useAuthStore((state) => state.isInitialized);

  // Initialize auth on mount
  useEffect(() => {
    initialize();
  }, []);

  // Wait for auth to initialize
  if (!isInitialized) {
    return null;
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.background.primary,
          },
          headerTintColor: colors.text.primary,
          headerTitleStyle: {
            fontWeight: '600',
          },
          contentStyle: {
            backgroundColor: colors.background.primary,
          },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen
          name="workout/[id]"
          options={{
            title: 'Workout',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="exercise/[id]"
          options={{
            title: 'Exercise',
            presentation: 'card',
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <api.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <RootLayoutNav />
          </ThemeProvider>
        </QueryClientProvider>
      </api.Provider>
    </GestureHandlerRootView>
  );
}
