'use client';
import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import styles from './Auth.module.css';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [requirePinInput, setRequirePinInput] = useState(false);
  const [showLoginPin, setShowLoginPin] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showSetupPin, setShowSetupPin] = useState(false);
  const [pinSaving, setPinSaving] = useState(false);
  const [loginMode, setLoginMode] = useState<'select' | 'guru'>('select');
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showLupaPassword, setShowLupaPassword] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);
  const [popup, setPopup] = useState<{show: boolean, type: 'error'|'confirm'|'success', title: string, message: string, onConfirm?: () => void} | null>(null);
  const startupCheckUserRef = useRef<string | null>(null);
  
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    let cancelled = false;
    const storedUser = localStorage.getItem('keren_user_data');
    const portalSession = localStorage.getItem('portal_session');
    const spmbSession = localStorage.getItem('spmb_session');
    const loginParam = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('login') : null;

    const verifyAndBootstrapSession = async () => {
      try {
        // 1. Periksa cookie sesi HttpOnly di server (sumber kebenaran role yang tidak bisa dipalsukan di localStorage)
        const res = await fetch('/api/auth/session', { cache: 'no-store' });
        const sessionData = await res.json();

        if (!cancelled && sessionData?.authenticated && sessionData?.user) {
          localStorage.setItem('keren_user_data', JSON.stringify(sessionData.user));
          try { localStorage.setItem('keren_app_preference', 'guru'); } catch {}
          setUser(sessionData.user);
          setAuthChecked(true);
          return;
        }

        // 2. Migrasi mulus bagi Guru yang sudah login sebelumnya di perangkat ini sebelum pembaruan cookie HttpOnly
        if (storedUser) {
          let parsed: any = null;
          try { parsed = JSON.parse(storedUser); } catch {}
          if (parsed?.username) {
            const upgRes = await fetch('/api/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username: parsed.username }),
            });
            const upgData = await upgRes.json();

            if (!cancelled && upgData?.success && upgData?.user) {
              localStorage.setItem('keren_user_data', JSON.stringify(upgData.user));
              setUser(upgData.user);
              setAuthChecked(true);
              return;
            }

            if (!cancelled && upgData?.requirePin) {
              localStorage.removeItem('keren_user_data');
              setUser(null);
              setUsernameInput(parsed.username);
              setRequirePinInput(true);
              setLoginMode('guru');
              setAuthChecked(true);
              return;
            }
          }
          localStorage.removeItem('keren_user_data');
        }

        if (!cancelled) {
          setUser(null);
          if (spmbSession && pathname === '/') {
            router.replace('/spmb/portal');
            return;
          }
          if (portalSession && pathname === '/') {
            router.replace('/portal/dashboard');
            return;
          }
          setLoginMode(loginParam === 'guru' ? 'guru' : 'select');
        }
      } catch {
        // Fallback offline sementara jika jaringan terputus
        if (!cancelled && storedUser) {
          try { setUser(JSON.parse(storedUser)); } catch {}
        }
      } finally {
        if (!cancelled) setAuthChecked(true);
      }
    };

    verifyAndBootstrapSession();
    return () => { cancelled = true; };
  }, [pathname, router]);

  const checkAndPromptNamaIbu = async (currentUser: any) => {
    if (!currentUser || !currentUser.nama) return;

    try {
      const res = await fetch(`/api/guru/ibu-kandung?nama=${encodeURIComponent(currentUser.nama)}&username=${encodeURIComponent(currentUser.username || '')}`);
      const data = await res.json();

      if (data.success && data.needUpdate) {
        const Swal = (await import('sweetalert2')).default;
        const escHtml = (s: unknown) =>
          String(s ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');

        await Swal.fire({
          title: '',
          html: `
            <div style="text-align: center; padding: 6px 0;">
              <div style="width: 64px; height: 64px; border-radius: 50%; background: #fdf2f8; color: #ec4899; display: flex; align-items: center; justify-content: center; font-size: 2rem; margin: 0 auto 14px; box-shadow: 0 4px 12px rgba(236, 72, 153, 0.2);">
                <i class="fas fa-female"></i>
              </div>
              <h3 style="margin: 0 0 8px; font-weight: 800; color: #1e293b; font-size: 1.25rem;">
                Pemutakhiran Data GTK
              </h3>
              <p style="margin: 0 0 16px; color: #64748b; font-size: 0.9rem; line-height: 1.5;">
                Assalamu'alaikum Bpk/Ibu <b>${escHtml(data.nama || currentUser.nama)}</b>.<br/>
                Mohon masukkan <b>Nama Lengkap Ibu Kandung</b> Anda untuk kelengkapan dan sinkronisasi data EMIS &amp; Simpatika Kemenag.
              </p>
              <div style="text-align: left; margin-bottom: 6px;">
                <label style="display: block; font-size: 0.8rem; font-weight: 700; color: #334155; margin-bottom: 6px;">
                  Nama Lengkap Ibu Kandung:
                </label>
                <input
                  id="swal-input-nama-ibu"
                  class="swal2-input"
                  placeholder="Contoh: Hj. Siti Fatimah"
                  style="width: 100%; box-sizing: border-box; font-size: 0.95rem; border-radius: 8px; border: 1.5px solid #cbd5e1; padding: 10px 14px; margin: 0; outline: none;"
                  autocomplete="off"
                />
              </div>
              <div style="text-align: left; font-size: 0.75rem; color: #94a3b8; margin-top: 6px;">
                *Pastikan ejaan nama sesuai dokumen kependudukan (KTP/KK/Akta).
              </div>
            </div>
          `,
          confirmButtonText: '<i class="fas fa-paper-plane" style="margin-right: 6px;"></i> Kirim &amp; Simpan Data',
          confirmButtonColor: '#0284c7',
          width: '480px',
          allowOutsideClick: false,
          allowEscapeKey: false,
          showCancelButton: false,
          didOpen: () => {
            const input = document.getElementById('swal-input-nama-ibu') as HTMLInputElement;
            if (input) {
              input.focus();
              input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                  Swal.clickConfirm();
                }
              });
            }
          },
          preConfirm: async () => {
            const input = document.getElementById('swal-input-nama-ibu') as HTMLInputElement;
            const value = (input?.value || '').trim();
            if (!value || value.length < 2) {
              Swal.showValidationMessage('Nama Ibu Kandung wajib diisi minimal 2 karakter!');
              return false;
            }

            try {
              const saveRes = await fetch('/api/guru/ibu-kandung', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  guruId: data.guruId,
                  nama: data.nama || currentUser.nama,
                  namaIbuKandung: value
                })
              });
              const saveResult = await saveRes.json();
              if (!saveResult.success) {
                Swal.showValidationMessage(saveResult.error || 'Gagal menyimpan ke database');
                return false;
              }
              return value;
            } catch (err: any) {
              Swal.showValidationMessage('Terjadi kesalahan jaringan: ' + err.message);
              return false;
            }
          }
        }).then((result) => {
          if (result.isConfirmed) {
            Swal.fire({
              icon: 'success',
              title: 'Alhamdulillah, Terima Kasih!',
              text: 'Data Nama Ibu Kandung Anda telah berhasil tersimpan.',
              timer: 2500,
              showConfirmButton: false
            });
          }
        });
      }
    } catch (e) {
      console.error('Error checking nama ibu kandung:', e);
    }
  };

  const checkAndPromptPendingArsip = async (currentUser: any) => {
    if (!currentUser || !currentUser.nama) return;

    try {
      const res = await fetch(
        `/api/persuratan/pending-arsip?nama=${encodeURIComponent(currentUser.nama)}`,
        { cache: 'no-store' }
      );
      const data = await res.json();

      if (data.success && data.totalPending > 0 && Array.isArray(data.items)) {
        const Swal = (await import('sweetalert2')).default;
        const esc = (s: string) =>
          String(s || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');

        const visibleItems = data.items.slice(0, 8);
        const listHtml = visibleItems
          .map(
            (item: any) => `
              <div style="padding: 8px 10px; border-radius: 8px; background: #fff7ed; border: 1px solid #fed7aa; margin-bottom: 6px; text-align: left;">
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                  <span style="font-size: 0.78rem; font-weight: 700; color: #c2410c;">${esc(item.noSurat || 'Tanpa Nomor')}</span>
                  <span style="font-size: 0.72rem; color: #78716c; white-space: nowrap;">${esc(item.tanggal || '-')}</span>
                </div>
                <div style="font-size: 0.85rem; font-weight: 600; color: #1e293b; margin-top: 2px;">${esc(item.namaSurat || '-')}</div>
              </div>
            `
          )
          .join('');

        const moreHtml =
          data.totalPending > visibleItems.length
            ? `<div style="font-size: 0.78rem; color: #9a3412; font-weight: 600; margin-top: 4px; text-align: center;">+ ${data.totalPending - visibleItems.length} surat keluar lainnya belum diarsipkan</div>`
            : '';

        const result = await Swal.fire({
          title: '',
          html: `
            <div style="text-align: center; padding: 4px 0;">
              <div style="width: 60px; height: 60px; border-radius: 50%; background: #fef2f2; color: #dc2626; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; margin: 0 auto 12px; box-shadow: 0 4px 12px rgba(220, 38, 38, 0.18);">
                <i class="fas fa-exclamation-triangle"></i>
              </div>
              <h3 style="margin: 0 0 6px; font-weight: 800; color: #991b1b; font-size: 1.2rem;">
                Belum Mengarsip Surat Keluar!
              </h3>
              <p style="margin: 0 0 12px; color: #475569; font-size: 0.88rem; line-height: 1.45;">
                Halo <b>${esc(currentUser.nama)}</b>, terdapat <b>${data.totalPending}</b> surat keluar atas nama Anda yang <b>belum diupload arsip/scan-nya</b>:
              </p>
              <div style="max-height: 230px; overflow-y: auto; padding-right: 2px; margin-bottom: 10px;">
                ${listHtml}
                ${moreHtml}
              </div>
              <div style="font-size: 0.76rem; color: #64748b;">
                Mohon segera mengarsipkan file surat keluar melalui menu <b>Persuratan &rarr; Tagihan Arsip</b>.
              </div>
            </div>
          `,
          showCancelButton: true,
          confirmButtonText: '<i class="fas fa-cloud-upload-alt" style="margin-right: 6px;"></i> Upload Arsip Sekarang',
          cancelButtonText: 'Nanti Saja',
          confirmButtonColor: '#dc2626',
          cancelButtonColor: '#64748b',
          width: '500px',
          allowOutsideClick: false,
        });

        if (result.isConfirmed) {
          router.push('/persuratan?tab=tagihan');
        }
      }
    } catch (e) {
      console.error('Error checking pending arsip surat keluar:', e);
    }
  };

  // Popup Pengumuman Baru, Pemutakhiran Data & Pengingat Arsip Surat Keluar saat user membuka aplikasi
  useEffect(() => {
    if (!user) {
      startupCheckUserRef.current = null;
      return;
    }

    const userIdentity = String(user.username || user.nama || '').trim();
    if (!userIdentity || startupCheckUserRef.current === userIdentity) {
      return;
    }
    startupCheckUserRef.current = userIdentity;

    const runPostAnnouncementChecks = async () => {
      await checkAndPromptNamaIbu(user);
      await checkAndPromptPendingArsip(user);
    };

    fetch('/api/pengumuman?limit=5')
      .then(r => r.json())
      .then(data => {
        let hasShownAnn = false;
        if (data.success && data.data && data.data.length > 0) {
          const latest = data.data[0]; // Pengumuman terbaru
          const annId = `${latest.tanggal}_${latest.jam}_${latest.pengirim}`;
          const lastRead = localStorage.getItem('keren_last_read_ann');
          
          if (lastRead !== annId) {
            hasShownAnn = true;
            import('@/lib/announcementPopup').then(({ showAnnouncementPopup }) => {
              showAnnouncementPopup({
                pengirim: latest.pengirim,
                tanggal: latest.tanggal,
                jam: latest.jam,
                pesan: latest.pesan,
                lampiran: latest.lampiran
              }).then(() => {
                localStorage.setItem('keren_last_read_ann', annId);
                runPostAnnouncementChecks();
              });
            });
          }
        }
        if (!hasShownAnn) {
          runPostAnnouncementChecks();
        }
      })
      .catch(err => {
        console.error('Gagal memuat pengumuman:', err);
        runPostAnnouncementChecks();
      });
  }, [user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameInput.trim().length > 2) {
      setLoading(true);
      try {
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: usernameInput.trim(),
            ...(pinInput.trim() ? { pin: pinInput.trim() } : {}),
          })
        });
        const data = await res.json();
        
        if (data.success) {
          localStorage.setItem('keren_user_data', JSON.stringify(data.user));
          setPinInput('');
          setRequirePinInput(false);
          setShowLoginPin(false);
          setUser(data.user);
        } else if (data.requirePin) {
          setRequirePinInput(true);
          if (data.error) {
            setPopup({ show: true, type: 'error', title: 'PIN Salah', message: data.error });
          }
        } else {
          setPopup({ show: true, type: 'error', title: 'Login Gagal', message: data.error });
        }
      } catch (err) {
        setPopup({ show: true, type: 'error', title: 'Koneksi Bermasalah', message: 'Terjadi kesalahan jaringan saat mencoba login. Silakan coba lagi.' });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSetupPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(newPin.trim())) {
      setPopup({ show: true, type: 'error', title: 'Format PIN', message: 'PIN keamanan harus tepat 6 digit angka.' });
      return;
    }
    if (newPin.trim() !== confirmPin.trim()) {
      setPopup({ show: true, type: 'error', title: 'PIN Tidak Sama', message: 'Konfirmasi PIN 6 digit tidak cocok.' });
      return;
    }
    setPinSaving(true);
    try {
      const res = await fetch('/api/auth/set-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: newPin.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        const updatedUser = { ...user, hasPin: true, needPinSetup: false };
        localStorage.setItem('keren_user_data', JSON.stringify(updatedUser));
        setUser(updatedUser);
        setNewPin('');
        setConfirmPin('');
        setPopup({ show: true, type: 'success', title: 'PIN Aktif', message: 'PIN keamanan 6 digit akun Anda berhasil disimpan!' });
      } else {
        setPopup({ show: true, type: 'error', title: 'Gagal', message: data.error || 'Gagal menyimpan PIN.' });
      }
    } catch {
      setPopup({ show: true, type: 'error', title: 'Koneksi Bermasalah', message: 'Gagal menghubungi server.' });
    } finally {
      setPinSaving(false);
    }
  };

  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newUsername.trim().length < 4) {
      setPopup({ show: true, type: 'error', title: 'Username Terlalu Pendek', message: 'Username baru minimal 4 karakter.' });
      return;
    }
    
    setUpdateLoading(true);
    try {
      const res = await fetch('/api/user/update-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldUsername: user.username, newUsername: newUsername.trim() })
      });
      const data = await res.json();
      
      if (data.success) {
        localStorage.setItem('keren_user_data', JSON.stringify(data.user));
        setUser(data.user);
        setPopup({ show: true, type: 'success', title: 'Berhasil', message: 'Username Anda telah berhasil diubah!' });
      } else {
        setPopup({ show: true, type: 'error', title: 'Gagal', message: data.error });
      }
    } catch (err) {
      setPopup({ show: true, type: 'error', title: 'Koneksi Bermasalah', message: 'Gagal menghubungi server. Silakan coba lagi.' });
    } finally {
      setUpdateLoading(false);
    }
  };

  if (!mounted) return null;

  const isPrintPage = pathname?.includes('/cetak') || pathname?.includes('/cetak-realisasi') || pathname?.includes('/quick-count');

  // Halaman Publik (tanpa login atau layout khusus)
  const isPublicPage = 
    pathname?.startsWith('/survey-madrasah') || 
    pathname === '/spmb' ||
    pathname === '/spmb/' ||
    pathname === '/spmb/login' ||
    pathname === '/spmb/portal' ||
    pathname?.startsWith('/spmb/cetak') ||
    pathname === '/wali-murid' || 
    pathname?.startsWith('/wali-murid/') ||
    pathname === '/olimpiade-seni' ||
    pathname === '/olimpiade-seni/pendaftaran' ||
    pathname === '/olimpiade-seni/rekap' ||
    pathname === '/olimpiade-seni/monitoring' ||
    pathname === '/olimpiade-seni/kartu' ||
    pathname?.startsWith('/olimpiade-seni/juri') ||
    pathname?.startsWith('/cbt');
  const isPortal = pathname?.startsWith('/portal');

  if (isPortal) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '0' }}>
        {children}
      </div>
    );
  }

  if (isPublicPage && !user) {
    if (isPrintPage) return <>{children}</>;
    return (
      <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '0' }}>
        {children}
      </div>
    );
  }

  // Tunggu verifikasi cookie sesi server selesai sebelum merender halaman internal terproteksi
  if (!authChecked) {
    return null;
  }

  // Rute cetak internal (/buku-induk/cetak, /bon/cetak, dll.) hanya boleh diakses setelah user terautentikasi
  if (user && isPrintPage) {
    return <>{children}</>;
  }

  if (!user) {
    return (
      <div className={styles.loginWrapper}>
        {popup && popup.show && (
          <div className={styles.popupOverlay} style={{ zIndex: 9999 }}>
            <div className={styles.popupCard}>
              <div className={styles.popupIcon} style={{ background: popup.type === 'error' ? '#fee2e2' : popup.type === 'success' ? '#dcfce7' : '#fef3c7', color: popup.type === 'error' ? '#ef4444' : popup.type === 'success' ? '#16a34a' : '#f59e0b' }}>
                <i className={`fas ${popup.type === 'error' ? 'fa-times' : popup.type === 'success' ? 'fa-check' : 'fa-exclamation-triangle'}`}></i>
              </div>
              <h3 className={styles.popupTitle}>{popup.title}</h3>
              <p className={styles.popupMessage}>{popup.message}</p>
              <div className={styles.popupActions}>
                {popup.type === 'confirm' && (
                  <button className={styles.popupBtnCancel} onClick={() => setPopup(null)}>Batal</button>
                )}
                <button 
                  className={styles.popupBtnConfirm} 
                  style={{ background: popup.type === 'error' ? '#ef4444' : popup.type === 'success' ? '#16a34a' : '#059669' }}
                  onClick={() => {
                    if (popup.onConfirm) popup.onConfirm();
                    setPopup(null);
                  }}
                >
                  {popup.type === 'error' || popup.type === 'success' ? 'Tutup' : 'Ya, Lanjutkan'}
                </button>
              </div>
            </div>
          </div>
        )}
        <div className={styles.leftSection}>
          {/* Latar belakang foto sekolah */}
          <div className={styles.leftOverlay}>
            {/* Teks dihilangkan sesuai permintaan agar foto lebih menonjol */}
          </div>
        </div>
        
        <div className={styles.rightSection}>
          <div className={styles.loginCard}>
            <div className={styles.brand}>
              <img src="/logo.png" alt="Logo" style={{ width: '56px', height: '56px', objectFit: 'contain' }} />
              <h2>KEREN</h2>
            </div>
            
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>
              MTS ALMAARIF 01 SINGOSARI
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '18px' }}>
              Sistem Informasi Administrasi Digital
            </p>

            {loginMode === 'select' ? (
              <>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 12px',
                  borderRadius: '999px',
                  background: '#f1f5f9',
                  color: '#475569',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  marginBottom: '4px'
                }}>
                  <i className="fas fa-compass" style={{ color: '#059669' }}></i>
                  <span>Pilih Portal / Tujuan Masuk</span>
                </div>

                <div className={styles.portalList}>
                  <button
                    type="button"
                    className={styles.portalOption}
                    onClick={() => setLoginMode('guru')}
                    style={{ borderColor: '#bbf7d0', background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)' }}
                  >
                    <div className={styles.portalOptionIcon} style={{ background: '#dcfce7', color: '#059669' }}>
                      <i className="fas fa-chalkboard-teacher"></i>
                    </div>
                    <div className={styles.portalOptionBody}>
                      <div className={styles.portalOptionTitle}>Guru &amp; Staf Madrasah</div>
                      <div className={styles.portalOptionDesc}>Masuk dengan username untuk administrasi, presensi, jurnal &amp; nilai</div>
                    </div>
                    <i className={`fas fa-chevron-right ${styles.portalOptionArrow}`}></i>
                  </button>

                  <Link
                    href="/portal/login"
                    prefetch={false}
                    className={styles.portalOption}
                    style={{ borderColor: '#bae6fd', background: 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)' }}
                  >
                    <div className={styles.portalOptionIcon} style={{ background: '#e0f2fe', color: '#0284c7' }}>
                      <i className="fas fa-user-graduate"></i>
                    </div>
                    <div className={styles.portalOptionBody}>
                      <div className={styles.portalOptionTitle}>Portal Siswa &amp; Wali Murid</div>
                      <div className={styles.portalOptionDesc}>Masuk dengan NISN untuk pantau presensi, rapor, jurnal &amp; pengumuman</div>
                    </div>
                    <i className={`fas fa-chevron-right ${styles.portalOptionArrow}`}></i>
                  </Link>

                  <Link
                    href="/spmb/login"
                    prefetch={false}
                    className={styles.portalOption}
                    style={{ borderColor: '#a7f3d0', background: 'linear-gradient(135deg, #ffffff 0%, #ecfdf5 100%)' }}
                  >
                    <div className={styles.portalOptionIcon} style={{ background: '#d1fae5', color: '#047857' }}>
                      <i className="fas fa-id-card"></i>
                    </div>
                    <div className={styles.portalOptionBody}>
                      <div className={styles.portalOptionTitle}>Portal Calon Siswa (SPMB)</div>
                      <div className={styles.portalOptionDesc}>Masuk dengan Nomor Pendaftaran untuk cek status &amp; kartu peserta</div>
                    </div>
                    <i className={`fas fa-chevron-right ${styles.portalOptionArrow}`}></i>
                  </Link>

                  <Link
                    href="/olimpiade-seni"
                    prefetch={false}
                    className={styles.portalOption}
                    style={{ borderColor: '#fde68a', background: 'linear-gradient(135deg, #ffffff 0%, #fffbeb 100%)' }}
                  >
                    <div className={styles.portalOptionIcon} style={{ background: '#fef3c7', color: '#b45309' }}>
                      <i className="fas fa-trophy"></i>
                    </div>
                    <div className={styles.portalOptionBody}>
                      <div className={styles.portalOptionTitle}>Dasbor Olimpiade &amp; Seni</div>
                      <div className={styles.portalOptionDesc}>Pendaftaran peserta, login ujian CBT &amp; live score pemenang</div>
                    </div>
                    <i className={`fas fa-chevron-right ${styles.portalOptionArrow}`}></i>
                  </Link>
                </div>
              </>
            ) : (
              <>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 12px',
                  borderRadius: '999px',
                  background: '#ecfdf5',
                  color: '#047857',
                  border: '1px solid #a7f3d0',
                  fontSize: '0.78rem',
                  fontWeight: 700
                }}>
                  <i className="fas fa-chalkboard-teacher"></i>
                  <span>Login Guru &amp; Staf Madrasah</span>
                </div>

                <form onSubmit={handleLogin} className={styles.form}>
                  <div style={{ textAlign: 'left', marginBottom: '14px' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>
                      Username
                    </label>
                    <div className={styles.inputGroup}>
                      <input 
                        type="text" 
                        placeholder="Masukkan username anda" 
                        value={usernameInput}
                        onChange={(e) => {
                          setUsernameInput(e.target.value);
                          if (requirePinInput) {
                            setRequirePinInput(false);
                          }
                        }}
                        autoFocus
                        required 
                      />
                    </div>
                  </div>

                  <div style={{ textAlign: 'left', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151' }}>
                        PIN 6 Digit Angka
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowLoginPin(prev => !prev)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#047857',
                          fontSize: '0.76rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          padding: 0,
                        }}
                      >
                        <i className={`fas ${showLoginPin ? 'fa-eye-slash' : 'fa-eye'}`}></i>{' '}
                        {showLoginPin ? 'Sembunyikan' : 'Lihat PIN'}
                      </button>
                    </div>
                    <div className={styles.inputGroup}>
                      <input
                        type={showLoginPin ? 'text' : 'password'}
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="Masukkan 6 angka PIN..."
                        value={pinInput}
                        onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        required={requirePinInput}
                        style={
                          requirePinInput
                            ? { borderColor: '#10b981', boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.15)' }
                            : undefined
                        }
                      />
                    </div>
                    {requirePinInput ? (
                      <small style={{ color: '#047857', fontSize: '0.76rem', fontWeight: 600, display: 'block', marginTop: '5px' }}>
                        <i className="fas fa-lock"></i> Akun ini sudah memiliki PIN. Masukkan 6 digit PIN Anda lalu klik Masuk.
                      </small>
                    ) : (
                      <small style={{ color: '#64748b', fontSize: '0.75rem', display: 'block', marginTop: '5px', lineHeight: 1.4 }}>
                        Belum pernah membuat PIN? <strong>Kosongkan saja kolom PIN</strong> lalu klik <strong>Masuk</strong> untuk membuat PIN baru.
                      </small>
                    )}
                  </div>

                  <button type="submit" className={styles.loginBtn} disabled={loading}>
                    {loading ? <><i className="fas fa-spinner fa-spin"></i> Memproses...</> : <><i className="fas fa-sign-in-alt"></i> Masuk</>}
                  </button>
                </form>

                <button
                  type="button"
                  className={styles.forgotBtn}
                  onClick={() => setShowLupaPassword(true)}
                >
                  Lupa username atau butuh bantuan akses?
                </button>

                <button
                  type="button"
                  className={styles.backSelectBtn}
                  onClick={() => {
                    setLoginMode('select');
                    if (pathname === '/' && typeof window !== 'undefined' && window.location.search.includes('login=guru')) {
                      router.replace('/');
                    }
                  }}
                >
                  <i className="fas fa-arrow-left"></i> Kembali ke Pilihan Portal
                </button>
              </>
            )}
            
            <div className={styles.footer}>
              &copy; {new Date().getFullYear()} KEREN Integrated from Aa' Icoll
            </div>
          </div>
        </div>

        {/* Lupa Password Modal */}
        {showLupaPassword && (
          <div className={styles.popupOverlay}>
            <div className={styles.popupCard}>
              <div className={styles.popupIcon} style={{ background: '#e0f2fe', color: '#0ea5e9' }}>
                <i className="fas fa-info-circle"></i>
              </div>
              <h3 className={styles.popupTitle}>Bantuan Akses Login</h3>
              <p className={styles.popupMessage}>
                Silakan hubungi Administrator (Aa' Icoll) untuk mereset username atau memulihkan akses Anda ke sistem KEREN.
              </p>
              <div className={styles.popupActions}>
                <button className={styles.popupBtnCancel} onClick={() => setShowLupaPassword(false)}>Kembali</button>
                <a 
                  href="https://wa.me/628970434000?text=Halo%20Aa'%20Icoll,%20saya%20lupa%20akses%20login%20KEREN%20saya.%20Mohon%20bantuannya." 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={styles.popupBtnConfirm}
                  style={{ background: '#22c55e', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  onClick={() => setShowLupaPassword(false)}
                >
                  <i className="fab fa-whatsapp"></i> Hubungi via WA
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  

  return (
    <div className="app-container">
      {popup && popup.show && (
        <div className={styles.popupOverlay} style={{ zIndex: 9999 }}>
          <div className={styles.popupCard}>
            <div className={styles.popupIcon} style={{ background: popup.type === 'error' ? '#fee2e2' : popup.type === 'success' ? '#dcfce7' : '#fef3c7', color: popup.type === 'error' ? '#ef4444' : popup.type === 'success' ? '#16a34a' : '#f59e0b' }}>
              <i className={`fas ${popup.type === 'error' ? 'fa-times' : popup.type === 'success' ? 'fa-check' : 'fa-exclamation-triangle'}`}></i>
            </div>
            <h3 className={styles.popupTitle}>{popup.title}</h3>
            <p className={styles.popupMessage}>{popup.message}</p>
            <div className={styles.popupActions}>
              {popup.type === 'confirm' && (
                <button className={styles.popupBtnCancel} onClick={() => setPopup(null)}>Batal</button>
              )}
              <button 
                className={styles.popupBtnConfirm} 
                style={{ background: popup.type === 'error' ? '#ef4444' : popup.type === 'success' ? '#16a34a' : '#059669' }}
                onClick={() => {
                  if (popup.onConfirm) popup.onConfirm();
                  setPopup(null);
                }}
              >
                {popup.type === 'error' || popup.type === 'success' ? 'Tutup' : 'Ya, Lanjutkan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {user && user.sudahGantiUsername === false && (
        <div className={styles.popupOverlay} style={{ zIndex: 5000, background: 'rgba(0,0,0,0.85)' }}>
          <div className={styles.popupCard} style={{ maxWidth: '450px' }}>
            <div className={styles.popupIcon} style={{ background: '#fef3c7', color: '#f59e0b' }}>
              <i className="fas fa-shield-alt"></i>
            </div>
            <h3 className={styles.popupTitle}>Wajib Ganti Username</h3>
            <p className={styles.popupMessage} style={{ marginBottom: '20px' }}>
              Halo {user.nama.split(' ')[0]}, demi keamanan, Anda <strong>wajib mengganti username bawaan</strong> sebelum menggunakan aplikasi. Silakan buat username baru Anda di bawah ini:
            </p>
            
            <form onSubmit={handleUpdateUsername} style={{ width: '100%' }}>
              <div className={styles.inputGroup} style={{ marginBottom: '16px' }}>
                <input 
                  type="text" 
                  placeholder="Ketik Username Baru..." 
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  required 
                  minLength={4}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none' }}
                />
                <small style={{ color: '#64748b', fontSize: '0.8rem', display: 'block', marginTop: '6px', textAlign: 'left' }}>*Minimal 4 karakter dan mudah diingat</small>
              </div>
              
              <button 
                type="submit" 
                className={styles.popupBtnConfirm} 
                style={{ background: '#f59e0b', width: '100%', padding: '12px' }}
                disabled={updateLoading}
              >
                {updateLoading ? <i className="fas fa-spinner fa-spin"></i> : "Simpan Username Baru"}
              </button>
            </form>
          </div>
        </div>
      )}

      {user && user.needPinSetup === true && (
        <div className={styles.popupOverlay} style={{ zIndex: 5100, background: 'rgba(15, 23, 42, 0.85)' }}>
          <div className={styles.popupCard} style={{ maxWidth: '450px' }}>
            <div className={styles.popupIcon} style={{ background: '#dcfce7', color: '#16a34a' }}>
              <i className="fas fa-lock"></i>
            </div>
            <h3 className={styles.popupTitle}>Buat PIN Keamanan Anda (6 Digit)</h3>
            <p className={styles.popupMessage} style={{ marginBottom: '16px', lineHeight: 1.5 }}>
              Assalamu&apos;alaikum Bpk/Ibu <strong>{user.nama || user.username}</strong>,<br/>
              Silakan buat <strong>PIN 6 digit angka</strong> pilihan Anda sendiri yang mudah diingat (misal tanggal lahir). PIN ini cukup dibuat satu kali untuk melindungi akun Anda.
            </p>
            <form onSubmit={handleSetupPin} style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowSetupPin(prev => !prev)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#047857',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  <i className={`fas ${showSetupPin ? 'fa-eye-slash' : 'fa-eye'}`}></i>{' '}
                  {showSetupPin ? 'Sembunyikan Angka' : 'Tampilkan Angka PIN'}
                </button>
              </div>
              <div className={styles.inputGroup} style={{ marginBottom: '12px' }}>
                <input
                  type={showSetupPin ? 'text' : 'password'}
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Ketik 6 Digit PIN Angka..."
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  autoFocus
                  required
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #cbd5e1', outline: 'none', letterSpacing: '5px', textAlign: 'center', fontSize: '1.1rem', fontWeight: 700 }}
                />
              </div>
              <div className={styles.inputGroup} style={{ marginBottom: '16px' }}>
                <input
                  type={showSetupPin ? 'text' : 'password'}
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Ulangi 6 Digit PIN..."
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #cbd5e1', outline: 'none', letterSpacing: '5px', textAlign: 'center', fontSize: '1.1rem', fontWeight: 700 }}
                />
              </div>
              <button
                type="submit"
                className={styles.popupBtnConfirm}
                style={{ background: '#16a34a', width: '100%', padding: '12px', fontWeight: 700 }}
                disabled={pinSaving}
              >
                {pinSaving ? <><i className="fas fa-spinner fa-spin"></i> Menyimpan...</> : 'Simpan & Aktifkan PIN'}
              </button>
            </form>
          </div>
        </div>
      )}

      <Sidebar />
      <div className="main-content">
        <Header user={user} onLogout={() => {
          setPopup({
            show: true,
            type: 'confirm',
            title: 'Konfirmasi Keluar',
            message: 'Apakah Anda yakin ingin keluar dari sistem KEREN?',
            onConfirm: () => {
              fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
              localStorage.removeItem('keren_user_data');
              setUser(null);
              setRequirePinInput(false);
              setPinInput('');
              setLoginMode('select');
              if (pathname === '/' && typeof window !== 'undefined' && window.location.search.includes('login=guru')) {
                router.replace('/');
              }
            }
          });
        }} />
        <main className="page-content">
          <div className="print-header">
            <img src="/kop_surat_mts.png" alt="Kop Surat MTs Almaarif 01" style={{ width: '100%', maxWidth: '800px', display: 'block', margin: '0 auto' }} />
          </div>
          {children}
        </main>
        <footer style={{
          textAlign: 'center',
          padding: '16px',
          fontSize: '0.85rem',
          color: 'var(--text-muted)',
          borderTop: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-card)',
          marginTop: 'auto'
        }}>
          &copy; {new Date().getFullYear()} <strong>KEREN Integrated</strong> - MTs Almaarif 01 Singosari.<br/>
          <span style={{ fontSize: '0.75rem', marginTop: '4px', display: 'inline-block' }}>
            Developed with <i className="fas fa-heart" style={{ color: 'var(--danger)', margin: '0 2px' }}></i> by <strong>Aa' Icoll</strong>
          </span>
        </footer>
      </div>
    </div>
  );
}
