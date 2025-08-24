import AsyncStorage from '@react-native-async-storage/async-storage';

export const USER_ID_KEY = 'userUid';

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
  } catch (e) {
    console.warn('Failed to remove user id', e);
  }
}
