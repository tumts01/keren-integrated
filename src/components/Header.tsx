'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './Header.module.css';

interface HeaderProps {
  user: {
    nama: string;
    username: string;
    foto: string;
    rule: string;
  };
  onLogout: () => void;
}

const MENU_ITEMS = [
  { name: 'Dashboard', path: '/', icon: 'fa-chart-pie' },
  { name: 'Pengumuman', path: '/pengumuman', icon: 'fa-bullhorn' },
  { name: 'Absensi GTK', path: '/absensi-gtk', icon: 'fa-user-check' },
  { name: 'Data Guru & Staf', path: '/guru', icon: 'fa-chalkboard-teacher' },
  { name: 'Data Siswa', path: '/siswa', icon: 'fa-users' },
  { name: 'Data Kelas', path: '/kelas', icon: 'fa-chalkboard' },
  { name: 'Presensi Siswa', path: '/presensi', icon: 'fa-calendar-check' },
  { name: 'Mata Pelajaran', path: '/mata-pelajaran', icon: 'fa-book' },
  { name: 'Jadwal Mengajar', path: '/jadwal-mengajar', icon: 'fa-clock' },
  { name: 'Jurnal Kelas', path: '/jurnal', icon: 'fa-book-open' },
  { name: 'Nilai Siswa', path: '/nilai-siswa', icon: 'fa-star' },
  { name: 'Pengembalian Rapor', path: '/pengembalian-rapor', icon: 'fa-file-signature' },
  { name: 'Persuratan', path: '/persuratan', icon: 'fa-envelope-open-text' },
  { name: 'Loker Digital', path: '/loker-digital', icon: 'fa-folder-open' },
  { name: 'Buku Tamu', path: '/buku-tamu', icon: 'fa-address-book' },
  { name: 'SPMB', path: '/spmb', icon: 'fa-user-graduate' },
  { name: 'Data Prestasi', path: '/prestasi', icon: 'fa-trophy' },
  { name: 'Arsip Foto', path: '/arsip-foto', icon: 'fa-images' },
  { name: 'Bendahara', path: '/bendahara', icon: 'fa-wallet' },
  { name: 'Pembayaran', path: '/pembayaran', icon: 'fa-money-bill-wave' },
  { name: 'Nota Bon', path: '/bon', icon: 'fa-file-invoice-dollar' }
];

export default function Header({ user, onLogout }: HeaderProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredMenus = MENU_ITEMS.filter(menu => 
    menu.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleMenuClick = () => {
    setShowResults(false);
    setSearchQuery('');
  };

  // Use first letter of Name (or Username) if no photo
  const initial = user?.nama ? user.nama.charAt(0).toUpperCase() : (user?.username ? user.username.charAt(0).toUpperCase() : 'U');
  
  // Helper to convert Google Drive /view links to raw image links
  const getImageUrl = (url: string) => {
    if (!url) return '';
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (url.includes('drive.google.com') && match && match[1]) {
      // Menggunakan lh3.googleusercontent.com yang lebih stabil untuk gambar publik
      return `https://lh3.googleusercontent.com/d/${match[1]}=w200-h200`;
    }
    return url;
  };

  const [imageError, setImageError] = useState(false);
  const fotoUrl = user?.foto && !imageError ? getImageUrl(user.foto) : '';
  
  return (
    <header className={styles.header}>
      <div className={styles.searchContainer} ref={searchRef}>
        <i className={`fas fa-search ${styles.searchIcon}`}></i>
        <input 
          type="text" 
          placeholder="Cari menu... (Cth: Presensi, SPMB)" 
          className={styles.searchInput}
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
        />
        {showResults && searchQuery && (
          <div className={styles.searchResults}>
            {filteredMenus.length > 0 ? (
              filteredMenus.map((menu, index) => (
                <Link href={menu.path} key={index} className={styles.searchResultItem} onClick={handleMenuClick}>
                  <div className={styles.searchResultIcon}>
                    <i className={`fas ${menu.icon}`}></i>
                  </div>
                  <div>{menu.name}</div>
                </Link>
              ))
            ) : (
              <div className={styles.noResults}>Menu tidak ditemukan</div>
            )}
          </div>
        )}
      </div>

      <div className={styles.actions}>
        <button className={styles.iconBtn}>
          <i className="far fa-bell"></i>
        </button>
        <div className={styles.profile}>
          {fotoUrl ? (
            <img 
              src={fotoUrl} 
              alt="Profile" 
              className={styles.avatar} 
              style={{ objectFit: 'cover' }} 
              onError={() => setImageError(true)}
            />
          ) : (
            <div className={styles.avatar}>{initial}</div>
          )}
          <div className={styles.userInfo}>
            <span className={styles.userName}>{user?.nama || user?.username}</span>
            <span className={styles.userRole}>{user?.rule || 'Staf'}</span>
          </div>
        </div>
        <button onClick={onLogout} className={styles.iconBtn} title="Keluar">
          <i className="fas fa-sign-out-alt"></i>
        </button>
      </div>
    </header>
  );
}
