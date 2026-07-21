'use client';

import React from 'react';

export default function SajianDataPage() {
  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>Sajian Data</h1>
        <p style={{ color: '#64748b' }}>Menu administrasi untuk penyajian data.</p>
      </header>

      <div style={{ 
        background: 'white', 
        padding: '32px', 
        borderRadius: '16px', 
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' 
      }}>
        <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0' }}>
          <i className="fas fa-tools" style={{ fontSize: '3rem', marginBottom: '16px', color: '#cbd5e1' }}></i>
          <h3>Sedang Dalam Pengembangan</h3>
          <p>Fitur sajian data akan segera hadir.</p>
        </div>
      </div>
    </div>
  );
}
