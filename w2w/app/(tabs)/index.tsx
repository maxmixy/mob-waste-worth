import { Image } from 'expo-image';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { Pressable } from 'react-native';
import { useState, useEffect } from 'react';
import { Modal, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ScrollView as RNScrollView } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getUserId } from '@/lib/user';

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
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [userMaterials, setUserMaterials] = useState<MaterialData[]>([]);
  const [userProjects, setUserProjects] = useState<ProjectData[]>([]);
  const [currentProject, setCurrentProject] = useState<CurrentProjectData | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('User');

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
      const response = await fetch(`${API_BASE_URL}/material/${materialId}`);
      if (!response.ok) throw new Error('Failed to fetch material details');
      return await response.json();
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
  const fetchCurrentProject = async (projectId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/recycling/${projectId}`);
      if (!response.ok) throw new Error('Failed to fetch current project');
      return await response.json();
    } catch (error) {
      console.error('Error fetching current project:', error);
      return null;
    }
  };

  // Load user data on component mount
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setLoading(true);
        const userId = await getUserId();
        
        if (!userId) {
          setError('No user ID found');
          setLoading(false);
          return;
        }

        // Fetch user's materials and current project
        const [userMaterialsData, userDataResponse] = await Promise.all([
          fetchUserMaterials(userId),
          fetch(`${API_BASE_URL}/user/${userId}`).then(res => res.ok ? res.json() : null)
        ]);
        
        // Set user data
        if (userDataResponse) {
          setUserData(userDataResponse);
          setUserName(userDataResponse.name || 'User');
        }
        
        // Fetch current project if user has one
        if (userDataResponse && userDataResponse.Current_project) {
          try {
            const currentProjectData = await fetchCurrentProject(userDataResponse.Current_project);
            if (currentProjectData && currentProjectData.project_name) {
              setCurrentProject(currentProjectData);
            }
          } catch (error) {
            console.error('Error fetching current project:', error);
            // Continue without current project if there's an error
          }
        }
        
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

    loadUserData();
  }, []);

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
                <ThemedText type="subtitle">Current Project 
                  <Pressable
                    style={styles.settingsButton}
                    onPress={() => setSidebarVisible(true)}
                    accessibilityLabel="Settings"
                  >
                    <MaterialIcons name="settings" size={24} color={Colors[colorScheme].icon} />
                  </Pressable>
                </ThemedText>
                
                <View style={styles.currentProjectCard}>
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
                  </View>
                </View>
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
              <ThemedText type="subtitle">Your Scanned Materials</ThemedText>
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
                  <View key={material.id} style={styles.materialCard}>
                    <Image
                      source={material.imageUrl ? { uri: material.imageUrl } : require('@/assets/images/partial-react-logo.png')}
                      style={styles.materialCardImage}
                      resizeMode="contain"
                    />
                    <View style={styles.materialCardContent}>
                      <ThemedText type="defaultSemiBold" style={styles.materialCardTitle}>{material.Name}</ThemedText>
                      <ThemedText style={styles.materialCardDescription}>
                        {material.Traits.slice(0, 3).join(', ')}
                        {material.Traits.length > 3 ? '...' : ''}
                      </ThemedText>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <ThemedText style={styles.emptyStateText}>No materials scanned yet</ThemedText>
                  <ThemedText style={styles.emptyStateSubtext}>Scan your first item to get started!</ThemedText>
                </View>
              )}
            </View>
          </ThemedView>
          {/* Divider Line */}
          <View style={styles.divider} />
          {/* Profile Section (Bottom) */}
          <ThemedView
            style={[styles.section, { flex: 1, borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }]}
            lightColor={Colors.light.background}
            darkColor={Colors.dark.background}
          >
            <ThemedText type="subtitle">Profile</ThemedText>
            <View style={styles.profileCard}>
              <View style={styles.profileHeader}>
                <Image
                  source={userData?.profile_image ? { uri: userData.profile_image } : require('@/assets/images/partial-react-logo.png')}
                  style={styles.profileImage}
                  resizeMode="cover"
                />
                <View style={styles.profileInfo}>
                  <ThemedText type="defaultSemiBold" style={styles.profileName}>
                    {userData?.name || 'User'}
                  </ThemedText>
                  <ThemedText style={styles.achievementTitle}>
                    {userData?.achievement_title || 'Recycling Beginner'}
                  </ThemedText>
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
            </View>
          </ThemedView>
        </View>
      </View>
      {/* Sidebar Modal */}
      <Modal
        visible={sidebarVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setSidebarVisible(false)}
      >
        <TouchableOpacity style={styles.sidebarOverlay} activeOpacity={1} onPress={() => setSidebarVisible(false)} />
        <View style={styles.sidebarContainer}>
          {/* User Profile at the top of sidebar */}
          <View style={styles.sidebarProfile}>
            <View style={styles.userImageContainer}>
              <Image
                source={require('@/assets/images/partial-react-logo.png')}
                style={styles.userImage}
                resizeMode="cover"
              />
            </View>
            <ThemedText style={styles.userName}>{userName}</ThemedText>
            <ThemedText style={styles.materialCount}>
              {userMaterials.length} materials scanned
            </ThemedText>
          </View>
          {/* Add more sidebar content here */}
        </View>
      </Modal>
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
  profileCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
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
  materialCardImage: {
    width: 60,
    height: 60,
    marginBottom: 8,
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
});