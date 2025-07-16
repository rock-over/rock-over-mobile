import React from 'react';
import {
    ImageBackground,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { THEME_COLORS } from '../constants/Theme';

interface WelcomeProps {
    onNavigateToLogin?: () => void;
    onNavigateToSignUp?: () => void;
}

export default function Welcome({ onNavigateToLogin, onNavigateToSignUp }: WelcomeProps) {
    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
            <ImageBackground
                source={require('../assets/images/welcome-screen.png')}
                style={styles.image}
                resizeMode="cover"
            />
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
        backgroundColor: '#FFF',
    },
    image: {
        flex: 1,
        justifyContent: 'center',
    },
    bottomSection: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        paddingHorizontal: 40,
        paddingTop: 40,
        paddingBottom: 40,
        minHeight: 200,
        marginTop: -40, // Creates the overlap
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