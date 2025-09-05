import React from 'react';
import { useRouter } from 'expo-router';
import { Dimensions } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getUserId, updateEULAAcceptance, checkProfileCompletion } from '@/lib/user';
import EULA from '@/components/EULA';

const { height: screenHeight } = Dimensions.get('window');

export default function EULAPage() {
  const colorScheme = useColorScheme() ?? 'light';
  const router = useRouter();

  const handleAccept = async () => {
    try {
      const userId = await getUserId();
      if (userId) {
        const success = await updateEULAAcceptance(userId, true);
        if (success) {
          // Check if user has completed their profile
          const profileStatus = await checkProfileCompletion(userId);
          
          if (!profileStatus.profileCompleted) {
            // User needs to create their profile
            router.replace('/(login)/profile');
          } else {
            // User has completed both EULA and profile, proceed to main app
            router.replace('/(tabs)');
          }
        } else {
          alert('Failed to save EULA acceptance. Please try again.');
        }
      } else {
        alert('User not found. Please log in again.');
        router.replace('/(login)');
      }
    } catch (error) {
      console.error('Error accepting EULA:', error);
      alert('An error occurred. Please try again.');
    }
  };

  const handleDecline = async () => {
    try {
      const userId = await getUserId();
      if (userId) {
        await updateEULAAcceptance(userId, false);
      }
      // Return to login screen
      router.replace('/(login)');
    } catch (error) {
      console.error('Error declining EULA:', error);
      // Still return to login screen even if there's an error
      router.replace('/(login)');
    }
  };

  return (
    <ThemedView style={{ flex: 1, backgroundColor: Colors[colorScheme].background }}>
      <ThemedView style={{ height: screenHeight * 0.03 }} />
      <EULA onAccept={handleAccept} onDecline={handleDecline} />
    </ThemedView>
  );
}
