import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform } from 'react-native';
import { clearOnboardingStatus } from '@/lib/onboardingStorage';

export default function DebugOnboarding() {
  const handleClearOnboarding = async (e: any) => {
    // Prevent default behavior that might cause refresh
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    
    try {
      await clearOnboardingStatus();
      
      if (Platform.OS === 'web') {
        // For web, show a more user-friendly message
        alert('Onboarding status cleared! The page will reload to show onboarding again.');
        // Reload the page to trigger the onboarding flow
        window.location.reload();
      } else {
        // For mobile, just show the alert
        alert('Onboarding status cleared! Restart the app to see onboarding again.');
      }
    } catch (error) {
      console.error('Error clearing onboarding status:', error);
      alert('Error clearing onboarding status. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.button} 
        onPress={handleClearOnboarding}
        activeOpacity={0.7}
      >
        <Text style={styles.buttonText}>Clear Onboarding Status (Debug)</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 20 : 50,
    right: Platform.OS === 'web' ? 20 : 20,
    zIndex: 1000,
  },
  button: {
    backgroundColor: '#ff4444',
    padding: Platform.OS === 'web' ? 12 : 8,
    borderRadius: Platform.OS === 'web' ? 8 : 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: 'white',
    fontSize: Platform.OS === 'web' ? 14 : 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
