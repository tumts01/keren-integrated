'use client';
import { useState, useEffect } from 'react';
import styles from './Siswa.module.css';

export default function SiswaPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });

  const fetchData = async (p = 1, s = '') => {
    setLoading(true);
    try {
      const res = await fetch(`/api/siswa?page=${p}&limit=20&search=${s}`);
      const json = await res.json();
      if (json.data) {
        setData(json.data);
        setMeta(json.meta);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      setPage(1);
      fetchData(1, search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const handlePrev = () => {
    if (page > 1) {
      setPage(page - 1);
      fetchData(page - 1, search);
    }
  };

  const handleNext = () => {
    if (page < meta.totalPages) {
      setPage(page + 1);
      fetchData(page + 1, search);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Data Siswa Terpadu</h1>
          <p className={styles.subtitle}>Kelola dan pantau data profil seluruh siswa secara real-time dari Google Sheets.</p>
        </div>
        <div className={styles.controls}>
          <input 
            type="text" 
            placeholder="Cari Nama / NISN..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
          <button className="btn btn-primary" onClick={() => fetchData(page, search)}>
            <i className="fas fa-sync-alt"></i> Refresh
          </button>
        </div>
      </div>

      <div className="card">
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>No</th>
                <th>NISN</th>
                <th>Nama Siswa</th>
                <th>Rombel (Kelas)</th>
                <th>KIP / KPS</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}>
                    <i className="fas fa-spinner fa-spin fa-2x" style={{ color: 'var(--primary)' }}></i>
                    <p style={{ marginTop: '12px', color: 'var(--text-muted)' }}>Memuat data siswa...</p>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    Tidak ada data siswa ditemukan.
                  </td>
                </tr>
              ) : (
                data.map((item, idx) => (
                  <tr key={idx}>
                    <td>{(page - 1) * 20 + idx + 1}</td>
                    <td>{item['NISN'] || '-'}</td>
                    <td style={{ fontWeight: 500 }}>{item['NAMA'] || item['Nama'] || item['NAMA SISWA'] || '-'}</td>
                    <td>{item['ROMBEL'] || item['Rombel'] || '-'}</td>
                    <td>
                      {item['KIP'] === 'YA' ? (
                        <span style={{ background: '#dcfce7', color: '#166534', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>KIP</span>
                      ) : '-'}
                    </td>
                    <td>Aktif</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {!loading && (
          <div className={styles.pagination}>
            <div className={styles.pageInfo}>
              Menampilkan {data.length} dari {meta.total} siswa (Halaman {page} dari {meta.totalPages})
            </div>
            <div className={styles.pageControls}>
              <button className={styles.pageBtn} onClick={handlePrev} disabled={page <= 1}>
                <i className="fas fa-chevron-left"></i> Sebelumnya
              </button>
              <button className={styles.pageBtn} onClick={handleNext} disabled={page >= meta.totalPages}>
                Selanjutnya <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
