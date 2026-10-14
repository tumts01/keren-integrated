'use client';
import React from 'react';

export default function PortalFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="no-print" style={{
      marginTop: '32px',
      padding: '24px 16px 20px',
      borderTop: '1px solid #e2e8f0',
      background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
      borderRadius: '20px 20px 0 0',
      textAlign: 'center'
    }}>
      {/* Brand & Logo Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '10px' }}>
        <img 
          src="/logo.png" 
          alt="Logo MTs Almaarif 01 Singosari" 
          style={{ width: '42px', height: '42px', objectFit: 'contain' }} 
        />
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a', letterSpacing: '0.3px', lineHeight: 1.2 }}>
            MTs ALMAARIF 01 SINGOSARI
          </div>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '2px' }}>
            Akreditasi A (Unggul) • LP Ma'arif NU
          </div>
        </div>
      </div>

      <p style={{ margin: '0 0 14px 0', fontSize: '11px', color: '#64748b', lineHeight: 1.5, fontStyle: 'italic' }}>
        "Madrasah Digital, Mandiri Berprestasi, dan Berakhlak Mulia"
      </p>

      {/* Info Kontak & Alamat Box */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '12px 14px',
        marginBottom: '16px',
        textAlign: 'left',
        fontSize: '11px',
        color: '#334155',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.02)'
      }}>
        {/* Alamat */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
          <i className="fas fa-map-marker-alt" style={{ color: '#ef4444', marginTop: '2px', width: '14px', textAlign: 'center', flexShrink: 0 }}></i>
          <span style={{ lineHeight: 1.4 }}>
            Jl. Masjid No. 33 Pagentan, Kec. Singosari, Kab. Malang, Jawa Timur 65153
          </span>
        </div>

        {/* Telepon */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="fas fa-phone-alt" style={{ color: '#10b981', width: '14px', textAlign: 'center', flexShrink: 0 }}></i>
          <span>Telp: <strong>(0341) 458355</strong></span>
        </div>

        {/* Email & Website */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', paddingTop: '4px', borderTop: '1px dashed #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="fas fa-envelope" style={{ color: '#f59e0b', width: '14px', textAlign: 'center' }}></i>
            <span style={{ fontSize: '10.5px' }}>admin@mtsalmaarif01-sgs.sch.id</span>
          </div>
          <span style={{ color: '#cbd5e1' }}>•</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="fas fa-globe" style={{ color: '#0284c7', width: '14px', textAlign: 'center' }}></i>
            <a 
              href="https://mtsalmaarif01-sgs.sch.id" 
              target="_blank" 
              rel="noreferrer" 
              style={{ color: '#0284c7', textDecoration: 'none', fontWeight: 600, fontSize: '10.5px' }}
            >
              mtsalmaarif01-sgs.sch.id
            </a>
          </div>
        </div>
      </div>

      {/* Copyright & Sistem */}
      <div style={{ paddingTop: '8px', borderTop: '1px dashed #cbd5e1', fontSize: '10.5px', color: '#94a3b8' }}>
        <div>
          &copy; {currentYear} <b>MTs Almaarif 01 Singosari</b>. Hak Cipta Dilindungi.
        </div>
        <div style={{ marginTop: '2px', fontSize: '10px', color: '#94a3b8' }}>
          Portal Siswa & Wali Murid • <b>KEREN Integrated</b>
        </div>
      </div>
    </footer>
  );
}
