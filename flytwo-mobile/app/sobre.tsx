import { View, StyleSheet, ScrollView, Linking } from 'react-native';
import {
  Surface,
  Text,
  Button,
  Divider,
  List,
  Chip,
  useTheme,
  IconButton,
} from 'react-native-paper';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Logo } from '../src/components/Logo';

const APP_VERSION = '1.0.0';
const API_URL = 'http://10.0.2.2:5110';

export default function SobreScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const openGitHub = () => {
    Linking.openURL('https://github.com/psielta/flytwo');
  };

  const openLinkedIn = () => {
    Linking.openURL('https://www.linkedin.com/in/mateus-salgueiro-525717205/');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
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
        <IconButton
          icon="arrow-left"
          size={24}
          onPress={() => router.back()}
        />
        <Text variant="titleLarge" style={styles.headerTitle}>
          Sobre
        </Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Logo and App Name */}
        <Surface style={styles.logoSection} elevation={1}>
          <Logo size={80} color={theme.colors.primary} />
          <Text variant="headlineLarge" style={styles.appName}>
            FlyTwo
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Sistema de Cotacao de Precos
          </Text>
          <View style={styles.versionContainer}>
            <Chip icon="tag" compact>
              v{APP_VERSION}
            </Chip>
          </View>
        </Surface>

        {/* About */}
        <Surface style={styles.section} elevation={1}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Sobre o Projeto
          </Text>
          <Text variant="bodyMedium" style={styles.description}>
            FlyTwo e um sistema full-stack desenvolvido para cotacao de precos usando APIs
            publicas do governo (PNCP - Portal Nacional de Contratacoes Publicas).
          </Text>
          <Text variant="bodyMedium" style={[styles.description, { marginTop: 8 }]}>
            O objetivo e fornecer uma plataforma para consultar precos de referencia,
            comparar valores entre diferentes fontes e gerar relatorios de cotacao.
          </Text>
        </Surface>

        {/* Technologies */}
        <Surface style={styles.section} elevation={1}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Tecnologias
          </Text>

          <Text variant="labelLarge" style={styles.techCategory}>
            Mobile
          </Text>
          <View style={styles.chipContainer}>
            <Chip compact>React Native</Chip>
            <Chip compact>Expo</Chip>
            <Chip compact>TypeScript</Chip>
            <Chip compact>Paper MD3</Chip>
          </View>

          <Text variant="labelLarge" style={[styles.techCategory, { marginTop: 12 }]}>
            Backend
          </Text>
          <View style={styles.chipContainer}>
            <Chip compact>.NET 8</Chip>
            <Chip compact>PostgreSQL</Chip>
            <Chip compact>Redis</Chip>
            <Chip compact>JWT</Chip>
          </View>

          <Text variant="labelLarge" style={[styles.techCategory, { marginTop: 12 }]}>
            Frontend Web
          </Text>
          <View style={styles.chipContainer}>
            <Chip compact>React 19</Chip>
            <Chip compact>Vite</Chip>
            <Chip compact>Material UI</Chip>
            <Chip compact>NSwag</Chip>
          </View>
        </Surface>

        {/* API Info */}
        <Surface style={styles.section} elevation={1}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Configuracao
          </Text>
          <List.Item
            title="Web API"
            description={API_URL}
            left={(props) => <List.Icon {...props} icon="server" />}
            descriptionStyle={{ fontFamily: 'monospace' }}
          />
          <List.Item
            title="Versao do App"
            description={APP_VERSION}
            left={(props) => <List.Icon {...props} icon="cellphone" />}
          />
        </Surface>

        {/* Author */}
        <Surface style={styles.section} elevation={1}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Desenvolvedor
          </Text>
          <List.Item
            title="Mateus Salgueiro"
            description="Full-Stack Developer"
            left={(props) => <List.Icon {...props} icon="account" />}
          />
          <Divider style={{ marginVertical: 8 }} />
          <View style={styles.socialButtons}>
            <Button
              mode="outlined"
              icon="github"
              onPress={openGitHub}
              compact
            >
              GitHub
            </Button>
            <Button
              mode="outlined"
              icon="linkedin"
              onPress={openLinkedIn}
              compact
            >
              LinkedIn
            </Button>
          </View>
        </Surface>

        {/* Footer */}
        <View style={styles.footer}>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Desenvolvido como parte do portfolio de desenvolvimento full-stack .NET + React
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontWeight: '600',
  },
  content: {
    padding: 16,
    gap: 16,
  },
  logoSection: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
  },
  appName: {
    fontWeight: '700',
    marginTop: 12,
  },
  versionContainer: {
    marginTop: 12,
  },
  section: {
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: '600',
  },
  description: {
    lineHeight: 22,
  },
  techCategory: {
    marginBottom: 8,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  socialButtons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
});
