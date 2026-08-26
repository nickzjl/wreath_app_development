import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { colors, fonts, radii, spacing } from '../../../theme/tokens';

type BracketFull = {
  id: string;
  title: string;
  slug: string;
  status: string;
  goal_type: string;
  duration_days: number;
  stake_amount_cents: number | null;
  track_type: string;
  max_members: number;
  visibility: string;
};

function goalTypeLabel(goalType: string): string {
  return goalType === 'one_time' ? 'One-time' : 'Daily';
}

function stakeLabel(amountCents: number | null, trackType: string): string {
  if (trackType !== 'staked' || amountCents === null) return 'Social';
  const dollars = amountCents / 100;
  return `$${dollars % 1 === 0 ? dollars.toFixed(0) : dollars.toFixed(2)}`;
}

function statusMessage(status: string): string {
  switch (status) {
    case 'pending_review':
      return 'Under review — we typically approve within 24 hours.';
    case 'open':
      return 'This bracket is open for members to join.';
    case 'active':
      return 'This bracket is in progress.';
    case 'completed':
      return 'This bracket has concluded.';
    case 'rejected':
      return 'This bracket was not approved.';
    case 'cancelled':
      return 'This bracket was cancelled.';
    default:
      return status.replace(/_/g, ' ');
  }
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  pending_review: { label: 'Under review', bg: colors.sage, text: colors.cream },
  open: { label: 'Open to join', bg: colors.gold, text: colors.ink },
  active: { label: 'Active', bg: colors.ink, text: colors.cream },
  completed: { label: 'Completed', bg: 'rgba(0,0,0,0.08)', text: 'rgba(0,0,0,0.4)' },
  rejected: { label: 'Rejected', bg: '#fce8e8', text: '#c00' },
  cancelled: { label: 'Cancelled', bg: 'rgba(0,0,0,0.08)', text: 'rgba(0,0,0,0.4)' },
};

export default function BracketDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();

  const [bracket, setBracket] = useState<BracketFull | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [approveLoading, setApproveLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);
  const [rejectError, setRejectError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const [{ data: b }, { data: p }] = await Promise.all([
        supabase
          .from('brackets')
          .select(
            'id, title, slug, status, goal_type, duration_days, stake_amount_cents, track_type, max_members, visibility'
          )
          .eq('slug', slug)
          .single(),
        supabase.from('profiles').select('role').eq('id', user.id).single(),
      ]);

      setBracket(b as BracketFull | null);
      setUserRole((p as { role: string } | null)?.role ?? null);
      setLoading(false);
    }
    load();
  }, [slug]);

  async function handleApprove() {
    if (!bracket || !userId) return;
    setApproveLoading(true);
    setActionError(null);
    try {
      const { error } = await supabase
        .from('brackets')
        .update({
          status: 'open',
          reviewed_by: userId,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', bracket.id);
      if (error) throw error;
      setBracket((prev) => (prev ? { ...prev, status: 'open' } : prev));
    } catch (err) {
      console.error('[approve bracket]', err);
      setActionError(
        err instanceof Error ? err.message : 'Failed to approve. Please try again.'
      );
    } finally {
      setApproveLoading(false);
    }
  }

  async function handleReject() {
    if (!bracket || !userId) return;
    setRejectLoading(true);
    setRejectError(null);
    try {
      const { error } = await supabase
        .from('brackets')
        .update({
          status: 'rejected',
          reviewed_by: userId,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes.trim() || null,
        })
        .eq('id', bracket.id);
      if (error) throw error;
      setBracket((prev) => (prev ? { ...prev, status: 'rejected' } : prev));
      setRejectModalVisible(false);
      setReviewNotes('');
    } catch (err) {
      console.error('[reject bracket]', err);
      setRejectError(
        err instanceof Error ? err.message : 'Failed to reject. Please try again.'
      );
    } finally {
      setRejectLoading(false);
    }
  }

  function closeRejectModal() {
    if (rejectLoading) return;
    setRejectModalVisible(false);
    setReviewNotes('');
    setRejectError(null);
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

  if (!bracket) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}>
          <Text style={styles.notFound}>Bracket not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const badgeConfig = STATUS_CONFIG[bracket.status] ?? {
    label: bracket.status.replace(/_/g, ' '),
    bg: 'rgba(0,0,0,0.08)',
    text: 'rgba(0,0,0,0.4)',
  };
  const subtitle = `${goalTypeLabel(bracket.goal_type)} · ${bracket.duration_days} days · ${stakeLabel(bracket.stake_amount_cents, bracket.track_type)}`;
  const isModerator = userRole === 'moderator' || userRole === 'admin';
  const canModerate = isModerator && bracket.status === 'pending_review';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && styles.backPressed]}
          onPress={() => router.back()}
          hitSlop={12}
        >
          <Text style={styles.backLabel}>← Back</Text>
        </Pressable>

        <Text style={styles.title}>{bracket.title}</Text>

        <View style={[styles.badge, { backgroundColor: badgeConfig.bg }]}>
          <Text style={[styles.badgeText, { color: badgeConfig.text }]}>
            {badgeConfig.label}
          </Text>
        </View>

        <Text style={styles.subtitle}>{subtitle}</Text>
        <Text style={styles.statusMessage}>{statusMessage(bracket.status)}</Text>

        {canModerate && (
          <View style={styles.moderationSection}>
            {actionError && <Text style={styles.actionError}>{actionError}</Text>}
            <Pressable
              style={({ pressed }) => [
                styles.approveButton,
                pressed && styles.pressed,
                approveLoading && styles.buttonDisabled,
              ]}
              onPress={handleApprove}
              disabled={approveLoading}
            >
              {approveLoading ? (
                <ActivityIndicator color={colors.cream} />
              ) : (
                <Text style={styles.approveLabel}>Approve</Text>
              )}
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.rejectButton, pressed && styles.pressed]}
              onPress={() => setRejectModalVisible(true)}
              disabled={approveLoading}
            >
              <Text style={styles.rejectLabel}>Reject</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={rejectModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeRejectModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable style={styles.modalBackdrop} onPress={closeRejectModal} />
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Reject bracket</Text>
            <Text style={styles.modalLabel}>NOTES (OPTIONAL)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Brief reason for rejection..."
              placeholderTextColor="rgba(0,0,0,0.35)"
              value={reviewNotes}
              onChangeText={setReviewNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            {rejectError && <Text style={styles.rejectError}>{rejectError}</Text>}
            <View style={styles.modalRow}>
              <Pressable
                style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
                onPress={closeRejectModal}
                disabled={rejectLoading}
              >
                <Text style={styles.cancelLabel}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.confirmButton,
                  pressed && styles.pressed,
                  rejectLoading && styles.buttonDisabled,
                ]}
                onPress={handleReject}
                disabled={rejectLoading}
              >
                {rejectLoading ? (
                  <ActivityIndicator color={colors.cream} size="small" />
                ) : (
                  <Text style={styles.confirmLabel}>Reject</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  scroll: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: 60,
    gap: spacing[3],
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: spacing[2],
  },
  backPressed: {
    opacity: 0.5,
  },
  backLabel: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: 'rgba(0,0,0,0.55)',
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.ink,
    letterSpacing: -0.5,
  },
  badge: {
    paddingHorizontal: spacing[2],
    paddingVertical: 4,
    borderRadius: radii.full,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    letterSpacing: 0.2,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: 'rgba(0,0,0,0.5)',
  },
  statusMessage: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: 'rgba(0,0,0,0.55)',
    lineHeight: 22,
  },
  notFound: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: 'rgba(0,0,0,0.45)',
  },
  moderationSection: {
    marginTop: spacing[4],
    gap: spacing[3],
  },
  actionError: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: '#c00',
    lineHeight: 18,
  },
  approveButton: {
    backgroundColor: colors.ink,
    paddingVertical: spacing[3],
    borderRadius: radii.full,
    alignItems: 'center',
  },
  approveLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    color: colors.cream,
  },
  rejectButton: {
    paddingVertical: spacing[3],
    borderRadius: radii.full,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.ink,
  },
  rejectLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    color: colors.ink,
  },
  pressed: {
    opacity: 0.7,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalBox: {
    backgroundColor: colors.cream,
    borderRadius: radii.lg,
    padding: spacing[5],
    width: '85%',
    gap: spacing[3],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.ink,
    letterSpacing: -0.3,
  },
  modalLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: 'rgba(0,0,0,0.6)',
    marginBottom: -spacing[1],
  },
  modalInput: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.15)',
    borderRadius: radii.md,
    padding: spacing[3],
    minHeight: 80,
  },
  rejectError: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: '#c00',
    lineHeight: 18,
  },
  modalRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[1],
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: radii.full,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
  },
  cancelLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: 'rgba(0,0,0,0.6)',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: radii.full,
    alignItems: 'center',
    backgroundColor: '#c00',
  },
  confirmLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: '#fff',
  },
});
