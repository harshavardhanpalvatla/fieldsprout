import React from 'react';
import { C, STATUS_LABELS, getStatusStyle } from '@/lib/carbon';

export default function StatusChip({ status, size = 'sm' }: { status: string; size?: 'sm'|'md' }) {
  const cfg = getStatusStyle(status) ?? C.statusDraft;
  return (
    <span style={{
      display: 'inline-block',
      padding: size === 'sm' ? '2px 10px' : '4px 14px',
      backgroundColor: cfg.bg,
      color: cfg.text,
      border: `1px solid ${cfg.border}`,
      fontSize: size === 'sm' ? 11 : 13,
      fontWeight: 600,
      letterSpacing: 0.3,
      whiteSpace: 'nowrap',
    }}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
export { StatusChip };
