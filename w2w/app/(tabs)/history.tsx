import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, TouchableOpacity, Platform, Modal } from 'react-native';
import { useRouter } from 'expo-router';

import LogoLoadingAnimation from '@/components/LogoLoadingAnimation';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { getUserId } from '@/lib/user';
import { questService } from '@/lib/questService';
import { useAuth } from '@/contexts/AuthContext';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import SettingsSidebar from '@/components/SettingsSidebar';
import { ScrollView as RNScrollView } from 'react-native';

const API_BASE_URL = 'http://127.0.0.1:5000';

// Types for the data structure
interface MaterialData {
  id: string;
  Name: string;
  Traits: string[];
  ImageUrl?: string;
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
  const router = useRouter();
  const { userId } = useAuth();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [deletingItemName, setDeletingItemName] = useState<string | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

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

  // Show delete confirmation modal
  const handleDeleteItem = (materialId: string, materialName: string) => {
    setDeletingItemId(materialId);
    setDeletingItemName(materialName);
    setShowDeleteModal(true);
  };

  // Cancel delete function
  const cancelDelete = () => {
    setShowDeleteModal(false);
    setDeletingItemId(null);
    setDeletingItemName(null);
  };

  // Confirm delete function
  const confirmDelete = async () => {
    if (!deletingItemId || !userId) {
      return;
    }

    try {
      setIsProcessingAction(true);
      
      // Call backend API to delete the material from user's history
      const response = await fetch(`${API_BASE_URL}/user/${userId}/materials/${deletingItemId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete scan item');
      }

      // Remove the item from local state
      setScanHistory(prevHistory => 
        prevHistory.filter(item => item.material.id !== deletingItemId)
      );

      console.log('Scan item deleted successfully');
    } catch (error) {
      console.error('Error deleting scan item:', error);
      setError('Failed to delete scan item');
    } finally {
      setIsProcessingAction(false);
      setShowDeleteModal(false);
      setDeletingItemId(null);
      setDeletingItemName(null);
    }
  };

  // Load scan history function
  const loadScanHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!userId) {
        setError('No user ID found');
        setLoading(false);
        return;
      }

      // Fetch user's materials
      const userMaterialsData = await fetchUserMaterials(userId);
      
      if (userMaterialsData.length > 0) {
        // Ensure most recent scans appear on top by reversing incoming order
        const materialsOrdered = [...userMaterialsData].reverse();

        // Fetch details for each material and their projects in display order
        const historyPromises = materialsOrdered.map(async (materialId: string) => {
          const materialDetails = await fetchMaterialDetails(materialId);
          if (materialDetails) {
            const projects = await fetchRecyclingProjects(materialDetails.Name);
            return {
              material: materialDetails,
              projects: projects,
              scanDate: new Date().toLocaleString()
            };
          }
          return null;
        });
        
        const historyResults = await Promise.all(historyPromises);
        const validHistory = historyResults.filter(item => item !== null) as ScanHistoryItem[];
        setScanHistory(validHistory);
      } else {
        setScanHistory([]);
      }
    } catch (error) {
      console.error('Error loading scan history:', error);
      setError('Failed to load scan history');
    } finally {
      setLoading(false);
    }
  };

  // Load scan history on component mount
  useEffect(() => {
    loadScanHistory();
  }, [userId]);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: Colors.background }]}>
        <LogoLoadingAnimation size={120} showBackground={true} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: Colors.background }]}>
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
        style={{ flex: 1, backgroundColor: Colors.background }}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <ThemedView style={styles.titleContainer}>
            <ThemedText type="title">History</ThemedText>
          </ThemedView>
          <View style={styles.headerButtons}>
            <Pressable
              style={styles.refreshButton}
              onPress={loadScanHistory}
              disabled={loading}
              accessibilityLabel="Refresh"
            >
              {loading ? (
                <ActivityIndicator size="small" color={Colors.icon} />
              ) : (
                <MaterialIcons name="refresh" size={24} color={Colors.icon} />
              )}
            </Pressable>
            <Pressable
              style={styles.settingsButton}
              onPress={() => setSidebarVisible(true)}
              accessibilityLabel="Settings"
            >
              <MaterialIcons name="settings" size={24} color={Colors.icon} />
            </Pressable>
          </View>
        </View>
        
        <View style={styles.sectionsContainer}>
          {/* Materials Section */}
          <ThemedView style={[styles.section, { borderTopLeftRadius: 12, borderTopRightRadius: 12 }]}>
            <View style={styles.materialsHeader}>
              <ThemedText type="subtitle">Recent Scans ({scanHistory.length})</ThemedText>
            </View>
            
            {scanHistory.length > 0 ? (
              scanHistory.map((scanItem, index) => (
                <View key={scanItem.material.id} style={styles.scanCard}>
              <View style={styles.scanCardTop}>
                <TouchableOpacity 
                  style={styles.scanCardMainContent}
                  onPress={() => navigateToMaterialDetail(scanItem.material.id)}
                  activeOpacity={0.7}
                >
                  <Image
                    source={scanItem.material.ImageUrl ? { uri: scanItem.material.ImageUrl } : require('@/assets/images/partial-react-logo.png')}
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
                    <View style={styles.tapToViewContainer}>
                      <ThemedText style={styles.tapToViewText}>
                        Tap to view details
                      </ThemedText>
                      <MaterialIcons name="chevron-right" size={16} color="#8BC34A" />
                    </View>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.deleteIconButton}
                  onPress={() => handleDeleteItem(scanItem.material.id, scanItem.material.Name)}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="delete" size={20} color="#e53935" />
                </TouchableOpacity>
              </View>
              <View style={styles.scanCardDivider} />
              <View style={styles.scanCardBottom}>
                <ThemedText style={styles.scanCardProjectsTitle}>Possible Projects:</ThemedText>
                <View style={styles.scanCardProjectsColumn}>
                  {scanItem.projects.length > 0 ? (
                    scanItem.projects.map((project, projectIndex) => (
                      <TouchableOpacity 
                        key={project.id} 
                        style={styles.scanCardProject}
                        onPress={() => navigateToProjectDetail(project.id)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.scanCardProjectContent}>
                          <Image
                            source={project.project_image ? { uri: project.project_image } : require('@/assets/images/partial-react-logo.png')}
                            style={styles.scanCardProjectImage}
                            resizeMode="contain"
                          />
                          <View style={styles.scanCardProjectInfo}>
                            <ThemedText style={styles.scanCardProjectName}>{project.project_name}</ThemedText>
                            <ThemedText style={styles.scanCardProjectDifficulty}>
                              {project.steps.length <= 3 ? 'Easy' : 
                               project.steps.length <= 6 ? 'Medium' : 'Advanced'}
                            </ThemedText>
                          </View>
                          <View style={styles.tapToViewContainer}>
                            <ThemedText style={styles.tapToViewText}>Tap to view</ThemedText>
                            <MaterialIcons name="chevron-right" size={16} color="#8BC34A" />
                          </View>
                        </View>
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
          </ThemedView>
        </View>
      </RNScrollView>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelDelete}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModalContainer}>
            <View style={styles.deleteModalHeader}>
              <MaterialIcons name="warning" size={24} color="#e74c3c" />
              <ThemedText type="subtitle" style={styles.deleteModalTitle}>
                Delete Scan Item
              </ThemedText>
            </View>
            
            <ThemedText style={styles.deleteModalMessage}>
              Are you sure you want to delete "{deletingItemName}" from your scan history? This action cannot be undone.
            </ThemedText>
            
            <View style={styles.deleteModalActions}>
              <TouchableOpacity
                onPress={cancelDelete}
                style={[styles.deleteModalButton, styles.cancelButton]}
                disabled={isProcessingAction}
              >
                <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={confirmDelete}
                style={[styles.deleteModalButton, styles.deleteButton]}
                disabled={isProcessingAction}
              >
                {isProcessingAction ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <ThemedText style={styles.deleteButtonText}>Delete</ThemedText>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: Platform.OS === 'web' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.7)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    ...(Platform.OS === 'web' && { backdropFilter: 'blur(10px)' }),
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
    backgroundColor: Platform.OS === 'web' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: 160,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#00630F',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardImage: {
    width: 80,
    height: 80,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    marginBottom: 4,
    color: '#2D5016',
    fontWeight: '600',
  },
  cardDescription: {
    fontSize: 14,
    textAlign: 'center',
    color: '#4A6741',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
  },
  titleContainer: {
    flex: 1,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshButton: {
    padding: 8,
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
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    borderWidth: 2,
    borderColor: '#D0D0D0',
  },
  scanCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  scanCardMainContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  deleteIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  scanCardDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 12,
    marginHorizontal: 0,
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
  scanCardProjectsColumn: {
    flexDirection: 'column',
    gap: 12,
  },
  scanCardProject: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FAFAFA',
    marginBottom: 8,
  },
  scanCardProjectContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scanCardProjectInfo: {
    flex: 1,
  },
  scanCardProjectImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  scanCardProjectName: {
    fontSize: 15,
    color: '#333',
    fontWeight: '600',
    marginBottom: 4,
  },
  scanCardProjectDifficulty: {
    fontSize: 12,
    color: '#888',
    textTransform: 'capitalize',
  },
  tapToViewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(139, 195, 74, 0.1)',
    borderRadius: 12,
    gap: 4,
  },
  tapToViewText: {
    fontSize: 12,
    color: '#8BC34A',
    fontWeight: '600',
  },
  materialsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
  // Delete Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  deleteModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  deleteModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  deleteModalTitle: {
    marginLeft: 12,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  deleteModalMessage: {
    fontSize: 16,
    lineHeight: 24,
    color: '#666',
    marginBottom: 24,
  },
  deleteModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  deleteModalButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});
