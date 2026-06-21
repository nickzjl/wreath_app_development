import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, type Href } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { colors, fonts, radii, spacing } from '../../../theme/tokens';
import { SegmentedControl } from '@/components/SegmentedControl';

type GoalType = 'one_time' | 'daily_habit';
type DurationOpt = '7' | '14' | '30' | 'Custom';
type StakeOpt = '$10' | '$25' | '$100' | 'Custom';
type SizeOpt = '1' | '2' | '4' | '8' | '16';
type PrivacyOpt = 'Private' | 'Public';

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 50);
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const id = Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
  return base ? `${base}-${id}` : id;
}

export default function CreateScreen() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [goalType, setGoalType] = useState<GoalType>('one_time');
  const [durationOpt, setDurationOpt] = useState<DurationOpt>('30');
  const [durationCustom, setDurationCustom] = useState('');
  const [isStaked, setIsStaked] = useState(true);
  const [stakeOpt, setStakeOpt] = useState<StakeOpt>('$25');
  const [stakeCustom, setStakeCustom] = useState('');
  const [sizeOpt, setSizeOpt] = useState<SizeOpt>('4');
  const [privacy, setPrivacy] = useState<PrivacyOpt>('Private');
  const [loading, setLoading] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [sizeError, setSizeError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function getDurationDays(): number {
    if (durationOpt === 'Custom') return parseInt(durationCustom, 10) || 0;
    return parseInt(durationOpt, 10);
  }

  function getStakeCents(): number | null {
    if (!isStaked) return null;
    if (stakeOpt === 'Custom') return Math.round((parseFloat(stakeCustom) || 0) * 100);
    return parseInt(stakeOpt.replace('$', ''), 10) * 100;
  }

  function validate(): boolean {
    let valid = true;

    if (!title.trim()) {
      setTitleError('Title is required.');
      valid = false;
    } else {
      setTitleError(null);
    }

    if (isStaked && parseInt(sizeOpt, 10) < 2) {
      setSizeError('Staked brackets need at least 2 members.');
      valid = false;
    } else {
      setSizeError(null);
    }

    if (durationOpt === 'Custom' && getDurationDays() < 1) valid = false;
    if (isStaked && stakeOpt === 'Custom' && !stakeCustom.trim()) valid = false;

    return valid;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setLoading(true);
    setSubmitError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const slug = slugify(title);
      const maxMembers = parseInt(sizeOpt, 10);

      const { data: bracket, error: bracketError } = await supabase
        .from('brackets')
        .insert({
          title: title.trim(),
          slug,
          goal_type: goalType,
          duration_days: getDurationDays(),
          track_type: isStaked ? 'staked' : 'social',
          stake_amount_cents: getStakeCents(),
          max_members: maxMembers,
          min_members: isStaked ? 2 : 1,
          visibility: privacy.toLowerCase(),
          status: 'pending_review',
          created_by: user.id,
        })
        .select('id, slug')
        .single();

      if (bracketError) {
        console.error('[create bracket]', bracketError);
        setSubmitError(bracketError.message);
        setLoading(false);
        return;
      }

      const { error: memberError } = await supabase.from('bracket_members').insert({
        bracket_id: bracket!.id,
        user_id: user.id,
        role: 'host',
        stake_paid: false,
      });

      if (memberError) {
        console.error('[create bracket_members]', memberError);
        setSubmitError(memberError.message);
        setLoading(false);
        return;
      }

      setLoading(false);
      router.push(`/bracket/${bracket!.slug}` as Href);
    } catch (err) {
      console.error('[handleSubmit]', err);
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.screenTitle}>Create a bracket</Text>

          {/* Title */}
          <View style={styles.field}>
            <Text style={styles.label}>TITLE</Text>
            <TextInput
              style={styles.textInput}
              placeholder="What's the goal? Be specific."
              placeholderTextColor="rgba(0,0,0,0.32)"
              value={title}
              onChangeText={(t) => {
                setTitle(t);
                setTitleError(null);
              }}
              returnKeyType="done"
            />
            {titleError && <Text style={styles.inlineError}>{titleError}</Text>}
          </View>

          {/* Type */}
          <View style={styles.field}>
            <Text style={styles.label}>TYPE</Text>
            <SegmentedControl
              options={['One-time goal', 'Daily habit']}
              selected={goalType === 'one_time' ? 'One-time goal' : 'Daily habit'}
              onSelect={(v) => setGoalType(v === 'One-time goal' ? 'one_time' : 'daily_habit')}
            />
          </View>

          {/* Duration */}
          <View style={styles.field}>
            <Text style={styles.label}>DURATION (DAYS)</Text>
            <SegmentedControl
              options={['7', '14', '30', 'Custom']}
              selected={durationOpt}
              onSelect={(v) => setDurationOpt(v as DurationOpt)}
            />
            {durationOpt === 'Custom' && (
              <TextInput
                style={[styles.textInput, styles.customInput]}
                placeholder="Number of days"
                placeholderTextColor="rgba(0,0,0,0.32)"
                value={durationCustom}
                onChangeText={setDurationCustom}
                keyboardType="number-pad"
                returnKeyType="done"
              />
            )}
          </View>

          {/* Staked toggle */}
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>This is a staked bracket</Text>
            <Switch
              value={isStaked}
              onValueChange={setIsStaked}
              trackColor={{ true: colors.ink, false: 'rgba(0,0,0,0.12)' }}
              thumbColor={Platform.OS === 'android' ? colors.cream : undefined}
              ios_backgroundColor="rgba(0,0,0,0.12)"
            />
          </View>

          {/* Stake amount */}
          {isStaked && (
            <View style={styles.field}>
              <Text style={styles.label}>STAKE PER PERSON</Text>
              <SegmentedControl
                options={['$10', '$25', '$100', 'Custom']}
                selected={stakeOpt}
                onSelect={(v) => setStakeOpt(v as StakeOpt)}
              />
              {stakeOpt === 'Custom' && (
                <TextInput
                  style={[styles.textInput, styles.customInput]}
                  placeholder="Amount in dollars"
                  placeholderTextColor="rgba(0,0,0,0.32)"
                  value={stakeCustom}
                  onChangeText={setStakeCustom}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                />
              )}
            </View>
          )}

          {/* Bracket size */}
          <View style={styles.field}>
            <Text style={styles.label}>BRACKET SIZE</Text>
            <SegmentedControl
              options={['1', '2', '4', '8', '16']}
              selected={sizeOpt}
              onSelect={(v) => {
                setSizeOpt(v as SizeOpt);
                setSizeError(null);
              }}
            />
            {sizeError && <Text style={styles.inlineError}>{sizeError}</Text>}
          </View>

          {/* Privacy */}
          <View style={styles.field}>
            <Text style={styles.label}>PRIVACY</Text>
            <SegmentedControl
              options={['Private', 'Public']}
              selected={privacy}
              onSelect={(v) => setPrivacy(v as PrivacyOpt)}
            />
          </View>

          {submitError && <Text style={styles.submitError}>{submitError}</Text>}

          <Pressable
            style={({ pressed }) => [styles.submitButton, pressed && styles.submitPressed]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.cream} />
            ) : (
              <Text style={styles.submitLabel}>Create Bracket</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[5],
    paddingBottom: 120,
    gap: spacing[5],
  },
  screenTitle: {
    fontFamily: fonts.display,
    fontSize: 32,
    color: colors.ink,
    letterSpacing: -0.5,
    marginBottom: spacing[1],
  },
  field: {
    gap: spacing[2],
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: 'rgba(0,0,0,0.6)',
  },
  textInput: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: 'rgba(0,0,0,0.2)',
    paddingVertical: spacing[2],
  },
  customInput: {
    marginTop: spacing[2],
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[1],
  },
  toggleLabel: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
    flex: 1,
  },
  inlineError: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: '#C0392B',
  },
  submitError: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: '#c00',
    lineHeight: 18,
  },
  submitButton: {
    backgroundColor: colors.ink,
    paddingVertical: spacing[3],
    borderRadius: radii.full,
    alignItems: 'center',
    marginTop: spacing[2],
  },
  submitPressed: {
    opacity: 0.8,
  },
  submitLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    color: colors.cream,
  },
});
