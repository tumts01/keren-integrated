'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import styles from './Dkn.module.css';
import InlineLoading from '@/components/InlineLoading';
import Swal from 'sweetalert2';

interface DknStudent {
  nis: string;
  nisn: string;
  nama: string;
  gender: string;
  scores: Record<string, number | null>;
  total: number;
  average: number;
  rank: number;
}

interface DknResponse {
  success: boolean;
  ta: string;
  semester: string;
  kelas: string;
  mapels: string[];
  students: DknStudent[];
  statistics: Record<string, { rataRata: number; tertinggi: number; terendah: number }>;
  overallStats: {
    avgTotal: number;
    avgClass: number;
    highestTotal: number;
    lowestTotal: number;
  };
  isFromSts: boolean;
  message?: string;
  lembaga: {
    nama: string;
    yayasan: string;
    alamat: string;
    kepalaMadrasah: string;
    waliKelas: string;
  };
}

export default function DknPage() {
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [options, setOptions] = useState<any[]>([]);
  
  const [selectedTa, setSelectedTa] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<string>('');
  const [selectedKelas, setSelectedKelas] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<'nama' | 'rank' | 'nis'>('nama');

  const [dataLoading, setDataLoading] = useState(false);
  const [dknData, setDknData] = useState<DknResponse | null>(null);

  // 1. Fetch available options on mount
  useEffect(() => {
    const fetchOptions = async () => {
      setOptionsLoading(true);
      try {
        const res = await fetch('/api/buku-induk/dkn?action=options');
        const json = await res.json();
        if (json.success && json.options && json.options.length > 0) {
          setOptions(json.options);
          
          // Auto select first available TA, semester, and kelas
          const firstTa = json.options[0];
          setSelectedTa(firstTa.tahun_ajaran);
          
          if (firstTa.semesters && firstTa.semesters.length > 0) {
            const firstSem = firstTa.semesters[0];
            setSelectedSemester(firstSem.semester);
            
            if (firstSem.kelas && firstSem.kelas.length > 0) {
              setSelectedKelas(firstSem.kelas[0]);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching options:', err);
      } finally {
        setOptionsLoading(false);
      }
    };

    fetchOptions();
  }, []);

  // Compute available semesters for selected TA
  const availableSemesters = useMemo(() => {
    if (!selectedTa || !options) return [];
    const taObj = options.find((o: any) => o.tahun_ajaran === selectedTa);
    return taObj ? taObj.semesters.map((s: any) => s.semester) : [];
  }, [selectedTa, options]);

  // Compute available kelas for selected TA & Semester
  const availableKelas = useMemo(() => {
    if (!selectedTa || !selectedSemester || !options) return [];
    const taObj = options.find((o: any) => o.tahun_ajaran === selectedTa);
    if (!taObj) return [];
    const semObj = taObj.semesters.find((s: any) => s.semester.toLowerCase() === selectedSemester.toLowerCase());
    return semObj ? semObj.kelas : [];
  }, [selectedTa, selectedSemester, options]);

  // Handle TA change
  const handleTaChange = (ta: string) => {
    setSelectedTa(ta);
    const taObj = options.find((o: any) => o.tahun_ajaran === ta);
    if (taObj && taObj.semesters.length > 0) {
      const firstSem = taObj.semesters[0];
      setSelectedSemester(firstSem.semester);
      if (firstSem.kelas.length > 0) {
        setSelectedKelas(firstSem.kelas[0]);
      } else {
        setSelectedKelas('');
      }
    } else {
      setSelectedSemester('');
      setSelectedKelas('');
    }
  };

  // Handle Semester change
  const handleSemesterChange = (sem: string) => {
    setSelectedSemester(sem);
    const taObj = options.find((o: any) => o.tahun_ajaran === selectedTa);
    if (taObj) {
      const semObj = taObj.semesters.find((s: any) => s.semester.toLowerCase() === sem.toLowerCase());
      if (semObj && semObj.kelas.length > 0) {
        setSelectedKelas(semObj.kelas[0]);
      } else {
        setSelectedKelas('');
      }
    }
  };

  // 2. Fetch DKN Data when TA, Semester, or Kelas changes
  const fetchDkn = async () => {
    if (!selectedTa || !selectedSemester || !selectedKelas) {
      setDknData(null);
      return;
    }

    setDataLoading(true);
    try {
      const query = new URLSearchParams({
        ta: selectedTa,
        semester: selectedSemester,
        kelas: selectedKelas
      });

      const res = await fetch(`/api/buku-induk/dkn?${query.toString()}`);
      const json = await res.json();
      if (json.success) {
        setDknData(json);
      } else {
        Swal.fire({ icon: 'error', title: 'Gagal', text: json.error || 'Gagal memuat DKN' });
        setDknData(null);
      }
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message || 'Terjadi kesalahan sistem' });
      setDknData(null);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    fetchDkn();
  }, [selectedTa, selectedSemester, selectedKelas]);

  // Filter & sort students
  const displayedStudents = useMemo(() => {
    if (!dknData || !dknData.students) return [];

    let list = dknData.students.filter(s => {
      const term = searchTerm.toLowerCase().trim();
      if (!term) return true;
      return (
        s.nama.toLowerCase().includes(term) ||
        s.nis.toLowerCase().includes(term) ||
        s.nisn.toLowerCase().includes(term)
      );
    });

    if (sortBy === 'rank') {
      list.sort((a, b) => a.rank - b.rank);
    } else if (sortBy === 'nis') {
      list.sort((a, b) => a.nis.localeCompare(b.nis, undefined, { numeric: true }));
    } else {
      list.sort((a, b) => a.nama.localeCompare(b.nama));
    }

    return list;
  }, [dknData, searchTerm, sortBy]);

  // Export to Excel handler
  const handleExportExcel = () => {
    if (!dknData || dknData.students.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Perhatian', text: 'Tidak ada data nilai untuk diexport' });
      return;
    }

    const mapels = dknData.mapels;
    const excelRows = displayedStudents.map((s, index) => {
      const row: Record<string, any> = {
        'No': index + 1,
        'NIS': s.nis,
        'NISN': s.nisn,
        'Nama Siswa': s.nama,
        'L/P': s.gender
      };

      mapels.forEach(m => {
        row[m] = s.scores[m] !== null && s.scores[m] !== undefined ? s.scores[m] : '';
      });

      row['Jumlah'] = s.total;
      row['Rata-Rata'] = s.average;
      row['Peringkat'] = s.rank;

      return row;
    });

    // Add statistics rows
    const avgRow: Record<string, any> = {
      'No': '',
      'NIS': '',
      'NISN': '',
      'Nama Siswa': 'RATA-RATA KELAS',
      'L/P': ''
    };
    const maxRow: Record<string, any> = {
      'No': '',
      'NIS': '',
      'NISN': '',
      'Nama Siswa': 'NILAI TERTINGGI',
      'L/P': ''
    };
    const minRow: Record<string, any> = {
      'No': '',
      'NIS': '',
      'NISN': '',
      'Nama Siswa': 'NILAI TERENDAH',
      'L/P': ''
    };

    mapels.forEach(m => {
      avgRow[m] = dknData.statistics[m]?.rataRata || '';
      maxRow[m] = dknData.statistics[m]?.tertinggi || '';
      minRow[m] = dknData.statistics[m]?.terendah || '';
    });

    avgRow['Jumlah'] = dknData.overallStats?.avgTotal || '';
    avgRow['Rata-Rata'] = dknData.overallStats?.avgClass || '';
    avgRow['Peringkat'] = '';

    maxRow['Jumlah'] = dknData.overallStats?.highestTotal || '';
    maxRow['Rata-Rata'] = '';
    maxRow['Peringkat'] = '';

    minRow['Jumlah'] = dknData.overallStats?.lowestTotal || '';
    minRow['Rata-Rata'] = '';
    minRow['Peringkat'] = '';

    excelRows.push(avgRow, maxRow, minRow);

    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `DKN_${selectedKelas}`);

    const safeKelas = selectedKelas.replace(/[^a-zA-Z0-9]/g, '_');
    const safeTa = selectedTa.replace(/[^a-zA-Z0-9]/g, '_');
    XLSX.writeFile(workbook, `DKN_Kelas_${safeKelas}_${selectedSemester}_${safeTa}.xlsx`);
  };

  const handlePrint = () => {
    if (!dknData || dknData.students.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Perhatian', text: 'Tidak ada data nilai untuk dicetak' });
      return;
    }
    window.print();
  };

  return (
    <div className={styles.pageContainer}>
      {/* ===== SCREEN VIEW ===== */}
      <div className={styles.noPrint}>
        {/* Header */}
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>
              <div className={styles.pageTitleIcon}>
                <i className="fas fa-file-invoice"></i>
              </div>
              DKN (Daftar Kumpulan Nilai)
            </h1>
            <p className={styles.pageDescription}>
              Rekapitulasi nilai hasil belajar siswa per kelas dan semester untuk arsip Buku Induk Madrasah.
            </p>
          </div>
          <div className={styles.actionButtons}>
            <Link href="/buku-induk" className={`${styles.btn} ${styles.btnOutline}`}>
              <i className="fas fa-book-open"></i> Cetak Buku Induk
            </Link>
            <Link href="/buku-induk/upload" className={`${styles.btn} ${styles.btnOutline}`}>
              <i className="fas fa-file-upload"></i> Upload Legger
            </Link>
          </div>
        </div>

        {/* Filter Card */}
        <div className={styles.card}>
          {optionsLoading ? (
            <InlineLoading message="Memuat opsi tahun ajaran dan kelas..." />
          ) : (
            <div className={styles.filterGrid}>
              <div className={styles.formGroup} style={{ maxWidth: '180px' }}>
                <label className={styles.label}>Tahun Ajaran</label>
                <select 
                  className={styles.select}
                  value={selectedTa} 
                  onChange={(e) => handleTaChange(e.target.value)}
                >
                  {options.map((o: any) => (
                    <option key={o.tahun_ajaran} value={o.tahun_ajaran}>{o.tahun_ajaran}</option>
                  ))}
                  {options.length === 0 && <option value="">Tidak ada data</option>}
                </select>
              </div>

              <div className={styles.formGroup} style={{ maxWidth: '150px' }}>
                <label className={styles.label}>Semester</label>
                <select 
                  className={styles.select}
                  value={selectedSemester} 
                  onChange={(e) => handleSemesterChange(e.target.value)}
                >
                  {availableSemesters.map((sem: string) => (
                    <option key={sem} value={sem}>{sem}</option>
                  ))}
                  {availableSemesters.length === 0 && <option value="">-</option>}
                </select>
              </div>

              <div className={styles.formGroup} style={{ maxWidth: '160px' }}>
                <label className={styles.label}>Kelas / Rombel</label>
                <select 
                  className={styles.select}
                  value={selectedKelas} 
                  onChange={(e) => setSelectedKelas(e.target.value)}
                >
                  {availableKelas.map((k: string) => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                  {availableKelas.length === 0 && <option value="">-</option>}
                </select>
              </div>

              <div className={styles.formGroup} style={{ maxWidth: '180px' }}>
                <label className={styles.label}>Urutkan Berdasarkan</label>
                <select 
                  className={styles.select}
                  value={sortBy} 
                  onChange={(e: any) => setSortBy(e.target.value)}
                >
                  <option value="nama">Nama Siswa (A - Z)</option>
                  <option value="rank">Peringkat (Rank 1 s/d Akhir)</option>
                  <option value="nis">Nomor Induk (NIS)</option>
                </select>
              </div>

              <div className={styles.formGroup} style={{ flex: 2, minWidth: '220px' }}>
                <label className={styles.label}>Cari Siswa</label>
                <input 
                  type="text" 
                  placeholder="Ketik nama atau NISN..." 
                  className={styles.input}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  onClick={handleExportExcel}
                  className={`${styles.btn} ${styles.btnSuccess}`}
                  disabled={!dknData || dknData.students.length === 0}
                  title="Export DKN ke file Excel (.xlsx)"
                >
                  <i className="fas fa-file-excel"></i> Export Excel
                </button>
                <button 
                  onClick={handlePrint}
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  disabled={!dknData || dknData.students.length === 0}
                  title="Cetak format lanskap"
                >
                  <i className="fas fa-print"></i> Cetak DKN
                </button>
              </div>
            </div>
          )}
        </div>

        {/* KPI Summary Cards */}
        {dknData && dknData.students.length > 0 && (
          <div className={styles.statsGrid}>
            <div className={styles.statCard} style={{ borderLeftColor: '#0284c7' }}>
              <div className={styles.statIcon} style={{ background: '#e0f2fe', color: '#0284c7' }}>
                <i className="fas fa-user-graduate"></i>
              </div>
              <div>
                <div className={styles.statLabel}>Total Siswa</div>
                <div className={styles.statValue}>{dknData.students.length} Siswa</div>
              </div>
            </div>

            <div className={styles.statCard} style={{ borderLeftColor: '#10b981' }}>
              <div className={styles.statIcon} style={{ background: '#dcfce7', color: '#10b981' }}>
                <i className="fas fa-book"></i>
              </div>
              <div>
                <div className={styles.statLabel}>Jumlah Mapel</div>
                <div className={styles.statValue}>{dknData.mapels.length} Mata Pelajaran</div>
              </div>
            </div>

            <div className={styles.statCard} style={{ borderLeftColor: '#f59e0b' }}>
              <div className={styles.statIcon} style={{ background: '#fef3c7', color: '#f59e0b' }}>
                <i className="fas fa-chart-line"></i>
              </div>
              <div>
                <div className={styles.statLabel}>Rata-Rata Kelas</div>
                <div className={styles.statValue}>{dknData.overallStats?.avgClass || 0}</div>
              </div>
            </div>

            <div className={styles.statCard} style={{ borderLeftColor: '#8b5cf6' }}>
              <div className={styles.statIcon} style={{ background: '#ede9fe', color: '#8b5cf6' }}>
                <i className="fas fa-award"></i>
              </div>
              <div>
                <div className={styles.statLabel}>Nilai Tertinggi (Rank 1)</div>
                <div className={styles.statValue}>
                  {dknData.overallStats?.highestTotal || 0}
                  <span style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 'normal', marginLeft: '6px' }}>
                    ({dknData.students.find(s => s.rank === 1)?.nama.split(' ')[0] || ''})
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* DKN Interactive Table Card */}
        <div className={styles.card} style={{ padding: '1rem' }}>
          {dataLoading ? (
            <InlineLoading message={`Memuat DKN Kelas ${selectedKelas} Semester ${selectedSemester}...`} />
          ) : !dknData || dknData.students.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: '#64748b' }}>
              <i className="fas fa-folder-open" style={{ fontSize: '3rem', color: '#cbd5e1', marginBottom: '1rem', display: 'block' }}></i>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#334155', fontSize: '1.15rem' }}>
                {dknData?.message || 'Data Kumpulan Nilai Belum Ditemukan'}
              </h3>
              <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.9rem', maxWidth: '480px', marginInline: 'auto' }}>
                Belum ada legger nilai yang diunggah untuk kelas <strong>{selectedKelas}</strong> pada semester <strong>{selectedSemester}</strong> TA <strong>{selectedTa}</strong>.
              </p>
              <Link href="/buku-induk/upload" className={`${styles.btn} ${styles.btnPrimary}`}>
                <i className="fas fa-cloud-upload-alt"></i> Buka Menu Upload Legger
              </Link>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ fontSize: '0.88rem', color: '#475569' }}>
                  Menampilkan <strong>{displayedStudents.length}</strong> siswa • Wali Kelas: <strong>{dknData.lembaga?.waliKelas || '-'}</strong>
                  {dknData.isFromSts && (
                    <span style={{ marginLeft: '8px', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', background: '#e0f2fe', color: '#0369a1', fontWeight: 600 }}>
                      <i className="fas fa-info-circle"></i> Sumber: Legger STS
                    </span>
                  )}
                </div>
              </div>

              <div className={styles.tableWrapper}>
                <table className={styles.dknTable}>
                  <thead>
                    <tr>
                      <th className={styles.stickyCol0} style={{ width: '45px' }}>No</th>
                      <th className={styles.stickyCol1} style={{ width: '80px' }}>NIS</th>
                      <th className={styles.stickyCol2} style={{ minWidth: '220px', textAlign: 'left' }}>Nama Siswa</th>
                      <th style={{ width: '45px' }}>L/P</th>
                      {dknData.mapels.map(m => (
                        <th key={m} title={m} style={{ minWidth: '80px' }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100px' }}>
                            {m}
                          </div>
                        </th>
                      ))}
                      <th style={{ minWidth: '85px', background: '#f1f5f9', color: '#0f172a' }}>Jumlah</th>
                      <th style={{ minWidth: '85px', background: '#f1f5f9', color: '#0f172a' }}>Rata-Rata</th>
                      <th style={{ minWidth: '70px', background: '#fef3c7', color: '#854d0e' }}>Rank</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedStudents.map((s, idx) => (
                      <tr key={s.nis || s.nama}>
                        <td className={styles.stickyCol0} style={{ textAlign: 'center', fontWeight: 600 }}>{idx + 1}</td>
                        <td className={styles.stickyCol1} style={{ textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>{s.nis || '-'}</td>
                        <td className={styles.stickyCol2}>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>{s.nama}</div>
                          {s.nisn && <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>NISN: {s.nisn}</div>}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 600, color: s.gender === 'P' ? '#ec4899' : '#0284c7' }}>
                          {s.gender || '-'}
                        </td>
                        {dknData.mapels.map(m => {
                          const val = s.scores[m];
                          const hasVal = val !== null && val !== undefined;
                          return (
                            <td key={m} style={{ textAlign: 'center', fontWeight: hasVal ? 600 : 400, color: hasVal ? '#0f172a' : '#cbd5e1' }}>
                              {hasVal ? val : '-'}
                            </td>
                          );
                        })}
                        <td style={{ textAlign: 'center', fontWeight: 700, background: '#f8fafc', color: '#0369a1' }}>
                          {s.total}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 700, background: '#f8fafc', color: s.average >= 85 ? '#059669' : s.average >= 75 ? '#d97706' : '#dc2626' }}>
                          {s.average.toFixed(2)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`
                            ${styles.rankBadge} 
                            ${s.rank === 1 ? styles.rankGold : s.rank === 2 ? styles.rankSilver : s.rank === 3 ? styles.rankBronze : styles.rankNormal}
                          `}>
                            {s.rank}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>

                  {/* Footer Statistics */}
                  <tfoot>
                    <tr className={styles.tableFooterRow}>
                      <td colSpan={4} style={{ textAlign: 'right', paddingRight: '1rem' }}>RATA-RATA KELAS:</td>
                      {dknData.mapels.map(m => (
                        <td key={m}>{dknData.statistics[m]?.rataRata || '-'}</td>
                      ))}
                      <td>{dknData.overallStats?.avgTotal || '-'}</td>
                      <td style={{ color: '#059669' }}>{dknData.overallStats?.avgClass || '-'}</td>
                      <td>-</td>
                    </tr>
                    <tr className={styles.tableFooterRow}>
                      <td colSpan={4} style={{ textAlign: 'right', paddingRight: '1rem' }}>NILAI TERTINGGI:</td>
                      {dknData.mapels.map(m => (
                        <td key={m} style={{ color: '#059669' }}>{dknData.statistics[m]?.tertinggi || '-'}</td>
                      ))}
                      <td style={{ color: '#059669' }}>{dknData.overallStats?.highestTotal || '-'}</td>
                      <td>-</td>
                      <td>-</td>
                    </tr>
                    <tr className={styles.tableFooterRow}>
                      <td colSpan={4} style={{ textAlign: 'right', paddingRight: '1rem' }}>NILAI TERENDAH:</td>
                      {dknData.mapels.map(m => (
                        <td key={m} style={{ color: '#dc2626' }}>{dknData.statistics[m]?.terendah || '-'}</td>
                      ))}
                      <td style={{ color: '#dc2626' }}>{dknData.overallStats?.lowestTotal || '-'}</td>
                      <td>-</td>
                      <td>-</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ===== PRINT LAYOUT (Visible ONLY during window.print()) ===== */}
      {dknData && (
        <div className={styles.printContainer}>
          <div className={styles.printKop}>
            <h3>{dknData.lembaga?.yayasan || 'YAYASAN PENDIDIKAN ALMAARIF SINGOSARI'}</h3>
            <h2>{dknData.lembaga?.nama || 'MADRASAH TSANAWIYAH ALMAARIF 01 SINGOSARI'}</h2>
            <p>{dknData.lembaga?.alamat || 'Jl. Masjid No.33 Pagentan, Kec. Singosari, Kab. Malang'}</p>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '12pt', fontWeight: 'bold', textDecoration: 'underline' }}>
              DAFTAR KUMPULAN NILAI (DKN)
            </h3>
            <div style={{ fontSize: '9pt' }}>
              Kelas: <strong>{selectedKelas}</strong> &nbsp;|&nbsp; Semester: <strong>{selectedSemester}</strong> &nbsp;|&nbsp; Tahun Ajaran: <strong>{selectedTa}</strong>
            </div>
          </div>

          <table className={styles.printTable}>
            <thead>
              <tr>
                <th style={{ width: '25px' }}>No</th>
                <th style={{ width: '60px' }}>NIS</th>
                <th style={{ textAlign: 'left', minWidth: '150px' }}>Nama Siswa</th>
                <th style={{ width: '25px' }}>L/P</th>
                {dknData.mapels.map(m => (
                  <th key={m} style={{ minWidth: '35px', fontSize: '7pt' }}>{m}</th>
                ))}
                <th style={{ width: '45px', fontWeight: 'bold' }}>Jml</th>
                <th style={{ width: '45px', fontWeight: 'bold' }}>Rata</th>
                <th style={{ width: '30px', fontWeight: 'bold' }}>Rank</th>
              </tr>
            </thead>
            <tbody>
              {displayedStudents.map((s, idx) => (
                <tr key={s.nis || s.nama}>
                  <td>{idx + 1}</td>
                  <td>{s.nis || '-'}</td>
                  <td style={{ textAlign: 'left', fontWeight: 'bold' }}>{s.nama}</td>
                  <td>{s.gender || '-'}</td>
                  {dknData.mapels.map(m => (
                    <td key={m}>{s.scores[m] !== null && s.scores[m] !== undefined ? s.scores[m] : '-'}</td>
                  ))}
                  <td style={{ fontWeight: 'bold' }}>{s.total}</td>
                  <td style={{ fontWeight: 'bold' }}>{s.average.toFixed(2)}</td>
                  <td style={{ fontWeight: 'bold' }}>{s.rank}</td>
                </tr>
              ))}
              {/* Print Stats */}
              <tr style={{ fontWeight: 'bold', background: '#f3f4f6' }}>
                <td colSpan={4} style={{ textAlign: 'right' }}>Rata-Rata Kelas:</td>
                {dknData.mapels.map(m => (
                  <td key={m}>{dknData.statistics[m]?.rataRata || '-'}</td>
                ))}
                <td>{dknData.overallStats?.avgTotal || '-'}</td>
                <td>{dknData.overallStats?.avgClass || '-'}</td>
                <td>-</td>
              </tr>
              <tr style={{ fontWeight: 'bold', background: '#f3f4f6' }}>
                <td colSpan={4} style={{ textAlign: 'right' }}>Nilai Tertinggi:</td>
                {dknData.mapels.map(m => (
                  <td key={m}>{dknData.statistics[m]?.tertinggi || '-'}</td>
                ))}
                <td>{dknData.overallStats?.highestTotal || '-'}</td>
                <td>-</td>
                <td>-</td>
              </tr>
              <tr style={{ fontWeight: 'bold', background: '#f3f4f6' }}>
                <td colSpan={4} style={{ textAlign: 'right' }}>Nilai Terendah:</td>
                {dknData.mapels.map(m => (
                  <td key={m}>{dknData.statistics[m]?.terendah || '-'}</td>
                ))}
                <td>{dknData.overallStats?.lowestTotal || '-'}</td>
                <td>-</td>
                <td>-</td>
              </tr>
            </tbody>
          </table>

          {/* Signatures */}
          <div className={styles.printSignatures}>
            <div className={styles.signBox}>
              <div>Mengetahui,</div>
              <div>Kepala Madrasah</div>
              <div style={{ height: '55px' }}></div>
              <div style={{ fontWeight: 'bold', textDecoration: 'underline' }}>{dknData.lembaga?.kepalaMadrasah || 'Dwi Retno Palupi, M.Pd.'}</div>
            </div>
            <div className={styles.signBox}>
              <div>Singosari, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
              <div>Wali Kelas {selectedKelas}</div>
              <div style={{ height: '55px' }}></div>
              <div style={{ fontWeight: 'bold', textDecoration: 'underline' }}>{dknData.lembaga?.waliKelas || 'Wali Kelas'}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
