import { StyleSheet, Text, type TextProps } from 'react-native';
import { useResponsive } from '@/hooks/useResponsive';

import { useThemeColor } from '@/hooks/useThemeColor';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
  const { font } = useResponsive();

  return (
    <Text
      style={[
        { color },
        type === 'default' ? [styles.default, { fontSize: font(16), lineHeight: font(24) }] : undefined,
        type === 'title' ? [styles.title, { fontSize: font(34), lineHeight: font(36) }] : undefined,
        type === 'defaultSemiBold' ? [styles.defaultSemiBold, { fontSize: font(16), lineHeight: font(24) }] : undefined,
        type === 'subtitle' ? [styles.subtitle, { fontSize: font(20) }] : undefined,
        type === 'link' ? [styles.link, { fontSize: font(16), lineHeight: font(30) }] : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  link: {
    lineHeight: 30,
    fontSize: 16,
    color: '#0a7ea4',
  },
});
