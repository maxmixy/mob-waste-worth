import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, Image, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { getUserId } from '@/lib/user';

const API_BASE_URL = 'http://127.0.0.1:5000';

// Types for the project data structure
interface RecyclingProject {
    id: string;
    material_name: string;
    project_image: string;
    project_name: string;
    required_traits: string[];
    steps: string[];
}

export default function ProjectDetailScreen() {
    const params = useLocalSearchParams();
    const router = useRouter();
    const [project, setProject] = useState<RecyclingProject | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCurrentProject, setIsCurrentProject] = useState(false);
    const [settingCurrentProject, setSettingCurrentProject] = useState(false);

    // Fetch project details from backend
    const fetchProjectDetails = async (projectId: string) => {
        try {
            console.log('Fetching project details for ID:', projectId);
            const response = await fetch(`${API_BASE_URL}/recycling/${projectId}`);
            if (!response.ok) throw new Error('Failed to fetch project details');
            const projectData = await response.json();
            console.log('Project details fetched successfully:', projectData);
            return projectData;
        } catch (error) {
            console.error('Error fetching project details:', error);
            return null;
        }
    };

    // Check if this project is the user's current project
    const checkCurrentProject = async (projectId: string) => {
        try {
            const userId = await getUserId();
            if (!userId) {
                console.log('No user ID found for current project check');
                return;
            }
            
            console.log('Checking if project is current project for user:', userId, 'project:', projectId);
            const response = await fetch(`${API_BASE_URL}/user/${userId}/current-project`);
            if (response.ok) {
                const data = await response.json();
                const isCurrent = data.current_project?.id === projectId;
                console.log('Current project check result:', { 
                    currentProject: data.current_project, 
                    isCurrent, 
                    projectId 
                });
                setIsCurrentProject(isCurrent);
            }
        } catch (error) {
            console.error('Error checking current project:', error);
        }
    };

    // Set this project as the user's current project
    const setAsCurrentProject = async () => {
        if (!project) {
            console.log('No project data available for setting as current project');
            return;
        }
        
        try {
            console.log('Setting project as current project:', project.id, project.project_name);
            setSettingCurrentProject(true);
            const userId = await getUserId();
            
            if (!userId) {
                console.log('No user ID found for setting current project');
                Alert.alert('Error', 'User not found. Please log in again.');
                return;
            }
            
            console.log('Sending request to set current project:', { userId, projectId: project.id });
            const response = await fetch(`${API_BASE_URL}/user/${userId}/current-project`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    project_id: project.id
                })
            });
            
            if (response.ok) {
                console.log('Successfully set project as current project');
                setIsCurrentProject(true);
                Alert.alert(
                    'Success', 
                    'Project set as your current project!',
                    [
                        {
                            text: 'OK',
                            onPress: () => {
                                console.log('Navigating back to index page with refresh');
                                // Navigate back to index page with refresh parameter
                                router.push('/(tabs)/' as any);
                                // Use setTimeout to ensure navigation completes before setting refresh
                                setTimeout(() => {
                                    router.setParams({ refresh: 'true' });
                                }, 100);
                            }
                        }
                    ]
                );
            } else {
                const errorData = await response.json();
                console.log('Failed to set current project:', errorData);
                Alert.alert('Error', errorData.error || 'Failed to set current project');
            }
        } catch (error) {
            console.error('Error setting current project:', error);
            Alert.alert('Error', 'Network error. Please try again.');
        } finally {
            setSettingCurrentProject(false);
        }
    };

    useEffect(() => {
        const loadProjectData = async () => {
            console.log('Project detail page loaded with params:', params);
            if (params.projectId) {
                try {
                    setLoading(true);
                    const projectData = await fetchProjectDetails(params.projectId as string);
                    
                    if (projectData) {
                        console.log('Setting project data in state:', projectData);
                        setProject(projectData);
                        // Check if this is the user's current project
                        await checkCurrentProject(projectData.id);
                    } else {
                        console.log('No project data found for ID:', params.projectId);
                        setError('Project not found');
                    }
                } catch (error) {
                    console.error('Error loading project data:', error);
                    setError('Failed to load project details');
                } finally {
                    setLoading(false);
                }
            } else {
                console.log('No project ID provided in params');
                setError('No project ID provided');
                setLoading(false);
            }
        };

        loadProjectData();
    }, [params.projectId]);

    if (loading) {
        return (
            <ThemedView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <ThemedText style={styles.loadingText}>Loading project details...</ThemedText>
            </ThemedView>
        );
    }

    if (error || !project) {
        return (
            <ThemedView style={styles.errorContainer}>
                <ThemedText style={styles.errorText}>
                    {error || 'Project not found'}
                </ThemedText>
            </ThemedView>
        );
    }

    return (
        <ScrollView style={styles.container}>
            {/* Project Image Section */}
            <ThemedView style={styles.imageSection}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <ThemedText style={styles.backButtonText}>← Back</ThemedText>
                </TouchableOpacity>
                
                <ThemedView style={styles.projectImageContainer}>
                    {project.project_image ? (
                        <Image 
                            source={{ uri: project.project_image }} 
                            style={styles.projectImage}
                            resizeMode="cover"
                        />
                    ) : (
                        <ThemedView style={styles.placeholderImage}>
                            <ThemedText style={styles.placeholderText}>Project Image</ThemedText>
                        </ThemedView>
                    )}
                </ThemedView>
                
                <ThemedText type="title" style={styles.projectTitle}>
                    {project.project_name}
                </ThemedText>
                
                <ThemedText style={styles.materialName}>
                    Material: {project.material_name}
                </ThemedText>
            </ThemedView>

            {/* Required Traits Section */}
            <ThemedView style={styles.section}>
                <ThemedText type="subtitle" style={styles.sectionTitle}>
                    Required Traits
                </ThemedText>
                <ThemedView style={styles.traitsContainer}>
                    {project.required_traits.map((trait, index) => (
                        <ThemedView key={index} style={styles.traitChip}>
                            <ThemedText style={styles.traitText}>{trait}</ThemedText>
                        </ThemedView>
                    ))}
                </ThemedView>
            </ThemedView>

            {/* Steps Section */}
            <ThemedView style={styles.section}>
                <ThemedText type="subtitle" style={styles.sectionTitle}>
                    Instructions ({project.steps.length} steps)
                </ThemedText>
                <ThemedView style={styles.stepsContainer}>
                    {project.steps.map((step, index) => (
                        <ThemedView key={index} style={styles.stepItem}>
                            <ThemedView style={styles.stepNumber}>
                                <ThemedText style={styles.stepNumberText}>{index + 1}</ThemedText>
                            </ThemedView>
                            <ThemedView style={styles.stepContent}>
                                <ThemedText style={styles.stepText}>{step}</ThemedText>
                            </ThemedView>
                        </ThemedView>
                    ))}
                </ThemedView>
            </ThemedView>

            {/* Project Info Section */}
            <ThemedView style={styles.section}>
                <ThemedText type="subtitle" style={styles.sectionTitle}>
                    Project Information
                </ThemedText>
                <ThemedView style={styles.infoContainer}>
                    <ThemedView style={styles.infoRow}>
                        <ThemedText style={styles.infoLabel}>Project Name:</ThemedText>
                        <ThemedText style={styles.infoValue}>{project.project_name}</ThemedText>
                    </ThemedView>
                    <ThemedView style={styles.infoRow}>
                        <ThemedText style={styles.infoLabel}>Material:</ThemedText>
                        <ThemedText style={styles.infoValue}>{project.material_name}</ThemedText>
                    </ThemedView>
                    <ThemedView style={styles.infoRow}>
                        <ThemedText style={styles.infoLabel}>Difficulty:</ThemedText>
                        <ThemedText style={styles.infoValue}>
                            {project.steps.length <= 3 ? 'Easy' : 
                             project.steps.length <= 6 ? 'Medium' : 'Advanced'}
                        </ThemedText>
                    </ThemedView>
                    <ThemedView style={styles.infoRow}>
                        <ThemedText style={styles.infoLabel}>Estimated Time:</ThemedText>
                        <ThemedText style={styles.infoValue}>
                            {project.steps.length <= 3 ? '15-30 minutes' : 
                             project.steps.length <= 6 ? '30-60 minutes' : '1-2 hours'}
                        </ThemedText>
                    </ThemedView>
                </ThemedView>
            </ThemedView>

            {/* Set as Current Project Button */}
            <ThemedView style={styles.section}>
                {isCurrentProject ? (
                    <ThemedView style={styles.currentProjectIndicator}>
                        <ThemedText style={styles.currentProjectText}>
                            ✓ This is your current project
                        </ThemedText>
                    </ThemedView>
                ) : (
                    <TouchableOpacity 
                        style={styles.setCurrentProjectButton}
                        onPress={setAsCurrentProject}
                        disabled={settingCurrentProject}
                        activeOpacity={0.7}
                    >
                        {settingCurrentProject ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <ThemedText style={styles.setCurrentProjectButtonText}>
                                Set as Current Project
                            </ThemedText>
                        )}
                    </TouchableOpacity>
                )}
            </ThemedView>

            {/* Bottom Spacing */}
            <ThemedView style={styles.bottomSpacing} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
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
        backgroundColor: '#f5f5f5',
        padding: 20,
    },
    errorText: {
        fontSize: 16,
        color: '#ff3b30',
        textAlign: 'center',
        marginBottom: 20,
    },
    imageSection: {
        backgroundColor: '#fff',
        padding: 16,
        marginBottom: 8,
        alignItems: 'center',
    },
    backButton: {
        alignSelf: 'flex-start',
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
        marginBottom: 20,
    },
    backButtonText: {
        color: '#007AFF',
        fontSize: 16,
        fontWeight: '500',
    },
    projectImageContainer: {
        width: 250,
        height: 250,
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 8,
    },
    projectImage: {
        width: '100%',
        height: '100%',
    },
    placeholderImage: {
        width: '100%',
        height: '100%',
        backgroundColor: '#e0e0e0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        fontSize: 16,
        color: '#666',
    },
    projectTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
        marginBottom: 8,
    },
    materialName: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
    },
    section: {
        backgroundColor: '#fff',
        padding: 16,
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
    },
    traitsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 8,
    },
    traitChip: {
        backgroundColor: '#e3f2fd',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#bbdefb',
    },
    traitText: {
        fontSize: 12,
        color: '#1976d2',
        fontWeight: '500',
    },
    stepsContainer: {
        gap: 16,
        paddingBottom: 8,
    },
    stepItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        marginBottom: 12,
        minHeight: 50,
    },
    stepNumber: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
        marginTop: 2,
    },
    stepNumberText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    stepContent: {
        flex: 1,
        paddingTop: 4,
        paddingRight: 12,
        paddingBottom: 4,
    },
    stepText: {
        fontSize: 15,
        color: '#333',
        lineHeight: 22,
        flexWrap: 'wrap',
        flexShrink: 1,
    },
    infoContainer: {
        gap: 12,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    infoLabel: {
        fontSize: 16,
        color: '#666',
        fontWeight: '500',
    },
    infoValue: {
        fontSize: 16,
        color: '#333',
        fontWeight: '600',
        textAlign: 'right',
        flex: 1,
        marginLeft: 16,
    },
    bottomSpacing: {
        height: 20,
    },
    setCurrentProjectButton: {
        backgroundColor: '#28a745',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    setCurrentProjectButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    currentProjectIndicator: {
        backgroundColor: '#e8f5e8',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#28a745',
    },
    currentProjectText: {
        color: '#28a745',
        fontSize: 16,
        fontWeight: '600',
    },
});
