import { useState, useCallback, useMemo, type ReactNode } from "react";
import { Snackbar, Alert, type AlertColor } from "@mui/material";
import { SnackbarContext } from "./snackbarContextDef";

interface SnackbarMessage {
  id: number;
  message: string;
  severity: AlertColor;
  autoHideDuration?: number;
}

let messageIdCounter = 0;

export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<SnackbarMessage[]>([]);

  const showSnackbar = useCallback(
    (
      message: string,
      severity: AlertColor = "info",
      autoHideDuration: number = 5000
    ) => {
      const id = ++messageIdCounter;
      setMessages((prev) => [...prev, { id, message, severity, autoHideDuration }]);
    },
    []
  );

  const showSuccess = useCallback(
    (message: string) => showSnackbar(message, "success"),
    [showSnackbar]
  );

  const showError = useCallback(
    (message: string) => showSnackbar(message, "error"),
    [showSnackbar]
  );

  const showWarning = useCallback(
    (message: string) => showSnackbar(message, "warning"),
    [showSnackbar]
  );

  const showInfo = useCallback(
    (message: string) => showSnackbar(message, "info"),
    [showSnackbar]
  );

  const handleClose = useCallback((id: number) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const value = useMemo(
    () => ({
      showSnackbar,
      showSuccess,
      showError,
      showWarning,
      showInfo,
    }),
    [showSnackbar, showSuccess, showError, showWarning, showInfo]
  );

  // Get the current message to display (first in queue)
  const currentMessage = messages[0];

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      {currentMessage && (
        <Snackbar
          key={currentMessage.id}
          open={true}
          autoHideDuration={currentMessage.autoHideDuration}
          onClose={() => handleClose(currentMessage.id)}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <Alert
            onClose={() => handleClose(currentMessage.id)}
            severity={currentMessage.severity}
            variant="filled"
            sx={{ width: "100%" }}
          >
            {currentMessage.message}
          </Alert>
        </Snackbar>
      )}
    </SnackbarContext.Provider>
  );
}
