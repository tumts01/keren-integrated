'use client';

import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

export default function BendaharaPerangkatUjian() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Cek session di localStorage (sederhana)
    const session = localStorage.getItem('bendahara_pu_session');
    if (session === 'unlocked') {
      setIsUnlocked(true);
    }
    setLoading(false);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'kayarayahahaha') {
      localStorage.setItem('bendahara_pu_session', 'unlocked');
      setIsUnlocked(true);
      Swal.fire({
        icon: 'success',
        title: 'Login Berhasil',
        text: 'Selamat datang, Bendahara!',
        timer: 1500,
        showConfirmButton: false
      });
    } else {
      Swal.fire('Akses Ditolak', 'Username salah!', 'error');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('bendahara_pu_session');
    setIsUnlocked(false);
    setUsername('');
  };

  if (loading) return null;

  if (!isUnlocked) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', background: '#f8fafc' }}>
        <form onSubmit={handleLogin} style={{ background: 'white', padding: '40px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', width: '100%', maxWidth: '420px', border: '1px solid #f1f5f9' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ width: '64px', height: '64px', background: '#e0f2fe', borderRadius: '50%', display: 'inline-flex', justifyContent: 'center', alignItems: 'center', marginBottom: '16px', color: '#0284c7', fontSize: '24px' }}>
              <i className="fas fa-wallet"></i>
            </div>
            <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.5rem' }}>Login Bendahara</h2>
            <p style={{ margin: '8px 0 0 0', color: '#64748b', fontSize: '0.95rem' }}>Masukkan username khusus untuk mengakses fitur ini.</p>
          </div>
          
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#475569', fontWeight: 600, fontSize: '0.9rem' }}>Username</label>
            <input 
              type="text" 
              value={username} 
              onChange={e => setUsername(e.target.value)}
              style={{ width: '100%', padding: '14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none', transition: 'border-color 0.2s' }}
              placeholder="Masukkan username"
              autoFocus
              required
            />
          </div>
          <button type="submit" style={{ width: '100%', padding: '14px', borderRadius: '8px', background: '#0284c7', color: 'white', border: 'none', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', transition: 'background 0.2s', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.2)' }}>
            Masuk <i className="fas fa-arrow-right" style={{ marginLeft: '8px' }}></i>
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ margin: '0 0 8px 0', color: '#0f172a', fontSize: '1.8rem' }}>
            <i className="fas fa-wallet" style={{ color: '#0284c7', marginRight: '12px' }}></i>
            Dashboard Bendahara
          </h1>
          <p style={{ margin: 0, color: '#64748b' }}>Pengelolaan keuangan perangkat ujian</p>
        </div>
        <button 
          onClick={handleLogout}
          style={{ padding: '10px 16px', borderRadius: '8px', background: 'white', color: '#ef4444', border: '1px solid #fca5a5', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <i className="fas fa-sign-out-alt"></i> Keluar
        </button>
      </div>

      <div style={{ background: 'white', padding: '32px', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', color: '#cbd5e1', marginBottom: '16px' }}>
          <i className="fas fa-tools"></i>
        </div>
        <h3 style={{ margin: '0 0 8px 0', color: '#334155' }}>Dalam Pengembangan</h3>
        <p style={{ color: '#64748b', margin: 0 }}>Fitur spesifik bendahara akan ditambahkan di sini sesuai kebutuhan selanjutnya.</p>
      </div>
    </div>
  );
}
