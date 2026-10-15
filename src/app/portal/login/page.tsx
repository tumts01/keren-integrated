'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';

export default function PortalLogin() {
  const router = useRouter();
  const [nisn, setNisn] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('keren_app_preference', 'portal');
    } catch {}
    // If already logged in, redirect to dashboard
    if (localStorage.getItem('portal_session')) {
      router.replace('/portal/dashboard');
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nisn) return Swal.fire('Error', 'NISN harus diisi', 'error');

    setLoading(true);
    try {
      const res = await fetch('/api/portal/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nisn })
      });
      const data = await res.json();
      
      if (data.success) {
        localStorage.setItem('portal_session', JSON.stringify(data.data));
        localStorage.setItem('keren_app_preference', 'portal');
        router.push('/portal/dashboard');
      } else {
        Swal.fire('Login Gagal', data.error, 'error');
      }
    } catch (err: any) {
      Swal.fire('Error', 'Gagal terhubung ke server', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundImage: 'url(/bg-login.jpg)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat'
    }}>
      <div className="portal-container" style={{ 
        width: '100%', 
        maxWidth: '480px', 
        minHeight: 'auto',
        borderRadius: '24px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center',
        margin: '20px',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ padding: '40px 24px', textAlign: 'center' }}>
          <img src="/logo.png" alt="Logo" style={{ width: '90px', height: '90px', marginBottom: '16px' }} />
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#1e293b', margin: '0 0 8px 0' }}>Portal Wali Murid</h1>
          <p style={{ color: '#64748b', fontSize: '15px', margin: '0 0 32px 0' }}>MTs Almaarif 01 Singosari</p>

        <form onSubmit={handleLogin} style={{ textAlign: 'left' }}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
              Nomor Induk Siswa Nasional (NISN)
            </label>
            <input 
              type="number" 
              placeholder="Masukkan 10 digit NISN..."
              value={nisn}
              onChange={e => setNisn(e.target.value)}
              style={{ 
                width: '100%', padding: '14px', borderRadius: '12px', 
                border: '1px solid #cbd5e1', fontSize: '16px', boxSizing: 'border-box',
                background: '#f8fafc'
              }}
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              width: '100%', padding: '14px', borderRadius: '12px', 
              background: loading ? '#94a3b8' : '#0ea5e9', color: 'white', 
              border: 'none', fontSize: '16px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Memeriksa Data...' : 'Masuk ke Portal'}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <a 
            href="/"
            onClick={() => {
              try { localStorage.setItem('keren_app_preference', 'guru'); } catch {}
            }}
            style={{ 
              fontSize: '12.5px', 
              color: '#64748b', 
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <i className="fas fa-chalkboard-teacher" style={{ color: '#0284c7' }}></i> Masuk sebagai Guru / Staf Madrasah
          </a>

          {/* Social Links */}
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px dashed #e2e8f0', display: 'flex', justifyContent: 'center', gap: '14px' }}>
            <a
              href="https://www.youtube.com/@mtsalmaarif01singosari"
              target="_blank"
              rel="noopener noreferrer"
              title="YouTube MTs Almaarif 01 Singosari"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                background: '#fef2f2',
                color: '#dc2626',
                fontSize: '12px',
                fontWeight: 700,
                textDecoration: 'none',
                border: '1px solid #fecaca'
              }}
            >
              <i className="fab fa-youtube"></i> YouTube
            </a>

            <a
              href="https://www.instagram.com/mtsalmaarif01singosari/"
              target="_blank"
              rel="noopener noreferrer"
              title="Instagram MTs Almaarif 01 Singosari"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                background: '#fdf2f8',
                color: '#db2777',
                fontSize: '12px',
                fontWeight: 700,
                textDecoration: 'none',
                border: '1px solid #fbcfe8'
              }}
            >
              <i className="fab fa-instagram"></i> Instagram
            </a>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
