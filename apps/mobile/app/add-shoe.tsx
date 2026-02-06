import { View, Text, TextInput, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ArrowLeft,
  Footprints,
  Calendar,
  Check,
} from 'lucide-react-native';
import { useTheme } from '../src/theme/ThemeContext';
import { Card, Button } from '../src/components/ui';
import { api } from '../src/lib/trpc';
import { useDistanceUnit } from '../src/stores/profile';
import { spacing, fontSize, fontWeight, borderRadius } from '../src/theme/tokens';

const SHOE_BRANDS = [
  'Nike',
  'Adidas',
  'Brooks',
  'ASICS',
  'New Balance',
  'Saucony',
  'Hoka',
  'On Running',
  'Altra',
  'Mizuno',
  'Other',
];

const SHOE_TYPES = [
  { id: 'daily', label: 'Daily Trainer', description: 'All-purpose training shoe' },
  { id: 'speed', label: 'Speed/Racing', description: 'Lightweight racing flats' },
  { id: 'trail', label: 'Trail', description: 'Off-road running' },
  { id: 'stability', label: 'Stability', description: 'Motion control support' },
  { id: 'recovery', label: 'Recovery', description: 'Easy/recovery runs' },
];

export default function AddShoeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const distanceUnit = useDistanceUnit();

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [shoeType, setShoeType] = useState('daily');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [initialMileage, setInitialMileage] = useState('0');
  const [maxMileage, setMaxMileage] = useState(distanceUnit === 'mi' ? '400' : '650');
  const [notes, setNotes] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  const createShoeMutation = api.shoes.create.useMutation({
    onSuccess: () => {
      router.back();
    },
    onError: (error) => {
      Alert.alert('Error', error.message || 'Failed to add shoe');
    },
  });

  const handleSave = () => {
    if (!brand.trim() || !model.trim()) {
      Alert.alert('Error', 'Please enter brand and model');
      return;
    }

    // Validate maxMileage > initialMileage
    const initialMiles = parseFloat(initialMileage) || 0;
    const maxMiles = parseFloat(maxMileage) || 0;
    if (maxMiles <= initialMiles) {
      Alert.alert('Error', 'Retirement mileage must be greater than starting mileage');
      return;
    }

    // Convert distances to miles for the API (it converts to meters internally)
    const mileageMultiplier = distanceUnit === 'mi' ? 1 : 0.621371; // km to miles

    createShoeMutation.mutate({
      brand: brand.trim(),
      model: model.trim(),
      nickname: name.trim() || undefined,
      purchaseDate: new Date(purchaseDate),
      initialMileage: parseFloat(initialMileage) * mileageMultiplier,
      replacementThresholdMiles: parseFloat(maxMileage) * mileageMultiplier,
      notes: notes || undefined,
      isDefault,
    });
  };

  const displayName = name || `${brand} ${model}`.trim() || 'New Shoe';

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
          Add Shoe
        </Text>
        <Button
          size="sm"
          onPress={handleSave}
          disabled={createShoeMutation.isPending}
        >
          {createShoeMutation.isPending ? 'Saving...' : 'Save'}
        </Button>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.md }}>
        {/* Preview Card */}
        <Card style={{ marginBottom: spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: borderRadius.md,
                backgroundColor: colors.activity.running + '20',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: spacing.md,
              }}
            >
              <Footprints size={28} color={colors.activity.running} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: fontSize.lg,
                  fontWeight: fontWeight.semibold,
                  color: colors.text.primary,
                }}
              >
                {displayName}
              </Text>
              <Text style={{ fontSize: fontSize.sm, color: colors.text.tertiary }}>
                {SHOE_TYPES.find((t) => t.id === shoeType)?.label || 'Daily Trainer'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Basic Info */}
        <Text
          style={{
            fontSize: fontSize.base,
            fontWeight: fontWeight.semibold,
            color: colors.text.primary,
            marginBottom: spacing.sm,
          }}
        >
          Basic Info
        </Text>

        <Card padding="none" style={{ marginBottom: spacing.lg }}>
          {/* Name */}
          <View
            style={{
              padding: spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: colors.border.light,
            }}
          >
            <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary, marginBottom: spacing.xs }}>
              Shoe Name *
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g., My Daily Trainers"
              placeholderTextColor={colors.text.disabled}
              style={{
                fontSize: fontSize.base,
                color: colors.text.primary,
              }}
            />
          </View>

          {/* Brand */}
          <View
            style={{
              padding: spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: colors.border.light,
            }}
          >
            <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary, marginBottom: spacing.sm }}>
              Brand
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                {SHOE_BRANDS.map((b) => (
                  <TouchableOpacity
                    key={b}
                    onPress={() => setBrand(b)}
                    style={{
                      paddingHorizontal: spacing.sm,
                      paddingVertical: spacing.xs,
                      borderRadius: borderRadius.full,
                      backgroundColor: brand === b ? colors.accent.blue : colors.background.tertiary,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: fontSize.sm,
                        color: brand === b ? colors.text.onAccent : colors.text.secondary,
                      }}
                    >
                      {b}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Model */}
          <View style={{ padding: spacing.md }}>
            <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary, marginBottom: spacing.xs }}>
              Model
            </Text>
            <TextInput
              value={model}
              onChangeText={setModel}
              placeholder="e.g., Pegasus 40"
              placeholderTextColor={colors.text.disabled}
              style={{
                fontSize: fontSize.base,
                color: colors.text.primary,
              }}
            />
          </View>
        </Card>

        {/* Shoe Type */}
        <Text
          style={{
            fontSize: fontSize.base,
            fontWeight: fontWeight.semibold,
            color: colors.text.primary,
            marginBottom: spacing.sm,
          }}
        >
          Shoe Type
        </Text>

        <View style={{ marginBottom: spacing.lg }}>
          {SHOE_TYPES.map((type) => (
            <TouchableOpacity
              key={type.id}
              onPress={() => setShoeType(type.id)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: spacing.md,
                backgroundColor: colors.background.secondary,
                borderRadius: borderRadius.lg,
                marginBottom: spacing.sm,
                borderWidth: 2,
                borderColor: shoeType === type.id ? colors.accent.blue : 'transparent',
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: fontSize.base,
                    fontWeight: fontWeight.medium,
                    color: colors.text.primary,
                  }}
                >
                  {type.label}
                </Text>
                <Text style={{ fontSize: fontSize.sm, color: colors.text.tertiary }}>
                  {type.description}
                </Text>
              </View>
              {shoeType === type.id && (
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: colors.accent.blue,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Check size={14} color={colors.text.onAccent} />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Mileage Settings */}
        <Text
          style={{
            fontSize: fontSize.base,
            fontWeight: fontWeight.semibold,
            color: colors.text.primary,
            marginBottom: spacing.sm,
          }}
        >
          Mileage Tracking
        </Text>

        <Card padding="none" style={{ marginBottom: spacing.lg }}>
          {/* Initial Mileage */}
          <View
            style={{
              padding: spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: colors.border.light,
            }}
          >
            <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary, marginBottom: spacing.xs }}>
              Starting Mileage ({distanceUnit})
            </Text>
            <TextInput
              value={initialMileage}
              onChangeText={setInitialMileage}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.text.disabled}
              style={{
                fontSize: fontSize.base,
                color: colors.text.primary,
              }}
            />
            <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary, marginTop: spacing.xs }}>
              Set if the shoes already have some miles on them
            </Text>
          </View>

          {/* Max Mileage */}
          <View style={{ padding: spacing.md }}>
            <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary, marginBottom: spacing.xs }}>
              Retirement Mileage ({distanceUnit})
            </Text>
            <TextInput
              value={maxMileage}
              onChangeText={setMaxMileage}
              keyboardType="decimal-pad"
              placeholder={distanceUnit === 'mi' ? '400' : '650'}
              placeholderTextColor={colors.text.disabled}
              style={{
                fontSize: fontSize.base,
                color: colors.text.primary,
              }}
            />
            <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary, marginTop: spacing.xs }}>
              You'll be notified when approaching this limit
            </Text>
          </View>
        </Card>

        {/* Purchase Date */}
        <Text
          style={{
            fontSize: fontSize.base,
            fontWeight: fontWeight.semibold,
            color: colors.text.primary,
            marginBottom: spacing.sm,
          }}
        >
          Purchase Date
        </Text>

        <Card style={{ marginBottom: spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Calendar size={20} color={colors.text.tertiary} />
            <TextInput
              value={purchaseDate}
              onChangeText={setPurchaseDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.text.disabled}
              style={{
                flex: 1,
                fontSize: fontSize.base,
                color: colors.text.primary,
                marginLeft: spacing.sm,
              }}
            />
          </View>
        </Card>

        {/* Default Shoe Toggle */}
        <TouchableOpacity
          onPress={() => setIsDefault(!isDefault)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: spacing.md,
            backgroundColor: colors.background.secondary,
            borderRadius: borderRadius.lg,
            marginBottom: spacing.lg,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: fontSize.base, fontWeight: fontWeight.medium, color: colors.text.primary }}>
              Set as Default
            </Text>
            <Text style={{ fontSize: fontSize.sm, color: colors.text.tertiary }}>
              Auto-select this shoe for new runs
            </Text>
          </View>
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              borderWidth: 2,
              borderColor: isDefault ? colors.accent.blue : colors.border.default,
              backgroundColor: isDefault ? colors.accent.blue : 'transparent',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {isDefault && <Check size={14} color={colors.text.onAccent} />}
          </View>
        </TouchableOpacity>

        {/* Notes */}
        <Text
          style={{
            fontSize: fontSize.base,
            fontWeight: fontWeight.semibold,
            color: colors.text.primary,
            marginBottom: spacing.sm,
          }}
        >
          Notes (Optional)
        </Text>

        <Card style={{ marginBottom: spacing.xl }}>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Any additional notes about this shoe..."
            placeholderTextColor={colors.text.disabled}
            multiline
            numberOfLines={3}
            style={{
              fontSize: fontSize.base,
              color: colors.text.primary,
              minHeight: 80,
              textAlignVertical: 'top',
            }}
          />
        </Card>

        {/* Save Button */}
        <Button
          onPress={handleSave}
          fullWidth
          disabled={createShoeMutation.isPending}
        >
          {createShoeMutation.isPending ? 'Adding Shoe...' : 'Add Shoe'}
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
