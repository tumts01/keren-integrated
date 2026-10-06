'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './BukuInduk.module.css';
import InlineLoading from '@/components/InlineLoading';

export default function BukuIndukPage() {
  const [kelas, setKelas] = useState('');
  const [daftarKelas, setDaftarKelas] = useState<string[]>([]);
  const [siswa, setSiswa] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [kelasRes, siswaRes] = await Promise.all([
        fetch('/api/kelas'),
        fetch('/api/siswa')
      ]);
      const kelasJson = await kelasRes.json();
      const siswaJson = await siswaRes.json();

      if (kelasJson.success) {
        // Since we want unique class names, let's use Set just in case
        const classNames = Array.from(new Set(kelasJson.data.map((k: any) => k.rombel)));
        setDaftarKelas(classNames as string[]);
      }
      if (siswaJson.success) {
        setSiswa(siswaJson.data.filter((s: any) => 
          (s.status || '').toUpperCase() === 'AKTIF' && s.isLatest === true
        ));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSiswa = siswa.filter(s => {
    const matchKelas = kelas ? (s.rombel || '').trim().toUpperCase() === kelas.trim().toUpperCase() : true;
    const matchSearch = (s.nama || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                        (s.nisn || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchKelas && matchSearch;
  }).sort((a, b) => {
    // Sort by rombel (kelas)
    const rombelA = a.rombel || '';
    const rombelB = b.rombel || '';
    const compRombel = rombelA.localeCompare(rombelB);
    if (compRombel !== 0) return compRombel;
    // Then sort by nama
    const namaA = a.nama || '';
    const namaB = b.nama || '';
    return namaA.localeCompare(namaB);
  });

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Buku Induk</h1>
          <p className={styles.pageDescription}>Pilih siswa untuk mencetak Buku Induk.</p>
        </div>
      </div>

      <div className={styles.card}>
        {loading ? (
          <InlineLoading message="Memuat data..." />
        ) : (
          <>
            <div className={styles.filterSection} style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <div className={styles.formGroup} style={{ flex: '1', minWidth: '200px' }}>
                <label className={styles.label}>Pilih Kelas</label>
                <select 
                  className={styles.input} 
                  value={kelas} 
                  onChange={(e) => setKelas(e.target.value)}
                >
                  <option value="">Semua Kelas</option>
                  {daftarKelas.map(k => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>
              
              <div className={styles.formGroup} style={{ flex: '2', minWidth: '300px' }}>
                <label className={styles.label}>Cari Nama/NISN</label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <input 
                    type="text" 
                    className={styles.input} 
                    style={{ flex: 1 }}
                    placeholder="Ketik untuk mencari..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {kelas && (
                    <Link 
                      href={`/buku-induk/cetak-masal/${kelas}`}
                      className={styles.primaryButton}
                      style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', backgroundColor: '#10b981' }}
                    >
                      <i className="fa-solid fa-print"></i> Cetak Sekelas
                    </Link>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>No</th>
                    <th>ID Siswa</th>
                    <th>NISN</th>
                    <th>Nama Lengkap</th>
                    <th>Rombel</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSiswa.map((s, idx) => (
                    <tr key={s.nis || idx}>
                      <td>{idx + 1}</td>
                      <td>{s.nis}</td>
                      <td>{s.nisn}</td>
                      <td>{s.nama}</td>
                      <td>{s.rombel}</td>
                      <td>
                        <Link 
                          href={`/buku-induk/cetak/${s.nis}`}
                          className={styles.primaryButton}
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
                        >
                          <i className="fa-solid fa-print"></i> Cetak
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {filteredSiswa.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>Tidak ada data siswa.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
