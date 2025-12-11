import { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { router } from 'expo-router';
import {
  Text,
  TextInput,
  Button,
  HelperText,
  Surface,
  useTheme,
  Snackbar,
} from 'react-native-paper';
import { useAuth } from '../../src/auth/useAuth';
import { Logo } from '../../src/components/Logo';

const RegisterSchema = Yup.object().shape({
  email: Yup.string()
    .email('Email invalido')
    .required('Email obrigatorio'),
  fullName: Yup.string()
    .max(100, 'Nome deve ter no maximo 100 caracteres'),
  password: Yup.string()
    .min(6, 'Senha deve ter no minimo 6 caracteres')
    .required('Senha obrigatoria'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password')], 'Senhas nao conferem')
    .required('Confirmacao obrigatoria'),
});

interface RegisterFormValues {
  email: string;
  fullName: string;
  password: string;
  confirmPassword: string;
}

const initialValues: RegisterFormValues = {
  email: '',
  fullName: '',
  password: '',
  confirmPassword: '',
};

export default function RegisterScreen() {
  const theme = useTheme();
  const { register } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const [secureConfirmTextEntry, setSecureConfirmTextEntry] = useState(true);

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
      router.replace('/(tabs)');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Falha ao criar conta. Tente novamente.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Surface style={[styles.surface, { backgroundColor: theme.colors.surface }]} elevation={3}>
          <View style={styles.header}>
            <Logo size={48} color={theme.colors.primary} />
            <Text variant="headlineLarge" style={styles.title}>
              FlyTwo
            </Text>
          </View>
          <Text variant="titleMedium" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
            Criar nova conta
          </Text>

          <Formik
            initialValues={initialValues}
            validationSchema={RegisterSchema}
            onSubmit={handleSubmit}
          >
            {({ values, errors, touched, handleChange, handleBlur, handleSubmit, isSubmitting }) => (
              <View style={styles.form}>
                <View style={styles.inputContainer}>
                  <TextInput
                    mode="outlined"
                    label="Email"
                    value={values.email}
                    onChangeText={handleChange('email')}
                    onBlur={handleBlur('email')}
                    error={touched.email && !!errors.email}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    left={<TextInput.Icon icon="email" />}
                  />
                  {touched.email && errors.email && (
                    <HelperText type="error" visible={true}>
                      {errors.email}
                    </HelperText>
                  )}
                </View>

                <View style={styles.inputContainer}>
                  <TextInput
                    mode="outlined"
                    label="Nome completo (opcional)"
                    value={values.fullName}
                    onChangeText={handleChange('fullName')}
                    onBlur={handleBlur('fullName')}
                    error={touched.fullName && !!errors.fullName}
                    autoCapitalize="words"
                    autoComplete="name"
                    left={<TextInput.Icon icon="account" />}
                  />
                  {touched.fullName && errors.fullName && (
                    <HelperText type="error" visible={true}>
                      {errors.fullName}
                    </HelperText>
                  )}
                </View>

                <View style={styles.inputContainer}>
                  <TextInput
                    mode="outlined"
                    label="Senha"
                    value={values.password}
                    onChangeText={handleChange('password')}
                    onBlur={handleBlur('password')}
                    error={touched.password && !!errors.password}
                    secureTextEntry={secureTextEntry}
                    autoCapitalize="none"
                    autoComplete="new-password"
                    left={<TextInput.Icon icon="lock" />}
                    right={
                      <TextInput.Icon
                        icon={secureTextEntry ? 'eye' : 'eye-off'}
                        onPress={() => setSecureTextEntry(!secureTextEntry)}
                      />
                    }
                  />
                  {touched.password && errors.password && (
                    <HelperText type="error" visible={true}>
                      {errors.password}
                    </HelperText>
                  )}
                </View>

                <View style={styles.inputContainer}>
                  <TextInput
                    mode="outlined"
                    label="Confirmar senha"
                    value={values.confirmPassword}
                    onChangeText={handleChange('confirmPassword')}
                    onBlur={handleBlur('confirmPassword')}
                    error={touched.confirmPassword && !!errors.confirmPassword}
                    secureTextEntry={secureConfirmTextEntry}
                    autoCapitalize="none"
                    autoComplete="new-password"
                    left={<TextInput.Icon icon="lock-check" />}
                    right={
                      <TextInput.Icon
                        icon={secureConfirmTextEntry ? 'eye' : 'eye-off'}
                        onPress={() => setSecureConfirmTextEntry(!secureConfirmTextEntry)}
                      />
                    }
                  />
                  {touched.confirmPassword && errors.confirmPassword && (
                    <HelperText type="error" visible={true}>
                      {errors.confirmPassword}
                    </HelperText>
                  )}
                </View>

                <Button
                  mode="contained"
                  onPress={() => handleSubmit()}
                  loading={isSubmitting}
                  disabled={isSubmitting}
                  style={styles.button}
                  contentStyle={styles.buttonContent}
                >
                  Cadastrar
                </Button>
              </View>
            )}
          </Formik>

          <View style={styles.footer}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              Ja tem uma conta?{' '}
            </Text>
            <Button
              mode="text"
              onPress={() => router.push('/(auth)/login')}
              compact
            >
              Entrar
            </Button>
          </View>
        </Surface>
      </ScrollView>

      <Snackbar
        visible={!!error}
        onDismiss={() => setError(null)}
        duration={4000}
        action={{
          label: 'Fechar',
          onPress: () => setError(null),
        }}
      >
        {error}
      </Snackbar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  surface: {
    padding: 24,
    borderRadius: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  title: {
    fontWeight: '700',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 24,
  },
  form: {
    gap: 8,
  },
  inputContainer: {
    marginBottom: 8,
  },
  button: {
    marginTop: 16,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
});
