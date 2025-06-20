import { GoogleSignin } from '@react-native-google-signin/google-signin';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface HomeProps {
  onLogout?: () => void;
  userInfo?: {
    name: string | null;
    email: string;
    photo: string | null;
  } | null;
}

export default function Home({ onLogout, userInfo }: HomeProps) {
  const handleLogout = async () => {
    try {
      await GoogleSignin.signOut();
      onLogout?.();
    } catch (error) {
      console.log('Error signing out:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Rock Over!</Text>
      {userInfo?.name && (
        <Text style={styles.userName}>Olá, {userInfo.name}!</Text>
      )}
      <Text style={styles.subtitle}>You are logged in successfully</Text>
      
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 10,
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#4285F4',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
  },
  logoutButton: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
