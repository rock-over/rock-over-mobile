import React, { useEffect, useState } from 'react';
import { BackHandler } from 'react-native';
import ForgotPassword from './ForgotPassword';
import Login from './Login';
import ProfileSetup from './ProfileSetup';
import ResetPassword from './ResetPassword';
import SignUp from './SignUp';
import VerifyEmail from './VerifyEmail';
import Welcome from './Welcome';

type AuthFlowScreen = 'welcome' | 'login' | 'signup' | 'verify' | 'profile' | 'forgot-password' | 'reset-password';

interface AuthFlowProps {
    onAuthSuccess?: (user: any) => void;
    initialScreen?: AuthFlowScreen;
    resetTokens?: { accessToken: string; refreshToken: string };
}

export default function AuthFlow({ onAuthSuccess, initialScreen = 'welcome', resetTokens }: AuthFlowProps) {
    const [currentScreen, setCurrentScreen] = useState<AuthFlowScreen>(initialScreen);
    const [tempUser, setTempUser] = useState<any>(null);
    const [signUpInfo, setSignUpInfo] = useState<{ email: string; password: string; name: string; gradingSystem: string } | null>(null);
    const [passwordResetTokens, setPasswordResetTokens] = useState<{ accessToken: string; refreshToken: string } | null>(resetTokens || null);

    // Handle native back button
    useEffect(() => {
        const backAction = () => {
            if (currentScreen === 'login' || currentScreen === 'signup' || currentScreen === 'verify' || currentScreen === 'forgot-password') {
                setCurrentScreen('welcome');
                return true; // Prevent default behavior (closing app)
            } else if (currentScreen === 'reset-password') {
                setCurrentScreen('forgot-password');
                return true;
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

    const handleNavigateToForgotPassword = () => {
        setCurrentScreen('forgot-password');
    };

    const handleGoBack = () => {
        if (currentScreen === 'reset-password') {
            setCurrentScreen('forgot-password');
        } else {
            setCurrentScreen('welcome');
        }
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

    const handleNavigateToVerify = (info: { email: string; password: string; name: string; gradingSystem: string }) => {
        setSignUpInfo(info);
        setCurrentScreen('verify');
    };

    const handleVerificationSuccess = (user: any) => {
        // Após verificação bem-sucedida, seguir para profile
        setTempUser(user);
        setCurrentScreen('profile');
    };

    const handleResetEmailSent = (email: string) => {
        // After reset email is sent, go back to login
        setCurrentScreen('login');
    };

    const handlePasswordResetSuccess = () => {
        // After password reset is successful, go back to login
        setCurrentScreen('login');
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
                    onNavigateToForgotPassword={handleNavigateToForgotPassword}
                    onGoBack={handleGoBack}
                />
            );
        case 'signup':
            return (
                <SignUp
                    onSignUpSuccess={handleSignUpSuccess}
                    onNavigateToLogin={handleNavigateToLogin}
                    onGoBack={handleGoBack}
                    onNavigateToVerify={handleNavigateToVerify}
                />
            );
        case 'verify':
            // signUpInfo should be non-null here
            return (
                <VerifyEmail
                    info={signUpInfo!}
                    onSuccess={handleVerificationSuccess}
                    onGoBack={handleGoBack}
                />
            );
        case 'forgot-password':
            return (
                <ForgotPassword
                    onGoBack={handleGoBack}
                    onResetEmailSent={handleResetEmailSent}
                />
            );
        case 'reset-password':
            return (
                <ResetPassword
                    accessToken={passwordResetTokens?.accessToken || ''}
                    refreshToken={passwordResetTokens?.refreshToken || ''}
                    onPasswordResetSuccess={handlePasswordResetSuccess}
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