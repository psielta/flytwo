import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCESS_TOKEN_KEY = 'accessToken';
const EXPIRES_AT_KEY = 'expiresAt';
const USER_KEY = 'user';

export interface StoredUser {
  email: string;
  fullName: string | null;
  roles: string[];
}

export async function getAccessToken(): Promise<string | null> {
  return AsyncStorage.getItem(ACCESS_TOKEN_KEY);
}

export async function setAccessToken(token: string): Promise<void> {
  await AsyncStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export async function getExpiresAt(): Promise<Date | null> {
  const expiresAt = await AsyncStorage.getItem(EXPIRES_AT_KEY);
  return expiresAt ? new Date(expiresAt) : null;
}

export async function setExpiresAt(expiresAt: string | Date): Promise<void> {
  const dateStr = typeof expiresAt === 'string' ? expiresAt : expiresAt.toISOString();
  await AsyncStorage.setItem(EXPIRES_AT_KEY, dateStr);
}

export async function getStoredUser(): Promise<StoredUser | null> {
  const user = await AsyncStorage.getItem(USER_KEY);
  return user ? JSON.parse(user) : null;
}

export async function setStoredUser(user: StoredUser): Promise<void> {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function isTokenExpired(): Promise<boolean> {
  const expiresAt = await getExpiresAt();
  if (!expiresAt) return true;
  // Consider token expired 1 minute before actual expiration
  return new Date() >= new Date(expiresAt.getTime() - 60 * 1000);
}

export async function clearAuthStorage(): Promise<void> {
  await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, EXPIRES_AT_KEY, USER_KEY]);
}

export async function hasValidToken(): Promise<boolean> {
  const token = await getAccessToken();
  if (!token) return false;
  const expired = await isTokenExpired();
  return !expired;
}
