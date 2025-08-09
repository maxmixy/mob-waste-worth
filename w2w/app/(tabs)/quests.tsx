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

        {/* User Info Container */}
        <ThemedView style={styles.userInfoContainer}>
          <View style={styles.userImageContainer}>
            <Image
              source={require('@/assets/images/partial-react-logo.png')}
              style={styles.userImage}
              resizeMode="cover"
            />
          </View>
          <ThemedText style={styles.userName}>John Doe</ThemedText>
        </ThemedView>

        {/* Classification & Progress Container */}
        <ThemedView style={styles.classificationContainer}>
          <ThemedText style={styles.classificationTitle}>Eco Warrior</ThemedText>
          <View style={styles.progressBarBackground}>
            <View style={[styles.progressBarFill, { width: '60%' }]} />
          </View>
        </ThemedView>

        {/* Quests Container */}
        <ThemedView style={styles.questsContainer}>
          <ThemedText type="subtitle" style={{ marginBottom: 12 }}>Quests</ThemedText>
          {/* Example quests, replace with dynamic data as needed */}
          <View style={styles.questCard}>
            <ThemedText style={styles.questTitle}>Recycle 5 Plastic Bottles</ThemedText>
            <ThemedText style={styles.questDescription}>Collect and recycle 5 plastic bottles at your nearest recycling center.</ThemedText>
            <ThemedText style={styles.questPoints}>+50 pts</ThemedText>
          </View>
          <View style={styles.questCard}>
            <ThemedText style={styles.questTitle}>Upcycle a Glass Jar</ThemedText>
            <ThemedText style={styles.questDescription}>Turn a used glass jar into a useful household item.</ThemedText>
            <ThemedText style={styles.questPoints}>+30 pts</ThemedText>
          </View>
          <View style={styles.questCard}>
            <ThemedText style={styles.questTitle}>Share a Recycling Tip</ThemedText>
            <ThemedText style={styles.questDescription}>Post a recycling tip in the community section.</ThemedText>
            <ThemedText style={styles.questPoints}>+20 pts</ThemedText>
          </View>
        </ThemedView>
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
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  userImageContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  classificationContainer: {
    marginBottom: 24,
  },
  classificationTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  progressBarBackground: {
    width: '100%',
    height: 14,
    backgroundColor: '#e0e0e0',
    borderRadius: 7,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4caf50',
    borderRadius: 7,
  },
  questsContainer: {
    marginTop: 8,
    marginBottom: 24,
  },
  questCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  questTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  questDescription: {
    fontSize: 14,
    color: '#555',
    marginBottom: 6,
  },
  questPoints: {
    fontSize: 14,
    color: '#388e3c',
    fontWeight: 'bold',
    alignSelf: 'flex-end',
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
});
