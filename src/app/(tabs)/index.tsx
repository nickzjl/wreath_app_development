import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../../../theme/tokens';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.wordmark}>Wreath</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    fontFamily: fonts.display,
    fontSize: 48,
    color: colors.ink,
    letterSpacing: -1,
  },
});
