import { useEffect, useState } from 'react';
import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from '@react-navigation/native';
import { Stack, router, useSegments, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { PaperProvider, ActivityIndicator, Text } from 'react-native-paper';
import 'react-native-reanimated';
import { AuthProvider } from '../src/auth/AuthContext';
import { useAuth } from '../src/auth/useAuth';
import { ThemeProvider, useThemeMode } from '../src/theme/ThemeContext';
import { lightTheme, darkTheme } from '../src/theme';
import { initDatabase } from '../src/database';

export const unstable_settings = {
  initialRouteName: '(auth)',
};

function RootLayoutNav() {
  const { isDark } = useThemeMode();
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const navigationState = useRootNavigationState();

  const paperTheme = isDark ? darkTheme : lightTheme;
  const navigationTheme = isDark ? NavigationDarkTheme : NavigationDefaultTheme;

  useEffect(() => {
    if (!navigationState?.key) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isLoading) {
      if (isAuthenticated && inAuthGroup) {
        // User is authenticated but in auth group, redirect to tabs
        router.replace('/(tabs)');
      } else if (!isAuthenticated && !inAuthGroup && segments[0] !== 'sobre') {
        // User is not authenticated and not in auth group (except sobre), redirect to login
        router.replace('/(auth)/login');
      }
    }
  }, [isAuthenticated, segments, isLoading, navigationState?.key]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: paperTheme.colors.background }}>
        <ActivityIndicator size="large" color={paperTheme.colors.primary} />
      </View>
    );
  }

  return (
    <PaperProvider theme={paperTheme}>
      <NavigationThemeProvider value={navigationTheme}>
        <Stack>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="sobre" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </NavigationThemeProvider>
    </PaperProvider>
  );
}

function AppWithTheme() {
  const { isDark } = useThemeMode();
  const paperTheme = isDark ? darkTheme : lightTheme;
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    const setupDatabase = async () => {
      try {
        await initDatabase();
        setDbReady(true);
      } catch (error) {
        console.error('[App] Erro ao inicializar banco de dados:', error);
        setDbError(error instanceof Error ? error.message : 'Erro desconhecido');
        // Continua mesmo com erro no banco (funcionalidade offline opcional)
        setDbReady(true);
      }
    };

    setupDatabase();
  }, []);

  if (!dbReady) {
    return (
      <PaperProvider theme={paperTheme}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: paperTheme.colors.background }}>
          <ActivityIndicator size="large" color={paperTheme.colors.primary} />
          <Text style={{ marginTop: 16, color: paperTheme.colors.onBackground }}>
            Inicializando...
          </Text>
        </View>
      </PaperProvider>
    );
  }

  if (dbError) {
    console.warn('[App] Banco de dados com erro, continuando sem persistência local:', dbError);
  }

  return (
    <PaperProvider theme={paperTheme}>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </PaperProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AppWithTheme />
    </ThemeProvider>
  );
}
