import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, Image, TextInput, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { getUserId } from '@/lib/user';

const LOG_URL = 'http://127.0.0.1:5000/log';
const API_BASE_URL = 'http://127.0.0.1:5000';

// Types for the data structure
interface ImageOption {
    url: string;
    thumb: string;
    alt_description: string;
    description: string;
    photographer: string;
    photographer_url: string;
    unsplash_url: string;
}

interface MaterialData {
    id: string;
    Name: string;
    Traits: string[];
    imageUrl?: string;
    disposalMethods?: string;
    ImageOptions?: ImageOption[];
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
    const [pageData, setPageData] = useState<DetailPageData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [scanData, setScanData] = useState<any>(null);
    const [populatingProjects, setPopulatingProjects] = useState(false);
    const [generatingCustomProject, setGeneratingCustomProject] = useState(false);
    const [generateError, setGenerateError] = useState<string | null>(null);
    const [showImageSelection, setShowImageSelection] = useState(false);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [isSelectingImage, setIsSelectingImage] = useState(false);

    // Handle image selection for new materials
    const handleImageSelection = async (imageIndex: number) => {
        if (!pageData?.material) return;
        
        setIsSelectingImage(true);
        try {
            if (imageIndex === -1) {
                // User selected "None Fit" - create material without image
                console.log(`[Image Selection] Creating material without image: ${pageData.material.Name}`);
                
                const response = await fetch(`${API_BASE_URL}/select-material-image`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        material_data: pageData.material,
                        selected_image_index: -1 // Special value for no image
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    console.log('[Image Selection] ✅ Material created successfully without image:', result.material);
                    
                    // Update the page data with the created material
                    setPageData(prev => prev ? {
                        ...prev,
                        material: result.material
                    } : null);
                    
                    setShowImageSelection(false);
                    
                    // Refresh the page to load the new material's details
                    if (result.material.id) {
                        await fetchMaterialDetails(result.material.id);
                    }
                } else {
                    console.error('[Image Selection] ❌ Failed to create material:', result.error);
                    setError(result.error || 'Failed to create material');
                }
            } else {
                // User selected a specific image
                if (!pageData.material.ImageOptions) return;
                
                console.log(`[Image Selection] Selecting image ${imageIndex} for material: ${pageData.material.Name}`);
                
                const response = await fetch(`${API_BASE_URL}/select-material-image`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        material_data: pageData.material,
                        selected_image_index: imageIndex
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    console.log('[Image Selection] ✅ Material created successfully:', result.material);
                    
                    // Update the page data with the created material
                    setPageData(prev => prev ? {
                        ...prev,
                        material: result.material
                    } : null);
                    
                    setShowImageSelection(false);
                    
                    // Refresh the page to load the new material's details
                    if (result.material.id) {
                        await fetchMaterialDetails(result.material.id);
                    }
                } else {
                    console.error('[Image Selection] ❌ Failed to create material:', result.error);
                    setError(result.error || 'Failed to create material');
                }
            }
        } catch (error) {
            console.error('[Image Selection] ❌ Error selecting image:', error);
            setError('Failed to select image');
        } finally {
            setIsSelectingImage(false);
        }
    };

    // Fetch material details and related data from backend
    const fetchMaterialDetails = async (materialId: string) => {
        try {
            console.log(`[Material Details] Fetching material details for ID: ${materialId}`);
            const response = await fetch(`${API_BASE_URL}/material/${materialId}`);
            if (!response.ok) throw new Error('Failed to fetch material details');
            const data = await response.json();
            
            // Log material data including image information
            if (data && data.material) {
                console.log(`[Material Details] Material loaded:`, {
                    id: data.material.id,
                    name: data.material.Name,
                    traits: data.material.Traits,
                    hasImageUrl: !!data.material.imageUrl,
                    imageUrl: data.material.imageUrl ? 'Present' : 'Missing',
                    imageSource: data.material.imageUrl ? (data.material.imageUrl.includes('unsplash') ? 'Unsplash API' : 'Other') : 'None'
                });
                
                if (data.material.imageUrl) {
                    console.log(`[Material Details] Image URL found: ${data.material.imageUrl}`);
                    console.log(`[Material Details] Image source: ${data.material.imageUrl.includes('unsplash') ? 'Unsplash API' : 'Other source'}`);
                } else {
                    console.log(`[Material Details] No image URL found for material: ${data.material.Name}`);
                }
            }
            
            return data;
        } catch (error) {
            console.error('[Material Details] Error fetching material details:', error);
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
                console.log('[Detail Page] Starting page data load...');
                setLoading(true);
                let materialId: string;
                let material: MaterialData | null = null;
                
                // Handle both scanData (from scanning) and materialId (from navigation)
                if (params.scanData) {
                    console.log('[Detail Page] Loading from scan data...');
                    const data = JSON.parse(params.scanData as string);
                    setScanData(data);
                    
                    if (data['Scanned Material'] && data['Scanned Material'].length > 0) {
                        material = data['Scanned Material'][0];
                        materialId = material?.id || material?.Name || '';
                        
                        console.log('[Detail Page] Scan data material:', {
                            id: material?.id,
                            name: material?.Name,
                            hasImageUrl: !!material?.imageUrl,
                            imageUrl: material?.imageUrl ? 'Present' : 'Missing'
                        });
                        
                        if (!materialId) {
                            throw new Error('No valid material ID found');
                        }
                        
                        // Log the scan first
                        await logScan(materialId);
                    } else {
                        throw new Error('No scanned material data found');
                    }
                } else if (params.materialId) {
                    console.log('[Detail Page] Loading from material ID:', params.materialId);
                    materialId = params.materialId as string;
                } else {
                    throw new Error('No material ID or scan data provided');
                }
                
                console.log('[Detail Page] Fetching material details for ID:', materialId);
                // Fetch material details first to get the material name
                const materialDetails = await fetchMaterialDetails(materialId);
                
                console.log('[Detail Page] Fetching additional data in parallel...');
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
                
                console.log('[Detail Page] Page data loaded successfully:', {
                    materialName: pageData.material.Name,
                    hasImageUrl: !!pageData.material.imageUrl,
                    imageSource: pageData.material.imageUrl ? (pageData.material.imageUrl.includes('unsplash') ? 'Unsplash API' : 'Other') : 'None',
                    hasImageOptions: !!pageData.material.ImageOptions,
                    imageOptionsCount: pageData.material.ImageOptions?.length || 0,
                    projectsCount: pageData.recyclingProjects.length,
                    relatedMaterialsCount: pageData.relatedMaterials.length
                });
                
                setPageData(pageData);
                
                // Check if this is a new material that needs image selection
                if (pageData.material.ImageOptions && pageData.material.ImageOptions.length > 0) {
                    console.log('[Detail Page] New material detected with image options, showing selection UI');
                    setShowImageSelection(true);
                }
            } catch (error) {
                console.error('[Detail Page] Error loading page data:', error);
                console.error('[Detail Page] Error details:', {
                    message: error instanceof Error ? error.message : 'Unknown error',
                    stack: error instanceof Error ? error.stack : undefined
                });
                setError('Failed to load material details');
            } finally {
                console.log('[Detail Page] Page data loading completed');
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
        <ThemedView style={styles.container}>
            {/* Image Selection Modal */}
            {showImageSelection && pageData.material.ImageOptions && (
                <ThemedView style={styles.imageSelectionModal}>
                    <ThemedView style={styles.imageSelectionContent}>
                        <ThemedText type="title" style={styles.imageSelectionTitle}>
                            Choose the best image for "{pageData.material.Name}"
                        </ThemedText>
                        <ThemedText style={styles.imageSelectionSubtitle}>
                            Select the image that best represents this material:
                        </ThemedText>
                        
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageOptionsContainer}>
                            {pageData.material.ImageOptions.map((imageOption, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={[
                                        styles.imageOption,
                                        selectedImageIndex === index && styles.selectedImageOption
                                    ]}
                                    onPress={() => setSelectedImageIndex(index)}
                                >
                                    <Image
                                        source={{ uri: imageOption.thumb }}
                                        style={styles.imageOptionThumb}
                                        resizeMode="cover"
                                    />
                                    <ThemedText style={styles.imageOptionDescription} numberOfLines={2}>
                                        {imageOption.alt_description || imageOption.description || 'Image'}
                                    </ThemedText>
                                    <ThemedText style={styles.imageOptionPhotographer} numberOfLines={1}>
                                        by {imageOption.photographer}
                                    </ThemedText>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        
                        <ThemedView style={styles.imageSelectionButtons}>
                            <TouchableOpacity
                                style={[styles.imageSelectionButton, styles.cancelButton]}
                                onPress={() => {
                                    setShowImageSelection(false);
                                    router.back();
                                }}
                            >
                                <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
                            </TouchableOpacity>
                            
                            <TouchableOpacity
                                style={[styles.imageSelectionButton, styles.skipButton]}
                                onPress={() => handleImageSelection(-1)} // -1 indicates no image
                                disabled={isSelectingImage}
                            >
                                <ThemedText style={styles.skipButtonText}>None Fit</ThemedText>
                            </TouchableOpacity>
                            
                            <TouchableOpacity
                                style={[styles.imageSelectionButton, styles.confirmButton]}
                                onPress={() => handleImageSelection(selectedImageIndex)}
                                disabled={isSelectingImage}
                            >
                                {isSelectingImage ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <ThemedText style={styles.confirmButtonText}>Use This Image</ThemedText>
                                )}
                            </TouchableOpacity>
                        </ThemedView>
                    </ThemedView>
                </ThemedView>
            )}
            
            <ScrollView style={styles.scrollContainer}>
                {/* Back Button */}
                <ThemedView style={styles.backButtonContainer}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <ThemedText style={styles.backButtonText}>← Back</ThemedText>
                    </TouchableOpacity>
                </ThemedView>
            
            {/* Top Division */}
            <ThemedView style={styles.topDivision}>
                <ThemedView style={styles.imageBox}>
                    {pageData.material.imageUrl ? (
                        <Image 
                            source={{ uri: pageData.material.imageUrl }} 
                            style={styles.materialImage}
                            resizeMode="cover"
                            onLoad={() => {
                                console.log(`[Material Image] Successfully loaded image for ${pageData.material.Name}`);
                                console.log(`[Material Image] Image URL: ${pageData.material.imageUrl || 'N/A'}`);
                                console.log(`[Material Image] Image source: ${pageData.material.imageUrl?.includes('unsplash') ? 'Unsplash API' : 'Other source'}`);
                            }}
                            onError={(error) => {
                                console.error(`[Material Image] Failed to load image for ${pageData.material.Name}:`, error);
                                console.error(`[Material Image] Failed URL: ${pageData.material.imageUrl || 'N/A'}`);
                                console.error(`[Material Image] Image source: ${pageData.material.imageUrl?.includes('unsplash') ? 'Unsplash API' : 'Other source'}`);
                            }}
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
                
                {populatingProjects ? (
                    <ThemedView style={styles.populatingContainer}>
                        <ActivityIndicator size="small" color="#007AFF" />
                        <ThemedText style={styles.populatingText}>Loading recycling projects...</ThemedText>
                    </ThemedView>
                ) : pageData.recyclingProjects.length > 0 ? (
                    pageData.recyclingProjects.map((project, index) => (
                        <TouchableOpacity 
                            key={project.id} 
                            style={styles.projectCard}
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
                                <ThemedText type="subtitle" style={styles.projectTitle}>{project.project_name}</ThemedText>
                                <ThemedText style={styles.projectDescription}>
                                    Material: {project.material_name}
                                </ThemedText>
                                <ThemedText style={styles.projectTraitsText}>
                                    Required: {project.required_traits.join(', ')}
                                </ThemedText>
                                <ThemedText style={styles.stepsText}>
                                    Steps: {project.steps.length} steps
                                </ThemedText>
                                <ThemedText style={styles.tapToViewText}>
                                    Tap to view full details →
                                </ThemedText>
                            </ThemedView>
                        </TouchableOpacity>
                    ))
                ) : (
                    <ThemedText style={styles.noProjectsText}>No recycling projects available for this material.</ThemedText>
                )}

                {/* Generate New Project Section */}
                <ThemedView style={styles.generateProjectSection}>
                    <ThemedText type="subtitle" style={styles.generateProjectTitle}>
                        Not satisfied with these projects?
                    </ThemedText>
                    <ThemedText style={styles.generateProjectDescription}>
                        Generate a new custom project tailored specifically for your material using AI!
                    </ThemedText>
                    {generateError && (
                        <ThemedText style={styles.generateErrorText}>
                            {generateError}
                        </ThemedText>
                    )}
                    <ThemedView style={styles.generateButtonContainer}>
                        {generatingCustomProject ? (
                            <ThemedView style={styles.generateButton}>
                                <ActivityIndicator size="small" color="#fff" />
                                <ThemedText style={styles.generateButtonText}>Generating...</ThemedText>
                            </ThemedView>
                        ) : (
                            <TouchableOpacity style={styles.generateButton} onPress={generateCustomProject}>
                                <ThemedText style={styles.generateButtonText}>Generate New Project</ThemedText>
                            </TouchableOpacity>
                        )}
                    </ThemedView>
                </ThemedView>
            </ThemedView>

            {/* Bottom Division */}
            <ThemedView style={styles.bottomDivision}>
                <ThemedText type="title" style={styles.sectionTitle}>Disposal Methods</ThemedText>
                <ThemedText style={styles.disposalText}>
                    {pageData.disposalMethods || 'No disposal methods available for this material.'}
                </ThemedText>
            </ThemedView>
            </ScrollView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContainer: {
        flex: 1,
    },
    imageSelectionModal: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        zIndex: 1000,
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageSelectionContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 24,
        margin: 20,
        maxHeight: '80%',
        width: '90%',
    },
    imageSelectionTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#333',
        textAlign: 'center',
        marginBottom: 8,
    },
    imageSelectionSubtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 20,
    },
    imageOptionsContainer: {
        marginBottom: 24,
    },
    imageOption: {
        width: 150,
        marginRight: 16,
        padding: 12,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#E5E5E5',
        backgroundColor: '#F8F9FA',
    },
    selectedImageOption: {
        borderColor: '#007AFF',
        backgroundColor: '#E3F2FD',
    },
    imageOptionThumb: {
        width: '100%',
        height: 100,
        borderRadius: 8,
        marginBottom: 8,
    },
    imageOptionDescription: {
        fontSize: 12,
        color: '#333',
        marginBottom: 4,
        textAlign: 'center',
    },
    imageOptionPhotographer: {
        fontSize: 10,
        color: '#666',
        textAlign: 'center',
        fontStyle: 'italic',
    },
    imageSelectionButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    imageSelectionButton: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#F8F9FA',
        borderWidth: 1,
        borderColor: '#E5E5E5',
    },
    skipButton: {
        backgroundColor: '#FF9500',
    },
    confirmButton: {
        backgroundColor: '#007AFF',
    },
    cancelButtonText: {
        color: '#666',
        fontSize: 16,
        fontWeight: '500',
    },
    skipButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '500',
    },
    confirmButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '500',
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
