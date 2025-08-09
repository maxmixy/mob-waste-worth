import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { Pressable } from 'react-native';
import { useState } from 'react';
import { Modal, TouchableOpacity } from 'react-native';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ScrollView as RNScrollView } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const [sidebarVisible, setSidebarVisible] = useState(false);

  return (
    <>
      <View
        style={{ flex: 1, padding: 16, backgroundColor: Colors[colorScheme].background }}
      >
        <View style={styles.headerRow}>
          <ThemedView style={styles.titleContainer}>
            <ThemedText type="title">Waste to Worth</ThemedText>
          </ThemedView>
          <Pressable
            style={styles.settingsButton}
            onPress={() => setSidebarVisible(true)}
            accessibilityLabel="Settings"
          >
            <MaterialIcons name="settings" size={24} color={Colors[colorScheme].icon} />
          </Pressable>
        </View>
        <View style={styles.sectionsContainer}>
          {/* Materials Section (Top) */}
          <ThemedView
            style={[styles.section, { flex: 1, borderTopLeftRadius: 12, borderTopRightRadius: 12 }]}
            lightColor={Colors.light.background}
            darkColor={Colors.dark.background}
          >
            <ThemedText type="subtitle">Materials</ThemedText>
            {/* Horizontal Scrollable Material Cards */}
            <RNScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardRow}>
              <View style={styles.card}>
                <Image
                  source={require('@/assets/images/partial-react-logo.png')}
                  style={styles.cardImage}
                  resizeMode="contain"
                />
                <ThemedText type="defaultSemiBold" style={styles.cardTitle}>Plastic Bottle</ThemedText>
                <ThemedText style={styles.cardDescription}>
                  A recyclable plastic bottle, suitable for upcycling projects or recycling. A recyclable plastic bottle, suitable for upcycling projects or recycling. 
                </ThemedText>
              </View>
              <View style={styles.card}>
                <Image
                  source={require('@/assets/images/partial-react-logo.png')}
                  style={styles.cardImage}
                  resizeMode="contain"
                />
                <ThemedText type="defaultSemiBold" style={styles.cardTitle}>Plastic Bottle</ThemedText>
                <ThemedText style={styles.cardDescription}>
                  A recyclable plastic bottle, suitable for upcycling projects or recycling. A recyclable plastic bottle, suitable for upcycling projects or recycling. 
                </ThemedText>
              </View>
              <View style={styles.card}>
                <Image
                  source={require('@/assets/images/partial-react-logo.png')}
                  style={styles.cardImage}
                  resizeMode="contain"
                />
                <ThemedText type="defaultSemiBold" style={styles.cardTitle}>Plastic Bottle</ThemedText>
                <ThemedText style={styles.cardDescription}>
                  A recyclable plastic bottle, suitable for upcycling projects or recycling. A recyclable plastic bottle, suitable for upcycling projects or recycling. 
                </ThemedText>
              </View>
              <View style={styles.card}>
                <Image
                  source={require('@/assets/images/partial-react-logo.png')}
                  style={styles.cardImage}
                  resizeMode="contain"
                />
                <ThemedText type="defaultSemiBold" style={styles.cardTitle}>Plastic Bottle</ThemedText>
                <ThemedText style={styles.cardDescription}>
                  A recyclable plastic bottle, suitable for upcycling projects or recycling.
                </ThemedText>
              </View>
              <View style={styles.card}>
                <Image
                  source={require('@/assets/images/partial-react-logo.png')}
                  style={styles.cardImage}
                  resizeMode="contain"
                />
                <ThemedText type="defaultSemiBold" style={styles.cardTitle}>Glass Jar</ThemedText>
                <ThemedText style={styles.cardDescription}>
                  A reusable glass jar, perfect for storage or crafts.
                </ThemedText>
              </View>
              {/* Add more material cards here */}
            </RNScrollView>
          </ThemedView>
          {/* Divider Line */}
          <View style={styles.divider} />
          {/* Projects Section (Bottom) */}
          <ThemedView
            style={[styles.section, { flex: 1, borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }]}
            lightColor={Colors.light.background}
            darkColor={Colors.dark.background}
          >
            <ThemedText type="subtitle">Projects</ThemedText>
            {/* Horizontal Scrollable Project Cards */}
            <RNScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardRow}>
              <View style={styles.card}>
                <Image
                  source={require('@/assets/images/partial-react-logo.png')}
                  style={styles.cardImage}
                  resizeMode="contain"
                />
                <ThemedText type="defaultSemiBold" style={styles.cardTitle}>Bottle Planter</ThemedText>
                <ThemedText style={styles.cardDescription}>
                  An upcycling project turning a plastic bottle into a decorative planter.
                </ThemedText>
              </View>
              <View style={styles.card}>
                <Image
                  source={require('@/assets/images/partial-react-logo.png')}
                  style={styles.cardImage}
                  resizeMode="contain"
                />
                <ThemedText type="defaultSemiBold" style={styles.cardTitle}>Jar Lantern</ThemedText>
                <ThemedText style={styles.cardDescription}>
                  Create a lantern from a glass jar for home decor.
                </ThemedText>
              </View>
              <View style={styles.card}>
                <Image
                  source={require('@/assets/images/partial-react-logo.png')}
                  style={styles.cardImage}
                  resizeMode="contain"
                />
                <ThemedText type="defaultSemiBold" style={styles.cardTitle}>Jar Lantern</ThemedText>
                <ThemedText style={styles.cardDescription}>
                  Create a lantern from a glass jar for home decor.
                </ThemedText>
              </View>
              {/* Add more project cards here */}
            </RNScrollView>
          </ThemedView>
        </View>
      </View>
      {/* Sidebar Modal */}
      <Modal
        visible={sidebarVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setSidebarVisible(false)}
      >
        <TouchableOpacity style={styles.sidebarOverlay} activeOpacity={1} onPress={() => setSidebarVisible(false)} />
        <View style={styles.sidebarContainer}>
          {/* User Profile at the top of sidebar */}
          <View style={styles.sidebarProfile}>
            <View style={styles.userImageContainer}>
              <Image
                source={require('@/assets/images/partial-react-logo.png')}
                style={styles.userImage}
                resizeMode="cover"
              />
            </View>
            <ThemedText style={styles.userName}>John Doe</ThemedText>
          </View>
          {/* Add more sidebar content here */}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    marginTop: 50,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  sectionsContainer: {
    flex: 1,
    flexDirection: 'column',
    minHeight: 0,
  },
  section: {
    padding: 16,
    justifyContent: 'flex-start',
  },
  divider: {
    height: 1,
    backgroundColor: '#ccc',
    marginVertical: 0,
    width: '100%',
    alignSelf: 'center',
  },
  cardRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 8,
  },
  card: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    width: 160,
    marginRight: 8,
  },
  cardImage: {
    width: 80,
    height: 80,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    textAlign: 'center',
    color: '#555',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  settingsButton: {
    padding: 8,
  },
  sidebarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 100,
  },
  sidebarContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 280,
    height: '100%',
    backgroundColor: '#fff',
    paddingTop: 48,
    paddingHorizontal: 20,
    zIndex: 101,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  sidebarProfile: {
    alignItems: 'center',
    marginBottom: 32,
  },
  userImageContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    marginBottom: 8,
  },
  userImage: {
    width: '100%',
    height: '100%',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
});