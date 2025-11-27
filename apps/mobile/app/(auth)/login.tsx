import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Link } from 'expo-router';
import { useState } from 'react';
import { Mic } from 'lucide-react-native';
import { useTheme } from '../../src/theme/ThemeContext';
import { Button, Input, Toast } from '../../src/components/ui';
import { useAuthStore } from '../../src/stores/auth';
import { spacing, fontSize, fontWeight } from '../../src/theme/tokens';

export default function LoginScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const signIn = useAuthStore((state) => state.signIn);
  const isLoading = useAuthStore((state) => state.isLoading);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'error' | 'success' }>({
    visible: false,
    message: '',
    type: 'error',
  });

  const handleLogin = async () => {
    if (!email || !password) {
      setToast({ visible: true, message: 'Please fill in all fields', type: 'error' });
      return;
    }

    const result = await signIn(email, password);

    if (result.success) {
      router.replace('/(tabs)');
    } else {
      setToast({ visible: true, message: result.error || 'Login failed', type: 'error' });
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast({ ...toast, visible: false })}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            padding: spacing.lg,
            justifyContent: 'center',
          }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 20,
                backgroundColor: colors.accent.blue,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: spacing.md,
              }}
            >
              <Mic size={40} color={colors.text.onAccent} />
            </View>
            <Text
              style={{
                fontSize: fontSize['3xl'],
                fontWeight: fontWeight.bold,
                color: colors.text.primary,
              }}
            >
              VoiceFit
            </Text>
            <Text
              style={{
                fontSize: fontSize.base,
                color: colors.text.secondary,
                marginTop: spacing.xs,
              }}
            >
              Voice-first fitness tracking
            </Text>
          </View>

          {/* Form */}
          <View style={{ marginBottom: spacing.lg }}>
            <Input
              type="email"
              label="Email"
              placeholder="your@email.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
            />

            <Input
              type="password"
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
            />

            <Link href="/(auth)/forgot-password" asChild>
              <Text
                style={{
                  fontSize: fontSize.sm,
                  color: colors.accent.blue,
                  textAlign: 'right',
                  marginTop: spacing.xs,
                }}
              >
                Forgot password?
              </Text>
            </Link>
          </View>

          {/* Actions */}
          <Button onPress={handleLogin} loading={isLoading} fullWidth>
            Sign In
          </Button>

          <View style={{ marginTop: spacing.lg }}>
            <Text
              style={{
                fontSize: fontSize.base,
                color: colors.text.secondary,
                textAlign: 'center',
              }}
            >
              Don't have an account?{' '}
              <Link href="/(auth)/signup">
                <Text style={{ color: colors.accent.blue, fontWeight: fontWeight.semibold }}>
                  Sign Up
                </Text>
              </Link>
            </Text>
          </View>

          {/* Social Login */}
          <View style={{ marginTop: spacing.xl }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: spacing.md,
              }}
            >
              <View style={{ flex: 1, height: 1, backgroundColor: colors.border.light }} />
              <Text
                style={{
                  marginHorizontal: spacing.md,
                  color: colors.text.tertiary,
                  fontSize: fontSize.sm,
                }}
              >
                or continue with
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.border.light }} />
            </View>

            <View style={{ gap: spacing.sm }}>
              <Button variant="outline" onPress={() => {}} fullWidth>
                Continue with Apple
              </Button>
              <Button variant="outline" onPress={() => {}} fullWidth>
                Continue with Google
              </Button>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
