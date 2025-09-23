import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import SplashScreen from './SplashScreen';
import OnboardingSlides from './OnboardingSlides';

interface OnboardingFlowProps {
  onComplete: () => void;
  onSignup: () => void;
}

type OnboardingStep = 'splash' | 'slides' | 'complete';

export default function OnboardingFlow({ onComplete, onSignup }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('splash');

  const handleSplashComplete = () => {
    setCurrentStep('slides');
  };

  const handleSlidesComplete = () => {
    setCurrentStep('complete');
    onComplete();
  };

  return (
    <View style={styles.container}>
      {currentStep === 'splash' && (
        <SplashScreen onComplete={handleSplashComplete} />
      )}
      {currentStep === 'slides' && (
        <OnboardingSlides onComplete={handleSlidesComplete} onSignup={onSignup} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
