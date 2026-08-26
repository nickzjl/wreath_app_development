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

type RawBracket = {
  id: string;
  title: string;
  slug: string;
  goal_type: string;
  duration_days: number;
  stake_amount_cents: number | null;
  track_type: string;
  max_members: number;
};

type DiscoverBracket = RawBracket & {
  memberCount: number;
  isMember: boolean;
};

function goalTypeLabel(goalType: string): string {
  return goalType === 'one_time' ? 'One-time' : 'Daily';
}

function stakeLabel(amountCents: number | null, trackType: string): string {
  if (trackType !== 'staked' || amountCents === null) return 'Social';
  const dollars = amountCents / 100;
  return `$${dollars % 1 === 0 ? dollars.toFixed(0) : dollars.toFixed(2)}`;
}

function DiscoverCard({
  bracket,
  joining,
  error,
  onJoin,
}: {
  bracket: DiscoverBracket;
  joining: boolean;
  error: string | null;
  onJoin: () => void;
}) {
  const isFull = bracket.memberCount >= bracket.max_members;
  const disabled = isFull || bracket.isMember;
  const subtitle = `${goalTypeLabel(bracket.goal_type)} · ${bracket.duration_days} days · ${stakeLabel(bracket.stake_amount_cents, bracket.track_type)}`;
  const fillPct = Math.min(
    bracket.max_members > 0 ? bracket.memberCount / bracket.max_members : 0,
    1
  );

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle} numberOfLines={1}>
        {bracket.title}
      </Text>
      <Text style={styles.cardSubtitle}>{subtitle}</Text>

      <View style={styles.progressRow}>
        <Text style={styles.progressLabel}>
          {bracket.memberCount} of {bracket.max_members} joined
        </Text>
      </View>
      <View style={styles.progressTrack}>
        <View
          style={[styles.progressFill, { width: `${Math.round(fillPct * 100)}%` }]}
        />
      </View>

      {error && <Text style={styles.joinError}>{error}</Text>}

      <Pressable
        style={[
          styles.joinButton,
          (disabled || joining) && styles.joinButtonDisabled,
        ]}
        onPress={!disabled && !joining ? onJoin : undefined}
        disabled={disabled || joining}
      >
        {joining ? (
          <ActivityIndicator color={colors.cream} size="small" />
        ) : (
          <Text
            style={[styles.joinLabel, disabled && styles.joinLabelDisabled]}
          >
            {bracket.isMember ? 'Joined' : isFull ? 'Full' : 'Join'}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

export default function DiscoverScreen() {
  const router = useRouter();
  const [brackets, setBrackets] = useState<DiscoverBracket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joiningIds, setJoiningIds] = useState<Set<string>>(new Set());
  const [joinErrors, setJoinErrors] = useState<Record<string, string>>({});
  const [userId, setUserId] = useState<string | null>(null);

  async function fetchBrackets() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: raw, error: bracketsError } = await supabase
        .from('brackets')
        .select(
          'id, title, slug, goal_type, duration_days, stake_amount_cents, track_type, max_members'
        )
        .eq('visibility', 'public')
        .eq('status', 'open')
        .order('created_at', { ascending: false });

      if (bracketsError) throw bracketsError;
      if (!raw || raw.length === 0) {
        setBrackets([]);
        return;
      }

      const bracketIds = raw.map((b: RawBracket) => b.id);
      const { data: members } = await supabase
        .from('bracket_members')
        .select('bracket_id, user_id')
        .in('bracket_id', bracketIds);

      const enriched: DiscoverBracket[] = raw.map((b: RawBracket) => ({
        ...b,
        memberCount:
          members?.filter(
            (m: { bracket_id: string; user_id: string }) => m.bracket_id === b.id
          ).length ?? 0,
        isMember:
          members?.some(
            (m: { bracket_id: string; user_id: string }) =>
              m.bracket_id === b.id && m.user_id === user.id
          ) ?? false,
      }));

      setBrackets(enriched);
    } catch (err) {
      console.error('[discover brackets]', err);
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

  async function handleJoin(bracketId: string, slug: string) {
    if (!userId) return;
    setJoiningIds((prev) => new Set(prev).add(bracketId));
    setJoinErrors((prev) => {
      const next = { ...prev };
      delete next[bracketId];
      return next;
    });

    try {
      // TODO: charge stake via Stripe before inserting for staked brackets — payment skipped for now
      const { error } = await supabase.from('bracket_members').insert({
        bracket_id: bracketId,
        user_id: userId,
        role: 'member',
        stake_paid: false,
      });
      if (error) throw error;
      router.push(`/bracket/${slug}` as Href);
    } catch (err) {
      console.error('[join bracket]', err);
      setJoinErrors((prev) => ({
        ...prev,
        [bracketId]:
          err instanceof Error ? err.message : 'Failed to join. Please try again.',
      }));
    } finally {
      setJoiningIds((prev) => {
        const next = new Set(prev);
        next.delete(bracketId);
        return next;
      });
    }
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
          <DiscoverCard
            bracket={item}
            joining={joiningIds.has(item.id)}
            error={joinErrors[item.id] ?? null}
            onJoin={() => handleJoin(item.id, item.slug)}
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
        ListHeaderComponent={<Text style={styles.title}>Discover</Text>}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyHeadline}>No open brackets</Text>
            <Text style={styles.emptyBody}>
              Public brackets will appear here once they're approved.
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
  cardTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    color: colors.ink,
  },
  cardSubtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: 'rgba(0,0,0,0.5)',
  },
  progressRow: {
    marginTop: spacing[1],
  },
  progressLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: 'rgba(0,0,0,0.45)',
    marginBottom: spacing[1],
  },
  progressTrack: {
    height: 4,
    borderRadius: radii.full,
    backgroundColor: 'rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radii.full,
    backgroundColor: colors.sage,
  },
  joinError: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: '#c00',
    lineHeight: 18,
  },
  joinButton: {
    backgroundColor: colors.ink,
    paddingVertical: spacing[2],
    borderRadius: radii.full,
    alignItems: 'center',
    marginTop: spacing[1],
  },
  joinButtonDisabled: {
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  joinLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.cream,
  },
  joinLabelDisabled: {
    color: 'rgba(0,0,0,0.35)',
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
