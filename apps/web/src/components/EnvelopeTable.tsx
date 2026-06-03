'use client';
import React from 'react';
import { C } from '@/lib/carbon';
import { PaginationMeta } from '@/types';

interface Column {
  field: string;
  headerName: string;
  width?: number;
  flex?: number;
  sortable?: boolean;
  renderCell?: (params: { row: unknown; value: unknown }) => React.ReactNode;
}

interface EnvelopeTableProps {
  columns: Column[];
  rows: unknown[];
  meta?: PaginationMeta;
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  paginationModel?: { page: number; pageSize: number };
  onPaginationModelChange?: (model: { page: number; pageSize: number }) => void;
  getRowId?: (row: unknown) => string | number;
  emptyMessage?: string;
  sx?: Record<string, unknown>;
  rowHeight?: number;
}

export function EnvelopeTable({ columns, rows, meta, loading = false, error, onRetry, paginationModel, onPaginationModelChange, getRowId, emptyMessage = 'No data available' }: EnvelopeTableProps) {
  if (loading) {
    return (
      <div>
        {[1,2,3,4,5].map(i => <div key={i} style={{ height: 52, backgroundColor: i % 2 === 0 ? C.gray10 : C.layer01, marginBottom: 2 }} />)}
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: 32 }}>
        <div style={{ padding: '12px 16px', backgroundColor: C.errorBg, borderLeft: `3px solid ${C.error}`, marginBottom: 12, fontSize: 14, color: C.error }}>
          {error.message || 'Failed to load data'}
        </div>
        {onRetry && <button onClick={onRetry} style={{ padding: '10px 16px', border: `1px solid ${C.borderSubtle}`, backgroundColor: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}>Retry</button>}
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: C.layer01 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${C.borderSubtle}`, backgroundColor: C.gray10 }}>
            {columns.map(col => (
              <th key={col.field} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: C.textSecondary, letterSpacing: 0.5, width: col.width ?? 'auto' }}>{col.headerName}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={columns.length} style={{ padding: 40, textAlign: 'center', color: C.textSecondary }}>{emptyMessage}</td></tr>
          ) : rows.map((row, idx) => {
            const id = getRowId ? getRowId(row) : idx;
            return (
              <tr key={id} style={{ borderBottom: `1px solid ${C.borderSubtle}` }}>
                {columns.map(col => {
                  const rowObj = row as Record<string, unknown>;
                  const value = rowObj[col.field];
                  return (
                    <td key={col.field} style={{ padding: '12px 16px', color: C.textPrimary }}>
                      {col.renderCell ? col.renderCell({ row, value }) : String(value ?? '—')}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      {(meta || paginationModel) && (
        <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.borderSubtle}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, color: C.textSecondary }}>
          <span>Showing {rows.length}{meta ? ` of ${meta.total}` : ''}</span>
          {onPaginationModelChange && paginationModel && (
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => onPaginationModelChange({ ...paginationModel, page: Math.max(0, paginationModel.page - 1) })} disabled={paginationModel.page === 0} style={{ padding: '4px 10px', border: `1px solid ${C.borderSubtle}`, backgroundColor: 'transparent', cursor: paginationModel.page === 0 ? 'default' : 'pointer', fontFamily: 'inherit' }}>← Prev</button>
              <button onClick={() => onPaginationModelChange({ ...paginationModel, page: paginationModel.page + 1 })} disabled={rows.length < paginationModel.pageSize} style={{ padding: '4px 10px', border: `1px solid ${C.borderSubtle}`, backgroundColor: 'transparent', cursor: rows.length < paginationModel.pageSize ? 'default' : 'pointer', fontFamily: 'inherit' }}>Next →</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default EnvelopeTable;
