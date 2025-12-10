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

const RegisterSchema = Yup.object().shape({
  email: Yup.string()
    .email("Email inválido")
    .required("Email obrigatório"),
  fullName: Yup.string()
    .max(100, "Nome deve ter no máximo 100 caracteres"),
  password: Yup.string()
    .min(6, "Senha deve ter no mínimo 6 caracteres")
    .required("Senha obrigatória"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password")], "Senhas não conferem")
    .required("Confirmação obrigatória"),
});

interface RegisterFormValues {
  email: string;
  fullName: string;
  password: string;
  confirmPassword: string;
}

const initialValues: RegisterFormValues = {
  email: "",
  fullName: "",
  password: "",
  confirmPassword: "",
};

export function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (
    values: RegisterFormValues,
    { setSubmitting }: { setSubmitting: (isSubmitting: boolean) => void }
  ) => {
    try {
      setError(null);
      await register({
        email: values.email,
        password: values.password,
        confirmPassword: values.confirmPassword,
        fullName: values.fullName || undefined,
      });
      navigate("/todos", { replace: true });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Falha ao criar conta. Tente novamente."
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
        <Typography variant="h4" component="h1" align="center" gutterBottom>
          FlyTwo
        </Typography>
        <Typography variant="h6" align="center" color="text.secondary" sx={{ mb: 3 }}>
          Criar nova conta
        </Typography>

        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Formik
          initialValues={initialValues}
          validationSchema={RegisterSchema}
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
                  name="fullName"
                  label="Nome completo (opcional)"
                  value={values.fullName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.fullName && Boolean(errors.fullName)}
                  helperText={touched.fullName && errors.fullName}
                  autoComplete="name"
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
                  {isSubmitting ? <CircularProgress size={24} color="inherit" /> : "Cadastrar"}
                </Button>
              </Box>
            </Form>
          )}
        </Formik>

        <Box sx={{ mt: 3, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            Já tem uma conta?{" "}
            <Link component={RouterLink} to="/login">
              Entrar
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
