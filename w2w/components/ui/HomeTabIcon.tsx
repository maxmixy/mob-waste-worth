import React from 'react';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';

export const HomeTabIcon = ({ color, size = 30 }: { color: string; size?: number }) => {
  return <FontAwesome5 name="home" size={size} color={color} />;
};

export default HomeTabIcon;
