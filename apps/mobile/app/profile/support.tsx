import { View, Text, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  MessageCircle,
  Mail,
  FileText,
  Shield,
  Star,
  Bug,
  ExternalLink,
  BookOpen,
  Youtube,
} from 'lucide-react-native';
import { useTheme } from '../../src/theme/ThemeContext';
import { spacing, fontSize, fontWeight, borderRadius } from '../../src/theme/tokens';

type FAQItem = {
  question: string;
  answer: string;
};

export default function SupportScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

  const faqs: FAQItem[] = [
    {
      question: 'How do I log a workout with voice?',
      answer:
        'Go to the Chat tab and tap the microphone button. Speak naturally about your workout, like "I did 3 sets of bench press at 135 pounds for 10 reps". The AI will parse your input and create the workout entry.',
    },
    {
      question: 'How does the readiness score work?',
      answer:
        'Your readiness score is calculated based on your sleep, recovery, stress levels, and previous training load. Complete the morning check-in daily to get accurate readiness assessments.',
    },
    {
      question: 'Can I use VoiceFit offline?',
      answer:
        'Yes! VoiceFit works offline. Your data will sync automatically when you reconnect to the internet. Voice logging requires an internet connection for AI processing.',
    },
    {
      question: 'How do I connect my wearable device?',
      answer:
        'Go to Profile → Wearables & Apps and select your device from the available integrations. Follow the prompts to authorize the connection.',
    },
    {
      question: 'What is the AI Coach?',
      answer:
        "The AI Coach analyzes your workout history, recovery data, and goals to provide personalized training recommendations, form tips, and motivation. Access it anytime through the Chat tab.",
    },
  ];

  const supportLinks = [
    {
      icon: BookOpen,
      label: 'User Guide',
      description: 'Learn how to use VoiceFit',
      onPress: () => Linking.openURL('https://voicefit.app/guide'),
    },
    {
      icon: Youtube,
      label: 'Video Tutorials',
      description: 'Watch how-to videos',
      onPress: () => Linking.openURL('https://youtube.com/@voicefit'),
    },
    {
      icon: MessageCircle,
      label: 'Live Chat',
      description: 'Chat with our support team',
      onPress: () => {
        // TODO: Open intercom or chat widget
      },
    },
    {
      icon: Mail,
      label: 'Email Support',
      description: 'support@voicefit.app',
      onPress: () => Linking.openURL('mailto:support@voicefit.app'),
    },
  ];

  const legalLinks = [
    {
      icon: FileText,
      label: 'Terms of Service',
      onPress: () => Linking.openURL('https://voicefit.app/terms'),
    },
    {
      icon: Shield,
      label: 'Privacy Policy',
      onPress: () => Linking.openURL('https://voicefit.app/privacy'),
    },
  ];

  const SupportLink = ({
    icon: Icon,
    label,
    description,
    onPress,
  }: {
    icon: any;
    label: string;
    description?: string;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.sm,
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: borderRadius.md,
          backgroundColor: colors.accent.blue + '20',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Icon size={22} color={colors.accent.blue} />
      </View>
      <View style={{ flex: 1, marginLeft: spacing.md }}>
        <Text
          style={{
            fontSize: fontSize.base,
            fontWeight: fontWeight.medium,
            color: colors.text.primary,
          }}
        >
          {label}
        </Text>
        {description && (
          <Text
            style={{
              fontSize: fontSize.sm,
              color: colors.text.tertiary,
              marginTop: 2,
            }}
          >
            {description}
          </Text>
        )}
      </View>
      <ExternalLink size={18} color={colors.text.tertiary} />
    </TouchableOpacity>
  );

  const FAQAccordion = ({ item, index }: { item: FAQItem; index: number }) => {
    const isExpanded = expandedFAQ === index;

    return (
      <TouchableOpacity
        onPress={() => setExpandedFAQ(isExpanded ? null : index)}
        style={{
          backgroundColor: colors.background.secondary,
          borderRadius: borderRadius.lg,
          padding: spacing.md,
          marginBottom: spacing.sm,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <HelpCircle size={20} color={colors.accent.purple} />
          <Text
            style={{
              flex: 1,
              fontSize: fontSize.base,
              fontWeight: fontWeight.medium,
              color: colors.text.primary,
              marginLeft: spacing.sm,
            }}
          >
            {item.question}
          </Text>
          <ChevronRight
            size={20}
            color={colors.text.tertiary}
            style={{
              transform: [{ rotate: isExpanded ? '90deg' : '0deg' }],
            }}
          />
        </View>
        {isExpanded && (
          <Text
            style={{
              fontSize: fontSize.sm,
              color: colors.text.secondary,
              lineHeight: 22,
              marginTop: spacing.md,
              paddingLeft: spacing.xl + spacing.sm,
            }}
          >
            {item.answer}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: colors.border.primary,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: spacing.md }}>
          <ChevronLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text
          style={{
            fontSize: fontSize.lg,
            fontWeight: fontWeight.semibold,
            color: colors.text.primary,
          }}
        >
          Help & Support
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg }}>
        {/* FAQ Section */}
        <Text
          style={{
            fontSize: fontSize.sm,
            fontWeight: fontWeight.semibold,
            color: colors.text.secondary,
            textTransform: 'uppercase',
            letterSpacing: 1,
            marginBottom: spacing.md,
          }}
        >
          Frequently Asked Questions
        </Text>

        {faqs.map((faq, index) => (
          <FAQAccordion key={index} item={faq} index={index} />
        ))}

        {/* Support Links */}
        <Text
          style={{
            fontSize: fontSize.sm,
            fontWeight: fontWeight.semibold,
            color: colors.text.secondary,
            textTransform: 'uppercase',
            letterSpacing: 1,
            marginTop: spacing.lg,
            marginBottom: spacing.md,
          }}
        >
          Get Help
        </Text>

        {supportLinks.map((link, index) => (
          <SupportLink key={index} {...link} />
        ))}

        {/* Feedback */}
        <Text
          style={{
            fontSize: fontSize.sm,
            fontWeight: fontWeight.semibold,
            color: colors.text.secondary,
            textTransform: 'uppercase',
            letterSpacing: 1,
            marginTop: spacing.lg,
            marginBottom: spacing.md,
          }}
        >
          Feedback
        </Text>

        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.accent.yellow + '20',
            borderRadius: borderRadius.lg,
            padding: spacing.md,
            marginBottom: spacing.sm,
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: borderRadius.md,
              backgroundColor: colors.accent.yellow + '30',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Star size={22} color={colors.accent.yellow} />
          </View>
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text
              style={{
                fontSize: fontSize.base,
                fontWeight: fontWeight.medium,
                color: colors.text.primary,
              }}
            >
              Rate VoiceFit
            </Text>
            <Text
              style={{
                fontSize: fontSize.sm,
                color: colors.text.tertiary,
                marginTop: 2,
              }}
            >
              Help us improve with your feedback
            </Text>
          </View>
          <ChevronRight size={18} color={colors.text.tertiary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.background.secondary,
            borderRadius: borderRadius.lg,
            padding: spacing.md,
            marginBottom: spacing.sm,
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: borderRadius.md,
              backgroundColor: colors.semantic.error + '20',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Bug size={22} color={colors.semantic.error} />
          </View>
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text
              style={{
                fontSize: fontSize.base,
                fontWeight: fontWeight.medium,
                color: colors.text.primary,
              }}
            >
              Report a Bug
            </Text>
            <Text
              style={{
                fontSize: fontSize.sm,
                color: colors.text.tertiary,
                marginTop: 2,
              }}
            >
              Let us know about any issues
            </Text>
          </View>
          <ChevronRight size={18} color={colors.text.tertiary} />
        </TouchableOpacity>

        {/* Legal */}
        <Text
          style={{
            fontSize: fontSize.sm,
            fontWeight: fontWeight.semibold,
            color: colors.text.secondary,
            textTransform: 'uppercase',
            letterSpacing: 1,
            marginTop: spacing.lg,
            marginBottom: spacing.md,
          }}
        >
          Legal
        </Text>

        {legalLinks.map((link, index) => (
          <TouchableOpacity
            key={index}
            onPress={link.onPress}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.background.secondary,
              borderRadius: borderRadius.lg,
              padding: spacing.md,
              marginBottom: spacing.sm,
            }}
          >
            <link.icon size={20} color={colors.text.secondary} />
            <Text
              style={{
                flex: 1,
                fontSize: fontSize.base,
                color: colors.text.primary,
                marginLeft: spacing.md,
              }}
            >
              {link.label}
            </Text>
            <ExternalLink size={18} color={colors.text.tertiary} />
          </TouchableOpacity>
        ))}

        {/* App Version */}
        <View style={{ alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.lg }}>
          <Text style={{ fontSize: fontSize.sm, color: colors.text.tertiary }}>
            VoiceFit v1.0.0
          </Text>
          <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary, marginTop: spacing.xs }}>
            Made with ❤️ for fitness enthusiasts
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
