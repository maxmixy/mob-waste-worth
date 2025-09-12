import React, { useState, useEffect } from 'react';
import { Modal, TouchableOpacity, StyleSheet, Alert, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getUserId, logoutUser, checkProfileCompletion } from '@/lib/user';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { useLocation } from '@/hooks/useLocation';
import { useClimate } from '@/hooks/useClimate';

interface SettingsSidebarProps {
  visible: boolean;
  onClose: () => void;
}

export default function SettingsSidebar({ visible, onClose }: SettingsSidebarProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const router = useRouter();
  const [userName, setUserName] = useState('User');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  // Location and climate functionality
  const { location, error: locationError, loading: locationLoading, requestLocation } = useLocation();
  const { climateData, loading: climateLoading, error: climateError, getClimateForLocation } = useClimate();

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
      }
    } catch (error) {
      console.error('Error loading user info:', error);
      setUserName('User');
    }
  };

  const handleLogout = () => {
    console.log('Logout button pressed');
    
    // Close the sidebar first to avoid modal conflicts
    onClose();
    
    // Use setTimeout to ensure the sidebar is closed before showing alert
    setTimeout(() => {
      console.log('Showing logout confirmation alert');
      
      // Try to show the alert with a longer timeout
      try {
        Alert.alert(
          'Logout',
          'Are you sure you want to logout?',
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => {
                console.log('Logout cancelled');
              }
            },
            {
              text: 'Logout',
              style: 'destructive',
              onPress: async () => {
                console.log('User confirmed logout');
                try {
                  setLoading(true);
                  console.log('Starting logout process...');
                  await logoutUser();
                  console.log('Logout successful, navigating to login...');
                  
                  // Try multiple navigation methods to ensure it works
                  console.log('Attempting navigation to login...');
                  try {
                    console.log('Trying router.push to /(login)');
                    router.push('/(login)');
                    console.log('Router.push completed successfully');
                  } catch (navError) {
                    console.error('Router push failed, trying replace:', navError);
                    try {
                      console.log('Trying router.replace to /(login)');
                      router.replace('/(login)');
                      console.log('Router.replace completed successfully');
                    } catch (replaceError) {
                      console.error('Router replace also failed:', replaceError);
                      // As a last resort, try to navigate to the root and then to login
                      console.log('Trying fallback navigation via root');
                      router.replace('/');
                      setTimeout(() => {
                        console.log('Trying delayed navigation to login');
                        router.push('/(login)');
                      }, 100);
                    }
                  }
                } catch (error) {
                  console.error('Logout error:', error);
                  Alert.alert('Error', 'Failed to logout. Please try again.');
                } finally {
                  setLoading(false);
                }
              },
            },
          ],
          { cancelable: true }
        );
      } catch (alertError) {
        console.error('Alert failed to show:', alertError);
        // Fallback: proceed with logout without confirmation
        console.log('Proceeding with logout without confirmation due to alert error');
        performLogout();
      }
    }, 200);
  };

  const performLogout = async () => {
    try {
      setLoading(true);
      console.log('Starting logout process...');
      await logoutUser();
      console.log('Logout successful, navigating to login...');
      
      // Try multiple navigation methods to ensure it works
      console.log('Attempting navigation to login...');
      try {
        console.log('Trying router.push to /(login)');
        router.push('/(login)');
        console.log('Router.push completed successfully');
      } catch (navError) {
        console.error('Router push failed, trying replace:', navError);
        try {
          console.log('Trying router.replace to /(login)');
          router.replace('/(login)');
          console.log('Router.replace completed successfully');
        } catch (replaceError) {
          console.error('Router replace also failed:', replaceError);
          // As a last resort, try to navigate to the root and then to login
          console.log('Trying fallback navigation via root');
          router.replace('/');
          setTimeout(() => {
            console.log('Trying delayed navigation to login');
            router.push('/(login)');
          }, 100);
        }
      }
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    } finally {
      setLoading(false);
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
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={onClose}
      />
      <ThemedView style={[styles.sidebar, { backgroundColor: Colors[colorScheme].background }]}>
        {/* Header */}
        <ThemedView style={styles.header}>
          <ThemedText type="title" style={styles.headerTitle}>Settings</ThemedText>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color={Colors[colorScheme].text} />
          </TouchableOpacity>
        </ThemedView>

        {/* User Profile Section */}
        <ThemedView style={styles.profileSection}>
          <View style={styles.userImageContainer}>
            <Image
              source={require('@/assets/images/partial-react-logo.png')}
              style={styles.userImage}
              resizeMode="cover"
            />
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
                <MaterialIcons name="place" size={20} color={Colors[colorScheme].tint} />
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
                  <MaterialIcons name="refresh" size={16} color={Colors[colorScheme].tint} />
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
            style={[styles.locationButton, { backgroundColor: Colors[colorScheme].tint }]}
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
            style={[styles.menuItem, { borderBottomColor: Colors[colorScheme].text + '20' }]}
            onPress={handleProfile}
          >
            <MaterialIcons name="person" size={24} color={Colors[colorScheme].icon} />
            <ThemedText style={styles.menuText}>Profile</ThemedText>
            <MaterialIcons name="chevron-right" size={24} color={Colors[colorScheme].icon} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.menuItem, { borderBottomColor: Colors[colorScheme].text + '20' }]}
            onPress={handleAbout}
          >
            <MaterialIcons name="info" size={24} color={Colors[colorScheme].icon} />
            <ThemedText style={styles.menuText}>About</ThemedText>
            <MaterialIcons name="chevron-right" size={24} color={Colors[colorScheme].icon} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.menuItem, { borderBottomColor: Colors[colorScheme].text + '20' }]}
            onPress={() => {
              onClose();
              // Add notification settings if needed
            }}
          >
            <MaterialIcons name="notifications" size={24} color={Colors[colorScheme].icon} />
            <ThemedText style={styles.menuText}>Notifications</ThemedText>
            <MaterialIcons name="chevron-right" size={24} color={Colors[colorScheme].icon} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.menuItem, { borderBottomColor: Colors[colorScheme].text + '20' }]}
            onPress={() => {
              onClose();
              // Add privacy settings if needed
            }}
          >
            <MaterialIcons name="privacy-tip" size={24} color={Colors[colorScheme].icon} />
            <ThemedText style={styles.menuText}>Privacy</ThemedText>
            <MaterialIcons name="chevron-right" size={24} color={Colors[colorScheme].icon} />
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
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
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
  },
  locationSection: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  locationErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
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
    backgroundColor: '#f0f8ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e3f2fd',
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
    color: '#1976d2',
    fontWeight: '600',
  },
  locationAccuracy: {
    fontSize: 10,
    color: '#666',
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
  },
  climateLoadingText: {
    fontSize: 10,
    color: '#666',
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
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
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
  },
  logoutContainer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
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
