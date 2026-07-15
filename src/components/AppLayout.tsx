'use client';
import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import styles from './Auth.module.css';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState<{show: boolean, type: 'error'|'confirm', title: string, message: string, onConfirm?: () => void} | null>(null);

  useEffect(() => {
    setMounted(true);
    const storedUser = localStorage.getItem('keren_user_data');
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameInput.trim().length > 2) {
      setLoading(true);
      try {
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: usernameInput.trim() })
        });
        const data = await res.json();
        
        if (data.success) {
          localStorage.setItem('keren_user_data', JSON.stringify(data.user));
          setUser(data.user);
        } else {
          setPopup({ show: true, type: 'error', title: 'Login Gagal', message: data.error });
        }
      } catch (err) {
        setPopup({ show: true, type: 'error', title: 'Koneksi Bermasalah', message: 'Terjadi kesalahan jaringan saat mencoba login. Silakan coba lagi.' });
      } finally {
        setLoading(false);
      }
    }
  };

  if (!mounted) return null; // Prevent hydration mismatch

  if (!user) {
    return (
      <div className={styles.loginWrapper}>
        <div className={styles.leftSection}>
          {/* Latar belakang foto sekolah */}
          <div className={styles.leftOverlay}>
            {/* Teks dihilangkan sesuai permintaan agar foto lebih menonjol */}
          </div>
        </div>
        
        <div className={styles.rightSection}>
          <div className={styles.loginCard}>
            <div className={styles.brand}>
              <img src="/logo.png" alt="Logo" style={{ width: '64px', height: '64px', objectFit: 'contain' }} />
              <h2>KEREN</h2>
            </div>
            
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>
              Sistem Informasi Administrasi Digital
            </h3>
            <p style={{ fontStyle: 'italic', fontSize: '0.85rem', color: '#8e8e8e', marginBottom: '16px' }}>
              "Administrasi Lebih Mudah, Cepat, dan KEREN"
            </p>

            <form onSubmit={handleLogin} className={styles.form}>
              <div className={styles.inputGroup}>
                <input 
                  type="text" 
                  placeholder="Masukkan Username Anda..." 
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  required 
                />
              </div>

              <button type="submit" className={styles.loginBtn} disabled={loading}>
                {loading ? <i className="fas fa-spinner fa-spin"></i> : "Masuk Aplikasi"}
              </button>
            </form>
            
            <div className={styles.footer}>
              &copy; {new Date().getFullYear()} KEREN Integrated from Aa' Icoll
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {popup && popup.show && (
        <div className={styles.popupOverlay}>
          <div className={styles.popupCard}>
            <div className={styles.popupIcon} style={{ background: popup.type === 'error' ? '#fee2e2' : '#fef3c7', color: popup.type === 'error' ? '#ef4444' : '#f59e0b' }}>
              <i className={`fas ${popup.type === 'error' ? 'fa-times' : 'fa-exclamation-triangle'}`}></i>
            </div>
            <h3 className={styles.popupTitle}>{popup.title}</h3>
            <p className={styles.popupMessage}>{popup.message}</p>
            <div className={styles.popupActions}>
              {popup.type === 'confirm' && (
                <button className={styles.popupBtnCancel} onClick={() => setPopup(null)}>Batal</button>
              )}
              <button 
                className={styles.popupBtnConfirm} 
                style={{ background: popup.type === 'error' ? '#ef4444' : '#237227' }}
                onClick={() => {
                  if (popup.onConfirm) popup.onConfirm();
                  setPopup(null);
                }}
              >
                {popup.type === 'error' ? 'Tutup' : 'Ya, Lanjutkan'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Sidebar />
      <div className="main-content">
        <Header user={user} onLogout={() => {
          setPopup({
            show: true,
            type: 'confirm',
            title: 'Konfirmasi Keluar',
            message: 'Apakah Anda yakin ingin keluar dari sistem KEREN?',
            onConfirm: () => {
              localStorage.removeItem('keren_user_data');
              setUser(null);
            }
          });
        }} />
        <main className="page-content">
          {children}
        </main>
        <footer style={{
          textAlign: 'center',
          padding: '16px',
          fontSize: '0.85rem',
          color: 'var(--text-muted)',
          borderTop: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-card)',
          marginTop: 'auto'
        }}>
          &copy; {new Date().getFullYear()} <strong>KEREN Integrated</strong> - MTs Almaarif 01 Singosari.<br/>
          <span style={{ fontSize: '0.75rem', marginTop: '4px', display: 'inline-block' }}>
            Developed with <i className="fas fa-heart" style={{ color: 'var(--danger)', margin: '0 2px' }}></i> by <strong>Aa' Icoll</strong>
          </span>
        </footer>
      </div>
    </div>
  );
}
