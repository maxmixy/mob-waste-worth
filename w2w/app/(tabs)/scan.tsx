import { CameraView, useCameraPermissions } from 'expo-camera';
import { BlurView } from 'expo-blur';
import { StyleSheet } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';

import { HelloWave } from '@/components/HelloWave';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function HomeScreen() {
    const isFocused = useIsFocused();
    const [cameraPermission, requestCameraPermission] = useCameraPermissions();
    const cameraRef = useRef<CameraView>(null);
    const [isCameraReady, setIsCameraReady] = useState(false);
    
    useEffect(() => {
        if (!cameraPermission?.granted) {
        requestCameraPermission();
        }
    }, [cameraPermission]);
    
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
                const photo = await cameraRef.current.takePictureAsync();
                // Handle the captured photo as needed
                console.log('Captured photo:', photo);
            } catch (error) {
                console.error('Error capturing photo:', error);
            }
        }
    };

    return (
        <ThemedView style={{ flex: 1 }}>
            {isFocused && (
                <CameraView
                    ref={cameraRef}
                    style={{ flex: 1 }}
                    facing="back"
                />
            )}
            <ThemedView style={styles.topWindow} pointerEvents="none" />
            <ThemedView style={styles.bottomWindow} pointerEvents="none">
                <ThemedText type="title" style={styles.centeredText}>Scan Your Waste</ThemedText>
                <ThemedText type="subtitle" style={styles.centeredText}>Point the camera at your waste item. Ensure that the item is in clear view, with no obstructions.</ThemedText>
            </ThemedView>
            {/* Capture Image Button */}
            <ThemedView style={styles.captureButtonContainer} pointerEvents="auto">
                <ThemedText style={styles.captureButton} onPress={handleCaptureImage}>Capture</ThemedText>
            </ThemedView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  topWindow: {
    position: 'absolute',
    top: '15%',
    left: '10%',
    width: '80%',
    aspectRatio: 1,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: '#fff',
    backgroundColor: 'rgba(0,0,0,0.0)',
    zIndex: 2,
  },
  bottomWindow: {
    position: 'absolute',
    top: '60%',
    left: '10%',
    width: '80%',
    height: 150,
    borderRadius: 24,
    borderWidth: 0,
    borderColor: '#fff',
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centeredText: {
    textAlign: 'center',
  },
  captureButtonContainer: {
    position: 'absolute',
    bottom: 105,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
    backgroundColor: 'transparent',
  },
  captureButton: {
    backgroundColor: '#fff',
    color: '#222',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 32,
    fontWeight: 'bold',
    fontSize: 18,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
});
