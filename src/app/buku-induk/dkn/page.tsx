'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import styles from './Dkn.module.css';
import InlineLoading from '@/components/InlineLoading';
import { DKN_MAPELS, calculateNM, DknStudentItem } from '@/lib/dkn';

export default function DknPage() {
  const [students, setStudents] = useState<DknStudentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [availableTas, setAvailableTas] = useState<string[]>([]);
  const [availableKelas, setAvailableKelas] = useState<string[]>([]);
  const [selectedTa, setSelectedTa] = useState<string>('');
  const [selectedKelas, setSelectedKelas] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [viewMode, setViewMode] = useState<'compact' | 'full'>('compact');
  const [focusMapel, setFocusMapel] = useState<string>('all');

  // Track dirty (edited) records: studentId -> { nomor_peserta?: string, num?: Record<string, number | null> }
  const [dirtyMap, setDirtyMap] = useState<Map<string | number, { id_siswa: string; nomor_peserta?: string; num?: Record<string, any> }>>(new Map());

  // Import Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importFeedback, setImportFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Success / error message toast
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchDknData();
  }, [selectedTa, selectedKelas]);

  const fetchDknData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedTa) params.set('ta', selectedTa);
      if (selectedKelas) params.set('kelas', selectedKelas);

      const res = await fetch(`/api/buku-induk/dkn?${params.toString()}`);
      const json = await res.json();

      if (json.success) {
        setStudents(json.data || []);
        if (json.availableTas && json.availableTas.length > 0) {
          setAvailableTas(json.availableTas);
          if (!selectedTa) setSelectedTa(json.currentTa || json.availableTas[0]);
        }
        if (json.availableKelas) {
          setAvailableKelas(json.availableKelas);
        }
        setDirtyMap(new Map());
      } else {
        showToast('error', json.error || 'Gagal memuat data DKN');
      }
    } catch (err: any) {
      console.error('Error fetching DKN:', err);
      showToast('error', 'Terjadi kesalahan saat memuat data');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Filtered students by search term
  const displayedStudents = useMemo(() => {
    if (!searchTerm.trim()) return students;
    const q = searchTerm.toLowerCase();
    return students.filter(s =>
      s.nama.toLowerCase().includes(q) ||
      s.nisn.toLowerCase().includes(q) ||
      s.id_siswa.toLowerCase().includes(q) ||
      s.nomor_peserta.toLowerCase().includes(q)
    );
  }, [students, searchTerm]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = students.length;
    const filledNoPeserta = students.filter(s => !!s.nomor_peserta).length;
    const validRataRata = students.map(s => s.rata_rata_nm).filter(r => r > 0);
    const overallAvg = validRataRata.length > 0
      ? (validRataRata.reduce((a, b) => a + b, 0) / validRataRata.length).toFixed(2)
      : '0.00';
    const highestAvg = validRataRata.length > 0 ? Math.max(...validRataRata).toFixed(2) : '0.00';
    const lowestAvg = validRataRata.length > 0 ? Math.min(...validRataRata).toFixed(2) : '0.00';

    return { total, filledNoPeserta, overallAvg, highestAvg, lowestAvg };
  }, [students]);

  // Active Mapels to display (if focusMapel is set)
  const activeMapels = useMemo(() => {
    if (focusMapel === 'all') return DKN_MAPELS;
    return DKN_MAPELS.filter(m => m.name === focusMapel || m.key === focusMapel);
  }, [focusMapel]);

  // Handle Inline Edit: Nomor Peserta
  const handleNoPesertaChange = (studentId: string | number, newNoPes: string) => {
    setStudents(prev => prev.map(s => {
      if (s.id === studentId) {
        return { ...s, nomor_peserta: newNoPes };
      }
      return s;
    }));

    setDirtyMap(prev => {
      const copy = new Map(prev);
      const student = students.find(s => s.id === studentId);
      const cur = copy.get(studentId) || { id_siswa: student?.id_siswa || '' };
      copy.set(studentId, { ...cur, nomor_peserta: newNoPes });
      return copy;
    });
  };

  // Handle Inline Edit: NUM (Nilai Ujian Madrasah)
  const handleNumChange = (studentId: string | number, mapelName: string, valStr: string) => {
    const parsedNum = valStr === '' ? null : Number(valStr);

    setStudents(prev => prev.map(s => {
      if (s.id === studentId) {
        const curGrade = s.grades[mapelName] || { r1: null, r2: null, r3: null, r4: null, r5: null, nr: 0, num: null, nm: 0 };
        const newNm = calculateNM(curGrade.nr, parsedNum);

        const newGrades = {
          ...s.grades,
          [mapelName]: {
            ...curGrade,
            num: parsedNum,
            nm: newNm
          }
        };

        // Recalculate total NM & average
        let newTotalNM = 0;
        DKN_MAPELS.forEach(m => {
          const g = newGrades[m.name];
          if (g && g.nm) newTotalNM += g.nm;
        });

        const newJumlahNm = Number(newTotalNM.toFixed(2));
        const newRataRataNm = Number((newTotalNM / DKN_MAPELS.length).toFixed(2));

        return {
          ...s,
          grades: newGrades,
          jumlah_nm: newJumlahNm,
          rata_rata_nm: newRataRataNm
        };
      }
      return s;
    }));

    setDirtyMap(prev => {
      const copy = new Map(prev);
      const student = students.find(s => s.id === studentId);
      const cur = copy.get(studentId) || { id_siswa: student?.id_siswa || '', num: {} };
      const curNums = cur.num || {};
      copy.set(studentId, {
        ...cur,
        num: {
          ...curNums,
          [mapelName]: parsedNum
        }
      });
      return copy;
    });
  };

  // Save changes to database
  const handleSaveChanges = async () => {
    if (dirtyMap.size === 0) return;

    setSaving(true);
    try {
      const updates = Array.from(dirtyMap.entries()).map(([id, val]) => ({
        id,
        id_siswa: val.id_siswa,
        nomor_peserta: val.nomor_peserta,
        num: val.num
      }));

      const res = await fetch('/api/buku-induk/dkn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      });

      const json = await res.json();
      if (json.success) {
        setDirtyMap(new Map());
        showToast('success', `Berhasil menyimpan data ${json.updatedCount} siswa!`);
      } else {
        showToast('error', json.error || 'Gagal menyimpan perubahan');
      }
    } catch (err: any) {
      console.error('Error saving DKN:', err);
      showToast('error', 'Gagal menyimpan perubahan: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    const params = new URLSearchParams();
    if (selectedTa) params.set('ta', selectedTa);
    if (selectedKelas) params.set('kelas', selectedKelas);
    window.open(`/api/buku-induk/dkn/export?${params.toString()}`, '_blank');
  };

  // Import Excel Submit
  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) {
      setImportFeedback({ type: 'error', message: 'Silakan pilih file Excel terlebih dahulu' });
      return;
    }

    setImporting(true);
    setImportFeedback(null);

    try {
      const formData = new FormData();
      formData.append('file', importFile);

      const res = await fetch('/api/buku-induk/dkn/import', {
        method: 'POST',
        body: formData
      });

      const json = await res.json();
      if (json.success) {
        setImportFeedback({
          type: 'success',
          message: `Berhasil import! ${json.updatedCount} siswa berhasil diperbarui.`
        });
        setTimeout(() => {
          setShowImportModal(false);
          setImportFile(null);
          setImportFeedback(null);
          fetchDknData();
        }, 1500);
      } else {
        setImportFeedback({
          type: 'error',
          message: json.error || 'Gagal import file Excel'
        });
      }
    } catch (err: any) {
      setImportFeedback({ type: 'error', message: 'Terjadi kesalahan: ' + err.message });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          padding: '12px 20px',
          borderRadius: '8px',
          color: 'white',
          background: toastMessage.type === 'success' ? '#10b981' : '#ef4444',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 9999,
          fontWeight: 600,
          fontSize: '0.875rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>{toastMessage.type === 'success' ? '✓' : '⚠'}</span>
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Page Header */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h1 className={styles.mainTitle}>
            <span>📋</span> DKN (Daftar Kumpulan Nilai)
          </h1>
          <p className={styles.subtitle}>
            Daftar Kumpulan Nilai Kelas 9: Rapor Semester 1-5 (R1-R5), Nilai Ujian Madrasah (NUM), dan Nilai Madrasah (NM)
          </p>
        </div>
        <div className={styles.topActions}>
          <Link href="/buku-induk" className={styles.backBtn}>
            &larr; Buku Induk
          </Link>
          <Link href="/buku-induk/upload" className={styles.backBtn}>
            📤 Upload Legger
          </Link>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className={styles.statsBar}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Siswa Kelas 9</div>
          <div className={styles.statValue}>{stats.total}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>No. Peserta Terisi</div>
          <div className={styles.statValue} style={{ color: stats.filledNoPeserta === stats.total && stats.total > 0 ? '#10b981' : '#f59e0b' }}>
            {stats.filledNoPeserta} / {stats.total}
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Rerata Nilai Madrasah</div>
          <div className={styles.statValue} style={{ color: '#0284c7' }}>
            {stats.overallAvg}
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Tertinggi / Terendah</div>
          <div className={styles.statValue} style={{ fontSize: '1.15rem' }}>
            <span style={{ color: '#10b981' }}>{stats.highestAvg}</span> / <span style={{ color: '#ef4444' }}>{stats.lowestAvg}</span>
          </div>
        </div>
      </div>

      {/* Controls & Filter Bar */}
      <div className={styles.controlCard}>
        <div className={styles.filtersRow}>
          <div className={styles.filterGroup}>
            {/* Tahun Ajaran */}
            <div>
              <select
                className={styles.selectBox}
                value={selectedTa}
                onChange={e => setSelectedTa(e.target.value)}
              >
                {availableTas.map(ta => (
                  <option key={ta} value={ta}>TA {ta}</option>
                ))}
              </select>
            </div>

            {/* Kelas 9 */}
            <div>
              <select
                className={styles.selectBox}
                value={selectedKelas}
                onChange={e => setSelectedKelas(e.target.value)}
              >
                <option value="all">Semua Kelas 9</option>
                {availableKelas.map(k => (
                  <option key={k} value={k}>Kelas {k}</option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <input
              type="text"
              placeholder="Cari Siswa / NISN / No Peserta..."
              className={styles.searchInput}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />

            {/* View Mode Toggle */}
            <div className={styles.viewModeToggle}>
              <button
                type="button"
                className={viewMode === 'compact' ? styles.toggleBtnActive : styles.toggleBtn}
                onClick={() => setViewMode('compact')}
              >
                📊 Ringkas (NR, NUM, NM)
              </button>
              <button
                type="button"
                className={viewMode === 'full' ? styles.toggleBtnActive : styles.toggleBtn}
                onClick={() => setViewMode('full')}
              >
                📋 Lengkap (R1-R5, NR, NUM, NM)
              </button>
            </div>

            {/* Focus Mapel */}
            <div>
              <select
                className={styles.selectBox}
                value={focusMapel}
                onChange={e => setFocusMapel(e.target.value)}
              >
                <option value="all">Semua Mapel (16 Mapel)</option>
                {DKN_MAPELS.map(m => (
                  <option key={m.name} value={m.name}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className={styles.actionButtons}>
            {dirtyMap.size > 0 && (
              <button
                type="button"
                className={styles.btnSuccess}
                onClick={handleSaveChanges}
                disabled={saving}
              >
                💾 {saving ? 'Menyimpan...' : `Simpan (${dirtyMap.size})`}
              </button>
            )}

            <button
              type="button"
              className={styles.btnOutline}
              onClick={() => setShowImportModal(true)}
            >
              📥 Import Excel
            </button>

            <button
              type="button"
              className={styles.btnPrimary}
              onClick={handleExportExcel}
            >
              📤 Export Excel
            </button>

            <button
              type="button"
              className={styles.btnOutline}
              onClick={() => window.print()}
            >
              🖨️ Cetak
            </button>
          </div>
        </div>
      </div>

      {/* Unsaved Changes Banner */}
      {dirtyMap.size > 0 && (
        <div className={styles.dirtyBanner}>
          <div>
            <strong>Perhatian:</strong> Ada {dirtyMap.size} baris data yang belum disimpan. Nilai Madrasah (NM) dihitung otomatis secara langsung.
          </div>
          <button
            type="button"
            className={styles.btnSuccess}
            style={{ padding: '4px 12px', fontSize: '0.8rem' }}
            onClick={handleSaveChanges}
            disabled={saving}
          >
            {saving ? 'Menyimpan...' : 'Simpan Sekarang'}
          </button>
        </div>
      )}

      {/* Main DKN Table */}
      {loading ? (
        <div className={styles.controlCard} style={{ textAlign: 'center', padding: '3rem' }}>
          <InlineLoading message="Memuat dan menghitung Daftar Kumpulan Nilai (DKN)..." />
        </div>
      ) : displayedStudents.length === 0 ? (
        <div className={styles.controlCard} style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: '#64748b', fontSize: '1rem', margin: 0 }}>
            Tidak ada siswa Kelas 9 yang ditemukan untuk kriteria filter ini.
          </p>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              {/* Row 1: Group Headers */}
              <tr>
                <th rowSpan={2} className={`${styles.thCommon} ${styles.thTop} ${styles.thStickyLeft} ${styles.thStickyNo}`}>
                  NO
                </th>
                <th rowSpan={2} className={`${styles.thCommon} ${styles.thTop} ${styles.thStickyLeft} ${styles.thStickyPeserta}`}>
                  NOMOR PESERTA
                </th>
                <th rowSpan={2} className={`${styles.thCommon} ${styles.thTop} ${styles.thStickyLeft} ${styles.thStickyNisn}`}>
                  NISN
                </th>
                <th rowSpan={2} className={`${styles.thCommon} ${styles.thTop}`}>
                  NOMOR INDUK
                </th>
                <th rowSpan={2} className={`${styles.thCommon} ${styles.thTop} ${styles.thStickyNama}`} style={{ minWidth: 200, textAlign: 'left' }}>
                  NAMA PESERTA
                </th>
                <th rowSpan={2} className={`${styles.thCommon} ${styles.thTop}`}>
                  TEMPAT LAHIR
                </th>
                <th rowSpan={2} className={`${styles.thCommon} ${styles.thTop}`}>
                  TANGGAL LAHIR
                </th>
                <th rowSpan={2} className={`${styles.thCommon} ${styles.thTop}`}>
                  JK
                </th>
                <th rowSpan={2} className={`${styles.thCommon} ${styles.thTop}`}>
                  NAMA AYAH
                </th>

                {/* Subject Group Headers */}
                {activeMapels.map(m => (
                  <th
                    key={m.name}
                    colSpan={viewMode === 'full' ? 8 : 3}
                    className={`${styles.thCommon} ${styles.thTop} ${styles.subjectHeaderGroup}`}
                  >
                    {m.name}
                  </th>
                ))}

                {/* Summary Headers */}
                <th rowSpan={2} className={`${styles.thCommon} ${styles.thTop}`} style={{ minWidth: 90 }}>
                  JUMLAH NM
                </th>
                <th rowSpan={2} className={`${styles.thCommon} ${styles.thTop}`} style={{ minWidth: 90 }}>
                  RATA-RATA NM
                </th>
                <th rowSpan={2} className={`${styles.thCommon} ${styles.thTop}`} style={{ minWidth: 80 }}>
                  STATUS
                </th>
              </tr>

              {/* Row 2: Sub-headers for Subjects */}
              <tr>
                {activeMapels.map(m => (
                  <React.Fragment key={`sub-${m.name}`}>
                    {viewMode === 'full' && (
                      <>
                        <th className={`${styles.thCommon} ${styles.thSub}`} title="Semester 7 Ganjil">R1</th>
                        <th className={`${styles.thCommon} ${styles.thSub}`} title="Semester 7 Genap">R2</th>
                        <th className={`${styles.thCommon} ${styles.thSub}`} title="Semester 8 Ganjil">R3</th>
                        <th className={`${styles.thCommon} ${styles.thSub}`} title="Semester 8 Genap">R4</th>
                        <th className={`${styles.thCommon} ${styles.thSub}`} title="Semester 9 Ganjil">R5</th>
                      </>
                    )}
                    <th className={`${styles.thCommon} ${styles.thSub}`} style={{ background: '#dbeafe', color: '#1e40af' }} title="Rata-rata R1-R5">
                      NR
                    </th>
                    <th className={`${styles.thCommon} ${styles.thSub}`} style={{ background: '#fef08a', color: '#854d0e' }} title="Nilai Ujian Madrasah (Manual)">
                      NUM
                    </th>
                    <th className={`${styles.thCommon} ${styles.thSub}`} style={{ background: '#bbf7d0', color: '#166534' }} title="Nilai Madrasah (60% NR + 40% NUM)">
                      NM
                    </th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayedStudents.map((s, idx) => {
                const isEven = idx % 2 === 1;
                const rowClass = isEven ? styles.tdRowEven : '';

                return (
                  <tr key={s.id || s.id_siswa || idx}>
                    {/* Sticky Info Columns */}
                    <td className={`${styles.tdCell} ${styles.tdStickyLeft} ${styles.tdNo} ${rowClass}`}>
                      {idx + 1}
                    </td>
                    <td className={`${styles.tdCell} ${styles.tdStickyLeft} ${styles.tdPeserta} ${rowClass}`}>
                      <input
                        type="text"
                        className={styles.inputPeserta}
                        value={s.nomor_peserta}
                        placeholder="Contoh: 26-13-..."
                        onChange={e => handleNoPesertaChange(s.id, e.target.value)}
                      />
                    </td>
                    <td className={`${styles.tdCell} ${styles.tdStickyLeft} ${styles.tdNisn} ${rowClass}`}>
                      {s.nisn || '-'}
                    </td>
                    <td className={`${styles.tdCell} ${rowClass}`}>
                      {s.nomor_induk}
                    </td>
                    <td className={`${styles.tdCell} ${styles.tdNama} ${rowClass}`}>
                      {s.nama}
                    </td>
                    <td className={`${styles.tdCell} ${rowClass}`}>
                      {s.tempat_lahir || '-'}
                    </td>
                    <td className={`${styles.tdCell} ${rowClass}`}>
                      {s.tanggal_lahir || '-'}
                    </td>
                    <td className={`${styles.tdCell} ${styles.tdNumber} ${rowClass}`}>
                      {s.jenis_kelamin || '-'}
                    </td>
                    <td className={`${styles.tdCell} ${rowClass}`}>
                      {s.nama_ayah || '-'}
                    </td>

                    {/* Subject Grade Cells */}
                    {activeMapels.map(m => {
                      const grade = s.grades[m.name] || { r1: null, r2: null, r3: null, r4: null, r5: null, nr: 0, num: null, nm: 0 };
                      return (
                        <React.Fragment key={`${s.id}-${m.name}`}>
                          {viewMode === 'full' && (
                            <>
                              <td className={`${styles.tdCell} ${styles.tdNumber} ${rowClass}`}>
                                {grade.r1 ?? '-'}
                              </td>
                              <td className={`${styles.tdCell} ${styles.tdNumber} ${rowClass}`}>
                                {grade.r2 ?? '-'}
                              </td>
                              <td className={`${styles.tdCell} ${styles.tdNumber} ${rowClass}`}>
                                {grade.r3 ?? '-'}
                              </td>
                              <td className={`${styles.tdCell} ${styles.tdNumber} ${rowClass}`}>
                                {grade.r4 ?? '-'}
                              </td>
                              <td className={`${styles.tdCell} ${styles.tdNumber} ${rowClass}`}>
                                {grade.r5 ?? '-'}
                              </td>
                            </>
                          )}
                          <td className={`${styles.tdCell} ${styles.tdNR}`}>
                            {grade.nr > 0 ? grade.nr.toFixed(1) : '-'}
                          </td>
                          <td className={`${styles.tdCell} ${styles.tdNUM}`}>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="any"
                              className={styles.inputNum}
                              value={grade.num !== null && grade.num !== undefined ? grade.num : ''}
                              onChange={e => handleNumChange(s.id, m.name, e.target.value)}
                              placeholder="-"
                            />
                          </td>
                          <td className={`${styles.tdCell} ${styles.tdNM}`}>
                            {grade.nm > 0 ? grade.nm.toFixed(2) : '-'}
                          </td>
                        </React.Fragment>
                      );
                    })}

                    {/* Summary Columns */}
                    <td className={`${styles.tdCell} ${styles.tdSummary} ${rowClass}`}>
                      {s.jumlah_nm > 0 ? s.jumlah_nm.toFixed(2) : '-'}
                    </td>
                    <td className={`${styles.tdCell} ${styles.tdSummary} ${rowClass}`} style={{ color: '#0284c7' }}>
                      {s.rata_rata_nm > 0 ? s.rata_rata_nm.toFixed(2) : '-'}
                    </td>
                    <td className={`${styles.tdCell} ${styles.tdLulus}`}>
                      {s.status_lulus}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className={styles.modalOverlay} onClick={() => setShowImportModal(false)}>
          <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Import Nilai NUM & Nomor Peserta</h3>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setShowImportModal(false)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleImportSubmit}>
              <div className={styles.modalBody}>
                <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: 0, marginBottom: '1rem', lineHeight: 1.5 }}>
                  Unggah file Excel (format <strong>DKN.xlsx</strong> atau template kolom [NISN, Nama, Nomor Peserta, Mapel]). Data siswa akan dicocokkan otomatis berdasarkan NISN / NIS / Nama.
                </p>

                <div
                  className={styles.uploadDropzone}
                  onClick={() => document.getElementById('excelFileInput')?.click()}
                >
                  <input
                    id="excelFileInput"
                    type="file"
                    accept=".xlsx, .xls"
                    style={{ display: 'none' }}
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        setImportFile(e.target.files[0]);
                      }
                    }}
                  />
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📄</div>
                  <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.25rem' }}>
                    {importFile ? importFile.name : 'Klik untuk memilih file Excel'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    Format .xlsx atau .xls (Ukuran maks: 10 MB)
                  </div>
                </div>

                {importFeedback && (
                  <div style={{
                    marginTop: '1rem',
                    padding: '0.75rem 1rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.85rem',
                    background: importFeedback.type === 'success' ? '#ecfdf5' : '#fef2f2',
                    color: importFeedback.type === 'success' ? '#065f46' : '#991b1b',
                    border: `1px solid ${importFeedback.type === 'success' ? '#a7f3d0' : '#fecaca'}`
                  }}>
                    {importFeedback.message}
                  </div>
                )}
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.btnOutline}
                  onClick={() => setShowImportModal(false)}
                  disabled={importing}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className={styles.btnPrimary}
                  disabled={!importFile || importing}
                >
                  {importing ? 'Mengimpor...' : 'Mulai Import'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
