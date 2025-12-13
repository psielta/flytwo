import { useState, useEffect } from "react";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import { Link as RouterLink, useSearchParams, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  Paper,
  Link,
  CircularProgress,
  Chip,
  Divider,
} from "@mui/material";
import { useAuth } from "../auth/useAuth";
import { Logo } from "../components/Logo";
import { API_BASE_URL } from "../api/apiClientFactory";

interface InvitePreview {
  email: string;
  companyName: string;
  roles: string[];
  permissions: string[];
  expiresAt: string;
}

const AcceptInviteSchema = Yup.object().shape({
  fullName: Yup.string()
    .max(100, "Nome deve ter no maximo 100 caracteres"),
  password: Yup.string()
    .min(6, "Senha deve ter no minimo 6 caracteres")
    .required("Senha obrigatoria"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password")], "Senhas nao conferem")
    .required("Confirmacao obrigatoria"),
});

interface AcceptInviteFormValues {
  fullName: string;
  password: string;
  confirmPassword: string;
}

const initialValues: AcceptInviteFormValues = {
  fullName: "",
  password: "",
  confirmPassword: "",
};

export function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { acceptInvite, isAuthenticated } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<InvitePreview | null>(null);

  const token = searchParams.get("token") || "";

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/todos", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Fetch invite preview
  useEffect(() => {
    const fetchPreview = async () => {
      if (!token) {
        setError("Token de convite nao encontrado.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/auth/invite-preview?token=${encodeURIComponent(token)}`
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || errorData.title || "Convite invalido ou expirado");
        }

        const data: InvitePreview = await response.json();
        setPreview(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar convite");
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
  }, [token]);

  const handleSubmit = async (
    values: AcceptInviteFormValues,
    { setSubmitting }: { setSubmitting: (isSubmitting: boolean) => void }
  ) => {
    try {
      setError(null);
      await acceptInvite({
        token,
        password: values.password,
        confirmPassword: values.confirmPassword,
        fullName: values.fullName || undefined,
      });
      navigate("/todos", { replace: true });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Falha ao aceitar convite. Tente novamente."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        p: 2,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          width: "100%",
          maxWidth: 450,
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 1, mb: 1 }}>
          <Logo size={40} color="#1976d2" />
          <Typography variant="h4" component="h1" fontWeight={700}>
            FlyTwo
          </Typography>
        </Box>
        <Typography variant="h6" align="center" color="text.secondary" sx={{ mb: 3 }}>
          Aceitar Convite
        </Typography>

        {error && !preview ? (
          <Box>
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
            <Box sx={{ textAlign: "center" }}>
              <Link component={RouterLink} to="/login" variant="body2">
                Voltar para o login
              </Link>
            </Box>
          </Box>
        ) : preview ? (
          <>
            <Box sx={{ mb: 3, p: 2, bgcolor: "action.hover", borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Voce foi convidado para:
              </Typography>
              <Typography variant="h6" gutterBottom>
                {preview.companyName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Email: <strong>{preview.email}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Valido ate: {formatDate(preview.expiresAt)}
              </Typography>

              {preview.roles.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Funcoes:
                  </Typography>
                  <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                    {preview.roles.map((role) => (
                      <Chip key={role} label={role} size="small" color="primary" />
                    ))}
                  </Box>
                </Box>
              )}

              {preview.permissions.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Permissoes:
                  </Typography>
                  <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                    {preview.permissions.map((perm) => (
                      <Chip key={perm} label={perm} size="small" variant="outlined" />
                    ))}
                  </Box>
                </Box>
              )}
            </Box>

            <Divider sx={{ mb: 3 }} />

            {error && (
              <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Formik
              initialValues={initialValues}
              validationSchema={AcceptInviteSchema}
              onSubmit={handleSubmit}
            >
              {({ values, errors, touched, handleChange, handleBlur, isSubmitting }) => (
                <Form>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <TextField
                      fullWidth
                      name="fullName"
                      label="Nome completo (opcional)"
                      value={values.fullName}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.fullName && Boolean(errors.fullName)}
                      helperText={touched.fullName && errors.fullName}
                      autoComplete="name"
                      autoFocus
                    />
                    <TextField
                      fullWidth
                      name="password"
                      label="Senha"
                      type="password"
                      value={values.password}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.password && Boolean(errors.password)}
                      helperText={touched.password && errors.password}
                      autoComplete="new-password"
                    />
                    <TextField
                      fullWidth
                      name="confirmPassword"
                      label="Confirmar senha"
                      type="password"
                      value={values.confirmPassword}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.confirmPassword && Boolean(errors.confirmPassword)}
                      helperText={touched.confirmPassword && errors.confirmPassword}
                      autoComplete="new-password"
                    />
                    <Button
                      type="submit"
                      variant="contained"
                      size="large"
                      disabled={isSubmitting}
                      fullWidth
                      sx={{ mt: 1 }}
                    >
                      {isSubmitting ? <CircularProgress size={24} color="inherit" /> : "Criar Conta"}
                    </Button>
                  </Box>
                </Form>
              )}
            </Formik>

            <Box sx={{ mt: 3, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                Ja tem uma conta?{" "}
                <Link component={RouterLink} to="/login">
                  Entrar
                </Link>
              </Typography>
            </Box>
          </>
        ) : null}
      </Paper>
    </Box>
  );
}
