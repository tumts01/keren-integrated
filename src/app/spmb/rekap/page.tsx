'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './Rekap.module.css';

export default function RekapSpmb() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal states
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerTitle, setViewerTitle] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/spmb/rekap');
      const result = await res.json();
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Gagal memuat data dari server.');
    } finally {
      setLoading(false);
    }
  };

  const openViewer = (url: string, title: string) => {
    setViewerUrl(url);
    setViewerTitle(title);
  };

  const closeViewer = () => {
    setViewerUrl(null);
    setViewerTitle('');
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>
          <div className={styles.titleIcon}>
            <i className="fas fa-list-alt"></i>
          </div>
          Rekap Pendaftar SPMB
        </div>
      </div>

      <div className={styles.card}>
        {loading ? (
          <div className={styles.loadingState}>
            <i className={`fas fa-spinner ${styles.loadingSpinner}`}></i>
            Mengambil data pendaftar terbaru...
          </div>
        ) : error ? (
          <div className={styles.emptyState}>
            <i className="fas fa-exclamation-triangle" style={{ fontSize: '3rem', color: '#ef4444' }}></i>
            <p>{error}</p>
          </div>
        ) : data.length === 0 ? (
          <div className={styles.emptyState}>
            <i className="fas fa-folder-open" style={{ fontSize: '3rem' }}></i>
            <p>Belum ada data pendaftar yang masuk.</p>
          </div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Waktu Daftar</th>
                  <th>Nama Lengkap</th>
                  <th>Jalur</th>
                  <th>Asal Sekolah</th>
                  <th>Berkas</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        {item.timestamp.split(' ')[0]}
                      </div>
                      <div style={{ fontWeight: 600 }}>
                        {item.timestamp.split(' ')[1]}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{item.namaLengkap}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>NISN: {item.nisn}</div>
                    </td>
                    <td>
                      <span className={`${styles.badge} ${styles[item.jalurPendaftaran] || styles.Reguler}`}>
                        {item.jalurPendaftaran}
                      </span>
                    </td>
                    <td>{item.asalSekolah}</td>
                    <td>
                      <div className={styles.actionGroup}>
                        {item.linkKk ? (
                          <button onClick={() => openViewer(item.linkKk, `KK - ${item.namaLengkap}`)} className={styles.btnView} title="Lihat KK">
                            <i className="fas fa-id-card"></i> KK
                          </button>
                        ) : null}
                        {item.linkAkta ? (
                          <button onClick={() => openViewer(item.linkAkta, `Akta - ${item.namaLengkap}`)} className={styles.btnView} title="Lihat Akta">
                            <i className="fas fa-child"></i> Akta
                          </button>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      <Link href={`/spmb/cetak/${item.rowNumber}`} target="_blank" className={styles.btnPrint}>
                        <i className="fas fa-print"></i> Cetak Kartu
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Document Viewer Modal */}
      {viewerUrl && (
        <div className={styles.modalOverlay} onClick={closeViewer}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>{viewerTitle}</div>
              <button className={styles.closeBtn} onClick={closeViewer}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className={styles.modalBody}>
              <iframe 
                src={viewerUrl.replace('/view?usp=drivesdk', '/preview')} 
                className={styles.iframe}
                allow="autoplay"
              ></iframe>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
