# FlyTwo Frontend

React 19 + TypeScript + Vite SPA com Material UI.

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

## Arquitetura

```
flytwo-frontend/
├── src/
│   ├── api/
│   │   └── api-client.ts       # NSwag generated TypeScript client
│   ├── components/
│   │   ├── TodoList.tsx        # Todo CRUD component
│   │   └── ProductList.tsx     # Product CRUD component
│   ├── App.tsx                 # Main app with routing & theme
│   ├── main.tsx                # React entrypoint
│   └── index.css               # Global reset styles
├── public/                     # Static assets
├── index.html                  # HTML template
├── package.json                # Dependencies & scripts
├── tsconfig.json               # TypeScript config
├── vite.config.ts              # Vite config
└── nswag.json                  # NSwag client generation config
```

## Configuracao de Rotas

```tsx
// App.tsx
<Routes>
  <Route path="/" element={<TodoList />} />
  <Route path="/products" element={<ProductList />} />
</Routes>
```

| Rota | Componente | Descricao |
|------|------------|-----------|
| `/` | `TodoList` | Gerenciamento de tarefas |
| `/products` | `ProductList` | Catalogo de produtos |

## Material UI Theme

### Light/Dark Mode Toggle

O app suporta alternancia entre modo claro e escuro com persistencia no localStorage:

```tsx
const [mode, setMode] = useState<'light' | 'dark'>(() => {
  const saved = localStorage.getItem('themeMode')
  return (saved === 'dark' || saved === 'light') ? saved : 'light'
})

const theme = useMemo(
  () => createTheme({
    palette: {
      mode,
      primary: { main: '#1976d2' },
      secondary: { main: '#dc004e' },
    },
  }),
  [mode]
)
```

### Componentes MUI Utilizados

| Componente | Uso |
|------------|-----|
| `AppBar` / `Toolbar` | Header com navegacao |
| `Container` | Layout responsivo (maxWidth="xl") |
| `Button` / `IconButton` | Acoes e navegacao |
| `TextField` / `Select` | Inputs de formulario |
| `Table` / `TableContainer` | Listagem de produtos |
| `List` / `ListItem` | Listagem de todos |
| `Dialog` | Modais de formulario e confirmacao |
| `Chip` | Tags de status e categoria |
| `Alert` | Mensagens de erro |
| `CircularProgress` | Loading state |
| `Checkbox` | Toggle de completude |
| `Tooltip` | Hints de interface |

## Formularios com Formik + Yup

### Padrao de Validacao

```tsx
// Schema de validacao com Yup
const ProductSchema = Yup.object().shape({
  name: Yup.string()
    .min(2, "Name must be at least 2 characters")
    .max(200, "Name must be at most 200 characters")
    .required("Name is required"),
  price: Yup.number()
    .min(0.01, "Price must be at least 0.01")
    .required("Price is required"),
  // ...
});

// Formulario com Formik
<Formik
  initialValues={initialFormValues}
  validationSchema={ProductSchema}
  onSubmit={handleSubmit}
  enableReinitialize
>
  {({ values, errors, touched, handleChange, handleBlur, isSubmitting }) => (
    <Form>
      <TextField
        name="name"
        value={values.name}
        onChange={handleChange}
        onBlur={handleBlur}
        error={touched.name && Boolean(errors.name)}
        helperText={touched.name && errors.name}
      />
    </Form>
  )}
</Formik>
```

### Regras de Validacao

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

### Configuracao (nswag.json)

```json
{
  "runtime": "Net80",
  "documentGenerator": {
    "fromDocument": {
      "url": "http://localhost:5110/swagger/v1/swagger.json"
    }
  },
  "codeGenerators": {
    "openApiToTypeScriptClient": {
      "className": "ApiClient",
      "template": "fetch",
      "generateClientClasses": true,
      "generateDtoTypes": true,
      "output": "src/api/api-client.ts"
    }
  }
}
```

### Uso do Cliente

```tsx
import { ApiClient } from "../api/api-client";
import type { ProductDto, CreateProductRequest } from "../api/api-client";

const client = new ApiClient("http://localhost:5110");

// GET todos os produtos
const products = await client.productAll();

// GET por ID
const product = await client.product(id);

// GET por categoria
const filtered = await client.category("Electronics");

// POST criar
await client.productPOST(request);

// PUT atualizar
await client.productPUT(id, request);

// DELETE remover
await client.productDELETE(id);
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

# Lint
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

## Estrutura dos Componentes

### TodoList

```
TodoList
├── Header (titulo + contador de status)
├── Add Button → Dialog (formulario)
├── List
│   └── ListItem (checkbox + texto + acoes)
│       ├── Checkbox (toggle complete)
│       ├── ListItemText (titulo + descricao)
│       └── Actions (edit + delete)
├── Form Dialog (Formik)
└── Delete Confirmation Dialog
```

### ProductList

```
ProductList
├── Header (titulo + add button)
├── Filter (Select de categoria)
├── Table
│   └── TableRow
│       ├── Name + Description
│       ├── Category (Chip)
│       ├── Price (formatado)
│       ├── Stock (vermelho se < 10)
│       ├── SKU (monospace)
│       ├── Active Status (Chip)
│       └── Actions (edit + delete)
├── Form Dialog (Formik)
└── Delete Confirmation Dialog
```

## Features

- [x] CRUD completo para Todos
- [x] CRUD completo para Products
- [x] Validacao client-side com Yup
- [x] Formularios gerenciados com Formik
- [x] UI responsiva com Material UI
- [x] Theme toggle (light/dark mode)
- [x] Persistencia de tema no localStorage
- [x] Navegacao client-side com React Router
- [x] Loading states com CircularProgress
- [x] Error handling com Alert
- [x] Confirmacao de delete com Dialog
- [x] Filtro por categoria (Products)
- [x] Status indicators (chips coloridos)
- [x] API client tipado (NSwag generated)
