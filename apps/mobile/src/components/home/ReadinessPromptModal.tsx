import { View, Text, Modal, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { X } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, SlideInUp } from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeContext';
import { Button } from '../ui';
import { spacing, fontSize, fontWeight, borderRadius, shadows } from '../../theme/tokens';

interface ReadinessData {
  sleepQuality: number;
  energy: number;
  motivation: number;
  soreness: number;
  notes?: string;
}

interface ReadinessPromptModalProps {
  visible: boolean;
  onSubmit: (data: ReadinessData) => void;
  onDismiss: () => void;
}

export function ReadinessPromptModal({ visible, onSubmit, onDismiss }: ReadinessPromptModalProps) {
  const { colors } = useTheme();
  const [sleepQuality, setSleepQuality] = useState(7);
  const [energy, setEnergy] = useState(7);
  const [motivation, setMotivation] = useState(7);
  const [soreness, setSoreness] = useState(3);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (visible) {
      setSleepQuality(7);
      setEnergy(7);
      setMotivation(7);
      setSoreness(3);
      setNotes('');
    }
  }, [visible]);

  const handleSubmit = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSubmit({
      sleepQuality,
      energy,
      motivation,
      soreness,
      notes: notes.trim() || undefined,
    });
  };

  const handleSliderChange = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const getLabel = (category: string, value: number): string => {
    if (category === 'soreness') {
      if (value <= 3) return 'No Pain';
      if (value <= 5) return 'Mild';
      if (value <= 7) return 'Moderate';
      return 'Severe';
    }
    if (value <= 3) return 'Poor';
    if (value <= 5) return 'Fair';
    if (value <= 7) return 'Good';
    return 'Excellent';
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View
        style={{
          flex: 1,
          backgroundColor: colors.overlay.scrim,
          justifyContent: 'center',
          padding: spacing.md,
        }}
      >
        <Animated.View
          entering={SlideInUp.springify()}
          style={{
            backgroundColor: colors.background.primary,
            borderRadius: borderRadius.xl,
            maxHeight: '80%',
            ...shadows.xl,
          }}
        >
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
              Morning Check-In
            </Text>
            <TouchableOpacity onPress={onDismiss}>
              <X size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: spacing.md }}>
            <Text style={{ fontSize: fontSize.sm, color: colors.text.secondary, marginBottom: spacing.lg }}>
              Help us personalize your training by answering a few quick questions about how you feel today.
            </Text>

            {/* Sleep Quality */}
            <View style={{ marginBottom: spacing.lg }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                <Text style={{ fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text.primary }}>
                  Sleep Quality
                </Text>
                <Text style={{ fontSize: fontSize.base, color: colors.accent.blue, fontWeight: fontWeight.semibold }}>
                  {sleepQuality} - {getLabel('sleep', sleepQuality)}
                </Text>
              </View>
              <Slider
                value={sleepQuality}
                onValueChange={(value: number) => {
                  setSleepQuality(Math.round(value));
                  handleSliderChange();
                }}
                minimumValue={1}
                maximumValue={10}
                step={1}
                minimumTrackTintColor={colors.accent.blue}
                maximumTrackTintColor={colors.background.tertiary}
                thumbTintColor={colors.accent.blue}
              />
            </View>

            {/* Energy */}
            <View style={{ marginBottom: spacing.lg }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                <Text style={{ fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text.primary }}>
                  Energy Level
                </Text>
                <Text style={{ fontSize: fontSize.base, color: colors.accent.green, fontWeight: fontWeight.semibold }}>
                  {energy} - {getLabel('energy', energy)}
                </Text>
              </View>
              <Slider
                value={energy}
                onValueChange={(value: number) => {
                  setEnergy(Math.round(value));
                  handleSliderChange();
                }}
                minimumValue={1}
                maximumValue={10}
                step={1}
                minimumTrackTintColor={colors.accent.green}
                maximumTrackTintColor={colors.background.tertiary}
                thumbTintColor={colors.accent.green}
              />
            </View>

            {/* Motivation */}
            <View style={{ marginBottom: spacing.lg }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                <Text style={{ fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text.primary }}>
                  Motivation
                </Text>
                <Text style={{ fontSize: fontSize.base, color: colors.accent.purple, fontWeight: fontWeight.semibold }}>
                  {motivation} - {getLabel('motivation', motivation)}
                </Text>
              </View>
              <Slider
                value={motivation}
                onValueChange={(value: number) => {
                  setMotivation(Math.round(value));
                  handleSliderChange();
                }}
                minimumValue={1}
                maximumValue={10}
                step={1}
                minimumTrackTintColor={colors.accent.purple}
                maximumTrackTintColor={colors.background.tertiary}
                thumbTintColor={colors.accent.purple}
              />
            </View>

            {/* Soreness */}
            <View style={{ marginBottom: spacing.lg }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                <Text style={{ fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text.primary }}>
                  Soreness Level
                </Text>
                <Text style={{ fontSize: fontSize.base, color: colors.semantic.warning, fontWeight: fontWeight.semibold }}>
                  {soreness} - {getLabel('soreness', soreness)}
                </Text>
              </View>
              <Slider
                value={soreness}
                onValueChange={(value: number) => {
                  setSoreness(Math.round(value));
                  handleSliderChange();
                }}
                minimumValue={1}
                maximumValue={10}
                step={1}
                minimumTrackTintColor={colors.semantic.warning}
                maximumTrackTintColor={colors.background.tertiary}
                thumbTintColor={colors.semantic.warning}
              />
            </View>

            {/* Notes */}
            <View style={{ marginBottom: spacing.md }}>
              <Text
                style={{
                  fontSize: fontSize.base,
                  fontWeight: fontWeight.semibold,
                  color: colors.text.primary,
                  marginBottom: spacing.sm,
                }}
              >
                Notes (Optional)
              </Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Any injuries, stress, or other factors?"
                placeholderTextColor={colors.text.disabled}
                multiline
                numberOfLines={3}
                style={{
                  backgroundColor: colors.background.secondary,
                  borderRadius: borderRadius.md,
                  padding: spacing.md,
                  fontSize: fontSize.base,
                  color: colors.text.primary,
                  textAlignVertical: 'top',
                  minHeight: 80,
                }}
              />
            </View>

            {/* Actions */}
            <View style={{ gap: spacing.sm }}>
              <Button onPress={handleSubmit} fullWidth>
                Submit Check-In
              </Button>
              <Button variant="ghost" onPress={onDismiss} fullWidth>
                Skip for Now
              </Button>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}
