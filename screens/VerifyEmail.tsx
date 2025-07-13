import { FontAwesome6 } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { THEME_COLORS } from '../constants/Theme';
import { signInEmail, verifyEmailSignup } from '../lib/supabase';

interface VerifyEmailProps {
  info: { email: string; password: string; name: string; gradingSystem: string };
  onSuccess: (user: any) => void;
  onGoBack: () => void;
}

export default function VerifyEmail({ info, onSuccess, onGoBack }: VerifyEmailProps) {
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleVerify = async () => {
    if (!code.trim()) {
      Alert.alert('Error', 'Please enter the verification code');
      return;
    }
    setIsSubmitting(true);
    try {
      const { success, user, error } = await verifyEmailSignup(info.email, code.trim());
      if (!success || !user) {
        Alert.alert('Error', error || 'Unable to verify code');
        return;
      }

      // Ensure session exists. If not, log in with stored credentials.
      let authUser = user;
      if (!authUser?.session && info.password) {
        const { success: signOk, user: signUser } = await signInEmail(info.email, info.password);
        if (signOk && signUser) {
          authUser = signUser as any;
        }
      }

      const finalUser = {
        id: authUser.id,
        name: info.name,
        email: info.email,
        photo: null,
        profilePhoto: 'illustration_1',
        gradingSystem: info.gradingSystem,
      };

      onSuccess(finalUser);
    } catch (e) {
      console.error('verifyEmail error', e);
      Alert.alert('Error', 'Unexpected error while verifying email');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={onGoBack}>
        <FontAwesome6 name="chevron-left" size={20} color="#000" />
      </TouchableOpacity>
      <Text style={styles.title}>Confirm your email</Text>
      <Text style={styles.subtitle}>
        We have sent a 6-digit verification code to {info.email}. Please enter it below to confirm your account.
      </Text>

      <View style={styles.inputWrapper}>
        <FontAwesome6 name="key" size={16} color={THEME_COLORS.bluePrimary} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.textInput}
          value={code}
          onChangeText={setCode}
          placeholder="123456"
          keyboardType="number-pad"
          maxLength={6}
          placeholderTextColor="#999"
        />
      </View>

      <TouchableOpacity
        style={[styles.button, isSubmitting && styles.buttonDisabled]}
        onPress={handleVerify}
        disabled={isSubmitting}
      >
        <Text style={styles.buttonText}>{isSubmitting ? 'Verifying…' : 'Verify'}</Text>
      </TouchableOpacity>

      {/* Removed bottom back link */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 80 : 50,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 30,
    left: 16,
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 32,
    marginBottom: 12,
    color: THEME_COLORS.bluePrimary,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 24,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME_COLORS.bluePrimary,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 24,
  },
  textInput: {
    flex: 1,
    fontSize: 18,
    height: 48,
  },
  button: {
    backgroundColor: THEME_COLORS.bluePrimary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 