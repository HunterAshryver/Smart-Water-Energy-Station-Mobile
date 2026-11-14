import React from 'react';
import { Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import DashboardScreen from '../screens/DashboardScreen';
import CadastroScreen from '../screens/CadastroScreen';
import FalhasScreen from '../screens/FalhasScreen';

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#0B1424',
            borderTopColor: '#1E344D',
            height: 68,
            paddingTop: 7,
            paddingBottom: 8,
          },
          tabBarActiveTintColor: '#38BDF8',
          tabBarInactiveTintColor: '#718096',
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '700',
          },
        }}
      >
        <Tab.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{
            tabBarLabel: 'Painel',
            tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 17 }}>▦</Text>,
          }}
        />
        <Tab.Screen
          name="Cadastro"
          component={CadastroScreen}
          options={{
            tabBarLabel: 'Cadastrar',
            tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 17 }}>＋</Text>,
          }}
        />
        <Tab.Screen
          name="Falhas"
          component={FalhasScreen}
          options={{
            tabBarLabel: 'Falhas',
            tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 17 }}>⚠</Text>,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
