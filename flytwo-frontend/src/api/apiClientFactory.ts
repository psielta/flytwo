import { ApiClient } from "./api-client";
import {
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setExpiresAt,
  setRefreshToken,
  setRefreshTokenExpiresAt,
  setStoredUser,
  clearAuthStorage,
  hasValidRefreshToken,
  type StoredUser,
} from "../auth/authUtils";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5110";

// Auth logout event - dispatched when refresh fails
export const AUTH_LOGOUT_EVENT = "auth:logout";

// Lock to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

// Endpoints that should not trigger token refresh
const AUTH_ENDPOINTS = [
  "/api/auth/login",
  "/api/auth/refresh",
  "/api/auth/register",
  "/api/auth/register-invite",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/invite-preview",
];

function isAuthEndpoint(url: string): boolean {
  const urlLower = url.toLowerCase();
  return AUTH_ENDPOINTS.some((endpoint) => urlLower.includes(endpoint.toLowerCase()));
}

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

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken || !hasValidRefreshToken()) {
    return false;
  }

  try {
    const response = await globalThis.fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      return false;
    }

    const data: AuthResponse = await response.json();

    if (data.accessToken) {
      setAccessToken(data.accessToken);
    }
    if (data.expiresAt) {
      setExpiresAt(data.expiresAt);
    }
    if (data.refreshToken) {
      setRefreshToken(data.refreshToken);
    }
    if (data.refreshTokenExpiresAt) {
      setRefreshTokenExpiresAt(data.refreshTokenExpiresAt);
    }

    // Update stored user
    const storedUser: StoredUser = {
      email: data.email || "",
      fullName: data.fullName || null,
      empresaId: data.empresaId || null,
      roles: data.roles || [],
      permissions: data.permissions || [],
    };
    setStoredUser(storedUser);

    return true;
  } catch {
    return false;
  }
}

async function handleRefreshToken(): Promise<boolean> {
  // If already refreshing, wait for the existing promise
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = refreshAccessToken();

  try {
    const result = await refreshPromise;
    return result;
  } finally {
    isRefreshing = false;
    refreshPromise = null;
  }
}

function createFetchWithAuth(): (url: RequestInfo, init?: RequestInit) => Promise<Response> {
  return async (url: RequestInfo, init?: RequestInit): Promise<Response> => {
    const token = getAccessToken();
    const headers = new Headers(init?.headers);

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(url, { ...init, headers });

    // If 401 and not an auth endpoint, try to refresh
    if (response.status === 401 && !isAuthEndpoint(url.toString())) {
      const refreshed = await handleRefreshToken();

      if (refreshed) {
        // Retry the original request with new token
        const newToken = getAccessToken();
        const retryHeaders = new Headers(init?.headers);
        if (newToken) {
          retryHeaders.set("Authorization", `Bearer ${newToken}`);
        }
        return fetch(url, { ...init, headers: retryHeaders });
      } else {
        // Refresh failed - clear storage and dispatch logout event
        clearAuthStorage();
        window.dispatchEvent(new Event(AUTH_LOGOUT_EVENT));
      }
    }

    return response;
  };
}

export function getApiClient(): ApiClient {
  return new ApiClient(API_BASE_URL, {
    fetch: createFetchWithAuth(),
  });
}

// Get a client without auth interceptors (for public endpoints)
export function getPublicApiClient(): ApiClient {
  return new ApiClient(API_BASE_URL);
}

// Export the base URL for manual fetch calls
export { API_BASE_URL };
