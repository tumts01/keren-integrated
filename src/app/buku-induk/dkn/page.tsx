'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import styles from './Dkn.module.css';
import InlineLoading from '@/components/InlineLoading';
import { DKN_MAPELS, calculateNR, calculateNM, DknStudentItem } from '@/lib/dkn';

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

  // Track dirty (edited) records: studentId -> { id_siswa, nomor_peserta?, num?, r_grades? }
  const [dirtyMap, setDirtyMap] = useState<Map<string | number, {
    id_siswa: string;
    nomor_peserta?: string;
    num?: Record<string, any>;
    r_grades?: Record<string, any>;
  }>>(new Map());

  // Import Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importFeedback, setImportFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Auto-Generate No. Peserta Modal State
  const [showGeneratorModal, setShowGeneratorModal] = useState(false);
  const [genPrefix, setGenPrefix] = useState('26-13-35-2-0641-');
  const [genStartNo, setGenStartNo] = useState(1);
  const [genDigits, setGenDigits] = useState(4);
  const [genOnlyEmpty, setGenOnlyEmpty] = useState(false);

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

        let newTotalNM = 0;
        DKN_MAPELS.forEach(m => {
          const g = newGrades[m.name];
          if (g && g.nm) newTotalNM += g.nm;
        });

        return {
          ...s,
          grades: newGrades,
          jumlah_nm: Number(newTotalNM.toFixed(2)),
          rata_rata_nm: Number((newTotalNM / DKN_MAPELS.length).toFixed(2))
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

  // Handle Inline Edit: R1..R5 (Nilai Rapor Manual)
  const handleRChange = (studentId: string | number, mapelName: string, rKey: 'r1' | 'r2' | 'r3' | 'r4' | 'r5', valStr: string) => {
    const parsedR = valStr === '' ? null : Number(valStr);

    setStudents(prev => prev.map(s => {
      if (s.id === studentId) {
        const curGrade = s.grades[mapelName] || { r1: null, r2: null, r3: null, r4: null, r5: null, nr: 0, num: null, nm: 0 };
        const updatedR = { ...curGrade, [rKey]: parsedR };
        const newNr = calculateNR(updatedR.r1, updatedR.r2, updatedR.r3, updatedR.r4, updatedR.r5);
        const newNm = calculateNM(newNr, updatedR.num);

        const newGrades = {
          ...s.grades,
          [mapelName]: {
            ...updatedR,
            nr: newNr,
            nm: newNm
          }
        };

        let newTotalNM = 0;
        DKN_MAPELS.forEach(m => {
          const g = newGrades[m.name];
          if (g && g.nm) newTotalNM += g.nm;
        });

        return {
          ...s,
          grades: newGrades,
          jumlah_nm: Number(newTotalNM.toFixed(2)),
          rata_rata_nm: Number((newTotalNM / DKN_MAPELS.length).toFixed(2))
        };
      }
      return s;
    }));

    setDirtyMap(prev => {
      const copy = new Map(prev);
      const student = students.find(s => s.id === studentId);
      const cur = copy.get(studentId) || { id_siswa: student?.id_siswa || '', r_grades: {} };
      const curR = cur.r_grades || {};
      const curMapelR = curR[mapelName] || {};

      copy.set(studentId, {
        ...cur,
        r_grades: {
          ...curR,
          [mapelName]: {
            ...curMapelR,
            [rKey]: parsedR
          }
        }
      });
      return copy;
    });
  };

  // Smart Paste from Excel (Ctrl + V): Pastes multi-line column data downwards
  const handlePasteColumn = (
    e: React.ClipboardEvent<HTMLInputElement>,
    startStudentIdx: number,
    fieldType: 'nomor_peserta' | 'num' | 'r1' | 'r2' | 'r3' | 'r4' | 'r5',
    mapelName?: string
  ) => {
    const text = e.clipboardData.getData('text');
    if (!text) return;

    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length <= 1) {
      // Single value, let default paste happen
      return;
    }

    e.preventDefault();

    const targetStudents = displayedStudents.slice(startStudentIdx, startStudentIdx + lines.length);
    if (targetStudents.length === 0) return;

    setStudents(prev => {
      const studentMap = new Map(prev.map(s => [s.id, s]));

      targetStudents.forEach((st, idx) => {
        const val = lines[idx];
        const cur = studentMap.get(st.id);
        if (!cur) return;

        if (fieldType === 'nomor_peserta') {
          studentMap.set(st.id, { ...cur, nomor_peserta: val });
        } else if (fieldType === 'num' && mapelName) {
          const parsedNum = val === '' ? null : Number(val);
          const curGrade = cur.grades[mapelName] || { r1: null, r2: null, r3: null, r4: null, r5: null, nr: 0, num: null, nm: 0 };
          const newNm = calculateNM(curGrade.nr, parsedNum);
          const newGrades = { ...cur.grades, [mapelName]: { ...curGrade, num: parsedNum, nm: newNm } };

          let newTotal = 0;
          DKN_MAPELS.forEach(m => { if (newGrades[m.name]?.nm) newTotal += newGrades[m.name].nm; });

          studentMap.set(st.id, {
            ...cur,
            grades: newGrades,
            jumlah_nm: Number(newTotal.toFixed(2)),
            rata_rata_nm: Number((newTotal / DKN_MAPELS.length).toFixed(2))
          });
        } else if (mapelName) {
          // r1..r5
          const parsedR = val === '' ? null : Number(val);
          const curGrade = cur.grades[mapelName] || { r1: null, r2: null, r3: null, r4: null, r5: null, nr: 0, num: null, nm: 0 };
          const updatedR = { ...curGrade, [fieldType]: parsedR };
          const newNr = calculateNR(updatedR.r1, updatedR.r2, updatedR.r3, updatedR.r4, updatedR.r5);
          const newNm = calculateNM(newNr, updatedR.num);
          const newGrades = { ...cur.grades, [mapelName]: { ...updatedR, nr: newNr, nm: newNm } };

          let newTotal = 0;
          DKN_MAPELS.forEach(m => { if (newGrades[m.name]?.nm) newTotal += newGrades[m.name].nm; });

          studentMap.set(st.id, {
            ...cur,
            grades: newGrades,
            jumlah_nm: Number(newTotal.toFixed(2)),
            rata_rata_nm: Number((newTotal / DKN_MAPELS.length).toFixed(2))
          });
        }
      });

      return Array.from(studentMap.values());
    });

    // Update dirtyMap
    setDirtyMap(prev => {
      const copy = new Map(prev);
      targetStudents.forEach((st, idx) => {
        const val = lines[idx];
        const cur = copy.get(st.id) || { id_siswa: st.id_siswa };

        if (fieldType === 'nomor_peserta') {
          copy.set(st.id, { ...cur, nomor_peserta: val });
        } else if (fieldType === 'num' && mapelName) {
          const parsedNum = val === '' ? null : Number(val);
          const curNums = cur.num || {};
          copy.set(st.id, { ...cur, num: { ...curNums, [mapelName]: parsedNum } });
        } else if (mapelName) {
          const parsedR = val === '' ? null : Number(val);
          const curR = cur.r_grades || {};
          const curMapelR = curR[mapelName] || {};
          copy.set(st.id, {
            ...cur,
            r_grades: {
              ...curR,
              [mapelName]: {
                ...curMapelR,
                [fieldType]: parsedR
              }
            }
          });
        }
      });
      return copy;
    });

    showToast('success', `Berhasil menempel ${targetStudents.length} baris dari Excel! Klik Simpan untuk menyimpan.`);
  };

  // Generate Nomor Peserta Berurutan
  const handleGenerateNoPeserta = () => {
    let currentCounter = genStartNo;
    let modifiedCount = 0;

    const newStudents = students.map(s => {
      // Check if this student is currently displayed in the view
      const isDisplayed = displayedStudents.some(ds => ds.id === s.id);
      if (!isDisplayed) return s;

      if (genOnlyEmpty && s.nomor_peserta) {
        return s;
      }

      const formattedNumber = String(currentCounter).padStart(genDigits, '0');
      const generatedNo = `${genPrefix}${formattedNumber}`;
      currentCounter++;
      modifiedCount++;

      // Record in dirtyMap
      setDirtyMap(prev => {
        const copy = new Map(prev);
        const cur = copy.get(s.id) || { id_siswa: s.id_siswa };
        copy.set(s.id, { ...cur, nomor_peserta: generatedNo });
        return copy;
      });

      return {
        ...s,
        nomor_peserta: generatedNo
      };
    });

    setStudents(newStudents);
    setShowGeneratorModal(false);
    showToast('success', `Berhasil men-generate nomor peserta untuk ${modifiedCount} siswa! Klik Simpan untuk menyimpan.`);
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
        num: val.num,
        r_grades: val.r_grades
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

  // Download Template for Import
  const handleDownloadTemplate = () => {
    const params = new URLSearchParams();
    if (selectedTa) params.set('ta', selectedTa);
    if (selectedKelas) params.set('kelas', selectedKelas);
    window.open(`/api/buku-induk/dkn/template?${params.toString()}`, '_blank');
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
              onClick={() => setShowGeneratorModal(true)}
              title="Otomatis mengisi Nomor Peserta berurutan"
            >
              ⚡ Auto-No. Peserta
            </button>

            <button
              type="button"
              className={styles.btnOutline}
              onClick={() => setShowImportModal(true)}
              title="Import file Excel NOPES & NUM"
            >
              📥 Import Excel
            </button>

            <button
              type="button"
              className={styles.btnPrimary}
              onClick={handleExportExcel}
              title="Download format DKN.xlsx resmi"
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
            <strong>Perhatian:</strong> Ada {dirtyMap.size} baris data yang diedit dan belum disimpan ke database.
          </div>
          <button
            type="button"
            className={styles.btnSuccess}
            style={{ padding: '6px 16px', fontSize: '0.85rem' }}
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
                        <th className={`${styles.thCommon} ${styles.thSub}`} title="Nilai Kelas 7 Ganjil (Editable)">R1</th>
                        <th className={`${styles.thCommon} ${styles.thSub}`} title="Nilai Kelas 7 Genap (Editable)">R2</th>
                        <th className={`${styles.thCommon} ${styles.thSub}`} title="Nilai Kelas 8 Ganjil (Editable)">R3</th>
                        <th className={`${styles.thCommon} ${styles.thSub}`} title="Nilai Kelas 8 Genap (Editable)">R4</th>
                        <th className={`${styles.thCommon} ${styles.thSub}`} title="Nilai Kelas 9 Ganjil (Editable)">R5</th>
                      </>
                    )}
                    <th className={`${styles.thCommon} ${styles.thSub}`} style={{ background: '#dbeafe', color: '#1e40af' }} title="Rata-rata R1-R5 (Otomatis)">
                      NR
                    </th>
                    <th className={`${styles.thCommon} ${styles.thSub}`} style={{ background: '#fef08a', color: '#854d0e' }} title="Nilai Ujian Madrasah (Manual / Copas Excel)">
                      NUM
                    </th>
                    <th className={`${styles.thCommon} ${styles.thSub}`} style={{ background: '#bbf7d0', color: '#166534' }} title="Nilai Madrasah = 60% NR + 40% NUM (Otomatis)">
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
                        onPaste={e => handlePasteColumn(e, idx, 'nomor_peserta')}
                        title="Bisa paste kolom dari Excel (Ctrl+V) langsung ke bawah"
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
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="any"
                                  className={styles.inputR}
                                  value={grade.r1 !== null && grade.r1 !== undefined ? grade.r1 : ''}
                                  onChange={e => handleRChange(s.id, m.name, 'r1', e.target.value)}
                                  onPaste={e => handlePasteColumn(e, idx, 'r1', m.name)}
                                  placeholder="-"
                                />
                              </td>
                              <td className={`${styles.tdCell} ${styles.tdNumber} ${rowClass}`}>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="any"
                                  className={styles.inputR}
                                  value={grade.r2 !== null && grade.r2 !== undefined ? grade.r2 : ''}
                                  onChange={e => handleRChange(s.id, m.name, 'r2', e.target.value)}
                                  onPaste={e => handlePasteColumn(e, idx, 'r2', m.name)}
                                  placeholder="-"
                                />
                              </td>
                              <td className={`${styles.tdCell} ${styles.tdNumber} ${rowClass}`}>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="any"
                                  className={styles.inputR}
                                  value={grade.r3 !== null && grade.r3 !== undefined ? grade.r3 : ''}
                                  onChange={e => handleRChange(s.id, m.name, 'r3', e.target.value)}
                                  onPaste={e => handlePasteColumn(e, idx, 'r3', m.name)}
                                  placeholder="-"
                                />
                              </td>
                              <td className={`${styles.tdCell} ${styles.tdNumber} ${rowClass}`}>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="any"
                                  className={styles.inputR}
                                  value={grade.r4 !== null && grade.r4 !== undefined ? grade.r4 : ''}
                                  onChange={e => handleRChange(s.id, m.name, 'r4', e.target.value)}
                                  onPaste={e => handlePasteColumn(e, idx, 'r4', m.name)}
                                  placeholder="-"
                                />
                              </td>
                              <td className={`${styles.tdCell} ${styles.tdNumber} ${rowClass}`}>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="any"
                                  className={styles.inputR}
                                  value={grade.r5 !== null && grade.r5 !== undefined ? grade.r5 : ''}
                                  onChange={e => handleRChange(s.id, m.name, 'r5', e.target.value)}
                                  onPaste={e => handlePasteColumn(e, idx, 'r5', m.name)}
                                  placeholder="-"
                                />
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
                              onPaste={e => handlePasteColumn(e, idx, 'num', m.name)}
                              placeholder="-"
                              title="Bisa paste kolom dari Excel (Ctrl+V) langsung ke bawah"
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

      {/* Auto-Generate Nomor Peserta Modal */}
      {showGeneratorModal && (
        <div className={styles.modalOverlay} onClick={() => setShowGeneratorModal(false)}>
          <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>⚡ Auto-Generate Nomor Peserta</h3>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setShowGeneratorModal(false)}
              >
                &times;
              </button>
            </div>

            <div className={styles.modalBody}>
              <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: 0, marginBottom: '1.25rem', lineHeight: 1.5 }}>
                Otomatis mengisikan Nomor Peserta berurutan untuk {displayedStudents.length} siswa yang sedang tampil di layar sesuai abjad / kelas.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Awalan (Prefix Format)
                  </label>
                  <input
                    type="text"
                    className={styles.selectBox}
                    style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'monospace' }}
                    value={genPrefix}
                    onChange={e => setGenPrefix(e.target.value)}
                    placeholder="Contoh: 26-13-35-2-0641-"
                  />
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    Contoh hasil: {genPrefix}{String(genStartNo).padStart(genDigits, '0')}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      Nomor Awal
                    </label>
                    <input
                      type="number"
                      min="1"
                      className={styles.selectBox}
                      style={{ width: '100%', boxSizing: 'border-box' }}
                      value={genStartNo}
                      onChange={e => setGenStartNo(Math.max(1, parseInt(e.target.value) || 1))}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      Digit Format
                    </label>
                    <select
                      className={styles.selectBox}
                      style={{ width: '100%', boxSizing: 'border-box' }}
                      value={genDigits}
                      onChange={e => setGenDigits(parseInt(e.target.value) || 4)}
                    >
                      <option value={4}>4 Digit (0001)</option>
                      <option value={3}>3 Digit (001)</option>
                      <option value={5}>5 Digit (00001)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <input
                    type="checkbox"
                    id="genOnlyEmptyCheck"
                    checked={genOnlyEmpty}
                    onChange={e => setGenOnlyEmpty(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  <label htmlFor="genOnlyEmptyCheck" style={{ fontSize: '0.85rem', color: '#475569', cursor: 'pointer' }}>
                    Hanya isi siswa yang Nomor Pesertanya masih kosong
                  </label>
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.btnOutline}
                onClick={() => setShowGeneratorModal(false)}
              >
                Batal
              </button>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={handleGenerateNoPeserta}
              >
                ⚡ Generate Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className={styles.modalOverlay} onClick={() => setShowImportModal(false)}>
          <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Import Nilai NUM & Nomor Peserta dari Excel</h3>
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
                {/* Download Template Banner */}
                <div style={{
                  background: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0369a1' }}>
                      💡 Belum Punya Template?
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#0284c7' }}>
                      Unduh template yang sudah terisi nama siswa & NISN sesuai kelas ini.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    style={{
                      padding: '6px 12px',
                      background: '#0284c7',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    📥 Unduh Template
                  </button>
                </div>

                <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 0, marginBottom: '1rem', lineHeight: 1.5 }}>
                  Unggah file Excel (format <strong>DKN.xlsx</strong> resmi atau <strong>Template Pengisian</strong>). Data siswa dicocokkan otomatis berdasarkan NISN, NIS, atau Nama.
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
