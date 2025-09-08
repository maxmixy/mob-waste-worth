import React from 'react';
import { View } from 'react-native';
import { usePalette } from '@/hooks/usePalette';

export default function TabBarBackground() {
  const P = usePalette();
  // Simple translucent background (no external dependency)
  return <View style={{ flex: 1, borderRadius: 32.5, backgroundColor: P.backgroundSecondary + 'CC' }} />;
}

export function useBottomTabOverflow() {
  return 0;
}
