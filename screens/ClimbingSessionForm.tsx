import { FontAwesome6 } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import Slider from '@react-native-community/slider';
import * as Location from 'expo-location';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    BackHandler,
    Dimensions,
    Image,
    InteractionManager,
    Keyboard,
    Modal,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { SafeAreaView } from 'react-native-safe-area-context';
import MultiImagePicker from '../components/MultiImagePicker';
import { THEME_COLORS } from '../constants/Theme';

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');
// NEW: Google Maps API key (expects env var from Expo config)
const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyDhK-e-oV7ex0f0gk3R1DMnlXCYSmfgOio';

interface ClimbingSessionFormProps {
  navigation: any;
  route: any;
}

export default function ClimbingSessionForm({ navigation, route }: ClimbingSessionFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showGradePicker, setShowGradePicker] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [showGripModal, setShowGripModal] = useState(false);
  const [showFootworkModal, setShowFootworkModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'date' | 'time'>('date');
  const [tempMovementTags, setTempMovementTags] = useState<string[]>([]);
  const [tempGripTags, setTempGripTags] = useState<string[]>([]);
  const [tempFootworkTags, setTempFootworkTags] = useState<string[]>([]);

  // Validation/error helpers
  const [showErrorsStep1, setShowErrorsStep1] = useState(false);
  const [showErrorsStep2, setShowErrorsStep2] = useState(false);

  // Snackbar for error messages
  const [snackMessage, setSnackMessage] = useState<string>('');
  const [showSnack, setShowSnack] = useState(false);

  const triggerSnack = (msg: string) => {
    setSnackMessage(msg);
    setShowSnack(true);
    setTimeout(() => setShowSnack(false), 3000);
  };

  // Reset error flags on mount
  useEffect(() => {
    setShowErrorsStep1(false);
    setShowErrorsStep2(false);
  }, []);

  const isStepValid = (step: number): boolean => {
    if (step === 1) {
      return (
        formData.when !== '' &&
        formData.place.trim() !== '' &&
        formData.location.trim() !== '' && // NEW validation
        formData.activity.trim() !== ''
      );
    }
    if (step === 2) {
      return (
        formData.routeNumber.trim() !== '' &&
        formData.grade.trim() !== '' &&
        formData.completion.trim() !== '' &&
        formData.colour.trim() !== '' &&
        formData.routeRating !== 0
      );
    }
    return true; // Steps 3-5 are optional
  };

  // Main form state (declared early so it can be used by auto-advance logic below)
  const [formData, setFormData] = useState({
    place: '',
    location: '', // NEW – selected gym or outdoor place
    location_data: null as any, // Rich location data from Google Places API
    when: new Date().toISOString(), // Data e hora atual (obrigatória)
    activity: '',
    colour: THEME_COLORS.bluePrimary, // Cor inicial azul
    routeNumber: '',
    grade: '',
    difficulty: 5, // Mudado para 5 (meio do slider)
    falls: 0,
    ascentType: '',
    movement: [] as string[],
    grip: [] as string[],
    footwork: [] as string[],
    routeRating: 0,
    howItFelt: '',
    comments: '',
    climbingType: '',
    completion: '',
    images: [] as string[],
  });

  // Cores disponíveis para seleção (3 linhas de 5 cores cada)
  const colorOptions = [
    // Primeira linha
    '#ffffff', '#ffeb3b', '#ff9800', '#f44336', '#e91e63',
    // Segunda linha  
    '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4',
    // Terceira linha
    '#00bcd4', '#009688', '#4caf50', '#bdbdbd', '#000000'
  ];

  // Altura estimada dos botões + padding
  const navigationHeight = 95;
  const maxContentHeight = screenHeight * 0.85 - navigationHeight;

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateNumericField = (field: string, value: number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateArrayField = (field: string, value: string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  /* ------- Multiple Images Handling ------- */
  const handleImagesChange = (newImages: string[]) => {
    updateArrayField('images', newImages);
  };

  // -------- Auto-advance logic --------
  // Track previous validity by step to detect transitions from invalid ➜ valid
  const stepValidityRef = useRef<Record<number, boolean>>({});

  // Ref for Google Places input inside location modal
  const googlePlacesRef = useRef<TextInput>(null);

  useEffect(() => {
    const wasValid = stepValidityRef.current[currentStep] || false;
    const isValidNow = isStepValid(currentStep);

    // Store the latest validity status for this step
    stepValidityRef.current[currentStep] = isValidNow;

    // Auto-advance only when: (1) step is 1 or 2, (2) it has just become valid
    if (currentStep <= 2 && !wasValid && isValidNow) {
      handleNext();
    }
  }, [formData, currentStep]);

  // Function to filter grade options based on user's preferred grading system
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
      case 'british':
        return [
          'M 1a', 'D 2a', 'VD 3a', 'S 4a', 'HS 4b', 'HVS 4c', 'HVS 5a',
          'E1 5a', 'E1 5b', 'E2 5b', 'E2 5c', 'E3 5c', 'E3 6a', 'E4 6a', 'E4 6b',
          'E5 6a', 'E5 6b', 'E6 6b', 'E6 6c', 'E7 6c', 'E7 7a', 'E8 7a', 'E9 7b',
          'E10 7b', 'E11 7c'
        ];
      case 'v-scale':
        return [
          'VB', 'V0-', 'V0', 'V0+', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9',
          'V10', 'V11', 'V12', 'V13', 'V14', 'V15', 'V16', 'V17'
        ];
      default:
        // Fallback to YDS
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

  // Get filtered grade options based on user's preference
  const filteredGradeOptions = getFilteredGradeOptions(route.params?.userInfo?.gradingSystem);

  // Renderizar avaliação por estrelas
  const renderStarRating = (title: string, field: string, showErrorFlag?: boolean) => {
    const rating = formData[field as keyof typeof formData] as number || 0;
    
    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>{title}</Text>
        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((star) => {
            const isError = showErrorFlag && rating === 0;
            const filled = star <= rating;
            return (
              <TouchableOpacity
                key={star}
                onPress={() => updateNumericField(field, star)}
                style={styles.starButton}
              >
                {isError ? (
                  <FontAwesome6
                    name="star"
                    size={28}
                    color="#ff0000"
                  />
                ) : (
                  <FontAwesome6
                    name="star"
                    size={28}
                    color={filled ? "#FFD700" : "#E0E0E0"}
                    solid={filled}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  // Versões compactas para passos 1 e 2
  const renderDateTimePickerCompact = (title: string, field: string, showErrorFlag?: boolean) => {
    const fieldValue = formData[field as keyof typeof formData] as string;
    const currentDate = fieldValue ? new Date(fieldValue) : new Date();
    const isEmpty = !fieldValue || fieldValue === '';
    const showError = showErrorFlag && isEmpty;
    
    const formatDateTime = (date: Date) => {
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${day}/${month}/${year}, ${hours}:${minutes}`;
    };

    const handleDateChange = (event: any, selectedDate?: Date) => {
      if (selectedDate) {
        if (datePickerMode === 'date') {
          // Após selecionar a data, automaticamente abrir seleção de hora
          if (Platform.OS === 'android') {
            setShowDatePicker(false);
            // Pequeno delay para melhor UX no Android
            setTimeout(() => {
              setDatePickerMode('time');
              setShowDatePicker(true);
            }, 100);
          } else {
            // No iOS, mudar diretamente para modo time
            setDatePickerMode('time');
          }
        } else {
          // Após selecionar a hora, fechar o picker
          if (Platform.OS === 'android') {
            setShowDatePicker(false);
          }
        }
        
        updateField(field, selectedDate.toISOString());
      } else if (Platform.OS === 'android') {
        setShowDatePicker(false);
      }
    };

    const showDateTimePicker = () => {
      setDatePickerMode('date');
      setShowDatePicker(true);
    };

    return (
      <View style={styles.fieldContainer}>
        <View style={styles.dateTimePickerContainer}>
          <TouchableOpacity
            style={[styles.dateTimeButton, showError && styles.dateTimeButtonError]}
            onPress={showDateTimePicker}
          >
            <FontAwesome6 
              name="calendar-days" 
              size={18} 
              color={THEME_COLORS.bluePrimary}
              style={styles.dateIcon}
            />
            <Text style={[styles.dateTimeButtonText, showError && styles.dateTimeButtonTextError]}>
              {isEmpty ? 'Select date and time' : formatDateTime(currentDate)}
            </Text>
            <FontAwesome6 
              name="chevron-down" 
              size={14} 
              color="#666"
            />
          </TouchableOpacity>
        </View>
        
        {showError && (
          <Text style={styles.errorText}>This field is required</Text>
        )}
        
        {showDatePicker && (
          <DateTimePicker
            value={currentDate}
            mode={datePickerMode}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            minimumDate={new Date(2020, 0, 1)}
            maximumDate={new Date(2030, 11, 31)}
          />
        )}
      </View>
    );
  };

  const renderDateInputCompact = (title: string, field: string, placeholder?: string) => {
    const fieldValue = formData[field as keyof typeof formData];
    const isEmpty = !fieldValue || fieldValue === '';
    const displayValue = formatDateForDisplay(fieldValue as string);
    
    return (
      <View style={styles.fieldContainer}>
        <View style={styles.dateInputContainer}>
          <FontAwesome6 
            name="calendar-days" 
            size={18} 
            color={THEME_COLORS.bluePrimary}
            style={styles.dateIcon}
          />
          <TextInput
            style={[
              styles.dateInputWithIcon,
              isEmpty && styles.textInputError
            ]}
            value={displayValue}
            onChangeText={(value) => {
              const timestamp = parseDisplayDate(value);
              updateField(field, timestamp);
            }}
            placeholder={placeholder}
          />
        </View>
        {isEmpty && (
          <Text style={styles.errorText}>This field is required</Text>
        )}
      </View>
    );
  };

  const renderVisualSelectorCompact = (
    title: string, 
    field: string, 
    options: Array<{value: string, label: string, imageUrl: any}>,
    showErrorFlag?: boolean
  ) => {
    const handleOptionPress = (value: string) => {
      if (formData[field as keyof typeof formData] === value) {
        updateField(field, '');
      } else {
        updateField(field, value);
      }
    };

    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>{title}</Text>
        <View style={styles.locationContainer}>
          <TouchableOpacity
            key={options[0].value}
            style={[
              styles.locationButton,
              formData[field as keyof typeof formData] === options[0].value && styles.locationButtonSelected,
              showErrorFlag && styles.locationButtonError
            ]}
            onPress={() => handleOptionPress(options[0].value)}
          >
            <Image
              key={`${field}-${options[0].value}-image`}
              source={options[0].imageUrl}
              style={styles.locationImage}
              resizeMode="cover"
              onError={(error) => console.log(`Erro ${options[0].label}:`, error.nativeEvent.error)}
              onLoad={() => console.log(`✅ ${options[0].label} carregou`)}
            />
            <Text style={[
              styles.locationText,
              formData[field as keyof typeof formData] === options[0].value && styles.locationTextSelected
            ]}>
              {options[0].label}
            </Text>
          </TouchableOpacity>
          
          <View style={styles.buttonSpacer} />
          
          <TouchableOpacity
            key={options[1].value}
            style={[
              styles.locationButton,
              formData[field as keyof typeof formData] === options[1].value && styles.locationButtonSelected,
              showErrorFlag && styles.locationButtonError
            ]}
            onPress={() => handleOptionPress(options[1].value)}
          >
            <Image
              key={`${field}-${options[1].value}-image`}
              source={options[1].imageUrl}
              style={styles.locationImage}
              resizeMode="cover"
              onError={(error) => console.log(`Erro ${options[1].label}:`, error.nativeEvent.error)}
              onLoad={() => console.log(`✅ ${options[1].label} carregou`)}
            />
            <Text style={[
              styles.locationText,
              formData[field as keyof typeof formData] === options[1].value && styles.locationTextSelected
            ]}>
              {options[1].label}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderColorSelectorCompact = () => {
    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Color</Text>
        <TouchableOpacity
          style={styles.colorSelectorButton}
          onPress={() => setShowColorPicker(true)}
        >
          <View style={[styles.colorPreview, { backgroundColor: formData.colour }]} />
          <FontAwesome6 
            name="chevron-down" 
            size={14} 
            color="#666"
            style={styles.colorDropdownIcon}
          />
        </TouchableOpacity>
      </View>
    );
  };

  const renderDropdownPickerCompact = (title: string, field: string, options: string[], showPicker: boolean, setShowPicker: (show: boolean) => void, showErrorFlag?: boolean) => {
    const selectedValue = formData[field as keyof typeof formData] || '';
    
    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>{title}</Text>
        <TouchableOpacity
          style={[styles.dropdownButton, showErrorFlag && selectedValue==='' && styles.dropdownButtonError]}
          onPress={() => setShowPicker(true)}
        >
          <Text style={[styles.dropdownButtonText, !selectedValue && styles.dropdownPlaceholderText]}>
            {selectedValue || 'Select grade'}
          </Text>
          <FontAwesome6 
            name="chevron-down" 
            size={14} 
            color="#666"
            style={styles.dropdownIcon}
          />
        </TouchableOpacity>
      </View>
    );
  };

  const renderPickerNoTitleCompact = (field: string, options: string[], showErrorFlag?: boolean) => {
    const handleOptionPress = (value: string) => {
      if (formData[field as keyof typeof formData] === value) {
        updateField(field, '');
      } else {
        updateField(field, value);
      }
    };

    // Retorna apenas o ScrollView; o contêiner externo é responsável pelo espaçamento
    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsContainer}>
          {options.map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.optionButton,
                formData[field as keyof typeof formData] === option && styles.optionButtonSelected,
                showErrorFlag && (formData[field as keyof typeof formData] as string)==='' && styles.optionButtonError
              ]}
              onPress={() => handleOptionPress(option)}
            >
              <Text style={[
                styles.optionText,
                formData[field as keyof typeof formData] === option && styles.optionTextSelected
              ]}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
    );
  };

  // Renderizar seletor de sentimentos
  const renderFeelingSelector = () => {
    const feelings = [
      { value: 'soft', label: 'Soft', emoji: '😌' },
      { value: 'stiff', label: 'Stiff', emoji: '😰' },
      { value: 'good', label: 'Good', emoji: '😊' },
      { value: 'bad', label: 'Bad', emoji: '😞' }
    ];

    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>How It Felt</Text>
        <View style={styles.feelingsContainer}>
          {feelings.map((feeling) => (
            <TouchableOpacity
              key={feeling.value}
              style={[
                styles.feelingButton,
                formData.howItFelt === feeling.value && styles.feelingButtonSelected
              ]}
              onPress={() => updateField('howItFelt', feeling.value)}
            >
              <Text style={styles.feelingEmoji}>{feeling.emoji}</Text>
                             <Text 
                 style={[
                   styles.feelingText,
                   formData.howItFelt === feeling.value && styles.feelingTextSelected
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

  // Função para converter valor numérico da dificuldade em texto
  const getDifficultyLabel = (value: number) => {
    if (value <= 3) return 'Smooth';
    if (value <= 6) return 'Moderate';
    if (value <= 8) return 'Hard';
    return 'Very Hard';
  };

  // Função para determinar a cor do texto do checkmark baseada na cor de fundo
  const getCheckmarkTextColor = (backgroundColor: string) => {
    const lightColors = ['#ffffff', '#ffeb3b', '#bdbdbd'];
    return lightColors.includes(backgroundColor) ? '#333' : '#fff';
  };

  const goToStep = (newStep: number) => {
    if (formAreaHeight && newStep !== displayedStep) {
      const direction = newStep > displayedStep ? 1 : -1;
      setPrevStepIndex(displayedStep);
      setDisplayedStep(newStep); // já mostra o conteúdo novo
      animatedYIn.setValue(direction * formAreaHeight);
      animatedYOut.setValue(0);
      Animated.parallel([
        Animated.timing(animatedYIn, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(animatedYOut, {
          toValue: -direction * formAreaHeight,
          duration: 350,
          useNativeDriver: true,
        })
      ]).start(() => {
        setPrevStepIndex(null);
      });
    }
  };

  // Substituir setCurrentStep(newStep) por goToStep(newStep) em handleNext e handlePrevious:
  const handleNext = () => {
    if (currentStep < totalSteps && formAreaHeight) {
      const newStep = currentStep + 1;
      goToStep(newStep);
      setCurrentStep(newStep);
    }
  };
  const handlePrevious = () => {
    if (currentStep > 1 && formAreaHeight) {
      const newStep = currentStep - 1;
      goToStep(newStep);
      setCurrentStep(newStep);
    }
  };

  const handleSave = async () => {
    if (isSaving) return; // Prevenir múltiplos cliques
    
    if (!formData.when) {
      Alert.alert('Erro', 'A data é obrigatória');
      return;
    }

    // Validar campos obrigatórios do Step 1
    if (!formData.place || !formData.location) {
      Alert.alert('Erro', 'Local é obrigatório');
      return;
    }

    setIsSaving(true);

    try {
      // Converter campos vazios para null, mas manter números e arrays como estão
      const cleanData = Object.fromEntries(
        Object.entries(formData).map(([key, value]) => [
          key, 
          key === 'difficulty' || key === 'falls' || key === 'routeRating' ? value : 
          Array.isArray(value) ? value : 
          (value === '' ? null : value)
        ])
      );

      // Log para debug - remover em produção
      console.log('Saving climbing session:', {
        place: cleanData.place,
        location: cleanData.location,
        location_data: cleanData.location_data,
        when: cleanData.when,
        activity: cleanData.activity,
        // ... outros campos importantes
      });

      if (onSave) {
        await onSave(cleanData);
      }
      navigation.goBack();
      setCurrentStep(1); // Reset para o primeiro passo
    } catch (error) {
      console.error('Error saving session:', error);
      Alert.alert('Erro', 'Não foi possível salvar a sessão. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    // Reset form and close screen
    setCurrentStep(1);
    setShowErrorsStep1(false);
    setShowErrorsStep2(false);
    setFormData({
      place: '',
      location: '', // NEW reset
      location_data: null, // NEW reset rich data
      when: new Date().toISOString(),
      activity: '',
      colour: THEME_COLORS.bluePrimary,
      routeNumber: '',
      grade: '',
      difficulty: 5,
      falls: 0,
      ascentType: '',
      movement: [] as string[],
      grip: [] as string[],
      footwork: [] as string[],
      routeRating: 0,
      howItFelt: '',
      comments: '',
      climbingType: '',
      completion: '',
      images: [],
    });
    navigation.goBack();
  };

  /* Render navigation buttons inside each step */
  const renderStepButtons = (step: number) => {
    const isLast = step === totalSteps;
    if (!isLast) {
      return (
        <View style={styles.stepActionsContainer}>
          {step > 1 && (
            <TouchableOpacity
              style={styles.circleNavButton}
              onPress={handlePrevious}
            >
              <FontAwesome6 name="arrow-up" size={18} color="#fff" />
            </TouchableOpacity>
          )}
          {step > 1 && <View style={{ width: 12 }} />}
          {(() => {
            const enabled = isStepValid(step);
            return (
              <TouchableOpacity
                style={[styles.circleNavButton, !enabled && styles.circleNavButtonDisabled]}
                onPress={() => {
                  if (enabled) {
                    handleNext();
                  } else {
                    if (step === 1) setShowErrorsStep1(true);
                    if (step === 2) setShowErrorsStep2(true);
                    triggerSnack('Please fill in all required fields before continuing.');
                  }
                }}
              >
                <FontAwesome6 name="arrow-down" size={18} color={enabled ? '#fff' : '#999'} />
              </TouchableOpacity>
            );
          })()}
        </View>
      );
    } else {
      // Último step: só botão circular de voltar, alinhado à direita
      return (
        <View style={[styles.stepActionsContainer, { justifyContent: 'flex-end' }]}> 
          <TouchableOpacity
            style={styles.circleNavButton}
            onPress={handlePrevious}
          >
            <FontAwesome6 name="arrow-up" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      );
    }
  };

  const renderColorSelector = () => {
    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Color</Text>
        <TouchableOpacity
          style={styles.colorSelectorButton}
          onPress={() => setShowColorPicker(true)}
        >
          <View style={[styles.colorPreview, { backgroundColor: formData.colour }]} />
          <FontAwesome6 
            name="chevron-down" 
            size={14} 
            color="#666"
            style={styles.colorDropdownIcon}
          />
        </TouchableOpacity>
      </View>
    );
  };

  const renderColorPickerModal = () => {
    return (
      <Modal
        visible={showColorPicker}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowColorPicker(false)}
      >
        <TouchableOpacity 
          style={styles.colorModalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowColorPicker(false)}
        >
          <View style={styles.colorModalContainer}>
            <View style={styles.colorGrid}>
              {/* Primeira linha */}
              <View style={styles.colorRow}>
                {colorOptions.slice(0, 5).map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      formData.colour === color && styles.colorOptionSelected,
                      color === '#ffffff' && styles.colorOptionWhite
                    ]}
                    onPress={() => {
                      updateField('colour', color);
                      setShowColorPicker(false);
                    }}
                  >
                    {formData.colour === color && (
                      <View style={styles.colorCheckmark}>
                        <Text style={[
                          styles.colorCheckmarkText,
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
              <View style={styles.colorRow}>
                {colorOptions.slice(5, 10).map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      formData.colour === color && styles.colorOptionSelected,
                      color === '#ffffff' && styles.colorOptionWhite
                    ]}
                    onPress={() => {
                      updateField('colour', color);
                      setShowColorPicker(false);
                    }}
                  >
                    {formData.colour === color && (
                      <View style={styles.colorCheckmark}>
                        <Text style={[
                          styles.colorCheckmarkText,
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
              <View style={[styles.colorRow, styles.colorRowLast]}>
                {colorOptions.slice(10, 15).map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      formData.colour === color && styles.colorOptionSelected,
                      color === '#ffffff' && styles.colorOptionWhite
                    ]}
                    onPress={() => {
                      updateField('colour', color);
                      setShowColorPicker(false);
                    }}
                  >
                    {formData.colour === color && (
                      <View style={styles.colorCheckmark}>
                        <Text style={[
                          styles.colorCheckmarkText,
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

  const renderDropdownPicker = (title: string, field: string, options: string[], showPicker: boolean, setShowPicker: (show: boolean) => void) => {
    const selectedValue = formData[field as keyof typeof formData] || '';
    
    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>{title}</Text>
        <TouchableOpacity
          style={styles.dropdownButton}
          onPress={() => setShowPicker(true)}
        >
          <Text style={[styles.dropdownButtonText, !selectedValue && styles.dropdownPlaceholderText]}>
            {selectedValue || 'Select grade'}
          </Text>
          <FontAwesome6 
            name="chevron-down" 
            size={14} 
            color="#666"
            style={styles.dropdownIcon}
          />
        </TouchableOpacity>
      </View>
    );
  };

  const renderGradePickerModal = (field: string, options: string[], visible: boolean, onClose: () => void) => {
    return (
      <Modal
        visible={visible}
        animationType="fade"
        transparent={true}
        onRequestClose={onClose}
      >
        <TouchableOpacity 
          style={styles.gradeModalOverlay} 
          activeOpacity={1} 
          onPress={onClose}
        >
          <View style={styles.gradeModalContainer}>
            <View style={styles.gradeModalHeader}>
              <Text style={styles.gradeModalTitle}>Select Grade</Text>
            </View>
            <ScrollView style={styles.gradeList} showsVerticalScrollIndicator={true}>
              <TouchableOpacity
                style={[
                  styles.gradeOption,
                  formData[field as keyof typeof formData] === '' && styles.gradeOptionSelected
                ]}
                onPress={() => {
                  updateField(field, '');
                  onClose();
                }}
              >
                <Text style={[
                  styles.gradeOptionText,
                  formData[field as keyof typeof formData] === '' && styles.gradeOptionTextSelected
                ]}>
                  None
                </Text>
                {formData[field as keyof typeof formData] === '' && (
                  <FontAwesome6 name="check" size={16} color={THEME_COLORS.bluePrimary} />
                )}
              </TouchableOpacity>
              {options.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.gradeOption,
                    formData[field as keyof typeof formData] === option && styles.gradeOptionSelected
                  ]}
                  onPress={() => {
                    updateField(field, option);
                    onClose();
                  }}
                >
                  <Text style={[
                    styles.gradeOptionText,
                    formData[field as keyof typeof formData] === option && styles.gradeOptionTextSelected
                  ]}>
                    {option}
                  </Text>
                  {formData[field as keyof typeof formData] === option && (
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

  const renderPicker = (title: string, field: string, options: string[]) => (
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsContainer}>
        <TouchableOpacity
          style={[
            styles.optionButton,
            formData[field as keyof typeof formData] === '' && styles.optionButtonSelected
          ]}
          onPress={() => updateField(field, '')}
        >
          <Text style={[
            styles.optionText,
            formData[field as keyof typeof formData] === '' && styles.optionTextSelected
          ]}>
            None
          </Text>
        </TouchableOpacity>
        {options.map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.optionButton,
              formData[field as keyof typeof formData] === option && styles.optionButtonSelected
            ]}
            onPress={() => updateField(field, option)}
          >
            <Text style={[
              styles.optionText,
              formData[field as keyof typeof formData] === option && styles.optionTextSelected
            ]}>
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderPickerNoTitle = (field: string, options: string[]) => {
    const handleOptionPress = (value: string) => {
      // Se clicar na opção já selecionada, desseleciona
      if (formData[field as keyof typeof formData] === value) {
        updateField(field, '');
      } else {
        updateField(field, value);
      }
    };

    return (
      <View style={styles.fieldContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsContainer}>
          {options.map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.optionButton,
                formData[field as keyof typeof formData] === option && styles.optionButtonSelected
              ]}
              onPress={() => handleOptionPress(option)}
            >
              <Text style={[
                styles.optionText,
                formData[field as keyof typeof formData] === option && styles.optionTextSelected
              ]}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderTextInput = (title: string, field: string, placeholder?: string, required?: boolean) => (
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>{title}{required && ' *'}</Text>
      <TextInput
        style={styles.textInput}
        value={String(formData[field as keyof typeof formData] || '')}
        onChangeText={(value) => updateField(field, value)}
        placeholder={placeholder}
        selectionColor="#333"
      />
    </View>
  );

  // Função para converter timestamp para formato amigável
  const formatDateForDisplay = (timestamp: string): string => {
    if (!timestamp) return '';
    try {
      const date = new Date(timestamp);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                     'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      const day = date.getDate().toString().padStart(2, '0');
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      
      return `${day} ${month} ${year}, ${hours}:${minutes}`;
    } catch {
      return timestamp; // Fallback caso não seja um timestamp válido
    }
  };

  // Função para converter formato amigável para timestamp
  const parseDisplayDate = (displayDate: string): string => {
    if (!displayDate) return '';
    try {
      // Se já é um timestamp, retorna como está
      if (displayDate.includes('T') || displayDate.match(/^\d{4}-\d{2}-\d{2}/)) {
        return displayDate;
      }

      // Parse do formato "DD MMM YYYY, HH:MM"
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                     'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      const parts = displayDate.split(', ');
      if (parts.length !== 2) return displayDate;
      
      const [datePart, timePart] = parts;
      const dateComponents = datePart.split(' ');
      const [hours, minutes] = timePart.split(':');
      
      if (dateComponents.length !== 3) return displayDate;
      
      const [day, month, year] = dateComponents;
      const monthIndex = months.indexOf(month);
      
      if (monthIndex === -1) return displayDate;
      
      const date = new Date(parseInt(year), monthIndex, parseInt(day), parseInt(hours), parseInt(minutes));
      return date.toISOString();
    } catch {
      return displayDate; // Fallback
    }
  };

  const renderDateInput = (title: string, field: string, placeholder?: string) => {
    const fieldValue = formData[field as keyof typeof formData];
    const isEmpty = !fieldValue || fieldValue === '';
    const displayValue = formatDateForDisplay(fieldValue as string);
    
    return (
      <View style={styles.fieldContainer}>
        <View style={styles.dateInputContainer}>
          <FontAwesome6 
            name="calendar-days" 
            size={18} 
            color={THEME_COLORS.bluePrimary}
            style={styles.dateIcon}
          />
          <TextInput
            style={[
              styles.dateInputWithIcon,
              isEmpty && styles.textInputError
            ]}
            value={displayValue}
            onChangeText={(value) => {
              const timestamp = parseDisplayDate(value);
              updateField(field, timestamp);
            }}
            placeholder={placeholder}
            selectionColor="#333"
          />
        </View>
        {isEmpty && (
          <Text style={styles.errorText}>This field is required</Text>
        )}
      </View>
    );
  };

  const renderVisualSelector = (
    title: string, 
    field: string, 
    options: Array<{value: string, label: string, imageUrl: any}>
  ) => {
    const handleOptionPress = (value: string) => {
      // Se clicar na opção já selecionada, desseleciona
      if (formData[field as keyof typeof formData] === value) {
        updateField(field, '');
      } else {
        updateField(field, value);
      }
    };

    return (
      <View style={styles.fieldContainer}>
        <View style={styles.locationContainer}>
          <TouchableOpacity
            key={options[0].value}
            style={[
              styles.locationButton,
              formData[field as keyof typeof formData] === options[0].value && styles.locationButtonSelected
            ]}
            onPress={() => handleOptionPress(options[0].value)}
          >
            <Image
              key={`${field}-${options[0].value}-image`}
              source={options[0].imageUrl}
              style={styles.locationImage}
              resizeMode="cover"
              onError={(error) => console.log(`Erro ${options[0].label}:`, error.nativeEvent.error)}
              onLoad={() => console.log(`✅ ${options[0].label} carregou`)}
            />
            <Text style={[
              styles.locationText,
              formData[field as keyof typeof formData] === options[0].value && styles.locationTextSelected
            ]}>
              {options[0].label}
            </Text>
          </TouchableOpacity>
          
          <View style={styles.buttonSpacer} />
          
          <TouchableOpacity
            key={options[1].value}
            style={[
              styles.locationButton,
              formData[field as keyof typeof formData] === options[1].value && styles.locationButtonSelected
            ]}
            onPress={() => handleOptionPress(options[1].value)}
          >
            <Image
              key={`${field}-${options[1].value}-image`}
              source={options[1].imageUrl}
              style={styles.locationImage}
              resizeMode="cover"
              onError={(error) => console.log(`Erro ${options[1].label}:`, error.nativeEvent.error)}
              onLoad={() => console.log(`✅ ${options[1].label} carregou`)}
            />
            <Text style={[
              styles.locationText,
              formData[field as keyof typeof formData] === options[1].value && styles.locationTextSelected
            ]}>
              {options[1].label}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Selector Indoor / Outdoor – ao selecionar abre modal de busca
  const renderLocationSelector = () => {
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

    const showErr = showErrorsStep1 && formData.place.trim() === '';

    const handleOptionPress = (value: string) => {
      if (formData.place === value) {
        // deseleciona
        updateField('place', '');
        updateField('location', '');
      } else {
        updateField('place', value);
        updateField('location', '');
        setShowLocationModal(true);
      }
    };

    // Copiamos renderVisualSelectorCompact inline para usar handleOptionPress custom
    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Location</Text>
        <View style={styles.locationContainer}>
          {locationOptions.map((opt, idx) => (
            <React.Fragment key={opt.value}>
              {idx === 1 && <View style={styles.buttonSpacer} />}        
              <TouchableOpacity
                style={[
                  styles.locationButton,
                  formData.place === opt.value && styles.locationButtonSelected,
                  showErr && styles.locationButtonError
                ]}
                onPress={() => handleOptionPress(opt.value)}
              >
                <Image
                  source={opt.imageUrl}
                  style={styles.locationImage}
                  resizeMode="cover"
                />
                <Text style={[styles.locationText, formData.place === opt.value && styles.locationTextSelected]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>
      </View>
    );
  };

  // Modal de busca com Google Places
  const renderLocationModal = () => {
    if (!showLocationModal) return null;
    const isIndoor = formData.place === 'Indoor';
    const title = isIndoor ? 'Select gym' : 'Select place';
    const placeholder = isIndoor ? 'Search for a gym' : 'Search for a place';

    const renderPlaceRow = (rowData: any) => {
      const title = rowData.description || rowData.formatted_address || rowData.name || (rowData.structured_formatting ? rowData.structured_formatting.main_text : '');
      const distance = rowData.distance;

      return (
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8, width: '100%' }}>
          <FontAwesome6 name="location-dot" size={18} color={THEME_COLORS.bluePrimary} style={{ marginRight: 8 }} />
          <Text style={{ flex: 1, fontSize: 14, color: '#000', minWidth: 0 }} numberOfLines={2}>{title}</Text>
          {userCoords && distance !== null && distance !== undefined && (
            <Text style={{ marginLeft: 8, fontSize: 12, color: '#555' }}>{`${distance.toFixed(1)} km`}</Text>
          )}
        </View>
      );
    };

    // (using outer-scope googlePlacesRef)

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

          // Try to get user location if not already available
          if (locationPermissionGranted && !userCoords) {
            getUserLocation();
          }

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
        <View style={styles.modalOverlay}>
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
              
              {/* Current Location Button */}
              <TouchableOpacity
                style={styles.currentLocationButton}
                onPress={handleUseCurrentLocation}
                disabled={isCalculatingDistances || !locationPermissionGranted}
              >
                <FontAwesome6 
                  name="location-crosshairs" 
                  size={18} 
                  color={!locationPermissionGranted ? "#ccc" : THEME_COLORS.bluePrimary} 
                  style={{ marginRight: 8 }} 
                />
                <Text style={[
                  styles.currentLocationText,
                  !locationPermissionGranted && styles.currentLocationTextDisabled
                ]}>
                  Use current location
                </Text>
              </TouchableOpacity>
              
              {isCalculatingDistances ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
                  <ActivityIndicator size="large" color={THEME_COLORS.bluePrimary} />
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
                              setFormData(prev => ({ ...prev, location_data: result.richLocationData }));
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

  // NEW – Google Places search for gym/address based on indoor/outdoor selection
  const renderLocationSearch = () => {
    if (formData.place.trim() === '') return null; // wait until user selects Indoor/Outdoor

    const isIndoor = formData.place === 'Indoor';
    const title = isIndoor ? 'Select gym' : 'Select place';
    const placeholder = isIndoor ? 'Search for a gym' : 'Search for a place';
    const showErr = showErrorsStep1 && formData.location.trim() === '';

    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>{title}</Text>
        <GooglePlacesAutocomplete
          placeholder={placeholder}
          fetchDetails={false}
          enablePoweredByContainer={false}
          onPress={(data: any, _details = null) => {
            updateField('location', data.description);
          }}
          query={{
            key: GOOGLE_MAPS_API_KEY,
            language: 'en',
            ...(isIndoor
              ? { keyword: 'climbing gym', types: 'establishment' }
              : { types: 'geocode' }),
            ...(userCoords ? { location: `${userCoords.latitude},${userCoords.longitude}`, radius: 50000 } : {}),
          }}
          styles={{
            container: { flex: 0 },
            textInput: [styles.textInput, showErr && styles.textInputError],
            listView: { zIndex: 1000 },
          }}
          predefinedPlaces={[]}
          textInputProps={{}}
        />
        
        {/* Current Location Button for GooglePlacesAutocomplete */}
        <TouchableOpacity
          style={[styles.currentLocationButton, { marginTop: 8 }]}
          onPress={handleUseCurrentLocation}
          disabled={!locationPermissionGranted}
        >
          <FontAwesome6 
            name="location-crosshairs" 
            size={18} 
            color={!locationPermissionGranted ? "#ccc" : THEME_COLORS.bluePrimary} 
            style={{ marginRight: 8 }} 
          />
          <Text style={[
            styles.currentLocationText,
            !locationPermissionGranted && styles.currentLocationTextDisabled
          ]}>
            Use current location
          </Text>
        </TouchableOpacity>
        
        {showErr && <Text style={styles.errorText}>This field is required</Text>}
      </View>
    );
  };

  const renderActivitySelector = () => {
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

    const showErr = showErrorsStep1 && formData.activity.trim()==='';
    return renderVisualSelectorCompact('Style', 'activity', activityOptions, showErr);
  };

  // Componente do slider nativo para dificuldade
  const renderDifficultySlider = () => {
    const currentValue = formData.difficulty as number;
    
    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Difficulty</Text>
        <View style={styles.sliderContainerFullWidth}>
          <Slider
            style={styles.sliderNativeFullWidth}
            minimumValue={1}
            maximumValue={10}
            step={1}
            value={currentValue}
            onValueChange={(value: number) => updateNumericField('difficulty', value)}
            minimumTrackTintColor={THEME_COLORS.bluePrimary}
            maximumTrackTintColor="#e0e0e0"
            thumbTintColor={THEME_COLORS.bluePrimary}
          />
          <View style={styles.sliderLabelsContainer}>
            <Text style={styles.sliderLabelLeft}>Smooth</Text>
            <Text style={styles.sliderLabelRight}>Very Hard</Text>
          </View>
        </View>
      </View>
    );
  };

  // Componente do step counter para número de quedas
  const renderFallsCounter = () => {
    const currentValue = formData.falls as number;
    
    const incrementFalls = () => {
      const newValue = Math.min(currentValue + 1, 50);
      updateNumericField('falls', newValue);
    };
    
    const decrementFalls = () => {
      const newValue = Math.max(currentValue - 1, 0);
      updateNumericField('falls', newValue);
    };
    
    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Number of Falls</Text>
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
      </View>
    );
  };

  // Componente para seleção de tags
  const renderTagSelector = (title: string, field: string, options: string[], showModal: boolean, setShowModal: (show: boolean) => void) => {
    const selectedTags = formData[field as keyof typeof formData] as string[];
    
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
      <View style={[styles.fieldContainer, styles.fieldContainerWithTags]}>
        <Text style={styles.label}>{title}</Text>
        <View style={styles.tagsContainer}>
          {selectedTags.map((tag, index) => (
            <TouchableOpacity key={index} style={styles.tagChip} onPress={() => removeTag(tag)}>
              <Text style={styles.tagChipText}>{tag}</Text>
              <FontAwesome6 name="xmark" size={12} color="#fff" style={styles.tagChipRemove} />
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.addTagButton} onPress={openModal}>
            <Text style={styles.addTagButtonText}>+ Add {getFieldName()}</Text>
          </TouchableOpacity>
        </View>

        <Modal
          visible={showModal}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setShowModal(false)}
        >
          <TouchableOpacity 
            style={styles.tagModalOverlay} 
            activeOpacity={1} 
            onPress={() => setShowModal(false)}
          >
            <TouchableOpacity 
              style={styles.tagModalContainer}
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.tagModalHeader}>
                <Text style={styles.tagModalTitle}>Select {title}</Text>
              </View>
              <ScrollView style={styles.tagsList} showsVerticalScrollIndicator={true}>
                {[...options].sort().map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.tagOption,
                      tempSelectedTags.includes(option) && styles.tagOptionSelected
                    ]}
                    onPress={() => toggleTag(option)}
                  >
                    <Text style={[
                      styles.tagOptionText,
                      tempSelectedTags.includes(option) && styles.tagOptionTextSelected
                    ]}>
                      {option}
                    </Text>
                    <Text style={styles.tagOptionPlus}>+</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              <TouchableOpacity style={styles.tagSaveButton} onPress={saveSelection}>
                <Text style={styles.tagSaveButtonText}>Save</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </View>
    );
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 1:
        return (
          <View style={{ flex: 1 }}>
            <ScrollView 
              style={{ flex: 1 }} 
              contentContainerStyle={{ paddingBottom: 24 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.modalTitle}>Log your climbing session ✨</Text>
              <Text style={styles.modalSubtitle}>
                Track your progress and discover patterns in your climbing to reach new heights faster! 🚀
              </Text>
              {renderDateTimePickerCompact('', 'when', showErrorsStep1)}
              {renderLocationSelector()}
              {formData.location !== '' && (
                <View style={styles.locationDisplayRow}>
                  <FontAwesome6 name="location-dot" size={18} color={THEME_COLORS.bluePrimary} style={{ marginRight: 8 }} />
                  <Text style={styles.locationDisplayText} numberOfLines={2}>{formData.location}</Text>
                  <TouchableOpacity onPress={() => setShowLocationModal(true)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                    <Text style={styles.changeLinkText}>Change</Text>
                  </TouchableOpacity>
                </View>
              )}
              <View style={{ height: 16 }} />
              {renderActivitySelector()}
            </ScrollView>
            {renderStepButtons(1)}
          </View>
        );

      case 2:
        return (
          <View style={{ flex: 1 }}>
            <ScrollView 
              style={{ flex: 1 }} 
              contentContainerStyle={{ paddingBottom: 24 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.modalTitle}>Add route details 🧗‍♂️</Text>
              <Text style={styles.modalSubtitle}>Enter the information about your climbing route</Text>
              
              {/* Linha compartilhada: Route number + Route Color */}
              <View style={styles.sharedRowContainer}>
                <View style={styles.routeNameContainer}>
                  <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Route number</Text>
                    <TextInput
                      style={[styles.textInput, styles.routeNameInput, showErrorsStep2 && formData.routeNumber.trim()==='' && styles.textInputError]}
                      value={formData.routeNumber}
                      onChangeText={(value) => updateField('routeNumber', value)}
                      placeholder="Add number"
                      placeholderTextColor="#999"
                      selectionColor="#333"
                    />
                  </View>
                </View>
                <View style={styles.routeColorContainer}>
                  {renderColorSelectorCompact()}
                </View>
              </View>
              
              {/* Campo Grade - largura total */}
              {renderDropdownPickerCompact('Grade', 'grade', filteredGradeOptions, showGradePicker, setShowGradePicker, showErrorsStep2)}
              
              {/* Campo Completion */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Completion</Text>
                {renderPickerNoTitleCompact('completion', ['Completed', 'Attempt'], showErrorsStep2)}
              </View>
              
              {/* Route Rating */}
              {renderStarRating('Route Rating', 'routeRating', showErrorsStep2)}
            </ScrollView>
            {renderStepButtons(2)}
          </View>
        );

      case 3:
        return (
          <View style={{ flex: 1 }}>
            <ScrollView 
              style={{ flex: 1 }} 
              contentContainerStyle={{ paddingBottom: 24 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.modalTitle}>How did it go? 🎯</Text>
              <Text style={styles.modalSubtitle}>Tell us about your climbing performance</Text>
              
              {/* Difficulty Slider */}
              {renderDifficultySlider()}
              
              {/* How did it feel */}
              {renderFeelingSelector()}
              
              {/* Falls Counter */}
              {renderFallsCounter()}
              
              {/* Ascent Type */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Ascent Type</Text>
                {renderPickerNoTitleCompact('ascentType', ['Redpoint', 'Onsight', 'Flash'])}
              </View>
              
              {/* Campo Climbing Type - apenas para Climbing, não para Bouldering */}
              {formData.activity === 'Climbing' && 
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Top / Lead</Text>
                  {renderPickerNoTitleCompact('climbingType', ['Top', 'Lead'])}
                </View>
              }
            </ScrollView>
            {renderStepButtons(3)}
          </View>
        );

      case 4:
        return (
          <View style={{ flex: 1 }}>
            <ScrollView 
              style={{ flex: 1 }} 
              contentContainerStyle={{ paddingBottom: 24 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.modalTitle}>Capture the moment 📸</Text>
              <Text style={styles.modalSubtitle}>Add a photo and your thoughts about this climb</Text>
              
              {/* Comments/Tips */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Comments/Tips</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={formData.comments}
                  onChangeText={(value) => updateField('comments', value)}
                  placeholder="Add some notes or tips for your future self"
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={4}
                  selectionColor="#333"
                />
              </View>

              {/* Multiple Images Field */}
              <MultiImagePicker
                images={formData.images}
                onImagesChange={handleImagesChange}
                maxImages={5}
                title="Photos"
                placeholder="Add photos"
                fullWidthButton={true}
              />
            </ScrollView>
            {renderStepButtons(4)}
          </View>
        );

      case 5:
        return (
          <View style={{ flex: 1 }}>
            <ScrollView 
              style={{ flex: 1 }} 
              contentContainerStyle={{ paddingBottom: 24 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.modalTitle}>Keep track of your moves 🧗‍♀️</Text>
              <Text style={styles.modalSubtitle}>Select the moves you used on this route</Text>
              {renderTagSelector('Movement', 'movement', movementOptions, showMovementModal, setShowMovementModal)}
              {renderTagSelector('Grip', 'grip', gripOptions, showGripModal, setShowGripModal)}
              {renderTagSelector('Footwork', 'footwork', footworkOptions, showFootworkModal, setShowFootworkModal)}
            </ScrollView>
            
            {/* Step 5 - Custom buttons layout with both buttons on same row */}
            <View style={styles.finalStepButtonsContainer}>
              <TouchableOpacity
                style={styles.circleNavButton}
                onPress={handlePrevious}
              >
                <FontAwesome6 name="arrow-up" size={18} color="#fff" />
              </TouchableOpacity>
              
              <View style={{ width: 12 }} />
              
              <TouchableOpacity 
                style={[styles.finalStepSaveButton, isSaving && (styles as any).saveButtonDisabled]} 
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Salve</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  // Handle hardware back (Android) or swipe-back (iOS interactive back) to navigate steps
  useEffect(() => {
    const onBackPress = () => {
      if (currentStep > 1) {
        handlePrevious();
        return true;
      }
      // currentStep === 1 : close screen
      handleClose();
      return true;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [currentStep]);

  // Params passed via navigation
  const { onSave, userInfo } = route.params || {};

  // Quando o teclado fechar, garanta que o passo 4 volte ao topo
  useEffect(() => {
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      if (currentStep === 4) {
        // No need to scroll to top here
      }
    });
    return () => hideSub.remove();
  }, [currentStep]);

  const [showFixedSave, setShowFixedSave] = useState(false);

  const [isScrollEnabled, setIsScrollEnabled] = useState(true);
  const [isScrollingToInvalid, setIsScrollingToInvalid] = useState(false);

  const mainScrollRef = useRef<ScrollView | null>(null);

  // 1. Adicionar estado para altura do step:
  const [formAreaHeight, setFormAreaHeight] = useState<number | null>(null);
  const [displayedStep, setDisplayedStep] = useState(currentStep); // step que está na tela
  const [prevStepIndex, setPrevStepIndex] = useState<number | null>(null); // step que está saindo
  const animatedYIn = useRef(new Animated.Value(0)).current;
  const animatedYOut = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (formAreaHeight && displayedStep !== currentStep) {
      // Direção: para baixo (próximo) ou para cima (anterior)
      const direction = currentStep > displayedStep ? 1 : -1;
      setPrevStepIndex(displayedStep);
      animatedYIn.setValue(direction * formAreaHeight);
      animatedYOut.setValue(0);
      Animated.parallel([
        Animated.timing(animatedYIn, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(animatedYOut, {
          toValue: -direction * formAreaHeight,
          duration: 350,
          useNativeDriver: true,
        })
      ]).start(() => {
        setDisplayedStep(currentStep);
        setPrevStepIndex(null);
      });
    }
  }, [currentStep, formAreaHeight]);

  useEffect(() => {
    // Always reset selected location when the user toggles Indoor / Outdoor
    setFormData(prev => ({ ...prev, location: '', location_data: null }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.place]);

  // Modal para busca de local (gym / place)
  const [showLocationModal, setShowLocationModal] = useState(false);
  
  // Ref to force focus with a workaround
  const focusHelperRef = useRef<TextInput>(null);

  // Effect to handle location modal focus with aggressive keyboard opening
  useEffect(() => {
    if (showLocationModal) {
      // Multiple strategies to ensure keyboard opens
      const openKeyboard = () => {
        // Strategy 1: Use helper input to force keyboard context
        if (focusHelperRef.current) {
          focusHelperRef.current.focus();
          setTimeout(() => {
            if (googlePlacesRef.current) {
              googlePlacesRef.current.focus();
            }
          }, 50);
        } else if (googlePlacesRef.current) {
          // Fallback: Blur then focus
          googlePlacesRef.current.blur();
          setTimeout(() => {
            if (googlePlacesRef.current) {
              googlePlacesRef.current.focus();
            }
          }, 50);
        }
      };

      // Use InteractionManager to wait for modal animation to complete
      InteractionManager.runAfterInteractions(() => {
        // Multiple attempts with different delays
        setTimeout(openKeyboard, 100);
        setTimeout(openKeyboard, 300);
        setTimeout(openKeyboard, 600);
        // Extra attempt for stubborn cases
        setTimeout(openKeyboard, 1000);
      });
    }
  }, [showLocationModal]);

  // ---------------- User location ----------------
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setLocationPermissionGranted(true);
        try {
          // @ts-ignore – timeout not yet declared in Expo type definitions
          const loc = await Promise.race([
            Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
          ]);
          setUserCoords({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        } catch (posErr) {
          // Fallback: try last known position (may be undefined)
          const last = await Location.getLastKnownPositionAsync();
          if (last) {
            setUserCoords({ latitude: last.coords.latitude, longitude: last.coords.longitude });
          } else {
            console.log('Could not retrieve position:', posErr);
          }
        }
      } else {
        setLocationPermissionGranted(false);
      }
    } catch (err) {
      console.log('Location permission error', err);
      setLocationPermissionGranted(false);
    }
  };

  useEffect(() => {
    getUserLocation();
  }, []);

  // Distance helpers
  const haversineDistanceKm = (lat1:number, lon1:number, lat2:number, lon2:number) => {
    const toRad = (v:number) => (v * Math.PI) / 180;
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

  // New states for improved search experience
  const [isCalculatingDistances, setIsCalculatingDistances] = useState(false);
  const [processedResults, setProcessedResults] = useState<any[]>([]);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);



  // Custom search function that fetches places and calculates distances
  const searchPlacesWithDistances = async (searchText: string) => {
    if (searchText.length < 2 || !userCoords) {
      setProcessedResults([]);
      return;
    }

    setIsCalculatingDistances(true);

    try {
      const isIndoor = formData.place === 'Indoor';
      const searchUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(searchText)}&key=${GOOGLE_MAPS_API_KEY}&language=en${
        isIndoor ? '&types=establishment' : '&types=geocode'
      }&location=${userCoords.latitude},${userCoords.longitude}&radius=50000`;

      const response = await fetch(searchUrl);
      const data = await response.json();
      
      if (data.predictions && data.predictions.length > 0) {
        // Calculate distances for all results in parallel
        const distancePromises = data.predictions.map(async (result: any) => {
          if (!result.place_id) {
            return { ...result, distance: null };
          }

          try {
            const resp = await fetch(
              `https://maps.googleapis.com/maps/api/place/details/json?place_id=${result.place_id}&fields=geometry,name,formatted_address,types,vicinity&key=${GOOGLE_MAPS_API_KEY}`
            );
            const json = await resp.json();
            const loc = json.result?.geometry?.location;

            if (loc) {
              const dist = haversineDistanceKm(
                userCoords.latitude,
                userCoords.longitude,
                loc.lat,
                loc.lng
              );
              
              // Create rich location data object
              const richData = {
                name: json.result?.name || result.structured_formatting?.main_text,
                description: result.description,
                place_id: result.place_id,
                formatted_address: json.result?.formatted_address,
                main_text: result.structured_formatting?.main_text,
                secondary_text: result.structured_formatting?.secondary_text,
                types: json.result?.types || result.types,
                vicinity: json.result?.vicinity,
                latitude: loc.lat,
                longitude: loc.lng,
                distance_km: dist
              };
              
              return { ...result, distance: dist, richLocationData: richData };
            }
          } catch (error) {
            console.log(`[DISTANCE ERROR] ${result.description}:`, error);
          }

          return { ...result, distance: null };
        });

        const resultsWithDistances = await Promise.all(distancePromises);
        
        // Sort by distance if available
        const sortedResults = resultsWithDistances.sort((a, b) => {
          if (a.distance === null && b.distance === null) return 0;
          if (a.distance === null) return 1;
          if (b.distance === null) return -1;
          return a.distance - b.distance;
        });

        setProcessedResults(sortedResults);
      } else {
        setProcessedResults([]);
      }
    } catch (error) {
      console.log('[PLACES SEARCH ERROR]:', error);
      setProcessedResults([]);
    } finally {
      setIsCalculatingDistances(false);
    }
  };

  // Function to get current location and find nearest place/address
  const handleUseCurrentLocation = async () => {
    if (!locationPermissionGranted) {
      Alert.alert('Location not available', 'Please enable location services and try again.');
      return;
    }

    // If coordinates are not available, try to get them first
    if (!userCoords) {
      await getUserLocation();
    }

    // Check again after trying to get location
    if (!userCoords) {
      Alert.alert('Location not available', 'Could not determine your current location. Please try again.');
      return;
    }

    setIsCalculatingDistances(true);
    
    try {
      const isIndoor = formData.place === 'Indoor';
      
      if (isIndoor) {
        // For indoor, search for nearby climbing gyms
        const query = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${userCoords.latitude},${userCoords.longitude}&radius=5000&type=establishment&keyword=climbing+gym&key=${GOOGLE_MAPS_API_KEY}`;
        
        const response = await fetch(query);
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
          const nearestGym = data.results[0];
          const gymName = nearestGym.name;
          const gymAddress = nearestGym.vicinity;
          const fullDescription = `${gymName}, ${gymAddress}`;
          
          updateField('location', fullDescription);
          setFormData(prev => ({ 
            ...prev, 
            location_data: {
              description: fullDescription,
              main_text: gymName,
              secondary_text: gymAddress,
              place_id: nearestGym.place_id
            }
          }));
          
          setShowLocationModal(false);
        } else {
          Alert.alert('No gyms found', 'Could not find any climbing gyms nearby.');
        }
      } else {
        // For outdoor, get address from coordinates using reverse geocoding
        const query = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${userCoords.latitude},${userCoords.longitude}&key=${GOOGLE_MAPS_API_KEY}`;
        
        const response = await fetch(query);
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
          const address = data.results[0];
          const formattedAddress = address.formatted_address;
          
          updateField('location', formattedAddress);
          setFormData(prev => ({ 
            ...prev, 
            location_data: {
              description: formattedAddress,
              main_text: formattedAddress.split(',')[0],
              secondary_text: formattedAddress.split(',').slice(1).join(','),
              place_id: address.place_id || null
            }
          }));
          
          setShowLocationModal(false);
        } else {
          Alert.alert('Address not found', 'Could not determine your current address.');
        }
      }
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert('Error', 'Failed to get your current location. Please try again.');
    } finally {
      setIsCalculatingDistances(false);
    }
  };

  // Debounced search
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const debouncedSearchPlaces = (searchText: string) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      searchPlacesWithDistances(searchText);
    }, 300);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME_COLORS.bluePrimary} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <FontAwesome6 name="xmark" size={22} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerRight} />
      </View>

      {/* Content */}
      <View style={styles.content} onLayout={e => setFormAreaHeight(e.nativeEvent.layout.height)}>
        <View style={{ flex: 1, overflow: 'hidden' }}>
          {formAreaHeight && prevStepIndex !== null && (
            <Animated.View
              style={{
                minHeight: formAreaHeight,
                position: 'absolute',
                width: '100%',
                top: 0,
                left: 0,
                transform: [{ translateY: animatedYOut }],
                zIndex: 1,
                paddingHorizontal: 20,
              }}
              pointerEvents="none"
            >
              {renderStepContent(prevStepIndex)}
            </Animated.View>
          )}
          {formAreaHeight && (
            <Animated.View
              style={{
                minHeight: formAreaHeight,
                transform: [{ translateY: prevStepIndex !== null ? animatedYIn : 0 }],
                paddingHorizontal: 20,
              }}
            >
              {renderStepContent(displayedStep)}
            </Animated.View>
          )}
          {!formAreaHeight && (
            <View style={{ paddingHorizontal: 20 }}>
              {renderStepContent(currentStep)}
            </View>
          )}
        </View>
      </View>

      {showSnack && (
        <TouchableOpacity style={styles.snackbarContainer} activeOpacity={0.8} onPress={()=>setShowSnack(false)}>
          <FontAwesome6 name="circle-exclamation" size={18} color="#ff4d4d" style={{marginRight:8}} />
          <Text style={[styles.snackbarText,{flex:1}]}>{snackMessage}</Text>
          <FontAwesome6 name="xmark" size={16} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Color Picker Modal */}
      {renderColorPickerModal()}

      {/* Grade Picker Modal */}
      {renderGradePickerModal('grade', filteredGradeOptions, showGradePicker, () => setShowGradePicker(false))}



      {renderLocationModal()}

      {/* Loading Overlay */}
      {isSaving && (
        <View style={(styles as any).loadingOverlay}>
          <View style={(styles as any).loadingContainer}>
            <ActivityIndicator size="large" color={THEME_COLORS.bluePrimary} />
            <Text style={(styles as any).loadingText}>Saving session...</Text>
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
    paddingTop: Platform.OS === 'ios' ? 10 : 15, // Ajuste para ficar no topo
    paddingHorizontal: 10,
    paddingBottom: 10,
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
    padding: 10,
  },
  contentContainer: {
    paddingHorizontal: 10,
    paddingTop: 0,
    paddingBottom: 0,
  },
  navigationContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    height: 85,
    minHeight: 85,
    maxHeight: 85,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleNavButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: THEME_COLORS.bluePrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleNavButtonDisabled: {
    backgroundColor: '#e0e0e0',
  },
  saveButton: {
    flex: 1,
    backgroundColor: THEME_COLORS.bluePrimary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
     textInput: {
     backgroundColor: THEME_COLORS.background.input,
     borderRadius: 8,
     paddingHorizontal: 15,
     paddingVertical: 12,
     fontSize: 16,
     color: '#000000',
   },
   textInputPlaceholder: {
     color: '#999',
     fontWeight: '400',
   },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  optionsContainer: {
    flexDirection: 'row',
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
  optionText: {
    fontSize: 14,
    color: '#666',
  },
  optionTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
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
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  textInputError: {
    borderColor: '#ff0000',
    backgroundColor: '#fff5f5',
    borderWidth: 2,
  },
  errorText: {
    color: '#ff0000',
    fontSize: 12,
    marginTop: 4,
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME_COLORS.background.input,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  dateInputWithIcon: {
    flex: 1,
    fontSize: 16,
    marginLeft: 10,
    padding: 0,
    color: '#000000',
  },
  dateIcon: {
    marginRight: 10,
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
  sliderContainerNoBg: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    justifyContent: 'space-between',
  },
  sliderContainerFullWidth: {
    paddingHorizontal: 15,
    paddingVertical: 0,
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
  sliderNative: {
    width: 200,
    height: 40,
  },
  sliderNativeFullWidth: {
    width: '100%',
    height: 40,
  },
  sliderThumbNative: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: THEME_COLORS.bluePrimary,
  },
     // Estilos para o step counter
   counterContainer: {
     flexDirection: 'row',
     alignItems: 'center',
     justifyContent: 'center',
     paddingHorizontal: 15,
     paddingVertical: 0,
   },
   counterButton: {
     width: 30,
     height: 30,
     borderRadius: 15,
     backgroundColor: THEME_COLORS.bluePrimary,
     justifyContent: 'center',
     alignItems: 'center',
   },
   counterButtonDisabled: {
     backgroundColor: '#e0e0e0',
   },
     counterButtonText: {
     fontSize: 16,
     fontWeight: '600',
     color: '#fff',
   },
  counterButtonTextDisabled: {
    color: '#999',
  },
  counterValueContainer: {
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
     counterValue: {
     fontSize: 16,
     fontWeight: '600',
     color: '#333',
   },
   // Estilos para tags
   tagsContainer: {
     flexDirection: 'row',
     flexWrap: 'wrap',
     alignItems: 'center',
     marginTop: 0,
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
   tagChipRemove: {
     marginLeft: 6,
   },
   fieldContainerWithTags: {
     marginBottom: 20,
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
   // Estilos para avaliação por estrelas
   starsContainer: {
     flexDirection: 'row',
     alignItems: 'center',
   },
   starButton: {
     marginRight: 8,
     padding: 4,
   },
   // Estilos para seletor de sentimentos
   feelingsContainer: {
     flexDirection: 'row',
     justifyContent: 'space-between',
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
   // Estilos para o novo seletor de data e hora
   dateTimePickerContainer: {
     flexDirection: 'row',
     alignItems: 'center',
   },
   dateTimeButton: {
     flex: 1,
     flexDirection: 'row',
     alignItems: 'center',
     justifyContent: 'space-between',
     backgroundColor: '#f5f5f5',
     borderRadius: 8,
     paddingHorizontal: 15,
     paddingVertical: 10,
     borderWidth: 1,
     borderColor: '#e0e0e0',
   },
   dateTimeButtonError: {
     borderColor: '#ff0000',
     backgroundColor: '#fff5f5',
   },
   dateTimeButtonText: {
     fontSize: 16,
     color: '#333',
     fontWeight: '500',
     marginLeft: 10,
     flex: 1,
   },
   dateTimeButtonTextError: {
     color: '#ff0000',
   },
   timeButton: {
     padding: 8,
     marginLeft: 10,
     backgroundColor: '#f0f0f0',
     borderRadius: 6,
   },
   // Color selector styles
   colorSelectorButton: {
     flexDirection: 'row',
     alignItems: 'center',
     justifyContent: 'space-between',
     backgroundColor: THEME_COLORS.background.input,
     borderRadius: 8,
     paddingHorizontal: 12,
     paddingVertical: 10,
     width: 80,
     height: 50,
   },
   colorPreview: {
     width: 30,
     height: 30,
     borderRadius: 14,
     borderWidth: 2,
     borderColor: '#e0e0e0',
   },
   colorDropdownIcon: {
     marginLeft: 0,
   },
   // Dropdown styles
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
   errorTextGeneral: {
    color: '#ff0000',
    textAlign: 'right',
    marginTop: 4,
  },
   // Color modal styles
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
     shadowOpacity: 0.3,
   },
   colorCheckmark: {
     position: 'absolute',
     justifyContent: 'center',
     alignItems: 'center',
   },
   colorCheckmarkText: {
     fontSize: 14,
     fontWeight: 'bold',
   },
   // Grade modal styles
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
     fontWeight: '500',
   },
   gradeOptionTextSelected: {
     color: THEME_COLORS.bluePrimary,
   },
   // Grade row styles
   gradeRowContainer: {
     flexDirection: 'row',
     alignItems: 'flex-start',
     justifyContent: 'space-between',
     marginBottom: 15,
     paddingHorizontal: 0,
   },
   gradeContainer: {
     // Width will be set dynamically
   },
   gradeSpacer: {
     width: 20,
     flexShrink: 0,
   },
   // Shared row styles
   sharedRowContainer: {
     flexDirection: 'row',
     alignItems: 'flex-start',
   },
   routeNameContainer: {
     flex: 1,
     marginRight: 15,
   },
   routeNameInput: {
     height: 50,
   },
   routeColorContainer: {
     alignItems: 'flex-end',
   },
   navButtonText: {
     fontSize: 16,
     fontWeight: '600',
     color: '#333',
   },
   // Step scroll view styles
   stepScrollView: {
     flex: 1,
     paddingBottom: 20,
   },
   sectionSpacer: {
     height: 12,
     marginBottom: 0,
   },
   smallSectionSpacer: {
     height: 8,
     marginBottom: 5,
   },
  imageUploadButton: {
    height: 150,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
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
  stepActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 24,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  finalStepButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 0,
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  finalStepSaveButton: {
    flex: 1,
    backgroundColor: THEME_COLORS.bluePrimary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.7,
  },
  snackbarContainer:{
    position:'absolute',
    bottom:30,
    left:20,
    right:20,
    backgroundColor:'#333',
    paddingVertical:12,
    paddingHorizontal:16,
    borderRadius:8,
    opacity:0.9,
    flexDirection:'row',
    alignItems:'center',
  },
  snackbarText:{
    color:'#fff',
    fontSize:14,
    flexShrink:1,
    flexWrap:'wrap',
  },
  locationButtonError:{
    borderColor:'#ff0000',
    backgroundColor:'#fff5f5',
  },
  dropdownButtonError:{
    borderColor:'#ff0000',
    backgroundColor:'#fff5f5',
    borderWidth:2,
  },
  optionButtonError: {
    borderColor: '#ff0000',
    backgroundColor: '#fff5f5',
    borderWidth: 2,
  },
  starIconAbsolute:{
    position:'absolute',
    top:0,
    left:0,
  },
  fixedSaveButtonContainer: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  fixedSaveButton: {
    width: '90%',
    backgroundColor: THEME_COLORS.bluePrimary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  selectedLocationText: { marginTop: 8, fontSize: 14, color: '#333', textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-start' },
  locationModalContainer: { backgroundColor: '#fff', borderRadius: 8, padding: 16, marginTop: 50, marginBottom: 50, marginLeft: 16, marginRight: 16, flex: 1, minHeight: 400 },
  placeRowContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8 },
  placeRowText: { flex: 1, fontSize: 14, color: '#000' },
  locationDisplayRow: { flexDirection: 'row', alignItems: 'center', marginTop: 0, paddingHorizontal: 4 },
  locationDisplayText: { flex: 1, fontSize: 14, color: '#000' },
  changeLinkText: { color: THEME_COLORS.bluePrimary, fontSize: 14, fontWeight: '600', marginLeft: 8 },
  // Current Location Button
  currentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  currentLocationText: {
    fontSize: 16,
    fontWeight: '500',
    color: THEME_COLORS.bluePrimary,
  },
  currentLocationTextDisabled: {
    color: '#ccc',
  },
  // Loading Overlay Styles
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  loadingContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    minWidth: 160,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
 });  