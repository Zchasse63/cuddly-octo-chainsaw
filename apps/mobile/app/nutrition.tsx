import { View, Text, ScrollView, TouchableOpacity, TextInput, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ArrowLeft,
  Plus,
  Droplets,
  Apple,
  Beef,
  Cookie,
  Flame,
  Target,
  TrendingUp,
  ChevronRight,
} from 'lucide-react-native';
import { useTheme } from '../src/theme/ThemeContext';
import { Card, Button } from '../src/components/ui';
import { api } from '../src/lib/trpc';
import { spacing, fontSize, fontWeight, borderRadius } from '../src/theme/tokens';

export default function NutritionScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [localWaterGlasses, setLocalWaterGlasses] = useState(0);

  // Fetch today's nutrition data
  const { data: todayNutrition, refetch } = api.nutrition.getToday.useQuery();
  const { data: goals } = api.nutrition.getGoals.useQuery();

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleLogWater = () => {
    // Water tracking is local for now - backend doesn't have logWater endpoint
    setLocalWaterGlasses((prev) => prev + 1);
  };

  const caloriesGoal = goals?.targetCalories || 2000;
  const proteinGoal = goals?.targetProtein || 150;
  const carbsGoal = goals?.targetCarbohydrates || 250;
  const fatGoal = goals?.targetFat || 65;
  const waterGoal = 8; // Default water goal

  const calories = todayNutrition?.calories || 0;
  const protein = todayNutrition?.protein || 0;
  const carbs = todayNutrition?.carbohydrates || 0;
  const fat = todayNutrition?.fat || 0;
  const water = localWaterGlasses;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: colors.border.light,
        }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text
          style={{
            flex: 1,
            fontSize: fontSize.xl,
            fontWeight: fontWeight.bold,
            color: colors.text.primary,
            marginLeft: spacing.md,
          }}
        >
          Nutrition
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/log-meal')}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: colors.accent.blue,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Plus size={20} color={colors.text.onAccent} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.md }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Calories Card */}
        <Card style={{ marginBottom: spacing.lg }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: fontSize.sm, color: colors.text.tertiary, marginBottom: spacing.xs }}>
              Today's Calories
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <Text style={{ fontSize: fontSize['4xl'], fontWeight: fontWeight.bold, color: colors.text.primary }}>
                {calories}
              </Text>
              <Text style={{ fontSize: fontSize.lg, color: colors.text.tertiary, marginLeft: spacing.xs }}>
                / {caloriesGoal}
              </Text>
            </View>

            {/* Progress Ring Placeholder */}
            <View
              style={{
                width: 120,
                height: 120,
                borderRadius: 60,
                borderWidth: 8,
                borderColor: colors.background.tertiary,
                justifyContent: 'center',
                alignItems: 'center',
                marginVertical: spacing.md,
                position: 'relative',
              }}
            >
              <View
                style={{
                  position: 'absolute',
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  borderWidth: 8,
                  borderColor: colors.accent.blue,
                  borderRightColor: 'transparent',
                  borderBottomColor: 'transparent',
                  transform: [{ rotate: `${(calories / caloriesGoal) * 360}deg` }],
                }}
              />
              <Flame size={32} color={colors.accent.blue} />
            </View>

            <Text style={{ fontSize: fontSize.sm, color: colors.text.secondary }}>
              {caloriesGoal - calories > 0 ? `${caloriesGoal - calories} remaining` : 'Goal reached!'}
            </Text>
          </View>
        </Card>

        {/* Macros Row */}
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
          <MacroCard
            icon={<Beef size={20} color="#FF6B6B" />}
            label="Protein"
            value={protein}
            goal={proteinGoal}
            unit="g"
            color="#FF6B6B"
            colors={colors}
          />
          <MacroCard
            icon={<Cookie size={20} color="#FFE66D" />}
            label="Carbs"
            value={carbs}
            goal={carbsGoal}
            unit="g"
            color="#FFE66D"
            colors={colors}
          />
          <MacroCard
            icon={<Apple size={20} color="#4ECDC4" />}
            label="Fat"
            value={fat}
            goal={fatGoal}
            unit="g"
            color="#4ECDC4"
            colors={colors}
          />
        </View>

        {/* Water Tracking */}
        <Card style={{ marginBottom: spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
            <Droplets size={20} color="#4ECDC4" />
            <Text
              style={{
                fontSize: fontSize.base,
                fontWeight: fontWeight.semibold,
                color: colors.text.primary,
                marginLeft: spacing.xs,
              }}
            >
              Water Intake
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <Text style={{ fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: colors.text.primary }}>
                  {water}
                </Text>
                <Text style={{ fontSize: fontSize.base, color: colors.text.tertiary, marginLeft: spacing.xs }}>
                  / {waterGoal} glasses
                </Text>
              </View>
              <Text style={{ fontSize: fontSize.sm, color: colors.text.tertiary }}>
                {water * 250}ml / {waterGoal * 250}ml
              </Text>
            </View>
            <Button
              size="sm"
              onPress={handleLogWater}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Plus size={16} color={colors.text.onAccent} />
                <Text style={{ color: colors.text.onAccent, marginLeft: spacing.xs }}>Add Glass</Text>
              </View>
            </Button>
          </View>

          {/* Water Progress */}
          <View
            style={{
              flexDirection: 'row',
              gap: spacing.xs,
              marginTop: spacing.md,
            }}
          >
            {Array.from({ length: waterGoal }).map((_, i) => (
              <View
                key={i}
                style={{
                  flex: 1,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: i < water ? '#4ECDC4' : colors.background.tertiary,
                }}
              />
            ))}
          </View>
        </Card>

        {/* Quick Actions */}
        <TouchableOpacity
          onPress={() => router.push('/log-meal')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: spacing.md,
            backgroundColor: colors.background.secondary,
            borderRadius: borderRadius.lg,
            marginBottom: spacing.sm,
          }}
        >
          <Plus size={20} color={colors.accent.blue} />
          <Text
            style={{
              flex: 1,
              fontSize: fontSize.base,
              color: colors.text.primary,
              marginLeft: spacing.md,
            }}
          >
            Log a Meal
          </Text>
          <ChevronRight size={20} color={colors.icon.secondary} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/nutrition-history')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: spacing.md,
            backgroundColor: colors.background.secondary,
            borderRadius: borderRadius.lg,
            marginBottom: spacing.sm,
          }}
        >
          <TrendingUp size={20} color={colors.accent.blue} />
          <Text
            style={{
              flex: 1,
              fontSize: fontSize.base,
              color: colors.text.primary,
              marginLeft: spacing.md,
            }}
          >
            View History
          </Text>
          <ChevronRight size={20} color={colors.icon.secondary} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/nutrition-goals')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: spacing.md,
            backgroundColor: colors.background.secondary,
            borderRadius: borderRadius.lg,
          }}
        >
          <Target size={20} color={colors.accent.blue} />
          <Text
            style={{
              flex: 1,
              fontSize: fontSize.base,
              color: colors.text.primary,
              marginLeft: spacing.md,
            }}
          >
            Set Goals
          </Text>
          <ChevronRight size={20} color={colors.icon.secondary} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function MacroCard({
  icon,
  label,
  value,
  goal,
  unit,
  color,
  colors,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  goal: number;
  unit: string;
  color: string;
  colors: any;
}) {
  const percentage = Math.min((value / goal) * 100, 100);

  return (
    <Card style={{ flex: 1 }}>
      <View style={{ alignItems: 'center' }}>
        {icon}
        <Text
          style={{
            fontSize: fontSize.lg,
            fontWeight: fontWeight.bold,
            color: colors.text.primary,
            marginTop: spacing.xs,
          }}
        >
          {value}
          <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>{unit}</Text>
        </Text>
        <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>{label}</Text>

        {/* Progress bar */}
        <View
          style={{
            width: '100%',
            height: 4,
            borderRadius: 2,
            backgroundColor: colors.background.tertiary,
            marginTop: spacing.sm,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              width: `${percentage}%`,
              height: '100%',
              backgroundColor: color,
              borderRadius: 2,
            }}
          />
        </View>
        <Text style={{ fontSize: 10, color: colors.text.tertiary, marginTop: 2 }}>
          / {goal}{unit}
        </Text>
      </View>
    </Card>
  );
}
