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
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { saveUserId, updateEULAAcceptance } from '@/lib/user';
import EULA from '@/components/EULA';
import { useAuth } from '@/contexts/AuthContext';
import { auth, db } from '@/lib/firebaseConfig';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
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

export default function SignUpPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [showEULA, setShowEULA] = useState(false);
  const [pendingUserData, setPendingUserData] = useState<{email: string, password: string} | null>(null);
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
          console.log('Signup page: App came to foreground - refreshing onboarding for non-logged-in user');
          clearOnboardingStatus();
          router.replace('/(onboarding)/' as any);
        }
      }
      setAppState(nextAppState);
    };

    // Handle page visibility changes for mobile Safari
    const handleVisibilityChange = () => {
      if (!document.hidden && !isAuthenticated && !isLoading) {
        console.log('Signup page: Page became visible - refreshing onboarding for non-logged-in user');
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

  // Google auth setup
  const redirectUri = makeRedirectUri({ scheme: 'wastetoworth' });
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: '648267234726-q90cnh8men8ffntu76te6t69t07rhmjv.apps.googleusercontent.com',
    redirectUri,
    scopes: ['profile', 'email'],
  });

  // Redirect authenticated users to main app
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      console.log('[SignUp] ✅ User already authenticated, redirecting to main app');
      router.replace('/(tabs)/' as any);
    }
  }, [isAuthenticated, isLoading, router]);

  // Handle Google auth response
  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token, access_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token, access_token);
      signInWithCredential(auth, credential)
        .then(async (uc: any) => {
          if (uc?.user?.uid) {
            await saveUserId(uc.user.uid);
            
            // Update EULA acceptance status
            await updateEULAAcceptance(uc.user.uid, true);

            try {
              await setDoc(doc(db, 'User_Collection', uc.user.uid), {
                email: uc.user.email || null,
                createdAt: serverTimestamp(),
                eulaAccepted: true,
                eulaAcceptedAt: serverTimestamp(),
              });
            } catch (e) {
              console.warn('⚠️ Failed to create user document:', e);
            }

            router.replace('/(tabs)/' as any);
          }
        })
        .catch(() => setEmailError('Google sign-up failed.'));
    } else if (response?.type === 'error') {
      setEmailError('Google sign-up cancelled or failed.');
    }
  }, [response]);

  const handleSignUp = async () => {
    setLoading(true);
    setEmailError('');
    setPasswordError('');
    setConfirmError('');

    // ✅ Local validation
    if (!email) {
      setEmailError('Email is required.');
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
      setPasswordError('Password is required.');
      setLoading(false);
      return;
    }
    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      setLoading(false);
      return;
    }
    if (password !== confirm) {
      setConfirmError('Passwords do not match.');
      setLoading(false);
      return;
    }

    // Store user data and show EULA
    setPendingUserData({ email, password });
    setShowEULA(true);
    setLoading(false);
  };

  const handleEULAAccept = async () => {
    if (!pendingUserData) return;

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, pendingUserData.email, pendingUserData.password);

      if (userCredential?.user?.uid) {
        await saveUserId(userCredential.user.uid);

        // Update EULA acceptance status
        await updateEULAAcceptance(userCredential.user.uid, true);

        try {
          await setDoc(doc(db, 'User_Collection', userCredential.user.uid), {
            email: userCredential.user.email || null,
            createdAt: serverTimestamp(),
            eulaAccepted: true,
            eulaAcceptedAt: serverTimestamp(),
          });
        } catch (e) {
          console.warn('⚠️ Failed to create user document:', e);
        }

        router.replace('/(tabs)/' as any);
      }
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/email-already-in-use') setEmailError('This email is already registered.');
      else if (code === 'auth/invalid-email') setEmailError('Invalid email format.');
      else if (code === 'auth/weak-password') setPasswordError('Password is too weak.');
      else setPasswordError('Sign up failed. Please try again.');
      
      // Reset EULA state on error
      setShowEULA(false);
      setPendingUserData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleEULADecline = () => {
    // Reset state and return to signup form
    setShowEULA(false);
    setPendingUserData(null);
  };

  // Handle Google signup
  const handleGoogleSignup = async () => {
    try {
      await promptAsync();
    } catch {
      setEmailError('Google signup failed.');
    }
  };

  // Show EULA if user has completed signup form
  if (showEULA) {
    return (
      <ThemedView style={{ flex: 1, backgroundColor: Colors.background }}>
        <EULA onAccept={handleEULAAccept} onDecline={handleEULADecline} />
      </ThemedView>
    );
  }

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Checking authentication...</ThemedText>
      </ThemedView>
    );
  }

  // Don't render signup form if user is already authenticated (redirect will happen)
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
        Create account
      </ThemedText>
      <ThemedText type="subtitle" style={styles.subtitle}>
        Join Waste-to-Worth — reduce waste, earn rewards.
      </ThemedText>

      {/* Inputs */}
      <View style={{ width: '100%', maxWidth: 340, marginBottom: 8 }}>
        <FloatingLabelInput
          label="Email"
          value={email}
          onChangeText={(t) => { setEmail(t); setEmailError(''); }}
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
          onChangeText={(t) => { setPassword(t); setPasswordError(''); }}
          placeholder="Create a password"
          secureTextEntry={true}
          autoComplete="new-password"
          error={passwordError}
        />
        {passwordError ? <Text style={styles.inlineError}>{passwordError}</Text> : null}

        <FloatingLabelInput
          label="Confirm Password"
          value={confirm}
          onChangeText={(t) => { setConfirm(t); setConfirmError(''); }}
          placeholder="Confirm password"
          secureTextEntry={true}
          autoComplete="new-password"
          error={confirmError}
        />
        {confirmError ? <Text style={styles.inlineError}>{confirmError}</Text> : null}
      </View>

      {/* Sign Up button */}
      <TouchableOpacity
        style={[styles.button, styles.signupButton]}
        onPress={handleSignUp}
        disabled={loading}
      >
        <ThemedText style={styles.buttonText}>
          {loading ? 'Creating...' : 'Create account'}
        </ThemedText>
      </TouchableOpacity>

      {/* Back to login */}
      <TouchableOpacity
        style={[styles.button, styles.backButton, { marginTop: 12 }]}
        onPress={() => router.replace('/')}
      >
        <ThemedText style={[styles.buttonText, styles.backButtonText]}>Back to Log in</ThemedText>
      </TouchableOpacity>

      {/* Social login */}
      <View style={styles.socialContainer}>
        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <ThemedText style={styles.dividerText}>or sign up with</ThemedText>
          <View style={styles.dividerLine} />
        </View>
        
        <View style={styles.socialButtonsRow}>
          <GoogleIconButton 
            onPress={handleGoogleSignup} 
            disabled={loading}
            loading={loading}
          />
          
          <FacebookIconButton 
            onPress={() => alert('Facebook signup not implemented yet')} 
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
    lineHeight: 24,
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
  signupButton: { 
    backgroundColor: '#00630F', 
    marginTop: 20,
  },
  backButton: {
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  backButtonText: {
    color: Colors.primary,
  },
  socialContainer: {
    width: '100%',
    maxWidth: 340,
    marginTop: 12,
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

