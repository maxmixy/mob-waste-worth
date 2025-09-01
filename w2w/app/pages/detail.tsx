import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, Image, TextInput, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { getUserId } from '@/lib/user';

const LOG_URL = 'http://127.0.0.1:5000/log';
const API_BASE_URL = 'http://127.0.0.1:5000';

// Types for the data structure
interface MaterialData {
    id: string;
    Name: string;
    Traits: string[];
    imageUrl?: string;
    disposalMethods?: string;
}

interface RecyclingProject {
    id: string;
    title: string;
    description: string;
    imageUrl?: string;
    difficulty: 'easy' | 'medium' | 'hard';
    materialsNeeded: string[];
    instructions?: string[];
}

interface DetailPageData {
    material: MaterialData;
    recyclingProjects: RecyclingProject[];
    disposalMethods: string;
    relatedMaterials: MaterialData[];
}

export default function DetailScreen() {
    const params = useLocalSearchParams();
    const [pageData, setPageData] = useState<DetailPageData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [scanData, setScanData] = useState<any>(null);

    // Fetch material details and related data from backend
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

    // Fetch recycling projects for the material
    const fetchRecyclingProjects = async (materialId: string) => {
        try {
            const response = await fetch(`${API_BASE_URL}/projects/${materialId}`);
            if (!response.ok) throw new Error('Failed to fetch recycling projects');
            return await response.json();
        } catch (error) {
            console.error('Error fetching recycling projects:', error);
            return [];
        }
    };

    // Fetch disposal methods for the material
    const fetchDisposalMethods = async (materialId: string) => {
        try {
            const response = await fetch(`${API_BASE_URL}/disposal/${materialId}`);
            if (!response.ok) throw new Error('Failed to fetch disposal methods');
            const data = await response.json();
            // Handle both string and object responses
            return typeof data === 'string' ? data : data.methods || '';
        } catch (error) {
            console.error('Error fetching disposal methods:', error);
            return '';
        }
    };

    // Fetch related materials
    const fetchRelatedMaterials = async (materialId: string) => {
        try {
            const response = await fetch(`${API_BASE_URL}/related/${materialId}`);
            if (!response.ok) throw new Error('Failed to fetch related materials');
            return await response.json();
        } catch (error) {
            console.error('Error fetching related materials:', error);
            return [];
        }
    };

    // Log scan to backend
    const logScan = async (materialId: string) => {
        try {
            const userId = await getUserId();
            if (!userId) {
                console.error('No user ID found');
                return;
            }
            
            const logData = {
                userId: userId,
                materialId: materialId
            };
            
            console.log('Sending log data:', logData);
            
            const response = await fetch(LOG_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(logData)
            });
            
            if (response.ok) {
                console.log('Scan logged successfully');
            } else {
                console.error('Failed to log scan:', response.status);
            }
        } catch (error) {
            console.error('Error logging scan:', error);
        }
    };

    useEffect(() => {
        const loadPageData = async () => {
            if (params.scanData) {
                try {
                    setLoading(true);
                    const data = JSON.parse(params.scanData as string);
                    setScanData(data);
                    
                    if (data['Scanned Material'] && data['Scanned Material'].length > 0) {
                        const material = data['Scanned Material'][0];
                        const materialId = material.id || material.Name;
                        
                        // Log the scan first
                        await logScan(materialId);
                        
                        // Fetch all page data in parallel
                        const [materialDetails, projects, disposalMethods, relatedMaterials] = await Promise.all([
                            fetchMaterialDetails(materialId),
                            fetchRecyclingProjects(materialId),
                            fetchDisposalMethods(materialId),
                            fetchRelatedMaterials(materialId)
                        ]);
                        
                        // Combine all data
                        const pageData: DetailPageData = {
                            material: materialDetails || material,
                            recyclingProjects: projects,
                            disposalMethods: disposalMethods,
                            relatedMaterials: relatedMaterials
                        };
                        
                        setPageData(pageData);
                    }
                } catch (error) {
                    console.error('Error loading page data:', error);
                    setError('Failed to load material details');
                } finally {
                    setLoading(false);
                }
            }
        };
        
        loadPageData();
    }, [params.scanData]);

    if (loading) {
        return (
            <ThemedView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <ThemedText style={styles.loadingText}>Loading material details...</ThemedText>
            </ThemedView>
        );
    }

    if (error) {
        return (
            <ThemedView style={styles.errorContainer}>
                <ThemedText style={styles.errorText}>{error}</ThemedText>
            </ThemedView>
        );
    }

    if (!pageData) {
        return (
            <ThemedView style={styles.errorContainer}>
                <ThemedText style={styles.errorText}>No material data available</ThemedText>
            </ThemedView>
        );
    }

    return (
        <ScrollView style={styles.container}>
            {/* Top Division */}
            <ThemedView style={styles.topDivision}>
                <ThemedView style={styles.imageBox}>
                    {pageData.material.imageUrl ? (
                        <Image 
                            source={{ uri: pageData.material.imageUrl }} 
                            style={styles.materialImage}
                            resizeMode="cover"
                        />
                    ) : (
                        <ThemedText style={styles.placeholderText}>Material Image</ThemedText>
                    )}
                </ThemedView>
                <ThemedText type="title" style={styles.title}>{pageData.material.Name}</ThemedText>
                <ThemedText style={styles.traitsText}>
                    {pageData.material.Traits.join(', ')}
                </ThemedText>
            </ThemedView>

            {/* Middle Division */}
            <ThemedView style={styles.middleDivision}>
                <ThemedText type="title" style={styles.sectionTitle}>Recycling Projects</ThemedText>
                
                {pageData.recyclingProjects.length > 0 ? (
                    pageData.recyclingProjects.map((project, index) => (
                        <ThemedView key={project.id} style={styles.projectCard}>
                            <ThemedView style={styles.projectImage}>
                                {project.imageUrl ? (
                                    <Image 
                                        source={{ uri: project.imageUrl }} 
                                        style={styles.projectImageContent}
                                        resizeMode="cover"
                                    />
                                ) : (
                                    <ThemedText style={styles.placeholderText}>Project {index + 1}</ThemedText>
                                )}
                            </ThemedView>
                            <ThemedView style={styles.projectInfo}>
                                <ThemedText type="subtitle" style={styles.projectTitle}>{project.title}</ThemedText>
                                <ThemedText style={styles.projectDescription}>
                                    {project.description}
                                </ThemedText>
                                <ThemedText style={styles.difficultyText}>
                                    Difficulty: {project.difficulty}
                                </ThemedText>
                            </ThemedView>
                        </ThemedView>
                    ))
                ) : (
                    <ThemedText style={styles.noProjectsText}>No recycling projects available for this material.</ThemedText>
                )}
            </ThemedView>

            {/* Bottom Division */}
            <ThemedView style={styles.bottomDivision}>
                <ThemedText type="title" style={styles.sectionTitle}>Disposal Methods</ThemedText>
                <ThemedText style={styles.disposalText}>
                    {pageData.disposalMethods || 'No disposal methods available for this material.'}
                </ThemedText>
            </ThemedView>
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
    },
    topDivision: {
        padding: 20,
        backgroundColor: '#fff',
        marginBottom: 10,
        alignItems: 'center',
    },
    imageBox: {
        width: 200,
        height: 200,
        backgroundColor: '#e0e0e0',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
        overflow: 'hidden',
    },
    materialImage: {
        width: '100%',
        height: '100%',
    },
    placeholderText: {
        color: '#666',
        fontSize: 14,
    },
    title: {
        marginBottom: 15,
        textAlign: 'center',
    },
    traitsText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: 20,
    },
    middleDivision: {
        padding: 20,
        backgroundColor: '#fff',
        marginBottom: 10,
    },
    sectionTitle: {
        marginBottom: 20,
        textAlign: 'center',
    },
    projectCard: {
        flexDirection: 'row',
        backgroundColor: '#f8f8f8',
        borderRadius: 12,
        padding: 15,
        marginBottom: 15,
        alignItems: 'center',
    },
    projectImage: {
        width: 80,
        height: 80,
        backgroundColor: '#e0e0e0',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
        overflow: 'hidden',
    },
    projectImageContent: {
        width: '100%',
        height: '100%',
    },
    projectInfo: {
        flex: 1,
    },
    projectTitle: {
        marginBottom: 5,
        fontWeight: 'bold',
    },
    projectDescription: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
        marginBottom: 5,
    },
    difficultyText: {
        fontSize: 12,
        color: '#888',
        fontStyle: 'italic',
    },
    noProjectsText: {
        textAlign: 'center',
        color: '#666',
        fontSize: 16,
        fontStyle: 'italic',
    },
    bottomDivision: {
        padding: 20,
        backgroundColor: '#fff',
        marginBottom: 20,
    },
    disposalText: {
        fontSize: 16,
        color: '#333',
        lineHeight: 24,
        textAlign: 'justify',
    },
});
