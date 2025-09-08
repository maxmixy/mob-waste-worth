import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

import { ThemeVariantProvider, useThemeVariant } from '@/hooks/ThemeContext';

function InnerRoot() {
  const { scheme } = useThemeVariant();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const fade = useRef(new Animated.Value(0)).current;

  // Hooks must not be called conditionally; always register the effect
  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 650,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, []);

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
      <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Animated.View style={{ flex: 1, opacity: fade }}>
      <Stack>
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
        </Animated.View>
      </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeVariantProvider>
      <InnerRoot />
    </ThemeVariantProvider>
  );
}
