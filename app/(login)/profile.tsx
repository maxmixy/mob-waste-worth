import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { usePalette } from '@/hooks/usePalette';
import { getUserId, updateUserProfile } from '@/lib/user';

export default function ProfileCreationPage() {
  const colorScheme = useColorScheme() ?? 'light';
  const P = usePalette();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [age, setAge] = useState('');
  const [location, setLocation] = useState('');
  const [interests, setInterests] = useState('');
  const [firstNameError, setFirstNameError] = useState('');
  const [lastNameError, setLastNameError] = useState('');
  const [ageError, setAgeError] = useState('');

  const handleCreateProfile = async () => {
    setLoading(true);
    setFirstNameError('');
    setLastNameError('');
    setAgeError('');

    // Validation
    if (!firstName.trim()) {
      setFirstNameError('First name is required.');
      setLoading(false);
      return;
    }
    if (!lastName.trim()) {
      setLastNameError('Last name is required.');
      setLoading(false);
      return;
    }
    if (!age.trim()) {
      setAgeError('Age is required.');
      setLoading(false);
      return;
    }
    
    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum < 18 || ageNum > 120) {
      setAgeError('Please enter a valid age (18-120).');
      setLoading(false);
      return;
    }

    try {
      const userId = await getUserId();
      if (userId) {
        const profileData = {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          age: ageNum,
          location: location.trim(),
          interests: interests.trim(),
          profileCompleted: true,
          profileCreatedAt: new Date().toISOString()
        };

        const success = await updateUserProfile(userId, profileData);
        if (success) {
          router.replace('/(tabs)');
        } else {
          Alert.alert('Error', 'Failed to create profile. Please try again.');
        }
      } else {
        Alert.alert('Error', 'User not found. Please log in again.');
        router.replace('/(login)');
      }
    } catch (error) {
      console.error('Error creating profile:', error);
      Alert.alert('Error', 'An error occurred while creating your profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: P.background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <ThemedText type="title" style={styles.title}>
          Create Your Profile
        </ThemedText>
        
        <ThemedText type="subtitle" style={styles.subtitle}>
          Help us personalize your recycling experience
        </ThemedText>

        <ThemedView style={styles.formContainer}>
          {/* First Name */}
          <ThemedView style={styles.inputGroup}>
            <ThemedText style={styles.label}>First Name *</ThemedText>
            <TextInput
              style={[
                styles.input,
                { 
                  backgroundColor: P.backgroundSecondary,
                  borderColor: firstNameError ? '#f44336' : P.border,
                  color: P.text
                }
              ]}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Enter your first name"
              placeholderTextColor={P.text + '60'}
              autoCapitalize="words"
            />
            {firstNameError ? <ThemedText style={styles.errorText}>{firstNameError}</ThemedText> : null}
          </ThemedView>

          {/* Last Name */}
          <ThemedView style={styles.inputGroup}>
            <ThemedText style={styles.label}>Last Name *</ThemedText>
            <TextInput
              style={[
                styles.input,
                { 
                  backgroundColor: P.backgroundSecondary,
                  borderColor: lastNameError ? '#f44336' : P.border,
                  color: P.text
                }
              ]}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Enter your last name"
              placeholderTextColor={P.text + '60'}
              autoCapitalize="words"
            />
            {lastNameError ? <ThemedText style={styles.errorText}>{lastNameError}</ThemedText> : null}
          </ThemedView>

          {/* Age */}
          <ThemedView style={styles.inputGroup}>
            <ThemedText style={styles.label}>Age *</ThemedText>
            <TextInput
              style={[
                styles.input,
                { 
                  backgroundColor: P.backgroundSecondary,
                  borderColor: ageError ? '#f44336' : P.border,
                  color: P.text
                }
              ]}
              value={age}
              onChangeText={setAge}
              placeholder="Enter your age"
              placeholderTextColor={P.text + '60'}
              keyboardType="numeric"
              maxLength={3}
            />
            {ageError ? <ThemedText style={styles.errorText}>{ageError}</ThemedText> : null}
          </ThemedView>

          {/* Location */}
          <ThemedView style={styles.inputGroup}>
            <ThemedText style={styles.label}>Location (Optional)</ThemedText>
            <TextInput
              style={[
                styles.input,
                { 
                  backgroundColor: P.backgroundSecondary,
                  borderColor: P.border,
                  color: P.text
                }
              ]}
              value={location}
              onChangeText={setLocation}
              placeholder="City, Country"
              placeholderTextColor={P.text + '60'}
              autoCapitalize="words"
            />
          </ThemedView>

          {/* Interests */}
          <ThemedView style={styles.inputGroup}>
            <ThemedText style={styles.label}>Environmental Interests (Optional)</ThemedText>
            <TextInput
              style={[
                styles.textArea,
                { 
                  backgroundColor: P.backgroundSecondary,
                  borderColor: P.border,
                  color: P.text
                }
              ]}
              value={interests}
              onChangeText={setInterests}
              placeholder="e.g., Recycling, Sustainability, Zero Waste, Gardening..."
              placeholderTextColor={P.text + '60'}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </ThemedView>
        </ThemedView>

        <ThemedView style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: P.primary },
              loading && styles.buttonDisabled
            ]}
            onPress={handleCreateProfile}
            disabled={loading}
          >
            <ThemedText style={[styles.buttonText, { color: 'white' }]}>
              {loading ? 'Creating Profile...' : 'Create Profile'}
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  scrollView: {
    flex: 1,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 30,
    fontSize: 16,
    opacity: 0.7,
  },
  formContainer: {
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
  },
  errorText: {
    color: '#f44336',
    fontSize: 14,
    marginTop: 4,
  },
  buttonContainer: {
    marginTop: 20,
    marginBottom: 40,
  },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  createButton: {
    backgroundColor: '#4CAF50',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  createButtonText: {
    color: 'white',
  },
});
