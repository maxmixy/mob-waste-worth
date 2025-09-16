import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Animated, Text } from 'react-native';
import { ThemedView } from './ThemedView';
import { Colors } from '@/constants/Colors';
import { Image } from 'expo-image';

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [currentLogoIndex, setCurrentLogoIndex] = useState(0);
  const backgroundOpacity = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;

  const logoImages = [
    require('@/assets/images/logo animation 1.png'),
    require('@/assets/images/logo animation 2.png'),
    require('@/assets/images/logo animation 3.png'),
  ];

  useEffect(() => {
    // Start background fade in
    Animated.timing(backgroundOpacity, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start(() => {
      // Start logo animation sequence
      startLogoAnimation();
    });
  }, [backgroundOpacity]);

  const startLogoAnimation = () => {
    let cycleCount = 0;
    const maxCycles = 6; // Run for 6 cycles with instant transitions
    
    // Make sure logo is visible from the start
    logoOpacity.setValue(1);
    
    const animateCycle = () => {
      // Logo 1 - instant switch
      setCurrentLogoIndex(0);
      setTimeout(() => {
        // Logo 2 - instant switch
        setCurrentLogoIndex(1);
        setTimeout(() => {
          // Logo 3 - instant switch
          setCurrentLogoIndex(2);
          setTimeout(() => {
            cycleCount++;
            if (cycleCount < maxCycles) {
              // Continue to next cycle
              animateCycle();
            } else {
              // Animation complete, fade out and move to next screen
              Animated.timing(logoOpacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
              }).start(() => {
                onComplete();
              });
            }
          }, 150); // Hold logo 3
        }, 150); // Hold logo 2
      }, 150); // Hold logo 1
    };
    
    // Start the first cycle
    animateCycle();
  };

  return (
    <Animated.View style={[styles.container, { opacity: backgroundOpacity }]}>
      {/* Background gradient */}
      <View style={styles.backgroundGradient} />
      
      {/* Logo container */}
      <View style={styles.logoContainer}>
        <Animated.View style={[
          styles.logoWrapper,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }]
          }
        ]}>
          <Image
            source={logoImages[currentLogoIndex]}
            style={styles.logoImage}
            contentFit="contain"
          />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F5FFFB', // Light green background from Figma
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 200,
    height: 200,
  },
});
