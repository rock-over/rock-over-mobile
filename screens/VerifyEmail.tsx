import { FontAwesome6 } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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
  const [error, setError] = useState('');

  const validateCode = (value: string) => {
    let errorMessage = '';
    
    if (!value.trim()) {
      errorMessage = 'Verification code is required';
    } else if (!/^\d{6}$/.test(value.trim())) {
      errorMessage = 'Please enter a valid 6-digit code';
    }
    
    setError(errorMessage);
    return errorMessage === '';
  };

  const handleCodeChange = (text: string) => {
    // Only allow digits and limit to 6 characters
    const numericText = text.replace(/[^0-9]/g, '').slice(0, 6);
    setCode(numericText);
    
    // Clear error when user starts typing
    if (error) {
      setError('');
    }
  };

  const handleCodeBlur = () => {
    validateCode(code);
  };

  const handleVerify = async () => {
    if (!validateCode(code)) {
      return;
    }

    setIsSubmitting(true);
    try {
      const { success, user, error: verifyError } = await verifyEmailSignup(info.email, code.trim());
      if (!success || !user) {
        if (verifyError?.toLowerCase().includes('invalid') || verifyError?.toLowerCase().includes('expired')) {
          setError('Invalid or expired verification code');
        } else {
          setError(verifyError || 'Unable to verify code');
        }
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
      setError('Unexpected error while verifying email');
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

      <View style={[styles.inputWrapper, error && styles.inputWrapperError]}>
        <FontAwesome6 name="key" size={16} color={error ? '#ff0000' : THEME_COLORS.bluePrimary} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.textInput}
          value={code}
          onChangeText={handleCodeChange}
          onBlur={handleCodeBlur}
          placeholder="123456"
          keyboardType="number-pad"
          maxLength={6}
          placeholderTextColor="#999"
          returnKeyType="done"
          onSubmitEditing={() => {
            handleCodeBlur();
            handleVerify();
          }}
        />
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

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
  inputWrapperError: {
    borderColor: '#ff0000',
    borderWidth: 2,
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
  errorText: {
    color: '#ff0000',
    fontSize: 14,
    marginTop: -10, // Adjust as needed to position it correctly
    marginBottom: 15,
  },
}); 