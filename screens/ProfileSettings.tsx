import { FontAwesome6 } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useAuth } from '../App';
import { THEME_COLORS } from '../constants/Theme';
import { imageCacheService } from '../services/imageCacheService';
import { profileService } from '../services/profileService';

interface ProfileSettingsProps {
    onClose: () => void;
}

// Pre-defined profile illustrations
const PROFILE_ILLUSTRATIONS = [
    { id: 1, source: require('../assets/images/profile-illustrations/profile_illustration_1.png') },
    { id: 2, source: require('../assets/images/profile-illustrations/profile_illustration_2.png') },
    { id: 3, source: require('../assets/images/profile-illustrations/profile_illustration_3.png') },
    { id: 4, source: require('../assets/images/profile-illustrations/profile_illustration_4.png') },
    { id: 5, source: require('../assets/images/profile-illustrations/profile_illustration_5.png') },
    { id: 6, source: require('../assets/images/profile-illustrations/profile_illustration_6.png') },
    { id: 7, source: require('../assets/images/profile-illustrations/profile_illustration_7.png') },
    { id: 8, source: require('../assets/images/profile-illustrations/profile_illustration_8.png') },
    { id: 9, source: require('../assets/images/profile-illustrations/profile_illustration_9.png') },
];

export default function ProfileSettings({ onClose }: ProfileSettingsProps) {
    const { userInfo } = useAuth();
    const [selectedPhoto, setSelectedPhoto] = useState<string>('illustration_1');
    const [customPhotoUri, setCustomPhotoUri] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [currentProfileUrl, setCurrentProfileUrl] = useState<string | null>(null);
    
    useEffect(() => {
        loadCurrentProfile();
    }, []);
    
    const loadCurrentProfile = async () => {
        try {
            const profile = await profileService.getCurrentUserProfile();
            if (profile?.profile_picture_url) {
                setCurrentProfileUrl(profile.profile_picture_url);
                setSelectedPhoto('custom');
            } else if (userInfo?.profilePhoto) {
                setSelectedPhoto(userInfo.profilePhoto);
            }
        } catch (error) {
            console.log('Error loading profile:', error);
        }
    };

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
            Alert.alert('Gallery permission is required to select photos.');
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
            setCustomPhotoUri(result.assets[0].uri);
            setSelectedPhoto('custom');
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
            setCustomPhotoUri(result.assets[0].uri);
            setSelectedPhoto('custom');
        }
    };

    const showImagePickerOptions = () => {
        Alert.alert(
            'Update Profile Photo',
            'Choose how you want to update your profile photo',
            [
                { text: 'Camera', onPress: takePhoto },
                { text: 'Gallery', onPress: selectFromGallery },
                { text: 'Cancel', style: 'cancel' }
            ]
        );
    };

    const handleIllustrationSelect = (illustrationId: number) => {
        setSelectedPhoto(`illustration_${illustrationId}`);
        setCustomPhotoUri(null);
    };

    const handleSave = async () => {
        if (!userInfo?.id) {
            Alert.alert('Error', 'User not authenticated');
            return;
        }

        setIsUploading(true);

        try {
            if (selectedPhoto === 'custom' && customPhotoUri) {
                // Upload new custom photo to Supabase
                console.log('📤 [ProfileSettings] Uploading custom photo:', customPhotoUri);
                const publicUrl = await profileService.uploadAndUpdateProfilePicture(customPhotoUri);
                console.log('✅ [ProfileSettings] Photo uploaded successfully:', publicUrl);
                
                // Invalidar o cache local para forçar atualização
                await imageCacheService.invalidateUserCache(userInfo.id);
                console.log('🔄 [ProfileSettings] Cache invalidated for user:', userInfo.id);
                
                Alert.alert(
                    'Success!',
                    'Your profile photo has been updated successfully.',
                    [{ text: 'OK', onPress: onClose }]
                );
            } else {
                // Update profile with selected illustration
                await profileService.upsertProfile({
                    email: userInfo.email || '',
                    name: userInfo.name || '',
                    grading_system: userInfo.gradingSystem || 'yds'
                });
                
                // Also update user metadata for consistency
                const { supabase } = require('../lib/supabase');
                await supabase.auth.updateUser({
                    data: {
                        profilePhoto: selectedPhoto,
                    }
                });
                
                // Invalidar o cache local para garantir que a nova ilustração seja mostrada
                await imageCacheService.invalidateUserCache(userInfo.id);
                console.log('🔄 [ProfileSettings] Cache invalidated for illustration change:', userInfo.id);
                
                Alert.alert(
                    'Success!',
                    'Your profile photo has been updated successfully.',
                    [{ text: 'OK', onPress: onClose }]
                );
            }
        } catch (error) {
            console.error('Error updating profile photo:', error);
            Alert.alert(
                'Error',
                'Failed to update your profile photo. Please try again.',
                [{ text: 'OK' }]
            );
        } finally {
            setIsUploading(false);
        }
    };

    const getSelectedImageSource = () => {
        if (selectedPhoto === 'custom') {
            if (customPhotoUri) {
                return { uri: customPhotoUri };
            } else if (currentProfileUrl) {
                return { uri: currentProfileUrl };
            }
        }
        
        const illustrationId = selectedPhoto.replace('illustration_', '');
        const illustration = PROFILE_ILLUSTRATIONS.find(ill => ill.id.toString() === illustrationId);
        return illustration ? illustration.source : PROFILE_ILLUSTRATIONS[0].source;
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={THEME_COLORS.bluePrimary} translucent={false} />
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onClose} style={styles.backButton}>
                    <FontAwesome6 name="arrow-left" size={20} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Profile Settings</Text>
                <View style={styles.headerSpacer} />
            </View>

            {/* Content */}
            <View style={styles.content}>
                <Text style={styles.title}>Update profile photo</Text>
                <Text style={styles.subtitle}>
                    Choose a new profile photo to personalize your climbing journey.
                </Text>

                {/* Selected Photo Preview */}
                <View style={styles.selectedPhotoContainer}>
                    <Image source={getSelectedImageSource()} style={styles.selectedPhoto} />
                </View>

                {/* Choose Photo Label */}
                <Text style={styles.sectionTitle}>Choose Photo</Text>

                {/* Profile Illustrations Scroll */}
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    style={styles.illustrationsScroll}
                    contentContainerStyle={styles.illustrationsContainer}
                >
                    {PROFILE_ILLUSTRATIONS.map((illustration) => (
                        <TouchableOpacity
                            key={illustration.id}
                            style={[
                                styles.illustrationButton,
                                selectedPhoto === `illustration_${illustration.id}` && styles.illustrationSelected
                            ]}
                            onPress={() => handleIllustrationSelect(illustration.id)}
                        >
                            <Image source={illustration.source} style={styles.illustrationImage} />
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Add Custom Photo Button */}
                <TouchableOpacity 
                    style={[
                        styles.customPhotoButton,
                        selectedPhoto === 'custom' && styles.customPhotoSelected
                    ]} 
                    onPress={showImagePickerOptions}
                >
                    <FontAwesome6 name="camera" size={20} color={selectedPhoto === 'custom' ? '#FFF' : THEME_COLORS.bluePrimary} />
                    <Text style={[
                        styles.customPhotoText,
                        selectedPhoto === 'custom' && styles.customPhotoTextSelected
                    ]}>
                        {selectedPhoto === 'custom' ? 'Change custom photo' : 'Add custom photo'}
                    </Text>
                </TouchableOpacity>

                {/* Save Button */}
                <View style={styles.buttonsContainer}>
                    <TouchableOpacity 
                        style={[styles.saveButton, isUploading && styles.saveButtonDisabled]} 
                        onPress={handleSave}
                        disabled={isUploading}
                    >
                        {isUploading ? (
                            <ActivityIndicator color="#FFF" size="small" />
                        ) : (
                            <Text style={styles.saveButtonText}>Save Changes</Text>
                        )}
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
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 50,
        paddingHorizontal: 20,
        paddingBottom: 20,
        justifyContent: 'space-between',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFF',
    },
    headerSpacer: {
        width: 40, // Same as backButton to center the title
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
        marginBottom: 32,
        lineHeight: 24,
    },
    selectedPhotoContainer: {
        alignItems: 'center',
        marginBottom: 32,
    },
    selectedPhoto: {
        width: 120,
        height: 120,
        borderRadius: 60,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 16,
    },
    illustrationsScroll: {
        marginBottom: 24,
    },
    illustrationsContainer: {
        paddingRight: 16,
    },
    illustrationButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        marginRight: 16,
        borderWidth: 2,
        borderColor: 'transparent',
        overflow: 'hidden',
    },
    illustrationSelected: {
        borderColor: THEME_COLORS.bluePrimary,
        borderWidth: 3,
    },
    illustrationImage: {
        width: '100%',
        height: '100%',
        borderRadius: 33,
    },
    customPhotoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: THEME_COLORS.bluePrimary,
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginBottom: 32,
    },
    customPhotoSelected: {
        backgroundColor: THEME_COLORS.bluePrimary,
    },
    customPhotoText: {
        fontSize: 16,
        fontWeight: '600',
        color: THEME_COLORS.bluePrimary,
        marginLeft: 8,
    },
    customPhotoTextSelected: {
        color: '#FFF',
    },
    buttonsContainer: {
        marginTop: 'auto',
    },
    saveButton: {
        backgroundColor: THEME_COLORS.bluePrimary,
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
        minHeight: 48,
        justifyContent: 'center',
    },
    saveButtonDisabled: {
        backgroundColor: '#999',
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
