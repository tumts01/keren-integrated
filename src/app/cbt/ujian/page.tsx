'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';

export default function CBTUjianPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [soalList, setSoalList] = useState<any[]>([]);
  const [sesi, setSesi] = useState<any>(null);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [jawaban, setJawaban] = useState<Record<string, string>>({});
  
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Constants
  const DURASI_MENIT = 60;

  useEffect(() => {
    const data = localStorage.getItem('cbt_user');
    if (!data) {
      router.push('/cbt');
      return;
    }
    const parsedUser = JSON.parse(data);
    setUser(parsedUser);
    initSesi(parsedUser);
  }, []);

  const initSesi = async (u: any) => {
    try {
      // Start or Resume
      const res = await fetch('/api/cbt/sesi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', nomorPeserta: u.nomorPeserta, lomba: u.lomba })
      });
      const data = await res.json();
      
      if (!data.success) {
        Swal.fire('Info', data.error, 'info').then(() => router.push('/cbt/dashboard'));
        return;
      }

      // Fetch questions
      const resSoal = await fetch(`/api/cbt/sesi?nomorPeserta=${u.nomorPeserta}`);
      const dataSoal = await resSoal.json();
      
      if (dataSoal.success) {
        setSesi(dataSoal.sesi);
        setSoalList(dataSoal.soal);
        setJawaban(dataSoal.sesi.jawaban_tersimpan || {});
        
        // Calculate remaining time
        const startTime = new Date(dataSoal.sesi.waktu_mulai).getTime();
        const endTime = startTime + (DURASI_MENIT * 60 * 1000);
        const now = new Date().getTime();
        
        if (now >= endTime) {
          submitUjian(u.nomorPeserta, true); // auto submit if time is over
        } else {
          setTimeLeft(Math.floor((endTime - now) / 1000));
        }
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Gagal memuat ujian', 'error');
    }
  };

  useEffect(() => {
    if (timeLeft === null || isSubmitting) return;

    if (timeLeft <= 0) {
      submitUjian(user.nomorPeserta, true);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev !== null ? prev - 1 : null);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isSubmitting]);

  const handlePilihJawaban = async (opsi: string) => {
    if (!soalList[currentIndex]) return;
    const noSoal = soalList[currentIndex].nomor_soal.toString();
    
    // Update local state
    setJawaban(prev => ({ ...prev, [noSoal]: opsi }));

    // Auto-save to server
    try {
      fetch('/api/cbt/sesi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', nomorPeserta: user.nomorPeserta, nomorSoal: noSoal, jawaban: opsi })
      }); // fire and forget
    } catch (e) {
      console.error('Auto save failed', e);
    }
  };

  const submitUjian = async (nomorPeserta: string, auto: boolean = false) => {
    if (!auto) {
      const confirmed = await Swal.fire({
        title: 'Selesai Ujian?',
        text: "Anda yakin ingin mengakhiri ujian ini? Jawaban tidak bisa diubah lagi.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Ya, Selesai',
        cancelButtonText: 'Batal'
      });
      if (!confirmed.isConfirmed) return;
    }

    setIsSubmitting(true);
    Swal.fire({ title: 'Menyimpan Ujian...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
      const res = await fetch('/api/cbt/sesi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit', nomorPeserta })
      });
      const data = await res.json();

      if (data.success) {
        Swal.fire({
          title: 'Ujian Selesai!',
          text: `Terima kasih telah mengikuti CBT.`,
          icon: 'success'
        }).then(() => {
          router.push('/cbt/dashboard');
        });
      } else {
        Swal.fire('Error', data.error, 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Gagal mengirim ujian', 'error');
    }
    setIsSubmitting(false);
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!user || !soalList.length) return <div style={{ padding: '40px', textAlign: 'center' }}>Memuat Ujian...</div>;

  const currentSoal = soalList[currentIndex];
  const noSoalString = currentSoal.nomor_soal.toString();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f1f5f9' }}>
      {/* KIRI: Area Soal */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ background: 'white', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', zIndex: 10 }}>
          <div style={{ fontWeight: 700, fontSize: '1.2rem', color: '#0f172a' }}>{user.lomba}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ fontSize: '0.9rem', color: '#64748b' }}>{user.nama} ({user.nomorPeserta})</div>
            <div style={{ background: timeLeft !== null && timeLeft < 300 ? '#fef2f2' : '#f0fdf4', color: timeLeft !== null && timeLeft < 300 ? '#ef4444' : '#16a34a', padding: '8px 16px', borderRadius: '20px', fontWeight: 700, border: `1px solid ${timeLeft !== null && timeLeft < 300 ? '#fca5a5' : '#bbf7d0'}` }}>
              <i className="fas fa-clock" style={{ marginRight: '8px' }}></i>
              {timeLeft !== null ? formatTime(timeLeft) : '--:--'}
            </div>
          </div>
        </div>

        {/* Konten Soal */}
        <div style={{ padding: '32px', flex: 1, overflowY: 'auto' }}>
          <div style={{ background: 'white', padding: '32px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0284c7' }}>{currentSoal.nomor_soal}.</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '1.2rem', color: '#1e293b', lineHeight: '1.6', marginBottom: '24px' }}>
                  {currentSoal.pertanyaan}
                </div>
                {currentSoal.gambar_url && (
                  <div style={{ marginBottom: '24px' }}>
                    <img src={`/api/proxy-image?url=${encodeURIComponent(currentSoal.gambar_url)}`} alt="Ilustrasi Soal" style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                  </div>
                )}
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {['A', 'B', 'C', 'D', 'E'].map(optKey => {
                    const opsiValue = currentSoal[`opsi_${optKey.toLowerCase()}`];
                    if (!opsiValue) return null;
                    
                    const isSelected = jawaban[noSoalString] === optKey;
                    
                    return (
                      <div 
                        key={optKey}
                        onClick={() => handlePilihJawaban(optKey)}
                        style={{ 
                          display: 'flex', 
                          padding: '16px', 
                          borderRadius: '12px', 
                          border: `2px solid ${isSelected ? '#3b82f6' : '#e2e8f0'}`,
                          background: isSelected ? '#eff6ff' : 'white',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: isSelected ? '#3b82f6' : '#f1f5f9', color: isSelected ? 'white' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, marginRight: '16px', flexShrink: 0 }}>
                          {optKey}
                        </div>
                        <div style={{ fontSize: '1.1rem', color: '#334155', alignSelf: 'center' }}>
                          {opsiValue}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
            <button 
              onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              style={{ padding: '12px 24px', borderRadius: '8px', background: currentIndex === 0 ? '#cbd5e1' : '#0f172a', color: 'white', border: 'none', fontWeight: 600, cursor: currentIndex === 0 ? 'not-allowed' : 'pointer' }}
            >
              <i className="fas fa-chevron-left" style={{ marginRight: '8px' }}></i> Sebelumnya
            </button>
            <button 
              onClick={() => setCurrentIndex(prev => Math.min(soalList.length - 1, prev + 1))}
              disabled={currentIndex === soalList.length - 1}
              style={{ padding: '12px 24px', borderRadius: '8px', background: currentIndex === soalList.length - 1 ? '#cbd5e1' : '#0f172a', color: 'white', border: 'none', fontWeight: 600, cursor: currentIndex === soalList.length - 1 ? 'not-allowed' : 'pointer' }}
            >
              Selanjutnya <i className="fas fa-chevron-right" style={{ marginLeft: '8px' }}></i>
            </button>
          </div>
        </div>
      </div>

      {/* KANAN: Navigasi Soal */}
      <div style={{ width: '300px', background: 'white', borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', fontWeight: 700, color: '#0f172a' }}>
          Navigasi Soal
        </div>
        <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
            {soalList.map((soal, idx) => {
              const num = soal.nomor_soal.toString();
              const isAnswered = !!jawaban[num];
              const isCurrent = idx === currentIndex;
              
              return (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  style={{
                    aspectRatio: '1/1',
                    borderRadius: '8px',
                    border: `2px solid ${isCurrent ? '#0284c7' : (isAnswered ? '#10b981' : '#cbd5e1')}`,
                    background: isAnswered ? '#10b981' : (isCurrent ? '#eff6ff' : 'white'),
                    color: isAnswered ? 'white' : (isCurrent ? '#0284c7' : '#64748b'),
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1rem'
                  }}
                >
                  {soal.nomor_soal}
                </button>
              );
            })}
          </div>
          
          <div style={{ marginTop: '24px', display: 'flex', gap: '12px', fontSize: '0.8rem', color: '#64748b', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '16px', height: '16px', background: '#10b981', borderRadius: '4px' }}></div> Sudah Dijawab
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '16px', height: '16px', border: '1px solid #cbd5e1', borderRadius: '4px' }}></div> Belum Dijawab
            </div>
          </div>
        </div>
        
        <div style={{ padding: '20px', borderTop: '1px solid #e2e8f0' }}>
          <button 
            onClick={() => submitUjian(user.nomorPeserta)}
            style={{ width: '100%', padding: '14px', borderRadius: '8px', background: '#ef4444', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '1rem' }}
          >
            Hentikan & Kumpulkan
          </button>
        </div>
      </div>
    </div>
  );
}
