import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_COMPLETED_KEY = 'onboarding_completed';
const TAB_GUIDANCE_COMPLETED_KEY = 'tab_guidance_completed';

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

// Tab Guidance Functions
export const getTabGuidanceStatus = async (): Promise<boolean> => {
  try {
    const completed = await AsyncStorage.getItem(TAB_GUIDANCE_COMPLETED_KEY);
    console.log('[onboardingStorage] 🔍 Tab guidance status check:', { key: TAB_GUIDANCE_COMPLETED_KEY, value: completed });
    return completed === 'true';
  } catch (error) {
    console.error('❌ Error checking tab guidance status:', error);
    return false;
  }
};

export const markTabGuidanceCompleted = async () => {
  try {
    await AsyncStorage.setItem(TAB_GUIDANCE_COMPLETED_KEY, 'true');
    console.log('✅ Tab guidance marked as completed');
  } catch (error) {
    console.error('❌ Error marking tab guidance as completed:', error);
  }
};

export const clearTabGuidanceStatus = async () => {
  try {
    await AsyncStorage.removeItem(TAB_GUIDANCE_COMPLETED_KEY);
    console.log('✅ Tab guidance status cleared');
  } catch (error) {
    console.error('❌ Error clearing tab guidance status:', error);
  }
};
