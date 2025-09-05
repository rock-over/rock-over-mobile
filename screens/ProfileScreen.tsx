import { FontAwesome, FontAwesome5, Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { THEME_COLORS } from '../constants/Theme';
import { imageCacheService } from '../services/imageCacheService';

interface ProfileScreenProps {
  userInfo?: {
    id: string;
    name: string | null;
    email: string;
    photo: string | null;
    profilePhoto?: string;
    gradingSystem?: string;
  } | null;
  onLogout?: () => void;
}

export default function ProfileScreen({ userInfo, onLogout }: ProfileScreenProps) {
  const [profileImageSource, setProfileImageSource] = useState<any>(null);
  const [profileImageLoading, setProfileImageLoading] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Carregamento da imagem de perfil
  useEffect(() => {
    if (userInfo?.id) {
      loadProfileImage();
    }
  }, [userInfo?.id]);

  const loadProfileImage = async () => {
    if (!userInfo?.id) return;
    
    try {
      setProfileImageLoading(true);
      const imageResult = await imageCacheService.getProfileImage(userInfo.id);
      setProfileImageSource(imageResult.source);
    } catch (error) {
      console.error('Error loading profile image:', error);
      const fallback = imageCacheService.getFallbackImage();
      setProfileImageSource(fallback.source);
    } finally {
      setProfileImageLoading(false);
    }
  };

  const handleChangePhoto = () => {
    Alert.alert(
      'Change Profile Photo',
      'Choose how you want to update your profile photo',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: () => console.log('Take photo') },
        { text: 'Choose from Gallery', onPress: () => console.log('Choose from gallery') },
      ]
    );
  };

  const handleChangeGradeSystem = () => {
    Alert.alert(
      'Change Grade System',
      'Select your preferred climbing grade system',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'V-Scale (Bouldering)', onPress: () => console.log('V-Scale') },
        { text: 'YDS (Sport)', onPress: () => console.log('YDS') },
        { text: 'French', onPress: () => console.log('French') },
      ]
    );
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    setShowLogoutModal(false);
    onLogout?.();
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  const getFirstName = (name: string | null | undefined) => {
    if (!name) return 'User';
    return name.split(' ')[0];
  };

  const getProfileImageSource = () => {
    if (profileImageLoading) {
      return require('../assets/images/profile-illustrations/profile_illustration_1.png');
    }
    return profileImageSource || require('../assets/images/profile-illustrations/profile_illustration_1.png');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Content */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          {/* Profile Image */}
          <View style={styles.profileImageContainer}>
            {profileImageLoading ? (
              <View style={[styles.profileImage, styles.profileImageLoading]}>
                <ActivityIndicator size="large" color={THEME_COLORS.bluePrimary} />
              </View>
            ) : (
              <Image 
                source={getProfileImageSource()} 
                style={styles.profileImage}
                onError={() => {
                  const fallback = require('../assets/images/profile-illustrations/profile_illustration_1.png');
                  setProfileImageSource(fallback);
                }}
              />
            )}
            
            {/* Change Photo Button */}
            <TouchableOpacity 
              style={styles.changePhotoButton}
              onPress={handleChangePhoto}
            >
              <FontAwesome name="camera" size={16} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* User Name */}
          <Text style={styles.userName}>
            {getFirstName(userInfo?.name)}
          </Text>
          
          {/* User Email */}
          <Text style={styles.userEmail}>
            {userInfo?.email}
          </Text>
        </View>

        {/* Actions Section */}
        <View style={styles.actionsSection}>
          {/* Change Photo Action */}
          <TouchableOpacity style={styles.actionItem} onPress={handleChangePhoto}>
            <View style={styles.actionLeft}>
              <View style={[styles.actionIcon, { backgroundColor: '#E3F2FD' }]}>
                <FontAwesome name="camera" size={20} color={THEME_COLORS.bluePrimary} />
              </View>
              <View style={styles.actionText}>
                <Text style={styles.actionTitle}>Change Profile Photo</Text>
                <Text style={styles.actionSubtitle}>Update your profile picture</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          {/* Change Grade System Action */}
          <TouchableOpacity style={styles.actionItem} onPress={handleChangeGradeSystem}>
            <View style={styles.actionLeft}>
              <View style={[styles.actionIcon, { backgroundColor: '#F3E5F5' }]}>
                <FontAwesome5 name="mountain" size={18} color="#9C27B0" />
              </View>
              <View style={styles.actionText}>
                <Text style={styles.actionTitle}>Grade System</Text>
                <Text style={styles.actionSubtitle}>
                  Current: {userInfo?.gradingSystem || 'V-Scale'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          {/* Logout Action */}
          <TouchableOpacity style={styles.actionItem} onPress={handleLogout}>
            <View style={styles.actionLeft}>
              <View style={[styles.actionIcon, { backgroundColor: '#FFEBEE' }]}>
                <FontAwesome5 name="sign-out-alt" size={18} color="#F44336" />
              </View>
              <View style={styles.actionText}>
                <Text style={styles.actionTitle}>Logout</Text>
                <Text style={styles.actionSubtitle}>Sign out of your account</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutModal}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelLogout}
      >
        <View style={modalStyles.overlay}>
          <View style={modalStyles.container}>
            {/* Icon */}
            <View style={modalStyles.iconContainer}>
              <FontAwesome5 name="sign-out-alt" size={32} color="#F44336" />
            </View>

            {/* Title */}
            <Text style={modalStyles.title}>Logout</Text>
            
            {/* Message */}
            <Text style={modalStyles.message}>
              Are you sure you want to logout from your account?
            </Text>

            {/* Buttons */}
            <View style={modalStyles.buttonsContainer}>
              <TouchableOpacity 
                style={[modalStyles.button, modalStyles.cancelButton]} 
                onPress={cancelLogout}
              >
                <Text style={modalStyles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[modalStyles.button, modalStyles.logoutButton]} 
                onPress={confirmLogout}
              >
                <Text style={modalStyles.logoutButtonText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  profileSection: {
    backgroundColor: THEME_COLORS.bluePrimary,
    alignItems: 'center',
    paddingVertical: 20,
    paddingTop: 60,
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 6,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#fff',
  },
  profileImageLoading: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  changePhotoButton: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME_COLORS.bluePrimary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 0,
    textAlign: 'center',
  },
  userEmail: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  actionsSection: {
    backgroundColor: '#fff',
    marginHorizontal: 0,
    marginBottom: 20,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionText: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME_COLORS.text.primary,
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 14,
    color: THEME_COLORS.text.secondary,
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: THEME_COLORS.text.primary,
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: THEME_COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  buttonsContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  logoutButton: {
    backgroundColor: '#F44336',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME_COLORS.text.primary,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
