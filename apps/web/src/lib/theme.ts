'use client';
import { createTheme, alpha } from '@mui/material/styles';

const palette = {
  primary: {
    main: '#1F6544',
    light: '#4A8A6A',
    dark: '#0D3D28',
    contrastText: '#FFFFFF',
    container: '#B8DFCB',
    onContainer: '#002111',
  },
  secondary: {
    main: '#C7670F',
    light: '#E08540',
    dark: '#8F4600',
    contrastText: '#FFFFFF',
    container: '#FFDCC2',
    onContainer: '#2A1400',
  },
  tertiary: {
    main: '#006590',
    container: '#C0E8FF',
    onContainer: '#001E2D',
    contrastText: '#FFFFFF',
  },
  error: {
    main: '#BA1A1A',
    container: '#FFDAD6',
    onContainer: '#410002',
    contrastText: '#FFFFFF',
  },
};

export const colors = {
  ...palette,
  background: '#F2F5F2',
  surface: '#FAFDF9',
  surfaceVariant: '#DCE5DC',
  onSurface: '#1A1C1A',
  onSurfaceVariant: '#404943',
  outline: '#6F7972',
  outlineVariant: '#BFC9C1',
  // Status
  status: {
    draft: { bg: '#DCE5DC', text: '#404943' },
    submitted: { bg: '#C0E8FF', text: '#001E2D' },
    approved: { bg: '#B8DFCB', text: '#002111' },
    rejected: { bg: '#FFDAD6', text: '#410002' },
    dispatched: { bg: '#FFDCC2', text: '#2A1400' },
    delivered: { bg: '#002111', text: '#B8DFCB' },
  },
};

export const theme = createTheme({
  palette: {
    primary: { main: '#1F6544', light: '#4A8A6A', dark: '#0D3D28', contrastText: '#FFFFFF' },
    secondary: { main: '#C7670F', light: '#E08540', dark: '#8F4600', contrastText: '#FFFFFF' },
    error: { main: '#BA1A1A', contrastText: '#FFFFFF' },
    background: { default: '#F2F5F2', paper: '#FAFDF9' },
    text: { primary: '#1A1C1A', secondary: '#404943', disabled: '#6F7972' },
    divider: '#BFC9C1',
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: '"Google Sans", "Inter", "Roboto", sans-serif',
    h1: { fontSize: '3.5625rem', fontWeight: 400, lineHeight: 1.12 },
    h2: { fontSize: '2.8125rem', fontWeight: 400, lineHeight: 1.16 },
    h3: { fontSize: '2.25rem', fontWeight: 400, lineHeight: 1.22 },
    h4: { fontSize: '2rem', fontWeight: 400, lineHeight: 1.25 },
    h5: { fontSize: '1.75rem', fontWeight: 400, lineHeight: 1.29 },
    h6: { fontSize: '1.375rem', fontWeight: 500, lineHeight: 1.27 },
    subtitle1: { fontSize: '1rem', fontWeight: 500, lineHeight: 1.5, letterSpacing: '0.009em' },
    subtitle2: { fontSize: '0.875rem', fontWeight: 500, lineHeight: 1.43, letterSpacing: '0.006em' },
    body1: { fontSize: '1rem', fontWeight: 400, lineHeight: 1.5, letterSpacing: '0.031em' },
    body2: { fontSize: '0.875rem', fontWeight: 400, lineHeight: 1.43, letterSpacing: '0.018em' },
    button: { fontSize: '0.875rem', fontWeight: 500, lineHeight: 1.14, letterSpacing: '0.006em' },
    caption: { fontSize: '0.75rem', fontWeight: 400, lineHeight: 1.33, letterSpacing: '0.033em' },
    overline: { fontSize: '0.6875rem', fontWeight: 500, lineHeight: 1.45, letterSpacing: '0.059em' },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: '#F2F5F2', color: '#1A1C1A' },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 24,
          textTransform: 'none',
          fontWeight: 500,
          fontSize: '0.875rem',
          letterSpacing: '0.006em',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': { boxShadow: '0 1px 2px rgba(0,0,0,0.3), 0 1px 3px 1px rgba(0,0,0,0.15)' },
          '&:focus': { boxShadow: 'none' },
        },
        outlined: {
          '&:hover': { backgroundColor: alpha('#1F6544', 0.08) },
        },
        text: {
          '&:hover': { backgroundColor: alpha('#1F6544', 0.08) },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
          backgroundColor: '#FAFDF9',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          height: 32,
          fontWeight: 500,
          fontSize: '0.75rem',
        },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            '& fieldset': { borderColor: '#BFC9C1' },
            '&:hover fieldset': { borderColor: '#1F6544' },
            '&.Mui-focused fieldset': { borderColor: '#1F6544' },
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
        elevation1: { boxShadow: '0 1px 2px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)' },
        elevation2: { boxShadow: '0 1px 2px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.08)' },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: { fontWeight: 600, backgroundColor: '#F2F5F2', color: '#1A1C1A' },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '&.MuiAlert-standardSuccess': { backgroundColor: '#B8DFCB', color: '#002111' },
          '&.MuiAlert-standardError': { backgroundColor: '#FFDAD6', color: '#410002' },
          '&.MuiAlert-standardWarning': { backgroundColor: '#FFDCC2', color: '#2A1400' },
          '&.MuiAlert-standardInfo': { backgroundColor: '#C0E8FF', color: '#001E2D' },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 20, backgroundColor: '#FAFDF9' },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          fontSize: '0.875rem',
          minHeight: 48,
        },
      },
    },
  },
});

export default theme;
