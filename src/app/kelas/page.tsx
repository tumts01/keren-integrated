'use client';
import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import styles from './Kelas.module.css';

interface RombelStat {
  rombel: string;
  tingkat: string;
  tahunAjaran: string;
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
  const [selectedTahun, setSelectedTahun] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    // Ambil data user dari localStorage untuk cek role admin
    const storedUser = localStorage.getItem('userApp');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUserRole(parsedUser.rule || parsedUser.role || '');
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/kelas');
      const result = await res.json();
      if (result.success) {
        setData(result.data);
        
        // Auto select tahun ajaran terbaru
        const tahunList = Array.from(new Set(result.data.map((s: RombelStat) => s.tahunAjaran).filter(Boolean))) as string[];
        if (tahunList.length > 0) {
          tahunList.sort((a, b) => b.localeCompare(a));
          setSelectedTahun(tahunList[0]);
        }
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

  const filteredData = data.filter(r => r.tahunAjaran === selectedTahun);

  const renderTable = (tingkat: string, title: string) => {
    const tableData = filteredData.filter(r => r.tingkat === tingkat);
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
                    {userRole.toLowerCase() === 'admin' ? (
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
                    ) : (
                      <span style={{ fontWeight: 500 }}>{row.waliKelas || '-'}</span>
                    )}
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

  const uniqueTahun = Array.from(new Set(data.map(r => r.tahunAjaran).filter(Boolean))).sort((a, b) => b.localeCompare(a));
  const grandTotalSiswa = filteredData.reduce((acc, curr) => acc + curr.totalAktif, 0);

  const handleExportExcel = () => {
    const dataToExport = filteredData.map((r, index) => ({
      'No': index + 1,
      'Tingkat': r.tingkat,
      'Kelas/Rombel': r.rombel,
      'Wali Kelas': r.waliKelas,
      'Laki-laki Aktif': r.lakiAktif,
      'Perempuan Aktif': r.perempuanAktif,
      'Total Siswa Aktif': r.totalAktif,
      'Tahun Ajaran': r.tahunAjaran,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Kelas');
    XLSX.writeFile(workbook, `Data_Kelas_${selectedTahun.replace(/\//g, '-')}.xlsx`);
  };

  return (
    <div className={styles.container}>
      <div className={styles.stickyTop}>
        <div className={styles.header}>
        <div className={styles.title}>
          <div className={styles.titleIcon}>
            <i className="fas fa-school"></i>
          </div>
          Data Kelas & Rombel
        </div>
        {!loading && !error && (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <select 
              className={styles.filterSelect}
              value={selectedTahun}
              onChange={(e) => setSelectedTahun(e.target.value)}
            >
              {uniqueTahun.map(tahun => (
                <option key={tahun} value={tahun}>{tahun}</option>
              ))}
            </select>
            <button onClick={handleExportExcel} className="btn btn-gold" style={{ height: '42px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fas fa-file-excel"></i> Export Excel
            </button>
            <button onClick={() => window.print()} className="btn btn-primary" style={{ background: '#2563eb', borderColor: '#2563eb', height: '42px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fas fa-print"></i> Cetak / Download PDF
            </button>
          </div>
        )}
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
      </div>

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
