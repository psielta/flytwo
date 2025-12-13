# FlyTwo Backend

ASP.NET Core 8.0 Web API com arquitetura em camadas.

## Stack Tecnológica

| Categoria | Pacote | Versão | Finalidade |
|-----------|--------|--------|------------|
| **ORM** | Microsoft.EntityFrameworkCore | 8.0.11 | Object-Relational Mapping |
| **ORM** | Microsoft.EntityFrameworkCore.Design | 8.0.11 | CLI tools para migrations |
| **ORM** | Npgsql.EntityFrameworkCore.PostgreSQL | 8.0.11 | Provider PostgreSQL para EF Core |
| **Logging** | Serilog.AspNetCore | 8.0.3 | Structured logging |
| **Logging** | Serilog.Sinks.Console | 6.0.0 | Sink para stdout |
| **Logging** | Serilog.Sinks.File | 6.0.0 | Sink para arquivo com rolling |
| **Logging** | Serilog.Enrichers.Environment | 3.0.1 | Enricher de ambiente |
| **Logging** | Serilog.Enrichers.Thread | 4.0.0 | Enricher de ThreadId |
| **Mapping** | AutoMapper.Extensions.Microsoft.DependencyInjection | 12.0.1 | Object-to-object mapping via DI |
| **Serialization** | Microsoft.AspNetCore.Mvc.NewtonsoftJson | 8.0.11 | JSON serialization (substitui System.Text.Json) |
| **Validation** | FluentValidation.AspNetCore | 11.3.0 | Fluent validation rules |
| **Docs** | Swashbuckle.AspNetCore | 6.6.2 | OpenAPI/Swagger generation |
| **Docs** | Swashbuckle.AspNetCore.Annotations | 6.6.2 | Swagger annotations |
| **Cache** | ZiggyCreatures.FusionCache | 2.4.0 | Hybrid cache (L1 Memory + L2 Redis) |
| **Cache** | ZiggyCreatures.FusionCache.Serialization.NewtonsoftJson | 2.4.0 | JSON serialization para cache |
| **Cache** | Microsoft.Extensions.Caching.StackExchangeRedis | 8.0.11 | Redis distributed cache provider |
| **Auth** | Microsoft.AspNetCore.Identity.EntityFrameworkCore | 8.0.11 | Identity + EF Core (PostgreSQL) |
| **Auth** | Microsoft.AspNetCore.Authentication.JwtBearer | 8.0.11 | JWT bearer authentication |
| **Email** | System.Net.Mail (built-in) | - | SMTP via MailHog para reset de senha |

## Arquitetura

```
WebApplicationFlytwo/
- Controllers/           # API Controllers (presentation layer)
- Data/                  # DbContext + Seeders (data access layer)
- DTOs/                  # Request/Response objects
- Entities/              # Domain entities (EF Core models)
- Mappings/              # AutoMapper profiles
- Migrations/            # EF Core migrations
- Validators/            # FluentValidation validators
- Program.cs             # Application bootstrap & DI configuration
- appsettings.json       # Configuration
- logs/                  # Serilog file output
```

## Configuração de Serviços (Program.cs)

```csharp
// Serilog
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .MinimumLevel.Override("Microsoft", LogEventLevel.Warning)
    .MinimumLevel.Override("Microsoft.EntityFrameworkCore", LogEventLevel.Warning)
    .Enrich.FromLogContext()
    .Enrich.WithEnvironmentName()
    .Enrich.WithThreadId()
    .WriteTo.Console()
    .WriteTo.File("logs/log-.txt", rollingInterval: RollingInterval.Day)
    .CreateLogger();

// EF Core + PostgreSQL
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// AutoMapper
builder.Services.AddAutoMapper(typeof(TodoProfile));

// FluentValidation
builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddValidatorsFromAssemblyContaining<Program>();

// Newtonsoft.Json
builder.Services.AddControllers()
    .AddNewtonsoftJson(options => {
        options.SerializerSettings.ReferenceLoopHandling = ReferenceLoopHandling.Ignore;
        options.SerializerSettings.NullValueHandling = NullValueHandling.Ignore;
    });

// Redis Distributed Cache
builder.Services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = builder.Configuration.GetConnectionString("Redis");
    options.InstanceName = "FlyTwo:";
});

// FusionCache (Hybrid: L1 Memory + L2 Redis)
builder.Services.AddFusionCache()
    .WithDefaultEntryOptions(options =>
    {
        options.Duration = TimeSpan.FromMinutes(5);
        options.FailSafeMaxDuration = TimeSpan.FromMinutes(30);
        options.FactorySoftTimeout = TimeSpan.FromMilliseconds(1000);
        options.FactoryHardTimeout = TimeSpan.FromMilliseconds(5000);
        options.IsFailSafeEnabled = true;
    })
    .WithSerializer(new FusionCacheNewtonsoftJsonSerializer())
    .AsHybridCache();
```

## Autenticação (Identity + JWT)

- Multi-tenant: cada usuário pertence a uma Empresa via `ApplicationUser.EmpresaId` (JWT claim `empresaId`).
- Permissões/Policies: permissões (claims) ficam no `PermissionCatalog` e viram policies automaticamente (ex.: `[Authorize(Policy = "Usuarios.Visualizar")]`). Admin bypassa a checagem de permissão, mas regras de negócio (ex.: isolamento por empresa) continuam valendo.
- Registro público: `POST /api/auth/register` está desabilitado (flow A/C). Criação de usuários é feita por admin via `/api/usuarios` (flow A) ou via convites (flow C).
- Refresh token: `POST /api/auth/login` e `POST /api/auth/register-invite` retornam refresh token. Para renovar o JWT, use `POST /api/auth/refresh`. Para revogar, use `POST /api/auth/logout`. A expiração é configurável via `Jwt:RefreshTokenExpiryDays`.
- Atualização em tempo real (roles/permissões): quando um admin altera roles/permissões de um usuário, o backend envia um evento via SignalR no hub `/hubs/auth`. O frontend deve escutar o método `AuthChanged` e, ao receber, chamar `/api/auth/refresh` para obter um novo JWT com claims atualizadas.

- Identity com EF Core + PostgreSQL para gestão de usuários/roles.
- JWT Bearer para autenticação stateless em APIs.
- Seeds automáticos: cria role **Admin** e usuário `admin@flytwo.local` com senha `Admin123!` (configurável via `SeedAdmin` no *appsettings*).
- Swagger já configurado com esquema Bearer (cadeado no canto superior direito).

```json
// appsettings.json
"Jwt": {
  "Key": "ChangeThisKey-InProduction-UseVault-1234567890",
  "Issuer": "FlyTwo.Api",
  "Audience": "FlyTwo.Api.Client",
  "ExpiryMinutes": 60,
  "RefreshTokenExpiryDays": 14
},
"SeedAdmin": {
  "Email": "admin@flytwo.local",
  "Password": "Admin123!",
  "CompanyName": "FlyTwo"
},
"Smtp": {
  "Host": "localhost",
  "Port": 1025,
  "EnableSsl": false,
  "User": "",
  "Password": "",
  "From": "no-reply@flytwo.local"
},
"Frontend": {
  "ResetPasswordUrl": "http://localhost:5173/reset-password",
  "InviteUrl": "http://localhost:5173/accept-invite"
}
```

```csharp
// Identity + JWT (resumo)
builder.Services.AddIdentity<ApplicationUser, IdentityRole>()
    .AddEntityFrameworkStores<AppDbContext>()
    .AddDefaultTokenProviders();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!))
        };
    });
builder.Services.AddAuthorization(options => options.AddFlytwoPolicies());
builder.Services.AddSingleton<IAuthorizationHandler, PermissionAuthorizationHandler>();
```

## Database

### PostgreSQL (Docker)

```yaml
# docker-compose.yml (raiz do projeto)
services:
  postgres:
    image: postgres:16
    container_name: flytwo-postgres
    environment:
      POSTGRES_USER: flytwo
      POSTGRES_PASSWORD: flytwo123
      POSTGRES_DB: flytwodb
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    container_name: flytwo-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
```

### Connection String

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=flytwodb;Username=flytwo;Password=flytwo123",
    "Redis": "localhost:6379"
  },
  "Cache": {
    "DefaultDurationMinutes": 5,
    "FailSafeMaxDurationMinutes": 30,
    "FactorySoftTimeoutMs": 1000,
    "FactoryHardTimeoutMs": 5000
  }
}
```

### Entity Configuration (Fluent API)

```csharp
modelBuilder.Entity<Todo>(entity =>
{
    entity.HasKey(e => e.Id);
    entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
    entity.Property(e => e.Description).HasMaxLength(1000);
    entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
});
```

## CLI Commands

```bash
# Restaurar pacotes
dotnet restore

# Build
dotnet build

# Executar
dotnet run

# Migrations
dotnet ef migrations add <MigrationName>
dotnet ef database update
dotnet ef migrations remove

# Docker
docker-compose up -d      # Iniciar PostgreSQL e Redis
docker-compose down       # Parar
docker-compose down -v    # Parar e remover volumes

# Verificar Redis
docker exec -it flytwo-redis redis-cli ping
docker exec -it flytwo-redis redis-cli keys "FlyTwo:*"

# MailHog (SMTP de desenvolvimento)
docker exec -it flytwo-mailhog sh    # opcional
UI: http://localhost:8025 (SMTP em 1025)
```

## API Endpoints

### Auth Controller

| Method | Route | Request Body | Success | Error | Description |
|--------|-------|--------------|---------|-------|-------------|
| POST | /api/auth/register | RegisterRequest | 400 Bad Request | - | Registro público desabilitado (use convites / admin) |
| POST | /api/auth/login | LoginRequest | 200 OK (token + refresh) | 401 Unauthorized | Autentica e retorna JWT + refresh token |
| GET | /api/auth/me | - | 200 OK | 401 Unauthorized | Dados do usuario autenticado |
| GET | /api/auth/invite-preview?token=... | - | 200 OK | 400, 404 | Preview de convite (flow C) |
| POST | /api/auth/register-invite | RegisterInviteRequest | 201 Created (token + refresh) | 400, 404, 409 | Registro via convite (flow C) |
| POST | /api/auth/refresh | RefreshRequest | 200 OK (token + refresh) | 401 Unauthorized | Rotaciona refresh token e retorna novo JWT |
| POST | /api/auth/logout | LogoutRequest | 204 No Content | - | Revoga refresh token (ou revoga todos do usuário autenticado) |
| POST | /api/auth/forgot-password | ForgotPasswordRequest | 200 OK | 404* | Gera token e envia por email (responde 200 mesmo se user nao existir) |
| POST | /api/auth/reset-password | ResetPasswordRequest | 204 No Content | 400 Bad Request | Reseta senha com token recebido |

**Models**
- RegisterRequest: { "email": string, "password": string, "confirmPassword": string, "fullName": string? }
- LoginRequest: { "email": string, "password": string }
- RegisterInviteRequest: { "token": string, "password": string, "confirmPassword": string, "fullName": string? }
- RefreshRequest: { "refreshToken": string }
- LogoutRequest: { "refreshToken": string? }
- AuthResponse: { "accessToken": string, "expiresAt": DateTime, "refreshToken": string?, "refreshTokenExpiresAt": DateTime?, "email": string, "fullName": string?, "empresaId": Guid?, "roles": string[], "permissions": string[], "tokenType": "Bearer" }
- ForgotPasswordRequest: { "email": string }
- ResetPasswordRequest: { "email": string, "token": string, "newPassword": string, "confirmPassword": string }

**Politica de acesso**
- Controllers Todo e Product exigem Authorization: Bearer {token} em todos endpoints.
- Policies (claims): `Todos.*` e `Produtos.*` (ex.: `Todos.Visualizar`, `Produtos.Criar`).
- Use o cadeado do Swagger UI para testar autenticado.
- Para renovar token, chame `/api/auth/refresh` enviando o `refreshToken` (nao precisa enviar o JWT).

### SignalR (AuthHub)

- Hub: `/hubs/auth` (autenticado via JWT; em WebSockets o token pode ir em `?access_token=...`)
- Evento: `AuthChanged({ reason, occurredAtUtc })` (enviado para o grupo do usuário quando roles/permissões mudam)

### Usuários Controller (roles + claims + policies)

| Method | Route | Policy | Description |
|--------|-------|--------|-------------|
| GET | /api/usuarios/roles | Usuarios.Visualizar | Lista roles disponíveis |
| GET | /api/usuarios/permissoes | Usuarios.Visualizar | Lista permissões (claims) padronizadas |
| GET | /api/usuarios | Usuarios.Visualizar | Lista usuários da mesma empresa |
| GET | /api/usuarios/{id} | Usuarios.Visualizar | Obtém usuário por id (mesma empresa) |
| POST | /api/usuarios | Usuarios.Criar | Cria usuário na mesma empresa + define roles/permissões |
| PUT | /api/usuarios/{id} | Usuarios.Editar | Atualiza usuário + roles/permissões (mesma empresa) |
| DELETE | /api/usuarios/{id} | Usuarios.Excluir | Exclui usuário (mesma empresa) |

**Models**
- UsuarioCreateRequest: { "email": string, "password": string, "fullName": string?, "roles": string[]?, "permissions": string[]? }
- UsuarioUpdateRequest: { "email": string?, "fullName": string?, "roles": string[]?, "permissions": string[]? }
- UsuarioResponse: { "id": string, "email": string, "fullName": string?, "empresaId": Guid?, "roles": string[], "permissions": string[] }

**Como funciona a permissão**
- Policy name = permission key (ex.: `Usuarios.Visualizar`)
- Claim type = `permission`, claim value = permission key
- Ex.: para liberar listagem de usuários para um usuário não-admin, adicione a claim `permission=Usuarios.Visualizar`

### Convites de Usuários (flow C)

| Method | Route | Policy | Description |
|--------|-------|--------|-------------|
| GET | /api/usuarios/convites | Usuarios.Convites.Visualizar | Lista convites da empresa |
| POST | /api/usuarios/convites | Usuarios.Convites.Criar | Cria convite (retorna token + inviteUrl) |
| DELETE | /api/usuarios/convites/{id} | Usuarios.Convites.Revogar | Revoga convite |

**Models**
- UserInviteCreateRequest: { "email": string, "roles": string[]?, "permissions": string[]?, "expiresInDays": int, "sendEmail": bool }
- UserInviteCreateResponse: { "id": Guid, "empresaId": Guid, "email": string, "roles": string[], "permissions": string[], "createdAt": DateTime, "expiresAt": DateTime, "token": string, "inviteUrl": string }
- UserInviteResponse: { "id": Guid, "empresaId": Guid, "email": string, "roles": string[], "permissions": string[], "createdAt": DateTime, "expiresAt": DateTime, "redeemedAt": DateTime?, "revokedAt": DateTime? }
### Todo Controller

| Method | Route | Request Body | Success | Error | Description |
|--------|-------|--------------|---------|-------|-------------|
| GET | `/api/todo` | - | `200 OK` | - | List all |
| GET | `/api/todo/{id}` | - | `200 OK` | `404 Not Found` | Get by ID |
| POST | `/api/todo` | `CreateTodoRequest` | `201 Created` | `400 Bad Request` | Create |
| PUT | `/api/todo/{id}` | `UpdateTodoRequest` | `200 OK` | `400 Bad Request`, `404 Not Found` | Update |
| DELETE | `/api/todo/{id}` | - | `204 No Content` | `404 Not Found` | Delete |

### Product Controller (com Cache)

| Method | Route | Cache | Success | Error | Description |
|--------|-------|-------|---------|-------|-------------|
| GET | `/api/product` | 5 min | `200 OK` | - | Lista todos (cached) |
| GET | `/api/product/{id}` | 5 min | `200 OK` | `404 Not Found` | Busca por ID (cached) |
| GET | `/api/product/category/{cat}` | 5 min | `200 OK` | - | Filtra por categoria (cached) |
| POST | `/api/product` | Invalida | `201 Created` | `400 Bad Request` | Cria produto |
| PUT | `/api/product/{id}` | Invalida | `200 OK` | `400`, `404` | Atualiza produto |
| DELETE | `/api/product/{id}` | Invalida | `204 No Content` | `404 Not Found` | Remove produto |

### OpenAPI Documentation

Cada endpoint é documentado com `[ProducesResponseType]` para geração correta do cliente NSwag:

```csharp
[HttpPost]
[SwaggerOperation(Summary = "Create a new todo")]
[ProducesResponseType(typeof(TodoDto), StatusCodes.Status201Created)]
[ProducesResponseType(StatusCodes.Status400BadRequest)]
public async Task<ActionResult<TodoDto>> Create([FromBody] CreateTodoRequest request)
```

**Anotações utilizadas:**
- `[SwaggerOperation]` - Summary/description do endpoint
- `[ProducesResponseType]` - Documenta status codes e tipos de retorno
- `[FromBody]` - Indica que o parâmetro vem do body da request

### DTOs

```csharp
// CreateTodoRequest
{ "title": string, "description": string? }

// UpdateTodoRequest
{ "title": string, "description": string?, "isCompleted": bool }

// TodoDto
{ "id": int, "title": string, "description": string?, "isCompleted": bool, "createdAt": DateTime, "updatedAt": DateTime? }
```

### Validation Rules

| Field | Rule |
|-------|------|
| `title` | Required, MaxLength(200) |
| `description` | MaxLength(1000) |

## URLs

| Ambiente | URL |
|----------|-----|
| HTTP | http://localhost:5110 |
| HTTPS | https://localhost:7104 |
| Swagger UI | http://localhost:5110/swagger |
| OpenAPI JSON | http://localhost:5110/swagger/v1/swagger.json |

## CORS

Configurado para permitir requests do frontend:

```csharp
policy.WithOrigins("http://localhost:5173")
      .AllowAnyHeader()
      .AllowAnyMethod();
```

## Testes Unitários

### Stack de Testes

| Categoria | Pacote | Versão | Finalidade |
|-----------|--------|--------|------------|
| **Framework** | xUnit | 2.9.2 | Test framework |
| **Runner** | xunit.runner.visualstudio | 2.8.2 | VS Test adapter |
| **SDK** | Microsoft.NET.Test.Sdk | 17.11.1 | .NET test SDK |
| **Mocking** | Moq | 4.20.72 | Mock objects |
| **Assertions** | FluentAssertions | 6.12.2 | Fluent assertion library |
| **Database** | Microsoft.EntityFrameworkCore.InMemory | 8.0.11 | In-memory EF Core provider |
| **Coverage** | coverlet.collector | 6.0.2 | Code coverage |

### Estrutura do Projeto de Testes

```
WebApplicationFlytwo.Tests/
├── Controllers/
│   ├── TodoControllerTests.cs      # 16 testes
│   └── ProductControllerTests.cs   # 26 testes (com cache)
├── Validators/
│   ├── CreateTodoValidatorTests.cs # 10 testes
│   └── UpdateTodoValidatorTests.cs # 12 testes
├── Mappings/
│   └── TodoProfileTests.cs         # 8 testes
├── Fixtures/
│   └── TestFixture.cs              # Test utilities (DbContext, Mapper, Cache, Factories)
└── WebApplicationFlytwo.Tests.csproj
```

### Padrão de Testes

Todos os testes seguem o padrão **AAA (Arrange-Act-Assert)**:

```csharp
[Fact]
public async Task GetById_WithValidId_ReturnsTodo()
{
    // Arrange
    using var context = _fixture.CreateContext();
    var mapper = _fixture.CreateMapper();
    var logger = _fixture.CreateLogger<TodoController>();

    var todo = new Todo { Id = 1, Title = "Test Todo", CreatedAt = DateTime.UtcNow };
    context.Todos.Add(todo);
    await context.SaveChangesAsync();

    var controller = new TodoController(context, mapper, logger.Object);

    // Act
    var result = await controller.GetById(1);

    // Assert
    result.Result.Should().BeOfType<OkObjectResult>();
    var okResult = result.Result as OkObjectResult;
    var returnedTodo = okResult!.Value as TodoDto;
    returnedTodo!.Id.Should().Be(1);
}
```

### Convenção de Nomenclatura

```
{Método}_{Cenário}_{ResultadoEsperado}
```

**Exemplos:**
- `GetById_WithValidId_ReturnsTodo`
- `GetById_WithInvalidId_ReturnsNotFound`
- `Create_WithValidRequest_ReturnsCreatedTodo`
- `Validate_WithEmptyTitle_ShouldHaveError`

### Test Fixture

A classe `TestFixture` fornece utilitários compartilhados:

```csharp
public class TestFixture : IDisposable
{
    // Cria DbContext com InMemory database (isolado por GUID)
    public AppDbContext CreateContext();

    // Cria IMapper configurado com TodoProfile
    public IMapper CreateMapper();

    // Cria Mock<ILogger<T>>
    public Mock<ILogger<T>> CreateLogger<T>();

    // Factory methods para entidades de teste
    public static Todo CreateTodo(int id = 1, string title = "Test Todo", ...);
    public static List<Todo> CreateTodos(int count);
}
```

### Cobertura de Testes

#### TodoController (16 testes)

| Método | Cenários Testados |
|--------|-------------------|
| `GetAll` | Retorna todos ordenados, lista vazia |
| `GetById` | ID válido, ID inválido (404) |
| `Create` | Request válido, seta CreatedAt, seta IsCompleted=false, persiste no DB, location header |
| `Update` | Request válido, seta UpdatedAt, preserva CreatedAt, ID inválido (404), persiste no DB |
| `Delete` | ID válido (204), ID inválido (404), remove do DB, não afeta outros registros |

#### CreateTodoValidator (10 testes)

| Campo | Cenários Testados |
|-------|-------------------|
| `Title` | Válido, vazio, null, whitespace, >200 chars, exatamente 200 chars |
| `Description` | null (ok), vazio (ok), >1000 chars, exatamente 1000 chars |

#### UpdateTodoValidator (12 testes)

| Campo | Cenários Testados |
|-------|-------------------|
| `Title` | Válido, vazio, null, whitespace, >200 chars, exatamente 200 chars |
| `Description` | null (ok), vazio (ok), >1000 chars, exatamente 1000 chars |
| `IsCompleted` | true, false |

#### TodoProfile (8 testes)

| Mapeamento | Cenários Testados |
|------------|-------------------|
| `Todo → TodoDto` | Todas propriedades, null description |
| `CreateTodoRequest → Todo` | Propriedades mapeadas, null description |
| `UpdateTodoRequest → Todo` | Propriedades mapeadas, null description |
| `IEnumerable<Todo>` | Coleção de entidades |

### CLI Commands

```bash
# Executar todos os testes
dotnet test

# Executar com output detalhado
dotnet test --verbosity normal

# Executar testes específicos (por filtro)
dotnet test --filter "FullyQualifiedName~TodoControllerTests"
dotnet test --filter "FullyQualifiedName~ValidatorTests"

# Executar com cobertura de código
dotnet test --collect:"XPlat Code Coverage"

# Gerar relatório de cobertura (requer reportgenerator)
dotnet tool install -g dotnet-reportgenerator-globaltool
reportgenerator -reports:"**/coverage.cobertura.xml" -targetdir:"coveragereport" -reporttypes:Html
```

### Boas Práticas Implementadas

1. **Isolamento**: Cada teste usa InMemory database com GUID único
2. **AAA Pattern**: Estrutura clara Arrange-Act-Assert
3. **Nomenclatura descritiva**: Nome do teste descreve cenário e resultado
4. **FluentAssertions**: Assertions legíveis e expressivas
5. **IClassFixture**: Compartilhamento eficiente de recursos
6. **Testes de borda**: Validação de limites (200/1000 chars)
7. **Testes negativos**: Cobertura de cenários de erro (404, validation errors)

## Cache (FusionCache + Redis)

### Arquitetura de Cache Híbrido

```
┌─────────────────────────────────────────────────────────────┐
│                      FusionCache                            │
├─────────────────────────────────────────────────────────────┤
│  L1: MemoryCache (ultra-rápido, local por instância)       │
│  L2: Redis (distribuído, compartilhado entre instâncias)   │
│  Fail-safe: Cache antigo usado se backend offline          │
│  Thundering herd protection: Lock por chave                │
└─────────────────────────────────────────────────────────────┘
```

### Padrões de Cache Implementados

| Padrão | Operação | Descrição |
|--------|----------|-----------|
| **Cache-aside** | GET | `GetOrSetAsync()` - busca do cache, se miss busca do DB e popula cache |
| **Invalidação seletiva** | POST/PUT/DELETE | `RemoveAsync()` - invalida chaves específicas e listas relacionadas |
| **Cache por filtro** | GET by category | Chave inclui parâmetro do filtro |

### Cache Keys

| Operação | Cache Key | TTL |
|----------|-----------|-----|
| GetAll | `products:all` | 5 min |
| GetById | `product:{id}` | 5 min |
| GetByCategory | `products:category:{category}` | 5 min |

### Exemplo de Uso

```csharp
// Cache-aside pattern com GetOrSetAsync
var product = await _cache.GetOrSetAsync(
    $"product:{id}",
    async ct => await _context.Products.FindAsync(new object[] { id }, ct)
);

// Invalidação após write
await _cache.RemoveAsync($"product:{id}");
await _cache.RemoveAsync("products:all");
```

### Configuração de Fail-Safe

O FusionCache está configurado com fail-safe habilitado:

| Config | Valor | Descrição |
|--------|-------|-----------|
| `Duration` | 5 min | TTL padrão do cache |
| `FailSafeMaxDuration` | 30 min | TTL máximo em modo fail-safe |
| `FactorySoftTimeout` | 1000 ms | Timeout antes de usar cache stale |
| `FactoryHardTimeout` | 5000 ms | Timeout máximo absoluto |
| `IsFailSafeEnabled` | true | Retorna cache antigo se DB offline |

### Seed de Dados

O banco é populado automaticamente com **1000 produtos** em 8 categorias na primeira execução:
- Electronics, Clothing, Books, Home, Sports, Toys, Food, Beauty
- Preços entre $1 e $1000
- 90% dos produtos ativos
