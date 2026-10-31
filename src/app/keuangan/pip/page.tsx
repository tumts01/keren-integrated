'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import InlineLoading from '@/components/InlineLoading';

interface PipItem {
  id: string;
  periode: string;
  nama_excel: string;
  kelas_excel: string;
  keterangan_excel?: string;

  siswa_id: number | null;
  nama_siswa: string;
  nisn: string;
  rombel: string;
  tingkat: string;
  wali_kelas: string;
  kip?: string;

  match_type: 'exact' | 'fuzzy' | 'unmatched' | 'manual';
  match_score: number;

  status_kelayakan: 'belum_diverifikasi' | 'layak' | 'tidak_layak';
  alasan_tidak_layak?: string;
  catatan_wali?: string;
  verified_by?: string;
  verified_at?: string | null;
  created_at?: string;
  status_siswa?: string;
  is_tidak_aktif?: boolean;
  warning?: string;
}

interface ClassOption {
  rombel: string;
  waliKelas: string;
  tingkat: string;
}

export default function BantuanPipPage() {
  const router = useRouter();

  // Session & Auth
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [myWaliKelas, setMyWaliKelas] = useState<string | null>(null);

  // Data state
  const [items, setItems] = useState<PipItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePeriode, setActivePeriode] = useState('Tahun 2026/2027 - Tahap 1');
  const [periodes, setPeriodes] = useState<string[]>([]);
  const [classesList, setClassesList] = useState<ClassOption[]>([]);
  const [summary, setSummary] = useState<any>({
    total: 0,
    layak: 0,
    tidak_layak: 0,
    belum_diverifikasi: 0,
    per_rombel: {}
  });

  // Filter state
  const [filterKelas, setFilterKelas] = useState('Semua');
  const [filterStatus, setFilterStatus] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');

  // Upload & Preview Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [previewItems, setPreviewItems] = useState<PipItem[]>([]);
  const [previewStats, setPreviewStats] = useState<any>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadMode, setUploadMode] = useState<'append' | 'replace'>('append');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal Verifikasi Manual / Catatan
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PipItem | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<'layak' | 'tidak_layak'>('layak');
  const [alasanTidakLayak, setAlasanTidakLayak] = useState('');
  const [catatanWali, setCatatanWali] = useState('');
  const [savingVerify, setSavingVerify] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(30);

  // Init session & fetch data
  useEffect(() => {
    const sessionStr = localStorage.getItem('keren_user_data');
    if (sessionStr) {
      try {
        const session = JSON.parse(sessionStr);
        setCurrentUser(session);
        const adminCheck = session.role?.toLowerCase() === 'admin' || session.role?.toLowerCase() === 'pimpinan';
        setIsAdmin(adminCheck);
      } catch (e) {
        setIsAdmin(false);
      }
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/keuangan/pip');
      const json = await res.json();
      if (json.success) {
        setItems(json.items || []);
        setActivePeriode(json.active_periode);
        setPeriodes(json.periodes || [json.active_periode]);
        setSummary(json.summary || {});
        setClassesList(json.classes || []);

        // Cek apakah user saat ini adalah Wali Kelas
        const sessionStr = localStorage.getItem('keren_user_data');
        if (sessionStr) {
          try {
            const session = JSON.parse(sessionStr);
            const myName = (session.nama || '').toLowerCase().trim();
            const matched = (json.classes || []).find((c: ClassOption) => {
              if (!c.waliKelas) return false;
              const wName = c.waliKelas.toLowerCase().trim();
              return wName.includes(myName) || myName.includes(wName);
            });

            if (matched) {
              setMyWaliKelas(matched.rombel);
              // Jika bukan admin dan punya kelas wali, langsung set filter ke kelasnya
              const adminCheck = session.role?.toLowerCase() === 'admin' || session.role?.toLowerCase() === 'pimpinan';
              if (!adminCheck) {
                setFilterKelas(matched.rombel);
              }
            }
          } catch (e) {}
        }
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Gagal memuat data Bantuan PIP', 'error');
    } finally {
      setLoading(false);
    }
  };

  // --- FILTERING & PAGINATION ---
  const filteredData = useMemo(() => {
    return items.filter(item => {
      // Filter Rombel
      if (filterKelas !== 'Semua' && item.rombel !== filterKelas) {
        return false;
      }
      // Filter Status
      if (filterStatus !== 'Semua') {
        if (filterStatus === 'tidak_aktif') {
          const isTidakAktif = item.is_tidak_aktif || (item.status_siswa && item.status_siswa !== 'AKTIF');
          if (!isTidakAktif) return false;
        } else {
          const st = item.status_kelayakan || 'belum_diverifikasi';
          if (st !== filterStatus) return false;
        }
      }
      // Filter Search (Nama / NISN / Keterangan)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nama = (item.nama_siswa || item.nama_excel || '').toLowerCase();
        const nisn = (item.nisn || '').toLowerCase();
        const ket = (item.keterangan_excel || '').toLowerCase();
        if (!nama.includes(q) && !nisn.includes(q) && !ket.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [items, filterKelas, filterStatus, searchQuery]);

  const totalPages = itemsPerPage === 999999 ? 1 : Math.ceil(filteredData.length / itemsPerPage) || 1;
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredData.length);
  const paginatedData = itemsPerPage === 999999 ? filteredData : filteredData.slice(startIndex, endIndex);

  // --- AKSI VERIFIKASI ---
  const openVerifyDialog = (item: PipItem, status: 'layak' | 'tidak_layak') => {
    setSelectedItem(item);
    setVerifyStatus(status);
    setAlasanTidakLayak(item.alasan_tidak_layak || '');
    setCatatanWali(item.catatan_wali || '');
    setShowVerifyModal(true);
  };

  const handleSaveVerification = async () => {
    if (!selectedItem) return;
    if (verifyStatus === 'tidak_layak' && !alasanTidakLayak.trim()) {
      Swal.fire('Perhatian', 'Mohon isi alasan siswa dinyatakan Tidak Layak.', 'warning');
      return;
    }

    setSavingVerify(true);
    try {
      const res = await fetch('/api/keuangan/pip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          id: selectedItem.id,
          status_kelayakan: verifyStatus,
          alasan_tidak_layak: alasanTidakLayak,
          catatan_wali: catatanWali,
          verified_by: currentUser?.nama || (myWaliKelas ? `Wali Kelas ${myWaliKelas}` : 'Petugas')
        })
      });
      const json = await res.json();
      if (json.success) {
        setShowVerifyModal(false);
        Swal.fire({
          icon: 'success',
          title: 'Tersimpan!',
          text: `Status verifikasi ${selectedItem.nama_siswa || selectedItem.nama_excel} berhasil disimpan.`,
          timer: 1800,
          showConfirmButton: false
        });
        fetchData();
      } else {
        Swal.fire('Gagal', json.error, 'error');
      }
    } catch (err: any) {
      Swal.fire('Error', err.message, 'error');
    } finally {
      setSavingVerify(false);
    }
  };

  // Quick 1-click verify as Layak
  const handleQuickLayak = async (item: PipItem) => {
    try {
      const res = await fetch('/api/keuangan/pip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          id: item.id,
          status_kelayakan: 'layak',
          alasan_tidak_layak: '',
          catatan_wali: item.catatan_wali || 'Kondisi ekonomi layak menerima PIP',
          verified_by: currentUser?.nama || (myWaliKelas ? `Wali Kelas ${myWaliKelas}` : 'Petugas')
        })
      });
      const json = await res.json();
      if (json.success) {
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: `${item.nama_siswa || item.nama_excel}: Diverifikasi LAYAK`,
          showConfirmButton: false,
          timer: 2000
        });
        fetchData();
      }
    } catch (e) {
      Swal.fire('Error', 'Gagal memverifikasi', 'error');
    }
  };

  // Verifikasi Massal seluruh siswa yang tampil di kelas ini sebagai Layak
  const handleBatchVerifyAllLayak = async () => {
    const unverifiedItems = filteredData.filter(i => {
      const isTidakAktif = i.is_tidak_aktif || (i.status_siswa && i.status_siswa !== 'AKTIF');
      return (i.status_kelayakan || 'belum_diverifikasi') === 'belum_diverifikasi' && !isTidakAktif;
    });
    if (unverifiedItems.length === 0) {
      Swal.fire('Info', 'Seluruh siswa aktif pada filter ini sudah diverifikasi.', 'info');
      return;
    }

    const confirm = await Swal.fire({
      title: 'Verifikasi Massal Layak?',
      text: `Apakah Anda yakin ingin memverifikasi ${unverifiedItems.length} siswa yang belum diverifikasi sebagai LAYAK menerima PIP?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Verifikasi Semua Layak',
      cancelButtonText: 'Batal'
    });

    if (!confirm.isConfirmed) return;

    try {
      const res = await fetch('/api/keuangan/pip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'batch_verify',
          ids: unverifiedItems.map(i => i.id),
          status_kelayakan: 'layak',
          verified_by: currentUser?.nama || (myWaliKelas ? `Wali Kelas ${myWaliKelas}` : 'Petugas')
        })
      });
      const json = await res.json();
      if (json.success) {
        Swal.fire('Berhasil!', json.message, 'success');
        fetchData();
      } else {
        Swal.fire('Gagal', json.error, 'error');
      }
    } catch (e: any) {
      Swal.fire('Error', e.message, 'error');
    }
  };

  // --- UPLOAD & PARSE EXCEL DENGAN SMART FUZZY MATCHING ---
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const rawData: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });

      if (rawData.length < 2) {
        Swal.fire('File Kosong', 'File Excel tidak memiliki baris data.', 'warning');
        setUploadLoading(false);
        return;
      }

      // Deteksi header kolom
      const headerRow = rawData[0].map((h: any) => String(h || '').trim().toUpperCase());
      let colNamaIdx = headerRow.findIndex((h: string) => h.includes('NAMA') || h.includes('SISWA'));
      let colKelasIdx = headerRow.findIndex((h: string) => h.includes('KELAS') || h.includes('TINGKAT'));
      let colKetIdx = headerRow.findIndex((h: string) => h.includes('KET') || h.includes('ALASAN'));

      // Fallback default index jika header tidak bernama standar
      if (colNamaIdx === -1) colNamaIdx = 1;
      if (colKelasIdx === -1) colKelasIdx = 2;
      if (colKetIdx === -1) colKetIdx = 3;

      const rowsPayload: any[] = [];
      for (let r = 1; r < rawData.length; r++) {
        const row = rawData[r];
        if (!row || row.length === 0) continue;
        const nama = row[colNamaIdx];
        const kelas = row[colKelasIdx];
        const ket = colKetIdx !== -1 ? row[colKetIdx] : '';

        if (nama && String(nama).trim().length > 1) {
          rowsPayload.push({
            nama: String(nama).trim(),
            kelas: kelas !== undefined ? String(kelas).trim() : '',
            keterangan: ket ? String(ket).trim() : ''
          });
        }
      }

      if (rowsPayload.length === 0) {
        Swal.fire('Data Tidak Terbaca', 'Tidak ditemukan nama siswa pada file yang diunggah.', 'warning');
        setUploadLoading(false);
        return;
      }

      // Kirim ke API untuk preview match
      const res = await fetch('/api/keuangan/pip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'preview_match',
          rows: rowsPayload,
          periode: activePeriode
        })
      });
      const json = await res.json();

      if (json.success) {
        setPreviewItems(json.items || []);
        setPreviewStats(json.stats || {});
        setShowUploadModal(true);
      } else {
        Swal.fire('Gagal Pencocokan', json.error, 'error');
      }
    } catch (err: any) {
      console.error(err);
      Swal.fire('Error Parse Excel', err.message, 'error');
    } finally {
      setUploadLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Simpan hasil preview upload ke database
  const handleSaveUpload = async () => {
    if (previewItems.length === 0) return;

    setUploadLoading(true);
    try {
      const res = await fetch('/api/keuangan/pip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upload',
          mode: uploadMode,
          periode: activePeriode,
          rows: previewItems.map(i => ({
            nama: i.nama_excel,
            kelas: i.kelas_excel,
            keterangan: i.keterangan_excel
          }))
        })
      });
      const json = await res.json();
      if (json.success) {
        setShowUploadModal(false);
        Swal.fire({
          icon: 'success',
          title: 'Berhasil Disimpan!',
          text: json.message || 'Data calon PIP berhasil disimpan dan siap diverifikasi oleh Wali Kelas.',
          confirmButtonColor: '#0284c7'
        });
        fetchData();
      } else {
        Swal.fire('Gagal Menyimpan', json.error, 'error');
      }
    } catch (err: any) {
      Swal.fire('Error', err.message, 'error');
    } finally {
      setUploadLoading(false);
    }
  };

  // --- DOWNLOAD TEMPLATE & EXPORT REKAP EXCEL ---
  const handleDownloadTemplate = () => {
    window.location.href = '/api/keuangan/pip/template';
  };

  const handleExportExcel = () => {
    if (items.length === 0) {
      Swal.fire('Data Kosong', 'Belum ada data usulan PIP untuk diekspor.', 'info');
      return;
    }

    const exportRows = filteredData.map((d, idx) => ({
      'NO': idx + 1,
      'NAMA SISWA (DATABASE)': d.nama_siswa || d.nama_excel,
      'NAMA SISWA (FILE EXCEL)': d.nama_excel,
      'KELAS': d.rombel || '-',
      'TINGKAT': d.tingkat || d.kelas_excel,
      'NISN': d.nisn || '-',
      'NO. KIP': d.kip || '-',
      'WALI KELAS': d.wali_kelas || '-',
      'STATUS KELAYAKAN': (d.status_kelayakan || 'belum_diverifikasi').toUpperCase(),
      'ALASAN TIDAK LAYAK': d.alasan_tidak_layak || '-',
      'CATATAN WALI KELAS': d.catatan_wali || '-',
      'STATUS KECOCOKAN': `${d.match_score}% (${d.match_type})`,
      'DIVERIFIKASI OLEH': d.verified_by || '-',
      'WAKTU VERIFIKASI': d.verified_at ? new Date(d.verified_at).toLocaleString('id-ID') : '-'
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportRows);

    ws['!cols'] = [
      { wch: 6 },
      { wch: 32 },
      { wch: 28 },
      { wch: 10 },
      { wch: 10 },
      { wch: 15 },
      { wch: 15 },
      { wch: 28 },
      { wch: 22 },
      { wch: 25 },
      { wch: 30 },
      { wch: 18 },
      { wch: 22 },
      { wch: 20 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Rekap Verifikasi PIP');
    const safeKelas = filterKelas !== 'Semua' ? `Kelas_${filterKelas}` : 'Semua_Kelas';
    const filename = `Rekap_Verifikasi_Bantuan_PIP_${safeKelas}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  // Bersihkan data periode ini (Khusus Admin)
  const handleClearPeriod = async () => {
    const confirm = await Swal.fire({
      title: 'Bersihkan Seluruh Data?',
      text: `Data usulan PIP pada ${activePeriode} akan dihapus secara permanen. Lanjutkan?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Bersihkan Data',
      cancelButtonText: 'Batal'
    });

    if (!confirm.isConfirmed) return;

    try {
      const res = await fetch('/api/keuangan/pip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear_period', periode: activePeriode })
      });
      const json = await res.json();
      if (json.success) {
        Swal.fire('Berhasil!', json.message, 'success');
        fetchData();
      }
    } catch (e: any) {
      Swal.fire('Error', e.message, 'error');
    }
  };

  const handleDeleteItem = async (id: string) => {
    const confirm = await Swal.fire({
      title: 'Hapus Siswa?',
      text: 'Data usulan siswa ini akan dihapus dari daftar.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    });
    if (!confirm.isConfirmed) return;

    try {
      const res = await fetch('/api/keuangan/pip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_item', id })
      });
      const json = await res.json();
      if (json.success) {
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Data siswa berhasil dihapus',
          showConfirmButton: false,
          timer: 1500
        });
        fetchData();
      }
    } catch (e: any) {
      Swal.fire('Error', e.message, 'error');
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header Halaman */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700 }}>
              KEUANGAN MADRASAH
            </span>
            <span style={{ background: '#fef3c7', color: '#92400e', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700 }}>
              <i className="fas fa-hand-holding-heart" style={{ marginRight: '4px' }}></i> BANTUAN PIP
            </span>
          </div>
          <h1 style={{ margin: '0 0 6px 0', fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>
            Verifikasi Usulan Bantuan PIP
          </h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>
            Pencocokan data usulan siswa calon penerima Program Indonesia Pintar (PIP) dan verifikasi kelayakan oleh Wali Kelas
          </p>
        </div>

        {/* Action Buttons Top */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={handleDownloadTemplate}
            style={{
              padding: '10px 16px',
              borderRadius: '8px',
              background: '#f8fafc',
              color: '#334155',
              border: '1.5px solid #cbd5e1',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <i className="fas fa-download text-sky-600"></i> Download Template Excel
          </button>

          <button
            onClick={handleExportExcel}
            style={{
              padding: '10px 16px',
              borderRadius: '8px',
              background: '#059669',
              color: 'white',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 4px rgba(5,150,105,0.2)'
            }}
          >
            <i className="fas fa-file-excel"></i> Export Rekap Excel
          </button>

          {isAdmin && (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadLoading}
                style={{
                  padding: '10px 18px',
                  borderRadius: '8px',
                  background: '#0284c7',
                  color: 'white',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: uploadLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 4px rgba(2,132,199,0.3)'
                }}
              >
                <i className={`fas ${uploadLoading ? 'fa-spinner fa-spin' : 'fa-cloud-upload-alt'}`}></i>
                {uploadLoading ? 'Mencocokkan...' : 'Upload Excel Calon PIP'}
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".xlsx,.xls,.csv"
                style={{ display: 'none' }}
              />

              {items.length > 0 && (
                <button
                  onClick={handleClearPeriod}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: '#fef2f2',
                    color: '#ef4444',
                    border: '1px solid #fecaca',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer'
                  }}
                  title="Kosongkan data usulan periode ini"
                >
                  <i className="fas fa-trash-alt"></i>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Banner Wali Kelas Active Information */}
      {myWaliKelas && (
        <div style={{
          background: 'linear-gradient(to right, #0284c7, #0369a1)',
          color: 'white',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          boxShadow: '0 4px 12px rgba(2,132,199,0.15)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '42px', height: '42px', borderRadius: '10px',
              background: 'rgba(255,255,255,0.2)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem'
            }}>
              <i className="fas fa-user-check"></i>
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>
                Selamat Datang, {currentUser?.nama || 'Bapak/Ibu Guru'}
              </div>
              <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>
                Anda terdeteksi sebagai <b>Wali Kelas {myWaliKelas}</b>. Silakan teliti dan verifikasi kelayakan setiap siswa yang diusulkan.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => { setFilterKelas(myWaliKelas); setFilterStatus('belum_diverifikasi'); }}
              style={{
                background: 'white',
                color: '#0369a1',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.84rem',
                cursor: 'pointer'
              }}
            >
              <i className="fas fa-filter"></i> Tampilkan Siswa Kelas Saya
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards Ringkasan */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'white', borderRadius: '12px', padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>TOTAL CALON SISWA</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{summary.total || 0}</div>
            </div>
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#f0f9ff', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
              <i className="fas fa-users"></i>
            </div>
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '8px' }}>
            {filterKelas !== 'Semua' ? `Kelas ${filterKelas}: ${filteredData.length} siswa` : 'Seluruh kelas terdaftar'}
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: '12px', padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.82rem', color: '#16a34a', fontWeight: 600 }}>LAYAK MENERIMA</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#15803d', marginTop: '4px' }}>{summary.layak || 0}</div>
            </div>
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
              <i className="fas fa-check-circle"></i>
            </div>
          </div>
          <div style={{ fontSize: '0.78rem', color: '#16a34a', marginTop: '8px' }}>
            Terverifikasi memenuhi syarat
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: '12px', padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.82rem', color: '#dc2626', fontWeight: 600 }}>TIDAK LAYAK</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#b91c1c', marginTop: '4px' }}>{summary.tidak_layak || 0}</div>
            </div>
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
              <i className="fas fa-times-circle"></i>
            </div>
          </div>
          <div style={{ fontSize: '0.78rem', color: '#dc2626', marginTop: '8px' }}>
            Dinyatakan mampu / tidak sesuai
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: '12px', padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.82rem', color: '#d97706', fontWeight: 600 }}>MENUNGGU VERIFIKASI</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#b45309', marginTop: '4px' }}>{summary.belum_diverifikasi || 0}</div>
            </div>
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
              <i className="fas fa-hourglass-half"></i>
            </div>
          </div>
          <div style={{ fontSize: '0.78rem', color: '#d97706', marginTop: '8px' }}>
            Belum dicek oleh wali kelas
          </div>
        </div>

        {Boolean(summary.tidak_aktif && summary.tidak_aktif > 0) && (
          <div
            onClick={() => setFilterStatus(filterStatus === 'tidak_aktif' ? 'Semua' : 'tidak_aktif')}
            style={{
              background: filterStatus === 'tidak_aktif' ? '#fee2e2' : 'white',
              borderRadius: '12px',
              padding: '18px 20px',
              border: filterStatus === 'tidak_aktif' ? '2px solid #ef4444' : '1px solid #fecaca',
              boxShadow: '0 1px 3px rgba(239, 68, 68, 0.1)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.82rem', color: '#b91c1c', fontWeight: 700 }}>TIDAK AKTIF / MUTASI</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#991b1b', marginTop: '4px' }}>{summary.tidak_aktif}</div>
              </div>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#fee2e2', color: '#b91c1c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
                <i className="fas fa-user-slash"></i>
              </div>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#b91c1c', marginTop: '8px', fontWeight: 600 }}>
              {filterStatus === 'tidak_aktif' ? '✕ Reset Filter' : '🔴 Klik untuk filter'}
            </div>
          </div>
        )}
      </div>

      {/* Main Content Card */}
      <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        {/* Filter Bar */}
        <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', background: '#fafafa', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
            {/* Filter Kelas */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                Filter Rombel / Kelas:
              </label>
              <select
                value={filterKelas}
                onChange={(e) => { setFilterKelas(e.target.value); setCurrentPage(1); }}
                style={{ padding: '8px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', outline: 'none', fontWeight: 600, fontSize: '0.88rem', background: 'white' }}
              >
                <option value="Semua">Semua Kelas ({items.length})</option>
                {classesList.map(c => {
                  const count = summary.per_rombel?.[c.rombel]?.total || 0;
                  return (
                    <option key={c.rombel} value={c.rombel}>
                      Kelas {c.rombel} {count > 0 ? `(${count} calon)` : ''} {c.waliKelas ? `- ${c.waliKelas.split(',')[0]}` : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Filter Status */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                Status Verifikasi:
              </label>
              <select
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                style={{ padding: '8px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', outline: 'none', fontWeight: 600, fontSize: '0.88rem', background: 'white' }}
              >
                <option value="Semua">Semua Status</option>
                <option value="belum_diverifikasi">Menunggu Verifikasi</option>
                <option value="layak">Layak Menerima</option>
                <option value="tidak_layak">Tidak Layak</option>
                {Boolean(summary.tidak_aktif && summary.tidak_aktif > 0) && (
                  <option value="tidak_aktif">🔴 Siswa Tidak Aktif ({summary.tidak_aktif})</option>
                )}
              </select>
            </div>

            {/* Search Input */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                Cari Siswa / NISN:
              </label>
              <div style={{ position: 'relative' }}>
                <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}></i>
                <input
                  type="text"
                  placeholder="Ketik nama / NISN..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  style={{ padding: '8px 12px 8px 34px', borderRadius: '8px', border: '1.5px solid #cbd5e1', outline: 'none', fontSize: '0.88rem', minWidth: '220px' }}
                />
              </div>
            </div>
          </div>

          {/* Quick Action: Verifikasi Massal Layak */}
          {filteredData.some(i => (i.status_kelayakan || 'belum_diverifikasi') === 'belum_diverifikasi') && (
            <button
              onClick={handleBatchVerifyAllLayak}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                background: '#10b981',
                color: 'white',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.84rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 4px rgba(16,185,129,0.2)'
              }}
            >
              <i className="fas fa-check-double"></i> Verifikasi Semua Tampil Sebagai Layak
            </button>
          )}
        </div>

        {/* Table Body */}
        {loading ? (
          <div style={{ padding: '60px 0', textAlign: 'center' }}>
            <InlineLoading message="Memuat data usulan Bantuan PIP..." />
          </div>
        ) : filteredData.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#f1f5f9', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', margin: '0 auto 16px auto' }}>
              <i className="fas fa-folder-open"></i>
            </div>
            <h3 style={{ margin: '0 0 6px 0', color: '#334155', fontSize: '1.15rem' }}>Belum Ada Data Usulan PIP</h3>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', maxWidth: '480px', marginInline: 'auto' }}>
              {items.length === 0
                ? 'Admin madrasah dapat mengunggah file Excel berisi nama dan kelas siswa menggunakan tombol "Upload Excel Calon PIP" di atas.'
                : 'Tidak ada data yang cocok dengan filter yang dipilih.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', color: '#334155', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '14px 16px', width: '50px' }}>No</th>
                  <th style={{ padding: '14px 16px' }}>Siswa (Hasil Cocok Sistem)</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center' }}>Kelas (Rombel)</th>
                  <th style={{ padding: '14px 16px' }}>Wali Kelas</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center' }}>Kecocokan</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center' }}>Status Kelayakan</th>
                  <th style={{ padding: '14px 16px' }}>Catatan / Alasan</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center', width: '180px' }}>Aksi Verifikasi</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((item, idx) => {
                  const globalIdx = startIndex + idx + 1;
                  const isVerified = item.status_kelayakan === 'layak' || item.status_kelayakan === 'tidak_layak';
                  const isLayak = item.status_kelayakan === 'layak';
                  const canVerify = isAdmin || (myWaliKelas && item.rombel === myWaliKelas);
                  const isTidakAktif = item.is_tidak_aktif || (item.status_siswa && item.status_siswa !== 'AKTIF');

                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: isTidakAktif ? '#fee2e2' : !isVerified ? '#ffffff' : isLayak ? '#f0fdf4' : '#fef2f2',
                        borderLeft: isTidakAktif ? '4px solid #ef4444' : '4px solid transparent',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <td style={{ padding: '14px 16px', fontWeight: 600, color: isTidakAktif ? '#991b1b' : '#64748b' }}>
                        {globalIdx}
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, color: isTidakAktif ? '#991b1b' : '#0f172a', fontSize: '0.95rem' }}>
                            {item.nama_siswa || item.nama_excel}
                          </span>
                          {isTidakAktif && (
                            <span style={{
                              background: '#ef4444',
                              color: '#ffffff',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              fontWeight: 800,
                              letterSpacing: '0.3px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <i className="fas fa-user-times" style={{ fontSize: '0.65rem' }}></i>
                              {item.status_siswa && item.status_siswa !== 'AKTIF' ? item.status_siswa : 'TIDAK AKTIF / MUTASI'}
                            </span>
                          )}
                        </div>
                        {item.nama_excel !== item.nama_siswa && (
                          <div style={{ fontSize: '0.78rem', color: isTidakAktif ? '#b91c1c' : '#64748b', marginTop: '2px' }}>
                            <i className="fas fa-file-excel" style={{ marginRight: '4px', color: isTidakAktif ? '#ef4444' : '#10b981' }}></i>
                            Nama di Excel: <i>{item.nama_excel}</i>
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px', fontSize: '0.78rem', color: isTidakAktif ? '#991b1b' : '#64748b' }}>
                          <span>NISN: <b>{item.nisn || '-'}</b></span>
                          {item.kip && (
                            <span style={{ background: '#fef3c7', color: '#b45309', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                              KIP: {item.kip}
                            </span>
                          )}
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          background: isTidakAktif ? '#fecaca' : item.rombel ? '#e0f2fe' : '#f1f5f9',
                          color: isTidakAktif ? '#991b1b' : item.rombel ? '#0369a1' : '#64748b',
                          fontWeight: 800,
                          fontSize: '0.9rem'
                        }}>
                          {item.rombel ? `Kelas ${item.rombel}` : `Tk. ${item.kelas_excel}`}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: isTidakAktif ? '#991b1b' : '#334155' }}>
                          {item.wali_kelas || '-'}
                        </div>
                        {myWaliKelas && item.rombel === myWaliKelas && (
                          <span style={{ fontSize: '0.72rem', background: '#dcfce7', color: '#15803d', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                            Kelas Anda
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: isTidakAktif ? '#fee2e2' : item.match_type === 'exact' ? '#dcfce7' : item.match_type === 'fuzzy' ? '#e0f2fe' : '#fee2e2',
                          color: isTidakAktif ? '#b91c1c' : item.match_type === 'exact' ? '#15803d' : item.match_type === 'fuzzy' ? '#0369a1' : '#b91c1c'
                        }}>
                          <i className={`fas ${isTidakAktif ? 'fa-ban' : item.match_type === 'exact' ? 'fa-check-circle' : item.match_type === 'fuzzy' ? 'fa-search' : 'fa-exclamation-triangle'}`}></i>
                          {item.match_score}% {item.match_type === 'exact' ? 'Cocok' : item.match_type === 'fuzzy' ? 'Mirip' : 'Unmatched'}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        {isTidakAktif ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '20px', background: '#ef4444', color: 'white', fontWeight: 800, fontSize: '0.82rem', border: '1px solid #dc2626' }}>
                            <i className="fas fa-user-slash"></i> TIDAK AKTIF
                          </span>
                        ) : item.status_kelayakan === 'layak' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '20px', background: '#dcfce7', color: '#15803d', fontWeight: 800, fontSize: '0.82rem', border: '1px solid #86efac' }}>
                            <i className="fas fa-check-circle"></i> LAYAK
                          </span>
                        ) : item.status_kelayakan === 'tidak_layak' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '20px', background: '#fee2e2', color: '#b91c1c', fontWeight: 800, fontSize: '0.82rem', border: '1px solid #fca5a5' }}>
                            <i className="fas fa-times-circle"></i> TIDAK LAYAK
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '20px', background: '#fef3c7', color: '#b45309', fontWeight: 700, fontSize: '0.8rem', border: '1px solid #fde68a' }}>
                            <i className="fas fa-clock"></i> Belum Dicek
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        {isTidakAktif ? (
                          <div>
                            <div style={{ color: '#b91c1c', fontWeight: 700, fontSize: '0.82rem' }}>
                              <i className="fas fa-exclamation-triangle" style={{ marginRight: '4px' }}></i>
                              Siswa Mutasi / Tidak Aktif
                            </div>
                            {item.alasan_tidak_layak && (
                              <div style={{ fontSize: '0.78rem', color: '#7f1d1d', marginTop: '2px' }}>
                                {item.alasan_tidak_layak}
                              </div>
                            )}
                          </div>
                        ) : (
                          <>
                            {item.status_kelayakan === 'tidak_layak' && (
                              <div style={{ color: '#b91c1c', fontWeight: 600, fontSize: '0.82rem', marginBottom: '2px' }}>
                                Alasan: {item.alasan_tidak_layak || '-'}
                              </div>
                            )}
                            <div style={{ color: '#475569', fontSize: '0.82rem' }}>
                              {item.catatan_wali || item.keterangan_excel || '-'}
                            </div>
                            {item.verified_by && (
                              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px' }}>
                                Diverifikasi oleh: <b>{item.verified_by}</b>
                              </div>
                            )}
                          </>
                        )}
                      </td>

                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        {isTidakAktif ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '6px 14px',
                              borderRadius: '6px',
                              background: '#ef4444',
                              color: '#ffffff',
                              fontWeight: 800,
                              fontSize: '0.8rem',
                              letterSpacing: '0.3px',
                              boxShadow: '0 1px 2px rgba(239, 68, 68, 0.25)'
                            }}>
                              <i className="fas fa-user-slash"></i> Tidak Aktif
                            </span>
                            {isAdmin && (
                              <button
                                onClick={() => handleDeleteItem(item.id)}
                                title="Hapus Usulan Siswa Ini"
                                style={{
                                  padding: '6px 8px',
                                  borderRadius: '6px',
                                  background: '#ffffff',
                                  color: '#dc2626',
                                  border: '1px solid #fca5a5',
                                  cursor: 'pointer',
                                  fontSize: '0.78rem'
                                }}
                              >
                                <i className="fas fa-trash-alt"></i>
                              </button>
                            )}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            <button
                              onClick={() => handleQuickLayak(item)}
                              title="Verifikasi Layak Menerima PIP"
                              style={{
                                padding: '6px 10px',
                                borderRadius: '6px',
                                background: '#10b981',
                                color: 'white',
                                border: 'none',
                                cursor: 'pointer',
                                fontWeight: 700,
                                fontSize: '0.78rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <i className="fas fa-check"></i> Layak
                            </button>

                            <button
                              onClick={() => openVerifyDialog(item, 'tidak_layak')}
                              title="Tandai Tidak Layak Menerima PIP"
                              style={{
                                padding: '6px 10px',
                                borderRadius: '6px',
                                background: '#ef4444',
                                color: 'white',
                                border: 'none',
                                cursor: 'pointer',
                                fontWeight: 700,
                                fontSize: '0.78rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <i className="fas fa-times"></i> Tidak Layak
                            </button>

                            <button
                              onClick={() => openVerifyDialog(item, item.status_kelayakan === 'tidak_layak' ? 'tidak_layak' : 'layak')}
                              title="Ubah Catatan / Detail Verifikasi"
                              style={{
                                padding: '6px 8px',
                                borderRadius: '6px',
                                background: '#f1f5f9',
                                color: '#475569',
                                border: '1px solid #cbd5e1',
                                cursor: 'pointer',
                                fontSize: '0.78rem'
                              }}
                            >
                              <i className="fas fa-edit"></i>
                            </button>

                            {isAdmin && (
                              <button
                                onClick={() => handleDeleteItem(item.id)}
                                title="Hapus Usulan Siswa Ini"
                                style={{
                                  padding: '6px 8px',
                                  borderRadius: '6px',
                                  background: '#ffffff',
                                  color: '#dc2626',
                                  border: '1px solid #fca5a5',
                                  cursor: 'pointer',
                                  fontSize: '0.78rem'
                                }}
                              >
                                <i className="fas fa-trash-alt"></i>
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {filteredData.length > 0 && (
          <div style={{
            padding: '16px 20px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '14px',
            background: '#f8fafc'
          }}>
            <div style={{ fontSize: '0.86rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 600 }}>Tampilkan:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  style={{ padding: '5px 10px', borderRadius: '6px', border: '1.5px solid #cbd5e1', outline: 'none', background: 'white', fontWeight: 600, fontSize: '0.84rem' }}
                >
                  <option value={30}>30 per halaman</option>
                  <option value={50}>50 per halaman</option>
                  <option value={100}>100 per halaman</option>
                  <option value={999999}>Semua</option>
                </select>
              </div>
              <span>
                Menampilkan <b>{startIndex + 1} - {endIndex}</b> dari total <b>{filteredData.length}</b> calon siswa
              </span>
            </div>

            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={safeCurrentPage === 1}
                  style={{
                    padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '6px',
                    background: safeCurrentPage === 1 ? '#f1f5f9' : 'white', cursor: safeCurrentPage === 1 ? 'not-allowed' : 'pointer',
                    color: safeCurrentPage === 1 ? '#94a3b8' : '#334155', fontSize: '0.84rem', fontWeight: 600
                  }}
                >
                  Sebelumnya
                </button>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, padding: '0 8px', color: '#0284c7' }}>
                  Halaman {safeCurrentPage} dari {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={safeCurrentPage === totalPages}
                  style={{
                    padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '6px',
                    background: safeCurrentPage === totalPages ? '#f1f5f9' : 'white', cursor: safeCurrentPage === totalPages ? 'not-allowed' : 'pointer',
                    color: safeCurrentPage === totalPages ? '#94a3b8' : '#334155', fontSize: '0.84rem', fontWeight: 600
                  }}
                >
                  Selanjutnya
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* --- MODAL DIALOG PREVIEW MATCH DARI EXCEL --- */}
      {showUploadModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '20px'
        }}>
          <div style={{
            background: 'white', borderRadius: '16px', width: '100%', maxWidth: '900px',
            maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', background: '#0284c7', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fas fa-magic"></i> Hasil Pencocokan Cerdas Data Excel
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', opacity: 0.9 }}>
                  Sistem otomatis mencocokkan nama dan tingkat kelas (7/8/9) dengan database siswa aktif madrasah
                </p>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '1.3rem', cursor: 'pointer' }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Statistik Match */}
            <div style={{ padding: '16px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <span style={{ background: '#dcfce7', color: '#15803d', padding: '6px 12px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700 }}>
                  <i className="fas fa-check-circle"></i> 100% Cocok: <b>{previewStats?.exactCount || 0}</b> siswa
                </span>
                <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '6px 12px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700 }}>
                  <i className="fas fa-search"></i> Mirip ({'>'}=80%): <b>{previewStats?.fuzzyCount || 0}</b> siswa
                </span>
                {previewStats?.inactiveCount > 0 && (
                  <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '6px 12px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700 }}>
                    <i className="fas fa-user-slash"></i> Tidak Aktif: <b>{previewStats?.inactiveCount}</b> siswa
                  </span>
                )}
                {previewStats?.unmatchedCount > 0 && (
                  <span style={{ background: '#fef2f2', color: '#dc2626', padding: '6px 12px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700 }}>
                    <i className="fas fa-exclamation-triangle"></i> Tidak Ditemukan: <b>{previewStats?.unmatchedCount}</b> siswa
                  </span>
                )}
              </div>

              {/* Pilihan Mode Append/Replace */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>
                <span>Opsi:</span>
                <select
                  value={uploadMode}
                  onChange={(e: any) => setUploadMode(e.target.value)}
                  style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}
                >
                  <option value="append">Tambah ke data yang sudah ada</option>
                  <option value="replace">Gantikan (Timpa) seluruh data periode ini</option>
                </select>
              </div>
            </div>

            {/* Preview Table */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', color: '#334155', textAlign: 'left', borderBottom: '2px solid #cbd5e1' }}>
                    <th style={{ padding: '10px 12px' }}>Nama di Excel</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Tk. Excel</th>
                    <th style={{ padding: '10px 12px' }}>Siswa Cocok di Database</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Rombel Asli</th>
                    <th style={{ padding: '10px 12px' }}>Wali Kelas</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Status / Skor Cocok</th>
                  </tr>
                </thead>
                <tbody>
                  {previewItems.map((p, idx) => {
                    const isTidakAktif = p.is_tidak_aktif || (p.status_siswa && p.status_siswa !== 'AKTIF');
                    return (
                      <tr
                        key={idx}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          background: isTidakAktif ? '#fee2e2' : p.match_type === 'exact' ? '#ffffff' : p.match_type === 'fuzzy' ? '#f0f9ff' : '#fef2f2',
                          borderLeft: isTidakAktif ? '4px solid #ef4444' : '4px solid transparent'
                        }}
                      >
                        <td style={{ padding: '10px 12px', fontWeight: 600 }}>{p.nama_excel}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>{p.kelas_excel}</td>
                        <td style={{ padding: '10px 12px', fontWeight: 700, color: isTidakAktif ? '#991b1b' : p.nama_siswa ? '#0f172a' : '#ef4444' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span>{p.nama_siswa || 'Tidak ditemukan di database'}</span>
                            {isTidakAktif && (
                              <span style={{
                                background: '#ef4444',
                                color: 'white',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontSize: '0.68rem',
                                fontWeight: 800
                              }}>
                                {p.status_siswa || 'TIDAK AKTIF / MUTASI'}
                              </span>
                            )}
                          </div>
                          {p.warning && (
                            <div style={{ fontSize: '0.72rem', color: '#dc2626', fontWeight: 500, marginTop: '2px' }}>
                              <i className="fas fa-exclamation-triangle" style={{ marginRight: '3px' }}></i>
                              {p.warning}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <span style={{ padding: '2px 8px', borderRadius: '4px', background: isTidakAktif ? '#fecaca' : p.rombel ? '#e0f2fe' : '#f1f5f9', color: isTidakAktif ? '#991b1b' : p.rombel ? '#0369a1' : '#64748b', fontWeight: 700 }}>
                            {p.rombel ? `Kelas ${p.rombel}` : '-'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', color: isTidakAktif ? '#991b1b' : '#475569', fontSize: '0.82rem' }}>{p.wali_kelas || '-'}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          {isTidakAktif ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              fontWeight: 800,
                              background: '#ef4444',
                              color: 'white'
                            }}>
                              <i className="fas fa-ban"></i> TIDAK AKTIF
                            </span>
                          ) : (
                            <span style={{
                              padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700,
                              background: p.match_type === 'exact' ? '#dcfce7' : p.match_type === 'fuzzy' ? '#e0f2fe' : '#fee2e2',
                              color: p.match_type === 'exact' ? '#15803d' : p.match_type === 'fuzzy' ? '#0369a1' : '#b91c1c'
                            }}>
                              {p.match_score}%
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                disabled={uploadLoading}
                style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#64748b', fontWeight: 600, cursor: 'pointer' }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveUpload}
                disabled={uploadLoading}
                style={{
                  padding: '10px 24px', borderRadius: '8px', background: '#0284c7', color: 'white', border: 'none',
                  fontWeight: 700, cursor: uploadLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
                }}
              >
                <i className={`fas ${uploadLoading ? 'fa-spinner fa-spin' : 'fa-check'}`}></i>
                {uploadLoading ? 'Menyimpan...' : 'Simpan & Kirim ke Wali Kelas'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL VERIFIKASI KELAYAKAN OLEH WALI KELAS --- */}
      {showVerifyModal && selectedItem && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '20px'
        }}>
          <div style={{
            background: 'white', borderRadius: '16px', width: '100%', maxWidth: '520px',
            overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
          }}>
            {/* Header */}
            <div style={{ padding: '18px 24px', background: verifyStatus === 'layak' ? '#059669' : '#dc2626', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className={`fas ${verifyStatus === 'layak' ? 'fa-check-circle' : 'fa-times-circle'}`}></i>
                Form Verifikasi Kelayakan PIP
              </h3>
              <button
                onClick={() => setShowVerifyModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '24px' }}>
              {/* Profil Singkat Siswa */}
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>
                  {selectedItem.nama_siswa || selectedItem.nama_excel}
                </div>
                <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '4px', display: 'flex', gap: '12px' }}>
                  <span>Kelas: <b>{selectedItem.rombel || '-'}</b></span>
                  <span>NISN: <b>{selectedItem.nisn || '-'}</b></span>
                  {selectedItem.kip && <span>KIP: <b>{selectedItem.kip}</b></span>}
                </div>
                {selectedItem.keterangan_excel && (
                  <div style={{ fontSize: '0.8rem', color: '#0369a1', marginTop: '6px' }}>
                    Usulan Panitia: <i>{selectedItem.keterangan_excel}</i>
                  </div>
                )}
              </div>

              {/* Pilihan Status */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.88rem', color: '#334155', marginBottom: '8px' }}>
                  Status Kelayakan:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setVerifyStatus('layak')}
                    style={{
                      padding: '12px', borderRadius: '10px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
                      border: `2px solid ${verifyStatus === 'layak' ? '#10b981' : '#e2e8f0'}`,
                      background: verifyStatus === 'layak' ? '#ecfdf5' : '#ffffff',
                      color: verifyStatus === 'layak' ? '#065f46' : '#64748b',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                    }}
                  >
                    <i className="fas fa-check-circle" style={{ color: verifyStatus === 'layak' ? '#10b981' : '#94a3b8' }}></i>
                    LAYAK
                  </button>

                  <button
                    type="button"
                    onClick={() => setVerifyStatus('tidak_layak')}
                    style={{
                      padding: '12px', borderRadius: '10px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
                      border: `2px solid ${verifyStatus === 'tidak_layak' ? '#ef4444' : '#e2e8f0'}`,
                      background: verifyStatus === 'tidak_layak' ? '#fef2f2' : '#ffffff',
                      color: verifyStatus === 'tidak_layak' ? '#991b1b' : '#64748b',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                    }}
                  >
                    <i className="fas fa-times-circle" style={{ color: verifyStatus === 'tidak_layak' ? '#ef4444' : '#94a3b8' }}></i>
                    TIDAK LAYAK
                  </button>
                </div>
              </div>

              {/* Alasan jika Tidak Layak */}
              {verifyStatus === 'tidak_layak' && (
                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.88rem', color: '#991b1b', marginBottom: '6px' }}>
                    Alasan Tidak Layak: <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    value={alasanTidakLayak}
                    onChange={(e) => setAlasanTidakLayak(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #fca5a5', outline: 'none', fontSize: '0.88rem', marginBottom: '8px' }}
                  >
                    <option value="">-- Pilih Alasan Utama --</option>
                    <option value="Keluarga mampu secara ekonomi">Keluarga mampu secara ekonomi</option>
                    <option value="Orang tua ASN / PNS / TNI / POLRI">Orang tua ASN / PNS / TNI / POLRI</option>
                    <option value="Orang tua BUMN / Karyawan Mampu">Orang tua BUMN / Karyawan Mampu</option>
                    <option value="Siswa sudah pindah / mutasi">Siswa sudah pindah / mutasi</option>
                    <option value="Sudah menerima beasiswa / bantuan lain yang sejenis">Sudah menerima beasiswa / bantuan lain</option>
                    <option value="Lainnya">Alasan Lainnya (tulis di catatan)</option>
                  </select>
                </div>
              )}

              {/* Catatan Tambahan Wali Kelas */}
              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.88rem', color: '#334155', marginBottom: '6px' }}>
                  Catatan / Keterangan Tambahan Wali Kelas:
                </label>
                <textarea
                  rows={3}
                  placeholder="Ketik catatan kondisi ekonomi siswa, keadaan rumah, dsb..."
                  value={catatanWali}
                  onChange={(e) => setCatatanWali(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', outline: 'none', fontSize: '0.88rem', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowVerifyModal(false)}
                disabled={savingVerify}
                style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#64748b', fontWeight: 600, cursor: 'pointer' }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveVerification}
                disabled={savingVerify}
                style={{
                  padding: '10px 22px', borderRadius: '8px',
                  background: verifyStatus === 'layak' ? '#059669' : '#dc2626',
                  color: 'white', border: 'none', fontWeight: 700, cursor: savingVerify ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: '8px'
                }}
              >
                <i className={`fas ${savingVerify ? 'fa-spinner fa-spin' : 'fa-save'}`}></i>
                {savingVerify ? 'Menyimpan...' : 'Simpan Verifikasi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
