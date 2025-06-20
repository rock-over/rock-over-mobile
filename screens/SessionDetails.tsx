import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ClimbingSession } from '../services/climbingSessionService';

interface SessionDetailsProps {
  session: ClimbingSession;
  onClose: () => void;
}

export default function SessionDetails({ session, onClose }: SessionDetailsProps) {
  const renderField = (label: string, value: string | null | undefined) => {
    if (!value) return null;
    
    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={styles.fieldValue}>{value}</Text>
      </View>
    );
  };

  const renderEmptyField = (label: string) => (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.emptyValue}>-</Text>
    </View>
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.closeButton}>Fechar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Detalhes da Sessão</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Informações Principais */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informações Gerais</Text>
          
          {session.place ? renderField('Local', session.place) : renderEmptyField('Local')}
          {session.when ? renderField('Data', formatDate(session.when)) : renderEmptyField('Data')}
          {session.timeOfDay ? renderField('Período', session.timeOfDay) : renderEmptyField('Período')}
          {session.activity ? renderField('Atividade', session.activity) : renderEmptyField('Atividade')}
          {session.climbingType ? renderField('Tipo de Escalada', session.climbingType) : renderEmptyField('Tipo de Escalada')}
        </View>

        {/* Detalhes da Rota */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalhes da Rota</Text>
          
          {session.routeNumber ? renderField('Número/Nome da Rota', session.routeNumber) : renderEmptyField('Número/Nome da Rota')}
          {session.grade ? renderField('Grau', session.grade) : renderEmptyField('Grau')}
          {session.colour ? renderField('Cor', session.colour) : renderEmptyField('Cor')}
          {session.suggestedGrade ? renderField('Grau Sugerido', session.suggestedGrade) : renderEmptyField('Grau Sugerido')}
        </View>

        {/* Performance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance</Text>
          
          {session.difficulty ? renderField('Dificuldade', session.difficulty) : renderEmptyField('Dificuldade')}
          {session.effort ? renderField('Esforço', session.effort) : renderEmptyField('Esforço')}
          {session.falls ? renderField('Número de Quedas', session.falls) : renderEmptyField('Número de Quedas')}
          {session.ascentType ? renderField('Tipo de Ascensão', session.ascentType) : renderEmptyField('Tipo de Ascensão')}
          {session.howItFelt ? renderField('Como se Sentiu', session.howItFelt) : renderEmptyField('Como se Sentiu')}
        </View>

        {/* Avaliações */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Avaliações</Text>
          
          {session.routeRating ? renderField('Avaliação da Rota', session.routeRating) : renderEmptyField('Avaliação da Rota')}
          {session.settersRating ? renderField('Avaliação do Setter', session.settersRating) : renderEmptyField('Avaliação do Setter')}
        </View>

        {/* Técnica */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Técnica</Text>
          
          {session.movement ? renderField('Movimento Usado', session.movement) : renderEmptyField('Movimento Usado')}
          {session.grip ? renderField('Pegada', session.grip) : renderEmptyField('Pegada')}
          {session.footwork ? renderField('Trabalho de Pés', session.footwork) : renderEmptyField('Trabalho de Pés')}
        </View>

        {/* Comentários */}
        {session.comments && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Comentários/Dicas</Text>
            <View style={styles.commentsContainer}>
              <Text style={styles.commentsText}>{session.comments}</Text>
            </View>
          </View>
        )}

        <View style={styles.bottomSpace} />
      </ScrollView>
    </SafeAreaView>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  closeButton: {
    fontSize: 16,
    color: '#4285F4',
    fontWeight: '600',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 50, // Para centralizar o título
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 10,
  },
  fieldContainer: {
    marginBottom: 15,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 5,
  },
  fieldValue: {
    fontSize: 16,
    color: '#333',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  emptyValue: {
    fontSize: 16,
    color: '#999',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    fontStyle: 'italic',
  },
  commentsContainer: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    minHeight: 80,
  },
  commentsText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  bottomSpace: {
    height: 30,
  },
}); 