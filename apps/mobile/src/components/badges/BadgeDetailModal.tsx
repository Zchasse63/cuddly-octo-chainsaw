import React from 'react';
import { View, Text, Modal, TouchableOpacity, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { X, Award, Lock, Check } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, fontSize, fontWeight, borderRadius, medalColors } from '../../theme/tokens';

interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  badgeType: string;
  tier: string;
  criteria?: Record<string, unknown>;
}

interface BadgeDetailModalProps {
  visible: boolean;
  onClose: () => void;
  badge: (BadgeDefinition & { earned?: boolean; earnedAt?: Date | string | null }) | null;
}

const tierColorMap: Record<string, string> = {
  bronze: medalColors.bronze,
  silver: medalColors.silver,
  gold: medalColors.gold,
  diamond: '#B9F2FF',
  platinum: medalColors.platinum,
};

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getCriteriaText(criteria: Record<string, unknown> | undefined): string {
  if (!criteria) return '';
  const type = criteria.type as string;
  const value = criteria.value as number;

  switch (type) {
    case 'workout_count':
      return `Complete ${value} workout${value === 1 ? '' : 's'}`;
    case 'total_volume':
      return `Lift ${value.toLocaleString()} lbs total volume`;
    case 'pr_count':
      return `Set ${value} personal record${value === 1 ? '' : 's'}`;
    case 'run_count':
      return `Complete ${value} run${value === 1 ? '' : 's'}`;
    case 'total_distance':
      return `Run ${value} miles total`;
    case 'single_run_distance':
      return `Complete a ${value} mile run`;
    case 'workout_streak':
      return `Maintain a ${value} day workout streak`;
    default:
      return '';
  }
}

export function BadgeDetailModal({ visible, onClose, badge }: BadgeDetailModalProps) {
  const { colors } = useTheme();

  if (!badge) return null;

  const tierColor = tierColorMap[badge.tier] || colors.text.tertiary;
  const isEarned = badge.earned === true;

  const BackgroundComponent = Platform.OS === 'ios' ? BlurView : View;
  const backgroundProps = Platform.OS === 'ios'
    ? { intensity: 80, tint: 'dark' as const }
    : { style: { backgroundColor: 'rgba(0,0,0,0.8)' } };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <BackgroundComponent
        {...backgroundProps}
        style={[
          { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
          Platform.OS !== 'ios' && { backgroundColor: 'rgba(0,0,0,0.8)' },
        ]}
      >
        <View
          style={{
            backgroundColor: colors.background.primary,
            borderRadius: borderRadius.xl,
            padding: spacing.xl,
            width: '100%',
            maxWidth: 320,
            alignItems: 'center',
          }}
        >
          {/* Close Button */}
          <TouchableOpacity
            onPress={onClose}
            style={{
              position: 'absolute',
              top: spacing.sm,
              right: spacing.sm,
              padding: spacing.xs,
            }}
          >
            <X size={24} color={colors.text.tertiary} />
          </TouchableOpacity>

          {/* Badge Icon */}
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: isEarned ? tierColor + '20' : colors.background.tertiary,
              borderWidth: 3,
              borderColor: isEarned ? tierColor : colors.border.light,
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: spacing.md,
            }}
          >
            {isEarned ? (
              <Award size={40} color={tierColor} />
            ) : (
              <Lock size={32} color={colors.text.disabled} />
            )}
          </View>

          {/* Badge Name */}
          <Text
            style={{
              fontSize: fontSize['2xl'],
              fontWeight: fontWeight.bold,
              color: colors.text.primary,
              textAlign: 'center',
              marginBottom: spacing.xs,
            }}
          >
            {badge.name}
          </Text>

          {/* Tier Chip */}
          <View
            style={{
              backgroundColor: tierColor + '20',
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.xs,
              borderRadius: borderRadius.full,
              marginBottom: spacing.md,
            }}
          >
            <Text
              style={{
                fontSize: fontSize.sm,
                fontWeight: fontWeight.semibold,
                color: tierColor,
                textTransform: 'capitalize',
              }}
            >
              {badge.tier}
            </Text>
          </View>

          {/* Description */}
          <Text
            style={{
              fontSize: fontSize.base,
              color: colors.text.secondary,
              textAlign: 'center',
              marginBottom: spacing.md,
            }}
          >
            {badge.description}
          </Text>

          {/* Criteria */}
          {badge.criteria && (
            <Text
              style={{
                fontSize: fontSize.sm,
                color: colors.text.tertiary,
                textAlign: 'center',
                marginBottom: spacing.md,
              }}
            >
              {getCriteriaText(badge.criteria)}
            </Text>
          )}

          {/* Earned Status */}
          {isEarned ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Check size={16} color={colors.status.success} />
              <Text style={{ fontSize: fontSize.sm, color: colors.status.success }}>
                Earned on {formatDate(badge.earnedAt)}
              </Text>
            </View>
          ) : (
            <Text
              style={{
                fontSize: fontSize.sm,
                color: colors.text.tertiary,
                fontStyle: 'italic',
              }}
            >
              Keep going!
            </Text>
          )}
        </View>
      </BackgroundComponent>
    </Modal>
  );
}
