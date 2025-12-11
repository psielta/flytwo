<p align="center">
  <img src="assets/logo.svg" alt="FlyTwo Logo" width="200" />
</p>

<h1 align="center">FlyTwo - Sistema de Cotação de Preços</h1>

<p align="center">
  Sistema full-stack desenvolvido com <strong>ASP.NET Core 8</strong> (backend), <strong>React 19</strong> (frontend) e <strong>React Native</strong> (mobile) para cotação de preços usando APIs públicas do governo.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/.NET-8.0-512BD4?style=flat&logo=dotnet" alt=".NET 8" />
  <img src="https://img.shields.io/badge/Go-1.21-00ADD8?style=flat&logo=go" alt="Go" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/Angular-21-DD0031?style=flat&logo=angular" alt="Angular 21" />
  <img src="https://img.shields.io/badge/React_Native-0.81-61DAFB?style=flat&logo=react" alt="React Native" />
  <img src="https://img.shields.io/badge/Expo-54-000020?style=flat&logo=expo" alt="Expo" />
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat&logo=postgresql" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Redis-7-DC382D?style=flat&logo=redis" alt="Redis" />
</p>

## Sobre o Projeto

**FlyTwo** é um sistema em desenvolvimento focado em cotação de preços usando APIs públicas do governo (PNCP - Portal Nacional de Contratações Públicas).

> **Nota:** Os módulos de **Produtos** e **Tarefas (Todo)** foram implementados como **ponto de partida** para validar a arquitetura completa (autenticação JWT, cache híbrido, geração de clientes TypeScript). Esses módulos serão substituídos pelos módulos de cotação de preços nas próximas fases do desenvolvimento.

### Arquitetura do Sistema

#### Backends

O projeto é dividido em dois backends com responsabilidades distintas:

| Componente | Tecnologia | Responsabilidade |
|------------|------------|------------------|
| **FlyTwo Backend** | ASP.NET Core 8 | Dados do usuário (autenticação, perfil, configurações) |
| **FlyTwo Pro Backend** | Go (Chi + sqlc) | Dados de pesquisa (CATMAT/CATSER, preços, cotações) |

Esta separação foi escolhida para:
- **Performance**: Go oferece melhor desempenho para consultas de grande volume de dados (catálogos CATMAT/CATSER)
- **Isolamento**: Banco de dados separado para dados de pesquisa vs dados do usuário
- **Escalabilidade**: Cada serviço pode escalar independentemente

#### Frontends

| Componente | Tecnologia | Responsabilidade |
|------------|------------|------------------|
| **FlyTwo Frontend** | React 19 | Interface principal para usuários finais |
| **FlyTwo Pro Frontend** | Angular 21 | Admin para importação de dados e planilhas |

#### Mobile

| Componente | Tecnologia | Responsabilidade |
|------------|------------|------------------|
| **FlyTwo Mobile** | React Native + Expo | App mobile para usuários finais |

### FlyTwo Pro - Serviço de Pesquisa

O **FlyTwo Pro** é um subsistema dedicado à importação e gerenciamento de dados de pesquisa para cotação:

- **Frontend Angular**: Dashboard administrativo para importação de planilhas
  - Importação de catálogos CATMAT (materiais) e CATSER (serviços)
  - Importação de planilhas de preços da CGU
  - Upload e processamento de arquivos CSV/Excel
  - Visualização e validação de dados importados

- **Backend Go**: API de alta performance para armazenamento e consulta
  - Processamento de grandes volumes de dados
  - Queries otimizadas com sqlc
  - Banco PostgreSQL dedicado (porta 5580)

> **Nota**: O FlyTwo Pro Frontend é exclusivamente para administração e importação de dados. Os usuários finais consultam os dados através do FlyTwo Frontend (React) e Mobile.

### Objetivo Final

Fornecer uma plataforma para cotação de preços que:
- Consulta APIs públicas do governo (PNCP - Portal Nacional de Contratações Públicas)
- Gerencia catálogo de produtos com preços de referência (CATMAT/CATSER)
- Compara preços entre diferentes fontes
- Gera relatórios de cotação

## Tecnologias Utilizadas

### Backend (ASP.NET Core 8)

| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| .NET | 8.0 | Framework |
| ASP.NET Core Identity | 8.0.11 | Autenticação e autorização |
| Entity Framework Core | 8.0.11 | ORM |
| PostgreSQL | 16 | Banco de dados |
| JWT Bearer | 8.0.11 | Tokens de autenticação |
| FusionCache | 2.4.0 | Cache híbrido (L1 Memory + L2 Redis) |
| Redis | 7 | Cache distribuído |
| Serilog | 8.0.3 | Logging estruturado |
| FluentValidation | 11.3.0 | Validação de dados |
| AutoMapper | 12.0.1 | Mapeamento de objetos |
| Swashbuckle | 6.6.2 | OpenAPI/Swagger |
| xUnit + FluentAssertions | - | Testes unitários |

### Frontend (React 19)

| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| React | 19.1.0 | UI library |
| TypeScript | 5.8.3 | Tipagem estática |
| Vite | 7.2.6 | Build tool |
| Material UI | 7.1.0 | Componentes UI |
| React Router | 7.6.1 | Roteamento |
| Formik + Yup | 2.4.6 / 1.6.1 | Formulários e validação |
| NSwag | - | Geração de cliente TypeScript |

### Mobile (React Native + Expo)

| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| React Native | 0.81.5 | Framework mobile |
| Expo | 54.0.27 | Plataforma de desenvolvimento |
| Expo Router | 6.0.17 | Navegação baseada em arquivos |
| React Native Paper | 5.14.5 | UI Material Design 3 |
| Formik + Yup | 2.4.9 / 1.7.1 | Formulários e validação |
| AsyncStorage | 2.2.0 | Persistência de sessão |
| Expo SQLite | 16.0.2 | Banco de dados local |
| NSwag | - | Geração de cliente TypeScript |

### FlyTwo Pro Backend (Go)

| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| Go | 1.21+ | Linguagem principal |
| chi/v5 | - | Router HTTP |
| sqlc + pgx/v5 | - | Geração de código SQL type-safe |
| scs/v2 | - | Gerenciamento de sessões (cookies) |
| go-playground/validator | - | Validação de dados |
| uber-go/zap | - | Logging estruturado |
| swaggo/swag | - | Documentação OpenAPI |
| PostgreSQL | 16 | Banco de dados (porta 5580) |

### FlyTwo Pro Frontend (Angular)

| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| Angular | 21.x | Framework principal |
| Angular Material | 21.x | UI Material Design 3 |
| ng-openapi-gen | latest | Geração de cliente HTTP tipado |
| RxJS | 7.8.x | Programação reativa |
| TypeScript | 5.9.x | Tipagem estática |

## Estrutura do Projeto

```
FlyTwo/
├── flytwo-backend/
│   └── WebApplicationFlytwo/     # API REST ASP.NET Core
│       ├── Controllers/          # Controllers da API
│       ├── Data/                 # DbContext e Seeders
│       ├── DTOs/                 # Request/Response objects
│       ├── Entities/             # Entidades do domínio
│       ├── Mappings/             # Profiles do AutoMapper
│       ├── Validators/           # Validators FluentValidation
│       └── WebApplicationFlytwo.Tests/  # Testes unitários
│
├── flytwo-frontend/              # SPA React + TypeScript
│   ├── src/
│   │   ├── api/                  # Cliente TypeScript (NSwag)
│   │   ├── auth/                 # Contexto de autenticação
│   │   ├── components/           # Componentes React
│   │   ├── layouts/              # Layout Admin com Drawer
│   │   └── pages/                # Páginas da aplicação
│   └── package.json
│
├── flytwo-mobile/                # App React Native + Expo
│   ├── app/                      # Telas (Expo Router)
│   │   ├── (auth)/               # Login, Registro
│   │   ├── (tabs)/               # Telas protegidas
│   │   └── sobre.tsx             # Tela Sobre
│   ├── src/
│   │   ├── api/                  # Cliente TypeScript (NSwag)
│   │   ├── auth/                 # Contexto de autenticação
│   │   ├── components/           # Header, Drawer, Logo
│   │   ├── database/             # SQLite (migrations, hooks)
│   │   └── theme/                # Tema customizado (cores MUI)
│   └── package.json
│
├── flytwo-pro-backend/           # API REST Go (Chi + scs)
│   └── ...                       # Ver flytwo-pro-backend/README.md
│
├── flytwo-pro-frontend/          # SPA Angular + Material
│   ├── src/app/
│   │   ├── api/                  # Cliente TypeScript (ng-openapi-gen)
│   │   ├── core/                 # AuthService, Guards, Interceptors
│   │   ├── features/             # Login, Register, Dashboard
│   │   └── shared/               # Layouts, Componentes
│   └── package.json
│
└── docker-compose.yml            # PostgreSQL + Redis + MailHog
```

## Funcionalidades Atuais

### Backend

- **Autenticação JWT com Identity Framework**
  - Login e registro de usuários
  - Recuperação de senha via email
  - Proteção de rotas com Bearer token
  - Seed automático de usuário admin

- **CRUD de Produtos com Cache**
  - Listagem paginada
  - Filtro por categoria
  - Cache híbrido (Memory + Redis)
  - Invalidação automática

- **CRUD de Tarefas (Todo)**
  - CRUD completo
  - Validação com FluentValidation

- **Documentação OpenAPI**
  - Swagger UI com autenticação
  - Geração automática de cliente TypeScript

### Frontend

- **Autenticação Completa**
  - Login, registro, logout
  - Recuperação de senha (forgot/reset)
  - Rotas protegidas e públicas

- **Layout Admin Responsivo**
  - Mini Drawer colapsável
  - Toggle de tema (light/dark)
  - Menu do usuário

- **CRUD de Produtos**
  - DataGrid com paginação server-side
  - Filtro por categoria
  - Modais de criação/edição

- **CRUD de Tarefas**
  - Lista com checkboxes
  - Validação client-side

### Mobile

- **Autenticação Completa**
  - Login e registro
  - Logout via drawer lateral
  - Persistência de sessão com AsyncStorage

- **Interface Nativa**
  - Header com logo, theme toggle e avatar
  - Drawer lateral com menu do usuário
  - Navegação por tabs (Home, Explore)
  - Tela "Sobre" com informações do projeto

- **Tema Consistente**
  - Cores Material UI (mesmas do frontend web)
  - Suporte light/dark mode
  - Toggle manual ou seguir sistema

- **Integração com Backend**
  - Cliente API gerado via NSwag
  - Token JWT injetado automaticamente
  - Mesmos endpoints do frontend web

### FlyTwo Pro Backend (Go)

- **Autenticação com Sessões (scs)**
  - Login e registro de usuários
  - Cookies HttpOnly para segurança
  - CORS configurado para frontend Angular

- **API REST com Chi**
  - Rotas organizadas por domínio
  - Middleware de autenticação
  - Documentação OpenAPI 3.0 automática

- **Banco de Dados PostgreSQL**
  - sqlc para queries type-safe
  - Migrações com tern
  - Banco separado (porta 5580)

### FlyTwo Pro Frontend (Angular)

- **Dashboard Administrativo para Importação de Dados**
  - Importação de catálogos CATMAT (materiais)
  - Importação de catálogos CATSER (serviços)
  - Importação de planilhas de preços da CGU
  - Upload de arquivos CSV/Excel
  - Validação e visualização de dados

- **Autenticação Completa**
  - Login e registro
  - Logout com redirect automático
  - Guards para rotas protegidas/públicas

- **Layout Admin Responsivo**
  - Sidenav com navegação
  - Toggle de tema (light/dark)
  - Menu do usuário

- **Integração com API Go**
  - Cliente TypeScript gerado via ng-openapi-gen
  - Interceptors para credentials e erros
  - Signals para estado reativo

> **Nota**: Este frontend é exclusivo para administradores. Usuários finais acessam os dados via FlyTwo Frontend (React) e Mobile.

## Configuração do Ambiente

### Pré-requisitos

- .NET 8 SDK
- Go 1.21+
- Node.js 20+
- Docker e Docker Compose
- Android Studio (para emulador Android) - opcional para mobile
- Git

### Passo 1: Clonar o Repositório

```bash
git clone https://github.com/psielta/flytwo.git
cd flytwo
```

### Passo 2: Iniciar Infraestrutura (Docker)

```bash
docker-compose up -d
```

Isso inicia:
- **PostgreSQL** (porta 5432) - Banco de dados
- **Redis** (porta 6379) - Cache distribuído
- **MailHog** (porta 1025/8025) - SMTP de desenvolvimento

### Passo 3: Executar o Backend

```bash
cd flytwo-backend/WebApplicationFlytwo
dotnet restore
dotnet ef database update
dotnet run
```

O backend estará disponível em:
- **API**: http://localhost:5110
- **Swagger UI**: http://localhost:5110/swagger

### Passo 4: Executar o Frontend

```bash
cd flytwo-frontend
npm install
npm run dev
```

O frontend estará disponível em http://localhost:5173

### Passo 5: Executar o Mobile (Opcional)

```bash
cd flytwo-mobile
npm install
npm run generate-api  # Backend deve estar rodando
npm run android       # ou npm run ios (macOS)
```

O app será aberto no emulador Android/iOS.

> **Nota:** No Android Emulator, o app usa `10.0.2.2:5110` para acessar o backend em `localhost`.

### Passo 6: Executar o FlyTwo Pro Backend (Opcional)

```bash
cd flytwo-pro-backend
docker-compose up -d        # PostgreSQL na porta 5580
go run ./cmd/terndotend/main.go  # Migrações
go run cmd/api/main.go      # Servidor na porta 3080
```

O backend Go estará disponível em:
- **API**: http://localhost:3080
- **Swagger UI**: http://localhost:3080/swagger/index.html

### Passo 7: Executar o FlyTwo Pro Frontend (Opcional)

```bash
cd flytwo-pro-frontend
npm install
npm run api:generate  # Backend Go deve estar rodando
npm start
```

O frontend Angular estará disponível em http://localhost:4200

## Testando o Sistema

### Usuário Admin Padrão

O sistema cria automaticamente um usuário admin na primeira execução:

- **Email**: `admin@flytwo.local`
- **Password**: `Admin123!`

### Fluxo de Teste

1. Acesse http://localhost:5173
2. Faça login com as credenciais do admin
3. Navegue para **Products** ou **Todos** no menu lateral
4. Teste as operações de CRUD
5. Teste o filtro por categoria em Products

### Testando Recuperação de Senha

1. Acesse http://localhost:5173/forgot-password
2. Digite um email cadastrado
3. Acesse http://localhost:8025 (MailHog) para ver o email
4. Clique no link de reset e defina nova senha

### Testando a API (Swagger)

1. Acesse http://localhost:5110/swagger
2. Execute `POST /api/auth/login` com as credenciais
3. Copie o `accessToken` da resposta
4. Clique no cadeado e cole: `Bearer {token}`
5. Teste os endpoints protegidos

### Executando Testes Unitários

```bash
cd flytwo-backend/WebApplicationFlytwo.Tests
dotnet test
```

## Endpoints da API

### Auth

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | /api/auth/register | Registrar novo usuário |
| POST | /api/auth/login | Fazer login |
| GET | /api/auth/me | Dados do usuário autenticado |
| POST | /api/auth/forgot-password | Solicitar reset de senha |
| POST | /api/auth/reset-password | Redefinir senha |

### Products

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | /api/product | Listar todos (cached) |
| GET | /api/product/paged | Listagem paginada |
| GET | /api/product/{id} | Buscar por ID (cached) |
| GET | /api/product/category/{cat} | Filtrar por categoria (cached) |
| POST | /api/product | Criar produto (auth) |
| PUT | /api/product/{id} | Atualizar produto (auth) |
| DELETE | /api/product/{id} | Remover produto (auth) |

### Todos

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | /api/todo | Listar todos |
| GET | /api/todo/{id} | Buscar por ID |
| POST | /api/todo | Criar tarefa (auth) |
| PUT | /api/todo/{id} | Atualizar tarefa (auth) |
| DELETE | /api/todo/{id} | Remover tarefa (auth) |

### FlyTwo Pro (Go Backend)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | /api/v1/users/signup | Criar novo usuário |
| POST | /api/v1/users/login | Login (retorna cookie) |
| POST | /api/v1/users/logout | Logout |
| GET | /api/v1/users/me | Perfil do usuário autenticado |

## CLI Commands

### Backend

```bash
# Restaurar pacotes
dotnet restore

# Build
dotnet build

# Executar
dotnet run

# Migrations
dotnet ef migrations add <Nome>
dotnet ef database update

# Testes
dotnet test
```

### Frontend

```bash
# Instalar dependências
npm install

# Desenvolvimento
npm run dev

# Build produção
npm run build

# Gerar cliente API (backend deve estar rodando)
npm run generate-api
```

### Mobile

```bash
# Instalar dependências
npm install

# Gerar cliente API (backend deve estar rodando)
npm run generate-api

# Iniciar servidor de desenvolvimento
npm start

# Executar no Android
npm run android

# Executar no iOS (macOS apenas)
npm run ios

# Limpar cache
npx expo start --clear
```

### Docker

```bash
# Iniciar infraestrutura
docker-compose up -d

# Parar
docker-compose down

# Verificar Redis
docker exec -it flytwo-redis redis-cli ping

# Ver emails (MailHog)
# Acesse: http://localhost:8025
```

### FlyTwo Pro Backend (Go)

```bash
# Subir banco de dados (porta 5580)
docker-compose up -d

# Executar migrações
go run ./cmd/terndotend/main.go

# Rodar servidor
go run cmd/api/main.go

# Gerar documentação Swagger
swag init -g cmd/api/main.go -o docs

# Gerar código sqlc
sqlc generate -f ./internal/store/pgstore/sqlc.yml

# Testes
go test ./...
```

### FlyTwo Pro Frontend (Angular)

```bash
# Instalar dependências
npm install

# Desenvolvimento (porta 4200)
npm start

# Gerar cliente API (backend Go deve estar rodando)
npm run api:generate

# Build produção
npm run build

# Testes
npm test
```

## Roadmap

### Fase 1: Base Arquitetural (Concluído)

- [x] Autenticação JWT com Identity Framework
- [x] CRUD de produtos com cache híbrido
- [x] CRUD de tarefas
- [x] Recuperação de senha via email
- [x] Frontend React com Material UI
- [x] Geração automática de cliente TypeScript
- [x] Testes unitários
- [x] App mobile React Native com Expo
- [x] Autenticação mobile (login, registro, logout)
- [x] Theme toggle (light/dark) no mobile
- [x] Cores consistentes entre web e mobile

### Fase 1.5: FlyTwo Pro - Serviço de Pesquisa (Em Andamento)

- [x] Backend Go com Chi e sqlc
- [x] Autenticação com sessões (scs)
- [x] Documentação OpenAPI 3.0 automática
- [x] Frontend Angular com Material Design 3
- [x] Cliente TypeScript gerado (ng-openapi-gen)
- [x] Guards e interceptors para auth
- [x] Theme toggle (light/dark)
- [x] Banco de dados separado (porta 5580)
- [ ] Upload e importação de planilhas CATMAT
- [ ] Upload e importação de planilhas CATSER
- [ ] Upload e importação de planilhas de preços CGU
- [ ] Validação e preview de dados antes da importação

### Fase 2: Integração PNCP (Próxima)

- [ ] Integração com API do PNCP
- [ ] Consulta de preços de referência
- [ ] Histórico de cotações
- [ ] Comparativo de preços

### Fase 3: Relatórios

- [ ] Dashboard de cotações
- [ ] Relatórios de preços por período
- [ ] Exportação PDF/Excel
- [ ] Gráficos de evolução de preços

## Características Técnicas

### Backend

- **Arquitetura em camadas**: Controller → Service → Repository
- **Cache híbrido**: L1 Memory + L2 Redis com FusionCache
- **Fail-safe**: Cache antigo usado se backend offline
- **Validação**: FluentValidation com regras customizadas
- **Logging**: Serilog com output para console e arquivo

### Frontend

- **Standalone Components**: Arquitetura modular
- **Context API**: Gerenciamento de estado de autenticação
- **Protected Routes**: Guard para rotas autenticadas
- **Theme Toggle**: Light/Dark mode com persistência
- **Responsive Layout**: Mini Drawer adaptável

### Mobile

- **Expo Router**: Navegação baseada em arquivos
- **React Native Paper**: Material Design 3 nativo
- **AsyncStorage**: Persistência de token e preferências
- **Theme Context**: Toggle light/dark com persistência
- **Cores MUI**: Consistência visual com frontend web
- **NSwag**: Mesmo cliente API do frontend
- **SQLite**: Banco local com sistema de migrations

### FlyTwo Pro Backend (Go)

- **Chi Router**: Roteamento HTTP leve e performático
- **sqlc**: Queries SQL type-safe com geração de código
- **scs**: Sessões via cookies HttpOnly
- **Zap**: Logging estruturado de alta performance
- **Swagger/OpenAPI 3.0**: Documentação automática

### FlyTwo Pro Frontend (Angular)

- **Standalone Components**: Arquitetura modular Angular 21
- **Signals**: Estado reativo com Angular Signals
- **ng-openapi-gen**: Cliente HTTP gerado automaticamente
- **Functional Guards**: AuthGuard e GuestGuard
- **Material Design 3**: UI consistente com tema azure/rose

## Licença

Projeto sob licença MIT.

## Autor

Mateus Salgueiro
- GitHub: [@psielta](https://github.com/psielta)
- LinkedIn: [Mateus Salgueiro](https://www.linkedin.com/in/mateus-salgueiro-525717205/)

---

Desenvolvido como parte do meu portfolio de desenvolvimento full-stack .NET + React.
