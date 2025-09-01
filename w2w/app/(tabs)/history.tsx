import { Image } from 'expo-image';
import { Platform, StyleSheet, View, Pressable, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';

import { HelloWave } from '@/components/HelloWave';
import { ScrollView as RNScrollView } from 'react-native';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { Colors } from '@/constants/Colors';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getUserId } from '@/lib/user';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const API_BASE_URL = 'http://127.0.0.1:5000';

// Types for the data structure
interface MaterialData {
  id: string;
  Name: string;
  Traits: string[];
  imageUrl?: string;
}

interface ProjectData {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  difficulty: string;
  materialsNeeded: string[];
}

interface ScanHistoryItem {
  material: MaterialData;
  projects: ProjectData[];
  scanDate?: string;
}

export default function HistoryScreen() {
  const colorScheme = useColorScheme() ?? 'light';
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
              const projects = await fetchMaterialProjects(materialId);
              return {
                material: materialDetails,
                projects: projects.slice(0, 2), // Limit to 2 projects per material
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
      <View style={[styles.loadingContainer, { backgroundColor: Colors[colorScheme].background }]}>
        <ActivityIndicator size="large" color={Colors[colorScheme].icon} />
        <ThemedText style={styles.loadingText}>Loading scan history...</ThemedText>
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
      <RNScrollView
        style={{ flex: 1, padding: 16, backgroundColor: Colors[colorScheme].background }}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View style={styles.headerRow}>
          <ThemedView style={styles.titleContainer}>
            <ThemedText type="title">Scan History</ThemedText>
          </ThemedView>
          <Pressable
            style={styles.settingsButton}
            onPress={() => setSidebarVisible(true)}
            accessibilityLabel="Settings"
          >
            <MaterialIcons name="settings" size={24} color={Colors[colorScheme].icon} />
          </Pressable>
        </View>
        
        <ThemedText type="subtitle" style={styles.recentScansTitle}>
          Recent Scans ({scanHistory.length})
        </ThemedText>
        
        {scanHistory.length > 0 ? (
          scanHistory.map((scanItem, index) => (
            <View key={scanItem.material.id} style={styles.scanCard}>
              <View style={styles.scanCardTop}>
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
                </View>
              </View>
              <View style={styles.scanCardBottom}>
                <ThemedText style={styles.scanCardProjectsTitle}>Possible Projects:</ThemedText>
                <View style={styles.scanCardProjectsRow}>
                  {scanItem.projects.length > 0 ? (
                    scanItem.projects.map((project, projectIndex) => (
                      <View key={project.id} style={styles.scanCardProject}>
                        <Image
                          source={project.imageUrl ? { uri: project.imageUrl } : require('@/assets/images/partial-react-logo.png')}
                          style={styles.scanCardProjectImage}
                          resizeMode="contain"
                        />
                        <ThemedText style={styles.scanCardProjectName}>{project.title}</ThemedText>
                        <ThemedText style={styles.scanCardProjectDifficulty}>
                          {project.difficulty}
                        </ThemedText>
                      </View>
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
            <ThemedText style={styles.userName}>User</ThemedText>
            <ThemedText style={styles.scanCount}>
              {scanHistory.length} materials scanned
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
