'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Swal from 'sweetalert2';

export default function SpmbLogin() {
  const router = useRouter();
  const [nomorPendaftaran, setNomorPendaftaran] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('keren_app_preference', 'spmb');
    } catch {}

    // Jika sudah ada sesi SPMB aktif, langsung redirect ke portal
    if (localStorage.getItem('spmb_session')) {
      router.replace('/spmb/portal');
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = nomorPendaftaran.trim();
    if (!clean) {
      Swal.fire('Perhatian', 'Silakan masukkan Nomor Pendaftaran lengkap Anda.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/spmb/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nomorPendaftaran: clean })
      });

      const resJson = await res.json();

      if (resJson.success && resJson.data) {
        localStorage.setItem('spmb_session', JSON.stringify(resJson.data));
        localStorage.setItem('keren_app_preference', 'spmb');
        router.push('/spmb/portal');
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Data Tidak Ditemukan',
          text: resJson.error || 'Nomor pendaftaran tidak terdaftar.',
          confirmButtonColor: '#059669'
        });
      }
    } catch (err: any) {
      Swal.fire('Koneksi Gagal', 'Tidak dapat terhubung ke server. Periksa jaringan Anda.', 'error');
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
      backgroundImage: 'linear-gradient(135deg, rgba(6, 78, 59, 0.88), rgba(4, 120, 87, 0.8)), url(/bg-login.jpg)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '460px',
        borderRadius: '24px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
        background: 'rgba(255, 255, 255, 0.98)',
        backdropFilter: 'blur(12px)',
        overflow: 'hidden'
      }}>
        {/* Header Visual Top Bar */}
        <div style={{ height: '6px', background: 'linear-gradient(90deg, #10b981, #047857, #065f46)' }} />

        <div style={{ padding: '36px 28px', textAlign: 'center' }}>
          <img 
            src="/logo.png" 
            alt="Logo MTs" 
            style={{ width: '84px', height: '84px', marginBottom: '14px', objectFit: 'contain' }} 
          />
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#064e3b', margin: '0 0 6px 0', letterSpacing: '-0.3px' }}>
            Portal Calon Siswa SPMB
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 28px 0', fontWeight: 500 }}>
            MTs Almaarif 01 Singosari
          </p>

          <form onSubmit={handleLogin} style={{ textAlign: 'left' }}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
                Nomor Pendaftaran
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#10b981',
                  fontSize: '15px'
                }}>
                  <i className="fas fa-id-card"></i>
                </span>
                <input 
                  type="text"
                  placeholder="Masukkan Nomor Pendaftaran..."
                  value={nomorPendaftaran}
                  onChange={e => setNomorPendaftaran(e.target.value)}
                  autoFocus
                  style={{ 
                    width: '100%',
                    padding: '14px 14px 14px 42px',
                    borderRadius: '12px', 
                    border: '1.5px solid #cbd5e1',
                    fontSize: '15px',
                    fontWeight: 600,
                    boxSizing: 'border-box',
                    background: '#f8fafc',
                    color: '#0f172a',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#059669';
                    e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.2)';
                    e.target.style.background = '#ffffff';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#cbd5e1';
                    e.target.style.boxShadow = 'none';
                    e.target.style.background = '#f8fafc';
                  }}
                />
              </div>
              <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>
                <i className="fas fa-info-circle" style={{ color: '#059669', marginRight: '4px' }}></i>
                Masukkan Nomor Pendaftaran lengkap sesuai yang tertera pada Kartu Bukti Pendaftaran.
              </p>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              style={{ 
                width: '100%',
                padding: '14px',
                borderRadius: '12px', 
                background: loading ? '#94a3b8' : 'linear-gradient(135deg, #059669, #047857)',
                color: 'white', 
                border: 'none',
                fontSize: '15.5px',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(5, 150, 105, 0.35)',
                transition: 'all 0.2s'
              }}
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  <span>Memeriksa Nomor...</span>
                </>
              ) : (
                <>
                  <span>Masuk ke Portal SPMB</span>
                  <i className="fas fa-arrow-right"></i>
                </>
              )}
            </button>
          </form>

          {/* Links Navigasi */}
          <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px dashed #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Link 
              href="/spmb"
              style={{
                fontSize: '13px',
                color: '#059669',
                fontWeight: 600,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <i className="fas fa-user-plus"></i> Belum Mendaftar? Isi Formulir SPMB
            </Link>

            <Link 
              href="/"
              onClick={() => {
                try { localStorage.setItem('keren_app_preference', 'guru'); } catch {}
              }}
              style={{ 
                fontSize: '12.5px', 
                color: '#94a3b8', 
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <i className="fas fa-chalkboard-teacher"></i> Masuk sebagai Guru / Staf Madrasah
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
