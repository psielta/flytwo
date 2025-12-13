import { useState } from "react";
import { IconButton, Badge, Tooltip } from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import { useAuth } from "../auth/useAuth";
import { Permissions } from "../auth/authTypes";
import { useNotifications } from "../notifications/useNotifications";
import { NotificationsInbox } from "./NotificationsInbox";

export function NotificationsBell() {
  const { hasPermission } = useAuth();
  const { unreadCount } = useNotifications();
  const [inboxOpen, setInboxOpen] = useState(false);

  // Don't render if user doesn't have permission to view notifications
  // (hasPermission already handles Admin bypass)
  if (!hasPermission(Permissions.NOTIFICACOES_VISUALIZAR)) {
    return null;
  }

  const handleOpen = () => {
    setInboxOpen(true);
  };

  const handleClose = () => {
    setInboxOpen(false);
  };

  return (
    <>
      <Tooltip title="Notificações">
        <IconButton color="inherit" onClick={handleOpen} sx={{ mr: 1 }}>
          <Badge
            badgeContent={unreadCount}
            color="error"
            max={99}
            invisible={unreadCount === 0}
          >
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <NotificationsInbox open={inboxOpen} onClose={handleClose} />
    </>
  );
}
