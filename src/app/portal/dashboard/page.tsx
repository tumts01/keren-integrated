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
        
        {/* Student Card Info - Detail Siswa Layout */}
        <div className="portal-card" style={{ position: 'relative', zIndex: 10, padding: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Foto Top Section */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ 
                width: '120px', height: '120px', borderRadius: '12px', background: '#e2e8f0', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', color: '#94a3b8',
                overflow: 'hidden', border: '4px solid white', boxShadow: '0 4px 10px rgba(0,0,0,0.05)'
              }}>
                {student.foto ? (
                  <img src={student.foto} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <i className="fas fa-user-graduate"></i>
                )}
              </div>
            </div>

            {/* Grid Detail Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>Nama Lengkap</span>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>{student.nama || '-'}</div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>NISN</span>
                  <div style={{ fontSize: '14px', color: '#334155', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>{student.nisn || '-'}</div>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>Rombel / Kelas</span>
                  <div style={{ fontSize: '14px', color: '#334155', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>{student.kelas || '-'}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>Status</span>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#16a34a', background: '#dcfce7', padding: '8px 12px', borderRadius: '8px', border: '1px solid #bbf7d0', textAlign: 'center' }}>{student.status || 'AKTIF'}</div>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>Jenis Kelamin</span>
                  <div style={{ fontSize: '14px', color: '#334155', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>{student.jenisKelamin || '-'}</div>
                </div>
              </div>

              {student.noHp && (
                <div>
                  <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>No. HP / WA (Ortu)</span>
                  <div style={{ fontSize: '14px', color: '#334155', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}><i className="fab fa-whatsapp" style={{ color: '#22c55e', marginRight: '6px' }}></i> {student.noHp}</div>
                </div>
              )}

              <div>
                <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>Nama Orang Tua</span>
                <div style={{ fontSize: '13px', color: '#334155', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', lineHeight: 1.6 }}>
                  Ayah: {student.namaAyah || '-'}<br/>Ibu: {student.namaIbu || '-'}
                </div>
              </div>

              <div>
                <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>Domisili & Alamat</span>
                <div style={{ fontSize: '13px', color: '#334155', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', lineHeight: 1.5 }}>
                  <strong>{student.domisili || '-'}</strong> - {student.alamat || '-'}
                </div>
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
              onClick={() => router.push(menu.path)}
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
