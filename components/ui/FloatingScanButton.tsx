import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { usePalette } from '@/hooks/usePalette';

type Props = {
  accessibilityState?: { selected?: boolean };
  onPress?: (e: any) => void;
  onLongPress?: ((e: any) => void) | null;
  children?: React.ReactNode;
};

export default function FloatingScanButton({ accessibilityState, onPress, onLongPress }: Props) {
  const P = usePalette();
  const focused = accessibilityState?.selected ?? false;

  return (
    <View pointerEvents="box-none" style={styles.wrapper}>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        accessibilityRole="button"
        style={[
          styles.button,
          {
            backgroundColor: P.primary,
            shadowColor: '#000',
          },
          focused && { transform: [{ translateY: -2 }] },
        ]}
      >
        <MaterialCommunityIcons name="cube-scan" size={28} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: -26,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  button: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
});


