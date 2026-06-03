import { MD3LightTheme } from 'react-native-paper';

// Urban Company-inspired palette
export const ds = {
  bg: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#F7F7F7',
  tile: '#F5F5F5',
  primary: '#00A693',
  primaryDark: '#007A6B',
  primaryLight: '#E6F7F5',
  primaryMuted: '#E6F7F5',
  purple: '#5B4EE8',
  purpleLight: '#EEF0FF',
  text: '#1C1C1E',
  textMuted: '#6E6E73',
  textLight: '#AEAEB2',
  border: '#E5E5EA',
  borderLight: '#F0F0F0',
  green: '#34C759',
  greenLight: '#E9FAF0',
  red: '#FF3B30',
  redLight: '#FFF2F1',
  amber: '#FF9500',
  amberLight: '#FFF8EC',
  blue: '#007AFF',
  blueLight: '#F0F6FF',
  radiusXS: 8,
  radiusSM: 8,
  radiusMD: 12,
  radiusLG: 16,
  radiusXL: 20,
  radiusFull: 999,
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  shadowMD: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 },
  status: {
    draft:      { bg: '#F5F5F5', text: '#6E6E73', label: 'Draft' },
    submitted:  { bg: '#EEF0FF', text: '#5B4EE8', label: 'Sent to Warehouse' },
    approved:   { bg: '#E9FAF0', text: '#00A693', label: 'Approved' },
    rejected:   { bg: '#FFF2F1', text: '#FF3B30', label: 'Needs Attention' },
    dispatched: { bg: '#FFF8EC', text: '#FF9500', label: 'On Its Way' },
    delivered:  { bg: '#E9FAF0', text: '#007A6B', label: 'Delivered ✓' },
  },
};

// SF Pro system font — identical feel to DM Sans, zero native modules needed
export const font = {
  light:    undefined,   // system light
  regular:  undefined,   // system regular
  medium:   undefined,   // system medium
  semibold: undefined,   // system semibold
  bold:     undefined,   // system bold
};

// Typography presets using SF Pro (system) with fontWeight for weight control
// SF Pro on iOS is clean, sharp, minimal — exactly like Urban Company
export const type = {
  display:   { fontWeight: '700' as const, fontSize: 30, letterSpacing: -0.5, lineHeight: 36, color: '#1C1C1E' },
  heading:   { fontWeight: '700' as const, fontSize: 24, letterSpacing: -0.3, lineHeight: 30, color: '#1C1C1E' },
  title:     { fontWeight: '600' as const, fontSize: 18, letterSpacing: -0.2, lineHeight: 24, color: '#1C1C1E' },
  subtitle:  { fontWeight: '600' as const, fontSize: 16, letterSpacing: -0.1, lineHeight: 22, color: '#1C1C1E' },
  body:      { fontWeight: '400' as const, fontSize: 15, letterSpacing: 0,    lineHeight: 22, color: '#1C1C1E' },
  bodyMuted: { fontWeight: '400' as const, fontSize: 15, letterSpacing: 0,    lineHeight: 22, color: '#6E6E73' },
  small:     { fontWeight: '400' as const, fontSize: 13, letterSpacing: 0,    lineHeight: 18, color: '#6E6E73' },
  label:     { fontWeight: '600' as const, fontSize: 11, letterSpacing: 1.2,  lineHeight: 14, textTransform: 'uppercase' as const },
  number:    { fontWeight: '700' as const, fontSize: 28, letterSpacing: -0.5, lineHeight: 32, color: '#1C1C1E' },
  numberSM:  { fontWeight: '600' as const, fontSize: 20, letterSpacing: -0.3, lineHeight: 24, color: '#1C1C1E' },
  button:    { fontWeight: '600' as const, fontSize: 16, letterSpacing: 0,    lineHeight: 20 },
  buttonSM:  { fontWeight: '500' as const, fontSize: 14, letterSpacing: 0,    lineHeight: 18 },
};

// backward compat
export const carbon = {
  brand: ds.primary, brandLight: ds.primaryLight, background: ds.bg,
  layer01: ds.surface, textPrimary: ds.text, textSecondary: ds.textMuted,
  borderSubtle: ds.border, error: ds.red, errorBg: ds.redLight,
  warning: ds.amber, warningBg: ds.amberLight,
  // legacy fields used by OrderDetailScreen
  gray10: ds.surfaceAlt, gray20: ds.borderLight, gray30: ds.border,
  gray50: ds.textLight, gray70: ds.textMuted, gray100: ds.text,
  info: ds.blue, infoBg: ds.blueLight,
};

export const colors = {
  primary: ds.primary, surface: ds.surface, background: ds.bg,
  textPrimary: ds.text, textSecondary: ds.textMuted, error: ds.red,
  onSurface: ds.text, onSurfaceVariant: ds.textMuted,
  outline: ds.border, outlineVariant: ds.border,
  primaryContainer: ds.primaryLight, onPrimaryContainer: ds.primaryDark,
  secondaryContainer: ds.amberLight, onSecondaryContainer: '#92400E',
  errorContainer: ds.redLight, onErrorContainer: '#991B1B',
  success: ds.green,
  secondary: ds.amber,
  onPrimary: '#FFFFFF',
  onSecondary: '#FFFFFF',
  surfaceVariant: ds.surfaceAlt,
};

export const STATUS_LABELS = Object.fromEntries(
  Object.entries(ds.status).map(([k, v]) => [k, v.label])
);

export const STATUS_STYLE = Object.fromEntries(
  Object.entries(ds.status).map(([k, v]) => [k, { bg: v.bg, text: v.text, border: v.bg }])
);

// Legacy alias used by OrdersScreen
export const STATUS_COLORS: Record<string, { bg: string; color: string; text: string; icon: string }> = {
  draft:      { bg: ds.status.draft.bg,      color: ds.status.draft.text,      text: ds.status.draft.text,      icon: 'document-outline' },
  submitted:  { bg: ds.status.submitted.bg,  color: ds.status.submitted.text,  text: ds.status.submitted.text,  icon: 'send-outline' },
  approved:   { bg: ds.status.approved.bg,   color: ds.status.approved.text,   text: ds.status.approved.text,   icon: 'checkmark-circle' },
  rejected:   { bg: ds.status.rejected.bg,   color: ds.status.rejected.text,   text: ds.status.rejected.text,   icon: 'close-circle' },
  dispatched: { bg: ds.status.dispatched.bg, color: ds.status.dispatched.text, text: ds.status.dispatched.text, icon: 'car-outline' },
  delivered:  { bg: ds.status.delivered.bg,  color: ds.status.delivered.text,  text: ds.status.delivered.text,  icon: 'checkmark-done' },
};

// Legacy alias
export const COLORS = ['#00A693', '#5B4EE8', '#FF9500', '#007AFF', '#FF3B30', '#34C759'];

export const paperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: ds.primary,
    onPrimary: '#FFFFFF',
    primaryContainer: ds.primaryLight,
    onPrimaryContainer: ds.primaryDark,
    secondary: ds.purple,
    onSecondary: '#FFFFFF',
    secondaryContainer: ds.purpleLight,
    onSecondaryContainer: ds.purple,
    error: ds.red,
    onError: '#FFFFFF',
    errorContainer: ds.redLight,
    onErrorContainer: '#991B1B',
    background: ds.bg,
    onBackground: ds.text,
    surface: ds.surface,
    onSurface: ds.text,
    surfaceVariant: ds.tile,
    onSurfaceVariant: ds.textMuted,
    outline: ds.border,
    outlineVariant: ds.border,
    elevation: {
      level0: 'transparent',
      level1: ds.surface,
      level2: ds.surface,
      level3: ds.surface,
      level4: ds.surface,
      level5: ds.surface,
    },
  },
};
