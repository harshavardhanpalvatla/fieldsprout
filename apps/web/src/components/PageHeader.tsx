'use client';
import React from 'react';
import { C } from '@/lib/carbon';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 300, color: C.textPrimary, margin: 0, letterSpacing: -0.5 }}>{title}</h1>
          {subtitle && <p style={{ fontSize: 14, color: C.textSecondary, margin: '4px 0 0' }}>{subtitle}</p>}
        </div>
        {actions && <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{actions}</div>}
      </div>
      <div style={{ height: 1, backgroundColor: C.borderSubtle }} />
    </div>
  );
}

export default PageHeader;
