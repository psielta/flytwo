# FlyTwo Mobile

Aplicativo mobile React Native para o FlyTwo, utilizando Expo, React Native Paper, Formik, Yup e NSwag.

## Tecnologias

- **React Native** 0.81 + **Expo** 54
- **React Native Paper** (Material Design 3)
- **Expo Router** (navegacao baseada em arquivos)
- **Formik** + **Yup** (formularios e validacao)
- **NSwag** (geracao de cliente API TypeScript)
- **AsyncStorage** (persistencia de dados)
- **Expo SQLite** (banco de dados local)
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
│   ├── _layout.tsx               # Layout raiz com providers
│   ├── sobre.tsx                 # Tela Sobre o app
│   ├── (auth)/                   # Telas publicas (login, registro)
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (tabs)/                   # Telas protegidas (autenticado)
│   │   ├── _layout.tsx           # Layout com Header e Drawer
│   │   ├── index.tsx             # Home
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
│   ├── components/
│   │   ├── Logo.tsx              # Componente do logo FlyTwo
│   │   ├── AppHeader.tsx         # Header com avatar e theme toggle
│   │   └── AppDrawer.tsx         # Drawer lateral com menu
│   ├── database/
│   │   ├── index.ts              # Exports centralizados
│   │   ├── database.ts           # Conexao e inicializacao
│   │   ├── migrations.ts         # Sistema de migrations
│   │   └── useDatabase.ts        # Hooks para acesso ao banco
│   └── theme/
│       ├── index.ts              # Temas customizados (cores MUI)
│       └── ThemeContext.tsx      # Context para theme toggle
├── components/                   # Componentes compartilhados
├── assets/                       # Imagens e icones
├── nswag.json                    # Configuracao NSwag
└── package.json
```

## Funcionalidades

### Autenticacao
- **Login** - Autenticacao com email e senha
- **Registro** - Criacao de nova conta
- **Logout** - Via drawer lateral
- **Persistencia** - Token JWT salvo no AsyncStorage
- **Protecao de rotas** - Redirecionamento automatico

### Interface
- **Header** - Logo FlyTwo, toggle de tema e avatar do usuario
- **Drawer lateral** - Menu com opcoes (Sobre, Logout)
- **Theme Toggle** - Alternancia entre tema claro/escuro
- **Tela Sobre** - Informacoes do projeto, tecnologias e desenvolvedor

### Tema
- **Cores Material UI** - Primary `#1976d2` (azul MUI)
- **Suporte light/dark** - Toggle manual ou seguir sistema
- **Persistencia** - Preferencia salva no AsyncStorage

### Banco de Dados (SQLite)
- **Expo SQLite** - Banco de dados local nativo
- **Sistema de migrations** - Versionamento automatico do schema
- **Hooks** - `useDatabase()` e `useDatabaseInstance()`
- **Inicializacao automatica** - Banco configurado no startup do app

## Fluxo de Autenticacao

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

## Tema Customizado

O app usa cores do Material UI para consistencia com o frontend web:

```typescript
// src/theme/index.ts
const muiColors = {
  primary: '#1976d2',      // MUI primary blue
  secondary: '#9c27b0',    // MUI secondary purple
  error: '#d32f2f',        // MUI error red
  background: '#fafafa',   // MUI grey[50]
};
```

### Theme Toggle

```tsx
import { useThemeMode } from '../src/theme/ThemeContext';

const { isDark, toggleTheme, setThemeMode } = useThemeMode();

// Toggle entre light/dark
toggleTheme();

// Definir modo especifico
setThemeMode('light');  // 'light' | 'dark' | 'system'
```

## Banco de Dados Local (SQLite)

O app utiliza **expo-sqlite** para armazenamento local, preparado para cache offline e sincronizacao futura.

### Ciclo de Vida do Banco

```
App Iniciado
     │
     ▼
┌─────────────────────────────────────┐
│  _layout.tsx (AppWithTheme)         │
│  - Chama initDatabase()             │
│  - Exibe "Inicializando..." loading │
└─────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────┐
│  initDatabase() - database.ts       │
│  1. Abre/Cria arquivo flytwo.db     │
│  2. Configura PRAGMAs               │
│  3. Executa runMigrations()         │
└─────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────┐
│  runMigrations() - migrations.ts    │
│  1. Verifica versao atual           │
│  2. Aplica migrations pendentes     │
│  3. Registra versoes aplicadas      │
└─────────────────────────────────────┘
     │
     ▼
  App Pronto (dbReady = true)
```

**Quando o banco e criado:**
- O arquivo `flytwo.db` e criado **automaticamente** na primeira execucao do app
- Localizado no diretorio de dados privado do app (gerenciado pelo Expo/OS)
- Nao requer nenhuma acao manual do usuario ou desenvolvedor

**Quando as migrations rodam:**
- Sempre que o app inicia, `runMigrations()` verifica se ha migrations pendentes
- Compara a versao atual do banco (tabela `_migrations`) com as migrations definidas
- Aplica apenas as migrations com versao maior que a atual
- Cada migration e registrada na tabela `_migrations` apos execucao

**Persistencia dos dados:**
- Os dados persistem entre sessoes do app
- Dados sao removidos apenas se: (1) app for desinstalado, (2) dados do app forem limpos, ou (3) `resetDatabase()` for chamado

**Graceful Degradation:**
- Se o banco falhar na inicializacao, o app continua funcionando
- Um warning e logado no console
- Funcionalidades que dependem do banco ficam indisponiveis

### Estrutura do Database

```typescript
// src/database/database.ts
import { initDatabase, getDatabase, closeDatabase, resetDatabase } from '../src/database';

// Inicializar (chamado automaticamente no _layout.tsx)
await initDatabase();

// Obter instancia do banco
const db = await getDatabase();

// Fechar conexao
await closeDatabase();

// Resetar banco (dev/testes - APAGA TODOS OS DADOS)
await resetDatabase();
```

### Sistema de Migrations

Migrations sao executadas automaticamente na inicializacao. Para adicionar novas tabelas:

```typescript
// src/database/migrations.ts
export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    description: 'Criar tabela de controle de migrations',
    up: `CREATE TABLE IF NOT EXISTS _migrations (...)`,
  },
  // Adicionar novas migrations aqui:
  {
    version: 2,
    description: 'Criar tabela de cache de produtos',
    up: `
      CREATE TABLE IF NOT EXISTS cached_products (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        synced_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `,
  },
];
```

### Usando o Hook useDatabase

```typescript
import { useDatabase } from '../src/database';

function MyComponent() {
  const { db, isReady, error, reset } = useDatabase();

  if (!isReady) return <ActivityIndicator />;
  if (error) return <Text>Erro: {error.message}</Text>;

  const loadData = async () => {
    if (db) {
      // Consultar dados
      const items = await db.getAllAsync('SELECT * FROM cached_products');

      // Inserir dados
      await db.runAsync(
        'INSERT INTO cached_products (id, data) VALUES (?, ?)',
        '123',
        JSON.stringify({ name: 'Produto' })
      );
    }
  };

  return <Button onPress={loadData}>Carregar</Button>;
}
```

### Hook Simplificado

```typescript
import { useDatabaseInstance } from '../src/database';

function MyComponent() {
  // Retorna apenas a instancia (assume que ja foi inicializado)
  const db = useDatabaseInstance();

  // Use quando o DatabaseProvider ja garantiu a inicializacao
}
```

### Pragmas Configurados

O banco e inicializado com as seguintes otimizacoes:

```sql
PRAGMA journal_mode = WAL;      -- Write-Ahead Logging (melhor performance)
PRAGMA foreign_keys = ON;       -- Integridade referencial
PRAGMA synchronous = NORMAL;    -- Balance entre seguranca e velocidade
```

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
  "react-native-svg": "15.12.1",
  "expo-router": "~6.0.17",
  "expo-sqlite": "~16.0.2"
}
```

## Arquivos Importantes

| Arquivo | Descricao |
|---------|-----------|
| `app/_layout.tsx` | Layout raiz com providers (Theme, Auth, Paper) |
| `app/(tabs)/_layout.tsx` | Layout das tabs com Header e Drawer |
| `src/auth/AuthContext.tsx` | Context de autenticacao |
| `src/theme/ThemeContext.tsx` | Context para theme toggle |
| `src/theme/index.ts` | Temas customizados com cores MUI |
| `src/components/AppHeader.tsx` | Header com avatar e theme toggle |
| `src/components/AppDrawer.tsx` | Drawer lateral com menu |
| `src/database/database.ts` | Conexao e inicializacao do SQLite |
| `src/database/migrations.ts` | Sistema de migrations versionado |
| `src/database/useDatabase.ts` | Hooks para acesso ao banco |
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

### Tema nao atualiza

Verifique se o ThemeProvider esta no topo da arvore de componentes em `_layout.tsx`.

### Erro no banco de dados SQLite

1. O app continua funcionando mesmo se o banco falhar (graceful degradation)
2. Verifique os logs do console para detalhes do erro
3. Para resetar o banco: use `resetDatabase()` ou reinstale o app
