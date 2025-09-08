import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { usePalette } from '@/hooks/usePalette';
import { getUserId } from '@/lib/user';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import SettingsSidebar from '@/components/SettingsSidebar';
import { ScrollView as RNScrollView } from 'react-native';
import { Radii, Spacing, Shadows } from '@/constants/DesignTokens';

const API_BASE_URL = 'http://127.0.0.1:5000';

// Types for the data structure
interface MaterialData {
  id: string;
  Name: string;
  Traits: string[];
  imageUrl?: string;
}

interface RecyclingProject {
  id: string;
  material_name: string;
  project_image: string;
  project_name: string;
  required_traits: string[];
  steps: string[];
}

interface ScanHistoryItem {
  material: MaterialData;
  projects: RecyclingProject[];
  scanDate?: string;
}

export default function HistoryScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const P = usePalette();
  const router = useRouter();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Fetch recycling projects for a material
  const fetchRecyclingProjects = async (materialName: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/recycling`);
      if (!response.ok) throw new Error('Failed to fetch recycling projects');
      const data = await response.json();
      
      // Filter projects that match the material name
      const filteredProjects = data.projects.filter((project: RecyclingProject) => {
        const projectMaterial = project.material_name.toLowerCase();
        const searchName = materialName.toLowerCase();
        
        // Direct match
        if (projectMaterial === searchName) return true;
        
        // Substring match
        if (projectMaterial.includes(searchName) || searchName.includes(projectMaterial)) return true;
        
        // Check for common material types
        const materialTypes = ['plastic', 'glass', 'metal', 'paper', 'cardboard', 'fabric', 'wood'];
        const projectHasType = materialTypes.some(type => projectMaterial.includes(type));
        const materialHasType = materialTypes.some(type => searchName.includes(type));
        
        if (projectHasType && materialHasType) {
          return materialTypes.some(type => 
            projectMaterial.includes(type) && searchName.includes(type)
          );
        }
        
        return false;
      });
      
      return filteredProjects.slice(0, 3); // Limit to 3 projects per material
    } catch (error) {
      console.error('Error fetching recycling projects:', error);
      return [];
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

  // Load scan history on component mount
  useEffect(() => {
    const loadScanHistory = async () => {
      try {
        setLoading(true);
        const userId = await getUserId();
        
        if (!userId) {
          setError('No user ID found');
          setLoading(false);
          return;
        }

        // Fetch user's materials
        const userMaterialsData = await fetchUserMaterials(userId);
        
        if (userMaterialsData.length > 0) {
          // Fetch details for each material and their projects
          const historyPromises = userMaterialsData.map(async (materialId: string) => {
            const materialDetails = await fetchMaterialDetails(materialId);
            if (materialDetails) {
              const projects = await fetchRecyclingProjects(materialDetails.Name);
              return {
                material: materialDetails,
                projects: projects,
                scanDate: new Date().toLocaleDateString() // You can add actual scan dates to your backend
              };
            }
            return null;
          });
          
          const historyResults = await Promise.all(historyPromises);
          const validHistory = historyResults.filter(item => item !== null);
          setScanHistory(validHistory);
        }
      } catch (error) {
        console.error('Error loading scan history:', error);
        setError('Failed to load scan history');
      } finally {
        setLoading(false);
      }
    };

    loadScanHistory();
  }, []);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: P.background }]}> 
        <ActivityIndicator size="large" color={P.icon} />
        <ThemedText style={styles.loadingText}>Loading scan history...</ThemedText>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: P.background }]}> 
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
      <RNScrollView
        style={{ flex: 1, padding: 16, backgroundColor: P.background }}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View style={[styles.headerRow, { marginTop: Spacing.lg, marginBottom: Spacing.md }]}>
          <ThemedView style={styles.titleContainer}>
            <ThemedText type="title">Scan History</ThemedText>
          </ThemedView>
          <Pressable
            style={[styles.settingsButton, { backgroundColor: P.backgroundSecondary, borderRadius: Radii.lg, padding: Spacing.xs }]}
            onPress={() => setSidebarVisible(true)}
            accessibilityLabel="Settings"
          >
            <MaterialIcons name="settings" size={24} color={P.icon} />
          </Pressable>
        </View>
        
        <ThemedText type="subtitle" style={styles.recentScansTitle}>
          Recent Scans ({scanHistory.length})
        </ThemedText>
        
        {scanHistory.length > 0 ? (
          scanHistory.map((scanItem, index) => (
            <View key={scanItem.material.id} style={[styles.scanCard, { backgroundColor: P.card, borderRadius: Radii.md, ...(Shadows.soft as any) }]}> 
              <TouchableOpacity 
                style={styles.scanCardTop}
                onPress={() => navigateToMaterialDetail(scanItem.material.id)}
                activeOpacity={0.7}
              >
                <Image
                  source={scanItem.material.imageUrl ? { uri: scanItem.material.imageUrl } : require('@/assets/images/partial-react-logo.png')}
                  style={styles.scanCardImage}
                  resizeMode="cover"
                />
                <View style={styles.scanCardInfo}>
                  <ThemedText style={styles.scanCardMaterial}>{scanItem.material.Name}</ThemedText>
                  <ThemedText style={styles.scanCardTraits}>
                    {scanItem.material.Traits.slice(0, 3).join(', ')}
                    {scanItem.material.Traits.length > 3 ? '...' : ''}
                  </ThemedText>
                  {scanItem.scanDate && (
                    <ThemedText style={styles.scanCardDate}>Scanned: {scanItem.scanDate}</ThemedText>
                  )}
                  <ThemedText style={styles.tapToViewText}>
                    Tap to view details →
                  </ThemedText>
                </View>
              </TouchableOpacity>
              <View style={styles.scanCardBottom}>
                <ThemedText style={styles.scanCardProjectsTitle}>Possible Projects:</ThemedText>
                <View style={styles.scanCardProjectsRow}>
                  {scanItem.projects.length > 0 ? (
                    scanItem.projects.map((project, projectIndex) => (
                      <TouchableOpacity 
                        key={project.id} 
                        style={styles.scanCardProject}
                        onPress={() => navigateToProjectDetail(project.id)}
                        activeOpacity={0.7}
                      >
                        <Image
                          source={project.project_image ? { uri: project.project_image } : require('@/assets/images/partial-react-logo.png')}
                          style={styles.scanCardProjectImage}
                          resizeMode="contain"
                        />
                        <ThemedText style={styles.scanCardProjectName}>{project.project_name}</ThemedText>
                        <ThemedText style={styles.scanCardProjectDifficulty}>
                          {project.steps.length <= 3 ? 'Easy' : 
                           project.steps.length <= 6 ? 'Medium' : 'Advanced'}
                        </ThemedText>
                        <ThemedText style={styles.tapToViewText}>Tap to view →</ThemedText>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <ThemedText style={styles.noProjectsText}>No projects available</ThemedText>
                  )}
                </View>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <ThemedText style={styles.emptyStateText}>No scan history found</ThemedText>
            <ThemedText style={styles.emptyStateSubtext}>Start scanning materials to see your history here!</ThemedText>
          </View>
        )}
      </RNScrollView>
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
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    marginBottom: 8,
  },
  userImage: {
    width: '100%',
    height: '100%',
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  scanCount: {
    fontSize: 14,
    color: '#666',
  },
  recentScansTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    marginTop: 0,
    color: '#222',
  },
  scanCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  scanCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  scanCardImage: {
    width: 56,
    height: 56,
    borderRadius: 10,
    marginRight: 14,
    backgroundColor: '#eee',
  },
  scanCardInfo: {
    flex: 1,
  },
  scanCardMaterial: {
    fontSize: 17,
    fontWeight: '600',
    color: '#222',
    marginBottom: 4,
  },
  scanCardTraits: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  scanCardDate: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  },
  scanCardBottom: {
    marginTop: 8,
  },
  scanCardProjectsTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
    color: '#555',
  },
  scanCardProjectsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  scanCardProject: {
    alignItems: 'center',
    marginRight: 16,
  },
  scanCardProjectImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginBottom: 4,
    backgroundColor: '#eee',
  },
  scanCardProjectName: {
    fontSize: 13,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 2,
  },
  scanCardProjectDifficulty: {
    fontSize: 11,
    color: '#888',
    textTransform: 'capitalize',
  },
  tapToViewText: {
    fontSize: 10,
    color: '#007AFF',
    marginTop: 2,
    fontWeight: '500',
  },
  noProjectsText: {
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 18,
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
});
