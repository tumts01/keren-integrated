'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';

export default function LoginJuriPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/olimpiade-seni/juri/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const json = await res.json();

      if (json.success) {
        localStorage.setItem('keren_juri_data', JSON.stringify(json.data));
        Swal.fire({
          title: 'Berhasil Login',
          text: `Selamat datang, ${json.data.nama_juri}`,
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
        router.push('/olimpiade-seni/juri/penilaian');
      } else {
        Swal.fire('Gagal', json.error || 'Username atau password salah', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Kesalahan jaringan', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '20px' }}>
      <div style={{ background: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h2 style={{ color: '#0f172a', margin: '0 0 10px 0' }}>Login Juri</h2>
          <p style={{ color: '#64748b', margin: 0, fontSize: '0.9rem' }}>Olimpiade & Lomba Seni KEREN</p>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#334155', fontSize: '0.9rem', fontWeight: 500 }}>Username</label>
            <input 
              type="text" 
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}
              placeholder="Masukkan username"
            />
          </div>
          <div style={{ marginBottom: '30px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#334155', fontSize: '0.9rem', fontWeight: 500 }}>Password</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}
              placeholder="Masukkan password"
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              width: '100%', padding: '12px', background: '#10b981', color: 'white', 
              border: 'none', borderRadius: '6px', fontSize: '1rem', fontWeight: 600, 
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 
            }}
          >
            {loading ? 'Memeriksa...' : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  );
}
