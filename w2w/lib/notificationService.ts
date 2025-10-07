import { getUserId } from './user';

export interface Notification {
  id: string;
  type: 'community' | 'system' | 'quest' | 'scan' | 'home';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string; // URL to navigate to when notification is clicked
  metadata?: any; // Additional data for the notification
}

class NotificationService {
  private notifications: Notification[] = [];
  private listeners: ((notifications: Notification[]) => void)[] = [];

  // Subscribe to notification updates
  subscribe(listener: (notifications: Notification[]) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Notify all listeners of changes
  private notifyListeners() {
    console.log('🔔 Service: Notifying listeners, count:', this.listeners.length);
    this.listeners.forEach(listener => listener([...this.notifications]));
  }

  // Get all notifications
  getNotifications(): Notification[] {
    return [...this.notifications];
  }

  // Get notifications by type
  getNotificationsByType(type: Notification['type']): Notification[] {
    return this.notifications.filter(n => n.type === type);
  }

  // Get unread count by type
  getUnreadCount(type?: Notification['type']): number {
    if (type) {
      return this.notifications.filter(n => n.type === type && !n.read).length;
    }
    return this.notifications.filter(n => !n.read).length;
  }

  // Add a new notification
  addNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      read: false,
    };

    this.notifications.unshift(newNotification); // Add to beginning
    this.notifyListeners();
    return newNotification;
  }

  // Mark notification as read
  markAsRead(notificationId: string) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      this.notifyListeners();
    }
  }

  // Mark all notifications as read
  markAllAsRead() {
    this.notifications.forEach(n => n.read = true);
    this.notifyListeners();
  }

  // Mark notifications by type as read
  markTypeAsRead(type: Notification['type']) {
    this.notifications.forEach(n => {
      if (n.type === type) {
        n.read = true;
      }
    });
    this.notifyListeners();
  }

  // Delete a specific notification
  deleteNotification(notificationId: string) {
    console.log('🗑️ Service: Deleting notification:', notificationId);
    console.log('🗑️ Service: Before delete, count:', this.notifications.length);
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
    console.log('🗑️ Service: After delete, count:', this.notifications.length);
    console.log('🗑️ Service: Notifying listeners...');
    this.notifyListeners();
    console.log('🗑️ Service: Listeners notified');
  }

  // Delete all notifications
  deleteAllNotifications() {
    console.log('🗑️ Service: Deleting all notifications');
    console.log('🗑️ Service: Before delete all, count:', this.notifications.length);
    this.notifications = [];
    console.log('🗑️ Service: After delete all, count:', this.notifications.length);
    console.log('🗑️ Service: Notifying listeners...');
    this.notifyListeners();
    console.log('🗑️ Service: Listeners notified');
  }

  // Delete notifications by type
  deleteNotificationsByType(type: Notification['type']) {
    this.notifications = this.notifications.filter(n => n.type !== type);
    this.notifyListeners();
  }

  // Delete read notifications
  deleteReadNotifications() {
    this.notifications = this.notifications.filter(n => !n.read);
    this.notifyListeners();
  }

  // Real-time notification methods for app events
  notifyPostCreated(postTitle: string) {
    this.addNotification({
      type: 'community',
      title: 'Post Created',
      message: `Your post "${postTitle}" has been successfully created`,
      actionUrl: '/(tabs)/community',
    });
  }

  notifyProjectCreated(projectName: string) {
    this.addNotification({
      type: 'home',
      title: 'Project Created',
      message: `Your project "${projectName}" has been created successfully`,
      actionUrl: '/(tabs)/',
    });
  }

  notifyQuestCompleted(questName: string) {
    this.addNotification({
      type: 'quest',
      title: 'Quest Completed!',
      message: `Congratulations! You completed "${questName}"`,
      actionUrl: '/(tabs)/quests',
    });
  }

  notifyStepCompleted(projectName: string, stepName: string) {
    this.addNotification({
      type: 'home',
      title: 'Step Completed!',
      message: `Great job! You completed "${stepName}" in "${projectName}"`,
      actionUrl: '/(tabs)/',
    });
  }

  notifyMaterialScanned(materialName: string) {
    this.addNotification({
      type: 'scan',
      title: 'Material Scanned',
      message: `Successfully scanned "${materialName}"`,
      actionUrl: '/(tabs)/scan',
    });
  }

  notifyProjectCompleted(projectName: string) {
    this.addNotification({
      type: 'home',
      title: 'Project Completed!',
      message: `Great job! You completed "${projectName}"`,
      actionUrl: '/(tabs)/',
    });
  }

  notifyNewPost(postAuthor: string, postContent: string) {
    this.addNotification({
      type: 'community',
      title: 'New Post',
      message: `${postAuthor} shared: "${postContent.substring(0, 50)}${postContent.length > 50 ? '...' : ''}"`,
      actionUrl: '/(tabs)/community',
    });
  }

  notifyPostSuccess(postContent: string) {
    this.addNotification({
      type: 'community',
      title: 'Post Shared Successfully!',
      message: `Your post "${postContent.substring(0, 50)}${postContent.length > 50 ? '...' : ''}" has been shared with the community`,
      actionUrl: '/(tabs)/community',
    });
  }

  notifyNewComment(commentAuthor: string, postContent: string) {
    this.addNotification({
      type: 'community',
      title: 'New Comment',
      message: `${commentAuthor} commented on your post: "${postContent.substring(0, 30)}${postContent.length > 30 ? '...' : ''}"`,
      actionUrl: '/(tabs)/community',
    });
  }

  // Initialize notification service
  initialize() {
    console.log('🔔 Notification service initialized');
    // No placeholder notifications - only real-time notifications
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
