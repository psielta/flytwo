import { useState } from "react";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  Paper,
  Link,
  CircularProgress,
} from "@mui/material";
import { useAuth } from "../auth/useAuth";
import { Logo } from "../components/Logo";

const LoginSchema = Yup.object().shape({
  email: Yup.string()
    .email("Email inválido")
    .required("Email obrigatório"),
  password: Yup.string()
    .required("Senha obrigatória"),
});

interface LoginFormValues {
  email: string;
  password: string;
}

const initialValues: LoginFormValues = {
  email: "",
  password: "",
};

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (
    values: LoginFormValues,
    { setSubmitting }: { setSubmitting: (isSubmitting: boolean) => void }
  ) => {
    try {
      setError(null);
      await login(values.email, values.password);
      navigate("/todos", { replace: true });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Falha ao fazer login. Verifique suas credenciais."
      );
    } finally {
      setSubmitting(false);
    }
  };

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
          maxWidth: 400,
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 1, mb: 1 }}>
          <Logo size={40} color="#1976d2" />
          <Typography variant="h4" component="h1" fontWeight={700}>
            FlyTwo
          </Typography>
        </Box>
        <Typography variant="h6" align="center" color="text.secondary" sx={{ mb: 3 }}>
          Entrar na sua conta
        </Typography>

        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Formik
          initialValues={initialValues}
          validationSchema={LoginSchema}
          onSubmit={handleSubmit}
        >
          {({ values, errors, touched, handleChange, handleBlur, isSubmitting }) => (
            <Form>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <TextField
                  fullWidth
                  name="email"
                  label="Email"
                  type="email"
                  value={values.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.email && Boolean(errors.email)}
                  helperText={touched.email && errors.email}
                  autoComplete="email"
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
                  autoComplete="current-password"
                />
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={isSubmitting}
                  fullWidth
                  sx={{ mt: 1 }}
                >
                  {isSubmitting ? <CircularProgress size={24} color="inherit" /> : "Entrar"}
                </Button>
              </Box>
            </Form>
          )}
        </Formik>

        <Box sx={{ mt: 3, textAlign: "center" }}>
          <Link component={RouterLink} to="/forgot-password" variant="body2">
            Esqueceu sua senha?
          </Link>
        </Box>

        <Box sx={{ mt: 2, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            Não tem uma conta?{" "}
            <Link component={RouterLink} to="/register">
              Cadastre-se
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
