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
                // On profile screen, do NOT auto-complete - let user finish setup
                console.log('[AuthFlow] 🚫 Back button pressed on profile screen - ignoring to let user complete setup');
                return true; // Prevent back action but don't auto-complete
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
        console.log('[AuthFlow] 🎯 handleSignUpSuccess called with user:', user);
        console.log('[AuthFlow] 🔄 Setting currentScreen to profile');
        setTempUser(user);
        setCurrentScreen('profile');
    };

    const handleNavigateToVerify = (info: { email: string; password: string; name: string; gradingSystem: string }) => {
        console.log('[AuthFlow] 📧 handleNavigateToVerify called with info:', info);
        console.log('[AuthFlow] 🔄 Setting currentScreen to verify');
        setSignUpInfo(info);
        setCurrentScreen('verify');
    };

    const handleVerificationSuccess = (user: any) => {
        // Após verificação bem-sucedida, seguir para profile
        console.log('[AuthFlow] ✅ handleVerificationSuccess called with user:', user);
        console.log('[AuthFlow] 🔄 Setting currentScreen to profile');
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
        console.log('[AuthFlow] 🚨 HANDLEPROFILESKIP CALLED! WHO CALLED THIS?');
        console.log('[AuthFlow] 📍 Stack trace:');
        console.trace();
        
        // Usuário pulou o setup do perfil, usar padrões
        const userWithDefaults = {
            ...tempUser,
            profilePhoto: 'illustration_1',
            gradingSystem: 'yds'
        };
        console.log('[AuthFlow] 🏠 Going to Home with defaults:', userWithDefaults);
        onAuthSuccess?.(userWithDefaults);
    };

    console.log('[AuthFlow] 🎬 Current screen:', currentScreen);
    console.log('[AuthFlow] 👤 Temp user:', tempUser);
    console.log('[AuthFlow] 📋 SignUp info:', signUpInfo);

    switch (currentScreen) {
        case 'welcome':
            console.log('[AuthFlow] 🏠 Rendering Welcome screen');
            return (
                <Welcome
                    onNavigateToLogin={handleNavigateToLogin}
                    onNavigateToSignUp={handleNavigateToSignUp}
                />
            );
        case 'login':
            console.log('[AuthFlow] 🔑 Rendering Login screen');
            return (
                <Login
                    onLoginSuccess={handleLoginSuccess}
                    onNavigateToSignUp={handleNavigateToSignUp}
                    onNavigateToForgotPassword={handleNavigateToForgotPassword}
                    onGoBack={handleGoBack}
                />
            );
        case 'signup':
            console.log('[AuthFlow] 📝 Rendering SignUp screen');
            return (
                <SignUp
                    onSignUpSuccess={handleSignUpSuccess}
                    onNavigateToLogin={handleNavigateToLogin}
                    onGoBack={handleGoBack}
                    onNavigateToVerify={handleNavigateToVerify}
                />
            );
        case 'verify':
            console.log('[AuthFlow] 📧 Rendering VerifyEmail screen');
            // signUpInfo should be non-null here
            return (
                <VerifyEmail
                    info={signUpInfo!}
                    onSuccess={handleVerificationSuccess}
                    onGoBack={handleGoBack}
                />
            );
        case 'forgot-password':
            console.log('[AuthFlow] 🔒 Rendering ForgotPassword screen');
            return (
                <ForgotPassword
                    onGoBack={handleGoBack}
                    onResetEmailSent={handleResetEmailSent}
                />
            );
        case 'reset-password':
            console.log('[AuthFlow] 🔑 Rendering ResetPassword screen');
            return (
                <ResetPassword
                    accessToken={passwordResetTokens?.accessToken || ''}
                    refreshToken={passwordResetTokens?.refreshToken || ''}
                    onPasswordResetSuccess={handlePasswordResetSuccess}
                    onGoBack={handleGoBack}
                />
            );
        case 'profile':
            console.log('[AuthFlow] 👤 Rendering ProfileSetup screen');
            return (
                <ProfileSetup
                    onComplete={handleProfileComplete}
                    onSkip={handleProfileSkip}
                />
            );
        default:
            console.log('[AuthFlow] ❓ Unknown screen, returning null');
            return null;
    }
} 