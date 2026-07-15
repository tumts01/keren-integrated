'use client';
import { useState, useEffect } from 'react';
import styles from './Bon.module.css';

export default function BonPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchData = async (s = '') => {
    setLoading(true);
    try {
      const res = await fetch(`/api/bon?search=${s}`);
      const json = await res.json();
      if (json.data) {
        setData(json.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const formatRupiah = (angka: string | number) => {
    if (!angka) return 'Rp0';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Number(angka));
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('selesai') || s.includes('disetujui')) return `${styles.badge} ${styles['badge-approved']}`;
    if (s.includes('menunggu') || s.includes('pending')) return `${styles.badge} ${styles['badge-pending']}`;
    return `${styles.badge} ${styles['badge-draft']}`;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Riwayat Nota BON</h1>
          <p className={styles.subtitle}>Kelola pengajuan BON dan realisasi belanja dari sistem BONTU.</p>
        </div>
        <div className={styles.controls}>
          <input 
            type="text" 
            placeholder="Cari No BON, Nama..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
          <button className="btn btn-gold">
            <i className="fas fa-plus"></i> Ajukan Bon Baru
          </button>
        </div>
      </div>

      <div className="card">
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>No BON</th>
                <th>Tanggal</th>
                <th>Pemohon</th>
                <th>Keperluan</th>
                <th>Nominal</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>
                    <i className="fas fa-spinner fa-spin fa-2x" style={{ color: 'var(--primary)' }}></i>
                    <p style={{ marginTop: '12px', color: 'var(--text-muted)' }}>Memuat data BON...</p>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    Belum ada pengajuan BON.
                  </td>
                </tr>
              ) : (
                data.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{item['ID'] || '-'}</td>
                    <td>{item['Tanggal'] || '-'}</td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{item['Nama'] || '-'}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item['Jabatan'] || '-'}</div>
                    </td>
                    <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item['Keperluan'] || '-'}
                    </td>
                    <td style={{ fontWeight: 600 }}>{formatRupiah(item['JumlahUang'])}</td>
                    <td>
                      <span className={getStatusBadge(item['Status'] || 'Draft')}>
                        {item['Status'] || 'Draft'}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                        <i className="fas fa-eye"></i> Detail
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
