import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ChevronLeft,
  Watch,
  Smartphone,
  Link2,
  Link2Off,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Heart,
  Footprints,
  Moon,
} from 'lucide-react-native';
import { useTheme } from '../../src/theme/ThemeContext';
import { Button } from '../../src/components/ui';
import { spacing, fontSize, fontWeight, borderRadius } from '../../src/theme/tokens';

type WearableDevice = {
  id: string;
  name: string;
  brand: string;
  logo: string;
  connected: boolean;
  lastSync?: string;
  dataTypes: string[];
};

type AvailableIntegration = {
  id: string;
  name: string;
  brand: string;
  description: string;
  dataTypes: string[];
};

export default function WearablesScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const [connectedDevices, setConnectedDevices] = useState<WearableDevice[]>([
    {
      id: 'apple_watch',
      name: 'Apple Watch Series 9',
      brand: 'Apple Health',
      logo: '⌚',
      connected: true,
      lastSync: '2 minutes ago',
      dataTypes: ['Heart Rate', 'Steps', 'Sleep', 'Workouts'],
    },
  ]);

  const availableIntegrations: AvailableIntegration[] = [
    {
      id: 'garmin',
      name: 'Garmin Connect',
      brand: 'Garmin',
      description: 'Sync activities from your Garmin watch',
      dataTypes: ['Running', 'Heart Rate', 'Sleep'],
    },
    {
      id: 'fitbit',
      name: 'Fitbit',
      brand: 'Fitbit',
      description: 'Connect your Fitbit tracker',
      dataTypes: ['Steps', 'Sleep', 'Heart Rate'],
    },
    {
      id: 'strava',
      name: 'Strava',
      brand: 'Strava',
      description: 'Import runs and rides from Strava',
      dataTypes: ['Running', 'Cycling'],
    },
    {
      id: 'whoop',
      name: 'WHOOP',
      brand: 'WHOOP',
      description: 'Recovery and strain data',
      dataTypes: ['Recovery', 'Sleep', 'Strain'],
    },
    {
      id: 'oura',
      name: 'Oura Ring',
      brand: 'Oura',
      description: 'Sleep and readiness scores',
      dataTypes: ['Sleep', 'Readiness', 'Activity'],
    },
  ];

  const handleConnect = async (integrationId: string) => {
    setIsConnecting(integrationId);
    // TODO: OAuth flow
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsConnecting(null);
  };

  const handleDisconnect = (deviceId: string) => {
    setConnectedDevices((prev) => prev.filter((d) => d.id !== deviceId));
  };

  const handleSync = async () => {
    setIsSyncing(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsSyncing(false);
  };

  const DataTypeChip = ({ label, icon: Icon }: { label: string; icon?: any }) => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background.tertiary,
        borderRadius: borderRadius.full,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        marginRight: spacing.xs,
        marginBottom: spacing.xs,
      }}
    >
      {Icon && <Icon size={12} color={colors.text.tertiary} style={{ marginRight: 4 }} />}
      <Text style={{ fontSize: fontSize.xs, color: colors.text.secondary }}>{label}</Text>
    </View>
  );

  const getDataIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'heart rate':
        return Heart;
      case 'steps':
        return Footprints;
      case 'sleep':
        return Moon;
      default:
        return null;
    }
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
            flex: 1,
            fontSize: fontSize.lg,
            fontWeight: fontWeight.semibold,
            color: colors.text.primary,
          }}
        >
          Wearables & Apps
        </Text>
        {connectedDevices.length > 0 && (
          <TouchableOpacity onPress={handleSync} disabled={isSyncing}>
            {isSyncing ? (
              <ActivityIndicator size="small" color={colors.accent.blue} />
            ) : (
              <RefreshCw size={20} color={colors.accent.blue} />
            )}
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg }}>
        {/* Connected Devices */}
        {connectedDevices.length > 0 && (
          <>
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
              Connected
            </Text>

            {connectedDevices.map((device) => (
              <View
                key={device.id}
                style={{
                  backgroundColor: colors.background.secondary,
                  borderRadius: borderRadius.lg,
                  padding: spacing.lg,
                  marginBottom: spacing.md,
                  borderWidth: 1,
                  borderColor: colors.accent.green + '40',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: borderRadius.md,
                      backgroundColor: colors.background.tertiary,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 24 }}>{device.logo}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <Text
                      style={{
                        fontSize: fontSize.base,
                        fontWeight: fontWeight.semibold,
                        color: colors.text.primary,
                      }}
                    >
                      {device.name}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                      <CheckCircle size={14} color={colors.accent.green} />
                      <Text
                        style={{
                          fontSize: fontSize.sm,
                          color: colors.accent.green,
                          marginLeft: 4,
                        }}
                      >
                        Connected
                      </Text>
                      <Text
                        style={{
                          fontSize: fontSize.sm,
                          color: colors.text.tertiary,
                          marginLeft: spacing.sm,
                        }}
                      >
                        • Last sync: {device.lastSync}
                      </Text>
                    </View>
                  </View>
                </View>

                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    marginTop: spacing.md,
                  }}
                >
                  {device.dataTypes.map((type) => (
                    <DataTypeChip key={type} label={type} icon={getDataIcon(type)} />
                  ))}
                </View>

                <TouchableOpacity
                  onPress={() => handleDisconnect(device.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: spacing.md,
                    paddingVertical: spacing.sm,
                    borderTopWidth: 1,
                    borderTopColor: colors.border.primary,
                  }}
                >
                  <Link2Off size={16} color={colors.semantic.error} />
                  <Text
                    style={{
                      fontSize: fontSize.sm,
                      color: colors.semantic.error,
                      marginLeft: spacing.xs,
                    }}
                  >
                    Disconnect
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}

        {/* Available Integrations */}
        <Text
          style={{
            fontSize: fontSize.sm,
            fontWeight: fontWeight.semibold,
            color: colors.text.secondary,
            textTransform: 'uppercase',
            letterSpacing: 1,
            marginTop: connectedDevices.length > 0 ? spacing.lg : 0,
            marginBottom: spacing.md,
          }}
        >
          Available Integrations
        </Text>

        {availableIntegrations.map((integration) => {
          const isCurrentlyConnecting = isConnecting === integration.id;
          const isAlreadyConnected = connectedDevices.some(
            (d) => d.id === integration.id || d.brand.toLowerCase().includes(integration.brand.toLowerCase())
          );

          return (
            <View
              key={integration.id}
              style={{
                backgroundColor: colors.background.secondary,
                borderRadius: borderRadius.lg,
                padding: spacing.md,
                marginBottom: spacing.sm,
                opacity: isAlreadyConnected ? 0.5 : 1,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
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
                  <Watch size={22} color={colors.accent.blue} />
                </View>
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text
                    style={{
                      fontSize: fontSize.base,
                      fontWeight: fontWeight.medium,
                      color: colors.text.primary,
                    }}
                  >
                    {integration.name}
                  </Text>
                  <Text
                    style={{
                      fontSize: fontSize.sm,
                      color: colors.text.tertiary,
                      marginTop: 2,
                    }}
                  >
                    {integration.description}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleConnect(integration.id)}
                  disabled={isCurrentlyConnecting || isAlreadyConnected}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: isAlreadyConnected
                      ? colors.background.tertiary
                      : colors.accent.blue,
                    borderRadius: borderRadius.md,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm,
                  }}
                >
                  {isCurrentlyConnecting ? (
                    <ActivityIndicator size="small" color={colors.text.onAccent} />
                  ) : (
                    <>
                      <Link2 size={16} color={isAlreadyConnected ? colors.text.tertiary : colors.text.onAccent} />
                      <Text
                        style={{
                          fontSize: fontSize.sm,
                          fontWeight: fontWeight.medium,
                          color: isAlreadyConnected ? colors.text.tertiary : colors.text.onAccent,
                          marginLeft: spacing.xs,
                        }}
                      >
                        {isAlreadyConnected ? 'Connected' : 'Connect'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {/* Info */}
        <View
          style={{
            backgroundColor: colors.accent.blue + '15',
            borderRadius: borderRadius.lg,
            padding: spacing.md,
            marginTop: spacing.lg,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <AlertCircle size={20} color={colors.accent.blue} style={{ marginTop: 2 }} />
            <Text
              style={{
                flex: 1,
                fontSize: fontSize.sm,
                color: colors.text.secondary,
                lineHeight: 20,
                marginLeft: spacing.sm,
              }}
            >
              Connecting your wearable helps VoiceFit provide more accurate readiness scores and
              personalized recommendations based on your real-time health data.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
