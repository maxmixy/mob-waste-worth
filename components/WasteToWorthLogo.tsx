import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { SvgXml } from 'react-native-svg';

interface WasteToWorthLogoProps {
  size?: number;
  animated?: boolean;
  showText?: boolean;
}

export default function WasteToWorthLogo({ 
  size = 120, 
  animated = true, 
  showText = true 
}: WasteToWorthLogoProps) {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated) {
      // Staggered animations for dynamic effect
      const animations = [
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(bounceAnim, {
          toValue: 1,
          tension: 100,
          friction: 6,
          useNativeDriver: true,
        }),
      ];

      // Start animations with slight delays
      animations.forEach((animation, index) => {
        setTimeout(() => {
          animation.start();
        }, index * 150);
      });
    } else {
      // Static state
      scaleAnim.setValue(1);
      fadeAnim.setValue(1);
      bounceAnim.setValue(1);
    }
  }, [animated]);

  const logoSize = size * 0.7; // Logo takes 70% of total size
  const textSize = size * 0.15; // Text size relative to logo

  const logoStyle = {
    transform: [
      { scale: scaleAnim },
      {
        translateY: bounceAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [15, 0],
        })
      }
    ],
    opacity: fadeAnim,
  };

  // SVG content from Figma design
  const svgContent = `
    <svg width="237" height="196" viewBox="0 0 237 196" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M99.7076 195.891L46.9668 195.999L0 0.486158L55.5782 0.372147L64.5623 67.7822L77.8817 133.18L94.6045 67.7206L98.9073 49.8532L85.9542 0.309835L140.531 0.197877L152.686 67.6014L167.508 132.997L176.553 67.5525L186.262 0.104066L237 -1.62188e-05L194.341 195.697L137.427 195.814L116.737 117.245L99.7076 195.891Z" fill="#00630F"/>
    </svg>
  `;

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logoContainer, logoStyle, { width: logoSize, height: logoSize }]}>
        {/* Figma W Logo */}
        <SvgXml 
          xml={svgContent} 
          width={logoSize} 
          height={logoSize * (196/237)} // Maintain aspect ratio
        />
      </Animated.View>

      {showText && (
        <Animated.Text style={[styles.brandText, { 
          fontSize: textSize,
          opacity: fadeAnim,
          transform: [{ translateY: bounceAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [10, 0],
          })}]
        }]}>
          Waste to Worth
        </Animated.Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    marginTop: 12,
    fontWeight: '700',
    color: '#00630F',
    textAlign: 'center',
    letterSpacing: 1.5,
    fontFamily: 'System',
  },
});