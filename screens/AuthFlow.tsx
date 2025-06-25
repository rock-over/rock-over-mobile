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
                // On profile screen, complete with temp user and default profile photo
                const userWithDefaults = {
                    ...tempUser,
                    profilePhoto: 'illustration_1' // Default to first illustration
                };
                onAuthSuccess?.(userWithDefaults);
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
        // Login direto, adicionar profilePhoto padrão se não existir
        const userWithDefaults = {
            ...user,
            profilePhoto: user.profilePhoto || 'illustration_1'
        };
        onAuthSuccess?.(userWithDefaults);
    };

    const handleSignUpSuccess = (user: any) => {
        // Após signup, ir para profile setup
        setTempUser(user);
        setCurrentScreen('profile');
    };

    const handleProfileComplete = (profileData: { photoUri: string; gradingSystem: string }) => {
        // Combinar dados do usuário temporário com dados do perfil
        const finalUser = {
            ...tempUser,
            profilePhoto: profileData.photoUri,
            gradingSystem: profileData.gradingSystem
        };
        
        console.log('Profile completed with data:', profileData);
        onAuthSuccess?.(finalUser);
    };

    const handleProfileSkip = () => {
        // Usuário pulou o setup do perfil, usar padrões
        const userWithDefaults = {
            ...tempUser,
            profilePhoto: 'illustration_1',
            gradingSystem: 'yds'
        };
        onAuthSuccess?.(userWithDefaults);
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