import { FontAwesome6 } from '@expo/vector-icons';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Image, Modal, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SessionCard from '../components/SessionCard'; // Importar o novo card
import { THEME_COLORS } from '../constants/Theme';
import { ClimbingSession, climbingSessionService } from '../services/climbingSessionService';
import { uploadImageAsync } from '../services/uploadImage';
import SessionDetails from './SessionDetails';

interface HomeProps {
  onLogout?: () => void;
  userInfo?: {
    id: string;
    name: string | null;
    email: string;
    photo: string | null;
    profilePhoto?: string;
  } | null;
}

export default function Home({ onLogout, userInfo }: HomeProps) {
  const [sessions, setSessions] = useState<ClimbingSession[]>([]);
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<ClimbingSession | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    if (userInfo?.email) {
      loadSessions();
    }
  }, [userInfo?.email]);

  const loadSessions = async () => {
    if (!userInfo?.email) return;
    
    try {
      setLoading(true);
      const userSessions = await climbingSessionService.getUserSessions(userInfo.email);
      setSessions(userSessions);
    } catch (error) {
      console.error('Erro ao carregar sessões:', error);
      Alert.alert('Erro', 'Não foi possível carregar suas sessões');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      // Sign out from Google
      await GoogleSignin.signOut();
      
      // Clear any cached Google account selection
      await GoogleSignin.revokeAccess();
      
      onLogout?.();
    } catch (error) {
      console.log('Error signing out:', error);
      // Call logout anyway to clear local state
      onLogout?.();
    }
  };

  const handleSaveSession = async (sessionData: any) => {
    if (!userInfo?.email) {
      Alert.alert('Erro', 'Usuário não identificado');
      return;
    }

    try {
      const { image, ...rest } = sessionData as any;
      let imagePath: string | null = null;

      if (image) {
        try {
          imagePath = await uploadImageAsync(image, userInfo.id);
        } catch (uploadErr) {
          console.error('Erro ao fazer upload da imagem:', uploadErr);
        }
      }

      const sessionWithUser = {
        ...rest,
        images: imagePath ? [imagePath] : null,
        user_email: userInfo.email,
      };

      const newSession = await climbingSessionService.createSession(sessionWithUser);

      // attach first image for local rendering convenience
      const sessionForList = {
        ...newSession,
        image: image ?? null,
      };

      setSessions(prev => [sessionForList, ...prev]);
      // form screen already closed via navigation.goBack()
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Erro ao salvar sessão:', error);
      Alert.alert('Erro', 'Não foi possível salvar a sessão. Tente novamente.');
    }
  };

  const handleAddAnotherLog = () => {
    setShowSuccessModal(false);
    navigation.navigate('ClimbingSessionForm', { userInfo, onSave: handleSaveSession });
  };

  const handleBackToHome = () => {
    setShowSuccessModal(false);
  };

  const handleCardPress = (session: ClimbingSession) => {
    setSelectedSession(session);
  };

  const capitalizeWords = (str: string | null) => {
    if (!str) return '';
    return str.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  const renderSessionCard = ({ item }: { item: ClimbingSession }) => {
    return (
      <SessionCard
        session={item}
        onPress={() => handleCardPress(item)}
      />
    );
  };

  const renderSuccessModal = () => {
    if (!showSuccessModal) return null;

    return (
      <Modal
        visible={showSuccessModal}
        transparent={true}
        statusBarTranslucent={true}
        onRequestClose={handleBackToHome}
        animationType="slide"
      >
        <StatusBar barStyle="light-content" backgroundColor={THEME_COLORS.bluePrimary} />
        
        {/* Full screen overlay - clickable to close */}
        <TouchableOpacity 
          style={successStyles.fullScreenOverlay}
          activeOpacity={1}
          onPress={handleBackToHome}
        >
          {/* Modal container - prevent close when touching inside */}
          <TouchableOpacity 
            style={successStyles.modalContainer}
            activeOpacity={1}
            onPress={() => {}} // Prevent event bubbling
          >
            {/* Content */}
            <View style={successStyles.content}>
              {/* Success Icon */}
              <View style={successStyles.iconContainer}>
                <Image 
                  source={require('../assets/images/log-session-completed.png')} 
                  style={successStyles.successImage}
                  resizeMode="contain"
                />
              </View>
              
              {/* Success Message */}
              <Text style={successStyles.title}>Congratulations!</Text>
              <Text style={successStyles.subtitle}>Your climbing session has been saved successfully!</Text>
            </View>

            {/* Button Stack */}
            <View style={successStyles.buttonStack}>
              <TouchableOpacity 
                style={[successStyles.button, successStyles.primaryButton]} 
                onPress={handleBackToHome}
              >
                <Text style={[successStyles.buttonText, successStyles.primaryButtonText]}>Back to Home</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[successStyles.button, successStyles.secondaryButton]} 
                onPress={handleAddAnotherLog}
              >
                <Text style={[successStyles.buttonText, successStyles.secondaryButtonText]}>Add another session</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    );
  };

  // Function to get the profile image source
  const getProfileImageSource = () => {
    const profilePhoto = userInfo?.profilePhoto;
    
    // If no profile photo selected, use default illustration
    if (!profilePhoto) {
      return require('../assets/images/profile-illustrations/profile_illustration_1.png');
    }
    
    // If it's a custom photo (URI), return as URI
    if (profilePhoto.startsWith('file://') || profilePhoto.startsWith('content://') || profilePhoto.startsWith('http')) {
      return { uri: profilePhoto };
    }
    
    // If it's an illustration ID, return the corresponding image
    if (profilePhoto.startsWith('illustration_')) {
      const illustrationId = profilePhoto.replace('illustration_', '');
      try {
        switch (illustrationId) {
          case '1':
            return require('../assets/images/profile-illustrations/profile_illustration_1.png');
          case '2':
            return require('../assets/images/profile-illustrations/profile_illustration_2.png');
          case '3':
            return require('../assets/images/profile-illustrations/profile_illustration_3.png');
          case '4':
            return require('../assets/images/profile-illustrations/profile_illustration_4.png');
          case '5':
            return require('../assets/images/profile-illustrations/profile_illustration_5.png');
          case '6':
            return require('../assets/images/profile-illustrations/profile_illustration_6.png');
          case '7':
            return require('../assets/images/profile-illustrations/profile_illustration_7.png');
          case '8':
            return require('../assets/images/profile-illustrations/profile_illustration_8.png');
          case '9':
            return require('../assets/images/profile-illustrations/profile_illustration_9.png');
          default:
            return require('../assets/images/profile-illustrations/profile_illustration_1.png');
        }
      } catch (error) {
        console.log('Error loading profile illustration:', error);
        return require('../assets/images/profile-illustrations/profile_illustration_1.png');
      }
    }
    
    // Fallback to default illustration
    return require('../assets/images/profile-illustrations/profile_illustration_1.png');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={THEME_COLORS.bluePrimary} />
      
      {/* Blue Header */}
      <View style={styles.header}>
        <View style={styles.profileSection}>
          <TouchableOpacity onPress={handleLogout} style={styles.profileImageContainer}>
            <Image source={getProfileImageSource()} style={styles.profileImage} />
          </TouchableOpacity>
          
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeText} numberOfLines={1}>
              Welcome, {capitalizeWords(userInfo?.name || null) || 'Climber'}
            </Text>
            <Text style={styles.subtitleText}>Let's rock</Text>
          </View>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <FlatList
          data={sessions}
          renderItem={renderSessionCard}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
          refreshing={loading}
          onRefresh={loadSessions}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <FontAwesome6 name="mountain" size={48} color="#ccc" />
              <Text style={styles.emptyText}>
                {loading ? 'Loading sessions...' : 'No climbing sessions yet'}
              </Text>
              {!loading && (
                <Text style={styles.emptySubtext}>
                  Tap the + button to log your first climb!
                </Text>
              )}
            </View>
          }
        />
      </View>

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.floatingButton} 
        onPress={() => navigation.navigate('ClimbingSessionForm', { userInfo, onSave: handleSaveSession })}
      >
        <FontAwesome6 name="plus" size={20} color="#fff" />
      </TouchableOpacity>

      {/* Form screen is now navigated via React Navigation */}

      {/* Success Modal */}
      {renderSuccessModal()}

      {/* Modal de Detalhes da Sessão */}
      <Modal
        visible={selectedSession !== null}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        {selectedSession && (
          <SessionDetails
            session={selectedSession}
            onClose={() => setSelectedSession(null)}
          />
        )}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: THEME_COLORS.bluePrimary,
    paddingHorizontal: 20,
    paddingVertical: 24,
    paddingBottom: 32,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImageContainer: {
    marginRight: 16,
  },
  profileImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  defaultProfileImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  welcomeSection: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  subtitleText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    flex: 1,
    paddingTop: 20,
  },
  listContainer: {
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
    paddingBottom: 16,
  },
  cardMainContent: {
    flexDirection: 'row',
    paddingTop: 20,
    paddingLeft: 20,
  },
  gradeSection: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  gradeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  cardRightContent: {
    flex: 1,
    paddingLeft: 16,
    paddingRight: 10,
    paddingTop: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  titleSection: {
    flex: 1,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  cardTime: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
  },
  additionalInfo: {
    marginBottom: 12,
    marginTop: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
    lineHeight: 16,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 6,
  },
  tagText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  floatingButton: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: THEME_COLORS.bluePrimary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
});

const successStyles = StyleSheet.create({
  fullScreenOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 30,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 30,
  },
  iconContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successImage: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: THEME_COLORS.bluePrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  buttonStack: {
    flexDirection: 'column',
    gap: 12,
    paddingHorizontal: 0,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  button: {
    minHeight: 50,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: THEME_COLORS.bluePrimary,
  },
  primaryButton: {
    backgroundColor: THEME_COLORS.bluePrimary,
    borderWidth: 2,
    borderColor: THEME_COLORS.bluePrimary,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  secondaryButtonText: {
    color: THEME_COLORS.bluePrimary,
  },
  primaryButtonText: {
    color: '#fff',
  },
});
