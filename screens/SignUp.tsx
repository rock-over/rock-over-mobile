import { FontAwesome6 } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { THEME_COLORS } from '../constants/Theme';
import { registerUserSimple } from '../lib/supabase';

interface SignUpProps {
    onSignUpSuccess?: (user: any) => void;
    navigation?: any;
}

const GRADING_SYSTEMS = [
    { label: 'YDS (American)', value: 'yds', description: '5.6, 5.7, 5.8...' },
    { label: 'French', value: 'french', description: '4a, 4b, 4c...' },
    { label: 'UIAA', value: 'uiaa', description: 'IV, V, VI...' },
    { label: 'British', value: 'british', description: 'VS, HVS, E1...' },
    { label: 'V-Scale (Bouldering)', value: 'v-scale', description: 'V0, V1, V2...' },
    { label: 'Font (Bouldering)', value: 'font', description: '4, 5, 6A...' }
];

export default function SignUp({ onSignUpSuccess, navigation }: SignUpProps) {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        gradingSystem: ''
    });

    const [errors, setErrors] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        gradingSystem: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Email validation regex
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    // Password validation regex - at least 8 chars, 1 uppercase, 1 lowercase, 1 number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;

    const validateField = (field: string, value: string) => {
        let error = '';

        switch (field) {
            case 'name':
                if (!value.trim()) {
                    error = 'Name is required';
                } else if (value.trim().length < 2) {
                    error = 'Name must be at least 2 characters';
                } else if (value.trim().length > 50) {
                    error = 'Name must be less than 50 characters';
                }
                break;

            case 'email':
                if (!value.trim()) {
                    error = 'Email is required';
                } else if (!emailRegex.test(value.trim())) {
                    error = 'Please enter a valid email address';
                }
                break;

            case 'password':
                if (!value) {
                    error = 'Password is required';
                } else if (value.length < 8) {
                    error = 'Password must be at least 8 characters';
                } else if (!passwordRegex.test(value)) {
                    error = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
                }
                break;

            case 'confirmPassword':
                if (!value) {
                    error = 'Please confirm your password';
                } else if (value !== formData.password) {
                    error = 'Passwords do not match';
                }
                break;

            case 'gradingSystem':
                if (!value) {
                    error = 'Please select a grading system';
                }
                break;
        }

        setErrors(prev => ({ ...prev, [field]: error }));
        return error === '';
    };

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        
        // Clear error when user starts typing
        if (errors[field as keyof typeof errors]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }

        // Real-time validation for email and password
        if (field === 'email' || field === 'password') {
            setTimeout(() => validateField(field, value), 500);
        }

        // Real-time validation for confirm password
        if (field === 'confirmPassword') {
            setTimeout(() => validateField(field, value), 300);
        }
    };

    const validateForm = () => {
        const nameValid = validateField('name', formData.name);
        const emailValid = validateField('email', formData.email);
        const passwordValid = validateField('password', formData.password);
        const confirmPasswordValid = validateField('confirmPassword', formData.confirmPassword);
        const gradingSystemValid = validateField('gradingSystem', formData.gradingSystem);

        return nameValid && emailValid && passwordValid && confirmPasswordValid && gradingSystemValid;
    };

    const handleSignUp = async () => {
        if (!validateForm()) {
            Alert.alert('Error', 'Please fix all errors before submitting');
            return;
        }

        setIsSubmitting(true);

        try {
            // Use simplified Supabase registration
            const response = await registerUserSimple(
                formData.email,
                formData.name,
                formData.password,
                formData.gradingSystem
            );

            if (!response.success) {
                Alert.alert('Registration Failed', response.error || 'Failed to create account. Please try again.');
                return;
            }

            Alert.alert(
                'Success!', 
                'Account created successfully! You are now logged in.',
                [
                    {
                        text: 'OK',
                        onPress: () => onSignUpSuccess?.(response.user)
                    }
                ]
            );

        } catch (error) {
            console.error('Sign up error:', error);
            Alert.alert('Error', 'An unexpected error occurred. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleGoBack = () => {
        if (navigation) {
            navigation.goBack();
        }
    };

    const isFormValid = () => {
        return formData.name.trim() && 
               formData.email.trim() && 
               formData.password && 
               formData.confirmPassword &&
               formData.gradingSystem &&
               Object.values(errors).every(error => !error);
    };

    return (
        <KeyboardAvoidingView 
            style={styles.container} 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView 
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Header with Back Button */}
                <View style={styles.header}>
                    <TouchableOpacity 
                        style={styles.backButton} 
                        onPress={handleGoBack}
                    >
                        <FontAwesome6 name="arrow-left" size={20} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.title}>Create Account</Text>
                    <Text style={styles.subtitle}>Join the climbing community</Text>
                </View>

                {/* Form */}
                <View style={styles.formContainer}>
                    {/* Name Input */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Full Name</Text>
                        <TextInput
                            style={[styles.textInput, errors.name ? styles.textInputError : null]}
                            value={formData.name}
                            onChangeText={(text) => handleInputChange('name', text)}
                            placeholder="Enter your full name"
                            placeholderTextColor="#999"
                            autoCapitalize="words"
                            autoCorrect={false}
                        />
                        {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
                    </View>

                    {/* Email Input */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Email</Text>
                        <TextInput
                            style={[styles.textInput, errors.email ? styles.textInputError : null]}
                            value={formData.email}
                            onChangeText={(text) => handleInputChange('email', text)}
                            placeholder="Enter your email"
                            placeholderTextColor="#999"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
                    </View>

                    {/* Password Input */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Password</Text>
                        <View style={styles.passwordContainer}>
                            <TextInput
                                style={[styles.passwordInput, errors.password ? styles.textInputError : null]}
                                value={formData.password}
                                onChangeText={(text) => handleInputChange('password', text)}
                                placeholder="Create a password"
                                placeholderTextColor="#999"
                                secureTextEntry={!showPassword}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                            <TouchableOpacity
                                style={styles.eyeButton}
                                onPress={() => setShowPassword(!showPassword)}
                            >
                                <FontAwesome6 
                                    name={showPassword ? "eye-slash" : "eye"} 
                                    size={16} 
                                    color="#666" 
                                />
                            </TouchableOpacity>
                        </View>
                        {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
                        <Text style={styles.helpText}>
                            Must be at least 8 characters with uppercase, lowercase, and number
                        </Text>
                    </View>

                    {/* Confirm Password Input */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Confirm Password</Text>
                        <View style={styles.passwordContainer}>
                            <TextInput
                                style={[styles.passwordInput, errors.confirmPassword ? styles.textInputError : null]}
                                value={formData.confirmPassword}
                                onChangeText={(text) => handleInputChange('confirmPassword', text)}
                                placeholder="Confirm your password"
                                placeholderTextColor="#999"
                                secureTextEntry={!showConfirmPassword}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                            <TouchableOpacity
                                style={styles.eyeButton}
                                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                                <FontAwesome6 
                                    name={showConfirmPassword ? "eye-slash" : "eye"} 
                                    size={16} 
                                    color="#666" 
                                />
                            </TouchableOpacity>
                        </View>
                        {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}
                    </View>

                    {/* Grading System Selection */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Preferred Grading System</Text>
                        <Text style={styles.helpText}>Choose your preferred climbing grade system</Text>
                        <View style={styles.gradingSystemContainer}>
                            {GRADING_SYSTEMS.map((system) => (
                                <TouchableOpacity
                                    key={system.value}
                                    style={[
                                        styles.gradingSystemOption,
                                        formData.gradingSystem === system.value ? styles.gradingSystemSelected : null
                                    ]}
                                    onPress={() => handleInputChange('gradingSystem', system.value)}
                                >
                                    <View style={styles.gradingSystemContent}>
                                        <Text style={[
                                            styles.gradingSystemLabel,
                                            formData.gradingSystem === system.value ? styles.gradingSystemLabelSelected : null
                                        ]}>
                                            {system.label}
                                        </Text>
                                        <Text style={[
                                            styles.gradingSystemDescription,
                                            formData.gradingSystem === system.value ? styles.gradingSystemDescriptionSelected : null
                                        ]}>
                                            {system.description}
                                        </Text>
                                    </View>
                                    {formData.gradingSystem === system.value && (
                                        <FontAwesome6 name="check" size={16} color="#fff" />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                        {errors.gradingSystem ? <Text style={styles.errorText}>{errors.gradingSystem}</Text> : null}
                    </View>

                    {/* Create Account Button */}
                    <TouchableOpacity 
                        style={[
                            styles.createButton, 
                            (!isFormValid() || isSubmitting) ? styles.createButtonDisabled : null
                        ]} 
                        onPress={handleSignUp}
                        disabled={!isFormValid() || isSubmitting}
                    >
                        <Text style={[
                            styles.createButtonText,
                            (!isFormValid() || isSubmitting) ? styles.createButtonTextDisabled : null
                        ]}>
                            {isSubmitting ? "Creating Account..." : "Create Account"}
                        </Text>
                    </TouchableOpacity>

                    {/* Back to Login Link */}
                    <TouchableOpacity 
                        style={styles.loginLinkContainer}
                        onPress={handleGoBack}
                    >
                        <Text style={styles.loginLinkText}>
                            Already have an account? <Text style={styles.loginLink}>Sign In</Text>
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 40,
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: 24,
        alignItems: 'center',
        marginBottom: 32,
        position: 'relative',
    },
    backButton: {
        position: 'absolute',
        left: 24,
        top: 65,
        padding: 8,
        zIndex: 1,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
    },
    formContainer: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 24,
        paddingTop: 32,
        paddingBottom: 40,
        flex: 1,
    },
    inputContainer: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    textInput: {
        backgroundColor: '#F8F9FA',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: '#333',
        borderWidth: 1,
        borderColor: '#E9ECEF',
    },
    textInputError: {
        borderColor: '#DC3545',
        backgroundColor: '#FFF5F5',
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8F9FA',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E9ECEF',
    },
    passwordInput: {
        flex: 1,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: '#333',
        backgroundColor: 'transparent',
    },
    eyeButton: {
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    errorText: {
        color: '#DC3545',
        fontSize: 12,
        marginTop: 4,
    },
    helpText: {
        color: '#666',
        fontSize: 12,
        marginTop: 4,
    },
    gradingSystemContainer: {
        marginTop: 8,
    },
    gradingSystemOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F8F9FA',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#E9ECEF',
    },
    gradingSystemSelected: {
        backgroundColor: THEME_COLORS.bluePrimary,
        borderColor: THEME_COLORS.bluePrimary,
    },
    gradingSystemContent: {
        flex: 1,
    },
    gradingSystemLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 2,
    },
    gradingSystemLabelSelected: {
        color: '#fff',
    },
    gradingSystemDescription: {
        fontSize: 12,
        color: '#666',
    },
    gradingSystemDescriptionSelected: {
        color: 'rgba(255, 255, 255, 0.8)',
    },
    createButton: {
        backgroundColor: THEME_COLORS.bluePrimary,
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 20,
    },
    createButtonDisabled: {
        backgroundColor: '#E9ECEF',
    },
    createButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    createButtonTextDisabled: {
        color: '#999',
    },
    loginLinkContainer: {
        alignItems: 'center',
    },
    loginLinkText: {
        fontSize: 14,
        color: '#666',
    },
    loginLink: {
        color: THEME_COLORS.bluePrimary,
        fontWeight: '600',
    },
}); 