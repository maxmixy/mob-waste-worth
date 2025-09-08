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
const textLight = '#E7F1EA';         // Soft off-white for dark mode
const textSecondary = '#6B7280';     // Medium gray for secondary text
const textMuted = '#9CA3AF';         // Light gray for muted text

// Background colors
const backgroundLight = '#FFFFFF';   // Pure white
const backgroundLightSecondary = '#F9FAFB'; // Very light gray
// Deep green-charcoal palette for dark mode to match plant UI
const backgroundDark = '#0F1712';    // Deep evergreen charcoal
const backgroundDarkSecondary = '#162118'; // Slightly lighter evergreen

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
    icon: '#9BAAA0',
    tabIconDefault: '#7F8C85',
    tabIconSelected: accentGreen,
    border: '#263229',
    card: '#1A241D',
    success: success,
    warning: warning,
    error: error,
    info: info,
    primary: '#66BB6A',
    primaryLight: '#81C784',
    accent: accentGreen,
  },
};
