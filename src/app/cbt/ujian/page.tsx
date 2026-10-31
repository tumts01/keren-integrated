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
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md');

  // Anti-cheat state
  const [warningCount, setWarningCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showWarningBanner, setShowWarningBanner] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const warningCountRef = useRef(0);
  const userRef = useRef<any>(null);
  const isSubmittingRef = useRef(false);
  const isUnloadingRef = useRef(false);
  const isOfflineRef = useRef(false);
  const hasEnteredFullscreenRef = useRef(false);

  // Constants
  const DURASI_MENIT = 90;
  const MAX_WARNINGS = 3;

  // Monitor network online / offline
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const offlineStatus = !navigator.onLine;
    setIsOffline(offlineStatus);
    isOfflineRef.current = offlineStatus;

    const handleOnline = () => {
      setIsOffline(false);
      isOfflineRef.current = false;
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Koneksi internet pulih. Menyinkronkan jawaban...',
        showConfirmButton: false,
        timer: 3000
      });

      // Sinkronkan seluruh jawaban lokal yang tersimpan
      if (userRef.current?.nomorPeserta) {
        try {
          const savedStr = localStorage.getItem(`cbt_jawaban_${userRef.current.nomorPeserta}`);
          if (savedStr) {
            const backup = JSON.parse(savedStr);
            for (const [noSoal, ans] of Object.entries(backup)) {
              fetch('/api/cbt/sesi', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'save', nomorPeserta: userRef.current.nomorPeserta, nomorSoal: noSoal, jawaban: ans })
              }).catch(() => {});
            }
          }
        } catch {}
      }
    };

    const handleOffline = () => {
      setIsOffline(true);
      isOfflineRef.current = true;
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const savedFont = localStorage.getItem('cbt_font_size');
    if (savedFont === 'sm' || savedFont === 'md' || savedFont === 'lg') {
      setFontSize(savedFont);
    }

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

  const handleFontSizeChange = (size: 'sm' | 'md' | 'lg') => {
    setFontSize(size);
    try {
      localStorage.setItem('cbt_font_size', size);
    } catch {
      // ignore
    }
  };

  // --- ANTI-CHEAT: Setup all guards ---
  useEffect(() => {
    if (!user) return;

    // 1. Disable right-click
    const preventContextMenu = (e: MouseEvent) => e.preventDefault();

    // 2. Disable copy/paste/cut/select shortcuts & Block Reload Keys (F5, Ctrl+R, Cmd+R)
    const preventKeys = (e: KeyboardEvent) => {
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;

      // Cegah reload dari keyboard agar peserta tidak refresh tidak sengaja
      const isReload = e.key === 'F5' || (isCtrlOrMeta && e.key.toLowerCase() === 'r');
      if (isReload) {
        e.preventDefault();
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'info',
          title: 'Halaman menyimpan otomatis, tidak perlu di-refresh.',
          showConfirmButton: false,
          timer: 3000
        });
        return;
      }

      const blocked = isCtrlOrMeta && ['c', 'v', 'x', 'a', 'u'].includes(e.key.toLowerCase());
      const devtools = e.key === 'F12' || e.key === 'PrintScreen';
      if (blocked || devtools) e.preventDefault();
    };

    // 3. Tangani beforeunload & pagehide — tandai sedang proses reload/tutup halaman agar TIDAK dihitung pelanggaran
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isSubmittingRef.current) return;
      isUnloadingRef.current = true;
      // Jika peserta membatalkan reload di dialog browser, reset kembali proteksi setelah jeda
      setTimeout(() => {
        isUnloadingRef.current = false;
      }, 2000);

      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    const handlePageHide = () => {
      isUnloadingRef.current = true;
    };

    // 4. Detect tab/window blur — kecualikan saat reload (isUnloadingRef), offline (isOfflineRef), atau sedang submit
    const handleVisibilityChange = () => {
      if (isSubmittingRef.current || isUnloadingRef.current || isOfflineRef.current) {
        return;
      }
      if (document.visibilityState === 'hidden') {
        logAndWarn('tab_switch');
      }
    };

    // Window blur: detects Windows key, Alt+Tab, click outside browser
    const handleWindowBlur = () => {
      if (isSubmittingRef.current || isUnloadingRef.current || isOfflineRef.current) {
        return;
      }
      logAndWarn('tab_switch');
    };

    // 5. Detect fullscreen exit — hanya catat jika sudah pernah masuk fullscreen
    const handleFullscreenChange = () => {
      const isFull = !!(document.fullscreenElement);
      setIsFullscreen(isFull);
      if (isFull) {
        hasEnteredFullscreenRef.current = true;
      } else if (!isSubmittingRef.current && !isUnloadingRef.current && !isOfflineRef.current && hasEnteredFullscreenRef.current) {
        hasEnteredFullscreenRef.current = false;
        logAndWarn('fullscreen_exit');
      }
    };

    // 6. Disable text selection (CSS approach via JS)
    const preventSelect = (e: Event) => e.preventDefault();

    document.addEventListener('contextmenu', preventContextMenu);
    document.addEventListener('keydown', preventKeys);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('selectstart', preventSelect);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      document.removeEventListener('contextmenu', preventContextMenu);
      document.removeEventListener('keydown', preventKeys);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('selectstart', preventSelect);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
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
      hasEnteredFullscreenRef.current = true;
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
        if (data.isDeleted) {
          localStorage.removeItem('cbt_user');
          await Swal.fire({
            icon: 'error',
            title: 'Akses Ditolak',
            text: data.error || 'Akun peserta tidak ditemukan atau telah dihapus dari sistem.',
            confirmButtonColor: '#059669'
          });
          router.push('/cbt');
          return;
        }
        Swal.fire('Info', data.error, 'info').then(() => router.push('/cbt/dashboard'));
        return;
      }

      // Fetch questions
      const resSoal = await fetch(`/api/cbt/sesi?nomorPeserta=${u.nomorPeserta}`);
      const dataSoal = await resSoal.json();
      
      if (dataSoal.isDeleted) {
        localStorage.removeItem('cbt_user');
        await Swal.fire({
          icon: 'error',
          title: 'Akses Ditolak',
          text: dataSoal.error || 'Akun peserta tidak ditemukan atau telah dihapus dari sistem.',
          confirmButtonColor: '#059669'
        });
        router.push('/cbt');
        return;
      }
      
      if (dataSoal.success) {
        setSesi(dataSoal.sesi);
        setSoalList(dataSoal.soal);

        // Gabungkan jawaban dari server dengan backup lokal jika ada (misal sempat offline sebelum reload)
        const serverJawaban = dataSoal.sesi.jawaban_tersimpan || {};
        let localBackup: Record<string, string> = {};
        try {
          const savedStr = localStorage.getItem(`cbt_jawaban_${u.nomorPeserta}`);
          if (savedStr) localBackup = JSON.parse(savedStr);
        } catch {}
        const mergedJawaban = { ...serverJawaban, ...localBackup };
        setJawaban(mergedJawaban);
        
        // Restore warning count if any
        if (dataSoal.sesi.log_kecurangan) {
          const logs = dataSoal.sesi.log_kecurangan as any[];
          warningCountRef.current = logs.length;
          setWarningCount(logs.length);
        }

        // Calculate remaining time — use server timestamp for accuracy
        const startTime = new Date(dataSoal.sesi.waktu_mulai).getTime();
        const durasiMs = DURASI_MENIT * 60 * 1000;
        const endTime = startTime + durasiMs;
        const now = Date.now();
        const remaining = Math.floor((endTime - now) / 1000);

        // Safeguard: jika remaining terlalu besar (>DURASI_MENIT menit, kemungkinan error timezone/jam server)
        // maka gunakan DURASI_MENIT penuh sebagai fallback
        const maxSeconds = DURASI_MENIT * 60;
        const safeguardedRemaining = Math.min(remaining, maxSeconds);

        if (safeguardedRemaining <= 0) {
          // Waktu sudah habis — tapi jangan auto-submit langsung jika selisih < 5 menit
          // (bisa terjadi jika jam browser vs jam server beda sedikit)
          if (remaining < -(5 * 60)) {
            submitUjian(u.nomorPeserta, true); // truly expired
          } else {
            // Selisih kecil — beri 60 detik sebagai grace period
            setTimeLeft(60);
          }
        } else {
          setTimeLeft(safeguardedRemaining);
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
    
    // Update local state dan simpan backup di localStorage segera
    const nextJawaban = { ...jawaban, [noSoal]: opsi };
    setJawaban(nextJawaban);
    try {
      if (user?.nomorPeserta) {
        localStorage.setItem(`cbt_jawaban_${user.nomorPeserta}`, JSON.stringify(nextJawaban));
      }
    } catch (err) {
      // ignore
    }

    // Auto-save ke server
    try {
      const res = await fetch('/api/cbt/sesi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', nomorPeserta: user.nomorPeserta, nomorSoal: noSoal, jawaban: opsi })
      });
      const data = await res.json();
      if (data.isDeleted) {
        localStorage.removeItem('cbt_user');
        await Swal.fire({
          icon: 'error',
          title: 'Akses Ditolak',
          text: data.error || 'Akun peserta tidak ditemukan atau telah dihapus dari sistem.',
          confirmButtonColor: '#059669'
        });
        router.push('/cbt');
      }
    } catch (e) {
      console.warn('Auto save tertunda (offline/koneksi tidak stabil)', e);
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

      if (data.isDeleted) {
        localStorage.removeItem('cbt_user');
        await Swal.fire({
          icon: 'error',
          title: 'Akses Ditolak',
          text: data.error || 'Akun peserta tidak ditemukan atau telah dihapus dari sistem.',
          confirmButtonColor: '#059669'
        });
        router.push('/cbt');
        return;
      }

      if (data.success) {
        try {
          localStorage.removeItem(`cbt_jawaban_${nomorPeserta}`);
        } catch {}

        Swal.fire({
          title: 'Ujian Selesai! 🎉',
          html: `
            <div style="text-align: left; font-size: 0.95rem; margin-top: 8px;">
              <p style="margin: 0; color: #334155; text-align: center;">Selamat, Anda telah menyelesaikan ujian CBT ini dengan baik.</p>
              <p style="margin: 12px 0 0 0; font-size: 0.85rem; color: #64748b; text-align: center;">Jawaban Anda telah tersimpan di sistem.</p>
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

  const handleSafeReload = async () => {
    const confirm = await Swal.fire({
      title: 'Muat Ulang Halaman Ujian?',
      text: 'Semua jawaban Anda yang sudah dipilih tersimpan dengan aman. Halaman akan dimuat ulang secara resmi tanpa dianggap pelanggaran.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#0284c7',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Muat Ulang',
      cancelButtonText: 'Batal'
    });
    if (!confirm.isConfirmed) return;

    // Tandai reload resmi agar sensor anti-cheat tidak menganggap pelanggaran
    isUnloadingRef.current = true;
    window.location.reload();
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

      {/* OFFLINE FLOATING WARNING BANNER */}
      {isOffline && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10000,
          background: 'linear-gradient(90deg, #d97706, #b45309)', color: 'white',
          padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '12px', fontWeight: 700, fontSize: '0.88rem', boxShadow: '0 4px 15px rgba(180,83,9,0.35)',
          flexWrap: 'wrap'
        }}>
          <i className="fas fa-wifi" style={{ fontSize: '1.2rem', color: '#fef08a' }}></i>
          <span>
            <b>Koneksi Internet Terputus!</b> Jawaban Anda tetap tersimpan aman di browser ini. 
            Mohon <u>jangan panik</u>, sistem otomatis terhubung kembali begitu jaringan normal.
          </span>
          <button
            type="button"
            onClick={handleSafeReload}
            style={{
              padding: '5px 12px',
              borderRadius: '6px',
              background: '#fef08a',
              color: '#854d0e',
              border: 'none',
              fontWeight: 800,
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}
          >
            <i className="fas fa-sync-alt"></i> Coba Muat Ulang
          </button>
        </div>
      )}

      {/* WARNING BANNER */}
      {showWarningBanner && (
        <div style={{
          position: 'fixed', top: isOffline ? '48px' : 0, left: 0, right: 0, zIndex: 9999,
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
        <div style={{ background: 'white', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', zIndex: 10, flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontWeight: 800, fontSize: '1.25rem', color: '#0f172a', letterSpacing: '-0.3px' }}>{user.lomba}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* Indikator Status Jaringan Online / Offline */}
            <div
              title={isOffline ? 'Koneksi internet sedang terputus' : 'Koneksi internet stabil'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                background: isOffline ? '#fef2f2' : '#f0fdf4',
                color: isOffline ? '#dc2626' : '#16a34a',
                border: `1px solid ${isOffline ? '#fca5a5' : '#bbf7d0'}`,
                fontSize: '0.82rem',
                fontWeight: 700
              }}
            >
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: isOffline ? '#ef4444' : '#22c55e',
                boxShadow: isOffline ? '0 0 6px rgba(239,68,68,0.6)' : '0 0 6px rgba(34,197,94,0.6)'
              }}></span>
              <i className={`fas ${isOffline ? 'fa-wifi-slash' : 'fa-wifi'}`} style={{ fontSize: '0.78rem' }}></i>
              {isOffline ? 'Offline' : 'Online'}
            </div>

            {/* Tombol Muat Ulang Resmi & Aman */}
            <button
              type="button"
              onClick={handleSafeReload}
              title="Muat ulang halaman ujian secara aman jika ada kendala koneksi tanpa dianggap pelanggaran"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                background: '#f1f5f9',
                color: '#334155',
                border: '1px solid #cbd5e1',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <i className="fas fa-sync-alt" style={{ color: '#0284c7' }}></i>
              Muat Ulang
            </button>

            {/* Pengatur Ukuran Font Soal */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '3px',
              gap: '2px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
            }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', padding: '0 6px 0 8px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <i className="fas fa-text-height" style={{ color: '#0284c7' }}></i> Font:
              </span>
              <button
                type="button"
                onClick={() => handleFontSizeChange('sm')}
                title="Ukuran Font Kecil"
                style={{
                  padding: '4px 10px',
                  borderRadius: '7px',
                  border: 'none',
                  background: fontSize === 'sm' ? '#0284c7' : 'transparent',
                  color: fontSize === 'sm' ? 'white' : '#475569',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: fontSize === 'sm' ? '0 2px 4px rgba(2,132,199,0.3)' : 'none'
                }}
              >
                A-
              </button>
              <button
                type="button"
                onClick={() => handleFontSizeChange('md')}
                title="Ukuran Font Normal (Sedang)"
                style={{
                  padding: '4px 10px',
                  borderRadius: '7px',
                  border: 'none',
                  background: fontSize === 'md' ? '#0284c7' : 'transparent',
                  color: fontSize === 'md' ? 'white' : '#475569',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: fontSize === 'md' ? '0 2px 4px rgba(2,132,199,0.3)' : 'none'
                }}
              >
                A
              </button>
              <button
                type="button"
                onClick={() => handleFontSizeChange('lg')}
                title="Ukuran Font Besar"
                style={{
                  padding: '4px 10px',
                  borderRadius: '7px',
                  border: 'none',
                  background: fontSize === 'lg' ? '#0284c7' : 'transparent',
                  color: fontSize === 'lg' ? 'white' : '#475569',
                  fontWeight: 800,
                  fontSize: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: fontSize === 'lg' ? '0 2px 4px rgba(2,132,199,0.3)' : 'none'
                }}
              >
                A+
              </button>
            </div>

            <div style={{ fontSize: '0.9rem', color: '#475569', background: '#f8fafc', padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontWeight: 600 }}>
              {user.nama} ({user.nomorPeserta})
            </div>
            
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
              <div style={{ fontSize: fontSize === 'lg' ? '1.85rem' : fontSize === 'sm' ? '1.3rem' : '1.5rem', fontWeight: 800, color: '#0284c7', transition: 'font-size 0.2s ease' }}>{currentSoal.nomor_soal}.</div>
              <div style={{ flex: 1 }}>
                <div style={{ 
                  fontSize: fontSize === 'lg' ? '1.45rem' : fontSize === 'sm' ? '1.05rem' : '1.2rem', 
                  color: '#1e293b', 
                  lineHeight: '1.6', 
                  marginBottom: '24px',
                  transition: 'font-size 0.2s ease'
                }}>
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
                      <div style={{ 
                        width: fontSize === 'lg' ? '40px' : fontSize === 'sm' ? '30px' : '34px', 
                        height: fontSize === 'lg' ? '40px' : fontSize === 'sm' ? '30px' : '34px', 
                        borderRadius: '50%', 
                        background: isSelected ? '#3b82f6' : '#f1f5f9', 
                        color: isSelected ? 'white' : '#64748b', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        fontWeight: 700, 
                        marginRight: '16px', 
                        flexShrink: 0,
                        fontSize: fontSize === 'lg' ? '1.15rem' : fontSize === 'sm' ? '0.9rem' : '1rem',
                        transition: 'all 0.2s ease'
                      }}>
                        {optKey}
                      </div>
                      <div style={{ 
                        fontSize: fontSize === 'lg' ? '1.3rem' : fontSize === 'sm' ? '0.95rem' : '1.1rem', 
                        color: '#334155', 
                        alignSelf: 'center', 
                        overflow: 'hidden',
                        lineHeight: '1.5',
                        transition: 'font-size 0.2s ease'
                      }}>
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
