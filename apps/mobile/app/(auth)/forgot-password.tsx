import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Link } from 'expo-router';
import { useState } from 'react';
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react-native';
import { useTheme } from '../../src/theme/ThemeContext';
import { Button, Input, Toast } from '../../src/components/ui';
import { supabase } from '../../src/stores/auth';
import { spacing, fontSize, fontWeight } from '../../src/theme/tokens';
import { TouchableOpacity } from 'react-native';

export default function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'error' | 'success' }>({
    visible: false,
    message: '',
    type: 'error',
  });

  const handleResetPassword = async () => {
    if (!email) {
      setToast({ visible: true, message: 'Please enter your email', type: 'error' });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'voicefit://reset-password',
      });

      if (error) {
        setToast({ visible: true, message: error.message, type: 'error' });
      } else {
        setEmailSent(true);
      }
    } catch (error: any) {
      setToast({ visible: true, message: error.message || 'Failed to send reset email', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
        <View style={{ flex: 1, justifyContent: 'center', padding: spacing.lg }}>
          <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: colors.status.success + '20',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: spacing.md,
              }}
            >
              <CheckCircle size={40} color={colors.status.success} />
            </View>
            <Text
              style={{
                fontSize: fontSize['2xl'],
                fontWeight: fontWeight.bold,
                color: colors.text.primary,
                textAlign: 'center',
                marginBottom: spacing.sm,
              }}
            >
              Check Your Email
            </Text>
            <Text
              style={{
                fontSize: fontSize.base,
                color: colors.text.secondary,
                textAlign: 'center',
                lineHeight: 24,
              }}
            >
              We've sent a password reset link to{'\n'}
              <Text style={{ fontWeight: fontWeight.semibold, color: colors.text.primary }}>
                {email}
              </Text>
            </Text>
          </View>

          <Button onPress={() => router.replace('/(auth)/login')} fullWidth>
            Back to Login
          </Button>

          <TouchableOpacity
            onPress={() => setEmailSent(false)}
            style={{ marginTop: spacing.md, alignItems: 'center' }}
          >
            <Text style={{ color: colors.accent.blue, fontSize: fontSize.sm }}>
              Didn't receive the email? Try again
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast({ ...toast, visible: false })}
      />

      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: spacing.md,
        }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            padding: spacing.lg,
            paddingTop: spacing.xl,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Content */}
          <View style={{ marginBottom: spacing.xl }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                backgroundColor: colors.accent.blue + '20',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: spacing.md,
              }}
            >
              <Mail size={32} color={colors.accent.blue} />
            </View>
            <Text
              style={{
                fontSize: fontSize['2xl'],
                fontWeight: fontWeight.bold,
                color: colors.text.primary,
                marginBottom: spacing.sm,
              }}
            >
              Forgot Password?
            </Text>
            <Text
              style={{
                fontSize: fontSize.base,
                color: colors.text.secondary,
                lineHeight: 24,
              }}
            >
              No worries, we'll send you reset instructions.
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
              autoFocus
            />
          </View>

          {/* Action */}
          <Button onPress={handleResetPassword} loading={isLoading} fullWidth>
            Reset Password
          </Button>

          {/* Back to Login */}
          <View style={{ marginTop: spacing.lg }}>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
                <ArrowLeft size={16} color={colors.text.secondary} />
                <Text
                  style={{
                    fontSize: fontSize.base,
                    color: colors.text.secondary,
                    marginLeft: spacing.xs,
                  }}
                >
                  Back to login
                </Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
