import { View, Text, FlatList, TouchableOpacity, TextInput, RefreshControl, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ArrowLeft,
  Search,
  UserPlus,
  Users,
  User,
  Check,
  X,
  Clock,
  Activity,
  Trophy,
  ChevronRight,
  MessageCircle,
} from 'lucide-react-native';
import { useTheme } from '../src/theme/ThemeContext';
import { Card, Button } from '../src/components/ui';
import { api } from '../src/lib/trpc';
import { spacing, fontSize, fontWeight, borderRadius, heights } from '../src/theme/tokens';

type Tab = 'friends' | 'requests' | 'find';

export default function FriendsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch friends list
  const { data: friends, refetch: refetchFriends } = api.social.getFriends.useQuery({});

  // Fetch friend requests
  const { data: requests, refetch: refetchRequests } = api.social.getPendingRequests.useQuery();

  // Search users - Note: backend user search endpoint not yet implemented
  const searchResults: Array<{ id: string; name: string; hasPendingRequest: boolean }> = [];

  // Send friend request mutation
  const sendRequestMutation = api.social.sendFriendRequest.useMutation({
    onSuccess: () => refetchFriends(),
  });

  // Accept request mutation
  const acceptMutation = api.social.acceptFriendRequest.useMutation({
    onSuccess: () => {
      refetchFriends();
      refetchRequests();
    },
  });

  // Decline request mutation - use removeFriend instead
  const declineMutation = api.social.removeFriend.useMutation({
    onSuccess: () => refetchRequests(),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchFriends(), refetchRequests()]);
    setRefreshing(false);
  };

  const tabs: { value: Tab; label: string; badge?: number }[] = [
    { value: 'friends', label: 'Friends' },
    { value: 'requests', label: 'Requests', badge: requests?.length || 0 },
    { value: 'find', label: 'Find' },
  ];

  const renderFriend = ({ item }: { item: any }) => (
    <TouchableOpacity
      onPress={() => router.push(`/(tabs)/profile` as any)}
    >
      <Card style={{ marginBottom: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {item.avatarUrl ? (
            <Image
              source={{ uri: item.avatarUrl }}
              style={{
                width: heights.avatar.md,
                height: heights.avatar.md,
                borderRadius: heights.avatar.md / 2,
                marginRight: spacing.md,
              }}
            />
          ) : (
            <View
              style={{
                width: heights.avatar.md,
                height: heights.avatar.md,
                borderRadius: heights.avatar.md / 2,
                backgroundColor: colors.accent.blue,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: spacing.md,
              }}
            >
              <User size={20} color={colors.text.onAccent} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text.primary }}>
              {item.name || 'Anonymous'}
            </Text>
            {item.lastActivity && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                <Activity size={12} color={colors.text.tertiary} />
                <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary, marginLeft: spacing.xs }}>
                  {item.lastActivity}
                </Text>
              </View>
            )}
          </View>
          <ChevronRight size={20} color={colors.icon.secondary} />
        </View>
      </Card>
    </TouchableOpacity>
  );

  const renderRequest = ({ item }: { item: any }) => (
    <Card style={{ marginBottom: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {item.avatarUrl ? (
          <Image
            source={{ uri: item.avatarUrl }}
            style={{
              width: heights.avatar.md,
              height: heights.avatar.md,
              borderRadius: heights.avatar.md / 2,
              marginRight: spacing.md,
            }}
          />
        ) : (
          <View
            style={{
              width: heights.avatar.md,
              height: heights.avatar.md,
              borderRadius: heights.avatar.md / 2,
              backgroundColor: colors.accent.blue,
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: spacing.md,
            }}
          >
            <User size={20} color={colors.text.onAccent} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text.primary }}>
            {item.name || 'Anonymous'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
            <Clock size={12} color={colors.text.tertiary} />
            <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary, marginLeft: spacing.xs }}>
              {formatTimeAgo(item.createdAt)}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.xs }}>
          <TouchableOpacity
            onPress={() => declineMutation.mutate({ friendId: item.userId })}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: colors.semantic.error + '20',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <X size={18} color={colors.semantic.error} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => acceptMutation.mutate({ friendId: item.userId })}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: colors.accent.green + '20',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Check size={18} color={colors.accent.green} />
          </TouchableOpacity>
        </View>
      </View>
    </Card>
  );

  const renderSearchResult = ({ item }: { item: any }) => {
    const isFriend = friends?.some((f: any) => f.userId === item.id);
    const hasPendingRequest = item.hasPendingRequest;

    return (
      <Card style={{ marginBottom: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {item.avatarUrl ? (
            <Image
              source={{ uri: item.avatarUrl }}
              style={{
                width: heights.avatar.md,
                height: heights.avatar.md,
                borderRadius: heights.avatar.md / 2,
                marginRight: spacing.md,
              }}
            />
          ) : (
            <View
              style={{
                width: heights.avatar.md,
                height: heights.avatar.md,
                borderRadius: heights.avatar.md / 2,
                backgroundColor: colors.accent.blue,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: spacing.md,
              }}
            >
              <User size={20} color={colors.text.onAccent} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text.primary }}>
              {item.name || 'Anonymous'}
            </Text>
            {item.level && (
              <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>
                Level {item.level}
              </Text>
            )}
          </View>
          {isFriend ? (
            <View
              style={{
                backgroundColor: colors.accent.green + '20',
                paddingHorizontal: spacing.sm,
                paddingVertical: spacing.xs,
                borderRadius: borderRadius.full,
              }}
            >
              <Text style={{ fontSize: fontSize.xs, color: colors.accent.green }}>Friends</Text>
            </View>
          ) : hasPendingRequest ? (
            <View
              style={{
                backgroundColor: colors.background.tertiary,
                paddingHorizontal: spacing.sm,
                paddingVertical: spacing.xs,
                borderRadius: borderRadius.full,
              }}
            >
              <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>Pending</Text>
            </View>
          ) : (
            <Button
              size="sm"
              onPress={() => sendRequestMutation.mutate({ friendId: item.id })}
              disabled={sendRequestMutation.isPending}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <UserPlus size={14} color={colors.text.onAccent} />
                <Text style={{ color: colors.text.onAccent, marginLeft: spacing.xs }}>Add</Text>
              </View>
            </Button>
          )}
        </View>
      </Card>
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
          Friends
        </Text>
        <TouchableOpacity onPress={() => router.push('/leaderboard')}>
          <Trophy size={24} color={colors.accent.blue} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View
        style={{
          flexDirection: 'row',
          padding: spacing.md,
          gap: spacing.xs,
        }}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.value}
            onPress={() => setActiveTab(tab.value)}
            style={{
              flex: 1,
              paddingVertical: spacing.sm,
              borderRadius: borderRadius.md,
              backgroundColor: activeTab === tab.value ? colors.accent.blue : colors.background.secondary,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                fontSize: fontSize.sm,
                fontWeight: fontWeight.medium,
                color: activeTab === tab.value ? colors.text.onAccent : colors.text.secondary,
              }}
            >
              {tab.label}
            </Text>
            {tab.badge && tab.badge > 0 && (
              <View
                style={{
                  backgroundColor: activeTab === tab.value ? colors.text.onAccent : colors.semantic.error,
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginLeft: spacing.xs,
                }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    color: activeTab === tab.value ? colors.accent.blue : colors.text.onAccent,
                    fontWeight: fontWeight.bold,
                  }}
                >
                  {tab.badge}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Search (for Find tab) */}
      {activeTab === 'find' && (
        <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.md }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.background.secondary,
              borderRadius: borderRadius.lg,
              paddingHorizontal: spacing.md,
            }}
          >
            <Search size={20} color={colors.icon.secondary} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by name or username..."
              placeholderTextColor={colors.text.disabled}
              style={{
                flex: 1,
                paddingVertical: spacing.sm,
                marginLeft: spacing.sm,
                fontSize: fontSize.base,
                color: colors.text.primary,
              }}
            />
          </View>
        </View>
      )}

      {/* Content */}
      {activeTab === 'friends' && (
        <FlatList
          data={friends}
          keyExtractor={(item) => item.userId}
          renderItem={renderFriend}
          contentContainerStyle={{ padding: spacing.md }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', padding: spacing.xl }}>
              <Users size={48} color={colors.text.disabled} />
              <Text style={{ fontSize: fontSize.lg, color: colors.text.secondary, marginTop: spacing.md }}>
                No friends yet
              </Text>
              <Text style={{ fontSize: fontSize.sm, color: colors.text.tertiary, textAlign: 'center' }}>
                Find and add friends to compete on the leaderboard
              </Text>
              <Button
                variant="outline"
                onPress={() => setActiveTab('find')}
                style={{ marginTop: spacing.lg }}
              >
                Find Friends
              </Button>
            </View>
          }
        />
      )}

      {activeTab === 'requests' && (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          renderItem={renderRequest}
          contentContainerStyle={{ padding: spacing.md }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', padding: spacing.xl }}>
              <UserPlus size={48} color={colors.text.disabled} />
              <Text style={{ fontSize: fontSize.lg, color: colors.text.secondary, marginTop: spacing.md }}>
                No pending requests
              </Text>
              <Text style={{ fontSize: fontSize.sm, color: colors.text.tertiary, textAlign: 'center' }}>
                Friend requests will appear here
              </Text>
            </View>
          }
        />
      )}

      {activeTab === 'find' && (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
          renderItem={renderSearchResult}
          contentContainerStyle={{ padding: spacing.md }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', padding: spacing.xl }}>
              <Search size={48} color={colors.text.disabled} />
              <Text style={{ fontSize: fontSize.lg, color: colors.text.secondary, marginTop: spacing.md }}>
                {searchQuery.length >= 2 ? 'No users found' : 'Search for friends'}
              </Text>
              <Text style={{ fontSize: fontSize.sm, color: colors.text.tertiary, textAlign: 'center' }}>
                {searchQuery.length >= 2
                  ? 'Try a different search term'
                  : 'Enter at least 2 characters to search'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
  if (diffMinutes < 10080) return `${Math.floor(diffMinutes / 1440)}d ago`;
  return date.toLocaleDateString();
}
