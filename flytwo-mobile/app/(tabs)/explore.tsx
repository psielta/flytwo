import { StyleSheet, View } from 'react-native';
import {
  Avatar,
  Badge,
  Chip,
  Divider,
  Icon,
  List,
  Text,
  useTheme,
} from 'react-native-paper';

import ParallaxScrollView from '@/components/parallax-scroll-view';

export default function ExploreScreen() {
  const theme = useTheme();

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }}
      headerImage={
        <Icon source="code-tags" size={310} color="#808080" />
      }>
      <View style={styles.titleContainer}>
        <Text variant="headlineLarge">Explore</Text>
      </View>

      <Text variant="bodyMedium" style={styles.description}>
        Explore the React Native Paper components available in this app.
      </Text>

      <List.Section>
        <List.Subheader>Accordion Components</List.Subheader>
        <List.Accordion
          title="List Accordion"
          description="Expandable list item"
          left={(props) => <List.Icon {...props} icon="folder" />}>
          <List.Item title="First Item" />
          <List.Item title="Second Item" />
          <List.Item title="Third Item" />
        </List.Accordion>
        <List.Accordion
          title="Another Section"
          left={(props) => <List.Icon {...props} icon="star" />}>
          <List.Item title="Nested Item 1" />
          <List.Item title="Nested Item 2" />
        </List.Accordion>
      </List.Section>

      <Divider style={styles.divider} />

      <Text variant="titleMedium" style={styles.sectionTitle}>
        Chip Components
      </Text>
      <View style={styles.chipContainer}>
        <Chip icon="information" onPress={() => {}}>
          Info
        </Chip>
        <Chip icon="heart" onPress={() => {}} selected>
          Selected
        </Chip>
        <Chip icon="close" onPress={() => {}} onClose={() => {}}>
          Closeable
        </Chip>
        <Chip mode="outlined" onPress={() => {}}>
          Outlined
        </Chip>
      </View>

      <Divider style={styles.divider} />

      <Text variant="titleMedium" style={styles.sectionTitle}>
        Avatar Components
      </Text>
      <View style={styles.avatarContainer}>
        <View style={styles.avatarItem}>
          <Avatar.Text size={48} label="AB" />
          <Text variant="bodySmall">Text</Text>
        </View>
        <View style={styles.avatarItem}>
          <Avatar.Icon size={48} icon="account" />
          <Text variant="bodySmall">Icon</Text>
        </View>
        <View style={styles.avatarItem}>
          <View>
            <Avatar.Icon size={48} icon="bell" />
            <Badge style={styles.badge}>3</Badge>
          </View>
          <Text variant="bodySmall">With Badge</Text>
        </View>
      </View>

      <Divider style={styles.divider} />

      <List.Section>
        <List.Subheader>List Items</List.Subheader>
        <List.Item
          title="Settings"
          description="Configure app preferences"
          left={(props) => <List.Icon {...props} icon="cog" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
        />
        <List.Item
          title="Notifications"
          description="Manage notification settings"
          left={(props) => <List.Icon {...props} icon="bell" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
        />
        <List.Item
          title="Privacy"
          description="Privacy and security options"
          left={(props) => <List.Icon {...props} icon="shield-account" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
        />
      </List.Section>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  description: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 12,
    marginTop: 8,
  },
  divider: {
    marginVertical: 16,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  avatarContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  avatarItem: {
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
});
