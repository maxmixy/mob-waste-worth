import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, Image, ActivityIndicator, TouchableOpacity, Alert, View, Platform, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import LogoLoadingAnimation from '@/components/LogoLoadingAnimation';
import { getUserId } from '@/lib/user';
import { AuthGuard } from '@/components/AuthGuard';
import { questService } from '@/lib/questService';
import { notificationService } from '@/lib/notificationService';
import { useAuth } from '@/contexts/AuthContext';
import ProjectPhotoModal from '@/components/ProjectPhotoModal';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { Colors } from '@/constants/Colors';

const API_BASE_URL = 'http://127.0.0.1:5000';

// Types for the project data structure
interface RecyclingProject {
    id: string;
    material_name: string;
    project_image: string;
    project_name: string;
    required_traits: string[];
    steps: string[];
    difficulty?: string;
    estimated_time?: string;
    tools_needed?: string[];
    description?: string;
    environmental_impact?: string;
    user_id?: string;
    progress?: number;
    is_completed?: boolean;
    is_current?: boolean;
    created_at?: string;
    updated_at?: string;
    photo_url?: string;
    photo_uploaded_at?: string;
}

interface ProjectProgress {
    projectId: string;
    completedSteps: number[];
    currentStep: number;
    startedAt: string;
    lastUpdated: string;
    isCompleted: boolean;
}

function ProjectDetailScreen() {
    const params = useLocalSearchParams();
    const router = useRouter();
    const { userId } = useAuth();

    const handleBack = () => {
        router.back();
    };
    const [project, setProject] = useState<RecyclingProject | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCurrentProject, setIsCurrentProject] = useState(false);
    const [settingCurrentProject, setSettingCurrentProject] = useState(false);
    const [progress, setProgress] = useState<ProjectProgress | null>(null);
    const [updatingProgress, setUpdatingProgress] = useState(false);
    const [showCompletionCelebration, setShowCompletionCelebration] = useState(false);
    const [showPhotoModal, setShowPhotoModal] = useState(false);

    // Handle photo upload completion
    const handlePhotoUploaded = (photoUrl: string) => {
        console.log('📸 Photo uploaded successfully:', photoUrl);
        // Update the project with the new photo URL
        if (project) {
            setProject({
                ...project,
                photo_url: photoUrl,
                photo_uploaded_at: new Date().toISOString()
            });
        }
    };

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
                
                // Track quest progress for individual step completion
                if (isCompleted) {
                    console.log('📋 Tracking step completion action: Complete project step');
                    try {
                        if (userId) {
                            const results = await questService.trackRecyclingProjectAction(userId);
                            await questService.checkCompletedQuests(results);
                            console.log('✅ Step completion quest progress updated:', results);
                        }
                    } catch (questError) {
                        console.error('❌ Error tracking step completion quest:', questError);
                    }
                    
                    // Add notification for step completion
                    if (project && project.steps && project.steps[stepIndex]) {
                        const stepName = project.steps[stepIndex].title || `Step ${stepIndex + 1}`;
                        notificationService.notifyStepCompleted(project.project_name, stepName);
                    }
                }
                
                // Check if project is completed and show celebration
                if (updatedProgress.isCompleted && !progress?.isCompleted) {
                    console.log('🎉 Project completed! Showing celebration...');
                    setShowCompletionCelebration(true);
                    
                    // Add notification for project completion
                    if (project) {
                        notificationService.notifyProjectCompleted(project.project_name);
                    }
                    
                    // Track quest progress for recycling project completion
                    console.log('♻️ Tracking recycling project action: Complete project');
                    try {
                        if (userId) {
                            const results = await questService.trackRecyclingProjectAction(userId);
                            await questService.checkCompletedQuests(results);
                            console.log('✅ Recycling quest progress updated:', results);
                        }
                    } catch (questError) {
                        console.error('❌ Error tracking recycling quest:', questError);
                    }
                    
                    // Show photo submission modal after a short delay
                    setTimeout(() => {
                        setShowPhotoModal(true);
                    }, 2000);
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
                
                // Track quest progress for recycling project action
                console.log('♻️ Tracking recycling project action: Start project');
                try {
                    if (userId) {
                        const results = await questService.trackRecyclingProjectAction(userId);
                        await questService.checkCompletedQuests(results);
                        console.log('✅ Recycling quest progress updated:', results);
                    }
                } catch (questError) {
                    console.error('❌ Error tracking recycling quest:', questError);
                }
                
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
                <LogoLoadingAnimation size={120} showBackground={true} />
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
        <ThemedView style={[styles.container, { backgroundColor: Colors.background }]}>
            {/* Header */}
            <ThemedView style={styles.header}>
                <Pressable onPress={handleBack} style={styles.backButton}>
                    <MaterialIcons name="arrow-back" size={24} color={Colors.text} />
                </Pressable>
                <ThemedText type="title" style={styles.headerTitle}>
                    {project?.project_name || 'Project Details'}
                </ThemedText>
                <View style={styles.placeholder} />
            </ThemedView>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Project Image Section */}
                <ThemedView style={styles.imageSection}>
                
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
                
                {/* Project Photo Section */}
                {project.photo_url && (
                    <ThemedView style={styles.projectPhotoSection}>
                        <ThemedText type="subtitle" style={styles.projectPhotoTitle}>
                            📸 Your Completed Project
                        </ThemedText>
                        <ThemedView style={styles.projectPhotoContainer}>
                            <Image 
                                source={{ uri: project.photo_url }} 
                                style={styles.projectPhoto}
                                resizeMode="cover"
                            />
                        </ThemedView>
                        {project.photo_uploaded_at && (
                            <ThemedText style={styles.photoUploadDate}>
                                Uploaded: {new Date(project.photo_uploaded_at).toLocaleDateString()}
                            </ThemedText>
                        )}
                    </ThemedView>
                )}
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
            {/* Project Photo Submission Modal */}
            <ProjectPhotoModal
                visible={showPhotoModal}
                onClose={() => setShowPhotoModal(false)}
                onPhotoUploaded={handlePhotoUploaded}
                projectId={project?.id || ''}
                userId={userId || ''}
                projectName={project?.project_name || ''}
            />
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 20,
        backgroundColor: Platform.OS === 'web' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.7)',
        borderBottomWidth: 1,
        borderBottomColor: '#00630F',
        ...(Platform.OS === 'web' && { backdropFilter: 'blur(10px)' }),
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    placeholder: {
        width: 40,
    },
    content: {
        flex: 1,
        padding: 20,
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
        backgroundColor: Platform.OS === 'web' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.7)',
        padding: 20,
        marginBottom: 20,
        alignItems: 'center',
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        ...(Platform.OS === 'web' && { backdropFilter: 'blur(10px)' }),
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
        fontSize: 28,
        fontWeight: 'bold',
        color: '#00630F',
        textAlign: 'center',
        marginBottom: 8,
        lineHeight: 34,
    },
    materialName: {
        fontSize: 16,
        color: '#4A9B5C',
        textAlign: 'center',
        fontWeight: '600',
        marginBottom: 4,
    },
    section: {
        backgroundColor: '#FFFFFF',
        padding: 20,
        marginBottom: 20,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#00630F',
        marginBottom: 16,
        lineHeight: 24,
    },
    traitsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
    },
    traitChip: {
        backgroundColor: '#E8F5E8',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#4A9B5C',
    },
    traitText: {
        fontSize: 13,
        color: '#00630F',
        fontWeight: '600',
    },
    stepsContainer: {
        gap: 16,
        paddingBottom: 8,
    },
    stepItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 16,
        marginBottom: 16,
        minHeight: 60,
        paddingVertical: 8,
    },
    stepNumber: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#00630F',
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
        marginTop: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },
    stepNumberText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    stepContent: {
        flex: 1,
        paddingTop: 6,
        paddingRight: 8,
        paddingBottom: 6,
    },
    stepText: {
        fontSize: 16,
        color: '#2D5016',
        lineHeight: 24,
        flexWrap: 'wrap',
        flexShrink: 1,
        fontWeight: '500',
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
        backgroundColor: '#00630F',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 5,
    },
    setCurrentProjectButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
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
        backgroundColor: '#00630F',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },
    completeButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: 'bold',
    },
    undoButton: {
        backgroundColor: '#8BC34A',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },
    undoButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: 'bold',
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
        backgroundColor: '#00630F',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 5,
    },
    shareButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    dismissButton: {
        flex: 1,
        backgroundColor: '#4A9B5C',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 5,
    },
    dismissButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    projectPhotoSection: {
        marginTop: 20,
        padding: 16,
        backgroundColor: 'rgba(0, 122, 255, 0.1)',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#007AFF',
        borderStyle: 'dashed',
    },
    projectPhotoTitle: {
        textAlign: 'center',
        marginBottom: 12,
        color: '#007AFF',
        fontWeight: '600',
    },
    projectPhotoContainer: {
        alignItems: 'center',
        marginBottom: 8,
    },
    projectPhoto: {
        width: 200,
        height: 150,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#007AFF',
    },
    photoUploadDate: {
        textAlign: 'center',
        fontSize: 12,
        opacity: 0.7,
        fontStyle: 'italic',
    },
});

export default function ProjectDetailScreenWithAuth() {
    return (
        <AuthGuard>
            <ProjectDetailScreen />
        </AuthGuard>
    );
}
