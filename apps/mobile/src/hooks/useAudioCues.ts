import { useRef, useCallback, useEffect } from 'react';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { Platform } from 'react-native';

// Audio cue types for running intervals
export type AudioCueType =
  | 'interval_start'
  | 'interval_end'
  | 'rest_start'
  | 'rest_end'
  | 'halfway'
  | 'countdown_3'
  | 'countdown_2'
  | 'countdown_1'
  | 'workout_complete'
  | 'lap_complete'
  | 'pace_alert_fast'
  | 'pace_alert_slow';

// Voice announcement content
type VoiceAnnouncement = {
  text: string;
  priority: 'high' | 'medium' | 'low';
};

// Audio cue configuration
type AudioCueConfig = {
  enabled: boolean;
  volume: number;
  voiceEnabled: boolean;
  hapticEnabled: boolean;
};

const DEFAULT_CONFIG: AudioCueConfig = {
  enabled: true,
  volume: 1.0,
  voiceEnabled: true,
  hapticEnabled: true,
};

// Sound file mappings (would be bundled assets in production)
const SOUND_FILES: Record<AudioCueType, string> = {
  interval_start: 'interval_start.mp3',
  interval_end: 'interval_end.mp3',
  rest_start: 'rest_start.mp3',
  rest_end: 'rest_end.mp3',
  halfway: 'halfway.mp3',
  countdown_3: 'countdown_3.mp3',
  countdown_2: 'countdown_2.mp3',
  countdown_1: 'countdown_1.mp3',
  workout_complete: 'workout_complete.mp3',
  lap_complete: 'lap_complete.mp3',
  pace_alert_fast: 'pace_fast.mp3',
  pace_alert_slow: 'pace_slow.mp3',
};

// Voice announcement templates
const VOICE_TEMPLATES: Partial<Record<AudioCueType, string>> = {
  interval_start: 'Go! Start your interval now.',
  interval_end: 'Interval complete. Great job!',
  rest_start: 'Rest period. Recover and prepare for the next interval.',
  rest_end: 'Rest over. Get ready!',
  halfway: "Halfway there. You're doing great!",
  countdown_3: 'Three',
  countdown_2: 'Two',
  countdown_1: 'One',
  workout_complete: 'Workout complete! Excellent work!',
  lap_complete: 'Lap complete.',
  pace_alert_fast: "You're running fast. Consider slowing down.",
  pace_alert_slow: 'Pick up the pace.',
};

export function useAudioCues(config: Partial<AudioCueConfig> = {}) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const speechQueue = useRef<VoiceAnnouncement[]>([]);
  const isSpeaking = useRef(false);
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  // Initialize audio session
  useEffect(() => {
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } catch (error) {
        console.error('Failed to setup audio:', error);
      }
    };

    setupAudio();

    return () => {
      soundRef.current?.unloadAsync();
    };
  }, []);

  // Play a sound effect
  const playSound = useCallback(
    async (cueType: AudioCueType) => {
      if (!mergedConfig.enabled) return;

      try {
        // Unload previous sound
        if (soundRef.current) {
          await soundRef.current.unloadAsync();
        }

        // In production, this would load from bundled assets
        // For now, we'll use a placeholder approach
        const soundFile = SOUND_FILES[cueType];

        // Create and play sound
        // Note: In real implementation, you'd use:
        // const { sound } = await Audio.Sound.createAsync(
        //   require(`../assets/sounds/${soundFile}`)
        // );

        // Placeholder: Log the sound that would play
        console.log(`[Audio] Would play: ${soundFile}`);

        // Trigger haptic feedback
        if (mergedConfig.hapticEnabled) {
          triggerHaptic(cueType);
        }
      } catch (error) {
        console.error('Failed to play sound:', error);
      }
    },
    [mergedConfig.enabled, mergedConfig.hapticEnabled]
  );

  // Speak a text announcement using TTS
  const speak = useCallback(
    async (text: string, priority: 'high' | 'medium' | 'low' = 'medium') => {
      if (!mergedConfig.enabled || !mergedConfig.voiceEnabled) return;

      // Add to queue
      speechQueue.current.push({ text, priority });

      // Process queue if not already speaking
      if (!isSpeaking.current) {
        processSpeedQueue();
      }
    },
    [mergedConfig.enabled, mergedConfig.voiceEnabled]
  );

  // Process the speech queue
  const processSpeedQueue = useCallback(async () => {
    if (speechQueue.current.length === 0) {
      isSpeaking.current = false;
      return;
    }

    isSpeaking.current = true;

    // Sort by priority
    speechQueue.current.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    const announcement = speechQueue.current.shift();
    if (!announcement) {
      isSpeaking.current = false;
      return;
    }

    // In production, use expo-speech or react-native-tts
    // import * as Speech from 'expo-speech';
    // await Speech.speak(announcement.text, {
    //   language: 'en-US',
    //   pitch: 1.0,
    //   rate: 1.0,
    //   volume: mergedConfig.volume,
    //   onDone: () => processSpeedQueue(),
    // });

    // Placeholder: Log the text that would be spoken
    console.log(`[TTS] Would speak: ${announcement.text}`);

    // Simulate speech duration
    await new Promise((resolve) => setTimeout(resolve, 1000));
    processSpeedQueue();
  }, [mergedConfig.volume]);

  // Play audio cue with optional voice
  const playCue = useCallback(
    async (cueType: AudioCueType, customText?: string) => {
      if (!mergedConfig.enabled) return;

      // Play sound effect
      await playSound(cueType);

      // Speak announcement
      if (mergedConfig.voiceEnabled) {
        const text = customText || VOICE_TEMPLATES[cueType];
        if (text) {
          const priority = ['interval_start', 'interval_end', 'workout_complete'].includes(cueType)
            ? 'high'
            : 'medium';
          speak(text, priority);
        }
      }
    },
    [mergedConfig.enabled, mergedConfig.voiceEnabled, playSound, speak]
  );

  // Announce interval information
  const announceInterval = useCallback(
    (intervalNumber: number, totalIntervals: number, targetPace?: string) => {
      let text = `Interval ${intervalNumber} of ${totalIntervals}.`;
      if (targetPace) {
        text += ` Target pace: ${targetPace}.`;
      }
      speak(text, 'high');
    },
    [speak]
  );

  // Announce time remaining
  const announceTimeRemaining = useCallback(
    (seconds: number) => {
      if (seconds === 60) {
        speak('One minute remaining.', 'medium');
      } else if (seconds === 30) {
        speak('Thirty seconds remaining.', 'medium');
      } else if (seconds === 10) {
        speak('Ten seconds.', 'high');
      } else if (seconds <= 3 && seconds > 0) {
        playCue(`countdown_${seconds}` as AudioCueType);
      }
    },
    [speak, playCue]
  );

  // Announce current pace
  const announcePace = useCallback(
    (currentPace: string, targetPace?: string) => {
      let text = `Current pace: ${currentPace}.`;
      if (targetPace) {
        // Parse paces and compare (simplified)
        text += ` Target: ${targetPace}.`;
      }
      speak(text, 'low');
    },
    [speak]
  );

  // Announce distance
  const announceDistance = useCallback(
    (distance: number, unit: 'mi' | 'km') => {
      const rounded = Math.round(distance * 10) / 10;
      speak(`${rounded} ${unit === 'mi' ? 'miles' : 'kilometers'}.`, 'low');
    },
    [speak]
  );

  // Stop all audio
  const stopAll = useCallback(async () => {
    speechQueue.current = [];
    isSpeaking.current = false;
    if (soundRef.current) {
      await soundRef.current.stopAsync();
    }
    // In production: Speech.stop();
  }, []);

  return {
    playCue,
    playSound,
    speak,
    announceInterval,
    announceTimeRemaining,
    announcePace,
    announceDistance,
    stopAll,
    isEnabled: mergedConfig.enabled,
    isVoiceEnabled: mergedConfig.voiceEnabled,
  };
}

// Trigger haptic feedback based on cue type
function triggerHaptic(cueType: AudioCueType) {
  // In production, use expo-haptics:
  // import * as Haptics from 'expo-haptics';
  //
  // switch (cueType) {
  //   case 'interval_start':
  //   case 'interval_end':
  //     Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  //     break;
  //   case 'countdown_1':
  //     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  //     break;
  //   case 'countdown_2':
  //   case 'countdown_3':
  //     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  //     break;
  //   case 'pace_alert_fast':
  //   case 'pace_alert_slow':
  //     Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  //     break;
  //   default:
  //     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  // }

  console.log(`[Haptic] Would trigger for: ${cueType}`);
}

export default useAudioCues;
