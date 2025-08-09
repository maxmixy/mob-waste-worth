import { Image } from 'expo-image';
import { Platform, StyleSheet, View, Pressable, Modal, TouchableOpacity } from 'react-native';
import { useState } from 'react';

import { HelloWave } from '@/components/HelloWave';
import { ScrollView as RNScrollView } from 'react-native';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { Colors } from '@/constants/Colors';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const [sidebarVisible, setSidebarVisible] = useState(false);

  return (
    <>
      <RNScrollView
        style={{ flex: 1, padding: 16, backgroundColor: Colors[colorScheme].background }}
        contentContainerStyle={{ flexGrow: 1 }}
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
        <ThemedText type="subtitle" style={styles.recentScansTitle}>Recent Scans</ThemedText>
        {/* Example Recent Scan Card */}
        <View style={styles.scanCard}>
          <View style={styles.scanCardTop}>
            <Image
              source={require('@/assets/images/partial-react-logo.png')}
              style={styles.scanCardImage}
              resizeMode="cover"
            />
            <View style={styles.scanCardInfo}>
              <ThemedText style={styles.scanCardMaterial}>Plastic Bottle</ThemedText>
              <ThemedText style={styles.scanCardQuality}>Quality: Good</ThemedText>
            </View>
          </View>
          <View style={styles.scanCardBottom}>
            <ThemedText style={styles.scanCardProjectsTitle}>Possible Projects:</ThemedText>
            <View style={styles.scanCardProjectsRow}>
              <View style={styles.scanCardProject}>
                <Image
                  source={require('@/assets/images/partial-react-logo.png')}
                  style={styles.scanCardProjectImage}
                  resizeMode="contain"
                />
                <ThemedText style={styles.scanCardProjectName}>Bottle Planter</ThemedText>
              </View>
              <View style={styles.scanCardProject}>
                <Image
                  source={require('@/assets/images/partial-react-logo.png')}
                  style={styles.scanCardProjectImage}
                  resizeMode="contain"
                />
                <ThemedText style={styles.scanCardProjectName}>Bird Feeder</ThemedText>
              </View>
            </View>
          </View>
        </View>
      </RNScrollView>
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
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    marginBottom: 8,
  },
  userImage: {
    width: '100%',
    height: '100%',
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
  },
  recentScansTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    marginTop: 0,
    color: '#222',
  },
  scanCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  scanCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  scanCardImage: {
    width: 56,
    height: 56,
    borderRadius: 10,
    marginRight: 14,
    backgroundColor: '#eee',
  },
  scanCardInfo: {
    flex: 1,
  },
  scanCardMaterial: {
    fontSize: 17,
    fontWeight: '600',
    color: '#222',
  },
  scanCardQuality: {
    fontSize: 14,
    color: '#4caf50',
    fontWeight: '500',
    marginTop: 2,
  },
  scanCardBottom: {
    marginTop: 8,
  },
  scanCardProjectsTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
    color: '#555',
  },
  scanCardProjectsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  scanCardProject: {
    alignItems: 'center',
    marginRight: 16,
  },
  scanCardProjectImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginBottom: 4,
    backgroundColor: '#eee',
  },
  scanCardProjectName: {
    fontSize: 13,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
  },
});
