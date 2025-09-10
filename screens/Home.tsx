import { FontAwesome6, Ionicons } from '@expo/vector-icons';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Image, Modal, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
  const [profileImageSource, setProfileImageSource] = useState<any>(null);
  const [profileImageLoading, setProfileImageLoading] = useState(true);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [showRewardsModal, setShowRewardsModal] = useState(false);



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
      StatusBar.setBarStyle('dark-content');
      StatusBar.setBackgroundColor('#F8F9FA');
      
      // Carregar dados sempre que a tela for focada
      if (userInfo?.email) {
        loadSessions();
      }
    }, [userInfo?.email])
  );

  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        // App voltou do background, forçar configuração da StatusBar
        StatusBar.setBarStyle('dark-content');
        StatusBar.setBackgroundColor('#F8F9FA');
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


  const getSortedSessions = () => {
    // Por padrão, ordenar por data (mais recente primeiro)
    return [...sessions].sort((a, b) => {
      const dateA = new Date(a.when).getTime();
      const dateB = new Date(b.when).getTime();
      return dateB - dateA; // Mais recente primeiro
    });
  };













const getFirstName = (str: string | null | undefined) => {
  if (!str) return 'Climber';
  return str.split(' ')[0].charAt(0).toUpperCase() + str.split(' ')[0].slice(1).toLowerCase();
};

// Calculate streak of consecutive weeks with at least one session
const calculateWeeklyStreak = (sessions: ClimbingSession[]): number => {
  if (sessions.length === 0) return 0;

  const today = new Date();
  const currentWeekStart = new Date(today);
  currentWeekStart.setDate(today.getDate() - today.getDay()); // Start of current week (Sunday)
  currentWeekStart.setHours(0, 0, 0, 0);

  // Helper function to check if a week has sessions
  const hasSessionsInWeek = (weekStart: Date) => {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    return sessions.some(session => {
      const sessionDate = new Date(session.when);
      return sessionDate >= weekStart && sessionDate <= weekEnd;
    });
  };

  // Check current week
  const currentWeekHasSessions = hasSessionsInWeek(currentWeekStart);
  
  // Check previous week
  const previousWeekStart = new Date(currentWeekStart);
  previousWeekStart.setDate(currentWeekStart.getDate() - 7);
  const previousWeekHasSessions = hasSessionsInWeek(previousWeekStart);

  // If both current and previous week have no sessions, streak is 0
  if (!currentWeekHasSessions && !previousWeekHasSessions) {
    return 0;
  }

  // If current week has sessions but previous doesn't, streak is 1
  if (currentWeekHasSessions && !previousWeekHasSessions) {
    return 1;
  }

  // If previous week has sessions (regardless of current week), calculate full streak
  let streak = 0;
  let checkWeek = new Date(currentWeekStart);

  // Count current week if it has sessions
  if (currentWeekHasSessions) {
    streak++;
  }

  // Check previous weeks
  checkWeek.setDate(checkWeek.getDate() - 7); // Move to previous week
  
  while (true) {
    const hasSessionInWeek = hasSessionsInWeek(checkWeek);
    
    if (hasSessionInWeek) {
      streak++;
      // Move to previous week
      checkWeek.setDate(checkWeek.getDate() - 7);
    } else {
      break;
    }
  }

  return streak;
};

// Generate motivational subtitle based on week streak
const getStreakSubtitle = (streak: number): string => {
  if (streak === 0) {
    return "Your next climb awaits!";
  } else if (streak === 1) {
    return "Keep the momentum going!";
  } else if (streak <= 3) {
    return "Keep it up!";
  } else if (streak <= 6) {
    return "You're on fire!";
  } else if (streak <= 10) {
    return "You're unstoppable!";
  } else {
    return "Keep crushing it!";
  }
};

// Generate personalized greeting based on time of day
const getPersonalizedGreeting = (name: string | null | undefined): string => {
  const hour = new Date().getHours();
  const firstName = getFirstName(name);
  
  if (hour < 6) {
    return `Good night, ${firstName}`;
  } else if (hour < 12) {
    return `Good morning, ${firstName}`;
  } else if (hour < 18) {
    return `Good afternoon, ${firstName}`;
  } else {
    return `Good evening, ${firstName}`;
  }
};

// Calculate statistics for dashboard
const getClimbingStats = (sessions: ClimbingSession[]) => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  // Sessions this month
  const thisMonthSessions = sessions.filter(session => {
    const sessionDate = new Date(session.when);
    return sessionDate.getMonth() === currentMonth && sessionDate.getFullYear() === currentYear;
  });

  // Success rate calculation (completed/flash/onsight vs attempts)
  const completedSessions = sessions.filter(session => {
    const status = session.completion?.toLowerCase();
    return status === 'completed' || status === 'flash' || status === 'onsight';
  });
  const successRate = sessions.length > 0 ? Math.round((completedSessions.length / sessions.length) * 100) : 0;

  // Average rating calculation
  const ratingsArray = sessions.map(s => s.routeRating).filter(Boolean).map(r => parseInt(r as string, 10)).filter(r => !isNaN(r) && r > 0);
  const avgRating = ratingsArray.length > 0 ? (ratingsArray.reduce((a, b) => a + b, 0) / ratingsArray.length).toFixed(1) : 'N/A';

  // Highest grade achieved
  const grades = sessions.map(s => s.grade).filter(Boolean);
  const uniqueGrades = [...new Set(grades)];
  
  return {
    monthlyCount: thisMonthSessions.length,
    successRate: successRate,
    avgRating: avgRating,
    highestGrade: uniqueGrades.length > 0 ? uniqueGrades[uniqueGrades.length - 1] : 'N/A',
    totalSessions: sessions.length,
    uniqueLocations: [...new Set(sessions.map(s => s.location || s.place))].filter(Boolean).length
  };
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
        <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
        
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
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
      

      
      {/* Header */}
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
                  if (profileImageSource?.uri && profileImageSource.uri.startsWith('http') && userInfo?.id) {
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
              {getPersonalizedGreeting(userInfo?.name)}
            </Text>
            <View style={styles.streakContainer}>
              {calculateWeeklyStreak(sessions) > 0 && (
                <View style={styles.streakBadge}>
                  <FontAwesome6 name="fire" size={12} color="#FF6B35" />
                  <Text style={styles.streakText}>{calculateWeeklyStreak(sessions)}</Text>
                </View>
              )}
              <View style={styles.subtitleContainer}>
                <Text style={styles.subtitleText} numberOfLines={2}>
                  {getStreakSubtitle(calculateWeeklyStreak(sessions))}
                </Text>
              </View>
            </View>
          </View>
          
        </View>
      </View>

      {/* Dashboard Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator 
            size="large" 
            color={THEME_COLORS.bluePrimary} 
            style={styles.loadingSpinner}
          />
        </View>
      ) : (
        <ScrollView 
          style={styles.dashboardContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.dashboardContent}
        >
          {/* Empty State for no sessions */}
          {sessions.length === 0 && (
            <View style={styles.emptyStateDashboard}>
              <Image 
                source={require('../assets/images/empty-state-home.png')}
                style={styles.emptyStateImage}
              />
              <Text style={styles.emptyTitle}>Ready to start climbing?</Text>
              <Text style={styles.emptyDesc}>
                Tap the + button to log your first climb to see your progress and achievements!
              </Text>
            </View>
          )}

          {/* Progress Stats Section */}
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>Your Progress</Text>
            <View style={styles.statsGrid}>
              {(() => {
                const stats = getClimbingStats(sessions);
                return (
                  <>
                    <View style={styles.modernStatCard}>
                      <View style={[styles.iconCircle, { backgroundColor: '#E3F2FD' }]}>
                        <FontAwesome6 name="calendar-days" size={18} color="#1976D2" />
                      </View>
                      <View style={styles.statContent}>
                        <Text style={styles.modernStatNumber}>{stats.monthlyCount}</Text>
                        <Text style={styles.modernStatLabel}>This Month</Text>
                      </View>
                    </View>
                    
                    <View style={styles.modernStatCard}>
                      <View style={[styles.iconCircle, { backgroundColor: '#F3E5F5' }]}>
                        <FontAwesome6 name="bullseye" size={18} color="#7B1FA2" />
                      </View>
                      <View style={styles.statContent}>
                        <Text style={styles.modernStatNumber}>{stats.successRate}%</Text>
                        <Text style={styles.modernStatLabel}>Success Rate</Text>
                      </View>
                    </View>
                    
                    <View style={styles.modernStatCard}>
                      <View style={[styles.iconCircle, { backgroundColor: '#E8F5E8' }]}>
                        <FontAwesome6 name="trophy" size={18} color="#388E3C" />
                      </View>
                      <View style={styles.statContent}>
                        <Text style={styles.modernStatNumber}>{stats.highestGrade}</Text>
                        <Text style={styles.modernStatLabel}>Best Grade</Text>
                      </View>
                    </View>
                    
                    <View style={styles.modernStatCard}>
                      <View style={[styles.iconCircle, { backgroundColor: '#FFF3E0' }]}>
                        <FontAwesome6 name="star" size={18} color="#F57C00" solid />
                      </View>
                      <View style={styles.statContent}>
                        <Text style={styles.modernStatNumber}>{stats.avgRating}</Text>
                        <Text style={styles.modernStatLabel}>Avg Rating</Text>
                      </View>
                    </View>
                  </>
                );
              })()} 
            </View>
          </View>

          {/* Recent Sessions Preview */}
          {sessions.length > 0 && (
            <View style={styles.recentSection}>
              <View style={[styles.sectionHeader, styles.recentSectionHeader, { paddingHorizontal: 20 }]}>
                <Text style={styles.sectionTitle}>Recent Sessions</Text>
                <TouchableOpacity 
                  onPress={() => navigation.navigate('Sessions')}
                  style={styles.viewAllButton}
                >
                  <Text style={styles.viewAllText}>View All</Text>
                  <Ionicons name="chevron-forward" size={16} color={THEME_COLORS.bluePrimary} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.recentSessionsContainer}>
                {getSortedSessions().slice(0, 3).map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    onPress={() => handleCardPress(session)}
                  />
                ))}
              </View>
            </View>
          )}

          {/* Achievements Section */}
          <View style={styles.achievementsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Achievements</Text>
              <TouchableOpacity 
                onPress={() => navigation.navigate('Dashboard')}
                style={styles.viewAllButton}
              >
                <Text style={styles.viewAllText}>Dashboard</Text>
                <Ionicons name="chevron-forward" size={16} color={THEME_COLORS.bluePrimary} />
              </TouchableOpacity>
            </View>
            <View style={styles.achievementsContainer}>
              {(() => {
                const streak = calculateWeeklyStreak(sessions);
                const stats = getClimbingStats(sessions);
                
                return (
                  <>
                    {/* Weekly Streak Achievement */}
                    {streak > 0 && (
                      <View style={[styles.achievementCard, streak >= 4 ? styles.achievementUnlocked : styles.achievementLocked]}>
                        <FontAwesome6 name="fire" size={24} color={streak >= 4 ? "#FF6B35" : "#ccc"} />
                        <View style={styles.achievementInfo}>
                          <Text style={styles.achievementTitle}>
                            {streak >= 4 ? "On Fire!" : "Building Streak"}
                          </Text>
                          <Text style={styles.achievementDesc}>
                            {streak >= 4 ? `${streak} weeks in a row!` : `${streak}/4 weeks to unlock`}
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* Total Sessions Achievement */}
                    <View style={[styles.achievementCard, stats.totalSessions >= 10 ? styles.achievementUnlocked : styles.achievementLocked]}>
                      <FontAwesome6 name="mountain" size={24} color={stats.totalSessions >= 10 ? "#4CAF50" : "#ccc"} />
                      <View style={styles.achievementInfo}>
                        <Text style={styles.achievementTitle}>
                          {stats.totalSessions >= 10 ? "Dedicated Climber" : "Getting Started"}
                        </Text>
                        <Text style={styles.achievementDesc}>
                          {stats.totalSessions >= 10 ? "10+ sessions completed!" : `${stats.totalSessions}/10 sessions`}
                        </Text>
                      </View>
                    </View>

                    {/* Locations Explorer Achievement */}
                    <View style={[styles.achievementCard, stats.uniqueLocations >= 5 ? styles.achievementUnlocked : styles.achievementLocked]}>
                      <FontAwesome6 name="globe" size={24} color={stats.uniqueLocations >= 5 ? "#2196F3" : "#ccc"} />
                      <View style={styles.achievementInfo}>
                        <Text style={styles.achievementTitle}>
                          {stats.uniqueLocations >= 5 ? "Explorer" : "Local Climber"}
                        </Text>
                        <Text style={styles.achievementDesc}>
                          {stats.uniqueLocations >= 5 ? "5+ different spots!" : `${stats.uniqueLocations}/5 locations`}
                        </Text>
                      </View>
                    </View>
                  </>
                );
              })()} 
            </View>
          </View>

          {/* Earn Rewards Section */}
          <View style={styles.earnRewardsSection}>
            <TouchableOpacity style={styles.rewardsCard} onPress={() => setShowRewardsModal(true)}>
              <View style={styles.rewardsBackground}>
                <Image 
                  source={require('../assets/images/rewards-trophy-full.png')}
                  style={styles.rewardsBackgroundImage}
                />
                <View style={styles.rewardsContainer}>
                  <View style={styles.rewardsTextContainer}>
                    <Text style={styles.rewardsTitle}>Earn Rewards!</Text>
                    <Text style={styles.rewardsText}>Reach milestones to unlock{'\n'}exclusive gear</Text>
                    <Text style={styles.rewardsLink}>Tap to learn more →</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

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

      {/* Rewards Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showRewardsModal}
        onRequestClose={() => setShowRewardsModal(false)}
      >
        <View style={styles.rewardsModalOverlay}>
          <View style={styles.rewardsModalContent}>
            <View style={styles.rewardsModalHeader}>
              <Text style={styles.rewardsModalTitle}>Streak Rewards</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowRewardsModal(false)}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.rewardsModalBody}>
              <Text style={styles.rewardsModalSubtitle}>
                Build your climbing streak to unlock exclusive rewards!
              </Text>
              
              <View style={styles.milestonesList}>
                <View style={styles.milestoneItem}>
                  <View style={[styles.milestoneIcon, calculateWeeklyStreak(sessions) >= 4 ? styles.milestoneUnlocked : styles.milestoneLocked]}>
                    <FontAwesome6 name="fire" size={16} color={calculateWeeklyStreak(sessions) >= 4 ? "#FF6B35" : "#ccc"} />
                  </View>
                  <View style={styles.milestoneInfo}>
                    <Text style={styles.milestoneTitle}>4 Week Streak</Text>
                    <Text style={styles.milestoneDesc}>Climbing gear discount</Text>
                  </View>
                </View>

                <View style={styles.milestoneItem}>
                  <View style={[styles.milestoneIcon, calculateWeeklyStreak(sessions) >= 8 ? styles.milestoneUnlocked : styles.milestoneLocked]}>
                    <FontAwesome6 name="trophy" size={16} color={calculateWeeklyStreak(sessions) >= 8 ? "#FFD700" : "#ccc"} />
                  </View>
                  <View style={styles.milestoneInfo}>
                    <Text style={styles.milestoneTitle}>8 Week Streak</Text>
                    <Text style={styles.milestoneDesc}>Exclusive climbing chalk bag</Text>
                  </View>
                </View>

                <View style={styles.milestoneItem}>
                  <View style={[styles.milestoneIcon, calculateWeeklyStreak(sessions) >= 12 ? styles.milestoneUnlocked : styles.milestoneLocked]}>
                    <FontAwesome6 name="crown" size={16} color={calculateWeeklyStreak(sessions) >= 12 ? "#9C27B0" : "#ccc"} />
                  </View>
                  <View style={styles.milestoneInfo}>
                    <Text style={styles.milestoneTitle}>12 Week Streak</Text>
                    <Text style={styles.milestoneDesc}>Premium climbing shoes</Text>
                  </View>
                </View>
              </View>
              
              <Text style={styles.rewardsModalNote}>
                Current streak: {calculateWeeklyStreak(sessions)} weeks
              </Text>
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
  header: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 20,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  profileImageContainer: {
    // Remover marginRight
  },
  profileImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: THEME_COLORS.bluePrimary,
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
    color: THEME_COLORS.text.primary,
  },
  subtitleText: {
    fontSize: 14,
    color: THEME_COLORS.text.secondary,
    fontWeight: '400',
    lineHeight: 18,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    flexWrap: 'wrap',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  streakText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF6B35',
    marginLeft: 4,
  },
  subtitleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  dashboardContainer: {
    flex: 1,
  },
  dashboardContent: {
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME_COLORS.text.primary,
    marginBottom: 0, // Remover margin bottom do título
    lineHeight: 24, // Definir line-height específico
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    minHeight: 24, // Garantir altura mínima consistente
  },
  recentSectionHeader: {
    alignItems: 'center', // Centralizar verticalmente o botão com o título
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2, // Pequeno padding para melhor touch target
  },
  viewAllText: {
    fontSize: 14,
    color: THEME_COLORS.bluePrimary,
    fontWeight: '600',
    marginRight: 4,
    lineHeight: 20, // Line-height específico para o texto do botão
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
  // Stats Section Styles
  statsSection: {
    paddingHorizontal: 20,
    marginBottom: 24, // Aumentar espaçamento entre Your Progress e próxima seção
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  modernStatCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.06)',
    position: 'relative',
    overflow: 'hidden',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statContent: {
    flex: 1,
  },
  modernStatNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: THEME_COLORS.text.primary,
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  modernStatLabel: {
    fontSize: 10,
    color: THEME_COLORS.text.secondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    lineHeight: 12,
  },
  // Recent Sessions Styles
  recentSection: {
    paddingHorizontal: 0, // Remover padding para que SessionCard use o padding correto
    marginBottom: 24,
  },
  recentSessionsContainer: {
    paddingHorizontal: 0, // SessionCard já tem suas próprias margens de 20px
  },
  // Earn Rewards Section Styles
  earnRewardsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  rewardsCard: {
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    overflow: 'hidden',
  },
  rewardsBackground: {
    width: '100%',
    height: 120,
    justifyContent: 'flex-end',
    position: 'relative',
  },
  rewardsBackgroundImage: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  rewardsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: 20,
  },
  rewardsTextContainer: {
    flex: 1,
  },
  rewardsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 6,
  },
  rewardsText: {
    fontSize: 14,
    color: 'white',
    marginBottom: 8,
    lineHeight: 18,
  },
  rewardsLink: {
    fontSize: 13,
    color: 'white',
    fontWeight: '600',
  },
  // Rewards Modal Styles
  rewardsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  rewardsModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 0,
    width: '100%',
    maxHeight: '80%',
  },
  rewardsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  rewardsModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME_COLORS.text.primary,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
    fontWeight: 'bold',
  },
  rewardsModalBody: {
    padding: 20,
  },
  rewardsModalSubtitle: {
    fontSize: 16,
    color: THEME_COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  milestonesList: {
    gap: 16,
  },
  milestoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
  },
  milestoneIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  milestoneUnlocked: {
    backgroundColor: '#e8f5e8',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  milestoneLocked: {
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  milestoneInfo: {
    flex: 1,
  },
  milestoneTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME_COLORS.text.primary,
    marginBottom: 4,
  },
  milestoneDesc: {
    fontSize: 14,
    color: THEME_COLORS.text.secondary,
  },
  rewardsModalNote: {
    fontSize: 14,
    color: THEME_COLORS.bluePrimary,
    textAlign: 'center',
    marginTop: 20,
    fontWeight: '600',
  },
  // Achievements Section Styles
  achievementsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  achievementsContainer: {
    gap: 12,
  },
  achievementCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  achievementUnlocked: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  achievementLocked: {
    borderLeftWidth: 4,
    borderLeftColor: '#E0E0E0',
  },
  achievementInfo: {
    flex: 1,
    marginLeft: 12,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME_COLORS.text.primary,
    marginBottom: 4,
  },
  achievementDesc: {
    fontSize: 14,
    color: THEME_COLORS.text.secondary,
  },
  // Empty State Styles
  emptyStateDashboard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME_COLORS.text.primary,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 16,
    color: THEME_COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyStateImage: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
    backgroundColor: 'transparent',
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

