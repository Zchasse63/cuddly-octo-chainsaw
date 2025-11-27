import { useState, useCallback, useRef, useEffect } from 'react';
import Voice, {
  SpeechResultsEvent,
  SpeechErrorEvent,
  SpeechStartEvent,
  SpeechEndEvent,
} from '@react-native-voice/voice';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export type VoiceRecorderState =
  | 'idle'
  | 'requesting_permission'
  | 'listening'
  | 'processing'
  | 'error';

interface UseVoiceRecorderOptions {
  onTranscript?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  locale?: string;
}

interface UseVoiceRecorderReturn {
  state: VoiceRecorderState;
  isListening: boolean;
  transcript: string;
  partialTranscript: string;
  error: string | null;
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  cancelListening: () => Promise<void>;
  isAvailable: boolean;
}

/**
 * useVoiceRecorder - Speech recognition hook using SF Speech Recognizer (iOS)
 *
 * Uses @react-native-voice/voice which wraps:
 * - iOS: SF Speech Framework (SFSpeechRecognizer)
 * - Android: Google Speech Recognition
 *
 * SF Speech provides:
 * - On-device recognition (iOS 13+)
 * - Real-time partial results
 * - High accuracy for fitness terminology
 */
export function useVoiceRecorder(options: UseVoiceRecorderOptions = {}): UseVoiceRecorderReturn {
  const {
    onTranscript,
    onError,
    locale = 'en-US',
  } = options;

  const [state, setState] = useState<VoiceRecorderState>('idle');
  const [transcript, setTranscript] = useState('');
  const [partialTranscript, setPartialTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);

  const isListeningRef = useRef(false);

  // Check availability on mount
  useEffect(() => {
    const checkAvailability = async () => {
      try {
        const available = await Voice.isAvailable();
        setIsAvailable(!!available);
      } catch {
        setIsAvailable(false);
      }
    };
    checkAvailability();
  }, []);

  // Set up Voice event listeners
  useEffect(() => {
    const onSpeechStart = (e: SpeechStartEvent) => {
      setState('listening');
      isListeningRef.current = true;
    };

    const onSpeechEnd = (e: SpeechEndEvent) => {
      if (isListeningRef.current) {
        setState('processing');
        isListeningRef.current = false;
      }
    };

    const onSpeechResults = (e: SpeechResultsEvent) => {
      const results = e.value;
      if (results && results.length > 0) {
        const finalTranscript = results[0];
        setTranscript(finalTranscript);
        setPartialTranscript('');
        onTranscript?.(finalTranscript, true);
        setState('idle');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    };

    const onSpeechPartialResults = (e: SpeechResultsEvent) => {
      const results = e.value;
      if (results && results.length > 0) {
        setPartialTranscript(results[0]);
        onTranscript?.(results[0], false);
      }
    };

    const onSpeechError = (e: SpeechErrorEvent) => {
      const errorMessage = e.error?.message || 'Speech recognition error';
      setError(errorMessage);
      setState('error');
      isListeningRef.current = false;
      onError?.(errorMessage);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    };

    const onSpeechVolumeChanged = (e: any) => {
      // Could use this for audio level visualization
      // e.value contains the volume level
    };

    // Register listeners
    Voice.onSpeechStart = onSpeechStart;
    Voice.onSpeechEnd = onSpeechEnd;
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechPartialResults = onSpeechPartialResults;
    Voice.onSpeechError = onSpeechError;
    Voice.onSpeechVolumeChanged = onSpeechVolumeChanged;

    // Cleanup
    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, [onTranscript, onError]);

  const startListening = useCallback(async () => {
    try {
      setError(null);
      setTranscript('');
      setPartialTranscript('');
      setState('requesting_permission');

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Start speech recognition
      // On iOS, this uses SFSpeechRecognizer
      await Voice.start(locale, {
        // iOS specific options
        RECOGNIZER_ENGINE: Platform.OS === 'ios' ? 'APPLE' : undefined,
        EXTRA_PARTIAL_RESULTS: true,
      });

      setState('listening');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start speech recognition';
      setError(errorMessage);
      setState('error');
      onError?.(errorMessage);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [locale, onError]);

  const stopListening = useCallback(async () => {
    try {
      await Voice.stop();
      setState('processing');
      isListeningRef.current = false;
    } catch (err) {
      // Ignore errors when stopping
      setState('idle');
    }
  }, []);

  const cancelListening = useCallback(async () => {
    try {
      await Voice.cancel();
      setState('idle');
      setTranscript('');
      setPartialTranscript('');
      isListeningRef.current = false;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (err) {
      setState('idle');
    }
  }, []);

  return {
    state,
    isListening: state === 'listening',
    transcript,
    partialTranscript,
    error,
    startListening,
    stopListening,
    cancelListening,
    isAvailable,
  };
}

// Utility to format duration
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Fitness-specific voice commands that SF Speech handles well:
 *
 * - "Bench press 185 for 8" → exercise: bench press, weight: 185, reps: 8
 * - "Squats 225 pounds 5 reps" → exercise: squats, weight: 225, reps: 5
 * - "Same weight 10 reps" → weight: (previous), reps: 10
 * - "Add 5 pounds" → modifier command
 * - "Done" / "Finished" → end set/workout
 *
 * SF Speech Recognizer advantages:
 * - On-device processing (iOS 13+) for privacy
 * - Low latency real-time results
 * - Works offline after initial setup
 * - Optimized for conversational speech
 */
