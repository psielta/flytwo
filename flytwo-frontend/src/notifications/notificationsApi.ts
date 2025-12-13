import { getAccessToken } from "../auth/authUtils";
import { API_BASE_URL } from "../api/apiClientFactory";
import type { InboxParams, InboxResponse, NotificationDto, NotificationScope, NotificationSeverity } from "./notificationTypes";

/**
 * Creates fetch options with authorization header
 */
function createAuthHeaders(): HeadersInit {
  const token = getAccessToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Fetches the notifications inbox with optional filters
 */
export async function fetchInbox(params: InboxParams = {}): Promise<InboxResponse> {
  const searchParams = new URLSearchParams();

  if (params.unreadOnly !== undefined) {
    searchParams.set("unreadOnly", String(params.unreadOnly));
  }
  if (params.page !== undefined) {
    searchParams.set("page", String(params.page));
  }
  if (params.pageSize !== undefined) {
    searchParams.set("pageSize", String(params.pageSize));
  }
  if (params.fromUtc) {
    searchParams.set("fromUtc", params.fromUtc);
  }
  if (params.toUtc) {
    searchParams.set("toUtc", params.toUtc);
  }
  if (params.severity !== undefined) {
    searchParams.set("severity", String(params.severity));
  }

  const queryString = searchParams.toString();
  const url = `${API_BASE_URL}/api/notifications/inbox${queryString ? `?${queryString}` : ""}`;

  const response = await fetch(url, {
    method: "GET",
    headers: createAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch inbox: ${response.status}`);
  }

  return response.json();
}

/**
 * Marks a single notification as read
 */
export async function markAsRead(notificationId: string): Promise<void> {
  const url = `${API_BASE_URL}/api/notifications/${notificationId}/read`;

  const response = await fetch(url, {
    method: "POST",
    headers: createAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to mark notification as read: ${response.status}`);
  }
}

/**
 * Marks all notifications as read
 */
export async function markAllAsRead(): Promise<void> {
  const url = `${API_BASE_URL}/api/notifications/read-all`;

  const response = await fetch(url, {
    method: "POST",
    headers: createAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to mark all notifications as read: ${response.status}`);
  }
}

/**
 * Fetches the unread count (fetches first page with unreadOnly=true and uses totalCount)
 */
export async function fetchUnreadCount(): Promise<number> {
  const response = await fetchInbox({ unreadOnly: true, page: 1, pageSize: 1 });
  return response.totalCount;
}

/**
 * Converts a SignalR notification payload to a NotificationDto
 */
export function payloadToNotification(payload: {
  id: string;
  scope: number;
  empresaId: string | null;
  targetUserId: string | null;
  title: string;
  message: string;
  category: string | null;
  severity: number;
  createdAtUtc: string;
}): NotificationDto {
  return {
    id: payload.id,
    scope: payload.scope as NotificationScope,
    empresaId: payload.empresaId,
    targetUserId: payload.targetUserId,
    title: payload.title,
    message: payload.message,
    category: payload.category,
    severity: payload.severity as NotificationSeverity,
    createdAtUtc: payload.createdAtUtc,
    readAtUtc: null, // New notifications are always unread
  };
}
