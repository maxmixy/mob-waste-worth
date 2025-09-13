import { Image } from 'expo-image';
import { StyleSheet, View, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { Pressable } from 'react-native';
import { useState, useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getUserId, checkProfileCompletion } from '@/lib/user';
import { ImageService } from '@/lib/imageService';
import SettingsSidebar from '@/components/SettingsSidebar';
import { useLocation, LocationData } from '@/hooks/useLocation';
import { useClimate } from '@/hooks/useClimate';
import { populateTropicalDisposalTable, getUniqueMaterialsCount, getTropicalDisposalCount } from '@/lib/adminService';
import { useAuth } from '@/contexts/AuthContext';
import { questService } from '@/lib/questService';

const API_BASE_URL = 'http://127.0.0.1:5000';

// Types for the data structure
interface MaterialData {
  id: string;
  Name: string;
  Traits: string[];
  imageUrl?: string;
}

interface UserData {
  Materials: string[];
  created_at?: string;
  Current_project?: string;
  profile_image?: string;
  name?: string;
  achievement_title?: string;
  progress?: number;
}

interface ProjectData {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  difficulty: string;
  materialsNeeded: string[];
}

interface CurrentProjectData {
  id: string;
  project_image?: string;
  project_name: string;
  material_name: string;
  material_traits: string[];
  steps: string[];
}

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const params = useLocalSearchParams();
  const { userId } = useAuth();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [userMaterials, setUserMaterials] = useState<MaterialData[]>([]);
  const [userProjects, setUserProjects] = useState<ProjectData[]>([]);
  const [currentProject, setCurrentProject] = useState<CurrentProjectData | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('User');
  const [adminTapCount, setAdminTapCount] = useState(0);
  
  // Location functionality (for automatic background location detection)
  const { location, requestLocation } = useLocation();
  
  // Climate functionality (for automatic climate data fetching)
  const { getClimateForLocation } = useClimate();

  // Fetch user's scanned materials
  const fetchUserMaterials = async (userId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/user/${userId}/materials`);
      if (!response.ok) throw new Error('Failed to fetch user materials');
      return await response.json();
    } catch (error) {
      console.error('Error fetching user materials:', error);
      return [];
    }
  };

  // Fetch material details by ID
  const fetchMaterialDetails = async (materialId: string) => {
    try {
      console.log(`[Index] Fetching material details for ID: ${materialId}`);
      const response = await fetch(`${API_BASE_URL}/material/${materialId}`);
      if (!response.ok) throw new Error('Failed to fetch material details');
      const data = await response.json();
      console.log(`[Index] Material details fetched:`, {
        id: data.id,
        name: data.Name,
        imageUrl: data.ImageUrl
      });
      return data;
    } catch (error) {
      console.error('Error fetching material details:', error);
      return null;
    }
  };

  // Fetch projects for a material
  const fetchMaterialProjects = async (materialId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${materialId}`);
      if (!response.ok) throw new Error('Failed to fetch projects');
      return await response.json();
    } catch (error) {
      console.error('Error fetching projects:', error);
      return [];
    }
  };

  // Fetch current project details
  const fetchCurrentProject = async (userId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/user/${userId}/current-project`);
      if (!response.ok) throw new Error('Failed to fetch current project');
      const data = await response.json();
      return data.current_project; // Return the project data or null
    } catch (error) {
      console.error('Error fetching current project:', error);
      return null;
    }
  };

  // Navigate to project detail page
  const navigateToProjectDetail = (projectId: string) => {
    router.push(`/pages/project-detail?projectId=${projectId}`);
  };

  // Navigate to material detail page
  const navigateToMaterialDetail = (materialId: string) => {
    router.push(`/pages/detail?materialId=${materialId}`);
  };

  // Send location data to backend (for future use)
  const sendLocationToBackend = async (locationData: LocationData) => {
    try {
      if (!userId) return;

      const response = await fetch(`${API_BASE_URL}/user/${userId}/location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          accuracy: locationData.accuracy,
          timestamp: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        console.log('Location data sent to backend successfully');
      } else {
        console.error('Failed to send location data to backend');
      }
    } catch (error) {
      console.error('Error sending location data:', error);
    }
  };

  // Handle automatic location update on login
  const handleAutomaticLocationUpdate = async () => {
    try {
      console.log('🌍 Automatically requesting location on login...');
      await requestLocation();
      if (location) {
        console.log('🌍 Location obtained, sending to backend and getting climate data...');
        // Send to backend for future location-based features
        await sendLocationToBackend(location);
        // Get climate data for the location
        await getClimateForLocation(location);
        
        // Track quest progress for location action
        console.log('📍 Tracking location action: Share location');
        try {
          if (userId) {
            const results = await questService.trackLocationAction(userId);
            await questService.checkCompletedQuests(results);
            console.log('✅ Location quest progress updated:', results);
          }
        } catch (questError) {
          console.error('❌ Error tracking location quest:', questError);
        }
      }
    } catch (error) {
      console.error('🌍 Error getting location automatically:', error);
    }
  };

  // Admin function to populate tropical disposal table
  const handleAdminFunction = async () => {
    try {
      Alert.alert(
        'Admin Function',
        'Populate tropical disposal table for all existing materials?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Yes', 
            onPress: async () => {
              try {
                Alert.alert('Processing', 'Populating disposal table... This may take a moment.');
                
                const result = await populateTropicalDisposalTable();
                
                Alert.alert(
                  'Population Complete',
                  `Processed: ${result.results.processed}\n` +
                  `Successful: ${result.results.successful}\n` +
                  `Failed: ${result.results.failed}\n` +
                  `Skipped: ${result.results.skipped}\n` +
                  `Errors: ${result.results.errors.length}`,
                  [{ text: 'OK' }]
                );
              } catch (error) {
                Alert.alert('Error', `Failed to populate disposal table: ${error}`);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Admin function error:', error);
    }
  };

  // Handle title tap for admin function
  const handleTitleTap = () => {
    const newCount = adminTapCount + 1;
    setAdminTapCount(newCount);
    
    if (newCount >= 5) {
      setAdminTapCount(0);
      handleAdminFunction();
    } else if (newCount >= 3) {
      // Show hint after 3 taps
      setTimeout(() => {
        if (adminTapCount >= 3) {
          Alert.alert('Admin Mode', `Tap ${5 - newCount} more times to access admin functions`);
        }
      }, 1000);
    }
    
    // Reset counter after 5 seconds
    setTimeout(() => {
      setAdminTapCount(0);
    }, 5000);
  };

  // Refresh current project data
  const refreshCurrentProject = async (userId: string) => {
    try {
      const currentProjectData = await fetchCurrentProject(userId);
      if (currentProjectData && currentProjectData.project_name) {
        setCurrentProject(currentProjectData);
      } else {
        setCurrentProject(null);
      }
    } catch (error) {
      console.error('Error refreshing current project:', error);
    }
  };

  // Initialize user profile with default values (frontend only)
  const initializeUserProfile = async (userId: string) => {
    try {
      console.log('🔧 Initializing user profile with default values (frontend)...');
      const defaultProfile = {
        name: 'User',
        achievement_title: 'Recycling Beginner',
        progress: 0,
        Materials: []
      };
      
      // Since backend doesn't have PUT endpoint, we'll set defaults in frontend
      console.log('🔧 Setting default profile data in frontend state');
      setUserData(defaultProfile);
      setUserName(defaultProfile.name);
      
      // Track quest progress for profile completion
      console.log('👤 Tracking profile action: Initialize profile');
      try {
        const results = await questService.trackProfileCompletion(userId);
        await questService.checkCompletedQuests(results);
        console.log('✅ Profile quest progress updated:', results);
      } catch (questError) {
        console.error('❌ Error tracking profile quest:', questError);
      }
      
      return defaultProfile;
    } catch (error) {
      console.error('🔧 Error initializing user profile:', error);
      return null;
    }
  };

  // Refresh user profile data (name, title, progress)
  const refreshUserProfile = async () => {
    try {
      if (userId) {
        console.log('🔄 Refreshing user profile data...');
        const [userDataResponse, profileInfo] = await Promise.all([
          fetchUserProfileData(userId),
          checkProfileCompletion(userId)
        ]);
        
        if (userDataResponse) {
          console.log('🔄 Updated user profile data:', {
            name: userDataResponse.name,
            title: userDataResponse.achievement_title,
            progress: userDataResponse.progress
          });
          setUserData(userDataResponse);
        } else {
          // If no data found, try to initialize
          console.log('🔄 No user data found, initializing...');
          const initializedData = await initializeUserProfile(userId);
          if (initializedData) {
            setUserData(initializedData);
          }
        }
        
        // Update profile completion data and prioritize firstName/lastName
        if (profileInfo.profileCompleted && profileInfo.profileData) {
          console.log('🔄 Profile completion data found:', profileInfo.profileData);
          setUserProfile(profileInfo.profileData);
          
          // Prioritize firstName and lastName from profile completion
          if (profileInfo.profileData.firstName && profileInfo.profileData.lastName) {
            const fullName = `${profileInfo.profileData.firstName} ${profileInfo.profileData.lastName}`;
            console.log('🔄 Using profile completion name:', fullName);
            setUserName(fullName);
          } else if (userDataResponse?.name) {
            console.log('🔄 Using user data name:', userDataResponse.name);
            setUserName(userDataResponse.name);
          } else {
            console.log('🔄 Using default name: User');
            setUserName('User');
          }
        } else if (userDataResponse?.name) {
          console.log('🔄 Using user data name (no profile completion):', userDataResponse.name);
          setUserName(userDataResponse.name);
        } else {
          console.log('🔄 Using default name (no profile data): User');
          setUserName('User');
        }
      }
    } catch (error) {
      console.error('🔄 Error refreshing user profile:', error);
    }
  };

  // Load profile image from web server
  const loadProfileImage = async (userId: string) => {
    try {
      console.log('🖼️ Loading profile image for user:', userId);
      const imageResponse = await ImageService.getProfileImage(userId);
      console.log('🖼️ Image response:', imageResponse);
      
      if (imageResponse.success && imageResponse.hasImage && imageResponse.imageUrl) {
        console.log('🖼️ Setting profile image URL:', imageResponse.imageUrl);
        setProfileImageUrl(imageResponse.imageUrl);
      } else {
        console.log('🖼️ No profile image found or error:', imageResponse.error || imageResponse.message);
        setProfileImageUrl(null);
      }
    } catch (error) {
      console.error('🖼️ Error loading profile image:', error);
      setProfileImageUrl(null);
    }
  };

  // Fetch user profile data (name, title, progress)
  const fetchUserProfileData = async (userId: string) => {
    try {
      console.log('👤 Fetching user profile data for:', userId);
      const response = await fetch(`${API_BASE_URL}/user/${userId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch user data: ${response.status}`);
      }
      
      const userData = await response.json();
      console.log('👤 Raw user data from API:', userData);
      console.log('👤 User profile data received:', {
        name: userData.name,
        achievement_title: userData.achievement_title,
        progress: userData.progress,
        materials_count: userData.Materials?.length || 0
      });
      
      // Log name priority logic
      console.log('👤 Name priority check:', {
        has_userData_name: !!userData.name,
        userData_name: userData.name,
        note: 'Will check profile completion data for firstName/lastName'
      });
      
      // Check if we need to initialize default values
      if (!userData.name || !userData.achievement_title || userData.progress === undefined) {
        console.log('👤 Missing profile data, initializing defaults...');
        
        // Initialize with default values if missing
        const updatedUserData = {
          ...userData,
          name: userData.name || 'User',
          achievement_title: userData.achievement_title || 'Recycling Beginner',
          progress: userData.progress !== undefined ? userData.progress : 0
        };
        
        console.log('👤 Updated user data with defaults:', updatedUserData);
        return updatedUserData;
      }
      
      return userData;
    } catch (error) {
      console.error('👤 Error fetching user profile data:', error);
      return null;
    }
  };

  // Load user data on component mount
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setLoading(true);
        
        if (!userId) {
          setError('No user ID found');
          setLoading(false);
          return;
        }

        // Fetch user's materials, profile data, and profile completion info
        const [userMaterialsData, userDataResponse, profileInfo] = await Promise.all([
          fetchUserMaterials(userId),
          fetchUserProfileData(userId),
          checkProfileCompletion(userId)
        ]);
        
        // Set user data with enhanced logging
        if (userDataResponse) {
          console.log('👤 Setting user data:', {
            name: userDataResponse.name,
            title: userDataResponse.achievement_title,
            progress: userDataResponse.progress
          });
          setUserData(userDataResponse);
        } else {
          // If no user data found, try to initialize with defaults
          console.log('👤 No user data found, initializing with defaults...');
          const initializedData = await initializeUserProfile(userId);
          if (initializedData) {
            setUserData(initializedData);
          }
        }
        
        // Set profile data (from profile completion check) and prioritize firstName/lastName
        if (profileInfo.profileCompleted && profileInfo.profileData) {
          console.log('👤 Profile completion data found:', profileInfo.profileData);
          setUserProfile(profileInfo.profileData);
          
          // Prioritize firstName and lastName from profile completion
          if (profileInfo.profileData.firstName && profileInfo.profileData.lastName) {
            const fullName = `${profileInfo.profileData.firstName} ${profileInfo.profileData.lastName}`;
            console.log('👤 Using profile completion name:', fullName);
            setUserName(fullName);
          } else if (userDataResponse?.name) {
            console.log('👤 Using user data name:', userDataResponse.name);
            setUserName(userDataResponse.name);
          } else {
            console.log('👤 Using default name: User');
            setUserName('User');
          }
        } else if (userDataResponse?.name) {
          console.log('👤 Using user data name (no profile completion):', userDataResponse.name);
          setUserName(userDataResponse.name);
        } else {
          console.log('👤 Using default name (no profile data): User');
          setUserName('User');
        }
        
        // Fetch current project if user has one
        try {
          const currentProjectData = await fetchCurrentProject(userId);
          if (currentProjectData && currentProjectData.project_name) {
            setCurrentProject(currentProjectData);
          }
        } catch (error) {
          console.error('Error fetching current project:', error);
          // Continue without current project if there's an error
        }

        // Load profile image
        await loadProfileImage(userId);
        
        // Automatically request location when user logs in
        await handleAutomaticLocationUpdate();
        
        if (userMaterialsData.length > 0) {
          // Fetch details for each material
          const materialDetails = await Promise.all(
            userMaterialsData.map((materialId: string) => fetchMaterialDetails(materialId))
          );
          
          // Filter out null results and set materials
          const validMaterials = materialDetails.filter(material => material !== null);
          setUserMaterials(validMaterials);

          // Fetch projects for the first few materials
          const projectPromises = validMaterials.slice(0, 3).map(material => 
            fetchMaterialProjects(material.id)
          );
          
          const projectResults = await Promise.all(projectPromises);
          const allProjects = projectResults.flat().slice(0, 5); // Limit to 5 projects
          setUserProjects(allProjects);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        setError('Failed to load user data');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      loadUserData();
    }
  }, [userId]);

  // Handle refresh parameter
  useEffect(() => {
    const handleRefresh = async () => {
      if (params.refresh === 'true' && userId) {
        try {
          await refreshCurrentProject(userId);
        } catch (error) {
          console.error('Error handling refresh:', error);
        }
      }
    };

    handleRefresh();
  }, [params.refresh, userId]);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: Colors[colorScheme].background }]}>
        <ActivityIndicator size="large" color={Colors[colorScheme].icon} />
        <ThemedText style={styles.loadingText}>Loading your materials...</ThemedText>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: Colors[colorScheme].background }]}>
        <ThemedText style={styles.errorText}>{error}</ThemedText>
      </View>
    );
  }

  return (
    <>
      <SettingsSidebar 
        visible={sidebarVisible} 
        onClose={() => setSidebarVisible(false)} 
      />
      <View
        style={{ flex: 1, padding: 16, backgroundColor: Colors[colorScheme].background }}
      >
        <View style={styles.headerRow}>
          {/* <ThemedView style={styles.titleContainer}>
            <ThemedText type="title">Waste to Worth</ThemedText>
          </ThemedView> */}
          
        </View>
        <View style={styles.sectionsContainer}>
          {/* Current Project Section (Top) */}
          {currentProject && currentProject.project_name && (
            <>
              <ThemedView
                style={[styles.section, { borderTopLeftRadius: 12, borderTopRightRadius: 12 }]}
                lightColor={Colors.light.background}
                darkColor={Colors.dark.background}
              >
                <Pressable onPress={handleTitleTap}>
                  <ThemedText type="subtitle">Current Project 
                    <Pressable
                      style={styles.settingsButton}
                      onPress={() => setSidebarVisible(true)}
                      accessibilityLabel="Settings"
                    >
                      <MaterialIcons name="settings" size={24} color={Colors[colorScheme].icon} />
                    </Pressable>
                  </ThemedText>
                </Pressable>
                
                <TouchableOpacity 
                  style={styles.currentProjectCard}
                  onPress={() => navigateToProjectDetail(currentProject.id)}
                  activeOpacity={0.7}
                >
                  <Image
                    source={currentProject.project_image ? { uri: currentProject.project_image } : require('@/assets/images/partial-react-logo.png')}
                    style={styles.currentProjectImage}
                    resizeMode="cover"
                  />
                  <View style={styles.currentProjectInfo}>
                    <ThemedText type="defaultSemiBold" style={styles.currentProjectTitle}>
                      {currentProject.project_name || 'Untitled Project'}
                    </ThemedText>
                    <ThemedText style={styles.currentProjectMaterial}>
                      Material: {currentProject.material_name || 'Unknown Material'}
                    </ThemedText>
                    <ThemedText style={styles.currentProjectSteps}>
                      {currentProject.steps?.length || 0} steps to complete
                    </ThemedText>
                    <ThemedText style={styles.tapToViewText}>
                      Tap to view details →
                    </ThemedText>
                  </View>
                </TouchableOpacity>
              </ThemedView>
              <View style={styles.divider} />
            </>
          )}
          
          {/* Materials Section */}
          <ThemedView
            style={[styles.section, { flex: 1, borderTopLeftRadius: currentProject ? 0 : 12, borderTopRightRadius: currentProject ? 0 : 12 }]}
            lightColor={Colors.light.background}
            darkColor={Colors.dark.background}
          >
            <View style={styles.materialsHeader}>
              <Pressable onPress={handleTitleTap}>
                <ThemedText type="subtitle">Your Scanned Materials</ThemedText>
              </Pressable>
              {userMaterials.length > 3 && (
                <Pressable
                  style={styles.showMoreButton}
                  onPress={() => router.push('/history')}
                >
                  <ThemedText style={styles.showMoreText}>Show More</ThemedText>
                  <MaterialIcons name="arrow-forward" size={16} color="#007AFF" />
                </Pressable>
              )}
            </View>
            {/* Fixed Width Material Cards */}
            <View style={styles.materialsContainer}>
              {userMaterials.length > 0 ? (
                userMaterials.slice(-3).map((material, index) => (
                  <TouchableOpacity 
                    key={material.id} 
                    style={styles.materialCard}
                    onPress={() => navigateToMaterialDetail(material.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.materialImageContainer}>
                      <Image
                        source={material.imageUrl ? { uri: material.imageUrl } : require('@/assets/images/partial-react-logo.png')}
                        style={styles.materialCardImage}
                        resizeMode="contain"
                        onLoad={() => console.log(`[Index] Image loaded for ${material.Name}`)}
                        onError={(error) => console.log(`[Index] Image failed to load for ${material.Name}:`, error)}
                      />
                    </View>
                    <View style={styles.materialCardContent}>
                      <ThemedText type="defaultSemiBold" style={styles.materialCardTitle}>{material.Name}</ThemedText>
                      <ThemedText style={styles.materialCardDescription}>
                        {material.Traits.slice(0, 3).join(', ')}
                        {material.Traits.length > 3 ? '...' : ''}
                      </ThemedText>
                      <ThemedText style={styles.tapToViewText}>
                        Tap to view details →
                      </ThemedText>
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <ThemedText style={styles.emptyStateText}>No materials scanned yet</ThemedText>
                  <ThemedText style={styles.emptyStateSubtext}>Scan your first item to get started!</ThemedText>
                </View>
              )}
            </View>
          </ThemedView>
          {/* Profile Section (Bottom) */}
          <ThemedView
            style={[styles.section, { flex: 1, borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }]}
            lightColor={Colors.light.background}
            darkColor={Colors.dark.background}
          >
            <View style={styles.profileSectionHeader}>
              <ThemedText type="subtitle">Profile</ThemedText>
              <View style={styles.profileHeaderActions}>
                {(!userProfile?.firstName || !userProfile?.lastName || !userData?.achievement_title || userData?.progress === undefined) && (
                  <Pressable
                    style={styles.initializeButton}
                    onPress={async () => {
                      if (userId) {
                        await initializeUserProfile(userId);
                        await refreshUserProfile();
                      }
                    }}
                  >
                    <MaterialIcons name="add-circle" size={16} color="#007AFF" />
                  </Pressable>
                )}
                <MaterialIcons name="refresh" size={16} color="#666" />
              </View>
            </View>
            <Pressable 
              style={styles.profileCard}
              onPress={refreshUserProfile}
            >
              <View style={styles.profileHeader}>
                <Pressable 
                  style={styles.profileImageContainer}
                  onPress={async () => {
                    if (userId) {
                      await loadProfileImage(userId);
                    }
                  }}
                >
                  <Image
                    source={profileImageUrl ? { uri: profileImageUrl } : require('@/assets/images/partial-react-logo.png')}
                    style={styles.profileImage}
                    resizeMode="cover"
                  />
                </Pressable>
                <View style={styles.profileInfo}>
                  <ThemedText type="defaultSemiBold" style={styles.profileName}>
                    {userProfile?.firstName && userProfile?.lastName 
                      ? `${userProfile.firstName} ${userProfile.lastName}`
                      : userData?.name || userName || 'User'
                    }
                  </ThemedText>
                  <ThemedText style={styles.achievementTitle}>
                    {userData?.achievement_title || 'Recycling Beginner'}
                  </ThemedText>
                  {(!userProfile?.firstName || !userProfile?.lastName || !userData?.achievement_title || userData?.progress === undefined) && (
                    <ThemedText style={styles.profileHint}>
                      Tap the + icon to initialize your profile
                    </ThemedText>
                  )}
                </View>
              </View>
              <View style={styles.progressSection}>
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill, 
                        { width: `${userData?.progress || 0}%` }
                      ]} 
                    />
                  </View>
                  <ThemedText style={styles.progressText}>
                    {userData?.progress || 0}%
                  </ThemedText>
                </View>
              </View>
            </Pressable>
          </ThemedView>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    marginTop: 50,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  sectionsContainer: {
    flex: 1,
    flexDirection: 'column',
    minHeight: 0,
  },
  section: {
    padding: 16,
    justifyContent: 'flex-start',
  },
  divider: {
    height: 1,
    backgroundColor: '#ccc',
    marginVertical: 0,
    width: '100%',
    alignSelf: 'center',
  },
  cardRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 8,
  },
  card: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    width: 160,
    marginRight: 8,
  },
  cardImage: {
    width: 80,
    height: 80,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    textAlign: 'center',
    color: '#555',
  },
  difficultyText: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    width: 200,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#ff3b30',
    textAlign: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  settingsButton: {
    padding: 8,
  },
  sidebarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 100,
  },
  sidebarContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 280,
    height: '100%',
    backgroundColor: '#fff',
    paddingTop: 48,
    paddingHorizontal: 20,
    zIndex: 101,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  sidebarProfile: {
    alignItems: 'center',
    marginBottom: 32,
  },
  userImageContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    marginBottom: 8,
  },
  userImage: {
    width: '100%',
    height: '100%',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  materialCount: {
    fontSize: 14,
    color: '#666',
  },
  currentProjectCard: {
    flexDirection: 'row',
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    minHeight: 200,
  },
  currentProjectImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginRight: 24,
  },
  currentProjectInfo: {
    flex: 1,
  },
  currentProjectTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  currentProjectMaterial: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  currentProjectSteps: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  },
  profileSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  profileHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  initializeButton: {
    padding: 4,
  },
  profileCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 20,
    opacity: 1,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  profileImageContainer: {
    position: 'relative',
    marginRight: 16,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  imageSourceIndicator: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 10,
    padding: 2,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  achievementTitle: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  profileHint: {
    fontSize: 12,
    color: '#007AFF',
    fontStyle: 'italic',
    marginTop: 4,
  },
  progressSection: {
    marginTop: 10,
  },
  progressLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 12,
    backgroundColor: '#e0e0e0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 6,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
    minWidth: 40,
  },
  materialsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  showMoreText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  materialsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    height: 200
  },
  materialCard: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  materialImageContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  materialCardImage: {
    width: 60,
    height: 60,
  },
  materialImageSourceIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: 'white',
    borderRadius: 6,
    padding: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  materialCardContent: {
    alignItems: 'center',
  },
  materialCardTitle: {
    fontSize: 14,
    marginBottom: 4,
    textAlign: 'center',
  },
  materialCardDescription: {
    fontSize: 12,
    textAlign: 'center',
    color: '#555',
    lineHeight: 16,
  },
  tapToViewText: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 8,
    fontWeight: '500',
  },
});