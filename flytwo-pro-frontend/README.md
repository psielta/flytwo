# FlyTwo Pro Frontend

Admin dashboard Angular para FlyTwo Pro, utilizando Angular Material e integracao com API Go via ng-openapi-gen.

## Tech Stack

| Tecnologia | Versao | Descricao |
|------------|--------|-----------|
| **Angular** | 21.x | Framework principal |
| **Angular Material** | 21.x | Biblioteca de UI (Material Design 3) |
| **ng-openapi-gen** | latest | Gerador de cliente HTTP tipado |
| **RxJS** | 7.8.x | Programacao reativa |
| **TypeScript** | 5.9.x | Linguagem |

## Estrutura do Projeto

```
src/app/
├── api/                    # [GERADO] Codigo do ng-openapi-gen - NAO EDITAR
│   ├── fn/                 # Funcoes de chamada HTTP
│   ├── models/             # DTOs tipados
│   ├── api.ts              # Service principal
│   └── api-configuration.ts
├── core/                   # Servicos singleton, guards, interceptors
│   ├── auth/               # AuthService, AuthGuard, GuestGuard
│   ├── services/           # ThemeService
│   └── interceptors/       # credentials, error
├── features/               # Paginas/modulos de funcionalidades
│   ├── auth/               # Login, Register
│   └── dashboard/          # Dashboard
├── shared/                 # Componentes reutilizaveis
│   ├── components/         # LogoComponent
│   └── layouts/            # AuthLayout, MainLayout
├── app.ts                  # Root component
├── app.config.ts           # Configuracao de providers
├── app.routes.ts           # Definicao de rotas
└── app.html
```

## Pre-requisitos

- Node.js 20+
- npm 10+
- Backend Go rodando em `http://localhost:3080`

## Setup Rapido

### 1. Instalar dependencias

```bash
npm install
```

### 2. Gerar cliente da API (requer backend rodando)

```bash
npm run api:generate
```

### 3. Iniciar servidor de desenvolvimento

```bash
npm start
```

O app estara disponivel em `http://localhost:4200`.

## Comandos Uteis

```bash
# Desenvolvimento
npm start                 # Servidor dev em localhost:4200
npm run watch             # Build em modo watch

# API
npm run api:generate      # Regenerar cliente da API (backend deve estar rodando)

# Build
npm run build             # Build de producao

# Testes
npm test                  # Executar testes (Vitest)
```

## Testes Unitarios

### Configuracao

O projeto usa o novo builder `@angular/build:unit-test` que integra **Vitest** como test runner. Nao requer `zone.js/testing`.

### Executar Testes

```bash
npm test                  # Modo watch
```

### Estrutura de Testes

Arquivos de teste seguem o padrao `*.spec.ts` e ficam junto aos arquivos que testam:

```
src/app/features/catalog/
├── services/
│   ├── catalog.service.ts
│   └── catalog.service.spec.ts    # Teste do service
├── catmat-search/
│   ├── catmat-search.component.ts
│   └── catmat-search.component.spec.ts  # Teste do component
```

### Padrao para Testes de Services

```typescript
import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { MyService } from './my.service';

describe('MyService', () => {
  let service: MyService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        MyService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(MyService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should make HTTP request', async () => {
    const resultPromise = firstValueFrom(service.getData());

    const req = httpMock.expectOne('/api/data');
    req.flush({ data: 'test' });

    const result = await resultPromise;
    expect(result.data).toBe('test');
  });
});
```

### Padrao para Testes de Components

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { MyComponent } from './my.component';
import { MyService } from '../services/my.service';

describe('MyComponent', () => {
  let component: MyComponent;
  let fixture: ComponentFixture<MyComponent>;
  let serviceMock: { getData: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    serviceMock = {
      getData: vi.fn().mockReturnValue(of({ data: 'test' })),
    };

    await TestBed.configureTestingModule({
      imports: [MyComponent, NoopAnimationsModule],
      providers: [{ provide: MyService, useValue: serviceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(MyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call service on init', () => {
    expect(serviceMock.getData).toHaveBeenCalled();
  });
});
```

### Boas Praticas

1. **Usar `vi.fn()` para mocks** (Vitest)
2. **Usar `firstValueFrom()` para async** em vez de `fakeAsync/tick` (nao suportado sem zone.js)
3. **Usar `NoopAnimationsModule`** para evitar problemas com animacoes Material
4. **Usar mocks para services** em testes de componentes
5. **Verificar HTTP requests com `httpMock.verify()`** em afterEach
6. **Criar nova fixture para testar inputs diferentes** quando computed signals dependem do input

## Integracao com API

### Configuracao

O cliente HTTP e gerado automaticamente a partir do endpoint OpenAPI do backend:

```
http://localhost:3080/swagger/doc.json
```

### Regenerar apos mudancas no backend

Quando o backend atualizar endpoints:

1. Certifique-se que o backend esta rodando
2. Execute `npm run api:generate`
3. Os arquivos em `src/app/api/` serao atualizados

### Arquivos gerados (NAO EDITAR)

- `src/app/api/models/*.ts` - DTOs tipados
- `src/app/api/fn/*.ts` - Funcoes HTTP
- `src/app/api/api.ts` - Service principal
- `src/app/api/api-configuration.ts` - Configuracao

## Autenticacao

### Fluxo

1. Usuario faz login via `/login`
2. Backend retorna cookie de sessao (HttpOnly)
3. Cookie e enviado automaticamente em todas requisicoes (`withCredentials: true`)
4. `AuthService` gerencia estado de autenticacao com signals
5. Guards protegem rotas baseado no estado

### Login

O metodo `login()` do AuthService:
1. Envia credenciais para `/users/login`
2. Aguarda resposta e busca perfil do usuario (`/users/me`)
3. Apenas retorna `true` apos ambas requisicoes completarem
4. Componente mantem loading state ate redirect completar

### Logout

O metodo `logout()` do AuthService:
1. Limpa estado local imediatamente (evita loops de 401)
2. Envia requisicao para `/users/logout`
3. Redireciona automaticamente para `/login` (sucesso ou erro)

### Guards

| Guard | Uso |
|-------|-----|
| `authGuard` | Rotas protegidas - requer autenticacao |
| `guestGuard` | Rotas publicas - redireciona se autenticado |

Os guards verificam `initialized()` para evitar multiplas chamadas ao `checkAuth()`.

### Usando AuthService

```typescript
import { AuthService } from './core/auth';

@Component({...})
export class MyComponent {
  private readonly authService = inject(AuthService);

  // Signals reativos
  isAuthenticated = this.authService.isAuthenticated;
  currentUser = this.authService.user;
  isLoading = this.authService.isLoading;

  login() {
    this.authService.login({ email, password }).subscribe(success => {
      if (success) {
        // Usuario ja esta autenticado, pode redirecionar
        this.router.navigate(['/dashboard']);
      }
    });
  }

  logout() {
    // Redireciona automaticamente para /login
    this.authService.logout().subscribe();
  }
}
```

## Tema (Dark/Light Mode)

### Usando ThemeService

```typescript
import { ThemeService } from './core/services';

@Component({...})
export class MyComponent {
  private readonly themeService = inject(ThemeService);

  isDarkMode = this.themeService.isDarkMode;

  toggleTheme() {
    this.themeService.toggleTheme();
  }
}
```

### Persistencia

O tema e salvo em `localStorage` com a chave `themeMode`.

## Adicionando Novas Features

### Nova Rota Publica

1. Criar componente em `src/app/features/`
2. Adicionar rota como child de `AuthLayoutComponent` em `app.routes.ts`
3. Aplicar `guestGuard` se necessario

### Nova Rota Protegida

1. Criar componente em `src/app/features/`
2. Adicionar rota como child de `MainLayoutComponent` em `app.routes.ts`
3. `authGuard` ja esta aplicado no layout pai

Exemplo:

```typescript
// app.routes.ts
{
  path: '',
  component: MainLayoutComponent,
  canActivate: [authGuard],
  children: [
    { path: 'dashboard', component: DashboardComponent },
    { path: 'users', component: UsersComponent },     // Nova rota
    { path: 'settings', component: SettingsComponent }, // Nova rota
  ],
}
```

### Novo Componente Compartilhado

1. Criar em `src/app/shared/components/`
2. Exportar como standalone component
3. Importar onde necessario

## Angular Material

### Componentes utilizados

| Modulo | Uso |
|--------|-----|
| `MatToolbarModule` | Toolbar do layout |
| `MatSidenavModule` | Navegacao lateral |
| `MatButtonModule` | Botoes |
| `MatCardModule` | Cards de formulario e perfil |
| `MatFormFieldModule` | Campos de formulario |
| `MatInputModule` | Inputs |
| `MatIconModule` | Icones |
| `MatSnackBarModule` | Notificacoes |
| `MatProgressSpinnerModule` | Loading states |
| `MatListModule` | Lista de navegacao |
| `MatMenuModule` | Menus dropdown |

### Tema

O tema usa Material Design 3 com paleta azure/rose:

- **Light theme**: Padrao
- **Dark theme**: Ativado com classe `dark-theme` no `<html>`

## Endpoints da API

| Metodo | Endpoint | Descricao | Autenticacao |
|--------|----------|-----------|--------------|
| POST | `/users/signup` | Criar novo usuario | Nao |
| POST | `/users/login` | Login | Nao |
| POST | `/users/logout` | Logout | Sim |
| GET | `/users/me` | Perfil do usuario | Sim |

## Troubleshooting

### Erro de CORS

- Verificar se backend esta rodando em `localhost:3080`
- Verificar se CORS esta configurado no backend com `AllowCredentials: true`

### Cookie nao enviado

- Verificar `withCredentials: true` no interceptor
- Verificar se `AllowCredentials: true` no CORS do backend
- Usar `http://` (nao `https://`) em desenvolvimento

### API desatualizada

```bash
npm run api:generate
```

### Erro ao gerar API

- Verificar se backend esta rodando
- Verificar se `http://localhost:3080/swagger/doc.json` retorna JSON valido

## Scripts do package.json

```json
{
  "start": "ng serve",
  "build": "ng build",
  "test": "ng test",
  "api:generate": "ng-openapi-gen --config ng-openapi-gen.json"
}
```

## Convenções de Commit

- `feat:` nova funcionalidade
- `fix:` correcao de bug
- `refactor:` refatoracao
- `docs:` documentacao
- `style:` formatacao
