'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';

export default function LoginCBT() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const cleanInput = (val: string) =>
    (val || '')
      .replace(/[\u00A0\u1680\u180E\u2000-\u200F\u2028-\u202F\u205F-\u206F\uFEFF]/g, '')
      .trim();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    // Ambil juga dari elemen DOM untuk mengantisipasi browser HP / autofill yang tidak memicu event onChange
    const formEl = e.currentTarget;
    const domUser = (formEl.elements.namedItem('cbt_user_token') as HTMLInputElement | null)?.value ?? '';
    const domPass = (formEl.elements.namedItem('cbt_pass_token') as HTMLInputElement | null)?.value ?? '';

    const finalUsername = cleanInput(domUser || username).replace(/\s+/g, '');
    const finalPassword = cleanInput(domPass || password).replace(/\s+/g, '');

    try {
      const res = await fetch('/api/cbt/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: finalUsername, password: finalPassword })
      });
      const data = await res.json();

      if (data.success) {
        localStorage.setItem('cbt_user', JSON.stringify(data.user));
        router.push('/cbt/dashboard');
      } else if (data.notQualified) {
        Swal.fire({
          icon: 'info',
          title: 'Khusus Peserta Lolos Final',
          text: data.error,
          confirmButtonColor: '#0284c7',
          confirmButtonText: 'Mengerti'
        });
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
          <img 
            src="/logo_olimpiade_seni.png" 
            alt="Logo Olimpiade" 
            style={{ width: '120px', height: 'auto', marginBottom: '16px' }} 
          />
          <h1 style={{ fontSize: '1.5rem', color: '#0f172a', margin: '0 0 8px 0' }}>Portal Ujian CBT</h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>Olimpiade Akademik MTs Almaarif 01</p>
        </div>

        <form onSubmit={handleLogin} autoComplete="off">
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Username</label>
            <input 
              type="text" 
              name="cbt_user_token"
              id="cbt_user_token"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              data-lpignore="true"
              data-form-type="other"
              required
              value={username} 
              onChange={e => setUsername(e.target.value)}
              style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }}
              placeholder="Contoh: CBT12345"
            />
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '6px' }}>
              Huruf besar/kecil tidak berpengaruh (contoh: CBT12345)
            </div>
          </div>
          <div style={{ marginBottom: '32px' }}>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input 
                type={showPassword ? 'text' : 'password'} 
                name="cbt_pass_token"
                id="cbt_pass_token"
                autoComplete="one-time-code"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                data-lpignore="true"
                data-form-type="other"
                required
                value={password} 
                onChange={e => setPassword(e.target.value)}
                style={{ width: '100%', padding: '12px 48px 12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }}
                placeholder="Masukkan Password CBT"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0 }}
              >
                <i className={showPassword ? "fas fa-eye-slash" : "fas fa-eye"}></i>
              </button>
            </div>
          </div>
          <button 
            type="submit" 
            disabled={loading}
            style={{ width: '100%', padding: '14px', borderRadius: '8px', background: '#0284c7', color: 'white', border: 'none', fontWeight: 700, fontSize: '1.1rem', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Memeriksa...' : 'Masuk ke CBT'}
          </button>
        </form>

        <div style={{ marginTop: '16px' }}>
          <button 
            type="button"
            onClick={() => router.push('/olimpiade-seni')}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '8px',
              background: '#f8fafc',
              color: '#475569',
              border: '1.5px solid #e2e8f0',
              fontWeight: 600,
              fontSize: '0.95rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              boxSizing: 'border-box'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#f1f5f9';
              e.currentTarget.style.borderColor = '#cbd5e1';
              e.currentTarget.style.color = '#0f172a';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = '#f8fafc';
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.color = '#475569';
            }}
          >
            <i className="fas fa-arrow-left"></i>
            Kembali ke Dasbor Olimpiade
          </button>
        </div>
      </div>
    </div>
  );
}
