import React from 'react';
import { useRouter } from 'expo-router';
import { Dimensions } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { getUserId, updateEULAAcceptance } from '@/lib/user';
import EULA from '@/components/EULA';

const { height: screenHeight } = Dimensions.get('window');

export default function EULAPage() {
  const router = useRouter();

  const handleAccept = async () => {
    try {
      const userId = await getUserId();
      if (userId) {
        const success = await updateEULAAcceptance(userId, true);
        if (success) {
          // Always go to profile page after accepting EULA
          router.replace('/(login)/profile');
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
      // Return to signup screen instead of login
      router.replace('/(login)/signup');
    } catch (error) {
      console.error('Error declining EULA:', error);
      // Still return to signup screen even if there's an error
      router.replace('/(login)/signup');
    }
  };

  return (
    <ThemedView style={{ flex: 1, backgroundColor: Colors.background }}>
      <ThemedView style={{ height: screenHeight * 0.03 }} />
      <EULA onAccept={handleAccept} onDecline={handleDecline} />
    </ThemedView>
  );
}
