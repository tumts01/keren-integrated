'use client';

import React, { useEffect, useState, useMemo } from 'react';
import styles from './sajian-data.module.css';
import LoadingScreen from '@/components/LoadingScreen';

export default function SajianDataPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // States for Top Asal Sekolah Filters
  const [filterDomisili, setFilterDomisili] = useState('');
  const [filterKelas, setFilterKelas] = useState('');
  const [filterTA, setFilterTA] = useState('');

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

  const rawAsalSekolah = data?.siswa?.rincianAsalSekolah7 || [];

  // Get unique options for filters
  const uniqueDomisili = useMemo(() => {
    const set = new Set<string>();
    rawAsalSekolah.forEach((r: any) => { if (r.domisili) set.add(r.domisili) });
    return [...set].sort();
  }, [rawAsalSekolah]);

  const uniqueKelas = useMemo(() => {
    const set = new Set<string>();
    rawAsalSekolah.forEach((r: any) => { if (r.kelas) set.add(r.kelas) });
    return [...set].sort();
  }, [rawAsalSekolah]);

  const uniqueTA = useMemo(() => {
    const set = new Set<string>();
    rawAsalSekolah.forEach((r: any) => { 
      if (r.ta7) set.add(r.ta7);
      if (r.ta8) set.add(r.ta8);
      if (r.ta9) set.add(r.ta9);
    });
    return [...set].sort().reverse(); // Reverse for newest first
  }, [rawAsalSekolah]);

  // Apply filters
  const filteredAsalSekolah = useMemo(() => {
    return rawAsalSekolah.filter((r: any) => {
      if (filterDomisili && r.domisili !== filterDomisili) return false;
      if (filterKelas && r.kelas !== filterKelas) return false;
      if (filterTA && r.ta7 !== filterTA && r.ta8 !== filterTA && r.ta9 !== filterTA) return false;
      return true;
    });
  }, [rawAsalSekolah, filterDomisili, filterKelas, filterTA]);

  // Aggregate Top 10
  const top10Sekolah = useMemo(() => {
    const map: Record<string, number> = {};
    filteredAsalSekolah.forEach((r: any) => {
      map[r.asal] = (map[r.asal] || 0) + 1;
    });
    return Object.entries(map)
      .map(([nama, jumlah]) => ({ nama, jumlah }))
      .sort((a, b) => b.jumlah - a.jumlah)
      .slice(0, 10);
  }, [filteredAsalSekolah]);


  if (loading) return <LoadingScreen />;

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

      {/* Top 10 Asal Sekolah dengan Filter */}
      {rawAsalSekolah.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionTitle}>
            <i className="fas fa-school" style={{ color: '#10b981' }}></i>
            Top 10 Asal SD/MI
          </div>
          
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px', background: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '4px' }}>Domisili</label>
              <select value={filterDomisili} onChange={(e) => setFilterDomisili(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                <option value="">Semua Domisili</option>
                {uniqueDomisili.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '4px' }}>Kelas</label>
              <select value={filterKelas} onChange={(e) => setFilterKelas(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                <option value="">Semua Kelas</option>
                {uniqueKelas.map(k => <option key={k} value={k}>Kelas {k}</option>)}
              </select>
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '4px' }}>Tahun Ajaran Masuk</label>
              <select value={filterTA} onChange={(e) => setFilterTA(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                <option value="">Semua Tahun Ajaran</option>
                {uniqueTA.map(ta => <option key={ta} value={ta}>{ta}</option>)}
              </select>
            </div>
          </div>
          
          <div className={styles.tableWrapper}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th style={{ width: '60px', textAlign: 'center' }}>No</th>
                  <th>Asal Sekolah (SD/MI)</th>
                  <th style={{ textAlign: 'center' }}>Jumlah Siswa</th>
                </tr>
              </thead>
              <tbody>
                {top10Sekolah.length > 0 ? top10Sekolah.map((item: any, idx: number) => (
                  <tr key={idx}>
                    <td className={styles.numberCell}>{idx + 1}</td>
                    <td className={styles.categoryCell} style={{ borderRight: 'none' }}>{item.nama}</td>
                    <td className={styles.totalCell}>{item.jumlah}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                      Tidak ada data yang sesuai dengan filter
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
