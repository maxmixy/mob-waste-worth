import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Image } from 'expo-image';
import { Colors } from '@/constants/Colors';

interface LogoLoadingAnimationProps {
  size?: number;
  showBackground?: boolean;
}

export default function LogoLoadingAnimation({ 
  size = 120, 
  showBackground = false 
}: LogoLoadingAnimationProps) {
  const [currentLogoIndex, setCurrentLogoIndex] = useState(0);
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;

  const logoImages = [
    require('@/assets/images/logo animation 1.png'),
    require('@/assets/images/logo animation 2.png'),
    require('@/assets/images/logo animation 3.png'),
  ];

  useEffect(() => {
    // Start logo animation sequence
    startLogoAnimation();
  }, []);

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
              // Animation complete, restart
              cycleCount = 0;
              animateCycle();
            }
          }, 150); // Hold logo 3
        }, 150); // Hold logo 2
      }, 150); // Hold logo 1
    };
    
    // Start the first cycle
    animateCycle();
  };

  return (
    <View style={[styles.container, showBackground && styles.containerWithBackground]}>
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
            style={[styles.logoImage, { width: size, height: size }]}
            contentFit="contain"
          />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  containerWithBackground: {
    backgroundColor: Colors.background,
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
    // Size will be set dynamically via props
  },
});
