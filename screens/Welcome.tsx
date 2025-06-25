import { FontAwesome6 } from '@expo/vector-icons';
import React from 'react';
import { StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { THEME_COLORS } from '../constants/Theme';

interface WelcomeProps {
    onNavigateToLogin?: () => void;
    onNavigateToSignUp?: () => void;
}

export default function Welcome({ onNavigateToLogin, onNavigateToSignUp }: WelcomeProps) {
    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={THEME_COLORS.bluePrimary} />
            
            {/* Main Content Area with curved background */}
            <View style={styles.mainContent}>
                {/* Logo Area */}
                <View style={styles.logoContainer}>
                    <View style={styles.logoCircle}>
                        <Text style={styles.logoText}>RV</Text>
                    </View>
                    <Text style={styles.brandText}>Rock Over</Text>
                </View>

                {/* Mascot/Character Illustration */}
                <View style={styles.illustrationContainer}>
                    <View style={styles.mountainContainer}>
                        <FontAwesome6 name="mountain" size={80} color="#FF6B6B" />
                        <View style={styles.climberContainer}>
                            <FontAwesome6 name="person-hiking" size={40} color="#FFF" />
                        </View>
                    </View>
                </View>
            </View>

            {/* Curved Bottom Section */}
            <View style={styles.bottomSection}>
                <View style={styles.buttonContainer}>
                    <TouchableOpacity 
                        style={styles.loginButton}
                        onPress={onNavigateToLogin}
                    >
                        <Text style={styles.loginButtonText}>Already have an account</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={styles.getStartedButton}
                        onPress={onNavigateToSignUp}
                    >
                        <Text style={styles.getStartedButtonText}>Create account</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: THEME_COLORS.bluePrimary,
    },
    mainContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
        paddingTop: 60,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 80,
    },
    logoCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    logoText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#FFF',
    },
    brandText: {
        fontSize: 24,
        fontWeight: '600',
        color: '#FFF',
        letterSpacing: 1,
    },
    illustrationContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 40,
    },
    mountainContainer: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    climberContainer: {
        position: 'absolute',
        top: -10,
        right: -20,
        backgroundColor: THEME_COLORS.bluePrimary,
        borderRadius: 20,
        padding: 8,
        borderWidth: 2,
        borderColor: '#FFF',
    },
    bottomSection: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        paddingHorizontal: 40,
        paddingTop: 40,
        paddingBottom: 40,
        minHeight: 200,
    },
    buttonContainer: {
        gap: 16,
    },
    loginButton: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: THEME_COLORS.bluePrimary,
        borderRadius: 8,
        paddingVertical: 8,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 40,
    },
    loginButtonText: {
        color: THEME_COLORS.bluePrimary,
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    getStartedButton: {
        backgroundColor: THEME_COLORS.bluePrimary,
        borderRadius: 8,
        paddingVertical: 8,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 40,
    },
    getStartedButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
}); 