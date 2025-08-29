import { FontAwesome, FontAwesome5, FontAwesome6, Ionicons } from '@expo/vector-icons';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, AppState, FlatList, Image, Modal, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SessionCard from '../components/SessionCard'; // Importar o novo card
import { THEME_COLORS } from '../constants/Theme';
import { ClimbingSession, climbingSessionService } from '../services/climbingSessionService';
import { imageCacheService } from '../services/imageCacheService';
import { uploadImageAsync, uploadMultipleImagesAsync } from '../services/uploadImage';
import ProfileSettings from './ProfileSettings';
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

// Helper functions for table view
const getSessionColor = (session: ClimbingSession) => {
  if (session.colour) return session.colour;
  
  switch (session.activity?.toLowerCase()) {
    case 'bouldering': return '#FF6B6B';
    case 'sport climbing': return '#4ECDC4';
    case 'traditional': return '#45B7D1';
    case 'indoor': return '#96CEB4';
    default: return THEME_COLORS.bluePrimary;
  }
};

const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch (e) {
    return dateString;
  }
};

const getLocationText = (session: ClimbingSession) => {
  if (session.location_data) {
    const { main_text, secondary_text, description, formatted_address } = session.location_data;
    
    if (main_text && secondary_text) {
      return `${main_text}, ${secondary_text}`;
    }
    
    if (description) {
      return description;
    }
    
    if (formatted_address) {
      return formatted_address;
    }
  }
  
  return session.place || 'Unknown location';
};

const getTitle = (session: ClimbingSession) => {
  const activity = session.activity || 'Climb';
  const routeNumber = session.routeNumber || '--';
  
  let displayActivity = activity;
  if (activity.toLowerCase().includes('bouldering')) {
    displayActivity = 'Boulder';
  } else if (activity.toLowerCase().includes('climbing')) {
    displayActivity = 'Route';
  }
  
  return `${displayActivity} ${routeNumber}`;
};

export default function Home({ onLogout, userInfo }: HomeProps) {
  const [sessions, setSessions] = useState<ClimbingSession[]>([]);
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<ClimbingSession | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isTableView, setIsTableView] = useState(false);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);
  const [isViewTransitioning, setIsViewTransitioning] = useState(false);
  const [profileImageSource, setProfileImageSource] = useState<any>(null);
  const [profileImageLoading, setProfileImageLoading] = useState(true);
  const [showProfileSettings, setShowProfileSettings] = useState(false);


  useEffect(() => {
    if (userInfo?.email) {
      loadSessions();
    }
  }, [userInfo?.email]);

  // Carregamento da imagem de perfil com cache
  useEffect(() => {
    if (userInfo?.id) {
      loadProfileImage();
    }
  }, [userInfo?.id]);

  const loadProfileImage = async () => {
    if (!userInfo?.id) {
      console.log('❌ [Home] No userInfo.id available');
      return;
    }
    
    try {
      setProfileImageLoading(true);
      console.log('🏠 [Home] === STARTING PROFILE IMAGE LOAD ===');
      console.log('🆔 [Home] User ID:', userInfo.id);
      
      const imageResult = await imageCacheService.getProfileImage(userInfo.id);
      
      console.log('📊 [Home] Image result received:');
      console.log('📊 [Home] - isCached:', imageResult.isCached);
      console.log('📊 [Home] - source type:', typeof imageResult.source);
      console.log('📊 [Home] - source content:', imageResult.source);
      
      setProfileImageSource(imageResult.source);
      
      const sourceType = imageResult.isCached ? 'CACHE' : 'SERVER';
      console.log(`✅ [Home] PROFILE IMAGE SET! Source: ${sourceType}`);
      
      // Verificar se é uma URI
      if (imageResult.source?.uri) {
        console.log('🌐 [Home] Image is URI:', imageResult.source.uri);
        
        // Teste adicional para verificar se o arquivo local existe
        if (imageResult.source.uri.startsWith('file://')) {
          console.log('📁 [Home] Local file detected - checking existence...');
          
          import('expo-file-system').then(async (FileSystem) => {
            try {
              const fileInfo = await FileSystem.getInfoAsync(imageResult.source.uri);
              console.log('📄 [Home] Local file info:', fileInfo);
              
              if (!fileInfo.exists) {
                console.log('❌ [Home] LOCAL FILE DOES NOT EXIST!');
                console.log('🎨 [Home] Applying fallback due to missing file...');
                const fallback = require('../assets/images/profile-illustrations/profile_illustration_1.png');
                setProfileImageSource(fallback);
              } else if (fileInfo.size === 0 || fileInfo.size < 100) {
                console.log('❌ [Home] LOCAL FILE IS EMPTY OR TOO SMALL!');
                console.log('🎨 [Home] Applying fallback due to corrupted file...');
                const fallback = require('../assets/images/profile-illustrations/profile_illustration_1.png');
                setProfileImageSource(fallback);
                
                // Limpar cache corrompido
                imageCacheService.invalidateUserCache(userInfo.id);
              } else {
                console.log('✅ [Home] Local file exists and has content');
              }
            } catch (error) {
              console.error('❌ [Home] Error checking local file:', error);
            }
          });
        }
      } else {
        console.log('🖼️ [Home] Image is require() asset');
      }
      
    } catch (error) {
      console.error('💥 [Home] CRITICAL ERROR loading profile image:', error);
      
      // Fallback para ilustração padrão
      console.log('🎨 [Home] Applying emergency fallback...');
      const fallback = imageCacheService.getFallbackImage();
      setProfileImageSource(fallback.source);
      console.log('✅ [Home] Emergency fallback applied');
    } finally {
      setProfileImageLoading(false);
      console.log('🏠 [Home] === PROFILE IMAGE LOAD COMPLETE ===');
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      // Garantir que a StatusBar seja sempre configurada corretamente quando a tela for focada
      StatusBar.setBarStyle('light-content');
      StatusBar.setBackgroundColor(THEME_COLORS.bluePrimary);
    }, [])
  );

  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        // App voltou do background, forçar configuração da StatusBar
        StatusBar.setBarStyle('light-content');
        StatusBar.setBackgroundColor(THEME_COLORS.bluePrimary);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, []);

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

  const handleProfilePress = () => {
    setShowProfileSettings(true);
  };

  const handleProfileSettingsClose = () => {
    setShowProfileSettings(false);
    // Reload sessions and profile image in case profile changes affected anything
    loadSessions();
    loadProfileImage(); // Recarregar imagem de perfil
  };

  const handleSaveSession = async (sessionData: any) => {
    if (!userInfo?.email) {
      Alert.alert('Erro', 'Usuário não identificado');
      return;
    }

    try {
      const { images, image, ...rest } = sessionData as any;
      let imagePaths: string[] = [];

      // Handle multiple images (new format)
      if (images && images.length > 0) {
        try {
          imagePaths = await uploadMultipleImagesAsync(images, userInfo.id);
        } catch (uploadErr) {
          console.error('Erro ao fazer upload das imagens:', uploadErr);
        }
      } 
      // Handle single image (backwards compatibility)
      else if (image) {
        try {
          const imagePath = await uploadImageAsync(image, userInfo.id);
          imagePaths = [imagePath];
        } catch (uploadErr) {
          console.error('Erro ao fazer upload da imagem:', uploadErr);
        }
      }

      const sessionWithUser = {
        ...rest,
        images: imagePaths.length > 0 ? imagePaths : null,
        user_email: userInfo.email,
      };

      const newSession = await climbingSessionService.createSession(sessionWithUser);

      // attach first image for local rendering convenience
      const sessionForList = {
        ...newSession,
        image: (images && images.length > 0) ? images[0] : (image ?? null),
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
    console.log('🎯 [Home] Opening session details for:', {
      id: session.id,
      activity: session.activity,
      location: session.location,
      images: session.images,
      imageCount: session.images?.length || 0
    });
    setSelectedSession(session);
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Cycle through: asc -> desc -> none
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      // New column, start with ascending
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortedSessions = () => {
    if (!sortColumn || !sortDirection) {
      return sessions;
    }

    const sorted = [...sessions].sort((a, b) => {
      let valueA: any;
      let valueB: any;

      switch (sortColumn) {
        case 'route':
          valueA = getTitle(a).toLowerCase();
          valueB = getTitle(b).toLowerCase();
          break;
        case 'grade':
          valueA = a.grade || '';
          valueB = b.grade || '';
          break;
        case 'location':
          valueA = getLocationText(a).toLowerCase();
          valueB = getLocationText(b).toLowerCase();
          break;
        case 'date':
          valueA = new Date(a.when).getTime();
          valueB = new Date(b.when).getTime();
          break;
        case 'rating':
          valueA = parseInt(a.routeRating || '0');
          valueB = parseInt(b.routeRating || '0');
          break;
        case 'status':
          valueA = a.completion?.toLowerCase() || '';
          valueB = b.completion?.toLowerCase() || '';
          break;
        default:
          return 0;
      }

      if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1;
      if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  };

  const renderSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return null;
    }
    
    return (
      <Ionicons 
        name={sortDirection === 'asc' ? 'chevron-up' : 'chevron-down'} 
        size={12} 
        color={THEME_COLORS.text.primary}
        style={tableStyles.sortIcon}
      />
    );
  };









  const handleViewToggle = (newView: boolean) => {
    setIsViewTransitioning(true);
    
    // Simulate a small delay for smooth transition
    setTimeout(() => {
      setIsTableView(newView);
      setIsViewTransitioning(false);
    }, 300);
  };

  const capitalizeWords = (str: string | null) => {
    if (!str) return '';
    return str.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  const renderStars = (session: ClimbingSession) => {
    const numRating = session.routeRating ? parseInt(session.routeRating, 10) : 0;
    if (isNaN(numRating) || numRating <= 0) {
      return <Text style={tableStyles.notRatedText}>Not Rated</Text>;
    }
    const stars = Array.from({ length: 5 }, (_, i) => (
      <FontAwesome
        key={i}
        name={i < numRating ? 'star' : 'star-o'}
        size={14}
        color="#FFC700"
      />
    ));
    return <View style={tableStyles.starsContainer}>{stars}</View>;
  };

  const renderTableRow = (session: ClimbingSession, index: number) => {
    const sessionColor = getSessionColor(session);
    const completionStatus = session.completion?.toLowerCase() ?? '';
    const isCompleted = completionStatus === 'completed' || completionStatus === 'flash' || completionStatus === 'onsight';

    return (
      <View 
        key={session.id} 
        style={[tableStyles.tableRow, index % 2 === 0 ? tableStyles.evenRow : tableStyles.oddRow]}
      >
        {/* Name Column with Fixed Layout */}
        <View style={tableStyles.nameColumn}>
          {/* Color indicator */}
          <View style={[tableStyles.colorIndicator, { backgroundColor: sessionColor }]} />
          
          {/* Spacing after color */}
          <View style={tableStyles.spacingAfterColor} />
          
          {/* Name area */}
          <View style={tableStyles.nameArea}>
            <TouchableOpacity onPress={() => handleCardPress(session)}>
              <Text 
                style={[tableStyles.cellTitle, tableStyles.clickableTitle]}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {getTitle(session)}
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Spacing before button */}
          <View style={tableStyles.spacingBeforeButton} />
          
          {/* Open button */}
          <TouchableOpacity 
            style={tableStyles.openButton}
            onPress={() => handleCardPress(session)}
          >
            <Text style={tableStyles.openButtonText}>OPEN</Text>
          </TouchableOpacity>
          
          {/* Spacing after button */}
          <View style={tableStyles.spacingAfterButton} />
        </View>

        {/* Grade */}
        <View style={tableStyles.gradeCell}>
          <Ionicons name="speedometer-outline" size={14} color={sessionColor} />
          <Text style={tableStyles.cellGrade}>{session.grade || 'N/A'}</Text>
        </View>

        {/* Location */}
        <View style={tableStyles.locationCell}>
          <Ionicons name="location" size={14} color={sessionColor} />
          <Text style={tableStyles.cellLocation} numberOfLines={2} ellipsizeMode="tail">
            {getLocationText(session)}
          </Text>
        </View>

        {/* Date */}
        <View style={tableStyles.dateCell}>
          <Ionicons name="calendar-outline" size={14} color={sessionColor} />
          <Text style={tableStyles.cellDate}>{formatDate(session.when)}</Text>
        </View>

        {/* Rating */}
        <View style={tableStyles.ratingCell}>
          {renderStars(session)}
        </View>

        {/* Completion */}
        <View style={tableStyles.completionCell}>
          {isCompleted ? (
            <FontAwesome5 name="check-circle" size={14} color={THEME_COLORS.success} />
          ) : completionStatus === 'attempt' ? (
            <Ionicons name="trending-up" size={14} color={THEME_COLORS.bluePrimary} />
          ) : (
            <FontAwesome5 name="times-circle" size={14} color={THEME_COLORS.error} />
          )}
          <Text style={tableStyles.completionText}>
            {completionStatus === 'attempt' || !session.completion ? 'Attempting' : session.completion}
          </Text>
        </View>


      </View>
    );
  };

  const getFirstName = (str: string | null | undefined) => {
    if (!str) return 'Climber';
    return str.split(' ')[0].charAt(0).toUpperCase() + str.split(' ')[0].slice(1).toLowerCase();
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

  // Function to get the profile image source (now using cache)
  const getProfileImageSource = () => {
    console.log('🖼️ [Home] getProfileImageSource called');
    console.log('🔄 [Home] - profileImageLoading:', profileImageLoading);
    console.log('📊 [Home] - profileImageSource:', profileImageSource);
    
    if (profileImageLoading) {
      console.log('⏳ [Home] Still loading - using default illustration');
      const loadingSource = require('../assets/images/profile-illustrations/profile_illustration_1.png');
      console.log('📱 [Home] Loading source type:', typeof loadingSource);
      return loadingSource;
    }
    
    if (profileImageSource) {
      console.log('✅ [Home] Using profileImageSource:', profileImageSource);
      if (profileImageSource.uri) {
        console.log('🌐 [Home] Source is URI:', profileImageSource.uri);
        
        // Verificação extra para URIs locais
        if (profileImageSource.uri.startsWith('file://')) {
          console.log('📁 [Home] Local file URI detected');
          console.log('🔗 [Home] Full URI:', profileImageSource.uri);
          
          // Tentar também uma versão alternativa sem file://
          const alternativeUri = profileImageSource.uri.replace('file://', '');
          console.log('🔄 [Home] Alternative URI (no file://):', alternativeUri);
        }
      } else {
        console.log('🖼️ [Home] Source is local asset (require)');
      }
      console.log('📤 [Home] RETURNING source:', profileImageSource);
      return profileImageSource;
    }
    
    console.log('🎨 [Home] No source available - using default fallback');
    const fallbackSource = require('../assets/images/profile-illustrations/profile_illustration_1.png');
    console.log('📱 [Home] Fallback source type:', typeof fallbackSource);
    return fallbackSource;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={THEME_COLORS.bluePrimary} />
      

      
      {/* Blue Header */}
      <View style={styles.header}>
        <View style={styles.profileSection}>
          <TouchableOpacity style={styles.profileImageContainer} onPress={handleProfilePress}>
            {profileImageLoading ? (
              <View style={[styles.profileImage, styles.profileImageLoading]}>
                <ActivityIndicator size="small" color="#FFF" />
              </View>
            ) : (
              <Image 
                source={getProfileImageSource()} 
                style={styles.profileImage}
                onLoad={() => {
                  console.log('✅ [Home] Image onLoad - SUCCESS loading image!');
                }}
                onError={(error) => {
                  console.error('❌ [Home] Image onError - FAILED to load image!');
                  console.error('❌ [Home] Native error:', error.nativeEvent?.error || 'Unknown error');
                  
                  // Aplicar fallback imediato quando imagem falha
                  console.log('🎨 [Home] Applying fallback due to image error...');
                  
                  // Se era uma URL, invalidar dados relacionados
                  if (profileImageSource?.uri && profileImageSource.uri.startsWith('http')) {
                    console.log('🧹 [Home] URL failed - invalidating cache for next attempt');
                    imageCacheService.invalidateUserCache(userInfo.id);
                  }
                  
                  const fallback = require('../assets/images/profile-illustrations/profile_illustration_1.png');
                  setProfileImageSource(fallback);
                }}
                onLoadStart={() => {
                  console.log('🔄 [Home] Image onLoadStart - Started loading image...');
                }}
                onLoadEnd={() => {
                  console.log('🏁 [Home] Image onLoadEnd - Finished loading attempt');
                }}
              />
            )}
          </TouchableOpacity>
          
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeText} numberOfLines={1}>
              Welcome, {getFirstName(userInfo?.name)}
            </Text>
          </View>
          
          <TouchableOpacity onPress={handleLogout} style={styles.profileButton}>
            <FontAwesome6 name="right-from-bracket" size={18} color="#fff" solid />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* View Toggle Switch */}
        <View style={styles.viewToggleContainer}>
          <View style={styles.viewToggleContent}>
            {/* Title and Subtitle */}
            <View style={styles.titleContainer}>
              <Text style={styles.titleText}>Your logs</Text>
              <Text style={styles.logsSubtitleText}>
                {sessions.length} sessions up to today
              </Text>
            </View>
            
            {/* View Toggle */}
            <View style={styles.toggleSwitchContainer}>
              <TouchableOpacity 
                style={[styles.toggleButton, !isTableView && styles.activeToggleButton]}
                onPress={() => handleViewToggle(false)}
                disabled={isViewTransitioning}
              >
                <Ionicons 
                  name="list" 
                  size={18} 
                  color={!isTableView ? THEME_COLORS.bluePrimary : THEME_COLORS.text.secondary} 
                />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.toggleButton, isTableView && styles.activeToggleButton]}
                onPress={() => handleViewToggle(true)}
                disabled={isViewTransitioning}
              >
                <Ionicons 
                  name="grid" 
                  size={18} 
                  color={isTableView ? THEME_COLORS.bluePrimary : THEME_COLORS.text.secondary} 
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
        
        {/* Content based on view type */}
        {isViewTransitioning ? (
          /* Loading State - Full Screen */
          <View style={styles.loadingContainer}>
            <ActivityIndicator 
              size="large" 
              color={THEME_COLORS.bluePrimary} 
              style={styles.loadingSpinner}
            />
          </View>
        ) : isTableView ? (
          /* Table View */
          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          >
            {sessions.length === 0 ? (
              loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator 
                    size="large" 
                    color={THEME_COLORS.bluePrimary} 
                    style={styles.loadingSpinner}
                  />
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <FontAwesome6 name="mountain" size={48} color="#ccc" />
                  <Text style={styles.emptyText}>
                    No climbing sessions yet
                  </Text>
                  <Text style={styles.emptySubtext}>
                    Tap the + button to log your first climb!
                  </Text>
                </View>
              )
            ) : (
              <View style={tableStyles.tableContainer}>
                {/* Horizontal Scrollable Table */}
                <ScrollView 
                  horizontal={true}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={tableStyles.scrollContainer}
                >
                  <View style={tableStyles.tableContent}>
                    {/* Table Header */}
                    <View style={tableStyles.tableHeader}>
                      <View style={tableStyles.nameColumnHeader}>
                        <View style={tableStyles.headerColorIndicator} />
                        <View style={tableStyles.spacingAfterColor} />
                        <TouchableOpacity 
                          style={tableStyles.nameHeaderArea}
                          onPress={() => handleSort('route')}
                        >
                          <View style={tableStyles.headerTextContainer}>
                            <Text style={tableStyles.headerText}>Route</Text>
                            {renderSortIcon('route')}
                          </View>
                        </TouchableOpacity>
                        <View style={tableStyles.spacingBeforeButton} />
                        <View style={tableStyles.openButtonHeaderSpace}>
                        </View>
                        <View style={tableStyles.spacingAfterButton} />
                      </View>
                      <TouchableOpacity 
                        style={tableStyles.gradeHeader}
                        onPress={() => handleSort('grade')}
                      >
                        <View style={tableStyles.headerTextContainer}>
                          <Text style={tableStyles.headerText}>Grade</Text>
                          {renderSortIcon('grade')}
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={tableStyles.locationHeader}
                        onPress={() => handleSort('location')}
                      >
                        <View style={tableStyles.headerTextContainer}>
                          <Text style={tableStyles.headerText}>Location</Text>
                          {renderSortIcon('location')}
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={tableStyles.dateHeader}
                        onPress={() => handleSort('date')}
                      >
                        <View style={tableStyles.headerTextContainer}>
                          <Text style={tableStyles.headerText}>Date</Text>
                          {renderSortIcon('date')}
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={tableStyles.ratingHeader}
                        onPress={() => handleSort('rating')}
                      >
                        <View style={tableStyles.headerTextContainer}>
                          <Text style={tableStyles.headerText}>Rating</Text>
                          {renderSortIcon('rating')}
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={tableStyles.completionHeader}
                        onPress={() => handleSort('status')}
                      >
                        <View style={tableStyles.headerTextContainer}>
                          <Text style={tableStyles.headerText}>Status</Text>
                          {renderSortIcon('status')}
                        </View>
                      </TouchableOpacity>
                    </View>
                    
                    {/* Table Rows */}
                    {getSortedSessions().map((session, index) => renderTableRow(session, index))}
                  </View>
                </ScrollView>
              </View>
            )}
          </ScrollView>
        ) : (
          /* Card View */
        <FlatList
          data={sessions}
          renderItem={renderSessionCard}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator 
                  size="large" 
                  color={THEME_COLORS.bluePrimary} 
                  style={styles.loadingSpinner}
                />
              </View>
            ) : (
              <View style={styles.emptyState}>
                <FontAwesome6 name="mountain" size={48} color="#ccc" />
                <Text style={styles.emptyText}>
                  No climbing sessions yet
                </Text>
                <Text style={styles.emptySubtext}>
                  Tap the + button to log your first climb!
                </Text>
              </View>
            )
          }
        />
        )}
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
            onSessionDeleted={loadSessions}
          />
        )}
      </Modal>

      {/* Profile Settings Modal */}
      <Modal visible={showProfileSettings} animationType="slide" presentationStyle="fullScreen">
        <ProfileSettings onClose={handleProfileSettingsClose} />
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
    paddingVertical: 16,
    paddingBottom: 20,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileImageContainer: {
    // Remover marginRight
  },
  profileImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
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
    marginLeft: 12,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  subtitleText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingTop: 10,
  },
  viewToggleContainer: {
    paddingLeft: 0,
    paddingRight: 0,
    paddingVertical: 8,
  },
  viewToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 20,
    paddingRight: 20,
  },
  titleContainer: {
    flex: 1,
  },
  titleText: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME_COLORS.text.primary,
    marginBottom: 4,
  },
  logsSubtitleText: {
    fontSize: 14,
    color: THEME_COLORS.text.secondary,
    fontWeight: '400',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: '#F8F9FA',
    paddingTop: '35%',
  },
  loadingSpinner: {
    transform: [{ scale: 1.5 }],
  },
  toggleSwitchContainer: {
    flexDirection: 'row',
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: THEME_COLORS.border.light,
  },
  toggleButton: {
    width: 40,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  activeToggleButton: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
  profileImageLoading: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
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

const tableStyles = StyleSheet.create({
  tableContainer: {
    backgroundColor: '#fff',
    marginTop: 5,
    borderRadius: 12,
    overflow: 'hidden',
  },
  scrollContainer: {
    // No padding needed since table takes full width
  },
  tableContent: {
    minWidth: 860, // Adjusted for new name column layout
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingVertical: 12,
    paddingLeft: 20,
    paddingRight: 20,
    borderBottomWidth: 1,
    borderBottomColor: THEME_COLORS.border.light,
  },
  nameColumnHeader: {
    width: 180, // Total width for name column
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    borderRightWidth: 1,
    borderRightColor: THEME_COLORS.border.light,
    paddingRight: 16,
  },
  headerColorIndicator: {
    width: 6,
  },
  headerText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME_COLORS.text.primary,
    textTransform: 'uppercase',
  },
  spacingAfterColor: {
    width: 8,
  },
  nameHeaderArea: {
    flex: 1,
  },
  spacingBeforeButton: {
    width: 8,
  },
  openButtonHeaderSpace: {
    width: 50,
    alignItems: 'center',
  },
  spacingAfterButton: {
    width: 8,
  },
  headerTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sortIcon: {
    marginLeft: 2,
  },
  gradeHeader: {
    width: 80,
    alignItems: 'center',
    marginRight: 16,
    borderRightWidth: 1,
    borderRightColor: THEME_COLORS.border.light,
    paddingRight: 16,
  },
  locationHeader: {
    width: 180,
    marginRight: 16,
    borderRightWidth: 1,
    borderRightColor: THEME_COLORS.border.light,
    paddingRight: 16,
  },
  dateHeader: {
    width: 80,
    alignItems: 'center',
    marginRight: 16,
    borderRightWidth: 1,
    borderRightColor: THEME_COLORS.border.light,
    paddingRight: 16,
  },
  ratingHeader: {
    width: 120,
    alignItems: 'center',
    marginRight: 16,
    borderRightWidth: 1,
    borderRightColor: THEME_COLORS.border.light,
    paddingRight: 16,
  },
  completionHeader: {
    width: 120,
    alignItems: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingLeft: 20,
    paddingRight: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  evenRow: {
    backgroundColor: '#FAFAFA',
  },
  oddRow: {
    backgroundColor: '#fff',
  },
  nameColumn: {
    width: 180, // Same as header
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    borderRightWidth: 1,
    borderRightColor: THEME_COLORS.border.light,
    paddingRight: 16,
  },
  colorIndicator: {
    width: 6,
    height: 32,
    borderRadius: 3,
  },
  nameArea: {
    flex: 1,
    paddingVertical: 2,
  },
  cellTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME_COLORS.text.primary,
  },
  clickableTitle: {
    textDecorationLine: 'underline',
    color: THEME_COLORS.text.primary, // Changed to black
  },
  openButton: {
    backgroundColor: THEME_COLORS.bluePrimary,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
    width: 50,
    alignItems: 'center',
  },
  openButtonText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  gradeCell: {
    width: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginRight: 16,
    borderRightWidth: 1,
    borderRightColor: THEME_COLORS.border.light,
    paddingRight: 16,
  },
  cellGrade: {
    fontSize: 14,
    fontWeight: '500',
    color: THEME_COLORS.text.primary,
  },
  locationCell: {
    width: 180,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 16,
    borderRightWidth: 1,
    borderRightColor: THEME_COLORS.border.light,
    paddingRight: 16,
  },
  cellLocation: {
    fontSize: 12,
    color: THEME_COLORS.text.secondary,
    flex: 1,
  },
  dateCell: {
    width: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginRight: 16,
    borderRightWidth: 1,
    borderRightColor: THEME_COLORS.border.light,
    paddingRight: 16,
  },
  cellDate: {
    fontSize: 11,
    color: THEME_COLORS.text.secondary,
  },
  ratingCell: {
    width: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderRightWidth: 1,
    borderRightColor: THEME_COLORS.border.light,
    paddingRight: 16,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  notRatedText: {
    fontSize: 10,
    fontStyle: 'italic',
    color: THEME_COLORS.text.light,
  },
  completionCell: {
    width: 120,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  completionText: {
    fontSize: 11,
    color: THEME_COLORS.text.secondary,
    textTransform: 'capitalize',
  },
});
