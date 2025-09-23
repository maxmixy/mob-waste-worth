import React from 'react';
import { 
  View, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  Dimensions, 
  Platform,
  Image
} from 'react-native';
import { Colors } from '@/constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface OnboardingSlidesProps {
  onComplete: () => void;
  onSignup: () => void;
}

export default function OnboardingSlides({ onComplete, onSignup }: OnboardingSlidesProps) {
  return (
    <View style={styles.container}>
      {/* Background Image */}
      <Image 
        source={require('@/assets/images/green gradient.svg')}
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      
      {/* Gradient Overlay */}
      <LinearGradient
        colors={['rgba(245, 255, 251, 0.3)', 'rgba(137, 205, 147, 0.4)']}
        style={styles.gradientOverlay}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      
      {/* Main content */}
      <View style={styles.contentContainer}>
        {/* Text content positioned higher */}
        <View style={styles.textContainer}>
          {/* Main title */}
          <Text style={styles.mainTitle}>
            Waste to Worth:{'\n'}Your Smart AI{'\n'}Recycling App
          </Text>
          
          {/* Subtitle */}
          <Text style={styles.subtitle}>
            With a click of a camera,{'\n'}your waste will be worthwhile
          </Text>
        </View>

        {/* Buttons positioned at bottom */}
        <View style={styles.buttonContainer}>
          {/* Join Now Button */}
          <TouchableOpacity
            style={styles.joinButton}
            onPress={onSignup}
          >
            <Text style={styles.joinButtonText}>Join Now</Text>
          </TouchableOpacity>

          {/* Login Link */}
          <TouchableOpacity 
            style={styles.loginLink}
            onPress={onComplete}
          >
            <Text style={styles.loginLinkText}>
              Already have an account? <Text style={styles.loginLinkBold}>Log in here</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Platform.OS === 'web' ? 40 : 32,
    paddingTop: Platform.OS === 'web' ? 60 : 80,
    paddingBottom: Platform.OS === 'web' ? 180 : 200,
    zIndex: 2,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Platform.OS === 'web' ? 80 : 100,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: Platform.OS === 'web' ? 20 : 30,
    paddingHorizontal: Platform.OS === 'web' ? 40 : 32,
    backgroundColor: 'transparent',
  },
  mainTitle: {
    fontSize: Platform.OS === 'web' ? 36 : 42,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    fontFamily: Platform.OS === 'web' ? 'Arial, sans-serif' : 'Arial Rounded MT Bold',
    lineHeight: Platform.OS === 'web' ? 44 : 50,
    marginBottom: Platform.OS === 'web' ? 16 : 20,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
    maxWidth: Platform.OS === 'web' ? 500 : screenWidth - 64,
  },
  subtitle: {
    fontSize: Platform.OS === 'web' ? 16 : 18,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: Platform.OS === 'web' ? 24 : 26,
    opacity: 0.95,
    marginBottom: Platform.OS === 'web' ? 40 : 48,
    maxWidth: Platform.OS === 'web' ? 450 : screenWidth - 64,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    fontWeight: '500',
  },
  joinButton: {
    backgroundColor: '#00630F',
    paddingHorizontal: Platform.OS === 'web' ? 48 : 56,
    paddingVertical: Platform.OS === 'web' ? 16 : 18,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: Platform.OS === 'web' ? 24 : 28,
    minWidth: Platform.OS === 'web' ? 200 : 180,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: Platform.OS === 'web' ? 18 : 20,
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: Platform.OS === 'web' ? 'Arial, sans-serif' : 'Arial Rounded MT Bold',
  },
  loginLink: {
    paddingVertical: Platform.OS === 'web' ? 8 : 12,
    paddingHorizontal: Platform.OS === 'web' ? 16 : 20,
    borderRadius: 8,
  },
  loginLinkText: {
    color: '#FFFFFF',
    fontSize: Platform.OS === 'web' ? 14 : 16,
    textAlign: 'center',
    fontFamily: Platform.OS === 'web' ? 'Arial, sans-serif' : 'Arial Rounded MT Bold',
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
    fontWeight: '500',
  },
  loginLinkBold: {
    fontWeight: 'bold',
    textDecorationLine: 'underline',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
});