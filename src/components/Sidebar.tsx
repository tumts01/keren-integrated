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
    { name: 'Presensi', path: '/presensi', icon: 'fa-calendar-check' },
    { name: 'Persuratan', path: '/persuratan', icon: 'fa-envelope-open-text' },
    { name: 'Data Prestasi', path: '/prestasi', icon: 'fa-trophy' },
    { name: 'Nota Bon', path: '/bon', icon: 'fa-file-invoice-dollar' }, // Tetap disimpan karena sudah kita buat
  ];

  return (
    <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
      <div className={styles.brand}>
        <img src="/logo.png" alt="Logo" className={styles.brandLogo} />
        {!isCollapsed && <span>KEREN</span>}
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
