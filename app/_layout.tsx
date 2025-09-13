import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthProvider } from '@/contexts/AuthContext';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(onboarding)" options={{ headerShown: false, animation: 'fade' }} />
          <Stack.Screen name="(login)/index" options={{ headerShown: false }} />
          <Stack.Screen name="(login)/signup" options={{ headerShown: false }} />
          <Stack.Screen name="(login)/eula" options={{ headerShown: false }} />
          <Stack.Screen name="(login)/profile" options={{ headerShown: false }} />
          <Stack.Screen name="(login)/profile-settings" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="pages/project-detail" options={{ headerShown: false }} />
          <Stack.Screen name="pages/detail" options={{ headerShown: false }} />
          <Stack.Screen name="pages/about" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
}
