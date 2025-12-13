import { Box, Typography, Button, Paper } from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import { useNavigate } from "react-router-dom";

interface NoPermissionProps {
  message?: string;
  showBackButton?: boolean;
}

export function NoPermission({
  message = "Você não tem permissão para acessar este recurso.",
  showBackButton = true
}: NoPermissionProps) {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "60vh",
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: 4,
          textAlign: "center",
          maxWidth: 400,
          backgroundColor: "transparent",
        }}
      >
        <LockIcon
          sx={{
            fontSize: 64,
            color: "warning.main",
            mb: 2,
          }}
        />
        <Typography variant="h5" component="h1" gutterBottom>
          Acesso Negado
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {message}
        </Typography>
        {showBackButton && (
          <Button
            variant="contained"
            onClick={() => navigate(-1)}
            sx={{ mr: 1 }}
          >
            Voltar
          </Button>
        )}
        <Button
          variant="outlined"
          onClick={() => navigate("/todos")}
        >
          Ir para Todos
        </Button>
      </Paper>
    </Box>
  );
}
