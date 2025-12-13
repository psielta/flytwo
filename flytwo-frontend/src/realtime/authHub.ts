import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from "@microsoft/signalr";

export interface AuthChangedPayload {
  reason: string;
  occurredAtUtc: string;
}

export interface AuthHubOptions {
  apiBaseUrl: string;
  getAccessToken: () => string | null;
  onAuthChanged: (payload: AuthChangedPayload) => void;
  onForceLogout: (reason: string) => void;
  onConnectionStateChanged?: (state: HubConnectionState) => void;
}

let connection: HubConnection | null = null;

/**
 * Creates and configures the SignalR connection for the auth hub.
 * Uses accessTokenFactory to always get the latest token on reconnection.
 */
function createConnection(options: AuthHubOptions): HubConnection {
  const hubUrl = `${options.apiBaseUrl}/hubs/auth`;

  return new HubConnectionBuilder()
    .withUrl(hubUrl, {
      accessTokenFactory: () => options.getAccessToken() ?? "",
    })
    .withAutomaticReconnect({
      nextRetryDelayInMilliseconds: (retryContext) => {
        // Exponential backoff: 0s, 2s, 4s, 8s, 16s, then max 30s
        if (retryContext.previousRetryCount === 0) return 0;
        const delay = Math.min(
          1000 * Math.pow(2, retryContext.previousRetryCount),
          30000
        );
        return delay;
      },
    })
    .configureLogging(
      import.meta.env.DEV ? LogLevel.Information : LogLevel.Warning
    )
    .build();
}

/**
 * Sets up event handlers for the connection.
 */
function setupEventHandlers(
  conn: HubConnection,
  options: AuthHubOptions
): void {
  // Handle AuthChanged event from the server
  conn.on("AuthChanged", (payload: AuthChangedPayload) => {
    if (import.meta.env.DEV) {
      console.log("[AuthHub] AuthChanged received:", payload.reason);
    }

    // If account was deleted, force logout immediately
    if (payload.reason === "AccountDeleted") {
      options.onForceLogout(payload.reason);
      return;
    }

    // For other reasons (permissions changed, roles changed, etc.),
    // trigger a refresh to get updated token
    options.onAuthChanged(payload);
  });

  // Connection state change handlers
  conn.onreconnecting((error) => {
    if (import.meta.env.DEV) {
      console.log("[AuthHub] Reconnecting...", error?.message);
    }
    options.onConnectionStateChanged?.(HubConnectionState.Reconnecting);
  });

  conn.onreconnected((connectionId) => {
    if (import.meta.env.DEV) {
      console.log("[AuthHub] Reconnected:", connectionId);
    }
    options.onConnectionStateChanged?.(HubConnectionState.Connected);
  });

  conn.onclose((error) => {
    if (import.meta.env.DEV) {
      console.log("[AuthHub] Connection closed:", error?.message);
    }
    options.onConnectionStateChanged?.(HubConnectionState.Disconnected);
  });
}

/**
 * Starts the SignalR connection to the auth hub.
 * Should be called when the user is authenticated.
 */
export async function startAuthHub(options: AuthHubOptions): Promise<void> {
  // If already connected with same options, do nothing
  if (connection && connection.state === HubConnectionState.Connected) {
    return;
  }

  // Stop existing connection if any
  await stopAuthHub();

  connection = createConnection(options);
  setupEventHandlers(connection, options);

  try {
    await connection.start();
    if (import.meta.env.DEV) {
      console.log("[AuthHub] Connected successfully");
    }
    options.onConnectionStateChanged?.(HubConnectionState.Connected);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("[AuthHub] Failed to connect:", error);
    }
    options.onConnectionStateChanged?.(HubConnectionState.Disconnected);
    throw error;
  }
}

/**
 * Stops the SignalR connection.
 * Should be called when the user logs out.
 */
export async function stopAuthHub(): Promise<void> {
  if (connection) {
    try {
      await connection.stop();
      if (import.meta.env.DEV) {
        console.log("[AuthHub] Disconnected");
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("[AuthHub] Error stopping connection:", error);
      }
    } finally {
      connection = null;
    }
  }
}

/**
 * Gets the current connection state.
 */
export function getAuthHubState(): HubConnectionState {
  return connection?.state ?? HubConnectionState.Disconnected;
}

/**
 * Checks if the hub is currently connected.
 */
export function isAuthHubConnected(): boolean {
  return connection?.state === HubConnectionState.Connected;
}
