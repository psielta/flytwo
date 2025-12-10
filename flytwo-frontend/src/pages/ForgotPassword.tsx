import { useState } from "react";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import { Link as RouterLink } from "react-router-dom";
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
import { Logo } from "../components/Logo";

const ForgotPasswordSchema = Yup.object().shape({
  email: Yup.string()
    .email("Email inválido")
    .required("Email obrigatório"),
});

interface ForgotPasswordFormValues {
  email: string;
}

const initialValues: ForgotPasswordFormValues = {
  email: "",
};

export function ForgotPassword() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (
    values: ForgotPasswordFormValues,
    { setSubmitting }: { setSubmitting: (isSubmitting: boolean) => void }
  ) => {
    try {
      setError(null);
      const client = getApiClient();
      await client.forgotPassword({ email: values.email });
      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Falha ao enviar email. Tente novamente."
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
          Recuperar senha
        </Typography>

        {success ? (
          <Box>
            <Alert severity="success" sx={{ mb: 2 }}>
              Se o email estiver cadastrado, você receberá um link para redefinir sua senha.
            </Alert>
            <Box sx={{ textAlign: "center" }}>
              <Link component={RouterLink} to="/login" variant="body2">
                Voltar para o login
              </Link>
            </Box>
          </Box>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Digite seu email e enviaremos um link para redefinir sua senha.
            </Typography>

            {error && (
              <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Formik
              initialValues={initialValues}
              validationSchema={ForgotPasswordSchema}
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
                        "Enviar link de recuperação"
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
