import { View, Text, Modal, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { X, Footprints, Target, Clock } from 'lucide-react-native';
import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeContext';
import { Button } from '../ui';
import { spacing, fontSize, fontWeight, borderRadius, shadows } from '../../theme/tokens';

interface Shoe {
  id: string;
  name: string;
  brand?: string;
  isDefault?: boolean;
}

type RunType = 'easy' | 'tempo' | 'interval' | 'long_run' | 'recovery' | 'fartlek' | 'hill' | 'race';

const RUN_TYPES: { id: RunType; label: string; color: string }[] = [
  { id: 'easy', label: 'Easy Run', color: '#4ECDC4' },
  { id: 'tempo', label: 'Tempo', color: '#FFE66D' },
  { id: 'interval', label: 'Intervals', color: '#FF6B6B' },
  { id: 'long_run', label: 'Long Run', color: '#95E1D3' },
  { id: 'recovery', label: 'Recovery', color: '#A8E6CF' },
  { id: 'fartlek', label: 'Fartlek', color: '#DDA0DD' },
  { id: 'hill', label: 'Hill', color: '#F4A460' },
  { id: 'race', label: 'Race', color: '#FFD700' },
];

interface PreRunSetupProps {
  visible: boolean;
  shoes: Shoe[];
  onStartRun: (options: {
    shoeId: string | null;
    runType: RunType;
    targetDistance?: number;
    targetTime?: number;
  }) => void;
  onDismiss: () => void;
}

export function PreRunSetup({ visible, shoes, onStartRun, onDismiss }: PreRunSetupProps) {
  const { colors } = useTheme();
  const [selectedShoeId, setSelectedShoeId] = useState<string | null>(
    shoes.find((s) => s.isDefault)?.id || null
  );
  const [selectedRunType, setSelectedRunType] = useState<RunType>('easy');
  const [targetDistance, setTargetDistance] = useState('');
  const [targetTime, setTargetTime] = useState('');

  const handleStartRun = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onStartRun({
      shoeId: selectedShoeId,
      runType: selectedRunType,
      targetDistance: targetDistance ? parseFloat(targetDistance) : undefined,
      targetTime: targetTime ? parseInt(targetTime) : undefined,
    });
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View
        style={{
          flex: 1,
          backgroundColor: colors.overlay.scrim,
          justifyContent: 'flex-end',
        }}
      >
        <Animated.View
          entering={SlideInDown.springify()}
          style={{
            backgroundColor: colors.background.primary,
            borderTopLeftRadius: borderRadius.xl,
            borderTopRightRadius: borderRadius.xl,
            maxHeight: '80%',
            ...shadows.xl,
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: colors.border.light,
            }}
          >
            <Text style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text.primary }}>
              Run Setup
            </Text>
            <TouchableOpacity onPress={onDismiss}>
              <X size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: spacing.md }}>
            {/* Run Type Selector */}
            <View style={{ marginBottom: spacing.lg }}>
              <Text
                style={{
                  fontSize: fontSize.base,
                  fontWeight: fontWeight.semibold,
                  color: colors.text.primary,
                  marginBottom: spacing.sm,
                }}
              >
                Run Type
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  {RUN_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type.id}
                      onPress={() => {
                        setSelectedRunType(type.id);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      style={{
                        paddingHorizontal: spacing.md,
                        paddingVertical: spacing.sm,
                        borderRadius: borderRadius.md,
                        backgroundColor:
                          selectedRunType === type.id ? type.color + '30' : colors.background.secondary,
                        borderWidth: 2,
                        borderColor: selectedRunType === type.id ? type.color : 'transparent',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: fontSize.sm,
                          color: selectedRunType === type.id ? type.color : colors.text.primary,
                          fontWeight: selectedRunType === type.id ? fontWeight.semibold : fontWeight.regular,
                        }}
                      >
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Shoe Selector */}
            {shoes.length > 0 && (
              <View style={{ marginBottom: spacing.lg }}>
                <Text
                  style={{
                    fontSize: fontSize.base,
                    fontWeight: fontWeight.semibold,
                    color: colors.text.primary,
                    marginBottom: spacing.sm,
                  }}
                >
                  Shoe
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedShoeId(null);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      style={{
                        paddingHorizontal: spacing.md,
                        paddingVertical: spacing.sm,
                        borderRadius: borderRadius.md,
                        backgroundColor: !selectedShoeId ? colors.accent.blue : colors.background.secondary,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: fontSize.sm,
                          color: !selectedShoeId ? colors.text.onAccent : colors.text.secondary,
                        }}
                      >
                        None
                      </Text>
                    </TouchableOpacity>
                    {shoes.map((shoe) => (
                      <TouchableOpacity
                        key={shoe.id}
                        onPress={() => {
                          setSelectedShoeId(shoe.id);
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                        style={{
                          paddingHorizontal: spacing.md,
                          paddingVertical: spacing.sm,
                          borderRadius: borderRadius.md,
                          backgroundColor:
                            selectedShoeId === shoe.id ? colors.accent.blue : colors.background.secondary,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: fontSize.sm,
                            color: selectedShoeId === shoe.id ? colors.text.onAccent : colors.text.secondary,
                          }}
                        >
                          {shoe.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}

            {/* Optional Targets */}
            <View style={{ marginBottom: spacing.lg }}>
              <Text
                style={{
                  fontSize: fontSize.base,
                  fontWeight: fontWeight.semibold,
                  color: colors.text.primary,
                  marginBottom: spacing.sm,
                }}
              >
                Target (Optional)
              </Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: colors.background.secondary,
                      borderRadius: borderRadius.md,
                      paddingHorizontal: spacing.sm,
                    }}
                  >
                    <Target size={18} color={colors.icon.secondary} />
                    <TextInput
                      value={targetDistance}
                      onChangeText={setTargetDistance}
                      placeholder="Distance"
                      placeholderTextColor={colors.text.disabled}
                      keyboardType="decimal-pad"
                      style={{
                        flex: 1,
                        paddingVertical: spacing.sm,
                        marginLeft: spacing.sm,
                        fontSize: fontSize.base,
                        color: colors.text.primary,
                      }}
                    />
                    <Text style={{ fontSize: fontSize.sm, color: colors.text.tertiary }}>km</Text>
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: colors.background.secondary,
                      borderRadius: borderRadius.md,
                      paddingHorizontal: spacing.sm,
                    }}
                  >
                    <Clock size={18} color={colors.icon.secondary} />
                    <TextInput
                      value={targetTime}
                      onChangeText={setTargetTime}
                      placeholder="Time"
                      placeholderTextColor={colors.text.disabled}
                      keyboardType="number-pad"
                      style={{
                        flex: 1,
                        paddingVertical: spacing.sm,
                        marginLeft: spacing.sm,
                        fontSize: fontSize.base,
                        color: colors.text.primary,
                      }}
                    />
                    <Text style={{ fontSize: fontSize.sm, color: colors.text.tertiary }}>min</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Start Button */}
            <Button onPress={handleStartRun} fullWidth>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Footprints size={20} color={colors.text.onAccent} />
                <Text
                  style={{
                    color: colors.text.onAccent,
                    marginLeft: spacing.xs,
                    fontWeight: fontWeight.semibold,
                    fontSize: fontSize.base,
                  }}
                >
                  Start Run
                </Text>
              </View>
            </Button>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}
