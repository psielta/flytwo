import { useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import { getApiClient, API_BASE_URL, AUTH_LOGOUT_EVENT } from "../api/apiClientFactory";
import {
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setExpiresAt,
  setRefreshToken,
  setRefreshTokenExpiresAt,
  getStoredUser,
  setStoredUser,
  clearAuthStorage,
  hasValidAccessToken,
  hasValidRefreshToken,
  type StoredUser,
} from "./authUtils";
import { AuthContext, type AuthUser, type AcceptInviteData } from "./authTypes";

interface AuthResponse {
  accessToken?: string;
  expiresAt?: string;
  refreshToken?: string;
  refreshTokenExpiresAt?: string;
  email?: string;
  fullName?: string | null;
  empresaId?: string | null;
  roles?: string[];
  permissions?: string[];
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleAuthResponse = useCallback((response: AuthResponse) => {
    const accessToken = response.accessToken || "";
    const authUser: AuthUser = {
      email: response.email || "",
      fullName: response.fullName || null,
      empresaId: response.empresaId || null,
      roles: response.roles || [],
      permissions: response.permissions || [],
    };

    setAccessToken(accessToken);
    if (response.expiresAt) {
      setExpiresAt(response.expiresAt);
    }
    if (response.refreshToken) {
      setRefreshToken(response.refreshToken);
    }
    if (response.refreshTokenExpiresAt) {
      setRefreshTokenExpiresAt(response.refreshTokenExpiresAt);
    }
    setStoredUser(authUser as StoredUser);

    setToken(accessToken);
    setUser(authUser);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const client = getApiClient();
    const response = await client.login({ email, password });
    handleAuthResponse(response as AuthResponse);
  }, [handleAuthResponse]);

  const acceptInvite = useCallback(async (data: AcceptInviteData) => {
    // Call register-invite endpoint directly since it may not be in the generated client
    const response = await fetch(`${API_BASE_URL}/api/auth/register-invite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token: data.token,
        password: data.password,
        confirmPassword: data.confirmPassword,
        fullName: data.fullName,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || error.title || "Falha ao aceitar convite");
    }

    const authResponse: AuthResponse = await response.json();
    handleAuthResponse(authResponse);
  }, [handleAuthResponse]);

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();

    // Try to revoke the refresh token on the server
    if (refreshToken) {
      try {
        await fetch(`${API_BASE_URL}/api/auth/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${getAccessToken()}`,
          },
          body: JSON.stringify({ refreshToken }),
        });
      } catch {
        // Ignore errors during logout
      }
    }

    clearAuthStorage();
    setUser(null);
    setToken(null);
  }, []);

  const isAdmin = useMemo(() => {
    return user?.roles?.includes("Admin") ?? false;
  }, [user?.roles]);

  const hasPermission = useCallback((permission: string) => {
    if (!user) return false;
    // Admin bypasses all permission checks
    if (user.roles?.includes("Admin")) return true;
    // Check if user has the specific permission
    return user.permissions?.includes(permission) ?? false;
  }, [user]);

  // Refresh token and restore session
  const refreshSession = useCallback(async (): Promise<boolean> => {
    const refreshTokenValue = getRefreshToken();
    if (!refreshTokenValue || !hasValidRefreshToken()) {
      return false;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken: refreshTokenValue }),
      });

      if (!response.ok) {
        return false;
      }

      const authResponse: AuthResponse = await response.json();
      handleAuthResponse(authResponse);
      return true;
    } catch {
      return false;
    }
  }, [handleAuthResponse]);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      try {
        if (hasValidAccessToken()) {
          const storedToken = getAccessToken();
          const storedUser = getStoredUser();

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
                empresaId: meResponse.empresaId || storedUser.empresaId,
                roles: meResponse.roles || storedUser.roles,
                permissions: meResponse.permissions || storedUser.permissions,
              });
            } catch {
              // If /me fails, use stored user data
              // Token might still be valid but server is down
            }
          }
        } else if (hasValidRefreshToken()) {
          // Access token expired but refresh token is valid - try to refresh
          const refreshed = await refreshSession();
          if (!refreshed) {
            clearAuthStorage();
          }
        } else {
          // No valid tokens
          clearAuthStorage();
        }
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [refreshSession]);

  // Listen for auth:logout events from the API client
  useEffect(() => {
    const handleLogoutEvent = () => {
      setUser(null);
      setToken(null);
    };

    window.addEventListener(AUTH_LOGOUT_EVENT, handleLogoutEvent);
    return () => {
      window.removeEventListener(AUTH_LOGOUT_EVENT, handleLogoutEvent);
    };
  }, []);

  const value = useMemo(() => ({
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading,
    isAdmin,
    hasPermission,
    login,
    acceptInvite,
    logout,
  }), [user, token, isLoading, isAdmin, hasPermission, login, acceptInvite, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
