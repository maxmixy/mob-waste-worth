import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, Image, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

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

    // Fetch project details from backend
    const fetchProjectDetails = async (projectId: string) => {
        try {
            const response = await fetch(`${API_BASE_URL}/recycling/${projectId}`);
            if (!response.ok) throw new Error('Failed to fetch project details');
            return await response.json();
        } catch (error) {
            console.error('Error fetching project details:', error);
            return null;
        }
    };

    useEffect(() => {
        const loadProjectData = async () => {
            if (params.projectId) {
                try {
                    setLoading(true);
                    const projectData = await fetchProjectDetails(params.projectId as string);
                    
                    if (projectData) {
                        setProject(projectData);
                    } else {
                        setError('Project not found');
                    }
                } catch (error) {
                    console.error('Error loading project data:', error);
                    setError('Failed to load project details');
                } finally {
                    setLoading(false);
                }
            } else {
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
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <ThemedText style={styles.backButtonText}>Go Back</ThemedText>
                </TouchableOpacity>
            </ThemedView>
        );
    }

    return (
        <ScrollView style={styles.container}>
            {/* Header Section */}
            <ThemedView style={styles.headerSection}>
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
    headerSection: {
        backgroundColor: '#fff',
        padding: 20,
        marginBottom: 10,
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
        padding: 20,
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#333',
        marginBottom: 16,
    },
    traitsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    traitChip: {
        backgroundColor: '#e3f2fd',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#bbdefb',
    },
    traitText: {
        fontSize: 14,
        color: '#1976d2',
        fontWeight: '500',
    },
    stepsContainer: {
        gap: 16,
    },
    stepItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    stepNumber: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
    },
    stepNumberText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    stepContent: {
        flex: 1,
        paddingTop: 4,
    },
    stepText: {
        fontSize: 16,
        color: '#333',
        lineHeight: 24,
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
});
