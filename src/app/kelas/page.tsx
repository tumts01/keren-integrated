'use client';
import { useState, useEffect } from 'react';
import styles from './Kelas.module.css';

interface RombelStat {
  rombel: string;
  tingkat: string;
  lakiAktif: number;
  perempuanAktif: number;
  totalAktif: number;
  waliKelas: string;
}

export default function KelasPage() {
  const [data, setData] = useState<RombelStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingMap, setSavingMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/kelas');
      const result = await res.json();
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Gagal memuat data. Periksa koneksi internet Anda.');
    } finally {
      setLoading(false);
    }
  };

  const handleWaliChange = (rombel: string, newValue: string) => {
    setData(prev => prev.map(item => 
      item.rombel === rombel ? { ...item, waliKelas: newValue } : item
    ));
  };

  const handleSaveWali = async (rombel: string, waliKelas: string) => {
    setSavingMap(prev => ({ ...prev, [rombel]: true }));
    try {
      const res = await fetch('/api/kelas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rombel, waliKelas })
      });
      const result = await res.json();
      if (!result.success) {
        alert('Gagal menyimpan: ' + result.error);
      }
    } catch (err) {
      alert('Gagal menyimpan koneksi bermasalah.');
    } finally {
      setSavingMap(prev => ({ ...prev, [rombel]: false }));
    }
  };

  const renderTable = (tingkat: string, title: string) => {
    const tableData = data.filter(r => r.tingkat === tingkat);
    if (tableData.length === 0) return null;

    const totalLaki = tableData.reduce((acc, curr) => acc + curr.lakiAktif, 0);
    const totalPr = tableData.reduce((acc, curr) => acc + curr.perempuanAktif, 0);
    const totalSemua = tableData.reduce((acc, curr) => acc + curr.totalAktif, 0);

    return (
      <div className={styles.card} key={tingkat}>
        <div className={styles.cardHeader}>{title}</div>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: '15%' }}>Kelas</th>
                <th style={{ width: '40%' }}>Wali Kelas</th>
                <th style={{ width: '15%', textAlign: 'center' }}>Laki-laki Aktif</th>
                <th style={{ width: '15%', textAlign: 'center' }}>Perempuan Aktif</th>
                <th style={{ width: '15%', textAlign: 'center' }}>Jumlah Siswa Aktif</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map(row => (
                <tr key={row.rombel}>
                  <td style={{ fontWeight: 600 }}>{row.rombel}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input 
                        type="text"
                        className={styles.inputWali}
                        value={row.waliKelas}
                        onChange={(e) => handleWaliChange(row.rombel, e.target.value)}
                        placeholder="Ketik nama wali kelas..."
                      />
                      <button 
                        className={styles.saveBtn}
                        onClick={() => handleSaveWali(row.rombel, row.waliKelas)}
                        disabled={savingMap[row.rombel]}
                      >
                        {savingMap[row.rombel] ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>}
                        Simpan
                      </button>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>{row.lakiAktif}</td>
                  <td style={{ textAlign: 'center' }}>{row.perempuanAktif}</td>
                  <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--primary)' }}>{row.totalAktif}</td>
                </tr>
              ))}
              <tr className={styles.totalRow}>
                <td colSpan={2} style={{ textAlign: 'right', paddingRight: '20px' }}>TOTAL KELAS {tingkat}</td>
                <td style={{ textAlign: 'center' }}>{totalLaki}</td>
                <td style={{ textAlign: 'center' }}>{totalPr}</td>
                <td style={{ textAlign: 'center', color: 'var(--primary)' }}>{totalSemua}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const grandTotalSiswa = data.reduce((acc, curr) => acc + curr.totalAktif, 0);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>
          <div className={styles.titleIcon}>
            <i className="fas fa-school"></i>
          </div>
          Data Kelas & Rombel
        </div>
      </div>

      {!loading && !error && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard} style={{ borderLeftColor: '#3b82f6' }}>
            <div className={styles.statIcon} style={{ color: '#3b82f6', background: '#eff6ff' }}>
              <i className="fas fa-users"></i>
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statLabel}>Total Siswa Aktif Keseluruhan</span>
              <span className={styles.statValue}>{grandTotalSiswa}</span>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className={styles.card}>
          <div className={styles.loading}>
            <i className={`fas fa-circle-notch ${styles.spinner}`}></i>
            <p>Memuat Rekapan Kelas dari Spreadsheet...</p>
          </div>
        </div>
      ) : error ? (
        <div className={styles.card}>
          <div className={styles.loading} style={{ color: 'var(--danger)' }}>
            <i className="fas fa-exclamation-triangle" style={{ fontSize: '2rem' }}></i>
            <p>{error}</p>
          </div>
        </div>
      ) : (
        <>
          {renderTable('7', 'Tingkat Kelas 7')}
          {renderTable('8', 'Tingkat Kelas 8')}
          {renderTable('9', 'Tingkat Kelas 9')}
        </>
      )}
    </div>
  );
}
