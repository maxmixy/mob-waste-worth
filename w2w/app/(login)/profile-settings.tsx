import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getUserId, checkProfileCompletion } from '@/lib/user';
import { ImageService } from '@/lib/imageService';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { Pressable } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export default function ProfileSettingsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);

  useEffect(() => {
    console.log('🚀 ProfileSettingsScreen mounted');
    console.log('Initial state - loading:', loading, 'userId:', userId, 'uploadingImage:', uploadingImage);
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
        
        // Load profile image
        console.log('Loading profile image for user:', currentUserId);
        const imageResponse = await ImageService.getProfileImage(currentUserId);
        console.log('Image response:', imageResponse);
        
        if (imageResponse.success && imageResponse.hasImage && imageResponse.imageUrl) {
          console.log('Setting profile image URL:', imageResponse.imageUrl);
          setProfileImageUrl(imageResponse.imageUrl);
        } else {
          console.log('No profile image found or error:', imageResponse.error || imageResponse.message);
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

  const refreshProfileImage = async () => {
    if (!userId) return;
    
    try {
      console.log('🔄 Manually refreshing profile image for user:', userId);
      const imageResponse = await ImageService.getProfileImage(userId);
      console.log('Refresh image response:', imageResponse);
      
      if (imageResponse.success && imageResponse.hasImage && imageResponse.imageUrl) {
        console.log('Setting refreshed profile image URL:', imageResponse.imageUrl);
        setProfileImageUrl(imageResponse.imageUrl);
        Alert.alert('Success', 'Profile image refreshed from server!');
      } else {
        console.log('No profile image found on server:', imageResponse.error || imageResponse.message);
        setProfileImageUrl(null);
        Alert.alert('Info', 'No profile image found on server.');
      }
    } catch (error) {
      console.error('Error refreshing profile image:', error);
      Alert.alert('Error', 'Failed to refresh profile image from server.');
    }
  };

  const requestPermissions = async () => {
    console.log('🔐 Requesting media library permissions...');
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('Media library permission status:', status);
      
      if (status !== 'granted') {
        console.log('❌ Media library permission denied');
        Alert.alert('Permission Required', 'Sorry, we need camera roll permissions to select images!');
        return false;
      }
      
      console.log('✅ Media library permission granted');
      return true;
    } catch (error) {
      console.error('❌ Error requesting permissions:', error);
      Alert.alert('Error', 'Failed to request permissions');
      return false;
    }
  };

  const pickImage = async () => {
    console.log('📸 Image button pressed!');
    console.log('User ID:', userId);
    
    if (!userId) {
      console.log('❌ Error: User ID not found');
      Alert.alert('Error', 'User ID not found');
      return;
    }

    console.log('🔐 Requesting permissions...');
    // Request permissions first
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      console.log('❌ Permission denied');
      return;
    }

    console.log('✅ Permissions granted, showing action sheet');
    console.log('Platform:', Platform.OS);
    
    if (Platform.OS === 'web') {
      // On web, show custom action sheet
      console.log('🌐 Web platform detected, showing custom action sheet');
      setShowActionSheet(true);
    } else {
      // On mobile, use native Alert
      console.log('📱 Mobile platform detected, using native Alert');
      Alert.alert(
        'Select Profile Image',
        'Choose how you want to select your profile image. The image will be displayed locally and uploaded to the server once the web files are deployed.',
        [
          { 
            text: 'Camera', 
            onPress: () => {
              console.log('📷 User selected Camera');
              openCamera();
            }
          },
          { 
            text: 'Photo Library', 
            onPress: () => {
              console.log('🖼️ User selected Photo Library');
              openImageLibrary();
            }
          },
          { 
            text: 'Cancel', 
            style: 'cancel',
            onPress: () => {
              console.log('❌ User cancelled image selection');
            }
          }
        ]
      );
    }
  };

  const openCamera = async () => {
    console.log('📷 Opening camera...');
    try {
      // Request camera permissions
      console.log('🔐 Requesting camera permissions...');
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      console.log('Camera permission status:', status);
      
      if (status !== 'granted') {
        console.log('❌ Camera permission denied');
        Alert.alert('Permission Required', 'Sorry, we need camera permissions to take photos!');
        return;
      }

      console.log('✅ Camera permission granted, launching camera...');
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      console.log('Camera result:', result);
      if (!result.canceled && result.assets[0]) {
        console.log('📸 Image captured, starting upload...');
        console.log('Image URI:', result.assets[0].uri);
        await uploadImage(result.assets[0].uri);
      } else {
        console.log('❌ Camera operation cancelled or no image captured');
      }
    } catch (error) {
      console.error('❌ Error opening camera:', error);
      Alert.alert('Error', 'Failed to open camera');
    }
  };

  const openImageLibrary = async () => {
    console.log('🖼️ Opening image library...');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      console.log('Image library result:', result);
      if (!result.canceled && result.assets[0]) {
        console.log('🖼️ Image selected, starting upload...');
        console.log('Image URI:', result.assets[0].uri);
        await uploadImage(result.assets[0].uri);
      } else {
        console.log('❌ Image library operation cancelled or no image selected');
      }
    } catch (error) {
      console.error('❌ Error opening image library:', error);
      Alert.alert('Error', 'Failed to open image library');
    }
  };

  const uploadImage = async (imageUri: string) => {
    if (!userId) return;

    try {
      setUploadingImage(true);
      console.log('Uploading image for user:', userId, 'URI:', imageUri);
      
      // For now, just set the local image URI so user can see their selection
      // The actual upload will work once the web files are deployed
      console.log('Setting local image URI (upload will work after web deployment)');
      setProfileImageUrl(imageUri);
      
      // Try to upload to web server
      const response = await ImageService.uploadProfileImage(userId, imageUri);
      console.log('Upload response:', response);
      
      if (response.success && response.imageUrl) {
        console.log('Upload successful, setting image URL:', response.imageUrl);
        setProfileImageUrl(response.imageUrl);
        Alert.alert('Success', 'Profile image updated successfully!');
        
        // Refresh profile data to ensure we have the latest image from server
        console.log('🔄 Refreshing profile data after successful upload');
        await loadProfileData();
      } else {
        console.log('Upload failed (web server not ready):', response.error);
        // Still show the image locally even if upload fails
        Alert.alert(
          'Image Selected', 
          'Image selected successfully! Upload to server will work once web files are deployed.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      // Still show the image locally even if upload fails
      setProfileImageUrl(imageUri);
      Alert.alert(
        'Image Selected', 
        'Image selected successfully! Upload to server will work once web files are deployed.',
        [{ text: 'OK' }]
      );
      
      // Try to refresh profile data anyway in case the upload actually succeeded
      try {
        console.log('🔄 Attempting to refresh profile data after error');
        await loadProfileData();
      } catch (refreshError) {
        console.log('Could not refresh profile data:', refreshError);
      }
    } finally {
      setUploadingImage(false);
    }
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
              source={profileImageUrl ? { uri: profileImageUrl } : require('@/assets/images/partial-react-logo.png')}
              style={styles.avatar}
              resizeMode="cover"
            />
            {profileImageUrl && (
              <View style={styles.imageSourceIndicator}>
                <MaterialIcons 
                  name={profileImageUrl.startsWith('http') ? 'cloud-done' : 'phone-android'} 
                  size={12} 
                  color="white" 
                />
              </View>
            )}
            <Pressable 
              style={[styles.editAvatarButton, uploadingImage && styles.editAvatarButtonDisabled]}
              onPress={() => {
                console.log('🎯 Camera button Pressable onPress triggered');
                console.log('Button disabled state:', uploadingImage);
                pickImage();
              }}
              disabled={uploadingImage}
            >
              {uploadingImage ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <MaterialIcons name="camera-alt" size={20} color="white" />
                  <MaterialIcons name="add" size={12} color="white" style={{ position: 'absolute', top: -2, right: -2 }} />
                </>
              )}
            </Pressable>
          </View>
          
          <ThemedText type="subtitle" style={styles.userName}>
            {profileData ? `${profileData.firstName} ${profileData.lastName}` : 'User'}
          </ThemedText>
          
          <View style={styles.buttonRow}>
            <Pressable style={styles.editButton} onPress={handleEditProfile}>
              <MaterialIcons name="edit" size={20} color={Colors[colorScheme].icon} />
              <ThemedText style={styles.editButtonText}>Edit Profile</ThemedText>
            </Pressable>
            
            <Pressable style={styles.refreshButton} onPress={refreshProfileImage}>
              <MaterialIcons name="refresh" size={20} color={Colors[colorScheme].icon} />
              <ThemedText style={styles.refreshButtonText}>Refresh Image</ThemedText>
            </Pressable>
          </View>
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

      {/* Custom Action Sheet for Web */}
      {showActionSheet && (
        <View style={styles.actionSheetOverlay}>
          <View style={styles.actionSheet}>
            <ThemedText style={styles.actionSheetTitle}>Select Profile Image</ThemedText>
            <ThemedText style={styles.actionSheetMessage}>
              Choose how you want to select your profile image. The image will be displayed locally and uploaded to the server once the web files are deployed.
            </ThemedText>
            
            <View style={styles.actionSheetButtons}>
              <Pressable 
                style={[styles.actionSheetButton, styles.cameraButton]}
                onPress={() => {
                  console.log('📷 User selected Camera (web)');
                  setShowActionSheet(false);
                  openCamera();
                }}
              >
                <MaterialIcons name="camera-alt" size={24} color="white" />
                <ThemedText style={styles.actionSheetButtonText}>Camera</ThemedText>
              </Pressable>
              
              <Pressable 
                style={[styles.actionSheetButton, styles.libraryButton]}
                onPress={() => {
                  console.log('🖼️ User selected Photo Library (web)');
                  setShowActionSheet(false);
                  openImageLibrary();
                }}
              >
                <MaterialIcons name="photo-library" size={24} color="white" />
                <ThemedText style={styles.actionSheetButtonText}>Photo Library</ThemedText>
              </Pressable>
              
              <Pressable 
                style={[styles.actionSheetButton, styles.cancelButton]}
                onPress={() => {
                  console.log('❌ User cancelled image selection (web)');
                  setShowActionSheet(false);
                }}
              >
                <MaterialIcons name="close" size={24} color="#666" />
                <ThemedText style={[styles.actionSheetButtonText, { color: '#666' }]}>Cancel</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      )}
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
  imageSourceIndicator: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 10,
    padding: 2,
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
  editAvatarButtonDisabled: {
    backgroundColor: '#ccc',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
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
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  refreshButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#1976d2',
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
  // Action Sheet Styles
  actionSheetOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  actionSheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  actionSheetTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  actionSheetMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  actionSheetButtons: {
    gap: 12,
  },
  actionSheetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 12,
  },
  cameraButton: {
    backgroundColor: '#007AFF',
  },
  libraryButton: {
    backgroundColor: '#34C759',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  actionSheetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});
