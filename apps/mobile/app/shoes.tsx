import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ArrowLeft,
  Plus,
  Footprints,
  AlertTriangle,
  MoreVertical,
  Check,
  Trash2,
  Edit2,
} from 'lucide-react-native';
import { useTheme } from '../src/theme/ThemeContext';
import { Button, Card } from '../src/components/ui';
import { api } from '../src/lib/trpc';
import { useDistanceUnit, formatDistance } from '../src/stores/profile';
import { spacing, fontSize, fontWeight, borderRadius } from '../src/theme/tokens';

export default function ShoesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const distanceUnit = useDistanceUnit();
  const [selectedShoeId, setSelectedShoeId] = useState<string | null>(null);

  // Fetch shoes
  const { data: shoes, isLoading, refetch } = api.shoes.getAll.useQuery();

  // Mutations
  const setDefaultMutation = api.shoes.update.useMutation({
    onSuccess: () => refetch(),
  });

  const retireMutation = api.shoes.retire.useMutation({
    onSuccess: () => refetch(),
  });

  const deleteMutation = api.shoes.delete.useMutation({
    onSuccess: () => refetch(),
  });

  const handleSetDefault = (shoeId: string) => {
    setDefaultMutation.mutate({ id: shoeId, isDefault: true });
  };

  const handleRetire = (shoeId: string) => {
    Alert.alert('Retire Shoe', 'Are you sure you want to retire this shoe?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Retire',
        onPress: () => retireMutation.mutate({ id: shoeId }),
      },
    ]);
  };

  const handleDelete = (shoeId: string) => {
    Alert.alert('Delete Shoe', 'Are you sure you want to delete this shoe?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteMutation.mutate({ id: shoeId }),
      },
    ]);
  };

  const getMileagePercent = (current: number, threshold: number) => {
    return Math.min((current / threshold) * 100, 100);
  };

  const getMileageColor = (percent: number) => {
    if (percent >= 90) return colors.status.error;
    if (percent >= 70) return colors.status.warning;
    return colors.status.success;
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
          Running Shoes
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/add-shoe')}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.accent.blue,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Plus size={20} color={colors.text.onAccent} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.md }}>
        {/* Info card */}
        <View
          style={{
            flexDirection: 'row',
            padding: spacing.md,
            backgroundColor: colors.accent.blue + '10',
            borderRadius: borderRadius.lg,
            marginBottom: spacing.lg,
          }}
        >
          <Footprints size={20} color={colors.accent.blue} style={{ marginRight: spacing.sm }} />
          <Text
            style={{
              flex: 1,
              fontSize: fontSize.sm,
              color: colors.text.secondary,
              lineHeight: 20,
            }}
          >
            Track mileage on your running shoes to know when it's time to replace them. Most shoes last 300-500 miles.
          </Text>
        </View>

        {/* Shoes list */}
        {shoes?.map((shoe: any) => {
          const mileagePercent = getMileagePercent(
            shoe.totalMileageMeters,
            shoe.replacementThresholdMeters
          );
          const mileageColor = getMileageColor(mileagePercent);
          const needsReplacement = mileagePercent >= 90;

          return (
            <Card key={shoe.id} style={{ marginBottom: spacing.md }}>
              <TouchableOpacity
                onPress={() => setSelectedShoeId(selectedShoeId === shoe.id ? null : shoe.id)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  {/* Shoe icon */}
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: borderRadius.md,
                      backgroundColor: shoe.color || colors.background.tertiary,
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: spacing.md,
                    }}
                  >
                    <Footprints size={24} color={colors.text.onAccent} />
                  </View>

                  {/* Shoe details */}
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text
                        style={{
                          fontSize: fontSize.base,
                          fontWeight: fontWeight.semibold,
                          color: colors.text.primary,
                        }}
                      >
                        {shoe.nickname || `${shoe.brand} ${shoe.model}`}
                      </Text>
                      {shoe.isDefault && (
                        <View
                          style={{
                            marginLeft: spacing.xs,
                            backgroundColor: colors.accent.blue,
                            paddingHorizontal: spacing.xs,
                            paddingVertical: 2,
                            borderRadius: borderRadius.sm,
                          }}
                        >
                          <Text style={{ fontSize: 10, color: colors.text.onAccent }}>DEFAULT</Text>
                        </View>
                      )}
                      {!shoe.isActive && (
                        <View
                          style={{
                            marginLeft: spacing.xs,
                            backgroundColor: colors.text.tertiary,
                            paddingHorizontal: spacing.xs,
                            paddingVertical: 2,
                            borderRadius: borderRadius.sm,
                          }}
                        >
                          <Text style={{ fontSize: 10, color: colors.text.onAccent }}>RETIRED</Text>
                        </View>
                      )}
                    </View>
                    <Text
                      style={{
                        fontSize: fontSize.sm,
                        color: colors.text.secondary,
                        marginTop: 2,
                      }}
                    >
                      {shoe.brand} {shoe.model}
                    </Text>

                    {/* Mileage bar */}
                    <View style={{ marginTop: spacing.sm }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>
                          {formatDistance(shoe.totalMileageMeters, distanceUnit)}
                        </Text>
                        <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>
                          {formatDistance(shoe.replacementThresholdMeters, distanceUnit)}
                        </Text>
                      </View>
                      <View
                        style={{
                          height: 6,
                          backgroundColor: colors.background.tertiary,
                          borderRadius: 3,
                          overflow: 'hidden',
                        }}
                      >
                        <View
                          style={{
                            height: '100%',
                            width: `${mileagePercent}%`,
                            backgroundColor: mileageColor,
                            borderRadius: 3,
                          }}
                        />
                      </View>
                    </View>

                    {/* Warning */}
                    {needsReplacement && shoe.isActive && (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          marginTop: spacing.sm,
                        }}
                      >
                        <AlertTriangle size={14} color={colors.status.warning} />
                        <Text
                          style={{
                            fontSize: fontSize.xs,
                            color: colors.status.warning,
                            marginLeft: spacing.xs,
                          }}
                        >
                          Time to replace!
                        </Text>
                      </View>
                    )}

                    {/* Stats */}
                    <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm }}>
                      <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>
                        {shoe.totalRuns || 0} runs
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity onPress={() => setSelectedShoeId(shoe.id)}>
                    <MoreVertical size={20} color={colors.icon.secondary} />
                  </TouchableOpacity>
                </View>

                {/* Actions */}
                {selectedShoeId === shoe.id && (
                  <View
                    style={{
                      flexDirection: 'row',
                      gap: spacing.sm,
                      marginTop: spacing.md,
                      paddingTop: spacing.md,
                      borderTopWidth: 1,
                      borderTopColor: colors.border.light,
                    }}
                  >
                    {!shoe.isDefault && shoe.isActive && (
                      <TouchableOpacity
                        onPress={() => handleSetDefault(shoe.id)}
                        style={{
                          flex: 1,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: spacing.sm,
                          backgroundColor: colors.background.tertiary,
                          borderRadius: borderRadius.md,
                        }}
                      >
                        <Check size={16} color={colors.text.secondary} />
                        <Text style={{ fontSize: fontSize.sm, color: colors.text.secondary, marginLeft: spacing.xs }}>
                          Set Default
                        </Text>
                      </TouchableOpacity>
                    )}
                    {shoe.isActive && (
                      <TouchableOpacity
                        onPress={() => handleRetire(shoe.id)}
                        style={{
                          flex: 1,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: spacing.sm,
                          backgroundColor: colors.background.tertiary,
                          borderRadius: borderRadius.md,
                        }}
                      >
                        <Edit2 size={16} color={colors.text.secondary} />
                        <Text style={{ fontSize: fontSize.sm, color: colors.text.secondary, marginLeft: spacing.xs }}>
                          Retire
                        </Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      onPress={() => handleDelete(shoe.id)}
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: spacing.sm,
                        backgroundColor: colors.status.error + '10',
                        borderRadius: borderRadius.md,
                      }}
                    >
                      <Trash2 size={16} color={colors.status.error} />
                      <Text style={{ fontSize: fontSize.sm, color: colors.status.error, marginLeft: spacing.xs }}>
                        Delete
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            </Card>
          );
        })}

        {/* Empty state */}
        {!isLoading && (!shoes || shoes.length === 0) && (
          <View
            style={{
              alignItems: 'center',
              padding: spacing.xl,
            }}
          >
            <Footprints size={48} color={colors.text.disabled} />
            <Text
              style={{
                fontSize: fontSize.lg,
                fontWeight: fontWeight.semibold,
                color: colors.text.primary,
                marginTop: spacing.md,
              }}
            >
              No shoes yet
            </Text>
            <Text
              style={{
                fontSize: fontSize.base,
                color: colors.text.secondary,
                textAlign: 'center',
                marginTop: spacing.xs,
              }}
            >
              Add your running shoes to track mileage and know when to replace them.
            </Text>
            <Button
              onPress={() => router.push('/add-shoe')}
              style={{ marginTop: spacing.lg }}
            >
              Add Your First Shoe
            </Button>
          </View>
        )}

        {isLoading && (
          <View style={{ alignItems: 'center', padding: spacing.xl }}>
            <Text style={{ color: colors.text.secondary }}>Loading shoes...</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
