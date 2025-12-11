import { useState } from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { Icon, useTheme } from 'react-native-paper';
import { AppHeader } from '../../src/components/AppHeader';
import { AppDrawer } from '../../src/components/AppDrawer';

export default function TabLayout() {
  const theme = useTheme();
  const [drawerVisible, setDrawerVisible] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <AppHeader onAvatarPress={() => setDrawerVisible(true)} />
      <AppDrawer
        visible={drawerVisible}
        onDismiss={() => setDrawerVisible(false)}
      />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
          headerShown: false,
          tabBarStyle: {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.outlineVariant,
          },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => <Icon source="home" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: 'Explore',
            tabBarIcon: ({ color, size }) => <Icon source="compass" size={size} color={color} />,
          }}
        />
      </Tabs>
    </View>
  );
}
