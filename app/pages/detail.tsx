import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, Image, TextInput, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { usePalette } from '@/hooks/usePalette';
import { Radii, Spacing, Shadows } from '@/constants/DesignTokens';
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
    material_name: string;
    project_image: string;
    project_name: string;
    required_traits: string[];
    steps: string[];
}

interface DetailPageData {
    material: MaterialData;
    recyclingProjects: RecyclingProject[];
    disposalMethods: string;
    relatedMaterials: MaterialData[];
}

export default function DetailScreen() {
    const params = useLocalSearchParams();
    const router = useRouter();
    const P = usePalette();
    const [pageData, setPageData] = useState<DetailPageData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [scanData, setScanData] = useState<any>(null);
    const [populatingProjects, setPopulatingProjects] = useState(false);
    const [generatingCustomProject, setGeneratingCustomProject] = useState(false);
    const [generateError, setGenerateError] = useState<string | null>(null);

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

    // Fetch recycling projects from the Recycling table
    const fetchRecyclingProjects = async (materialId: string, materialName?: string) => {
        try {
            const response = await fetch(`${API_BASE_URL}/recycling`);
            if (!response.ok) throw new Error('Failed to fetch recycling projects');
            const data = await response.json();
            
            // Check if data and projects array exist
            if (!data || !Array.isArray(data.projects)) {
                console.error('Invalid data structure received:', data);
                return [];
            }
            
            // Filter projects that match the material name or are related
            if (!materialId || typeof materialId !== 'string') {
                console.error('Invalid materialId:', materialId);
                return [];
            }
            
            // Use the actual material name if provided, otherwise fall back to materialId
            const searchName = (materialName || materialId).toLowerCase();
            let filteredProjects = data.projects.filter((project: RecyclingProject) => {
                // Check if project and material_name exist
                if (!project || !project.material_name || typeof project.material_name !== 'string') {
                    console.warn('Invalid project or material_name:', project);
                    return false;
                }
                
                const projectMaterial = project.material_name.toLowerCase();
                
                // 1. Exact matches (highest priority)
                if (projectMaterial === searchName) {
                    return true;
                }
                
                // 2. Direct substring matches (high priority)
                if (projectMaterial.includes(searchName) || searchName.includes(projectMaterial)) {
                    return true;
                }
                
                // 3. Specific material type matches (medium priority)
                const specificMatches = {
                    'plastic bottle': ['plastic bottles', 'bottle'],
                    'glass jar': ['glass jars', 'jar'],
                    'cardboard box': ['cardboard boxes', 'box'],
                    'tin can': ['tin cans', 'can'],
                    't-shirt': ['old t-shirts', 'shirt'],
                    'wine cork': ['wine corks', 'cork']
                };
                
                for (const [scannedType, projectTypes] of Object.entries(specificMatches)) {
                    if (searchName.includes(scannedType)) {
                        for (const projectType of projectTypes) {
                            if (projectMaterial.includes(projectType)) {
                                return true;
                            }
                        }
                    }
                }
                
                // 4. Material category matches (lower priority, more restrictive)
                const materialCategories = {
                    'plastic': ['bottle', 'container', 'bag', 'cup'],
                    'glass': ['jar', 'bottle', 'container', 'vase'],
                    'cardboard': ['box', 'paper', 'container'],
                    'metal': ['can', 'tin', 'aluminum', 'steel'],
                    'fabric': ['shirt', 'cloth', 'fabric', 'textile'],
                    'cork': ['cork', 'wine']
                };
                
                // Only match if both the scanned material and project material contain the same category
                for (const [category, keywords] of Object.entries(materialCategories)) {
                    const scannedHasCategory = searchName.includes(category) || keywords.some(keyword => searchName.includes(keyword));
                    const projectHasCategory = projectMaterial.includes(category) || keywords.some(keyword => projectMaterial.includes(keyword));
                    
                    if (scannedHasCategory && projectHasCategory) {
                        return true;
                    }
                }
                
                return false;
            });
            
            // If no projects found for this material, populate the table
            if (filteredProjects.length === 0) {
                console.log(`No recycling projects found for material: ${searchName}, populating table...`);
                setPopulatingProjects(true);
                try {
                    // Get material details to pass to populate endpoint
                    const materialDetails = pageData?.material || { Name: materialId, Traits: [] };
                    
                    const populateResponse = await fetch(`${API_BASE_URL}/recycling/populate`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            material_name: materialDetails.Name,
                            material_traits: materialDetails.Traits || [],
                            scanned_material_id: materialId
                        })
                    });
                    
                    if (populateResponse.ok) {
                        console.log('Recycling table populated successfully');
                        // Fetch projects again after populating
                        const newResponse = await fetch(`${API_BASE_URL}/recycling`);
                        if (newResponse.ok) {
                            const newData = await newResponse.json();
                            
                            // Check if newData and projects array exist
                            if (!newData || !Array.isArray(newData.projects)) {
                                console.error('Invalid data structure after populate:', newData);
                                return [];
                            }
                            
                            filteredProjects = newData.projects.filter((project: RecyclingProject) => {
                                // Check if project and material_name exist
                                if (!project || !project.material_name || typeof project.material_name !== 'string') {
                                    console.warn('Invalid project or material_name after populate:', project);
                                    return false;
                                }
                                
                                const projectMaterial = project.material_name.toLowerCase();
                                
                                // 1. Exact matches (highest priority)
                                if (projectMaterial === searchName) {
                                    return true;
                                }
                                
                                // 2. Direct substring matches (high priority)
                                if (projectMaterial.includes(searchName) || searchName.includes(projectMaterial)) {
                                    return true;
                                }
                                
                                // 3. Specific material type matches (medium priority)
                                const specificMatches = {
                                    'plastic bottle': ['plastic bottles', 'bottle'],
                                    'glass jar': ['glass jars', 'jar'],
                                    'cardboard box': ['cardboard boxes', 'box'],
                                    'tin can': ['tin cans', 'can'],
                                    't-shirt': ['old t-shirts', 'shirt'],
                                    'wine cork': ['wine corks', 'cork']
                                };
                                
                                for (const [scannedType, projectTypes] of Object.entries(specificMatches)) {
                                    if (searchName.includes(scannedType)) {
                                        for (const projectType of projectTypes) {
                                            if (projectMaterial.includes(projectType)) {
                                                return true;
                                            }
                                        }
                                    }
                                }
                                
                                // 4. Material category matches (lower priority, more restrictive)
                                const materialCategories = {
                                    'plastic': ['bottle', 'container', 'bag', 'cup'],
                                    'glass': ['jar', 'bottle', 'container', 'vase'],
                                    'cardboard': ['box', 'paper', 'container'],
                                    'metal': ['can', 'tin', 'aluminum', 'steel'],
                                    'fabric': ['shirt', 'cloth', 'fabric', 'textile'],
                                    'cork': ['cork', 'wine']
                                };
                                
                                // Only match if both the scanned material and project material contain the same category
                                for (const [category, keywords] of Object.entries(materialCategories)) {
                                    const scannedHasCategory = searchName.includes(category) || keywords.some(keyword => searchName.includes(keyword));
                                    const projectHasCategory = projectMaterial.includes(category) || keywords.some(keyword => projectMaterial.includes(keyword));
                                    
                                    if (scannedHasCategory && projectHasCategory) {
                                        return true;
                                    }
                                }
                                
                                return false;
                            });
                        }
                    }
                } catch (populateError) {
                    console.error('Error populating recycling table:', populateError);
                } finally {
                    setPopulatingProjects(false);
                }
            }
            
            return filteredProjects;
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

    // Generate a custom recycling project
    const generateCustomProject = async () => {
        if (!pageData?.material) return;
        
        setGeneratingCustomProject(true);
        setGenerateError(null);
        
        try {
            const response = await fetch(`${API_BASE_URL}/recycling/generate-custom`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    material_name: pageData.material.Name,
                    material_traits: pageData.material.Traits || [],
                    scanned_material_id: pageData.material.id
                })
            });

            if (response.ok) {
                const result = await response.json();
                console.log('Custom project generated:', result.project);
                
                // Add the new project to the existing projects
                if (result.project && pageData) {
                    setPageData({
                        ...pageData,
                        recyclingProjects: [...pageData.recyclingProjects, result.project]
                    });
                }
            } else {
                const errorData = await response.json();
                setGenerateError(errorData.error || 'Failed to generate custom project');
                console.error('Failed to generate custom project:', errorData);
            }
        } catch (error) {
            setGenerateError('Network error. Please try again.');
            console.error('Error generating custom project:', error);
        } finally {
            setGeneratingCustomProject(false);
        }
    };

    // Navigate to project detail page
    const navigateToProjectDetail = (projectId: string) => {
        router.push(`/pages/project-detail?projectId=${projectId}`);
    };

    useEffect(() => {
        const loadPageData = async () => {
            try {
                setLoading(true);
                let materialId: string;
                let material: MaterialData | null = null;
                
                // Handle both scanData (from scanning) and materialId (from navigation)
                if (params.scanData) {
                    const data = JSON.parse(params.scanData as string);
                    setScanData(data);
                    
                    if (data['Scanned Material'] && data['Scanned Material'].length > 0) {
                        material = data['Scanned Material'][0];
                        materialId = material?.id || material?.Name || '';
                        
                        if (!materialId) {
                            throw new Error('No valid material ID found');
                        }
                        
                        // Log the scan first
                        await logScan(materialId);
                    } else {
                        throw new Error('No scanned material data found');
                    }
                } else if (params.materialId) {
                    materialId = params.materialId as string;
                } else {
                    throw new Error('No material ID or scan data provided');
                }
                
                // Fetch material details first to get the material name
                const materialDetails = await fetchMaterialDetails(materialId);
                
                // Fetch remaining data in parallel
                const [projects, disposalMethods, relatedMaterials] = await Promise.all([
                    fetchRecyclingProjects(materialId, materialDetails?.Name),
                    fetchDisposalMethods(materialId),
                    fetchRelatedMaterials(materialId)
                ]);
                
                // Combine all data
                const pageData: DetailPageData = {
                    material: materialDetails || material || { id: materialId, Name: materialId, Traits: [] },
                    recyclingProjects: projects,
                    disposalMethods: disposalMethods,
                    relatedMaterials: relatedMaterials
                };
                
                setPageData(pageData);
            } catch (error) {
                console.error('Error loading page data:', error);
                setError('Failed to load material details');
            } finally {
                setLoading(false);
            }
        };
        
        loadPageData();
    }, [params.scanData, params.materialId]);

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
        <ScrollView style={[styles.container, { backgroundColor: P.background }]}>
            {/* Back Button */}
            <ThemedView style={styles.backButtonContainer}>
                <TouchableOpacity style={[styles.backButton, { borderRadius: Radii.lg, borderColor: P.border, backgroundColor: P.backgroundSecondary }]} onPress={() => router.back()}>
                    <ThemedText style={styles.backButtonText}>← Back</ThemedText>
                </TouchableOpacity>
            </ThemedView>
            
            {/* Top Division */}
            <ThemedView style={[styles.topDivision, { backgroundColor: P.card, borderRadius: Radii.md, ...(Shadows.soft as any) }]}>
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
                <ThemedText type="title" style={[styles.title, { color: P.text }]}>{pageData.material.Name}</ThemedText>
                <ThemedText style={[styles.traitsText, { color: P.text + '99' }]}>
                    {pageData.material.Traits.join(', ')}
                </ThemedText>
            </ThemedView>

            {/* Middle Division */}
            <ThemedView style={[styles.middleDivision, { backgroundColor: P.card, borderRadius: Radii.md, ...(Shadows.soft as any) }]}>
                <ThemedText type="title" style={[styles.sectionTitle, { color: P.text }]}>Recycling Projects</ThemedText>
                
                {populatingProjects ? (
                    <ThemedView style={styles.populatingContainer}>
                        <ActivityIndicator size="small" color="#007AFF" />
                        <ThemedText style={styles.populatingText}>Loading recycling projects...</ThemedText>
                    </ThemedView>
                ) : pageData.recyclingProjects.length > 0 ? (
                    pageData.recyclingProjects.map((project, index) => (
                        <TouchableOpacity 
                            key={project.id} 
                            style={[styles.projectCard, { backgroundColor: P.backgroundSecondary, borderRadius: Radii.md }]}
                            onPress={() => navigateToProjectDetail(project.id)}
                            activeOpacity={0.7}
                        >
                            <ThemedView style={styles.projectImage}>
                                {project.project_image ? (
                                    <Image 
                                        source={{ uri: project.project_image }} 
                                        style={styles.projectImageContent}
                                        resizeMode="cover"
                                    />
                                ) : (
                                    <ThemedText style={styles.placeholderText}>Project {index + 1}</ThemedText>
                                )}
                            </ThemedView>
                            <ThemedView style={styles.projectInfo}>
                                <ThemedText type="subtitle" style={[styles.projectTitle, { color: P.text }]}>{project.project_name}</ThemedText>
                                <ThemedText style={[styles.projectDescription, { color: P.text + '99' }]}>
                                    Material: {project.material_name}
                                </ThemedText>
                                <ThemedText style={[styles.projectTraitsText, { color: P.text + '99' }]}>
                                    Required: {project.required_traits.join(', ')}
                                </ThemedText>
                                <ThemedText style={[styles.stepsText, { color: P.text + '80' }]}>
                                    Steps: {project.steps.length} steps
                                </ThemedText>
                                <ThemedText style={[styles.tapToViewText, { color: P.primary }]}>
                                    Tap to view full details →
                                </ThemedText>
                            </ThemedView>
                        </TouchableOpacity>
                    ))
                ) : (
                    <ThemedText style={styles.noProjectsText}>No recycling projects available for this material.</ThemedText>
                )}

                {/* Generate New Project Section */}
                <ThemedView style={[styles.generateProjectSection, { backgroundColor: P.backgroundSecondary, borderColor: P.border, borderRadius: Radii.md }]}>
                    <ThemedText type="subtitle" style={[styles.generateProjectTitle, { color: P.text }]}>
                        Not satisfied with these projects?
                    </ThemedText>
                    <ThemedText style={[styles.generateProjectDescription, { color: P.text + '99' }]}>
                        Generate a new custom project tailored specifically for your material using AI!
                    </ThemedText>
                    {generateError && (
                        <ThemedText style={[styles.generateErrorText, { color: P.error }]}>
                            {generateError}
                        </ThemedText>
                    )}
                    <ThemedView style={styles.generateButtonContainer}>
                        {generatingCustomProject ? (
                            <ThemedView style={[styles.generateButton, { backgroundColor: P.primary, borderRadius: Radii.lg }]}>
                                <ActivityIndicator size="small" color="#fff" />
                                <ThemedText style={styles.generateButtonText}>Generating...</ThemedText>
                            </ThemedView>
                        ) : (
                            <TouchableOpacity style={[styles.generateButton, { backgroundColor: P.primary, borderRadius: Radii.lg }]} onPress={generateCustomProject}>
                                <ThemedText style={styles.generateButtonText}>Generate New Project</ThemedText>
                            </TouchableOpacity>
                        )}
                    </ThemedView>
                </ThemedView>
            </ThemedView>

            {/* Bottom Division */}
            <ThemedView style={[styles.bottomDivision, { backgroundColor: P.card, borderRadius: Radii.md, ...(Shadows.soft as any) }]}>
                <ThemedText type="title" style={[styles.sectionTitle, { color: P.text }]}>Disposal Methods</ThemedText>
                <ThemedText style={[styles.disposalText, { color: P.text }]}>
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
    backButtonContainer: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
    },
    backButton: {
        alignSelf: 'flex-start',
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    backButtonText: {
        color: '#007AFF',
        fontSize: 16,
        fontWeight: '500',
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
    projectTraitsText: {
        fontSize: 12,
        color: '#666',
        marginBottom: 3,
    },
    stepsText: {
        fontSize: 12,
        color: '#888',
        fontStyle: 'italic',
    },
    tapToViewText: {
        fontSize: 12,
        color: '#007AFF',
        marginTop: 8,
        fontWeight: '500',
    },
    noProjectsText: {
        textAlign: 'center',
        color: '#666',
        fontSize: 16,
        fontStyle: 'italic',
    },
    populatingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    populatingText: {
        marginLeft: 10,
        fontSize: 16,
        color: '#666',
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
    generateProjectSection: {
        marginTop: 20,
        padding: 20,
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    generateProjectTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
        textAlign: 'center',
    },
    generateProjectDescription: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 16,
        lineHeight: 20,
    },
    generateErrorText: {
        fontSize: 14,
        color: '#ff3b30',
        textAlign: 'center',
        marginBottom: 16,
        lineHeight: 20,
    },
    generateButtonContainer: {
        alignItems: 'center',
    },
    generateButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 200,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    generateButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
