import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/constants/Colors';
import { ColorSchemeName } from 'react-native';

type ThemeVariant = 'green';

type ThemeScheme = 'light' | 'dark';

type ThemeVariantContextValue = {
  variant: ThemeVariant;
  setVariant: (variant: ThemeVariant) => void;
  scheme: ThemeScheme;
  setScheme: (scheme: ThemeScheme) => void;
};

const ThemeVariantContext = createContext<ThemeVariantContextValue | undefined>(undefined);

export function useThemeVariant() {
  const ctx = useContext(ThemeVariantContext);
  if (!ctx) throw new Error('useThemeVariant must be used within ThemeVariantProvider');
  return ctx;
}

// Single green theme with both light and dark schemes
const VariantColors: Record<ThemeVariant, Record<'light' | 'dark', Partial<typeof Colors.light>>> = {
  green: {
    light: {
      primary: '#2e7d32',
      primaryLight: '#43a047',
      accent: '#66bb6a',
      tint: '#2e7d32',
      tabIconSelected: '#2e7d32',
      border: '#E4EAE2',
      backgroundSecondary: '#F6FBF5',
    },
    dark: {
      primary: '#66bb6a',
      primaryLight: '#81c784',
      accent: '#8bc34a',
      tint: '#8bc34a',
      tabIconSelected: '#8bc34a',
      border: '#2E3E32',
      card: '#152018',
    },
  },
};

export function getVariantColor(
  variant: ThemeVariant,
  scheme: NonNullable<ColorSchemeName>,
  token: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  const overrides = VariantColors[variant]?.[scheme];
  const value = overrides?.[token] as string | undefined;
  if (value) return value;
  return Colors[scheme][token];
}

const STORAGE_KEY = 'w2w:theme-variant';
const STORAGE_SCHEME_KEY = 'w2w:theme-scheme';

export function ThemeVariantProvider({ children }: { children: React.ReactNode }) {
  const [variant, setVariant] = useState<ThemeVariant>('green');
  const [scheme, setScheme] = useState<ThemeScheme>('light');

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved === 'green') setVariant('green');
        const savedScheme = await AsyncStorage.getItem(STORAGE_SCHEME_KEY);
        if (savedScheme === 'light' || savedScheme === 'dark') setScheme(savedScheme);
      } catch {}
    })();
  }, []);

  const setVariantPersist = async (value: ThemeVariant) => {
    setVariant(value);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, value);
    } catch {}
  };

  const setSchemePersist = async (value: ThemeScheme) => {
    setScheme(value);
    try {
      await AsyncStorage.setItem(STORAGE_SCHEME_KEY, value);
    } catch {}
  };

  const value = useMemo(() => ({ variant, setVariant: setVariantPersist, scheme, setScheme: setSchemePersist }), [variant, scheme]);

  return <ThemeVariantContext.Provider value={value}>{children}</ThemeVariantContext.Provider>;
}

export type { ThemeVariant };
export type { ThemeScheme };

