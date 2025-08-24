import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { saveUserId } from '@/lib/user';

// Reuse same firebase config as the login page
const firebaseConfig = {
  apiKey: "AIzaSyCxj-RNwupirseU_-mGR7LtsLGA86P_GVM",
  authDomain: "waste-to-worth-7d5b0.firebaseapp.com",
  projectId: "waste-to-worth-7d5b0",
  storageBucket: "waste-to-worth-7d5b0.firebasestorage.app",
  messagingSenderId: "648267234726",
  appId: "1:648267234726:web:3e70721145557b2f316367",
  measurementId: "G-E8563BL8PJ"
};
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export const screenOptions = {
  headerShown: false,
};

export default function SignUpPage() {
  const colorScheme = useColorScheme() ?? 'light';
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const handleSignUp = async () => {
    setLoading(true);
    setError('');
    if (!email || !password) {
      setError('Please provide email and password.');
      setLoading(false);
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      if (userCredential?.user?.uid) {
        await saveUserId(userCredential.user.uid);
        // Create a Firestore document for the user with the UID as the document ID
        try {
          await setDoc(doc(db, 'User_Collection', userCredential.user.uid), {
            email: userCredential.user.email || null,
            createdAt: serverTimestamp(),
          });
        } catch (e) {
          console.warn('Failed to create user document', e);
        }
      }
      router.replace('/(tabs)');
    } catch (err: any) {
      const message = err?.message || err?.code || 'Sign up failed. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: Colors[colorScheme].background }]}>
      <ThemedView style={styles.imageContainer}>
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </ThemedView>

      <ThemedText type="title" style={styles.title}>Create account</ThemedText>
      <ThemedText type="subtitle" style={styles.subtitle}>Join Waste-to-Worth — reduce waste, earn rewards.</ThemedText>

      <ThemedView style={{ width: '100%', maxWidth: 340, marginBottom: 8 }}>
        <ThemedText style={{ marginBottom: 4 }}>Email</ThemedText>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={(t) => { setEmail(t); setError(''); }}
          placeholder="Enter your email"
          placeholderTextColor="#888"
        />
        <ThemedText style={{ marginBottom: 4 }}>Password</ThemedText>
        <TextInput
          style={styles.input}
          secureTextEntry
          value={password}
          onChangeText={(t) => { setPassword(t); setError(''); }}
          placeholder="Create a password"
          placeholderTextColor="#888"
        />
        <ThemedText style={{ marginBottom: 4 }}>Confirm password</ThemedText>
        <TextInput
          style={styles.input}
          secureTextEntry
          value={confirm}
          onChangeText={(t) => { setConfirm(t); setError(''); }}
          placeholder="Confirm password"
          placeholderTextColor="#888"
        />
      </ThemedView>

      {error ? (
        <ThemedView style={styles.errorBox}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </ThemedView>
      ) : null}

      <TouchableOpacity style={[styles.button, styles.signupButton]} onPress={handleSignUp} disabled={loading}>
        <ThemedText style={styles.buttonText}>{loading ? 'Creating...' : 'Create account'}</ThemedText>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, { marginTop: 12 }]} onPress={() => router.back()}>
        <ThemedText style={styles.buttonText}>Back to Log in</ThemedText>
      </TouchableOpacity>
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
  title: {
    marginBottom: 12,
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginBottom: 18,
    maxWidth: 320,
  },
  button: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#3A3335',
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  signupButton: {
    backgroundColor: '#4285F4',
    marginTop: 8,
  },
  imageContainer: {
    width: 220,
    height: 220,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 3,
    borderColor: '#4285F4',
  },
  logoImage: {
    width: 80,
    height: 80,
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
