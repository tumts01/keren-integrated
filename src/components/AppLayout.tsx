'use client';
import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import styles from './Auth.module.css';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<string | null>(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const storedUser = localStorage.getItem('keren_user');
    if (storedUser) setUser(storedUser);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameInput.trim().length > 2) {
      localStorage.setItem('keren_user', usernameInput.trim());
      setUser(usernameInput.trim());
    }
  };

  if (!mounted) return null; // Prevent hydration mismatch

  if (!user) {
    return (
      <div className={styles.loginContainer}>
        <div className={styles.loginCard}>
          <div className={styles.brand}>
            <i className={`fas fa-school ${styles.brandIcon}`}></i>
            <h2>KEREN Integrated</h2>
          </div>
          <p className={styles.subtitle}>Sistem Informasi Anggaran & Kesiswaan</p>
          <form onSubmit={handleLogin} className={styles.form}>
            <div className={styles.inputGroup}>
              <i className="fas fa-user"></i>
              <input 
                type="text" 
                placeholder="Masukkan Username Anda..." 
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                required 
              />
            </div>
            <button type="submit" className={styles.loginBtn}>
              Masuk Aplikasi <i className="fas fa-arrow-right"></i>
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Header username={user} onLogout={() => {
          localStorage.removeItem('keren_user');
          setUser(null);
        }} />
        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  );
}
