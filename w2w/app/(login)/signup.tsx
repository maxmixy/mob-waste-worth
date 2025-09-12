import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, TextInput, Text } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { saveUserId, updateEULAAcceptance } from '@/lib/user';
import EULA from '@/components/EULA';
import { useAuth } from '@/contexts/AuthContext';
import { auth, db } from '@/lib/firebase';

export default function SignUpPage() {
  const colorScheme = useColorScheme() ?? 'light';
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

  // Redirect authenticated users to main app
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      console.log('[SignUp] ✅ User already authenticated, redirecting to main app');
      router.replace('/(tabs)/' as any);
    }
  }, [isAuthenticated, isLoading, router]);

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

  // Show EULA if user has completed signup form
  if (showEULA) {
    return (
      <ThemedView style={{ flex: 1, backgroundColor: Colors[colorScheme].background }}>
        <EULA onAccept={handleEULAAccept} onDecline={handleEULADecline} />
      </ThemedView>
    );
  }

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
        <ThemedText>Checking authentication...</ThemedText>
      </ThemedView>
    );
  }

  // Don't render signup form if user is already authenticated (redirect will happen)
  if (isAuthenticated) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
        <ThemedText>Redirecting to main app...</ThemedText>
      </ThemedView>
    );
  }

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
        Create account
      </ThemedText>
      <ThemedText type="subtitle" style={styles.subtitle}>
        Join Waste-to-Worth — reduce waste, earn rewards.
      </ThemedText>

      {/* Inputs */}
      <ThemedView style={{ width: '100%', maxWidth: 340, marginBottom: 8 }}>
        <ThemedText style={{ marginBottom: 4 }}>Email</ThemedText>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={(t) => { setEmail(t); setEmailError(''); }}
          placeholder="Enter your email"
          placeholderTextColor="#888"
        />
        {emailError ? <Text style={styles.inlineError}>{emailError}</Text> : null}

        <ThemedText style={{ marginBottom: 4 }}>Password</ThemedText>
        <TextInput
          style={styles.input}
          secureTextEntry
          value={password}
          onChangeText={(t) => { setPassword(t); setPasswordError(''); }}
          placeholder="Create a password"
          placeholderTextColor="#888"
        />
        {passwordError ? <Text style={styles.inlineError}>{passwordError}</Text> : null}

        <ThemedText style={{ marginBottom: 4 }}>Confirm password</ThemedText>
        <TextInput
          style={styles.input}
          secureTextEntry
          value={confirm}
          onChangeText={(t) => { setConfirm(t); setConfirmError(''); }}
          placeholder="Confirm password"
          placeholderTextColor="#888"
        />
        {confirmError ? <Text style={styles.inlineError}>{confirmError}</Text> : null}
      </ThemedView>

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
        style={[styles.button, { marginTop: 12 }]}
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
  signupButton: { backgroundColor: '#4285F4', marginTop: 8 },
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
