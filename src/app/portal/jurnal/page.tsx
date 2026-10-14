'use client';
import PortalFooter from '@/components/PortalFooter';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';

export default function PortalJurnal() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentKelas, setStudentKelas] = useState('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMapel, setSelectedMapel] = useState('');
  const [selectedBulan, setSelectedBulan] = useState('');
  const [selectedTanggal, setSelectedTanggal] = useState('');

  useEffect(() => {
    const sessionStr = localStorage.getItem('portal_session');
    if (!sessionStr) {
      router.replace('/portal/login');
      return;
    }
    try {
      const student = JSON.parse(sessionStr);
      setStudentKelas(student.kelas || '');

      fetch(`/api/portal/jurnal?kelas=${encodeURIComponent(student.kelas || '')}`)
        .then(res => res.json())
        .then(resData => {
          if (resData.success) {
            setData(resData.data || []);
          }
        })
        .finally(() => setLoading(false));
    } catch {
      router.replace('/portal/login');
    }
  }, [router]);

  // Extract distinct Mapel list
  const mapelList = useMemo(() => {
    const setM = new Set<string>();
    data.forEach(item => {
      if (item.mapel?.trim()) setM.add(item.mapel.trim());
    });
    return Array.from(setM).sort();
  }, [data]);

  // Extract distinct Bulan list (YYYY-MM)
  const bulanList = useMemo(() => {
    const setB = new Set<string>();
    data.forEach(item => {
      if (item.tanggal) {
        const ym = item.tanggal.substring(0, 7);
        if (ym) setB.add(ym);
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

  // Filtered Data
  const filteredData = useMemo(() => {
    return data.filter(item => {
      if (selectedMapel && item.mapel?.trim() !== selectedMapel) return false;
      if (selectedBulan && !item.tanggal?.startsWith(selectedBulan)) return false;
      if (selectedTanggal && item.tanggal !== selectedTanggal) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const materi = (item.materi || '').toLowerCase();
        const guru = (item.namaGuru || '').toLowerCase();
        const mapel = (item.mapel || '').toLowerCase();
        if (!materi.includes(q) && !guru.includes(q) && !mapel.includes(q)) return false;
      }
      return true;
    });
  }, [data, selectedMapel, selectedBulan, selectedTanggal, searchQuery]);

  const isFiltered = Boolean(selectedMapel || selectedBulan || selectedTanggal || searchQuery.trim());

  const resetFilters = () => {
    setSelectedMapel('');
    setSelectedBulan('');
    setSelectedTanggal('');
    setSearchQuery('');
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
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Jurnal Pembelajaran Kelas</h2>
          {studentKelas && (
            <span style={{ fontSize: '12px', opacity: 0.9 }}>Kelas {studentKelas}</span>
          )}
        </div>
      </div>

      <div className="portal-content" style={{ marginTop: '16px' }}>
        
        {/* Filter Card */}
        <div className="portal-card" style={{ padding: '16px', marginBottom: '16px', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="fas fa-filter" style={{ color: '#0ea5e9' }}></i> Filter Jurnal Kelas
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
                placeholder="Cari materi atau nama guru..."
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

            {/* Filter Dropdowns Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {/* Mapel Dropdown */}
              <div>
                <select
                  value={selectedMapel}
                  onChange={(e) => setSelectedMapel(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    boxSizing: 'border-box',
                    border: selectedMapel ? '1.5px solid #0284c7' : '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '12px',
                    background: selectedMapel ? '#f0f9ff' : '#ffffff',
                    color: selectedMapel ? '#0369a1' : '#334155',
                    fontWeight: selectedMapel ? 700 : 500,
                    outline: 'none'
                  }}
                >
                  <option value="">Semua Mapel ({mapelList.length})</option>
                  {mapelList.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Bulan Dropdown */}
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
            <span>Menampilkan <b>{filteredData.length}</b> dari {data.length} jurnal</span>
            {isFiltered && <span style={{ color: '#0284c7', fontWeight: 600 }}>Filter aktif</span>}
          </div>
        </div>

        {/* Content List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', marginBottom: '12px' }}></i>
            <p style={{ margin: 0, fontSize: '13px' }}>Memuat jurnal pembelajaran...</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <i className="fas fa-book-open" style={{ fontSize: '32px', marginBottom: '12px', color: '#cbd5e1' }}></i>
            <h4 style={{ margin: '0 0 6px 0', color: '#475569', fontSize: '15px' }}>Tidak Ada Data Jurnal</h4>
            <p style={{ margin: '0 0 14px 0', fontSize: '12px' }}>
              {isFiltered ? 'Tidak ada jurnal pembelajaran yang cocok dengan filter yang dipilih.' : 'Belum ada catatan jurnal pembelajaran untuk kelas ini.'}
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
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {filteredData.map((item, idx) => (
              <div 
                key={item.id || idx} 
                className="portal-card" 
                style={{ 
                  padding: '16px', 
                  marginBottom: 0, 
                  borderLeft: '4px solid #0284c7',
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                }}
              >
                {/* Header Item */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px', marginBottom: '10px' }}>
                  <div style={{ flex: 1, paddingRight: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
                      <span style={{ 
                        background: '#e0f2fe', color: '#0369a1', fontSize: '11px', fontWeight: 800, 
                        padding: '2px 8px', borderRadius: '12px', textTransform: 'uppercase' 
                      }}>
                        {item.mapel || 'Mapel'}
                      </span>
                      {item.jamKe && (
                        <span style={{ background: '#f1f5f9', color: '#475569', fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px' }}>
                          Jam Ke: {item.jamKe}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <i className="fas fa-user-tie" style={{ color: '#0284c7', fontSize: '11px' }}></i>
                      <span>{item.namaGuru || 'Guru Pengampu'}</span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>
                      {item.tanggal ? new Date(item.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                    </div>
                    <div style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '2px' }}>
                      {item.tanggal ? new Date(item.tanggal).toLocaleDateString('id-ID', { weekday: 'long' }) : ''}
                    </div>
                  </div>
                </div>

                {/* Body Item: Materi */}
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Materi / Kegiatan Pembelajaran:
                  </div>
                  <div style={{ 
                    fontSize: '13.5px', color: '#1e293b', lineHeight: 1.5, 
                    background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', 
                    border: '1px solid #f1f5f9', whiteSpace: 'pre-wrap' 
                  }}>
                    {item.materi || '-'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
        <PortalFooter />
    </div>
  );
}
