'use client';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import styles from './Auth.module.css';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showLupaPassword, setShowLupaPassword] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);
  const [popup, setPopup] = useState<{show: boolean, type: 'error'|'confirm'|'success', title: string, message: string, onConfirm?: () => void} | null>(null);

  const pathname = usePathname();

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

  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newUsername.trim().length < 4) {
      setPopup({ show: true, type: 'error', title: 'Username Terlalu Pendek', message: 'Username baru minimal 4 karakter.' });
      return;
    }
    
    setUpdateLoading(true);
    try {
      const res = await fetch('/api/user/update-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldUsername: user.username, newUsername: newUsername.trim() })
      });
      const data = await res.json();
      
      if (data.success) {
        localStorage.setItem('keren_user_data', JSON.stringify(data.user));
        setUser(data.user);
        setPopup({ show: true, type: 'success', title: 'Berhasil', message: 'Username Anda telah berhasil diubah!' });
      } else {
        setPopup({ show: true, type: 'error', title: 'Gagal', message: data.error });
      }
    } catch (err) {
      setPopup({ show: true, type: 'error', title: 'Koneksi Bermasalah', message: 'Gagal menghubungi server. Silakan coba lagi.' });
    } finally {
      setUpdateLoading(false);
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
              
              <button 
                type="button" 
                className={styles.forgotBtn} 
                onClick={() => setShowLupaPassword(true)}
              >
                Lupa Password / Username?
              </button>
            </form>
            
            <div className={styles.footer}>
              &copy; {new Date().getFullYear()} KEREN Integrated from Aa' Icoll
            </div>
          </div>
        </div>
        
        {/* Lupa Password Modal */}
        {showLupaPassword && (
          <div className={styles.popupOverlay}>
            <div className={styles.popupCard}>
              <div className={styles.popupIcon} style={{ background: '#e0f2fe', color: '#0ea5e9' }}>
                <i className="fas fa-info-circle"></i>
              </div>
              <h3 className={styles.popupTitle}>Bantuan Akses Login</h3>
              <p className={styles.popupMessage}>
                Silakan hubungi Administrator (Aa' Icoll) untuk mereset username atau memulihkan akses Anda ke sistem KEREN.
              </p>
              <div className={styles.popupActions}>
                <button className={styles.popupBtnCancel} onClick={() => setShowLupaPassword(false)}>Kembali</button>
                <a 
                  href="https://wa.me/628970434000?text=Halo%20Aa'%20Icoll,%20saya%20lupa%20akses%20login%20KEREN%20saya.%20Mohon%20bantuannya." 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={styles.popupBtnConfirm}
                  style={{ background: '#22c55e', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  onClick={() => setShowLupaPassword(false)}
                >
                  <i className="fab fa-whatsapp"></i> Hubungi via WA
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const isPrintPage = pathname?.includes('/cetak/');
  if (isPrintPage) {
    return <>{children}</>;
  }

  return (
    <div className="app-container">
      {popup && popup.show && (
        <div className={styles.popupOverlay} style={{ zIndex: 9999 }}>
          <div className={styles.popupCard}>
            <div className={styles.popupIcon} style={{ background: popup.type === 'error' ? '#fee2e2' : popup.type === 'success' ? '#dcfce7' : '#fef3c7', color: popup.type === 'error' ? '#ef4444' : popup.type === 'success' ? '#16a34a' : '#f59e0b' }}>
              <i className={`fas ${popup.type === 'error' ? 'fa-times' : popup.type === 'success' ? 'fa-check' : 'fa-exclamation-triangle'}`}></i>
            </div>
            <h3 className={styles.popupTitle}>{popup.title}</h3>
            <p className={styles.popupMessage}>{popup.message}</p>
            <div className={styles.popupActions}>
              {popup.type === 'confirm' && (
                <button className={styles.popupBtnCancel} onClick={() => setPopup(null)}>Batal</button>
              )}
              <button 
                className={styles.popupBtnConfirm} 
                style={{ background: popup.type === 'error' ? '#ef4444' : popup.type === 'success' ? '#16a34a' : '#237227' }}
                onClick={() => {
                  if (popup.onConfirm) popup.onConfirm();
                  setPopup(null);
                }}
              >
                {popup.type === 'error' || popup.type === 'success' ? 'Tutup' : 'Ya, Lanjutkan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {user && user.sudahGantiUsername === false && (
        <div className={styles.popupOverlay} style={{ zIndex: 5000, background: 'rgba(0,0,0,0.85)' }}>
          <div className={styles.popupCard} style={{ maxWidth: '450px' }}>
            <div className={styles.popupIcon} style={{ background: '#fef3c7', color: '#f59e0b' }}>
              <i className="fas fa-shield-alt"></i>
            </div>
            <h3 className={styles.popupTitle}>Wajib Ganti Username</h3>
            <p className={styles.popupMessage} style={{ marginBottom: '20px' }}>
              Halo {user.nama.split(' ')[0]}, demi keamanan, Anda <strong>wajib mengganti username bawaan</strong> sebelum menggunakan aplikasi. Silakan buat username baru Anda di bawah ini:
            </p>
            
            <form onSubmit={handleUpdateUsername} style={{ width: '100%' }}>
              <div className={styles.inputGroup} style={{ marginBottom: '16px' }}>
                <input 
                  type="text" 
                  placeholder="Ketik Username Baru..." 
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  required 
                  minLength={4}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none' }}
                />
                <small style={{ color: '#64748b', fontSize: '0.8rem', display: 'block', marginTop: '6px', textAlign: 'left' }}>*Minimal 4 karakter dan mudah diingat</small>
              </div>
              
              <button 
                type="submit" 
                className={styles.popupBtnConfirm} 
                style={{ background: '#f59e0b', width: '100%', padding: '12px' }}
                disabled={updateLoading}
              >
                {updateLoading ? <i className="fas fa-spinner fa-spin"></i> : "Simpan Username Baru"}
              </button>
            </form>
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
