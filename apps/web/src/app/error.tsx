'use client';

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ textAlign: 'center', padding: '48px', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ color: '#C62828' }}>Something went wrong</h1>
      <button
        onClick={reset}
        style={{
          backgroundColor: '#2E7D32',
          color: 'white',
          border: 'none',
          padding: '8px 16px',
          borderRadius: '8px',
          cursor: 'pointer',
        }}
      >
        Try again
      </button>
    </div>
  );
}
