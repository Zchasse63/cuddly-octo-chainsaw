import { useState, useCallback, useRef, useEffect } from 'react';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system';

export type VoiceRecorderState =
  | 'idle'
  | 'requesting_permission'
  | 'recording'
  | 'processing'
  | 'error';

interface UseVoiceRecorderOptions {
  onTranscript?: (transcript: string) => void;
  onError?: (error: string) => void;
  maxDuration?: number; // in milliseconds
  silenceTimeout?: number; // auto-stop after silence (ms)
}

interface UseVoiceRecorderReturn {
  state: VoiceRecorderState;
  isRecording: boolean;
  duration: number;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  cancelRecording: () => Promise<void>;
  metering: number; // Audio level 0-1 for visualization
}

export function useVoiceRecorder(options: UseVoiceRecorderOptions = {}): UseVoiceRecorderReturn {
  const {
    onTranscript,
    onError,
    maxDuration = 30000, // 30 seconds default
    silenceTimeout = 2000, // 2 seconds of silence
  } = options;

  const [state, setState] = useState<VoiceRecorderState>('idle');
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [metering, setMetering] = useState(0);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxDurationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync();
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      if (maxDurationTimeoutRef.current) {
        clearTimeout(maxDurationTimeoutRef.current);
      }
    };
  }, []);

  const clearTimers = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    if (maxDurationTimeoutRef.current) {
      clearTimeout(maxDurationTimeoutRef.current);
      maxDurationTimeoutRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setState('requesting_permission');

      // Request permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Microphone permission not granted');
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Create and start recording
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      });

      // Set up metering callback
      recording.setOnRecordingStatusUpdate((status) => {
        if (status.isRecording && status.metering !== undefined) {
          // Convert dB to 0-1 scale (dB typically ranges from -160 to 0)
          const normalizedMetering = Math.max(0, Math.min(1, (status.metering + 60) / 60));
          setMetering(normalizedMetering);

          // Reset silence timeout when there's audio
          if (normalizedMetering > 0.1 && silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
            silenceTimeoutRef.current = setTimeout(() => {
              // Auto-stop after silence
              stopRecording();
            }, silenceTimeout);
          }
        }
      });

      await recording.startAsync();
      recordingRef.current = recording;

      setState('recording');
      setDuration(0);

      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Start duration counter
      const startTime = Date.now();
      durationIntervalRef.current = setInterval(() => {
        setDuration(Date.now() - startTime);
      }, 100);

      // Set max duration timeout
      maxDurationTimeoutRef.current = setTimeout(() => {
        stopRecording();
      }, maxDuration);

      // Initial silence timeout
      silenceTimeoutRef.current = setTimeout(() => {
        stopRecording();
      }, silenceTimeout);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start recording';
      setError(errorMessage);
      setState('error');
      onError?.(errorMessage);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [maxDuration, silenceTimeout, onError]);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    if (!recordingRef.current || state !== 'recording') {
      return null;
    }

    clearTimers();
    setState('processing');
    setMetering(0);

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      if (uri) {
        // In a real app, you'd send this to a speech-to-text service
        // For now, return the URI and let the caller handle transcription
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setState('idle');
        return uri;
      }

      setState('idle');
      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to stop recording';
      setError(errorMessage);
      setState('error');
      onError?.(errorMessage);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return null;
    }
  }, [state, clearTimers, onError]);

  const cancelRecording = useCallback(async () => {
    if (!recordingRef.current) {
      setState('idle');
      return;
    }

    clearTimers();
    setMetering(0);

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      // Delete the recording file
      if (uri) {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      }

      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      setState('idle');
      setDuration(0);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (err) {
      setState('idle');
    }
  }, [clearTimers]);

  return {
    state,
    isRecording: state === 'recording',
    duration,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
    metering,
  };
}

// Utility to format duration
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}
