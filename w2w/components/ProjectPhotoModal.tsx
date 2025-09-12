import React, { useState } from 'react';
import { Modal, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useColorScheme } from '@/hooks/useColorScheme';
import * as ImagePicker from 'expo-image-picker';
import { projectPhotoService } from '@/lib/projectPhotoService';

interface ProjectPhotoModalProps {
    visible: boolean;
    onClose: () => void;
    onPhotoUploaded: (photoUrl: string) => void;
    projectId: string;
    userId: string;
    projectName: string;
}

export default function ProjectPhotoModal({
    visible,
    onClose,
    onPhotoUploaded,
    projectId,
    userId,
    projectName
}: ProjectPhotoModalProps) {
    const [loading, setLoading] = useState(false);
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const textColor = isDark ? '#ffffff' : '#000000';
    const backgroundColor = isDark ? '#1a1a1a' : '#ffffff';
    const cardBackgroundColor = isDark ? '#2a2a2a' : '#f5f5f5';
    const buttonColor = isDark ? '#007AFF' : '#007AFF';

    const handleTakePhoto = async () => {
        try {
            // Request camera permissions
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Camera permission is needed to take photos.');
                return;
            }

            setLoading(true);

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
                base64: true,
            });

            if (!result.canceled && result.assets[0]) {
                await uploadPhoto(result.assets[0].base64 || '');
            }
        } catch (error) {
            console.error('[Project Photo Modal] Error taking photo:', error);
            Alert.alert('Error', 'Failed to take photo. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectFromGallery = async () => {
        try {
            // Request media library permissions
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Photo library permission is needed to select photos.');
                return;
            }

            setLoading(true);

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
                base64: true,
            });

            if (!result.canceled && result.assets[0]) {
                await uploadPhoto(result.assets[0].base64 || '');
            }
        } catch (error) {
            console.error('[Project Photo Modal] Error selecting photo:', error);
            Alert.alert('Error', 'Failed to select photo. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const uploadPhoto = async (base64Data: string) => {
        try {
            const response = await projectPhotoService.uploadProjectPhoto(
                projectId,
                userId,
                base64Data
            );

            if (response.success && response.photo_url) {
                Alert.alert(
                    'Success!',
                    'Your project photo has been uploaded successfully.',
                    [
                        {
                            text: 'OK',
                            onPress: () => {
                                onPhotoUploaded(response.photo_url!);
                                onClose();
                            }
                        }
                    ]
                );
            } else {
                Alert.alert('Upload Failed', response.error || 'Failed to upload photo. Please try again.');
            }
        } catch (error) {
            console.error('[Project Photo Modal] Error uploading photo:', error);
            Alert.alert('Error', 'Failed to upload photo. Please try again.');
        }
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <ThemedView style={styles.centeredView}>
                <ThemedView style={[styles.modalView, { backgroundColor: cardBackgroundColor }]}>
                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <MaterialIcons name="close" size={24} color={textColor} />
                    </TouchableOpacity>

                    <ThemedText type="title" style={styles.title}>
                        Share Your Project!
                    </ThemedText>

                    <ThemedText style={styles.subtitle}>
                        Congratulations on completing "{projectName}"! 
                        Share a photo of your finished project to inspire others.
                    </ThemedText>

                    {loading ? (
                        <ThemedView style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={buttonColor} />
                            <ThemedText style={styles.loadingText}>
                                {loading}
                            </ThemedText>
                        </ThemedView>
                    ) : (
                        <ThemedView style={styles.buttonContainer}>
                            <TouchableOpacity
                                style={[styles.button, { backgroundColor: buttonColor }]}
                                onPress={handleTakePhoto}
                                activeOpacity={0.7}
                            >
                                <MaterialIcons name="camera-alt" size={24} color="white" />
                                <ThemedText style={styles.buttonText}>
                                    Take Photo
                                </ThemedText>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.button, { backgroundColor: buttonColor }]}
                                onPress={handleSelectFromGallery}
                                activeOpacity={0.7}
                            >
                                <MaterialIcons name="photo-library" size={24} color="white" />
                                <ThemedText style={styles.buttonText}>
                                    Choose from Gallery
                                </ThemedText>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.skipButton, { borderColor: textColor }]}
                                onPress={onClose}
                                activeOpacity={0.7}
                            >
                                <ThemedText style={[styles.skipButtonText, { color: textColor }]}>
                                    Skip for Now
                                </ThemedText>
                            </TouchableOpacity>
                        </ThemedView>
                    )}
                </ThemedView>
            </ThemedView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalView: {
        margin: 20,
        borderRadius: 20,
        padding: 35,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        minWidth: 300,
        maxWidth: 400,
    },
    closeButton: {
        position: 'absolute',
        top: 15,
        right: 15,
        padding: 5,
    },
    title: {
        marginBottom: 10,
        textAlign: 'center',
        fontSize: 24,
        fontWeight: 'bold',
    },
    subtitle: {
        marginBottom: 30,
        textAlign: 'center',
        fontSize: 16,
        lineHeight: 22,
        opacity: 0.8,
    },
    buttonContainer: {
        width: '100%',
        alignItems: 'center',
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15,
        paddingHorizontal: 30,
        borderRadius: 25,
        marginBottom: 15,
        minWidth: 200,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 10,
    },
    skipButton: {
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 25,
        borderWidth: 1,
        marginTop: 10,
    },
    skipButtonText: {
        fontSize: 16,
        fontWeight: '500',
    },
    loadingContainer: {
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        opacity: 0.7,
    },
});
