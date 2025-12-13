# FlyTwo Frontend

React 19 + TypeScript + Vite SPA com Material UI e autenticacao JWT.

## Stack Tecnologica

| Categoria | Pacote | Versao | Finalidade |
|-----------|--------|--------|------------|
| **Framework** | React | 19.1.0 | UI library |
| **Build** | Vite | 7.2.6 | Build tool & dev server |
| **Language** | TypeScript | 5.8.3 | Static typing |
| **UI** | @mui/material | 7.1.0 | Material Design components |
| **UI** | @mui/icons-material | 7.1.0 | Material icons |
| **UI** | @emotion/react | 11.14.0 | CSS-in-JS (MUI dependency) |
| **UI** | @emotion/styled | 11.14.0 | Styled components (MUI dependency) |
| **Routing** | react-router-dom | 7.6.1 | Client-side routing |
| **Forms** | formik | 2.4.6 | Form state management |
| **Validation** | yup | 1.6.1 | Schema validation |
| **Real-time** | @microsoft/signalr | 8.x | WebSocket para auth updates |

## Arquitetura

```
flytwo-frontend/
├── src/
│   ├── api/
│   │   ├── api-client.ts        # NSwag generated TypeScript client
│   │   └── apiClientFactory.ts  # Factory com injecao de Bearer token
│   ├── auth/
│   │   ├── authTypes.ts         # Tipos e contexto de autenticacao
│   │   ├── authUtils.ts         # Helpers para localStorage (token, user)
│   │   ├── AuthContext.tsx      # Provider de autenticacao + SignalR
│   │   └── useAuth.ts           # Hook para usar auth
│   ├── realtime/
│   │   └── authHub.ts           # SignalR hub para auth em tempo real
│   ├── components/
│   │   ├── TodoList.tsx         # Todo CRUD component
│   │   ├── ProductList.tsx      # Product CRUD component
│   │   ├── ProtectedRoute.tsx   # Guard para rotas autenticadas
│   │   └── PublicRoute.tsx      # Guard para rotas publicas
│   ├── layouts/
│   │   └── AdminLayout.tsx      # Layout com AppBar + Mini Drawer
│   ├── pages/
│   │   ├── Login.tsx            # Formulario de login
│   │   ├── Register.tsx         # Formulario de cadastro
│   │   ├── ForgotPassword.tsx   # Solicitar reset de senha
│   │   └── ResetPassword.tsx    # Redefinir senha via link
│   ├── App.tsx                  # Main app with routing
│   ├── main.tsx                 # React entrypoint
│   └── index.css                # Global reset styles
├── public/                      # Static assets
├── index.html                   # HTML template
├── package.json                 # Dependencies & scripts
├── tsconfig.json                # TypeScript config
├── vite.config.ts               # Vite config
└── nswag.json                   # NSwag client generation config
```

## Autenticacao

### Fluxo de Autenticacao

1. Usuario acessa qualquer rota protegida
2. `ProtectedRoute` verifica se ha token valido no localStorage
3. Se nao autenticado, redireciona para `/login`
4. Apos login, token JWT e armazenado no localStorage
5. `apiClientFactory` injeta Bearer token automaticamente em todas as requisicoes

### Armazenamento

| Chave | Valor |
|-------|-------|
| `accessToken` | JWT token |
| `expiresAt` | Data de expiracao do token |
| `user` | JSON com email, fullName, roles |

### Rotas

| Rota | Tipo | Componente | Descricao |
|------|------|------------|-----------|
| `/login` | Publica | Login | Formulario de login |
| `/register` | Publica | Register | Formulario de cadastro |
| `/forgot-password` | Publica | ForgotPassword | Solicitar reset de senha |
| `/reset-password` | Publica | ResetPassword | Redefinir senha (via link do email) |
| `/todos` | Protegida | TodoList | Gerenciamento de tarefas |
| `/products` | Protegida | ProductList | Catalogo de produtos |

### Fluxo de Reset de Senha

1. Usuario acessa `/forgot-password` e digita email
2. Backend envia email com link: `/reset-password?email=xxx&token=yyy`
3. Usuario clica no link e define nova senha
4. Apos sucesso, redireciona para `/login`

### Refresh Token Rotativo

O sistema usa refresh tokens rotativos para manter a sessao:

1. Access token expira em 15 minutos (configuravel no backend)
2. Refresh token e usado para obter novo access token
3. Cada refresh gera um NOVO refresh token (rotacao)
4. Se o refresh falhar (401), usuario e redirecionado para login

### Atualizacao de Permissoes em Tempo Real (SignalR)

O app conecta automaticamente no hub SignalR `/hubs/auth` quando o usuario esta logado.

**Como funciona:**

1. Quando logado, o frontend estabelece conexao WebSocket com o backend
2. Se um admin alterar roles/permissoes do usuario, o backend envia evento `AuthChanged`
3. O frontend recebe o evento e faz refresh automatico do token
4. O novo token contem as permissoes atualizadas
5. A UI reage automaticamente (menus, botoes, rotas)

**Eventos tratados:**

| Evento | Acao |
|--------|------|
| `AuthChanged` (reason != AccountDeleted) | Refresh do token para obter novas permissoes |
| `AuthChanged` (reason == AccountDeleted) | Logout imediato |

**Arquivos relacionados:**

```
src/realtime/authHub.ts    # Modulo SignalR para auth hub
src/auth/AuthContext.tsx   # Integracao com o contexto de auth
```

**Reconnect automatico:**

- Se a conexao cair, o SignalR tenta reconectar automaticamente
- Backoff exponencial: 0s, 2s, 4s, 8s, 16s, max 30s
- O `accessTokenFactory` sempre usa o token mais recente do storage

## Layout Admin

Rotas protegidas usam o `AdminLayout` com Mini Drawer (colapsavel):

```
┌─────────────────────────────────────────────────┐
│ [=] AppBar (logo, theme toggle, user menu)      │
├────┬────────────────────────────────────────────┤
│ [] │                                            │
│ [] │  Conteudo da pagina                        │
│    │                                            │
└────┴────────────────────────────────────────────┘

Drawer fechado: mostra apenas icones
Drawer aberto: mostra icones + texto
```

- **Mini Drawer**: expande/colapsa com animacao suave
- Quando fechado, mostra apenas os icones dos menus
- Quando aberto, mostra icones + labels
- Toggle de tema (light/dark mode) com persistencia
- Menu do usuario com opcao de logout

## Material UI Theme

### Light/Dark Mode Toggle

O app suporta alternancia entre modo claro e escuro com persistencia no localStorage:

```tsx
const [mode, setMode] = useState<'light' | 'dark'>(() => {
  const saved = localStorage.getItem('themeMode')
  return (saved === 'dark' || saved === 'light') ? saved : 'light'
})
```

### Componentes MUI Utilizados

| Componente | Uso |
|------------|-----|
| `AppBar` / `Toolbar` | Header com navegacao |
| `Drawer` | Sidebar (permanent/temporary) |
| `Avatar` / `Menu` | Menu do usuario |
| `Button` / `IconButton` | Acoes e navegacao |
| `TextField` / `Select` | Inputs de formulario |
| `DataGrid` | Listagem de produtos com paginacao |
| `List` / `ListItem` | Listagem de todos e menu sidebar |
| `Dialog` | Modais de formulario e confirmacao |
| `Chip` | Tags de status e categoria |
| `Alert` | Mensagens de erro e sucesso |
| `CircularProgress` | Loading state |
| `Checkbox` | Toggle de completude |
| `Tooltip` | Hints de interface |

## Formularios com Formik + Yup

### Schemas de Validacao

#### Login

```tsx
Yup.object({
  email: Yup.string().email("Email invalido").required("Email obrigatorio"),
  password: Yup.string().required("Senha obrigatoria")
})
```

#### Register

```tsx
Yup.object({
  email: Yup.string().email("Email invalido").required("Email obrigatorio"),
  fullName: Yup.string().max(100, "Nome deve ter no maximo 100 caracteres"),
  password: Yup.string().min(6, "Minimo 6 caracteres").required("Senha obrigatoria"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password")], "Senhas nao conferem")
    .required("Confirmacao obrigatoria")
})
```

#### Todo

| Campo | Regra |
|-------|-------|
| `title` | Required, min 2, max 200 caracteres |
| `description` | Opcional, max 1000 caracteres |

#### Product

| Campo | Regra |
|-------|-------|
| `name` | Required, min 2, max 200 caracteres |
| `sku` | Required, min 3, max 50 caracteres |
| `category` | Required, enum de categorias validas |
| `price` | Required, min 0.01, max 999,999.99 |
| `stockQuantity` | Required, min 0, inteiro |
| `description` | Opcional, max 2000 caracteres |

## API Client (NSwag)

### Geracao do Cliente

O cliente TypeScript e gerado automaticamente a partir do OpenAPI/Swagger do backend:

```bash
# Gerar cliente (requer backend rodando)
npx nswag run nswag.json
```

### Uso do Cliente

```tsx
import { getApiClient } from "../api/apiClientFactory";

// O factory injeta o Bearer token automaticamente
const client = getApiClient();

// Auth
await client.login({ email, password });
await client.register({ email, password, confirmPassword, fullName });
await client.me();
await client.forgotPassword({ email });
await client.resetPassword({ email, token, newPassword, confirmPassword });

// Products
const products = await client.paged(pageNumber, pageSize);
await client.productPOST(request);  // Requer auth
await client.productPUT(id, request);  // Requer auth
await client.productDELETE(id);  // Requer auth

// Todos
const todos = await client.todoAll();
await client.todoPOST(request);  // Requer auth
await client.todoPUT(id, request);  // Requer auth
await client.todoDELETE(id);  // Requer auth
```

## CLI Commands

```bash
# Instalar dependencias
npm install

# Desenvolvimento (hot reload)
npm run dev

# Build para producao
npm run build

# Preview do build
npm run preview

# Lint (ESLint)
npm run lint

# Gerar API client (backend deve estar rodando)
npx nswag run nswag.json
```

## URLs

| Ambiente | URL |
|----------|-----|
| Dev Server | http://localhost:5173 |
| Backend API | http://localhost:5110 |
| Swagger UI | http://localhost:5110/swagger |

## Features

- [x] Autenticacao JWT (login, register, logout)
- [x] Refresh token rotativo com auto-refresh em 401
- [x] Atualizacao de permissoes em tempo real (SignalR)
- [x] Recuperacao de senha (forgot/reset password)
- [x] Layout admin com sidebar responsivo
- [x] Rotas protegidas e publicas
- [x] CRUD completo para Todos
- [x] CRUD completo para Products
- [x] Validacao client-side com Yup
- [x] Formularios gerenciados com Formik
- [x] UI responsiva com Material UI
- [x] Theme toggle (light/dark mode)
- [x] Persistencia de tema no localStorage
- [x] Loading states com CircularProgress
- [x] Error handling com Alert
- [x] Confirmacao de delete com Dialog
- [x] Filtro por categoria (Products)
- [x] Paginacao server-side (Products)
- [x] API client tipado com injecao de token
