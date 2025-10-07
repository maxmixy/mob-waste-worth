import AsyncStorage from '@react-native-async-storage/async-storage';

export const USER_ID_KEY = 'userUid';
export const EULA_ACCEPTED_KEY = 'eulaAccepted';

import { API_BASE_URL } from './config';

/**
 * Persist the logged-in user's uid so other pages can read it later.
 */
export async function saveUserId(uid: string): Promise<void> {
  try {
    await AsyncStorage.setItem(USER_ID_KEY, uid);
  } catch (e) {
    // swallow errors — callers can still proceed without persisted id
    console.warn('Failed to save user id', e);
  }
}

export async function getUserId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(USER_ID_KEY);
  } catch (e) {
    console.warn('Failed to read user id', e);
    return null;
  }
}

export async function removeUserId(): Promise<void> {
  try {
    await AsyncStorage.removeItem(USER_ID_KEY);
    await AsyncStorage.removeItem(EULA_ACCEPTED_KEY);
  } catch (e) {
    console.warn('Failed to remove user id', e);
  }
}

/**
 * Check if user has accepted EULA from backend
 */
export async function checkEULAAcceptance(userId: string): Promise<{eulaAccepted: boolean, isNewUser: boolean}> {
  try {
  const response = await fetch(`${API_BASE_URL}/user/${userId}/eula`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      eulaAccepted: data.eulaAccepted || false,
      isNewUser: data.isNewUser || false
    };
  } catch (e) {
    console.warn('Failed to check EULA acceptance', e);
    // Default to requiring EULA acceptance if we can't check
    return { eulaAccepted: false, isNewUser: true };
  }
}

/**
 * Update user's EULA acceptance status on backend
 */
export async function updateEULAAcceptance(userId: string, accepted: boolean): Promise<boolean> {
  try {
  const response = await fetch(`${API_BASE_URL}/user/${userId}/eula`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eulaAccepted: accepted
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Also store locally for quick access
    if (accepted) {
      await AsyncStorage.setItem(EULA_ACCEPTED_KEY, 'true');
    } else {
      await AsyncStorage.removeItem(EULA_ACCEPTED_KEY);
    }
    
    return data.success || false;
  } catch (e) {
    console.warn('Failed to update EULA acceptance', e);
    return false;
  }
}

/**
 * Check if EULA is accepted locally (cached)
 */
export async function isEULAAcceptedLocally(): Promise<boolean> {
  try {
    const accepted = await AsyncStorage.getItem(EULA_ACCEPTED_KEY);
    return accepted === 'true';
  } catch (e) {
    console.warn('Failed to read EULA acceptance from local storage', e);
    return false;
  }
}

/**
 * Check if user has completed their profile
 */
export async function checkProfileCompletion(userId: string): Promise<{profileCompleted: boolean, profileData?: any}> {
  try {
  const response = await fetch(`${API_BASE_URL}/user/${userId}/profile`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      profileCompleted: data.profileCompleted || false,
      profileData: data.profileData || null
    };
  } catch (e) {
    console.warn('Failed to check profile completion', e);
    return { profileCompleted: false };
  }
}

/**
 * Update user's profile data
 */
export async function updateUserProfile(userId: string, profileData: any): Promise<boolean> {
  try {
  const response = await fetch(`${API_BASE_URL}/user/${userId}/profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profileData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.success || false;
  } catch (e) {
    console.warn('Failed to update user profile', e);
    return false;
  }
}

/**
 * Logout user by clearing local storage and Firebase auth
 */
export async function logoutUser(): Promise<void> {
  try {
    console.log('Starting logout process...');
    
    // Import Firebase auth dynamically to avoid circular imports
    const firebaseModule = await import('@/lib/firebaseConfig');
    const authModule = await import('firebase/auth');
    
    console.log('Firebase modules imported successfully');
    
    // Check current user and provider before logout
    if (firebaseModule.auth && firebaseModule.auth.currentUser) {
      const currentUser = firebaseModule.auth.currentUser;
      console.log('Current user found:', currentUser.uid);
      
      // Check if user signed in with Google
      const isGoogleUser = currentUser.providerData.some(provider => provider.providerId === 'google.com');
      if (isGoogleUser) {
        console.log('Google user detected - signing out from Firebase');
      }
      
      // Sign out from Firebase
      console.log('Signing out from Firebase...');
      await authModule.signOut(firebaseModule.auth);
      console.log('Firebase signout successful');
    } else {
      console.log('No current user found in Firebase auth');
    }
    
    // Clear local storage
    console.log('Clearing local storage...');
    await removeUserId();
    console.log('Local storage cleared');
    
    console.log('User logged out successfully');
  } catch (e) {
    console.error('Failed to logout user', e);
    // Still clear local storage even if Firebase logout fails
    try {
      await removeUserId();
      console.log('Local storage cleared despite Firebase error');
    } catch (clearError) {
      console.error('Failed to clear local storage', clearError);
    }
    throw e; // Re-throw the error so the UI can handle it
  }
}
