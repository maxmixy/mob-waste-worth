import { CameraView, useCameraPermissions } from 'expo-camera';
import { BlurView } from 'expo-blur';
import { StyleSheet, View } from 'react-native';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { Platform, Alert, Pressable } from 'react-native';
import { ActivityIndicator } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { router } from 'expo-router';

import { HelloWave } from '@/components/HelloWave';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors } from '@/constants/Colors';
import SettingsSidebar from '@/components/SettingsSidebar';
import { useLocation } from '@/hooks/useLocation';
import { useClimate } from '@/hooks/useClimate';
import { useDisposal } from '@/hooks/useDisposal';
import { questService } from '@/lib/questService';
import { useAuth } from '@/contexts/AuthContext';

// Update this URL to the address where your backend is reachable from the device/emulator.
// For local Python backend (this repo) the endpoint is POST /upload on port 5000.
// Common development values:
// - Android emulator (default): http://10.0.2.2:5000/upload
// - iOS simulator / Expo on same machine: http://127.0.0.1:5000/upload
// - Real device on same LAN: http://<YOUR_MACHINE_IP>:5000/upload
// Change to the appropriate value for your testing environment.
const UPLOAD_URL = 'http://127.0.0.1:5000/upload';

export default function HomeScreen() {
    const isFocused = useIsFocused();
    const { userId } = useAuth();
    const [cameraPermission, requestCameraPermission] = useCameraPermissions();
    const cameraRef = useRef<CameraView>(null);
    const [isCameraReady, setIsCameraReady] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [sidebarVisible, setSidebarVisible] = useState(false);
    const [isCapturing, setIsCapturing] = useState(false);
    const [isBackgroundBright, setIsBackgroundBright] = useState(false);
    
    // Static black colors for all text and icons
    const getTextColor = useCallback(() => {
        return '#000000';
    }, []);
    
    const getIconColor = useCallback(() => {
        return '#000000';
    }, []);
    
    const getBlurIntensity = useCallback(() => {
        return 25;
    }, []);
    
    const getButtonBackgroundColor = useCallback(() => {
        return 'rgba(255, 255, 255, 0.9)';
    }, []);
    
    const getButtonTextColor = useCallback(() => {
        return '#000000';
    }, []);
    
    
    // Location, climate, and disposal functionality
    const { location, getCurrentLocation } = useLocation();
    const { climateData, getClimateForLocation } = useClimate();
    const { disposalData, loading: disposalLoading, error: disposalError, getDisposalForMaterial } = useDisposal();
    
    useEffect(() => {
        if (!cameraPermission?.granted) {
        requestCameraPermission();
        }
    }, [cameraPermission]);
    
    // Get location and climate data when component mounts
    useEffect(() => {
        const initializeLocationAndClimate = async () => {
            try {
                console.log('[Scan] Initializing location and climate data...');
                const currentLocation = await getCurrentLocation();
                if (currentLocation) {
                    console.log('[Scan] Location obtained, getting climate data...');
                    await getClimateForLocation(currentLocation);
                }
            } catch (error) {
                console.error('[Scan] Error initializing location/climate:', error);
                // Continue without location/climate data
            }
        };
        
        initializeLocationAndClimate();
    }, []);
    
    
    if (!cameraPermission) {
        return (
            <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ThemedText>Requesting camera permission...</ThemedText>
            </ThemedView>
        );
    }
    if (!cameraPermission.granted) {
        return (
            <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ThemedText>No access to camera</ThemedText>
            </ThemedView>
        );
    }

    const handleCaptureImage = async () => {
        if (cameraRef.current) {
            try {
                setIsCapturing(true);
                const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
                // Handle the captured photo as needed
                console.log('Captured photo:', photo);
                // Upload the photo to the server
                setUploading(true);
                const uri = photo.uri;
                const filename = uri.split('/').pop() || 'photo.jpg';
                const match = filename.match(/\.([0-9a-zA-Z]+)$/);
                const ext = match ? match[1] : 'jpg';
                const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`;

                // Try RN-friendly FormData first (uri object). Many native environments
                // expect the `{ uri, name, type }` entry. If that fails, fall back to
                // uploading a blob, and finally fall back to a JSON base64 body.
                let res;
                // 1) Try FormData with { uri, name, type }
                try {
                    const form = new FormData();
                    form.append('image', {
                        uri: uri,
                        name: filename,
                        type: mime,
                    } as any);
                    
                    res = await fetch(UPLOAD_URL, {
                        method: 'POST',
                        body: form,
                        // do NOT set Content-Type header; let fetch set multipart boundary
                    });
                } catch (err1) {
                    console.warn('FormData {uri} upload failed, trying blob fallback:', err1);
                    // 2) Blob fallback
                    try {
                        const fileResponse = await fetch(uri);
                        const blob = await fileResponse.blob();

                        const form = new FormData();
                        form.append('image', blob as any, filename);

                        res = await fetch(UPLOAD_URL, {
                            method: 'POST',
                            body: form,
                        });
                    } catch (err2) {
                        console.warn('Blob upload failed, trying JSON/base64 fallback:', err2);
                        // 3) JSON base64 fallback (uses expo-file-system to read file as base64)
                        try {
                            const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
                            const dataUrl = `data:${mime};base64,${b64}`;
                            res = await fetch(UPLOAD_URL, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ image: dataUrl }),
                            });
                        } catch (err3) {
                            console.error('All upload methods failed:', err1, err2, err3);
                            throw err3;
                        }
                    }
                }
 
                 const text = await res.text();
                 let json = null;
                 try { json = JSON.parse(text); } catch (e) { json = { raw: text }; }
                 console.log('Upload response', json);
                 
                 // Check for disposal methods if material was identified
                 if (json && json.material_name && location && climateData) {
                     console.log('[Scan] Checking disposal methods for scanned material:', json.material_name);
                     try {
                         const disposalResponse = await getDisposalForMaterial({
                             materialName: json.material_name,
                             climateData: climateData,
                             location: {
                                 latitude: location.latitude,
                                 longitude: location.longitude
                             }
                         });
                         
                         if (disposalResponse.found && disposalResponse.disposalData) {
                             console.log('[Scan] Disposal method found:', {
                                 materialName: disposalResponse.disposalData.material_name,
                                 stepsCount: disposalResponse.disposalData.disposal_steps.length,
                                 aiGenerated: disposalResponse.aiGenerated
                             });
                             
                             // Add disposal data to the scan response
                             json.disposal_data = disposalResponse.disposalData;
                             json.disposal_ai_generated = disposalResponse.aiGenerated;
                         } else {
                             console.log('[Scan] No disposal method found for material');
                         }
                     } catch (disposalError) {
                         console.error('[Scan] Error checking disposal methods:', disposalError);
                         // Continue without disposal data
                     }
                 } else {
                     console.log('[Scan] Skipping disposal check - missing material name, location, or climate data');
                 }
                 
                 // Track quest progress for scanning action
                 console.log('📸 Tracking scanning action: Material scan');
                 try {
                   if (userId) {
                     const results = await questService.trackScanningAction(userId);
                     await questService.checkCompletedQuests(results);
                     console.log('✅ Scanning quest progress updated:', results);
                   }
                 } catch (questError) {
                   console.error('❌ Error tracking scanning quest:', questError);
                 }
                 
                 // Navigate to detail page with the scan data (including disposal data if available)
                 router.push({
                     pathname: '/pages/detail',
                     params: { scanData: JSON.stringify(json) }
                 });
                 
                 setUploading(false);
                 setIsCapturing(false);
            } catch (error) {
                setUploading(false);
                setIsCapturing(false);
                console.error('Error capturing photo:', error);
                Alert.alert('Error', String(error));
            }
        }
    };

    return (
        <ThemedView style={{ flex: 1 }}>
            <SettingsSidebar 
                visible={sidebarVisible} 
                onClose={() => setSidebarVisible(false)}
            />
            {isFocused && (
                <CameraView
                    ref={cameraRef}
                    style={{ flex: 1 }}
                    facing="back"
                />
            )}
            
            {/* Blur overlay for better navigation visibility */}
            <BlurView intensity={isCapturing ? 20 : 10} style={styles.blurOverlay}>
                <View style={styles.blurContent} />
            </BlurView>
            
            {/* Modern Scan Frame */}
            <View style={styles.scanFrameContainer}>
                <View style={styles.scanFrame}>
                    <View style={styles.scanFrameCorner} />
                    <View style={[styles.scanFrameCorner, styles.topRight]} />
                    <View style={[styles.scanFrameCorner, styles.bottomLeft]} />
                    <View style={[styles.scanFrameCorner, styles.bottomRight]} />
                </View>
            </View>
            
            {/* Modern Header */}
            <View style={styles.modernHeader}>
                <BlurView intensity={getBlurIntensity()} style={styles.headerBlurContainer}>
                    <View style={styles.headerContent}>
                        <View style={styles.headerLeft}>
                            <MaterialIcons name="qr-code-scanner" size={24} color={getIconColor()} />
                            <ThemedText style={[styles.headerTitle, { color: getTextColor() }]}>Waste Scanner</ThemedText>
                        </View>
                        <Pressable
                            style={styles.modernSettingsButton}
                            onPress={() => setSidebarVisible(true)}
                            accessibilityLabel="Settings"
                        >
                            <MaterialIcons name="settings" size={24} color={getIconColor()} />
                        </Pressable>
                    </View>
                </BlurView>
            </View>
            
            {/* Modern Instructions Panel with Capture Button */}
            <View style={styles.modernInstructionsContainer}>
                <View style={styles.instructionsBlurContainer}>
                    <View style={styles.instructionsContent}>
                        {/* Capture Button at Top */}
                        <View style={styles.captureButtonInInstructions}>
                            {uploading ? (
                                <View style={styles.uploadingContainer}>
                                    <ActivityIndicator size="large" color={getIconColor()} />
                                    <ThemedText style={[styles.uploadingText, { color: getTextColor() }]}>Processing...</ThemedText>
                                </View>
                            ) : (
                                <Pressable 
                                    style={[
                                        styles.modernCaptureButton, 
                                        isCapturing && styles.modernCaptureButtonActive
                                    ]}
                                    onPress={handleCaptureImage}
                                >
                                    <View style={styles.captureButtonContent}>
                                        <View style={styles.cameraIconContainer}>
                                            <MaterialIcons 
                                                name="camera-alt" 
                                                size={24} 
                                                color={getIconColor()} 
                                            />
                                        </View>
                                        <ThemedText style={[
                                            styles.modernCaptureText, 
                                            { color: getTextColor() }
                                        ]}>
                                            {isCapturing ? 'Capturing...' : 'Capture'}
                                        </ThemedText>
                                    </View>
                                </Pressable>
                            )}
                        </View>
                        
                        <View style={styles.instructionSteps}>
                            <View style={styles.instructionStep}>
                                <View style={[styles.stepNumber, { backgroundColor: 'rgba(255, 255, 255, 0.3)' }]}>
                                    <ThemedText style={[styles.stepNumberText, { color: getTextColor() }]}>1</ThemedText>
                                </View>
                                <ThemedText style={[styles.stepText, { color: getTextColor() }]}>Position your waste item in the frame</ThemedText>
                            </View>
                            <View style={styles.instructionStep}>
                                <View style={[styles.stepNumber, { backgroundColor: 'rgba(255, 255, 255, 0.3)' }]}>
                                    <ThemedText style={[styles.stepNumberText, { color: getTextColor() }]}>2</ThemedText>
                                </View>
                                <ThemedText style={[styles.stepText, { color: getTextColor() }]}>Ensure good lighting and clear visibility</ThemedText>
                            </View>
                            <View style={styles.instructionStep}>
                                <View style={[styles.stepNumber, { backgroundColor: 'rgba(255, 255, 255, 0.3)' }]}>
                                    <ThemedText style={[styles.stepNumberText, { color: getTextColor() }]}>3</ThemedText>
                                </View>
                                <ThemedText style={[styles.stepText, { color: getTextColor() }]}>Tap capture when ready</ThemedText>
                            </View>
                        </View>
                    </View>
                </View>
            </View>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
  // Modern Scan Frame Styles
  scanFrameContainer: {
    position: 'absolute',
    top: '20%',
    left: '10%',
    width: '80%',
    aspectRatio: 1,
    zIndex: 5,
  },
  scanFrame: {
    flex: 1,
    position: 'relative',
  },
  scanFrameCorner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#FFFFFF',
    borderWidth: 3,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderTopWidth: 0,
    borderRightWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
  },

  // Modern Header Styles
  modernHeader: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 10,
  },
  headerBlurContainer: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
    letterSpacing: 0.3,
    // Color will be set dynamically
  },
  modernSettingsButton: {
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Modern Instructions Styles
  modernInstructionsContainer: {
    position: 'absolute',
    bottom: 140,
    left: 20,
    right: 20,
    zIndex: 10,
  },
  instructionsBlurContainer: {
    // Removed blur styling - now transparent
  },
  instructionsContent: {
    padding: 15,
    paddingLeft: 40,
    paddingBottom: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.20)',
    borderRadius: 40,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  captureButtonInInstructions: {
    alignItems: 'center',
    marginBottom: 16,
  },
  instructionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  instructionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    // Color will be set dynamically
  },
  instructionSteps: {
    gap: 10,
  },
  instructionStep: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepNumber: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    // Background color will be set dynamically
  },
  stepNumberText: {
    fontSize: 10,
    fontWeight: '700',
    // Color will be set dynamically
  },
  stepText: {
    flex: 1,
    fontSize: 12,
    opacity: 0.9,
    lineHeight: 16,
    // Color will be set dynamically
  },

  // Modern Capture Button Styles
  modernCaptureContainer: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  modernCaptureBlurContainer: {
    borderRadius: 50,
    overflow: 'hidden',
  },
  modernCaptureButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
    backgroundColor: 'transparent',
  },
  modernCaptureButtonActive: {
    transform: [{ scale: 0.95 }],
  },
  captureButtonContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  modernCaptureText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
    // Color will be set dynamically
  },
  modernCaptureTextActive: {
    color: '#FFFFFF',
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 40,
  },
  uploadingText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
    // Color will be set dynamically
  },

  // Legacy styles (keeping for compatibility)
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  blurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  blurContent: {
    flex: 1,
  },
});
