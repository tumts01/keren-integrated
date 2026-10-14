'use client';
import PortalFooter from '@/components/PortalFooter';
import PortalHeaderBrand from '@/components/PortalHeaderBrand';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';

interface PrestasiItem {
  id: number;
  no: string | number;
  tahun_pelajaran: string;
  tanggal: string;
  nama: string;
  kelas: string;
  nama_lomba: string;
  penyelenggara: string;
  peringkat: string;
  tingkat: string;
  link_sertifikat: string;
  induk: string;
  sertifikat_fisik: string;
  emis: string;
}

export default function PortalPrestasi() {
  const router = useRouter();
  const [data, setData] = useState<PrestasiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentInfo, setStudentInfo] = useState<{ nama: string; kelas: string; nis: string } | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTahun, setSelectedTahun] = useState('Semua');
  const [selectedTingkat, setSelectedTingkat] = useState('Semua');

  useEffect(() => {
    const sessionStr = localStorage.getItem('portal_session');
    if (!sessionStr) {
      router.replace('/portal/login');
      return;
    }

    try {
      const parsed = JSON.parse(sessionStr);
      setStudentInfo({
        nama: parsed.nama || '',
        kelas: parsed.kelas || '',
        nis: parsed.nis || parsed.nisn || ''
      });

      // Fetch student achievements
      const fetchUrl = `/api/portal/prestasi?nis=${encodeURIComponent(parsed.nis || '')}&nama=${encodeURIComponent(parsed.nama || '')}`;
      fetch(fetchUrl)
        .then(res => res.json())
        .then(resData => {
          if (resData.success && Array.isArray(resData.data)) {
            setData(resData.data);
          }
        })
        .catch(err => {
          console.error('Error fetching portal prestasi:', err);
        })
        .finally(() => {
          setLoading(false);
        });

    } catch (e) {
      router.replace('/portal/login');
    }
  }, [router]);

  // Unique options for filter
  const tahunOptions = useMemo(() => {
    const set = new Set<string>();
    data.forEach(item => {
      if (item.tahun_pelajaran) set.add(item.tahun_pelajaran);
    });
    return Array.from(set);
  }, [data]);

  const tingkatOptions = useMemo(() => {
    const set = new Set<string>();
    data.forEach(item => {
      if (item.tingkat) set.add(item.tingkat.toUpperCase());
    });
    return Array.from(set);
  }, [data]);

  // Filtered list
  const filteredList = useMemo(() => {
    return data.filter(item => {
      const matchSearch = 
        (item.nama_lomba || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.penyelenggara || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.peringkat || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchTahun = selectedTahun === 'Semua' || item.tahun_pelajaran === selectedTahun;
      const matchTingkat = selectedTingkat === 'Semua' || (item.tingkat || '').toUpperCase() === selectedTingkat;

      return matchSearch && matchTahun && matchTingkat;
    });
  }, [data, searchQuery, selectedTahun, selectedTingkat]);

  // Rank Badge Formatter & Theme
  const getRankTheme = (peringkat: string) => {
    const p = (peringkat || '').toUpperCase();
    if (p.includes('1') || p.includes(' I ') || p.includes('JUARA I') || p.includes('EMAS') || p.includes('GOLD')) {
      return {
        badgeBg: '#fef3c7',
        badgeColor: '#b45309',
        badgeBorder: '#fde68a',
        icon: 'fa-trophy',
        iconColor: '#f59e0b',
        label: 'Juara 1 / Emas'
      };
    }
    if (p.includes('2') || p.includes(' II') || p.includes('PERAK') || p.includes('SILVER')) {
      return {
        badgeBg: '#f1f5f9',
        badgeColor: '#475569',
        badgeBorder: '#cbd5e1',
        icon: 'fa-medal',
        iconColor: '#94a3b8',
        label: 'Juara 2 / Perak'
      };
    }
    if (p.includes('3') || p.includes(' III') || p.includes('PERUNGGU') || p.includes('BRONZE')) {
      return {
        badgeBg: '#ffedd5',
        badgeColor: '#c2410c',
        badgeBorder: '#fed7aa',
        icon: 'fa-medal',
        iconColor: '#ea580c',
        label: 'Juara 3 / Perunggu'
      };
    }
    return {
      badgeBg: '#e0f2fe',
      badgeColor: '#0369a1',
      badgeBorder: '#bae6fd',
      icon: 'fa-award',
      iconColor: '#0284c7',
      label: 'Kejuaraan'
    };
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="portal-container" style={{ paddingBottom: '40px' }}>
      <PortalHeaderBrand />
      
      {/* Header */}
      <div className="portal-header" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button 
          onClick={() => router.back()} 
          style={{ background: 'none', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer' }}
          title="Kembali"
        >
          <i className="fas fa-arrow-left"></i>
        </button>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Prestasi Siswa</h2>
          {studentInfo && (
            <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '2px' }}>
              {studentInfo.nama} {studentInfo.kelas ? `• Kelas ${studentInfo.kelas}` : ''}
            </div>
          )}
        </div>
      </div>

      <div className="portal-content" style={{ marginTop: '16px' }}>

        {/* Hero Banner Prestasi */}
        <div style={{
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          borderRadius: '16px',
          padding: '18px 20px',
          color: 'white',
          marginBottom: '16px',
          boxShadow: '0 4px 14px rgba(217, 119, 6, 0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            background: 'rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '26px',
            flexShrink: 0
          }}>
            <i className="fas fa-trophy"></i>
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, lineHeight: 1.2 }}>
              Rekam Jejak Prestasi
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', opacity: 0.92, lineHeight: 1.4 }}>
              Daftar capaian lomba, kejuaraan akademik & non-akademik siswa yang tercatat di madrasah.
            </p>
          </div>
        </div>

        {/* Total Summary Pills */}
        {!loading && data.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '10px',
            marginBottom: '16px'
          }}>
            <div className="portal-card" style={{ padding: '14px', margin: 0, textAlign: 'center', background: '#f8fafc' }}>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>{data.length}</div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginTop: '2px' }}>Total Prestasi</div>
            </div>
            <div className="portal-card" style={{ padding: '14px', margin: 0, textAlign: 'center', background: '#fef3c7', border: '1px solid #fde68a' }}>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#b45309' }}>
                <i className="fas fa-star" style={{ color: '#f59e0b', fontSize: '20px', marginRight: '4px' }}></i>
                {data.filter(d => (d.peringkat || '').toUpperCase().includes('1') || (d.peringkat || '').toUpperCase().includes('EMAS')).length}
              </div>
              <div style={{ fontSize: '11px', color: '#92400e', fontWeight: 700, textTransform: 'uppercase', marginTop: '2px' }}>Juara 1 / Emas</div>
            </div>
          </div>
        )}

        {/* Filter Card */}
        {data.length > 1 && (
          <div className="portal-card" style={{ padding: '14px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Search input */}
              <div style={{ position: 'relative' }}>
                <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '13px' }}></i>
                <input
                  type="text"
                  placeholder="Cari lomba atau kejuaraan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 34px',
                    boxSizing: 'border-box',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    background: '#f8fafc',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Dropdown Filters */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {tahunOptions.length > 1 && (
                  <div>
                    <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>Tahun Ajaran:</label>
                    <select
                      value={selectedTahun}
                      onChange={(e) => setSelectedTahun(e.target.value)}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', background: 'white' }}
                    >
                      <option value="Semua">Semua Tahun</option>
                      {tahunOptions.map(th => (
                        <option key={th} value={th}>{th}</option>
                      ))}
                    </select>
                  </div>
                )}
                {tingkatOptions.length > 1 && (
                  <div>
                    <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>Tingkat:</label>
                    <select
                      value={selectedTingkat}
                      onChange={(e) => setSelectedTingkat(e.target.value)}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', background: 'white' }}
                    >
                      <option value="Semua">Semua Tingkat</option>
                      {tingkatOptions.map(tk => (
                        <option key={tk} value={tk}>{tk}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Content State */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px 0', color: '#94a3b8' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', marginBottom: '12px', color: '#f59e0b' }}></i>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Memuat data prestasi...</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="portal-card" style={{ padding: '36px 20px', textAlign: 'center' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#fef3c7',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              margin: '0 auto 16px auto'
            }}>
              <i className="fas fa-award"></i>
            </div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
              {data.length === 0 ? 'Belum Ada Data Prestasi' : 'Tidak Ditemukan'}
            </h3>
            <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b', lineHeight: 1.6 }}>
              {data.length === 0 ? (
                <>
                  Saat ini belum ada data kejuaraan resmi yang tercatat atas nama ananda di database madrasah.<br/>
                  Tetap semangat belajar, berkarya, dan mengukir prestasi bersama <b>MTs Almaarif 01 Singosari</b>!
                </>
              ) : (
                'Tidak ada prestasi yang cocok dengan pencarian atau filter yang dipilih.'
              )}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {filteredList.map((item) => {
              const theme = getRankTheme(item.peringkat);
              return (
                <div 
                  key={item.id} 
                  className="portal-card" 
                  style={{ 
                    padding: '16px', 
                    marginBottom: 0, 
                    borderLeft: `4px solid ${theme.iconColor}`,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                  }}
                >
                  {/* Top Badges: Peringkat & Tingkat */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: theme.badgeBg,
                      color: theme.badgeColor,
                      border: `1px solid ${theme.badgeBorder}`,
                      padding: '4px 10px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 800,
                      letterSpacing: '0.3px'
                    }}>
                      <i className={`fas ${theme.icon}`} style={{ color: theme.iconColor }}></i>
                      <span>{item.peringkat || 'KEJUARAAN'}</span>
                    </div>

                    {item.tingkat && (
                      <span style={{
                        background: '#f1f5f9',
                        color: '#475569',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '10.5px',
                        fontWeight: 700,
                        textTransform: 'uppercase'
                      }}>
                        Tingkat {item.tingkat}
                      </span>
                    )}
                  </div>

                  {/* Nama Lomba */}
                  <h4 style={{ 
                    margin: '0 0 10px 0', 
                    fontSize: '15px', 
                    fontWeight: 800, 
                    color: '#0f172a',
                    lineHeight: 1.4
                  }}>
                    {item.nama_lomba}
                  </h4>

                  {/* Penyelenggara & Tanggal */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#475569', marginBottom: '12px' }}>
                    {item.penyelenggara && (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <i className="fas fa-building" style={{ color: '#94a3b8', marginTop: '2px', width: '14px', textAlign: 'center' }}></i>
                        <span>{item.penyelenggara}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <i className="fas fa-calendar-alt" style={{ color: '#94a3b8', width: '14px', textAlign: 'center' }}></i>
                      <span>
                        {item.tanggal ? formatDate(item.tanggal) : '-'}
                        {item.tahun_pelajaran ? ` • TP ${item.tahun_pelajaran}` : ''}
                      </span>
                    </div>
                  </div>

                  {/* Sertifikat Link */}
                  {item.link_sertifikat && (
                    <div style={{ paddingTop: '10px', borderTop: '1px dashed #e2e8f0' }}>
                      <a 
                        href={item.link_sertifikat} 
                        target="_blank" 
                        rel="noreferrer" 
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          background: '#f0fdf4',
                          color: '#166534',
                          border: '1px solid #bbf7d0',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 700,
                          textDecoration: 'none'
                        }}
                      >
                        <i className="fas fa-file-certificate"></i> Lihat Piagam / Sertifikat
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </div>

      <PortalFooter />
    </div>
  );
}
