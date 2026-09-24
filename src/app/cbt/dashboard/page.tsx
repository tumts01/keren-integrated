'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';

export default function DashboardCBT() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [sesi, setSesi] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Batas nilai lolos
  const PASSING_GRADE = 70;

  useEffect(() => {
    const data = localStorage.getItem('cbt_user');
    if (!data) {
      router.push('/cbt');
      return;
    }
    const parsed = JSON.parse(data);
    setUser(parsed);
    fetchSesi(parsed.nomorPeserta);
  }, [router]);

  const fetchSesi = async (nomorPeserta: string) => {
    try {
      const res = await fetch(`/api/cbt/sesi?nomorPeserta=${nomorPeserta}`);
      const data = await res.json();
      if (data.success && data.sesi) {
        setSesi(data.sesi);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

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

  const handleUploadBukti = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    Swal.fire({ title: 'Mengunggah Bukti...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
      const formData = new FormData();
      formData.append('nomorPeserta', user.nomorPeserta);
      formData.append('buktiPembayaran', file);

      const res = await fetch('/api/cbt/bayar', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (data.success) {
        Swal.fire('Berhasil!', 'Bukti pembayaran berhasil diunggah. Menunggu verifikasi panitia.', 'success');
      } else {
        Swal.fire('Gagal', data.error, 'error');
      }
    } catch (err: any) {
      Swal.fire('Error', err.message, 'error');
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleLogout = () => {
    localStorage.removeItem('cbt_user');
    router.push('/cbt');
  };

  if (!user || loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Memuat Dashboard...</div>;

  const isSelesai = sesi && sesi.status === 'selesai';
  const isLolos = isSelesai && (sesi.nilai_akhir >= PASSING_GRADE);

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '40px 20px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '1.5rem', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/logo_olimpiade_seni.png" alt="Logo" style={{ height: '32px', width: 'auto' }} /> 
            Portal CBT
          </h1>
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

            {isSelesai ? (
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <div style={{ fontSize: '4rem', color: isLolos ? '#10b981' : '#f59e0b', marginBottom: '16px' }}>
                  {isLolos ? <i className="fas fa-check-circle"></i> : <i className="fas fa-info-circle"></i>}
                </div>
                <h3 style={{ fontSize: '1.5rem', color: '#0f172a', margin: '0 0 8px 0' }}>
                  Ujian Selesai
                </h3>
                <p style={{ color: '#64748b', fontSize: '1.1rem', marginBottom: '24px' }}>
                  Nilai Anda: <strong>{sesi.nilai_akhir}</strong>
                </p>

                {isLolos ? (
                  <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '12px', padding: '24px', textAlign: 'left' }}>
                    <h4 style={{ color: '#065f46', fontSize: '1.2rem', margin: '0 0 12px 0' }}>🎉 Selamat, Anda dinyatakan LOLOS!</h4>
                    <p style={{ color: '#047857', marginBottom: '16px', lineHeight: '1.5' }}>
                      Silakan lanjutkan ke tahap berikutnya dengan melakukan pembayaran dan mengunggah bukti pembayaran pada tombol di bawah ini.
                    </p>
                    <button 
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      style={{ padding: '12px 24px', borderRadius: '8px', background: '#10b981', color: 'white', border: 'none', fontWeight: 700, cursor: uploading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      <i className="fas fa-upload"></i> Unggah Bukti Pembayaran
                    </button>
                    <input type="file" accept="image/*" ref={fileRef} onChange={handleUploadBukti} style={{ display: 'none' }} />
                  </div>
                ) : (
                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '24px' }}>
                    <p style={{ color: '#92400e', margin: 0, lineHeight: '1.5' }}>
                      Terima kasih telah berpartisipasi dalam Olimpiade Akademik. Tetap semangat dan terus belajar!
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div style={{ background: '#fef3c7', border: '1px solid #fde68a', padding: '20px', borderRadius: '12px', marginBottom: '32px' }}>
                  <h3 style={{ margin: '0 0 12px 0', color: '#b45309', fontSize: '1.1rem' }}><i className="fas fa-info-circle"></i> Tata Tertib Ujian</h3>
                  <ul style={{ margin: 0, paddingLeft: '20px', color: '#92400e', lineHeight: '1.6' }}>
                    <li>Waktu ujian adalah <strong>60 menit</strong>.</li>
                    <li>Pilih jawaban yang paling tepat. Jawaban otomatis tersimpan.</li>
                    <li>Jangan menutup jendela *browser* sebelum mengklik tombol <strong>Selesai</strong> di akhir ujian.</li>
                    <li>Jika terjadi gangguan koneksi, Anda bisa masuk kembali ke sistem dan melanjutkan ujian dari soal terakhir.</li>
                    <li><strong>Sistem Anti-Curang Aktif:</strong> Segala bentuk pelanggaran (berpindah tab, meminimalkan layar, keluar dari layar penuh, atau copy-paste) akan direkam oleh sistem. <strong>3x Pelanggaran = Ujian dikumpulkan otomatis.</strong></li>
                  </ul>
                </div>

                <button 
                  onClick={handleMulaiUjian}
                  style={{ width: '100%', padding: '16px', borderRadius: '12px', background: '#10b981', color: 'white', border: 'none', fontWeight: 700, fontSize: '1.2rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)' }}
                >
                  <i className="fas fa-play" style={{ marginRight: '8px' }}></i> {sesi ? 'Lanjutkan Ujian' : 'Mulai Ujian Sekarang'}
                </button>
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
