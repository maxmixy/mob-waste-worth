import { Image } from 'expo-image';
import { Platform, StyleSheet, View, Pressable, Modal, TouchableOpacity, TextInput } from 'react-native';
import { useState } from 'react';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';

import { HelloWave } from '@/components/HelloWave';
import { ScrollView as RNScrollView } from 'react-native';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { Colors } from '@/constants/Colors';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';

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

        {/* Share Post Container */}
        <ThemedView style={[styles.shareContainer, { flexDirection: 'row', alignItems: 'center' }]}>
          <View style={styles.shareProfileImageContainer}>
            <Image
              source={require('@/assets/images/partial-react-logo.png')}
              style={styles.shareProfileImage}
              resizeMode="cover"
            />
          </View>
          <ThemedText style={styles.shareProfileName}>John Doe</ThemedText>
          <TextInput
            style={styles.shareInput}
            placeholder="What would you like to share?"
            placeholderTextColor="#888"
          />
        </ThemedView>
        {/* Share Options Row (Action Buttons at the bottom of the share container) */}
        <View style={styles.shareActionsRow}>
          <TouchableOpacity style={styles.shareActionButton}>
            <ThemedText style={styles.shareActionLabel}> <MaterialIcons name="image" size={24} color="#4285F4" /> Photos</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareActionButton}>
            <ThemedText style={styles.shareActionLabel}> <FontAwesome5 name="link" size={22} color="#4caf50" /> Links</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareActionButton}>
            <ThemedText style={styles.shareActionLabel}> <Ionicons name="camera" size={24} color="#fbc02d" /> Camera</ThemedText>
          </TouchableOpacity>
        </View>
        {/* Post Template Container */}
        <ThemedView style={styles.postContainer}>
          {/* Top Portion */}
          <View style={styles.postTopRow}>
            <Image
              source={require('@/assets/images/partial-react-logo.png')}
              style={styles.postProfileImage}
              resizeMode="cover"
            />
            <View style={{ marginLeft: 10 }}>
              <ThemedText style={styles.postUserName}>Jane Doe</ThemedText>
              <ThemedText style={styles.postUserTitle}>Eco Warrior</ThemedText>
              <ThemedText style={styles.postTime}>2h ago</ThemedText>
            </View>
          </View>
          {/* Mid Portion */}
          <ThemedText style={styles.postCaption}>
            Just finished an upcycling project! Turned old bottles into planters 🌱
          </ThemedText>
          <Image
            source={require('@/assets/images/partial-react-logo.png')}
            style={styles.postImage}
            resizeMode="cover"
          />
          {/* Lower Part: Reactions */}
          <View style={styles.postActionsRow}>
            <TouchableOpacity style={styles.postActionButton}>
              <Ionicons name="heart-outline" size={22} color="#e53935" />
              <ThemedText style={styles.postActionText}>React</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.postActionButton}>
              <Ionicons name="chatbubble-outline" size={22} color="#4285F4" />
              <ThemedText style={styles.postActionText}>Comment</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.postActionButton}>
              <Ionicons name="share-social-outline" size={22} color="#4caf50" />
              <ThemedText style={styles.postActionText}>Share</ThemedText>
            </TouchableOpacity>
          </View>
          {/* Bottom Part: Comments */}
          <View style={styles.commentsContainer}>
            <View style={styles.commentRow}>
              <Image
                source={require('@/assets/images/partial-react-logo.png')}
                style={styles.commentProfileImage}
                resizeMode="cover"
              />
              <View style={{ marginLeft: 8 }}>
                <ThemedText style={styles.commentUserName}>Alex Green</ThemedText>
                <ThemedText style={styles.commentContent}>Awesome idea! 🌿</ThemedText>
              </View>
            </View>
            <View style={styles.commentRow}>
              <Image
                source={require('@/assets/images/partial-react-logo.png')}
                style={styles.commentProfileImage}
                resizeMode="cover"
              />
              <View style={{ marginLeft: 8 }}>
                <ThemedText style={styles.commentUserName}>Sam Blue</ThemedText>
                <ThemedText style={styles.commentContent}>Love this project!</ThemedText>
              </View>
            </View>
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
    fontWeight: 'bold',
  },
  shareContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 12,
    marginBottom: 0,
  },
  shareProfileImageContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  shareProfileImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  shareProfileName: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
    color: '#222',
  },
  shareInput: {
    flex: 1,
    fontSize: 16,
    color: '#222',
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
    marginHorizontal: 8,
  },
  shareActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 18,
    gap: 8,
    paddingHorizontal: 4,
  },
  shareActionButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 10,
    marginHorizontal: 2,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  shareActionLabel: {
    marginTop: 4,
    color: '#4285F4',
    fontWeight: '600',
    fontSize: 15,
  },
  postContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  postTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  postProfileImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  postUserName: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  postUserTitle: {
    fontSize: 13,
    color: '#4caf50',
    fontWeight: '500',
  },
  postTime: {
    fontSize: 12,
    color: '#888',
  },
  postCaption: {
    fontSize: 15,
    marginBottom: 10,
    color: '#222',
  },
  postImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#eee',
  },
  postActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 2,
  },
  postActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginRight: 8,
  },
  postActionText: {
    marginLeft: 6,
    fontSize: 15,
    color: '#555',
  },
  commentsContainer: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  commentProfileImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
  },
  commentUserName: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 2,
  },
  commentContent: {
    fontSize: 14,
    color: '#333',
  },
});
