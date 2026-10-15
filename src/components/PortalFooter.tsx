'use client';
import React from 'react';

export default function PortalFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="no-print" style={{
      marginTop: '32px',
      padding: '20px 16px',
      borderTop: '1px solid #e2e8f0',
      background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
      borderRadius: '20px 20px 0 0',
      textAlign: 'center'
    }}>
      {/* Media Sosial Resmi Madrasah */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '16px 18px',
        marginBottom: '16px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
        textAlign: 'center'
      }}>
        <div style={{
          fontSize: '13px',
          fontWeight: 800,
          color: '#0f172a',
          marginBottom: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px'
        }}>
          <i className="fas fa-globe" style={{ color: '#0284c7' }}></i>
          Media Sosial Resmi Madrasah
        </div>
        <p style={{ margin: '0 0 12px 0', fontSize: '11.5px', color: '#64748b' }}>
          Ikuti info kegiatan belajar, prestasi siswa, dan video seputar MTs Almaarif 01 Singosari:
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '10px',
          maxWidth: '560px',
          margin: '0 auto'
        }}>
          {/* YouTube */}
          <a
            href="https://www.youtube.com/@mtsalmaarif01singosari"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 14px',
              borderRadius: '10px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              textDecoration: 'none',
              color: '#991b1b',
              textAlign: 'left',
              transition: 'all 0.2s'
            }}
          >
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              background: '#dc2626',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
              flexShrink: 0
            }}>
              <i className="fab fa-youtube"></i>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#991b1b', lineHeight: 1.2 }}>
                YouTube Resmi
              </div>
              <div style={{ fontSize: '11px', color: '#b91c1c', opacity: 0.85, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                @mtsalmaarif01singosari
              </div>
            </div>
            <i className="fas fa-external-link-alt" style={{ fontSize: '10px', color: '#ef4444' }}></i>
          </a>

          {/* Instagram */}
          <a
            href="https://www.instagram.com/mtsalmaarif01singosari/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 14px',
              borderRadius: '10px',
              background: '#fdf2f8',
              border: '1px solid #fbcfe8',
              textDecoration: 'none',
              color: '#831843',
              textAlign: 'left',
              transition: 'all 0.2s'
            }}
          >
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
              flexShrink: 0
            }}>
              <i className="fab fa-instagram"></i>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#831843', lineHeight: 1.2 }}>
                Instagram Resmi
              </div>
              <div style={{ fontSize: '11px', color: '#9d174d', opacity: 0.85, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                @mtsalmaarif01singosari
              </div>
            </div>
            <i className="fas fa-external-link-alt" style={{ fontSize: '10px', color: '#ec4899' }}></i>
          </a>
        </div>
      </div>
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
