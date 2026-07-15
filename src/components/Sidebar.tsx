'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Sidebar.module.css';

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: 'fa-chart-pie' },
    { name: 'Data Siswa', path: '/siswa', icon: 'fa-users' },
    { name: 'Nota Bon', path: '/bon', icon: 'fa-file-invoice-dollar' },
    { name: 'Pengaturan', path: '/settings', icon: 'fa-cog' }
  ];

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <i className={`fas fa-school ${styles.brandIcon}`}></i>
        <span>KEREN</span>
      </div>
      <nav className={styles.menu}>
        {navItems.map((item) => (
          <Link 
            key={item.path} 
            href={item.path}
            className={`${styles.menuItem} ${pathname === item.path ? styles.active : ''}`}
          >
            <i className={`fas ${item.icon} ${styles.menuIcon}`}></i>
            {item.name}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
