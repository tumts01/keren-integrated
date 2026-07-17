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
        { name: 'Absensi GTK', path: '/absensi-gtk', icon: 'fa-user-check' },
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
        { name: 'Loker Digital', path: '/loker-digital', icon: 'fa-folder-open' },
        { name: 'Buku Tamu', path: '/buku-tamu', icon: 'fa-address-book' },
        { 
          name: 'SPMB', 
          path: '/spmb', 
          icon: 'fa-user-graduate',
          subItems: [
            { name: 'Formulir Daftar', path: '/spmb' },
            { name: 'Rekap Pendaftar', path: '/spmb/rekap' }
          ]
        },
        { name: 'Data Prestasi', path: '/prestasi', icon: 'fa-trophy' },
        { name: 'Arsip Foto', path: '/arsip-foto', icon: 'fa-images' },
      ]
    },
    {
      title: 'Keuangan',
      items: [
        { name: 'Bendahara', path: '/bendahara', icon: 'fa-wallet' },
        { name: 'Pembayaran', path: '/pembayaran', icon: 'fa-money-bill-wave' },
        ...(userRole.toLowerCase() === 'admin' || userRole.toLowerCase() === 'pimpinan' 
          ? [{ name: 'Nota Bon', path: '/bon', icon: 'fa-file-invoice-dollar' }]
          : [])
      ]
    }
  ];

  const [openCategories, setOpenCategories] = useState<string[]>(['Utama', 'Akademik & KBM', 'Administrasi', 'Keuangan']);
  const [openSubmenus, setOpenSubmenus] = useState<string[]>(['SPMB']); // For submenus like SPMB
  const [isClient, setIsClient] = useState(false);
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    setIsClient(true);
    
    // Load state from localStorage on mount
    const savedCategories = localStorage.getItem('sidebar_open_categories');
    if (savedCategories) {
      try {
        setOpenCategories(JSON.parse(savedCategories));
      } catch(e){}
    }

    const savedSubmenus = localStorage.getItem('sidebar_open_submenus');
    if (savedSubmenus) {
      try {
        setOpenSubmenus(JSON.parse(savedSubmenus));
      } catch(e){}
    }

    const storedUser = localStorage.getItem('userApp');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUserRole(parsedUser.rule || parsedUser.role || '');
      } catch(e){}
    }

    const savedCollapse = localStorage.getItem('sidebar_is_collapsed');
    if (savedCollapse !== null) {
      // Only apply saved collapse state on desktop, mobile is always collapsed initially
      if (window.innerWidth > 768) {
        setIsCollapsed(savedCollapse === 'true');
      }
    }
  }, []);

  useEffect(() => {
    // If a path matches, ensure its category is open
    const activeCategory = menuCategories.find(cat => 
      cat.items.some(item => 
        item.path === pathname || (item.subItems && item.subItems.some(sub => sub.path === pathname))
      )
    );
    if (activeCategory && !openCategories.includes(activeCategory.title)) {
      setOpenCategories(prev => {
        const newCats = [...prev, activeCategory.title];
        if (isClient) localStorage.setItem('sidebar_open_categories', JSON.stringify(newCats));
        return newCats;
      });
    }

    // Auto open submenu if active
    menuCategories.forEach(cat => {
      cat.items.forEach(item => {
        if (item.subItems && item.subItems.some(sub => sub.path === pathname)) {
          if (!openSubmenus.includes(item.name)) {
            setOpenSubmenus(prev => {
              const newSubs = [...prev, item.name];
              if (isClient) localStorage.setItem('sidebar_open_submenus', JSON.stringify(newSubs));
              return newSubs;
            });
          }
        }
      });
    });
    
    // Automatically scroll the active menu item into view
    if (menuRef.current) {
      const activeItem = menuRef.current.querySelector(`.${styles.active}`);
      if (activeItem) {
        activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [pathname, isClient]);

  const toggleCategory = (title: string) => {
    setOpenCategories(prev => {
      const newCats = prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title];
      if (isClient) localStorage.setItem('sidebar_open_categories', JSON.stringify(newCats));
      return newCats;
    });
  };

  const toggleSubmenu = (name: string, e: React.MouseEvent) => {
    e.preventDefault();
    setOpenSubmenus(prev => {
      const newSubs = prev.includes(name) ? prev.filter(t => t !== name) : [...prev, name];
      if (isClient) localStorage.setItem('sidebar_open_submenus', JSON.stringify(newSubs));
      return newSubs;
    });
  };

  const handleToggleSidebar = () => {
    const newVal = !isCollapsed;
    setIsCollapsed(newVal);
    if (isClient && window.innerWidth > 768) {
      localStorage.setItem('sidebar_is_collapsed', String(newVal));
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={`${styles.mobileOverlay} ${!isCollapsed ? styles.show : ''}`} 
        onClick={() => setIsCollapsed(true)}
      ></div>

      <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
        <button 
          className={styles.toggleBtnTop} 
          onClick={handleToggleSidebar}
          title={isCollapsed ? "Buka Sidebar" : "Sembunyikan Sidebar"}
        >
          <i className={`fas ${isCollapsed ? 'fa-bars' : 'fa-chevron-left'}`}></i>
        </button>

        <div className={styles.brand}>
          <img src="/logo.png" alt="Logo" className={styles.brandLogo} />
          {!isCollapsed && (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', whiteSpace: 'normal', paddingRight: '4px', flex: 1 }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--gold)', lineHeight: '1.2', letterSpacing: '0.3px', marginBottom: '2px' }}>Sistem Informasi Administrasi Digital</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'white', lineHeight: '1.2' }}>MTs Almaarif 01 Singosari</span>
            </div>
          )}
        </div>
      
      <nav className={styles.menu} ref={menuRef}>
        {menuCategories.map((cat, idx) => {
          const isOpen = openCategories.includes(cat.title);
          return (
            <div key={idx} className={styles.categoryGroup}>
              {!isCollapsed ? (
                <div 
                  className={styles.categoryTitle} 
                  onClick={() => toggleCategory(cat.title)}
                >
                  <span>{cat.title}</span>
                  <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'}`} style={{ fontSize: '0.7rem', transition: 'transform 0.2s' }}></i>
                </div>
              ) : (
                <div className={styles.categorySeparator}></div>
              )}
              
              {/* Only show items if sidebar is collapsed OR category is open */}
              <div className={`${styles.categoryItems} ${isOpen || isCollapsed ? styles.open : ''}`}>
                {cat.items.map((item) => {
                  const hasSub = !!item.subItems;
                  const isSubOpen = openSubmenus.includes(item.name);
                  // Item is active if pathname matches its path exactly, or if no subitems. If it has subitems, we rely on subitems to show active state, but maybe highlight parent too
                  const isParentActive = pathname === item.path || (hasSub && item.subItems!.some(sub => pathname === sub.path));
                  
                  return (
                    <div key={item.path} className={styles.menuItemWrapper}>
                      <Link 
                        href={hasSub ? '#' : item.path}
                        className={`${styles.menuItem} ${isParentActive && !hasSub ? styles.active : ''} ${hasSub ? styles.hasSubmenu : ''}`}
                        title={isCollapsed ? item.name : ''}
                        onClick={(e) => {
                          if (hasSub) {
                            toggleSubmenu(item.name, e);
                          } else {
                            if (window.innerWidth <= 768) setIsCollapsed(true);
                          }
                        }}
                      >
                        <div style={{display:'flex', alignItems:'center', gap: '12px'}}>
                          <i className={`fas ${item.icon} ${styles.menuIcon}`}></i>
                          {!isCollapsed && <span className={styles.menuText}>{item.name}</span>}
                        </div>
                        {!isCollapsed && hasSub && (
                          <i className={`fas fa-chevron-${isSubOpen ? 'up' : 'down'}`} style={{ fontSize: '0.7rem', opacity: 0.7 }}></i>
                        )}
                      </Link>
                      
                      {/* Submenu rendering */}
                      {!isCollapsed && hasSub && (
                        <div className={`${styles.submenuContainer} ${isSubOpen ? styles.submenuOpen : ''}`} style={{
                          maxHeight: isSubOpen ? '200px' : '0',
                          overflow: 'hidden',
                          transition: 'max-height 0.3s ease',
                          paddingLeft: '32px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          marginTop: isSubOpen ? '4px' : '0'
                        }}>
                          {item.subItems!.map(sub => {
                            const isSubActive = pathname === sub.path;
                            return (
                              <Link 
                                key={sub.path} 
                                href={sub.path}
                                className={styles.subMenuItem}
                                onClick={() => {
                                  if (window.innerWidth <= 768) setIsCollapsed(true);
                                }}
                                style={{
                                  fontSize: '0.85rem',
                                  padding: '8px 12px',
                                  borderRadius: '8px',
                                  color: isSubActive ? 'var(--primary)' : 'rgba(255, 255, 255, 0.7)',
                                  backgroundColor: isSubActive ? '#f0fdf4' : 'transparent',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  textDecoration: 'none',
                                  fontWeight: isSubActive ? 600 : 500
                                }}
                              >
                                <i className={`fas ${isSubActive ? 'fa-dot-circle' : 'fa-circle'}`} style={{fontSize: '0.4rem'}}></i>
                                {sub.name}
                              </Link>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

    </aside>
    </>
  );
}
