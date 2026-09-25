'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
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

  // Anti-cheat state
  const [warningCount, setWarningCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showWarningBanner, setShowWarningBanner] = useState(false);
  const warningCountRef = useRef(0);
  const userRef = useRef<any>(null);
  const isSubmittingRef = useRef(false);

  // Constants
  const DURASI_MENIT = 60;
  const MAX_WARNINGS = 3;

  useEffect(() => {
    const data = localStorage.getItem('cbt_user');
    if (!data) {
      router.push('/cbt');
      return;
    }
    const parsedUser = JSON.parse(data);
    setUser(parsedUser);
    userRef.current = parsedUser;
    initSesi(parsedUser);
  }, []);

  // --- ANTI-CHEAT: Setup all guards ---
  useEffect(() => {
    if (!user) return;

    // 1. Disable right-click
    const preventContextMenu = (e: MouseEvent) => e.preventDefault();

    // 2. Disable copy/paste/cut/select shortcuts
    const preventKeys = (e: KeyboardEvent) => {
      const blocked = (e.ctrlKey || e.metaKey) && ['c', 'v', 'x', 'a', 'u'].includes(e.key.toLowerCase());
      // Also block F12 devtools, PrintScreen
      const devtools = e.key === 'F12' || e.key === 'PrintScreen';
      if (blocked || devtools) e.preventDefault();
    };

    // 3. Detect tab/window blur (tab switching)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && !isSubmittingRef.current) {
        logAndWarn('tab_switch');
      }
    };

    // 4. Detect fullscreen exit
    const handleFullscreenChange = () => {
      const isFull = !!(document.fullscreenElement);
      setIsFullscreen(isFull);
      if (!isFull && !isSubmittingRef.current) {
        logAndWarn('fullscreen_exit');
      }
    };

    // 5. Disable text selection (CSS approach via JS)
    const preventSelect = (e: Event) => e.preventDefault();

    document.addEventListener('contextmenu', preventContextMenu);
    document.addEventListener('keydown', preventKeys);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('selectstart', preventSelect);

    return () => {
      document.removeEventListener('contextmenu', preventContextMenu);
      document.removeEventListener('keydown', preventKeys);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('selectstart', preventSelect);
    };
  }, [user]);

  // Request fullscreen when ujian starts
  useEffect(() => {
    if (soalList.length > 0 && !isFullscreen) {
      requestFullscreen();
    }
  }, [soalList]);

  const requestFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } catch {
      // Silently ignore if fullscreen is denied
    }
  };

  const logAndWarn = useCallback(async (jenisKecurangan: string) => {
    const newCount = warningCountRef.current + 1;
    warningCountRef.current = newCount;
    setWarningCount(newCount);
    setShowWarningBanner(true);
    setTimeout(() => setShowWarningBanner(false), 4000);

    // Log to server
    try {
      fetch('/api/cbt/sesi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'log_kecurangan',
          nomorPeserta: userRef.current?.nomorPeserta,
          jenisKecurangan,
          jumlahPelanggaran: newCount
        })
      });
    } catch (e) {
      console.error('Gagal log kecurangan', e);
    }

    if (newCount >= MAX_WARNINGS) {
      // Auto submit
      await Swal.fire({
        title: '⚠️ Batas Pelanggaran Terlampaui!',
        html: `Anda telah melakukan <b>${MAX_WARNINGS}x pelanggaran</b> selama ujian berlangsung.<br><br>Ujian akan dikumpulkan otomatis sekarang.`,
        icon: 'error',
        confirmButtonText: 'OK',
        allowOutsideClick: false,
        timer: 5000,
        timerProgressBar: true,
      });
      submitUjian(userRef.current?.nomorPeserta, true);
    } else {
      const jenisLabel = jenisKecurangan === 'tab_switch' ? 'Berpindah tab/aplikasi'
        : jenisKecurangan === 'fullscreen_exit' ? 'Keluar dari layar penuh'
        : jenisKecurangan === 'copy_paste' ? 'Copy/Paste'
        : 'Pelanggaran';
      Swal.fire({
        title: `⚠️ Peringatan ${newCount}/${MAX_WARNINGS}`,
        html: `<b>${jenisLabel}</b> terdeteksi!<br><br>Jika Anda melanggar sebanyak <b>${MAX_WARNINGS}x</b>, ujian akan dikumpulkan otomatis.`,
        icon: 'warning',
        confirmButtonText: 'Kembali ke Ujian',
        allowOutsideClick: false,
      }).then(() => {
        // Re-request fullscreen after warning dialog
        if (jenisKecurangan === 'fullscreen_exit') {
          requestFullscreen();
        }
      });
    }
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
        
        // Restore warning count if any
        if (dataSoal.sesi.log_kecurangan) {
          const logs = dataSoal.sesi.log_kecurangan as any[];
          warningCountRef.current = logs.length;
          setWarningCount(logs.length);
        }

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

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    Swal.fire({ title: 'Menyimpan Ujian...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    // Exit fullscreen gracefully
    try { if (document.fullscreenElement) await document.exitFullscreen(); } catch { /* ignore */ }

    try {
      const res = await fetch('/api/cbt/sesi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit', nomorPeserta })
      });
      const data = await res.json();

      if (data.success) {
        Swal.fire({
          title: 'Ujian Selesai! 🎉',
          html: `
            <div style="text-align: left; font-size: 0.95rem; margin-top: 8px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr style="background: #f0fdf4;">
                  <td style="padding: 10px 16px; font-weight: 600; color: #16a34a;">✅ Jawaban Benar</td>
                  <td style="padding: 10px 16px; text-align: right; font-weight: 700; color: #16a34a;">${data.benar} × (+4) = +${data.benar * 4}</td>
                </tr>
                <tr style="background: #fef2f2;">
                  <td style="padding: 10px 16px; font-weight: 600; color: #dc2626;">❌ Jawaban Salah</td>
                  <td style="padding: 10px 16px; text-align: right; font-weight: 700; color: #dc2626;">${data.salah} × (−1) = −${data.salah}</td>
                </tr>
                <tr style="background: #f8fafc;">
                  <td style="padding: 10px 16px; font-weight: 600; color: #64748b;">⬜ Tidak Dijawab</td>
                  <td style="padding: 10px 16px; text-align: right; font-weight: 700; color: #64748b;">${data.kosong} × (0) = 0</td>
                </tr>
                <tr style="background: #eff6ff; border-top: 2px solid #3b82f6;">
                  <td style="padding: 12px 16px; font-weight: 700; color: #1d4ed8; font-size: 1rem;">⭐ Total Skor</td>
                  <td style="padding: 12px 16px; text-align: right; font-weight: 800; color: #1d4ed8; font-size: 1.2rem;">${data.skor}</td>
                </tr>
              </table>
              <p style="margin: 12px 0 0 0; font-size: 0.8rem; color: #94a3b8; text-align: center;">dari ${data.totalSoal} soal · Sistem: Benar +4, Salah −1, Kosong 0</p>
            </div>
          `,
          icon: 'success',
          confirmButtonText: 'Selesai'
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
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f1f5f9', userSelect: 'none' }}>

      {/* WARNING BANNER */}
      {showWarningBanner && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
          background: '#ef4444', color: 'white', padding: '14px', textAlign: 'center',
          fontWeight: 700, fontSize: '1rem', letterSpacing: '0.02em',
          boxShadow: '0 4px 20px rgba(239,68,68,0.4)'
        }}>
          ⚠️ PELANGGARAN TERDETEKSI! Peringatan {warningCount}/{MAX_WARNINGS}. Ujian akan dikumpulkan otomatis jika melebihi batas.
        </div>
      )}

      {/* KIRI: Area Soal */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ background: 'white', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', zIndex: 10 }}>
          <div style={{ fontWeight: 700, fontSize: '1.2rem', color: '#0f172a' }}>{user.lomba}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ fontSize: '0.9rem', color: '#64748b' }}>{user.nama} ({user.nomorPeserta})</div>
            
            {/* Warning Counter */}
            {warningCount > 0 && (
              <div style={{ background: '#fef2f2', color: '#ef4444', padding: '6px 12px', borderRadius: '20px', fontWeight: 700, fontSize: '0.85rem', border: '1px solid #fca5a5' }}>
                ⚠️ {warningCount}/{MAX_WARNINGS} Pelanggaran
              </div>
            )}

            {/* Fullscreen indicator */}
            {!isFullscreen && (
              <button
                onClick={requestFullscreen}
                style={{ background: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', padding: '6px 12px', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}
              >
                <i className="fas fa-expand" style={{ marginRight: '6px' }}></i>Layar Penuh
              </button>
            )}

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
                      <div style={{ fontSize: '1.1rem', color: '#334155', alignSelf: 'center', overflow: 'hidden' }}>
                        {opsiValue.startsWith('http') && opsiValue.includes('drive.google.com') ? (
                          <img 
                            src={`/api/proxy-image?url=${encodeURIComponent(opsiValue)}`} 
                            alt={`Opsi ${optKey}`} 
                            style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', display: 'block' }} 
                          />
                        ) : (
                          opsiValue
                        )}
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
            Kirim Jawaban
          </button>
        </div>
      </div>
    </div>
  );
}
