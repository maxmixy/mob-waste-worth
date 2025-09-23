import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';

interface IntroScreenProps {
  onComplete: () => void;
}

const IntroScreen: React.FC<IntroScreenProps> = ({ onComplete }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const w1Anim = useRef(new Animated.Value(0)).current;
  const w2Anim = useRef(new Animated.Value(0)).current;
  const textAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start the animation sequence
    const animationSequence = Animated.sequence([
      // First W appears
      Animated.timing(w1Anim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      // Second W appears
      Animated.timing(w2Anim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      // Logo scales in
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
      // Text fades in
      Animated.timing(textAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]);

    animationSequence.start(() => {
      // Wait a bit then move to next screen
      setTimeout(() => {
        onComplete();
      }, 1500);
    });
  }, [onComplete]);

  return (
    <View style={styles.container}>
      {/* Background gradient */}
      <View style={styles.backgroundGradient} />
      
      {/* Animated W letters */}
      <View style={styles.logoContainer}>
        <Animated.Text 
          style={[
            styles.wLetter, 
            styles.w1,
            {
              opacity: w1Anim,
              transform: [
                { scale: w1Anim },
                { translateX: w1Anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-50, 0],
                })}
              ]
            }
          ]}
        >
          W
        </Animated.Text>
        
        <Animated.Text 
          style={[
            styles.wLetter, 
            styles.w2,
            {
              opacity: w2Anim,
              transform: [
                { scale: w2Anim },
                { translateX: w2Anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0],
                })}
              ]
            }
          ]}
        >
          W
        </Animated.Text>
      </View>

      {/* Animated logo */}
      <Animated.View 
        style={[
          styles.logoWrapper,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        <View style={styles.logoCircle}>
          <View style={styles.recyclingSymbol}>
            <View style={styles.arrow1} />
            <View style={styles.arrow2} />
            <View style={styles.arrow3} />
          </View>
        </View>
      </Animated.View>

      {/* Animated text */}
      <Animated.Text 
        style={[
          styles.brandText,
          {
            opacity: textAnim,
            transform: [
              { translateY: textAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [30, 0],
              })}
            ]
          }
        ]}
      >
        Waste to Worth
      </Animated.Text>
    </View>
  );
};

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
    backgroundColor: Colors.primary,
    opacity: 0.1,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  wLetter: {
    fontSize: 96,
    fontFamily: 'Arial Rounded MT Bold',
    fontWeight: '400',
    color: Colors.primary,
    marginHorizontal: 10,
  },
  w1: {
    color: '#DAFF07', // Yellow-green from design
  },
  w2: {
    color: Colors.primary,
  },
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  recyclingSymbol: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow1: {
    width: 20,
    height: 20,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    borderTopWidth: 0,
    borderRightWidth: 0,
    transform: [{ rotate: '45deg' }],
    position: 'absolute',
    top: 10,
    left: 20,
  },
  arrow2: {
    width: 20,
    height: 20,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    borderTopWidth: 0,
    borderRightWidth: 0,
    transform: [{ rotate: '165deg' }],
    position: 'absolute',
    top: 30,
    left: 10,
  },
  arrow3: {
    width: 20,
    height: 20,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    borderTopWidth: 0,
    borderRightWidth: 0,
    transform: [{ rotate: '285deg' }],
    position: 'absolute',
    top: 30,
    left: 30,
  },
  brandText: {
    fontSize: 20,
    fontFamily: 'Arial Rounded MT Bold',
    fontWeight: '400',
    color: Colors.primary,
    textAlign: 'center',
  },
});

export default IntroScreen;
