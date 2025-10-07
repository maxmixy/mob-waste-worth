import { Image } from 'expo-image';
import { Platform, StyleSheet, View, Pressable, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { ScrollView as RNScrollView, ScrollView } from 'react-native';
import { Colors } from '@/constants/Colors';
import LogoLoadingAnimation from '@/components/LogoLoadingAnimation';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { getUserId, checkProfileCompletion } from '@/lib/user';
import { ImageService } from '@/lib/imageService';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import SettingsSidebar from '@/components/SettingsSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { questService } from '@/lib/questService';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import Animated, { 
  useAnimatedGestureHandler, 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring, 
  runOnJS,
  interpolate,
  Extrapolate
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { API_BASE_URL } from '@/lib/config';

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
  const { userId } = useAuth(); // Get userId from auth context
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
  
  // Swipe gesture state
  const scrollViewRef = useRef<ScrollView>(null);
  const categoryScrollX = useSharedValue(0);
  const categoryContainerWidth = useSharedValue(0);
  const categoryItemWidth = useSharedValue(0);
  const screenWidth = Dimensions.get('window').width;

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

  // Calculate category item width and container width
  const calculateCategoryDimensions = () => {
    const itemWidth = 120; // Approximate width of each category button
    const containerWidth = categories.length * itemWidth;
    categoryItemWidth.value = itemWidth;
    categoryContainerWidth.value = containerWidth;
  };

  // Handle category selection with haptic feedback
  const handleCategorySelection = (categoryId: string) => {
    if (categoryId !== selectedCategory) {
      setSelectedCategory(categoryId);
      
      // Haptic feedback
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      
      // Auto-scroll to center the selected category
      const selectedIndex = categories.findIndex(cat => cat.id === categoryId);
      if (selectedIndex !== -1 && scrollViewRef.current) {
        // Calculate scroll position to center the selected category
        const itemWidth = 120; // Should match snapToInterval
        const containerPadding = 8; // Horizontal padding
        const scrollToX = Math.max(0, (selectedIndex * itemWidth) - (screenWidth / 2) + (itemWidth / 2) + containerPadding);
        
        scrollViewRef.current.scrollTo({ 
          x: scrollToX, 
          animated: true 
        });
      }
    }
  };

  // Pan gesture handler for swipe functionality
  const panGestureHandler = useAnimatedGestureHandler({
    onStart: (_, context: any) => {
      context.startX = categoryScrollX.value;
    },
    onActive: (event, context: any) => {
      categoryScrollX.value = context.startX - event.translationX;
    },
    onEnd: (event) => {
      const velocity = event.velocityX;
      const translation = event.translationX;
      
      // Determine which category to select based on swipe direction and velocity
      const currentIndex = categories.findIndex(cat => cat.id === selectedCategory);
      let newIndex = currentIndex;
      
      if (Math.abs(translation) > 50 || Math.abs(velocity) > 500) {
        if (translation > 0 && velocity > 0) {
          // Swipe right - go to previous category
          newIndex = Math.max(0, currentIndex - 1);
        } else if (translation < 0 && velocity < 0) {
          // Swipe left - go to next category
          newIndex = Math.min(categories.length - 1, currentIndex + 1);
        }
      }
      
      // Update selected category if changed
      if (newIndex !== currentIndex) {
        runOnJS(handleCategorySelection)(categories[newIndex].id);
      }
      
      // Reset scroll position
      categoryScrollX.value = withSpring(0);
    },
  });

  // Animated style for category container
  const categoryAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: categoryScrollX.value }],
    };
  });

  useEffect(() => {
    if (userId) {
      loadUserData();
    }
  }, [userId]);

  useEffect(() => {
    calculateCategoryDimensions();
  }, []);

  // Recalculate stats whenever quests data changes
  useEffect(() => {
    if (quests.length > 0) {
      recalculateUserStats();
    }
  }, [quests]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      
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
        
        // Calculate level progress based on completed quests and points
        const completedQuestsCount = questsWithProgress.filter(quest => quest.is_completed).length;
        const totalQuestsCount = questsWithProgress.length;
        
        // Calculate total points from completed quests
        const totalPointsFromQuests = questsWithProgress
          .filter(quest => quest.is_completed)
          .reduce((sum, quest) => sum + quest.points, 0);
        
        // Use the higher of backend points or calculated points from quests
        const actualTotalPoints = Math.max(userStatsData.totalPoints, totalPointsFromQuests);
        
        // Use points-based level calculation for more accurate progress
        const levelInfo = calculateLevelProgressFromPoints(actualTotalPoints);
        
        setUserStats({
          ...userStatsData,
          totalPoints: actualTotalPoints,
          level: levelInfo.level,
          levelProgress: levelInfo.progress,
          completedQuests: completedQuestsCount,
          totalQuests: totalQuestsCount
        });
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
    if (points < 50) return 'Eco Beginner';
    if (points < 150) return 'Eco Explorer';
    if (points < 300) return 'Eco Warrior';
    if (points < 500) return 'Eco Champion';
    if (points < 750) return 'Eco Master';
    return 'Eco Legend';
  };

  // Calculate level progress based on completed quests
  const calculateLevelProgress = (completedQuests: number, totalQuests: number): number => {
    if (totalQuests === 0) return 0;
    return Math.min((completedQuests / totalQuests) * 100, 100);
  };

  // Calculate level progress based on points
  const calculateLevelProgressFromPoints = (points: number): { level: string; progress: number } => {
    const levelThresholds = [
      { level: 'Eco Beginner', min: 0, max: 49 },
      { level: 'Eco Explorer', min: 50, max: 149 },
      { level: 'Eco Warrior', min: 150, max: 299 },
      { level: 'Eco Champion', min: 300, max: 499 },
      { level: 'Eco Master', min: 500, max: 749 },
      { level: 'Eco Legend', min: 750, max: Infinity }
    ];

    for (const threshold of levelThresholds) {
      if (points >= threshold.min && points <= threshold.max) {
        const progressInLevel = points - threshold.min;
        const levelRange = threshold.max - threshold.min;
        const progress = levelRange > 0 ? (progressInLevel / levelRange) * 100 : 100;
        return { level: threshold.level, progress: Math.min(progress, 100) };
      }
    }

    return { level: 'Eco Legend', progress: 100 };
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
          { text: 'OK', style: 'default' },
          { 
            text: 'Update Progress', 
            style: 'default',
            onPress: () => updateQuestProgress(quest.id, 1)
          }
        ]
      );
    }
  };

  const refreshProfileImage = async () => {
    if (userId) {
      await loadProfileImage(userId);
    }
  };

  // Update quest progress for a specific quest
  const updateQuestProgress = async (questId: string, increment: number = 1) => {
    if (!userId) return;

    try {
      const result = await questService.updateQuestProgress(questId, increment, userId);
      
      if (result.success) {
        // Refresh the quest data to show updated progress
        await loadUserData();
        
        if (result.isCompleted) {
          Alert.alert(
            'Quest Completed! 🎉',
            `Congratulations! You've completed a quest and earned ${result.pointsEarned} points!`,
            [{ text: 'Awesome!', style: 'default' }]
          );
        }
        
        return result;
      } else {
        console.error('Failed to update quest progress:', result.error);
        Alert.alert('Error', result.error || 'Failed to update quest progress');
        return null;
      }
    } catch (error) {
      console.error('Error updating quest progress:', error);
      Alert.alert('Error', 'Failed to update quest progress');
      return null;
    }
  };

  // Refresh all quest data
  const refreshQuests = async () => {
    if (userId) {
      await loadUserData();
    }
  };

  // Recalculate user stats based on current quest data
  const recalculateUserStats = () => {
    const completedQuestsCount = quests.filter(quest => quest.is_completed).length;
    const totalQuestsCount = quests.length;
    
    // Calculate total points from completed quests
    const totalPointsFromQuests = quests
      .filter(quest => quest.is_completed)
      .reduce((sum, quest) => sum + quest.points, 0);
    
    // Use points-based level calculation
    const levelInfo = calculateLevelProgressFromPoints(totalPointsFromQuests);
    
    setUserStats(prevStats => ({
      ...prevStats,
      totalPoints: totalPointsFromQuests,
      level: levelInfo.level,
      levelProgress: levelInfo.progress,
      completedQuests: completedQuestsCount,
      totalQuests: totalQuestsCount
    }));
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: Colors.background }]}>
        <LogoLoadingAnimation size={120} showBackground={true} />
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
        style={{ flex: 1, backgroundColor: Colors.background }}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <ThemedView style={styles.titleContainer}>
            <ThemedText type="title">Quests</ThemedText>
          </ThemedView>
          <View style={styles.headerActions}>
            <Pressable
              style={styles.refreshButton}
              onPress={refreshQuests}
              accessibilityLabel="Refresh Quests"
            >
              <MaterialIcons name="refresh" size={24} color={Colors.icon} />
            </Pressable>
            <Pressable
              style={styles.settingsButton}
              onPress={() => setSidebarVisible(true)}
              accessibilityLabel="Settings"
            >
              <MaterialIcons name="settings" size={24} color={Colors.icon} />
            </Pressable>
          </View>
        </View>

        {/* User Stats */}
        <ThemedView style={styles.statsContainer}>
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
              <ThemedText style={styles.userLevel}>{userStats.level}</ThemedText>
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
            <ThemedText style={styles.levelProgressText}>Level Progress</ThemedText>
            <View style={styles.progressBarBackground}>
              <View style={[styles.progressBarFill, { width: `${userStats.levelProgress}%` }]} />
            </View>
            <View style={styles.progressInfo}>
              <ThemedText style={styles.levelProgressPercent}>{Math.round(userStats.levelProgress)}%</ThemedText>
              <ThemedText style={styles.levelProgressDetails}>
                {userStats.completedQuests}/{userStats.totalQuests} quests completed
              </ThemedText>
            </View>
          </View>
        </ThemedView>

        {/* Category Filter with Swipe Support */}
        <View style={styles.categoryContainer}>
          <PanGestureHandler onGestureEvent={panGestureHandler}>
            <Animated.View style={styles.categoryScrollContainer}>
              <ScrollView 
                ref={scrollViewRef}
                horizontal 
                showsHorizontalScrollIndicator={false} 
                style={styles.categoryScroll}
                contentContainerStyle={styles.categoryScrollContent}
                decelerationRate="fast"
                snapToInterval={120}
                snapToAlignment="center"
              >
                {categories.map((category, index) => {
                  const isActive = selectedCategory === category.id;

                  return (
                    <Pressable
                      key={category.id}
                      style={[
                        styles.categoryButton,
                        isActive && styles.categoryButtonActive
                      ]}
                      onPress={() => handleCategorySelection(category.id)}
                    >
                      <MaterialIcons 
                        name={category.icon as any} 
                        size={20} 
                        color={isActive ? 'white' : Colors.icon} 
                      />
                      <ThemedText style={[
                        styles.categoryButtonText,
                        isActive && styles.categoryButtonTextActive
                      ]}>
                        {category.name}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </Animated.View>
          </PanGestureHandler>
        </View>

        {/* Quests List */}
        <ThemedView style={styles.questsContainer}>
          <ThemedText type="subtitle" style={styles.questsTitle}>
            {selectedCategory === 'all' ? 'All Quests' : categories.find(c => c.id === selectedCategory)?.name + ' Quests'}
          </ThemedText>
          
          {getFilteredQuests().map((quest) => (
            <Pressable
              key={quest.id}
              style={[
                styles.questCard,
                quest.is_completed && styles.questCardCompleted
              ]}
              onPress={() => handleQuestPress(quest)}
            >
              <View style={styles.questHeader}>
                <View style={styles.questIconContainer}>
                  <MaterialIcons 
                    name={quest.icon as any} 
                    size={24} 
                    color={quest.is_completed ? '#4caf50' : Colors.icon} 
                  />
                </View>
                <View style={styles.questInfo}>
                  <ThemedText style={[
                    styles.questTitle,
                    quest.is_completed && styles.questTitleCompleted
                  ]}>
                    {quest.title}
                  </ThemedText>
                  <ThemedText style={styles.questDescription}>
                    {quest.description}
                  </ThemedText>
                  <ThemedText style={styles.questDifficulty}>
                    {quest.difficulty_level.toUpperCase()} • {quest.category}
                  </ThemedText>
                </View>
                <View style={styles.questPoints}>
                  <ThemedText style={[
                    styles.questPointsText,
                    quest.is_completed && styles.questPointsCompleted
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
                  <View style={styles.questProgressBar}>
                    <View style={[
                      styles.questProgressFill, 
                      { width: `${(quest.current_progress / quest.target_count) * 100}%` }
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshButton: {
    padding: 8,
    marginRight: 8,
  },
  settingsButton: {
    padding: 8,
  },
  statsContainer: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    backgroundColor: Platform.OS === 'web' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1,
    borderColor: '#00630F',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    ...(Platform.OS === 'web' && { backdropFilter: 'blur(10px)' }),
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
    color: '#2D5016',
  },
  userLevel: {
    fontSize: 16,
    color: '#4A6741',
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
    color: Colors.primary,
  },
  statLabel: {
    fontSize: 14,
    color: '#4A6741',
    marginTop: 4,
  },
  levelProgressContainer: {
    marginTop: 10,
  },
  levelProgressText: {
    fontSize: 14,
    color: '#4A6741',
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
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  levelProgressPercent: {
    fontSize: 12,
    color: '#666',
    fontWeight: 'bold',
  },
  levelProgressDetails: {
    fontSize: 11,
    color: '#888',
    fontStyle: 'italic',
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  categoryContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  categoryScrollContainer: {
    flex: 1,
  },
  categoryScroll: {
    flexDirection: 'row',
  },
  categoryScrollContent: {
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    minWidth: 100,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryButtonActive: {
    backgroundColor: Colors.primary,
    transform: [{ scale: 1.05 }],
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  categoryButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
  },
  categoryButtonTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  questsContainer: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    backgroundColor: Platform.OS === 'web' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1,
    borderColor: '#00630F',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    ...(Platform.OS === 'web' && { backdropFilter: 'blur(10px)' }),
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
    color: Colors.primary,
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
  progressText: {
    fontSize: 12,
    color: '#666',
  },
  progressPercent: {
    fontSize: 12,
    color: Colors.primary,
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
    backgroundColor: Colors.primary,
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
