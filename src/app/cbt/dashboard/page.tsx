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
                <div style={{ fontSize: '4rem', color: '#0284c7', marginBottom: '16px' }}>
                  <i className="fas fa-flag-checkered"></i>
                </div>
                <h3 style={{ fontSize: '1.5rem', color: '#0f172a', margin: '0 0 8px 0' }}>
                  Ujian Selesai!
                </h3>
                <p style={{ color: '#64748b', fontSize: '1.1rem', marginBottom: '24px' }}>
                  Terima kasih telah mengerjakan soal dengan sebaik-baiknya.
                </p>

                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '24px', textAlign: 'left' }}>
                  <h4 style={{ color: '#1d4ed8', fontSize: '1.1rem', margin: '0 0 10px 0' }}>
                    <i className="fas fa-clock" style={{ marginRight: '8px' }}></i>
                    Menunggu Pengumuman Resmi
                  </h4>
                  <p style={{ color: '#1e40af', margin: '0 0 12px 0', lineHeight: '1.6' }}>
                    Hasil seleksi akan diumumkan secara resmi oleh panitia setelah seluruh peserta menyelesaikan ujian. Mohon bersabar dan pantau pengumuman dari pihak madrasah.
                  </p>
                  <div style={{ background: 'white', borderRadius: '8px', padding: '12px 16px', display: 'inline-block', border: '1px solid #bfdbfe' }}>
                    <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Mata Uji: </span>
                    <strong style={{ color: '#0f172a' }}>{user.lomba}</strong>
                  </div>
                </div>
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
