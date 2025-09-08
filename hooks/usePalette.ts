import { Colors } from '@/constants/Colors';
import { useThemeVariant, getVariantColor } from '@/hooks/ThemeContext';

export function usePalette() {
  const { variant, scheme } = useThemeVariant();

  // Resolve every token from base Colors with variant overrides
  const resolved: typeof Colors.light = {
    text: getVariantColor(variant, scheme, 'text'),
    background: getVariantColor(variant, scheme, 'background'),
    backgroundSecondary: getVariantColor(variant, scheme, 'backgroundSecondary'),
    tint: getVariantColor(variant, scheme, 'tint'),
    icon: getVariantColor(variant, scheme, 'icon'),
    tabIconDefault: getVariantColor(variant, scheme, 'tabIconDefault'),
    tabIconSelected: getVariantColor(variant, scheme, 'tabIconSelected'),
    border: getVariantColor(variant, scheme, 'border'),
    card: getVariantColor(variant, scheme, 'card'),
    success: getVariantColor(variant, scheme, 'success'),
    warning: getVariantColor(variant, scheme, 'warning'),
    error: getVariantColor(variant, scheme, 'error'),
    info: getVariantColor(variant, scheme, 'info'),
    primary: getVariantColor(variant, scheme, 'primary'),
    primaryLight: getVariantColor(variant, scheme, 'primaryLight'),
    accent: getVariantColor(variant, scheme, 'accent'),
  };

  return resolved;
}


