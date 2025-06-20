import { FontAwesome6 } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { THEME_COLORS, THEME_SIZES } from '../constants/Theme';

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');

interface ClimbingSessionFormProps {
  visible: boolean;
  onClose: () => void;
  onSave: (sessionData: any) => void;
}

export default function ClimbingSessionForm({ visible, onClose, onSave }: ClimbingSessionFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 6;
  const [contentHeight, setContentHeight] = useState(0);
  const [needsScroll, setNeedsScroll] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showGradePicker, setShowGradePicker] = useState(false);
  const [showSuggestedGradePicker, setShowSuggestedGradePicker] = useState(false);
  
  // Opções de graduação de escalada
  const gradeOptions = [
    // Sistema Francês (Sport Climbing)
    '3a', '3b', '3c', '4a', '4b', '4c', 
    '5a', '5b', '5c', '6a', '6a+', '6b', '6b+', '6c', '6c+',
    '7a', '7a+', '7b', '7b+', '7c', '7c+',
    '8a', '8a+', '8b', '8b+', '8c', '8c+',
    '9a', '9a+', '9b', '9b+', '9c',
    
    // Sistema Americano (YDS)
    '5.0', '5.1', '5.2', '5.3', '5.4', '5.5', '5.6', '5.7', '5.8', '5.9',
    '5.10a', '5.10b', '5.10c', '5.10d',
    '5.11a', '5.11b', '5.11c', '5.11d',
    '5.12a', '5.12b', '5.12c', '5.12d',
    '5.13a', '5.13b', '5.13c', '5.13d',
    '5.14a', '5.14b', '5.14c', '5.14d',
    '5.15a', '5.15b', '5.15c', '5.15d',
    
    // Sistema UIAA
    'I', 'I+', 'II', 'II+', 'III', 'III+', 'IV', 'IV+', 'V', 'V+', 'VI', 'VI+',
    'VII-', 'VII', 'VII+', 'VIII-', 'VIII', 'VIII+', 'IX-', 'IX', 'IX+',
    'X-', 'X', 'X+', 'XI-', 'XI', 'XI+', 'XII-', 'XII', 'XII+',
    
    // Sistema V-Scale (Boulder)
    'VB', 'V0-', 'V0', 'V0+', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9',
    'V10', 'V11', 'V12', 'V13', 'V14', 'V15', 'V16', 'V17',
    
    // Sistema Font (Boulder)
    '3', '4-', '4', '4+', '5', '5+', '6A', '6A+', '6B', '6B+', '6C', '6C+',
    '7A', '7A+', '7B', '7B+', '7C', '7C+', '8A', '8A+', '8B', '8B+', '8C', '8C+', '9A',
    
    // Sistema Britânico (E-grade) - Exemplos principais
    'M 1a', 'D 2a', 'VD 3a', 'S 4a', 'HS 4b', 'HVS 4c', 'HVS 5a',
    'E1 5a', 'E1 5b', 'E2 5b', 'E2 5c', 'E3 5c', 'E3 6a', 'E4 6a', 'E4 6b',
    'E5 6a', 'E5 6b', 'E6 6b', 'E6 6c', 'E7 6c', 'E7 7a', 'E8 7a', 'E9 7b',
    
    // Sistema Australiano (Ewbank) - Principais
    '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
    '21', '22', '23', '24', '25', '26', '27', '28', '29', '30',
    '31', '32', '33', '34', '35', '36', '37', '38', '39',
    
    // Sistema WI (Ice Climbing)
    'WI1', 'WI2', 'WI3', 'WI4', 'WI5', 'WI6', 'WI7', 'WI8', 'WI9', 'WI10', 'WI11', 'WI12', 'WI13',
    
    // Sistema M (Mixed Climbing)
    'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12', 'M13', 'M14', 'M15'
  ];
  
  const [formData, setFormData] = useState({
    place: '',
    when: new Date().toISOString(), // Data e hora atual (obrigatória)
    activity: '',
    colour: '#ffffff', // Cor inicial branca
    routeNumber: '',
    grade: '',
    suggestedGrade: '',
    difficulty: '',
    effort: '',
    falls: '',
    ascentType: '',
    movement: '',
    grip: '',
    footwork: '',
    routeRating: '',
    settersRating: '',
    howItFelt: '',
    comments: '',
    // Campos condicionais
    climbingType: '',
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
  const navigationHeight = 80;
  const maxContentHeight = screenHeight * 0.9 - navigationHeight;
  
  // Cálculo da largura dos campos Grade baseado na fórmula:
  // padding_esquerda + largura_campo + 20px + largura_campo + padding_direita = largura_total
  const horizontalPadding = 20; // padding padrão usado no formulário
  const gradeSpacing = 20; // espaçamento entre os campos
  const availableWidth = screenWidth - (2 * horizontalPadding) - gradeSpacing;
  const gradeFieldWidth = availableWidth / 2;

  useEffect(() => {
    // Determinar se precisa de scroll baseado na altura do conteúdo
    setNeedsScroll(contentHeight > maxContentHeight);
  }, [contentHeight, maxContentHeight]);

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Função para determinar a cor do texto do checkmark baseada na cor de fundo
  const getCheckmarkTextColor = (backgroundColor: string) => {
    const lightColors = ['#ffffff', '#ffeb3b', '#bdbdbd'];
    return lightColors.includes(backgroundColor) ? '#333' : '#fff';
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSave = () => {
    if (!formData.when) {
      Alert.alert('Erro', 'A data é obrigatória');
      return;
    }

    // Converter campos vazios para null
    const cleanData = Object.fromEntries(
      Object.entries(formData).map(([key, value]) => [
        key, 
        value === '' ? null : value
      ])
    );

    onSave(cleanData);
    onClose();
    setCurrentStep(1); // Reset para o primeiro passo
  };

  const handleClose = () => {
    onClose();
    setCurrentStep(1); // Reset para o primeiro passo
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
      
      const day = parseInt(dateComponents[0]);
      const monthIndex = months.indexOf(dateComponents[1]);
      const year = parseInt(dateComponents[2]);
      
      if (monthIndex === -1) return displayDate;
      
      const date = new Date(year, monthIndex, day, parseInt(hours), parseInt(minutes));
      return date.toISOString();
    } catch {
      return displayDate; // Fallback
    }
  };

  const renderDateInput = (title: string, field: string, placeholder?: string) => {
    const fieldValue = formData[field as keyof typeof formData];
    const isEmpty = !fieldValue || fieldValue === '';
    const displayValue = formatDateForDisplay(fieldValue);
    
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

  const renderVisualSelector = (
    title: string, 
    field: string, 
    options: Array<{value: string, label: string, imageUrl: string}>
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
              source={{ uri: options[0].imageUrl }}
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
              source={{ uri: options[1].imageUrl }}
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

  const renderLocationSelector = () => {
    const locationOptions = [
      {
        value: 'Indoor',
        label: 'Indoor',
        imageUrl: 'https://weareclimbmax.com/wp-content/uploads/2024/08/sundevil-climbing.png'
      },
      {
        value: 'Outdoor',
        label: 'Outdoor',
        imageUrl: 'https://images.squarespace-cdn.com/content/v1/59e802b9be42d61a159cbf16/1628946429794-AXAG9YP5WE05XM3GQKCK/Twyla.png'
      }
    ];

    return renderVisualSelector('Local', 'place', locationOptions);
  };

  const renderActivitySelector = () => {
    const activityOptions = [
      {
        value: 'Climbing',
        label: 'Climbing',
        imageUrl: 'https://weareclimbmax.com/wp-content/uploads/2024/08/sundevil-climbing.png' // Temporário - substitua pela imagem de climbing
      },
      {
        value: 'Bouldering',
        label: 'Bouldering',
        imageUrl: 'https://images.squarespace-cdn.com/content/v1/59e802b9be42d61a159cbf16/1628946429794-AXAG9YP5WE05XM3GQKCK/Twyla.png' // Temporário - substitua pela imagem de bouldering
      }
    ];

    return renderVisualSelector('Atividade', 'activity', activityOptions);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <View>
            <Text style={styles.modalTitle}>Log your climbing session ✨</Text>
            <Text style={styles.modalSubtitle}>
              Track your progress and discover patterns in your climbing to reach new heights faster! 🚀
            </Text>
            {renderDateInput('', 'when', '15 Mar 2024, 14:30')}
            {renderLocationSelector()}
            {renderActivitySelector()}
            {formData.activity === 'Climbing' && 
              <View style={{marginTop: 15}}>
                {renderPickerNoTitle('climbingType', ['Top', 'Lead'])}
              </View>
            }
          </View>
        );

      case 2:
        return (
          <View>
            <Text style={styles.modalTitle}>Add route details 🧗‍♂️</Text>
            <Text style={styles.modalSubtitle}>Enter the information about your climbing route</Text>
            
            {/* Linha compartilhada: Route name + Route Color */}
            <View style={styles.sharedRowContainer}>
              <View style={styles.routeNameContainer}>
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Name</Text>
                  <TextInput
                    style={[styles.textInput, styles.routeNameInput]}
                    value={formData.routeNumber}
                    onChangeText={(value) => updateField('routeNumber', value)}
                  />
                </View>
              </View>
              <View style={styles.routeColorContainer}>
                {renderColorSelector()}
              </View>
            </View>
            {/* Linha com Grade e Suggested Grade */}
            <View style={styles.gradeRowContainer}>
              <View style={[styles.gradeContainer, { width: gradeFieldWidth }]}>
                {renderDropdownPicker('Grade', 'grade', gradeOptions, showGradePicker, setShowGradePicker)}
              </View>
              <View style={styles.gradeSpacer} />
              <View style={[styles.gradeContainer, { width: gradeFieldWidth }]}>
                {renderDropdownPicker('Suggested Grade', 'suggestedGrade', gradeOptions, showSuggestedGradePicker, setShowSuggestedGradePicker)}
              </View>
            </View>
          </View>
        );

      case 3:
        return (
          <View>
            {renderPicker('Difficulty', 'difficulty', ['Smooth', 'Hard', 'Very Hard'])}
            {renderPicker('Effort', 'effort', ['Low', 'Moderate', 'Hard'])}
            {renderTextInput('Number of Falls', 'falls')}
            {renderPicker('Ascent Type', 'ascentType', ['Redpoint', 'Onsight', 'Flash'])}
          </View>
        );

      case 4:
        return (
          <View>
            {renderTextInput('Movement Used', 'movement')}
            {renderTextInput('Grip', 'grip')}
            {renderTextInput('Footwork', 'footwork')}
          </View>
        );

      case 5:
        return (
          <View>
            {renderTextInput('Route Rating', 'routeRating')}
            {renderTextInput('Setter Rating', 'settersRating')}
          </View>
        );

      case 6:
        return (
          <View>
            {renderTextInput('How It Felt', 'howItFelt')}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Comments/Tips</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={formData.comments}
                onChangeText={(value) => updateField('comments', value)}
                multiline
                numberOfLines={4}
              />
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  const containerStyle = needsScroll 
    ? [styles.container, styles.containerFullScreen]
    : [styles.container, styles.containerAdaptive];

  const contentContainerStyle = needsScroll 
    ? styles.contentScrollable 
    : styles.contentFixed;

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent={true}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={handleClose}>
          <TouchableOpacity style={[styles.container, needsScroll ? styles.containerFullScreen : styles.containerAdaptive]} activeOpacity={1}>
            
            {needsScroll ? (
              // Modo com scroll - conteúdo ocupa tela toda
              <>
                <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentScrollable}>
                  {renderStep()}
                </ScrollView>
                
                {/* Botões fixos na parte inferior */}
                <View style={styles.navigationContainer}>
                  <TouchableOpacity 
                    style={[
                      styles.navButton, 
                      currentStep === 1 ? styles.cancelButton : (currentStep === 1 && styles.navButtonDisabled)
                    ]}
                    onPress={currentStep === 1 ? handleClose : handlePrevious}
                    disabled={false}
                  >
                    <Text style={[
                      styles.navButtonText, 
                      currentStep === 1 ? styles.cancelButtonText : (currentStep === 1 && styles.navButtonTextDisabled)
                    ]}>
                      {currentStep === 1 ? 'Cancel' : 'Previous'}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.buttonSpacer} />

                  {currentStep < totalSteps ? (
                    <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                      <Text style={styles.nextButtonText}>Next</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                      <Text style={styles.saveButtonText}>Save</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            ) : (
              // Modo sem scroll - conteúdo se adapta de baixo para cima
              <>
                <View style={styles.spacer} />
                
                <View 
                  style={contentContainerStyle}
                  onLayout={(event) => {
                    const { height } = event.nativeEvent.layout;
                    setContentHeight(height);
                  }}
                >
                  {renderStep()}
                </View>
                
                {/* Botões na parte inferior */}
                <View style={styles.navigationContainer}>
                  <TouchableOpacity 
                    style={[
                      styles.navButton, 
                      currentStep === 1 ? styles.cancelButton : (currentStep === 1 && styles.navButtonDisabled)
                    ]}
                    onPress={currentStep === 1 ? handleClose : handlePrevious}
                    disabled={false}
                  >
                    <Text style={[
                      styles.navButtonText, 
                      currentStep === 1 ? styles.cancelButtonText : (currentStep === 1 && styles.navButtonTextDisabled)
                    ]}>
                      {currentStep === 1 ? 'Cancel' : 'Previous'}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.buttonSpacer} />

                  {currentStep < totalSteps ? (
                    <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                      <Text style={styles.nextButtonText}>Next</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                      <Text style={styles.saveButtonText}>Save</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
      
      {/* Modal do Seletor de Cores */}
      {renderColorPickerModal()}
      
      {/* Modal do Seletor de Grade */}
      {renderGradePickerModal('grade', gradeOptions, showGradePicker, () => setShowGradePicker(false))}
      
      {/* Modal do Seletor de Suggested Grade */}
      {renderGradePickerModal('suggestedGrade', gradeOptions, showSuggestedGradePicker, () => setShowSuggestedGradePicker(false))}
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: THEME_COLORS.background.overlay,
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: THEME_COLORS.background.primary,
    borderTopLeftRadius: THEME_SIZES.borderRadius.large,
    borderTopRightRadius: THEME_SIZES.borderRadius.large,
  },
  containerAdaptive: {
    maxHeight: '90%',
    minHeight: '30%',
  },
  containerFullScreen: {
    height: '90%',
  },
  spacer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentFixed: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 20,
  },
  contentScrollable: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 20,
  },
  fieldContainer: {
    marginBottom: 0,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: THEME_COLORS.background.input,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000000',
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
    marginTop: 15,
  },
  buttonSpacer: {
    width: 15,
  },
  locationButton: {
    flex: 1,
    height: 120,
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
    width: 80,
    height: 60,
    borderRadius: 8,
    marginBottom: 8,
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
  navigationContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  navButton: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  navButtonDisabled: {
    backgroundColor: '#e9ecef',
    borderColor: '#d6d6d6',
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  navButtonTextDisabled: {
    color: '#999',
  },
  nextButton: {
    flex: 1,
    backgroundColor: THEME_COLORS.bluePrimary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  saveButton: {
    flex: 1,
    backgroundColor: THEME_COLORS.bluePrimary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  textInputError: {
    borderColor: '#ff0000',
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
  cancelButton: {
    backgroundColor: THEME_COLORS.softRed,
    borderColor: THEME_COLORS.softRed,
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  // Estilos do seletor de cores
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
  // Estilos do modal de cores
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
    width: 240, // 5 cores × 36px + 4 espaços × 12px = 228px + margem
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
  // Estilos para linha compartilhada
  sharedRowContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  routeNameContainer: {
    flex: 1,
    marginRight: 15,
  },
  routeColorContainer: {
    alignItems: 'flex-end',
  },
  routeNameInput: {
    height: 50, // Mesma altura que o colorSelectorButton
  },
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
    fontSize: 16,
    color: '#000000',
    fontWeight: '500',
  },
  dropdownPlaceholderText: {
    color: '#999',
  },
  dropdownIcon: {
    marginLeft: 0,
  },
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
  // Estilos para linha de Grade e Suggested Grade
  gradeRowContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingHorizontal: 0, // Remove padding pois a largura já considera os paddings laterais
  },
  gradeContainer: {
    // A largura será definida dinamicamente via props de estilo
  },
  gradeSpacer: {
    width: 20,
    flexShrink: 0, // Impede que o espaçador seja comprimido
  },
}); 