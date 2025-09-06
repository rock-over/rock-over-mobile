import { FontAwesome, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import * as SystemUI from 'expo-system-ui';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import SessionsScreen from '../app/(tabs)/sessions';
import { THEME_COLORS } from '../constants/Theme';
import AnalyticsScreen from './AnalyticsScreen';
import Home from './Home';
import ProfileScreen from './ProfileScreen';

const Tab = createBottomTabNavigator();

interface HomeWithTabsProps {
  onLogout?: () => void;
  userInfo?: {
    id: string;
    name: string | null;
    email: string;
    photo: string | null;
    profilePhoto?: string;
  } | null;
}

export default function HomeWithTabs({ onLogout, userInfo }: HomeWithTabsProps) {
  // Configurar a cor da navigation bar do Android
  useEffect(() => {
    if (Platform.OS === 'android') {
      SystemUI.setBackgroundColorAsync('#ffffff');
    }
  }, []);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: THEME_COLORS.bluePrimary,
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#E5E5E5',
          paddingBottom: Platform.OS === 'ios' ? 34 : 16,
          paddingTop: 6,
          height: Platform.OS === 'ios' ? 88 : 70,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
          marginTop: 1,
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size - 2} color={color} />
          ),
        }}
      >
        {(props) => <Home {...props} userInfo={userInfo} onLogout={onLogout} />}
      </Tab.Screen>
      
      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome5 name="chart-line" size={size - 2} color={color} solid />
          ),
        }}
      />
      
      <Tab.Screen
        name="Sessions"
        component={SessionsScreen}
        options={{
          title: 'Sessions',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome5 name="clipboard-list" size={size - 2} color={color} />
          ),
        }}
      />
      
      <Tab.Screen
        name="Profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome name="user" size={size - 2} color={color} />
          ),
        }}
      >
        {(props) => <ProfileScreen {...props} userInfo={userInfo} onLogout={onLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
