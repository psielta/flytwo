import { useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import { getAccessToken } from "../auth/authUtils";
import { useAuth } from "../auth/useAuth";
import { useSnackbar } from "../snackbar/useSnackbar";
import { API_BASE_URL } from "../api/apiClientFactory";
import { startNotificationsHub, stopNotificationsHub } from "./notificationsHub";
import {
  fetchInbox,
  markAsRead,
  markAllAsRead,
  payloadToNotification,
} from "./notificationsApi";
import {
  type NotificationDto,
  type NotificationFilters,
  type NotificationPushedPayload,
  getSeverityColor,
} from "./notificationTypes";
import { NotificationsContext } from "./notificationsContextDef";

const DEFAULT_PAGE_SIZE = 10;

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { showSnackbar } = useSnackbar();

  // State
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(DEFAULT_PAGE_SIZE);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [filters, setFiltersState] = useState<NotificationFilters>({
    unreadOnly: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load inbox with current filters and page
  const loadInbox = useCallback(async () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchInbox({
        page,
        pageSize,
        unreadOnly: filters.unreadOnly,
        severity: filters.severity,
        fromUtc: filters.fromUtc,
        toUtc: filters.toUtc,
      });

      setNotifications(response.items);
      setTotalCount(response.totalCount);
      setTotalPages(response.totalPages);
    } catch (err) {
      console.error("[Notifications] Failed to load inbox:", err);
      setError(err instanceof Error ? err.message : "Falha ao carregar notificações");
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, page, pageSize, filters]);

  // Load specific page
  const loadPage = useCallback(async (newPage: number) => {
    setPage(newPage);
  }, []);

  // Update filters
  const setFilters = useCallback((newFilters: Partial<NotificationFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...newFilters }));
    setPage(1); // Reset to first page when filters change
  }, []);

  // Mark single notification as read
  const markNotificationAsRead = useCallback(async (id: string) => {
    try {
      await markAsRead(id);

      // Update local state
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, readAtUtc: new Date().toISOString() } : n
        )
      );

      // Decrement unread count if it was unread
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("[Notifications] Failed to mark as read:", err);
      throw err;
    }
  }, []);

  // Mark all notifications as read
  const markAllNotificationsAsRead = useCallback(async () => {
    try {
      await markAllAsRead();

      // Update local state
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAtUtc: n.readAtUtc || new Date().toISOString() }))
      );

      // Reset unread count
      setUnreadCount(0);
    } catch (err) {
      console.error("[Notifications] Failed to mark all as read:", err);
      throw err;
    }
  }, []);

  // Refresh unread count
  const refreshUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const response = await fetchInbox({ unreadOnly: true, page: 1, pageSize: 1 });
      setUnreadCount(response.totalCount);
    } catch (err) {
      console.error("[Notifications] Failed to refresh unread count:", err);
    }
  }, [isAuthenticated]);

  // Handle incoming notification from SignalR
  const handleNotificationPushed = useCallback(
    (payload: NotificationPushedPayload) => {
      const notification = payloadToNotification(payload);

      // Add to notifications list (deduplicate by id)
      setNotifications((prev) => {
        // Check if already exists
        if (prev.some((n) => n.id === notification.id)) {
          return prev;
        }
        // Add to the beginning
        return [notification, ...prev];
      });

      // Increment unread count
      setUnreadCount((prev) => prev + 1);

      // Show toast notification
      showSnackbar(
        `${payload.title}: ${payload.message}`,
        getSeverityColor(payload.severity),
        6000
      );
    },
    [showSnackbar]
  );

  // Load inbox when filters or page change
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      loadInbox();
    }
  }, [isAuthenticated, authLoading, loadInbox]);

  // Load initial unread count
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      refreshUnreadCount();
    }
  }, [isAuthenticated, authLoading, refreshUnreadCount]);

  // SignalR connection management
  useEffect(() => {
    // Don't connect while auth is loading
    if (authLoading) return;

    if (!isAuthenticated) {
      stopNotificationsHub();
      // Clear state on logout
      setNotifications([]);
      setUnreadCount(0);
      setPage(1);
      setTotalCount(0);
      setTotalPages(0);
      return;
    }

    let cleanupFn: (() => void) | null = null;

    const connectSignalR = async () => {
      cleanupFn = await startNotificationsHub(API_BASE_URL, getAccessToken, {
        onNotificationPushed: handleNotificationPushed,
        onConnectionStateChanged: (state) => {
          console.debug("[NotificationsHub] Connection state:", state);
        },
      });
    };

    connectSignalR();

    return () => {
      cleanupFn?.();
    };
  }, [authLoading, isAuthenticated, handleNotificationPushed]);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      page,
      pageSize,
      totalCount,
      totalPages,
      filters,
      isLoading,
      error,
      loadInbox,
      loadPage,
      setFilters,
      markNotificationAsRead,
      markAllNotificationsAsRead,
      refreshUnreadCount,
    }),
    [
      notifications,
      unreadCount,
      page,
      pageSize,
      totalCount,
      totalPages,
      filters,
      isLoading,
      error,
      loadInbox,
      loadPage,
      setFilters,
      markNotificationAsRead,
      markAllNotificationsAsRead,
      refreshUnreadCount,
    ]
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}
