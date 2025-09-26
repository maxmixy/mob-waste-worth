import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useNotifications } from '@/contexts/NotificationContext';
import { Colors } from '@/constants/Colors';

interface NotificationIconProps {
  onPress: () => void;
  size?: number;
  color?: string;
}

export default function NotificationIcon({ 
  onPress, 
  size = 24, 
  color = Colors.primary 
}: NotificationIconProps) {
  const { totalUnreadCount } = useNotifications();

  return (
    <TouchableOpacity onPress={onPress} style={styles.container}>
      <MaterialIcons name="notifications" size={size} color={color} />
      {totalUnreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {totalUnreadCount > 99 ? '99+' : totalUnreadCount.toString()}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    padding: 4,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ff4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
