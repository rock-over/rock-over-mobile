import { useThemeColor } from "@/hooks/useThemeColor";
import { FontAwesome6 } from '@expo/vector-icons';
import {
    GoogleSignin,
    isErrorWithCode,
    isSuccessResponse,
    statusCodes
} from "@react-native-google-signin/google-signin";
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { THEME_COLORS } from '../constants/Theme';
import { authenticateUser, upsertGoogleUser } from '../lib/supabase';

interface LoginProps {
    onLoginSuccess?: (user: any) => void;
    onNavigateToSignUp?: () => void;
}

export default function Login({ onLoginSuccess, onNavigateToSignUp }: LoginProps) {

    const textColor = useThemeColor({}, "text");

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);  

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
            const response = await authenticateUser(email, password);
            
            if (!response.success) {
                Alert.alert('Login Failed', response.error || 'Invalid email or password');
                return;
            }

            // Success - call the callback with user data
            onLoginSuccess?.(response.user);
            
        } catch (error) {
            console.error('Login error:', error);
            Alert.alert('Error', 'An unexpected error occurred. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSignUp = () => {
        if (onNavigateToSignUp) {
            onNavigateToSignUp();
        } else {
            Alert.alert("Sign Up", "Sign up functionality will be implemented soon");
        }
    }

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
            const { idToken, user } = result.data;
            const { id, name, email, photo } = user;
            
            // Save/update user in Supabase
            const response = await upsertGoogleUser(
                id, 
                email, 
                name, 
                photo
            );
            
            if (!response.success) {
                Alert.alert('Login Failed', response.error || 'Failed to process Google login');
                return;
            }
            
            // Success - call the callback with Supabase user data
            onLoginSuccess?.(response.user);
            
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
            {/* Header with logo */}
            <View style={styles.header}>
            </View>

            {/* Illustration */}
            <View style={styles.illustrationContainer}>
                <View style={styles.illustration}>
                    <FontAwesome6 name="mountain" size={60} color={THEME_COLORS.bluePrimary} />
                    <FontAwesome6 name="user-plus" size={40} color="#FF6B6B" style={styles.userIcon} />
                </View>
            </View>

            {/* Form Container */}
            <View style={styles.formContainer}>
                {/* Email Input */}
                <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Email</Text>
                    <TextInput
                        style={styles.textInput}
                        value={email}
                        onChangeText={setEmail}
                        placeholder="admin@example.com"
                        placeholderTextColor="#999"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                </View>

                {/* Password Input */}
                <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Password</Text>
                    <TextInput
                        style={styles.textInput}
                        value={password}
                        onChangeText={setPassword}
                        placeholder="••••••••••"
                        placeholderTextColor="#999"
                        secureTextEntry
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                </View>

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
                        {isSubmitting ? "Signing in..." : "Sign In"}
                    </Text>
                </TouchableOpacity>

                {/* Sign Up Link */}
                <TouchableOpacity 
                    style={styles.signUpContainer}
                    onPress={handleSignUp}
                >
                    <Text style={styles.signUpText}>
                        New user? <Text style={styles.signUpLink}>Sign Up</Text>
                    </Text>
                </TouchableOpacity>

                {/* Social Login Buttons */}
                <TouchableOpacity 
                    style={styles.googleButton} 
                    onPress={handleGoogleSignIn}
                    disabled={isSubmitting}
                >
                    <FontAwesome6 name="google" size={16} color="#4285F4" />
                    <Text style={styles.googleButtonText}>
                        {isSubmitting ? "Signing in..." : "Sign up with Google"}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={styles.facebookButton} 
                    onPress={handleFacebookLogin}
                >
                    <FontAwesome6 name="facebook" size={16} color="#1877F2" />
                    <Text style={styles.facebookButtonText}>Sign up with Facebook</Text>
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
        backgroundColor: '#F8F9FA',
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: 20,
        alignItems: 'center',
        marginBottom: 40,
    },
    logo: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    illustrationContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    illustration: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
        width: 120,
        height: 120,
    },
    userIcon: {
        position: 'absolute',
        top: 10,
        right: 10,
    },
    formContainer: {
        flex: 1,
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 24,
        paddingTop: 32,
        paddingBottom: 40,
    },
    inputContainer: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '500',
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
    loginButton: {
        backgroundColor: THEME_COLORS.bluePrimary,
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 20,
    },
    loginButtonDisabled: {
        backgroundColor: '#E9ECEF',
    },
    loginButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    signUpContainer: {
        alignItems: 'center',
        marginBottom: 32,
    },
    signUpText: {
        fontSize: 14,
        color: '#666',
    },
    signUpLink: {
        color: THEME_COLORS.bluePrimary,
        fontWeight: '600',
    },
    googleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingVertical: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E9ECEF',
    },
    googleButtonText: {
        marginLeft: 8,
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
    },
    facebookButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingVertical: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E9ECEF',
    },
    facebookButtonText: {
        marginLeft: 8,
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
    },
    message: {
        marginTop: 16,
        color: '#DC3545',
        textAlign: 'center',
        fontSize: 14,
    },
});

    