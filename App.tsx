import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Importar as telas
import AuthFlow from './screens/AuthFlow';
import Home from './screens/Home';

const Stack = createStackNavigator();

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<any>(null);

  useEffect(() => {
    // Configurar Google Sign In
    GoogleSignin.configure({
      webClientId: "783345722479-f0cgob9p7fln5jieph78urp648ursjbh.apps.googleusercontent.com",
      iosClientId: "783345722479-m8mlc36nshvu46svuvjld0m234ec61kq.apps.googleusercontent.com",
      profileImageSize: 150,
    });

    // Verificar se o usuário já está logado
    checkIfLoggedIn();
  }, []);

  const checkIfLoggedIn = async () => {
    try {
      const currentUser = await GoogleSignin.getCurrentUser();
      if (currentUser) {
        setUserInfo(currentUser.user);
        setIsLoggedIn(true);
      } else {
        setIsLoggedIn(false);
      }
    } catch (error) {
      console.log('Error checking login status:', error);
      setIsLoggedIn(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Função para atualizar o estado de login (será chamada pelas telas)
  const updateLoginStatus = (status: boolean, user = null) => {
    setIsLoggedIn(status);
    setUserInfo(user);
  };

  if (isLoading) {
    return null; // Ou uma tela de loading
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!isLoggedIn ? (
            // Fluxo de autenticação com Welcome, Login e SignUp
            <Stack.Screen name="AuthFlow">
              {(props) => (
                <AuthFlow 
                  {...props}
                  onAuthSuccess={(user) => updateLoginStatus(true, user)}
                />
              )}
            </Stack.Screen>
          ) : (
            // Telas quando está logado
            <Stack.Screen name="Home">
              {(props) => <Home {...props} userInfo={userInfo} onLogout={() => updateLoginStatus(false, null)} />}
            </Stack.Screen>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default App;