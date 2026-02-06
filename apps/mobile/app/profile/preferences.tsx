import { View, Text, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  Globe,
  Ruler,
  Scale,
  Clock,
  Palette,
} from 'lucide-react-native';
import { useTheme, ThemeMode } from '../../src/theme/ThemeContext';
import { spacing, fontSize, fontWeight, borderRadius } from '../../src/theme/tokens';

type UnitSystem = 'metric' | 'imperial';
type WeekStart = 'sunday' | 'monday';

export default function PreferencesScreen() {
  const { colors, mode, setMode } = useTheme();
  const router = useRouter();

  const [unitSystem, setUnitSystem] = useState<UnitSystem>('metric');
  const [weekStart, setWeekStart] = useState<WeekStart>('monday');
  const [language, setLanguage] = useState('English');
  const [use24Hour, setUse24Hour] = useState(true);

  const SettingRow = ({
    icon: Icon,
    label,
    value,
    onPress,
    showChevron = true,
  }: {
    icon: any;
    label: string;
    value?: string;
    onPress?: () => void;
    showChevron?: boolean;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.sm,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: borderRadius.md,
          backgroundColor: colors.accent.blue + '20',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Icon size={20} color={colors.accent.blue} />
      </View>
      <Text
        style={{
          flex: 1,
          marginLeft: spacing.md,
          fontSize: fontSize.base,
          color: colors.text.primary,
        }}
      >
        {label}
      </Text>
      {value && (
        <Text
          style={{
            fontSize: fontSize.sm,
            color: colors.text.secondary,
            marginRight: spacing.sm,
          }}
        >
          {value}
        </Text>
      )}
      {showChevron && onPress && <ChevronRight size={20} color={colors.text.tertiary} />}
    </TouchableOpacity>
  );

  const ToggleRow = ({
    icon: Icon,
    label,
    value,
    onValueChange,
  }: {
    icon: any;
    label: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
  }) => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.sm,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: borderRadius.md,
          backgroundColor: colors.accent.blue + '20',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Icon size={20} color={colors.accent.blue} />
      </View>
      <Text
        style={{
          flex: 1,
          marginLeft: spacing.md,
          fontSize: fontSize.base,
          color: colors.text.primary,
        }}
      >
        {label}
      </Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.background.tertiary, true: colors.accent.blue + '60' }}
        thumbColor={value ? colors.accent.blue : colors.text.tertiary}
      />
    </View>
  );

  const SegmentedControl = ({
    options,
    selected,
    onSelect,
  }: {
    options: { value: string; label: string }[];
    selected: string;
    onSelect: (value: string) => void;
  }) => (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        padding: spacing.xs,
      }}
    >
      {options.map((option) => (
        <TouchableOpacity
          key={option.value}
          onPress={() => onSelect(option.value)}
          style={{
            flex: 1,
            paddingVertical: spacing.sm,
            borderRadius: borderRadius.md,
            backgroundColor: selected === option.value ? colors.accent.blue : 'transparent',
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              fontSize: fontSize.sm,
              fontWeight: selected === option.value ? fontWeight.semibold : fontWeight.normal,
              color: selected === option.value ? colors.text.onAccent : colors.text.secondary,
            }}
          >
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: colors.border.primary,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: spacing.md }}>
          <ChevronLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text
          style={{
            fontSize: fontSize.lg,
            fontWeight: fontWeight.semibold,
            color: colors.text.primary,
          }}
        >
          Preferences
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg }}>
        {/* Theme Section */}
        <Text
          style={{
            fontSize: fontSize.sm,
            fontWeight: fontWeight.semibold,
            color: colors.text.secondary,
            textTransform: 'uppercase',
            letterSpacing: 1,
            marginBottom: spacing.md,
          }}
        >
          Appearance
        </Text>

        <View style={{ marginBottom: spacing.lg }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: spacing.md,
            }}
          >
            <Palette size={20} color={colors.text.secondary} />
            <Text
              style={{
                marginLeft: spacing.sm,
                fontSize: fontSize.base,
                color: colors.text.primary,
              }}
            >
              Theme
            </Text>
          </View>
          <SegmentedControl
            options={[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
              { value: 'system', label: 'System' },
            ]}
            selected={mode}
            onSelect={(value) => setMode(value as ThemeMode)}
          />
        </View>

        {/* Units Section */}
        <Text
          style={{
            fontSize: fontSize.sm,
            fontWeight: fontWeight.semibold,
            color: colors.text.secondary,
            textTransform: 'uppercase',
            letterSpacing: 1,
            marginBottom: spacing.md,
          }}
        >
          Units & Measurements
        </Text>

        <View style={{ marginBottom: spacing.lg }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: spacing.md,
            }}
          >
            <Scale size={20} color={colors.text.secondary} />
            <Text
              style={{
                marginLeft: spacing.sm,
                fontSize: fontSize.base,
                color: colors.text.primary,
              }}
            >
              Unit System
            </Text>
          </View>
          <SegmentedControl
            options={[
              { value: 'metric', label: 'Metric (kg, km)' },
              { value: 'imperial', label: 'Imperial (lb, mi)' },
            ]}
            selected={unitSystem}
            onSelect={(value) => setUnitSystem(value as UnitSystem)}
          />
        </View>

        {/* Time Section */}
        <Text
          style={{
            fontSize: fontSize.sm,
            fontWeight: fontWeight.semibold,
            color: colors.text.secondary,
            textTransform: 'uppercase',
            letterSpacing: 1,
            marginBottom: spacing.md,
          }}
        >
          Date & Time
        </Text>

        <ToggleRow
          icon={Clock}
          label="24-Hour Time"
          value={use24Hour}
          onValueChange={setUse24Hour}
        />

        <View style={{ marginBottom: spacing.lg }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: spacing.md,
              marginTop: spacing.sm,
            }}
          >
            <Text
              style={{
                fontSize: fontSize.sm,
                color: colors.text.secondary,
              }}
            >
              Week Starts On
            </Text>
          </View>
          <SegmentedControl
            options={[
              { value: 'sunday', label: 'Sunday' },
              { value: 'monday', label: 'Monday' },
            ]}
            selected={weekStart}
            onSelect={(value) => setWeekStart(value as WeekStart)}
          />
        </View>

        {/* Language Section */}
        <Text
          style={{
            fontSize: fontSize.sm,
            fontWeight: fontWeight.semibold,
            color: colors.text.secondary,
            textTransform: 'uppercase',
            letterSpacing: 1,
            marginBottom: spacing.md,
          }}
        >
          Language & Region
        </Text>

        <SettingRow
          icon={Globe}
          label="Language"
          value={language}
          onPress={() => {
            // Language picker implementation pending
          }}
        />

        {/* Info */}
        <View
          style={{
            backgroundColor: colors.background.secondary,
            borderRadius: borderRadius.lg,
            padding: spacing.md,
            marginTop: spacing.lg,
          }}
        >
          <Text style={{ fontSize: fontSize.sm, color: colors.text.tertiary, lineHeight: 20 }}>
            Changes are saved automatically and synced across all your devices.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
