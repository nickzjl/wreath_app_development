import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '@/context/auth';
import { colors, fonts, radii, spacing } from '../../../theme/tokens';

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export default function UsernameScreen() {
  const router = useRouter();
  const { refreshProfile } = useAuth();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleContinue() {
    const value = username.trim().toLowerCase();
    if (!USERNAME_RE.test(value)) {
      setError('3–20 characters: lowercase letters, numbers, and underscores only.');
      return;
    }
    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ username: value })
      .eq('id', user.id);

    if (updateError) {
      setLoading(false);
      setError(updateError.message);
      return;
    }

    await refreshProfile();
    setLoading(false);
    router.replace('/(tabs)' as Href);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <View style={styles.header}>
          <Text style={styles.headline}>Choose a username</Text>
          <Text style={styles.subtitle}>
            Lowercase letters, numbers, and underscores. 3–20 characters.
          </Text>
        </View>

        <TextInput
          style={styles.input}
          placeholder="your_username"
          placeholderTextColor="rgba(0,0,0,0.35)"
          value={username}
          onChangeText={(t) => {
            setUsername(t);
            setError(null);
          }}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={handleContinue}
        />
        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable style={styles.button} onPress={handleContinue} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={colors.cream} />
          ) : (
            <Text style={styles.buttonLabel}>Continue</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  inner: {
    flex: 1,
    paddingHorizontal: spacing[5],
    justifyContent: 'center',
    gap: spacing[4],
  },
  header: {
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  headline: {
    fontFamily: fonts.display,
    fontSize: 38,
    color: colors.ink,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: 'rgba(0,0,0,0.55)',
    lineHeight: 22,
  },
  input: {
    fontFamily: fonts.body,
    fontSize: 20,
    color: colors.ink,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: colors.ink,
    paddingVertical: spacing[2],
  },
  error: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: '#C0392B',
    marginTop: -spacing[2],
  },
  button: {
    backgroundColor: colors.ink,
    paddingVertical: spacing[3],
    borderRadius: radii.full,
    alignItems: 'center',
    marginTop: spacing[2],
  },
  buttonLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    color: colors.cream,
  },
});
