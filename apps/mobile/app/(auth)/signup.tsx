import { View, Text, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Link } from 'expo-router';
import { useState } from 'react';
import { Mic, Apple, Chrome, Check } from 'lucide-react-native';
import { useTheme } from '../../src/theme/ThemeContext';
import { Button, Input, Toast } from '../../src/components/ui';
import { useAuthStore } from '../../src/stores/auth';
import { spacing, fontSize, fontWeight, borderRadius } from '../../src/theme/tokens';

export default function SignupScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { signUp, signInWithApple, signInWithGoogle, isLoading } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'error' | 'success' }>({
    visible: false,
    message: '',
    type: 'error',
  });

  const handleSignup = async () => {
    if (!termsAccepted) {
      setToast({ visible: true, message: 'Please accept the terms and privacy policy', type: 'error' });
      return;
    }

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

  const handleAppleSignIn = async () => {
    if (!termsAccepted) {
      setToast({ visible: true, message: 'Please accept the terms and privacy policy', type: 'error' });
      return;
    }

    const result = await signInWithApple();

    if (result.success) {
      router.replace('/(tabs)');
    } else {
      setToast({ visible: true, message: result.error || 'Apple sign in failed', type: 'error' });
    }
  };

  const handleGoogleSignIn = async () => {
    if (!termsAccepted) {
      setToast({ visible: true, message: 'Please accept the terms and privacy policy', type: 'error' });
      return;
    }

    const result = await signInWithGoogle();

    if (result.success) {
      router.replace('/(tabs)');
    } else {
      setToast({ visible: true, message: result.error || 'Google sign in failed', type: 'error' });
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

          {/* OAuth buttons */}
          <View style={{ marginBottom: spacing.lg, gap: spacing.sm }}>
            <Button
              onPress={handleAppleSignIn}
              loading={isLoading}
              fullWidth
              style={{
                backgroundColor: colors.text.primary,
                borderRadius: borderRadius.lg,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Apple size={20} color={colors.background.primary} />
                <Text style={{ color: colors.background.primary, fontSize: fontSize.base, fontWeight: fontWeight.semibold }}>
                  Continue with Apple
                </Text>
              </View>
            </Button>

            <Button
              onPress={handleGoogleSignIn}
              loading={isLoading}
              fullWidth
              style={{
                backgroundColor: colors.background.secondary,
                borderWidth: 1,
                borderColor: colors.border.primary,
                borderRadius: borderRadius.lg,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Chrome size={20} color={colors.text.primary} />
                <Text style={{ color: colors.text.primary, fontSize: fontSize.base, fontWeight: fontWeight.semibold }}>
                  Continue with Google
                </Text>
              </View>
            </Button>
          </View>

          {/* Divider */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg }}>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.border.primary }} />
            <Text style={{ marginHorizontal: spacing.md, fontSize: fontSize.sm, color: colors.text.tertiary }}>
              or
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.border.primary }} />
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

          {/* Terms checkbox */}
          <TouchableOpacity
            onPress={() => setTermsAccepted(!termsAccepted)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: spacing.lg,
              gap: spacing.sm,
            }}
          >
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 4,
                borderWidth: 2,
                borderColor: termsAccepted ? colors.accent.blue : colors.border.primary,
                backgroundColor: termsAccepted ? colors.accent.blue : 'transparent',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              {termsAccepted && <Check size={14} color={colors.text.onAccent} />}
            </View>
            <Text style={{ flex: 1, fontSize: fontSize.sm, color: colors.text.secondary }}>
              I agree to the{' '}
              <Text style={{ color: colors.accent.blue, fontWeight: fontWeight.semibold }}>
                Terms of Service
              </Text>
              {' '}and{' '}
              <Text style={{ color: colors.accent.blue, fontWeight: fontWeight.semibold }}>
                Privacy Policy
              </Text>
            </Text>
          </TouchableOpacity>

          {/* Actions */}
          <Button
            onPress={handleSignup}
            loading={isLoading}
            disabled={!termsAccepted}
            fullWidth
          >
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
