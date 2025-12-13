import { createContext } from "react";
import type { NotificationDto, NotificationFilters } from "./notificationTypes";

export interface NotificationsContextValue {
  notifications: NotificationDto[];
  unreadCount: number;
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  filters: NotificationFilters;
  isLoading: boolean;
  error: string | null;
  // Actions
  loadInbox: () => Promise<void>;
  loadPage: (page: number) => Promise<void>;
  setFilters: (filters: Partial<NotificationFilters>) => void;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  refreshUnreadCount: () => Promise<void>;
}

export const NotificationsContext = createContext<NotificationsContextValue | null>(null);
