import { View, Text, ScrollView, Switch, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Moon,
  Sun,
  Bell,
  Scale,
  Ruler,
  Trash2,
  HelpCircle,
  FileText,
  Shield,
  ChevronRight,
  Check,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../src/theme/ThemeContext';
import { Card } from '../src/components/ui';
import { useProfileStore, WeightUnit, DistanceUnit } from '../src/stores/profile';
import { useAuthStore } from '../src/stores/auth';
import { spacing, fontSize, fontWeight, borderRadius } from '../src/theme/tokens';

export default function SettingsScreen() {
  const { colors, isDark, setTheme } = useTheme();
  const router = useRouter();
  const profile = useProfileStore((state) => state.profile);
  const { setWeightUnit, setDistanceUnit, setNotificationsEnabled } = useProfileStore();
  const signOut = useAuthStore((state) => state.signOut);

  const toggleTheme = () => {
    Haptics.selectionAsync();
    setTheme(isDark ? 'light' : 'dark');
  };

  const handleWeightUnitChange = (unit: WeightUnit) => {
    Haptics.selectionAsync();
    setWeightUnit(unit);
  };

  const handleDistanceUnitChange = (unit: DistanceUnit) => {
    Haptics.selectionAsync();
    setDistanceUnit(unit);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            // Would call API to delete account
            await signOut();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: colors.border.light,
        }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text
          style={{
            flex: 1,
            fontSize: fontSize.xl,
            fontWeight: fontWeight.bold,
            color: colors.text.primary,
            marginLeft: spacing.md,
          }}
        >
          Settings
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.md }}>
        {/* Appearance Section */}
        <Text
          style={{
            fontSize: fontSize.sm,
            fontWeight: fontWeight.semibold,
            color: colors.text.tertiary,
            marginBottom: spacing.sm,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}
        >
          Appearance
        </Text>

        <Card padding="none" style={{ marginBottom: spacing.lg }}>
          <TouchableOpacity
            onPress={toggleTheme}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: spacing.md,
            }}
          >
            {isDark ? (
              <Moon size={22} color={colors.icon.primary} />
            ) : (
              <Sun size={22} color={colors.icon.primary} />
            )}
            <Text
              style={{
                flex: 1,
                marginLeft: spacing.md,
                fontSize: fontSize.base,
                color: colors.text.primary,
              }}
            >
              Dark Mode
            </Text>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{
                false: colors.background.tertiary,
                true: colors.accent.blue,
              }}
            />
          </TouchableOpacity>
        </Card>

        {/* Units Section */}
        <Text
          style={{
            fontSize: fontSize.sm,
            fontWeight: fontWeight.semibold,
            color: colors.text.tertiary,
            marginBottom: spacing.sm,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}
        >
          Units
        </Text>

        <Card padding="none" style={{ marginBottom: spacing.lg }}>
          {/* Weight Unit */}
          <View
            style={{
              padding: spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: colors.border.light,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
              <Scale size={22} color={colors.icon.primary} />
              <Text
                style={{
                  flex: 1,
                  marginLeft: spacing.md,
                  fontSize: fontSize.base,
                  color: colors.text.primary,
                }}
              >
                Weight
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <UnitButton
                label="lb"
                isSelected={profile?.preferredWeightUnit === 'lb'}
                onPress={() => handleWeightUnitChange('lb')}
                colors={colors}
              />
              <UnitButton
                label="kg"
                isSelected={profile?.preferredWeightUnit === 'kg'}
                onPress={() => handleWeightUnitChange('kg')}
                colors={colors}
              />
            </View>
          </View>

          {/* Distance Unit */}
          <View style={{ padding: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
              <Ruler size={22} color={colors.icon.primary} />
              <Text
                style={{
                  flex: 1,
                  marginLeft: spacing.md,
                  fontSize: fontSize.base,
                  color: colors.text.primary,
                }}
              >
                Distance
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <UnitButton
                label="mi"
                isSelected={profile?.preferredDistanceUnit === 'mi'}
                onPress={() => handleDistanceUnitChange('mi')}
                colors={colors}
              />
              <UnitButton
                label="km"
                isSelected={profile?.preferredDistanceUnit === 'km'}
                onPress={() => handleDistanceUnitChange('km')}
                colors={colors}
              />
            </View>
          </View>
        </Card>

        {/* Notifications Section */}
        <Text
          style={{
            fontSize: fontSize.sm,
            fontWeight: fontWeight.semibold,
            color: colors.text.tertiary,
            marginBottom: spacing.sm,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}
        >
          Notifications
        </Text>

        <Card padding="none" style={{ marginBottom: spacing.lg }}>
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: spacing.md,
            }}
          >
            <Bell size={22} color={colors.icon.primary} />
            <Text
              style={{
                flex: 1,
                marginLeft: spacing.md,
                fontSize: fontSize.base,
                color: colors.text.primary,
              }}
            >
              Push Notifications
            </Text>
            <Switch
              value={profile?.notificationsEnabled ?? true}
              onValueChange={(enabled) => setNotificationsEnabled(enabled)}
              trackColor={{
                false: colors.background.tertiary,
                true: colors.accent.blue,
              }}
            />
          </TouchableOpacity>
        </Card>

        {/* Support Section */}
        <Text
          style={{
            fontSize: fontSize.sm,
            fontWeight: fontWeight.semibold,
            color: colors.text.tertiary,
            marginBottom: spacing.sm,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}
        >
          Support
        </Text>

        <Card padding="none" style={{ marginBottom: spacing.lg }}>
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: colors.border.light,
            }}
          >
            <HelpCircle size={22} color={colors.icon.primary} />
            <Text
              style={{
                flex: 1,
                marginLeft: spacing.md,
                fontSize: fontSize.base,
                color: colors.text.primary,
              }}
            >
              Help Center
            </Text>
            <ChevronRight size={20} color={colors.icon.secondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: colors.border.light,
            }}
          >
            <FileText size={22} color={colors.icon.primary} />
            <Text
              style={{
                flex: 1,
                marginLeft: spacing.md,
                fontSize: fontSize.base,
                color: colors.text.primary,
              }}
            >
              Terms of Service
            </Text>
            <ChevronRight size={20} color={colors.icon.secondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: spacing.md,
            }}
          >
            <Shield size={22} color={colors.icon.primary} />
            <Text
              style={{
                flex: 1,
                marginLeft: spacing.md,
                fontSize: fontSize.base,
                color: colors.text.primary,
              }}
            >
              Privacy Policy
            </Text>
            <ChevronRight size={20} color={colors.icon.secondary} />
          </TouchableOpacity>
        </Card>

        {/* Danger Zone */}
        <Text
          style={{
            fontSize: fontSize.sm,
            fontWeight: fontWeight.semibold,
            color: colors.status.error,
            marginBottom: spacing.sm,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}
        >
          Danger Zone
        </Text>

        <Card padding="none" style={{ marginBottom: spacing.xl }}>
          <TouchableOpacity
            onPress={handleDeleteAccount}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: spacing.md,
            }}
          >
            <Trash2 size={22} color={colors.status.error} />
            <Text
              style={{
                flex: 1,
                marginLeft: spacing.md,
                fontSize: fontSize.base,
                color: colors.status.error,
              }}
            >
              Delete Account
            </Text>
          </TouchableOpacity>
        </Card>

        {/* Version */}
        <Text
          style={{
            fontSize: fontSize.xs,
            color: colors.text.tertiary,
            textAlign: 'center',
            marginBottom: spacing.lg,
          }}
        >
          VoiceFit v2.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function UnitButton({
  label,
  isSelected,
  onPress,
  colors,
}: {
  label: string;
  isSelected: boolean;
  onPress: () => void;
  colors: any;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.sm,
        borderRadius: borderRadius.md,
        backgroundColor: isSelected ? colors.accent.blue : colors.background.tertiary,
        gap: spacing.xs,
      }}
    >
      {isSelected && <Check size={16} color={colors.text.onAccent} />}
      <Text
        style={{
          fontSize: fontSize.sm,
          fontWeight: fontWeight.medium,
          color: isSelected ? colors.text.onAccent : colors.text.secondary,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
