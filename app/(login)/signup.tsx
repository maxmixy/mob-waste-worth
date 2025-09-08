import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TouchableOpacity, TextInput, Text } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { usePalette } from '@/hooks/usePalette';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { saveUserId, updateEULAAcceptance } from '@/lib/user';
import EULA from '@/components/EULA';

// 🔥 Firebase config
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
const db = getFirestore(app);

export default function SignUpPage() {
  const colorScheme = useColorScheme() ?? 'light';
  const P = usePalette();
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [showEULA, setShowEULA] = useState(false);
  const [pendingUserData, setPendingUserData] = useState<{email: string, password: string} | null>(null);

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

        router.replace('(tabs)');
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

  // Show EULA if user has completed signup form
  if (showEULA) {
    return (
      <ThemedView style={{ flex: 1, backgroundColor: P.background }}>
        <EULA onAccept={handleEULAAccept} onDecline={handleEULADecline} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: P.background }]}> 
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
        Create account
      </ThemedText>
      <ThemedText type="subtitle" style={styles.subtitle}>
        Join Waste-to-Worth — reduce waste, earn rewards.
      </ThemedText>

      {/* Inputs */}
      <ThemedView style={{ width: '100%', maxWidth: 340, marginBottom: 8 }}>
        <ThemedText style={{ marginBottom: 4 }}>Email</ThemedText>
        <TextInput
          style={[styles.input, { borderColor: P.border, color: P.text, backgroundColor: P.backgroundSecondary }]}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={(t) => { setEmail(t); setEmailError(''); }}
          placeholder="Enter your email"
          placeholderTextColor={P.text + '80'}
        />
        {emailError ? <Text style={styles.inlineError}>{emailError}</Text> : null}

        <ThemedText style={{ marginBottom: 4 }}>Password</ThemedText>
        <TextInput
          style={[styles.input, { borderColor: P.border, color: P.text, backgroundColor: P.backgroundSecondary }]}
          secureTextEntry
          value={password}
          onChangeText={(t) => { setPassword(t); setPasswordError(''); }}
          placeholder="Create a password"
          placeholderTextColor={P.text + '80'}
        />
        {passwordError ? <Text style={styles.inlineError}>{passwordError}</Text> : null}

        <ThemedText style={{ marginBottom: 4 }}>Confirm password</ThemedText>
        <TextInput
          style={[styles.input, { borderColor: P.border, color: P.text, backgroundColor: P.backgroundSecondary }]}
          secureTextEntry
          value={confirm}
          onChangeText={(t) => { setConfirm(t); setConfirmError(''); }}
          placeholder="Confirm password"
          placeholderTextColor={P.text + '80'}
        />
        {confirmError ? <Text style={styles.inlineError}>{confirmError}</Text> : null}
      </ThemedView>

      {/* Sign Up button */}
      <TouchableOpacity
        style={[styles.button, { backgroundColor: P.primary }]}
        onPress={handleSignUp}
        disabled={loading}
      >
        <ThemedText style={styles.buttonText}>
          {loading ? 'Creating...' : 'Create account'}
        </ThemedText>
      </TouchableOpacity>

      {/* Back to login */}
      <TouchableOpacity
        style={[styles.button, { marginTop: 12, backgroundColor: P.accent }]}
        onPress={() => router.replace('/')}
      >
        <ThemedText style={styles.buttonText}>Back to Log in</ThemedText>
      </TouchableOpacity>
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
    marginBottom: 8,
    fontSize: 16,
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
  signupButton: { marginTop: 8 },
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
