# FlyTwo Mobile

Aplicativo mobile React Native para o FlyTwo, utilizando Expo, React Native Paper, Formik, Yup e NSwag.

## Tecnologias

- **React Native** 0.81 + **Expo** 54
- **React Native Paper** (Material Design 3)
- **Expo Router** (navegacao baseada em arquivos)
- **Formik** + **Yup** (formularios e validacao)
- **NSwag** (geracao de cliente API TypeScript)
- **AsyncStorage** (persistencia de dados)
- **TypeScript**

## Pre-requisitos

- Node.js 18+
- npm ou yarn
- Android Studio (para emulador Android) ou dispositivo fisico
- Backend FlyTwo rodando na porta 5110

## Instalacao

```bash
# Instalar dependencias
npm install

# Gerar cliente API (backend deve estar rodando)
npm run generate-api
```

## Executando o App

```bash
# Iniciar servidor de desenvolvimento
npm start

# Ou diretamente para Android
npm run android

# Ou para iOS (apenas macOS)
npm run ios

# Ou para web
npm run web
```

## Estrutura do Projeto

```
flytwo-mobile/
├── app/                          # Telas (Expo Router)
│   ├── _layout.tsx               # Layout raiz com AuthProvider
│   ├── (auth)/                   # Telas publicas (login, registro)
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (tabs)/                   # Telas protegidas (autenticado)
│   │   ├── _layout.tsx
│   │   ├── index.tsx             # Home com info do usuario
│   │   └── explore.tsx
│   └── modal.tsx
├── src/
│   ├── api/
│   │   ├── api-client.ts         # Cliente API gerado pelo NSwag
│   │   └── apiClientFactory.ts   # Factory com injecao de token
│   ├── auth/
│   │   ├── AuthContext.tsx       # Provider de autenticacao
│   │   ├── authTypes.ts          # Tipos TypeScript
│   │   ├── authUtils.ts          # Helpers AsyncStorage
│   │   └── useAuth.ts            # Hook customizado
│   └── components/
│       └── Logo.tsx              # Componente do logo FlyTwo
├── components/                   # Componentes compartilhados
├── assets/                       # Imagens e icones
├── nswag.json                    # Configuracao NSwag
└── package.json
```

## Autenticacao

O sistema de autenticacao implementa:

- **Login** - Autenticacao com email e senha
- **Registro** - Criacao de nova conta
- **Logout** - Encerramento de sessao
- **Persistencia** - Token JWT salvo no AsyncStorage
- **Protecao de rotas** - Redirecionamento automatico baseado em estado de autenticacao

### Fluxo de Autenticacao

1. Usuario acessa o app
2. Se nao autenticado -> Redireciona para login
3. Se autenticado -> Redireciona para home (tabs)
4. Token JWT persistido no AsyncStorage
5. Token injetado automaticamente nas requisicoes API

## Geracao do Cliente API (NSwag)

O cliente API TypeScript e gerado automaticamente a partir do Swagger do backend.

```bash
# Certifique-se que o backend esta rodando em localhost:5110
npm run generate-api
```

**Configuracao:** `nswag.json`
- URL do Swagger: `http://localhost:5110/swagger/v1/swagger.json`
- Output: `src/api/api-client.ts`
- Template: Fetch API

## Formularios com Formik + Yup

Padrao de integracao com React Native Paper:

```tsx
import { Formik } from 'formik';
import * as Yup from 'yup';
import { TextInput, HelperText, Button } from 'react-native-paper';

const Schema = Yup.object().shape({
  email: Yup.string().email('Email invalido').required('Obrigatorio'),
  password: Yup.string().min(6, 'Minimo 6 caracteres').required('Obrigatorio'),
});

<Formik
  initialValues={{ email: '', password: '' }}
  validationSchema={Schema}
  onSubmit={handleSubmit}
>
  {({ values, errors, touched, handleChange, handleBlur, handleSubmit }) => (
    <>
      <TextInput
        mode="outlined"
        label="Email"
        value={values.email}
        onChangeText={handleChange('email')}
        onBlur={handleBlur('email')}
        error={touched.email && !!errors.email}
      />
      {touched.email && errors.email && (
        <HelperText type="error">{errors.email}</HelperText>
      )}
      <Button mode="contained" onPress={() => handleSubmit()}>
        Enviar
      </Button>
    </>
  )}
</Formik>
```

## Tema

O app utiliza Material Design 3 com suporte automatico a tema claro/escuro baseado nas configuracoes do sistema.

- `MD3LightTheme` / `MD3DarkTheme` do React Native Paper
- Cores do tema acessiveis via `useTheme()` hook

## Configuracao do Backend

**Android Emulator:** O app esta configurado para usar `http://10.0.2.2:5110` que mapeia para `localhost` da maquina host.

Para outros ambientes, edite `src/api/apiClientFactory.ts`:

```typescript
// Android Emulator
const API_BASE_URL = 'http://10.0.2.2:5110';

// iOS Simulator ou dispositivo na mesma rede
const API_BASE_URL = 'http://192.168.x.x:5110';
```

## Scripts Disponiveis

| Script | Descricao |
|--------|-----------|
| `npm start` | Inicia o servidor Expo |
| `npm run android` | Inicia no emulador Android |
| `npm run ios` | Inicia no simulador iOS |
| `npm run web` | Inicia no navegador |
| `npm run generate-api` | Regenera cliente API do NSwag |
| `npm run lint` | Executa o linter |

## Dependencias Principais

```json
{
  "react-native-paper": "^5.14.5",
  "formik": "^2.4.9",
  "yup": "^1.7.1",
  "@react-native-async-storage/async-storage": "^2.2.0",
  "react-native-svg": "^15.15.1",
  "expo-router": "~6.0.17"
}
```

## Arquivos Importantes

| Arquivo | Descricao |
|---------|-----------|
| `app/_layout.tsx` | Layout raiz com providers (Auth, Paper, Navigation) |
| `src/auth/AuthContext.tsx` | Context de autenticacao |
| `src/auth/authUtils.ts` | Funcoes de persistencia (AsyncStorage) |
| `src/api/apiClientFactory.ts` | Factory do cliente API com token |
| `nswag.json` | Configuracao para geracao do cliente API |

## Solucao de Problemas

### Erro de conexao com o backend

1. Verifique se o backend esta rodando na porta 5110
2. No Android Emulator, use `10.0.2.2` ao inves de `localhost`
3. Em dispositivos fisicos, use o IP da maquina na rede local

### Cliente API desatualizado

Regenere o cliente apos alteracoes no backend:
```bash
npm run generate-api
```

### Limpar cache do Expo

```bash
npx expo start --clear
```
