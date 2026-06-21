import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { colors, fonts, spacing } from '../../../theme/tokens';

type Bracket = {
  id: string;
  title: string;
  status: string;
};

export default function BracketDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [bracket, setBracket] = useState<Bracket | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    supabase
      .from('brackets')
      .select('id, title, status')
      .eq('slug', slug)
      .single()
      .then(({ data }: { data: Bracket | null }) => {
        setBracket(data);
        setLoading(false);
      });
  }, [slug]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.ink} />
        </View>
      ) : !bracket ? (
        <View style={styles.center}>
          <Text style={styles.empty}>Bracket not found.</Text>
        </View>
      ) : (
        <View style={styles.content}>
          <Text style={styles.title}>{bracket.title}</Text>
          <Text style={styles.status}>
            {bracket.status === 'pending_review'
              ? 'Under review — we typically approve within 24 hours.'
              : bracket.status.replace(/_/g, ' ')}
          </Text>
        </View>
      )}
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
  content: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[5],
    gap: spacing[3],
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.ink,
    letterSpacing: -0.5,
  },
  status: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: 'rgba(0,0,0,0.55)',
    lineHeight: 22,
  },
  empty: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: 'rgba(0,0,0,0.45)',
  },
});
