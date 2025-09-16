import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import LogoLoadingAnimation from '@/components/LogoLoadingAnimation';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export function AuthGuard({ 
  children, 
  fallback,
  redirectTo = '/(login)' 
}: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log('[AuthGuard] 🔍 Auth state check:', { isLoading, isAuthenticated });
    if (!isLoading && !isAuthenticated) {
      console.log('[AuthGuard] 🚫 User not authenticated, redirecting to login');
      // Use a small delay to ensure logout process is complete
      setTimeout(() => {
        try {
          console.log('[AuthGuard] Attempting to navigate to login page');
          router.push('/(login)');
        } catch (error) {
          console.log('[AuthGuard] Router push failed, trying replace:', error);
          try {
            router.replace('/(login)');
          } catch (replaceError) {
            console.log('[AuthGuard] Replace also failed, trying root redirect:', replaceError);
            router.push('/');
          }
        }
      }, 200);
    }
  }, [isAuthenticated, isLoading, router, redirectTo]);

  // Show loading state while checking authentication
  if (isLoading) {
    return fallback || (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <LogoLoadingAnimation size={120} showBackground={true} />
      </ThemedView>
    );
  }

  // If not authenticated, don't render children (redirect will happen)
  if (!isAuthenticated) {
    return fallback || (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <LogoLoadingAnimation size={120} showBackground={true} />
      </ThemedView>
    );
  }

  // User is authenticated, render children
  return <>{children}</>;
}

// Higher-order component version for easier use
export function withAuthGuard<P extends object>(
  Component: React.ComponentType<P>,
  redirectTo?: string
) {
  return function AuthenticatedComponent(props: P) {
    return (
      <AuthGuard redirectTo={redirectTo}>
        <Component {...props} />
      </AuthGuard>
    );
  };
}
