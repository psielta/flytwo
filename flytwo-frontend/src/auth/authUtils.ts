const ACCESS_TOKEN_KEY = "accessToken";
const EXPIRES_AT_KEY = "expiresAt";
const USER_KEY = "user";

export interface StoredUser {
  email: string;
  fullName: string | null;
  roles: string[];
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function getExpiresAt(): Date | null {
  const expiresAt = localStorage.getItem(EXPIRES_AT_KEY);
  return expiresAt ? new Date(expiresAt) : null;
}

export function setExpiresAt(expiresAt: string | Date): void {
  const dateStr = typeof expiresAt === "string" ? expiresAt : expiresAt.toISOString();
  localStorage.setItem(EXPIRES_AT_KEY, dateStr);
}

export function getStoredUser(): StoredUser | null {
  const user = localStorage.getItem(USER_KEY);
  return user ? JSON.parse(user) : null;
}

export function setStoredUser(user: StoredUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function isTokenExpired(): boolean {
  const expiresAt = getExpiresAt();
  if (!expiresAt) return true;
  // Consider token expired 1 minute before actual expiration
  return new Date() >= new Date(expiresAt.getTime() - 60 * 1000);
}

export function clearAuthStorage(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(EXPIRES_AT_KEY);
  localStorage.removeItem(USER_KEY);
}

export function hasValidToken(): boolean {
  const token = getAccessToken();
  return !!token && !isTokenExpired();
}
