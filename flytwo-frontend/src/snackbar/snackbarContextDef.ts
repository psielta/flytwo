import { createContext } from "react";
import type { AlertColor } from "@mui/material";

export interface SnackbarContextValue {
  showSnackbar: (
    message: string,
    severity?: AlertColor,
    autoHideDuration?: number
  ) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showWarning: (message: string) => void;
  showInfo: (message: string) => void;
}

export const SnackbarContext = createContext<SnackbarContextValue | null>(null);
