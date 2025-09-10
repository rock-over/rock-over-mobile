import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppEventsLogger } from 'react-native-fbsdk-next';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { signOut, supabase, verifyPasswordResetToken } from './lib/supabase';

// Importar as telas
import AuthFlow from './screens/AuthFlow';
import ClimbingSessionForm from './screens/ClimbingSessionForm';
import HomeWithTabs from './screens/HomeWithTabs';

const Stack = createStackNavigator();

// Constantes para AsyncStorage
const USER_SESSION_KEY = '@user_session';
const USER_INFO_KEY = '@user_info';

// Funções de persistência
const saveUserSession = async (userInfo: any) => {
  try {
    await AsyncStorage.setItem(USER_INFO_KEY, JSON.stringify(userInfo));
    console.log('[Auth] 💾 User session saved to AsyncStorage');
  } catch (error) {
    console.error('[Auth] ❌ Error saving user session:', error);
  }
};

const loadUserSession = async () => {
  try {
    const savedUserInfo = await AsyncStorage.getItem(USER_INFO_KEY);
    if (savedUserInfo) {
      const parsedUserInfo = JSON.parse(savedUserInfo);
      console.log('[Auth] 📱 User session loaded from AsyncStorage');
      return parsedUserInfo;
    }
    return null;
  } catch (error) {
    console.error('[Auth] ❌ Error loading user session:', error);
    return null;
  }
};

const clearUserSession = async () => {
  try {
    await AsyncStorage.removeItem(USER_INFO_KEY);
    await AsyncStorage.removeItem(USER_SESSION_KEY);
    console.log('[Auth] 🧹 User session cleared from AsyncStorage');
  } catch (error) {
    console.error('[Auth] ❌ Error clearing user session:', error);
  }
};

// Criar o contexto de autenticação
const AuthContext = createContext<{
  session: Session | null;
  isLoading: boolean;
  userInfo: any;
  setUserInfo: (user: any) => void;
  clearSavedUserData: () => Promise<void>;
}>({
  session: null,
  isLoading: true,
  userInfo: null,
  setUserInfo: () => {},
  clearSavedUserData: async () => {},
});

export const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<any>(null);

  useEffect(() => {
    const initializeAuth = async () => {
      // Facebook Analytics (se disponível)
      try {
        AppEventsLogger.logEvent('AppOpen');
      } catch (error) {
        console.log('[FacebookEvents] ⚠️ Facebook SDK not available in this build');
      }

      // 1. Primeiro, tentar carregar dados salvos localmente
      console.log('[Auth] 🔄 Loading saved user session...');
      const savedUserInfo = await loadUserSession();
      
      if (savedUserInfo) {
        console.log('[Auth] ✅ Found saved user session, restoring login state');
        setUserInfo(savedUserInfo);
      } else {
        console.log('[Auth] 📭 No saved user session found');
      }

      // 2. Verificar se há sessão ativa no Supabase (para usuários não-Facebook)
      supabase.auth.getSession().then(({ data: { session } }) => {
        console.log('[Auth] 🔄 Initial session check:', session ? 'session found' : 'no session');
        setSession(session);
        setIsLoading(false);
      });
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth] 🔄 onAuthStateChange triggered:', event, session ? 'session exists' : 'no session');
      
      if (event === 'SIGNED_OUT' || !session) {
        console.log('[Auth] 🚫 No session, clearing userInfo and saved data');
        setSession(null);
        setUserInfo(null);
        await clearUserSession();
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        console.log('[Auth] ✅ Session active, updating state');
        setSession(session);
      }
      
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Log render decisions for debugging
  useEffect(() => {
    console.log('[App] 🎬 Render decision - session:', !!session, 'userInfo:', !!userInfo);
    console.log('[App] 📊 UserInfo details:', userInfo);
  }, [session, userInfo]);

  const clearSavedUserData = async () => {
    await clearUserSession();
  };

  return (
    <AuthContext.Provider value={{ session, isLoading, userInfo, setUserInfo, clearSavedUserData }}>
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
    console.log('[App] 🚪 Starting logout process...');
    
    try {
      // Use nossa nova função de logout que suporta iOS
      const { error } = await signOut();
      
      if (error) {
        console.error('[App] ❌ Error during logout:', error);
      } else {
        console.log('[App] ✅ Logout successful');
      }
      
      // Sempre limpar o estado local e AsyncStorage, independente de erros
      setUserInfo(null);
      await clearUserSession();
      console.log('[App] 🧹 Local state and AsyncStorage cleared');
      
    } catch (error: any) {
      console.error('[App] ❌ Logout exception:', error);
      // Ainda assim, limpar o estado local e AsyncStorage
      setUserInfo(null);
      await clearUserSession();
    }
  };

  const handleAuthSuccess = async (user: any) => {
    console.log('[App] 🎉 Auth success with user:', user);
    
    // Check if this is a Facebook user (they don't have Supabase sessions)
    const isFacebookUser = user.email?.includes('@facebook.') || 
                          user.email?.includes('@rockover.app') ||
                          user.facebook_id ||
                          user.user_metadata?.facebook_id;
    
    if (isFacebookUser) {
      console.log('[App] 📱 Facebook user detected');
      // For Facebook users, we don't expect a Supabase session
      // They use their own authentication system
    } else {
      console.log('[App] 👤 Regular user (Email/Google) detected');
    }
    
    // Salvar usuário no estado local e AsyncStorage
    setUserInfo(user);
    await saveUserSession(user);
    console.log('[App] ✅ User info set in context and saved to AsyncStorage');
  };

  // Se tem userInfo, mostrar app logado
  if (userInfo) {
    console.log('[App] 🏠 RENDERING MAIN APP!');
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="HomeWithTabs">
            {(props) => <HomeWithTabs {...props} userInfo={userInfo} onLogout={handleLogout} />}
          </Stack.Screen>
          <Stack.Screen 
            name="ClimbingSessionForm" 
            component={ClimbingSessionForm}
            options={{
              headerShown: false,
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  // Se não tem userInfo, mostrar fluxo de autenticação
  console.log('[App] 🔐 RENDERING AUTHFLOW SCREEN!');
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="AuthFlow">
          {(props) => (
            <AuthFlow
              {...props}
              onAuthSuccess={handleAuthSuccess}
              initialScreen={authFlowState.initialScreen}
              resetTokens={authFlowState.resetTokens}
            />
          )}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}