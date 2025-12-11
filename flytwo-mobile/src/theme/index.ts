import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

// Material UI default colors
const muiColors = {
  primary: '#1976d2',        // MUI primary blue
  primaryLight: '#42a5f5',   // MUI primary light
  primaryDark: '#1565c0',    // MUI primary dark
  secondary: '#9c27b0',      // MUI secondary purple
  secondaryLight: '#ba68c8',
  secondaryDark: '#7b1fa2',
  error: '#d32f2f',          // MUI error red
  errorLight: '#ef5350',
  errorDark: '#c62828',
  warning: '#ed6c02',        // MUI warning orange
  info: '#0288d1',           // MUI info blue
  success: '#2e7d32',        // MUI success green
};

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: muiColors.primary,
    primaryContainer: '#e3f2fd',      // Light blue background
    onPrimary: '#ffffff',
    onPrimaryContainer: '#1565c0',
    secondary: muiColors.secondary,
    secondaryContainer: '#f3e5f5',    // Light purple background
    onSecondary: '#ffffff',
    onSecondaryContainer: '#7b1fa2',
    tertiary: muiColors.info,
    tertiaryContainer: '#e1f5fe',
    error: muiColors.error,
    errorContainer: '#ffebee',
    onError: '#ffffff',
    onErrorContainer: '#c62828',
    background: '#fafafa',            // MUI grey[50]
    onBackground: '#212121',          // MUI grey[900]
    surface: '#ffffff',
    onSurface: '#212121',
    surfaceVariant: '#f5f5f5',        // MUI grey[100]
    onSurfaceVariant: '#757575',      // MUI grey[600]
    outline: '#bdbdbd',               // MUI grey[400]
    outlineVariant: '#e0e0e0',        // MUI grey[300]
    inverseSurface: '#212121',
    inverseOnSurface: '#fafafa',
    inversePrimary: '#90caf9',
    elevation: {
      level0: 'transparent',
      level1: '#ffffff',
      level2: '#fafafa',
      level3: '#f5f5f5',
      level4: '#f0f0f0',
      level5: '#ebebeb',
    },
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#90caf9',               // MUI blue[200] for dark mode
    primaryContainer: '#1565c0',
    onPrimary: '#003258',
    onPrimaryContainer: '#e3f2fd',
    secondary: '#ce93d8',             // MUI purple[200]
    secondaryContainer: '#7b1fa2',
    onSecondary: '#4a0072',
    onSecondaryContainer: '#f3e5f5',
    tertiary: '#81d4fa',              // MUI lightBlue[200]
    tertiaryContainer: '#01579b',
    error: '#ef9a9a',                 // MUI red[200]
    errorContainer: '#c62828',
    onError: '#601410',
    onErrorContainer: '#ffebee',
    background: '#121212',            // MUI dark background
    onBackground: '#ffffff',
    surface: '#1e1e1e',               // MUI dark surface
    onSurface: '#ffffff',
    surfaceVariant: '#2c2c2c',
    onSurfaceVariant: '#bdbdbd',
    outline: '#757575',
    outlineVariant: '#424242',
    inverseSurface: '#ffffff',
    inverseOnSurface: '#212121',
    inversePrimary: '#1976d2',
    elevation: {
      level0: 'transparent',
      level1: '#1e1e1e',
      level2: '#232323',
      level3: '#282828',
      level4: '#2c2c2c',
      level5: '#313131',
    },
  },
};
