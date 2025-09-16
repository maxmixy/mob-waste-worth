import React from 'react';
import { useRouter } from 'expo-router';
import OnboardingFlow from '@/components/OnboardingFlow';
import { markOnboardingCompleted } from '@/lib/onboardingStorage';

export default function OnboardingPage() {
  const router = useRouter();

  const handleOnboardingComplete = async () => {
    // Mark onboarding as completed
    await markOnboardingCompleted();
    
    // Navigate to login page after onboarding is complete
    router.replace('/(login)/' as any);
  };

  const handleSignup = async () => {
    // Mark onboarding as completed
    await markOnboardingCompleted();
    
    // Navigate to signup page
    router.replace('/(login)/signup' as any);
  };

  return (
    <OnboardingFlow onComplete={handleOnboardingComplete} onSignup={handleSignup} />
  );
}
