import { View, Text, Modal, TouchableOpacity, ActivityIndicator, ScrollView, TextInput, Alert, Platform } from 'react-native';
import { useState } from 'react';
import { X, Clock, Calendar as CalendarIcon, SkipForward, Play } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../theme/ThemeContext';
import { api } from '../../lib/trpc';
import { spacing, fontSize, fontWeight, borderRadius } from '../../theme/tokens';

interface DayDetailSheetProps {
  visible: boolean;
  date: string;
  onClose: () => void;
}

export function DayDetailSheet({ visible, date, onClose }: DayDetailSheetProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const [showRescheduleInput, setShowRescheduleInput] = useState(false);
  const [daysToAdd, setDaysToAdd] = useState('1');

  const { data: entries, isLoading } = api.calendar.getEntries.useQuery({
    startDate: date,
    endDate: date,
  });

  const rescheduleEntry = api.calendar.rescheduleEntry.useMutation();
  const skipEntry = api.calendar.skipEntry.useMutation();

  const entry = entries?.[0];

  const handleReschedule = async (entryId: string) => {
    // Cross-platform date input using Modal
    if (Platform.OS === 'ios') {
      // iOS supports Alert.prompt
      const result = await new Promise<number>((resolve) => {
        Alert.prompt(
          'Reschedule Workout',
          'How many days from now?',
          [
            { text: 'Cancel', onPress: () => resolve(0), style: 'cancel' },
            { text: 'OK', onPress: (value) => resolve(parseInt(value || '1', 10)) },
          ],
          'plain-text',
          '1'
        );
      });

      if (result > 0) {
        const newDate = new Date(date);
        newDate.setDate(newDate.getDate() + result);

        try {
          await rescheduleEntry.mutateAsync({
            entryId,
            newDate: newDate.toISOString().split('T')[0],
          });
          onClose();
        } catch (error: any) {
          Alert.alert('Error', error?.message || 'Failed to reschedule workout. Please try again.');
        }
      }
    } else {
      // Android: show inline input
      setShowRescheduleInput(true);
    }
  };

  const confirmReschedule = async (entryId: string) => {
    const days = parseInt(daysToAdd, 10);
    if (days > 0) {
      const newDate = new Date(date);
      newDate.setDate(newDate.getDate() + days);

      try {
        await rescheduleEntry.mutateAsync({
          entryId,
          newDate: newDate.toISOString().split('T')[0],
        });
        setShowRescheduleInput(false);
        setDaysToAdd('1');
        onClose();
      } catch (error: any) {
        Alert.alert('Error', error?.message || 'Failed to reschedule workout. Please try again.');
      }
    }
  };

  const handleSkip = async (entryId: string) => {
    try {
      await skipEntry.mutateAsync({
        entryId,
        reason: 'Skipped from calendar',
      });
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to skip workout. Please try again.');
    }
  };

  const handleStartWorkout = () => {
    if (entry) {
      router.push({
        pathname: '/(tabs)/workout',
        params: { preloadEntryId: entry.id },
      });
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="pageSheet">
      <View
        style={{
          flex: 1,
          backgroundColor: colors.overlay.scrim,
          justifyContent: 'flex-end',
        }}
      >
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={onClose}
        />

        <View
          style={{
            backgroundColor: colors.background.primary,
            borderTopLeftRadius: borderRadius.xl,
            borderTopRightRadius: borderRadius.xl,
            maxHeight: '80%',
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: colors.border.light,
            }}
          >
            <Text
              style={{
                fontSize: fontSize.lg,
                fontWeight: fontWeight.semibold,
                color: colors.text.primary,
              }}
            >
              {new Date(date).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
            <TouchableOpacity onPress={onClose} style={{ padding: spacing.sm }}>
              <X size={24} color={colors.icon.primary} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          {isLoading ? (
            <View style={{ padding: spacing.xl, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={colors.accent.blue} />
            </View>
          ) : entry ? (
            <ScrollView style={{ padding: spacing.md }}>
              {/* Workout Card */}
              <View
                style={{
                  backgroundColor: colors.background.secondary,
                  borderRadius: borderRadius.md,
                  padding: spacing.md,
                  marginBottom: spacing.md,
                }}
              >
                <Text
                  style={{
                    fontSize: fontSize.md,
                    fontWeight: fontWeight.semibold,
                    color: colors.text.primary,
                    marginBottom: spacing.sm,
                  }}
                >
                  {entry.title || 'Workout'}
                </Text>

                {entry.estimatedDuration && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
                    <Clock size={16} color={colors.icon.secondary} />
                    <Text
                      style={{
                        fontSize: fontSize.sm,
                        color: colors.text.secondary,
                        marginLeft: spacing.xs,
                      }}
                    >
                      {Math.round(entry.estimatedDuration / 60)} min
                    </Text>
                  </View>
                )}

                {/* Exercises List */}
                {entry.programDay?.exercises && (
                  <View style={{ marginTop: spacing.sm }}>
                    <Text
                      style={{
                        fontSize: fontSize.sm,
                        fontWeight: fontWeight.medium,
                        color: colors.text.secondary,
                        marginBottom: spacing.xs,
                      }}
                    >
                      Exercises:
                    </Text>
                    {entry.programDay.exercises.map((ex: any, idx: number) => (
                      <Text
                        key={idx}
                        style={{
                          fontSize: fontSize.sm,
                          color: colors.text.primary,
                          marginLeft: spacing.sm,
                        }}
                      >
                        • {ex.exercise.name}
                      </Text>
                    ))}
                  </View>
                )}
              </View>

              {/* Action Buttons */}
              {entry.status !== 'completed' && (
                <>
                  <TouchableOpacity
                    onPress={handleStartWorkout}
                    style={{
                      backgroundColor: colors.accent.blue,
                      borderRadius: borderRadius.md,
                      padding: spacing.md,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: spacing.sm,
                    }}
                  >
                    <Play size={20} color={colors.text.onAccent} />
                    <Text
                      style={{
                        fontSize: fontSize.base,
                        fontWeight: fontWeight.semibold,
                        color: colors.text.onAccent,
                        marginLeft: spacing.sm,
                      }}
                    >
                      Start Workout
                    </Text>
                  </TouchableOpacity>

                  {!showRescheduleInput ? (
                    <TouchableOpacity
                      onPress={() => handleReschedule(entry.id)}
                      style={{
                        backgroundColor: colors.background.secondary,
                        borderRadius: borderRadius.md,
                        padding: spacing.md,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: spacing.sm,
                      }}
                    >
                      <CalendarIcon size={20} color={colors.icon.primary} />
                      <Text
                        style={{
                          fontSize: fontSize.base,
                          fontWeight: fontWeight.medium,
                          color: colors.text.primary,
                          marginLeft: spacing.sm,
                        }}
                      >
                        Reschedule
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View
                      style={{
                        backgroundColor: colors.background.secondary,
                        borderRadius: borderRadius.md,
                        padding: spacing.md,
                        marginBottom: spacing.sm,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: fontSize.sm,
                          color: colors.text.secondary,
                          marginBottom: spacing.xs,
                        }}
                      >
                        How many days from now?
                      </Text>
                      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                        <TextInput
                          value={daysToAdd}
                          onChangeText={setDaysToAdd}
                          keyboardType="number-pad"
                          style={{
                            flex: 1,
                            backgroundColor: colors.background.primary,
                            borderRadius: borderRadius.sm,
                            padding: spacing.sm,
                            fontSize: fontSize.base,
                            color: colors.text.primary,
                          }}
                        />
                        <TouchableOpacity
                          onPress={() => confirmReschedule(entry.id)}
                          style={{
                            backgroundColor: colors.accent.blue,
                            borderRadius: borderRadius.sm,
                            paddingHorizontal: spacing.md,
                            justifyContent: 'center',
                          }}
                        >
                          <Text
                            style={{
                              fontSize: fontSize.sm,
                              fontWeight: fontWeight.medium,
                              color: colors.text.onAccent,
                            }}
                          >
                            OK
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => {
                            setShowRescheduleInput(false);
                            setDaysToAdd('1');
                          }}
                          style={{
                            backgroundColor: colors.background.tertiary,
                            borderRadius: borderRadius.sm,
                            paddingHorizontal: spacing.md,
                            justifyContent: 'center',
                          }}
                        >
                          <Text
                            style={{
                              fontSize: fontSize.sm,
                              fontWeight: fontWeight.medium,
                              color: colors.text.secondary,
                            }}
                          >
                            Cancel
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  <TouchableOpacity
                    onPress={() => handleSkip(entry.id)}
                    style={{
                      backgroundColor: colors.background.secondary,
                      borderRadius: borderRadius.md,
                      padding: spacing.md,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <SkipForward size={20} color={colors.status.error} />
                    <Text
                      style={{
                        fontSize: fontSize.base,
                        fontWeight: fontWeight.medium,
                        color: colors.status.error,
                        marginLeft: spacing.sm,
                      }}
                    >
                      Skip
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          ) : (
            <View
              style={{
                padding: spacing.xl,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: fontSize.base,
                  color: colors.text.secondary,
                  textAlign: 'center',
                }}
              >
                Rest day - no workouts scheduled
              </Text>
            </View>
          )}

        </View>
      </View>
    </Modal>
  );
}
