import { useThemeColor } from "@/hooks/useThemeColor";
import { FontAwesome6 } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { THEME_COLORS } from '../constants/Theme';
import { resetPassword } from '../lib/supabase';

interface ForgotPasswordProps {
    onGoBack?: () => void;
    onResetEmailSent?: (email: string) => void;
}

export default function ForgotPassword({ onGoBack, onResetEmailSent }: ForgotPasswordProps) {
    const textColor = useThemeColor({}, "text");

    const [email, setEmail] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState({
        email: ''
    });

    // Refs for input management
    const emailRef = useRef<TextInput>(null);

    // Email validation regex
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

    const validateField = (field: string, value: string) => {
        let error = '';

        switch (field) {
            case 'email':
                if (!value.trim()) {
                    error = 'Email is required';
                } else if (!emailRegex.test(value.trim())) {
                    error = 'Please enter a valid email address';
                }
                break;
        }

        setErrors(prev => ({ ...prev, [field]: error }));
        return error === '';
    };

    const handleEmailChange = (text: string) => {
        setEmail(text);
        // Clear error when user starts typing
        if (errors.email) {
            setErrors(prev => ({ ...prev, email: '' }));
        }
    };

    const handleEmailBlur = () => {
        validateField('email', email);
    };

    const handleResetPassword = async () => {
        // Validate email before submitting
        const emailValid = validateField('email', email);

        if (!emailValid) {
            return;
        }

        setIsSubmitting(true);

        try {
            const { success, error, message } = await resetPassword(email);
            
            if (!success) {
                Alert.alert('Error', error || 'Failed to send reset email');
                return;
            }

            // Show success message and navigate
            Alert.alert(
                'Reset Email Sent',
                'We\'ve sent a password reset link to your email address. Please check your inbox and follow the instructions to reset your password.',
                [
                    {
                        text: 'OK',
                        onPress: () => onResetEmailSent?.(email)
                    }
                ]
            );

        } catch (error) {
            console.error('Reset password error:', error);
            Alert.alert('Error', 'An unexpected error occurred. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={THEME_COLORS.bluePrimary} />
            
            {/* Header with curved background */}
            <View style={styles.header}>
                <TouchableOpacity 
                    style={styles.backButton} 
                    onPress={onGoBack}
                >
                    <FontAwesome6 name="arrow-left" size={20} color="#FFF" />
                </TouchableOpacity>
                
                <View style={styles.headerContent}>
                    <View style={styles.logoContainer}>
                        <FontAwesome6 name="lock" size={24} color="#FFF" />
                    </View>
                </View>
            </View>

            {/* Form Container with curved top */}
            <View style={styles.formContainer}>
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
                >
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                    >
                        <Text style={styles.title}>Reset Password</Text>
                        
                        <Text style={styles.subtitle}>
                            Enter your email address and we'll send you a link to reset your password.
                        </Text>

                        {/* Email Input */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Email</Text>
                            <View style={[styles.inputWrapper, errors.email && styles.inputWrapperError]}>
                                <FontAwesome6 name="envelope" size={16} color={errors.email ? '#ff0000' : THEME_COLORS.bluePrimary} style={styles.inputIcon} solid />
                                <TextInput
                                    style={styles.textInput}
                                    value={email}
                                    onChangeText={handleEmailChange}
                                    onBlur={handleEmailBlur}
                                    placeholder="your@email.com"
                                    placeholderTextColor="#999"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    ref={emailRef}
                                    returnKeyType="done"
                                    onSubmitEditing={() => {
                                        handleEmailBlur();
                                        handleResetPassword();
                                    }}
                                />
                            </View>
                            {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
                        </View>

                        {/* Reset Button */}
                        <TouchableOpacity 
                            style={[
                                styles.resetButton,
                                isSubmitting ? styles.resetButtonDisabled : null
                            ]} 
                            onPress={handleResetPassword}
                            disabled={isSubmitting}
                        >
                            <Text style={styles.resetButtonText}>
                                {isSubmitting ? "Sending..." : "Send Reset Link"}
                            </Text>
                        </TouchableOpacity>

                        {/* Back to Login Link */}
                        <TouchableOpacity 
                            style={styles.backToLoginContainer}
                            onPress={onGoBack}
                        >
                            <Text style={styles.backToLoginText}>
                                Remember your password? <Text style={styles.backToLoginLink}>Back to Login</Text>
                            </Text>
                        </TouchableOpacity>
                    </ScrollView>
                </KeyboardAvoidingView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: THEME_COLORS.bluePrimary,
    },
    header: {
        paddingTop: 50,
        paddingHorizontal: 20,
        paddingBottom: 20,
        position: 'relative',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    backButton: {
        position: 'absolute',
        left: 20,
        top: 55,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    formContainer: {
        flex: 1,
        backgroundColor: '#FFF',
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        paddingHorizontal: 32,
        paddingTop: 40,
        paddingBottom: 40,
    },
    scrollContent: {
        flexGrow: 1,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'left',
        marginBottom: 16,
        letterSpacing: 1,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'left',
        marginBottom: 32,
        lineHeight: 24,
    },
    inputContainer: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: THEME_COLORS.background.input,
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 0,
    },
    inputWrapperError: {
        borderColor: '#ff0000',
        borderWidth: 1,
    },
    inputIcon: {
        marginRight: 12,
    },
    textInput: {
        flex: 1,
        fontSize: 16,
        color: '#000000',
        fontWeight: '400',
    },
    resetButton: {
        backgroundColor: THEME_COLORS.bluePrimary,
        borderRadius: 8,
        paddingVertical: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 32,
        minHeight: 40,
        marginTop: 12,
    },
    resetButtonDisabled: {
        backgroundColor: '#E9ECEF',
    },
    resetButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    backToLoginContainer: {
        alignItems: 'center',
        marginTop: 20,
    },
    backToLoginText: {
        fontSize: 14,
        color: '#666',
    },
    backToLoginLink: {
        color: THEME_COLORS.bluePrimary,
        fontWeight: '600',
    },
    errorText: {
        color: '#ff0000',
        fontSize: 12,
        marginTop: 4,
    },
}); 