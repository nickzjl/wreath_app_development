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
import { colors, fonts, radii, spacing } from '../../../theme/tokens';

export default function SignUpScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignUp() {
    if (!email.trim() || !password) return;
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    setError(null);
    const { error: e } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (e) setError(e.message);
    // success: trigger creates profile, root layout redirects to onboarding
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <Text style={styles.headline}>Join Wreath</Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="rgba(0,0,0,0.35)"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            returnKeyType="next"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="rgba(0,0,0,0.35)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            returnKeyType="next"
          />
          <TextInput
            style={styles.input}
            placeholder="Confirm password"
            placeholderTextColor="rgba(0,0,0,0.35)"
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            autoComplete="new-password"
            returnKeyType="done"
            onSubmitEditing={handleSignUp}
          />
          {error && <Text style={styles.error}>{error}</Text>}
          <Pressable style={styles.button} onPress={handleSignUp} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={colors.cream} />
            ) : (
              <Text style={styles.buttonLabel}>Create account</Text>
            )}
          </Pressable>
        </View>

        <Pressable onPress={() => router.push('/(auth)/sign-in' as Href)}>
          <Text style={styles.link}>Already have an account? Sign in</Text>
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
    gap: spacing[6],
  },
  headline: {
    fontFamily: fonts.display,
    fontSize: 38,
    color: colors.ink,
    letterSpacing: -0.5,
  },
  form: {
    gap: spacing[4],
  },
  input: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: colors.ink,
    paddingVertical: spacing[2],
  },
  error: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: '#C0392B',
  },
  button: {
    backgroundColor: colors.ink,
    paddingVertical: spacing[3],
    borderRadius: radii.full,
    alignItems: 'center',
    marginTop: spacing[1],
  },
  buttonLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    color: colors.cream,
  },
  link: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
    opacity: 0.55,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});
