import { Image } from 'expo-image';
import { useEffect, useState, useRef } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, TextInput, TouchableOpacity, View, Alert, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams } from 'expo-router';

import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import LogoLoadingAnimation from '@/components/LogoLoadingAnimation';
import { Colors } from '@/constants/Colors';
import { getUserId, checkProfileCompletion } from '@/lib/user';
import { ImageService } from '@/lib/imageService';
import { questService } from '@/lib/questService';
import { notificationService } from '@/lib/notificationService';

import { ScrollView as RNScrollView } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';

import SettingsSidebar from '@/components/SettingsSidebar';

const API_BASE_URL = 'http://127.0.0.1:5000';

interface PostMedia {
  media_type: string;
  media_path: string;
}

interface PostComment {
  id?: string;
  user_id: string;
  comment_text: string;
  created_at?: string;
}

interface PostData {
  id: string;
  user_id: string;
  content_text: string;
  created_at?: string;
  updated_at?: string;
  media: PostMedia[];
  likes: string[];
  comments: PostComment[];
}

export default function CommunityScreen() {
  const params = useLocalSearchParams();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Post creation state
  const [showPostModal, setShowPostModal] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [postImages, setPostImages] = useState<string[]>([]);
  const [submittingPost, setSubmittingPost] = useState(false);
  
  // Lazy loading state
  const [loadingPosts, setLoadingPosts] = useState<Set<string>>(new Set());
  const [loadedPosts, setLoadedPosts] = useState<Set<string>>(new Set());
  const [postData, setPostData] = useState<{[postId: string]: PostData}>({});
  const [error, setError] = useState<string | null>(null);
  const [commentTexts, setCommentTexts] = useState<{[postId: string]: string}>({});
  const [postText, setPostText] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [userProfileImages, setUserProfileImages] = useState<{[userId: string]: string}>({});
  const [userNames, setUserNames] = useState<{[userId: string]: string}>({});
  const [userLevels, setUserLevels] = useState<{[userId: string]: string}>({});
  const [commentingPostId, setCommentingPostId] = useState<string | null>(null);
  const [likingPostId, setLikingPostId] = useState<string | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  
  // Edit/Delete state
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editPostContent, setEditPostContent] = useState('');
  const [editExistingImages, setEditExistingImages] = useState<PostMedia[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  

  // Edit post function
  const handleEditPost = (postId: string, currentContent: string, existingMedia: PostMedia[] = []) => {
    setEditingPostId(postId);
    setEditPostContent(currentContent);
    setEditExistingImages(existingMedia);
    setShowEditModal(true);
  };

  // Delete post function
  const handleDeletePost = (postId: string) => {
    setDeletingPostId(postId);
    setShowDeleteModal(true);
  };

  // Confirm delete function
  const confirmDelete = () => {
    if (deletingPostId) {
      deletePost(deletingPostId);
      setShowDeleteModal(false);
      setDeletingPostId(null);
    }
  };

  // Cancel delete function
  const cancelDelete = () => {
    setShowDeleteModal(false);
    setDeletingPostId(null);
  };


  // Delete post API call
  const deletePost = async (postId: string) => {
    try {
      setIsProcessingAction(true);
      
      const response = await fetch(`${API_BASE_URL}/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        // Remove post from both posts array and postData object
        setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
        setPostData(prevData => {
          const newData = { ...prevData };
          delete newData[postId];
          return newData;
        });
        setLoadedPosts(prev => {
          const newSet = new Set(prev);
          newSet.delete(postId);
          return newSet;
        });
        
        // Success handled by UI update
      } else {
        const errorData = await response.json().catch(() => ({}));
        // Error handling - could add toast notification here
        console.error('Failed to delete post:', errorData.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      // Error handling - could add toast notification here
      console.error('Failed to delete post');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Update post API call
  const updatePost = async (postId: string, newContent: string) => {
    try {
      setIsProcessingAction(true);
      
      const response = await fetch(`${API_BASE_URL}/posts/${postId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content_text: newContent,
          updated_at: new Date().toISOString()
        }),
      });

      if (response.ok) {
        // Update post in local state
        setPostData(prevData => ({
          ...prevData,
          [postId]: {
            ...prevData[postId],
            content_text: newContent,
            updated_at: new Date().toISOString()
          }
        }));
        setShowEditModal(false);
        setEditingPostId(null);
        setEditPostContent('');
        setEditExistingImages([]);
        Alert.alert('Success', 'Post updated successfully');
      } else {
        Alert.alert('Error', 'Failed to update post');
      }
    } catch (error) {
      console.error('Error updating post:', error);
      Alert.alert('Error', 'Failed to update post');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Post skeleton component for loading states
  const PostSkeleton = ({ postId }: { postId: string }) => (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <View style={styles.userAvatarContainer}>
          <View style={styles.skeletonAvatar} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.skeletonText} />
          <View style={[styles.skeletonText, { width: '60%' }]} />
        </View>
      </View>
      
      <View style={styles.skeletonContent}>
        <View style={styles.skeletonText} />
        <View style={styles.skeletonText} />
        <View style={[styles.skeletonText, { width: '80%' }]} />
      </View>
      
      <View style={styles.skeletonActions}>
        <View style={styles.skeletonButton} />
        <View style={styles.skeletonButton} />
        <View style={styles.skeletonButton} />
      </View>
    </View>
  );

  // Handle pre-filled content from project completion
  useEffect(() => {
    if (params.prefillContent && params.showPostModal === 'true') {
      setPostContent(params.prefillContent as string);
      setShowPostModal(true);
    }
  }, [params.prefillContent, params.showPostModal]);

  const createPost = async () => {
    if (!postContent.trim() && postImages.length === 0) {
      Alert.alert('Error', 'Please add some content or images to your post');
      return;
    }

    try {
      setSubmittingPost(true);
      const currentUserId = await getUserId();
      if (!currentUserId) {
        Alert.alert('Error', 'User not found. Please log in again.');
        return;
      }

      const postData = {
        user_id: currentUserId,
        content_text: postContent.trim(),
        media: postImages.map((image, index) => ({
          media_type: 'image',
          media_path: image,
          order_index: index
        }))
      };

      const response = await fetch(`${API_BASE_URL}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData)
      });

      if (response.ok) {
        // Reset form and close modal
        setPostContent('');
        setPostImages([]);
        setShowPostModal(false);
        
        // Reload posts to show the new one
        await loadPosts();
        
        // Track quest progress for community action (creating posts)
        console.log('📝 Tracking community action: Create post (modal)');
        try {
          const results = await questService.trackCommunityAction(currentUserId);
          await questService.checkCompletedQuests(results);
          console.log('✅ Community quest progress updated:', results);
        } catch (questError) {
          console.error('❌ Error tracking community quest:', questError);
        }

        // Send notification for new post
        try {
          const profileResult = await checkProfileCompletion(currentUserId);
          const authorName = profileResult.profileData ? 
            `${profileResult.profileData.first_name} ${profileResult.profileData.last_name}` : 
            'Someone';
          notificationService.notifyNewPost(authorName, postContent.trim());
        } catch (notificationError) {
          console.error('❌ Error sending post notification:', notificationError);
        }
        
        // Add success notification for post creation
        const postTitle = postContent.trim() || 'New Post';
        notificationService.notifyPostSuccess(postTitle);
        
        Alert.alert('Success', 'Your post has been shared!');
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.error || 'Failed to create post');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setSubmittingPost(false);
    }
  };

  const loadPosts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/posts`);
      if (!response.ok) throw new Error('Failed to fetch posts');
      const data = await response.json() as PostData[];
      
      // Initialize posts array and start lazy loading
      setPosts(data);
      
      // Load posts one by one with delay
      for (let i = 0; i < data.length; i++) {
        const post = data[i];
        setLoadingPosts(prev => new Set(prev).add(post.id));
        
        // Simulate loading delay for better UX
        await new Promise(resolve => setTimeout(resolve, 200));
        
        setPostData(prev => ({ ...prev, [post.id]: post }));
        setLoadedPosts(prev => new Set(prev).add(post.id));
        setLoadingPosts(prev => {
          const newSet = new Set(prev);
          newSet.delete(post.id);
          return newSet;
        });
      }
      
      // Load profile images and names for all users in posts
      const userIds = [...new Set(data.map((post: PostData) => post.user_id))];
      await loadUserProfileImages(userIds);
      await loadUserNames(userIds);
      await loadUserLevels(userIds);
    } catch (err) {
      console.error('Error loading posts:', err);
      setError('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const loadUserProfile = async (uid: string) => {
    try {
      const profileInfo = await checkProfileCompletion(uid);
      if (profileInfo.profileCompleted && profileInfo.profileData) {
        setUserProfile(profileInfo.profileData);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const loadProfileImage = async (uid: string) => {
    try {
      console.log('Loading profile image for user:', uid);
      const imageResponse = await ImageService.getProfileImage(uid);
      console.log('Profile image response:', imageResponse);
      
      if (imageResponse.success && imageResponse.hasImage && imageResponse.imageUrl) {
        console.log('Setting profile image URL:', imageResponse.imageUrl);
        setProfileImageUrl(imageResponse.imageUrl);
      } else {
        console.log('No profile image found or error:', imageResponse.error || imageResponse.message);
        setProfileImageUrl(null);
      }
    } catch (error) {
      console.error('Error loading profile image:', error);
      setProfileImageUrl(null);
    }
  };

  const refreshProfileImage = async () => {
    if (userId) {
      console.log('Refreshing profile image...');
      await loadProfileImage(userId);
    }
  };

  const loadUserProfileImages = async (userIds: string[]) => {
    console.log('Loading profile images for users:', userIds);
    
    // Filter out users we already have images for
    const usersToLoad = userIds.filter(id => !userProfileImages[id]);
    
    if (usersToLoad.length === 0) {
      console.log('All user profile images already loaded');
      return;
    }
    
    console.log('Loading profile images for new users:', usersToLoad);
    
    // Load profile images for all users in parallel
    const imagePromises = usersToLoad.map(async (uid) => {
      try {
        const imageResponse = await ImageService.getProfileImage(uid);
        if (imageResponse.success && imageResponse.hasImage && imageResponse.imageUrl) {
          return { userId: uid, imageUrl: imageResponse.imageUrl };
        }
        return { userId: uid, imageUrl: null };
      } catch (error) {
        console.error(`Error loading profile image for user ${uid}:`, error);
        return { userId: uid, imageUrl: null };
      }
    });
    
    const results = await Promise.all(imagePromises);
    
    // Update state with new profile images
    const newProfileImages = { ...userProfileImages };
    results.forEach(({ userId, imageUrl }) => {
      if (imageUrl) {
        newProfileImages[userId] = imageUrl;
      }
    });
    
    setUserProfileImages(newProfileImages);
    console.log('Updated user profile images:', newProfileImages);
  };

  const loadUserNames = async (userIds: string[]) => {
    console.log('Loading user names for users:', userIds);
    
    // Filter out users we already have names for
    const usersToLoad = userIds.filter(id => !userNames[id]);
    
    if (usersToLoad.length === 0) {
      console.log('All user names already loaded');
      return;
    }
    
    console.log('Loading user names for new users:', usersToLoad);
    
    // Load user names for all users in parallel
    const namePromises = usersToLoad.map(async (uid) => {
      try {
        const profileInfo = await checkProfileCompletion(uid);
        if (profileInfo.profileCompleted && profileInfo.profileData) {
          const { firstName, lastName } = profileInfo.profileData;
          if (firstName && lastName) {
            return { userId: uid, name: `${firstName} ${lastName}` };
          }
        }
        return { userId: uid, name: uid }; // Fallback to user ID
      } catch (error) {
        console.error(`Error loading user name for user ${uid}:`, error);
        return { userId: uid, name: uid }; // Fallback to user ID
      }
    });
    
    const results = await Promise.all(namePromises);
    
    // Update state with new user names
    const newUserNames = { ...userNames };
    results.forEach(({ userId, name }) => {
      newUserNames[userId] = name;
    });
    
    setUserNames(newUserNames);
    console.log('Updated user names:', newUserNames);
  };

  // Compute level from points (same thresholds as Quests)
  const calculateLevelFromPoints = (points: number): string => {
    if (points < 50) return 'Eco Beginner';
    if (points < 150) return 'Eco Explorer';
    if (points < 300) return 'Eco Warrior';
    if (points < 500) return 'Eco Champion';
    if (points < 750) return 'Eco Master';
    return 'Eco Legend';
  };

  const loadUserLevels = async (userIds: string[]) => {
    console.log('Loading user levels for users:', userIds);
    const usersToLoad = userIds; // Always refresh to avoid stale cache

    // Fetch all quests once to mirror Quests tab calculations
    let allQuests: Array<{ id: string; points: number }>|null = null;
    try {
      const questsRes = await fetch(`${API_BASE_URL}/quests`);
      const questsData = await questsRes.json().catch(() => null) as any;
      if (questsData && questsData.success && Array.isArray(questsData.quests)) {
        allQuests = questsData.quests.map((q: any) => ({ id: q.id, points: q.points }));
      }
    } catch (e) {
      console.warn('Could not fetch quests list for level calc; falling back to stats only');
    }

    const levelPromises = usersToLoad.map(async (uid) => {
      try {
        // Fetch backend stats
        const [statsRes, progressRes] = await Promise.all([
          fetch(`${API_BASE_URL}/user/${uid}/quests/stats`),
          allQuests ? fetch(`${API_BASE_URL}/user/${uid}/quests/progress`) : Promise.resolve(null as any),
        ]);

        const statsData = await statsRes.json().catch(() => null) as any;
        let backendPoints = 0;
        let backendLevel: string | undefined;
        if (statsData && statsData.success) {
          backendPoints = statsData.stats?.total_points ?? 0;
          backendLevel = statsData.stats?.level;
        }

        // Optionally compute points from completed quests like Quests tab
        let computedPoints = 0;
        if (allQuests && progressRes) {
          const progressData = await progressRes.json().catch(() => null) as any;
          if (progressData && progressData.success && Array.isArray(progressData.progress)) {
            const completedIds = new Set(
              progressData.progress
                .filter((p: any) => p.is_completed)
                .map((p: any) => p.quest_id)
            );
            computedPoints = allQuests
              .filter(q => completedIds.has(q.id))
              .reduce((sum, q) => sum + (q.points || 0), 0);
          }
        }

        const actualPoints = Math.max(backendPoints, computedPoints);
        const level = (backendLevel && actualPoints === backendPoints)
          ? backendLevel
          : calculateLevelFromPoints(actualPoints);

        return { userId: uid, level };
      } catch (error) {
        console.error(`Error loading user level for user ${uid}:`, error);
        return { userId: uid, level: 'Eco Beginner' };
      }
    });

    const results = await Promise.all(levelPromises);
    const newLevels: {[userId: string]: string} = { ...userLevels };
    results.forEach(({ userId, level }) => {
      newLevels[userId] = level;
    });
    setUserLevels(newLevels);
    console.log('Updated user levels:', newLevels);
  };

  useEffect(() => {
    (async () => {
      const uid = await getUserId();
      setUserId(uid);
      if (uid) {
        await loadUserProfile(uid);
        await loadProfileImage(uid);
      }
      loadPosts();
      
      // Camera permissions are handled by useCameraPermissions hook
    })();
  }, []);

  // Ensure levels stay accurate when posts list changes
  useEffect(() => {
    const ensureLevels = async () => {
      try {
        const ids = [...new Set(posts.map(p => p.user_id))];
        if (ids.length > 0) {
          await loadUserLevels(ids);
        }
      } catch (e) {
        // noop
      }
    };
    ensureLevels();
  }, [posts]);

  const handleLike = async (postId: string) => {
    if (!userId) return;
    
    // Set loading state
    setLikingPostId(postId);
    
    // Find the post to update
    const postIndex = posts.findIndex(post => post.id === postId);
    if (postIndex === -1) return;
    
    // Create a copy of posts to update
    const updatedPosts = [...posts];
    const post = updatedPosts[postIndex];
    
    // Optimistically update the UI
    const isLiked = post.likes.includes(userId);
    if (isLiked) {
      // Remove like
      post.likes = post.likes.filter(id => id !== userId);
    } else {
      // Add like
      post.likes = [...post.likes, userId];
    }
    
    // Update state immediately
    setPosts(updatedPosts);
    
    try {
      const response = await fetch(`${API_BASE_URL}/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });
      
      if (!response.ok) {
        // Revert on error
        setPosts(posts);
        console.error('Failed to like post');
      } else {
        // Track quest progress for community action (liking posts)
        console.log('👍 Tracking community action: Like post');
        try {
          const results = await questService.trackCommunityAction(userId);
          await questService.checkCompletedQuests(results);
          console.log('✅ Community quest progress updated:', results);
        } catch (questError) {
          console.error('❌ Error tracking community quest:', questError);
        }
      }
    } catch (err) {
      // Revert on error
      setPosts(posts);
      console.error('Error liking post:', err);
    } finally {
      // Clear loading state
      setLikingPostId(null);
    }
  };

  const handleCreatePost = async () => {
    if (!userId || (!postText.trim() && selectedImages.length === 0)) return;
    
    try {
      console.log('Creating post with images:', selectedImages);
      
      // Step 1: Upload images to Hostinger first and get their paths
      const imagePaths = [];
      
      if (selectedImages.length > 0) {
        console.log('Uploading images to Hostinger...');
        
        for (const imageUri of selectedImages) {
          try {
            console.log('Processing image URI:', imageUri);
            
            // Try Hostinger first, fallback to local backend
            try {
              const uploadResult = await ImageService.uploadPostImage(imageUri);
              
              if (uploadResult.success && uploadResult.imagePath) {
                console.log('Image uploaded successfully to Hostinger:', uploadResult.imagePath);
                imagePaths.push(uploadResult.imagePath);
              } else {
                throw new Error(uploadResult.error || 'Hostinger upload failed');
              }
            } catch (hostingerError) {
              console.warn('Hostinger upload failed, trying local backend:', hostingerError);
              
              // Fallback to local backend
              const formData = new FormData();
              
              if (Platform.OS === 'web') {
                const response = await fetch(imageUri);
                const blob = await response.blob();
                const file = new File([blob], 'image.jpg', { type: 'image/jpeg' });
                formData.append('image', file);
              } else {
                formData.append('image', {
                  uri: imageUri,
                  type: 'image/jpeg',
                  name: 'image.jpg',
                } as any);
              }
              
              const uploadResponse = await fetch(`${API_BASE_URL}/upload/post-image`, {
                method: 'POST',
                body: formData,
              });
              
              if (uploadResponse.ok) {
                const uploadResult = await uploadResponse.json();
                console.log('Image uploaded successfully to local backend:', uploadResult.imagePath);
                imagePaths.push(uploadResult.imagePath);
              } else {
                throw new Error('Both Hostinger and local backend upload failed');
              }
            }
          } catch (error) {
            console.error('Error uploading image to Hostinger:', error);
            throw new Error(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }
      
      console.log('All images uploaded, creating post with paths:', imagePaths);
      
      // Step 2: Create the post with image paths
      const response = await fetch(`${API_BASE_URL}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          content_text: postText.trim() || '',
          status: 'published',
          image_paths: imagePaths // Send the uploaded image paths
        }),
      });
      
      if (response.ok) {
        // Clear the input and selected images
        setPostText('');
        setSelectedImages([]);
        // Reload posts to show the new one
        loadPosts();
        
        // Track quest progress for community action (creating posts)
        console.log('📝 Tracking community action: Create post');
        try {
          const results = await questService.trackCommunityAction(userId);
          await questService.checkCompletedQuests(results);
          console.log('✅ Community quest progress updated:', results);
        } catch (questError) {
          console.error('❌ Error tracking community quest:', questError);
        }

        // Send success notification for post creation
        try {
          const postTitle = postText.trim() || 'New Post';
          notificationService.notifyPostSuccess(postTitle);
        } catch (notificationError) {
          console.error('❌ Error sending post notification:', notificationError);
        }
        
        Alert.alert('Success', `Post created successfully with ${imagePaths.length} image${imagePaths.length !== 1 ? 's' : ''}! 🎉`);
      } else {
        const errorResult = await response.json();
        console.error('Failed to create post:', errorResult);
        Alert.alert('Error', `Failed to create post: ${errorResult.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error creating post:', err);
      Alert.alert('Error', `Failed to create post: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handlePhotoUpload = async () => {
    if (isProcessingAction) return;
    
    setIsProcessingAction(true);
    try {
      console.log('Photo upload pressed - requesting permissions');
      
      // Request media library permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      console.log('Permission status:', status);
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Sorry, we need camera roll permissions to select photos for your posts.',
          [{ text: 'OK' }]
        );
        setIsProcessingAction(false);
        return;
      }

      console.log('Permission granted, showing photo options');
      
      // Show a simple action sheet that works better across platforms
      if (Platform.OS === 'web') {
        // For web, go directly to image library
        console.log('Web platform - opening image library directly');
        await openImageLibrary();
      } else {
        // For mobile, show action sheet
        Alert.alert(
          'Add Photo',
          'How would you like to add a photo?',
          [
            {
              text: 'Photo Library',
              onPress: async () => {
                console.log('Photo Library selected');
                await openImageLibrary();
              },
            },
            {
              text: 'Take Photo',
              onPress: async () => {
                console.log('Take Photo selected');
                await handleCameraCapture();
              },
            },
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => {
                console.log('Photo selection cancelled');
                setIsProcessingAction(false);
              },
            },
          ]
        );
      }
      
    } catch (error) {
      console.error('Error handling photo upload:', error);
      Alert.alert('Error', 'Failed to open photo picker. Please try again.');
      setIsProcessingAction(false);
    }
  };

  const openImageLibrary = async () => {
    try {
      console.log('Opening image library');
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        allowsEditing: false,
        aspect: [4, 3],
      });

      console.log('Image picker result:', result);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Add selected images to the selectedImages array
        const newImageUris = result.assets.map(asset => asset.uri);
        setSelectedImages(prev => [...prev, ...newImageUris]);
        
        console.log('Added images to selection:', newImageUris);
        Alert.alert(
          'Success', 
          `Added ${newImageUris.length} photo${newImageUris.length > 1 ? 's' : ''} to your post! 📸`
        );
      } else {
        console.log('Image selection cancelled or no images selected');
      }
    } catch (error) {
      console.error('Error opening image library:', error);
      Alert.alert('Error', 'Failed to open photo library. Please try again.');
    } finally {
      // Make sure to reset processing state
      setIsProcessingAction(false);
    }
  };

  const handleLinkShare = async () => {
    if (isProcessingAction) return;
    
    setIsProcessingAction(true);
    try {
      // TODO: Implement link sharing functionality
      // This would typically open a link input dialog
      console.log('Link share pressed');
      alert('Link sharing feature coming soon! 🔗\n\nThis will allow you to share links and URLs in your posts.');
    } catch (error) {
      console.error('Error handling link share:', error);
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleCameraCapture = async () => {
    if (isProcessingAction) return;
    
    setIsProcessingAction(true);
    try {
      if (!permission) {
        Alert.alert('Camera Permission', 'Requesting camera permission...');
        const permissionResult = await requestPermission();
        if (!permissionResult.granted) {
          Alert.alert('Camera Permission', 'Camera access is required to take photos.');
          return;
        }
      }
      
      if (permission && !permission.granted) {
        Alert.alert('Camera Permission', 'Camera access is required to take photos.');
        return;
      }
      
      // Open camera modal
      setCameraVisible(true);
      setCapturedImage(null);
    } catch (error) {
      console.error('Error handling camera capture:', error);
      Alert.alert('Error', 'Failed to open camera');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: true,
        });
        setCapturedImage(photo.uri);
        console.log('Photo captured:', photo.uri);
      } catch (error) {
        console.error('Error taking picture:', error);
        Alert.alert('Error', 'Failed to take picture');
      }
    }
  };

  const retakePicture = () => {
    setCapturedImage(null);
  };

  const usePicture = () => {
    if (capturedImage) {
      // Add to new post images
      setSelectedImages(prev => [...prev, capturedImage]);
      setCameraVisible(false);
      setCapturedImage(null);
      Alert.alert('Success', 'Photo added to your post! 📸');
    }
  };

  const removeImage = (imageIndex: number) => {
    setSelectedImages(prev => prev.filter((_, index) => index !== imageIndex));
  };


  const handleComment = async (postId: string) => {
    const commentText = commentTexts[postId] || '';
    if (!userId || !commentText.trim()) return;
    
    // Set loading state
    setCommentingPostId(postId);
    
    // Find the post to update
    const postIndex = posts.findIndex(post => post.id === postId);
    if (postIndex === -1) return;
    
    // Create a copy of posts to update
    const updatedPosts = [...posts];
    const post = updatedPosts[postIndex];
    
    // Create optimistic comment
    const optimisticComment = {
      id: `temp_${Date.now()}`,
      user_id: userId,
      comment_text: commentText,
      created_at: new Date().toISOString(),
    };
    
    // Add comment to post
    post.comments = [...post.comments, optimisticComment];
    
    // Update state immediately
    setPosts(updatedPosts);
    
    // Load user name for the commenter if not already loaded
    if (!userNames[userId]) {
      await loadUserNames([userId]);
    }
    
    // Clear input for this specific post
    setCommentTexts(prev => {
      const newTexts = { ...prev };
      delete newTexts[postId];
      return newTexts;
    });
    
    try {
      const response = await fetch(`${API_BASE_URL}/posts/${postId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, comment_text: commentText }),
      });
      
      if (!response.ok) {
        // Revert on error
        setPosts(posts);
        setCommentTexts(prev => ({ ...prev, [postId]: commentText })); // Restore comment text
        console.error('Failed to add comment');
      } else {
        // Update the temporary comment with the real one from server
        const result = await response.json();
        const realComment = result.comment;
        
        // Replace temporary comment with real one
        const finalPosts = [...posts];
        const finalPost = finalPosts[postIndex];
        finalPost.comments = finalPost.comments.map(c => 
          c.id === optimisticComment.id ? realComment : c
        );
        setPosts(finalPosts);

        // Send notification for new comment (only if commenting on someone else's post)
        if (finalPost.user_id !== userId) {
          try {
            const profileResult = await checkProfileCompletion(userId);
            const commenterName = profileResult.profileData ? 
              `${profileResult.profileData.first_name} ${profileResult.profileData.last_name}` : 
              'Someone';
            const postContent = finalPost.content_text || 'your post';
            notificationService.notifyNewComment(commenterName, postContent);
          } catch (notificationError) {
            console.error('❌ Error sending comment notification:', notificationError);
          }
        }
      }
    } catch (err) {
      // Revert on error
      setPosts(posts);
      setCommentTexts(prev => ({ ...prev, [postId]: commentText })); // Restore comment text
      console.error('Error adding comment:', err);
    } finally {
      // Clear loading state
      setCommentingPostId(null);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: Colors.background }]}>
        <LogoLoadingAnimation size={120} showBackground={true} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: Colors.background }]}>
        <ThemedText style={styles.errorText}>{error}</ThemedText>
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
        style={{ flex: 1, padding: 16, backgroundColor: Colors.background }}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View style={styles.headerRow}>
          <ThemedView style={styles.titleContainer}>
            <ThemedText type="title">Community</ThemedText>
          </ThemedView>
          <View style={styles.headerButtons}>
            <Pressable
              style={styles.refreshButton}
              onPress={loadPosts}
              accessibilityLabel="Refresh"
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

                 {/* Share Post Container - Facebook Style */}
         <ThemedView style={styles.shareContainer}>
           {/* Header with profile info */}
           <View style={styles.shareHeader}>
             <Pressable onPress={refreshProfileImage} style={styles.shareProfileImageContainer}>
               <Image
                 source={profileImageUrl ? { uri: profileImageUrl } : require('@/assets/images/partial-react-logo.png')}
                 style={styles.shareProfileImage}
                 resizeMode="cover"
               />
               {profileImageUrl && (
                 <View style={styles.imageSourceIndicator}>
                   <MaterialIcons 
                     name={profileImageUrl.startsWith('http') ? 'cloud-done' : 'phone-android'} 
                     size={12} 
                     color="white" 
                   />
                 </View>
               )}
             </Pressable>
             <View style={styles.shareUserInfo}>
               <ThemedText style={styles.shareProfileName}>
                 {userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : (userId || 'Guest')}
               </ThemedText>
             </View>
           </View>
           
           {/* Text Input Area */}
           <View style={styles.shareInputContainer}>
             <TextInput
               style={styles.shareInput}
               placeholder="Share your thoughts..."
               placeholderTextColor={Colors.textMuted}
               value={postText}
               onChangeText={setPostText}
               multiline
               textAlignVertical="top"
             />
           </View>
           
           {/* Selected images display */}
           {selectedImages.length > 0 && (
             <View style={styles.selectedImagesContainer}>
               <ThemedText style={styles.selectedImagesLabel}>Selected Images ({selectedImages.length}):</ThemedText>
               <RNScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesScrollView}>
                 {selectedImages.map((imageUri, index) => (
                   <View key={index} style={styles.selectedImageContainer}>
                     <Image source={{ uri: imageUri }} style={styles.selectedImage} resizeMode="cover" />
                     <TouchableOpacity 
                       style={styles.removeImageButton}
                       onPress={() => removeImage(index)}
                     >
                       <ThemedText style={styles.removeImageButtonText}>×</ThemedText>
                     </TouchableOpacity>
                   </View>
                 ))}
               </RNScrollView>
             </View>
           )}
           
           {/* Action Buttons Row */}
           <View style={styles.shareActionsRow}>
             <TouchableOpacity 
               style={[styles.shareActionButton, isProcessingAction && styles.disabledButton]} 
               onPress={handlePhotoUpload} 
               activeOpacity={0.7}
               disabled={isProcessingAction}
             >
               <MaterialIcons 
                 name="image" 
                 size={24} 
                 color={isProcessingAction ? Colors.icon : Colors.primary} 
               />
             </TouchableOpacity>
             <TouchableOpacity 
               style={[styles.shareActionButton, isProcessingAction && styles.disabledButton]} 
               onPress={handleLinkShare} 
               activeOpacity={0.7}
               disabled={isProcessingAction}
             >
               <FontAwesome5 
                 name="link" 
                 size={22} 
                 color={isProcessingAction ? Colors.icon : Colors.primary} 
               />
             </TouchableOpacity>
             <TouchableOpacity 
               style={[styles.shareActionButton, isProcessingAction && styles.disabledButton]} 
               onPress={handleCameraCapture} 
               activeOpacity={0.7}
               disabled={isProcessingAction}
             >
               <Ionicons 
                 name="camera" 
                 size={24} 
                 color={isProcessingAction ? Colors.icon : Colors.primary} 
               />
             </TouchableOpacity>
             <TouchableOpacity 
               style={[styles.postButton, (!postText.trim() && selectedImages.length === 0) && styles.postButtonDisabled]}
               onPress={handleCreatePost}
               disabled={!postText.trim() && selectedImages.length === 0}
             >
               <ThemedText style={[styles.postButtonText, (!postText.trim() && selectedImages.length === 0) && styles.postButtonTextDisabled]}>
                 Post
               </ThemedText>
             </TouchableOpacity>
           </View>
         </ThemedView>

         <ThemedText type="subtitle" style={styles.subtitle}>
           Recent Posts ({posts.length})
         </ThemedText>

        {posts.length > 0 ? (
          posts.map((post) => {
            const isLoading = loadingPosts.has(post.id);
            const isLoaded = loadedPosts.has(post.id);
            const postDataItem = postData[post.id];
            
            
            // Show skeleton while loading
            if (isLoading) {
              return <PostSkeleton key={post.id} postId={post.id} />;
            }
            
            // Show actual post when loaded
            if (isLoaded && postDataItem) {
              return (
            <View key={post.id} style={styles.postCard}>
              {/* Header */}
              <View style={styles.postHeader}>
                <View style={styles.userAvatarContainer}>
                  <Image
                    source={userProfileImages[postDataItem.user_id] ? { uri: userProfileImages[postDataItem.user_id] } : require('@/assets/images/partial-react-logo.png')}
                    style={styles.userAvatar}
                    resizeMode="cover"
                  />
                  {userProfileImages[postDataItem.user_id] && (
                    <View style={styles.postImageSourceIndicator}>
                      <MaterialIcons 
                        name={userProfileImages[postDataItem.user_id].startsWith('http') ? 'cloud-done' : 'phone-android'} 
                        size={10} 
                        color="white" 
                      />
                    </View>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.postUser}>
                    {(userNames[postDataItem.user_id] || (postDataItem.user_id === userId && userProfile 
                      ? `${userProfile.firstName} ${userProfile.lastName}` 
                      : postDataItem.user_id)) + ` • ${userLevels[postDataItem.user_id] ?? '...'}`}
                  </ThemedText>
                  {postDataItem.created_at && (
                    <ThemedText style={styles.postDate}>
                      {new Date(postDataItem.created_at).toLocaleDateString()}
                      {postDataItem.updated_at && postDataItem.updated_at !== postDataItem.created_at && (
                        <ThemedText style={styles.editedIndicator}> • Edited</ThemedText>
                      )}
                    </ThemedText>
                  )}
                </View>
                
                {/* Edit/Delete buttons for own posts */}
                {postDataItem.user_id === userId && (
                  <View style={styles.postActionsMenu}>
                    <TouchableOpacity 
                      onPress={() => handleEditPost(postDataItem.id, postDataItem.content_text, postDataItem.media)}
                      style={styles.actionMenuButton}
                    >
                      <MaterialIcons name="edit" size={20} color="#666" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => handleDeletePost(postDataItem.id)}
                      style={[
                        styles.actionMenuButton,
                        isProcessingAction && { opacity: 0.5 }
                      ]}
                      disabled={isProcessingAction}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons name="delete" size={20} color="#e53935" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

                             {/* Text */}
               {postDataItem.content_text && postDataItem.content_text.trim() !== '' ? (
                 <ThemedText style={styles.postContent}>{postDataItem.content_text}</ThemedText>
               ) : (
                 <ThemedText style={[styles.postContent, styles.noContentText]}>
                   📝 No text content
                 </ThemedText>
               )}

              {/* Media */}
              {postDataItem.media?.map((m, idx) => (
                <Image
                  key={idx}
                  source={{ uri: m.media_path }}
                  style={styles.postImage}
                  resizeMode="cover"
                />
              ))}

                             {/* Actions */}
               <View style={styles.postActions}>
                 <TouchableOpacity 
                   onPress={() => handleLike(postDataItem.id)} 
                   style={styles.actionButton}
                   disabled={likingPostId === postDataItem.id}
                 >
                   {likingPostId === postDataItem.id ? (
                     <ActivityIndicator size="small" color="#333" />
                   ) : (
                     <Ionicons 
                       name={postDataItem.likes?.includes(userId || '') ? "heart" : "heart-outline"} 
                       size={20} 
                       color={postDataItem.likes?.includes(userId || '') ? "#e53935" : "#333"} 
                     />
                   )}
                   <ThemedText style={styles.actionText}>{postDataItem.likes?.length || 0}</ThemedText>
                 </TouchableOpacity>
                 <View style={styles.actionButton}>
                   <Ionicons name="chatbubble-outline" size={20} color="#333" />
                   <ThemedText style={styles.actionText}>{postDataItem.comments?.length || 0}</ThemedText>
                 </View>
               </View>

              {/* Comments */}
              {postDataItem.comments?.slice(0, 2).map((c, i) => (
                <ThemedText key={i} style={styles.commentText}>
                  <ThemedText style={{ fontWeight: 'bold' }}>{userNames[c.user_id] || c.user_id}: </ThemedText>
                  {c.comment_text}
                </ThemedText>
              ))}

                             {/* Add Comment */}
               <View style={styles.commentInputRow}>
                 <TextInput
                   value={commentTexts[postDataItem.id] || ''}
                   onChangeText={(text) => setCommentTexts(prev => ({ ...prev, [postDataItem.id]: text }))}
                   placeholder="Write a comment..."
                   style={styles.commentInput}
                   editable={commentingPostId !== postDataItem.id}
                 />
                 <TouchableOpacity 
                   onPress={() => handleComment(postDataItem.id)}
                   disabled={commentingPostId === postDataItem.id}
                   style={commentingPostId === postDataItem.id ? styles.disabledButton : null}
                 >
                   {commentingPostId === postDataItem.id ? (
                     <ActivityIndicator size="small" color="#007AFF" />
                   ) : (
                     <Ionicons name="send" size={20} color="#007AFF" />
                   )}
                 </TouchableOpacity>
               </View>
            </View>
              );
            }
            
            // Return null for posts that haven't loaded yet
            return null;
          })
        ) : (
          <View style={styles.emptyState}>
            <ThemedText style={styles.emptyStateText}>No posts found</ThemedText>
            <ThemedText style={styles.emptyStateSubtext}>Be the first to share something!</ThemedText>
          </View>
        )}
      </RNScrollView>


      {/* Camera Modal */}
      <Modal
        visible={cameraVisible}
        animationType="slide"
        onRequestClose={() => setCameraVisible(false)}
      >
        <View style={styles.cameraContainer}>
          {!capturedImage ? (
            <>
                             <CameraView
                 ref={cameraRef}
                 style={styles.camera}
                 facing="back"
               />
              <View style={styles.cameraControls}>
                <TouchableOpacity 
                  style={styles.cameraButton} 
                  onPress={() => setCameraVisible(false)}
                >
                  <ThemedText style={styles.cameraButtonText}>Cancel</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.captureButton} 
                  onPress={takePicture}
                >
                  <View style={styles.captureButtonInner} />
                </TouchableOpacity>
                <View style={styles.cameraButton} />
              </View>
            </>
          ) : (
            <>
              <Image source={{ uri: capturedImage }} style={styles.camera} />
              <View style={styles.cameraControls}>
                <TouchableOpacity 
                  style={styles.cameraButton} 
                  onPress={retakePicture}
                >
                  <ThemedText style={styles.cameraButtonText}>Retake</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.captureButton} 
                  onPress={usePicture}
                >
                  <ThemedText style={styles.captureButtonText}>Use Photo</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.cameraButton} 
                  onPress={() => setCameraVisible(false)}
                >
                  <ThemedText style={styles.cameraButtonText}>Cancel</ThemedText>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </Modal>

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => setShowPostModal(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Post Creation Modal */}
      <Modal
        visible={showPostModal}
        animationType="slide"
        onRequestClose={() => setShowPostModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => setShowPostModal(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
            <ThemedText style={styles.modalTitle}>Create Post</ThemedText>
            <TouchableOpacity 
              onPress={createPost}
              style={[styles.modalPostButton, submittingPost && styles.modalPostButtonDisabled]}
              disabled={submittingPost}
            >
              {submittingPost ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <ThemedText style={styles.modalPostButtonText}>Post</ThemedText>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <TextInput
              style={styles.postTextInput}
              placeholder="What's on your mind?"
              placeholderTextColor="#999"
              value={postContent}
              onChangeText={setPostContent}
              multiline
              textAlignVertical="top"
            />

            {/* Image Preview */}
            {postImages.length > 0 && (
              <View style={styles.imagePreviewContainer}>
                {postImages.map((image, index) => (
                  <View key={index} style={styles.imagePreviewItem}>
                    <Image source={{ uri: image }} style={styles.imagePreview} />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => setPostImages(prev => prev.filter((_, i) => i !== index))}
                    >
                      <Ionicons name="close-circle" size={20} color="#ff4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Add Image Button */}
            <TouchableOpacity 
              style={styles.addImageButton}
              onPress={async () => {
                try {
                  const result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    allowsMultipleSelection: true,
                    quality: 0.8,
                  });

                  if (!result.canceled) {
                    const newImages = result.assets.map(asset => asset.uri);
                    setPostImages(prev => [...prev, ...newImages]);
                  }
                } catch (error) {
                  console.error('Error picking images:', error);
                  Alert.alert('Error', 'Failed to select images');
                }
              }}
            >
              <Ionicons name="image-outline" size={20} color="#007AFF" />
              <ThemedText style={styles.addImageButtonText}>Add Images</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Post Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowEditModal(false);
          setEditingPostId(null);
          setEditPostContent('');
          setEditExistingImages([]);
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => {
                setShowEditModal(false);
                setEditingPostId(null);
                setEditPostContent('');
                setEditExistingImages([]);
              }}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
            <ThemedText style={styles.modalTitle}>Edit Post</ThemedText>
            <TouchableOpacity
              onPress={() => editingPostId && updatePost(editingPostId, editPostContent)}
              style={[styles.saveButton, { opacity: editPostContent.trim() ? 1 : 0.5 }]}
              disabled={!editPostContent.trim() || isProcessingAction}
            >
              {isProcessingAction ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <ThemedText style={styles.saveButtonText}>Save</ThemedText>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <TextInput
              style={styles.editTextInput}
              value={editPostContent}
              onChangeText={setEditPostContent}
              placeholder="What's on your mind?"
              multiline
              textAlignVertical="top"
              maxLength={500}
            />
            <ThemedText style={styles.characterCount}>
              {editPostContent.length}/500
            </ThemedText>

            {/* Existing Images - Read Only */}
            {editExistingImages.length > 0 && (
              <View style={styles.existingImagesContainer}>
                <ThemedText style={styles.existingImagesLabel}>Images in this post:</ThemedText>
                <RNScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesScrollView}>
                  {editExistingImages.map((media, index) => (
                    <View key={index} style={styles.readOnlyImageContainer}>
                      <Image source={{ uri: media.media_path }} style={styles.selectedImage} resizeMode="cover" />
                    </View>
                  ))}
                </RNScrollView>
              </View>
            )}

          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelDelete}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModalContainer}>
            <View style={styles.deleteModalHeader}>
              <MaterialIcons name="warning" size={24} color="#e74c3c" />
              <ThemedText type="subtitle" style={styles.deleteModalTitle}>
                Delete Post
              </ThemedText>
            </View>
            
            <ThemedText style={styles.deleteModalMessage}>
              Are you sure you want to delete this post? This action cannot be undone and will permanently remove the post, all its comments, and likes.
            </ThemedText>
            
            <View style={styles.deleteModalActions}>
              <TouchableOpacity
                onPress={cancelDelete}
                style={[styles.deleteModalButton, styles.cancelButton]}
                disabled={isProcessingAction}
              >
                <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={confirmDelete}
                style={[styles.deleteModalButton, styles.deleteButton]}
                disabled={isProcessingAction}
              >
                {isProcessingAction ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <ThemedText style={styles.deleteButtonText}>Delete</ThemedText>
                )}
              </TouchableOpacity>
            </View>
          </View>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshButton: {
    padding: 8,
  },
  settingsButton: {
    padding: 8,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#222',
  },
  postCard: {
    backgroundColor: Platform.OS === 'web' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.7)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#00630F',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    ...(Platform.OS === 'web' && { backdropFilter: 'blur(10px)' }),
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  userAvatarContainer: {
    position: 'relative',
    marginRight: 10,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eee',
  },
  postImageSourceIndicator: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'white',
  },
  postUser: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D5016',
  },
  postDate: {
    fontSize: 12,
    color: '#4A6741',
  },
  postContent: {
    fontSize: 15,
    marginBottom: 8,
    color: '#2D5016',
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: '#eee',
  },
  postActions: {
    flexDirection: 'row',
    marginTop: 4,
    marginBottom: 6,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  actionText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#4A6741',
  },
  commentText: {
    fontSize: 13,
    color: '#4A6741',
    marginBottom: 4,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 14,
    marginRight: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#4A6741',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#4A6741',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#ff3b30',
    textAlign: 'center',
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
    marginBottom: 4,
  },
  scanCount: {
    fontSize: 14,
    color: '#666',
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledButtonText: {
    opacity: 0.5,
    color: '#999',
  },
  noContentText: {
    color: '#999',
    fontStyle: 'italic',
  },
  shareContainer: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  shareHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  shareProfileImageContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  shareProfileImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  imageSourceIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  shareUserInfo: {
    flex: 1,
  },
  shareProfileName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  shareUserSubtext: {
    fontSize: 14,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  shareInputContainer: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    minHeight: 60,
  },
  shareInput: {
    fontSize: 16,
    color: Colors.text,
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
    textAlignVertical: 'top',
    minHeight: 36,
  },
  shareActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 0,
    gap: 8,
    paddingHorizontal: 0,
  },
  shareActionButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginHorizontal: 2,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    minHeight: 50,
  },
  shareActionLabel: {
    marginTop: 4,
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 12,
    textAlign: 'center',
  },
  postButton: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginLeft: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  postButtonDisabled: {
    backgroundColor: '#ccc',
  },
  postButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  postButtonTextDisabled: {
    color: '#999',
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  cameraControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  cameraButton: {
    padding: 15,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    minWidth: 80,
    alignItems: 'center',
  },
  cameraButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#007AFF',
  },
  captureButtonInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
  },
  captureButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  selectedImagesContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  selectedImagesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  existingImagesContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  existingImagesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    marginBottom: 8,
  },
  readOnlyImageContainer: {
    position: 'relative',
    marginRight: 8,
  },
  imagesScrollView: {
    maxHeight: 100,
  },
  selectedImageContainer: {
    position: 'relative',
    marginRight: 8,
  },
  selectedImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  removeImageButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ff3b30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  // FAB styles
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  // Post creation modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalPostButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  modalPostButtonDisabled: {
    backgroundColor: '#ccc',
  },
  modalPostButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  postTextInput: {
    fontSize: 16,
    color: '#333',
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  imagePreviewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  imagePreviewItem: {
    position: 'relative',
    marginRight: 8,
    marginBottom: 8,
  },
  imagePreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  addImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    borderStyle: 'dashed',
  },
  addImageButtonText: {
    color: '#007AFF',
    fontSize: 16,
    marginLeft: 8,
  },
  // Skeleton loading styles
  skeletonAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
  },
  skeletonText: {
    height: 16,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 8,
    width: '100%',
  },
  skeletonContent: {
    marginVertical: 16,
  },
  skeletonActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
  },
  skeletonButton: {
    width: 60,
    height: 20,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
  },
  postActionsMenu: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionMenuButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  editedIndicator: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  },
  editTextInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 120,
    maxHeight: 200,
    backgroundColor: '#fff',
  },
  characterCount: {
    textAlign: 'right',
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  // Delete Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  deleteModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  deleteModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  deleteModalTitle: {
    marginLeft: 12,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  deleteModalMessage: {
    fontSize: 16,
    lineHeight: 24,
    color: '#666',
    marginBottom: 24,
  },
  deleteModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  deleteModalButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});
