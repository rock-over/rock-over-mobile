import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { AppEventsLogger } from 'react-native-fbsdk-next';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { supabase, verifyPasswordResetToken } from './lib/supabase';

// Importar as telas
import AuthFlow from './screens/AuthFlow';
import ClimbingSessionForm from './screens/ClimbingSessionForm';
import HomeWithTabs from './screens/HomeWithTabs';

const Stack = createStackNavigator();

// Criar o contexto de autenticação
const AuthContext = createContext<{
  session: Session | null;
  userInfo: any | null;
  setUserInfo: (userInfo: any) => void;
  isLoading: boolean;
}>({
  session: null,
  userInfo: null,
  setUserInfo: () => {},
  isLoading: true,
});

// Hook customizado para usar o contexto de autenticação
export const useAuth = () => {
  return useContext(AuthContext);
};

// Provedor de autenticação
const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Restaurar a sessão e ouvir por mudanças
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);

      if (session) {
        // Se houver uma sessão, podemos buscar informações adicionais do usuário aqui
        const user = session.user;
        const finalUser = {
          id: user.id,
          name: user.user_metadata?.name || user.email?.split('@')[0],
          email: user.email,
          photo: user.user_metadata?.avatar_url,
          profilePhoto: user.user_metadata?.profilePhoto || 'illustration_1',
        };
        setUserInfo(finalUser);
      }
      setIsLoading(false);
    };

    fetchSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('[App] 🔄 onAuthStateChange triggered:', _event, session ? 'session exists' : 'no session');
      
      setSession(session);
      if (session) {
        const user = session.user;
        
        // Check if user has completed profile setup
        const hasCompletedProfile = user.user_metadata?.profilePhoto && 
                                   user.user_metadata?.gradingSystem &&
                                   user.user_metadata?.profilePhoto !== 'illustration_1';
        
        console.log('[App] 🔍 Profile completion check:', {
          profilePhoto: user.user_metadata?.profilePhoto,
          gradingSystem: user.user_metadata?.gradingSystem,
          hasCompletedProfile
        });
        
        if (hasCompletedProfile) {
          const finalUser = {
            id: user.id,
            name: user.user_metadata?.name || user.email?.split('@')[0],
            email: user.email,
            photo: user.user_metadata?.avatar_url,
            profilePhoto: user.user_metadata?.profilePhoto,
            gradingSystem: user.user_metadata?.gradingSystem,
          };
          console.log('[App] ✅ User has completed profile, setting userInfo:', finalUser);
          setUserInfo(finalUser);
        } else {
          console.log('[App] ⏳ User has NOT completed profile setup, staying in AuthFlow');
          setUserInfo(null); // Keep in AuthFlow
        }
      } else {
        console.log('[App] 🚫 No session, clearing userInfo');
        setUserInfo(null);
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  // Facebook App Events - Condicionalmente ativo
  useEffect(() => {
    // Verificar se Facebook SDK está disponível
    try {
      if (AppEventsLogger && typeof AppEventsLogger.activateApp === 'function') {
        AppEventsLogger.activateApp();
        console.log('[FacebookEvents] 📊 App activation logged');
        
        // Rastrear quando o app fica ativo/background
        const handleAppStateChange = (nextAppState: string) => {
          if (nextAppState === 'active') {
            AppEventsLogger.activateApp();
            console.log('[FacebookEvents] 📊 App reactivation logged');
          }
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);

        return () => {
          subscription?.remove();
        };
      } else {
        console.log('[FacebookEvents] ⚠️ Facebook SDK not available in this build');
      }
    } catch (error) {
      console.log('[FacebookEvents] ❌ Facebook SDK error:', error);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ session, userInfo, setUserInfo, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

function AppContent() {
  const { session, isLoading, userInfo, setUserInfo } = useAuth();
  const [authFlowState, setAuthFlowState] = useState<{
    initialScreen: 'welcome' | 'login' | 'signup' | 'verify' | 'profile' | 'forgot-password' | 'reset-password';
    resetTokens?: { accessToken: string; refreshToken: string };
  }>({
    initialScreen: 'welcome'
  });

  useEffect(() => {
    // Configurar Google Sign In (pode ser movido para um local mais apropriado se necessário)
    GoogleSignin.configure({
      webClientId: "783345722479-f0cgob9p7fln5jieph78urp648ursjbh.apps.googleusercontent.com",
      iosClientId: "783345722479-m8mlc36nshvu46svuvjld0m234ec61kq.apps.googleusercontent.com",
      profileImageSize: 150,
      forceCodeForRefreshToken: true,
      // // iOS specific settings to prevent nonce issues
      // offlineAccess: true,
      // hostedDomain: '',
    });

    // Lógica para deep links de redefinição de senha
    const handleDeepLink = (url: string) => {
      if (url.includes('reset-password')) {
        const parsedUrl = Linking.parse(url);
        const { access_token, refresh_token } = parsedUrl.queryParams || {};
        
        if (access_token && refresh_token) {
          verifyPasswordResetToken(access_token as string, refresh_token as string)
            .then((result) => {
              if (result.success) {
                setAuthFlowState({
                  initialScreen: 'reset-password',
                  resetTokens: { accessToken: access_token as string, refreshToken: refresh_token as string }
                });
              }
            });
        }
      }
    };

    Linking.getInitialURL().then((url) => url && handleDeepLink(url));
    const subscription = Linking.addEventListener('url', (event) => handleDeepLink(event.url));

    return () => {
      subscription.remove();
    };
  }, []);

  if (isLoading) {
    return null; // Ou uma tela de splash/loading
  }

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleAuthSuccess = async (user: any) => {
    console.log('[App] 🎉 Auth success with user:', user);
    
    // Check if this is a Facebook user (they don't have Supabase sessions)
    const isFacebookUser = user.email?.includes('@facebook.') || 
                          user.email?.includes('@rockover.app') ||
                          user.facebook_id ||
                          user.user_metadata?.facebook_id;
    
    // Update user metadata in Supabase with profile setup data
    if (user.profilePhoto && user.gradingSystem) {
      console.log('[App] 💾 Updating user metadata in Supabase');
      
      if (isFacebookUser) {
        // For Facebook users, update directly in profiles table
        console.log('[App] 🔄 Updating Facebook user profile directly in database');
        try {
          const { error } = await supabase
            .from('profiles')
            .update({
              grading_system: user.gradingSystem,
              profile_picture_url: user.profilePhoto.startsWith('http') ? user.profilePhoto : null,
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id);
            
          if (error) {
            console.error('[App] ❌ Error updating Facebook user profile:', error);
          } else {
            console.log('[App] ✅ Facebook user profile updated successfully');
          }
        } catch (error) {
          console.error('[App] ❌ Unexpected error updating Facebook user profile:', error);
        }
      } else {
        // For regular Supabase users, update auth metadata
        const { error } = await supabase.auth.updateUser({
          data: {
            profilePhoto: user.profilePhoto,
            gradingSystem: user.gradingSystem,
            name: user.name
          }
        });
        
        if (error) {
          console.error('[App] ❌ Error updating user metadata:', error);
        } else {
          console.log('[App] ✅ User metadata updated successfully');
        }
      }
    }
    
    // Set userInfo to trigger Home screen
    setUserInfo(user);
  };

  console.log('[App] 🎬 Render decision - session:', !!session, 'userInfo:', !!userInfo);
  console.log('[App] 📊 UserInfo details:', userInfo);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {session && userInfo ? (
          <>
            {console.log('[App] 🏠 RENDERING HOME SCREEN WITH TABS!')}
            <Stack.Screen name="Home">
              {(props) => <HomeWithTabs {...props} userInfo={userInfo} onLogout={handleLogout} />}
            </Stack.Screen>
            <Stack.Screen
              name="ClimbingSessionForm"
              component={ClimbingSessionForm}
              options={{ headerShown: false }}
            />
          </>
        ) : (
          <>
            {console.log('[App] 🔐 RENDERING AUTHFLOW SCREEN!')}
            <Stack.Screen name="AuthFlow">
              {(props) => (
                <AuthFlow 
                  {...props}
                  initialScreen={authFlowState.initialScreen}
                  resetTokens={authFlowState.resetTokens}
                  onAuthSuccess={handleAuthSuccess}
                />
              )}
            </Stack.Screen>
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

export default App;