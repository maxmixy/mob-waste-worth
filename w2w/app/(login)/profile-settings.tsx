import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getUserId, checkProfileCompletion } from '@/lib/user';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { Pressable } from 'react-native';

export default function ProfileSettingsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      const currentUserId = await getUserId();
      if (currentUserId) {
        setUserId(currentUserId);
        const profileInfo = await checkProfileCompletion(currentUserId);
        if (profileInfo.profileCompleted) {
          setProfileData(profileInfo.profileData);
        }
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleEditProfile = () => {
    router.push('/(login)/profile');
  };

  const handleBack = () => {
    router.back();
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: Colors[colorScheme].background }]}>
        <ActivityIndicator size="large" color={Colors[colorScheme].icon} />
        <ThemedText style={styles.loadingText}>Loading profile...</ThemedText>
      </View>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: Colors[colorScheme].background }]}>
      {/* Header */}
      <ThemedView style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={Colors[colorScheme].text} />
        </Pressable>
        <ThemedText type="title" style={styles.headerTitle}>Profile Settings</ThemedText>
        <View style={styles.placeholder} />
      </ThemedView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <ThemedView style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Image
              source={require('@/assets/images/partial-react-logo.png')}
              style={styles.avatar}
              resizeMode="cover"
            />
            <Pressable style={styles.editAvatarButton}>
              <MaterialIcons name="camera-alt" size={20} color="white" />
            </Pressable>
          </View>
          
          <ThemedText type="subtitle" style={styles.userName}>
            {profileData ? `${profileData.firstName} ${profileData.lastName}` : 'User'}
          </ThemedText>
          
          <Pressable style={styles.editButton} onPress={handleEditProfile}>
            <MaterialIcons name="edit" size={20} color={Colors[colorScheme].icon} />
            <ThemedText style={styles.editButtonText}>Edit Profile</ThemedText>
          </Pressable>
        </ThemedView>

        {/* Profile Information */}
        <ThemedView style={styles.infoSection}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Personal Information</ThemedText>
          
          <View style={styles.infoItem}>
            <ThemedText style={styles.infoLabel}>First Name</ThemedText>
            <ThemedText style={styles.infoValue}>
              {profileData?.firstName || 'Not set'}
            </ThemedText>
          </View>

          <View style={styles.infoItem}>
            <ThemedText style={styles.infoLabel}>Last Name</ThemedText>
            <ThemedText style={styles.infoValue}>
              {profileData?.lastName || 'Not set'}
            </ThemedText>
          </View>

          <View style={styles.infoItem}>
            <ThemedText style={styles.infoLabel}>Age</ThemedText>
            <ThemedText style={styles.infoValue}>
              {profileData?.age ? `${profileData.age} years old` : 'Not set'}
            </ThemedText>
          </View>

          <View style={styles.infoItem}>
            <ThemedText style={styles.infoLabel}>Location</ThemedText>
            <ThemedText style={styles.infoValue}>
              {profileData?.location || 'Not set'}
            </ThemedText>
          </View>

          <View style={styles.infoItem}>
            <ThemedText style={styles.infoLabel}>Interests</ThemedText>
            <ThemedText style={styles.infoValue}>
              {profileData?.interests?.length > 0 ? profileData.interests.join(', ') : 'Not set'}
            </ThemedText>
          </View>
        </ThemedView>

        {/* Account Information */}
        <ThemedView style={styles.infoSection}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Account Information</ThemedText>
          
          <View style={styles.infoItem}>
            <ThemedText style={styles.infoLabel}>User ID</ThemedText>
            <ThemedText style={styles.infoValue}>
              {userId ? userId.substring(0, 8) + '...' : 'Not available'}
            </ThemedText>
          </View>

          <View style={styles.infoItem}>
            <ThemedText style={styles.infoLabel}>Profile Created</ThemedText>
            <ThemedText style={styles.infoValue}>
              {profileData?.profileCreatedAt ? 
                new Date(profileData.profileCreatedAt).toLocaleDateString() : 
                'Not available'
              }
            </ThemedText>
          </View>
        </ThemedView>

        {/* Actions */}
        <ThemedView style={styles.actionsSection}>
          <Pressable style={styles.actionButton} onPress={handleEditProfile}>
            <MaterialIcons name="edit" size={24} color={Colors[colorScheme].icon} />
            <ThemedText style={styles.actionButtonText}>Edit Profile</ThemedText>
            <MaterialIcons name="chevron-right" size={24} color={Colors[colorScheme].icon} />
          </Pressable>

          <Pressable style={styles.actionButton}>
            <MaterialIcons name="security" size={24} color={Colors[colorScheme].icon} />
            <ThemedText style={styles.actionButtonText}>Privacy & Security</ThemedText>
            <MaterialIcons name="chevron-right" size={24} color={Colors[colorScheme].icon} />
          </Pressable>

          <Pressable style={styles.actionButton}>
            <MaterialIcons name="notifications" size={24} color={Colors[colorScheme].icon} />
            <ThemedText style={styles.actionButtonText}>Notification Settings</ThemedText>
            <MaterialIcons name="chevron-right" size={24} color={Colors[colorScheme].icon} />
          </Pressable>
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
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
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
  profileSection: {
    alignItems: 'center',
    paddingVertical: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#007AFF',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  infoSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    color: '#666',
    flex: 1,
    textAlign: 'right',
  },
  actionsSection: {
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionButtonText: {
    flex: 1,
    marginLeft: 16,
    fontSize: 16,
  },
});
