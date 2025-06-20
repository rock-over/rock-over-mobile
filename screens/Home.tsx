import { GoogleSignin } from '@react-native-google-signin/google-signin';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Modal, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ClimbingSession, climbingSessionService } from '../services/climbingSessionService';
import ClimbingSessionForm from './ClimbingSessionForm';
import SessionDetails from './SessionDetails';

interface HomeProps {
  onLogout?: () => void;
  userInfo?: {
    name: string | null;
    email: string;
    photo: string | null;
  } | null;
}

export default function Home({ onLogout, userInfo }: HomeProps) {
  const [sessions, setSessions] = useState<ClimbingSession[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<ClimbingSession | null>(null);

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
      Alert.alert('Sucesso', 'Sessão salva com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar sessão:', error);
      Alert.alert('Erro', 'Não foi possível salvar a sessão. Tente novamente.');
    }
  };

  const handleCardPress = (session: ClimbingSession) => {
    setSelectedSession(session);
  };

  const renderSessionCard = ({ item }: { item: ClimbingSession }) => (
    <TouchableOpacity style={styles.card} onPress={() => handleCardPress(item)}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.activity}</Text>
        <Text style={styles.cardDate}>{item.when}</Text>
      </View>
      <Text style={styles.cardPlace}>{item.place}</Text>
      {item.timeOfDay && (
        <Text style={styles.cardDetail}>Período: {item.timeOfDay}</Text>
      )}
      {item.grade && (
        <Text style={styles.cardDetail}>Grau: {item.grade}</Text>
      )}
      {item.routeNumber && (
        <Text style={styles.cardDetail}>Rota: {item.routeNumber}</Text>
      )}
      {item.difficulty && (
        <Text style={styles.cardDetail}>Dificuldade: {item.difficulty}</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.welcomeText}>
          Bem vindo, {userInfo?.name || 'Usuário'}!
        </Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Lista de Sessions */}
      <View style={styles.content}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Suas Sessões de Escalada</Text>
          <TouchableOpacity onPress={loadSessions} style={styles.refreshButton}>
            <Text style={styles.refreshText}>↻</Text>
          </TouchableOpacity>
        </View>
        
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
              <Text style={styles.emptyText}>
                {loading ? 'Carregando sessões...' : 'Nenhuma sessão registrada ainda'}
              </Text>
              {!loading && (
                <Text style={styles.emptySubtext}>Clique no botão + para adicionar sua primeira sessão!</Text>
              )}
            </View>
          }
        />
      </View>

      {/* Botão Flutuante */}
      <TouchableOpacity 
        style={styles.floatingButton} 
        onPress={() => setShowForm(true)}
      >
        <Text style={styles.floatingButtonText}>+</Text>
      </TouchableOpacity>

      {/* Formulário Modal */}
      <ClimbingSessionForm
        visible={showForm}
        onClose={() => setShowForm(false)}
        onSave={handleSaveSession}
      />

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
  welcomeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  logoutButton: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  refreshButton: {
    padding: 5,
  },
  refreshText: {
    fontSize: 20,
    color: '#4285F4',
  },
  listContainer: {
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  cardDate: {
    fontSize: 14,
    color: '#666',
  },
  cardPlace: {
    fontSize: 14,
    color: '#4285F4',
    marginBottom: 5,
  },
  cardDetail: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4285F4',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  floatingButtonText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
});
