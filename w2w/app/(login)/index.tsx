import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, TextInput, Text } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getAuth, signInWithEmailAndPassword, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { initializeApp, getApps, getApp } from 'firebase/app';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import { saveUserId, checkEULAAcceptance, checkProfileCompletion } from '@/lib/user';
import { useLocation } from '@/hooks/useLocation';
import { useClimateStorage } from '@/hooks/useClimateStorage';

// ✅ Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCxj-RNwupirseU_-mGR7LtsLGA86P_GVM",
  authDomain: "waste-to-worth-7d5b0.firebaseapp.com",
  projectId: "waste-to-worth-7d5b0",
  storageBucket: "waste-to-worth-7d5b0.firebasestorage.app",
  messagingSenderId: "648267234726",
  appId: "1:648267234726:web:3e70721145557b2f316367",
  measurementId: "G-E8563BL8PJ"
};

// ✅ only initialize Firebase once
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

WebBrowser.maybeCompleteAuthSession();

export default function LoginPage() {
  const colorScheme = useColorScheme() ?? 'light';
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Location and climate storage hooks
  const { location } = useLocation();
  const { fetchClimateData } = useClimateStorage();

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
      router.replace('/(tabs)');
      
    } catch (error) {
      console.error('[Login] ❌ Error in post-login flow:', error);
      // Still navigate to main app even if climate data fails
      router.replace('/(tabs)');
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

  return (
    <ThemedView style={[styles.container, { backgroundColor: Colors[colorScheme].background }]}>
      {/* Logo */}
      <ThemedView style={styles.imageContainer}>
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </ThemedView>

      {/* Title */}
      <ThemedText type="title" style={styles.title}>
        Welcome upcycler!
      </ThemedText>
      <ThemedText type="subtitle" style={styles.subtitle}>
        Make a difference with every piece of waste you recycle.
      </ThemedText>

      {/* Inputs */}
      <ThemedView style={{ width: '100%', maxWidth: 340, marginBottom: 8 }}>
        <ThemedText style={{ marginBottom: 4 }}>Email</ThemedText>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={(t) => { setEmail(t); setEmailError(''); setPasswordError(''); }}
          placeholder="Enter your email"
          placeholderTextColor="#888"
        />
        {emailError ? <Text style={styles.inlineError}>{emailError}</Text> : null}

        <ThemedText style={{ marginBottom: 4 }}>Password</ThemedText>
        <TextInput
          style={styles.input}
          secureTextEntry
          value={password}
          onChangeText={(t) => { setPassword(t); setEmailError(''); setPasswordError(''); }}
          placeholder="Enter your password"
          placeholderTextColor="#888"
        />
        {passwordError ? <Text style={styles.inlineError}>{passwordError}</Text> : null}
      </ThemedView>

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
        style={[styles.button, { marginTop: 12 }]}
        onPress={() => router.push('/(login)/signup')}
      >
        <ThemedText style={styles.buttonText}>Create account</ThemedText>
      </TouchableOpacity>

      {/* Social login */}
      <ThemedView style={styles.socialRow}>
        <TouchableOpacity
          style={[styles.button, styles.googleButton, { flex: 1, marginRight: 6 }]}
          onPress={handleGoogleLogin}
        >
          <ThemedText style={[styles.buttonText, styles.googleButtonText]}>Google</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.facebookButton, { flex: 1, marginLeft: 6 }]}
          onPress={() => alert('Facebook login not implemented')}
        >
          <ThemedText style={[styles.buttonText, styles.facebookButtonText]}>Facebook</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  input: {
    width: '100%',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 8,
    fontSize: 16,
    color: '#222',
  },
  title: { marginBottom: 12, fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 16, color: '#555', textAlign: 'center', marginBottom: 18, maxWidth: 320 },
  button: {
    width: '100%',
    maxWidth: 340,
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  loginButton: { backgroundColor: '#4285F4', marginTop: 8 },
  socialRow: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 340,
    marginTop: 12,
  },
  googleButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  googleButtonText: { color: '#4285F4' },
  facebookButton: { backgroundColor: '#1877F3' },
  facebookButtonText: { color: '#fff' },
  imageContainer: {
    width: 220, height: 220, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12, borderWidth: 3, borderColor: '#4285F4',
  },
  logoImage: { width: 80, height: 80 },
  inlineError: {
    color: '#F44336',
    fontSize: 12,
    textDecorationLine: 'underline',
    marginBottom: 8,
  },
});
