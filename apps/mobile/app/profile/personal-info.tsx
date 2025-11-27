import { View, Text, TextInput, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ChevronLeft, User, Mail, Calendar, Ruler, Scale, Save } from 'lucide-react-native';
import { useTheme } from '../../src/theme/ThemeContext';
import { Button } from '../../src/components/ui';
import { spacing, fontSize, fontWeight, borderRadius } from '../../src/theme/tokens';

type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say';

export default function PersonalInfoScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  // Form state
  const [firstName, setFirstName] = useState('John');
  const [lastName, setLastName] = useState('Doe');
  const [email, setEmail] = useState('john.doe@example.com');
  const [birthDate, setBirthDate] = useState('1990-01-15');
  const [gender, setGender] = useState<Gender>('male');
  const [height, setHeight] = useState('180');
  const [weight, setWeight] = useState('80');
  const [isSaving, setIsSaving] = useState(false);

  const genderOptions: { value: Gender; label: string }[] = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
    { value: 'prefer_not_to_say', label: 'Prefer not to say' },
  ];

  const handleSave = async () => {
    setIsSaving(true);
    // TODO: Save to backend
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
    router.back();
  };

  const InputField = ({
    label,
    value,
    onChangeText,
    placeholder,
    keyboardType = 'default',
    icon: Icon,
    editable = true,
  }: {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    keyboardType?: 'default' | 'email-address' | 'numeric';
    icon: any;
    editable?: boolean;
  }) => (
    <View style={{ marginBottom: spacing.lg }}>
      <Text
        style={{
          fontSize: fontSize.sm,
          fontWeight: fontWeight.medium,
          color: colors.text.secondary,
          marginBottom: spacing.xs,
        }}
      >
        {label}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.background.secondary,
          borderRadius: borderRadius.lg,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
        }}
      >
        <Icon size={20} color={colors.text.tertiary} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.text.tertiary}
          keyboardType={keyboardType}
          editable={editable}
          style={{
            flex: 1,
            marginLeft: spacing.sm,
            fontSize: fontSize.base,
            color: editable ? colors.text.primary : colors.text.tertiary,
            paddingVertical: spacing.xs,
          }}
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
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
            Personal Information
          </Text>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg }}>
          {/* Name Section */}
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <InputField
                label="First Name"
                value={firstName}
                onChangeText={setFirstName}
                placeholder="First name"
                icon={User}
              />
            </View>
            <View style={{ flex: 1 }}>
              <InputField
                label="Last Name"
                value={lastName}
                onChangeText={setLastName}
                placeholder="Last name"
                icon={User}
              />
            </View>
          </View>

          {/* Email */}
          <InputField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            keyboardType="email-address"
            icon={Mail}
            editable={false}
          />

          {/* Birth Date */}
          <InputField
            label="Birth Date"
            value={birthDate}
            onChangeText={setBirthDate}
            placeholder="YYYY-MM-DD"
            icon={Calendar}
          />

          {/* Gender */}
          <View style={{ marginBottom: spacing.lg }}>
            <Text
              style={{
                fontSize: fontSize.sm,
                fontWeight: fontWeight.medium,
                color: colors.text.secondary,
                marginBottom: spacing.xs,
              }}
            >
              Gender
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {genderOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => setGender(option.value)}
                  style={{
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm,
                    borderRadius: borderRadius.full,
                    backgroundColor:
                      gender === option.value ? colors.accent.blue : colors.background.secondary,
                  }}
                >
                  <Text
                    style={{
                      fontSize: fontSize.sm,
                      color: gender === option.value ? colors.text.onAccent : colors.text.secondary,
                      fontWeight: gender === option.value ? fontWeight.semibold : fontWeight.normal,
                    }}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Body Measurements */}
          <Text
            style={{
              fontSize: fontSize.base,
              fontWeight: fontWeight.semibold,
              color: colors.text.primary,
              marginBottom: spacing.md,
            }}
          >
            Body Measurements
          </Text>

          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <InputField
                label="Height (cm)"
                value={height}
                onChangeText={setHeight}
                placeholder="180"
                keyboardType="numeric"
                icon={Ruler}
              />
            </View>
            <View style={{ flex: 1 }}>
              <InputField
                label="Weight (kg)"
                value={weight}
                onChangeText={setWeight}
                placeholder="80"
                keyboardType="numeric"
                icon={Scale}
              />
            </View>
          </View>

          {/* Info Notice */}
          <View
            style={{
              backgroundColor: colors.accent.blue + '15',
              borderRadius: borderRadius.lg,
              padding: spacing.md,
              marginTop: spacing.md,
            }}
          >
            <Text style={{ fontSize: fontSize.sm, color: colors.text.secondary, lineHeight: 20 }}>
              Your personal information is used to personalize your fitness experience and provide
              accurate calorie calculations. We never share your data with third parties.
            </Text>
          </View>
        </ScrollView>

        {/* Save Button */}
        <View
          style={{
            padding: spacing.lg,
            borderTopWidth: 1,
            borderTopColor: colors.border.primary,
          }}
        >
          <Button onPress={handleSave} disabled={isSaving}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <Save size={20} color={colors.text.onAccent} />
              <Text
                style={{
                  marginLeft: spacing.sm,
                  fontSize: fontSize.base,
                  fontWeight: fontWeight.semibold,
                  color: colors.text.onAccent,
                }}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Text>
            </View>
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
