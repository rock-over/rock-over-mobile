import { FontAwesome6 } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
    Alert,
    Image,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { THEME_COLORS } from '../constants/Theme';

interface ProfilePhotoProps {
    onContinue: (photoUri?: string) => void;
    onSkip: () => void;
}

export default function ProfilePhoto({ onContinue, onSkip }: ProfilePhotoProps) {
    const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

    const requestCameraPermission = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Camera permission is required to take photos.');
            return false;
        }
        return true;
    };

    const requestGalleryPermission = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Gallery permission is required to select photos.');
            return false;
        }
        return true;
    };

    const takePhoto = async () => {
        const hasPermission = await requestCameraPermission();
        if (!hasPermission) return;

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });

        if (!result.canceled && result.assets[0]) {
            setSelectedPhoto(result.assets[0].uri);
        }
    };

    const selectFromGallery = async () => {
        const hasPermission = await requestGalleryPermission();
        if (!hasPermission) return;

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });

        if (!result.canceled && result.assets[0]) {
            setSelectedPhoto(result.assets[0].uri);
        }
    };

    const showImagePickerOptions = () => {
        Alert.alert(
            'Select Photo',
            'Choose how you want to add your profile photo',
            [
                { text: 'Camera', onPress: takePhoto },
                { text: 'Gallery', onPress: selectFromGallery },
                { text: 'Cancel', style: 'cancel' }
            ]
        );
    };

    const handleContinue = () => {
        onContinue(selectedPhoto || undefined);
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={THEME_COLORS.bluePrimary} />
            
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <View style={styles.logoContainer}>
                        <Text style={styles.logoText}>RV</Text>
                    </View>
                </View>
            </View>

            {/* Content */}
            <View style={styles.content}>
                <Text style={styles.title}>Add Profile Photo</Text>
                <Text style={styles.subtitle}>
                    Let others see who you are! Add a profile photo to personalize your climbing journey.
                </Text>

                {/* Photo Container */}
                <View style={styles.photoContainer}>
                    <TouchableOpacity style={styles.photoButton} onPress={showImagePickerOptions}>
                        {selectedPhoto ? (
                            <Image source={{ uri: selectedPhoto }} style={styles.photoPreview} />
                        ) : (
                            <View style={styles.photoPlaceholder}>
                                <FontAwesome6 name="camera" size={32} color="#999" />
                                <Text style={styles.photoPlaceholderText}>Add Photo</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                    
                    {selectedPhoto && (
                        <TouchableOpacity 
                            style={styles.changePhotoButton} 
                            onPress={showImagePickerOptions}
                        >
                            <FontAwesome6 name="pencil" size={16} color={THEME_COLORS.bluePrimary} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Buttons */}
                <View style={styles.buttonsContainer}>
                    <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
                        <Text style={styles.skipButtonText}>Skip for now</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
                        <Text style={styles.continueButtonText}>Continue</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: THEME_COLORS.bluePrimary,
    },
    header: {
        paddingTop: 50,
        paddingHorizontal: 20,
        paddingBottom: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerContent: {
        alignItems: 'center',
    },
    logoContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFF',
    },
    content: {
        flex: 1,
        backgroundColor: '#FFF',
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        paddingHorizontal: 32,
        paddingTop: 40,
        paddingBottom: 40,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'left',
        marginBottom: 16,
        letterSpacing: 1,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'left',
        marginBottom: 40,
        lineHeight: 24,
    },
    photoContainer: {
        alignItems: 'center',
        marginBottom: 60,
        position: 'relative',
    },
    photoButton: {
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: '#F8F9FA',
        borderWidth: 2,
        borderColor: '#E9ECEF',
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    photoPreview: {
        width: '100%',
        height: '100%',
        borderRadius: 73,
    },
    photoPlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    photoPlaceholderText: {
        fontSize: 14,
        color: '#999',
        marginTop: 8,
        fontWeight: '500',
    },
    changePhotoButton: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#FFF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: THEME_COLORS.bluePrimary,
    },
    buttonsContainer: {
        gap: 16,
    },
    skipButton: {
        backgroundColor: 'transparent',
        borderRadius: 8,
        paddingVertical: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E9ECEF',
        minHeight: 36,
    },
    skipButtonText: {
        color: '#666',
        fontSize: 16,
        fontWeight: '500',
    },
    continueButton: {
        backgroundColor: THEME_COLORS.bluePrimary,
        borderRadius: 8,
        paddingVertical: 8,
        alignItems: 'center',
        minHeight: 36,
    },
    continueButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
}); 