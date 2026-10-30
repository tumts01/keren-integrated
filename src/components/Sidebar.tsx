'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Sidebar.module.css';

type SubMenuItem = {
  name: string;
  path: string;
  subItems?: { name: string; path: string }[];
};

type MenuItem = {
  name: string;
  path: string;
  icon: string;
  subItems?: SubMenuItem[];
};

type MenuCategory = {
  title: string;
  items: MenuItem[];
};

export default function Sidebar() {
  const pathname = usePathname();
  const [isPinnedCollapsed, setIsPinnedCollapsed] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const isDesktop = !isMobile;
  const isCollapsed = isPinnedCollapsed && !(isHovered && isDesktop);
  const [userRole, setUserRole] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [hasNewPengumuman, setHasNewPengumuman] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Automatically scroll the active menu item into view
    if (menuRef.current) {
      const activeItem = menuRef.current.querySelector(`.${styles.active}`);
      if (activeItem) {
        activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }

    const checkPengumuman = async () => {
      try {
        const res = await fetch('/api/pengumuman');
        const data = await res.json();
        if (data.success) {
          const lastCount = localStorage.getItem('keren_last_pengumuman_count') || '0';
          if (data.total > parseInt(lastCount)) {
            setHasNewPengumuman(true);
          } else {
            setHasNewPengumuman(false);
          }
        }
      } catch(e) {}
    };
    checkPengumuman();
  }, [pathname]);

  const isAdmin = userRole.toLowerCase() === 'admin' || userRole.toLowerCase() === 'pimpinan';
  const isIzzatul = userName.toLowerCase().includes('izzatul ulfa');
  const showKeuangan = isAdmin || isIzzatul;

  const menuCategories: MenuCategory[] = [
    {
      title: 'Utama',
      items: [
        { name: 'Dashboard', path: '/', icon: 'fa-chart-pie' },
        { name: 'Pengumuman', path: '/pengumuman', icon: 'fa-bullhorn' },
        { name: 'Absensi GTK', path: '/absensi-gtk', icon: 'fa-user-check' },
        ...(isAdmin ? [
          { name: 'User Login Guru', path: '/user-guru', icon: 'fa-user-lock' }
        ] : []),
      ]
    },
    {
      title: 'Akademik & KBM',
      items: [
        { name: 'Data Guru & Staf', path: '/guru', icon: 'fa-chalkboard-teacher' },
        { name: 'Data Siswa', path: '/siswa', icon: 'fa-users' },
        { 
          name: 'Buku Induk', 
          path: '/buku-induk-parent', 
          icon: 'fa-book-open',
          subItems: [
            { name: 'Cetak Buku Induk', path: '/buku-induk' },
            { name: 'Verifikasi Data Ortu', path: '/buku-induk/verifikasi' },
            { name: 'DKN (Daftar Kumpulan Nilai)', path: '/buku-induk/dkn' },
            { name: 'Upload Legger', path: '/buku-induk/upload' },
            { name: 'Upload Ekstra', path: '/buku-induk/ekstrakurikuler' }
          ]
        },
        { name: 'Data Kelas', path: '/kelas', icon: 'fa-chalkboard' },
        { name: 'Presensi & Jurnal', path: '/presensi', icon: 'fa-calendar-check' },
        { name: 'Presensi Gerbang', path: '/presensi-gate', icon: 'fa-id-card' },
        { 
          name: 'Dispo Siswa', 
          path: '/dispo-parent', 
          icon: 'fa-user-clock',
          subItems: [
            { name: 'Keterlambatan', path: '/dispo' },
            { name: 'Apresiasi & Pelanggaran', path: '/dispo/poin' }
          ]
        },
        ...(isAdmin ? [
          { name: 'Jadwal Mengajar', path: '/jadwal-mengajar', icon: 'fa-clock' },
        ] : []),
        { name: 'Pengembalian Rapor', path: '/pengembalian-rapor', icon: 'fa-file-signature' },
        { name: 'Kendaraan Siswa', path: '/kendaraan-siswa', icon: 'fa-motorcycle' },
        { name: 'EMIS', path: '/emis', icon: 'fa-database' },
        { 
          name: 'Perangkat Ujian', 
          path: '/perangkat-ujian-parent', 
          icon: 'fa-file-alt',
          subItems: [
            { name: 'Mapping Foto', path: '/perangkat-ujian/mapping-foto' },
            { name: 'Sekretaris', path: '/perangkat-ujian' },
            { name: 'Bendahara', path: '/perangkat-ujian/bendahara' },
            { name: 'Susulan', path: '/perangkat-ujian/susulan' },
            { name: 'STS', path: '/perangkat-ujian/sts' },
            { name: 'Nilai Program Khusus', path: '/nilai-siswa' }
          ]
        },
      ]
    },
    {
      title: 'Administrasi',
      items: [
        { name: 'Persuratan', path: '/persuratan', icon: 'fa-envelope-open-text' },
        { name: 'Loker Digital', path: '/loker-digital', icon: 'fa-folder-open' },
        { 
          name: 'SPMB', 
          path: '/spmb-parent', 
          icon: 'fa-user-graduate',
          subItems: [
            { name: 'Pendaftaran', path: '/spmb' },
            { name: 'Rekap Data Siswa', path: '/spmb/rekap' },
            { name: 'Pemantauan Input', path: '/spmb/pemantauan' },
            { name: 'Pemetaan Kelas', path: '/spmb/pemetaan-kelas' }
          ]
        },
        ...(isAdmin ? [
          { name: 'Buku Tamu', path: '/buku-tamu', icon: 'fa-address-book' },
        ] : []),
        { name: 'Data Prestasi', path: '/prestasi', icon: 'fa-trophy' },
        { name: 'Arsip Foto', path: '/arsip-foto', icon: 'fa-images' },
        { name: 'Sajian Data', path: '/sajian-data', icon: 'fa-chart-pie' },
        { 
          name: 'Jurnal & LPJ Kegiatan', 
          path: '/jurnal-kegiatan-parent', 
          icon: 'fa-book-open',
          subItems: [
            { name: 'Jurnal Kegiatan', path: '/jurnal-kegiatan' },
            { name: 'Laporan Diklat', path: '/laporan-diklat' }
          ]
        },
        { name: 'Survey Madrasah', path: '/survey-madrasah', icon: 'fa-poll-h' },
        { name: 'Penilaian Diri', path: '/penilaian-diri', icon: 'fa-clipboard-check' },
      ]
    },
    {
      title: 'Event Madrasah',
      items: [
        { name: 'AKSI', path: '/aksi', icon: 'fa-star' },
        { 
          name: 'Olimpiade & Seni', 
          path: '/olimpiade-parent', 
          icon: 'fa-medal',
          subItems: [
            { name: 'Pendaftaran', path: '/olimpiade-seni' },
            { name: 'Rekap Data', path: '/olimpiade-seni/rekap' },
            { name: 'Monitoring CBT & Sesi', path: '/olimpiade-seni/cbt-monitoring' },
            { name: 'Monitoring Pemenang', path: '/olimpiade-seni/monitoring' },
            { name: 'Bank Soal CBT', path: '/olimpiade-seni/admin-soal' }
          ]
        },
      ]
    },
    ...(isAdmin ? [
      {
        title: 'Keuangan',
        items: [
          { name: 'Bendahara', path: '/bendahara', icon: 'fa-wallet' },
          { name: 'Pembayaran', path: '/pembayaran', icon: 'fa-money-bill-wave' },
          { name: 'Nota Bon', path: '/bon', icon: 'fa-file-invoice-dollar' }
        ]
      }
    ] : [])
  ];

  const [openCategories, setOpenCategories] = useState<string[]>(['Utama', 'Akademik & KBM', 'Administrasi', 'Event Madrasah', 'Keuangan']);
  const [openSubmenus, setOpenSubmenus] = useState<string[]>(['SPMB']); // For submenus like SPMB
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const checkViewport = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkViewport();
    window.addEventListener('resize', checkViewport);
    
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

    const storedUser = localStorage.getItem('keren_user_data');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUserRole(parsedUser.role || parsedUser.role || '');
        setUserName(parsedUser.nama || localStorage.getItem('username') || '');
      } catch(e){}
    } else {
      setUserName(localStorage.getItem('username') || '');
    }

    const savedCollapse = localStorage.getItem('sidebar_is_pinned_collapsed');
    if (savedCollapse !== null) {
      // Only apply saved collapse state on desktop, mobile is always collapsed initially
      if (window.innerWidth > 768) {
        setIsPinnedCollapsed(savedCollapse === 'true');
      }
    }

    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  useEffect(() => {
    // If a path matches, ensure its category is open
    const activeCategory = menuCategories.find(cat => 
      cat.items.some(item => 
        item.path === pathname || (item.subItems && item.subItems.some(sub => sub.path === pathname || (sub.subItems && sub.subItems.some(ss => ss.path === pathname))))
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
        if (item.subItems && item.subItems.some(sub => sub.path === pathname || (sub.subItems && sub.subItems.some(ss => ss.path === pathname)))) {
          if (!openSubmenus.includes(item.name)) {
            setOpenSubmenus(prev => {
              const newSubs = [...prev, item.name];
              if (isClient) localStorage.setItem('sidebar_open_submenus', JSON.stringify(newSubs));
              return newSubs;
            });
          }
        }
        
        // Auto open sub-submenu
        item.subItems?.forEach(sub => {
          if (sub.subItems && sub.subItems.some(ss => ss.path === pathname)) {
            if (!openSubmenus.includes(sub.name)) {
              setOpenSubmenus(prev => {
                const newSubs = [...prev, sub.name];
                if (isClient) localStorage.setItem('sidebar_open_submenus', JSON.stringify(newSubs));
                return newSubs;
              });
            }
          }
        });
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
    const newVal = !isPinnedCollapsed;
    setIsPinnedCollapsed(newVal);
    if (isClient && window.innerWidth > 768) {
      localStorage.setItem('sidebar_is_pinned_collapsed', String(newVal));
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      <div 
          className={`${styles.mobileOverlay} ${!isPinnedCollapsed ? styles.show : ''}`} 
          onClick={() => setIsPinnedCollapsed(true)}
        ></div>

      <aside 
        className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}
        onMouseEnter={() => { if (!isMobile) setIsHovered(true); }}
        onMouseLeave={() => { if (!isMobile) setIsHovered(false); }}
      >
        <button 
          className={styles.toggleBtnTop} 
          onClick={handleToggleSidebar}
          title={
            isMobile
              ? (isPinnedCollapsed ? "Buka Menu" : "Tutup Menu")
              : (isPinnedCollapsed ? "Kunci Sidebar Terbuka" : "Sembunyikan Sidebar")
          }
          aria-label="Toggle Menu"
        >
          <i className={`fas ${
            isMobile
              ? (isPinnedCollapsed ? 'fa-bars' : 'fa-times')
              : (isPinnedCollapsed ? 'fa-thumbtack' : 'fa-chevron-left')
          }`}></i>
        </button>

        <div className={styles.brand}>
          <img src="/logo.png" alt="Logo" className={styles.brandLogo} />
          {!isCollapsed && (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', whiteSpace: 'normal', paddingRight: isMobile ? '36px' : '4px', flex: 1 }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#FBBF24', lineHeight: '1.2', letterSpacing: '0.3px', marginBottom: '2px' }}>Sistem Informasi Administrasi Digital</span>
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
                  title={isOpen ? `Lipat kategori ${cat.title}` : `Buka kategori ${cat.title}`}
                >
                  <span>{cat.title}</span>
                  <i className={`fas fa-chevron-down ${styles.categoryChevron} ${isOpen ? styles.categoryChevronOpen : ''}`}></i>
                </div>
              ) : (
                <div className={styles.categorySeparator}></div>
              )}
              
              {/* Show items if sidebar is collapsed (icon mode on desktop) OR category is open */}
              <div className={`${styles.categoryItems} ${(isCollapsed || isOpen) ? styles.open : ''}`}>
                {cat.items.map((item) => {
                  const hasSub = !!item.subItems;
                  const isSubOpen = openSubmenus.includes(item.name);
                  const isParentActive = pathname === item.path || (hasSub && item.subItems!.some(sub => pathname === sub.path || (sub.subItems && sub.subItems.some(ss => pathname === ss.path))));
                  
                  return (
                    <div key={item.path} className={styles.menuItemWrapper}>
                      <Link 
                        href={hasSub ? '#' : item.path}
                        className={`${styles.menuItem} ${isParentActive && !hasSub ? styles.active : ''} ${isParentActive && hasSub ? styles.parentActive : ''} ${hasSub ? styles.hasSubmenu : ''}`}
                        title={isCollapsed ? item.name : ''}
                        onClick={(e) => {
                          if (hasSub) {
                            toggleSubmenu(item.name, e);
                          } else {
                            if (window.innerWidth <= 768) setIsPinnedCollapsed(true);
                          }
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <i className={`fas ${item.icon} ${styles.menuIcon}`}></i>
                            {item.name === 'Pengumuman' && hasNewPengumuman && (
                              <span style={{
                                position: 'absolute', top: '-4px', right: '-4px', 
                                width: '10px', height: '10px', backgroundColor: '#ef4444', 
                                borderRadius: '50%', border: '2px solid white'
                              }}></span>
                            )}
                          </div>
                          {!isCollapsed && <span className={styles.menuText}>{item.name}</span>}
                        </div>
                        {!isCollapsed && hasSub && (
                          <i className={`fas fa-chevron-${isSubOpen ? 'up' : 'down'}`} style={{ fontSize: '0.68rem', opacity: 0.75, marginLeft: '8px', flexShrink: 0 }}></i>
                        )}
                      </Link>
                      
                      {/* Submenu rendering */}
                      {!isCollapsed && hasSub && (
                          <div className={`${styles.submenuContainer} ${isSubOpen ? styles.submenuOpen : ''}`} style={{
                            maxHeight: isSubOpen ? '400px' : '0',
                            overflow: 'hidden',
                            transition: 'max-height 0.3s ease',
                            paddingLeft: '32px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            marginTop: isSubOpen ? '4px' : '0'
                          }}>
                            {item.subItems!.map(sub => {
                              const hasSubSub = !!sub.subItems;
                              const isSubSubOpen = openSubmenus.includes(sub.name);
                              const isSubActive = pathname === sub.path || (hasSubSub && sub.subItems!.some(ss => pathname === ss.path));
                              
                              return (
                                <div key={sub.path || sub.name} style={{ display: 'flex', flexDirection: 'column' }}>
                                  <Link 
                                    href={hasSubSub ? '#' : sub.path}
                                    className={styles.subMenuItem}
                                    onClick={(e) => {
                                      if (hasSubSub) {
                                        toggleSubmenu(sub.name, e);
                                      } else {
                                        if (window.innerWidth <= 768) setIsPinnedCollapsed(true);
                                      }
                                    }}
                                    style={{
                                      fontSize: '0.84rem',
                                      padding: '8px 12px',
                                      borderRadius: '8px',
                                      color: isSubActive ? '#065F46' : 'rgba(255, 255, 255, 0.75)',
                                      backgroundColor: isSubActive ? '#ECFDF5' : 'transparent',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      textDecoration: 'none',
                                      fontWeight: isSubActive ? 700 : 500
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <i className={`fas ${isSubActive ? 'fa-dot-circle' : 'fa-circle'}`} style={{ fontSize: '0.4rem', color: isSubActive ? '#059669' : 'currentColor' }}></i>
                                      {sub.name}
                                    </div>
                                    {hasSubSub && (
                                      <i className={`fas fa-chevron-${isSubSubOpen ? 'up' : 'down'}`} style={{ fontSize: '0.7rem' }}></i>
                                    )}
                                  </Link>
                                  
                                  {/* Sub-submenus */}
                                  {hasSubSub && (
                                    <div style={{
                                      maxHeight: isSubSubOpen ? '200px' : '0',
                                      overflow: 'hidden',
                                      transition: 'max-height 0.3s ease',
                                      paddingLeft: '24px',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '4px',
                                      marginTop: isSubSubOpen ? '4px' : '0'
                                    }}>
                                      {sub.subItems!.map(ss => {
                                        const isSsActive = pathname === ss.path;
                                        return (
                                          <Link 
                                            key={ss.path} 
                                            href={ss.path}
                                            onClick={() => {
                                              if (window.innerWidth <= 768) setIsPinnedCollapsed(true);
                                            }}
                                            style={{
                                              fontSize: '0.8rem',
                                              padding: '6px 12px',
                                              borderRadius: '6px',
                                              color: isSsActive ? '#065F46' : 'rgba(255, 255, 255, 0.75)',
                                              backgroundColor: isSsActive ? '#ECFDF5' : 'transparent',
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '8px',
                                              textDecoration: 'none',
                                              fontWeight: isSsActive ? 700 : 500,
                                              marginRight: '12px'
                                            }}
                                          >
                                            <i className={`fas ${isSsActive ? 'fa-dot-circle' : 'fa-circle'}`} style={{ fontSize: '0.3rem', color: isSsActive ? '#059669' : 'currentColor' }}></i>
                                            {ss.name}
                                          </Link>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
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

      {/* Panduan - pinned to bottom */}
      <div style={{ padding: '8px 12px 16px', borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 'auto' }}>
        <Link
          href="/panduan"
          className={`${styles.menuItem} ${pathname === '/panduan' ? styles.active : ''}`}
          title={isCollapsed ? 'Panduan' : ''}
          onClick={() => { if (window.innerWidth <= 768) setIsPinnedCollapsed(true); }}
          style={{ borderRadius: 8 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <i className={`fas fa-book-open ${styles.menuIcon}`}></i>
            {!isCollapsed && <span className={styles.menuText}>Panduan</span>}
          </div>
        </Link>
      </div>

    </aside>

    {/* Mobile Bottom Navigation Bar */}
    <nav className={styles.mobileBottomNav} aria-label="Navigasi Cepat Mobile">
      <Link
        href="/"
        className={`${styles.bottomNavItem} ${pathname === '/' && isPinnedCollapsed ? styles.bottomNavItemActive : ''}`}
        onClick={() => setIsPinnedCollapsed(true)}
      >
        <i className="fas fa-home"></i>
        <span>Beranda</span>
      </Link>
      <Link
        href="/presensi"
        className={`${styles.bottomNavItem} ${pathname === '/presensi' && isPinnedCollapsed ? styles.bottomNavItemActive : ''}`}
        onClick={() => setIsPinnedCollapsed(true)}
      >
        <i className="fas fa-calendar-check"></i>
        <span>Presensi</span>
      </Link>
      <Link
        href="/absensi-gtk"
        className={`${styles.bottomNavItem} ${pathname === '/absensi-gtk' && isPinnedCollapsed ? styles.bottomNavItemActive : ''}`}
        onClick={() => setIsPinnedCollapsed(true)}
      >
        <i className="fas fa-user-check"></i>
        <span>Absensi GTK</span>
      </Link>
      <Link
        href="/pengumuman"
        className={`${styles.bottomNavItem} ${pathname === '/pengumuman' && isPinnedCollapsed ? styles.bottomNavItemActive : ''}`}
        onClick={() => setIsPinnedCollapsed(true)}
      >
        <i className="fas fa-bullhorn"></i>
        {hasNewPengumuman && <span className={styles.bottomNavBadge}></span>}
        <span>Info</span>
      </Link>
      <button
        type="button"
        className={`${styles.bottomNavItem} ${!isPinnedCollapsed ? styles.bottomNavItemActive : ''}`}
        onClick={() => setIsPinnedCollapsed(prev => !prev)}
      >
        <i className={`fas ${!isPinnedCollapsed ? 'fa-times' : 'fa-th-large'}`}></i>
        <span>Menu Lain</span>
      </button>
    </nav>
    </>
  );
}
