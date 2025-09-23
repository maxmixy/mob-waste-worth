/**
 * Light theme color palette based on the Kupa app design
 * Colors are optimized for modern food delivery app UI/UX
 * Consistent light theme only - no dark mode
 */

// Primary brand colors - Modern green theme from design
const primaryGreen = '#00630F';      // Main green from login/signup
const primaryGreenDark = '#004A0B';  // Darker shade for buttons
const primaryGreenLight = '#4A9B5C'; // Lighter shade for accents
const accentGreen = '#8BC34A';       // Light green accent

// Neutral colors for text and backgrounds
const textDark = '#212121';          // Dark gray for main text
const textSecondary = '#757575';     // Medium gray for secondary text  
const textMuted = '#BDBDBD';         // Light gray for muted text
const textWhite = '#FFFFFF';         // Pure white

// Background colors - Light theme only
const backgroundPrimary = '#FFFFFF';    // Pure white main background
const backgroundSecondary = '#F5F5F5';  // Very light gray secondary
const backgroundCard = '#FFFFFF';       // White card background

// Status colors
const success = '#00630F';           // Green for success states (matches primary)
const warning = '#FF9800';           // Orange for warnings  
const error = '#F44336';             // Red for errors
const info = '#2196F3';              // Blue for info

export const Colors = {
  // Main theme colors (always light)
  text: textDark,
  textSecondary: textSecondary,
  textMuted: textMuted,
  textWhite: textWhite,
  background: backgroundPrimary,
  backgroundSecondary: backgroundSecondary,
  backgroundCard: backgroundCard,
  tint: primaryGreen,
  icon: textSecondary,
  tabIconDefault: textMuted,
  tabIconSelected: primaryGreen,
  border: '#E0E0E0',
  success: success,
  warning: warning,
  error: error,
  info: info,
  primary: primaryGreen,
  primaryDark: primaryGreenDark,
  primaryLight: primaryGreenLight,
  accent: accentGreen,
  
  // Legacy support for components that still reference light/dark
  light: {
    text: textDark,
    background: backgroundPrimary,
    backgroundSecondary: backgroundSecondary,
    tint: primaryGreen,
    icon: textSecondary,
    tabIconDefault: textMuted,
    tabIconSelected: primaryGreen,
    border: '#E0E0E0',
    card: backgroundCard,
    success: success,
    warning: warning,
    error: error,
    info: info,
    primary: primaryGreen,
    primaryLight: primaryGreenLight,
    accent: accentGreen,
  },
};
