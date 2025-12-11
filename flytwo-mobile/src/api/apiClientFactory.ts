import { ApiClient } from './api-client';
import { getAccessToken } from '../auth/authUtils';

// Android Emulator uses 10.0.2.2 to access host machine's localhost
// iOS Simulator and web can use localhost directly
const API_BASE_URL = 'http://10.0.2.2:5110';

export function getApiClient(): ApiClient {
  return new ApiClient(API_BASE_URL, {
    fetch: async (url: RequestInfo, init?: RequestInit) => {
      const token = await getAccessToken();
      const headers = new Headers(init?.headers);

      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }

      return fetch(url, { ...init, headers });
    },
  });
}

// Factory function that returns a new client instance
// (recreates on each call to get updated token)
export const apiClient = getApiClient();
