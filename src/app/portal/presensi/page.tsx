'use client';
import PortalFooter from '@/components/PortalFooter';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';

interface PresensiItem {
  id: string;
  tanggal: string;
  jamKe?: string;
  status: 'HADIR' | 'SAKIT' | 'IZIN' | 'ALPHA';
  keterangan: string;
  guru?: string;
  mapel?: string;
  kelas?: string;
}

export default function PortalPresensi() {
  const router = useRouter();
  const [data, setData] = useState<PresensiItem[]>([]);
  const [rekap, setRekap] = useState({ hadir: 0, sakit: 0, izin: 0, alpha: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [studentInfo, setStudentInfo] = useState<any>(null);

  // Filters
  const [selectedStatus, setSelectedStatus] = useState<string>('SEMUA'); // 'SEMUA' | 'KETIDAKHADIRAN' | 'HADIR' | 'SAKIT' | 'IZIN' | 'ALPHA'
  const [selectedBulan, setSelectedBulan] = useState<string>(''); // YYYY-MM
  const [selectedTanggal, setSelectedTanggal] = useState<string>(''); // YYYY-MM-DD
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    const sessionStr = localStorage.getItem('portal_session');
    if (!sessionStr) {
      router.replace('/portal/login');
      return;
    }
    try {
      const student = JSON.parse(sessionStr);
      setStudentInfo(student);

      const qs = new URLSearchParams();
      if (student.nisn) qs.set('nisn', student.nisn);
      if (student.nama) qs.set('nama', student.nama);

      fetch(`/api/portal/presensi?${qs.toString()}`)
        .then(res => res.json())
        .then(resData => {
          if (resData.success) {
            setData(resData.data || []);
            setRekap(resData.rekap || { hadir: 0, sakit: 0, izin: 0, alpha: 0, total: 0 });
          }
        })
        .catch(err => console.error('Fetch presensi error:', err))
        .finally(() => setLoading(false));
    } catch {
      router.replace('/portal/login');
    }
  }, [router]);

  // Distinct Bulan List (YYYY-MM)
  const bulanList = useMemo(() => {
    const setB = new Set<string>();
    data.forEach(item => {
      if (item.tanggal) {
        const ym = item.tanggal.substring(0, 7);
        if (ym && ym.length === 7) setB.add(ym);
      }
    });
    return Array.from(setB).sort().reverse();
  }, [data]);

  const formatBulanYear = (ym: string) => {
    try {
      const [year, month] = ym.split('-');
      const d = new Date(parseInt(year), parseInt(month) - 1, 1);
      return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    } catch {
      return ym;
    }
  };

  // Filtered List
  const filteredData = useMemo(() => {
    return data.filter(item => {
      // Filter Status
      if (selectedStatus === 'KETIDAKHADIRAN') {
        if (item.status === 'HADIR') return false;
      } else if (selectedStatus !== 'SEMUA') {
        if (item.status !== selectedStatus) return false;
      }

      // Filter Bulan
      if (selectedBulan && !item.tanggal?.startsWith(selectedBulan)) {
        return false;
      }

      // Filter Tanggal
      if (selectedTanggal && item.tanggal !== selectedTanggal) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mapel = (item.mapel || '').toLowerCase();
        const guru = (item.guru || '').toLowerCase();
        const ket = (item.keterangan || '').toLowerCase();
        if (!mapel.includes(q) && !guru.includes(q) && !ket.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [data, selectedStatus, selectedBulan, selectedTanggal, searchQuery]);

  const isFiltered = Boolean(
    selectedStatus !== 'SEMUA' || 
    selectedBulan || 
    selectedTanggal || 
    searchQuery.trim()
  );

  const resetFilters = () => {
    setSelectedStatus('SEMUA');
    setSelectedBulan('');
    setSelectedTanggal('');
    setSearchQuery('');
  };

  // Helper toggle card click
  const toggleStatusCard = (status: 'HADIR' | 'SAKIT' | 'IZIN' | 'ALPHA') => {
    if (selectedStatus === status) {
      setSelectedStatus('SEMUA');
    } else {
      setSelectedStatus(status);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'HADIR':
        return {
          color: '#059669',
          bg: '#ecfdf5',
          border: '#a7f3d0',
          badgeBg: '#e6fcf5',
          icon: 'fa-check'
        };
      case 'SAKIT':
        return {
          color: '#d97706',
          bg: '#fef3c7',
          border: '#fde68a',
          badgeBg: '#fffbeb',
          icon: 'fa-plus-square'
        };
      case 'IZIN':
        return {
          color: '#2563eb',
          bg: '#dbeafe',
          border: '#bfdbfe',
          badgeBg: '#eff6ff',
          icon: 'fa-envelope-open-text'
        };
      case 'ALPHA':
      default:
        return {
          color: '#dc2626',
          bg: '#fee2e2',
          border: '#fecaca',
          badgeBg: '#fef2f2',
          icon: 'fa-times'
        };
    }
  };

  return (
    <div className="portal-container" style={{ paddingBottom: '40px' }}>
      
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
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Kehadiran Siswa</h2>
          {studentInfo && (
            <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '2px' }}>
              {studentInfo.nama} {studentInfo.kelas ? `• Kelas ${studentInfo.kelas}` : ''}
            </div>
          )}
        </div>
      </div>

      <div className="portal-content" style={{ marginTop: '16px' }}>
        
        {/* Rekap Cards Grid (Interactive Filters) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}>
          
          {/* HADIR CARD */}
          <div 
            onClick={() => toggleStatusCard('HADIR')}
            style={{ 
              background: '#ecfdf5', 
              borderRadius: '12px', 
              padding: '12px 6px', 
              textAlign: 'center', 
              cursor: 'pointer',
              border: selectedStatus === 'HADIR' ? '2px solid #059669' : '1px solid #d1fae5',
              boxShadow: selectedStatus === 'HADIR' ? '0 2px 8px rgba(5, 150, 105, 0.25)' : 'none',
              transform: selectedStatus === 'HADIR' ? 'scale(1.02)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#059669' }}>{rekap.hadir}</div>
            <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#047857', marginTop: '2px' }}>HADIR</div>
          </div>

          {/* SAKIT CARD */}
          <div 
            onClick={() => toggleStatusCard('SAKIT')}
            style={{ 
              background: '#fef3c7', 
              borderRadius: '12px', 
              padding: '12px 6px', 
              textAlign: 'center', 
              cursor: 'pointer',
              border: selectedStatus === 'SAKIT' ? '2px solid #d97706' : '1px solid #fde68a',
              boxShadow: selectedStatus === 'SAKIT' ? '0 2px 8px rgba(217, 119, 6, 0.25)' : 'none',
              transform: selectedStatus === 'SAKIT' ? 'scale(1.02)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#d97706' }}>{rekap.sakit}</div>
            <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#b45309', marginTop: '2px' }}>SAKIT</div>
          </div>

          {/* IZIN CARD */}
          <div 
            onClick={() => toggleStatusCard('IZIN')}
            style={{ 
              background: '#dbeafe', 
              borderRadius: '12px', 
              padding: '12px 6px', 
              textAlign: 'center', 
              cursor: 'pointer',
              border: selectedStatus === 'IZIN' ? '2px solid #2563eb' : '1px solid #bfdbfe',
              boxShadow: selectedStatus === 'IZIN' ? '0 2px 8px rgba(37, 99, 235, 0.25)' : 'none',
              transform: selectedStatus === 'IZIN' ? 'scale(1.02)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#2563eb' }}>{rekap.izin}</div>
            <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#1d4ed8', marginTop: '2px' }}>IZIN</div>
          </div>

          {/* ALPHA CARD */}
          <div 
            onClick={() => toggleStatusCard('ALPHA')}
            style={{ 
              background: '#fee2e2', 
              borderRadius: '12px', 
              padding: '12px 6px', 
              textAlign: 'center', 
              cursor: 'pointer',
              border: selectedStatus === 'ALPHA' ? '2px solid #dc2626' : '1px solid #fecaca',
              boxShadow: selectedStatus === 'ALPHA' ? '0 2px 8px rgba(220, 38, 38, 0.25)' : 'none',
              transform: selectedStatus === 'ALPHA' ? 'scale(1.02)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#dc2626' }}>{rekap.alpha}</div>
            <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#b91c1c', marginTop: '2px' }}>ALPHA</div>
          </div>

        </div>

        {/* Filter Control Card */}
        <div className="portal-card" style={{ padding: '16px', marginBottom: '16px', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="fas fa-filter" style={{ color: '#0ea5e9' }}></i> Filter Presensi
            </span>
            {isFiltered && (
              <button
                type="button"
                onClick={resetFilters}
                style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '11px', fontWeight: 700, cursor: 'pointer', padding: 0 }}
              >
                Reset Filter
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '13px' }}></i>
              <input
                type="text"
                placeholder="Cari mata pelajaran atau nama guru..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 34px',
                  boxSizing: 'border-box',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '13px',
                  background: '#f8fafc',
                  outline: 'none'
                }}
              />
            </div>

            {/* Dropdowns Grid (Status & Bulan) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {/* Status Selector */}
              <div>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    boxSizing: 'border-box',
                    border: selectedStatus !== 'SEMUA' ? '1.5px solid #0284c7' : '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '12px',
                    background: selectedStatus !== 'SEMUA' ? '#f0f9ff' : '#ffffff',
                    color: selectedStatus !== 'SEMUA' ? '#0369a1' : '#334155',
                    fontWeight: selectedStatus !== 'SEMUA' ? 700 : 500,
                    outline: 'none'
                  }}
                >
                  <option value="SEMUA">Semua Status ({data.length})</option>
                  <option value="HADIR">Hadir ({rekap.hadir})</option>
                  <option value="KETIDAKHADIRAN">Ketidakhadiran Saja ({rekap.sakit + rekap.izin + rekap.alpha})</option>
                  <option value="SAKIT">Sakit ({rekap.sakit})</option>
                  <option value="IZIN">Izin ({rekap.izin})</option>
                  <option value="ALPHA">Alpha ({rekap.alpha})</option>
                </select>
              </div>

              {/* Bulan Selector */}
              <div>
                <select
                  value={selectedBulan}
                  onChange={(e) => {
                    setSelectedBulan(e.target.value);
                    if (e.target.value) setSelectedTanggal('');
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    boxSizing: 'border-box',
                    border: selectedBulan ? '1.5px solid #0284c7' : '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '12px',
                    background: selectedBulan ? '#f0f9ff' : '#ffffff',
                    color: selectedBulan ? '#0369a1' : '#334155',
                    fontWeight: selectedBulan ? 700 : 500,
                    outline: 'none'
                  }}
                >
                  <option value="">Semua Periode</option>
                  {bulanList.map(b => (
                    <option key={b} value={b}>{formatBulanYear(b)}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tanggal Spesifik (Optional) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap' }}>Tanggal spesifik:</span>
              <input
                type="date"
                value={selectedTanggal}
                onChange={(e) => {
                  setSelectedTanggal(e.target.value);
                  if (e.target.value) setSelectedBulan('');
                }}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  border: selectedTanggal ? '1.5px solid #0284c7' : '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '12px',
                  background: selectedTanggal ? '#f0f9ff' : '#fff'
                }}
              />
              {selectedTanggal && (
                <button
                  type="button"
                  onClick={() => setSelectedTanggal('')}
                  style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer' }}
                >
                  &times;
                </button>
              )}
            </div>
          </div>

          {/* Result Counter */}
          <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#64748b' }}>
            <span>Menampilkan <b>{filteredData.length}</b> dari {data.length} presensi</span>
            {isFiltered && <span style={{ color: '#0284c7', fontWeight: 600 }}>Filter aktif</span>}
          </div>
        </div>

        {/* Section Header Title */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#1e293b' }}>
            {selectedStatus === 'KETIDAKHADIRAN' 
              ? 'Riwayat Ketidakhadiran' 
              : selectedStatus === 'HADIR'
              ? 'Riwayat Hadir'
              : selectedStatus === 'SAKIT'
              ? 'Riwayat Sakit'
              : selectedStatus === 'IZIN'
              ? 'Riwayat Izin'
              : selectedStatus === 'ALPHA'
              ? 'Riwayat Alpha'
              : 'Riwayat Presensi'}
          </h3>
        </div>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', marginBottom: '12px', color: '#0284c7' }}></i>
            <p style={{ margin: 0, fontSize: '13px' }}>Memuat data kehadiran...</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            {selectedStatus === 'KETIDAKHADIRAN' && rekap.sakit === 0 && rekap.izin === 0 && rekap.alpha === 0 ? (
              <div style={{ color: '#059669' }}>
                <i className="fas fa-check-circle" style={{ fontSize: '36px', marginBottom: '12px', color: '#10b981' }}></i>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', color: '#047857' }}>Alhamdulillah, Kehadiran 100%!</h4>
                <p style={{ margin: 0, fontSize: '12px', color: '#065f46' }}>Tidak ada catatan ketidakhadiran (Sakit, Izin, maupun Alpha).</p>
              </div>
            ) : (
              <div style={{ color: '#94a3b8' }}>
                <i className="fas fa-calendar-times" style={{ fontSize: '32px', marginBottom: '12px', color: '#cbd5e1' }}></i>
                <h4 style={{ margin: '0 0 6px 0', color: '#475569', fontSize: '15px' }}>Tidak Ada Data</h4>
                <p style={{ margin: '0 0 14px 0', fontSize: '12px' }}>
                  {isFiltered ? 'Tidak ada catatan kehadiran yang cocok dengan filter yang dipilih.' : 'Belum ada data presensi yang dicatat.'}
                </p>
                {isFiltered && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    style={{ padding: '8px 16px', background: '#0284c7', color: 'white', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Reset Semua Filter
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredData.map((item, idx) => {
              const st = getStatusStyle(item.status);

              return (
                <div 
                  key={item.id || idx} 
                  className="portal-card" 
                  style={{ 
                    padding: '14px 16px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '14px', 
                    marginBottom: 0,
                    borderRadius: '12px',
                    borderLeft: `4px solid ${st.color}`,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                  }}
                >
                  {/* Status Circle Avatar */}
                  <div style={{ 
                    width: '38px', 
                    height: '38px', 
                    borderRadius: '50%', 
                    background: st.bg, 
                    color: st.color, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontWeight: 800,
                    fontSize: '14px',
                    flexShrink: 0,
                    border: `1.5px solid ${st.border}`
                  }}>
                    {item.status.charAt(0)}
                  </div>

                  {/* Info Column */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '2px' }}>
                      <h4 style={{ margin: 0, fontSize: '13.5px', fontWeight: 700, color: '#1e293b' }}>
                        {item.tanggal ? new Date(item.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                      </h4>
                      {item.jamKe && (
                        <span style={{ fontSize: '10px', background: '#f1f5f9', color: '#475569', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                          Jam {item.jamKe}
                        </span>
                      )}
                    </div>
                    
                    <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span>{item.mapel || 'Presensi Umum'}</span>
                      {item.guru && (
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>• {item.guru}</span>
                      )}
                    </div>
                  </div>

                  {/* Status Pill Badge */}
                  <div style={{ 
                    fontSize: '11px', 
                    fontWeight: 800, 
                    color: st.color,
                    background: st.bg,
                    padding: '4px 10px',
                    borderRadius: '12px',
                    border: `1px solid ${st.border}`,
                    whiteSpace: 'nowrap'
                  }}>
                    {item.keterangan}
                  </div>
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
