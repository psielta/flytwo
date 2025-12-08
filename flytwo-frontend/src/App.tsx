import { useState, useMemo } from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Button,
  Box,
  CssBaseline,
  ThemeProvider,
  createTheme,
  IconButton,
  Tooltip
} from '@mui/material'
import ListAltIcon from '@mui/icons-material/ListAlt'
import InventoryIcon from '@mui/icons-material/Inventory'
import Brightness4Icon from '@mui/icons-material/Brightness4'
import Brightness7Icon from '@mui/icons-material/Brightness7'
import { TodoList } from './components/TodoList'
import { ProductList } from './components/ProductList'

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
          primary: {
            main: '#1976d2',
          },
          secondary: {
            main: '#dc004e',
          },
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
                backgroundColor: location.pathname === '/' ? 'rgba(255,255,255,0.15)' : 'transparent',
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
                backgroundColor: location.pathname === '/products' ? 'rgba(255,255,255,0.15)' : 'transparent'
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

        <Box component="footer" sx={{ py: 2, px: 2, mt: 'auto', backgroundColor: mode === 'light' ? '#f5f5f5' : '#121212' }}>
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
