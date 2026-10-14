'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import styles from '../BukuInduk.module.css';
import InlineLoading from '@/components/InlineLoading';

export default function VerifikasiDataOrtuPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, verified: 0, pendingReview: 0, unverified: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKelas, setSelectedKelas] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'MENGAJUKAN_PERBAIKAN' | 'VERIFIED' | 'BELUM_VERIFIKASI'>('ALL');

  // Modal Review States
  const [reviewStudent, setReviewStudent] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Modal SPTJM
  const [sptjmStudent, setSptjmStudent] = useState<any>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/portal/verifikasi?all=true');
      const json = await res.json();
      if (json.success && json.data) {
        setStudents(json.data);
        if (json.stats) {
          setStats(json.stats);
        }
      }
    } catch (err: any) {
      console.error('Fetch verifikasi list error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Distinct classes
  const daftarKelas = useMemo(() => {
    const setK = new Set<string>();
    students.forEach(s => {
      if (s.kelas) setK.add(s.kelas);
    });
    return Array.from(setK).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [students]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      // 1. Kelas filter
      if (selectedKelas && s.kelas !== selectedKelas) return false;
      // 2. Status filter
      if (statusFilter !== 'ALL' && s.statusVerifikasi !== statusFilter) return false;
      // 3. Search query
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const nama = (s.nama || '').toLowerCase();
        const nisn = (s.nisn || '').toLowerCase();
        const nik = (s.nik || '').toLowerCase();
        const nis = (s.nis || '').toLowerCase();
        if (!nama.includes(q) && !nisn.includes(q) && !nik.includes(q) && !nis.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [students, selectedKelas, statusFilter, searchTerm]);

  // Approve TU
  const handleApproveTU = async () => {
    if (!reviewStudent) return;

    const confirm = await Swal.fire({
      title: 'Setujui & Terapkan Perubahan?',
      html: `
        <div style="text-align: left; font-size: 13px; line-height: 1.5;">
          Data siswa <b>${reviewStudent.nama}</b> akan otomatis diperbarui di database master sesuai usulan orang tua, dan statusnya dikunci menjadi <b>VERIFIED</b>.
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Setujui & Update Master Data',
      cancelButtonText: 'Batal'
    });

    if (!confirm.isConfirmed) return;

    setIsProcessing(true);
    try {
      const res = await fetch('/api/portal/verifikasi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nisn: reviewStudent.nisn,
          nis: reviewStudent.nis,
          action: 'TU_APPROVE',
          adminNotes: adminNotes.trim()
        })
      });

      const json = await res.json();
      if (json.success) {
        Swal.fire({
          icon: 'success',
          title: 'Berhasil Disetujui!',
          text: 'Data master siswa telah diperbarui dan status verifikasi telah dikunci.'
        });
        setReviewStudent(null);
        setAdminNotes('');
        fetchData();
      } else {
        Swal.fire({ icon: 'error', title: 'Gagal', text: json.error || 'Terjadi kesalahan' });
      }
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  // Reject TU
  const handleRejectTU = async () => {
    if (!reviewStudent) return;

    const { value: reason } = await Swal.fire({
      title: 'Tolak Pengajuan Perbaikan?',
      input: 'textarea',
      inputLabel: 'Alasan Penolakan untuk Wali Murid:',
      inputPlaceholder: 'Contoh: Berkas fisik Akta Kelahiran belum diserahkan ke TU...',
      inputValidator: (value) => {
        if (!value) {
          return 'Alasan penolakan wajib diisi agar wali murid dapat mengetahuinya!';
        }
      },
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Tolak Pengajuan',
      cancelButtonText: 'Batal'
    });

    if (!reason) return;

    setIsProcessing(true);
    try {
      const res = await fetch('/api/portal/verifikasi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nisn: reviewStudent.nisn,
          nis: reviewStudent.nis,
          action: 'TU_REJECT',
          adminNotes: reason.trim()
        })
      });

      const json = await res.json();
      if (json.success) {
        Swal.fire({
          icon: 'info',
          title: 'Pengajuan Ditolak',
          text: 'Pemberitahuan penolakan telah diteruskan ke portal wali murid.'
        });
        setReviewStudent(null);
        fetchData();
      } else {
        Swal.fire({ icon: 'error', title: 'Gagal', text: json.error });
      }
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset verification to unverified
  const handleResetVerification = async (s: any) => {
    const confirm = await Swal.fire({
      title: 'Reset Status Verifikasi?',
      text: `Status verifikasi siswa ${s.nama} akan dikembalikan menjadi BELUM DIVERIFIKASI.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonText: 'Batal',
      confirmButtonText: 'Ya, Reset'
    });

    if (!confirm.isConfirmed) return;

    try {
      const res = await fetch('/api/portal/verifikasi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nisn: s.nisn,
          nis: s.nis,
          action: 'BATAL'
        })
      });
      const json = await res.json();
      if (json.success) {
        Swal.fire({ icon: 'success', title: 'Status Di-reset', timer: 1500, showConfirmButton: false });
        fetchData();
      }
    } catch (e: any) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: e.message });
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (filteredStudents.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Tidak Ada Data', text: 'Tidak ada data untuk diekspor.' });
      return;
    }

    const rows = filteredStudents.map((s, idx) => ({
      'No': idx + 1,
      'Kelas': s.kelas || '-',
      'Nama Siswa': s.nama || '-',
      'NISN': s.nisn || '-',
      'NIK': s.nik || '-',
      'ID Siswa (NIS)': s.nis || '-',
      'Tempat, Tanggal Lahir (TTL)': s.ttl || '-',
      'Jenis Kelamin': s.jenisKelamin || '-',
      'Nama Ayah': s.namaAyah || '-',
      'Nama Ibu': s.namaIbu || '-',
      'Status Verifikasi Ortu': s.statusVerifikasi === 'VERIFIED' ? 'TERVERIFIKASI & TERKUNCI' : s.statusVerifikasi === 'MENGAJUKAN_PERBAIKAN' ? 'MENGAJUKAN PERBAIKAN' : 'BELUM VERIFIKASI',
      'Tanggal Verifikasi': s.verifikasiIjazah?.verified_at ? new Date(s.verifikasiIjazah.verified_at).toLocaleDateString('id-ID') : '-',
      'Nama Wali Pemverifikasi': s.verifikasiIjazah?.nama_wali || s.verifikasiIjazah?.nama_pemohon || '-',
      'Hubungan': s.verifikasiIjazah?.hubungan || '-',
      'No. HP / WA Ortu': s.verifikasiIjazah?.no_hp || s.noHp || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Verifikasi Ijazah');
    XLSX.writeFile(wb, `Rekap_Verifikasi_Data_Ijazah_${selectedKelas || 'Semua'}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const formatDate = (isoStr: string) => {
    if (!isoStr) return '-';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className={styles.pageContainer}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 className={styles.pageTitle}>🛡️ Verifikasi Data Ijazah (Wali Murid)</h1>
            <span style={{ fontSize: '0.8rem', padding: '4px 10px', background: '#dbeafe', color: '#1e40af', borderRadius: '16px', fontWeight: 700 }}>
              {stats.total} Siswa Terdaftar
            </span>
          </div>
          <p className={styles.pageDescription}>
            Pusat monitoring dan persetujuan kebenaran data pokok peserta didik oleh orang tua untuk rujukan mutlak pencetakan Ijazah dan Dokumen Kelulusan.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleExportExcel}
            className={styles.primaryButton}
            style={{ padding: '0.6rem 1.1rem', backgroundColor: '#059669', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '0.875rem', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
          >
            <i className="fa-solid fa-file-excel"></i> Export Excel
          </button>
          <Link
            href="/buku-induk"
            className={styles.primaryButton}
            style={{ padding: '0.6rem 1.1rem', backgroundColor: '#475569', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '0.875rem', borderRadius: '8px', textDecoration: 'none' }}
          >
            📖 Cetak Buku Induk
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

      {/* 4 Summary Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div 
          onClick={() => setStatusFilter('ALL')}
          style={{ background: '#ffffff', padding: '16px 20px', borderRadius: '12px', border: statusFilter === 'ALL' ? '2px solid #3b82f6' : '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', cursor: 'pointer', transition: 'all 0.2s' }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>TOTAL SISWA AKTIF</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{stats.total}</div>
          <div style={{ fontSize: '0.75rem', color: '#3b82f6', marginTop: '4px', fontWeight: 600 }}>Tampilkan Semua &rarr;</div>
        </div>

        <div 
          onClick={() => setStatusFilter('MENGAJUKAN_PERBAIKAN')}
          style={{ 
            background: stats.pendingReview > 0 ? '#fffbeb' : '#ffffff', 
            padding: '16px 20px', borderRadius: '12px', 
            border: statusFilter === 'MENGAJUKAN_PERBAIKAN' ? '2px solid #f59e0b' : stats.pendingReview > 0 ? '1.5px solid #fde047' : '1px solid #e2e8f0', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)', cursor: 'pointer', transition: 'all 0.2s' 
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#d97706', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>⏳ PENGAJUAN REVISI</span>
            {stats.pendingReview > 0 && (
              <span style={{ background: '#dc2626', color: 'white', borderRadius: '10px', padding: '1px 6px', fontSize: '10px' }}>PERLU TINDAKAN</span>
            )}
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#b45309', marginTop: '4px' }}>{stats.pendingReview}</div>
          <div style={{ fontSize: '0.75rem', color: '#d97706', marginTop: '4px', fontWeight: 600 }}>Tinjau Permohonan &rarr;</div>
        </div>

        <div 
          onClick={() => setStatusFilter('VERIFIED')}
          style={{ background: '#ffffff', padding: '16px 20px', borderRadius: '12px', border: statusFilter === 'VERIFIED' ? '2px solid #10b981' : '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', cursor: 'pointer', transition: 'all 0.2s' }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' }}>✅ DATA TERVERIFIKASI</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#15803d', marginTop: '4px' }}>{stats.verified}</div>
          <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '4px', fontWeight: 600 }}>Terkunci & Sah &rarr;</div>
        </div>

        <div 
          onClick={() => setStatusFilter('BELUM_VERIFIKASI')}
          style={{ background: '#ffffff', padding: '16px 20px', borderRadius: '12px', border: statusFilter === 'BELUM_VERIFIKASI' ? '2px solid #94a3b8' : '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', cursor: 'pointer', transition: 'all 0.2s' }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>⚠️ BELUM DIVERIFIKASI</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#64748b', marginTop: '4px' }}>{stats.unverified}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', fontWeight: 600 }}>Menunggu Wali Murid &rarr;</div>
        </div>
      </div>

      {/* Main Card */}
      <div className={styles.card}>
        {loading ? (
          <InlineLoading message="Memuat status verifikasi data siswa..." />
        ) : (
          <>
            {/* Filter Section */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'flex-end', background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ flex: '1', minWidth: '180px' }}>
                <label className={styles.label}>Filter Kelas / Rombel</label>
                <select 
                  className={styles.input} 
                  value={selectedKelas} 
                  onChange={(e) => setSelectedKelas(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', background: '#fff' }}
                >
                  <option value="">Semua Kelas ({daftarKelas.length} Rombel)</option>
                  {daftarKelas.map(k => (
                    <option key={k} value={k}>Kelas {k}</option>
                  ))}
                </select>
              </div>

              <div style={{ flex: '1', minWidth: '180px' }}>
                <label className={styles.label}>Status Verifikasi</label>
                <select 
                  className={styles.input} 
                  value={statusFilter} 
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  style={{ width: '100%', boxSizing: 'border-box', background: '#fff', fontWeight: 600 }}
                >
                  <option value="ALL">Semua Status</option>
                  <option value="MENGAJUKAN_PERBAIKAN">⏳ Perlu Tindakan TU ({stats.pendingReview})</option>
                  <option value="VERIFIED">✅ Terverifikasi Ortu ({stats.verified})</option>
                  <option value="BELUM_VERIFIKASI">⚠️ Belum Diverifikasi ({stats.unverified})</option>
                </select>
              </div>

              <div style={{ flex: '2', minWidth: '220px' }}>
                <label className={styles.label}>Cari Siswa</label>
                <input 
                  type="text" 
                  className={styles.input} 
                  style={{ width: '100%', boxSizing: 'border-box', background: '#fff' }}
                  placeholder="Ketik Nama, NISN, atau NIK Siswa..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div>
                <button
                  type="button"
                  onClick={fetchData}
                  style={{ padding: '0.55rem 0.9rem', background: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                >
                  <i className="fa-solid fa-rotate-right"></i> Refresh
                </button>
              </div>
            </div>

            {/* Table */}
            <div className={styles.tableContainer}>
              <table className={styles.table} style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '12px 10px', width: '45px', textAlign: 'center' }}>No</th>
                    <th style={{ padding: '12px 10px', minWidth: '200px' }}>Nama Siswa & Kelas</th>
                    <th style={{ padding: '12px 10px', minWidth: '130px' }}>NISN / NIK</th>
                    <th style={{ padding: '12px 10px', minWidth: '180px' }}>Tempat, Tanggal Lahir (TTL)</th>
                    <th style={{ padding: '12px 10px', minWidth: '160px' }}>Wali Murid</th>
                    <th style={{ padding: '12px 10px', minWidth: '160px' }}>Status Verifikasi</th>
                    <th style={{ padding: '12px 10px', width: '140px', textAlign: 'center' }}>Aksi TU</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                        Tidak ada data siswa yang cocok dengan filter.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((s, idx) => {
                      const ver = s.verifikasiIjazah;
                      const isPending = s.statusVerifikasi === 'MENGAJUKAN_PERBAIKAN';
                      const isVerified = s.statusVerifikasi === 'VERIFIED';

                      return (
                        <tr 
                          key={s.supabaseId || idx} 
                          style={{ 
                            borderBottom: '1px solid #e2e8f0',
                            backgroundColor: isPending ? '#fefce8' : isVerified ? '#f0fdf4' : idx % 2 === 0 ? '#fff' : '#f8fafc'
                          }}
                        >
                          <td style={{ padding: '12px 10px', textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                          
                          <td style={{ padding: '12px 10px' }}>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>{s.nama}</div>
                            <div style={{ fontSize: '0.75rem', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                              <span style={{ background: '#e0f2fe', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>Kelas {s.kelas}</span>
                              <span style={{ color: '#64748b' }}>{s.jenisKelamin === 'L' || s.jenisKelamin === 'LAKI-LAKI' ? 'L' : 'P'}</span>
                            </div>
                          </td>

                          <td style={{ padding: '12px 10px', color: '#334155' }}>
                            <div>NISN: <b>{s.nisn || '-'}</b></div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>NIK: {s.nik || '-'}</div>
                          </td>

                          <td style={{ padding: '12px 10px', color: '#0369a1', fontWeight: 600 }}>
                            {s.ttl || '-'}
                          </td>

                          <td style={{ padding: '12px 10px', color: '#334155' }}>
                            <div>{s.namaAyah ? `A: ${s.namaAyah}` : s.namaIbu ? `I: ${s.namaIbu}` : '-'}</div>
                            {s.noHp && (
                              <div style={{ fontSize: '0.75rem', color: '#16a34a' }}>
                                <i className="fab fa-whatsapp"></i> {s.noHp}
                              </div>
                            )}
                          </td>

                          <td style={{ padding: '12px 10px' }}>
                            {isPending ? (
                              <div>
                                <span style={{ background: '#f59e0b', color: 'white', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <i className="fa-solid fa-clock"></i> ADA REVISI ORTU
                                </span>
                                <div style={{ fontSize: '11px', color: '#b45309', marginTop: '4px' }}>
                                  {(ver?.perbaikan || []).length} Data diusulkan berubah
                                </div>
                              </div>
                            ) : isVerified ? (
                              <div>
                                <span style={{ background: '#10b981', color: 'white', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <i className="fa-solid fa-check-circle"></i> TERVERIFIKASI
                                </span>
                                <div style={{ fontSize: '11px', color: '#166534', marginTop: '3px' }}>
                                  Oleh: {ver?.nama_wali} ({formatDate(ver?.verified_at)})
                                </div>
                              </div>
                            ) : (
                              <span style={{ background: '#e2e8f0', color: '#64748b', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
                                Belum Diverifikasi
                              </span>
                            )}
                          </td>

                          <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                            {isPending ? (
                              <button
                                type="button"
                                onClick={() => setReviewStudent(s)}
                                style={{
                                  padding: '6px 12px',
                                  background: '#f59e0b',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  boxShadow: '0 2px 4px rgba(245, 158, 11, 0.3)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <i className="fa-solid fa-magnifying-glass"></i> Tinjau Revisi
                              </button>
                            ) : isVerified ? (
                              <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => setSptjmStudent(s)}
                                  title="Lihat Dokumen SPTJM"
                                  style={{
                                    padding: '5px 8px', background: '#0284c7', color: 'white', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer'
                                  }}
                                >
                                  <i className="fa-solid fa-file-contract"></i> SPTJM
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleResetVerification(s)}
                                  title="Reset status verifikasi"
                                  style={{
                                    padding: '5px 8px', background: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '11px', cursor: 'pointer'
                                  }}
                                >
                                  <i className="fa-solid fa-rotate-left"></i>
                                </button>
                              </div>
                            ) : (
                              <span style={{ fontSize: '11px', color: '#94a3b8' }}>-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#64748b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>Menampilkan {filteredStudents.length} dari total {students.length} siswa</div>
            </div>
          </>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: TINJAU PENGAJUAN REVISI DARI ORANG TUA (TU WORKFLOW) */}
      {/* ========================================================================= */}
      {reviewStudent && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          backdropFilter: 'blur(3px)'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '600px',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{ padding: '16px 20px', background: '#d97706', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>Tinjau Pengajuan Perbaikan Data</h3>
                <span style={{ fontSize: '12px', opacity: 0.9 }}>Siswa: {reviewStudent.nama} (Kelas {reviewStudent.kelas})</span>
              </div>
              <button 
                onClick={() => setReviewStudent(null)}
                style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              
              {/* Info Pemohon */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px', fontSize: '13px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Nama Pemohon:</span>
                    <strong>{reviewStudent.verifikasiIjazah?.nama_pemohon || '-'}</strong> ({reviewStudent.verifikasiIjazah?.hubungan || 'Wali'})
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>No. WhatsApp:</span>
                    {reviewStudent.verifikasiIjazah?.no_hp ? (
                      <a 
                        href={`https://wa.me/${reviewStudent.verifikasiIjazah.no_hp.replace(/^0/, '62').replace(/[^0-9]/g, '')}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ color: '#16a34a', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <i className="fab fa-whatsapp"></i> {reviewStudent.verifikasiIjazah.no_hp}
                      </a>
                    ) : '-'}
                  </div>
                </div>

                {reviewStudent.verifikasiIjazah?.alasan && (
                  <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed #cbd5e1', fontSize: '12px', color: '#475569' }}>
                    <span style={{ fontWeight: 600, color: '#334155' }}>Alasan / Keterangan Ortu:</span><br/>
                    <em>"{reviewStudent.verifikasiIjazah.alasan}"</em>
                  </div>
                )}
              </div>

              {/* Tabel Perbandingan Perubahan */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                  Perbandingan Data Lama vs Usulan Baru:
                </div>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', textAlign: 'left' }}>
                        <th style={{ padding: '8px 10px', width: '150px' }}>Field Data</th>
                        <th style={{ padding: '8px 10px' }}>Data di Master Sekarang</th>
                        <th style={{ padding: '8px 10px', background: '#f0fdf4', color: '#166534' }}>Usulan Data Baru</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(reviewStudent.verifikasiIjazah?.perbaikan || []).map((p: any, idx: number) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '10px', fontWeight: 700, color: '#0369a1' }}>
                            {p.label || p.field}
                          </td>
                          <td style={{ padding: '10px', color: '#dc2626' }}>
                            <del>{p.dataLama || '-'}</del>
                          </td>
                          <td style={{ padding: '10px', background: '#f0fdf4', color: '#15803d', fontWeight: 700 }}>
                            {p.dataBaru}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Catatan TU */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Catatan Verifikasi Staf TU (Opsional):
                </label>
                <input
                  type="text"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Contoh: Dokumen fisik Akta Kelahiran asli telah diperiksa & cocok"
                  style={{ width: '100%', padding: '8px 10px', boxSizing: 'border-box', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
              </div>

              {/* Notice */}
              <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '10px 12px', borderRadius: '8px', fontSize: '11.5px', color: '#065f46', lineHeight: 1.5 }}>
                <i className="fa-solid fa-circle-check" style={{ marginRight: '5px' }}></i>
                Jika tombol <b>"Setujui & Terapkan"</b> ditekan, sistem akan otomatis meng-update kolom terkait pada data induk siswa di Supabase, dan mengubah statusnya menjadi <b>TERVERIFIKASI & TERKUNCI</b>.
              </div>

            </div>

            {/* Modal Footer */}
            <div style={{ padding: '14px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
              <button
                type="button"
                onClick={handleRejectTU}
                disabled={isProcessing}
                style={{ padding: '9px 14px', background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
              >
                <i className="fa-solid fa-xmark"></i> Tolak Pengajuan
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setReviewStudent(null)}
                  disabled={isProcessing}
                  style={{ padding: '9px 14px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleApproveTU}
                  disabled={isProcessing}
                  style={{
                    padding: '9px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '6px'
                  }}
                >
                  <i className="fa-solid fa-check-double"></i>
                  {isProcessing ? 'Menyimpan...' : 'Setujui & Terapkan Perubahan'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PREVIEW / CETAK SPTJM RESMI SISWA */}
      {/* ========================================================================= */}
      {sptjmStudent && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          backdropFilter: 'blur(3px)'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '560px',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            overflow: 'hidden'
          }}>
            {/* Modal Actions Header (No-Print) */}
            <div style={{ padding: '12px 20px', background: '#1e293b', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-file-contract" style={{ color: '#10b981' }}></i>
                Dokumen SPTJM - {sptjmStudent.nama}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => window.print()}
                  style={{ padding: '6px 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <i className="fa-solid fa-print"></i> Cetak / Simpan PDF
                </button>
                <button
                  onClick={() => setSptjmStudent(null)}
                  style={{ padding: '6px 10px', background: '#475569', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                >
                  Tutup
                </button>
              </div>
            </div>

            {/* Document Body */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, fontFamily: 'serif', color: '#000', background: '#fff' }}>
              <div style={{ textAlign: 'center', borderBottom: '2.5px solid #000', paddingBottom: '10px', marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>YAYASAN PENDIDIKAN ALMAARIF SINGOSARI</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold' }}>MTs ALMAARIF 01 SINGOSARI</div>
                <div style={{ fontSize: '10px', color: '#333' }}>
                  NPSN : 20581318 | NSM : 121235070115<br/>
                  Jl. Masjid No. 33 Pagentan, Kec. Singosari, Kab. Malang, Jawa Timur | admin@mtsalmaarif01-sgs.sch.id
                </div>
              </div>

              <div style={{ textAlign: 'center', marginBottom: '18px' }}>
                <div style={{ fontSize: '13px', fontWeight: 'bold', textDecoration: 'underline' }}>
                  SURAT PERNYATAAN TANGGUNG JAWAB MUTLAK (SPTJM)
                </div>
                <div style={{ fontSize: '11px', fontWeight: 'bold' }}>
                  KEBENARAN DATA PESERTA DIDIK UNTUK PENERBITAN IJAZAH
                </div>
              </div>

              <p style={{ fontSize: '11.5px', lineHeight: 1.6, margin: '0 0 10px 0' }}>
                Yang bertanda tangan di bawah ini:
              </p>

              <table style={{ width: '100%', fontSize: '11.5px', marginBottom: '14px', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ width: '150px', padding: '2px 0' }}>Nama Orang Tua/Wali</td>
                    <td style={{ width: '10px' }}>:</td>
                    <td style={{ fontWeight: 'bold' }}>{sptjmStudent.verifikasiIjazah?.nama_wali || sptjmStudent.namaAyah || '-'}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '2px 0' }}>Hubungan Keluarga</td>
                    <td>:</td>
                    <td>{sptjmStudent.verifikasiIjazah?.hubungan || 'Orang Tua / Wali'}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '2px 0' }}>Orang Tua/Wali Dari</td>
                    <td>:</td>
                    <td style={{ fontWeight: 'bold' }}>{sptjmStudent.nama}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '2px 0' }}>Kelas / Rombel</td>
                    <td>:</td>
                    <td>Kelas {sptjmStudent.kelas}</td>
                  </tr>
                </tbody>
              </table>

              <p style={{ fontSize: '11.5px', lineHeight: 1.6, margin: '0 0 10px 0' }}>
                Menyatakan dengan sesungguhnya bahwa data peserta didik di bawah ini telah saya periksa dengan seksama dan <strong>BENAR SESUAI DOKUMEN NEGARA (Akta Kelahiran dan Kartu Keluarga)</strong>:
              </p>

              <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', marginBottom: '16px', border: '1px solid #000' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #000' }}>
                    <td style={{ padding: '4px 6px', width: '140px', background: '#f5f5f5', borderRight: '1px solid #000' }}>Nama Lengkap Siswa</td>
                    <td style={{ padding: '4px 6px', fontWeight: 'bold' }}>{sptjmStudent.nama}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #000' }}>
                    <td style={{ padding: '4px 6px', background: '#f5f5f5', borderRight: '1px solid #000' }}>Tempat, Tanggal Lahir (TTL)</td>
                    <td style={{ padding: '4px 6px', fontWeight: 'bold' }}>{sptjmStudent.ttl || '-'}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #000' }}>
                    <td style={{ padding: '4px 6px', background: '#f5f5f5', borderRight: '1px solid #000' }}>NISN / NIK</td>
                    <td style={{ padding: '4px 6px' }}>{sptjmStudent.nisn || '-'} / {sptjmStudent.nik || '-'}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #000' }}>
                    <td style={{ padding: '4px 6px', background: '#f5f5f5', borderRight: '1px solid #000' }}>Jenis Kelamin</td>
                    <td style={{ padding: '4px 6px' }}>{sptjmStudent.jenisKelamin || '-'}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #000' }}>
                    <td style={{ padding: '4px 6px', background: '#f5f5f5', borderRight: '1px solid #000' }}>Nama Ayah Kandung</td>
                    <td style={{ padding: '4px 6px' }}>{sptjmStudent.namaAyah || '-'}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #000' }}>
                    <td style={{ padding: '4px 6px', background: '#f5f5f5', borderRight: '1px solid #000' }}>Nama Ibu Kandung</td>
                    <td style={{ padding: '4px 6px' }}>{sptjmStudent.namaIbu || '-'}</td>
                  </tr>
                </tbody>
              </table>

              <p style={{ fontSize: '11px', lineHeight: 1.6, textAlign: 'justify', margin: '0 0 16px 0' }}>
                Data tersebut di atas menjadi <strong>acuan mutlak pencetakan Ijazah, Surat Keterangan Lulus (SKL), dan Raport Buku Induk</strong>. Apabila di kemudian hari ditemukan kesalahan data yang disebabkan oleh kelalaian atau ketidaktelitian pemeriksaan dari pihak kami, maka hal tersebut <strong>sepenuhnya menjadi tanggung jawab Orang Tua/Wali Murid</strong> dan kami menyatakan <strong>TIDAK AKAN MENUNTUT pihak MTs Almaarif 01 Singosari</strong> baik secara perdata maupun pidana.
              </p>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '20px' }}>
                <div style={{ textAlign: 'center', width: '200px' }}>
                  Mengetahui,<br/>
                  Kepala Madrasah<br/><br/><br/><br/>
                  <b>Drs. H. Dedy Dwitagama, M.Pd</b>
                </div>

                <div style={{ textAlign: 'center', width: '220px' }}>
                  Singosari, {sptjmStudent.verifikasiIjazah?.verified_at ? formatDate(sptjmStudent.verifikasiIjazah.verified_at) : '........................'}<br/>
                  Yang Menyatakan (Wali Murid),<br/>
                  <div style={{ margin: '8px auto', padding: '4px', border: '1px dashed #10b981', borderRadius: '4px', background: '#f0fdf4', color: '#166534', fontSize: '9px', width: '170px' }}>
                    <i className="fa-solid fa-circle-check"></i> TERVALIDASI SECARA DIGITAL<br/>
                    Portal Wali Murid
                  </div>
                  <b>{sptjmStudent.verifikasiIjazah?.nama_wali || sptjmStudent.namaAyah || '( ........................................ )'}</b>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
