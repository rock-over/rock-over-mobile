import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { AppEventsLogger } from 'react-native-fbsdk-next';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { supabase, signOut, verifyPasswordResetToken } from './lib/supabase';

// Importar as telas
import AuthFlow from './screens/AuthFlow';
import ClimbingSessionForm from './screens/ClimbingSessionForm';
import HomeWithTabs from './screens/HomeWithTabs';

const Stack = createStackNavigator();

// Criar o contexto de autenticação
const AuthContext = createContext<{
  session: Session | null;
  isLoading: boolean;
  userInfo: any;
  setUserInfo: (user: any) => void;
}>({
  session: null,
  isLoading: true,
  userInfo: null,
  setUserInfo: () => {},
});

export const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<any>(null);

  useEffect(() => {
    // Facebook Analytics (se disponível)
    try {
      AppEventsLogger.logEvent('AppOpen');
    } catch (error) {
      console.log('[FacebookEvents] ⚠️ Facebook SDK not available in this build');
    }

    // Monitorar mudanças de estado da sessão
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[App] 🔄 Initial session check:', session ? 'session found' : 'no session');
      setSession(session);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[App] 🔄 onAuthStateChange triggered:', event, session ? 'session exists' : 'no session');
      
      if (event === 'SIGNED_OUT' || !session) {
        console.log('[App] 🚫 No session, clearing userInfo');
        setSession(null);
        setUserInfo(null);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        console.log('[App] ✅ Session active, updating state');
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

  return (
    <AuthContext.Provider value={{ session, isLoading, userInfo, setUserInfo }}>
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
      
      // Sempre limpar o estado local, independente de erros
      setUserInfo(null);
      console.log('[App] 🧹 Local state cleared');
      
    } catch (error: any) {
      console.error('[App] ❌ Logout exception:', error);
      // Ainda assim, limpar o estado local
      setUserInfo(null);
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
    
    setUserInfo(user);
    console.log('[App] ✅ User info set in context');
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