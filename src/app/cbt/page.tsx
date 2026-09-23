'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';

export default function LoginCBT() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/cbt/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (data.success) {
        localStorage.setItem('cbt_user', JSON.stringify(data.user));
        router.push('/cbt/dashboard');
      } else {
        Swal.fire('Login Gagal', data.error, 'error');
      }
    } catch (err: any) {
      Swal.fire('Error', err.message, 'error');
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', padding: '20px' }}>
      <div style={{ background: 'white', padding: '40px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <i className="fas fa-desktop" style={{ fontSize: '3rem', color: '#0284c7', marginBottom: '16px' }}></i>
          <h1 style={{ fontSize: '1.5rem', color: '#0f172a', margin: '0 0 8px 0' }}>Portal Ujian CBT</h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>Olimpiade Akademik MTs Almaarif 01</p>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Username</label>
            <input 
              type="text" 
              required
              value={username} 
              onChange={e => setUsername(e.target.value)}
              style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none' }}
              placeholder="Masukkan Username CBT"
            />
          </div>
          <div style={{ marginBottom: '32px' }}>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Password</label>
            <input 
              type="password" 
              required
              value={password} 
              onChange={e => setPassword(e.target.value)}
              style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none' }}
              placeholder="Masukkan Password CBT"
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            style={{ width: '100%', padding: '14px', borderRadius: '8px', background: '#0284c7', color: 'white', border: 'none', fontWeight: 700, fontSize: '1.1rem', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Memeriksa...' : 'Masuk ke CBT'}
          </button>
        </form>
      </div>
    </div>
  );
}
