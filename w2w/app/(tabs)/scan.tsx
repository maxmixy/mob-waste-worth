import { CameraView, useCameraPermissions } from 'expo-camera';
import { BlurView } from 'expo-blur';
import { StyleSheet } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { Platform, Alert } from 'react-native';
import { ActivityIndicator } from 'react-native';

import { HelloWave } from '@/components/HelloWave';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

// Update this URL to the address where your PHP endpoint is reachable from the device/emulator
const UPLOAD_URL = 'https://red-goat-592690.hostingersite.com/upload.php';

export default function HomeScreen() {
    const isFocused = useIsFocused();
    const [cameraPermission, requestCameraPermission] = useCameraPermissions();
    const cameraRef = useRef<CameraView>(null);
    const [isCameraReady, setIsCameraReady] = useState(false);
    const [uploading, setUploading] = useState(false);
    
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

                // Create a blob from the local file URI and append it to FormData.
                // This is more reliable than passing the `{ uri, name, type }` object on some platforms.
                let res;
                try {
                    const fileResponse = await fetch(uri);
                    const blob = await fileResponse.blob();

                    const form = new FormData();
                    form.append('image', blob as any, filename);

                    res = await fetch(UPLOAD_URL, {
                        method: 'POST',
                        body: form,
                        // let fetch set Content-Type including boundary
                    });
                } catch (uploadErr) {
                    console.error('Upload failed (blob fallback):', uploadErr);
                    // Try fallback: append uri object (some environments accept this)
                    try {
                        const form2 = new FormData();
                        form2.append('image', {
                            uri: uri,
                            name: filename,
                            type: mime,
                        } as any);
                        res = await fetch(UPLOAD_URL, { method: 'POST', body: form2 });
                    } catch (uploadErr2) {
                        console.error('Upload fallback also failed:', uploadErr2);
                        throw uploadErr2;
                    }
                }
 
                 const text = await res.text();
                 let json = null;
                 try { json = JSON.parse(text); } catch (e) { json = { raw: text }; }
                 console.log('Upload response', json);
                 Alert.alert('Upload result', JSON.stringify(json?.classification || json));
                 setUploading(false);
            } catch (error) {
                setUploading(false);
                console.error('Error capturing photo:', error);
                Alert.alert('Error', String(error));
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
                {uploading ? (
                    <ActivityIndicator size="large" color="#fff" />
                ) : (
                    <ThemedText style={styles.captureButton} onPress={handleCaptureImage}>Capture</ThemedText>
                )}
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
