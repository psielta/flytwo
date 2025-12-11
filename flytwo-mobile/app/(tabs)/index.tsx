import { StyleSheet, View, ScrollView } from 'react-native';
import { Button, Card, Surface, Text, useTheme, Avatar, Divider } from 'react-native-paper';
import { useAuth } from '../../src/auth/useAuth';
import { Logo } from '../../src/components/Logo';

export default function HomeScreen() {
  const theme = useTheme();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.header}>
        <Logo size={48} color={theme.colors.primary} />
        <Text variant="headlineLarge" style={styles.title}>
          FlyTwo
        </Text>
      </View>

      <Card style={styles.userCard}>
        <Card.Content>
          <View style={styles.userInfo}>
            <Avatar.Text
              size={64}
              label={user?.fullName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
              style={{ backgroundColor: theme.colors.primary }}
            />
            <View style={styles.userDetails}>
              <Text variant="titleLarge">
                {user?.fullName || 'Usuario'}
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {user?.email}
              </Text>
              {user?.roles && user.roles.length > 0 && (
                <Text variant="bodySmall" style={{ color: theme.colors.primary, marginTop: 4 }}>
                  {user.roles.join(', ')}
                </Text>
              )}
            </View>
          </View>
        </Card.Content>
      </Card>

      <Surface style={styles.surface} elevation={1}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Bem-vindo ao FlyTwo Mobile!
        </Text>
        <Text variant="bodyMedium">
          Voce esta logado com sucesso. Este app utiliza React Native Paper com Material Design 3
          para uma experiencia moderna e consistente.
        </Text>
      </Surface>

      <Divider style={styles.divider} />

      <Surface style={styles.surface} elevation={1}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Funcionalidades
        </Text>
        <View style={styles.featureList}>
          <View style={styles.featureItem}>
            <Text variant="bodyMedium">• Autenticacao segura com JWT</Text>
          </View>
          <View style={styles.featureItem}>
            <Text variant="bodyMedium">• Persistencia de sessao</Text>
          </View>
          <View style={styles.featureItem}>
            <Text variant="bodyMedium">• Tema claro/escuro automatico</Text>
          </View>
          <View style={styles.featureItem}>
            <Text variant="bodyMedium">• Validacao de formularios com Yup</Text>
          </View>
        </View>
      </Surface>

      <Button
        mode="outlined"
        onPress={handleLogout}
        style={styles.logoutButton}
        icon="logout"
      >
        Sair da conta
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingTop: 48,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  title: {
    fontWeight: '700',
  },
  userCard: {
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  userDetails: {
    flex: 1,
  },
  surface: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  featureList: {
    gap: 4,
  },
  featureItem: {
    paddingVertical: 2,
  },
  divider: {
    marginVertical: 8,
  },
  logoutButton: {
    marginTop: 8,
  },
});
