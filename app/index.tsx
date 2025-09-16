import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { View, StyleSheet, Platform, AppState } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import LogoLoadingAnimation from '@/components/LogoLoadingAnimation';
import { useAuth } from '@/contexts/AuthContext';

import { getOnboardingStatus, clearOnboardingStatus } from '@/lib/onboardingStorage';

export default function AppIndex() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null);
  const [appState, setAppState] = useState(AppState.currentState);

  useEffect(() => {
    checkOnboardingStatus();
    const handleAppStateChange = (nextAppState: any) => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to the foreground - refresh onboarding for non-logged-in users
        if (!isAuthenticated && !isLoading) {
          console.log('App came to foreground - refreshing onboarding for non-logged-in user');
          clearOnboardingStatus();
          router.replace('/(onboarding)/' as any);
        }
      }
      setAppState(nextAppState);
    };

    // Handle page visibility changes for mobile Safari
    const handleVisibilityChange = () => {
      if (!document.hidden && !isAuthenticated && !isLoading) {
        console.log('Page became visible - refreshing onboarding for non-logged-in user');
        clearOnboardingStatus();
        router.replace('/(onboarding)/' as any);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    // Add visibility change listener for web/mobile Safari
    if (Platform.OS === 'web') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }
    
    return () => {
      subscription?.remove();
      if (Platform.OS === 'web') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [appState, isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (hasCompletedOnboarding !== null && !isLoading) {
      if (isAuthenticated) {
        // User is authenticated, go to main app
        router.replace('/(tabs)/' as any);
      } else {
        // User is not logged in - automatically refresh onboarding
        // Always clear onboarding status to show onboarding slides again
        console.log('Non-logged-in user detected - clearing onboarding status and showing slides');
        clearOnboardingStatus();
        // Force navigation to onboarding with a small delay to ensure state is cleared
        setTimeout(() => {
          router.replace('/(onboarding)/' as any);
        }, 100);
      }
    }
  }, [hasCompletedOnboarding, isAuthenticated, isLoading, router]);

  const checkOnboardingStatus = async () => {
    try {
      const completed = await getOnboardingStatus();
      setHasCompletedOnboarding(completed);
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setHasCompletedOnboarding(false);
    }
  };

  // Show loading screen while checking status
  if (hasCompletedOnboarding === null || isLoading) {
    return (
      <ThemedView style={styles.container}>
        <LogoLoadingAnimation size={120} showBackground={true} />
      </ThemedView>
    );
  }

  // This should not render as we redirect above
  return (
    <ThemedView style={styles.container}>
      <ThemedText>Redirecting...</ThemedText>
    </ThemedView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
