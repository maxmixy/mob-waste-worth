import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getAuth, signInWithEmailAndPassword, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import { saveUserId } from '@/lib/user';

// Firebase config (move to a separate file if needed)
const firebaseConfig = {
  apiKey: "AIzaSyCxj-RNwupirseU_-mGR7LtsLGA86P_GVM",
  authDomain: "waste-to-worth-7d5b0.firebaseapp.com",
  projectId: "waste-to-worth-7d5b0",
  storageBucket: "waste-to-worth-7d5b0.firebasestorage.app",
  messagingSenderId: "648267234726",
  appId: "1:648267234726:web:3e70721145557b2f316367",
  measurementId: "G-E8563BL8PJ"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

WebBrowser.maybeCompleteAuthSession();

export default function LoginPage() {
  const colorScheme = useColorScheme() ?? 'light';
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // Persist uid for later pages
      if (userCredential?.user?.uid) {
        await saveUserId(userCredential.user.uid);
      }
      router.replace('/');
    } catch (err: any) {
      // Normalize and show friendly error message
      const message = err?.message || err?.code || 'Login failed. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Configure Google auth request (use Expo proxy in dev)  
  const redirectUri = makeRedirectUri({ useProxy: true, scheme: 'wastetoworth' });
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: '648267234726-q90cnh8men8ffntu76te6t69t07rhmjv.apps.googleusercontent.com',
    redirectUri,
    scopes: ['profile', 'email'],
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token, access_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token, access_token);
      // Sign in with the Firebase credential
      signInWithCredential(auth, credential)
        .then(async (uc: any) => {
          // Save uid after Google sign-in
          if (uc?.user?.uid) {
            await saveUserId(uc.user.uid);
          }
          router.replace('(tabs)/scan');
        })
        .catch((e: any) => {
          const message = e?.message || e?.code || 'Google sign-in failed.';
          setError(message);
        });
    } else if (response?.type === 'error') {
      setError('Google sign-in cancelled or failed.');
    }
  }, [response]);

  const handleGoogleLogin = async () => {
    setError('');
    try {
      // Launch the native/web auth flow using the Expo proxy in development
      await (promptAsync as any)({ useProxy: true });
      router.replace('(tabs)/scan');
    } catch (err: any) {
      const message = err?.message || err?.code || 'Google login failed.';
      setError(message);
    }
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: Colors[colorScheme].background }]}>
      {/* Image container at the top */}
      <ThemedView style={styles.imageContainer}>
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </ThemedView>
      <ThemedText type="title" style={styles.title}>
        Welcome upcycler!
      </ThemedText>
      <ThemedText type="subtitle" style={styles.subtitle}>
        Make a difference with every piece of waste you recycle.
      </ThemedText>
      {/* Email/Password fields */}
      <ThemedView style={{ width: '100%', maxWidth: 340, marginBottom: 8 }}>
        <ThemedText style={{ marginBottom: 4 }}>Email</ThemedText>
        <TextInput
          style={{
            width: '100%',
            padding: 12,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#ccc',
            marginBottom: 8,
            fontSize: 16,
            color: '#222',
          }}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={(text) => { setEmail(text); setError(''); }}
          onFocus={() => setError('')}
          placeholder="Enter your email"
          placeholderTextColor="#888"
        />
        <ThemedText style={{ marginBottom: 4 }}>Password</ThemedText>
        <TextInput
          style={{
            width: '100%',
            padding: 12,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#ccc',
            marginBottom: 8,
            fontSize: 16,
            color: '#222',
          }}
          secureTextEntry
          value={password}
          onChangeText={(text) => { setPassword(text); setError(''); }}
          onFocus={() => setError('')}
          placeholder="Enter your password"
          placeholderTextColor="#888"
        />
      </ThemedView>
      {error ? (
        <ThemedView style={styles.errorBox}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </ThemedView>
      ) : null}
      <TouchableOpacity
        style={[styles.button, styles.signupButton]}
        onPress={handleLogin}
        disabled={loading}
      >
        <ThemedText style={styles.buttonText}>{loading ? 'Logging in...' : 'Log in'}</ThemedText>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, styles.signupButton]}
        onPress={() => router.push('signup')}
      >
        <ThemedText style={styles.buttonText}>Sign Up</ThemedText>
      </TouchableOpacity>
      <ThemedView style={styles.socialRow}>
        <TouchableOpacity
          style={[styles.button, styles.googleButton, { flex: 1, marginRight: 6 }]}
          onPress={handleGoogleLogin}
        >
          <ThemedText style={[styles.buttonText, styles.googleButtonText]}>Google log in</ThemedText>
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
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    marginBottom: 32,
    fontSize: 32,
    fontWeight: 'bold',
  },
  button: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#3A3335',
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  googleButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    marginTop: 0,
  },
  googleButtonText: {
    color: '#4285F4',
  },
  facebookButton: {
    backgroundColor: '#1877F3',
    marginTop: 0,
  },
  facebookButtonText: {
    color: '#fff',
  },
  signupButton: {
    backgroundColor: '#4285F4',
    marginTop: 12,
  },
  socialRow: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 340,
    marginTop: 12,
    marginBottom: 0,
    gap: 0,
  },
  imageContainer: {
    width: 300,
    height: 300,
    borderRadius: 12,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    alignSelf: 'center',
    borderWidth: 3,
    borderColor: '#4285F4',
    elevation: 0,
    shadowColor: undefined,
    shadowOffset: undefined,
    shadowOpacity: undefined,
    shadowRadius: undefined,
  },
  logoImage: {
    width: 90,
    height: 90,
    borderRadius: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#555',
    textAlign: 'center',
    marginBottom: 24,
    marginTop: -16,
    fontWeight: '500',
    lineHeight: 24,
    maxWidth: 320,
    alignSelf: 'center',
  },
  errorBox: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#fdecea',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    color: '#b00020',
    fontWeight: '600',
  },
});
