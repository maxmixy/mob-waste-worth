import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getUserId } from '@/lib/user';

interface AuthContextType {
  user: User | null;
  userId: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('[AuthContext] 🚀 Initializing auth context...');
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('[AuthContext] 🔐 Auth state changed:', firebaseUser ? `User logged in: ${firebaseUser.uid}` : 'User logged out');
      
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // User is signed in
        setUserId(firebaseUser.uid);
        console.log('[AuthContext] ✅ User authenticated:', firebaseUser.uid);
      } else {
        // User is signed out
        setUserId(null);
        console.log('[AuthContext] ❌ User not authenticated');
      }
      
      setIsLoading(false);
    });

    // Also check for stored user ID as a fallback
    const checkStoredUserId = async () => {
      try {
        const storedUserId = await getUserId();
        if (storedUserId && !user) {
          console.log('[AuthContext] 🔍 Found stored user ID:', storedUserId);
          setUserId(storedUserId);
        }
      } catch (error) {
        console.warn('[AuthContext] Failed to check stored user ID:', error);
      }
    };

    checkStoredUserId();

    return () => unsubscribe();
  }, []);

  const isAuthenticated = !!(user && userId);

  const value: AuthContextType = {
    user,
    userId,
    isLoading,
    isAuthenticated,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
