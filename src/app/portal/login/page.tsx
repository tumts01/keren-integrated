'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';

export default function PortalLogin() {
  const router = useRouter();
  const [nisn, setNisn] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
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

        <div style={{ marginTop: '32px', padding: '16px', background: '#fef3c7', borderRadius: '12px', textAlign: 'left' }}>
          <p style={{ margin: 0, fontSize: '13px', color: '#92400e', lineHeight: 1.5 }}>
            <i className="fas fa-info-circle" style={{ marginRight: '6px' }}></i>
            Pastikan NISN yang dimasukkan sesuai dengan data madrasah. Jika kesulitan login, silakan hubungi Wali Kelas.
          </p>
        </div>
      </div>
    </div>
  );
}
