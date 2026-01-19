import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Building2, Home, Dumbbell, User, Zap, Circle, Check } from 'lucide-react-native';
import { useTheme } from '../../src/theme/ThemeContext';
import { Button } from '../../src/components/ui';
import { useOnboardingStore, Equipment, equipmentLabels } from '../../src/stores/onboarding';
import { spacing, fontSize, fontWeight, borderRadius } from '../../src/theme/tokens';

const equipmentIcons: Record<Equipment, any> = {
  full_gym: Building2,
  home_dumbbells: Dumbbell,
  home_barbell: Home,
  bodyweight: User,
  resistance_bands: Zap,
  kettlebells: Circle,
};

export default function EquipmentScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { data, setEquipment, nextStep, prevStep, currentStep, totalSteps } = useOnboardingStore();

  const handleToggle = (equipment: Equipment) => {
    const newEquipment = data.equipment.includes(equipment)
      ? data.equipment.filter((e) => e !== equipment)
      : [...data.equipment, equipment];
    setEquipment(newEquipment);
  };

  const handleNext = () => {
    nextStep();
    router.push('/(onboarding)/experience');
  };

  const handleBack = () => {
    prevStep();
    router.back();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
      <View style={{ flex: 1, padding: spacing.lg }}>
        {/* Back button */}
        <TouchableOpacity
          onPress={handleBack}
          style={{ marginBottom: spacing.md }}
        >
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>

        {/* Progress indicator */}
        <View style={{ flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.xl }}>
          {Array.from({ length: totalSteps }).map((_, index) => (
            <View
              key={index}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                backgroundColor: index <= currentStep ? colors.accent.blue : colors.background.tertiary,
              }}
            />
          ))}
        </View>

        {/* Header */}
        <View style={{ marginBottom: spacing.xl }}>
          <Text
            style={{
              fontSize: fontSize['2xl'],
              fontWeight: fontWeight.bold,
              color: colors.text.primary,
              marginBottom: spacing.sm,
            }}
          >
            What equipment do you have?
          </Text>
          <Text
            style={{
              fontSize: fontSize.base,
              color: colors.text.secondary,
            }}
          >
            Select all that apply. This helps us suggest exercises you can actually do.
          </Text>
        </View>

        {/* Equipment grid */}
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.sm }}
        >
          {(Object.keys(equipmentLabels) as Equipment[]).map((equipment) => {
            const Icon = equipmentIcons[equipment];
            const isSelected = data.equipment.includes(equipment);

            return (
              <TouchableOpacity
                key={equipment}
                onPress={() => handleToggle(equipment)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: spacing.md,
                  borderRadius: borderRadius.lg,
                  backgroundColor: isSelected ? colors.accent.blue + '15' : colors.background.secondary,
                  borderWidth: 2,
                  borderColor: isSelected ? colors.accent.blue : 'transparent',
                }}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: borderRadius.md,
                    backgroundColor: isSelected ? colors.accent.blue : colors.background.tertiary,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: spacing.md,
                  }}
                >
                  <Icon size={24} color={isSelected ? colors.text.onAccent : colors.icon.secondary} />
                </View>
                <Text
                  style={{
                    flex: 1,
                    fontSize: fontSize.base,
                    fontWeight: fontWeight.medium,
                    color: colors.text.primary,
                  }}
                >
                  {equipmentLabels[equipment]}
                </Text>
                {isSelected && (
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: colors.accent.blue,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Check size={14} color={colors.text.onAccent} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Next button */}
        <View style={{ marginTop: spacing.lg }}>
          <Button
            onPress={handleNext}
            fullWidth
          >
            Continue
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}
