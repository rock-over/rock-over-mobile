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

const { height: screenHeight } = Dimensions.get('window');

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
  
  const [formData, setFormData] = useState({
    place: '',
    when: new Date().toISOString(), // Data e hora atual (obrigatória)
    activity: '',
    colour: '',
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

  // Altura estimada dos botões + padding
  const navigationHeight = 80;
  const maxContentHeight = screenHeight * 0.9 - navigationHeight;

  useEffect(() => {
    // Determinar se precisa de scroll baseado na altura do conteúdo
    setNeedsScroll(contentHeight > maxContentHeight);
  }, [contentHeight, maxContentHeight]);

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
            Nenhum
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
            color="#4285F4" 
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
            {renderTextInput('Cor', 'colour')}
            {renderTextInput('Número/Nome da Rota', 'routeNumber')}
            {renderTextInput('Grau', 'grade', '4, 5a, 5b, etc')}
            {renderTextInput('Grau Sugerido', 'suggestedGrade')}
          </View>
        );

      case 3:
        return (
          <View>
            {renderPicker('Dificuldade', 'difficulty', ['Smooth', 'Hard', 'Very Hard'])}
            {renderPicker('Esforço', 'effort', ['Low', 'Moderate', 'Hard'])}
            {renderTextInput('Número de Quedas', 'falls')}
            {renderPicker('Tipo de Ascensão', 'ascentType', ['Redpoint', 'Onsight', 'Flash'])}
          </View>
        );

      case 4:
        return (
          <View>
            {renderTextInput('Movimento Usado', 'movement', 'Lift, Yard, Compress, etc')}
            {renderTextInput('Pegada', 'grip', 'Crimp, Pocket, Jug, etc')}
            {renderTextInput('Trabalho de Pés', 'footwork', 'Edge, Smear, Heel, etc')}
          </View>
        );

      case 5:
        return (
          <View>
            {renderTextInput('Avaliação da Rota', 'routeRating')}
            {renderTextInput('Avaliação do Setter', 'settersRating')}
          </View>
        );

      case 6:
        return (
          <View>
            {renderTextInput('Como se Sentiu', 'howItFelt')}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Comentários/Dicas</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={formData.comments}
                onChangeText={(value) => updateField('comments', value)}
                placeholder="Adicione suas observações..."
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
                    {currentStep === 1 ? 'Cancelar' : 'Anterior'}
                  </Text>
                </TouchableOpacity>

                {currentStep < totalSteps ? (
                  <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                    <Text style={styles.nextButtonText}>Próximo</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                    <Text style={styles.saveButtonText}>Salvar</Text>
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
                    {currentStep === 1 ? 'Cancelar' : 'Anterior'}
                  </Text>
                </TouchableOpacity>

                {currentStep < totalSteps ? (
                  <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                    <Text style={styles.nextButtonText}>Próximo</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                    <Text style={styles.saveButtonText}>Salvar</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#f5f5f5',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
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
    backgroundColor: '#4285F4',
    borderColor: '#4285F4',
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
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  locationButtonSelected: {
    borderColor: '#4285F4',
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
    color: '#4285F4',
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    marginHorizontal: 5,
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
    backgroundColor: '#4285F4',
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#4285F4',
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 5,
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
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  dateInputWithIcon: {
    flex: 1,
    fontSize: 16,
    marginLeft: 10,
    padding: 0,
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
    backgroundColor: '#dc3545',
    borderColor: '#dc3545',
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
}); 