import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useRef, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  CheckCircle,
  ChevronRight,
  Dumbbell,
  MessageSquare,
} from 'lucide-react-native';
import { useTheme } from '../../src/theme/ThemeContext';
import { Button } from '../../src/components/ui';
import { spacing, fontSize, fontWeight, borderRadius } from '../../src/theme/tokens';

type TutorialStep = 'intro' | 'demo' | 'practice' | 'complete';

const EXAMPLE_COMMANDS = [
  { command: "I did 3 sets of bench press, 135 pounds, 10 reps", type: 'workout' },
  { command: "Just finished squats, 185 for 8, 8, and 6 reps", type: 'workout' },
  { command: "Add deadlifts, 225 pounds, 5 sets of 5", type: 'workout' },
  { command: "Log my run, 5K in 25 minutes", type: 'running' },
];

export default function VoiceTutorialScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [step, setStep] = useState<TutorialStep>('intro');
  const [isListening, setIsListening] = useState(false);
  const [currentExample, setCurrentExample] = useState(0);
  const [practiceComplete, setPracticeComplete] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isListening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isListening]);

  const handleMicPress = () => {
    setIsListening(true);
    // Simulate voice recognition
    setTimeout(() => {
      setIsListening(false);
      if (step === 'practice') {
        setPracticeComplete(true);
        setTimeout(() => setStep('complete'), 1000);
      }
    }, 3000);
  };

  const renderIntro = () => (
    <View style={{ flex: 1, justifyContent: 'center', padding: spacing.xl }}>
      <View
        style={{
          width: 100,
          height: 100,
          borderRadius: 50,
          backgroundColor: colors.accent.blue + '20',
          justifyContent: 'center',
          alignItems: 'center',
          alignSelf: 'center',
          marginBottom: spacing.xl,
        }}
      >
        <Mic size={48} color={colors.accent.blue} />
      </View>

      <Text
        style={{
          fontSize: fontSize['2xl'],
          fontWeight: fontWeight.bold,
          color: colors.text.primary,
          textAlign: 'center',
          marginBottom: spacing.md,
        }}
      >
        Voice-First Logging
      </Text>

      <Text
        style={{
          fontSize: fontSize.base,
          color: colors.text.secondary,
          textAlign: 'center',
          lineHeight: 24,
          marginBottom: spacing.xl,
        }}
      >
        VoiceFit lets you log workouts naturally with your voice. Just speak like
        you're telling a friend about your workout.
      </Text>

      <View
        style={{
          backgroundColor: colors.background.secondary,
          borderRadius: borderRadius.lg,
          padding: spacing.lg,
          marginBottom: spacing.xl,
        }}
      >
        <Text
          style={{
            fontSize: fontSize.sm,
            fontWeight: fontWeight.semibold,
            color: colors.text.primary,
            marginBottom: spacing.md,
          }}
        >
          You can say things like:
        </Text>
        {EXAMPLE_COMMANDS.slice(0, 2).map((example, index) => (
          <View
            key={index}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: index < 1 ? spacing.sm : 0,
            }}
          >
            <MessageSquare size={16} color={colors.accent.blue} />
            <Text
              style={{
                fontSize: fontSize.sm,
                color: colors.text.secondary,
                marginLeft: spacing.sm,
                fontStyle: 'italic',
              }}
            >
              "{example.command}"
            </Text>
          </View>
        ))}
      </View>

      <Button onPress={() => setStep('demo')}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ color: colors.text.onAccent, fontWeight: fontWeight.semibold }}>
            See How It Works
          </Text>
          <ChevronRight size={20} color={colors.text.onAccent} />
        </View>
      </Button>
    </View>
  );

  const renderDemo = () => (
    <View style={{ flex: 1, padding: spacing.xl }}>
      <Text
        style={{
          fontSize: fontSize.xl,
          fontWeight: fontWeight.bold,
          color: colors.text.primary,
          textAlign: 'center',
          marginBottom: spacing.lg,
        }}
      >
        Watch the Demo
      </Text>

      {/* Demo conversation */}
      <View style={{ flex: 1 }}>
        {/* User message */}
        <View
          style={{
            alignSelf: 'flex-end',
            maxWidth: '80%',
            backgroundColor: colors.accent.blue,
            borderRadius: borderRadius.lg,
            borderBottomRightRadius: borderRadius.sm,
            padding: spacing.md,
            marginBottom: spacing.md,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
            <Mic size={14} color={colors.text.onAccent} />
            <Text
              style={{
                fontSize: fontSize.xs,
                color: colors.text.onAccent,
                opacity: 0.8,
                marginLeft: spacing.xs,
              }}
            >
              Voice Input
            </Text>
          </View>
          <Text style={{ fontSize: fontSize.base, color: colors.text.onAccent }}>
            "I just did bench press, 135 pounds, 3 sets of 10"
          </Text>
        </View>

        {/* AI response */}
        <View
          style={{
            alignSelf: 'flex-start',
            maxWidth: '80%',
            backgroundColor: colors.background.secondary,
            borderRadius: borderRadius.lg,
            borderBottomLeftRadius: borderRadius.sm,
            padding: spacing.md,
            marginBottom: spacing.md,
          }}
        >
          <Text
            style={{
              fontSize: fontSize.xs,
              color: colors.text.tertiary,
              marginBottom: spacing.xs,
            }}
          >
            Coach
          </Text>
          <Text style={{ fontSize: fontSize.base, color: colors.text.primary, marginBottom: spacing.sm }}>
            Got it! I logged your bench press:
          </Text>
          <View
            style={{
              backgroundColor: colors.background.tertiary,
              borderRadius: borderRadius.md,
              padding: spacing.sm,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Dumbbell size={16} color={colors.accent.blue} />
              <Text
                style={{
                  fontSize: fontSize.sm,
                  fontWeight: fontWeight.semibold,
                  color: colors.text.primary,
                  marginLeft: spacing.sm,
                }}
              >
                Bench Press
              </Text>
            </View>
            <Text style={{ fontSize: fontSize.sm, color: colors.text.secondary, marginTop: spacing.xs }}>
              3 × 10 @ 135 lbs
            </Text>
          </View>
        </View>

        {/* AI follow-up */}
        <View
          style={{
            alignSelf: 'flex-start',
            maxWidth: '80%',
            backgroundColor: colors.background.secondary,
            borderRadius: borderRadius.lg,
            padding: spacing.md,
          }}
        >
          <Text style={{ fontSize: fontSize.base, color: colors.text.primary }}>
            That's 4,050 lbs of volume! 💪 What's next?
          </Text>
        </View>
      </View>

      <View
        style={{
          backgroundColor: colors.accent.green + '15',
          borderRadius: borderRadius.lg,
          padding: spacing.md,
          marginBottom: spacing.lg,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <CheckCircle size={20} color={colors.accent.green} />
          <Text
            style={{
              fontSize: fontSize.sm,
              color: colors.accent.green,
              fontWeight: fontWeight.medium,
              marginLeft: spacing.sm,
            }}
          >
            95%+ voice recognition accuracy
          </Text>
        </View>
      </View>

      <Button onPress={() => setStep('practice')}>
        Try It Yourself
      </Button>
    </View>
  );

  const renderPractice = () => (
    <View style={{ flex: 1, justifyContent: 'center', padding: spacing.xl }}>
      <Text
        style={{
          fontSize: fontSize.xl,
          fontWeight: fontWeight.bold,
          color: colors.text.primary,
          textAlign: 'center',
          marginBottom: spacing.sm,
        }}
      >
        Your Turn!
      </Text>

      <Text
        style={{
          fontSize: fontSize.base,
          color: colors.text.secondary,
          textAlign: 'center',
          marginBottom: spacing.xl,
        }}
      >
        Hold the mic button and try saying:
      </Text>

      <View
        style={{
          backgroundColor: colors.background.secondary,
          borderRadius: borderRadius.lg,
          padding: spacing.lg,
          marginBottom: spacing.xl,
        }}
      >
        <Text
          style={{
            fontSize: fontSize.lg,
            color: colors.text.primary,
            textAlign: 'center',
            fontStyle: 'italic',
          }}
        >
          "{EXAMPLE_COMMANDS[currentExample].command}"
        </Text>
      </View>

      {/* Mic button */}
      <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            onPressIn={handleMicPress}
            style={{
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: isListening ? colors.semantic.error : colors.accent.blue,
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: isListening ? colors.semantic.error : colors.accent.blue,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8,
            }}
          >
            {isListening ? (
              <Volume2 size={48} color={colors.text.onAccent} />
            ) : (
              <Mic size={48} color={colors.text.onAccent} />
            )}
          </TouchableOpacity>
        </Animated.View>

        <Text
          style={{
            fontSize: fontSize.sm,
            color: colors.text.tertiary,
            marginTop: spacing.md,
          }}
        >
          {isListening ? 'Listening...' : 'Tap and hold to speak'}
        </Text>
      </View>

      {practiceComplete && (
        <View
          style={{
            backgroundColor: colors.accent.green + '15',
            borderRadius: borderRadius.lg,
            padding: spacing.md,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CheckCircle size={20} color={colors.accent.green} />
          <Text
            style={{
              fontSize: fontSize.base,
              color: colors.accent.green,
              fontWeight: fontWeight.semibold,
              marginLeft: spacing.sm,
            }}
          >
            Perfect! You've got it!
          </Text>
        </View>
      )}

      <TouchableOpacity
        onPress={() => setStep('complete')}
        style={{ alignSelf: 'center', marginTop: spacing.lg }}
      >
        <Text style={{ fontSize: fontSize.sm, color: colors.text.tertiary }}>
          Skip practice
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderComplete = () => (
    <View style={{ flex: 1, justifyContent: 'center', padding: spacing.xl }}>
      <View
        style={{
          width: 100,
          height: 100,
          borderRadius: 50,
          backgroundColor: colors.accent.green + '20',
          justifyContent: 'center',
          alignItems: 'center',
          alignSelf: 'center',
          marginBottom: spacing.xl,
        }}
      >
        <CheckCircle size={48} color={colors.accent.green} />
      </View>

      <Text
        style={{
          fontSize: fontSize['2xl'],
          fontWeight: fontWeight.bold,
          color: colors.text.primary,
          textAlign: 'center',
          marginBottom: spacing.md,
        }}
      >
        You're Ready!
      </Text>

      <Text
        style={{
          fontSize: fontSize.base,
          color: colors.text.secondary,
          textAlign: 'center',
          lineHeight: 24,
          marginBottom: spacing.xl,
        }}
      >
        You can now log workouts with your voice from the Chat tab.
        Just tap the mic and speak naturally!
      </Text>

      <View
        style={{
          backgroundColor: colors.background.secondary,
          borderRadius: borderRadius.lg,
          padding: spacing.lg,
          marginBottom: spacing.xl,
        }}
      >
        <Text
          style={{
            fontSize: fontSize.sm,
            fontWeight: fontWeight.semibold,
            color: colors.text.primary,
            marginBottom: spacing.md,
          }}
        >
          Pro Tips:
        </Text>
        <View style={{ gap: spacing.sm }}>
          <Text style={{ fontSize: fontSize.sm, color: colors.text.secondary }}>
            • Speak clearly and at a normal pace
          </Text>
          <Text style={{ fontSize: fontSize.sm, color: colors.text.secondary }}>
            • Include exercise name, weight, sets, and reps
          </Text>
          <Text style={{ fontSize: fontSize.sm, color: colors.text.secondary }}>
            • You can correct mistakes by saying "undo" or "change that"
          </Text>
          <Text style={{ fontSize: fontSize.sm, color: colors.text.secondary }}>
            • Works for running too: "Log a 5K run in 25 minutes"
          </Text>
        </View>
      </View>

      <Button onPress={() => router.push('/(onboarding)/complete')}>
        Continue
      </Button>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
      {/* Progress dots */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          padding: spacing.md,
          gap: spacing.sm,
        }}
      >
        {(['intro', 'demo', 'practice', 'complete'] as TutorialStep[]).map((s) => (
          <View
            key={s}
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor:
                s === step
                  ? colors.accent.blue
                  : ['intro', 'demo', 'practice', 'complete'].indexOf(s) <
                    ['intro', 'demo', 'practice', 'complete'].indexOf(step)
                  ? colors.accent.green
                  : colors.background.tertiary,
            }}
          />
        ))}
      </View>

      {step === 'intro' && renderIntro()}
      {step === 'demo' && renderDemo()}
      {step === 'practice' && renderPractice()}
      {step === 'complete' && renderComplete()}
    </SafeAreaView>
  );
}
