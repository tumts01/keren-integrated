'use client';
import PortalFooter from '@/components/PortalFooter';
import PortalHeaderBrand from '@/components/PortalHeaderBrand';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';

export default function PortalPengumuman() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');

  useEffect(() => {
    const sessionStr = localStorage.getItem('portal_session');
    if (!sessionStr) {
      router.replace('/portal/login');
      return;
    }

    fetch(`/api/pengumuman?portal=true`)
      .then(res => res.json())
      .then(resData => {
        if (resData.success) {
          setData(resData.data || []);
        }
      })
      .catch(err => console.error('Fetch pengumuman error:', err))
      .finally(() => setLoading(false));
  }, [router]);

  const getDriveUrl = (url: string) => {
    if (!url) return '';
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    return match ? `https://drive.google.com/thumbnail?id=${match[1]}&sz=w600` : '';
  };

  // Filtered announcements
  const filteredData = useMemo(() => {
    if (!activeSearch.trim()) return data;
    const q = activeSearch.toLowerCase().trim();
    return data.filter(item => {
      const pesan = (item.pesan || item.isi || '').toLowerCase();
      const tgl = (item.tanggal || '').toLowerCase();
      return pesan.includes(q) || tgl.includes(q);
    });
  }, [data, activeSearch]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setActiveSearch(searchQuery);
  };

  const handleResetSearch = () => {
    setSearchQuery('');
    setActiveSearch('');
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
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Pengumuman Madrasah</h2>
          <span style={{ fontSize: '12px', opacity: 0.9 }}>Informasi resmi untuk Siswa & Wali Murid</span>
        </div>
      </div>

      <div className="portal-content" style={{ marginTop: '16px' }}>
        
        {/* Search Bar with dedicated Search Button */}
        <div className="portal-card" style={{ padding: '12px 14px', marginBottom: '16px', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '13px' }}></i>
              <input
                type="text"
                placeholder="Cari kata kunci pengumuman..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (!e.target.value) setActiveSearch('');
                }}
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 34px',
                  boxSizing: 'border-box',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  fontSize: '13px',
                  background: '#f8fafc',
                  outline: 'none'
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleResetSearch}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '14px' }}
                >
                  &times;
                </button>
              )}
            </div>

            {/* Tombol Pencarian */}
            <button
              type="submit"
              style={{
                padding: '9px 16px',
                background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
                whiteSpace: 'nowrap'
              }}
            >
              <i className="fas fa-search"></i> Cari
            </button>
          </form>

          {/* Search Result Counter */}
          <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#64748b' }}>
            <span>Menampilkan <b>{filteredData.length}</b> dari {data.length} pengumuman</span>
            {activeSearch && (
              <button
                type="button"
                onClick={handleResetSearch}
                style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '11px', fontWeight: 700, cursor: 'pointer', padding: 0 }}
              >
                Reset Pencarian
              </button>
            )}
          </div>
        </div>

        {/* Content List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '28px', marginBottom: '12px', color: '#0284c7' }}></i>
            <p style={{ margin: 0, fontSize: '13px' }}>Memuat pengumuman madrasah...</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <i className="fas fa-bullhorn" style={{ fontSize: '36px', marginBottom: '12px', color: '#cbd5e1' }}></i>
            <h4 style={{ margin: '0 0 6px 0', color: '#475569', fontSize: '15px' }}>
              {activeSearch ? 'Tidak Ada Pengumuman Ditemukan' : 'Belum Ada Pengumuman'}
            </h4>
            <p style={{ margin: '0 0 12px 0', fontSize: '12.5px', lineHeight: 1.5 }}>
              {activeSearch ? 'Tidak ditemukan pengumuman yang sesuai dengan kata kunci pencarian.' : 'Saat ini belum ada pengumuman khusus siswa atau orang tua dari madrasah.'}
            </p>
            {activeSearch && (
              <button
                type="button"
                onClick={handleResetSearch}
                style={{ padding: '8px 16px', background: '#0284c7', color: 'white', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                Tampilkan Semua Pengumuman
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {filteredData.map((item, idx) => {
              const imgUrl = getDriveUrl(item.lampiran);
              const textContent = item.pesan || item.isi || '';

              return (
                <div 
                  key={item.id || idx} 
                  className="portal-card" 
                  style={{ 
                    padding: '0', 
                    overflow: 'hidden', 
                    marginBottom: 0,
                    borderRadius: '14px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 3px 10px rgba(0,0,0,0.03)'
                  }}
                >
                  {/* Image Attachment Preview */}
                  {imgUrl && (
                    <div style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                      <img 
                        src={imgUrl} 
                        alt="Lampiran Pengumuman" 
                        style={{ width: '100%', height: 'auto', maxHeight: '240px', objectFit: 'contain', display: 'block' }} 
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                  )}

                  <div style={{ padding: '16px' }}>
                    {/* Date and Time Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ 
                        fontSize: '11px', 
                        color: '#0369a1', 
                        background: '#e0f2fe', 
                        padding: '3px 9px', 
                        borderRadius: '12px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}>
                        <i className="far fa-calendar-alt"></i>
                        {item.tanggal || '-'}
                      </span>
                      {item.jam && (
                        <span style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <i className="far fa-clock"></i> {item.jam} WIB
                        </span>
                      )}
                    </div>
                    
                    {/* Announcement Message Body */}
                    {textContent ? (
                      <p style={{ margin: 0, fontSize: '13.5px', color: '#1e293b', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                        {textContent}
                      </p>
                    ) : (
                      <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>
                        (Lampiran gambar pengumuman)
                      </p>
                    )}

                    {/* Lampiran Link if external document */}
                    {item.lampiran && !imgUrl && (
                      <div style={{ marginTop: '12px' }}>
                        <a 
                          href={item.lampiran} 
                          target="_blank" 
                          rel="noreferrer" 
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            background: '#f1f5f9',
                            color: '#0284c7',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: 600,
                            textDecoration: 'none',
                            border: '1px solid #e2e8f0'
                          }}
                        >
                          <i className="fas fa-paperclip"></i> Buka Lampiran Berkas
                        </a>
                      </div>
                    )}

                    {/* Author Footer: Always "Admin" */}
                    <div style={{ 
                      marginTop: '14px', 
                      paddingTop: '10px', 
                      borderTop: '1px solid #f1f5f9', 
                      fontSize: '11.5px', 
                      color: '#64748b', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px',
                      fontWeight: 600
                    }}>
                      <i className="fas fa-user-shield" style={{ color: '#0284c7' }}></i>
                      <span>Oleh: <b>Admin</b></span>
                    </div>
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
