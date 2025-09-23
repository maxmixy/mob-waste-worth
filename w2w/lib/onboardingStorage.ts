import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_COMPLETED_KEY = 'onboarding_completed';

// Function to clear onboarding status for testing
export const clearOnboardingStatus = async () => {
  try {
    await AsyncStorage.removeItem(ONBOARDING_COMPLETED_KEY);
    console.log('✅ Onboarding status cleared');
  } catch (error) {
    console.error('❌ Error clearing onboarding status:', error);
  }
};

// Function to check onboarding status
export const getOnboardingStatus = async (): Promise<boolean> => {
  try {
    const completed = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
    return completed === 'true';
  } catch (error) {
    console.error('❌ Error checking onboarding status:', error);
    return false;
  }
};

// Function to mark onboarding as completed
export const markOnboardingCompleted = async () => {
  try {
    await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
    console.log('✅ Onboarding marked as completed');
  } catch (error) {
    console.error('❌ Error marking onboarding as completed:', error);
  }
};
