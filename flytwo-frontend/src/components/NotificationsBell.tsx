import { useState } from "react";
import { IconButton, Badge, Tooltip } from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import { useNotifications } from "../notifications/useNotifications";
import { NotificationsInbox } from "./NotificationsInbox";

export function NotificationsBell() {
  const { unreadCount } = useNotifications();
  const [inboxOpen, setInboxOpen] = useState(false);

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
