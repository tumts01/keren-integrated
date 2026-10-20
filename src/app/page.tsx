'use client';
import { useState, useEffect } from 'react';
import styles from "./page.module.css";
import Link from 'next/link';
import LoadingScreen from '@/components/LoadingScreen';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [tagihanList, setTagihanList] = useState<any[]>([]);
  const [raporInfo, setRaporInfo] = useState<{kelas: string, missing: number, total: number} | null>(null);
  const [susulanInfo, setSusulanInfo] = useState<{kelas: string, total: number, belumSelesai: number, rincian: any[]} | null>(null);
  const [alphaInfo, setAlphaInfo] = useState<any>(null);
  const [showAlphaModal, setShowAlphaModal] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('keren_user_data');
    const portalSession = localStorage.getItem('portal_session');
    const spmbSession = localStorage.getItem('spmb_session');
    const appPref = localStorage.getItem('keren_app_preference');

    if (!storedUser && spmbSession) {
      window.location.replace('/spmb/portal');
      return;
    }
    if (!storedUser && appPref === 'spmb') {
      window.location.replace('/spmb/login');
      return;
    }
    if (!storedUser && portalSession) {
      window.location.replace('/portal/dashboard');
      return;
    }
    if (!storedUser && appPref === 'portal') {
      window.location.replace('/portal/login');
      return;
    }

    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      fetchProfile(parsedUser.nama);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchProfile = async (nama: string) => {
    try {
      const [resGuru, resSurat, resKelas, resRapor, resSusulan] = await Promise.all([
        fetch('/api/guru'),
        fetch('/api/persuratan'),
        fetch('/api/kelas'),
        fetch('/api/rapor'),
        fetch('/api/perangkat-ujian/susulan/input')
      ]);
      const data = await resGuru.json();
      const surat = await resSurat.json();
      const kelasData = await resKelas.json();
      const raporData = await resRapor.json();
      const susulanData = await resSusulan.json();
      
      let foundProfile = null;
      if (data.success) {
        const found = data.data.find((g: any) => g.nama.toLowerCase().trim() === nama.toLowerCase().trim());
        setProfile(found);
        foundProfile = found;
      }

      if (surat.success && foundProfile) {
        const myName = foundProfile.nama.toLowerCase();
        const myTagihan = surat.suratKeluar.filter((s: any) => 
          !s.fileScan && 
          s.pj && s.pj.toLowerCase().includes(myName)
        );
        setTagihanList(myTagihan);
      }

      // Check wali kelas status (rapor and susulan)
      if (kelasData.success && foundProfile) {
        const myName = foundProfile.nama.toLowerCase().trim();
        const myKelas = kelasData.data.find((k: any) => {
          if (!k.waliKelas) return false;
          const waliName = k.waliKelas.toLowerCase().trim();
          return waliName.includes(myName) || myName.includes(waliName);
        });
        
        if (myKelas) {
          if (raporData.success) {
            const rekapKelas = raporData.rekap?.find((r: any) => r.kelas === myKelas.rombel);
            if (rekapKelas && rekapKelas.missing > 0) {
              setRaporInfo({
                kelas: myKelas.rombel,
                missing: rekapKelas.missing,
                total: rekapKelas.total
              });
            }
          }

          if (susulanData.success && susulanData.data) {
            const classSusulan = susulanData.data.filter((r: any) => r.metadata?.kelas === myKelas.rombel);
            const pendingSusulan = classSusulan.filter((r: any) => !r.metadata?.isSelesai);
            
            if (pendingSusulan.length > 0) {
              const rincian = pendingSusulan.map((r: any) => ({
                nama: r.metadata?.nama,
                mapel: r.metadata?.mapel,
                isSelesai: !!r.metadata?.isSelesai
              }));
              setSusulanInfo({
                kelas: myKelas.rombel,
                total: classSusulan.length,
                belumSelesai: pendingSusulan.length,
                rincian
              });
            }
          }

          // Check pantauan siswa Alpha hari ini (Wali Kelas)
          try {
            const resAlpha = await fetch(`/api/presensi/wali-kelas-alpha?kelas=${encodeURIComponent(myKelas.rombel)}&wali=${encodeURIComponent(foundProfile.nama)}&_t=${Date.now()}`, { cache: 'no-store' });
            const alphaData = await resAlpha.json();
            if (alphaData.success && alphaData.totalAlpha > 0) {
              setAlphaInfo(alphaData);
              const sessionKey = `alpha_dismissed_${alphaData.tanggal}_${myKelas.rombel}_${alphaData.totalAlpha}`;
              if (!sessionStorage.getItem(sessionKey)) {
                setShowAlphaModal(true);
              }
            }
          } catch (errAlpha) {
            console.error('Error fetching alpha data:', errAlpha);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDismissModal = () => {
    setShowAlphaModal(false);
    if (alphaInfo) {
      sessionStorage.setItem(`alpha_dismissed_${alphaInfo.tanggal}_${alphaInfo.kelas}_${alphaInfo.totalAlpha}`, '1');
    }
  };

  if (loading) {
    return <LoadingScreen message="Menyiapkan Dashboard Anda..." />;
  }

  // Jika tidak ditemukan di db_GTK, tampilkan halaman awal standar
  if (!profile) {
    return (
      <div className={styles.container} style={{ alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
        <img src="/logo.png" alt="Logo" style={{ width: '100px', marginBottom: '20px' }} />
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>KEREN Dashboard</h1>
        <p style={{ color: 'var(--text-muted)' }}>Selamat datang, {user?.nama || 'Pengguna'}! Akun Anda aktif namun tidak tertaut ke Database GTK.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Modal Pop-up Pemberitahuan Siswa Alpha Hari Ini (Wali Kelas) */}
      {showAlphaModal && alphaInfo && alphaInfo.totalAlpha > 0 && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.72)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '18px',
            maxWidth: '580px',
            width: '100%',
            maxHeight: '88vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            overflow: 'hidden'
          }}>
            {/* Header Modal */}
            <div style={{
              background: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
              color: 'white',
              padding: '18px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.22)',
                  borderRadius: '50%',
                  width: '44px',
                  height: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.4rem',
                  flexShrink: 0
                }}>
                  <i className="fas fa-bell"></i>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Pemberitahuan Wali Kelas {alphaInfo.kelas}</h3>
                  <div style={{ fontSize: '0.82rem', opacity: 0.92, marginTop: '2px' }}>
                    {alphaInfo.totalAlpha} Siswa Tercatat Alpha (Tidak Masuk) Hari Ini &bull; {alphaInfo.tanggalFormatted}
                  </div>
                </div>
              </div>
              <button
                onClick={handleDismissModal}
                style={{
                  background: 'rgba(255, 255, 255, 0.18)',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '1.2rem'
                }}
                title="Tutup Notifikasi"
              >
                &times;
              </button>
            </div>

            {/* Content Body Modal */}
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              <div style={{
                background: '#fff1f2',
                border: '1px solid #fecdd3',
                borderRadius: '10px',
                padding: '12px 14px',
                marginBottom: '16px',
                fontSize: '0.88rem',
                color: '#9f1239',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                lineHeight: '1.5'
              }}>
                <i className="fas fa-heart" style={{ fontSize: '1.2rem', color: '#e11d48', marginTop: '2px', flexShrink: 0 }}></i>
                <div>
                  <strong>Bentuk Kepedulian Wali Kelas:</strong> Ananda di bawah ini belum hadir di madrasah tanpa keterangan. Mari hubungi wali murid untuk menanyakan keadaan ananda dan memastikan kondisinya baik-baik saja.
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {alphaInfo.students.map((s: any, idx: number) => (
                  <div key={idx} style={{
                    border: '1px solid #fecdd3',
                    background: '#ffffff',
                    borderRadius: '12px',
                    padding: '14px',
                    boxShadow: '0 2px 4px rgba(225, 29, 72, 0.04)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
                      <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.98rem' }}>
                        {idx + 1}. {s.nama}
                      </div>
                      <span style={{
                        fontSize: '0.72rem',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        background: s.domisili.toLowerCase().includes('rumah') ? '#dcfce7' : '#e0e7ff',
                        color: s.domisili.toLowerCase().includes('rumah') ? '#166534' : '#3730a3',
                        fontWeight: 700,
                        whiteSpace: 'nowrap'
                      }}>
                        <i className={`fas ${s.domisili.toLowerCase().includes('rumah') ? 'fa-home' : 'fa-mosque'}`} style={{ marginRight: '4px' }}></i>
                        {s.domisili}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.83rem', color: '#64748b', marginBottom: '10px', lineHeight: '1.4' }}>
                      <i className="fas fa-book-open" style={{ marginRight: '6px', color: '#e11d48' }}></i>
                      Pelajaran: <strong>{s.mapelList.map((m: any) => `${m.mapel} (Jam ${m.jamKe})`).filter((v: string, i: number, a: string[]) => a.indexOf(v) === i).join(', ')}</strong>
                      {s.gurus && s.gurus.length > 0 && (
                        <span style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
                          <i className="fas fa-user-edit" style={{ marginRight: '4px' }}></i> Dicatat oleh: {s.gurus.join(', ')}
                        </span>
                      )}
                    </div>

                    {/* WhatsApp Action Buttons */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingTop: '8px', borderTop: '1px dashed #fecdd3' }}>
                      {s.ortu.waLinkIbu && (
                        <a 
                          href={s.ortu.waLinkIbu} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: '#22c55e',
                            color: 'white',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            textDecoration: 'none',
                            boxShadow: '0 2px 4px rgba(34, 197, 94, 0.2)'
                          }}
                          title={`Hubungi Ibu (${s.ortu.ibu || s.ortu.noHpIbu})`}
                        >
                          <i className="fab fa-whatsapp"></i> WA Ibu {s.ortu.ibu ? `(${s.ortu.ibu})` : ''}
                        </a>
                      )}

                      {s.ortu.waLinkAyah && (
                        <a 
                          href={s.ortu.waLinkAyah} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: '#15803d',
                            color: 'white',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            textDecoration: 'none',
                            boxShadow: '0 2px 4px rgba(21, 128, 61, 0.2)'
                          }}
                          title={`Hubungi Ayah (${s.ortu.ayah || s.ortu.noHpAyah})`}
                        >
                          <i className="fab fa-whatsapp"></i> WA Ayah {s.ortu.ayah ? `(${s.ortu.ayah})` : ''}
                        </a>
                      )}

                      {s.ortu.waLinkWali && !s.ortu.waLinkIbu && !s.ortu.waLinkAyah && (
                        <a 
                          href={s.ortu.waLinkWali} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: '#0284c7',
                            color: 'white',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            textDecoration: 'none'
                          }}
                        >
                          <i className="fab fa-whatsapp"></i> WA Wali {s.ortu.wali ? `(${s.ortu.wali})` : ''}
                        </a>
                      )}

                      {!s.ortu.waLinkIbu && !s.ortu.waLinkAyah && !s.ortu.waLinkWali && (
                        <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <i className="fas fa-phone-slash"></i> Nomor telepon orang tua belum tercatat di data induk
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Modal */}
            <div style={{
              padding: '14px 20px',
              background: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}>
              <a 
                href="/presensi" 
                style={{
                  color: '#0284c7',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <i className="fas fa-external-link-alt"></i> Buka Menu Presensi Siswa
              </a>

              <button
                onClick={handleDismissModal}
                style={{
                  background: '#e11d48',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '9px 20px',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(225, 29, 72, 0.3)'
                }}
              >
                Mengerti & Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kartu Sambutan */}
      <div className={styles.welcomeCard}>
        <div className={styles.welcomeContent}>
          <h1 className={styles.welcomeTitle}>Awali harimu dengan Bismillah <i className="fas fa-praying-hands" style={{ marginLeft: '4px' }}></i></h1>
          <p className={styles.welcomeSubtitle}>Selamat datang kembali di KEREN. Semoga harimu menyenangkan!</p>
        </div>
        <i className="fas fa-sun" style={{ fontSize: '8rem', color: 'rgba(255,255,255,0.2)', position: 'absolute', right: '-20px', bottom: '-20px' }}></i>
      </div>

      {/* Hero Profil (Menindih Kartu Sambutan sedikit) */}
      <div className={styles.profileHero}>
        <div className={styles.photoFrame}>
          {profile.foto ? (
            <img src={profile.foto} alt="Profile" className={styles.photo} referrerPolicy="no-referrer" />
          ) : (
            <i className="fas fa-user-tie" style={{ fontSize: '4rem', color: '#cbd5e1' }}></i>
          )}
        </div>
        
        <div className={styles.heroInfo}>
          <div className={styles.name}>{profile.nama}</div>
          <div className={styles.jabatan}>{profile.jabatan}</div>
          
          <div className={styles.badgeGrid}>
            <span className={styles.badge} style={{ background: profile.status.toLowerCase().includes('aktif') && !profile.status.toLowerCase().includes('non') ? '#dcfce7' : '#fee2e2', color: profile.status.toLowerCase().includes('aktif') && !profile.status.toLowerCase().includes('non') ? '#166534' : '#991b1b', borderColor: profile.status.toLowerCase().includes('aktif') && !profile.status.toLowerCase().includes('non') ? '#bbf7d0' : '#fecaca' }}>
              <i className={`fas ${profile.status.toLowerCase().includes('aktif') && !profile.status.toLowerCase().includes('non') ? 'fa-check-circle' : 'fa-times-circle'}`}></i> {profile.status}
            </span>
            <span className={styles.badge}>
              <i className="fas fa-id-badge"></i> PEG ID: {profile.pegId || '-'}
            </span>
            <span className={styles.badge}>
              <i className="fas fa-fingerprint"></i> NIP: {profile.nip || '-'}
            </span>
          </div>
        </div>
      </div>

      {/* Box Siswa Alpha Hari Ini (Wali Kelas) */}
      {alphaInfo && alphaInfo.totalAlpha > 0 && (
        <div style={{
          background: 'linear-gradient(to right, #fff1f2, #ffe4e6)',
          border: '1.5px solid #fecdd3',
          borderRadius: '14px',
          padding: '22px',
          marginBottom: '24px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(225, 29, 72, 0.08)'
        }}>
          <div style={{ position: 'absolute', top: '-15px', right: '-15px', opacity: 0.08, pointerEvents: 'none' }}>
            <i className="fas fa-heart-pulse" style={{ fontSize: '9rem', color: '#e11d48' }}></i>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '18px', position: 'relative', zIndex: 1 }}>
            <div style={{
              background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
              color: 'white',
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.6rem',
              flexShrink: 0,
              boxShadow: '0 4px 10px rgba(225, 29, 72, 0.3)'
            }}>
              <i className="fas fa-bell"></i>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '6px' }}>
                <h3 style={{ margin: 0, color: '#9f1239', fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>Pantauan Kehadiran Hari Ini &mdash; Kelas {alphaInfo.kelas}</span>
                  <span style={{ background: '#be123c', color: 'white', fontSize: '0.78rem', padding: '3px 10px', borderRadius: '12px', fontWeight: 700 }}>
                    {alphaInfo.totalAlpha} Siswa Alpha
                  </span>
                </h3>
                <span style={{ fontSize: '0.85rem', color: '#881337', fontWeight: 600 }}>
                  <i className="far fa-calendar-alt" style={{ marginRight: '4px' }}></i>
                  {alphaInfo.tanggalFormatted}
                </span>
              </div>

              <p style={{ margin: '0 0 14px 0', color: '#881337', fontSize: '0.95rem', lineHeight: '1.5' }}>
                Ada <strong>{alphaInfo.totalAlpha} siswa</strong> di kelas Anda yang tercatat <strong>Alpha (tidak masuk tanpa keterangan)</strong> hari ini.
                Sebagai bentuk kepedulian, silakan konfirmasi ke orang tua/wali murid di bawah ini:
              </p>

              {/* Grid Siswa Alpha */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                {alphaInfo.students.map((s: any, idx: number) => (
                  <div key={idx} style={{
                    background: 'white',
                    border: '1px solid #fecdd3',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '8px'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>
                          {idx + 1}. {s.nama}
                        </span>
                        <span style={{
                          fontSize: '0.7rem',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: s.domisili.toLowerCase().includes('rumah') ? '#ecfdf5' : '#eff6ff',
                          color: s.domisili.toLowerCase().includes('rumah') ? '#047857' : '#1d4ed8',
                          fontWeight: 600
                        }}>
                          {s.domisili}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '6px' }}>
                        <i className="fas fa-clock" style={{ marginRight: '4px', color: '#e11d48' }}></i>
                        Jam {s.jamKeRingkasan} &bull; {s.mapelList.map((m: any) => m.mapel).filter((v: string, i: number, a: string[]) => a.indexOf(v) === i).join(', ')}
                      </div>
                    </div>

                    {/* WhatsApp action buttons */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', paddingTop: '6px', borderTop: '1px dashed #f1f5f9' }}>
                      {s.ortu.waLinkIbu && (
                        <a 
                          href={s.ortu.waLinkIbu} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: '#22c55e',
                            color: 'white',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            textDecoration: 'none'
                          }}
                          title={`Kirim WA ke Ibu (${s.ortu.ibu || s.ortu.noHpIbu})`}
                        >
                          <i className="fab fa-whatsapp"></i> WA Ibu {s.ortu.ibu ? `(${s.ortu.ibu})` : ''}
                        </a>
                      )}

                      {s.ortu.waLinkAyah && (
                        <a 
                          href={s.ortu.waLinkAyah} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: '#15803d',
                            color: 'white',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            textDecoration: 'none'
                          }}
                          title={`Kirim WA ke Ayah (${s.ortu.ayah || s.ortu.noHpAyah})`}
                        >
                          <i className="fab fa-whatsapp"></i> WA Ayah {s.ortu.ayah ? `(${s.ortu.ayah})` : ''}
                        </a>
                      )}

                      {s.ortu.waLinkWali && !s.ortu.waLinkIbu && !s.ortu.waLinkAyah && (
                        <a 
                          href={s.ortu.waLinkWali} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: '#0284c7',
                            color: 'white',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            textDecoration: 'none'
                          }}
                        >
                          <i className="fab fa-whatsapp"></i> WA Wali {s.ortu.wali ? `(${s.ortu.wali})` : ''}
                        </a>
                      )}

                      {!s.ortu.waLinkIbu && !s.ortu.waLinkAyah && !s.ortu.waLinkWali && (
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
                          No HP belum tersedia di buku induk
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <a 
                  href="/presensi" 
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#e11d48',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontWeight: 700,
                    fontSize: '0.88rem'
                  }}
                >
                  <i className="fas fa-clipboard-check"></i> Buka Menu Presensi Siswa
                </a>

                <button
                  onClick={() => setShowAlphaModal(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'white',
                    color: '#be123c',
                    border: '1px solid #fca5a5',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer'
                  }}
                >
                  <i className="fas fa-expand"></i> Buka Pop-up Notifikasi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Box Tagihan Arsip */}
      {tagihanList.length > 0 && (
        <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '12px', padding: '20px', marginBottom: '24px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.1 }}>
            <i className="fas fa-exclamation-triangle" style={{ fontSize: '8rem', color: '#ef4444' }}></i>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', position: 'relative', zIndex: 1 }}>
            <div style={{ background: '#ef4444', color: 'white', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>
              <i className="fas fa-bell"></i>
            </div>
            <div>
              <h3 style={{ margin: '0 0 4px 0', color: '#991b1b', fontSize: '1.2rem', fontWeight: 700 }}>Perhatian! Ada Tagihan Arsip Surat</h3>
              <p style={{ margin: '0 0 12px 0', color: '#b91c1c', fontSize: '0.95rem' }}>Anda menjadi Pembuat Surat (PJ) pada <strong>{tagihanList.length} surat</strong> yang arsip PDF-nya belum diunggah.</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {tagihanList.slice(0, 3).map(s => (
                  <span key={s.id} style={{ background: 'white', color: '#7f1d1d', padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', border: '1px solid #fca5a5', fontWeight: 600 }}>
                    {s.noSurat || 'Nomor Surat Kosong'}
                  </span>
                ))}
                {tagihanList.length > 3 && (
                  <span style={{ background: 'transparent', color: '#991b1b', padding: '4px 8px', fontSize: '0.85rem', fontWeight: 600 }}>
                    +{tagihanList.length - 3} lainnya...
                  </span>
                )}
              </div>
              <a href="/persuratan" style={{ display: 'inline-block', marginTop: '16px', background: '#dc2626', color: 'white', padding: '8px 16px', borderRadius: '8px', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}>
                Buka Menu Persuratan <i className="fas fa-arrow-right" style={{ marginLeft: '4px' }}></i>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Box Rapor Wali Kelas */}
      {raporInfo && (
        <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '12px', padding: '20px', marginBottom: '24px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.1 }}>
            <i className="fas fa-book-open" style={{ fontSize: '8rem', color: '#f59e0b' }}></i>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', position: 'relative', zIndex: 1 }}>
            <div style={{ background: '#f59e0b', color: 'white', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>
              <i className="fas fa-book"></i>
            </div>
            <div>
              <h3 style={{ margin: '0 0 4px 0', color: '#92400e', fontSize: '1.2rem', fontWeight: 700 }}>Laporan Pengembalian Rapor &mdash; Kelas {raporInfo.kelas}</h3>
              <p style={{ margin: '0 0 12px 0', color: '#a16207', fontSize: '0.95rem' }}>
                <strong>{raporInfo.missing}</strong> dari <strong>{raporInfo.total}</strong> siswa di kelas Anda <strong>belum mengembalikan rapor</strong>.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: 'white', borderRadius: '8px', padding: '8px 14px', border: '1px solid #fde68a' }}>
                  <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#d97706' }}>{raporInfo.missing}</span>
                  <span style={{ fontSize: '0.8rem', color: '#92400e', display: 'block' }}>Belum Kembali</span>
                </div>
                <div style={{ background: 'white', borderRadius: '8px', padding: '8px 14px', border: '1px solid #fde68a' }}>
                  <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#16a34a' }}>{raporInfo.total - raporInfo.missing}</span>
                  <span style={{ fontSize: '0.8rem', color: '#166534', display: 'block' }}>Sudah Kembali</span>
                </div>
              </div>
              <a href="/pengembalian-rapor" style={{ display: 'inline-block', marginTop: '16px', background: '#d97706', color: 'white', padding: '8px 16px', borderRadius: '8px', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}>
                Lihat Detail Pengembalian <i className="fas fa-arrow-right" style={{ marginLeft: '4px' }}></i>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Box Susulan Wali Kelas */}
      {susulanInfo && (
        <div style={{ background: '#e0f2fe', border: '1px solid #bae6fd', borderRadius: '12px', padding: '20px', marginBottom: '24px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.1 }}>
            <i className="fas fa-clipboard-list" style={{ fontSize: '8rem', color: '#0284c7' }}></i>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', position: 'relative', zIndex: 1 }}>
            <div style={{ background: '#0284c7', color: 'white', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>
              <i className="fas fa-edit"></i>
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: '0 0 4px 0', color: '#075985', fontSize: '1.2rem', fontWeight: 700 }}>Info Ujian Susulan &mdash; Kelas {susulanInfo.kelas}</h3>
              <p style={{ margin: '0 0 12px 0', color: '#0369a1', fontSize: '0.95rem' }}>
                Ada <strong>{susulanInfo.total}</strong> mata pelajaran yang diikuti siswa susulan di kelas Anda. 
                <strong>{susulanInfo.belumSelesai}</strong> di antaranya belum selesai.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {susulanInfo.rincian.map((r, i) => (
                  <div key={i} style={{ background: 'white', border: '1px solid #bae6fd', padding: '6px 12px', borderRadius: '6px', fontSize: '0.85rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className={r.isSelesai ? "fas fa-check-circle" : "fas fa-clock"} style={{ color: r.isSelesai ? '#10b981' : '#f59e0b' }}></i>
                    <span><strong>{r.nama}</strong> ({r.mapel})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Data Grid */}
      <div className={styles.detailsGrid}>
        
        {/* Kolom Informasi Pribadi */}
        <div className={styles.detailCard}>
          <div className={styles.cardHeader}>
            <div className={styles.cardIcon}>
              <i className="fas fa-user"></i>
            </div>
            Informasi Pribadi
          </div>
          
          <div className={styles.infoList}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Tempat, Tanggal Lahir</span>
              <div className={styles.infoValue}>
                <i className="fas fa-birthday-cake" style={{ color: '#94a3b8' }}></i>
                {profile.tempatLahir || '-'}, {profile.tanggalLahir || '-'}
              </div>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Jenis Kelamin</span>
              <div className={styles.infoValue}>
                <i className={`fas ${profile.jenisKelamin.toLowerCase().includes('laki') ? 'fa-male' : 'fa-female'}`} style={{ color: '#94a3b8' }}></i>
                {profile.jenisKelamin || '-'}
              </div>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Nomor Induk Kependudukan (NIK)</span>
              <div className={styles.infoValue}>
                <i className="fas fa-address-card" style={{ color: '#94a3b8' }}></i>
                {profile.nik || '-'}
              </div>
            </div>
          </div>
        </div>

        {/* Kolom Kontak & Alamat */}
        <div className={styles.detailCard}>
          <div className={styles.cardHeader}>
            <div className={styles.cardIcon} style={{ background: '#3b82f6' }}>
              <i className="fas fa-address-book"></i>
            </div>
            Kontak & Alamat
          </div>
          
          <div className={styles.infoList}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Nomor WhatsApp</span>
              <div className={styles.infoValue}>
                <i className="fab fa-whatsapp" style={{ color: '#22c55e', fontSize: '1.2rem' }}></i>
                {profile.noHp || '-'}
              </div>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Email</span>
              <div className={styles.infoValue}>
                <i className="fas fa-envelope" style={{ color: '#94a3b8' }}></i>
                {profile.email || '-'}
              </div>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Alamat Rumah</span>
              <div className={styles.infoValue}>
                <i className="fas fa-map-marker-alt" style={{ color: '#ef4444' }}></i>
                {profile.alamat || '-'}
              </div>
            </div>
          </div>
        </div>

        {/* Kolom Akses EMIS */}
        <div className={styles.detailCard}>
          <div className={styles.cardHeader}>
            <div className={styles.cardIcon} style={{ background: '#10b981' }}>
              <i className="fas fa-key"></i>
            </div>
            Kredensial EMIS
          </div>
          
          <div className={styles.infoList}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>PEG ID</span>
              <div className={styles.infoValue}>
                <i className="fas fa-id-badge" style={{ color: '#94a3b8' }}></i>
                {profile.pegId || '-'}
              </div>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Tanggal SK Awal</span>
              <div className={styles.infoValue}>
                <i className="fas fa-calendar-alt" style={{ color: '#94a3b8' }}></i>
                {profile.tanggalSk || '-'}
              </div>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Password EMIS Hijau</span>
              <div className={styles.infoValue}>
                <i className="fas fa-lock" style={{ color: '#10b981' }}></i>
                {profile.passEmisHijau || '-'}
              </div>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Password EMIS DEV</span>
              <div className={styles.infoValue}>
                <i className="fas fa-shield-alt" style={{ color: '#8b5cf6' }}></i>
                {profile.passEmisDev || '-'}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
