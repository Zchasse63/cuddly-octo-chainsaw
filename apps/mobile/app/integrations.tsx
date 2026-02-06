import { View, Text, ScrollView, TouchableOpacity, Switch, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ArrowLeft,
  Watch,
  Heart,
  Activity,
  Smartphone,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Link2,
  Unlink,
  Clock,
} from 'lucide-react-native';
import { useTheme } from '../src/theme/ThemeContext';
import { Card, Button } from '../src/components/ui';
import { api } from '../src/lib/trpc';
import { spacing, fontSize, fontWeight, borderRadius } from '../src/theme/tokens';

interface Integration {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  connected: boolean;
  lastSync?: string;
  dataTypes: string[];
}

// Integration brand color mapping using theme colors
function getIntegrationColors(integrationId: string, colors: any) {
  const colorMap: Record<string, string> = {
    apple_health: colors.accent.red,
    google_fit: colors.accent.blue,
    garmin: colors.accent.teal,
    strava: colors.accent.orange,
    whoop: colors.text.primary,
    oura: colors.accent.green,
    fitbit: colors.accent.teal,
  };
  return colorMap[integrationId] || colors.accent.blue;
}

function createIntegrations(colors: any): Integration[] {
  return [
    {
      id: 'apple_health',
      name: 'Apple Health',
      icon: '❤️',
      color: getIntegrationColors('apple_health', colors),
      description: 'Sync workouts, heart rate, and activity data',
      connected: false,
      dataTypes: ['Workouts', 'Heart Rate', 'Steps', 'Sleep'],
    },
    {
      id: 'google_fit',
      name: 'Google Fit',
      icon: '💚',
      color: getIntegrationColors('google_fit', colors),
      description: 'Connect your Google Fit data',
      connected: false,
      dataTypes: ['Workouts', 'Steps', 'Heart Rate'],
    },
    {
      id: 'garmin',
      name: 'Garmin Connect',
      icon: '⌚',
      color: getIntegrationColors('garmin', colors),
      description: 'Sync runs, workouts, and health metrics',
      connected: false,
      dataTypes: ['Runs', 'Workouts', 'Heart Rate', 'Sleep', 'VO2 Max'],
    },
    {
      id: 'strava',
      name: 'Strava',
      icon: '🏃',
      color: getIntegrationColors('strava', colors),
      description: 'Import your Strava activities',
      connected: false,
      dataTypes: ['Runs', 'Rides', 'Workouts'],
    },
    {
      id: 'whoop',
      name: 'WHOOP',
      icon: '💪',
      color: getIntegrationColors('whoop', colors),
      description: 'Recovery and strain data',
      connected: false,
      dataTypes: ['Recovery', 'Strain', 'Sleep', 'Heart Rate'],
    },
    {
      id: 'oura',
      name: 'Oura Ring',
      icon: '💍',
      color: getIntegrationColors('oura', colors),
      description: 'Sleep and readiness scores',
      connected: false,
      dataTypes: ['Sleep', 'Readiness', 'Activity'],
    },
    {
      id: 'fitbit',
      name: 'Fitbit',
      icon: '📱',
      color: getIntegrationColors('fitbit', colors),
      description: 'Steps, sleep, and activity',
      connected: false,
      dataTypes: ['Steps', 'Sleep', 'Workouts', 'Heart Rate'],
    },
  ];
}

export default function IntegrationsScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const INTEGRATIONS = createIntegrations(colors);

  // Fetch user's connected integrations (Apple Health)
  const { data: appleHealthStatus, refetch } = api.wearables.getAppleHealthStatus.useQuery();

  // Convert to array format for compatibility
  const connectedIntegrations = appleHealthStatus?.isConnected
    ? [{ provider: 'apple_health', lastSyncAt: appleHealthStatus.lastSyncAt }]
    : [];

  // Connect mutation (update Apple Health connection)
  const connectMutation = api.wearables.updateAppleHealthConnection.useMutation({
    onSuccess: () => {
      refetch();
      Alert.alert('Success', 'Integration connected successfully!');
    },
    onError: (error) => {
      Alert.alert('Error', error.message || 'Failed to connect');
    },
  });

  // Disconnect mutation
  const disconnectMutation = api.wearables.updateAppleHealthConnection.useMutation({
    onSuccess: () => {
      refetch();
      Alert.alert('Disconnected', 'Integration has been disconnected');
    },
    onError: (error) => {
      Alert.alert('Error', error.message || 'Failed to disconnect');
    },
  });

  // Manual sync mutation - triggers sync by updating connection with current timestamp
  const syncMutation = api.wearables.updateAppleHealthConnection.useMutation({
    onSuccess: () => {
      refetch();
      Alert.alert('Synced', 'Data synced successfully!');
    },
    onError: (error: { message?: string }) => {
      Alert.alert('Error', error.message || 'Failed to sync');
    },
  });

  const isConnected = (integrationId: string) => {
    return connectedIntegrations?.some((i: { provider: string }) => i.provider === integrationId);
  };

  const getLastSync = (integrationId: string) => {
    const integration = connectedIntegrations?.find((i: { provider: string; lastSyncAt?: Date | null }) => i.provider === integrationId);
    return integration?.lastSyncAt;
  };

  const handleConnect = (integration: Integration) => {
    Alert.alert(
      `Connect ${integration.name}`,
      `This will allow VoiceFit to access your ${integration.dataTypes.join(', ')} data.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Connect',
          onPress: () => connectMutation.mutate({ isConnected: true }),
        },
      ]
    );
  };

  const handleDisconnect = (integration: Integration) => {
    Alert.alert(
      `Disconnect ${integration.name}`,
      'Your data will no longer sync. Historical data will be preserved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: () => disconnectMutation.mutate({ isConnected: false }),
        },
      ]
    );
  };

  const handleSync = (_integrationId: string) => {
    // Trigger manual sync by updating connection status (updates lastSyncAt)
    syncMutation.mutate({ isConnected: true });
  };

  const formatLastSync = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return date.toLocaleDateString();
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
          Integrations
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.md }}>
        {/* Info Card */}
        <Card style={{ marginBottom: spacing.lg, backgroundColor: colors.accent.blue + '15' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Link2 size={24} color={colors.accent.blue} />
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={{ fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text.primary }}>
                Connect Your Devices
              </Text>
              <Text style={{ fontSize: fontSize.sm, color: colors.text.secondary }}>
                Sync data from your wearables and fitness apps for a complete picture of your health
              </Text>
            </View>
          </View>
        </Card>

        {/* Connected Integrations */}
        {connectedIntegrations && connectedIntegrations.length > 0 && (
          <View style={{ marginBottom: spacing.lg }}>
            <Text
              style={{
                fontSize: fontSize.lg,
                fontWeight: fontWeight.semibold,
                color: colors.text.primary,
                marginBottom: spacing.sm,
              }}
            >
              Connected
            </Text>

            {INTEGRATIONS.filter((i) => isConnected(i.id)).map((integration) => (
              <Card key={integration.id} style={{ marginBottom: spacing.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: borderRadius.md,
                      backgroundColor: integration.color + '20',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: spacing.md,
                    }}
                  >
                    <Text style={{ fontSize: 24 }}>{integration.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text
                        style={{
                          fontSize: fontSize.base,
                          fontWeight: fontWeight.semibold,
                          color: colors.text.primary,
                        }}
                      >
                        {integration.name}
                      </Text>
                      <CheckCircle2 size={16} color={colors.accent.green} style={{ marginLeft: spacing.xs }} />
                    </View>
                    {getLastSync(integration.id) && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                        <Clock size={12} color={colors.text.tertiary} />
                        <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary, marginLeft: spacing.xs }}>
                          Last synced {formatLastSync(String(getLastSync(integration.id)))}
                        </Text>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => handleSync(integration.id)}
                    disabled={syncMutation.isPending}
                    style={{ padding: spacing.xs, marginRight: spacing.xs }}
                  >
                    <RefreshCw
                      size={20}
                      color={colors.accent.blue}
                      style={syncMutation.isPending ? { opacity: 0.5 } : {}}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDisconnect(integration)}
                    style={{ padding: spacing.xs }}
                  >
                    <Unlink size={20} color={colors.semantic.error} />
                  </TouchableOpacity>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Available Integrations */}
        <Text
          style={{
            fontSize: fontSize.lg,
            fontWeight: fontWeight.semibold,
            color: colors.text.primary,
            marginBottom: spacing.sm,
          }}
        >
          {connectedIntegrations?.length > 0 ? 'Available' : 'All Integrations'}
        </Text>

        {INTEGRATIONS.filter((i) => !isConnected(i.id)).map((integration) => (
          <TouchableOpacity
            key={integration.id}
            onPress={() => handleConnect(integration)}
          >
            <Card style={{ marginBottom: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: borderRadius.md,
                    backgroundColor: integration.color + '20',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: spacing.md,
                  }}
                >
                  <Text style={{ fontSize: 24 }}>{integration.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: fontSize.base,
                      fontWeight: fontWeight.semibold,
                      color: colors.text.primary,
                    }}
                  >
                    {integration.name}
                  </Text>
                  <Text style={{ fontSize: fontSize.sm, color: colors.text.tertiary }}>
                    {integration.description}
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.xs, gap: 4 }}>
                    {integration.dataTypes.slice(0, 3).map((type, index) => (
                      <View
                        key={index}
                        style={{
                          backgroundColor: colors.background.tertiary,
                          paddingHorizontal: spacing.xs,
                          paddingVertical: 2,
                          borderRadius: borderRadius.sm,
                        }}
                      >
                        <Text style={{ fontSize: 10, color: colors.text.tertiary }}>{type}</Text>
                      </View>
                    ))}
                    {integration.dataTypes.length > 3 && (
                      <View
                        style={{
                          backgroundColor: colors.background.tertiary,
                          paddingHorizontal: spacing.xs,
                          paddingVertical: 2,
                          borderRadius: borderRadius.sm,
                        }}
                      >
                        <Text style={{ fontSize: 10, color: colors.text.tertiary }}>
                          +{integration.dataTypes.length - 3}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                <Button size="sm" variant="outline" onPress={() => handleConnect(integration)}>
                  Connect
                </Button>
              </View>
            </Card>
          </TouchableOpacity>
        ))}

        {/* Sync Settings */}
        <Card style={{ marginTop: spacing.lg }}>
          <Text
            style={{
              fontSize: fontSize.base,
              fontWeight: fontWeight.semibold,
              color: colors.text.primary,
              marginBottom: spacing.md,
            }}
          >
            Sync Settings
          </Text>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingVertical: spacing.sm,
              borderBottomWidth: 1,
              borderBottomColor: colors.border.light,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: fontSize.base, color: colors.text.primary }}>Auto-sync</Text>
              <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>
                Automatically sync data in the background
              </Text>
            </View>
            <Switch
              value={true}
              trackColor={{ false: colors.background.tertiary, true: colors.accent.blue }}
            />
          </View>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingVertical: spacing.sm,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: fontSize.base, color: colors.text.primary }}>Sync on WiFi only</Text>
              <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>
                Only sync when connected to WiFi
              </Text>
            </View>
            <Switch
              value={false}
              trackColor={{ false: colors.background.tertiary, true: colors.accent.blue }}
            />
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
