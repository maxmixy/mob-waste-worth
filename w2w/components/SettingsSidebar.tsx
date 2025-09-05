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
    // Navigate to about page if you have one
    // router.push('/(settings)/about');
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
