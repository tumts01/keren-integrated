'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';

export default function DashboardCBT() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const data = localStorage.getItem('cbt_user');
    if (!data) {
      router.push('/cbt');
      return;
    }
    setUser(JSON.parse(data));
  }, [router]);

  const handleMulaiUjian = () => {
    Swal.fire({
      title: 'Mulai Ujian?',
      text: "Waktu akan berjalan selama 60 menit. Pastikan koneksi internet Anda stabil.",
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#0284c7',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'Ya, Mulai Sekarang'
    }).then((result) => {
      if (result.isConfirmed) {
        router.push('/cbt/ujian');
      }
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('cbt_user');
    router.push('/cbt');
  };

  if (!user) return null;

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '40px 20px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '1.5rem', color: '#0f172a', margin: 0 }}><i className="fas fa-desktop" style={{ color: '#0284c7', marginRight: '12px' }}></i> Portal CBT</h1>
          <button onClick={handleLogout} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#ef4444', fontWeight: 600, cursor: 'pointer' }}>
            <i className="fas fa-sign-out-alt"></i> Keluar
          </button>
        </div>

        <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <div style={{ background: '#0284c7', padding: '24px', color: 'white' }}>
            <h2 style={{ margin: '0 0 8px 0' }}>Selamat Datang, {user.nama}</h2>
            <p style={{ margin: 0, opacity: 0.9 }}>Asal Sekolah: {user.asalSekolah}</p>
          </div>
          
          <div style={{ padding: '32px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
              <div style={{ border: '1px solid #e2e8f0', padding: '16px', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '4px' }}>Nomor Peserta</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>{user.nomorPeserta}</div>
              </div>
              <div style={{ border: '1px solid #e2e8f0', padding: '16px', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '4px' }}>Mata Uji</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>{user.lomba}</div>
              </div>
            </div>

            <div style={{ background: '#fef3c7', border: '1px solid #fde68a', padding: '20px', borderRadius: '12px', marginBottom: '32px' }}>
              <h3 style={{ margin: '0 0 12px 0', color: '#b45309', fontSize: '1.1rem' }}><i className="fas fa-info-circle"></i> Tata Tertib Ujian</h3>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#92400e', lineHeight: '1.6' }}>
                <li>Waktu ujian adalah <strong>60 menit</strong>.</li>
                <li>Pilih jawaban yang paling tepat. Jawaban otomatis tersimpan.</li>
                <li>Jangan menutup jendela *browser* sebelum mengklik tombol <strong>Selesai</strong> di akhir ujian.</li>
                <li>Jika terjadi gangguan koneksi, Anda bisa masuk kembali ke sistem dan melanjutkan ujian dari soal terakhir.</li>
              </ul>
            </div>

            <button 
              onClick={handleMulaiUjian}
              style={{ width: '100%', padding: '16px', borderRadius: '12px', background: '#10b981', color: 'white', border: 'none', fontWeight: 700, fontSize: '1.2rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)' }}
            >
              <i className="fas fa-play" style={{ marginRight: '8px' }}></i> Mulai Ujian Sekarang
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
