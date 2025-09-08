import { Image } from 'expo-image';
import { Platform, StyleSheet, View, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { ScrollView as RNScrollView, ScrollView } from 'react-native';
import { Colors } from '@/constants/Colors';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { usePalette } from '@/hooks/usePalette';
import { getUserId, checkProfileCompletion } from '@/lib/user';
import { ImageService } from '@/lib/imageService';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import SettingsSidebar from '@/components/SettingsSidebar';
import { Radii, Spacing, Shadows } from '@/constants/DesignTokens';

const API_BASE_URL = 'http://127.0.0.1:5000';

interface Quest {
  id: string;
  title: string;
  description: string;
  points: number;
  type: string;
  target_count: number;
  current_progress: number;
  is_completed: boolean;
  icon: string;
  category: string;
  difficulty_level: string;
  is_repeatable: boolean;
}

interface UserStats {
  totalPoints: number;
  level: string;
  levelProgress: number;
  completedQuests: number;
  totalQuests: number;
}

export default function QuestsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const P = usePalette();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [userStats, setUserStats] = useState<UserStats>({
    totalPoints: 0,
    level: 'Eco Beginner',
    levelProgress: 0,
    completedQuests: 0,
    totalQuests: 0
  });
  const [quests, setQuests] = useState<Quest[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Fetch quests from backend API
  const fetchQuests = async (): Promise<Quest[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/quests`);
      const data = await response.json();
      
      if (data.success) {
        return data.quests.map((quest: any) => ({
          id: quest.id,
          title: quest.title,
          description: quest.description,
          points: quest.points,
          type: quest.type,
          target_count: quest.target_count,
          current_progress: 0, // Will be updated with user progress
          is_completed: false, // Will be updated with user progress
          icon: quest.icon,
          category: quest.category,
          difficulty_level: quest.difficulty_level,
          is_repeatable: quest.is_repeatable
        }));
      }
      return [];
    } catch (error) {
      console.error('Error fetching quests:', error);
      return [];
    }
  };

  // Fetch user's quest progress
  const fetchUserProgress = async (userId: string): Promise<any[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/user/${userId}/quests/progress`);
      const data = await response.json();
      
      if (data.success) {
        return data.progress;
      }
      return [];
    } catch (error) {
      console.error('Error fetching user progress:', error);
      return [];
    }
  };

  // Fetch user's quest statistics
  const fetchUserStats = async (userId: string): Promise<UserStats> => {
    try {
      const response = await fetch(`${API_BASE_URL}/user/${userId}/quests/stats`);
      const data = await response.json();
      
      if (data.success) {
        return {
          totalPoints: data.stats.total_points,
          level: data.stats.level,
          levelProgress: data.stats.level_progress,
          completedQuests: data.stats.completed_quests,
          totalQuests: data.stats.total_quests
        };
      }
      return {
        totalPoints: 0,
        level: 'Eco Beginner',
        levelProgress: 0,
        completedQuests: 0,
        totalQuests: 0
      };
    } catch (error) {
      console.error('Error fetching user stats:', error);
      return {
        totalPoints: 0,
        level: 'Eco Beginner',
        levelProgress: 0,
        completedQuests: 0,
        totalQuests: 0
      };
    }
  };

  // Load profile image from web server
  const loadProfileImage = async (userId: string) => {
    try {
      console.log('🖼️ Loading profile image for user:', userId);
      const imageResponse = await ImageService.getProfileImage(userId);
      console.log('🖼️ Image response:', imageResponse);
      
      if (imageResponse.success && imageResponse.hasImage && imageResponse.imageUrl) {
        console.log('🖼️ Setting profile image URL:', imageResponse.imageUrl);
        setProfileImageUrl(imageResponse.imageUrl);
      } else {
        console.log('🖼️ No profile image found or error:', imageResponse.error || imageResponse.message);
        setProfileImageUrl(null);
      }
    } catch (error) {
      console.error('🖼️ Error loading profile image:', error);
      setProfileImageUrl(null);
    }
  };

  const categories = [
    { id: 'all', name: 'All', icon: 'apps' },
    { id: 'scanning', name: 'Scanning', icon: 'camera-alt' },
    { id: 'community', name: 'Community', icon: 'people' },
    { id: 'recycling', name: 'Recycling', icon: 'recycling' },
    { id: 'upcycling', name: 'Upcycling', icon: 'build' },
    { id: 'profile', name: 'Profile', icon: 'person' }
  ];

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const userId = await getUserId();
      
      if (userId) {
        // Load user profile
        const profileInfo = await checkProfileCompletion(userId);
        if (profileInfo.profileCompleted && profileInfo.profileData) {
          setUserProfile(profileInfo.profileData);
        }

        // Fetch quests, user progress, and profile image in parallel
        const [questsData, userProgress, userStatsData] = await Promise.all([
          fetchQuests(),
          fetchUserProgress(userId),
          fetchUserStats(userId)
        ]);

        // Load profile image
        await loadProfileImage(userId);

        // Merge quests with user progress
        const questsWithProgress = questsData.map(quest => {
          const progress = userProgress.find(p => p.quest_id === quest.id);
          if (progress) {
            return {
              ...quest,
              current_progress: progress.current_progress,
              is_completed: progress.is_completed
            };
          }
          return quest;
        });

        setQuests(questsWithProgress);
        setUserStats(userStatsData);
      } else {
        // If no user ID, just load quests without progress
        const questsData = await fetchQuests();
        setQuests(questsData);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      Alert.alert('Error', 'Failed to load quest data');
    } finally {
      setLoading(false);
    }
  };

  const getLevelFromPoints = (points: number): string => {
    if (points < 100) return 'Eco Beginner';
    if (points < 300) return 'Eco Explorer';
    if (points < 600) return 'Eco Warrior';
    if (points < 1000) return 'Eco Champion';
    if (points < 1500) return 'Eco Master';
    return 'Eco Legend';
  };

  const getFilteredQuests = () => {
    if (selectedCategory === 'all') return quests;
    return quests.filter(quest => quest.category === selectedCategory);
  };

  const handleQuestPress = (quest: Quest) => {
    if (quest.is_completed) {
      Alert.alert('Quest Completed!', `You've already completed "${quest.title}" and earned ${quest.points} points!`);
    } else {
      Alert.alert(
        quest.title,
        `${quest.description}\n\nProgress: ${quest.current_progress}/${quest.target_count}\nReward: ${quest.points} points\nDifficulty: ${quest.difficulty_level}`,
        [
          { text: 'OK', style: 'default' }
        ]
      );
    }
  };

  const refreshProfileImage = async () => {
    const userId = await getUserId();
    if (userId) {
      await loadProfileImage(userId);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: P.background }]}> 
        <ActivityIndicator size="large" color={P.icon} />
        <ThemedText style={styles.loadingText}>Loading quests...</ThemedText>
      </View>
    );
  }

  return (
    <>
      <SettingsSidebar 
        visible={sidebarVisible} 
        onClose={() => setSidebarVisible(false)} 
      />
      <RNScrollView
        style={{ flex: 1, backgroundColor: P.background }}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {/* Header */}
        <View style={[styles.headerRow, { paddingHorizontal: Spacing.md, paddingTop: 50, paddingBottom: Spacing.md }]}>
          <ThemedView style={styles.titleContainer}>
            <ThemedText type="title">Quests</ThemedText>
          </ThemedView>
          <Pressable
            style={[styles.settingsButton, { backgroundColor: P.backgroundSecondary, borderRadius: Radii.lg, padding: Spacing.xs }]}
            onPress={() => setSidebarVisible(true)}
            accessibilityLabel="Settings"
          >
            <MaterialIcons name="settings" size={24} color={P.icon} />
          </Pressable>
        </View>

        {/* User Stats */}
        <ThemedView style={[styles.statsContainer, { backgroundColor: P.card, borderRadius: Radii.md, ...(Shadows.soft as any) }]}>
          <View style={styles.userInfo}>
            <Pressable 
              style={styles.userImageContainer}
              onPress={refreshProfileImage}
            >
              <Image
                source={profileImageUrl ? { uri: profileImageUrl } : require('@/assets/images/partial-react-logo.png')}
                style={styles.userImage}
                resizeMode="cover"
              />
              {profileImageUrl && (
                <View style={styles.imageSourceIndicator}>
                  <MaterialIcons 
                    name={profileImageUrl.startsWith('http') ? 'cloud-done' : 'phone-android'} 
                    size={10} 
                    color="white" 
                  />
                </View>
              )}
            </Pressable>
            <View style={styles.userDetails}>
              <ThemedText style={styles.userName}>
                {userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : 'User'}
              </ThemedText>
              <ThemedText style={[styles.userLevel, { color: P.text + '80' }]}>{userStats.level}</ThemedText>
            </View>
          </View>
          
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <ThemedText style={styles.statValue}>{userStats.totalPoints}</ThemedText>
              <ThemedText style={styles.statLabel}>Points</ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText style={styles.statValue}>{userStats.completedQuests}</ThemedText>
              <ThemedText style={styles.statLabel}>Completed</ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText style={styles.statValue}>{userStats.totalQuests - userStats.completedQuests}</ThemedText>
              <ThemedText style={styles.statLabel}>Remaining</ThemedText>
            </View>
          </View>

          <View style={styles.levelProgressContainer}>
            <ThemedText style={[styles.levelProgressText, { color: P.text + '80' }]}>Level Progress</ThemedText>
            <View style={[styles.progressBarBackground, { backgroundColor: P.border }] }>
              <View style={[styles.progressBarFill, { width: `${userStats.levelProgress}%`, backgroundColor: P.primary }]} />
            </View>
            <ThemedText style={[styles.levelProgressPercent, { color: P.text + '80' }]}>{Math.round(userStats.levelProgress)}%</ThemedText>
          </View>
        </ThemedView>

        {/* Category Filter */}
        <View style={styles.categoryContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {categories.map((category) => (
              <Pressable
                key={category.id}
                style={[
                  styles.categoryButton,
                  { backgroundColor: P.backgroundSecondary },
                  selectedCategory === category.id && { backgroundColor: P.primary }
                ]}
                onPress={() => setSelectedCategory(category.id)}
              >
                <MaterialIcons 
                  name={category.icon as any} 
                  size={20} 
                  color={selectedCategory === category.id ? 'white' : P.icon} 
                />
                <ThemedText style={[
                  styles.categoryButtonText,
                  selectedCategory === category.id && { color: 'white' }
                ]}>
                  {category.name}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Quests List */}
        <ThemedView style={[styles.questsContainer, { backgroundColor: P.card, borderRadius: Radii.md, ...(Shadows.soft as any) }]}>
          <ThemedText type="subtitle" style={styles.questsTitle}>
            {selectedCategory === 'all' ? 'All Quests' : categories.find(c => c.id === selectedCategory)?.name + ' Quests'}
          </ThemedText>
          
          {getFilteredQuests().map((quest) => (
            <Pressable
              key={quest.id}
              style={[
                styles.questCard,
                { backgroundColor: P.backgroundSecondary, borderColor: P.border },
                quest.is_completed && { backgroundColor: '#f0f8f0', borderColor: P.primary }
              ]}
              onPress={() => handleQuestPress(quest)}
            >
              <View style={styles.questHeader}>
                <View style={styles.questIconContainer}>
                  <MaterialIcons 
                    name={quest.icon as any} 
                    size={24} 
                    color={quest.is_completed ? '#4caf50' : P.icon} 
                  />
                </View>
                <View style={styles.questInfo}>
                  <ThemedText style={[
                    styles.questTitle,
                    quest.is_completed && { color: '#4caf50' }
                  ]}>
                    {quest.title}
                  </ThemedText>
                  <ThemedText style={[styles.questDescription, { color: P.text + '80' }]}>
                    {quest.description}
                  </ThemedText>
                  <ThemedText style={styles.questDifficulty}>
                    {quest.difficulty_level.toUpperCase()} • {quest.category}
                  </ThemedText>
                </View>
                <View style={styles.questPoints}>
                  <ThemedText style={[
                    styles.questPointsText,
                    quest.is_completed && { color: '#2e7d32' }
                  ]}>
                    +{quest.points}
                  </ThemedText>
                  <ThemedText style={styles.questPointsLabel}>pts</ThemedText>
                </View>
              </View>
              
              {!quest.is_completed && (
                <View style={styles.questProgress}>
                  <View style={styles.progressInfo}>
                    <ThemedText style={styles.progressText}>
                      {quest.current_progress}/{quest.target_count}
                    </ThemedText>
                    <ThemedText style={styles.progressPercent}>
                      {Math.round((quest.current_progress / quest.target_count) * 100)}%
                    </ThemedText>
                  </View>
                  <View style={[styles.questProgressBar, { backgroundColor: P.border }]}>
                    <View style={[
                      styles.questProgressFill, 
                      { width: `${(quest.current_progress / quest.target_count) * 100}%`, backgroundColor: P.primary }
                    ]} />
                  </View>
                </View>
              )}
              
              {quest.is_completed && (
                <View style={styles.completedBadge}>
                  <MaterialIcons name="check-circle" size={20} color="#4caf50" />
                  <ThemedText style={styles.completedText}>Completed</ThemedText>
                </View>
              )}
            </Pressable>
          ))}
        </ThemedView>
      </RNScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
  },
  titleContainer: {
    flex: 1,
  },
  settingsButton: {
    padding: 8,
  },
  statsContainer: {
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  userImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    marginRight: 16,
    position: 'relative',
  },
  userImage: {
    width: 60,
    height: 60,
  },
  imageSourceIndicator: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 8,
    padding: 2,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userLevel: {
    fontSize: 16,
    color: '#666',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4caf50',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  levelProgressContainer: {
    marginTop: 10,
  },
  levelProgressText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  progressBarBackground: {
    width: '100%',
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4caf50',
    borderRadius: 4,
  },
  levelProgressPercent: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 4,
  },
  categoryContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  categoryScroll: {
    flexDirection: 'row',
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  categoryButtonActive: {
    backgroundColor: '#4caf50',
  },
  categoryButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
  },
  categoryButtonTextActive: {
    color: 'white',
  },
  questsContainer: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  questsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  questCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  questCardCompleted: {
    backgroundColor: '#f0f8f0',
    borderColor: '#4caf50',
  },
  questHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  questIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  questInfo: {
    flex: 1,
  },
  questTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  questTitleCompleted: {
    color: '#4caf50',
  },
  questDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 4,
  },
  questDifficulty: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  questPoints: {
    alignItems: 'center',
  },
  questPointsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4caf50',
  },
  questPointsCompleted: {
    color: '#2e7d32',
  },
  questPointsLabel: {
    fontSize: 12,
    color: '#666',
  },
  questProgress: {
    marginTop: 8,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
  },
  progressPercent: {
    fontSize: 12,
    color: '#4caf50',
    fontWeight: 'bold',
  },
  questProgressBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  questProgressFill: {
    height: '100%',
    backgroundColor: '#4caf50',
    borderRadius: 3,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#e8f5e8',
    borderRadius: 16,
  },
  completedText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#4caf50',
    fontWeight: 'bold',
  },
});
