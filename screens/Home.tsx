import { FontAwesome6 } from '@expo/vector-icons';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Image, Modal, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { THEME_COLORS } from '../constants/Theme';
import { ClimbingSession, climbingSessionService } from '../services/climbingSessionService';
import ClimbingSessionForm from './ClimbingSessionForm';
import SessionDetails from './SessionDetails';

interface HomeProps {
  onLogout?: () => void;
  userInfo?: {
    name: string | null;
    email: string;
    photo: string | null;
    profilePhoto?: string;
  } | null;
}

export default function Home({ onLogout, userInfo }: HomeProps) {
  const [sessions, setSessions] = useState<ClimbingSession[]>([]);
  const [showForm, setShowForm] = useState(false);
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
      await GoogleSignin.signOut();
      onLogout?.();
    } catch (error) {
      console.log('Error signing out:', error);
    }
  };

  const handleSaveSession = async (sessionData: any) => {
    if (!userInfo?.email) {
      Alert.alert('Erro', 'Usuário não identificado');
      return;
    }

    try {
      // Adicionar email do usuário aos dados da sessão
      const sessionWithUser = {
        ...sessionData,
        user_email: userInfo.email,
      };

      const newSession = await climbingSessionService.createSession(sessionWithUser);
      setSessions(prev => [newSession, ...prev]);
      setShowForm(false);
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Erro ao salvar sessão:', error);
      Alert.alert('Erro', 'Não foi possível salvar a sessão. Tente novamente.');
    }
  };

  const handleAddAnotherLog = () => {
    setShowSuccessModal(false);
    setShowForm(true);
  };

  const handleBackToHome = () => {
    setShowSuccessModal(false);
  };

  const handleCardPress = (session: ClimbingSession) => {
    setSelectedSession(session);
  };

  const getCardColor = (session: ClimbingSession) => {
    // Use the color from session if available, otherwise default colors based on activity
    if (session.colour) {
      return session.colour;
    }
    
    // Default colors based on activity type
    switch (session.activity?.toLowerCase()) {
      case 'bouldering':
        return '#FF6B6B'; // Red
      case 'sport climbing':
        return '#4ECDC4'; // Teal
      case 'traditional':
        return '#45B7D1'; // Blue
      case 'indoor':
        return '#96CEB4'; // Green
      default:
        return '#FFA07A'; // Orange
    }
  };

  const formatTime = (timeString: string) => {
    try {
      const date = new Date(timeString);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return timeString;
    }
  };

  const capitalizeWords = (str: string | null) => {
    if (!str) return '';
    return str.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  const getClimbingTypeSubtitle = (session: ClimbingSession) => {
    const location = session.climbingType === 'Indoor' ? 'Indoor' : 'Outdoor';
    const activity = session.activity === 'Bouldering' ? 'Bouldering' : 'Climbing';
    return `${location} ${activity}`;
  };

  const renderTags = (session: ClimbingSession): string[] => {
    const tags: string[] = [];
    
    // Helper function to process tag values
    const processTagValue = (value: any) => {
      if (!value) return [];
      
      // If it's a string, try to parse it as JSON array first
      if (typeof value === 'string') {
        try {
          // Try to parse as JSON array (e.g., '["Dynamic", "Static"]')
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            return parsed.filter(item => item && typeof item === 'string' && item.trim());
          }
        } catch {
          // If not JSON, treat as regular string
          return value.trim() ? [value.trim()] : [];
        }
      }
      
      // If it's already an array
      if (Array.isArray(value)) {
        return value.filter(item => item && typeof item === 'string' && item.trim()).map(item => item.trim());
      }
      
      // If it's any other type, convert to string
      const stringValue = String(value).trim();
      return stringValue ? [stringValue] : [];
    };
    
    // Process movement tags
    if (session.movement) {
      const movements = processTagValue(session.movement);
      tags.push(...movements);
    }
    
    // Process grip tags
    if (session.grip) {
      const grips = processTagValue(session.grip);
      tags.push(...grips);
    }
    
    // Process footwork tags
    if (session.footwork) {
      const footworks = processTagValue(session.footwork);
      tags.push(...footworks);
    }
    
    // Remove duplicates and empty values
    return [...new Set(tags.filter(tag => tag && tag.trim()))];
  };

  const renderTagsForCard = (session: ClimbingSession, cardColor: string) => {
    const tags: string[] = renderTags(session);
    
    if (tags.length === 0) return null;
    
    // Estimate how many tags fit in one line (approximate calculation)
    // Assuming average tag width of ~80px and container width of ~250px
    const maxTagsInLine = 3;
    
    if (tags.length <= maxTagsInLine) {
      // Show all tags if they fit
      return (
        <View style={styles.tagsContainer}>
          {tags.map((tag, index) => (
            <View key={index} style={[styles.tag, { backgroundColor: cardColor }]}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      );
    } else {
      // Show first tags and "+x skills" in the last position
      const visibleTags = tags.slice(0, maxTagsInLine - 1);
      const remainingCount = tags.length - visibleTags.length;
      
      return (
        <View style={styles.tagsContainer}>
          {visibleTags.map((tag, index) => (
            <View key={index} style={[styles.tag, { backgroundColor: cardColor }]}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
          <View style={[styles.tag, { backgroundColor: cardColor }]}>
            <Text style={styles.tagText}>+{remainingCount} skills</Text>
          </View>
        </View>
      );
    }
  };

  const renderSessionCard = ({ item }: { item: ClimbingSession }) => {
    const cardColor = getCardColor(item);
    
    return (
      <TouchableOpacity 
        style={[styles.card]} 
        onPress={() => handleCardPress(item)}
      >
        <View style={styles.cardMainContent}>
          {/* Left section with grade/icon */}
          <View style={[styles.gradeSection, { backgroundColor: cardColor }]}>
            <Text style={styles.gradeText}>
              {item.grade || 'V?'}
            </Text>
          </View>
          
          <View style={styles.cardRightContent}>
            {/* Header with title, subtitle and time */}
            <View style={styles.cardHeader}>
              <View style={styles.titleSection}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.routeNumber || item.place || 'Nome da rota'}
                </Text>
                {/* Subtitle with climbing type */}
                <Text style={styles.cardSubtitle} numberOfLines={1}>
                  {getClimbingTypeSubtitle(item)}
                </Text>
              </View>
              <Text style={styles.cardTime}>
                {formatTime(item.when)}
              </Text>
            </View>

            {/* Additional info */}
            <View style={styles.additionalInfo}>
              {item.routeRating && (
                <Text style={styles.infoText} numberOfLines={1}>
                  ⭐ Route rating: {item.routeRating}
                </Text>
              )}
              {item.howItFelt && (
                <Text style={styles.infoText} numberOfLines={1}>
                  😊 How it feel: {item.howItFelt}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Tags below everything */}
        {renderTagsForCard(item, cardColor)}
      </TouchableOpacity>
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
      >
        <StatusBar barStyle="light-content" backgroundColor={THEME_COLORS.bluePrimary} />
        
        {/* Full screen overlay */}
        <View style={successStyles.fullScreenOverlay}>
          {/* Modal container */}
          <View style={successStyles.modalContainer}>
            {/* Content */}
            <View style={successStyles.content}>
              {/* Success Icon */}
              <View style={successStyles.iconContainer}>
                <FontAwesome6 name="trophy" size={80} color={THEME_COLORS.bluePrimary} />
              </View>
              
              {/* Success Message */}
              <Text style={successStyles.title}>Parabéns!</Text>
              <Text style={successStyles.subtitle}>Sua sessão foi salva com sucesso!</Text>
            </View>

            {/* Navigation Bar */}
            <View style={successStyles.navigationBar}>
              <TouchableOpacity 
                style={[successStyles.button, successStyles.secondaryButton]} 
                onPress={handleAddAnotherLog}
              >
                <View style={successStyles.buttonContent}>
                  <FontAwesome6 name="plus" size={16} color={THEME_COLORS.bluePrimary} />
                  <Text style={[successStyles.buttonText, successStyles.secondaryButtonText]}>Adicionar outro log</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[successStyles.button, successStyles.primaryButton]} 
                onPress={handleBackToHome}
              >
                <View style={successStyles.buttonContent}>
                  <FontAwesome6 name="home" size={16} color="#fff" />
                  <Text style={[successStyles.buttonText, successStyles.primaryButtonText]}>Voltar para home</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
        onPress={() => setShowForm(true)}
      >
        <FontAwesome6 name="plus" size={20} color="#fff" />
      </TouchableOpacity>

      {/* Formulário Modal */}
      <ClimbingSessionForm
        visible={showForm}
        onClose={() => setShowForm(false)}
        onSave={handleSaveSession}
        userInfo={userInfo}
      />

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
    paddingHorizontal: 20,
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
    borderRadius: 60,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
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
  navigationBar: {
    height: 85,
    minHeight: 85,
    maxHeight: 85,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 0,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  button: {
    flex: 1,
    minHeight: 44,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: THEME_COLORS.bluePrimary,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButton: {
    backgroundColor: '#fff',
  },
  primaryButton: {
    backgroundColor: THEME_COLORS.bluePrimary,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME_COLORS.bluePrimary,
  },
  secondaryButtonText: {
    color: THEME_COLORS.bluePrimary,
  },
  primaryButtonText: {
    color: '#fff',
  },
});
