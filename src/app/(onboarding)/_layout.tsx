import { Stack } from 'expo-router';
import { colors } from '../../../theme/tokens';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.cream },
      }}
    >
      <Stack.Screen name="username" />
    </Stack>
  );
}
