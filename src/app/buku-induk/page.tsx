'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './BukuInduk.module.css';
import InlineLoading from '@/components/InlineLoading';

export default function BukuIndukPage() {
  const router = useRouter();

  const [kelas, setKelas] = useState('');
  const [daftarKelas, setDaftarKelas] = useState<string[]>([]);
  const [siswa, setSiswa] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Multi-Select Checkboxes
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal Cetak Batch / Rentang
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchKelas, setBatchKelas] = useState('');
  const [batchRangeStart, setBatchRangeStart] = useState<number>(1);
  const [batchRangeEnd, setBatchRangeEnd] = useState<number>(10);

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
        const classNames = Array.from(new Set(kelasJson.data.map((k: any) => k.rombel))).filter(Boolean) as string[];
        classNames.sort((a, b) => a.localeCompare(b));
        setDaftarKelas(classNames);
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

  const filteredSiswa = useMemo(() => {
    return siswa.filter(s => {
      const matchKelas = kelas ? (s.rombel || '').trim().toUpperCase() === kelas.trim().toUpperCase() : true;
      const matchSearch = (s.nama || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (s.nisn || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (s.nis || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchKelas && matchSearch;
    }).sort((a, b) => {
      const rombelA = a.rombel || '';
      const rombelB = b.rombel || '';
      const compRombel = rombelA.localeCompare(rombelB);
      if (compRombel !== 0) return compRombel;
      const namaA = a.nama || '';
      const namaB = b.nama || '';
      return namaA.localeCompare(namaB);
    });
  }, [siswa, kelas, searchTerm]);

  // Handle Select All / Toggle Single
  const isAllSelected = filteredSiswa.length > 0 && filteredSiswa.every(s => selectedIds.has(s.nis || s.id_siswa));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      // Unselect all current filtered
      const copy = new Set(selectedIds);
      filteredSiswa.forEach(s => copy.delete(s.nis || s.id_siswa));
      setSelectedIds(copy);
    } else {
      // Select all current filtered
      const copy = new Set(selectedIds);
      filteredSiswa.forEach(s => copy.add(s.nis || s.id_siswa));
      setSelectedIds(copy);
    }
  };

  const handleToggleSingle = (id: string) => {
    const copy = new Set(selectedIds);
    if (copy.has(id)) {
      copy.delete(id);
    } else {
      copy.add(id);
    }
    setSelectedIds(copy);
  };

  const handleSelectFirstN = (count: number) => {
    const copy = new Set(selectedIds);
    filteredSiswa.slice(0, count).forEach(s => copy.add(s.nis || s.id_siswa));
    setSelectedIds(copy);
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  // Launch Batch Print with selected IDs
  const handlePrintSelected = (idsToPrint?: string[]) => {
    const target = idsToPrint || Array.from(selectedIds);
    if (target.length === 0) {
      alert('Silakan pilih minimal 1 siswa untuk dicetak.');
      return;
    }
    try {
      sessionStorage.setItem('buku_induk_selected_ids', JSON.stringify(target));
      window.open('/buku-induk/cetak-terpilih', '_blank');
    } catch (e) {
      console.error(e);
      window.open(`/buku-induk/cetak-terpilih?ids=${encodeURIComponent(target.join(','))}`, '_blank');
    }
  };

  // Open Range Print Modal
  const openRangeModal = () => {
    const initialClass = kelas || (daftarKelas[0] || '');
    setBatchKelas(initialClass);
    setBatchRangeStart(1);
    setBatchRangeEnd(10);
    setShowBatchModal(true);
  };

  // Students in selected modal class
  const modalClassStudents = useMemo(() => {
    if (!batchKelas) return [];
    return siswa
      .filter(s => (s.rombel || '').trim().toUpperCase() === batchKelas.trim().toUpperCase())
      .sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));
  }, [siswa, batchKelas]);

  // Execute Range Print from Modal
  const handleExecuteRangePrint = (start: number, end: number) => {
    const studentsSlice = modalClassStudents.slice(start - 1, end);
    if (studentsSlice.length === 0) {
      alert('Tidak ada siswa pada rentang nomor tersebut.');
      return;
    }
    const ids = studentsSlice.map(s => s.nis || s.id_siswa);
    setShowBatchModal(false);
    handlePrintSelected(ids);
  };

  return (
    <div className={styles.pageContainer}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 className={styles.pageTitle}>📖 Buku Induk Siswa</h1>
            <span style={{ fontSize: '0.8rem', padding: '4px 10px', background: '#e0f2fe', color: '#0369a1', borderRadius: '16px', fontWeight: 700 }}>
              {siswa.length} Siswa Aktif
            </span>
          </div>
          <p className={styles.pageDescription}>
            Cetak dokumen Buku Induk perorangan, per rombel kelas, maupun secara masal/batch dengan cepat dan efisien.
          </p>
        </div>

        {/* Top Quick Actions */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={openRangeModal}
            className={styles.primaryButton}
            style={{ padding: '0.6rem 1.1rem', backgroundColor: '#6366f1', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '0.875rem', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
          >
            📑 Cetak Per Batch (Rentang)
          </button>
          <Link
            href="/buku-induk/upload"
            className={styles.primaryButton}
            style={{ padding: '0.6rem 1.1rem', backgroundColor: '#475569', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '0.875rem', borderRadius: '8px', textDecoration: 'none' }}
          >
            📤 Upload Legger
          </Link>
          <Link
            href="/buku-induk/verifikasi"
            className={styles.primaryButton}
            style={{ padding: '0.6rem 1.1rem', backgroundColor: '#059669', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '0.875rem', borderRadius: '8px', textDecoration: 'none' }}
          >
            🛡️ Verifikasi Data Ortu
          </Link>
          <Link
            href="/buku-induk/dkn"
            className={styles.primaryButton}
            style={{ padding: '0.6rem 1.1rem', backgroundColor: '#0284c7', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '0.875rem', borderRadius: '8px', textDecoration: 'none' }}
          >
            📋 Menu DKN
          </Link>
        </div>
      </div>

      <div className={styles.card}>
        {loading ? (
          <InlineLoading message="Memuat basis data siswa..." />
        ) : (
          <>
            {/* Filter Section */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'flex-end', background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ flex: '1', minWidth: '180px' }}>
                <label className={styles.label}>Filter Kelas / Rombel</label>
                <select 
                  className={styles.input} 
                  value={kelas} 
                  onChange={(e) => setKelas(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', background: '#fff' }}
                >
                  <option value="">Semua Kelas ({daftarKelas.length} Rombel)</option>
                  {daftarKelas.map(k => (
                    <option key={k} value={k}>Kelas {k}</option>
                  ))}
                </select>
              </div>

              <div style={{ flex: '2', minWidth: '240px' }}>
                <label className={styles.label}>Cari Siswa</label>
                <input 
                  type="text" 
                  className={styles.input} 
                  style={{ width: '100%', boxSizing: 'border-box', background: '#fff' }}
                  placeholder="Ketik Nama, NISN, atau ID Siswa..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Direct Class Print Button */}
              {kelas ? (
                <div style={{ minWidth: '200px' }}>
                  <label className={styles.label} style={{ visibility: 'hidden' }}>Aksi</label>
                  <a 
                    href={`/buku-induk/cetak-masal/${encodeURIComponent(kelas)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.primaryButton}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '0.55rem 1rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      textDecoration: 'none',
                      backgroundColor: '#10b981',
                      fontWeight: 700,
                      borderRadius: '6px'
                    }}
                  >
                    <i className="fa-solid fa-print"></i> Cetak Seluruh {kelas} ({filteredSiswa.length} Siswa)
                  </a>
                </div>
              ) : (
                <div style={{ minWidth: '180px' }}>
                  <label className={styles.label} style={{ visibility: 'hidden' }}>Aksi</label>
                  <button
                    type="button"
                    onClick={openRangeModal}
                    className={styles.primaryButton}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '0.55rem 1rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      backgroundColor: '#059669',
                      fontWeight: 700,
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <i className="fa-solid fa-layer-group"></i> Cetak 1 Kelas...
                  </button>
                </div>
              )}
            </div>

            {/* Quick Selection Helpers */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Pilih Cepat:</span>
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  style={{ padding: '4px 10px', fontSize: '0.78rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, color: '#334155' }}
                >
                  {isAllSelected ? 'Batal Pilih Semua' : `Pilih Semua (${filteredSiswa.length})`}
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectFirstN(10)}
                  style={{ padding: '4px 10px', fontSize: '0.78rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, color: '#334155' }}
                >
                  +10 Pertama
                </button>
                {selectedIds.size > 0 && (
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    style={{ padding: '4px 10px', fontSize: '0.78rem', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, color: '#b91c1c' }}
                  >
                    Reset Pilihan ({selectedIds.size})
                  </button>
                )}
              </div>

              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Menampilkan <strong>{filteredSiswa.length}</strong> siswa
                {selectedIds.size > 0 && (
                  <span style={{ marginLeft: '8px', color: '#2563eb', fontWeight: 700 }}>
                    ({selectedIds.size} siswa dicentang)
                  </span>
                )}
              </div>
            </div>

            {/* Table */}
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>
                      <input 
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={handleToggleSelectAll}
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                        title={isAllSelected ? "Batalkan semua" : "Pilih semua di daftar"}
                      />
                    </th>
                    <th style={{ width: '50px' }}>No</th>
                    <th>ID Siswa</th>
                    <th>NISN</th>
                    <th>Nama Lengkap</th>
                    <th>Rombel</th>
                    <th style={{ textAlign: 'center', width: '140px' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSiswa.map((s, idx) => {
                    const studentId = s.nis || s.id_siswa;
                    const isChecked = selectedIds.has(studentId);

                    return (
                      <tr key={studentId || idx} style={{ backgroundColor: isChecked ? '#eff6ff' : undefined }}>
                        <td style={{ textAlign: 'center' }}>
                          <input 
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleSingle(studentId)}
                            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                          />
                        </td>
                        <td>{idx + 1}</td>
                        <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{s.nis}</td>
                        <td>{s.nisn || '-'}</td>
                        <td style={{ fontWeight: 600 }}>{s.nama}</td>
                        <td>
                          <span style={{ padding: '2px 8px', background: '#f1f5f9', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>
                            {s.rombel}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <a 
                            href={`/buku-induk/cetak/${s.nis}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.primaryButton}
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none', borderRadius: '6px' }}
                          >
                            <i className="fa-solid fa-print"></i> Cetak
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredSiswa.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                        Tidak ada data siswa yang cocok dengan filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Floating Action Toolbar (When at least 1 student is selected) */}
      {selectedIds.size > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#0f172a',
          color: '#ffffff',
          padding: '12px 24px',
          borderRadius: '50px',
          display: 'flex',
          alignItems: 'center',
          gap: '18px',
          boxShadow: '0 12px 30px rgba(0, 0, 0, 0.35)',
          zIndex: 9999,
          animation: 'slideUp 0.3s ease-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              background: '#3b82f6',
              color: '#fff',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '0.8rem'
            }}>
              {selectedIds.size}
            </span>
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
              Siswa Terpilih ({selectedIds.size * 2} Hal. A4)
            </span>
          </div>

          <button
            type="button"
            onClick={() => handlePrintSelected()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#10b981',
              color: '#ffffff',
              border: 'none',
              padding: '8px 18px',
              borderRadius: '30px',
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: 'pointer',
              boxShadow: '0 4px 10px rgba(16, 185, 129, 0.4)'
            }}
          >
            <i className="fa-solid fa-print"></i> Cetak Siswa Terpilih
          </button>

          <button
            type="button"
            onClick={handleClearSelection}
            style={{
              background: 'transparent',
              color: '#94a3b8',
              border: 'none',
              fontSize: '0.85rem',
              cursor: 'pointer',
              padding: '4px 8px'
            }}
            title="Batalkan pilihan"
          >
            ✖ Batal
          </button>
        </div>
      )}

      {/* Modal Cetak Batch / Rentang */}
      {showBatchModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            maxWidth: '520px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#1e293b' }}>
                📑 Cetak Buku Induk Per Batch (Rentang)
              </h3>
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}
              >
                &times;
              </button>
            </div>

            <p style={{ color: '#64748b', fontSize: '0.875rem', lineHeight: 1.5, margin: '0 0 16px 0' }}>
              Membagi pencetakan menjadi beberapa batch per 10–15 siswa sangat disarankan agar printer madrasah tidak macet (*paper jam*).
            </p>

            {/* Pilih Kelas Modal */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Pilih Kelas / Rombel
              </label>
              <select
                className={styles.input}
                value={batchKelas}
                onChange={e => setBatchKelas(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box' }}
              >
                {daftarKelas.map(k => (
                  <option key={k} value={k}>Kelas {k}</option>
                ))}
              </select>
            </div>

            <div style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '14px', background: '#f8fafc', padding: '10px 12px', borderRadius: '8px' }}>
              Jumlah siswa aktif di <strong>Kelas {batchKelas}</strong>: <strong>{modalClassStudents.length} siswa</strong>
            </div>

            {/* Quick Range Presets */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                Preset Rentang Cepat:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleExecuteRangePrint(1, Math.min(10, modalClassStudents.length))}
                  disabled={modalClassStudents.length === 0}
                  style={{ padding: '10px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', fontWeight: 600, fontSize: '0.85rem' }}
                >
                  <div style={{ color: '#0f172a' }}>No. 1 s/d 10</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{Math.min(10, modalClassStudents.length)} Siswa (Hal 1-20)</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleExecuteRangePrint(11, Math.min(20, modalClassStudents.length))}
                  disabled={modalClassStudents.length < 11}
                  style={{ padding: '10px', background: modalClassStudents.length < 11 ? '#f8fafc' : '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: modalClassStudents.length < 11 ? 'not-allowed' : 'pointer', textAlign: 'left', fontWeight: 600, fontSize: '0.85rem', opacity: modalClassStudents.length < 11 ? 0.5 : 1 }}
                >
                  <div style={{ color: '#0f172a' }}>No. 11 s/d 20</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{Math.max(0, Math.min(20, modalClassStudents.length) - 10)} Siswa</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleExecuteRangePrint(21, Math.min(30, modalClassStudents.length))}
                  disabled={modalClassStudents.length < 21}
                  style={{ padding: '10px', background: modalClassStudents.length < 21 ? '#f8fafc' : '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: modalClassStudents.length < 21 ? 'not-allowed' : 'pointer', textAlign: 'left', fontWeight: 600, fontSize: '0.85rem', opacity: modalClassStudents.length < 21 ? 0.5 : 1 }}
                >
                  <div style={{ color: '#0f172a' }}>No. 21 s/d 30</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{Math.max(0, Math.min(30, modalClassStudents.length) - 20)} Siswa</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleExecuteRangePrint(31, modalClassStudents.length)}
                  disabled={modalClassStudents.length < 31}
                  style={{ padding: '10px', background: modalClassStudents.length < 31 ? '#f8fafc' : '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: modalClassStudents.length < 31 ? 'not-allowed' : 'pointer', textAlign: 'left', fontWeight: 600, fontSize: '0.85rem', opacity: modalClassStudents.length < 31 ? 0.5 : 1 }}
                >
                  <div style={{ color: '#0f172a' }}>No. 31 s/d Selesai</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{Math.max(0, modalClassStudents.length - 30)} Siswa</div>
                </button>
              </div>
            </div>

            {/* Custom Range */}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                Atau Tentukan Rentang Manual:
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Dari No:</span>
                <input
                  type="number"
                  min="1"
                  max={modalClassStudents.length}
                  value={batchRangeStart}
                  onChange={e => setBatchRangeStart(Math.max(1, parseInt(e.target.value) || 1))}
                  className={styles.input}
                  style={{ width: '80px', textAlign: 'center' }}
                />
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>s/d No:</span>
                <input
                  type="number"
                  min={batchRangeStart}
                  max={modalClassStudents.length}
                  value={batchRangeEnd}
                  onChange={e => setBatchRangeEnd(Math.min(modalClassStudents.length, parseInt(e.target.value) || batchRangeStart))}
                  className={styles.input}
                  style={{ width: '80px', textAlign: 'center' }}
                />
                <button
                  type="button"
                  onClick={() => handleExecuteRangePrint(batchRangeStart, batchRangeEnd)}
                  style={{
                    flex: 1,
                    padding: '8px 16px',
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  🖨️ Cetak Rentang Ini
                </button>
              </div>
            </div>

            {/* Footer Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', color: '#475569' }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
