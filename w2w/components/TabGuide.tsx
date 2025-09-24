import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Pressable, 
  Dimensions, 
  Animated,
  Modal
} from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { Colors } from '@/constants/Colors';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { markTabGuidanceCompleted } from '@/lib/onboardingStorage';

const { width, height } = Dimensions.get('window');

interface TabGuideStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  tabRoute: string;
  arrowPosition: 'top' | 'bottom' | 'left' | 'right';
}

interface TabGuideProps {
  visible: boolean;
  onComplete: () => void;
}

export default function TabGuide({ visible, onComplete }: TabGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [fadeAnim] = useState(new Animated.Value(0));
  const router = useRouter();


  const steps: TabGuideStep[] = [
    {
      id: 'home',
      title: 'Welcome to Waste to Worth!',
      description: 'This is your home screen where you can see your recent activities, current projects, and quick stats.',
      icon: <MaterialIcons name="home" size={32} color={Colors.primary} />,
      tabRoute: '/(tabs)/',
      arrowPosition: 'top'
    },
    {
      id: 'history',
      title: 'Your History',
      description: 'Track all your scanned materials and recycling projects here. See your progress over time.',
      icon: <FontAwesome5 name="history" size={32} color={Colors.primary} />,
      tabRoute: '/(tabs)/history',
      arrowPosition: 'top'
    },
    {
      id: 'scan',
      title: 'Scan Waste Items',
      description: 'Use your camera to scan waste items and discover recycling opportunities. This is the main feature!',
      icon: <MaterialCommunityIcons name="cube-scan" size={32} color="white" />,
      tabRoute: '/(tabs)/scan',
      arrowPosition: 'top'
    },
    {
      id: 'community',
      title: 'Community',
      description: 'Share your recycling projects and see what others are creating. Get inspired by the community!',
      icon: <FontAwesome6 name="people-group" size={30} color={Colors.primary} />,
      tabRoute: '/(tabs)/community',
      arrowPosition: 'top'
    },
    {
      id: 'quests',
      title: 'Quests & Achievements',
      description: 'Complete daily quests and unlock achievements to track your recycling journey and earn rewards.',
      icon: <FontAwesome5 name="scroll" size={30} color={Colors.primary} />,
      tabRoute: '/(tabs)/quests',
      arrowPosition: 'top'
    }
  ];

  useEffect(() => {
    if (visible) {
      // Navigate to the first tab when guide starts
      if (steps[0]) {
        router.push(steps[0].tabRoute as any);
      }
      
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  // Navigate to the appropriate tab when step changes
  useEffect(() => {
    if (visible && steps[currentStep]) {
      const currentStepData = steps[currentStep];
      
      // Add a small delay for smoother transition
      setTimeout(() => {
        router.push(currentStepData.tabRoute as any);
      }, 100);
    }
  }, [currentStep, visible, router]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = async () => {
    await markTabGuidanceCompleted();
    onComplete();
  };

  const currentStepData = steps[currentStep];

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      pointerEvents="box-none"
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim, pointerEvents: 'box-none' }]}>
        {/* Dark overlay - but leave tab bar area clear */}
        <View style={styles.darkOverlayWithTabBar} />
        
        
        
        {/* Tooltip */}
        <View style={[
          styles.tooltip,
          currentStepData.arrowPosition === 'top' ? styles.tooltipTop :
          currentStepData.arrowPosition === 'bottom' ? styles.tooltipBottom :
          currentStepData.arrowPosition === 'left' ? styles.tooltipLeft :
          styles.tooltipRight,
          { pointerEvents: 'auto' }
        ]}>
          <View style={styles.tooltipContent}>
            <View style={styles.tooltipHeader}>
              {currentStepData.icon}
              <ThemedText style={styles.tooltipTitle}>{currentStepData.title}</ThemedText>
            </View>
            <ThemedText style={styles.tooltipDescription}>
              {currentStepData.description}
            </ThemedText>
            
            <View style={styles.tooltipFooter}>
              <View style={styles.stepIndicator}>
                {steps.map((step, index) => (
                  <View
                    key={index}
                    style={[
                      styles.stepDot,
                      index === currentStep && styles.stepDotActive
                    ]}
                  />
                ))}
              </View>
              
              {/* Show current tab name */}
              <ThemedText style={styles.currentTabText}>
                Currently viewing: {steps[currentStep]?.title}
              </ThemedText>
              
              <View style={styles.tooltipButtons}>
                <Pressable style={styles.skipButton} onPress={handleSkip}>
                  <ThemedText style={styles.skipButtonText}>Skip</ThemedText>
                </Pressable>
                <Pressable style={styles.nextButton} onPress={handleNext}>
                  <ThemedText style={styles.nextButtonText}>
                    {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    position: 'relative',
  },
  darkOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  darkOverlayWithTabBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 120, // Leave more space for tab bar to ensure complete visibility
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  tooltip: {
    position: 'absolute',
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 16,
  },
  tooltipTop: {
    top: height * 0.65, // Position in middle-upper area of screen
    left: 20,
    right: 20,
  },
  tooltipBottom: {
    top: height * 0.3,
    left: 20,
    right: 20,
  },
  tooltipLeft: {
    top: height * 0.35,
    left: 20,
    width: width * 0.8,
  },
  tooltipRight: {
    top: height * 0.35,
    right: 20,
    width: width * 0.8,
  },
  tooltipContent: {
    flex: 1,
  },
  tooltipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tooltipTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginLeft: 12,
    flex: 1,
  },
  tooltipDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  tooltipFooter: {
    alignItems: 'center',
  },
  stepIndicator: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
    marginHorizontal: 4,
  },
  stepDotActive: {
    backgroundColor: Colors.primary,
    width: 24,
  },
  tooltipButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  nextButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: Colors.primary,
  },
  nextButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textWhite,
  },
  currentTabText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
});
