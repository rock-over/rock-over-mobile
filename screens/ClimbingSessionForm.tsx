import React, { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
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
    when: new Date().toISOString().split('T')[0], // Data de hoje (obrigatória)
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
    timeOfDay: '',
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

  const renderTextInput = (title: string, field: string, placeholder?: string, required?: boolean) => (
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>{title}{required && ' *'}</Text>
      <TextInput
        style={styles.textInput}
        value={formData[field as keyof typeof formData]}
        onChangeText={(value) => updateField(field, value)}
        placeholder={placeholder}
      />
    </View>
  );

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <View>
            {renderTextInput('Data', 'when', '', true)}
            {renderTextInput('Local', 'place', 'Indoor gym, outdoor location')}
            {renderPicker('Atividade', 'activity', ['Climbing', 'Bouldering'])}
            {renderPicker('Período', 'timeOfDay', ['Morning', 'Afternoon', 'Evening'])}
            {formData.activity === 'Climbing' && 
              renderPicker('Tipo de Escalada', 'climbingType', ['Top', 'Lead'])
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
      <TouchableOpacity 
        style={styles.modalOverlay} 
        activeOpacity={1} 
        onPress={handleClose}
      >
        <TouchableOpacity 
          style={containerStyle} 
          activeOpacity={1} 
          onPress={(e) => e.stopPropagation()}
        >
          {needsScroll ? (
            // Modo com scroll - conteúdo ocupa tela toda
            <>
              <ScrollView 
                style={styles.scrollView}
                contentContainerStyle={contentContainerStyle}
                showsVerticalScrollIndicator={false}
              >
                <View 
                  onLayout={(event) => {
                    const { height } = event.nativeEvent.layout;
                    setContentHeight(height);
                  }}
                >
                  {renderStep()}
                </View>
              </ScrollView>
              
              {/* Botões fixos na parte inferior */}
              <View style={styles.navigationContainer}>
                <TouchableOpacity 
                  style={[styles.navButton, currentStep === 1 && styles.navButtonDisabled]}
                  onPress={handlePrevious}
                  disabled={currentStep === 1}
                >
                  <Text style={[styles.navButtonText, currentStep === 1 && styles.navButtonTextDisabled]}>
                    Anterior
                  </Text>
                </TouchableOpacity>

                {currentStep < totalSteps ? (
                  <TouchableOpacity style={styles.navButton} onPress={handleNext}>
                    <Text style={styles.navButtonText}>Próximo</Text>
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
                  style={[styles.navButton, currentStep === 1 && styles.navButtonDisabled]}
                  onPress={handlePrevious}
                  disabled={currentStep === 1}
                >
                  <Text style={[styles.navButtonText, currentStep === 1 && styles.navButtonTextDisabled]}>
                    Anterior
                  </Text>
                </TouchableOpacity>

                {currentStep < totalSteps ? (
                  <TouchableOpacity style={styles.navButton} onPress={handleNext}>
                    <Text style={styles.navButtonText}>Próximo</Text>
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
    marginBottom: 20,
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
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  navButtonDisabled: {
    backgroundColor: '#e9ecef',
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  navButtonTextDisabled: {
    color: '#999',
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
}); 