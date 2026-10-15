'use client';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Swal from 'sweetalert2';
import styles from './Rekap.module.css';
import ModalAturJalur from '../components/ModalAturJalur';
import ModalPengumumanSpmb from '../components/ModalPengumumanSpmb';

export default function RekapSpmb() {
  const router = useRouter();
  const pathname = usePathname();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal states
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerTitle, setViewerTitle] = useState('');
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showPengumumanModal, setShowPengumumanModal] = useState(false);

  const handleDelete = async (id: string, nama: string) => {
    const result = await Swal.fire({
      title: 'Hapus Data?',
      text: `Yakin ingin menghapus pendaftar ${nama}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Ya, Hapus!'
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/spmb?id=${id}`, { method: 'DELETE' });
        const resJson = await res.json();
        if (resJson.success) {
          Swal.fire('Terhapus!', 'Data berhasil dihapus.', 'success');
          setData(prev => prev.filter(item => item.rowNumber !== id));
        } else {
          Swal.fire('Gagal', resJson.error, 'error');
        }
      } catch (err) {
        Swal.fire('Error', 'Gagal menghapus data.', 'error');
      }
    }
  };

  const handleUpdateStatus = async (id: string, field: 'statusVerifikasi' | 'statusKelulusan', value: string) => {
    try {
      const res = await fetch(`/api/spmb/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      });
      const resJson = await res.json();
      if (resJson.success) {
        setData(prev => prev.map(item => item.rowNumber === id ? { ...item, [field]: value } : item));
      } else {
        Swal.fire('Gagal', resJson.error || 'Gagal mengubah status', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Gagal menghubungi server', 'error');
    }
  };

  useEffect(() => {
    const userStr = localStorage.getItem('keren_user_data');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.role?.toLowerCase() === 'admin') {
          setIsAdmin(true);
        }
      } catch (e) {
        console.error(e);
      }
    }
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
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span>Rekap Pendaftar SPMB</span>
            {!loading && !error && data && (
              <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '500', marginTop: '2px' }}>
                Total: {data.length} Pendaftar
              </span>
            )}
          </div>
        </div>

        {isAdmin && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setShowPengumumanModal(true)}
              style={{
                background: '#0284c7',
                color: 'white',
                border: 'none',
                padding: '9px 18px',
                borderRadius: '10px',
                fontSize: '0.88rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 4px rgba(2, 132, 199, 0.2)'
              }}
            >
              <i className="fas fa-bullhorn"></i> Pengumuman SPMB
            </button>

            <button
              type="button"
              onClick={() => setShowConfigModal(true)}
              style={{
                background: '#047857',
                color: 'white',
                border: 'none',
                padding: '9px 18px',
                borderRadius: '10px',
                fontSize: '0.88rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 4px rgba(4, 120, 87, 0.2)'
              }}
            >
              <i className="fas fa-sliders-h"></i> Atur Jalur SPMB
            </button>
          </div>
        )}
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
                  <th>No. Reg & Nama</th>
                  <th>Jalur</th>
                  <th>Verifikasi Berkas</th>
                  <th>Status Kelulusan</th>
                  <th>Asal Sekolah</th>
                  <th>No. WA Ayah</th>
                  <th>No. WA Ibu</th>
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
                      <div style={{
                        display: 'inline-block',
                        background: '#ecfdf5',
                        color: '#047857',
                        border: '1px solid #a7f3d0',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        marginBottom: '4px'
                      }}>
                        {item.nomorPendaftaran || '-'}
                      </div>
                      <div style={{ fontWeight: 700 }}>{item.namaLengkap}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>NISN: {item.nisn}</div>
                    </td>
                    <td>
                      <span className={`${styles.badge} ${styles[item.jalurPendaftaran] || styles.Reguler}`}>
                        {item.jalurPendaftaran}
                      </span>
                    </td>
                    <td>
                      {isAdmin ? (
                        <select
                          value={item.statusVerifikasi || 'menunggu'}
                          onChange={(e) => handleUpdateStatus(item.rowNumber, 'statusVerifikasi', e.target.value)}
                          style={{
                            padding: '5px 8px',
                            borderRadius: '6px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            border: '1px solid',
                            borderColor: item.statusVerifikasi === 'valid' ? '#86efac' : item.statusVerifikasi === 'perbaikan' ? '#fca5a5' : '#fde68a',
                            background: item.statusVerifikasi === 'valid' ? '#f0fdf4' : item.statusVerifikasi === 'perbaikan' ? '#fef2f2' : '#fffbeb',
                            color: item.statusVerifikasi === 'valid' ? '#15803d' : item.statusVerifikasi === 'perbaikan' ? '#b91c1c' : '#b45309',
                            cursor: 'pointer',
                            outline: 'none'
                          }}
                        >
                          <option value="menunggu">Menunggu</option>
                          <option value="valid">Valid / Lengkap</option>
                          <option value="perbaikan">Perlu Perbaikan</option>
                        </select>
                      ) : (
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          background: item.statusVerifikasi === 'valid' ? '#dcfce7' : item.statusVerifikasi === 'perbaikan' ? '#fee2e2' : '#fef3c7',
                          color: item.statusVerifikasi === 'valid' ? '#15803d' : item.statusVerifikasi === 'perbaikan' ? '#b91c1c' : '#b45309'
                        }}>
                          {item.statusVerifikasi === 'valid' ? 'Valid' : item.statusVerifikasi === 'perbaikan' ? 'Perbaikan' : 'Menunggu'}
                        </span>
                      )}
                    </td>
                    <td>
                      {isAdmin ? (
                        <select
                          value={item.statusKelulusan || 'proses'}
                          onChange={(e) => handleUpdateStatus(item.rowNumber, 'statusKelulusan', e.target.value)}
                          style={{
                            padding: '5px 8px',
                            borderRadius: '6px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            border: '1px solid',
                            borderColor: item.statusKelulusan === 'diterima' ? '#86efac' : item.statusKelulusan === 'tidak_diterima' ? '#fca5a5' : '#cbd5e1',
                            background: item.statusKelulusan === 'diterima' ? '#f0fdf4' : item.statusKelulusan === 'tidak_diterima' ? '#fef2f2' : '#f8fafc',
                            color: item.statusKelulusan === 'diterima' ? '#15803d' : item.statusKelulusan === 'tidak_diterima' ? '#b91c1c' : '#475569',
                            cursor: 'pointer',
                            outline: 'none'
                          }}
                        >
                          <option value="proses">Dalam Proses</option>
                          <option value="diterima">Diterima</option>
                          <option value="cadangan">Cadangan</option>
                          <option value="tidak_diterima">Tidak Diterima</option>
                        </select>
                      ) : (
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          background: item.statusKelulusan === 'diterima' ? '#dcfce7' : item.statusKelulusan === 'tidak_diterima' ? '#fee2e2' : '#f1f5f9',
                          color: item.statusKelulusan === 'diterima' ? '#15803d' : item.statusKelulusan === 'tidak_diterima' ? '#b91c1c' : '#64748b'
                        }}>
                          {item.statusKelulusan === 'diterima' ? 'Diterima' : item.statusKelulusan === 'tidak_diterima' ? 'Tidak Diterima' : item.statusKelulusan === 'cadangan' ? 'Cadangan' : 'Proses'}
                        </span>
                      )}
                    </td>
                    <td>{item.asalSekolah}</td>
                    <td>
                      {item.nomorWaAyah ? (
                        <a href={`https://wa.me/${item.nomorWaAyah.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" style={{ color: '#16a34a', fontWeight: 600, textDecoration: 'none' }}>
                          <i className="fab fa-whatsapp" style={{ marginRight: 4 }}></i>{item.nomorWaAyah}
                        </a>
                      ) : '-'}
                    </td>
                    <td>
                      {item.nomorWaIbu ? (
                        <a href={`https://wa.me/${item.nomorWaIbu.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" style={{ color: '#16a34a', fontWeight: 600, textDecoration: 'none' }}>
                          <i className="fab fa-whatsapp" style={{ marginRight: 4 }}></i>{item.nomorWaIbu}
                        </a>
                      ) : '-'}
                    </td>
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
                      <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                        <button onClick={() => openViewer(`/spmb/cetak/${item.rowNumber}`, `Cetak Kartu - ${item.namaLengkap}`)} className={styles.btnPrint}>
                          <i className="fas fa-print"></i> Cetak Kartu
                        </button>
                        {isAdmin && (
                          <>
                          <button 
                            onClick={() => router.push(`/spmb/edit/${item.rowNumber}`)} 
                            style={{ padding: '6px 12px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '6px' }}
                          >
                            <i className="fas fa-edit"></i> Edit Data
                          </button>
                          <button 
                            onClick={() => handleDelete(item.rowNumber, item.namaLengkap)} 
                            style={{ padding: '6px 12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                          >
                            <i className="fas fa-trash"></i> Hapus
                          </button>
                          </>
                        )}
                      </div>
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
          <div className={styles.modalContent} style={{ maxWidth: viewerUrl.includes('/cetak') ? '800px' : '1000px' }} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>{viewerTitle}</div>
              <button className={styles.closeBtn} onClick={closeViewer}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className={styles.modalBody}>
              <iframe 
                src={viewerUrl.includes('/cetak') ? viewerUrl : viewerUrl.replace('/view?usp=drivesdk', '/preview')} 
                className={styles.iframe}
                allow="autoplay; clipboard-write"
              ></iframe>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pengaturan Jalur SPMB */}
      <ModalAturJalur
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
      />

      {/* Modal Pengumuman SPMB */}
      <ModalPengumumanSpmb
        isOpen={showPengumumanModal}
        onClose={() => setShowPengumumanModal(false)}
      />

    </div>
  );
}
