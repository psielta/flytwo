import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Avatar, IconButton, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../auth/useAuth';
import { useThemeMode } from '../theme/ThemeContext';
import { Logo } from './Logo';

interface AppHeaderProps {
  onAvatarPress: () => void;
}

export function AppHeader({ onAvatarPress }: AppHeaderProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { isDark, toggleTheme } = useThemeMode();

  const getInitials = () => {
    if (user?.fullName) {
      const names = user.fullName.split(' ');
      if (names.length >= 2) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
      }
      return user.fullName[0].toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  };

  return (
    <View
      style={[
        styles.header,
        {
          paddingTop: insets.top + 8,
          backgroundColor: theme.colors.surface,
          borderBottomColor: theme.colors.outlineVariant,
        },
      ]}
    >
      <View style={styles.logoContainer}>
        <Logo size={32} color={theme.colors.primary} />
      </View>

      <View style={styles.actions}>
        <IconButton
          icon={isDark ? 'weather-sunny' : 'weather-night'}
          iconColor={theme.colors.onSurface}
          size={24}
          onPress={toggleTheme}
        />
        <TouchableOpacity onPress={onAvatarPress}>
          <Avatar.Text
            size={40}
            label={getInitials()}
            style={{ backgroundColor: theme.colors.primary }}
            labelStyle={{ fontSize: 16 }}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
