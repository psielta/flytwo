import { ApiClient } from "./api-client";

const API_BASE_URL = "http://localhost:5110";

export function getApiClient(): ApiClient {
  return new ApiClient(API_BASE_URL, {
    fetch: (url: RequestInfo, init?: RequestInit) => {
      const token = localStorage.getItem("accessToken");
      const headers = new Headers(init?.headers);

      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      return fetch(url, { ...init, headers });
    },
  });
}

// Singleton para uso em componentes (recria a cada chamada para pegar token atualizado)
export const apiClient = getApiClient();
