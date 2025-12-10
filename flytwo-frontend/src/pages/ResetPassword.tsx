import { useState } from "react";
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
} from "@mui/material";
import { getApiClient } from "../api/apiClientFactory";

const ResetPasswordSchema = Yup.object().shape({
  newPassword: Yup.string()
    .min(6, "Senha deve ter no mínimo 6 caracteres")
    .required("Nova senha obrigatória"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("newPassword")], "Senhas não conferem")
    .required("Confirmação obrigatória"),
});

interface ResetPasswordFormValues {
  newPassword: string;
  confirmPassword: string;
}

const initialValues: ResetPasswordFormValues = {
  newPassword: "",
  confirmPassword: "",
};

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const email = searchParams.get("email") || "";
  const token = searchParams.get("token") || "";

  const isValidLink = email && token;

  const handleSubmit = async (
    values: ResetPasswordFormValues,
    { setSubmitting }: { setSubmitting: (isSubmitting: boolean) => void }
  ) => {
    try {
      setError(null);
      const client = getApiClient();
      await client.resetPassword({
        email,
        token,
        newPassword: values.newPassword,
        confirmPassword: values.confirmPassword,
      });
      setSuccess(true);
      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 3000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Falha ao redefinir senha. O link pode ter expirado."
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
          Redefinir senha
        </Typography>

        {!isValidLink ? (
          <Box>
            <Alert severity="error" sx={{ mb: 2 }}>
              Link inválido. Por favor, solicite um novo link de recuperação de senha.
            </Alert>
            <Box sx={{ textAlign: "center" }}>
              <Link component={RouterLink} to="/forgot-password" variant="body2">
                Solicitar novo link
              </Link>
            </Box>
          </Box>
        ) : success ? (
          <Box>
            <Alert severity="success" sx={{ mb: 2 }}>
              Senha redefinida com sucesso! Você será redirecionado para o login...
            </Alert>
            <Box sx={{ textAlign: "center" }}>
              <Link component={RouterLink} to="/login" variant="body2">
                Ir para o login
              </Link>
            </Box>
          </Box>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Digite sua nova senha para a conta <strong>{email}</strong>.
            </Typography>

            {error && (
              <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Formik
              initialValues={initialValues}
              validationSchema={ResetPasswordSchema}
              onSubmit={handleSubmit}
            >
              {({ values, errors, touched, handleChange, handleBlur, isSubmitting }) => (
                <Form>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <TextField
                      fullWidth
                      name="newPassword"
                      label="Nova senha"
                      type="password"
                      value={values.newPassword}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.newPassword && Boolean(errors.newPassword)}
                      helperText={touched.newPassword && errors.newPassword}
                      autoComplete="new-password"
                      autoFocus
                    />
                    <TextField
                      fullWidth
                      name="confirmPassword"
                      label="Confirmar nova senha"
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
                      {isSubmitting ? (
                        <CircularProgress size={24} color="inherit" />
                      ) : (
                        "Redefinir senha"
                      )}
                    </Button>
                  </Box>
                </Form>
              )}
            </Formik>

            <Box sx={{ mt: 3, textAlign: "center" }}>
              <Link component={RouterLink} to="/login" variant="body2">
                Voltar para o login
              </Link>
            </Box>
          </>
        )}
      </Paper>
    </Box>
  );
}
