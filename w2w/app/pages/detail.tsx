import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, ScrollView, Image, TextInput, ActivityIndicator, TouchableOpacity, View, Platform, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { getUserId } from '@/lib/user';
import { useLocation } from '@/hooks/useLocation';
import { useClimateStorage } from '@/hooks/useClimateStorage';
import LogoLoadingAnimation from '@/components/LogoLoadingAnimation';
import { questService } from '@/lib/questService';
import { notificationService } from '@/lib/notificationService';
import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import EducationalContentModal from '@/components/EducationalContentModal';
import { educationalService, EducationalContent } from '@/lib/educationalService';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { Colors } from '@/constants/Colors';
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
}

interface MaterialData {
    id: string;
    Name: string;
    Traits: string[];
    ImageUrl?: string;
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

interface DisposalMethod {
    id?: string;
    material_name: string;
    climate_classification: string;
    climate_location: string;
    disposal_steps: string[];
    created_at?: string;
    updated_at?: string;
    isFallbackData?: boolean;
    isStoredData?: boolean;
}

interface DetailPageData {
    material: MaterialData;
    recyclingProjects: RecyclingProject[];
    disposalMethods: DisposalMethod | null;
    relatedMaterials: MaterialData[];
}

function DetailScreen() {
    const params = useLocalSearchParams();
    const router = useRouter();
    const { userId } = useAuth();

    const handleBack = () => {
        router.back();
    };
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
    
    // Educational content state
    const [educationalModalVisible, setEducationalModalVisible] = useState(false);
    const [educationalContent, setEducationalContent] = useState<EducationalContent | null>(null);
    const [educationalLoading, setEducationalLoading] = useState(false);
    const [currentMaterialName, setCurrentMaterialName] = useState<string>('');
    const educationalContentShown = useRef(false);
    
    // Location and climate storage hooks
    const { location } = useLocation();
    const { climateData, location: storedLocation, isDataFresh, fetchClimateData } = useClimateStorage();

    // Function to fetch and show educational content
    const fetchAndShowEducationalContent = useCallback(async (materialName: string) => {
        try {
            console.log(`[Detail] 📚 Fetching educational content for: ${materialName}`);
            setEducationalLoading(true);
            setCurrentMaterialName(materialName);
            
            const response = await educationalService.getEducationalContent(materialName);
            
            if (response.success && response.content) {
                console.log(`[Detail] ✅ Educational content loaded from ${response.source}`);
                setEducationalContent(response.content);
                setEducationalModalVisible(true);
            } else {
                console.log(`[Detail] ❌ Failed to load educational content: ${response.error}`);
                // Still show modal with error state
                setEducationalContent(null);
                setEducationalModalVisible(true);
            }
        } catch (error) {
            console.error('[Detail] ❌ Error fetching educational content:', error);
            setEducationalContent(null);
            setEducationalModalVisible(true);
        } finally {
            setEducationalLoading(false);
        }
    }, []);
    
    // Debug climate and location data
    console.log('[Detail Page] 🔍 Climate and Location Debug:');
    console.log('  Current Location:', location);
    console.log('  Stored Location:', storedLocation);
    console.log('  Stored Climate Data:', climateData);
    console.log('  Climate Data Available:', !!climateData);
    console.log('  Data is Fresh:', isDataFresh);
    console.log('  Current Location Available:', !!location);
    
    // Fallback: If we have location but no stored climate data, try to fetch it
    useEffect(() => {
        if (location && !climateData) {
            console.log('[Detail Page] 🔄 No stored climate data, attempting to fetch...');
            fetchClimateData(location).catch(error => {
                console.error('[Detail Page] ❌ Failed to fetch climate data:', error);
            });
        }
    }, [location, climateData, fetchClimateData]);

    // Show educational content when page loads with scan data
    useEffect(() => {
        console.log(`[Detail Page] 🔍 useEffect triggered - scanData:`, scanData);
        console.log(`[Detail Page] 🔍 educationalModalVisible:`, educationalModalVisible);
        console.log(`[Detail Page] 🔍 educationalContentShown.current:`, educationalContentShown.current);
        
        // Reset the ref when scanData changes (new scan)
        if (scanData) {
            educationalContentShown.current = false;
        }
        
        // Try to find material name in different possible fields
        let materialName = null;
        if (scanData) {
            materialName = scanData.material_name || 
                          scanData.materialName || 
                          (scanData['Scanned Material'] && scanData['Scanned Material'][0] && scanData['Scanned Material'][0].Name) ||
                          scanData.Name;
        }
        
        console.log(`[Detail Page] 🔍 Found material name:`, materialName);
        
        if (scanData && materialName && !educationalContentShown.current) {
            console.log(`[Detail Page] 📚 Page loaded with scan data for material: ${materialName}`);
            educationalContentShown.current = true; // Mark as shown to prevent multiple calls
            
            // Add a small delay to ensure the page is fully loaded
            const timer = setTimeout(() => {
                console.log(`[Detail Page] 📚 Timer triggered, calling fetchAndShowEducationalContent`);
                fetchAndShowEducationalContent(materialName);
            }, 1000);
            
            return () => clearTimeout(timer);
        } else {
            console.log(`[Detail Page] ❌ Conditions not met for educational content trigger:`);
            console.log(`  - scanData exists: ${!!scanData}`);
            console.log(`  - materialName found: ${!!materialName}`);
            console.log(`  - not already shown: ${!educationalContentShown.current}`);
        }
    }, [scanData, fetchAndShowEducationalContent]);

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
                    
                    // Track quest progress for scanning action
                    console.log('📸 Tracking scanning action: Material creation');
                    try {
                        if (userId) {
                            const results = await questService.trackScanningAction(userId);
                            await questService.checkCompletedQuests(results);
                            console.log('✅ Scanning quest progress updated:', results);
                        }
                    } catch (questError) {
                        console.error('❌ Error tracking scanning quest:', questError);
                    }
                    
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
                    
                    // Track quest progress for scanning action
                    console.log('📸 Tracking scanning action: Material creation with image');
                    try {
                        if (userId) {
                            const results = await questService.trackScanningAction(userId);
                            await questService.checkCompletedQuests(results);
                            console.log('✅ Scanning quest progress updated:', results);
                        }
                    } catch (questError) {
                        console.error('❌ Error tracking scanning quest:', questError);
                    }
                    
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
                    hasImageUrl: !!data.material.ImageUrl,
                    imageUrl: data.material.ImageUrl ? 'Present' : 'Missing'
                });
                
                if (data.material.ImageUrl) {
                    console.log(`[Material Details] Image URL found: ${data.material.ImageUrl}`);
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

    // Fetch disposal methods for the material based on material name and climate
    const fetchDisposalMethods = async (materialName: string) => {
        try {
            console.log(`[Disposal Methods] 🔍 Fetching disposal methods for material: ${materialName}`);
            
            // Check if we have stored climate data
            if (!climateData) {
                console.log('[Disposal Methods] ⚠️ No stored climate data available, using fallback values');
                console.log('[Disposal Methods] 💡 Using default tropical climate for disposal method lookup');
                console.log('[Disposal Methods] 🔍 This could be because:');
                console.log('  - User just logged in and climate data is still loading');
                console.log('  - Location permission was not granted');
                console.log('  - Climate service is unavailable');
                
                // Use fallback values for climate data
                const fallbackClimateData = {
                    climateZone: 'Tropical',
                    temperature: { average: 28, unit: 'C' },
                    humidity: 75
                };
                
                console.log(`[Disposal Methods] 📊 Using fallback climate data:`);
                console.log(`  Climate Zone: ${fallbackClimateData.climateZone}`);
                console.log(`  Temperature: ${fallbackClimateData.temperature.average}°${fallbackClimateData.temperature.unit}`);
                console.log(`  Humidity: ${fallbackClimateData.humidity}%`);
                console.log(`  Location: ${location ? `${location.latitude},${location.longitude}` : '0,0'}`);
                
                const requestBody = {
                    material_name: materialName,
                    climate_classification: fallbackClimateData.climateZone,
                    climate_location: location ? `${location.latitude},${location.longitude}` : '0,0'
                };
                
                console.log(`[Disposal Methods] 📤 Sending fallback request to /disposal/check:`, requestBody);
                
                const response = await fetch(`${API_BASE_URL}/disposal/check`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestBody)
                });
                
                console.log(`[Disposal Methods] 📥 Fallback response status: ${response.status} ${response.statusText}`);
                
                if (!response.ok) {
                    console.error(`[Disposal Methods] ❌ Fallback HTTP error: ${response.status} ${response.statusText}`);
                    throw new Error(`Failed to fetch disposal methods: ${response.status} ${response.statusText}`);
                }
                
                const data = await response.json();
                console.log(`[Disposal Methods] 📋 Fallback response data:`, data);
                
                if (data.found && data.disposal_data) {
                    console.log(`[Disposal Methods] ✅ Found disposal method with fallback data for ${materialName}`);
                    // Mark this as fallback data
                    const disposalDataWithFlag = {
                        ...data.disposal_data,
                        isFallbackData: true
                    };
                    return disposalDataWithFlag;
                } else {
                    console.log(`[Disposal Methods] ❌ No disposal method found with fallback data for ${materialName}`);
                    return null;
                }
            }
            
            console.log(`[Disposal Methods] 📊 Using stored climate data:`);
            console.log(`  Climate Zone: ${climateData.climateZone}`);
            console.log(`  Temperature: ${climateData.temperature.average}°${climateData.temperature.unit}`);
            console.log(`  Humidity: ${climateData.humidity}%`);
            console.log(`  Stored Location: ${storedLocation ? `${storedLocation.latitude},${storedLocation.longitude}` : 'Not available'}`);
            console.log(`  Data is Fresh: ${isDataFresh ? 'Yes' : 'No'}`);
            console.log(`  Current Location: ${location ? `${location.latitude},${location.longitude}` : 'Not available'}`);
            
            const requestBody = {
                material_name: materialName,
                climate_classification: climateData.climateZone,
                climate_location: storedLocation ? `${storedLocation.latitude},${storedLocation.longitude}` : '0,0'
            };
            
            console.log(`[Disposal Methods] 📤 Sending request to /disposal/check:`, requestBody);
            
            const response = await fetch(`${API_BASE_URL}/disposal/check`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });
            
            console.log(`[Disposal Methods] 📥 Response status: ${response.status} ${response.statusText}`);
            
            if (!response.ok) {
                console.error(`[Disposal Methods] ❌ HTTP error: ${response.status} ${response.statusText}`);
                throw new Error(`Failed to fetch disposal methods: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log(`[Disposal Methods] 📋 Response data:`, data);
            
            if (data.found && data.disposal_data) {
                console.log(`[Disposal Methods] ✅ Found disposal method for ${materialName} using stored climate data (${climateData.climateZone})`);
                console.log(`[Disposal Methods] 📝 Disposal method details:`);
                console.log(`  ID: ${data.disposal_data.id}`);
                console.log(`  Material: ${data.disposal_data.material_name}`);
                console.log(`  Climate: ${data.disposal_data.climate_classification}`);
                console.log(`  Location: ${data.disposal_data.climate_location}`);
                console.log(`  Steps count: ${data.disposal_data.disposal_steps?.length || 0}`);
                console.log(`  Created: ${data.disposal_data.created_at}`);
                console.log(`[Disposal Methods] 🏪 Data source: Stored climate data (${isDataFresh ? 'fresh' : 'stale'})`);
                // Mark this as stored climate data (not fallback)
                const disposalDataWithFlag = {
                    ...data.disposal_data,
                    isFallbackData: false,
                    isStoredData: true
                };
                return disposalDataWithFlag;
            } else {
                console.log(`[Disposal Methods] ❌ No disposal method found for ${materialName} using stored climate data (${climateData.climateZone})`);
                console.log(`[Disposal Methods] 💡 Consider generating new disposal method for this material/climate combination`);
                return null;
            }
        } catch (error) {
            console.error('[Disposal Methods] ❌ Error fetching disposal methods:', error);
            console.error('[Disposal Methods] 🔍 Error details:', {
                message: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined
            });
            return null;
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
                
                // Add notification for material scanning
                if (pageData?.material) {
                    notificationService.notifyMaterialScanned(pageData.material.Name);
                }
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
                
                // Add notification for project creation
                if (result.project) {
                    notificationService.notifyProjectCreated(result.project.project_name);
                }
                
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
                    console.log('[Detail Page] 📊 Parsed scan data:', JSON.stringify(data, null, 2));
                    setScanData(data);
                    
                    if (data['Scanned Material'] && data['Scanned Material'].length > 0) {
                        material = data['Scanned Material'][0];
                        materialId = material?.id || material?.Name || '';
                        
                        console.log('[Detail Page] Scan data material:', {
                            id: material?.id,
                            name: material?.Name,
                            hasImageUrl: !!material?.ImageUrl,
                            imageUrl: material?.ImageUrl ? 'Present' : 'Missing'
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
                    fetchDisposalMethods(materialDetails?.Name || materialId),
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
                    hasImageUrl: !!pageData.material.ImageUrl,
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
            <ThemedView style={[styles.loadingContainer, { backgroundColor: Colors.background }]}>
                <LogoLoadingAnimation size={120} showBackground={true} />
            </ThemedView>
        );
    }

    if (error) {
        return (
            <ThemedView style={[styles.errorContainer, { backgroundColor: Colors.background }]}>
                <ThemedText style={styles.errorText}>{error}</ThemedText>
            </ThemedView>
        );
    }

    if (!pageData) {
        return (
            <ThemedView style={[styles.errorContainer, { backgroundColor: Colors.background }]}>
                <ThemedText style={styles.errorText}>No material data available</ThemedText>
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
                    {pageData?.material?.Name || 'Material Details'}
                </ThemedText>
                <View style={styles.placeholder} />
            </ThemedView>

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
            
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Top Division */}
            <ThemedView style={styles.topDivision}>
                <ThemedView style={styles.imageBox}>
                    {pageData.material.ImageUrl ? (
                        <Image 
                            source={{ uri: pageData.material.ImageUrl }} 
                            style={styles.materialImage}
                            resizeMode="cover"
                            onLoad={() => {
                                console.log(`[Material Image] Successfully loaded image for ${pageData.material.Name}`);
                                console.log(`[Material Image] Image URL: ${pageData.material.ImageUrl || 'N/A'}`);
                            }}
                            onError={(error) => {
                                console.error(`[Material Image] Failed to load image for ${pageData.material.Name}:`, error);
                                console.error(`[Material Image] Failed URL: ${pageData.material.ImageUrl || 'N/A'}`);
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
                
                {/* Educational Content Button */}
                <TouchableOpacity 
                    style={styles.educationalButton}
                    onPress={() => fetchAndShowEducationalContent(pageData.material.Name)}
                    activeOpacity={0.7}
                >
                    <MaterialIcons name="school" size={20} color="#fff" />
                    <ThemedText style={styles.educationalButtonText}>Learn More</ThemedText>
                </TouchableOpacity>
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
                                <View style={styles.tapToViewContainer}>
                                    <ThemedText style={styles.tapToViewText}>
                                        Tap to view details
                                    </ThemedText>
                                    <MaterialIcons name="chevron-right" size={16} color="#007AFF" />
                                </View>
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
                {(() => {
                    if (pageData.disposalMethods) {
                        const isFallback = pageData.disposalMethods.isFallbackData;
                        const isStored = (pageData.disposalMethods as any).isStoredData;
                        console.log(`[Disposal Methods UI] ✅ Rendering disposal methods for ${pageData.material.Name}`);
                        console.log(`[Disposal Methods UI] 📊 Displaying ${pageData.disposalMethods.disposal_steps?.length || 0} disposal steps`);
                        
                        if (isFallback) {
                            console.log(`[Disposal Methods UI] ⚠️ Using FALLBACK/DEFAULT climate data`);
                            console.log(`[Disposal Methods UI] 🌡️ Climate: ${pageData.disposalMethods.climate_classification} (default)`);
                        } else if (isStored) {
                            console.log(`[Disposal Methods UI] ✅ Using STORED climate data`);
                            console.log(`[Disposal Methods UI] 🌡️ Climate: ${pageData.disposalMethods.climate_classification} (stored, ${isDataFresh ? 'fresh' : 'stale'})`);
                        } else {
                            console.log(`[Disposal Methods UI] ✅ Using ACTUAL climate data`);
                            console.log(`[Disposal Methods UI] 🌡️ Climate: ${pageData.disposalMethods.climate_classification} (detected)`);
                        }
                        
                        return (
                            <ThemedView style={styles.disposalContainer}>
                                <ThemedView style={styles.disposalHeader}>
                                    <ThemedText style={styles.disposalClimate}>
                                        Climate: {pageData.disposalMethods.climate_classification}
                                    </ThemedText>
                                </ThemedView>
                                {pageData.disposalMethods.disposal_steps.map((step, index) => {
                                    console.log(`[Disposal Methods UI] 📝 Rendering step ${index + 1}: ${step.substring(0, 50)}...`);
                                    return (
                                        <ThemedView key={index} style={styles.disposalStep}>
                                            <ThemedText style={styles.disposalStepNumber}>{index + 1}.</ThemedText>
                                            <ThemedText style={styles.disposalStepText}>{step}</ThemedText>
                                        </ThemedView>
                                    );
                                })}
                            </ThemedView>
                        );
                    } else {
                        console.log(`[Disposal Methods UI] ❌ No disposal methods available for ${pageData.material.Name}`);
                        console.log(`[Disposal Methods UI] 💡 This could be because:`);
                        console.log(`  - No disposal method exists for this material/climate combination`);
                        console.log(`  - Climate data is not available (${!climateData ? 'MISSING' : 'AVAILABLE'})`);
                        console.log(`  - Location data is not available (${!location ? 'MISSING' : 'AVAILABLE'})`);
                        console.log(`[Disposal Methods UI] 🔍 Climate data status: ${climateData ? '✅ Available' : '❌ Missing'}`);
                        console.log(`[Disposal Methods UI] 📍 Location data status: ${location ? '✅ Available' : '❌ Missing'}`);
                        
                        return (
                            <ThemedText style={styles.disposalText}>
                                No disposal methods available for this material in your current climate.
                            </ThemedText>
                        );
                    }
                })()}
            </ThemedView>
            </ScrollView>
            
            {/* Educational Content Modal */}
                <EducationalContentModal
                    visible={educationalModalVisible}
                    onClose={() => {
                        setEducationalModalVisible(false);
                        educationalContentShown.current = false; // Reset for next scan
                    }}
                    content={educationalContent}
                    loading={educationalLoading}
                    materialName={currentMaterialName}
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
        backgroundColor: Platform.OS === 'web' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.7)',
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
        fontSize: 28,
        fontWeight: 'bold',
        color: '#00630F',
        lineHeight: 34,
    },
    traitsText: {
        fontSize: 16,
        color: '#4A9B5C',
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: 20,
        fontWeight: '600',
    },
    middleDivision: {
        padding: 20,
        backgroundColor: '#FFFFFF',
        marginBottom: 20,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    sectionTitle: {
        marginBottom: 20,
        textAlign: 'center',
        fontSize: 20,
        fontWeight: 'bold',
        color: '#00630F',
        lineHeight: 24,
    },
    projectCard: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#E8F5E8',
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
        marginBottom: 8,
        fontWeight: 'bold',
        fontSize: 18,
        color: '#00630F',
        lineHeight: 22,
    },
    projectDescription: {
        fontSize: 15,
        color: '#2D5016',
        lineHeight: 22,
        marginBottom: 8,
        fontWeight: '500',
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
        backgroundColor: '#FFFFFF',
        marginBottom: 20,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    disposalText: {
        fontSize: 16,
        color: '#2D5016',
        lineHeight: 24,
        textAlign: 'justify',
        fontWeight: '500',
    },
    disposalContainer: {
        marginTop: 10,
    },
    disposalHeader: {
        backgroundColor: '#f8f9fa',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#007AFF',
    },
    disposalClimate: {
        fontSize: 14,
        fontWeight: '600',
        color: '#007AFF',
        marginBottom: 4,
    },
    disposalLocation: {
        fontSize: 12,
        color: '#666',
    },
    disposalStep: {
        flexDirection: 'row',
        marginBottom: 8,
        paddingLeft: 8,
    },
    disposalStepNumber: {
        fontSize: 14,
        fontWeight: '600',
        color: '#007AFF',
        width: 24,
        marginRight: 8,
    },
    disposalStepText: {
        flex: 1,
        fontSize: 15,
        color: '#2D5016',
        lineHeight: 22,
        fontWeight: '500',
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
        backgroundColor: '#00630F',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 200,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 5,
    },
    generateButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    educationalButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#00630F',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 20,
        marginTop: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 5,
    },
    educationalButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
    },
});

export default function DetailScreenWithAuth() {
    return (
        <AuthGuard>
            <DetailScreen />
        </AuthGuard>
    );
}
