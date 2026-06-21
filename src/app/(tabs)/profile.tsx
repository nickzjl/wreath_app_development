import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, spacing } from '../../../theme/tokens';

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.sub}>Your commitments and history.</Text>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  safe: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 32,
    color: colors.ink,
    letterSpacing: -0.5,
  },
  sub: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: 'rgba(0,0,0,0.5)',
  },
});
