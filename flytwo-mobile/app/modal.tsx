import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Button, Surface, Text, useTheme } from 'react-native-paper';

export default function ModalScreen() {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Surface style={styles.surface} elevation={2}>
        <Text variant="headlineMedium" style={styles.title}>
          Modal Screen
        </Text>
        <Text variant="bodyMedium" style={styles.description}>
          This is a modal screen using React Native Paper components.
        </Text>
        <Link href="/" dismissTo asChild>
          <Button mode="contained" style={styles.button}>
            Go to Home
          </Button>
        </Link>
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  surface: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  title: {
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    marginBottom: 24,
    textAlign: 'center',
  },
  button: {
    marginTop: 8,
  },
});
