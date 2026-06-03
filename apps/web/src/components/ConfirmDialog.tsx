'use client';
import React from 'react';
import { C } from '@/lib/carbon';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: 'error' | 'primary' | 'warning' | 'success';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', confirmColor = 'error', loading = false, onConfirm, onCancel }: ConfirmDialogProps) {
  if (!open) return null;
  const bg = confirmColor === 'error' ? C.error : confirmColor === 'success' ? C.brand : confirmColor === 'warning' ? C.warning : C.interactive;
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ backgroundColor: C.layer01, width: '100%', maxWidth: 400 }}>
        <div style={{ padding: '16px 24px', borderBottom: `1px solid ${C.borderSubtle}` }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: C.textPrimary }}>⚠ {title}</span>
        </div>
        <div style={{ padding: 24 }}>
          <p style={{ fontSize: 14, color: C.textPrimary, margin: 0 }}>{message}</p>
        </div>
        <div style={{ padding: '16px 24px', borderTop: `1px solid ${C.borderSubtle}`, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onCancel} disabled={loading} style={{ padding: '10px 16px', backgroundColor: 'transparent', border: `1px solid ${C.borderSubtle}`, cursor: loading ? 'default' : 'pointer', fontSize: 14, fontFamily: 'inherit' }}>{cancelLabel}</button>
          <button onClick={onConfirm} disabled={loading} style={{ padding: '10px 16px', backgroundColor: loading ? C.gray30 : bg, color: '#fff', border: 'none', cursor: loading ? 'default' : 'pointer', fontSize: 14, fontFamily: 'inherit', fontWeight: 600 }}>{loading ? 'Loading...' : confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
