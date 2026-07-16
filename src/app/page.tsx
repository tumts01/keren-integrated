'use client';
import { useState, useEffect } from 'react';
import styles from "./page.module.css";
import Link from 'next/link';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
      const res = await fetch('/api/guru');
      const data = await res.json();
      if (data.success) {
        const found = data.data.find((g: any) => g.nama.toLowerCase().trim() === nama.toLowerCase().trim());
        setProfile(found);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
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
          <h1 className={styles.welcomeTitle}>Halo, {profile.nama.split(' ')[0]}! 👋</h1>
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
