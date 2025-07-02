import { FontAwesome6 } from '@expo/vector-icons';
import {
    GoogleSignin,
    isErrorWithCode,
    isSuccessResponse,
    statusCodes
} from "@react-native-google-signin/google-signin";
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { THEME_COLORS } from '../constants/Theme';

interface SignUpProps {
    onSignUpSuccess?: (user: any) => void;
    onGoBack?: () => void;
    onNavigateToLogin?: () => void;
}

export default function SignUp({ onSignUpSuccess, onGoBack, onNavigateToLogin }: SignUpProps) {
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
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [message, setMessage] = useState("");

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

        return nameValid && emailValid && passwordValid && acceptTerms;
    };

    const handleSignUp = async () => {
        if (!validateForm()) {
            Alert.alert('Error', 'Please fill all fields correctly and accept the terms');
            return;
        }

        setIsSubmitting(true);

        try {
            // Simple mock signup for now - just create a user object
            const mockUser = {
                id: Date.now().toString(),
                name: formData.name,
                email: formData.email,
                photo: null,
                profilePhoto: 'illustration_1', // Default profile photo
                gradingSystem: formData.gradingSystem || 'yds'
            };

            Alert.alert(
                'Success!', 
                'Account created successfully!',
                [
                    {
                        text: 'OK',
                        onPress: () => onSignUpSuccess?.(mockUser)
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

    const handleGoogleSignIn = async () => {
        try {
           setIsSubmitting(true);
    
           await GoogleSignin.hasPlayServices();
           const result = await GoogleSignin.signIn();
    
           if (isSuccessResponse(result)) {
            const { user } = result.data;
            const { id, name, email, photo } = user;
            
            // Create user object with Google data
            const googleUser = {
                id: id,
                name: name || 'Unknown User',
                email: email,
                photo: photo,
                profilePhoto: 'illustration_1' // Default profile photo (not using Google photo)
            };
            
            // Success - call the callback with user data
            onSignUpSuccess?.(googleUser);
            
           } else {
            showMessage("Google Signin was cancelled");
           }
    
        } catch (error) {
            if (isErrorWithCode(error)) {
                switch (error.code) {
                    case statusCodes.SIGN_IN_CANCELLED:
                        showMessage("Google Signin was cancelled");
                        break;
                    case statusCodes.IN_PROGRESS:
                        showMessage("Google Signin is in progress");
                        break;
                    case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
                        showMessage("Play Services not available");
                        break;
                    default:
                        showMessage(error.code);
                }
            } else {
                showMessage("An error occurred during Google Sign-In");
                console.error('Google Sign-In error:', error);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleFacebookLogin = () => {
        Alert.alert("Facebook Login", "Facebook login functionality will be implemented soon");
    };

    const showMessage = (message: string) => {
        setMessage(message);
        setTimeout(() => {
            setMessage("");
        }, 5000);
    }

    const isFormValid = () => {
        return formData.name.trim() && 
               formData.email.trim() && 
               formData.password &&
               acceptTerms &&
               Object.values(errors).every(error => !error);
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
                        <Text style={styles.logoText}>RV</Text>
                    </View>
                </View>
            </View>

            {/* Form Container with curved top */}
            <View style={styles.formContainer}>
                <KeyboardAvoidingView 
                    style={styles.keyboardContainer}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <View style={styles.scrollContent}>
                        <Text style={styles.title}>Sign up</Text>
                        
                                        {/* Name Input */}
                <View style={styles.inputContainer}>
                    <View style={styles.labelContainer}>
                        <FontAwesome6 name="user" size={16} color="#333" style={styles.labelIcon} />
                        <Text style={styles.inputLabel}>Name</Text>
                    </View>
                            <View style={styles.inputWrapper}>
                                <TextInput
                                    style={styles.textInput}
                                    value={formData.name}
                                    onChangeText={(text) => handleInputChange('name', text)}
                                    placeholder=""
                                    placeholderTextColor="#999"
                                    autoCapitalize="words"
                                    autoCorrect={false}
                                />
                            </View>
                        </View>

                                        {/* Email Input */}
                <View style={styles.inputContainer}>
                    <View style={styles.labelContainer}>
                        <FontAwesome6 name="envelope" size={16} color="#333" style={styles.labelIcon} />
                        <Text style={styles.inputLabel}>Email</Text>
                    </View>
                            <View style={styles.inputWrapper}>
                                <TextInput
                                    style={styles.textInput}
                                    value={formData.email}
                                    onChangeText={(text) => handleInputChange('email', text)}
                                    placeholder=""
                                    placeholderTextColor="#999"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                            </View>
                        </View>

                                        {/* Password Input */}
                <View style={styles.inputContainer}>
                    <View style={styles.labelContainer}>
                        <FontAwesome6 name="lock" size={16} color="#333" style={styles.labelIcon} />
                        <Text style={styles.inputLabel}>Password</Text>
                    </View>
                            <View style={styles.inputWrapper}>
                                <TextInput
                                    style={styles.textInput}
                                    value={formData.password}
                                    onChangeText={(text) => handleInputChange('password', text)}
                                    placeholder=""
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
                                        color="#999" 
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Terms Checkbox */}
                        <TouchableOpacity
                            style={styles.termsContainer}
                            onPress={() => setAcceptTerms(!acceptTerms)}
                        >
                            <View style={[styles.checkbox, acceptTerms && styles.checkboxSelected]}>
                                {acceptTerms && (
                                    <FontAwesome6 name="check" size={12} color="#FFF" />
                                )}
                            </View>
                            <Text style={styles.termsText}>
                                Agree to the <Text style={styles.termsLink}>Term</Text> and <Text style={styles.termsLink}>Privacy Policy</Text>
                            </Text>
                        </TouchableOpacity>

                        {/* Sign Up Button */}
                        <TouchableOpacity 
                            style={[
                                styles.signUpButton, 
                                (!isFormValid() || isSubmitting) ? styles.signUpButtonDisabled : null
                            ]} 
                            onPress={handleSignUp}
                            disabled={!isFormValid() || isSubmitting}
                        >
                            <Text style={styles.signUpButtonText}>
                                {isSubmitting ? "Creating Account..." : "Sign Up"}
                            </Text>
                        </TouchableOpacity>

                        {/* Separator */}
                        <View style={styles.separatorContainer}>
                            <View style={styles.separatorLine} />
                            <Text style={styles.separatorText}>or</Text>
                            <View style={styles.separatorLine} />
                        </View>

                        {/* Social Login Buttons */}
                        <View style={styles.socialButtonsContainer}>
                            <TouchableOpacity 
                                style={styles.socialButton} 
                                onPress={handleGoogleSignIn}
                                disabled={isSubmitting}
                            >
                                <FontAwesome6 name="google" size={20} color="#4285F4" />
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={styles.socialButton} 
                                onPress={handleFacebookLogin}
                            >
                                <FontAwesome6 name="facebook" size={20} color="#1877F2" />
                            </TouchableOpacity>
                        </View>

                        {/* Error Message */}
                        {message ? (
                            <Text style={styles.message}>{message}</Text>
                        ) : null}
                    </View>
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
    logoText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFF',
    },
    formContainer: {
        flex: 1,
        backgroundColor: '#FFF',
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
    },
    keyboardContainer: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 32,
        paddingTop: 40,
        paddingBottom: 40,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'left',
        marginBottom: 24,
        letterSpacing: 1,
    },
    inputContainer: {
        marginBottom: 20,
    },
    labelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    labelIcon: {
        marginRight: 6,
    },
    inputLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: THEME_COLORS.background.input,
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 0,
    },
    inputIcon: {
        marginRight: 12,
    },
    textInput: {
        flex: 1,
        fontSize: 16,
        color: '#000000',
        fontWeight: '500',
    },
    eyeButton: {
        padding: 4,
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
    termsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 32,
        paddingHorizontal: 4,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#E9ECEF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    checkboxSelected: {
        backgroundColor: THEME_COLORS.bluePrimary,
        borderColor: THEME_COLORS.bluePrimary,
    },
    termsText: {
        fontSize: 14,
        color: '#666',
        flex: 1,
    },
    termsLink: {
        color: THEME_COLORS.bluePrimary,
        fontWeight: '500',
    },
    signUpButton: {
        backgroundColor: THEME_COLORS.bluePrimary,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 32,
        minHeight: 40,
    },
    signUpButtonDisabled: {
        backgroundColor: '#E9ECEF',
    },
    signUpButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    separatorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    separatorLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#E9ECEF',
    },
    separatorText: {
        fontSize: 14,
        color: '#999',
        marginHorizontal: 16,
    },
    socialButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 20,
        marginBottom: 32,
    },
    socialButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#FFF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E9ECEF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    message: {
        marginTop: 16,
        color: '#DC3545',
        textAlign: 'center',
        fontSize: 14,
    },
}); 