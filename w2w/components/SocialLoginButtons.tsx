import React from 'react';
import { TouchableOpacity, StyleSheet, View, Image } from 'react-native';
import { ThemedText } from './ThemedText';
import { Colors } from '@/constants/Colors';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Ionicons } from '@expo/vector-icons';

interface SocialLoginButtonProps {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}

// Google Logo Component (using official Google logo image)
const GoogleLogo = ({ size = 28 }: { size?: number }) => (
  <Image
    source={{ uri: 'https://developers.google.com/identity/images/g-logo.png' }}
    style={{ width: size, height: size }}
    resizeMode="contain"
  />
);

// Facebook Logo Component (using official Facebook logo image)
const FacebookLogo = ({ size = 28 }: { size?: number }) => (
  <Image
    source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg' }}
    style={{ width: size, height: size }}
    resizeMode="contain"
  />
);

// Compact icon-only buttons
export const GoogleIconButton = ({ onPress, disabled = false, loading = false }: SocialLoginButtonProps) => (
  <TouchableOpacity
    style={[styles.iconButton, styles.googleIconButton, disabled && styles.disabledButton]}
    onPress={onPress}
    disabled={disabled || loading}
    activeOpacity={0.8}
  >
    <GoogleLogo size={28} />
  </TouchableOpacity>
);

export const FacebookIconButton = ({ onPress, disabled = false, loading = false }: SocialLoginButtonProps) => (
  <TouchableOpacity
    style={[styles.iconButton, styles.facebookIconButton, disabled && styles.disabledButton]}
    onPress={onPress}
    disabled={disabled || loading}
    activeOpacity={0.8}
  >
    <FacebookLogo size={28} />
  </TouchableOpacity>
);

export const GoogleLoginButton = ({ onPress, disabled = false, loading = false }: SocialLoginButtonProps) => (
  <TouchableOpacity
    style={[styles.socialButton, styles.googleButton, disabled && styles.disabledButton]}
    onPress={onPress}
    disabled={disabled || loading}
    activeOpacity={0.8}
  >
    <GoogleLogo size={28} />
    <ThemedText style={[styles.socialButtonText, styles.googleButtonText]}>
      {loading ? 'Signing in...' : 'Continue with Google'}
    </ThemedText>
  </TouchableOpacity>
);

export const FacebookLoginButton = ({ onPress, disabled = false, loading = false }: SocialLoginButtonProps) => (
  <TouchableOpacity
    style={[styles.socialButton, styles.facebookButton, disabled && styles.disabledButton]}
    onPress={onPress}
    disabled={disabled || loading}
    activeOpacity={0.8}
  >
    <FacebookLogo size={28} />
    <ThemedText style={[styles.socialButtonText, styles.facebookButtonText]}>
      {loading ? 'Connecting...' : 'Continue with Facebook'}
    </ThemedText>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
    minHeight: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DADCE0',
  },
  facebookButton: {
    backgroundColor: '#1877F2',
    borderWidth: 0,
  },
  socialButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 12,
    flex: 1,
    textAlign: 'center',
  },
  googleButtonText: {
    color: '#3C4043',
  },
  facebookButtonText: {
    color: '#FFFFFF',
  },
  disabledButton: {
    opacity: 0.6,
  },
  
  // Icon-only button styles
  iconButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  googleIconButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DADCE0',
  },
  facebookIconButton: {
    backgroundColor: '#1877F3',
    borderWidth: 0,
  },
});
