import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { Button, Card, FAB, Surface, Text, useTheme } from 'react-native-paper';

import ParallaxScrollView from '@/components/parallax-scroll-view';

export default function HomeScreen() {
  const theme = useTheme();

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
      <View style={styles.titleContainer}>
        <Text variant="headlineLarge">Welcome!</Text>
        <Text variant="headlineLarge">👋</Text>
      </View>

      <Surface style={styles.surface} elevation={1}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          React Native Paper Demo
        </Text>
        <Text variant="bodyMedium">
          This app now uses React Native Paper for all UI components. The Material Design 3 theme is
          applied throughout the app.
        </Text>
      </Surface>

      <Card style={styles.card}>
        <Card.Title title="Card Component" subtitle="Material Design 3" />
        <Card.Content>
          <Text variant="bodyMedium">
            Cards are versatile containers for displaying related content and actions.
          </Text>
        </Card.Content>
        <Card.Actions>
          <Button onPress={() => {}}>Cancel</Button>
          <Button mode="contained" onPress={() => {}}>
            OK
          </Button>
        </Card.Actions>
      </Card>

      <View style={styles.buttonContainer}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Button Variants
        </Text>
        <Button mode="contained" style={styles.button} onPress={() => {}}>
          Contained
        </Button>
        <Button mode="outlined" style={styles.button} onPress={() => {}}>
          Outlined
        </Button>
        <Button mode="text" style={styles.button} onPress={() => {}}>
          Text Button
        </Button>
        <Button mode="elevated" style={styles.button} onPress={() => {}}>
          Elevated
        </Button>
        <Button mode="contained-tonal" style={styles.button} onPress={() => {}}>
          Tonal
        </Button>
      </View>

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primaryContainer }]}
        onPress={() => {}}
        label="Action"
      />
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  surface: {
    padding: 16,
    borderRadius: 12,
  },
  card: {
    marginVertical: 8,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  buttonContainer: {
    gap: 8,
  },
  button: {
    marginVertical: 4,
  },
  fab: {
    marginTop: 16,
    alignSelf: 'center',
  },
});
