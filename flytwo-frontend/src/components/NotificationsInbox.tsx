import { useState } from "react";
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Button,
  Switch,
  FormControlLabel,
  Chip,
  CircularProgress,
  Alert,
  Pagination,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Collapse,
  type SelectChangeEvent,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import DoneIcon from "@mui/icons-material/Done";
import FilterListIcon from "@mui/icons-material/FilterList";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import CircleIcon from "@mui/icons-material/Circle";
import { useNotifications } from "../notifications/useNotifications";
import {
  NotificationSeverity,
  getSeverityLabel,
  getSeverityColor,
  getScopeLabel,
  type NotificationDto,
} from "../notifications/notificationTypes";

interface NotificationsInboxProps {
  open: boolean;
  onClose: () => void;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Agora";
  if (diffMins < 60) return `${diffMins} min atrás`;
  if (diffHours < 24) return `${diffHours}h atrás`;
  if (diffDays < 7) return `${diffDays}d atrás`;

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function NotificationItem({
  notification,
  onMarkAsRead,
}: {
  notification: NotificationDto;
  onMarkAsRead: (id: string) => void;
}) {
  const isUnread = !notification.readAtUtc;

  return (
    <ListItem
      sx={{
        backgroundColor: isUnread ? "action.hover" : "transparent",
        borderRadius: 1,
        mb: 0.5,
        position: "relative",
        pr: 6,
      }}
    >
      {isUnread && (
        <CircleIcon
          sx={{
            position: "absolute",
            left: 4,
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: 8,
            color: "primary.main",
          }}
        />
      )}
      <ListItemText
        primary={
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
            <Typography
              variant="subtitle2"
              fontWeight={isUnread ? 600 : 400}
              sx={{ flex: 1 }}
            >
              {notification.title}
            </Typography>
            <Chip
              size="small"
              label={getSeverityLabel(notification.severity)}
              color={getSeverityColor(notification.severity)}
              sx={{ height: 20, fontSize: "0.7rem" }}
            />
          </Box>
        }
        secondary={
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              {notification.message}
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="caption" color="text.disabled">
                {formatDate(notification.createdAtUtc)}
              </Typography>
              {notification.category && (
                <Chip
                  size="small"
                  label={notification.category}
                  variant="outlined"
                  sx={{ height: 18, fontSize: "0.65rem" }}
                />
              )}
              <Chip
                size="small"
                label={getScopeLabel(notification.scope)}
                variant="outlined"
                sx={{ height: 18, fontSize: "0.65rem" }}
              />
            </Box>
          </Box>
        }
      />
      {isUnread && (
        <ListItemSecondaryAction>
          <IconButton
            edge="end"
            size="small"
            onClick={() => onMarkAsRead(notification.id)}
            title="Marcar como lida"
          >
            <DoneIcon fontSize="small" />
          </IconButton>
        </ListItemSecondaryAction>
      )}
    </ListItem>
  );
}

export function NotificationsInbox({ open, onClose }: NotificationsInboxProps) {
  const {
    notifications,
    unreadCount,
    page,
    totalPages,
    totalCount,
    filters,
    isLoading,
    error,
    loadPage,
    setFilters,
    markNotificationAsRead,
    markAllNotificationsAsRead,
  } = useNotifications();

  const [showFilters, setShowFilters] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const handleUnreadOnlyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ unreadOnly: event.target.checked });
  };

  const handleSeverityChange = (event: SelectChangeEvent<string>) => {
    const value = event.target.value;
    setFilters({
      severity: value === "" ? undefined : (Number(value) as NotificationSeverity),
    });
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, newPage: number) => {
    loadPage(newPage);
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);
    } catch {
      // Error is logged in context
    }
  };

  const handleMarkAllAsRead = async () => {
    setIsMarkingAll(true);
    try {
      await markAllNotificationsAsRead();
    } catch {
      // Error is logged in context
    } finally {
      setIsMarkingAll(false);
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: { xs: "100%", sm: 400 } },
      }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
        {/* Header */}
        <Box
          sx={{
            p: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="h6">Notificações</Typography>
            {unreadCount > 0 && (
              <Chip
                size="small"
                label={`${unreadCount} não lida${unreadCount > 1 ? "s" : ""}`}
                color="primary"
              />
            )}
          </Box>
          <Box>
            <IconButton
              size="small"
              onClick={() => setShowFilters((prev) => !prev)}
              sx={{ mr: 1 }}
              title="Filtros"
            >
              {showFilters ? <ExpandLessIcon /> : <FilterListIcon />}
            </IconButton>
            <IconButton size="small" onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Filters */}
        <Collapse in={showFilters}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
            <Stack spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={filters.unreadOnly}
                    onChange={handleUnreadOnlyChange}
                    size="small"
                  />
                }
                label="Apenas não lidas"
              />
              <FormControl size="small" fullWidth>
                <InputLabel id="severity-filter-label">Severidade</InputLabel>
                <Select
                  labelId="severity-filter-label"
                  value={filters.severity !== undefined ? String(filters.severity) : ""}
                  onChange={handleSeverityChange}
                  label="Severidade"
                >
                  <MenuItem value="">Todas</MenuItem>
                  <MenuItem value={String(NotificationSeverity.Info)}>Info</MenuItem>
                  <MenuItem value={String(NotificationSeverity.Success)}>
                    Sucesso
                  </MenuItem>
                  <MenuItem value={String(NotificationSeverity.Warning)}>Aviso</MenuItem>
                  <MenuItem value={String(NotificationSeverity.Error)}>Erro</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </Box>
        </Collapse>

        {/* Mark all as read button */}
        {unreadCount > 0 && (
          <Box sx={{ p: 1, borderBottom: 1, borderColor: "divider" }}>
            <Button
              size="small"
              startIcon={isMarkingAll ? <CircularProgress size={16} /> : <DoneAllIcon />}
              onClick={handleMarkAllAsRead}
              disabled={isMarkingAll}
              fullWidth
            >
              Marcar todas como lidas
            </Button>
          </Box>
        )}

        {/* Content */}
        <Box sx={{ flex: 1, overflow: "auto", p: 1 }}>
          {isLoading && notifications.length === 0 ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "100%",
              }}
            >
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error" sx={{ m: 1 }}>
              {error}
            </Alert>
          ) : notifications.length === 0 ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "100%",
                color: "text.secondary",
              }}
            >
              <Typography variant="body2">Nenhuma notificação</Typography>
            </Box>
          ) : (
            <List disablePadding>
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={handleMarkAsRead}
                />
              ))}
            </List>
          )}
        </Box>

        {/* Pagination */}
        {totalPages > 1 && (
          <>
            <Divider />
            <Box
              sx={{
                p: 2,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 1,
              }}
            >
              <Typography variant="caption" color="text.secondary">
                {totalCount} notificação{totalCount > 1 ? "ões" : ""} no total
              </Typography>
              <Pagination
                count={totalPages}
                page={page}
                onChange={handlePageChange}
                size="small"
                color="primary"
              />
            </Box>
          </>
        )}
      </Box>
    </Drawer>
  );
}
