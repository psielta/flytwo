import { View, StyleSheet, Modal, Pressable } from 'react-native';
import {
  Surface,
  Text,
  Avatar,
  Divider,
  List,
  useTheme,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '../auth/useAuth';

interface AppDrawerProps {
  visible: boolean;
  onDismiss: () => void;
}

export function AppDrawer({ visible, onDismiss }: AppDrawerProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

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

  const handleLogout = async () => {
    onDismiss();
    await logout();
  };

  const handleAbout = () => {
    onDismiss();
    router.push('/sobre');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onDismiss} />
        <Surface
          style={[
            styles.drawer,
            {
              paddingTop: insets.top,
              paddingBottom: insets.bottom,
              backgroundColor: theme.colors.surface,
            },
          ]}
          elevation={4}
        >
          {/* User Info Header */}
          <View style={styles.userSection}>
            <Avatar.Text
              size={64}
              label={getInitials()}
              style={{ backgroundColor: theme.colors.primary }}
            />
            <View style={styles.userInfo}>
              <Text variant="titleMedium" numberOfLines={1}>
                {user?.fullName || 'Usuario'}
              </Text>
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant }}
                numberOfLines={1}
              >
                {user?.email}
              </Text>
            </View>
          </View>

          <Divider style={styles.divider} />

          {/* Menu Items */}
          <View style={styles.menuSection}>
            <List.Item
              title="Sobre"
              description="Informacoes do aplicativo"
              left={(props) => <List.Icon {...props} icon="information-outline" />}
              onPress={handleAbout}
              style={styles.menuItem}
            />
          </View>

          <View style={styles.spacer} />

          <Divider style={styles.divider} />

          {/* Logout */}
          <List.Item
            title="Sair"
            description="Encerrar sessao"
            left={(props) => (
              <List.Icon {...props} icon="logout" color={theme.colors.error} />
            )}
            onPress={handleLogout}
            titleStyle={{ color: theme.colors.error }}
            style={styles.menuItem}
          />
        </Surface>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawer: {
    width: 300,
    height: '100%',
  },
  userSection: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  userInfo: {
    flex: 1,
  },
  divider: {
    marginVertical: 8,
  },
  menuSection: {
    paddingVertical: 8,
  },
  menuItem: {
    paddingHorizontal: 8,
  },
  spacer: {
    flex: 1,
  },
});
