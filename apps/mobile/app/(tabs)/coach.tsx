import { View, Text, TextInput, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useRef } from 'react';
import { Send, Bot, User as UserIcon } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../src/theme/ThemeContext';
import { Button, Card } from '../../src/components/ui';
import { useAuthStore } from '../../src/stores/auth';
import { api } from '../../src/lib/trpc';
import { spacing, fontSize, fontWeight, borderRadius } from '../../src/theme/tokens';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function CoachScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hey! I'm your AI fitness coach. Ask me anything about training, nutrition, or recovery. 💪",
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Chat mutation
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
    onError: (error) => {
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

  const handleSend = () => {
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
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';

    return (
      <View
        style={{
          flexDirection: 'row',
          justifyContent: isUser ? 'flex-end' : 'flex-start',
          marginBottom: spacing.sm,
          paddingHorizontal: spacing.sm,
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
  };

  if (!user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        {/* Header */}
        <View
          style={{
            padding: spacing.md,
            borderBottomWidth: 1,
            borderBottomColor: colors.border.light,
          }}
        >
          <Text
            style={{
              fontSize: fontSize.xl,
              fontWeight: fontWeight.bold,
              color: colors.text.primary,
            }}
          >
            AI Coach
          </Text>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingVertical: spacing.md }}
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
            borderTopWidth: 1,
            borderTopColor: colors.border.light,
            backgroundColor: colors.background.primary,
            gap: spacing.sm,
          }}
        >
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
          <Button
            onPress={handleSend}
            disabled={!inputText.trim() || isLoading}
            rightIcon={<Send size={18} color={colors.text.onAccent} />}
          >
            Send
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
