'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OlimpiadeSeniPage() {
  const router = useRouter();

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#f8fafc',
      padding: '40px 20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      
      {/* Banner / Header */}
      <div style={{
        background: 'white',
        borderRadius: '24px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
        width: '100%',
        maxWidth: '900px',
        padding: '40px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Dekorasi Background */}
        <div style={{ position: 'absolute', top: '-50px', left: '-50px', width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(234,179,8,0.15) 0%, transparent 70%)', borderRadius: '50%' }}></div>
        <div style={{ position: 'absolute', bottom: '-50px', right: '-50px', width: '250px', height: '250px', background: 'radial-gradient(circle, rgba(14,165,233,0.1) 0%, transparent 70%)', borderRadius: '50%' }}></div>

        {/* Logo */}
        <img 
          src="/logo_olimpiade_seni.png" 
          alt="Logo Olimpiade dan Seni" 
          style={{ width: '150px', height: 'auto', marginBottom: '24px', position: 'relative', zIndex: 10 }}
        />

        {/* Title uppercase */}
        <h1 style={{ 
          fontSize: '2rem', 
          fontWeight: 800, 
          color: '#0f172a', // The title is asked to match the logo color, we can use a generic dark blue/gold or a standard dark color, and refine if they ask
          marginBottom: '16px',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          position: 'relative',
          zIndex: 10
        }}>
          OLIMPIADE & LOMBA SENI
        </h1>
        
        <p style={{ color: '#64748b', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto 40px auto', position: 'relative', zIndex: 10, lineHeight: 1.6 }}>
          Selamat datang di portal resmi pendaftaran dan manajemen Olimpiade & Lomba Seni MTs Almaarif 01 Singosari.
        </p>

        {/* Call to Action Buttons */}
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', position: 'relative', zIndex: 10 }}>
          <button 
            onClick={() => router.push('/olimpiade-seni/pendaftaran')}
            style={{
              padding: '16px 32px',
              borderRadius: '12px',
              background: '#0284c7', // Senada biru
              color: 'white',
              border: 'none',
              fontSize: '1rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(2, 132, 199, 0.5)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(2, 132, 199, 0.4)'; }}
          >
            <i className="fas fa-user-plus" style={{ fontSize: '1.2rem' }}></i>
            Pendaftaran Peserta
          </button>
          
          <button 
            onClick={() => router.push('/olimpiade-seni/rekap')}
            style={{
              padding: '16px 32px',
              borderRadius: '12px',
              background: 'white',
              color: '#0f172a',
              border: '2px solid #e2e8f0',
              fontSize: '1rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
          >
            <i className="fas fa-list" style={{ fontSize: '1.2rem', color: '#64748b' }}></i>
            Rekap Data
          </button>

          <button 
            onClick={() => router.push('/cbt')}
            style={{
              padding: '16px 32px',
              borderRadius: '12px',
              background: '#10b981', // Hijau emerald
              color: 'white',
              border: 'none',
              fontSize: '1rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.5)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(16, 185, 129, 0.4)'; }}
          >
            <i className="fas fa-laptop-code" style={{ fontSize: '1.2rem' }}></i>
            Login CBT
          </button>


          <button 
            onClick={() => router.push('/olimpiade-seni/monitoring')}
            style={{
              padding: '16px 32px',
              borderRadius: '12px',
              background: '#f59e0b', // Kuning/Emas
              color: 'white',
              border: 'none',
              fontSize: '1rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(245, 158, 11, 0.5)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(245, 158, 11, 0.4)'; }}
          >
            <i className="fas fa-trophy" style={{ fontSize: '1.2rem' }}></i>
            Live Score
          </button>
        </div>

        {/* Tombol Unduh Dokumen */}
        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          justifyContent: 'center', 
          gap: '16px',
          marginTop: '20px',
          paddingTop: '20px',
          borderTop: '1px solid #e2e8f0'
        }}>
          <button 
            onClick={() => window.open('https://drive.google.com/file/d/1tDsEhRGpk7OvvMVRYUhliN_ZPsN1MHf2/view?usp=sharing', '_blank')}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              background: 'white',
              color: '#ef4444', // Merah PDF
              border: '2px solid #ef4444',
              fontSize: '0.95rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = '#fef2f2'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'white'; }}
          >
            <i className="fas fa-file-pdf" style={{ fontSize: '1.2rem' }}></i>
            Download Juknis (PDF)
          </button>

          <button 
            onClick={() => window.open('https://drive.google.com/file/d/1Qc_hj2tA434rlhesnn_eL3AxrRfX7l7V/view?usp=sharing', '_blank')}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              background: 'white',
              color: '#3b82f6', // Biru Image
              border: '2px solid #3b82f6',
              fontSize: '0.95rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = '#eff6ff'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'white'; }}
          >
            <i className="fas fa-file-image" style={{ fontSize: '1.2rem' }}></i>
            Download Pamflet
          </button>
        </div>

      </div>
    </div>
  );
}
