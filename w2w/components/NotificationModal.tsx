import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet, 
  Alert,
  Platform 
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { Notification } from '@/lib/notificationService';
import { useNotifications } from '@/contexts/NotificationContext';
import { Colors } from '@/constants/Colors';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

interface NotificationModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function NotificationModal({ 
  visible, 
  onClose
}: NotificationModalProps) {
  const router = useRouter();
  const { 
    notifications, 
    markAsRead, 
    markAllAsRead
  } = useNotifications();

  const handleNotificationPress = (notification: Notification) => {
    // Mark as read
    markAsRead(notification.id);
    
    // Navigate if action URL is provided
    if (notification.actionUrl) {
      onClose();
      router.push(notification.actionUrl as any);
    }
  };


  const handleMarkAllRead = () => {
    markAllAsRead();
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return timestamp.toLocaleDateString();
  };

  const getTypeIcon = (notificationType: Notification['type']) => {
    switch (notificationType) {
      case 'community':
        return 'people';
      case 'quest':
        return 'emoji-events';
      case 'scan':
        return 'qr-code-scanner';
      case 'home':
        return 'home';
      case 'system':
        return 'info';
      default:
        return 'notifications';
    }
  };

  const getTypeColor = (notificationType: Notification['type']) => {
    switch (notificationType) {
      case 'community':
        return '#2196F3';
      case 'quest':
        return '#FF9800';
      case 'scan':
        return '#4CAF50';
      case 'home':
        return '#9C27B0';
      case 'system':
        return '#607D8B';
      default:
        return Colors.primary;
    }
  };


  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.overlay} />
        <View style={styles.sidebar}>
          <ScrollView 
            style={styles.scrollContainer}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
            bounces={true}
          >
            {/* Header */}
            <View style={styles.header}>
              <ThemedText type="title" style={styles.headerTitle}>
                Notifications
              </ThemedText>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <MaterialIcons name="close" size={24} color={Colors.primary} />
              </TouchableOpacity>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionContainer}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={handleMarkAllRead}
              >
                <MaterialIcons name="done-all" size={16} color={Colors.primary} />
                <ThemedText style={styles.actionButtonText}>Mark All Read</ThemedText>
              </TouchableOpacity>
            </View>

            {/* Notifications List */}
            <View style={styles.notificationsList} key={notifications.length}>
              {notifications.length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialIcons name="notifications-none" size={48} color="#ccc" />
                  <ThemedText style={styles.emptyStateText}>
                    No notifications yet
                  </ThemedText>
                </View>
              ) : (
                notifications.map((notification) => (
                  <TouchableOpacity
                    key={notification.id}
                    style={[
                      styles.notificationItem,
                      !notification.read && styles.notificationItemUnread
                    ]}
                    onPress={() => handleNotificationPress(notification)}
                  >
                    <View style={styles.notificationContent}>
                      <View style={styles.notificationHeader}>
                        <View style={styles.notificationIconContainer}>
                          <MaterialIcons
                            name={getTypeIcon(notification.type)}
                            size={20}
                            color={getTypeColor(notification.type)}
                          />
                        </View>
                        <View style={styles.notificationTextContainer}>
                          <ThemedText style={styles.notificationTitle}>
                            {notification.title}
                          </ThemedText>
                          <ThemedText style={styles.notificationMessage}>
                            {notification.message}
                          </ThemedText>
                        </View>
                      </View>
                      <View style={styles.notificationFooter}>
                        <ThemedText style={styles.notificationTime}>
                          {formatTimestamp(notification.timestamp)}
                        </ThemedText>
                        {!notification.read && (
                          <View style={styles.unreadDot} />
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sidebar: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '80%',
    maxWidth: 300,
    paddingTop: 50,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRightWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary,
    backgroundColor: 'transparent',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D5016',
  },
  closeButton: {
    padding: 8,
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary,
    backgroundColor: 'transparent',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#f5f5f5',
  },
  actionButtonText: {
    marginLeft: 4,
    fontSize: 12,
    color: Colors.primary,
  },
  notificationsList: {
    flex: 1,
    paddingTop: 8,
    backgroundColor: 'transparent',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
  },
  notificationItem: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: 'transparent',
  },
  notificationItemUnread: {
    backgroundColor: '#f8f9ff',
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notificationIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  deleteButton: {
    padding: 4,
  },
  notificationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
});
