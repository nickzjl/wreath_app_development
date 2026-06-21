import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import type { Href } from 'expo-router';
import { useFonts } from 'expo-font';
import { Fraunces_500Medium } from '@expo-google-fonts/fraunces';
import { Inter_400Regular, Inter_500Medium } from '@expo-google-fonts/inter';
import { AuthProvider, useAuth } from '@/context/auth';

function RootNavigator() {
  const { session, username } = useAuth();
  const router = useRouter();
  const segments = useSegments() as string[];

  useEffect(() => {
    if (session === undefined || username === undefined) return;

    const inAuth = segments[0] === '(auth)';
    const inOnboarding = segments[0] === '(onboarding)';

    if (!session && !inAuth) {
      router.replace('/(auth)/sign-in' as Href);
    } else if (session && !username && !inOnboarding) {
      router.replace('/(onboarding)/username' as Href);
    } else if (session && username && (inAuth || inOnboarding)) {
      router.replace('/(tabs)' as Href);
    }
  }, [session, username, segments]);

  if (session === undefined || username === undefined) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(onboarding)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Fraunces_500Medium,
    Inter_400Regular,
    Inter_500Medium,
  });

  return (
    <AuthProvider>
      {fontsLoaded ? <RootNavigator /> : null}
    </AuthProvider>
  );
}
