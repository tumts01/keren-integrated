'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import InlineLoading from '@/components/InlineLoading';

interface LogKecurangan {
  jenis: string;
  waktu: string;
  ke: number;
}

interface PesertaCBT {
  id: string;
  nomor_peserta: string;
  nama: string;
  asal_sekolah: string;
  cabang_lomba: string;
  username_cbt: string;
  password_cbt: string;
  no_wa: string;
  status: 'belum_mulai' | 'sedang_mengerjakan' | 'selesai';
  terjawab: number;
  total_soal: number;
  nilai_akhir: string | null;
  waktu_mulai: string | null;
  waktu_selesai: string | null;
  sisa_waktu_detik: number | null;
  durasi_menit: number | null;
  log_kecurangan: LogKecurangan[];
  jumlah_pelanggaran: number;
}

interface SummaryStats {
  total_peserta: number;
  belum_mulai: number;
  sedang_mengerjakan: number;
  selesai: number;
  ada_pelanggaran: number;
}

export default function CbtMonitoringPage() {
  const router = useRouter();

  const [data, setData] = useState<PesertaCBT[]>([]);
  const [summary, setSummary] = useState<SummaryStats>({
    total_peserta: 0,
    belum_mulai: 0,
    sedang_mengerjakan: 0,
    selesai: 0,
    ada_pelanggaran: 0,
  });

  const [loading, setLoading] = useState(true);
  const [filterCabang, setFilterCabang] = useState('Semua');
  const [filterStatus, setFilterStatus] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [countdown, setCountdown] = useState(15);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedPesertaLog, setSelectedPesertaLog] = useState<PesertaCBT | null>(null);
  const [cbtBuka, setCbtBuka] = useState(false);

  const REFRESH_INTERVAL = 15; // Detik

  // Fetch data
  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch('/api/cbt/monitoring');
      const json = await res.json();
      if (json.success) {
        setData(json.data || []);
        if (json.summary) setSummary(json.summary);
      } else {
        if (!silent) Swal.fire('Gagal', json.error || 'Gagal memuat data monitoring', 'error');
      }
    } catch (err: any) {
      if (!silent) Swal.fire('Error', err.message, 'error');
    } finally {
      if (!silent) setLoading(false);
      setCountdown(REFRESH_INTERVAL);
    }
  };

  const fetchCbtConfig = async () => {
    try {
      const res = await fetch('/api/olimpiade-seni/config-cbt');
      const json = await res.json();
      if (json.success) {
        setCbtBuka(json.cbt_buka);
      }
    } catch {
      // silent
    }
  };

  const handleToggleCbt = async () => {
    try {
      const newVal = !cbtBuka;
      const res = await fetch('/api/olimpiade-seni/config-cbt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buka: newVal }),
      });
      const resJson = await res.json();
      if (resJson.success) {
        setCbtBuka(newVal);
        Swal.fire({
          icon: 'success',
          title: newVal ? 'Ujian CBT Dibuka' : 'Ujian CBT Ditutup',
          text: newVal
            ? 'Peserta sekarang dapat login dan mengerjakan soal ujian.'
            : 'Portal ujian CBT telah disembunyikan/dikunci dari siswa.',
          timer: 2000,
        });
      }
    } catch (err: any) {
      Swal.fire('Error', err.message, 'error');
    }
  };

  useEffect(() => {
    fetchData();
    fetchCbtConfig();
  }, []);

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchData(true);
          return REFRESH_INTERVAL;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoRefresh]);

  // Aksi Kelola Sesi
  const handleAction = async (action: string, p: PesertaCBT, extraBody: any = {}) => {
    let confirmTitle = '';
    let confirmText = '';
    let confirmBtn = 'Ya, Lanjutkan';
    let confirmColor = '#0284c7';

    if (action === 'reset_sesi_full') {
      confirmTitle = `Reset Penuh Sesi ${p.nama}?`;
      confirmText = `Semua jawaban dan status pengerjaan peserta ini akan DIHAPUS dari sistem. Peserta dapat memulai ujian lagi dari soal pertama.`;
      confirmBtn = 'Ya, Reset dari Awal';
      confirmColor = '#dc2626';
    } else if (action === 'reopen_sesi') {
      confirmTitle = `Buka Kunci Sesi ${p.nama}?`;
      confirmText = `Sesi akan dikembalikan ke status 'Sedang Mengerjakan'. Jawaban yang telah tersimpan TIDAK akan hilang, dan peserta diberi tambahan waktu untuk melanjutkan.`;
      confirmBtn = 'Ya, Buka Kunci Sesi';
      confirmColor = '#059669';
    } else if (action === 'reset_pelanggaran') {
      confirmTitle = `Reset Pelanggaran ${p.nama}?`;
      confirmText = `Riwayat ${p.jumlah_pelanggaran}x peringatan anti-cheat peserta ini akan dibersihkan kembali ke 0x.`;
      confirmBtn = 'Ya, Bersihkan Peringatan';
      confirmColor = '#7c3aed';
    } else if (action === 'tambah_waktu') {
      const { value: menit } = await Swal.fire({
        title: `Tambah Waktu Ujian: ${p.nama}`,
        text: 'Masukkan jumlah menit tambahan pengerjaan (misal untuk kompensasi listrik/internet padam):',
        input: 'select',
        inputOptions: {
          '10': '+10 Menit',
          '15': '+15 Menit',
          '20': '+20 Menit',
          '30': '+30 Menit',
          '45': '+45 Menit',
          '60': '+60 Menit',
        },
        inputValue: '15',
        showCancelButton: true,
        confirmButtonText: 'Tambah Waktu',
        cancelButtonText: 'Batal',
        confirmButtonColor: '#0284c7',
      });
      if (!menit) return;
      extraBody.menit = parseInt(menit, 10);
      confirmTitle = `Tambahkan +${menit} Menit?`;
      confirmText = `Waktu ujian peserta ${p.nama} akan ditambah ${menit} menit.`;
    } else if (action === 'force_submit') {
      confirmTitle = `Selesaikan Ujian ${p.nama}?`;
      confirmText = `Sesi ujian akan diakhiri secara manual oleh pengawas sekarang, dan jawaban yang ada akan langsung dinilai.`;
      confirmBtn = 'Ya, Selesaikan';
      confirmColor = '#ea580c';
    }

    if (action !== 'tambah_waktu') {
      const confirm = await Swal.fire({
        title: confirmTitle,
        html: confirmText,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: confirmColor,
        cancelButtonColor: '#94a3b8',
        confirmButtonText: confirmBtn,
        cancelButtonText: 'Batal',
      });
      if (!confirm.isConfirmed) return;
    }

    setActionLoading(true);
    try {
      const res = await fetch('/api/cbt/monitoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          nomorPeserta: p.nomor_peserta,
          ...extraBody,
        }),
      });
      const json = await res.json();
      if (json.success) {
        Swal.fire({
          icon: 'success',
          title: 'Berhasil!',
          text: json.message,
          timer: 2500,
        });
        if (selectedPesertaLog && selectedPesertaLog.nomor_peserta === p.nomor_peserta) {
          setSelectedPesertaLog(null);
        }
        await fetchData(true);
      } else {
        Swal.fire('Gagal', json.error || 'Terjadi kesalahan saat memproses aksi.', 'error');
      }
    } catch (err: any) {
      Swal.fire('Error', err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Filter Data
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      if (filterCabang !== 'Semua' && item.cabang_lomba !== filterCabang) return false;
      if (filterStatus === 'sedang_mengerjakan' && item.status !== 'sedang_mengerjakan') return false;
      if (filterStatus === 'selesai' && item.status !== 'selesai') return false;
      if (filterStatus === 'belum_mulai' && item.status !== 'belum_mulai') return false;
      if (filterStatus === 'ada_pelanggaran' && item.jumlah_pelanggaran === 0) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchNama = item.nama.toLowerCase().includes(q);
        const matchNo = item.nomor_peserta.toLowerCase().includes(q);
        const matchSekolah = item.asal_sekolah.toLowerCase().includes(q);
        const matchUser = item.username_cbt.toLowerCase().includes(q);
        if (!matchNama && !matchNo && !matchSekolah && !matchUser) return false;
      }

      return true;
    });
  }, [data, filterCabang, filterStatus, searchQuery]);

  // Export to Excel
  const handleExportExcel = () => {
    if (filteredData.length === 0) {
      Swal.fire('Info', 'Tidak ada data untuk diexport.', 'info');
      return;
    }

    const rows = filteredData.map((p, idx) => {
      let statusLabel = 'Belum Mulai';
      if (p.status === 'sedang_mengerjakan') statusLabel = 'Sedang Mengerjakan';
      else if (p.status === 'selesai') statusLabel = 'Selesai';

      let durasiLabel = '-';
      if (p.durasi_menit !== null) durasiLabel = `${p.durasi_menit} Menit`;

      return {
        No: idx + 1,
        'Nomor Peserta': p.nomor_peserta,
        'Nama Peserta': p.nama,
        'Asal Sekolah': p.asal_sekolah,
        'Cabang Lomba': p.cabang_lomba,
        'Username CBT': p.username_cbt,
        'Password CBT': p.password_cbt,
        Status: statusLabel,
        'Terjawab / Total': `${p.terjawab} / ${p.total_soal}`,
        'Nilai Akhir': p.nilai_akhir !== null ? p.nilai_akhir : '-',
        'Jumlah Pelanggaran': p.jumlah_pelanggaran,
        'Waktu Mulai': p.waktu_mulai ? new Date(p.waktu_mulai).toLocaleString('id-ID') : '-',
        'Waktu Selesai': p.waktu_selesai ? new Date(p.waktu_selesai).toLocaleString('id-ID') : '-',
        'Durasi Pengerjaan': durasiLabel,
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 5 },
      { wch: 18 },
      { wch: 30 },
      { wch: 25 },
      { wch: 15 },
      { wch: 14 },
      { wch: 12 },
      { wch: 20 },
      { wch: 16 },
      { wch: 12 },
      { wch: 18 },
      { wch: 20 },
      { wch: 20 },
      { wch: 18 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Monitoring CBT');
    const nowStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Monitoring_Pengerjaan_CBT_${nowStr}.xlsx`);
  };

  const formatSeconds = (sec: number | null) => {
    if (sec === null || sec <= 0) return '-';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s.toString().padStart(2, '0')}s`;
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '24px 20px 60px' }}>
      <div style={{ maxWidth: '1300px', margin: '0 auto' }}>

        {/* TOP BAR / NAVIGATION */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={() => router.push('/olimpiade-seni')}
              style={{
                background: 'white',
                border: '1.5px solid #cbd5e1',
                padding: '8px 14px',
                borderRadius: '8px',
                color: '#475569',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <i className="fas fa-arrow-left"></i> Beranda Olimpiade
            </button>
            <button
              onClick={() => router.push('/olimpiade-seni/monitoring')}
              style={{
                background: '#fef3c7',
                border: '1.5px solid #fde68a',
                padding: '8px 14px',
                borderRadius: '8px',
                color: '#b45309',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.85rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <i className="fas fa-trophy"></i> Live Score Pemenang
            </button>
            <button
              onClick={() => router.push('/olimpiade-seni/admin-soal')}
              style={{
                background: 'white',
                border: '1.5px solid #cbd5e1',
                padding: '8px 14px',
                borderRadius: '8px',
                color: '#475569',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <i className="fas fa-book"></i> Bank Soal CBT
            </button>
          </div>

          {/* TOGGLE STATUS CBT & CONTROLS */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={handleToggleCbt}
              title={cbtBuka ? 'Klik untuk mengunci/menutup CBT' : 'Klik untuk membuka CBT bagi peserta'}
              style={{
                background: cbtBuka ? '#dcfce7' : '#fee2e2',
                color: cbtBuka ? '#15803d' : '#b91c1c',
                border: `1.5px solid ${cbtBuka ? '#86efac' : '#fca5a5'}`,
                padding: '8px 14px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <i className={`fas ${cbtBuka ? 'fa-lock-open' : 'fa-lock'}`}></i>
              Portal CBT: {cbtBuka ? 'BUKA' : 'DITUTUP'}
            </button>

            {/* AUTO REFRESH TOGGLE */}
            <div
              onClick={() => setAutoRefresh(!autoRefresh)}
              style={{
                background: autoRefresh ? '#eff6ff' : '#f1f5f9',
                color: autoRefresh ? '#1d4ed8' : '#64748b',
                border: `1.5px solid ${autoRefresh ? '#bfdbfe' : '#cbd5e1'}`,
                padding: '8px 12px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                userSelect: 'none',
              }}
            >
              <i className={`fas fa-sync ${autoRefresh ? 'fa-spin' : ''}`} style={{ color: autoRefresh ? '#2563eb' : '#94a3b8' }}></i>
              <span>{autoRefresh ? `Auto: ${countdown}s` : 'Auto: OFF'}</span>
            </div>

            <button
              onClick={() => fetchData(false)}
              disabled={loading}
              style={{
                background: '#0284c7',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 6px rgba(2,132,199,0.25)',
              }}
            >
              <i className={`fas fa-redo ${loading ? 'fa-spin' : ''}`}></i> Refresh
            </button>
          </div>
        </div>

        {/* HEADER TITLE */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '24px 28px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', marginBottom: '24px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Panel Pengawas & Admin
                </span>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Live Real-time Server
                </span>
              </div>
              <h1 style={{ margin: 0, fontSize: '1.6rem', color: '#0f172a', fontWeight: 800 }}>
                <i className="fas fa-desktop" style={{ color: '#0284c7', marginRight: '10px' }}></i>
                Monitoring Pengerjaan CBT & Sesi Peserta
              </h1>
              <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '0.9rem' }}>
                Pantau langsung status pengerjaan, sisa waktu, butir soal terjawab, pelanggaran anti-cheat, dan kelola/reset sesi ujian peserta secara instan.
              </p>
            </div>
            <button
              onClick={handleExportExcel}
              style={{
                background: '#16a34a',
                color: 'white',
                border: 'none',
                padding: '10px 18px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 8px rgba(22,163,74,0.3)',
              }}
            >
              <i className="fas fa-file-excel"></i> Export Rekap Sesi
            </button>
          </div>
        </div>

        {/* STATISTIK RINGKASAN */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px', marginBottom: '24px' }}>
          {/* Total Peserta */}
          <div style={{ background: 'white', padding: '18px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Peserta CBT</span>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#f1f5f9', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-users"></i>
              </div>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', marginTop: '8px' }}>
              {summary.total_peserta}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>Peserta terdaftar di CBT</div>
          </div>

          {/* Sedang Mengerjakan */}
          <div
            onClick={() => setFilterStatus(filterStatus === 'sedang_mengerjakan' ? 'Semua' : 'sedang_mengerjakan')}
            style={{
              background: filterStatus === 'sedang_mengerjakan' ? '#f0fdf4' : 'white',
              padding: '18px 20px',
              borderRadius: '14px',
              border: `2px solid ${filterStatus === 'sedang_mengerjakan' ? '#10b981' : '#bbf7d0'}`,
              boxShadow: '0 2px 8px rgba(16,185,129,0.08)',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' }}>Sedang Ujian (Live)</span>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-laptop-code fa-pulse"></i>
              </div>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#15803d', marginTop: '8px' }}>
              {summary.sedang_mengerjakan}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '4px', fontWeight: 600 }}>Klik untuk filter status ini</div>
          </div>

          {/* Selesai */}
          <div
            onClick={() => setFilterStatus(filterStatus === 'selesai' ? 'Semua' : 'selesai')}
            style={{
              background: filterStatus === 'selesai' ? '#eff6ff' : 'white',
              padding: '18px 20px',
              borderRadius: '14px',
              border: `2px solid ${filterStatus === 'selesai' ? '#3b82f6' : '#bfdbfe'}`,
              boxShadow: '0 2px 8px rgba(59,130,246,0.08)',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' }}>Sudah Selesai</span>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-check-circle"></i>
              </div>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#1d4ed8', marginTop: '8px' }}>
              {summary.selesai}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#2563eb', marginTop: '4px', fontWeight: 600 }}>Jawaban sudah tersubmit</div>
          </div>

          {/* Belum Mulai */}
          <div
            onClick={() => setFilterStatus(filterStatus === 'belum_mulai' ? 'Semua' : 'belum_mulai')}
            style={{
              background: filterStatus === 'belum_mulai' ? '#f8fafc' : 'white',
              padding: '18px 20px',
              borderRadius: '14px',
              border: `2px solid ${filterStatus === 'belum_mulai' ? '#64748b' : '#e2e8f0'}`,
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Belum Masuk</span>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#f1f5f9', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-clock"></i>
              </div>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#475569', marginTop: '8px' }}>
              {summary.belum_mulai}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>Belum memulai pengerjaan</div>
          </div>

          {/* Pelanggaran */}
          <div
            onClick={() => setFilterStatus(filterStatus === 'ada_pelanggaran' ? 'Semua' : 'ada_pelanggaran')}
            style={{
              background: filterStatus === 'ada_pelanggaran' ? '#fef2f2' : 'white',
              padding: '18px 20px',
              borderRadius: '14px',
              border: `2px solid ${filterStatus === 'ada_pelanggaran' ? '#ef4444' : '#fecaca'}`,
              boxShadow: '0 2px 8px rgba(239,68,68,0.08)',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' }}>Peringatan Kecurangan</span>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-exclamation-triangle"></i>
              </div>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#b91c1c', marginTop: '8px' }}>
              {summary.ada_pelanggaran}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '4px', fontWeight: 600 }}>Terdeteksi pindah tab / keluar layar</div>
          </div>
        </div>

        {/* FILTER & TOOLBAR */}
        <div style={{ background: 'white', padding: '16px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', flex: 1, minWidth: '300px' }}>
            {/* Search */}
            <div style={{ position: 'relative', minWidth: '260px', flex: 1 }}>
              <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}></i>
              <input
                type="text"
                placeholder="Cari nama, no peserta, sekolah, username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 36px',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.88rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}
                >
                  <i className="fas fa-times-circle"></i>
                </button>
              )}
            </div>

            {/* Cabang Lomba */}
            <div style={{ minWidth: '160px' }}>
              <select
                value={filterCabang}
                onChange={(e) => setFilterCabang(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.88rem', background: 'white' }}
              >
                <option value="Semua">Semua Cabang</option>
                <option value="Matematika">Matematika</option>
                <option value="IPAS">IPAS</option>
                <option value="PAI">PAI</option>
                <option value="Inggris">Bahasa Inggris</option>
                <option value="Arab">Bahasa Arab</option>
              </select>
            </div>

            {/* Status Filter */}
            <div style={{ minWidth: '180px' }}>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.88rem', background: 'white' }}
              >
                <option value="Semua">Semua Status</option>
                <option value="sedang_mengerjakan">Sedang Mengerjakan</option>
                <option value="selesai">Sudah Selesai</option>
                <option value="belum_mulai">Belum Mulai</option>
                <option value="ada_pelanggaran">Ada Peringatan</option>
              </select>
            </div>
          </div>

          {(filterCabang !== 'Semua' || filterStatus !== 'Semua' || searchQuery) && (
            <button
              onClick={() => {
                setFilterCabang('Semua');
                setFilterStatus('Semua');
                setSearchQuery('');
              }}
              style={{
                background: '#fee2e2',
                color: '#ef4444',
                border: 'none',
                padding: '8px 14px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              <i className="fas fa-undo"></i> Reset Filter
            </button>
          )}
        </div>

        {/* TABEL DATA MONITORING */}
        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '60px 20px', textAlign: 'center' }}>
              <InlineLoading message="Memuat status pengerjaan CBT..." />
            </div>
          ) : filteredData.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8' }}>
              <i className="fas fa-inbox" style={{ fontSize: '3rem', marginBottom: '12px', color: '#cbd5e1' }}></i>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#64748b' }}>Tidak ada peserta yang cocok dengan filter</div>
              <p style={{ margin: '6px 0 0', fontSize: '0.85rem' }}>Coba ubah kata kunci pencarian atau reset filter.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                    <th style={{ padding: '12px 14px', width: '50px' }}>No</th>
                    <th style={{ padding: '12px 14px' }}>Peserta</th>
                    <th style={{ padding: '12px 14px', width: '130px' }}>Cabang</th>
                    <th style={{ padding: '12px 14px', width: '150px' }}>Status</th>
                    <th style={{ padding: '12px 14px', width: '160px' }}>Progres Soal</th>
                    <th style={{ padding: '12px 14px', width: '130px' }}>Waktu / Sisa</th>
                    <th style={{ padding: '12px 14px', width: '110px', textAlign: 'center' }}>Pelanggaran</th>
                    <th style={{ padding: '12px 14px', width: '90px', textAlign: 'right' }}>Nilai</th>
                    <th style={{ padding: '12px 14px', width: '180px', textAlign: 'center' }}>Aksi Kelola Sesi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((p, idx) => {
                    const isSedangUjian = p.status === 'sedang_mengerjakan';
                    const isSelesai = p.status === 'selesai';
                    const persen = p.total_soal > 0 ? Math.round((p.terjawab / p.total_soal) * 100) : 0;

                    return (
                      <tr
                        key={p.id || p.nomor_peserta}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          background: isSedangUjian ? '#f0fdf4' : idx % 2 === 0 ? 'white' : '#fafafa',
                        }}
                      >
                        <td style={{ padding: '14px', color: '#94a3b8', fontWeight: 600 }}>{idx + 1}</td>

                        {/* Peserta Info */}
                        <td style={{ padding: '14px' }}>
                          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.92rem' }}>{p.nama}</div>
                          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                            <i className="fas fa-school" style={{ marginRight: '4px' }}></i>{p.asal_sekolah}
                          </div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px', fontSize: '0.75rem' }}>
                            <span style={{ background: '#f1f5f9', color: '#334155', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                              {p.nomor_peserta}
                            </span>
                            {p.username_cbt && (
                              <span style={{ color: '#0284c7', background: '#eff6ff', padding: '2px 6px', borderRadius: '4px', border: '1px solid #dbeafe' }}>
                                Akun: <b>{p.username_cbt}</b> | <b>{p.password_cbt}</b>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Cabang */}
                        <td style={{ padding: '14px' }}>
                          <span style={{
                            display: 'inline-block',
                            background: p.cabang_lomba === 'Matematika' ? '#fef3c7'
                              : p.cabang_lomba === 'IPAS' ? '#dcfce7'
                              : p.cabang_lomba === 'PAI' ? '#e0e7ff'
                              : p.cabang_lomba === 'Arab' ? '#fce7f3'
                              : '#e0f2fe',
                            color: p.cabang_lomba === 'Matematika' ? '#92400e'
                              : p.cabang_lomba === 'IPAS' ? '#166534'
                              : p.cabang_lomba === 'PAI' ? '#3730a3'
                              : p.cabang_lomba === 'Arab' ? '#9d174d'
                              : '#0369a1',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                          }}>
                            {p.cabang_lomba}
                          </span>
                        </td>

                        {/* Status */}
                        <td style={{ padding: '14px' }}>
                          {isSedangUjian ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#dcfce7', color: '#15803d', padding: '4px 10px', borderRadius: '20px', fontWeight: 800, fontSize: '0.78rem', border: '1px solid #86efac' }}>
                              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16a34a' }}></span>
                              Sedang Ujian
                            </span>
                          ) : isSelesai ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: '20px', fontWeight: 700, fontSize: '0.78rem', border: '1px solid #bae6fd' }}>
                              <i className="fas fa-check-circle"></i> Selesai
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#f1f5f9', color: '#64748b', padding: '4px 10px', borderRadius: '20px', fontWeight: 600, fontSize: '0.78rem' }}>
                              <i className="fas fa-minus-circle"></i> Belum Mulai
                            </span>
                          )}
                        </td>

                        {/* Progres Soal */}
                        <td style={{ padding: '14px' }}>
                          {p.status === 'belum_mulai' ? (
                            <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>-</span>
                          ) : (
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>
                                <span style={{ color: '#334155' }}>{p.terjawab} / {p.total_soal} Soal</span>
                                <span style={{ color: persen === 100 ? '#16a34a' : '#0284c7' }}>{persen}%</span>
                              </div>
                              <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                <div
                                  style={{
                                    width: `${persen}%`,
                                    height: '100%',
                                    background: persen === 100 ? '#16a34a' : '#0284c7',
                                    transition: 'width 0.3s',
                                  }}
                                ></div>
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Waktu / Sisa */}
                        <td style={{ padding: '14px' }}>
                          {isSedangUjian ? (
                            <div style={{ fontWeight: 800, color: '#16a34a', fontSize: '0.85rem' }}>
                              <i className="fas fa-stopwatch" style={{ marginRight: '4px' }}></i>
                              {formatSeconds(p.sisa_waktu_detik)}
                              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 'normal', marginTop: '2px' }}>
                                Mulai: {p.waktu_mulai ? new Date(p.waktu_mulai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                              </div>
                            </div>
                          ) : isSelesai ? (
                            <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                              <div style={{ fontWeight: 700 }}>
                                <i className="fas fa-clock" style={{ color: '#94a3b8', marginRight: '4px' }}></i>
                                {p.durasi_menit !== null ? `${p.durasi_menit}m` : '-'}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                                {p.waktu_selesai ? new Date(p.waktu_selesai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>-</span>
                          )}
                        </td>

                        {/* Pelanggaran */}
                        <td style={{ padding: '14px', textAlign: 'center' }}>
                          {p.jumlah_pelanggaran > 0 ? (
                            <button
                              onClick={() => setSelectedPesertaLog(p)}
                              title="Klik untuk melihat rincian log pelanggaran"
                              style={{
                                background: '#fee2e2',
                                color: '#b91c1c',
                                border: '1px solid #fca5a5',
                                borderRadius: '16px',
                                padding: '3px 8px',
                                fontSize: '0.76rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <i className="fas fa-exclamation-triangle"></i>
                              {p.jumlah_pelanggaran}x
                            </button>
                          ) : (
                            <span style={{ color: '#10b981', fontSize: '0.78rem' }}>
                              <i className="fas fa-check"></i> Bersih
                            </span>
                          )}
                        </td>

                        {/* Nilai */}
                        <td style={{ padding: '14px', textAlign: 'right' }}>
                          {p.nilai_akhir !== null ? (
                            <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>
                              {p.nilai_akhir}
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>-</span>
                          )}
                        </td>

                        {/* Aksi */}
                        <td style={{ padding: '14px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            {/* Tombol Buka Kunci (Reopen) jika sudah selesai */}
                            {isSelesai && (
                              <button
                                onClick={() => handleAction('reopen_sesi', p)}
                                disabled={actionLoading}
                                title="Buka kembali sesi ujian agar peserta dapat login dan melanjutkan"
                                style={{
                                  background: '#059669',
                                  color: 'white',
                                  border: 'none',
                                  padding: '5px 9px',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <i className="fas fa-unlock"></i> Buka Kunci
                              </button>
                            )}

                            {/* Tombol Tambah Waktu jika sedang mengerjakan */}
                            {isSedangUjian && (
                              <>
                                <button
                                  onClick={() => handleAction('tambah_waktu', p)}
                                  disabled={actionLoading}
                                  title="Tambah durasi pengerjaan ujian peserta (misal kompensasi listrik padam)"
                                  style={{
                                    background: '#0284c7',
                                    color: 'white',
                                    border: 'none',
                                    padding: '5px 9px',
                                    borderRadius: '6px',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                >
                                  <i className="fas fa-plus"></i> Waktu
                                </button>
                                <button
                                  onClick={() => handleAction('force_submit', p)}
                                  disabled={actionLoading}
                                  title="Paksa selesaikan ujian peserta sekarang"
                                  style={{
                                    background: '#ea580c',
                                    color: 'white',
                                    border: 'none',
                                    padding: '5px 9px',
                                    borderRadius: '6px',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                >
                                  <i className="fas fa-check"></i> Selesai
                                </button>
                              </>
                            )}

                            {/* Tombol Reset Pelanggaran jika ada pelanggaran */}
                            {p.jumlah_pelanggaran > 0 && (
                              <button
                                onClick={() => handleAction('reset_pelanggaran', p)}
                                disabled={actionLoading}
                                title="Bersihkan riwayat peringatan peserta ke 0x"
                                style={{
                                  background: '#7c3aed',
                                  color: 'white',
                                  border: 'none',
                                  padding: '5px 9px',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <i className="fas fa-shield-alt"></i> Clear
                              </button>
                            )}

                            {/* Tombol Reset Penuh jika sesi ada */}
                            {(isSedangUjian || isSelesai) && (
                              <button
                                onClick={() => handleAction('reset_sesi_full', p)}
                                disabled={actionLoading}
                                title="Hapus sesi secara total agar peserta mengulang dari awal"
                                style={{
                                  background: '#fee2e2',
                                  color: '#dc2626',
                                  border: '1px solid #fca5a5',
                                  padding: '5px 9px',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <i className="fas fa-trash"></i> Reset
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* FOOTER INFO */}
        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', color: '#64748b', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            Menampilkan <b>{filteredData.length}</b> dari total <b>{data.length}</b> peserta CBT.
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <span><i className="fas fa-circle" style={{ color: '#16a34a', fontSize: '0.6rem' }}></i> Sedang Ujian</span>
            <span><i className="fas fa-circle" style={{ color: '#0284c7', fontSize: '0.6rem' }}></i> Selesai</span>
            <span><i className="fas fa-circle" style={{ color: '#cbd5e1', fontSize: '0.6rem' }}></i> Belum Mulai</span>
          </div>
        </div>

        {/* MODAL DETAIL LOG PELANGGARAN */}
        {selectedPesertaLog && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15,23,42,0.6)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
            }}
          >
            <div style={{ background: 'white', width: '100%', maxWidth: '540px', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
              {/* Header Modal */}
              <div style={{ background: '#b91c1c', padding: '16px 20px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <i className="fas fa-exclamation-triangle" style={{ fontSize: '1.2rem' }}></i>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Rincian Peringatan Kecurangan</h3>
                </div>
                <button
                  onClick={() => setSelectedPesertaLog(null)}
                  style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '1.2rem', cursor: 'pointer' }}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>

              {/* Body Modal */}
              <div style={{ padding: '20px' }}>
                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: 800, color: '#0f172a' }}>{selectedPesertaLog.nama}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    {selectedPesertaLog.nomor_peserta} • {selectedPesertaLog.asal_sekolah} • {selectedPesertaLog.cabang_lomba}
                  </div>
                </div>

                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '10px' }}>
                  Daftar Peringatan Tercatat ({selectedPesertaLog.jumlah_pelanggaran}x):
                </div>

                <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedPesertaLog.log_kecurangan.map((l, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '10px 14px',
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: '#b91c1c', fontSize: '0.85rem' }}>
                          Peringatan ke-{l.ke || i + 1}: {l.jenis === 'tab_switch' ? 'Berpindah Tab / Aplikasi Lain' : l.jenis === 'fullscreen_exit' ? 'Keluar dari Layar Penuh' : l.jenis}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                          Terdeteksi: {l.waktu ? new Date(l.waktu).toLocaleString('id-ID') : '-'}
                        </div>
                      </div>
                      <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 800 }}>
                        Tercatat
                      </span>
                    </div>
                  ))}
                </div>

                {/* Footer Modal Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                  <button
                    onClick={() => handleAction('reset_pelanggaran', selectedPesertaLog)}
                    disabled={actionLoading}
                    style={{
                      background: '#7c3aed',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <i className="fas fa-shield-alt"></i> Reset Pelanggaran ke 0x
                  </button>
                  <button
                    onClick={() => setSelectedPesertaLog(null)}
                    style={{
                      background: '#f1f5f9',
                      color: '#475569',
                      border: '1px solid #cbd5e1',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                    }}
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
