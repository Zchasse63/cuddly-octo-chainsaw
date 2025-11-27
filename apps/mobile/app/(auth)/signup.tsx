import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Link } from 'expo-router';
import { useState } from 'react';
import { Mic } from 'lucide-react-native';
import { useTheme } from '../../src/theme/ThemeContext';
import { Button, Input, Toast } from '../../src/components/ui';
import { useAuthStore } from '../../src/stores/auth';
import { spacing, fontSize, fontWeight } from '../../src/theme/tokens';

export default function SignupScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const signUp = useAuthStore((state) => state.signUp);
  const isLoading = useAuthStore((state) => state.isLoading);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'error' | 'success' }>({
    visible: false,
    message: '',
    type: 'error',
  });

  const handleSignup = async () => {
    if (!name || !email || !password || !confirmPassword) {
      setToast({ visible: true, message: 'Please fill in all fields', type: 'error' });
      return;
    }

    if (password !== confirmPassword) {
      setToast({ visible: true, message: 'Passwords do not match', type: 'error' });
      return;
    }

    if (password.length < 8) {
      setToast({ visible: true, message: 'Password must be at least 8 characters', type: 'error' });
      return;
    }

    const result = await signUp(email, password, name);

    if (result.success) {
      router.replace('/(tabs)');
    } else {
      setToast({ visible: true, message: result.error || 'Signup failed', type: 'error' });
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
                fontSize: fontSize['2xl'],
                fontWeight: fontWeight.bold,
                color: colors.text.primary,
              }}
            >
              Create Account
            </Text>
            <Text
              style={{
                fontSize: fontSize.base,
                color: colors.text.secondary,
                marginTop: spacing.xs,
              }}
            >
              Start your fitness journey
            </Text>
          </View>

          {/* Form */}
          <View style={{ marginBottom: spacing.lg }}>
            <Input
              type="text"
              label="Name"
              placeholder="Your name"
              value={name}
              onChangeText={setName}
            />

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
              placeholder="Create a password"
              value={password}
              onChangeText={setPassword}
              helperText="At least 8 characters"
            />

            <Input
              type="password"
              label="Confirm Password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              error={
                confirmPassword && password !== confirmPassword
                  ? 'Passwords do not match'
                  : undefined
              }
            />
          </View>

          {/* Actions */}
          <Button onPress={handleSignup} loading={isLoading} fullWidth>
            Create Account
          </Button>

          <View style={{ marginTop: spacing.lg }}>
            <Text
              style={{
                fontSize: fontSize.base,
                color: colors.text.secondary,
                textAlign: 'center',
              }}
            >
              Already have an account?{' '}
              <Link href="/(auth)/login">
                <Text style={{ color: colors.accent.blue, fontWeight: fontWeight.semibold }}>
                  Sign In
                </Text>
              </Link>
            </Text>
          </View>

          {/* Terms */}
          <Text
            style={{
              fontSize: fontSize.xs,
              color: colors.text.tertiary,
              textAlign: 'center',
              marginTop: spacing.xl,
              paddingHorizontal: spacing.md,
            }}
          >
            By creating an account, you agree to our Terms of Service and Privacy Policy.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
