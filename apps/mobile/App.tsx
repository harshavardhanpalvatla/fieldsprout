import 'react-native-gesture-handler';
import React from 'react';
import { PaperProvider } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { paperTheme } from './src/theme';
import { RootNavigator } from './src/navigation';
import { useOfflineQueue } from './src/hooks/useOfflineQueue';

function AppInner() {
  useOfflineQueue();
  return <RootNavigator />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={paperTheme}>
        <NavigationContainer>
          <AppInner />
          <StatusBar style="dark" />
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
