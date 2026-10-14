'use client';
import React from 'react';

export default function PortalHeaderBrand() {
  return (
    <div className="no-print" style={{
      background: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      padding: '14px 16px 12px',
      textAlign: 'center',
      position: 'relative',
      zIndex: 20
    }}>
      {/* Brand & Logo Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '4px' }}>
        <img 
          src="/logo.png" 
          alt="Logo MTs Almaarif 01 Singosari" 
          style={{ width: '38px', height: '38px', objectFit: 'contain' }} 
        />
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a', letterSpacing: '0.3px', lineHeight: 1.2 }}>
            MTs ALMAARIF 01 SINGOSARI
          </div>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '2px' }}>
            Akreditasi A (Unggul)
          </div>
        </div>
      </div>

      {/* Tagline KEREN */}
      <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#64748b', fontStyle: 'italic', fontWeight: 600, letterSpacing: '0.2px' }}>
        "Kreatif - Edukatif - Religius - Elegan - Nyaman"
      </p>
    </div>
  );
}
