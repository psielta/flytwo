import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { getApiClient } from '../api/apiClientFactory';
import type { AuthResponse, RegisterRequest } from '../api/api-client';
import {
  getAccessToken,
  setAccessToken,
  setExpiresAt,
  getStoredUser,
  setStoredUser,
  clearAuthStorage,
  hasValidToken,
  type StoredUser,
} from './authUtils';
import { AuthContext, type AuthUser, type RegisterData } from './authTypes';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleAuthResponse = useCallback(async (response: AuthResponse) => {
    const accessToken = response.accessToken || '';
    const authUser: AuthUser = {
      email: response.email || '',
      fullName: response.fullName || null,
      roles: response.roles || [],
    };

    await setAccessToken(accessToken);
    if (response.expiresAt) {
      await setExpiresAt(response.expiresAt);
    }
    await setStoredUser(authUser as StoredUser);

    setToken(accessToken);
    setUser(authUser);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const client = getApiClient();
    const response = await client.login({ email, password });
    await handleAuthResponse(response);
  }, [handleAuthResponse]);

  const register = useCallback(async (data: RegisterData) => {
    const client = getApiClient();
    const request: RegisterRequest = {
      email: data.email,
      password: data.password,
      confirmPassword: data.confirmPassword,
      fullName: data.fullName,
    };
    const response = await client.register(request);
    await handleAuthResponse(response);
  }, [handleAuthResponse]);

  const logout = useCallback(async () => {
    await clearAuthStorage();
    setUser(null);
    setToken(null);
  }, []);

  // Initialize auth state from AsyncStorage
  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      try {
        const isValid = await hasValidToken();
        if (isValid) {
          const storedToken = await getAccessToken();
          const storedUser = await getStoredUser();

          if (storedToken && storedUser) {
            setToken(storedToken);
            setUser(storedUser);

            // Optionally verify token with /me endpoint
            try {
              const client = getApiClient();
              const meResponse = await client.me();
              setUser({
                email: meResponse.email || storedUser.email,
                fullName: meResponse.fullName || storedUser.fullName,
                roles: meResponse.roles || storedUser.roles,
              });
            } catch {
              // If /me fails, use stored user data
              // Token might still be valid but server is down
            }
          }
        } else {
          // Token expired or doesn't exist
          await clearAuthStorage();
        }
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const value = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
