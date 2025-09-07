/**
 * User-friendly color palette designed for accessibility and modern UI/UX
 * Colors follow WCAG guidelines for contrast and readability
 */

// Primary brand colors - Earthy, environmental theme
const primaryGreen = '#2D5016';      // Deep forest green
const primaryGreenLight = '#4A7C59'; // Lighter forest green
const accentGreen = '#6B8E23';       // Olive green accent

// Neutral colors for text and backgrounds
const textDark = '#1A1A1A';          // Near black for high contrast
const textLight = '#FFFFFF';         // Pure white
const textSecondary = '#6B7280';     // Medium gray for secondary text
const textMuted = '#9CA3AF';         // Light gray for muted text

// Background colors
const backgroundLight = '#FFFFFF';   // Pure white
const backgroundLightSecondary = '#F9FAFB'; // Very light gray
const backgroundDark = '#111827';    // Dark gray
const backgroundDarkSecondary = '#1F2937'; // Slightly lighter dark gray

// Status colors
const success = '#10B981';           // Green for success states
const warning = '#F59E0B';           // Amber for warnings
const error = '#EF4444';             // Red for errors
const info = '#3B82F6';              // Blue for info

export const Colors = {
  light: {
    text: textDark,
    background: backgroundLight,
    backgroundSecondary: backgroundLightSecondary,
    tint: primaryGreen,
    icon: textSecondary,
    tabIconDefault: textMuted,
    tabIconSelected: primaryGreen,
    border: '#E5E7EB',
    card: backgroundLight,
    success: success,
    warning: warning,
    error: error,
    info: info,
    primary: primaryGreen,
    primaryLight: primaryGreenLight,
    accent: accentGreen,
  },
  dark: {
    text: textLight,
    background: backgroundDark,
    backgroundSecondary: backgroundDarkSecondary,
    tint: accentGreen,
    icon: textMuted,
    tabIconDefault: textSecondary,
    tabIconSelected: accentGreen,
    border: '#374151',
    card: backgroundDarkSecondary,
    success: success,
    warning: warning,
    error: error,
    info: info,
    primary: primaryGreenLight,
    primaryLight: accentGreen,
    accent: accentGreen,
  },
};
