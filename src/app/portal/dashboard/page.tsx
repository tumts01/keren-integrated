'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';

export default function PortalDashboard() {
  const router = useRouter();
  const [student, setStudent] = useState<any>(null);

  useEffect(() => {
    const sessionStr = localStorage.getItem('portal_session');
    if (!sessionStr) {
      router.replace('/portal/login');
      return;
    }
    
    try {
      setStudent(JSON.parse(sessionStr));
    } catch {
      localStorage.removeItem('portal_session');
      router.replace('/portal/login');
    }
  }, [router]);

  const handleLogout = () => {
    Swal.fire({
      title: 'Keluar?',
      text: 'Anda akan keluar dari Portal Wali Murid',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonText: 'Batal',
      confirmButtonText: 'Ya, Keluar'
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem('portal_session');
        router.replace('/portal/login');
      }
    });
  };

  if (!student) return null;

  const menus = [
    { title: 'Presensi', icon: 'fa-calendar-check', color: '#10b981', path: '/portal/presensi' },
    { title: 'Jurnal Kelas', icon: 'fa-book-open', color: '#f59e0b', path: '/portal/jurnal' },
    { title: 'Nilai & Rapor', icon: 'fa-file-alt', color: '#3b82f6', path: '/portal/nilai' },
    { title: 'Pengumuman', icon: 'fa-bullhorn', color: '#8b5cf6', path: '/portal/pengumuman' }
  ];

  return (
    <div className="portal-container" style={{ paddingBottom: '80px' }}>
      
      {/* Header Profile */}
      <div className="portal-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: '18px', margin: '0 0 4px 0', fontWeight: 700 }}>
              Halo, Wali dari
            </h2>
            <h1 style={{ fontSize: '24px', margin: 0, fontWeight: 800 }}>
              {student.nama.split(' ')[0]}
            </h1>
          </div>
          <button onClick={handleLogout} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer' }}>
            <i className="fas fa-sign-out-alt"></i>
          </button>
        </div>
      </div>

      <div className="portal-content" style={{ marginTop: '-20px' }}>
        
        {/* Student Card Info */}
        <div className="portal-card" style={{ position: 'relative', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', color: '#94a3b8' }}>
              <i className="fas fa-user-graduate"></i>
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: '#1e293b' }}>{student.nama}</h3>
              <div style={{ display: 'flex', gap: '12px', fontSize: '13px', color: '#64748b' }}>
                <span><i className="fas fa-id-card" style={{ marginRight: '4px' }}></i> {student.nisn}</span>
                <span><i className="fas fa-chalkboard" style={{ marginRight: '4px' }}></i> Kls {student.kelas}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div style={{ background: '#eff6ff', borderRadius: '12px', padding: '16px', marginBottom: '24px', border: '1px solid #bfdbfe' }}>
          <p style={{ margin: 0, fontSize: '13px', color: '#1e40af', lineHeight: 1.5 }}>
            <i className="fas fa-info-circle" style={{ marginRight: '6px' }}></i>
            Selamat datang di Portal Wali Murid. Anda dapat memantau kehadiran dan kegiatan belajar anak Anda di sini.
          </p>
        </div>

        <h3 style={{ fontSize: '16px', margin: '0 0 16px 0', color: '#334155' }}>Menu Utama</h3>

        {/* Menu Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {menus.map((menu, idx) => (
            <div 
              key={idx} 
              onClick={() => Swal.fire('Segera Hadir', 'Fitur ini sedang dalam tahap pengembangan.', 'info')} // Temporary
              style={{ 
                background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', 
                padding: '20px 16px', textAlign: 'center', cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
              }}
            >
              <div style={{ 
                width: '48px', height: '48px', borderRadius: '12px', 
                background: `${menu.color}20`, color: menu.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                fontSize: '20px', margin: '0 auto 12px auto' 
              }}>
                <i className={`fas ${menu.icon}`}></i>
              </div>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>{menu.title}</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
