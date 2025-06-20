import { useThemeColor } from "@/hooks/useThemeColor";
import {
    GoogleSignin,
    isErrorWithCode,
    isSuccessResponse,
    statusCodes
} from "@react-native-google-signin/google-signin";
import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface LoginProps {
    onLoginSuccess?: (user: any) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {

    const textColor = useThemeColor({}, "text");

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [termsCheck, setTermsCheck] = useState("");

    const [isSubmitting, setIsSubmitting] = useState(false);  

    const validateEmail = (email: string) => {}
    const validatePaswword = (email: string) => {}

    const showMessage = (message: string) => {
        setMessage(message);
        setTimeout(() => {
            setMessage("");
        }, 5000);
    }

    const handleSubmit = () => {
        if (email === "" || password === "") {
            showMessage("Please fill in all fields");
        } else {
            setMessage("");
            setPassword("");
            setEmail("");
            onLoginSuccess?.(null);
        }
    }

    const handleGoogleSignIn = async () => {
        try {
           setIsSubmitting(true);
    
           await GoogleSignin.hasPlayServices();
           const result = await GoogleSignin.signIn();
    
           if (isSuccessResponse(result)) {
            const { idToken, user } = result.data;
            const { name, email, photo } = user;
            onLoginSuccess?.(user);
           } else {
            showMessage("Google Signin was cancelled");
           }
    
           setIsSubmitting(false);
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
                showMessage("An error occurred");
            }

            setIsSubmitting(false);
            
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Rock over</Text>
            
            <TouchableOpacity 
                style={styles.loginButton} 
                onPress={handleGoogleSignIn}
                disabled={isSubmitting}
            >
                <Text style={styles.loginButtonText}>
                    {isSubmitting ? "Logging in..." : "Login"}
                </Text>
            </TouchableOpacity>

            {message ? (
                <Text style={styles.message}>{message}</Text>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 20,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 40,
    },
    loginButton: {
        backgroundColor: '#4285F4',
        paddingHorizontal: 40,
        paddingVertical: 15,
        borderRadius: 8,
        minWidth: 200,
        alignItems: 'center',
    },
    loginButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    message: {
        marginTop: 20,
        color: '#ff0000',
        textAlign: 'center',
    },
});

    