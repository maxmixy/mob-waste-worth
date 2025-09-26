import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { notificationService, Notification } from '@/lib/notificationService';

interface NotificationContextType {
  notifications: Notification[];
  unreadCounts: Record<Notification['type'], number>;
  totalUnreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => Notification;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  markTypeAsRead: (type: Notification['type']) => void;
  deleteNotification: (notificationId: string) => void;
  deleteAllNotifications: () => void;
  deleteNotificationsByType: (type: Notification['type']) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<Notification['type'], number>>({
    home: 0,
    scan: 0,
    history: 0,
    community: 0,
    quest: 0,
    system: 0,
  });
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const [forceUpdate, setForceUpdate] = useState(0);

  useEffect(() => {
    // Initialize with current notifications
    setNotifications(notificationService.getNotifications());
    updateUnreadCounts();

    // Subscribe to updates
    const unsubscribe = notificationService.subscribe((newNotifications) => {
      console.log('🔔 Context: Received notification update, count:', newNotifications.length);
      console.log('🔔 Context: New notifications:', newNotifications);
      setNotifications([...newNotifications]); // Create new array reference
      updateUnreadCounts();
      setForceUpdate(prev => prev + 1); // Force re-render
    });

    return unsubscribe;
  }, []);

  const updateUnreadCounts = () => {
    const counts: Record<Notification['type'], number> = {
      home: notificationService.getUnreadCount('home'),
      scan: notificationService.getUnreadCount('scan'),
      history: notificationService.getUnreadCount('history'),
      community: notificationService.getUnreadCount('community'),
      quest: notificationService.getUnreadCount('quest'),
      system: notificationService.getUnreadCount('system'),
    };
    
    setUnreadCounts(counts);
    setTotalUnreadCount(notificationService.getUnreadCount());
  };

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    return notificationService.addNotification(notification);
  };

  const markAsRead = (notificationId: string) => {
    notificationService.markAsRead(notificationId);
  };

  const markAllAsRead = () => {
    notificationService.markAllAsRead();
  };

  const markTypeAsRead = (type: Notification['type']) => {
    notificationService.markTypeAsRead(type);
  };

  const deleteNotification = (notificationId: string) => {
    console.log('🗑️ Context: deleteNotification called for:', notificationId);
    notificationService.deleteNotification(notificationId);
    // Force immediate state update
    const updatedNotifications = notificationService.getNotifications();
    console.log('🗑️ Context: Updated notifications count:', updatedNotifications.length);
    setNotifications([...updatedNotifications]);
    updateUnreadCounts();
  };

  const deleteAllNotifications = () => {
    console.log('🗑️ Context: deleteAllNotifications called');
    notificationService.deleteAllNotifications();
    // Force immediate state update
    const updatedNotifications = notificationService.getNotifications();
    console.log('🗑️ Context: Updated notifications count after clear all:', updatedNotifications.length);
    setNotifications([...updatedNotifications]);
    updateUnreadCounts();
  };

  const deleteNotificationsByType = (type: Notification['type']) => {
    notificationService.deleteNotificationsByType(type);
  };

  const value: NotificationContextType = {
    notifications,
    unreadCounts,
    totalUnreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    markTypeAsRead,
    deleteNotification,
    deleteAllNotifications,
    deleteNotificationsByType,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
