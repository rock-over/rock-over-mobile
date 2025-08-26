import { FontAwesome6 } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  InteractionManager,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

import Slider from '@react-native-community/slider';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { THEME_COLORS } from '../constants/Theme';
import { supabase } from '../lib/supabase';
import { ClimbingSession, climbingSessionService } from '../services/climbingSessionService';
import { uploadImageAsync } from '../services/uploadImage';

// Google Maps API key
const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyDhK-e-oV7ex0f0gk3R1DMnlXCYSmfgOio';

interface SessionDetailsProps {
  session: ClimbingSession;
  onClose: () => void;
  onSessionDeleted?: () => void;
}

export default function SessionDetails({ session, onClose, onSessionDeleted }: SessionDetailsProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentSession, setCurrentSession] = useState<ClimbingSession>(session);
  const [editedSession, setEditedSession] = useState<ClimbingSession>(session);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [showErrorsStep1, setShowErrorsStep1] = useState(false);
  const [showErrorsStep2, setShowErrorsStep2] = useState(false);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isCalculatingDistances, setIsCalculatingDistances] = useState(false);
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [processedResults, setProcessedResults] = useState<any[]>([]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showGradePicker, setShowGradePicker] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [showGripModal, setShowGripModal] = useState(false);
  const [showFootworkModal, setShowFootworkModal] = useState(false);
  const [tempMovementTags, setTempMovementTags] = useState<string[]>([]);
  const [tempGripTags, setTempGripTags] = useState<string[]>([]);
  const [tempFootworkTags, setTempFootworkTags] = useState<string[]>([]);

  // Get user location for distance calculations (copiado do ClimbingSessionForm)
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          try {
            // @ts-ignore – timeout not yet declared in Expo type definitions
            const loc = await Promise.race([
              Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
              new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
            ]);
            setUserCoords({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
            console.log('User location obtained:', { latitude: loc.coords.latitude, longitude: loc.coords.longitude });
          } catch (posErr) {
            // Fallback: try last known position (may be undefined)
            const last = await Location.getLastKnownPositionAsync();
            if (last) {
              setUserCoords({ latitude: last.coords.latitude, longitude: last.coords.longitude });
              console.log('Using last known location:', { latitude: last.coords.latitude, longitude: last.coords.longitude });
            } else {
              console.log('Could not retrieve position:', posErr);
            }
          }
        } else {
          console.log('Location permission denied');
        }
      } catch (err) {
        console.log('Location permission error', err);
      }
    })();
  }, []);
  
  // Refs for the location modal
  const googlePlacesRef = useRef<TextInput>(null);
  const focusHelperRef = useRef<TextInput>(null);

  // Cores disponíveis para seleção (3 linhas de 5 cores cada) - copiado do ClimbingSessionForm
  const colorOptions = [
    // Primeira linha
    '#ffffff', '#ffeb3b', '#ff9800', '#f44336', '#e91e63',
    // Segunda linha  
    '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4',
    // Terceira linha
    '#00bcd4', '#009688', '#4caf50', '#bdbdbd', '#000000'
  ];

  // Function to filter grade options based on user's preferred grading system (copiado do ClimbingSessionForm)
  const getFilteredGradeOptions = (gradingSystem?: string): string[] => {
    if (!gradingSystem) {
      // Default to YDS if no system is specified
      gradingSystem = 'yds';
    }

    switch (gradingSystem) {
      case 'yds':
        return [
          '5.0', '5.1', '5.2', '5.3', '5.4', '5.5', '5.6', '5.7', '5.8', '5.9',
          '5.10a', '5.10b', '5.10c', '5.10d',
          '5.11a', '5.11b', '5.11c', '5.11d',
          '5.12a', '5.12b', '5.12c', '5.12d',
          '5.13a', '5.13b', '5.13c', '5.13d',
          '5.14a', '5.14b', '5.14c', '5.14d',
          '5.15a', '5.15b', '5.15c', '5.15d'
        ];
      case 'french':
        return [
          '3a', '3b', '3c', '4a', '4b', '4c', 
          '5a', '5b', '5c', '6a', '6a+', '6b', '6b+', '6c', '6c+',
          '7a', '7a+', '7b', '7b+', '7c', '7c+',
          '8a', '8a+', '8b', '8b+', '8c', '8c+',
          '9a', '9a+', '9b', '9b+', '9c'
        ];
      case 'v_scale':
        return [
          'VB', 'V0', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8',
          'V9', 'V10', 'V11', 'V12', 'V13', 'V14', 'V15', 'V16', 'V17'
        ];
      default:
        return [
          '5.0', '5.1', '5.2', '5.3', '5.4', '5.5', '5.6', '5.7', '5.8', '5.9',
          '5.10a', '5.10b', '5.10c', '5.10d',
          '5.11a', '5.11b', '5.11c', '5.11d',
          '5.12a', '5.12b', '5.12c', '5.12d',
          '5.13a', '5.13b', '5.13c', '5.13d',
          '5.14a', '5.14b', '5.14c', '5.14d',
          '5.15a', '5.15b', '5.15c', '5.15d'
        ];
    }
  };

  // Get filtered grade options (for now using default YDS - could be extended to use user preferences)
  const filteredGradeOptions = getFilteredGradeOptions('yds');

  // Função para busca de lugares com Google Places API (copiada do ClimbingSessionForm)
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const debouncedSearchPlaces = (searchText: string) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      searchPlacesWithDistances(searchText);
    }, 300);
  };

  // Distance helper function (copiado do ClimbingSessionForm)
  const haversineDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const R = 6371; // km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const searchPlacesWithDistances = async (searchText: string) => {
    if (!searchText || searchText.trim() === '') {
      setProcessedResults([]);
      setIsCalculatingDistances(false);
      return;
    }

    console.log('Starting search with userCoords:', userCoords);
    setIsCalculatingDistances(true);
    
    try {
      const isIndoor = editedSession.place === 'Indoor';
      let query = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(searchText)}&key=${GOOGLE_MAPS_API_KEY}&language=en`;
      
      if (isIndoor) {
        query += '&types=establishment&keyword=climbing gym';
      } else {
        query += '&types=geocode';
      }

      // Add location bias if user coordinates are available
      if (userCoords) {
        query += `&location=${userCoords.latitude},${userCoords.longitude}&radius=50000`;
      }

      console.log('Fetching places from API...');
      const response = await fetch(query);
      const data = await response.json();
      
      if (data.predictions && data.predictions.length > 0) {
        const limitedResults = data.predictions.slice(0, 10);
        console.log(`Processing ${limitedResults.length} results...`);
        
        // Process results with distance calculation if user coordinates are available
        const processedResults = await Promise.all(limitedResults.map(async (prediction: any) => {
          let distance = null;
          
          if (userCoords) {
            try {
              // Get place details to get coordinates
              const detailsResponse = await fetch(
                `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&key=${GOOGLE_MAPS_API_KEY}&fields=geometry`
              );
              const detailsData = await detailsResponse.json();
              
              if (detailsData.result?.geometry?.location) {
                const placeLat = detailsData.result.geometry.location.lat;
                const placeLng = detailsData.result.geometry.location.lng;
                
                // Calculate distance using helper function
                distance = haversineDistanceKm(
                  userCoords.latitude, 
                  userCoords.longitude, 
                  placeLat, 
                  placeLng
                );
                console.log(`Distance calculated for ${prediction.description}: ${distance?.toFixed(1)} km`);
              }
            } catch (err) {
              console.log('Error calculating distance for place:', prediction.place_id, err);
            }
          } else {
            console.log('No userCoords available for distance calculation');
          }
          
          return {
            ...prediction,
            distance,
            richLocationData: {
              description: prediction.description,
              main_text: prediction.structured_formatting?.main_text,
              secondary_text: prediction.structured_formatting?.secondary_text,
              place_id: prediction.place_id,
            }
          };
        }));
        
        // Sort by distance if available
        if (userCoords) {
          processedResults.sort((a, b) => {
            if (a.distance === null && b.distance === null) return 0;
            if (a.distance === null) return 1;
            if (b.distance === null) return -1;
            return a.distance - b.distance;
          });
          console.log('Results sorted by distance');
        }
        
        setProcessedResults(processedResults);
        console.log(`Set ${processedResults.length} processed results`);
      } else {
        console.log('No predictions returned from API');
        setProcessedResults([]);
      }
    } catch (error) {
      console.error('Error searching places:', error);
      setProcessedResults([]);
    } finally {
      setIsCalculatingDistances(false);
    }
  };

  // Função para atualizar campos editados
  const updateField = (field: string, value: any) => {
    setEditedSession(prev => ({
      ...prev,
      [field]: value
    }));
    // Limpar erros de validação quando o usuário começar a editar
    if (showValidationErrors) {
      setShowValidationErrors(false);
    }
  };

  const updateArrayField = (field: string, value: string[]) => {
    setEditedSession(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Função para iniciar edição
  const startEditing = () => {
    setIsEditing(true);
    setEditedSession({ ...currentSession });
    setShowValidationErrors(false);
    setShowErrorsStep1(false);
    setShowErrorsStep2(false);
  };

  // Função para cancelar edição
  const cancelEditing = () => {
    setIsEditing(false);
    setEditedSession({ ...currentSession });
    setShowValidationErrors(false);
    setShowErrorsStep1(false);
    setShowErrorsStep2(false);
  };

  /* ------- Image Picker ------- */
  const pickImage = async () => {
    // Ask permission if not granted
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'We need media library permission to select a photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets.length > 0) {
      // Use temporary field that won't be saved to DB
      updateField('tempImage', result.assets[0].uri);
    }
  };

  // Função para mostrar snackbar
  const triggerSnack = (message: string) => {
    setSnackbarMessage(message);
    setShowSnackbar(true);
    setTimeout(() => setShowSnackbar(false), 3000);
  };



  // Função para formatar data e hora
  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${day}/${month}/${year}, ${hours}:${minutes}`;
    } catch {
      return dateString;
    }
  };

  // Função para determinar a cor do texto do checkmark baseada na cor de fundo
  const getCheckmarkTextColor = (backgroundColor: string) => {
    const lightColors = ['#ffffff', '#ffeb3b', '#bdbdbd'];
    return lightColors.includes(backgroundColor) ? '#333' : '#fff';
  };

  // Modal de seleção de cores (copiado do ClimbingSessionForm)
  const renderColorPickerModal = () => {
    return (
      <Modal
        visible={showColorPicker}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowColorPicker(false)}
      >
        <TouchableOpacity 
          style={(styles as any).colorModalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowColorPicker(false)}
        >
          <View style={(styles as any).colorModalContainer}>
            <View style={(styles as any).colorGrid}>
              {/* Primeira linha */}
              <View style={(styles as any).colorRow}>
                {colorOptions.slice(0, 5).map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      (styles as any).colorOption,
                      { backgroundColor: color },
                      editedSession.colour === color && (styles as any).colorOptionSelected,
                      color === '#ffffff' && (styles as any).colorOptionWhite
                    ]}
                    onPress={() => {
                      updateField('colour', color);
                      setShowColorPicker(false);
                    }}
                  >
                    {editedSession.colour === color && (
                      <View style={(styles as any).colorCheckmark}>
                        <Text style={[
                          (styles as any).colorCheckmarkText,
                          { color: getCheckmarkTextColor(color) }
                        ]}>
                          ✓
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
              
              {/* Segunda linha */}
              <View style={(styles as any).colorRow}>
                {colorOptions.slice(5, 10).map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      (styles as any).colorOption,
                      { backgroundColor: color },
                      editedSession.colour === color && (styles as any).colorOptionSelected,
                      color === '#ffffff' && (styles as any).colorOptionWhite
                    ]}
                    onPress={() => {
                      updateField('colour', color);
                      setShowColorPicker(false);
                    }}
                  >
                    {editedSession.colour === color && (
                      <View style={(styles as any).colorCheckmark}>
                        <Text style={[
                          (styles as any).colorCheckmarkText,
                          { color: getCheckmarkTextColor(color) }
                        ]}>
                          ✓
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Terceira linha */}
              <View style={[(styles as any).colorRow, (styles as any).colorRowLast]}>
                {colorOptions.slice(10, 15).map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      (styles as any).colorOption,
                      { backgroundColor: color },
                      editedSession.colour === color && (styles as any).colorOptionSelected,
                      color === '#ffffff' && (styles as any).colorOptionWhite
                    ]}
                    onPress={() => {
                      updateField('colour', color);
                      setShowColorPicker(false);
                    }}
                  >
                    {editedSession.colour === color && (
                      <View style={(styles as any).colorCheckmark}>
                        <Text style={[
                          (styles as any).colorCheckmarkText,
                          { color: getCheckmarkTextColor(color) }
                        ]}>
                          ✓
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  // Função para validar campos obrigatórios (replicando lógica do forms)
  const validateSession = (): string[] => {
    const errors: string[] = [];
    
    // Validar campos obrigatórios do Step 1
    if (!editedSession.when) {
      errors.push('Data e hora são obrigatórios');
    }
    if (!editedSession.place || editedSession.place.trim() === '') {
      errors.push('Local é obrigatório');
    }
    if (!editedSession.location || editedSession.location.trim() === '') {
      errors.push('Localização específica é obrigatória');
    }
    if (!editedSession.activity || editedSession.activity.trim() === '') {
      errors.push('Estilo de atividade é obrigatório');
    }

    // Validar campos obrigatórios do Step 2
    if (!editedSession.routeNumber || editedSession.routeNumber.trim() === '') {
      errors.push('Número da rota é obrigatório');
    }
    if (!editedSession.grade || editedSession.grade.trim() === '') {
      errors.push('Graduação é obrigatória');
    }
    if (!editedSession.completion || editedSession.completion.trim() === '') {
      errors.push('Status de conclusão é obrigatório');
    }
    if (!editedSession.colour || editedSession.colour.trim() === '') {
      errors.push('Cor da rota é obrigatória');
    }
    if (!editedSession.routeRating || parseInt(editedSession.routeRating.toString()) === 0) {
      errors.push('Avaliação da rota é obrigatória');
    }

    return errors;
  };

  // Função para salvar as alterações
  const handleSaveSession = async () => {
    try {
      // Validar campos obrigatórios
      const validationErrors = validateSession();
      if (validationErrors.length > 0) {
        setShowErrorsStep1(true);
        setShowErrorsStep2(true);
        triggerSnack(validationErrors[0]); // Mostrar primeiro erro na snackbar
        console.log('Validation errors:', validationErrors);
        return;
      }

      console.log('Saving session:', editedSession.id);
      
      // Preparar dados para salvar (igual ao ClimbingSessionForm/Home.tsx)
      const { tempImage, ...sessionDataToSave } = editedSession as any;
      let finalSessionData = { ...sessionDataToSave };

      // Se há uma nova imagem, fazer upload (similar ao Home.tsx)
      if (tempImage && tempImage.startsWith('file://')) {
        try {
          // Use user email as base for user ID or extract from existing session
          const userId = session.user_email?.replace('@', '_').replace('.', '_') || 'user';
          const imagePath = await uploadImageAsync(tempImage, userId);
          finalSessionData.images = [imagePath];
        } catch (uploadErr) {
          console.error('Erro ao fazer upload da imagem:', uploadErr);
          // Continue saving without image update
        }
      }

      // Remove any 'image' field that might exist
      delete (finalSessionData as any).image;
      
      // Atualizar a sessão no Supabase
      const updatedSession = await climbingSessionService.updateSession(editedSession.id, finalSessionData);
      
      console.log('Session updated successfully');
      
      // Atualizar o session local com os dados salvos
      setCurrentSession(updatedSession);
      
      // Sair do modo de edição
      setIsEditing(false);
      setShowValidationErrors(false);
      setShowErrorsStep1(false);
      setShowErrorsStep2(false);
      
      // Mostrar snackbar de sucesso
      triggerSnack('Session saved successfully! 🎉');
      
      // Chamar callback para atualizar a lista na tela pai
      onSessionDeleted?.();
      
    } catch (error) {
      console.error('Erro ao atualizar sessão:', error);
      Alert.alert('Erro', 'Não foi possível salvar as alterações. Tente novamente.');
    }
  };

  // Função para deletar a sessão
  const handleDeleteSession = async () => {
    try {
      console.log('Deleting session:', session.id);
      
      // Deletar a sessão do Supabase
      await climbingSessionService.deleteSession(session.id);
      
      console.log('Session deleted successfully');
      
      // Fechar o modal
      setShowDeleteModal(false);
      
      // Fechar a tela de detalhes
      onClose();
      
      // Chamar callback para atualizar a lista na tela pai
      onSessionDeleted?.();
      
    } catch (error) {
      console.error('Error deleting session:', error);
      // Fechar o modal mesmo em caso de erro
      setShowDeleteModal(false);
      // Aqui você pode mostrar um alerta de erro se necessário
    }
  };

  // Função para converter valor numérico da dificuldade em texto
  const getDifficultyLabel = (value: number) => {
    if (value <= 3) return 'Smooth';
    if (value <= 6) return 'Moderate';
    if (value <= 8) return 'Hard';
    return 'Very Hard';
  };

  // Renderizar avaliação por estrelas (somente visualização)
  const renderStarRating = (title: string, rating: number, field?: string) => {
    const handleStarPress = (starValue: number) => {
      if (!isEditing || !field) return;
      updateField(field, starValue.toString());
    };

    const currentRating = isEditing && field ? 
      parseInt(editedSession[field as keyof ClimbingSession] as string || '0') : 
      rating;

    // Verificar se este campo tem erro de validação
    const hasValidationError = field === 'routeRating' && showErrorsStep2 && currentRating === 0;

    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>{title}</Text>
        <View style={[
          styles.starsContainer,
          hasValidationError && styles.starsContainerError
        ]}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity 
              key={star} 
              style={styles.starButton}
              disabled={!isEditing}
              onPress={() => handleStarPress(star)}
            >
              <FontAwesome6
                name="star"
                size={28}
                color={star <= currentRating ? "#FFD700" : "#E0E0E0"}
                solid={star <= currentRating}
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  // Renderizar seletor de data e hora (somente visualização)
  const renderDateTimeDisplay = (title: string, dateString: string) => {
    return (
      <View style={styles.fieldContainer}>
        <View style={styles.dateTimeDisplayContainer}>
          <FontAwesome6 
            name="calendar-days" 
            size={18} 
            color={THEME_COLORS.bluePrimary}
            style={styles.dateIcon}
          />
          <Text style={styles.dateTimeDisplayText}>
            {dateString ? formatDateTime(dateString) : 'No date selected'}
          </Text>
        </View>
      </View>
    );
  };

  // Renderizar seletor visual (visualização ou edição)
  const renderVisualSelector = (
    title: string, 
    selectedValue: string,
    options: Array<{value: string, label: string, imageUrl: any}>,
    field?: string
  ) => {
    const handleOptionPress = (value: string) => {
      if (!isEditing || !field) return;
      
      if (editedSession[field as keyof ClimbingSession] === value) {
        updateField(field, '');
        // Limpar localização específica quando desselecionar place
        if (field === 'place') {
          updateField('location', '');
          updateField('location_data', null);
        }
      } else {
        updateField(field, value);
        // Limpar localização específica quando alterar place e abrir modal
        if (field === 'place') {
          updateField('location', '');
          updateField('location_data', null);
          // Abrir modal de seleção de localização
          setShowLocationModal(true);
        }
      }
    };

    const currentValue = isEditing && field ? 
      editedSession[field as keyof ClimbingSession] as string : 
      selectedValue;

    // Verificar se este campo tem erro de validação
    const hasValidationError = showErrorsStep1 && (field === 'place' || field === 'activity') && 
      (!editedSession[field as keyof ClimbingSession] || (editedSession[field as keyof ClimbingSession] as string).trim() === '');

    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>{title}</Text>
        <View style={styles.locationContainer}>
          {options.map((option, index) => (
            <React.Fragment key={option.value}>
              {index > 0 && <View style={styles.buttonSpacer} />}
              <TouchableOpacity
                style={[
                  styles.locationButton,
                  currentValue === option.value && styles.locationButtonSelected,
                  hasValidationError && styles.locationButtonError,
                  !isEditing && currentValue !== option.value && styles.disabledButton
                ]}
                disabled={!isEditing}
                onPress={() => handleOptionPress(option.value)}
              >
                <Image
                  source={option.imageUrl}
                  style={[
                    styles.locationImage,
                    !isEditing && currentValue !== option.value && styles.disabledImage
                  ]}
                  resizeMode="cover"
                />
                <Text style={[
                  styles.locationText,
                  currentValue === option.value && styles.locationTextSelected,
                  !isEditing && currentValue !== option.value && styles.disabledText
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>
      </View>
    );
  };

  // Renderizar seletor de cor (visualização ou edição)
  const renderColorDisplay = (title: string, color: string, field?: string) => {
    const currentColor = isEditing && field ? 
      editedSession[field as keyof ClimbingSession] as string : 
      color;

    // Verificar se este campo tem erro de validação
    const hasValidationError = field === 'colour' && showErrorsStep2 && 
      (!currentColor || currentColor.trim() === '');

    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>{title}</Text>
        {isEditing && field ? (
          <TouchableOpacity
            style={[
              (styles as any).colorSelectorButton,
              hasValidationError && (styles as any).colorSelectorButtonError
            ]}
            onPress={() => setShowColorPicker(true)}
          >
            <View style={[styles.colorPreview, { backgroundColor: currentColor || THEME_COLORS.bluePrimary }]} />
            <FontAwesome6 
              name="chevron-down" 
              size={14} 
              color="#666"
              style={(styles as any).colorDropdownIcon}
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.colorDisplayContainer}>
            <View style={[styles.colorPreview, { backgroundColor: currentColor || THEME_COLORS.bluePrimary }]} />
          </View>
        )}
      </View>
    );
  };

  // Renderizar dropdown (visualização ou edição)
  const renderDropdownDisplay = (title: string, value: string, placeholder: string, field?: string) => {
    const currentValue = isEditing && field ? 
      editedSession[field as keyof ClimbingSession] as string : 
      value;

    // Verificar se este campo tem erro de validação
    const hasValidationError = field === 'grade' && showErrorsStep2 && 
      (!currentValue || currentValue.trim() === '');

    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>{title}</Text>
        {isEditing && field ? (
          <TouchableOpacity
            style={[
              (styles as any).dropdownButton,
              hasValidationError && (styles as any).dropdownButtonError
            ]}
            onPress={() => field === 'grade' && setShowGradePicker(true)}
          >
            <Text style={[
              (styles as any).dropdownButtonText, 
              !currentValue && (styles as any).dropdownPlaceholderText
            ]}>
              {currentValue || placeholder}
            </Text>
            <FontAwesome6 
              name="chevron-down" 
              size={14} 
              color="#666"
              style={(styles as any).dropdownIcon}
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.dropdownDisplayContainer}>
            <Text style={[styles.dropdownDisplayText, !currentValue && styles.dropdownPlaceholderText]}>
              {currentValue || placeholder}
            </Text>
          </View>
        )}
      </View>
    );
  };

  // Renderizar seletor de opções (somente visualização)
  const renderOptionsDisplay = (title: string, selectedValue: string, options: string[], field?: string) => {
    const handleOptionPress = (value: string) => {
      if (!isEditing || !field) return;
      
      if (editedSession[field as keyof ClimbingSession] === value) {
        updateField(field, '');
      } else {
        updateField(field, value);
      }
    };

    const currentValue = isEditing && field ? 
      editedSession[field as keyof ClimbingSession] as string : 
      selectedValue;

    // Verificar se este campo tem erro de validação
    const hasValidationError = field === 'completion' && showErrorsStep2 && 
      (!currentValue || currentValue.trim() === '');

    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>{title}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsContainer}>
          {options.map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.optionButton,
                currentValue === option && styles.optionButtonSelected,
                !isEditing && currentValue !== option && styles.disabledButton,
                hasValidationError && styles.optionButtonError
              ]}
              disabled={!isEditing}
              onPress={() => handleOptionPress(option)}
            >
              <Text style={[
                styles.optionText,
                currentValue === option && styles.optionTextSelected,
                !isEditing && currentValue !== option && styles.disabledText
              ]}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  // Renderizar seletor de sentimentos (somente visualização)
  const renderFeelingDisplay = (title: string, selectedValue: string, field?: string) => {
    const feelings = [
      { value: 'soft', label: 'Soft', emoji: '😌' },
      { value: 'stiff', label: 'Stiff', emoji: '😰' },
      { value: 'good', label: 'Good', emoji: '😊' },
      { value: 'bad', label: 'Bad', emoji: '😞' }
    ];

    const handleFeelingPress = (value: string) => {
      if (!isEditing || !field) return;
      
      if (editedSession[field as keyof ClimbingSession] === value) {
        updateField(field, '');
      } else {
        updateField(field, value);
      }
    };

    const currentValue = isEditing && field ? 
      editedSession[field as keyof ClimbingSession] as string : 
      selectedValue;

    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>{title}</Text>
        <View style={styles.feelingsContainer}>
          {feelings.map((feeling) => (
            <TouchableOpacity
              key={feeling.value}
              style={[
                styles.feelingButton,
                currentValue === feeling.value && styles.feelingButtonSelected,
                !isEditing && currentValue !== feeling.value && styles.disabledButton
              ]}
              disabled={!isEditing}
              onPress={() => handleFeelingPress(feeling.value)}
            >
              <Text style={[
                styles.feelingEmoji,
                !isEditing && currentValue !== feeling.value && styles.disabledEmoji
              ]}>{feeling.emoji}</Text>
              <Text 
                style={[
                  styles.feelingText,
                  currentValue === feeling.value && styles.feelingTextSelected,
                  !isEditing && currentValue !== feeling.value && styles.disabledText
                ]}
                numberOfLines={1}
              >
                {feeling.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  // Renderizar slider de dificuldade (visualização ou edição)
  const renderDifficultyDisplay = (title: string, value: number, field?: string) => {
    const currentValue = isEditing && field ? 
      parseInt(editedSession[field as keyof ClimbingSession] as string) || 5 : 
      value;
    
    const hasValue = currentValue && currentValue > 0;
    
    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>{title}</Text>
        {isEditing && field ? (
          <View style={(styles as any).sliderContainerFullWidth}>
            <Slider
              style={(styles as any).sliderNativeFullWidth}
              minimumValue={1}
              maximumValue={10}
              step={1}
              value={currentValue}
              onValueChange={(val: number) => updateField(field, val.toString())}
              minimumTrackTintColor={THEME_COLORS.bluePrimary}
              maximumTrackTintColor="#e0e0e0"
              thumbTintColor={THEME_COLORS.bluePrimary}
            />
            <View style={(styles as any).sliderLabelsContainer}>
              <Text style={(styles as any).sliderLabelLeft}>Smooth</Text>
              <Text style={(styles as any).sliderLabelRight}>Very Hard</Text>
            </View>
            <Text style={styles.difficultyValue}>{currentValue}</Text>
          </View>
        ) : (
          <View style={styles.difficultyDisplayContainer}>
            <View style={styles.difficultyBarContainer}>
              <View style={[styles.difficultyBar, !hasValue && styles.difficultyBarEmpty]}>
                {hasValue && (
                  <View 
                    style={[
                      styles.difficultyProgress, 
                      { width: `${(currentValue / 10) * 100}%` }
                    ]} 
                  />
                )}
              </View>
              {hasValue && (
                <View 
                  style={[
                    styles.difficultyThumb,
                    { left: `${(currentValue / 10) * 100}%` }
                  ]} 
                />
              )}
            </View>
            <View style={styles.difficultyLabelsContainer}>
              <Text style={styles.difficultyLabelLeft}>Smooth</Text>
              <Text style={styles.difficultyLabelRight}>Very Hard</Text>
            </View>
            {hasValue && (
              <Text style={styles.difficultyValue}>{currentValue}</Text>
            )}
          </View>
        )}
      </View>
    );
  };

  // Renderizar contador de quedas (somente visualização)
  const renderFallsDisplay = (title: string, value: number, field?: string) => {
    const currentValue = isEditing && field ? 
      parseInt(editedSession[field as keyof ClimbingSession] as string || '0') : 
      value;
    
    const hasValue = currentValue && currentValue > 0;
    
    const incrementFalls = () => {
      if (!isEditing || !field) return;
      const newValue = Math.min(currentValue + 1, 50);
      updateField(field, newValue.toString());
    };
    
    const decrementFalls = () => {
      if (!isEditing || !field) return;
      const newValue = Math.max(currentValue - 1, 0);
      updateField(field, newValue.toString());
    };
    
    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>{title}</Text>
        {isEditing && field ? (
          <View style={styles.counterContainer}>
            <TouchableOpacity 
              style={[styles.counterButton, currentValue <= 0 && styles.counterButtonDisabled]} 
              onPress={decrementFalls}
              disabled={currentValue <= 0}
            >
              <Text style={[styles.counterButtonText, currentValue <= 0 && styles.counterButtonTextDisabled]}>-</Text>
            </TouchableOpacity>
            
            <View style={styles.counterValueContainer}>
              <Text style={styles.counterValue}>{currentValue}</Text>
            </View>
            
            <TouchableOpacity 
              style={[styles.counterButton, currentValue >= 50 && styles.counterButtonDisabled]} 
              onPress={incrementFalls}
              disabled={currentValue >= 50}
            >
              <Text style={[styles.counterButtonText, currentValue >= 50 && styles.counterButtonTextDisabled]}>+</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.fallsDisplayContainer}>
            <Text style={[styles.fallsValue, !hasValue && styles.fallsValueEmpty]}>
              {hasValue ? currentValue : '-'}
            </Text>
          </View>
        )}
      </View>
    );
  };

  // Renderizar seletor de tags (visualização ou edição)
  const renderTagsDisplay = (title: string, tags: string[], field?: string) => {
    const getOptions = () => {
      switch (field) {
        case 'movement': return movementOptions;
        case 'grip': return gripOptions;
        case 'footwork': return footworkOptions;
        default: return [];
      }
    };

    const getModalState = () => {
      switch (field) {
        case 'movement': return { show: showMovementModal, set: setShowMovementModal };
        case 'grip': return { show: showGripModal, set: setShowGripModal };
        case 'footwork': return { show: showFootworkModal, set: setShowFootworkModal };
        default: return { show: false, set: () => {} };
      }
    };

    // Se estiver em modo de edição e tiver field, usar o selector interativo
    if (isEditing && field) {
      const options = getOptions();
      const modalState = getModalState();
      return renderTagSelector(title, field, options, modalState.show, modalState.set);
    }

    // Modo visualização
    if (!tags || tags.length === 0) {
      const emptyText = title === 'Movement' ? 'No movements logged' : 
                       title === 'Grip' ? 'No grips logged' : 
                       title === 'Footwork' ? 'No footwork logged' : 
                       'No tags selected';
      
      return (
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>{title}</Text>
          <Text style={styles.emptyTagsText}>{emptyText}</Text>
        </View>
      );
    }

    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>{title}</Text>
        <View style={styles.tagsContainer}>
          {tags.map((tag, index) => (
            <View key={index} style={styles.tagChip}>
              <Text style={styles.tagChipText}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  // Renderizar campo de texto (visualização ou edição)
  const renderTextDisplay = (title: string, value: string, placeholder: string, field?: string) => {
    const currentValue = isEditing && field ? 
      editedSession[field as keyof ClimbingSession] as string : 
      value;

    // Verificar se este campo tem erro de validação
    const hasValidationError = field === 'routeNumber' && showErrorsStep2 && 
      (!currentValue || currentValue.trim() === '');

    return (
    <View style={styles.fieldContainer}>
        <Text style={styles.label}>{title}</Text>
        {isEditing && field ? (
          <TextInput
            style={[
              styles.textInput, 
              field === 'routeNumber' && styles.routeNameInput,
              hasValidationError && styles.textInputError
            ]}
            value={currentValue || ''}
            onChangeText={(text) => updateField(field, text)}
            placeholder={placeholder}
            placeholderTextColor="#999"
            selectionColor="#333"
          />
        ) : (
          <View style={styles.textDisplayContainer}>
            <Text style={[styles.textDisplayText, !currentValue && styles.textDisplayPlaceholder]}>
              {currentValue || placeholder}
            </Text>
          </View>
        )}
    </View>
      );
  };

  // Modal de busca com Google Places (implementação padronizada com ClimbingSessionForm)
  const renderLocationModal = () => {
    if (!showLocationModal) return null;
    const isIndoor = editedSession.place === 'Indoor';
    const title = isIndoor ? 'Select gym' : 'Select place';
    const placeholder = isIndoor ? 'Search for a gym' : 'Search for a place';

    return (
      <Modal
        visible={showLocationModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowLocationModal(false)}
        onShow={() => {
          // reset loading state each time modal opens
          setIsCalculatingDistances(false);
          setProcessedResults([]);

          // Aggressive keyboard opening strategy
          const forceKeyboardOpen = () => {
            // Use helper first, then main input
            if (focusHelperRef.current) {
              focusHelperRef.current.focus();
              setTimeout(() => {
                if (googlePlacesRef.current) {
                  googlePlacesRef.current.focus();
                  // Force selection
                  googlePlacesRef.current.setSelection && googlePlacesRef.current.setSelection(0, 0);
                }
              }, 50);
            } else if (googlePlacesRef.current) {
              // Fallback strategy
              googlePlacesRef.current.blur();
              setTimeout(() => {
                if (googlePlacesRef.current) {
                  googlePlacesRef.current.focus();
                  googlePlacesRef.current.setSelection && googlePlacesRef.current.setSelection(0, 0);
                }
              }, 100);
            }
          };

          // Multiple attempts to ensure keyboard opens
          InteractionManager.runAfterInteractions(() => {
            forceKeyboardOpen();
            setTimeout(forceKeyboardOpen, 200);
            setTimeout(forceKeyboardOpen, 500);
          });
        }}
      >
        <View style={styles.locationModalOverlay}>
          <View style={styles.locationModalContainer}>
            <Text style={styles.modalTitle}>{title}</Text>
            
            {/* Invisible button to help with keyboard focus if needed */}
            <TouchableOpacity 
              style={{ position: 'absolute', top: 50, right: 10, opacity: 0.1, padding: 8 }}
              onPress={() => {
                if (googlePlacesRef.current) {
                  googlePlacesRef.current.focus();
                }
              }}
            >
              <Text style={{ fontSize: 12, color: '#999' }}>📝</Text>
            </TouchableOpacity>
            
            <View style={{ flex: 1 }}>
              {/* Hidden TextInput helper to force keyboard */}
              <TextInput
                ref={focusHelperRef}
                style={{ position: 'absolute', left: -1000, opacity: 0, height: 1 }}
                autoFocus={false}
              />
              
              <TextInput
                ref={googlePlacesRef}
                style={[styles.textInput, { marginBottom: 8 }]}
                placeholder={placeholder}
                placeholderTextColor="#999"
                autoFocus={true}
                selectTextOnFocus={true}
                blurOnSubmit={false}
                returnKeyType="search"
                enablesReturnKeyAutomatically={true}
                keyboardType="default"
                autoCorrect={false}
                autoCapitalize="words"
                clearButtonMode="while-editing"
                onChangeText={(text) => {
                  if (text.length === 0) {
                    setProcessedResults([]);
                    setIsCalculatingDistances(false);
                  } else {
                    debouncedSearchPlaces(text);
                  }
                }}
                onFocus={() => {
                  // Additional focus handler to ensure keyboard stays open
                  console.log('TextInput focused');
                }}
              />
              
              {isCalculatingDistances ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
                  <Text style={{ marginTop: 16, color: '#666', fontSize: 16 }}>Calculating distances...</Text>
                  <Text style={{ marginTop: 4, color: '#999', fontSize: 14 }}>Please wait while we find the best matches</Text>
                </View>
              ) : (
                <ScrollView style={{ flex: 1, backgroundColor: '#fff' }} keyboardShouldPersistTaps="always">
                  {processedResults.map((result, index) => {
                    const title = result.description || result.formatted_address || result.name || (result.structured_formatting ? result.structured_formatting.main_text : '');
                    const distance = result.distance;

                    return (
                      <TouchableOpacity
                        key={`${result.place_id}-${index}`}
                        style={{ 
                          flexDirection: 'row', 
                          alignItems: 'center', 
                          paddingVertical: 12, 
                          paddingHorizontal: 8, 
                          borderBottomWidth: 1, 
                          borderBottomColor: '#f0f0f0' 
                        }}
                        onPress={() => {
                          console.log('Row press recognized:', result);
                          console.log('Rich location data:', result.richLocationData);
                          if (title) {
                            updateField('location', title);
                            // Save rich location data if available
                            if (result.richLocationData) {
                              updateField('location_data', result.richLocationData);
                            }
                          }
                          setShowLocationModal(false);
                        }}
                      >
                        <FontAwesome6 name="location-dot" size={18} color={THEME_COLORS.bluePrimary} style={{ marginRight: 8 }} />
                        <Text style={{ flex: 1, fontSize: 14, color: '#000', minWidth: 0 }} numberOfLines={2}>{title}</Text>
                        {userCoords && distance !== null && distance !== undefined && (
                          <Text style={{ marginLeft: 8, fontSize: 12, color: '#555', fontWeight: '500' }}>{`${distance.toFixed(1)} km`}</Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                  
                  {processedResults.length === 0 && !isCalculatingDistances && (
                    <View style={{ padding: 20, alignItems: 'center' }}>
                      <Text style={{ color: '#999', fontSize: 14 }}>Start typing to search for places</Text>
                    </View>
                  )}
                </ScrollView>
              )}
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // Modal de seleção de grade (copiado do ClimbingSessionForm)
  const renderGradePickerModal = () => {
    return (
      <Modal
        visible={showGradePicker}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowGradePicker(false)}
      >
        <TouchableOpacity 
          style={(styles as any).gradeModalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowGradePicker(false)}
        >
          <View style={(styles as any).gradeModalContainer}>
            <View style={(styles as any).gradeModalHeader}>
              <Text style={(styles as any).gradeModalTitle}>Select Grade</Text>
            </View>
            <ScrollView style={(styles as any).gradeList} showsVerticalScrollIndicator={true}>
              <TouchableOpacity
                style={[
                  (styles as any).gradeOption,
                  editedSession.grade === '' && (styles as any).gradeOptionSelected
                ]}
                onPress={() => {
                  updateField('grade', '');
                  setShowGradePicker(false);
                }}
              >
                <Text style={[
                  (styles as any).gradeOptionText,
                  editedSession.grade === '' && (styles as any).gradeOptionTextSelected
                ]}>
                  None
                </Text>
                {editedSession.grade === '' && (
                  <FontAwesome6 name="check" size={16} color={THEME_COLORS.bluePrimary} />
                )}
              </TouchableOpacity>
              {filteredGradeOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    (styles as any).gradeOption,
                    editedSession.grade === option && (styles as any).gradeOptionSelected
                  ]}
                  onPress={() => {
                    updateField('grade', option);
                    setShowGradePicker(false);
                  }}
                >
                  <Text style={[
                    (styles as any).gradeOptionText,
                    editedSession.grade === option && (styles as any).gradeOptionTextSelected
                  ]}>
                    {option}
                  </Text>
                  {editedSession.grade === option && (
                    <FontAwesome6 name="check" size={16} color={THEME_COLORS.bluePrimary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  // Componente de imagem com carregamento assíncrono - memorizado para evitar piscamento
  const ImageDisplay = React.useMemo(() => {
    return React.memo(({ title, imagePath, isEditable }: { title: string, imagePath: string | null, isEditable?: boolean }) => {
      const [imageUrl, setImageUrl] = useState<string | null>(null);
      const [loading, setLoading] = useState(false);
      const [error, setError] = useState<string | null>(null);

      useEffect(() => {
        if (!imagePath) {
          setImageUrl(null);
          return;
        }

        // Se é uma imagem local (nova selecionada), usar diretamente
        if (imagePath.startsWith('file://') || imagePath.startsWith('content://')) {
          setImageUrl(imagePath);
          return;
        }

        const loadImage = async () => {
          setLoading(true);
          setError(null);
          
          try {
            // Para buckets privados, usar createSignedUrl
            const { data, error: supabaseError } = await supabase.storage
              .from('climbing-images')
              .createSignedUrl(imagePath, 3600); // URL válida por 1 hora
            
            if (supabaseError) {
              setError(supabaseError.message);
              return;
            }
            
            const signedUrl = data.signedUrl;
            setImageUrl(signedUrl);
            
          } catch (err) {
            setError('Failed to load image');
          } finally {
            setLoading(false);
          }
        };

        loadImage();
      }, [imagePath]);

      const renderImageContent = () => {
        if (imagePath) {
          if (loading) {
            return (
              <View style={styles.imagePlaceholder}>
                <ActivityIndicator size="small" color={THEME_COLORS.bluePrimary} />
                <Text style={styles.imagePlaceholderText}>Loading image...</Text>
              </View>
            );
          } else if (error) {
            return (
              <View style={styles.imagePlaceholder}>
                <FontAwesome6 name="exclamation-triangle" size={24} color="#ff6b6b" />
                <Text style={styles.imagePlaceholderText}>Error: {error}</Text>
              </View>
            );
          } else if (imageUrl) {
            return (
              <Image 
                source={{ uri: imageUrl }} 
                style={(styles as any).imagePreview}
                resizeMode="cover"
              />
            );
          } else {
            return (
              <View style={styles.imagePlaceholder}>
                <FontAwesome6 name="camera" size={24} color="#999" />
                <Text style={styles.imagePlaceholderText}>No image URL generated</Text>
              </View>
            );
          }
        } else {
          return (
            <View style={styles.imagePlaceholder}>
              <FontAwesome6 name="camera" size={24} color="#999" />
              <Text style={styles.imagePlaceholderText}>
                {isEditable ? 'Tap to add a photo' : 'No image added'}
              </Text>
            </View>
          );
        }
      };

      return (
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>{title}</Text>
          {isEditable ? (
            <TouchableOpacity style={(styles as any).imageUploadButton} onPress={pickImage}>
              {renderImageContent()}
            </TouchableOpacity>
          ) : (
            <View style={styles.imageContainer}>
              {renderImageContent()}
            </View>
          )}
        </View>
      );
    });
  }, []);

  // Opções para as tags
  const movementOptions = [
    'Dynamic', 'Static', 'Compression', 'Mantling', 'Stemming', 'Layback', 
    'Undercling', 'Deadpoint', 'Dyno', 'Campus', 'Lock-off', 'Gaston',
    'Side Pull', 'Heel Hook', 'Toe Hook', 'Flagging', 'Barn Door', 'Drop Knee'
  ];

  const gripOptions = [
    'Crimp', 'Open Hand', 'Pinch', 'Sloper', 'Jug', 'Pocket', 'Edge',
    'Volume', 'Undercling', 'Side Pull', 'Gaston', 'Horn', 'Rail',
    'Incut', 'Two Finger Pocket', 'Three Finger Pocket', 'Mono'
  ];

  const footworkOptions = [
    'Edging', 'Smearing', 'Heel Hook', 'Toe Hook', 'Inside Edge', 'Outside Edge',
    'Drop Knee', 'High Step', 'Rock Over', 'Mantling', 'Stemming', 'Flagging',
    'Back Step', 'Bicycle', 'Cam Hook', 'Toe Cam', 'Knee Bar', 'Rest Position'
  ];

  // Componente para seleção de tags
  const renderTagSelector = (title: string, field: string, options: string[], showModal: boolean, setShowModal: (show: boolean) => void) => {
    // Parse existing tags from session - need to handle string format from DB
    const getExistingTags = () => {
      const sessionTags = isEditing ? editedSession[field as keyof ClimbingSession] : session[field as keyof ClimbingSession];
      if (typeof sessionTags === 'string') {
        // Handle string format from database (e.g., "Dynamic,Static,Compression")
        return sessionTags.replace(/[\[\]"]/g, '').split(',').filter(tag => tag.trim() !== '');
      }
      if (Array.isArray(sessionTags)) {
        return sessionTags;
      }
      return [];
    };
    
    const selectedTags = getExistingTags();
    
    // Determinar qual estado temporário usar baseado no campo
    const getTempTags = () => {
      switch (field) {
        case 'movement': return tempMovementTags;
        case 'grip': return tempGripTags;
        case 'footwork': return tempFootworkTags;
        default: return [];
      }
    };

    const setTempTags = (tags: string[]) => {
      switch (field) {
        case 'movement': setTempMovementTags(tags); break;
        case 'grip': setTempGripTags(tags); break;
        case 'footwork': setTempFootworkTags(tags); break;
      }
    };

    const tempSelectedTags = getTempTags();

    const openModal = () => {
      setTempTags([...selectedTags]);
      setShowModal(true);
    };

    const toggleTag = (tag: string) => {
      const newTags = tempSelectedTags.includes(tag) 
        ? tempSelectedTags.filter(t => t !== tag)
        : [...tempSelectedTags, tag];
      setTempTags(newTags);
    };

    const saveSelection = () => {
      updateArrayField(field, tempSelectedTags);
      setShowModal(false);
    };

    const removeTag = (tagToRemove: string) => {
      const newTags = selectedTags.filter(tag => tag !== tagToRemove);
      updateArrayField(field, newTags);
    };

    const getFieldName = () => {
      switch (field) {
        case 'movement': return 'movement';
        case 'grip': return 'grip';
        case 'footwork': return 'footwork';
        default: return field;
      }
    };

    return (
      <View style={[styles.fieldContainer, (styles as any).fieldContainerWithTags]}>
        <Text style={styles.label}>{title}</Text>
        <View style={styles.tagsContainer}>
          {selectedTags.map((tag, index) => (
            <TouchableOpacity key={index} style={styles.tagChip} onPress={() => removeTag(tag)}>
              <Text style={styles.tagChipText}>{tag}</Text>
              <FontAwesome6 name="xmark" size={12} color="#fff" style={(styles as any).tagChipRemove} />
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={(styles as any).addTagButton} onPress={openModal}>
            <Text style={(styles as any).addTagButtonText}>+ Add {getFieldName()}</Text>
          </TouchableOpacity>
        </View>

        <Modal
          visible={showModal}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setShowModal(false)}
        >
          <TouchableOpacity 
            style={(styles as any).tagModalOverlay} 
            activeOpacity={1} 
            onPress={() => setShowModal(false)}
          >
            <TouchableOpacity 
              style={(styles as any).tagModalContainer}
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={(styles as any).tagModalHeader}>
                <Text style={(styles as any).tagModalTitle}>Select {title}</Text>
              </View>
              <ScrollView style={(styles as any).tagsList} showsVerticalScrollIndicator={true}>
                {[...options].sort().map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      (styles as any).tagOption,
                      tempSelectedTags.includes(option) && (styles as any).tagOptionSelected
                    ]}
                    onPress={() => toggleTag(option)}
                  >
                    <Text style={[
                      (styles as any).tagOptionText,
                      tempSelectedTags.includes(option) && (styles as any).tagOptionTextSelected
                    ]}>
                      {option}
                    </Text>
                    <Text style={(styles as any).tagOptionPlus}>+</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              <TouchableOpacity style={(styles as any).tagSaveButton} onPress={saveSelection}>
                <Text style={(styles as any).tagSaveButtonText}>Save</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </View>
    );
  };

  // Opções para localização
  const locationOptions = [
    {
      value: 'Indoor',
      label: 'Indoor',
      imageUrl: require('../assets/images/indoor.png')
    },
    {
      value: 'Outdoor',
      label: 'Outdoor',
      imageUrl: require('../assets/images/outdoor.png')
    }
  ];

  // Opções para atividade
  const activityOptions = [
    {
      value: 'Climbing',
      label: 'Climbing',
      imageUrl: require('../assets/images/climbing.png')
    },
    {
      value: 'Bouldering',
      label: 'Bouldering',
      imageUrl: require('../assets/images/bouldering.png')
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <FontAwesome6 name="xmark" size={22} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={isEditing ? cancelEditing : startEditing}
          style={styles.editButton}
        >
          <Text style={styles.editButtonText}>
            {isEditing ? 'Cancel' : 'Edit'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.modalTitle}>Session Details ✨</Text>
        <Text style={styles.modalSubtitle}>
          View your climbing session information
        </Text>

        {/* Step 1: Basic Information */}
        {renderDateTimeDisplay('', currentSession.when)}
        
                {renderVisualSelector('Location', currentSession.place || '', locationOptions, 'place')}
        
        {(isEditing ? editedSession.location : currentSession.location) && (
          <View style={[
            styles.locationDisplayRow,
            showValidationErrors && editedSession.place && (!editedSession.location || editedSession.location.trim() === '') && styles.locationDisplayRowError
          ]}>
            <FontAwesome6 name="location-dot" size={18} color={THEME_COLORS.bluePrimary} style={{ marginRight: 8 }} />
            <Text style={styles.locationDisplayText} numberOfLines={2}>
              {isEditing ? editedSession.location : currentSession.location}
            </Text>
            {isEditing && (
              <TouchableOpacity onPress={() => setShowLocationModal(true)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <Text style={styles.changeLinkText}>Change</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        
        {renderVisualSelector('Style', currentSession.activity || '', activityOptions, 'activity')}

        {/* Step 2: Route Details */}
        <View style={styles.sharedRowContainer}>
          <View style={styles.routeNameContainer}>
            {renderTextDisplay('Route number', currentSession.routeNumber || '', 'Add number', 'routeNumber')}
          </View>
          <View style={styles.routeColorContainer}>
            {renderColorDisplay('Color', currentSession.colour || '', 'colour')}
          </View>
        </View>

        {renderDropdownDisplay('Grade', currentSession.grade || '', 'Select grade', 'grade')}
        
        {renderOptionsDisplay('Completion', currentSession.completion || '', ['Completed', 'Attempt'], 'completion')}

        {renderStarRating('Route Rating', parseInt(currentSession.routeRating || '0'), 'routeRating')}

        {/* Step 3: Performance */}
        {renderDifficultyDisplay('Difficulty', parseInt(currentSession.difficulty || '5'), 'difficulty')}
        
        {renderFeelingDisplay('How It Felt', currentSession.howItFelt || '', 'howItFelt')}
        
        {renderFallsDisplay('Number of Falls', parseInt(currentSession.falls || '0'), 'falls')}
        
        {renderOptionsDisplay('Ascent Type', currentSession.ascentType || '', ['Redpoint', 'Onsight', 'Flash'], 'ascentType')}

        {currentSession.activity === 'Climbing' && 
          renderOptionsDisplay('Top / Lead', currentSession.climbingType || '', ['Top', 'Lead'], 'climbingType')
        }

        {/* Step 4: Comments and Image */}
        {renderTextDisplay('Comments/Tips', currentSession.comments || '', 'No comments logged', 'comments')}
        
        <ImageDisplay 
          title="Image" 
          imagePath={isEditing ? (editedSession.tempImage || (currentSession.images && currentSession.images.length > 0 ? currentSession.images[0] : null)) : (currentSession.images && currentSession.images.length > 0 ? currentSession.images[0] : null)} 
          isEditable={isEditing}
        />

        {/* Step 5: Technique Tags */}
        {renderTagsDisplay('Movement', currentSession.movement && currentSession.movement !== '' ? currentSession.movement.replace(/[\[\]"]/g, '').split(',').filter(tag => tag.trim() !== '') : [], 'movement')}
        {renderTagsDisplay('Grip', currentSession.grip && currentSession.grip !== '' ? currentSession.grip.replace(/[\[\]"]/g, '').split(',').filter(tag => tag.trim() !== '') : [], 'grip')}
        {renderTagsDisplay('Footwork', currentSession.footwork && currentSession.footwork !== '' ? currentSession.footwork.replace(/[\[\]"]/g, '').split(',').filter(tag => tag.trim() !== '') : [], 'footwork')}

        {/* Action Button - Delete or Save */}
        <View style={styles.actionButtonSpacer} />
      </ScrollView>

      {/* Fixed Bottom Bar */}
      <View style={styles.fixedBottomBar}>
        {isEditing ? (
          <TouchableOpacity 
            style={styles.saveButton}
            onPress={handleSaveSession}
          >
            <FontAwesome6 name="check" size={18} color="#fff" />
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={() => setShowDeleteModal(true)}
            >
            <FontAwesome6 name="trash" size={18} color="#fff" />
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowDeleteModal(false)}
        >
          <TouchableOpacity 
            style={styles.deleteModalContainer}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.deleteModalHeader}>
              <FontAwesome6 name="trash" size={32} color="#ff6b6b" />
              <Text style={styles.deleteModalTitle}>Delete Session</Text>
        </View>

            <Text style={styles.deleteModalMessage}>
              This action cannot be undone.
            </Text>
            
            <View style={styles.deleteModalActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.confirmDeleteButton}
                onPress={handleDeleteSession}
              >
                <Text style={styles.confirmDeleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Color Picker Modal */}
      {renderColorPickerModal()}

      {/* Grade Picker Modal */}
      {renderGradePickerModal()}

      {/* Location Selection Modal - Reused from ClimbingSessionForm */}
      {renderLocationModal()}

      {/* Snackbar */}
      {showSnackbar && (
        <View style={styles.snackbarContainer}>
          <View style={styles.snackbar}>
            <Text style={styles.snackbarText}>{snackbarMessage}</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME_COLORS.background.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff',
  },
  closeButton: {
    padding: 5,
  },
  headerRight: {
    width: 40,
    height: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 0,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 25,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  // DateTime Display
  dateTimeDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginTop: 6,
  },
  dateIcon: {
    marginRight: 10,
  },
  dateTimeDisplayText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  // Visual Selector
  locationContainer: {
    flexDirection: 'row',
    marginTop: 6,
  },
  buttonSpacer: {
    width: 16,
  },
  locationButton: {
    flex: 1,
    height: 150,
    backgroundColor: THEME_COLORS.background.primary,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  locationButtonSelected: {
    borderColor: THEME_COLORS.bluePrimary,
    backgroundColor: '#f0f7ff',
  },
  locationButtonError: {
    borderColor: '#ff0000',
    backgroundColor: '#fff5f5',
  },
  dropdownButtonError: {
    borderColor: '#ff0000',
    backgroundColor: '#fff5f5',
    borderWidth: 2,
  },
  locationImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginBottom: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  locationTextSelected: {
    color: THEME_COLORS.bluePrimary,
  },
  // Disabled states for non-editing mode
  disabledButton: {
    opacity: 0.4,
    backgroundColor: '#f5f5f5',
    borderColor: '#d0d0d0',
  },
  disabledImage: {
    opacity: 0.4,
  },
  disabledText: {
    color: '#999',
  },
  disabledEmoji: {
    opacity: 0.4,
  },
  locationDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 0,
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  locationDisplayText: {
    flex: 1,
    fontSize: 14,
    color: '#000',
  },
  changeLinkText: { 
    color: THEME_COLORS.bluePrimary, 
    fontSize: 14, 
    fontWeight: '600', 
    marginLeft: 8 
  },
  // Color selector button
  colorSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME_COLORS.background.input,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: 80,
    height: 50,
    marginTop: 6,
  },
  colorDropdownIcon: {
    marginLeft: 8,
  },
  // Color modal styles (copiados do ClimbingSessionForm)
  colorModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    zIndex: 1000,
  },
  colorGrid: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    marginBottom: 16,
    width: 240,
  },
  colorRowLast: {
    marginBottom: 0,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  colorOptionWhite: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  colorOptionSelected: {
    transform: [{ scale: 1.15 }],
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  colorCheckmark: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
  },
  colorCheckmarkText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Dropdown button styles (copiados do ClimbingSessionForm)
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME_COLORS.background.input,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minWidth: 120,
    height: 50,
    marginTop: 6,
  },
  dropdownButtonText: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '400',
  },
  dropdownPlaceholderText: {
    color: '#999',
  },
  dropdownIcon: {
    marginLeft: 0,
  },
  // Grade modal styles (copiados do ClimbingSessionForm)
  gradeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradeModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    width: '80%',
    maxWidth: 300,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  gradeModalHeader: {
    alignItems: 'center',
    marginBottom: 15,
  },
  gradeModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  gradeList: {
    maxHeight: 350,
  },
  gradeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderRadius: 8,
    marginVertical: 2,
  },
  gradeOptionSelected: {
    backgroundColor: '#f0f7ff',
  },
  gradeOptionText: {
    fontSize: 16,
    color: '#333',
  },
  gradeOptionTextSelected: {
    color: THEME_COLORS.bluePrimary,
    fontWeight: '600',
  },
  // Slider styles (copiados do ClimbingSessionForm)
  sliderContainerFullWidth: {
    paddingHorizontal: 15,
    paddingVertical: 0,
    marginTop: 12,
  },
  sliderLabelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sliderLabelLeft: {
    fontSize: 14,
    color: '#666',
    marginRight: 15,
  },
  sliderLabelRight: {
    fontSize: 14,
    color: '#666',
    marginLeft: 15,
  },
  sliderNativeFullWidth: {
    width: '100%',
    height: 40,
  },
  // Image Upload styles (copiados do ClimbingSessionForm)
  imageUploadButton: {
    height: 150,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  imageUploadText: {
    marginTop: 8,
    color: '#666',
  },
  // Tags Modal styles (copiados do ClimbingSessionForm)
  fieldContainerWithTags: {
    marginBottom: 20,
  },
  tagChipRemove: {
    marginLeft: 6,
  },
  addTagButton: {
    borderColor: THEME_COLORS.bluePrimary,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 8,
  },
  addTagButtonText: {
    color: THEME_COLORS.bluePrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  tagModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    width: '85%',
    maxWidth: 350,
    maxHeight: '70%',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  tagModalHeader: {
    alignItems: 'center',
    marginBottom: 15,
  },
  tagModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  tagsList: {
    maxHeight: 300,
  },
  tagOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    marginVertical: 2,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  tagOptionSelected: {
    backgroundColor: '#f0f7ff',
    borderColor: THEME_COLORS.bluePrimary,
  },
  tagOptionText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  tagOptionTextSelected: {
    color: THEME_COLORS.bluePrimary,
  },
  tagOptionPlus: {
    fontSize: 16,
    color: '#999',
    fontWeight: 'bold',
  },
  tagSaveButton: {
    backgroundColor: THEME_COLORS.bluePrimary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 15,
  },
  tagSaveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  locationDisplayRowError: {
    backgroundColor: '#fff5f5',
    borderWidth: 1,
    borderColor: '#ff6b6b',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  // Color Display
  colorDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME_COLORS.background.input,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: 80,
    height: 50,
    marginTop: 6,
  },
  colorPreview: {
    width: 30,
    height: 30,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  colorDisplayText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  // Dropdown Display
  dropdownDisplayContainer: {
    backgroundColor: THEME_COLORS.background.input,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 50,
    justifyContent: 'center',
    marginTop: 6,
  },
  dropdownDisplayText: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '400',
  },
  dropdownPlaceholderText: {
    color: '#999',
  },
  // Options Display
  optionsContainer: {
    flexDirection: 'row',
    marginTop: 6,
  },
  optionButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  optionButtonSelected: {
    backgroundColor: THEME_COLORS.bluePrimary,
    borderColor: THEME_COLORS.bluePrimary,
  },
  optionButtonError: {
    borderColor: '#ff0000',
    backgroundColor: '#fff5f5',
    borderWidth: 2,
  },
  optionText: {
    fontSize: 14,
    color: '#666',
  },
  optionTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  // Stars Display
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  starsContainerError: {
    borderWidth: 2,
    borderColor: '#ff0000',
    borderRadius: 8,
    padding: 8,
    backgroundColor: '#fff5f5',
  },
  starButton: {
    marginRight: 8,
    padding: 4,
  },
  // Feelings Display
  feelingsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  feelingButton: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 4,
  },
  feelingButtonSelected: {
    // Sem background nem borda quando selecionado
  },
  feelingEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  feelingText: {
    fontSize: 11,
    fontWeight: '400',
    color: '#666',
    textAlign: 'center',
  },
  feelingTextSelected: {
    color: THEME_COLORS.bluePrimary,
    fontWeight: '700',
  },
  // Difficulty Display
  difficultyDisplayContainer: {
    paddingHorizontal: 15,
    paddingVertical: 0,
    marginTop: 12,
  },
  difficultyBarContainer: {
    position: 'relative',
    marginBottom: 0,
  },
  difficultyBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  difficultyBarEmpty: {
    backgroundColor: '#f0f0f0',
  },
  difficultyProgress: {
    height: '100%',
    backgroundColor: THEME_COLORS.bluePrimary,
    borderRadius: 4,
  },
  difficultyThumb: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: THEME_COLORS.bluePrimary,
    top: -6,
    marginLeft: -8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  difficultyLabelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  difficultyLabelLeft: {
    fontSize: 14,
    color: '#666',
    marginRight: 15,
  },
  difficultyLabelRight: {
    fontSize: 14,
    color: '#666',
    marginLeft: 15,
  },
  difficultyValue: {
    textAlign: 'center',
    marginTop: 0,
    fontSize: 20,
    fontWeight: '600',
    color: THEME_COLORS.bluePrimary,
  },
  // Falls Display
  fallsDisplayContainer: {
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 0,
    marginTop: 6,
  },
  fallsValue: {
    fontSize: 20,
    fontWeight: '600',
    color: THEME_COLORS.bluePrimary,
  },
  fallsValueEmpty: {
    color: '#999',
  },
  // Counter Styles
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  counterButton: {
    backgroundColor: THEME_COLORS.bluePrimary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  counterButtonDisabled: {
    backgroundColor: '#e0e0e0',
  },
  counterButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  counterButtonTextDisabled: {
    color: '#999',
  },
  counterValueContainer: {
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  counterValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  // Tags Display
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 6,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME_COLORS.bluePrimary,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  tagChipText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyTagsText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginTop: 6,
  },
  // Text Display
  textDisplayContainer: {
    backgroundColor: THEME_COLORS.background.input,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    minHeight: 50,
    justifyContent: 'center',
    marginTop: 6,
  },
  textDisplayText: {
    fontSize: 16,
    color: '#000000',
  },
  textDisplayPlaceholder: {
    color: '#999',
    fontStyle: 'italic',
  },
  textInput: {
    backgroundColor: THEME_COLORS.background.input,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000000',
    marginTop: 6,
  },
  textInputError: {
    borderWidth: 2,
    borderColor: '#ff0000',
    backgroundColor: '#fff5f5',
  },
  routeNameInput: {
    height: 50,
  },
  // Image Display
  imageContainer: {
    marginTop: 6,
  },
  imagePreview: {
    width: '100%',
    height: 150,
    borderRadius: 12,
  },
  imagePlaceholder: {
    height: 150,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  imagePlaceholderText: {
    marginTop: 8,
    color: '#999',
  },

  // Shared Row
  sharedRowContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  routeNameContainer: {
    flex: 1,
    marginRight: 15,
  },
  routeColorContainer: {
    alignItems: 'flex-end',
  },
  // Edit Button
  editButton: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  editButtonText: {
    color: THEME_COLORS.bluePrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  // Action Buttons
  actionButtonContainer: {
    marginTop: 30,
    marginBottom: 20,
    alignItems: 'center',
  },
  actionButtonSpacer: {
    height: 80, // Reduzido para a barra mais compacta
  },
  fixedBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    alignItems: 'center',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff6b6b',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    minWidth: 280,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4caf50',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    minWidth: 280,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Delete Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 20,
    width: '90%',
    maxWidth: 400,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  deleteModalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginTop: 12,
  },
  deleteModalMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  deleteModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  confirmDeleteButton: {
    flex: 1,
    backgroundColor: '#ff6b6b',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmDeleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  // Location Modal (reused from ClimbingSessionForm)
  locationModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
  },
  locationModalContainer: { 
    backgroundColor: '#fff', 
    borderRadius: 8, 
    padding: 16, 
    marginTop: 50,
    marginBottom: 50,
    marginLeft: 16,
    marginRight: 16,
    flex: 1,
    minHeight: 400
  },
  locationModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  // Snackbar
  snackbarContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 1000,
  },
  snackbar: {
    backgroundColor: '#333',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    maxWidth: '90%',
  },
  snackbarText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
}); 