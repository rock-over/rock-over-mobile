import { useThemeColor } from "@/hooks/useThemeColor";
import { FontAwesome6 } from '@expo/vector-icons';
import {
    GoogleSignin,
    isErrorWithCode,
    isSuccessResponse,
    statusCodes
} from "@react-native-google-signin/google-signin";
import React, { useState } from 'react';
import { Alert, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { THEME_COLORS } from '../constants/Theme';

interface LoginProps {
    onLoginSuccess?: (user: any) => void;
    onNavigateToSignUp?: () => void;
    onGoBack?: () => void;
}

export default function Login({ onLoginSuccess, onNavigateToSignUp, onGoBack }: LoginProps) {

    const textColor = useThemeColor({}, "text");

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);  

    const showMessage = (message: string) => {
        setMessage(message);
        setTimeout(() => {
            setMessage("");
        }, 5000);
    }

    const handleLogin = async () => {
        if (!email.trim() || !password.trim()) {
            Alert.alert('Error', 'Please enter both email and password');
            return;
        }

        setIsSubmitting(true);
        
        try {
            // Simple mock login for now - just create a user object
            const mockUser = {
                id: Date.now().toString(),
                name: email.split('@')[0], // Use email prefix as name
                email: email,
                photo: null,
                profilePhoto: 'illustration_1' // Default profile photo
            };
            
            // Success - call the callback with user data
            onLoginSuccess?.(mockUser);
            
        } catch (error) {
            console.error('Login error:', error);
            Alert.alert('Error', 'An unexpected error occurred. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleFacebookLogin = () => {
        // Facebook login functionality will be implemented later
        Alert.alert("Facebook Login", "Facebook login functionality will be implemented soon");
    }

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
            onLoginSuccess?.(googleUser);
            
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
                                        <Text style={styles.title}>Login</Text>
                
                {/* Email Input */}
                <View style={styles.inputContainer}>
                    <View style={styles.labelContainer}>
                        <FontAwesome6 name="envelope" size={16} color="#333" style={styles.labelIcon} />
                        <Text style={styles.inputLabel}>Email</Text>
                    </View>
                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.textInput}
                            value={email}
                            onChangeText={setEmail}
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
                            value={password}
                            onChangeText={setPassword}
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

                {/* Forgot Password Link */}
                <TouchableOpacity style={styles.forgotPasswordContainer}>
                    <Text style={styles.forgotPasswordText}>Forget password?</Text>
                </TouchableOpacity>

                {/* Login Button */}
                <TouchableOpacity 
                    style={[
                        styles.loginButton,
                        isSubmitting ? styles.loginButtonDisabled : null
                    ]} 
                    onPress={handleLogin}
                    disabled={isSubmitting}
                >
                    <Text style={styles.loginButtonText}>
                        {isSubmitting ? "Signing in..." : "Login"}
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

                {/* Sign Up Link */}
                <TouchableOpacity 
                    style={styles.signUpContainer}
                    onPress={onNavigateToSignUp}
                >
                    <Text style={styles.signUpText}>
                        Don't have an account? <Text style={styles.signUpLink}>Sign Up</Text>
                    </Text>
                </TouchableOpacity>

                {/* Error Message */}
                {message ? (
                    <Text style={styles.message}>{message}</Text>
                ) : null}
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
        paddingHorizontal: 32,
        paddingTop: 40,
        paddingBottom: 40,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'left',
        marginBottom: 32,
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
    forgotPasswordContainer: {
        alignItems: 'flex-end',
        marginBottom: 32,
    },
    forgotPasswordText: {
        fontSize: 14,
        color: THEME_COLORS.bluePrimary,
        fontWeight: '500',
    },
    loginButton: {
        backgroundColor: THEME_COLORS.bluePrimary,
        borderRadius: 8,
        paddingVertical: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 32,
        minHeight: 40,
    },
    loginButtonDisabled: {
        backgroundColor: '#E9ECEF',
    },
    loginButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    separatorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 32,
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
    signUpContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    signUpText: {
        fontSize: 14,
        color: '#666',
    },
    signUpLink: {
        color: THEME_COLORS.bluePrimary,
        fontWeight: '600',
    },
    message: {
        marginTop: 16,
        color: '#DC3545',
        textAlign: 'center',
        fontSize: 14,
    },
});

    