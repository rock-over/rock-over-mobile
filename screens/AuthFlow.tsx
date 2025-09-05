import React, { useEffect, useState } from 'react';
import { BackHandler } from 'react-native';
import { supabase } from '../lib/supabase';
import { profileService } from '../services/profileService';
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

    const handleProfileComplete = async (profileData: { photoUri: string; gradingSystem: string }) => {
        console.log('Profile completed with data:', profileData);
        
        try {
            let finalProfilePhoto = profileData.photoUri;
            
            // Check if it's a custom photo (URI that starts with file://)
            const isCustomPhoto = profileData.photoUri.startsWith('file://') || 
                                 profileData.photoUri.startsWith('content://') ||
                                 profileData.photoUri.includes('ImagePicker');
            
            if (isCustomPhoto) {
                console.log('📤 [AuthFlow] Uploading custom profile photo to Supabase...');
                
                // Check if this is a Facebook user
                const isFacebookUser = tempUser.email?.includes('@facebook.') || 
                                     tempUser.email?.includes('@rockover.app') ||
                                     tempUser.facebook_id ||
                                     tempUser.user_metadata?.facebook_id;
                
                if (isFacebookUser) {
                    // For Facebook users, use a different approach since they don't have Supabase sessions
                    console.log('📱 [AuthFlow] Facebook user detected - using alternative upload method');
                    
                    // For now, just use the local URI and let the app handle it later
                    // We could implement a server-side upload or use a different approach
                    finalProfilePhoto = profileData.photoUri;
                    console.log('⚠️ [AuthFlow] Facebook user photo upload will be handled later');
                } else {
                    // Upload the custom photo to Supabase and get the public URL
                    const publicUrl = await profileService.uploadAndUpdateProfilePicture(profileData.photoUri);
                    finalProfilePhoto = publicUrl;
                    console.log('✅ [AuthFlow] Custom photo uploaded successfully:', publicUrl);
                }
                
                // Also update/create profile with grading system and other data
                if (!isFacebookUser) {
                    // Regular Supabase users
                    await profileService.upsertProfile({
                        email: tempUser.email || '',
                        name: tempUser.name || '',
                        grading_system: profileData.gradingSystem,
                        profile_picture_url: finalProfilePhoto
                    });
                } else {
                    // Facebook users - update profiles table directly
                    console.log('📱 [AuthFlow] Updating Facebook user profile directly');
                    try {
                        await supabase
                            .from('profiles')
                            .update({
                                grading_system: profileData.gradingSystem,
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', tempUser.id);
                        console.log('✅ [AuthFlow] Facebook user profile updated');
                    } catch (profileError) {
                        console.error('[AuthFlow] Facebook profile update error:', profileError);
                    }
                }
                
                console.log('✅ [AuthFlow] Custom photo uploaded successfully:', publicUrl);
            } else {
                // It's an illustration, create/update profile with illustration
                const isFacebookUser = tempUser.email?.includes('@facebook.') || 
                                     tempUser.email?.includes('@rockover.app') ||
                                     tempUser.facebook_id ||
                                     tempUser.user_metadata?.facebook_id;
                
                if (!isFacebookUser) {
                    // Regular Supabase users
                    await profileService.upsertProfile({
                        email: tempUser.email || '',
                        name: tempUser.name || '',
                        grading_system: profileData.gradingSystem
                    });
                } else {
                    // Facebook users - update profiles table directly
                    console.log('📱 [AuthFlow] Updating Facebook user profile directly (illustration)');
                    try {
                        await supabase
                            .from('profiles')
                            .update({
                                grading_system: profileData.gradingSystem,
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', tempUser.id);
                        console.log('✅ [AuthFlow] Facebook user profile updated (illustration)');
                    } catch (profileError) {
                        console.error('[AuthFlow] Facebook profile update error (illustration):', profileError);
                    }
                }
                
                console.log('✅ [AuthFlow] Profile created with illustration');
            }
            
            // Combinar dados do usuário temporário com dados do perfil
            const finalUser = {
                ...tempUser,
                profilePhoto: finalProfilePhoto,
                gradingSystem: profileData.gradingSystem
            };
            
            console.log('[AuthFlow] ✅ Profile setup completed successfully');
            onAuthSuccess?.(finalUser);
            
        } catch (error) {
            console.error('[AuthFlow] ❌ Error during profile setup:', error);
            
            // Fallback to local URI if upload fails
            const finalUser = {
                ...tempUser,
                profilePhoto: profileData.photoUri,
                gradingSystem: profileData.gradingSystem
            };
            
            onAuthSuccess?.(finalUser);
        }
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