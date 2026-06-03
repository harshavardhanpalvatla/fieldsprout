// Carbon design tokens
export const C = {
  // Backgrounds
  background: '#f4f4f4',
  layer01: '#ffffff',
  layer02: '#f4f4f4',
  layerHover01: '#e8e8e8',
  // Text
  textPrimary: '#161616',
  textSecondary: '#525252',
  textPlaceholder: '#8d8d8d',
  textDisabled: '#c6c6c6',
  // Interactive
  interactive: '#0f62fe',
  interactiveHover: '#0043ce',
  // Brand (FieldSprout green overlaid on Carbon)
  brand: '#198038',
  brandHover: '#0e6027',
  brandLight: '#defbe6',
  // Status
  success: '#198038',
  successBg: '#defbe6',
  warning: '#f1c21b',
  warningBg: '#fdf6dd',
  error: '#da1e28',
  errorBg: '#fff1f1',
  info: '#0043ce',
  infoBg: '#edf5ff',
  // Order status
  statusDraft: { bg: '#f4f4f4', text: '#525252', border: '#c6c6c6' },
  statusSubmitted: { bg: '#edf5ff', text: '#0043ce', border: '#0f62fe' },
  statusApproved: { bg: '#defbe6', text: '#198038', border: '#24a148' },
  statusRejected: { bg: '#fff1f1', text: '#da1e28', border: '#fa4d56' },
  statusDispatched: { bg: '#fdf6dd', text: '#8a3800', border: '#f1c21b' },
  statusDelivered: { bg: '#defbe6', text: '#005d5d', border: '#08bdba' },
  // Border
  borderSubtle: '#e0e0e0',
  borderStrong: '#8d8d8d',
  // Gray scale
  gray10: '#f4f4f4',
  gray20: '#e0e0e0',
  gray30: '#c6c6c6',
  gray50: '#8d8d8d',
  gray70: '#525252',
  gray80: '#393939',
  gray90: '#262626',
  gray100: '#161616',
} as const;

export const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Sent to Warehouse',
  approved: 'Approved',
  rejected: 'Rejected',
  dispatched: 'On Its Way',
  delivered: 'Delivered',
};

export function getStatusStyle(status: string) {
  return C[`status${status.charAt(0).toUpperCase() + status.slice(1)}` as keyof typeof C] as { bg: string; text: string; border: string } | undefined
    ?? C.statusDraft;
}
