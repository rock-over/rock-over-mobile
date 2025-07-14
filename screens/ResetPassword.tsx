import { useThemeColor } from "@/hooks/useThemeColor";
import { FontAwesome6 } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { THEME_COLORS } from '../constants/Theme';
import { confirmPasswordReset } from '../lib/supabase';

interface ResetPasswordProps {
    accessToken: string;
    refreshToken: string;
    onPasswordResetSuccess?: () => void;
    onGoBack?: () => void;
}

export default function ResetPassword({ accessToken, refreshToken, onPasswordResetSuccess, onGoBack }: ResetPasswordProps) {
    const textColor = useThemeColor({}, "text");

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    
    const [errors, setErrors] = useState({
        password: '',
        confirmPassword: ''
    });

    // Refs for input management
    const passwordRef = useRef<TextInput>(null);
    const confirmPasswordRef = useRef<TextInput>(null);

    // Password validation regex - requires at least 8 characters, uppercase, lowercase, and number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&#+\-_.,:;(){}[\]<>=~^|\\/"'`]{8,}$/;

    const validateField = (field: string, value: string) => {
        let error = '';

        switch (field) {
            case 'password':
                if (!value) {
                    error = 'Password is required';
                } else if (!passwordRegex.test(value)) {
                    error = 'Password must be at least 8 characters with uppercase, lowercase, and number';
                }
                break;

            case 'confirmPassword':
                if (!value) {
                    error = 'Please confirm your password';
                } else if (value !== password) {
                    error = 'Passwords do not match';
                }
                break;
        }

        setErrors(prev => ({ ...prev, [field]: error }));
        return error === '';
    };

    const handlePasswordChange = (text: string) => {
        setPassword(text);
        // Clear error when user starts typing
        if (errors.password) {
            setErrors(prev => ({ ...prev, password: '' }));
        }
        // Also revalidate confirm password if it exists
        if (confirmPassword && errors.confirmPassword) {
            setTimeout(() => validateField('confirmPassword', confirmPassword), 100);
        }
    };

    const handleConfirmPasswordChange = (text: string) => {
        setConfirmPassword(text);
        // Clear error when user starts typing
        if (errors.confirmPassword) {
            setErrors(prev => ({ ...prev, confirmPassword: '' }));
        }
    };

    const handlePasswordBlur = () => {
        validateField('password', password);
    };

    const handleConfirmPasswordBlur = () => {
        validateField('confirmPassword', confirmPassword);
    };

    const handleResetPassword = async () => {
        // Validate all fields before submitting
        const passwordValid = validateField('password', password);
        const confirmPasswordValid = validateField('confirmPassword', confirmPassword);

        if (!passwordValid || !confirmPasswordValid) {
            return;
        }

        setIsSubmitting(true);

        try {
            const { success, error, message } = await confirmPasswordReset(accessToken, refreshToken, password);
            
            if (!success) {
                Alert.alert('Error', error || 'Failed to reset password');
                return;
            }

            // Show success message and navigate
            Alert.alert(
                'Password Reset Successful',
                'Your password has been successfully updated. You can now log in with your new password.',
                [
                    {
                        text: 'OK',
                        onPress: () => onPasswordResetSuccess?.()
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
                        <FontAwesome6 name="key" size={24} color="#FFF" />
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
                        <Text style={styles.title}>New Password</Text>
                        
                        <Text style={styles.subtitle}>
                            Create a strong password for your account.
                        </Text>

                        {/* Password Input */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>New Password</Text>
                            <View style={[styles.inputWrapper, errors.password && styles.inputWrapperError]}>
                                <FontAwesome6 name="lock" size={16} color={errors.password ? '#ff0000' : THEME_COLORS.bluePrimary} style={styles.inputIcon} solid />
                                <TextInput
                                    style={styles.textInput}
                                    value={password}
                                    onChangeText={handlePasswordChange}
                                    onBlur={handlePasswordBlur}
                                    placeholder="Enter new password"
                                    placeholderTextColor="#999"
                                    secureTextEntry={!showPassword}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    ref={passwordRef}
                                    returnKeyType="next"
                                    onSubmitEditing={() => {
                                        handlePasswordBlur();
                                        confirmPasswordRef.current?.focus();
                                    }}
                                />
                                <TouchableOpacity
                                    style={styles.eyeButton}
                                    onPress={() => setShowPassword(!showPassword)}
                                >
                                    <FontAwesome6 
                                        name={showPassword ? "eye-slash" : "eye"} 
                                        size={16} 
                                        color={errors.password ? '#ff0000' : THEME_COLORS.bluePrimary} 
                                        solid
                                    />
                                </TouchableOpacity>
                            </View>
                            {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
                        </View>

                        {/* Confirm Password Input */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Confirm New Password</Text>
                            <View style={[styles.inputWrapper, errors.confirmPassword && styles.inputWrapperError]}>
                                <FontAwesome6 name="lock" size={16} color={errors.confirmPassword ? '#ff0000' : THEME_COLORS.bluePrimary} style={styles.inputIcon} solid />
                                <TextInput
                                    style={styles.textInput}
                                    value={confirmPassword}
                                    onChangeText={handleConfirmPasswordChange}
                                    onBlur={handleConfirmPasswordBlur}
                                    placeholder="Confirm new password"
                                    placeholderTextColor="#999"
                                    secureTextEntry={!showConfirmPassword}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    ref={confirmPasswordRef}
                                    returnKeyType="done"
                                    onSubmitEditing={() => {
                                        handleConfirmPasswordBlur();
                                        handleResetPassword();
                                    }}
                                />
                                <TouchableOpacity
                                    style={styles.eyeButton}
                                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                    <FontAwesome6 
                                        name={showConfirmPassword ? "eye-slash" : "eye"} 
                                        size={16} 
                                        color={errors.confirmPassword ? '#ff0000' : THEME_COLORS.bluePrimary} 
                                        solid
                                    />
                                </TouchableOpacity>
                            </View>
                            {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}
                        </View>

                        {/* Password Requirements */}
                        <View style={styles.requirementsContainer}>
                            <Text style={styles.requirementsTitle}>Password must contain:</Text>
                            <Text style={styles.requirementItem}>• At least 8 characters</Text>
                            <Text style={styles.requirementItem}>• One uppercase letter</Text>
                            <Text style={styles.requirementItem}>• One lowercase letter</Text>
                            <Text style={styles.requirementItem}>• One number</Text>
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
                                {isSubmitting ? "Updating..." : "Update Password"}
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
    eyeButton: {
        padding: 4,
    },
    requirementsContainer: {
        backgroundColor: '#F8F9FA',
        borderRadius: 8,
        padding: 16,
        marginBottom: 24,
    },
    requirementsTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    requirementItem: {
        fontSize: 13,
        color: '#666',
        marginBottom: 4,
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
    errorText: {
        color: '#ff0000',
        fontSize: 12,
        marginTop: 4,
    },
}); 