# FlyTwo Pro Backend

API backend em Go para o FlyTwo Pro, utilizando PostgreSQL como banco de dados. O projeto segue principios de clean architecture com separacao clara de responsabilidades.

## Tech Stack

| Tecnologia | Descricao |
|------------|-----------|
| **Go 1.21+** | Linguagem principal |
| **PostgreSQL** | Banco de dados (Docker, porta 5580) |
| **chi/v5** | Router HTTP |
| **sqlc + pgx/v5** | Geracao de codigo SQL type-safe |
| **go-playground/validator** | Validacao de dados |
| **uber-go/zap** | Logging estruturado |
| **swaggo/swag** | Documentacao Swagger/OpenAPI |
| **testify** | Framework de testes |
| **scs/v2** | Gerenciamento de sessoes |
| **Ristretto + Redis** | Cache L1/L2 para buscas CATMAT/CATSER |

## Estrutura do Projeto

```
flytwo-pro-backend/
├── cmd/api/              # Entry point da aplicacao
│   └── main.go           # Funcao main com annotations Swagger
├── internal/             # Codigo privado da aplicacao
│   ├── api/              # Handlers HTTP e rotas
│   │   ├── routes.go     # Definicao de rotas
│   │   ├── api.go        # Struct Api e inicializacao
│   │   └── *_handlers.go # Implementacoes dos handlers
│   ├── dto/              # Data Transfer Objects
│   ├── services/         # Camada de logica de negocio
│   ├── store/            # Camada de banco de dados
│   │   ├── pgstore/      # Implementacao PostgreSQL (sqlc)
│   │   └── queries/      # Queries SQL para sqlc
│   ├── validator/        # Validacao customizada
│   ├── logger/           # Configuracao de logging
│   ├── jsonutils/        # Utilitarios JSON
│   └── mocks/            # Mocks para testes
├── docs/                 # Documentacao Swagger (auto-gerada)
├── logs/                 # Logs da aplicacao
├── migrations/           # Migracoes de banco de dados
├── .env                  # Variaveis de ambiente
├── docker-compose.yml    # Configuracao Docker
└── Makefile              # Automacao de build/test
```

## Pre-requisitos

- Go 1.21+
- Docker e Docker Compose
- PostgreSQL (via Docker)

## Setup Rapido

### 1. Configurar variaveis de ambiente

Copie o arquivo de exemplo e ajuste conforme necessario:

```bash
cp .env.example .env
```

Variaveis necessarias no `.env`:

```env
GOBID_DATABASE_PORT=5580
GOBID_DATABASE_NAME="gobid"
GOBID_DATABASE_USER="ADM"
GOBID_DATABASE_PASSWORD="2104"
GOBID_DATABASE_HOST="localhost"
GOBID_CSRF_KEY="<chave-aleatoria-32-caracteres>"
# Cache / Redis (opcional para busca)
GOBID_REDIS_ADDR="localhost:6379"
GOBID_REDIS_PASSWORD=""
GOBID_REDIS_DB=0
GOBID_CACHE_TTL_SECONDS=300
GOBID_CACHE_L1_MAX_COST=10000
```

### 2. Subir o banco de dados

```bash
docker-compose up -d
```

O PostgreSQL estara disponivel em `localhost:5580`.

### 3. Executar migracoes

```bash
go run ./cmd/terndotend/main.go
```

### 4. Rodar a aplicacao

```bash
go run cmd/api/main.go
```

A API estara disponivel em `http://localhost:3080`.

## Documentacao da API

Apos iniciar o servidor, a documentacao Swagger fica disponivel em:

```
http://localhost:3080/swagger/index.html
```

- O endpoint `/swagger/doc.json` **ja entrega OpenAPI 3.0.x** (gerado em tempo de execucao a partir do swagger 2.0 do `swag` usando conversao automatica via `kin-openapi`).
- Pode ser usado diretamente pelo `ng-openapi-gen`:
  ```bash
  ng-openapi-gen --input http://localhost:3080/swagger/doc.json --output <destino>
  ```

### Regenerar documentacao

```bash
swag init -g cmd/api/main.go -o docs
```

Nao ha mais passo manual de conversao; o servidor converte para OpenAPI 3 em tempo de execucao.

## Cache de busca (CATMAT/CATSER)

- Endpoints afetados: `GET /api/v1/catmat/search` e `GET /api/v1/catser/search`.
- Arquitetura: L1 Ristretto (in-process) + L2 Redis (opcional). Fluxo: L1 → L2 → Postgres → set L2 → set L1.
- Configuracao:
  - Ligar Redis definindo `GOBID_REDIS_ADDR` (porta 6379 no docker-compose). Se vazio, apenas L1 e usado.
  - TTL: `GOBID_CACHE_TTL_SECONDS` (padrao 300s). Tamanho L1: `GOBID_CACHE_L1_MAX_COST` (padrao 10000).
- Observabilidade: logs DEBUG mostram `cache hit L1`, `cache hit L2`, `cache miss`, `cache set L1/L2`.
- Invalidacao: importacoes nao limpam cache; se importar planilhas e quiser refletir imediatamente, reinicie a API ou limpe Redis.

## Comandos Uteis

### Desenvolvimento

```bash
# Rodar servidor
go run cmd/api/main.go

# Build
go build -o flytwo-pro.exe cmd/api/main.go

# Formatar codigo
go fmt ./...

# Linter
go vet ./...

# Atualizar dependencias
go mod tidy
```

### Testes

```bash
# Testes unitarios
go test ./...

# Com cobertura
go test -cover ./...

# Testes de um pacote especifico
go test ./internal/api -v

# Testes de integracao (requer banco)
RUN_INTEGRATION_TESTS=true go test ./internal/api -tags=integration -v
```

### Scripts de teste

```powershell
# PowerShell
./run-tests.ps1 all         # Unitarios
./run-tests.ps1 integration # Integracao
./run-tests.ps1 full        # Todos
```

```bash
# Bash
./run-tests.sh all
./run-tests.sh integration
./run-tests.sh full
```

## Migracoes de Banco de Dados

### Criar nova migracao

```bash
cd ./internal/store/pgstore/migrations
tern new nome_da_migration
```

### Estrutura de migracao

```sql
-- Migration UP
CREATE TABLE IF NOT EXISTS exemplo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

---- create above / drop below ----

-- Migration DOWN
DROP TABLE IF EXISTS exemplo;
```

### Aplicar migracoes

```bash
go run ./cmd/terndotend/main.go
```

## SQLC - Geracao de Codigo

### Escrever queries

Crie arquivos `.sql` em `internal/store/pgstore/queries/`:

```sql
-- name: GetUserByID :one
SELECT * FROM users WHERE id = $1;

-- name: ListUsers :many
SELECT * FROM users ORDER BY created_at DESC;

-- name: CreateUser :one
INSERT INTO users (user_name, email, password)
VALUES ($1, $2, $3)
RETURNING *;
```

### Gerar codigo Go

```bash
sqlc generate -f ./internal/store/pgstore/sqlc.yml
```

## Logging

Logs sao salvos em `logs/app.log` com rotacao automatica:

- **Formato**: JSON (arquivo) / Colorido (console)
- **Tamanho maximo**: 10 MB por arquivo
- **Backups**: 5 arquivos antigos
- **Compressao**: Arquivos rotacionados sao comprimidos (.gz)

### Visualizar logs

```bash
# Logs em tempo real
tail -f logs/app.log

# Com formatacao JSON
cat logs/app.log | jq '.'

# Buscar erros
grep -i "error" logs/app.log
```

### Niveis de log

| Nivel | Uso |
|-------|-----|
| DEBUG | Erros de validacao detalhados |
| INFO | Operacoes normais |
| WARN | Violacoes de regras de negocio |
| ERROR | Erros inesperados, falhas de banco |

## Validacao

O projeto usa `go-playground/validator` com conversao automatica para snake_case:

```go
type CreateUserReq struct {
    UserName string `json:"user_name" validate:"required,username"`
    Email    string `json:"email" validate:"required,email"`
    Password string `json:"password" validate:"required,min=8"`
}
```

## CORS

O backend esta configurado para aceitar requisicoes do frontend Angular em `http://localhost:4200`.

**Configuracao em `internal/api/routes.go`:**

```go
cors.Handler(cors.Options{
    AllowedOrigins:   []string{"http://localhost:4200"},
    AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
    AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
    ExposedHeaders:   []string{"Link"},
    AllowCredentials: true,
    MaxAge:           300,
})
```

| Opcao | Valor | Descricao |
|-------|-------|-----------|
| AllowedOrigins | `http://localhost:4200` | Frontend Angular |
| AllowedMethods | GET, POST, PUT, DELETE, OPTIONS, PATCH | Metodos HTTP permitidos |
| AllowCredentials | `true` | Permite cookies de sessao |
| MaxAge | 300s | Cache de preflight |

## Endpoints Disponiveis

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| POST | `/api/v1/users/signup` | Criar novo usuario |
| POST | `/api/v1/users/login` | Login |
| POST | `/api/v1/users/logout` | Logout |
| GET | `/api/v1/users/me` | Perfil do usuario autenticado |

## Troubleshooting

### Erro de conexao com banco

Verifique se o PostgreSQL esta rodando:

```bash
docker ps
```

Se nao estiver, suba novamente:

```bash
docker-compose up -d
```

### Porta em uso

Se a porta 5580 estiver ocupada:

```bash
netstat -ano | findstr :5580
```

### Swagger nao atualiza

Regenere a documentacao:

```bash
swag init -g cmd/api/main.go -o docs
```

### Erros de validacao

Lembre-se que o validator converte campos para snake_case nas mensagens de erro.

## Estrutura de Resposta de Erro

```json
// Erros de validacao (422)
{
    "error": "Validation failed",
    "fields": {
        "user_name": "must be at least 3 characters",
        "email": "must be a valid email"
    }
}

// Erros de negocio (400, 401, 404)
{
    "error": "invalid credentials"
}

// Erros internos (500)
{
    "error": "internal server error"
}
```
