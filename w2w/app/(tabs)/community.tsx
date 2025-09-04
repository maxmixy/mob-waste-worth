import { Image } from 'expo-image';
import { useEffect, useState, useRef } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, TextInput, TouchableOpacity, View, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getUserId } from '@/lib/user';
import { ScrollView as RNScrollView } from 'react-native';

import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';

const API_BASE_URL = 'http://127.0.0.1:5000';

interface PostMedia {
  media_type: string;
  media_path: string;
  order_index: number;
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
  const colorScheme = useColorScheme() ?? 'light';
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [postText, setPostText] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [commentingPostId, setCommentingPostId] = useState<string | null>(null);
  const [likingPostId, setLikingPostId] = useState<string | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const loadPosts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/posts`);
      if (!response.ok) throw new Error('Failed to fetch posts');
      const data = await response.json();
      setPosts(data);
    } catch (err) {
      console.error('Error loading posts:', err);
      setError('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      const uid = await getUserId();
      setUserId(uid);
      loadPosts();
      
      // Camera permissions are handled by useCameraPermissions hook
    })();
  }, []);

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
      const response = await fetch(`${API_BASE_URL}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          content_text: postText.trim() || '',
          status: 'published',
          images: selectedImages // Include selected images
        }),
      });
      
      if (response.ok) {
        // Clear the input and selected images
        setPostText('');
        setSelectedImages([]);
        // Reload posts to show the new one
        loadPosts();
        Alert.alert('Success', 'Post created successfully! 🎉');
      } else {
        console.error('Failed to create post');
        Alert.alert('Error', 'Failed to create post. Please try again.');
      }
    } catch (err) {
      console.error('Error creating post:', err);
      Alert.alert('Error', 'Failed to create post. Please try again.');
    }
  };

  const handlePhotoUpload = async () => {
    if (isProcessingAction) return;
    
    setIsProcessingAction(true);
    try {
      // TODO: Implement photo upload functionality
      // This would typically open an image picker using expo-image-picker
      console.log('Photo upload pressed');
      alert('Photo upload feature coming soon! 📸\n\nThis will allow you to select photos from your gallery to add to your post.');
    } catch (error) {
      console.error('Error handling photo upload:', error);
    } finally {
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
      // Add the captured image to the selected images for the post
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
    
    // Clear input
    setCommentText('');
    
    try {
      const response = await fetch(`${API_BASE_URL}/posts/${postId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, comment_text: commentText }),
      });
      
      if (!response.ok) {
        // Revert on error
        setPosts(posts);
        setCommentText(commentText); // Restore comment text
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
      }
    } catch (err) {
      // Revert on error
      setPosts(posts);
      setCommentText(commentText); // Restore comment text
      console.error('Error adding comment:', err);
    } finally {
      // Clear loading state
      setCommentingPostId(null);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: Colors[colorScheme].background }]}>
        <ActivityIndicator size="large" color={Colors[colorScheme].icon} />
        <ThemedText style={styles.loadingText}>Loading community posts...</ThemedText>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: Colors[colorScheme].background }]}>
        <ThemedText style={styles.errorText}>{error}</ThemedText>
      </View>
    );
  }

  return (
    <>
      <RNScrollView
        style={{ flex: 1, padding: 16, backgroundColor: Colors[colorScheme].background }}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View style={styles.headerRow}>
          <ThemedView style={styles.titleContainer}>
            <ThemedText type="title">Community</ThemedText>
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
         <ThemedView style={[styles.shareContainer, { flexDirection: 'column' }]}>
           {/* Top row with profile and input */}
           <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
             <View style={styles.shareProfileImageContainer}>
               <Image
                 source={require('@/assets/images/partial-react-logo.png')}
                 style={styles.shareProfileImage}
                 resizeMode="cover"
               />
             </View>
             <ThemedText style={styles.shareProfileName}>{userId || 'Guest'}</ThemedText>
             <TextInput
               style={styles.shareInput}
               placeholder="What would you like to share?"
               placeholderTextColor="#888"
               value={postText}
               onChangeText={setPostText}
             />
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
         </ThemedView>
         
                   {/* Share Options Row (Action Buttons at the bottom of the share container) */}
          <View style={styles.shareActionsRow}>
            <TouchableOpacity 
              style={[styles.shareActionButton, isProcessingAction && styles.disabledButton]} 
              onPress={handlePhotoUpload} 
              activeOpacity={0.7}
              disabled={isProcessingAction}
            >
              <ThemedText style={[styles.shareActionLabel, isProcessingAction && styles.disabledButtonText]}> 
                <MaterialIcons name="image" size={24} color={isProcessingAction ? "#ccc" : "#4285F4"} /> Photos
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.shareActionButton, isProcessingAction && styles.disabledButton]} 
              onPress={handleLinkShare} 
              activeOpacity={0.7}
              disabled={isProcessingAction}
            >
              <ThemedText style={[styles.shareActionLabel, isProcessingAction && styles.disabledButtonText]}> 
                <FontAwesome5 name="link" size={22} color={isProcessingAction ? "#ccc" : "#4caf50"} /> Links
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.shareActionButton, isProcessingAction && styles.disabledButton]} 
              onPress={handleCameraCapture} 
              activeOpacity={0.7}
              disabled={isProcessingAction}
            >
              <ThemedText style={styles.shareActionLabel}> 
                <Ionicons name="camera" size={24} color={isProcessingAction ? "#ccc" : "#fbc02d"} /> Camera
              </ThemedText>
            </TouchableOpacity>
          </View>

         <ThemedText type="subtitle" style={styles.subtitle}>
           Recent Posts ({posts.length})
         </ThemedText>

        {posts.length > 0 ? (
          posts.map((post) => (
            <View key={post.id} style={styles.postCard}>
              {/* Header */}
              <View style={styles.postHeader}>
                <Image
                  source={require('@/assets/images/partial-react-logo.png')}
                  style={styles.userAvatar}
                />
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.postUser}>{post.user_id}</ThemedText>
                  {post.created_at && (
                    <ThemedText style={styles.postDate}>
                      {new Date(post.created_at).toLocaleDateString()}
                    </ThemedText>
                  )}
                </View>
              </View>

                             {/* Text */}
               {post.content_text && post.content_text.trim() !== '' ? (
                 <ThemedText style={styles.postContent}>{post.content_text}</ThemedText>
               ) : (
                 <ThemedText style={[styles.postContent, styles.noContentText]}>
                   📝 No text content
                 </ThemedText>
               )}

              {/* Media */}
              {post.media?.map((m, idx) => (
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
                   onPress={() => handleLike(post.id)} 
                   style={styles.actionButton}
                   disabled={likingPostId === post.id}
                 >
                   {likingPostId === post.id ? (
                     <ActivityIndicator size="small" color="#333" />
                   ) : (
                     <Ionicons 
                       name={post.likes?.includes(userId || '') ? "heart" : "heart-outline"} 
                       size={20} 
                       color={post.likes?.includes(userId || '') ? "#e53935" : "#333"} 
                     />
                   )}
                   <ThemedText style={styles.actionText}>{post.likes?.length || 0}</ThemedText>
                 </TouchableOpacity>
                 <View style={styles.actionButton}>
                   <Ionicons name="chatbubble-outline" size={20} color="#333" />
                   <ThemedText style={styles.actionText}>{post.comments?.length || 0}</ThemedText>
                 </View>
               </View>

              {/* Comments */}
              {post.comments?.slice(0, 2).map((c, i) => (
                <ThemedText key={i} style={styles.commentText}>
                  <ThemedText style={{ fontWeight: 'bold' }}>{c.user_id}: </ThemedText>
                  {c.comment_text}
                </ThemedText>
              ))}

                             {/* Add Comment */}
               <View style={styles.commentInputRow}>
                 <TextInput
                   value={commentText}
                   onChangeText={setCommentText}
                   placeholder="Write a comment..."
                   style={styles.commentInput}
                   editable={commentingPostId !== post.id}
                 />
                 <TouchableOpacity 
                   onPress={() => handleComment(post.id)}
                   disabled={commentingPostId === post.id}
                   style={commentingPostId === post.id ? styles.disabledButton : null}
                 >
                   {commentingPostId === post.id ? (
                     <ActivityIndicator size="small" color="#007AFF" />
                   ) : (
                     <Ionicons name="send" size={20} color="#007AFF" />
                   )}
                 </TouchableOpacity>
               </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <ThemedText style={styles.emptyStateText}>No posts found</ThemedText>
            <ThemedText style={styles.emptyStateSubtext}>Be the first to share something!</ThemedText>
          </View>
        )}
      </RNScrollView>

      {/* Sidebar */}
      <Modal
        visible={sidebarVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setSidebarVisible(false)}
      >
        <TouchableOpacity style={styles.sidebarOverlay} activeOpacity={1} onPress={() => setSidebarVisible(false)} />
        <View style={styles.sidebarContainer}>
          <View style={styles.sidebarProfile}>
            <View style={styles.userImageContainer}>
              <Image
                source={require('@/assets/images/partial-react-logo.png')}
                style={styles.userImage}
              />
            </View>
            <ThemedText style={styles.userName}>{userId || 'Guest'}</ThemedText>
            <ThemedText style={styles.scanCount}>{posts.length} posts</ThemedText>
          </View>
        </View>
      </Modal>

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
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#eee',
  },
  postUser: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
  },
  postDate: {
    fontSize: 12,
    color: '#888',
  },
  postContent: {
    fontSize: 15,
    marginBottom: 8,
    color: '#333',
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
    color: '#333',
  },
  commentText: {
    fontSize: 13,
    color: '#555',
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
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
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
  postButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginLeft: 8,
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
});
