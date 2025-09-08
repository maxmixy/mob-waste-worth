import React, { useState, useEffect } from 'react';
import { Modal, TouchableOpacity, StyleSheet, Alert, View, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { usePalette } from '@/hooks/usePalette';
import { useThemeVariant, ThemeVariant, ThemeScheme } from '@/hooks/ThemeContext';
import { getUserId, logoutUser, checkProfileCompletion } from '@/lib/user';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';

interface SettingsSidebarProps {
  visible: boolean;
  onClose: () => void;
}

export default function SettingsSidebar({ visible, onClose }: SettingsSidebarProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const { variant, setVariant, scheme, setScheme } = useThemeVariant();
  const P = usePalette();
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
    router.push('/pages/about');
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
      <ThemedView style={[styles.sidebar, { backgroundColor: P.background }]}> 
          {/* Header */}
          <ThemedView style={[styles.header, { borderBottomColor: P.border }]}>
            <ThemedText type="title" style={styles.headerTitle}>Settings</ThemedText>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color={P.icon} />
            </TouchableOpacity>
          </ThemedView>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
            {/* User Profile Section */}
            <ThemedView style={[styles.profileSection, { borderBottomColor: P.border }]}>
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
                style={[styles.menuItem, { borderBottomColor: P.text + '20' }]}
                onPress={handleProfile}
              >
                <MaterialIcons name="person" size={24} color={P.icon} />
                <ThemedText style={styles.menuText}>Profile</ThemedText>
                <MaterialIcons name="chevron-right" size={24} color={P.icon} />
              </TouchableOpacity>

              {/* Themes picker */}
              <ThemedView style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: P.text + '20' }}>
                <ThemedText style={{ fontSize: 14, opacity: 0.7, marginBottom: 10 }}>Theme</ThemedText>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {(['green'] as ThemeVariant[]).map((key) => (
                    <TouchableOpacity
                      key={key}
                      accessibilityRole="button"
                      onPress={() => setVariant(key)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: variant === key ? P.primary : P.border,
                        backgroundColor: variant === key ? P.backgroundSecondary : 'transparent',
                        marginRight: 10,
                        marginBottom: 10,
                      }}
                    >
                      <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: P.primary, marginRight: 8 }} />
                      <ThemedText style={{ fontSize: 14, textTransform: 'capitalize' }}>{key}</ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
                <ThemedText style={{ fontSize: 14, opacity: 0.7, marginVertical: 10 }}>Appearance</ThemedText>
                <View style={{ flexDirection: 'row' }}>
                  {(['light','dark'] as ThemeScheme[]).map((s) => (
                    <TouchableOpacity key={s} onPress={() => setScheme(s)} style={{
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: scheme === s ? P.primary : P.border,
                      backgroundColor: scheme === s ? P.backgroundSecondary : 'transparent',
                      marginRight: 10,
                    }}>
                      <ThemedText style={{ textTransform: 'capitalize' }}>{s}</ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              </ThemedView>

              <TouchableOpacity 
                style={[styles.menuItem, { borderBottomColor: P.text + '20' }]}
                onPress={handleAbout}
              >
                <MaterialIcons name="info" size={24} color={P.icon} />
                <ThemedText style={styles.menuText}>About</ThemedText>
                <MaterialIcons name="chevron-right" size={24} color={P.icon} />
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.menuItem, { borderBottomColor: P.text + '20' }]}
                onPress={() => {
                  onClose();
                }}
              >
                <MaterialIcons name="notifications" size={24} color={P.icon} />
                <ThemedText style={styles.menuText}>Notifications</ThemedText>
                <MaterialIcons name="chevron-right" size={24} color={P.icon} />
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.menuItem, { borderBottomColor: P.text + '20' }]}
                onPress={() => {
                  onClose();
                }}
              >
                <MaterialIcons name="privacy-tip" size={24} color={P.icon} />
                <ThemedText style={styles.menuText}>Privacy</ThemedText>
                <MaterialIcons name="chevron-right" size={24} color={P.icon} />
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
    height: '100%'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
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
