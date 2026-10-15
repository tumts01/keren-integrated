'use client';

import React, { useEffect } from 'react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Rekap Olimpiade Error:', error);
  }, [error]);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8fafc',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '36px 32px',
        maxWidth: '520px',
        width: '100%',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)',
        textAlign: 'center',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: '#fee2e2',
          color: '#ef4444',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          margin: '0 auto 16px auto'
        }}>
          <i className="fas fa-exclamation-triangle"></i>
        </div>

        <h2 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', color: '#0f172a', fontWeight: 800 }}>
          Gagal Memuat Halaman Rekap
        </h2>

        <p style={{ margin: '0 0 20px 0', fontSize: '0.88rem', color: '#64748b', lineHeight: 1.5 }}>
          Terjadi kendala saat memproses data pendaftar. Silakan klik tombol di bawah untuk memuat ulang data.
        </p>

        {error?.message && (
          <div style={{
            background: '#f1f5f9',
            borderRadius: '8px',
            padding: '10px 14px',
            fontSize: '0.78rem',
            color: '#475569',
            fontFamily: 'monospace',
            marginBottom: '20px',
            textAlign: 'left',
            overflowX: 'auto',
            maxHeight: '100px'
          }}>
            {error.message}
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={() => window.location.href = '/olimpiade-seni'}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: 'white',
              color: '#475569',
              fontWeight: 600,
              fontSize: '0.88rem',
              cursor: 'pointer'
            }}
          >
            Kembali
          </button>
          <button
            onClick={() => reset()}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              background: '#047857',
              color: 'white',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <i className="fas fa-redo"></i> Coba Lagi
          </button>
        </div>
      </div>
    </div>
  );
}
