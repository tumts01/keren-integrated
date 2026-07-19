'use client';
import { useState, useEffect } from 'react';
import styles from "./page.module.css";
import Link from 'next/link';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [tagihanList, setTagihanList] = useState<any[]>([]);
  const [raporInfo, setRaporInfo] = useState<{kelas: string, missing: number, total: number} | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('keren_user_data');
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
      const [resGuru, resSurat, resKelas, resRapor] = await Promise.all([
        fetch('/api/guru'),
        fetch('/api/persuratan'),
        fetch('/api/kelas'),
        fetch('/api/rapor')
      ]);
      const data = await resGuru.json();
      const surat = await resSurat.json();
      const kelasData = await resKelas.json();
      const raporData = await resRapor.json();
      
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
          (
            (s.pj && s.pj.toLowerCase().includes(myName)) || 
            (s.yangDitugaskan && s.yangDitugaskan.toLowerCase().includes(myName))
          )
        );
        setTagihanList(myTagihan);
      }

      // Check wali kelas rapor status
      if (kelasData.success && raporData.success && foundProfile) {
        const myName = foundProfile.nama.toLowerCase().trim();
        const myKelas = kelasData.data.find((k: any) => 
          k.waliKelas && k.waliKelas.toLowerCase().trim() === myName
        );
        if (myKelas) {
          const rekapKelas = raporData.rekap?.find((r: any) => r.kelas === myKelas.rombel);
          if (rekapKelas && rekapKelas.missing > 0) {
            setRaporInfo({
              kelas: myKelas.rombel,
              missing: rekapKelas.missing,
              total: rekapKelas.total
            });
          }
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <i className={`fas fa-circle-notch ${styles.spinner}`}></i>
        <p>Menyiapkan Dashboard Anda...</p>
      </div>
    );
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
            <img src={profile.foto} alt="Profile" className={styles.photo} />
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
              <p style={{ margin: '0 0 12px 0', color: '#b91c1c', fontSize: '0.95rem' }}>Anda ditugaskan atau menjadi PJ pada <strong>{tagihanList.length} surat</strong> yang arsip PDF-nya belum diunggah.</p>
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
