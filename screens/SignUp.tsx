import { FontAwesome6 } from '@expo/vector-icons';
import {
    GoogleSignin,
    isErrorWithCode,
    isSuccessResponse,
    statusCodes
} from "@react-native-google-signin/google-signin";
import React, { useRef, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { AccessToken, LoginManager } from 'react-native-fbsdk-next';
import { THEME_COLORS } from '../constants/Theme';
import { signInWithFacebook, signInWithGoogle, signUpEmail } from '../lib/supabase';

interface SignUpProps {
    onSignUpSuccess?: (user: any) => void;
    onGoBack?: () => void;
    onNavigateToLogin?: () => void;
    onNavigateToVerify?: (data: { email: string; password: string; name: string; gradingSystem: string }) => void;
}

export default function SignUp({ onSignUpSuccess, onGoBack, onNavigateToLogin, onNavigateToVerify }: SignUpProps) {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        gradingSystem: ''
    });

    const [errors, setErrors] = useState({
        name: '',
        email: '',
        password: '',
        gradingSystem: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [message, setMessage] = useState("");

    // Refs for navigating between inputs
    const nameRef = useRef<TextInput>(null);
    const emailRef = useRef<TextInput>(null);
    const passwordRef = useRef<TextInput>(null);
    
    // Email validation regex
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    // Password validation regex - at least 8 chars, 1 uppercase, 1 lowercase, 1 number
    // Allows letters, numbers, and common special characters
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&#+\-_.,:;(){}[\]<>=~^|\\/"'`]{8,}$/;

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
    };

    const handleFieldBlur = (field: string) => {
        validateField(field, formData[field as keyof typeof formData]);
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
        console.log('[SignUp] 🚀 Starting signup process for:', formData.email);
        console.log('[SignUp] 📝 Form data:', formData);

        try {
            const { success, user, error } = await signUpEmail(formData.email, formData.password, formData.name);
            console.log('[SignUp] 📊 Supabase result:', { success, user: user ? { id: user.id, email: user.email } : null, error });

            if (!success || !user) {
                console.log('[SignUp] ❌ Signup failed:', error);
                Alert.alert('Error', error || 'Unable to create account');
                return;
            }

            console.log('[SignUp] ✅ Signup successful, navigating to verify');
            console.log('[SignUp] 📧 User needs email verification - is new user:', !user.email_confirmed_at);

            // Pass data to verification flow so user can enter OTP code
            onNavigateToVerify?.({
                email: formData.email.trim(),
                password: formData.password,
                name: formData.name.trim(),
                gradingSystem: formData.gradingSystem || 'yds',
            });

        } catch (error) {
            console.error('[SignUp] ❌ Exception during signup:', error);
            Alert.alert('Error', 'An unexpected error occurred. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };


    const handleGoogleSignIn = async () => {
        try {
           setIsSubmitting(true);
    
           await GoogleSignin.hasPlayServices();
           
           // Force account selection every time by signing out first
           try {
               await GoogleSignin.signOut();
           } catch (signOutError) {
               // Ignore signOut errors (user might not be signed in)
               console.log('SignOut error (can be ignored):', signOutError);
           }
           
           const result = await GoogleSignin.signIn();
    
           if (isSuccessResponse(result)) {
            const { user, idToken } = result.data;
            const { id, name, email, photo } = user;
            
            // Get tokens from Google Sign-In result
            const tokens = await GoogleSignin.getTokens();
            
            // Use Supabase Google OAuth
            const authResult = await signInWithGoogle(idToken || '', tokens.accessToken || '');
            
            if (authResult.success && authResult.user) {
                console.log('[SignUp Google] 📊 User metadata:', authResult.user.user_metadata);
                console.log('[SignUp Google] 🆕 Is new user:', !(authResult.user.user_metadata as any)?.profilePhoto);
                console.log('[SignUp Google] 📅 Created at:', authResult.user.created_at);
                
                // Create user object with Supabase user data
                const userInfo = {
                    id: authResult.user.id,
                    name: authResult.user.user_metadata?.name || name || 'Unknown User',
                    email: authResult.user.email || email,
                    photo: authResult.user.user_metadata?.avatar_url || photo,
                };
                
                console.log('[SignUp Google] ✅ Calling onSignUpSuccess with user:', userInfo);
                // Success - call the callback with user data (will go to ProfileSetup)
                onSignUpSuccess?.(userInfo);
            } else {
                showMessage(authResult.error || "Google Sign-In failed");
            }
            
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

    const handleFacebookLogin = async () => {
        try {
            setIsSubmitting(true);
            
            // First, log out any existing Facebook session to force account selection
            await LoginManager.logOut();
            
            // Start Facebook login with OpenID Connect for ID Token
            const result = await LoginManager.logInWithPermissions(['openid', 'public_profile', 'email']);
            
            if (result.isCancelled) {
                showMessage("Facebook login was cancelled");
                return;
            }
            
            if (!result.grantedPermissions || result.grantedPermissions.length === 0) {
                showMessage("Required Facebook permissions not granted");
                return;
            }
            
            // Get the access token
            const data = await AccessToken.getCurrentAccessToken();
            
            if (!data || !data.accessToken) {
                showMessage("Failed to get Facebook access token");
                return;
            }
            
            console.log('Facebook Access Token obtained:', {
                hasToken: !!data.accessToken,
                permissions: data.permissions
            });
            
            // Use Supabase Facebook OAuth (same as Google)
            const authResult = await signInWithFacebook(data.accessToken);
            console.log('Supabase Facebook auth result:', authResult);
            
            if (authResult.success && authResult.user) {
                // Create user object with Supabase user data (same as Google approach)
                const userInfo = {
                    id: authResult.user.id,
                    name: authResult.user.user_metadata?.name || authResult.user.email?.split('@')[0] || 'Facebook User',
                    email: authResult.user.email || '',
                    photo: authResult.user.user_metadata?.avatar_url,
                    profilePhoto: authResult.user.user_metadata?.profilePhoto || 'illustration_1'
                };
                
                console.log('Final Facebook user info:', userInfo);
                
                // Success - call the callback with user data
                onSignUpSuccess?.(userInfo);
            } else {
                showMessage(authResult.error || "Facebook sign up failed");
            }
            
        } catch (error) {
            console.error('Facebook sign up error:', error);
            const errorMessage = (error as any)?.message || 'An error occurred during Facebook sign up';
            
            if (errorMessage.includes('LoginManager') || errorMessage.includes('AccessToken')) {
                showMessage("Facebook SDK not available in this build version. Please try standard signup.");
            } else {
                showMessage(errorMessage);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const showMessage = (message: string | Error | any) => {
        // Ensure we convert any error objects to strings for safe rendering
        const messageText = typeof message === 'string' ? message : 
                           message?.message || 
                           String(message) || 
                           'An error occurred';
        setMessage(messageText);
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
                    <Image
                        source={require('../assets/images/rock-over-white-letter.png')}
                        style={{ width: 170, height: 56, resizeMode: 'contain', alignSelf: 'center' }}
                    />
                </View>
            </View>

            {/* Form Container with curved top */}
            <View style={styles.formContainer}>
                <KeyboardAvoidingView
                    style={styles.keyboardContainer}
                    behavior='padding'
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 40}
                >
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        <Text style={styles.title}>Sign up</Text>
                        
                        {/* Name Input */}
                <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Name</Text>
                    <View style={[styles.inputWrapper, errors.name && styles.inputWrapperError]}>
                        <FontAwesome6 name="user" size={16} color={errors.name ? '#ff0000' : THEME_COLORS.bluePrimary} style={styles.inputIcon} solid />
                        <TextInput
                            style={styles.textInput}
                            value={formData.name}
                            onChangeText={(text) => handleInputChange('name', text)}
                            onBlur={() => handleFieldBlur('name')}
                            placeholder="Your Name"
                            placeholderTextColor="#999"
                            autoCapitalize="words"
                            autoCorrect={false}
                            ref={nameRef}
                            returnKeyType="next"
                            blurOnSubmit={false}
                            onSubmitEditing={() => {
                                handleFieldBlur('name');
                                emailRef.current?.focus();
                            }}
                        />
                    </View>
                    {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
                </View>

                        {/* Email Input */}
                <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Email</Text>
                    <View style={[styles.inputWrapper, errors.email && styles.inputWrapperError]}>
                        <FontAwesome6 name="envelope" size={16} color={errors.email ? '#ff0000' : THEME_COLORS.bluePrimary} style={styles.inputIcon} solid />
                        <TextInput
                            style={styles.textInput}
                            value={formData.email}
                            onChangeText={(text) => handleInputChange('email', text)}
                            onBlur={() => handleFieldBlur('email')}
                            placeholder="your@email.com"
                            placeholderTextColor="#999"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            ref={emailRef}
                            returnKeyType="next"
                            blurOnSubmit={false}
                            onSubmitEditing={() => {
                                handleFieldBlur('email');
                                passwordRef.current?.focus();
                            }}
                        />
                    </View>
                    {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
                </View>

                                                {/* Password Input */}
                <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Password</Text>
                    <View style={[styles.inputWrapper, errors.password && styles.inputWrapperError]}>
                        <FontAwesome6 name="lock" size={16} color={errors.password ? '#ff0000' : THEME_COLORS.bluePrimary} style={styles.inputIcon} solid />
                        <TextInput
                            style={styles.textInput}
                            value={formData.password}
                            onChangeText={(text) => handleInputChange('password', text)}
                            onBlur={() => handleFieldBlur('password')}
                            placeholder="Secret..."
                            placeholderTextColor="#999"
                            secureTextEntry={!showPassword}
                            autoCapitalize="none"
                            autoCorrect={false}
                            ref={passwordRef}
                            returnKeyType="done"
                            onSubmitEditing={() => {
                                handleFieldBlur('password');
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
        paddingTop: 45,
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
        position: 'relative',
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
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: THEME_COLORS.background.input,
        borderRadius: 8,
        paddingHorizontal: 15,
        ...Platform.select({
            ios: {
                paddingVertical: 12, // iOS precisa de padding vertical explícito
                minHeight: 48, // Altura mínima para consistência
            },
            android: {
                paddingVertical: 0, // Android funciona bem sem padding
            },
        }),
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
        ...Platform.select({
            ios: {
                paddingVertical: 0, // Remove padding interno no iOS
            },
            android: {
                // Mantém comportamento padrão do Android
            },
        }),
    },
    eyeButton: {
        padding: 4,
    },
    errorText: {
        color: '#ff0000',
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
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        marginBottom: 8,
    },
}); 