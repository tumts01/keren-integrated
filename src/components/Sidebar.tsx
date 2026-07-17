'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Sidebar.module.css';

export default function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Automatically scroll the active menu item into view
    if (menuRef.current) {
      const activeItem = menuRef.current.querySelector(`.${styles.active}`);
      if (activeItem) {
        activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [pathname]);

  const menuCategories = [
    {
      title: 'Utama',
      items: [
        { name: 'Dashboard', path: '/', icon: 'fa-chart-pie' },
        { name: 'Pengumuman', path: '/pengumuman', icon: 'fa-bullhorn' },
      ]
    },
    {
      title: 'Akademik & KBM',
      items: [
        { name: 'Data Guru & Staf', path: '/guru', icon: 'fa-chalkboard-teacher' },
        { name: 'Data Siswa', path: '/siswa', icon: 'fa-users' },
        { name: 'Data Kelas', path: '/kelas', icon: 'fa-chalkboard' },
        { name: 'Mata Pelajaran', path: '/mata-pelajaran', icon: 'fa-book' },
        { name: 'Jadwal Mengajar', path: '/jadwal-mengajar', icon: 'fa-clock' },
        { name: 'Jurnal Kelas', path: '/jurnal', icon: 'fa-book-open' },
        { name: 'Presensi', path: '/presensi', icon: 'fa-calendar-check' },
        { name: 'Nilai Siswa', path: '/nilai-siswa', icon: 'fa-star' },
        { name: 'Pengembalian Rapor', path: '/pengembalian-rapor', icon: 'fa-file-signature' },
      ]
    },
    {
      title: 'Administrasi',
      items: [
        { name: 'Persuratan', path: '/persuratan', icon: 'fa-envelope-open-text' },
        { name: 'Buku Tamu', path: '/buku-tamu', icon: 'fa-address-book' },
        { name: 'SPMB', path: '/spmb', icon: 'fa-user-graduate' },
        { name: 'Data Prestasi', path: '/prestasi', icon: 'fa-trophy' },
        { name: 'Arsip Foto', path: '/arsip-foto', icon: 'fa-images' },
      ]
    },
    {
      title: 'Keuangan',
      items: [
        { name: 'Bendahara', path: '/bendahara', icon: 'fa-wallet' },
        { name: 'Pembayaran', path: '/pembayaran', icon: 'fa-money-bill-wave' },
        { name: 'Nota Bon', path: '/bon', icon: 'fa-file-invoice-dollar' },
      ]
    }
  ];

  return (
    <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
      <div className={styles.brand}>
        <img src="/logo.png" alt="Logo" className={styles.brandLogo} />
        {!isCollapsed && (
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', whiteSpace: 'normal', paddingRight: '4px', flex: 1 }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--gold)', lineHeight: '1.2', letterSpacing: '0.3px', marginBottom: '2px' }}>Sistem Informasi Administrasi Digital</span>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'white', lineHeight: '1.2' }}>MTs Almaarif 01 Singosari</span>
          </div>
        )}
        <button 
          className={styles.toggleBtnTop} 
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Buka Sidebar" : "Sembunyikan Sidebar"}
        >
          <i className={`fas ${isCollapsed ? 'fa-bars' : 'fa-chevron-left'}`}></i>
        </button>
      </div>
      
      <nav className={styles.menu} ref={menuRef}>
        {menuCategories.map((cat, idx) => (
          <div key={idx} className={styles.categoryGroup}>
            {!isCollapsed && <div className={styles.categoryTitle}>{cat.title}</div>}
            {cat.items.map((item) => {
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
          </div>
        ))}
      </nav>

    </aside>
  );
}
