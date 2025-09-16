import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { StyleSheet, TouchableOpacity, Text, View, ScrollView, Platform, AppState, Dimensions, AppStateStatus, KeyboardAvoidingView } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import WasteToWorthLogo from '@/components/WasteToWorthLogo';
import { GoogleIconButton, FacebookIconButton } from '@/components/SocialLoginButtons';
import { FloatingLabelInput } from '@/components/FloatingLabelInput';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import { saveUserId, checkEULAAcceptance, checkProfileCompletion } from '@/lib/user';
import { useLocation } from '@/hooks/useLocation';
import { useClimateStorage } from '@/hooks/useClimateStorage';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebaseConfig';
import { LinearGradient } from 'expo-linear-gradient';
import { clearOnboardingStatus } from '@/lib/onboardingStorage';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withTiming,
  interpolate,
  Extrapolate,
  runOnJS
} from 'react-native-reanimated';

WebBrowser.maybeCompleteAuthSession();

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [appState, setAppState] = useState(AppState.currentState);

  // Dynamic backdrop animation
  const screenHeight = Dimensions.get('window').height;
  const scrollY = useSharedValue(0);
  const isScrolling = useSharedValue(false);
  
  // Handle scroll-based backdrop interaction with real-time following
  const handleScroll = (event: any) => {
    const scrollYValue = event.nativeEvent.contentOffset.y;
    scrollY.value = scrollYValue;
    isScrolling.value = true;
  };

  const handleScrollEnd = () => {
    isScrolling.value = false;
    // Snap to nearest position when scrolling ends
    if (scrollY.value > 25) {
      scrollY.value = withTiming(50, { duration: 200 });
    } else {
      scrollY.value = withTiming(0, { duration: 200 });
    }
  };

  const animatedBackdropStyle = useAnimatedStyle(() => {
    const backdropTop = interpolate(
      scrollY.value,
      [0, 50],
      [80, 0],
      Extrapolate.CLAMP
    );

    return {
      top: backdropTop,
      // Remove height completely - let it be determined by the static styles
    };
  });


  // Automatic onboarding refresh for non-logged-in users
  useEffect(() => {
    // Handle app state changes for mobile Safari
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to the foreground - refresh onboarding for non-logged-in users
        if (!isAuthenticated && !isLoading) {
          console.log('Login page: App came to foreground - refreshing onboarding for non-logged-in user');
          clearOnboardingStatus();
          router.replace('/(onboarding)/' as any);
        }
      }
      setAppState(nextAppState);
    };

    // Handle page visibility changes for mobile Safari
    const handleVisibilityChange = () => {
      if (!document.hidden && !isAuthenticated && !isLoading) {
        console.log('Login page: Page became visible - refreshing onboarding for non-logged-in user');
        clearOnboardingStatus();
        router.replace('/(onboarding)/' as any);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    // Add visibility change listener for web/mobile Safari
    if (Platform.OS === 'web') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }
    
    return () => {
      subscription?.remove();
      if (Platform.OS === 'web') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [appState, isAuthenticated, isLoading, router]);

  // Location and climate storage hooks
  const { location } = useLocation();
  const { fetchClimateData } = useClimateStorage();

  // Redirect authenticated users to main app
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      console.log('[Login] ✅ User already authenticated, redirecting to main app');
      router.replace('/(tabs)/' as any);
    }
  }, [isAuthenticated, isLoading, router]);

  // Handle post-login flow with climate data fetching
  const handlePostLogin = async (userId: string) => {
    try {
      console.log('[Login] 🔐 Login successful, checking user status...');
      
      // Check EULA acceptance
      const eulaStatus = await checkEULAAcceptance(userId);
      if (!eulaStatus.eulaAccepted) {
        console.log('[Login] 📋 User needs to accept EULA');
        router.replace('/(login)/eula');
        return;
      }

      // Check profile completion status
      const profileStatus = await checkProfileCompletion(userId);
      
      if (!profileStatus.profileCompleted) {
        console.log('[Login] 👤 User needs to create profile');
        router.replace('/(login)/profile');
        return;
      }

      // User has completed both EULA and profile, fetch climate data and proceed to main app
      console.log('[Login] ✅ User setup complete, fetching climate data...');
      console.log('[Login] 🔍 Current location status:', location);
      
      if (location) {
        console.log('[Login] 🌡️ Fetching climate data for location:', location);
        try {
          await fetchClimateData(location);
          console.log('[Login] ✅ Climate data fetched and stored successfully');
        } catch (error) {
          console.error('[Login] ❌ Error fetching climate data:', error);
          console.log('[Login] ⚠️ Continuing without climate data');
        }
      } else {
        console.log('[Login] ⚠️ No location available, climate data will be fetched later');
        console.log('[Login] 💡 This could be because:');
        console.log('  - Location permission not granted');
        console.log('  - Location service not available');
        console.log('  - Location still loading');
      }

      console.log('[Login] 🚀 Navigating to main app');
      router.replace('/(tabs)/' as any);
      
    } catch (error) {
      console.error('[Login] ❌ Error in post-login flow:', error);
      // Still navigate to main app even if climate data fails
      router.replace('/(tabs)/' as any);
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    setEmailError('');
    setPasswordError('');

    // ✅ local validation
    if (!email) {
      setEmailError("Email is required.");
      setLoading(false);
      return;
    }
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('Invalid email format.');
      setLoading(false);
      return;
    }
    
    if (!password) {
      setPasswordError("Password is required.");
      setLoading(false);
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      if (userCredential?.user?.uid) {
        await saveUserId(userCredential.user.uid);
        
        // Handle post-login flow (EULA, profile, climate data)
        await handlePostLogin(userCredential.user.uid);
      }
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/invalid-email') setEmailError('Invalid email format.');
      else if (code === 'auth/user-not-found') setEmailError('No account found with this email.');
      else if (code === 'auth/wrong-password') setPasswordError('Incorrect password.');
      else setPasswordError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Google auth
  const redirectUri = makeRedirectUri({ scheme: 'wastetoworth' });
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: '648267234726-q90cnh8men8ffntu76te6t69t07rhmjv.apps.googleusercontent.com',
    redirectUri,
    scopes: ['profile', 'email'],
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token, access_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token, access_token);
      signInWithCredential(auth, credential)
        .then(async (uc: any) => {
          if (uc?.user?.uid) {
            await saveUserId(uc.user.uid);
            
            // Handle post-login flow (EULA, profile, climate data)
            await handlePostLogin(uc.user.uid);
          }
        })
        .catch(() => setEmailError('Google sign-in failed.'));
    } else if (response?.type === 'error') {
      setEmailError('Google sign-in cancelled or failed.');
    }
  }, [response]);

  const handleGoogleLogin = async () => {
    try {
      await promptAsync();
    } catch {
      setEmailError('Google login failed.');
    }
  };

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Checking authentication...</ThemedText>
      </ThemedView>
    );
  }

  // Don't render login form if user is already authenticated (redirect will happen)
  if (isAuthenticated) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Redirecting to main app...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'web' ? undefined : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* SVG background */}
      <Image
        source={require('@/assets/images/green gradient.svg')}
        style={styles.svgBackground}
        contentFit="cover"
      />
      
      {/* Dynamic White rounded backdrop */}
      <Animated.View style={[styles.whiteBackdrop, animatedBackdropStyle]}>
        <ScrollView 
          style={styles.scrollContainer} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={true}
          onScroll={handleScroll}
          onScrollEndDrag={handleScrollEnd}
          onMomentumScrollEnd={handleScrollEnd}
          scrollEventThrottle={1}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
      <View style={styles.logoContainer}>
        <Image
          source={require('@/assets/images/logo animation 3.png')}
          style={styles.staticLogo}
          contentFit="contain"
        />
      </View>

      {/* Title */}
      <ThemedText type="title" style={styles.title}>
        Welcome upcycler!
      </ThemedText>
      <ThemedText type="subtitle" style={styles.subtitle}>
        Make a difference with every piece of waste you recycle.
      </ThemedText>

      {/* Inputs */}
      <View style={{ width: '100%', maxWidth: 340, marginBottom: 8 }}>
        <FloatingLabelInput
          label="Email"
          value={email}
          onChangeText={(t) => { setEmail(t); setEmailError(''); setPasswordError(''); }}
          placeholder="Enter your email"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          error={emailError}
        />
        {emailError ? <Text style={styles.inlineError}>{emailError}</Text> : null}

        <FloatingLabelInput
          label="Password"
          value={password}
          onChangeText={(t) => { setPassword(t); setEmailError(''); setPasswordError(''); }}
          placeholder="Enter your password"
          secureTextEntry={true}
          autoComplete="password"
          error={passwordError}
        />
        {passwordError ? <Text style={styles.inlineError}>{passwordError}</Text> : null}
      </View>

      {/* Log in button */}
      <TouchableOpacity
        style={[styles.button, styles.loginButton]}
        onPress={handleLogin}
        disabled={loading}
      >
        <ThemedText style={styles.buttonText}>{loading ? 'Logging in...' : 'Log in'}</ThemedText>
      </TouchableOpacity>

      {/* Sign up button */}
      <TouchableOpacity
        style={[styles.button, styles.signupButton, { marginTop: 12 }]}
        onPress={() => router.push('/(login)/signup')}
      >
        <ThemedText style={[styles.buttonText, styles.signupButtonText]}>Create account</ThemedText>
      </TouchableOpacity>

      {/* Social login */}
      <View style={styles.socialContainer}>
        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <ThemedText style={styles.dividerText}>or continue with</ThemedText>
          <View style={styles.dividerLine} />
        </View>
        
        <View style={styles.socialButtonsRow}>
          <GoogleIconButton 
            onPress={handleGoogleLogin} 
            disabled={loading}
            loading={loading}
          />
          
          <FacebookIconButton 
            onPress={() => alert('Facebook login not implemented yet')} 
            disabled={loading}
          />
        </View>
      </View>
        </ScrollView>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  svgBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  whiteBackdrop: {
    backgroundColor: Platform.OS === 'web' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.7)',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    marginHorizontal: 0,
    marginBottom: 0,
    paddingHorizontal: 24,
    paddingVertical: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '100%',
    overflow: 'visible',
    ...(Platform.OS === 'web' && { backdropFilter: 'blur(20px)' }),
  },
  bottomGradientFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 50,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  scrollContainer: {
    flex: 1,
    zIndex: 1,
  },
  scrollContent: { 
    flexGrow: 1,
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingHorizontal: 0,
    paddingVertical: 20,
    minHeight: '100%',
  },
  logoContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  staticLogo: {
    width: 120,
    height: 120,
    marginBottom: 6,
  },
  brandText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#00630F',
    textAlign: 'center',
    letterSpacing: 1.5,
    fontFamily: 'System',
  },
  title: { 
    marginBottom: 8, 
    fontSize: 24, 
    fontWeight: '700',
    color: '#2D5016',
    textAlign: 'center',
    lineHeight: 28,
  },
  subtitle: { 
    fontSize: 14, 
    color: '#4A6741', 
    textAlign: 'center', 
    marginBottom: 24, 
    maxWidth: 320,
    lineHeight: 18,
    fontWeight: '400',
  },
  button: {
    width: '100%',
    maxWidth: 340,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  buttonText: { 
    color: '#fff', 
    fontWeight: '600', 
    fontSize: 16,
    letterSpacing: 0.5,
  },
  loginButton: { 
    backgroundColor: '#00630F', 
    marginTop: 20,
  },
  signupButton: { 
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    marginTop: 16,
  },
  signupButtonText: {
    color: Colors.primary,
  },
  socialContainer: {
    width: '100%',
    maxWidth: 340,
    marginTop: 20,
    alignItems: 'center',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  socialButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#00630F',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#2D5016',
    fontWeight: '500',
  },
  inlineError: {
    color: Colors.error,
    fontSize: 12,
    marginBottom: 8,
    marginTop: -4,
  },
});

