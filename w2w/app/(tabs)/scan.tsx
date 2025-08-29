import { CameraView, useCameraPermissions } from 'expo-camera';
import { BlurView } from 'expo-blur';
import { StyleSheet } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { Platform, Alert } from 'react-native';
import { ActivityIndicator } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { router } from 'expo-router';

import { HelloWave } from '@/components/HelloWave';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

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
                 
                 // Navigate to detail page with the scan data
                 router.push({
                     pathname: '/pages/detail',
                     params: { scanData: JSON.stringify(json) }
                 });
                 
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
                <ThemedText type="subtitle" style={styles.centeredText}>Hold your waste item steady in front of the camera. <br/>
                Make sure it’s fully visible and nothing is blocking the view.</ThemedText>
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
