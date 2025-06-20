import React, { useState } from 'react';
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface ClimbingSessionFormProps {
  visible: boolean;
  onClose: () => void;
  onSave: (sessionData: any) => void;
}

export default function ClimbingSessionForm({ visible, onClose, onSave }: ClimbingSessionFormProps) {
  const [formData, setFormData] = useState({
    place: '',
    when: new Date().toISOString().split('T')[0], // Data de hoje (obrigatória)
    timeOfDay: '',
    activity: '',
    climbingType: '',
    routeNumber: '',
    grade: '',
    difficulty: '',
    effort: '',
    falls: '',
    ascentType: '',
    colour: '',
    routeRating: '',
    settersRating: '',
    suggestedGrade: '',
    howItFelt: '',
    movement: '',
    grip: '',
    footwork: '',
    comments: '',
  });

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelButton}>Cancelar</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Nova Sessão</Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={styles.saveButton}>Salvar</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
          {renderTextInput('Local', 'place', 'Indoor gym, outdoor location')}
          
          {renderTextInput('Data', 'when', '', true)}
          
          {renderPicker('Período', 'timeOfDay', ['Morning', 'Afternoon', 'Evening'])}
          
          {renderPicker('Atividade', 'activity', ['Climbing', 'Bouldering'])}
          
          {formData.activity === 'Climbing' && 
            renderPicker('Tipo de Escalada', 'climbingType', ['Top', 'Lead'])
          }
          
          {renderTextInput('Número/Nome da Rota', 'routeNumber')}
          
          {renderTextInput('Grau', 'grade', '4, 5a, 5b, etc')}
          
          {renderPicker('Dificuldade', 'difficulty', ['Smooth', 'Hard', 'Very Hard'])}
          
          {renderPicker('Esforço', 'effort', ['Low', 'Moderate', 'Hard'])}
          
          {renderTextInput('Número de Quedas', 'falls')}
          
          {renderPicker('Tipo de Ascensão', 'ascentType', ['Redpoint', 'Onsight', 'Flash'])}
          
          {renderTextInput('Cor', 'colour')}
          
          {renderTextInput('Avaliação da Rota', 'routeRating')}
          
          {renderTextInput('Avaliação do Setter', 'settersRating')}
          
          {renderTextInput('Grau Sugerido', 'suggestedGrade')}
          
          {renderTextInput('Como se Sentiu', 'howItFelt')}
          
          {renderTextInput('Movimento Usado', 'movement', 'Lift, Yard, Compress, etc')}
          
          {renderTextInput('Pegada', 'grip', 'Crimp, Pocket, Jug, etc')}
          
          {renderTextInput('Trabalho de Pés', 'footwork', 'Edge, Smear, Heel, etc')}
          
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
          
          <View style={styles.bottomSpace} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  cancelButton: {
    fontSize: 16,
    color: '#666',
  },
  saveButton: {
    fontSize: 16,
    color: '#4285F4',
    fontWeight: '600',
  },
  form: {
    flex: 1,
    paddingHorizontal: 20,
  },
  fieldContainer: {
    marginTop: 20,
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
  bottomSpace: {
    height: 50,
  },
}); 