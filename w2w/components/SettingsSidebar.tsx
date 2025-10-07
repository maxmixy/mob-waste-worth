import React, { useState, useEffect } from 'react';
import { Modal, TouchableOpacity, StyleSheet, Alert, View, ScrollView, Platform, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { getUserId, logoutUser, checkProfileCompletion } from '@/lib/user';
import { ImageService } from '@/lib/imageService';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { useLocation } from '@/hooks/useLocation';
import { useClimate } from '@/hooks/useClimate';
import { clearTabGuidanceStatus } from '@/lib/onboardingStorage';

interface SettingsSidebarProps {
  visible: boolean;
  onClose: () => void;
}

export default function SettingsSidebar({ visible, onClose }: SettingsSidebarProps) {
  const router = useRouter();
  const [userName, setUserName] = useState('User');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Location and climate functionality
  const { location, error: locationError, loading: locationLoading, requestLocation } = useLocation();
  const { climateData, loading: climateLoading, error: climateError, getClimateForLocation } = useClimate();

  // Helper function to get profile picture source
  const getProfilePictureSource = (profilePicture: string | undefined) => {
    if (!profilePicture) {
      return require('@/assets/images/partial-react-logo.png');
    }
    
    switch (profilePicture) {
      case 'guest profile 1.svg':
        return require('@/assets/images/guest profile 1.svg');
      case 'guest profile 2.svg':
        return require('@/assets/images/guest profile 2.svg');
      case 'guest profile 3.svg':
        return require('@/assets/images/guest profile 3.svg');
      default:
        return require('@/assets/images/partial-react-logo.png');
    }
  };

  useEffect(() => {
    if (visible) {
      loadUserInfo();
    }
  }, [visible]);

  const loadUserInfo = async () => {
    try {
      const userId = await getUserId();
      if (userId) {
        const profileInfo = await checkProfileCompletion(userId);
        if (profileInfo.profileCompleted && profileInfo.profileData) {
          setUserProfile(profileInfo.profileData);
          setUserName(`${profileInfo.profileData.firstName} ${profileInfo.profileData.lastName}`);
        } else {
          setUserName('User');
        }
        
        // Load profile image
        console.log('Loading profile image for user in sidebar:', userId);
        const imageResponse = await ImageService.getProfileImage(userId);
        console.log('Sidebar image response:', imageResponse);
        
        if (imageResponse.success && imageResponse.hasImage && imageResponse.imageUrl) {
          console.log('Setting sidebar profile image URL:', imageResponse.imageUrl);
          setProfileImageUrl(imageResponse.imageUrl);
        } else {
          console.log('No profile image found in sidebar or error:', imageResponse.error || imageResponse.message);
          setProfileImageUrl(null);
        }
      }
    } catch (error) {
      console.error('Error loading user info:', error);
      setUserName('User');
      setProfileImageUrl(null);
    }
  };

  const handleLogout = async () => {
    console.log('Logout button pressed - starting immediate logout');
    
    try {
      setLoading(true);
      
      // Close the sidebar immediately
      onClose();
      
      console.log('Starting logout process...');
      await logoutUser();
      console.log('Logout successful - AuthGuard will handle navigation');
      // Don't manually navigate - let AuthGuard handle redirection automatically
      
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetTabGuide = async () => {
    try {
      await clearTabGuidanceStatus();
      onClose();
      Alert.alert(
        'Tab Guide Reset', 
        'The tab guide will be shown again when you restart the app.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error resetting tab guide:', error);
      Alert.alert('Error', 'Failed to reset tab guide. Please try again.');
    }
  };



  const handleProfile = () => {
    onClose();
    router.push('/(login)/profile-settings');
  };

  const handleAbout = () => {
    onClose();
    router.push('/pages/about');
  };

  const handleLocationRequest = async () => {
    try {
      console.log('🌍 Requesting location from settings...');
      await requestLocation();
      if (location) {
        console.log('🌍 Location obtained, getting climate data...');
        await getClimateForLocation(location);
      }
    } catch (error) {
      console.error('🌍 Error getting location:', error);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.overlay} />
        <View style={styles.sidebar}>
          <ScrollView 
            style={styles.scrollContainer}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
            bounces={true}
          >
            {/* Header */}
            <ThemedView style={styles.header}>
              <ThemedText type="title" style={styles.headerTitle}>Settings</ThemedText>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <MaterialIcons name="close" size={24} color="#2D5016" />
              </TouchableOpacity>
            </ThemedView>

            {/* User Profile Section */}
            <ThemedView style={styles.profileSection}>
              <View style={styles.userImageContainer}>
                {profileImageUrl ? (
                  <Image
                    source={{ uri: profileImageUrl }}
                    style={styles.userImage}
                    resizeMode="cover"
                  />
                ) : (
                  <Image
                    source={getProfilePictureSource(userProfile?.profilePicture)}
                    style={styles.userImage}
                    resizeMode="cover"
                  />
                )}
              </View>
              <ThemedText type="subtitle" style={styles.userName}>{userName}</ThemedText>
            </ThemedView>

        {/* Location Section */}
        <ThemedView style={styles.locationSection}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Location</ThemedText>
          
          {locationError && (
            <ThemedView style={styles.locationErrorContainer}>
              <MaterialIcons name="error" size={16} color="#f44336" />
              <ThemedText style={styles.locationErrorText}>
                {locationError.message}
              </ThemedText>
            </ThemedView>
          )}
          
          {location ? (
            <ThemedView style={styles.locationInfoContainer}>
              <View style={styles.locationInfo}>
                <MaterialIcons name="place" size={20} color="#00630F" />
                <View style={styles.locationDetails}>
                  <ThemedText style={styles.locationCoordinates}>
                    {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                  </ThemedText>
                  {location.accuracy && (
                    <ThemedText style={styles.locationAccuracy}>
                      Accuracy: {location.accuracy.toFixed(0)}m
                    </ThemedText>
                  )}
                </View>
              </View>
              
              {/* Climate Information */}
              {climateLoading && (
                <ThemedView style={styles.climateLoadingContainer}>
                  <MaterialIcons name="refresh" size={16} color="#00630F" />
                  <ThemedText style={styles.climateLoadingText}>Getting climate data...</ThemedText>
                </ThemedView>
              )}
              
              {climateError && (
                <ThemedView style={styles.climateErrorContainer}>
                  <MaterialIcons name="warning" size={16} color="#ff9800" />
                  <ThemedText style={styles.climateErrorText}>
                    Climate data unavailable
                  </ThemedText>
                </ThemedView>
              )}
              
              {climateData && (
                <ThemedView style={styles.climateInfoContainer}>
                  <View style={styles.climateHeader}>
                    <MaterialIcons name="wb-sunny" size={16} color="#FF9800" />
                    <ThemedText style={styles.climateZoneText}>
                      {climateData.climateZone} Climate
                    </ThemedText>
                  </View>
                  
                  <View style={styles.climateDetails}>
                    <View style={styles.climateDetailRow}>
                      <MaterialIcons name="thermostat" size={14} color="#666" />
                      <ThemedText style={styles.climateDetailText}>
                        {climateData.temperature.average}°{climateData.temperature.unit}
                      </ThemedText>
                    </View>
                    <View style={styles.climateDetailRow}>
                      <MaterialIcons name="opacity" size={14} color="#666" />
                      <ThemedText style={styles.climateDetailText}>
                        {climateData.humidity}% humidity
                      </ThemedText>
                    </View>
                  </View>
                </ThemedView>
              )}
            </ThemedView>
          ) : (
            <ThemedView style={styles.locationEmptyState}>
              <MaterialIcons name="location-off" size={24} color="#ccc" />
              <ThemedText style={styles.locationEmptyText}>
                No location data
              </ThemedText>
            </ThemedView>
          )}
          
          <TouchableOpacity
            style={[styles.locationButton, { backgroundColor: Colors.tint }]}
            onPress={handleLocationRequest}
            disabled={locationLoading}
          >
            <MaterialIcons 
              name="my-location" 
              size={16} 
              color="white" 
            />
            <ThemedText style={styles.locationButtonText}>
              {locationLoading ? 'Getting...' : 'Get Location'}
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>

        {/* Menu Items */}
        <ThemedView style={styles.menuContainer}>
          <TouchableOpacity 
            style={[styles.menuItem, { borderBottomColor: Colors.primary }]}
            onPress={handleProfile}
          >
            <MaterialIcons name="person" size={24} color={Colors.primary} />
            <ThemedText style={styles.menuText}>Profile</ThemedText>
            <MaterialIcons name="chevron-right" size={24} color={Colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.menuItem, { borderBottomColor: Colors.primary }]}
            onPress={handleAbout}
          >
            <MaterialIcons name="info" size={24} color={Colors.primary} />
            <ThemedText style={styles.menuText}>About</ThemedText>
            <MaterialIcons name="chevron-right" size={24} color={Colors.primary} />
          </TouchableOpacity>


          <TouchableOpacity 
            style={[styles.menuItem, { borderBottomColor: Colors.primary }]}
            onPress={() => {
              onClose();
              router.push('/(login)/privacy');
            }}
          >
            <MaterialIcons name="privacy-tip" size={24} color={Colors.primary} />
            <ThemedText style={styles.menuText}>Privacy</ThemedText>
            <MaterialIcons name="chevron-right" size={24} color={Colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.menuItem, { borderBottomColor: Colors.primary }]}
            onPress={handleShowTabGuide}
          >
            <MaterialIcons name="help" size={24} color={Colors.primary} />
            <ThemedText style={styles.menuText}>Tab Guide</ThemedText>
            <MaterialIcons name="chevron-right" size={24} color={Colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.menuItem, { borderBottomColor: Colors.primary }]}
            onPress={() => {
              onClose();
              // Open the local PDF file
              const pdfPath = require('@/assets/documents/User Manual_Waste to Worth.pdf');
              Linking.openURL(pdfPath).catch(err => {
                console.error('Failed to open PDF:', err);
                Alert.alert('Error', 'Unable to open user manual. Please check if the file exists.');
              });
            }}
          >
            <MaterialIcons name="menu-book" size={24} color={Colors.primary} />
            <ThemedText style={styles.menuText}>User Manual</ThemedText>
            <MaterialIcons name="chevron-right" size={24} color={Colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.menuItem, { borderBottomColor: Colors.primary }]}
            onPress={() => {
              onClose();
              Linking.openURL('https://forms.gle/YDQ9cKPoZLLdGpoS6');
            }}
          >
            <MaterialIcons name="feedback" size={24} color={Colors.primary} />
            <ThemedText style={styles.menuText}>Feedback Survey</ThemedText>
            <MaterialIcons name="chevron-right" size={24} color={Colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.menuItem, { borderBottomColor: Colors.primary }]}
            onPress={handleResetTabGuide}
          >
            <MaterialIcons name="help-outline" size={24} color={Colors.primary} />
            <ThemedText style={styles.menuText}>Show Tab Guide Again</ThemedText>
            <MaterialIcons name="chevron-right" size={24} color={Colors.primary} />
          </TouchableOpacity>
        </ThemedView>

        {/* Logout Button */}
        <ThemedView style={styles.logoutContainer}>
          <TouchableOpacity 
            style={[styles.logoutButton, { backgroundColor: '#f44336' }]}
            onPress={handleLogout}
            disabled={loading}
          >
            <MaterialIcons name="logout" size={24} color="white" />
            <ThemedText style={[styles.logoutText, { color: 'white' }]}>
              {loading ? 'Logging out...' : 'Logout'}
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sidebar: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '80%',
    maxWidth: 300,
    paddingTop: 50,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRightWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary,
    backgroundColor: 'transparent',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D5016',
  },
  closeButton: {
    padding: 8,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary,
    backgroundColor: 'transparent',
  },
  userImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    marginBottom: 10,
  },
  userImage: {
    width: '100%',
    height: '100%',
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D5016',
  },
  locationSection: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#00630F',
    backgroundColor: 'transparent',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#2D5016',
  },
  locationErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  locationErrorText: {
    color: '#c62828',
    fontSize: 12,
    marginLeft: 6,
    flex: 1,
  },
  locationInfoContainer: {
    backgroundColor: 'transparent',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationDetails: {
    marginLeft: 8,
    flex: 1,
  },
  locationCoordinates: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#00630F',
    fontWeight: '600',
  },
  locationAccuracy: {
    fontSize: 10,
    color: '#00630F',
    marginTop: 2,
  },
  locationEmptyState: {
    alignItems: 'center',
    padding: 12,
    marginBottom: 12,
  },
  locationEmptyText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  locationButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  climateLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    marginTop: 8,
    backgroundColor: 'transparent',
  },
  climateLoadingText: {
    fontSize: 10,
    color: Colors.primary,
    marginLeft: 6,
  },
  climateErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3e0',
    padding: 6,
    borderRadius: 4,
    marginTop: 8,
  },
  climateErrorText: {
    color: '#f57c00',
    fontSize: 10,
    marginLeft: 6,
    flex: 1,
  },
  climateInfoContainer: {
    backgroundColor: 'transparent',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  climateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  climateZoneText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2c3e50',
    marginLeft: 4,
  },
  climateDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  climateDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  climateDetailText: {
    fontSize: 10,
    color: '#666',
    marginLeft: 4,
  },
  menuContainer: {
    flex: 1,
    paddingTop: 20,
    backgroundColor: 'transparent',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  menuText: {
    flex: 1,
    marginLeft: 15,
    fontSize: 16,
    color: Colors.text,
  },
  logoutContainer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.primary,
    backgroundColor: 'transparent',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  logoutText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '600',
  },
});
