import { Stack } from 'expo-router';
import { Colors } from '@/constants/Colors';

export default function LoginLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="profile-settings" />
      <Stack.Screen name="privacy" />
      <Stack.Screen name="eula" />
    </Stack>
  );
}
