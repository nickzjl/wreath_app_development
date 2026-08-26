import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, type Href } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { colors, fonts, radii, spacing } from '../../../theme/tokens';

type BracketSummary = {
  id: string;
  title: string;
  slug: string;
  goal_type: string;
  duration_days: number;
  stake_amount_cents: number | null;
  track_type: string;
  status: string;
  created_at: string;
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  pending_review: { label: 'Under review', bg: colors.sage, text: colors.cream },
  open: { label: 'Open to join', bg: colors.gold, text: colors.ink },
  active: { label: 'Active', bg: colors.ink, text: colors.cream },
  completed: { label: 'Completed', bg: 'rgba(0,0,0,0.08)', text: 'rgba(0,0,0,0.4)' },
  rejected: { label: 'Rejected', bg: '#fce8e8', text: '#c00' },
  cancelled: { label: 'Cancelled', bg: 'rgba(0,0,0,0.08)', text: 'rgba(0,0,0,0.4)' },
};

function goalTypeLabel(goalType: string): string {
  return goalType === 'one_time' ? 'One-time' : 'Daily';
}

function stakeLabel(amountCents: number | null, trackType: string): string {
  if (trackType !== 'staked' || amountCents === null) return 'Social';
  const dollars = amountCents / 100;
  return `$${dollars % 1 === 0 ? dollars.toFixed(0) : dollars.toFixed(2)}`;
}

function BracketCard({
  bracket,
  onPress,
}: {
  bracket: BracketSummary;
  onPress: () => void;
}) {
  const config = STATUS_CONFIG[bracket.status] ?? {
    label: bracket.status.replace(/_/g, ' '),
    bg: 'rgba(0,0,0,0.08)',
    text: 'rgba(0,0,0,0.4)',
  };
  const subtitle = `${goalTypeLabel(bracket.goal_type)} · ${bracket.duration_days} days · ${stakeLabel(bracket.stake_amount_cents, bracket.track_type)}`;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      <View style={styles.cardTop}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {bracket.title}
        </Text>
        <View style={[styles.badge, { backgroundColor: config.bg }]}>
          <Text style={[styles.badgeText, { color: config.text }]}>{config.label}</Text>
        </View>
      </View>
      <Text style={styles.cardSubtitle}>{subtitle}</Text>
    </Pressable>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const [brackets, setBrackets] = useState<BracketSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchBrackets() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: memberships } = await supabase
        .from('bracket_members')
        .select('bracket_id')
        .eq('user_id', user.id);

      const memberIds = memberships?.map((m: { bracket_id: string }) => m.bracket_id) ?? [];

      let query = supabase
        .from('brackets')
        .select(
          'id, title, slug, goal_type, duration_days, stake_amount_cents, track_type, status, created_at'
        )
        .order('created_at', { ascending: false });

      if (memberIds.length > 0) {
        query = query.or(`created_by.eq.${user.id},id.in.(${memberIds.join(',')})`);
      } else {
        query = query.eq('created_by', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setBrackets(data ?? []);
    } catch (err) {
      console.error('[home brackets]', err);
    }
  }

  useEffect(() => {
    fetchBrackets().finally(() => setLoading(false));
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    await fetchBrackets();
    setRefreshing(false);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.ink} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={brackets}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <BracketCard
            bracket={item}
            onPress={() => router.push(`/bracket/${item.slug}` as Href)}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.ink}
          />
        }
        ListHeaderComponent={<Text style={styles.title}>Your brackets</Text>}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyHeadline}>No brackets yet</Text>
            <Text style={styles.emptyBody}>
              Create one or join a public bracket to get started.
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[5],
    paddingBottom: 120,
    gap: spacing[3],
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 32,
    color: colors.ink,
    letterSpacing: -0.5,
    marginBottom: spacing[2],
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.07)',
    padding: spacing[4],
    gap: spacing[2],
  },
  cardPressed: {
    opacity: 0.85,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  cardTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    color: colors.ink,
    flex: 1,
  },
  cardSubtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: 'rgba(0,0,0,0.5)',
  },
  badge: {
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  badgeText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 0.2,
  },
  empty: {
    paddingTop: spacing[7],
    alignItems: 'center',
    gap: spacing[2],
  },
  emptyHeadline: {
    fontFamily: fonts.bodyMedium,
    fontSize: 17,
    color: colors.ink,
  },
  emptyBody: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: 'rgba(0,0,0,0.5)',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
  },
});
