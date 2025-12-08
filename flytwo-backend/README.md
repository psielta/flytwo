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

## Arquitetura

```
WebApplicationFlytwo/
├── Controllers/           # API Controllers (presentation layer)
├── Data/                  # DbContext (data access layer)
├── DTOs/                  # Request/Response objects
├── Entities/              # Domain entities (EF Core models)
├── Mappings/              # AutoMapper profiles
├── Migrations/            # EF Core migrations
├── Validators/            # FluentValidation validators
├── Program.cs             # Application bootstrap & DI configuration
├── appsettings.json       # Configuration
└── logs/                  # Serilog file output
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
```

### Connection String

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=flytwodb;Username=flytwo;Password=flytwo123"
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
docker-compose up -d      # Iniciar PostgreSQL
docker-compose down       # Parar
docker-compose down -v    # Parar e remover volumes
```

## API Endpoints

### Todo Controller

| Method | Route | Request Body | Success | Error | Description |
|--------|-------|--------------|---------|-------|-------------|
| GET | `/api/todo` | - | `200 OK` | - | List all |
| GET | `/api/todo/{id}` | - | `200 OK` | `404 Not Found` | Get by ID |
| POST | `/api/todo` | `CreateTodoRequest` | `201 Created` | `400 Bad Request` | Create |
| PUT | `/api/todo/{id}` | `UpdateTodoRequest` | `200 OK` | `400 Bad Request`, `404 Not Found` | Update |
| DELETE | `/api/todo/{id}` | - | `204 No Content` | `404 Not Found` | Delete |

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
│   └── TodoControllerTests.cs      # 16 testes
├── Validators/
│   ├── CreateTodoValidatorTests.cs # 10 testes
│   └── UpdateTodoValidatorTests.cs # 12 testes
├── Mappings/
│   └── TodoProfileTests.cs         # 8 testes
├── Fixtures/
│   └── TestFixture.cs              # Test utilities
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
