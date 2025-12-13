/**
 * Notification scope values (matches backend NotificationScope)
 */
export const NotificationScope = {
  System: 0,
  Empresa: 1,
  Usuario: 2,
} as const;

export type NotificationScope = (typeof NotificationScope)[keyof typeof NotificationScope];

/**
 * Notification severity values (matches backend NotificationSeverity)
 */
export const NotificationSeverity = {
  Info: 0,
  Warning: 1,
  Error: 2,
  Success: 3,
} as const;

export type NotificationSeverity = (typeof NotificationSeverity)[keyof typeof NotificationSeverity];

/**
 * Notification DTO from backend
 */
export interface NotificationDto {
  id: string;
  scope: NotificationScope;
  empresaId: string | null;
  targetUserId: string | null;
  title: string;
  message: string;
  category: string | null;
  severity: NotificationSeverity;
  createdAtUtc: string;
  readAtUtc: string | null;
}

/**
 * Payload received from SignalR NotificationPushed event
 */
export interface NotificationPushedPayload {
  id: string;
  scope: NotificationScope;
  empresaId: string | null;
  targetUserId: string | null;
  title: string;
  message: string;
  category: string | null;
  severity: NotificationSeverity;
  createdAtUtc: string;
}

/**
 * Parameters for fetching inbox
 */
export interface InboxParams {
  unreadOnly?: boolean;
  page?: number;
  pageSize?: number;
  fromUtc?: string;
  toUtc?: string;
  severity?: NotificationSeverity;
}

/**
 * Paginated response from inbox endpoint
 */
export interface InboxResponse {
  items: NotificationDto[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

/**
 * Notification filters state
 */
export interface NotificationFilters {
  unreadOnly: boolean;
  severity?: NotificationSeverity;
  fromUtc?: string;
  toUtc?: string;
}

/**
 * Notifications context state
 */
export interface NotificationsState {
  notifications: NotificationDto[];
  unreadCount: number;
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  filters: NotificationFilters;
  isLoading: boolean;
  error: string | null;
}

/**
 * Helper to get severity label
 */
export function getSeverityLabel(severity: NotificationSeverity): string {
  switch (severity) {
    case NotificationSeverity.Info:
      return "Info";
    case NotificationSeverity.Warning:
      return "Aviso";
    case NotificationSeverity.Error:
      return "Erro";
    case NotificationSeverity.Success:
      return "Sucesso";
    default:
      return "Info";
  }
}

/**
 * Helper to get severity color for MUI
 */
export function getSeverityColor(
  severity: NotificationSeverity
): "info" | "warning" | "error" | "success" {
  switch (severity) {
    case NotificationSeverity.Info:
      return "info";
    case NotificationSeverity.Warning:
      return "warning";
    case NotificationSeverity.Error:
      return "error";
    case NotificationSeverity.Success:
      return "success";
    default:
      return "info";
  }
}

/**
 * Helper to get scope label
 */
export function getScopeLabel(scope: NotificationScope): string {
  switch (scope) {
    case NotificationScope.System:
      return "Sistema";
    case NotificationScope.Empresa:
      return "Empresa";
    case NotificationScope.Usuario:
      return "Pessoal";
    default:
      return "Sistema";
  }
}
