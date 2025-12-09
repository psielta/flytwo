import Brightness4Icon from '@mui/icons-material/Brightness4'
import Brightness7Icon from '@mui/icons-material/Brightness7'
import InventoryIcon from '@mui/icons-material/Inventory'
import ListAltIcon from '@mui/icons-material/ListAlt'
import {
  AppBar,
  Box,
  Button,
  Container,
  createTheme,
  CssBaseline,
  IconButton,
  ThemeProvider,
  Toolbar,
  Tooltip,
  Typography
} from '@mui/material'
import { useMemo, useState } from 'react'
import { Link, Route, Routes, useLocation } from 'react-router-dom'
import { ProductList } from './components/ProductList'
import { TodoList } from './components/TodoList'

function App() {
  const location = useLocation()
  const [mode, setMode] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('themeMode')
    return (saved === 'dark' || saved === 'light') ? saved : 'light'
  })

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
        },
      }),
    [mode]
  )

  const toggleTheme = () => {
    setMode((prevMode) => {
      const newMode = prevMode === 'light' ? 'dark' : 'light'
      localStorage.setItem('themeMode', newMode)
      return newMode
    })
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              FlyTwo
            </Typography>
            <Button
              color="inherit"
              component={Link}
              to="/"
              startIcon={<ListAltIcon />}
              sx={{
                backgroundColor: location.pathname === '/' ? 'action.selected' : 'transparent',
                '&:hover': {
                  backgroundColor: location.pathname === '/' ? 'action.selected' : 'action.hover',
                },
                mr: 1
              }}
            >
              Todos
            </Button>
            <Button
              color="inherit"
              component={Link}
              to="/products"
              startIcon={<InventoryIcon />}
              sx={{
                backgroundColor: location.pathname === '/products' ? 'action.selected' : 'transparent',
                '&:hover': {
                  backgroundColor: location.pathname === '/products' ? 'action.selected' : 'action.hover',
                }
              }}
            >
              Products
            </Button>
            <Tooltip title={mode === 'light' ? 'Dark mode' : 'Light mode'}>
              <IconButton color="inherit" onClick={toggleTheme} sx={{ ml: 1 }}>
                {mode === 'light' ? <Brightness4Icon /> : <Brightness7Icon />}
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>

        <Container maxWidth="xl" sx={{ mt: 4, mb: 4, flex: 1, px: { xs: 2, sm: 3, md: 4 } }}>
          <Routes>
            <Route path="/" element={<TodoList />} />
            <Route path="/products" element={<ProductList />} />
          </Routes>
        </Container>

        <Box component="footer" sx={{ py: 2, px: 2, mt: 'auto', backgroundColor: 'background.paper', borderTop: 1, borderColor: 'divider' }}>
          <Container maxWidth="lg">
            <Typography variant="body2" color="text.secondary" align="center">
              FlyTwo - React + Vite + MUI + ASP.NET Core
            </Typography>
          </Container>
        </Box>
      </Box>
    </ThemeProvider>
  )
}

export default App
