import { StyleSheet, View, ScrollView } from 'react-native';
import { Card, Surface, Text, useTheme, Avatar, Divider } from 'react-native-paper';
import { useAuth } from '../../src/auth/useAuth';

export default function HomeScreen() {
  const theme = useTheme();
  const { user } = useAuth();

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
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      <Text variant="headlineSmall" style={styles.greeting}>
        Ola, {user?.fullName?.split(' ')[0] || 'Usuario'}!
      </Text>

      <Card style={styles.userCard}>
        <Card.Content>
          <View style={styles.userInfo}>
            <Avatar.Text
              size={64}
              label={getInitials()}
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
          Sistema de cotacao de precos usando APIs publicas do governo.
          Use o menu lateral para acessar configuracoes e informacoes do app.
        </Text>
      </Surface>

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
            <Text variant="bodyMedium">• Tema claro/escuro</Text>
          </View>
          <View style={styles.featureItem}>
            <Text variant="bodyMedium">• Validacao de formularios</Text>
          </View>
        </View>
      </Surface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  greeting: {
    marginBottom: 16,
    fontWeight: '600',
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
});
