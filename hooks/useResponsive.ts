import { useMemo } from 'react';
import { Dimensions, PixelRatio, Platform } from 'react-native';

// Responsive helpers for consistent sizing across web and mobile
export function useResponsive() {
  const { width } = Dimensions.get('window');

  const scale = useMemo(() => {
    // Base on a reference width of 375 (iPhone X)
    const referenceWidth = 375;
    const raw = width / referenceWidth;
    // Clamp so it doesn't get too huge on wide web screens
    return Math.min(Math.max(raw, 0.9), 1.4);
  }, [width]);

  const moderateScale = (size: number, factor = 0.5) => {
    const scaled = size * scale;
    return size + (scaled - size) * factor;
  };

  const font = (size: number) => {
    // Scale font modestly; respect platform font-scale settings
    const adjusted = moderateScale(size, Platform.OS === 'web' ? 0.35 : 0.5);
    return Math.round(PixelRatio.roundToNearestPixel(adjusted));
  };

  return { scale, moderateScale, font };
}


