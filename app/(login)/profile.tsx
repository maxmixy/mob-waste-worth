import React, { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView, View, Platform, Pressable } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import LogoLoadingAnimation from '@/components/LogoLoadingAnimation';
import { Colors } from '@/constants/Colors';
import { getUserId, updateUserProfile, checkProfileCompletion } from '@/lib/user';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function ProfileCreationPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [age, setAge] = useState('');
  const [location, setLocation] = useState('');
  const [interests, setInterests] = useState('');
  const [firstNameError, setFirstNameError] = useState('');
  const [lastNameError, setLastNameError] = useState('');
  const [ageError, setAgeError] = useState('');

  // Load existing profile data when component mounts
  useEffect(() => {
    loadExistingProfile();
  }, []);

  const loadExistingProfile = async () => {
    try {
      setLoadingData(true);
      const userId = await getUserId();
      if (userId) {
        const profileInfo = await checkProfileCompletion(userId);
        if (profileInfo.profileCompleted && profileInfo.profileData) {
          const data = profileInfo.profileData;
          setFirstName(data.firstName || '');
          setLastName(data.lastName || '');
          setAge(data.age ? data.age.toString() : '');
          setLocation(data.location || '');
          setInterests(data.interests || '');
        }
      }
    } catch (error) {
      console.error('Error loading existing profile:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleUpdateProfile = async () => {
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
        // Randomly select one of the 3 guest profile SVGs
        const guestProfiles = [
          'guest profile 1.svg',
          'guest profile 2.svg', 
          'guest profile 3.svg'
        ];
        const randomProfileIndex = Math.floor(Math.random() * guestProfiles.length);
        const defaultProfilePic = guestProfiles[randomProfileIndex];
        
        const profileData = {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          age: ageNum,
          location: location.trim(),
          interests: interests.trim(),
          profilePicture: defaultProfilePic,
          profileCompleted: true,
          profileCreatedAt: new Date().toISOString()
        };

        const success = await updateUserProfile(userId, profileData);
        if (success) {
          Alert.alert('Success', 'Profile updated successfully!', [
            { text: 'OK', onPress: () => router.back() }
          ]);
        } else {
          Alert.alert('Error', 'Failed to update profile. Please try again.');
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

  if (loadingData) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: Colors.background }]}>
        <ThemedView style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={Colors.text} />
          </Pressable>
          <ThemedText type="title" style={styles.headerTitle}>Edit Profile</ThemedText>
          <View style={styles.placeholder} />
        </ThemedView>
        <View style={styles.loadingContainer}>
          <LogoLoadingAnimation size={100} showBackground={false} />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: Colors.background }]}>
      {/* Header */}
      <ThemedView style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <ThemedText type="title" style={styles.headerTitle}>Edit Profile</ThemedText>
        <View style={styles.placeholder} />
      </ThemedView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <ThemedText type="subtitle" style={styles.subtitle}>
          Update your profile information
        </ThemedText>

        <ThemedView style={styles.formContainer}>
          {/* First Name */}
          <ThemedView style={styles.inputGroup}>
            <ThemedText style={styles.label}>First Name *</ThemedText>
            <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: Colors.background,
                    borderColor: firstNameError ? '#f44336' : Colors.text + '20',
                    color: Colors.text
                  }
                ]}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Enter your first name"
              placeholderTextColor={Colors.text + '60'}
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
                    backgroundColor: Colors.background,
                    borderColor: lastNameError ? '#f44336' : Colors.text + '20',
                    color: Colors.text
                }
              ]}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Enter your last name"
              placeholderTextColor={Colors.text + '60'}
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
                    backgroundColor: Colors.background,
                    borderColor: ageError ? '#f44336' : Colors.text + '20',
                    color: Colors.text
                }
              ]}
              value={age}
              onChangeText={setAge}
              placeholder="Enter your age"
              placeholderTextColor={Colors.text + '60'}
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
                    backgroundColor: Colors.background,
                    borderColor: Colors.text + '20',
                    color: Colors.text
                }
              ]}
              value={location}
              onChangeText={setLocation}
              placeholder="City, Country"
              placeholderTextColor={Colors.text + '60'}
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
                    backgroundColor: Colors.background,
                    borderColor: Colors.text + '20',
                    color: Colors.text
                }
              ]}
              value={interests}
              onChangeText={setInterests}
              placeholder="e.g., Recycling, Sustainability, Zero Waste, Gardening..."
              placeholderTextColor={Colors.text + '60'}
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
              styles.createButton,
              loading && styles.buttonDisabled
            ]}
            onPress={handleUpdateProfile}
            disabled={loading}
          >
            <ThemedText style={[styles.buttonText, styles.createButtonText]}>
              {loading ? 'Updating Profile...' : 'Update Profile'}
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: Platform.OS === 'web' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.7)',
    borderBottomWidth: 1,
    borderBottomColor: '#00630F',
    ...(Platform.OS === 'web' && { backdropFilter: 'blur(10px)' }),
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 30,
    fontSize: 16,
    opacity: 0.7,
  },
  formContainer: {
    backgroundColor: Platform.OS === 'web' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.7)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    ...(Platform.OS === 'web' && { backdropFilter: 'blur(10px)' }),
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
    borderRadius: 20,
    alignItems: 'center',
    backgroundColor: '#00630F',
  },
  createButton: {
    backgroundColor: '#00630F',
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
