import { View, Text, TextInput, FlatList, KeyboardAvoidingView, Platform, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useRef, useCallback, useEffect } from 'react';
import { Send, Bot, User as UserIcon, Mic, MicOff, Dumbbell, AlertCircle } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../src/theme/ThemeContext';
import { Button } from '../../src/components/ui';
import { QuickSetEditor } from '../../src/components/QuickSetEditor';
import { useAuthStore } from '../../src/stores/auth';
import { useWorkoutStore, useActiveWorkout, useIsWorkoutActive } from '../../src/stores/workout';
import { useVoiceRecorder } from '../../src/hooks/useVoiceRecorder';
import { api } from '../../src/lib/trpc';
import { spacing, fontSize, fontWeight, borderRadius, springs } from '../../src/theme/tokens';
import { WorkoutConfirmationCard } from '../../src/components/chat/WorkoutConfirmationCard';
import { ExerciseSubstitutionCard } from '../../src/components/chat/ExerciseSubstitutionCard';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  type?: 'text' | 'workout_logged' | 'confirmation_needed';
  metadata?: {
    exerciseName?: string;
    weight?: number;
    weightUnit?: string;
    reps?: number;
    confidence?: number;
    isPr?: boolean;
  };
}

interface PendingSet {
  exerciseName: string;
  exerciseId?: string;
  weight: number;
  weightUnit: 'lbs' | 'kg';
  reps: number;
  confidence: number;
  transcript: string;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function ChatScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const flatListRef = useRef<FlatList>(null);

  // Workout state
  const activeWorkout = useActiveWorkout();
  const isWorkoutActive = useIsWorkoutActive();
  const { addExercise, addSet, completeSet } = useWorkoutStore();

  // Voice recorder - SF Speech Recognizer
  const {
    state: voiceState,
    isListening,
    transcript,
    partialTranscript,
    startListening,
    stopListening,
    cancelListening,
    isAvailable: voiceAvailable,
  } = useVoiceRecorder({
    locale: 'en-US',
    onTranscript: (text, isFinal) => {
      if (isFinal && text) {
        processVoiceTranscript(text);
      }
    },
  });

  // UI state
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hey! I'm your AI fitness coach. Tap the mic to log a set with your voice, or ask me anything about training.",
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingSet, setPendingSet] = useState<PendingSet | null>(null);
  const [showQuickEditor, setShowQuickEditor] = useState(false);
  const [quickEditorData, setQuickEditorData] = useState({
    exerciseName: '',
    setNumber: 1,
    weight: 135,
    weightUnit: 'lbs' as 'lbs' | 'kg',
    reps: 10,
  });

  // Animation values
  const micScale = useSharedValue(1);
  const micGlow = useSharedValue(0);
  const pulseScale = useSharedValue(1);

  // Chat mutation using unified coach
  const chatMutation = api.coach.chat.useMutation({
    onSuccess: (data) => {
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    },
    onError: () => {
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: "Sorry, I couldn't process that. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      setIsLoading(false);
    },
  });

  // Voice parsing mutation
  const voiceParseMutation = api.voice.parse.useMutation();
  const voiceConfirmMutation = api.voice.confirm.useMutation();

  // Pulse animation while listening
  useEffect(() => {
    if (isListening) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 500 }),
          withTiming(1, { duration: 500 })
        ),
        -1,
        false
      );
      micGlow.value = withTiming(1, { duration: 300 });
      micScale.value = withSpring(1.1, springs.bouncy);
    } else {
      cancelAnimation(pulseScale);
      pulseScale.value = withSpring(1, springs.snappy);
      micGlow.value = withTiming(0, { duration: 200 });
      micScale.value = withSpring(1, springs.default);
    }
  }, [isListening]);

  const micButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: micScale.value }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: 0.3 * micGlow.value,
  }));

  const handleSend = useCallback(() => {
    if (!inputText.trim() || isLoading) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    chatMutation.mutate({ message: userMessage.content });

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [inputText, isLoading, chatMutation]);

  const handleVoicePress = async () => {
    if (isListening) {
      // Stop listening - SF Speech will auto-process
      await stopListening();
    } else {
      // Start listening
      await startListening();
    }
  };

  const processVoiceTranscript = async (spokenText: string) => {
    if (!activeWorkout) {
      // No active workout - show message
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'system',
          content: "Start a workout first to log sets with voice. Tap 'Start Workout' on the Home tab.",
          timestamp: new Date(),
        },
      ]);
      return;
    }

    // Show what was heard
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: 'user',
        content: `🎤 "${spokenText}"`,
        timestamp: new Date(),
      },
    ]);

    try {
      const result = await voiceParseMutation.mutateAsync({
        transcript: spokenText,
        workoutId: activeWorkout.id,
      });

      const { parsed, exerciseName, exerciseId, needsConfirmation } = result;

      if (!parsed.reps) {
        // Couldn't parse - ask for clarification
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: `I heard "${spokenText}" but couldn't understand the reps. Try saying something like "bench press 185 for 8 reps".`,
            timestamp: new Date(),
          },
        ]);
        return;
      }

      const setData: PendingSet = {
        exerciseName: exerciseName || parsed.exercise_name || 'Unknown Exercise',
        exerciseId,
        weight: parsed.weight || 0,
        weightUnit: parsed.weight_unit || 'lbs',
        reps: parsed.reps,
        confidence: parsed.confidence,
        transcript: spokenText,
      };

      if (needsConfirmation || parsed.confidence < 0.7) {
        // Low confidence - show WorkoutConfirmationCard
        setPendingSet(setData);
      } else {
        // High confidence - log immediately
        await logSet(setData);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: "Couldn't process that.",
          timestamp: new Date(),
        },
      ]);
      // Show retry button by re-enabling voice
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString() + '_retry',
            role: 'system',
            content: 'Tap the microphone to try again',
            timestamp: new Date(),
          },
        ]);
      }, 500);
    }
  };

  const getCurrentSetNumber = (exerciseName: string): number => {
    if (!activeWorkout) return 1;
    const exercise = activeWorkout.exercises.find(
      (e) => e.name.toLowerCase() === exerciseName.toLowerCase()
    );
    return exercise ? exercise.sets.length + 1 : 1;
  };

  const logSet = async (setData: PendingSet) => {
    if (!activeWorkout) return;

    try {
      // Find or create exercise in workout
      let workoutExercise = activeWorkout.exercises.find(
        (e) => e.name.toLowerCase() === setData.exerciseName.toLowerCase()
      );

      if (!workoutExercise) {
        // Add new exercise
        addExercise({
          id: setData.exerciseId || `temp-${Date.now()}`,
          name: setData.exerciseName,
          primaryMuscle: 'Unknown', // Would come from exercise lookup
        });
        workoutExercise = activeWorkout.exercises[activeWorkout.exercises.length - 1];
      }

      // Add the set
      if (workoutExercise) {
        addSet(workoutExercise.id, {
          weight: setData.weight,
          reps: setData.reps,
        });
        completeSet(workoutExercise.id, workoutExercise.sets[workoutExercise.sets.length - 1]?.id || '');
      }

      // Confirm with backend
      if (setData.exerciseId) {
        const confirmResult = await voiceConfirmMutation.mutateAsync({
          workoutId: activeWorkout.id,
          exerciseId: setData.exerciseId,
          reps: setData.reps,
          weight: setData.weight || undefined,
          weightUnit: setData.weightUnit,
          voiceTranscript: setData.transcript,
          confidence: setData.confidence,
        });

        // Add success message
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: confirmResult.confirmation,
            timestamp: new Date(),
            type: 'workout_logged',
            metadata: {
              exerciseName: setData.exerciseName,
              weight: setData.weight,
              weightUnit: setData.weightUnit,
              reps: setData.reps,
              isPr: confirmResult.isPr,
            },
          },
        ]);

        if (confirmResult.isPr) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
      } else {
        // Local-only confirmation
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: `Logged! ${setData.exerciseName}: ${setData.weight}${setData.weightUnit} × ${setData.reps}`,
            timestamp: new Date(),
            type: 'workout_logged',
            metadata: {
              exerciseName: setData.exerciseName,
              weight: setData.weight,
              weightUnit: setData.weightUnit,
              reps: setData.reps,
            },
          },
        ]);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      // Update quick editor for next set
      setQuickEditorData((prev) => ({
        ...prev,
        setNumber: prev.setNumber + 1,
      }));

    } catch (error) {
      console.error('Failed to log set:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: 'Failed to save set. Please try again.',
          timestamp: new Date(),
        },
      ]);
    }

    setPendingSet(null);
    setShowQuickEditor(false);
  };

  const handleQuickEditorConfirm = () => {
    const setData: PendingSet = {
      exerciseName: quickEditorData.exerciseName,
      exerciseId: pendingSet?.exerciseId,
      weight: quickEditorData.weight,
      weightUnit: quickEditorData.weightUnit,
      reps: quickEditorData.reps,
      confidence: 1, // Manual confirmation = high confidence
      transcript: pendingSet?.transcript || 'manual entry',
    };
    logSet(setData);
  };

  const handleQuickEditorDismiss = () => {
    setShowQuickEditor(false);
    setPendingSet(null);
  };

  const renderMessage = useCallback(({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    const isSystem = item.role === 'system';

    if (isSystem) {
      return (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            marginVertical: spacing.sm,
            paddingHorizontal: spacing.lg,
          }}
        >
          <View
            style={{
              backgroundColor: colors.tint.warning,
              borderRadius: borderRadius.lg,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
            }}
          >
            <AlertCircle size={16} color={colors.semantic.warning} />
            <Text
              style={{
                fontSize: fontSize.sm,
                color: colors.text.secondary,
                flex: 1,
              }}
            >
              {item.content}
            </Text>
          </View>
        </View>
      );
    }

    // Workout logged message style
    if (item.type === 'workout_logged') {
      return (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'flex-start',
            marginBottom: spacing.sm,
            paddingHorizontal: spacing.md,
          }}
        >
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: colors.semantic.success,
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: spacing.sm,
            }}
          >
            <Dumbbell size={16} color="#FFFFFF" />
          </View>
          <View
            style={{
              maxWidth: '75%',
              backgroundColor: colors.tint.success,
              borderRadius: 18,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
            }}
          >
            <Text
              style={{
                fontSize: fontSize.base,
                color: colors.text.primary,
                fontWeight: fontWeight.medium,
              }}
            >
              {item.content}
            </Text>
            {item.metadata?.isPr && (
              <Text
                style={{
                  fontSize: fontSize.sm,
                  color: colors.semantic.success,
                  marginTop: 4,
                  fontWeight: fontWeight.semibold,
                }}
              >
                🎉 New PR!
              </Text>
            )}
          </View>
        </View>
      );
    }

    return (
      <View
        style={{
          flexDirection: 'row',
          justifyContent: isUser ? 'flex-end' : 'flex-start',
          marginBottom: spacing.sm,
          paddingHorizontal: spacing.md,
        }}
      >
        {!isUser && (
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: colors.accent.blue,
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: spacing.sm,
            }}
          >
            <Bot size={18} color={colors.text.onAccent} />
          </View>
        )}

        <View
          style={{
            maxWidth: '75%',
            backgroundColor: isUser ? colors.chat.userBubble : colors.chat.aiBubble,
            borderRadius: 18,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
          }}
        >
          <Text
            style={{
              fontSize: fontSize.base,
              color: isUser ? colors.chat.userText : colors.chat.aiText,
              lineHeight: 22,
            }}
          >
            {item.content}
          </Text>
        </View>

        {isUser && (
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: colors.background.tertiary,
              justifyContent: 'center',
              alignItems: 'center',
              marginLeft: spacing.sm,
            }}
          >
            <UserIcon size={18} color={colors.icon.secondary} />
          </View>
        )}
      </View>
    );
  }, [colors]);

  if (!user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }} edges={['bottom']}>
        <View style={{ flex: 1, justifyContent: 'center', padding: spacing.lg }}>
          <Text
            style={{
              fontSize: fontSize.lg,
              color: colors.text.secondary,
              textAlign: 'center',
            }}
          >
            Sign in to chat with your AI coach
          </Text>
          <View style={{ height: spacing.md }} />
          <Button onPress={() => router.push('/(auth)/login')}>Sign In</Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}
      >
        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingVertical: spacing.md,
            paddingBottom: showQuickEditor ? 180 : 100,
          }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {/* Loading indicator */}
        {isLoading && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: spacing.md,
              paddingBottom: spacing.sm,
            }}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: colors.accent.blue,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: spacing.sm,
              }}
            >
              <Bot size={18} color={colors.text.onAccent} />
            </View>
            <Text style={{ color: colors.text.tertiary, fontSize: fontSize.sm }}>
              Thinking...
            </Text>
          </View>
        )}

        {/* Voice processing indicator */}
        {voiceState === 'processing' && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: spacing.sm,
            }}
          >
            <ActivityIndicator size="small" color={colors.accent.blue} />
            <Text style={{ color: colors.text.tertiary, fontSize: fontSize.sm, marginLeft: spacing.sm }}>
              Processing voice...
            </Text>
          </View>
        )}

        {/* Partial transcript while listening */}
        {isListening && partialTranscript && (
          <View
            style={{
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              backgroundColor: colors.tint.info,
              marginHorizontal: spacing.md,
              marginBottom: spacing.sm,
              borderRadius: borderRadius.lg,
            }}
          >
            <Text style={{ color: colors.text.secondary, fontSize: fontSize.sm, fontStyle: 'italic' }}>
              "{partialTranscript}"
            </Text>
          </View>
        )}

        {/* Input */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: spacing.md,
            paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.md,
            borderTopWidth: 1,
            borderTopColor: colors.border.light,
            backgroundColor: colors.background.primary,
            gap: spacing.sm,
          }}
        >
          {/* Voice button with pulse effect */}
          <View style={{ position: 'relative' }}>
            {/* Pulse ring */}
            {isListening && (
              <Animated.View
                style={[
                  {
                    position: 'absolute',
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: colors.accent.red,
                    left: -6,
                    top: -6,
                  },
                  pulseStyle,
                ]}
              />
            )}
            <AnimatedTouchable
              onPress={handleVoicePress}
              onLongPress={cancelListening}
              delayLongPress={500}
              disabled={!voiceAvailable}
              style={[
                {
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: isListening ? colors.accent.red : colors.background.secondary,
                  justifyContent: 'center',
                  alignItems: 'center',
                  opacity: voiceAvailable ? 1 : 0.5,
                },
                micButtonStyle,
              ]}
              accessibilityLabel={isListening ? 'Stop listening' : 'Start voice recognition'}
              accessibilityRole="button"
              accessibilityHint={isListening ? 'Tap to stop and process voice' : 'Tap to log a set with your voice'}
            >
              {isListening ? (
                <MicOff size={20} color={colors.text.onAccent} />
              ) : (
                <Mic size={20} color={voiceAvailable ? colors.icon.secondary : colors.icon.disabled} />
              )}
            </AnimatedTouchable>
          </View>

          {/* Listening indicator */}
          {isListening && (
            <Text
              style={{
                fontSize: fontSize.sm,
                color: colors.accent.red,
                fontWeight: fontWeight.medium,
                minWidth: 60,
              }}
            >
              Listening...
            </Text>
          )}

          {/* Text input */}
          <TextInput
            style={{
              flex: 1,
              height: 44,
              backgroundColor: colors.background.secondary,
              borderRadius: borderRadius.full,
              paddingHorizontal: spacing.md,
              fontSize: fontSize.base,
              color: colors.text.primary,
            }}
            value={inputText}
            onChangeText={setInputText}
            placeholder={isListening ? 'Listening...' : 'Ask me anything...'}
            placeholderTextColor={colors.text.disabled}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            editable={!isListening}
          />

          {/* Send button */}
          <TouchableOpacity
            onPress={handleSend}
            disabled={!inputText.trim() || isLoading || isListening}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: inputText.trim() && !isListening ? colors.accent.blue : colors.background.secondary,
              justifyContent: 'center',
              alignItems: 'center',
              opacity: inputText.trim() && !isLoading && !isListening ? 1 : 0.5,
            }}
            accessibilityLabel="Send message"
            accessibilityRole="button"
          >
            <Send size={20} color={inputText.trim() && !isListening ? colors.text.onAccent : colors.icon.disabled} />
          </TouchableOpacity>
        </View>

        {/* Workout Confirmation Card */}
        {pendingSet && (
          <WorkoutConfirmationCard
            visible={!!pendingSet}
            exerciseName={pendingSet.exerciseName}
            weight={pendingSet.weight}
            weightUnit={pendingSet.weightUnit}
            reps={pendingSet.reps}
            transcript={pendingSet.transcript}
            onConfirm={async () => {
              await logSet(pendingSet);
              setPendingSet(null);
            }}
            onEdit={() => {
              setQuickEditorData({
                exerciseName: pendingSet.exerciseName,
                setNumber: getCurrentSetNumber(pendingSet.exerciseName),
                weight: pendingSet.weight,
                weightUnit: pendingSet.weightUnit,
                reps: pendingSet.reps,
              });
              setShowQuickEditor(true);
              setPendingSet(null);
            }}
            onCancel={() => setPendingSet(null)}
          />
        )}

        {/* Quick Set Editor - shows during active workout */}
        {isWorkoutActive && showQuickEditor && (
          <QuickSetEditor
            exerciseName={quickEditorData.exerciseName}
            setNumber={quickEditorData.setNumber}
            weight={quickEditorData.weight}
            weightUnit={quickEditorData.weightUnit}
            reps={quickEditorData.reps}
            onWeightChange={(weight) => setQuickEditorData((prev) => ({ ...prev, weight }))}
            onRepsChange={(reps) => setQuickEditorData((prev) => ({ ...prev, reps }))}
            onConfirm={handleQuickEditorConfirm}
            onDismiss={handleQuickEditorDismiss}
            isVisible={showQuickEditor}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
