import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from "@microsoft/signalr";
import type { NotificationPushedPayload } from "./notificationTypes";

export interface NotificationsHubCallbacks {
  onNotificationPushed: (payload: NotificationPushedPayload) => void;
  onConnectionStateChanged?: (state: HubConnectionState) => void;
}

/**
 * Manages a single SignalR connection instance for notifications hub.
 * Handles React StrictMode double-mount and prevents duplicate connections.
 */
class NotificationsHubManager {
  private connection: HubConnection | null = null;
  private callbacks: NotificationsHubCallbacks | null = null;
  private isConnecting = false;
  private connectionId = 0; // Tracks connection attempts to handle race conditions

  /**
   * Starts the SignalR connection to the notifications hub.
   * Returns a cleanup function to stop the connection.
   */
  async start(
    apiBaseUrl: string,
    getAccessToken: () => string | null,
    callbacks: NotificationsHubCallbacks
  ): Promise<() => void> {
    // Increment connection ID to track this specific attempt
    const thisConnectionId = ++this.connectionId;

    // If already connecting or connected, return no-op cleanup
    if (this.isConnecting) {
      return () => {};
    }

    if (this.connection?.state === HubConnectionState.Connected) {
      // Update callbacks in case they changed
      this.callbacks = callbacks;
      return () => this.stop();
    }

    // Validate token before attempting connection
    const token = getAccessToken();
    if (!token) {
      return () => {};
    }

    this.isConnecting = true;
    this.callbacks = callbacks;

    // Stop any existing connection first
    await this.stopInternal();

    // Check if this connection attempt is still valid
    if (thisConnectionId !== this.connectionId) {
      this.isConnecting = false;
      return () => {};
    }

    try {
      this.connection = this.createConnection(apiBaseUrl, getAccessToken);
      this.setupEventHandlers();

      // Check again before starting (in case stop was called during setup)
      if (thisConnectionId !== this.connectionId) {
        this.connection = null;
        this.isConnecting = false;
        return () => {};
      }

      await this.connection.start();

      // Verify connection is still valid after async start
      if (thisConnectionId !== this.connectionId) {
        await this.connection.stop();
        this.connection = null;
        this.isConnecting = false;
        return () => {};
      }

      this.callbacks?.onConnectionStateChanged?.(HubConnectionState.Connected);
    } catch (error) {
      // Only log if this is still the active connection attempt
      if (thisConnectionId === this.connectionId) {
        console.error("[NotificationsHub] Failed to connect:", error);
        this.callbacks?.onConnectionStateChanged?.(HubConnectionState.Disconnected);
      }
      this.connection = null;
    } finally {
      this.isConnecting = false;
    }

    return () => this.stop();
  }

  /**
   * Stops the SignalR connection.
   */
  async stop(): Promise<void> {
    // Increment connection ID to invalidate any in-progress connection attempts
    this.connectionId++;
    await this.stopInternal();
  }

  private async stopInternal(): Promise<void> {
    if (this.connection) {
      const conn = this.connection;
      this.connection = null;

      try {
        if (conn.state !== HubConnectionState.Disconnected) {
          await conn.stop();
        }
      } catch (error) {
        console.error("[NotificationsHub] Error stopping connection:", error);
      }
    }
  }

  private createConnection(
    apiBaseUrl: string,
    getAccessToken: () => string | null
  ): HubConnection {
    const hubUrl = `${apiBaseUrl}/hubs/notifications`;

    return new HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => getAccessToken() ?? "",
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          // Exponential backoff: 0s, 2s, 4s, 8s, 16s, then max 30s
          if (retryContext.previousRetryCount === 0) return 0;
          return Math.min(
            1000 * Math.pow(2, retryContext.previousRetryCount),
            30000
          );
        },
      })
      .configureLogging(
        import.meta.env.DEV ? LogLevel.Warning : LogLevel.Error
      )
      .build();
  }

  private setupEventHandlers(): void {
    if (!this.connection) return;

    // Handle NotificationPushed event from the server
    this.connection.on("NotificationPushed", (payload: NotificationPushedPayload) => {
      this.callbacks?.onNotificationPushed(payload);
    });

    // Connection state change handlers
    this.connection.onreconnecting(() => {
      this.callbacks?.onConnectionStateChanged?.(HubConnectionState.Reconnecting);
    });

    this.connection.onreconnected(() => {
      this.callbacks?.onConnectionStateChanged?.(HubConnectionState.Connected);
    });

    this.connection.onclose(() => {
      this.callbacks?.onConnectionStateChanged?.(HubConnectionState.Disconnected);
    });
  }

  /**
   * Gets the current connection state.
   */
  getState(): HubConnectionState {
    return this.connection?.state ?? HubConnectionState.Disconnected;
  }

  /**
   * Checks if the hub is currently connected.
   */
  isConnected(): boolean {
    return this.connection?.state === HubConnectionState.Connected;
  }
}

// Singleton instance
const notificationsHubManager = new NotificationsHubManager();

/**
 * Starts the SignalR connection to the notifications hub.
 * Returns a cleanup function to stop the connection.
 */
export async function startNotificationsHub(
  apiBaseUrl: string,
  getAccessToken: () => string | null,
  callbacks: NotificationsHubCallbacks
): Promise<() => void> {
  return notificationsHubManager.start(apiBaseUrl, getAccessToken, callbacks);
}

/**
 * Stops the SignalR connection.
 */
export async function stopNotificationsHub(): Promise<void> {
  return notificationsHubManager.stop();
}

/**
 * Gets the current connection state.
 */
export function getNotificationsHubState(): HubConnectionState {
  return notificationsHubManager.getState();
}

/**
 * Checks if the hub is currently connected.
 */
export function isNotificationsHubConnected(): boolean {
  return notificationsHubManager.isConnected();
}
