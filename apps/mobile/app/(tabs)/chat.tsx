import { View, Text, TextInput, FlatList, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useRef, useCallback } from 'react';
import { Send, Bot, User as UserIcon, Mic, MicOff } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../src/theme/ThemeContext';
import { Button } from '../../src/components/ui';
import { useAuthStore } from '../../src/stores/auth';
import { api } from '../../src/lib/trpc';
import { spacing, fontSize, fontWeight, borderRadius } from '../../src/theme/tokens';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export default function ChatScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hey! I'm your AI fitness coach. I can help you log workouts, answer training questions, create programs, and more. What would you like to do?",
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

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
        content: "Sorry, I couldn't process that request. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      setIsLoading(false);
    },
  });

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

    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [inputText, isLoading, chatMutation]);

  const handleVoicePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsRecording(!isRecording);
    // Voice recording would be implemented with expo-av
  };

  const renderMessage = useCallback(({ item }: { item: Message }) => {
    const isUser = item.role === 'user';

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
          contentContainerStyle={{ paddingVertical: spacing.md, paddingBottom: 100 }}
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
          {/* Voice button */}
          <TouchableOpacity
            onPress={handleVoicePress}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: isRecording ? colors.accent.red : colors.background.secondary,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {isRecording ? (
              <MicOff size={20} color={colors.text.onAccent} />
            ) : (
              <Mic size={20} color={colors.icon.secondary} />
            )}
          </TouchableOpacity>

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
            placeholder="Ask me anything..."
            placeholderTextColor={colors.text.disabled}
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />

          {/* Send button */}
          <TouchableOpacity
            onPress={handleSend}
            disabled={!inputText.trim() || isLoading}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: inputText.trim() ? colors.accent.blue : colors.background.secondary,
              justifyContent: 'center',
              alignItems: 'center',
              opacity: inputText.trim() && !isLoading ? 1 : 0.5,
            }}
          >
            <Send size={20} color={inputText.trim() ? colors.text.onAccent : colors.icon.disabled} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
