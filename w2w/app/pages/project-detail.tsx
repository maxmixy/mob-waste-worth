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

interface ProjectProgress {
    projectId: string;
    completedSteps: number[];
    currentStep: number;
    startedAt: string;
    lastUpdated: string;
    isCompleted: boolean;
}

export default function ProjectDetailScreen() {
    const params = useLocalSearchParams();
    const router = useRouter();
    const [project, setProject] = useState<RecyclingProject | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCurrentProject, setIsCurrentProject] = useState(false);
    const [settingCurrentProject, setSettingCurrentProject] = useState(false);
    const [progress, setProgress] = useState<ProjectProgress | null>(null);
    const [updatingProgress, setUpdatingProgress] = useState(false);
    const [showCompletionCelebration, setShowCompletionCelebration] = useState(false);

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

    // Fetch project progress
    const fetchProjectProgress = async (projectId: string) => {
        try {
            const userId = await getUserId();
            if (!userId) return;

            console.log('Fetching progress for project:', projectId);
            const response = await fetch(`${API_BASE_URL}/user/${userId}/project/${projectId}/progress`);
            if (response.ok) {
                const progressData = await response.json();
                console.log('Project progress fetched:', progressData);
                setProgress(progressData);
            } else if (response.status === 404) {
                // No progress exists yet, create initial progress
                console.log('No progress found, will create when first step is completed');
                setProgress(null);
            }
        } catch (error) {
            console.error('Error fetching project progress:', error);
        }
    };

    // Update project progress
    const updateProjectProgress = async (stepIndex: number, isCompleted: boolean) => {
        if (!project || !isCurrentProject) return;

        try {
            setUpdatingProgress(true);
            const userId = await getUserId();
            if (!userId) return;

            console.log('Updating progress for step:', stepIndex, 'completed:', isCompleted);
            
            const response = await fetch(`${API_BASE_URL}/user/${userId}/project/${project.id}/progress`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    stepIndex,
                    isCompleted,
                    timestamp: new Date().toISOString()
                })
            });

            if (response.ok) {
                const updatedProgress = await response.json();
                console.log('Progress updated successfully:', updatedProgress);
                setProgress(updatedProgress);
                
                // Check if project is completed and show celebration
                if (updatedProgress.isCompleted && !progress?.isCompleted) {
                    console.log('🎉 Project completed! Showing celebration...');
                    setShowCompletionCelebration(true);
                }
            } else {
                console.error('Failed to update progress');
            }
        } catch (error) {
            console.error('Error updating project progress:', error);
        } finally {
            setUpdatingProgress(false);
        }
    };

    // Navigate to social page with pre-filled completion post
    const shareCompletionOnSocial = () => {
        if (!project) return;
        
        const postContent = `🎉 Just completed my recycling project: "${project.project_name}"! 
        
✅ Made from: ${project.material_name}
📋 Completed all ${project.steps.length} steps
♻️ Another step towards a greener future!

#Recycling #Sustainability #WasteToWonder #EcoFriendly`;

        // Navigate to community page with pre-filled content
        router.push({
            pathname: '/(tabs)/community',
            params: {
                prefillContent: postContent,
                showPostModal: 'true'
            }
        } as any);
        
        // Hide celebration modal
        setShowCompletionCelebration(false);
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
                                console.log('Navigating back to index page');
                                // Clear navigation stack and navigate to home
                                router.dismissAll();
                                router.push('/' as any);
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

    // Fetch progress when project becomes current
    useEffect(() => {
        if (project && isCurrentProject) {
            fetchProjectProgress(project.id);
        }
    }, [project, isCurrentProject]);

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
        <>
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
                
                {/* Progress Section - Only show for current project */}
                {isCurrentProject && (
                    <ThemedView style={styles.progressSection}>
                        <ThemedText type="defaultSemiBold" style={styles.progressTitle}>
                            Progress Tracking
                        </ThemedText>
                        <ThemedText style={styles.progressNote}>
                            Complete steps in order. Marking a step complete will also complete all previous steps.
                        </ThemedText>
                        {progress && (
                            <ThemedView style={styles.progressInfo}>
                                <ThemedText style={styles.progressText}>
                                    {progress.completedSteps.length} of {project.steps.length} steps completed
                                </ThemedText>
                                <ThemedView style={styles.progressBar}>
                                    <ThemedView 
                                        style={[
                                            styles.progressFill, 
                                            { width: `${(progress.completedSteps.length / project.steps.length) * 100}%` }
                                        ]} 
                                    />
                                </ThemedView>
                            </ThemedView>
                        )}
                    </ThemedView>
                )}
                
                <ThemedView style={styles.stepsContainer}>
                    {project.steps.map((step, index) => {
                        const isCompleted = progress?.completedSteps.includes(index) || false;
                        const isCurrentStep = progress?.currentStep === index;
                        
                        return (
                            <ThemedView key={index} style={[
                                styles.stepItem,
                                isCompleted && styles.stepItemCompleted,
                                isCurrentStep && styles.stepItemCurrent
                            ]}>
                                <ThemedView style={[
                                    styles.stepNumber,
                                    isCompleted && styles.stepNumberCompleted,
                                    isCurrentStep && styles.stepNumberCurrent
                                ]}>
                                    {isCompleted ? (
                                        <ThemedText style={styles.stepNumberText}>✓</ThemedText>
                                    ) : (
                                        <ThemedText style={styles.stepNumberText}>{index + 1}</ThemedText>
                                    )}
                                </ThemedView>
                                <ThemedView style={styles.stepContent}>
                                    <ThemedText style={[
                                        styles.stepText,
                                        isCompleted && styles.stepTextCompleted
                                    ]}>
                                        {step}
                                    </ThemedText>
                                    
                                    {/* Progress Controls - Only show for current project */}
                                    {isCurrentProject && (
                                        <ThemedView style={styles.stepControls}>
                                            {!isCompleted ? (
                                                <TouchableOpacity
                                                    style={styles.completeButton}
                                                    onPress={() => updateProjectProgress(index, true)}
                                                    disabled={updatingProgress}
                                                >
                                                    <ThemedText style={styles.completeButtonText}>
                                                        {updatingProgress ? 'Updating...' : 'Mark Complete'}
                                                    </ThemedText>
                                                </TouchableOpacity>
                                            ) : (
                                                <TouchableOpacity
                                                    style={styles.undoButton}
                                                    onPress={() => updateProjectProgress(index, false)}
                                                    disabled={updatingProgress}
                                                >
                                                    <ThemedText style={styles.undoButtonText}>
                                                        {updatingProgress ? 'Updating...' : 'Undo'}
                                                    </ThemedText>
                                                </TouchableOpacity>
                                            )}
                                        </ThemedView>
                                    )}
                                </ThemedView>
                            </ThemedView>
                        );
                    })}
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

        {/* Completion Celebration Modal */}
        {showCompletionCelebration && (
            <ThemedView style={styles.celebrationOverlay}>
                <ThemedView style={styles.celebrationModal}>
                    <ThemedView style={styles.celebrationContent}>
                        <ThemedText style={styles.celebrationEmoji}>🎉</ThemedText>
                        <ThemedText style={styles.celebrationTitle}>
                            Congratulations!
                        </ThemedText>
                        <ThemedText style={styles.celebrationSubtitle}>
                            You've completed "{project?.project_name}"!
                        </ThemedText>
                        <ThemedText style={styles.celebrationDescription}>
                            Great job on finishing your recycling project! 
                            Share your achievement with the community and inspire others.
                        </ThemedText>
                        
                        <ThemedView style={styles.celebrationButtons}>
                            <TouchableOpacity 
                                style={styles.shareButton}
                                onPress={shareCompletionOnSocial}
                                activeOpacity={0.7}
                            >
                                <ThemedText style={styles.shareButtonText}>
                                    Share on Social
                                </ThemedText>
                            </TouchableOpacity>
                            
                            <TouchableOpacity 
                                style={styles.dismissButton}
                                onPress={() => setShowCompletionCelebration(false)}
                                activeOpacity={0.7}
                            >
                                <ThemedText style={styles.dismissButtonText}>
                                    Maybe Later
                                </ThemedText>
                            </TouchableOpacity>
                        </ThemedView>
                    </ThemedView>
                </ThemedView>
            </ThemedView>
        )}
        </>
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
    // Progress tracking styles
    progressSection: {
        backgroundColor: '#f8f9fa',
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    progressTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#495057',
        marginBottom: 8,
    },
    progressNote: {
        fontSize: 12,
        color: '#6c757d',
        fontStyle: 'italic',
        marginBottom: 12,
    },
    progressInfo: {
        marginBottom: 8,
    },
    progressText: {
        fontSize: 14,
        color: '#6c757d',
        marginBottom: 8,
    },
    progressBar: {
        height: 8,
        backgroundColor: '#e9ecef',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#28a745',
        borderRadius: 4,
    },
    stepItemCompleted: {
        backgroundColor: '#f8f9fa',
        borderColor: '#28a745',
    },
    stepItemCurrent: {
        backgroundColor: '#fff3cd',
        borderColor: '#ffc107',
    },
    stepNumberCompleted: {
        backgroundColor: '#28a745',
    },
    stepNumberCurrent: {
        backgroundColor: '#ffc107',
    },
    stepTextCompleted: {
        textDecorationLine: 'line-through',
        color: '#6c757d',
    },
    stepControls: {
        marginTop: 8,
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    completeButton: {
        backgroundColor: '#28a745',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 6,
    },
    completeButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
    },
    undoButton: {
        backgroundColor: '#6c757d',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 6,
    },
    undoButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
    },
    // Celebration modal styles
    celebrationOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    celebrationModal: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        margin: 20,
        maxWidth: 400,
        width: '90%',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10,
    },
    celebrationContent: {
        alignItems: 'center',
    },
    celebrationEmoji: {
        fontSize: 48,
        marginBottom: 16,
    },
    celebrationTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#28a745',
        marginBottom: 8,
        textAlign: 'center',
    },
    celebrationSubtitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
        textAlign: 'center',
    },
    celebrationDescription: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    celebrationButtons: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    shareButton: {
        flex: 1,
        backgroundColor: '#28a745',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        alignItems: 'center',
    },
    shareButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    dismissButton: {
        flex: 1,
        backgroundColor: '#6c757d',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        alignItems: 'center',
    },
    dismissButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
