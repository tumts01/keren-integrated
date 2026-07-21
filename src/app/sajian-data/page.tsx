'use client';

import React, { useEffect, useState } from 'react';
import styles from './sajian-data.module.css';

export default function SajianDataPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/sajian-data')
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          setData(json.data);
        } else {
          setError(json.error || 'Gagal memuat data');
        }
      })
      .catch(err => {
        setError('Terjadi kesalahan jaringan');
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '1.5rem', marginBottom: '12px' }}></i>
          Memuat Sajian Data...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px' }}></i>
          {error || 'Data tidak tersedia'}
        </div>
      </div>
    );
  }

  const { guruStaf, siswa } = data;

  const renderRincianRows = (obj: Record<string, { L: number, P: number }>) => {
    return Object.keys(obj).map(k => {
      const L = obj[k].L || 0;
      const P = obj[k].P || 0;
      const total = L + P;
      return (
        <tr key={k}>
          <td className={styles.subCategoryCell}>{k}</td>
          <td className={styles.numberCell}>{L}</td>
          <td className={styles.numberCell}>{P}</td>
          <td className={styles.totalCell}>{total}</td>
        </tr>
      );
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.actionContainer}>
        <button className={styles.printBtn} onClick={() => window.print()}>
          <i className="fas fa-print"></i> Cetak / Download PDF
        </button>
      </div>

      <header className={styles.header}>
        <h1 className={styles.title}>Sajian Data Terpadu</h1>
        <p className={styles.subtitle}>Rekapitulasi statistik dalam format tabel</p>
      </header>

      {/* Bagian Guru & Staf */}
      <section className={styles.section}>
        <div className={styles.sectionTitle}>
          <i className="fas fa-chalkboard-user" style={{ color: '#0ea5e9' }}></i>
          Data Guru & Staf
        </div>
        
        <div className={styles.tableWrapper}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th className={styles.categoryCell}>Kategori / Rincian</th>
                <th className={styles.numberCell}>Laki-laki (L)</th>
                <th className={styles.numberCell}>Perempuan (P)</th>
                <th className={styles.totalCell}>Total</th>
              </tr>
            </thead>
            <tbody>
              {/* TOTAL KESELURUHAN GURU */}
              <tr className={styles.mainTotalRow}>
                <td className={styles.categoryCell}>TOTAL GURU & STAF</td>
                <td className={styles.numberCell}>{guruStaf.total.L}</td>
                <td className={styles.numberCell}>{guruStaf.total.P}</td>
                <td className={styles.totalCell}>{guruStaf.total.Total}</td>
              </tr>

              {/* Pendidikan */}
              <tr className={styles.subTotalRow}>
                <td colSpan={4} className={styles.categoryCell} style={{ borderRight: 'none' }}>Berdasarkan Pendidikan</td>
              </tr>
              {renderRincianRows(guruStaf.pendidikan)}

              {/* Domisili */}
              <tr className={styles.subTotalRow}>
                <td colSpan={4} className={styles.categoryCell} style={{ borderRight: 'none' }}>Berdasarkan Domisili</td>
              </tr>
              {renderRincianRows(guruStaf.domisili)}

              {/* Status Guru */}
              <tr className={styles.subTotalRow}>
                <td colSpan={4} className={styles.categoryCell} style={{ borderRight: 'none' }}>Berdasarkan Status Guru</td>
              </tr>
              {renderRincianRows(guruStaf.status)}

              {/* Sertifikasi */}
              <tr className={styles.subTotalRow}>
                <td colSpan={4} className={styles.categoryCell} style={{ borderRight: 'none' }}>Status Sertifikasi</td>
              </tr>
              <tr>
                <td className={styles.subCategoryCell}>Sudah Sertifikasi</td>
                <td className={styles.numberCell}>{guruStaf.sertifikasi.L}</td>
                <td className={styles.numberCell}>{guruStaf.sertifikasi.P}</td>
                <td className={styles.totalCell}>{guruStaf.sertifikasi.L + guruStaf.sertifikasi.P}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Bagian Siswa */}
      <section className={styles.section}>
        <div className={styles.sectionTitle}>
          <i className="fas fa-user-graduate" style={{ color: '#10b981' }}></i>
          Data Siswa Aktif
        </div>
        
        <div className={styles.tableWrapper}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th className={styles.categoryCell}>Kategori / Rincian</th>
                <th className={styles.numberCell}>Laki-laki (L)</th>
                <th className={styles.numberCell}>Perempuan (P)</th>
                <th className={styles.totalCell}>Total</th>
              </tr>
            </thead>
            <tbody>
              {/* TOTAL KESELURUHAN SISWA */}
              <tr className={styles.mainTotalRow}>
                <td className={styles.categoryCell}>TOTAL SISWA AKTIF</td>
                <td className={styles.numberCell}>{siswa.total.L}</td>
                <td className={styles.numberCell}>{siswa.total.P}</td>
                <td className={styles.totalCell}>{siswa.total.Total}</td>
              </tr>

              {/* Asal Sekolah */}
              <tr className={styles.subTotalRow}>
                <td colSpan={4} className={styles.categoryCell} style={{ borderRight: 'none' }}>Berdasarkan Asal Sekolah</td>
              </tr>
              {renderRincianRows(siswa.asalSekolah)}

              {/* Domisili */}
              <tr className={styles.subTotalRow}>
                <td colSpan={4} className={styles.categoryCell} style={{ borderRight: 'none' }}>Berdasarkan Domisili</td>
              </tr>
              {renderRincianRows(siswa.domisili)}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
