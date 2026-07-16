'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Sidebar.module.css';

export default function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: 'fa-chart-pie' },
    { name: 'Data Guru & Staf', path: '/guru', icon: 'fa-chalkboard-teacher' },
    { name: 'Data Siswa', path: '/siswa', icon: 'fa-users' },
    { name: 'Data Kelas', path: '/kelas', icon: 'fa-chalkboard' },
    { name: 'Mata Pelajaran', path: '/mata-pelajaran', icon: 'fa-book' },
    { name: 'Nilai Siswa', path: '/nilai-siswa', icon: 'fa-star' },
    { name: 'Presensi', path: '/presensi', icon: 'fa-calendar-check' },
    { name: 'Jurnal Kelas', path: '/jurnal', icon: 'fa-book-open' },
    { name: 'Jadwal Mengajar', path: '/jadwal-mengajar', icon: 'fa-clock' },
    { name: 'Pengembalian Rapor', path: '/pengembalian-rapor', icon: 'fa-file-signature' },
    { name: 'Persuratan', path: '/persuratan', icon: 'fa-envelope-open-text' },
    { name: 'Buku Tamu', path: '/buku-tamu', icon: 'fa-address-book' },
    { name: 'SPMB', path: '/spmb', icon: 'fa-user-graduate' },
    { name: 'Data Prestasi', path: '/prestasi', icon: 'fa-trophy' },
    { name: 'Bendahara', path: '/bendahara', icon: 'fa-wallet' },
    { name: 'Pembayaran', path: '/pembayaran', icon: 'fa-money-bill-wave' },
    { name: 'Arsip Foto', path: '/arsip-foto', icon: 'fa-images' },
    { name: 'Nota Bon', path: '/bon', icon: 'fa-file-invoice-dollar' },
    { name: 'Pengumuman', path: '/pengumuman', icon: 'fa-bullhorn' },
  ];

  return (
    <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
      <div className={styles.brand}>
        <img src="/logo.png" alt="Logo" className={styles.brandLogo} />
        {!isCollapsed && (
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', whiteSpace: 'normal', paddingRight: '12px' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--gold)', lineHeight: '1.2', letterSpacing: '0.3px', marginBottom: '2px' }}>Sistem Informasi Administrasi Digital</span>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'white', lineHeight: '1.2' }}>MTs Almaarif 01 Singosari</span>
          </div>
        )}
      </div>
      
      <nav className={styles.menu}>
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <div key={item.path} className={styles.menuItemWrapper}>
              <Link 
                href={item.path}
                className={`${styles.menuItem} ${isActive ? styles.active : ''}`}
                title={isCollapsed ? item.name : ''}
              >
                <i className={`fas ${item.icon} ${styles.menuIcon}`}></i>
                {!isCollapsed && <span className={styles.menuText}>{item.name}</span>}
              </Link>
            </div>
          );
        })}
      </nav>

      <div className={styles.toggleWrapper}>
        <button 
          className={styles.toggleBtn} 
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Buka Sidebar" : "Sembunyikan Sidebar"}
        >
          <i className={`fas ${isCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'}`}></i>
        </button>
      </div>
    </aside>
  );
}
