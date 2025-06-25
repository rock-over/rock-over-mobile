import React, { useEffect, useState } from 'react';
import { BackHandler } from 'react-native';
import Login from './Login';
import ProfileSetup from './ProfileSetup';
import SignUp from './SignUp';
import Welcome from './Welcome';

type AuthFlowScreen = 'welcome' | 'login' | 'signup' | 'profile';

interface AuthFlowProps {
    onAuthSuccess?: (user: any) => void;
}

export default function AuthFlow({ onAuthSuccess }: AuthFlowProps) {
    const [currentScreen, setCurrentScreen] = useState<AuthFlowScreen>('welcome');
    const [tempUser, setTempUser] = useState<any>(null);

    // Handle native back button
    useEffect(() => {
        const backAction = () => {
            if (currentScreen === 'login' || currentScreen === 'signup') {
                setCurrentScreen('welcome');
                return true; // Prevent default behavior (closing app)
            } else if (currentScreen === 'profile') {
                // On profile screen, complete with temp user
                onAuthSuccess?.(tempUser);
                return true;
            }
            // On welcome screen, allow default behavior (close app)
            return false;
        };

        const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

        return () => backHandler.remove();
    }, [currentScreen, tempUser, onAuthSuccess]);

    const handleNavigateToLogin = () => {
        setCurrentScreen('login');
    };

    const handleNavigateToSignUp = () => {
        setCurrentScreen('signup');
    };

    const handleGoBack = () => {
        setCurrentScreen('welcome');
    };

    const handleLoginSuccess = (user: any) => {
        // Login direto, sem profile setup
        onAuthSuccess?.(user);
    };

    const handleSignUpSuccess = (user: any) => {
        // Após signup, ir para profile setup
        setTempUser(user);
        setCurrentScreen('profile');
    };

    const handleProfileComplete = (profileData: { photoUri?: string; gradingSystem: string }) => {
        // Aqui você pode salvar os dados do perfil no Supabase
        console.log('Profile data:', profileData);
        // Por enquanto, vamos apenas completar o fluxo
        onAuthSuccess?.(tempUser);
    };

    const handleProfileSkip = () => {
        // Usuário pulou o setup do perfil
        onAuthSuccess?.(tempUser);
    };

    switch (currentScreen) {
        case 'welcome':
            return (
                <Welcome
                    onNavigateToLogin={handleNavigateToLogin}
                    onNavigateToSignUp={handleNavigateToSignUp}
                />
            );
        case 'login':
            return (
                <Login
                    onLoginSuccess={handleLoginSuccess}
                    onNavigateToSignUp={handleNavigateToSignUp}
                    onGoBack={handleGoBack}
                />
            );
        case 'signup':
            return (
                <SignUp
                    onSignUpSuccess={handleSignUpSuccess}
                    onNavigateToLogin={handleNavigateToLogin}
                    onGoBack={handleGoBack}
                />
            );
        case 'profile':
            return (
                <ProfileSetup
                    onComplete={handleProfileComplete}
                    onSkip={handleProfileSkip}
                />
            );
        default:
            return null;
    }
} 