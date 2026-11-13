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
  nilai_seleksi?: string | null;
  lolos_seleksi?: boolean;
  waktu_mulai: string | null;
  waktu_selesai: string | null;
  sisa_waktu_detik: number | null;
  durasi_menit: number | null;
  log_kecurangan: LogKecurangan[];
  jumlah_pelanggaran: number;
  is_login_aktif?: boolean;
  login_at?: string | null;
  device_info?: string;
  login_reset_at?: string | null;
  status_bayar_final?: string;
  bukti_bayar_final_url?: string;
  waktu_bayar_final?: string | null;
}

interface SummaryStats {
  total_peserta: number;
  belum_mulai: number;
  sedang_mengerjakan: number;
  selesai: number;
  ada_pelanggaran: number;
  login_aktif?: number;
  bayar_lunas?: number;
  bayar_menunggu?: number;
  bayar_belum?: number;
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
  const [sortBy, setSortBy] = useState<'status' | 'mapel_nilai' | 'nilai_desc'>('status');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [countdown, setCountdown] = useState(15);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedPesertaLog, setSelectedPesertaLog] = useState<PesertaCBT | null>(null);
  const [cbtBuka, setCbtBuka] = useState(false);
  const [loginKhususLolos, setLoginKhususLolos] = useState(false);
  const [tahapCbtAktif, setTahapCbtAktif] = useState<'seleksi' | 'final'>('seleksi');
  const [tahapPantau, setTahapPantau] = useState<'seleksi' | 'final'>('seleksi');
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(30);

  const REFRESH_INTERVAL = 15; // Detik

  // Fetch data
  const fetchData = async (silent = false, targetTahap?: 'seleksi' | 'final') => {
    const t = targetTahap || tahapPantau;
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/cbt/monitoring?tahap=${t}`);
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
        const isCbtOpen = Boolean(json.cbt_buka);
        setCbtBuka(isCbtOpen);
        setAutoRefresh(isCbtOpen);
        if (isCbtOpen) {
          setCountdown(REFRESH_INTERVAL);
        }
        if (typeof json.login_khusus_lolos === 'boolean') {
          setLoginKhususLolos(json.login_khusus_lolos);
        }
        if (json.tahap_cbt === 'final' || json.tahap_cbt === 'seleksi') {
          setTahapCbtAktif(json.tahap_cbt);
        }
      }
    } catch {
      // silent
    }
  };

  const handleChangeTahapAktif = async (newTahap: 'seleksi' | 'final') => {
    if (!isAdmin) return;
    if (newTahap === tahapCbtAktif) return;
    const label = newTahap === 'final' ? 'Babak Final' : 'Babak Seleksi (Penyisihan)';
    const confirm = await Swal.fire({
      title: `Aktifkan Ujian ${label}?`,
      text: newTahap === 'final'
        ? 'Portal CBT siswa akan diarahkan ke paket soal Babak Final (hanya peserta Lolos Top 30 Seleksi yang dapat mengerjakan).'
        : 'Portal CBT siswa akan diarahkan ke paket soal Babak Seleksi (Penyisihan).',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#0284c7',
      confirmButtonText: `Ya, Aktifkan ${label}`,
      cancelButtonText: 'Batal',
    });
    if (!confirm.isConfirmed) return;

    try {
      const res = await fetch('/api/olimpiade-seni/config-cbt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tahap_cbt: newTahap }),
      });
      const resJson = await res.json();
      if (resJson.success) {
        setTahapCbtAktif(newTahap);
        setTahapPantau(newTahap);
        if (typeof resJson.login_khusus_lolos === 'boolean') {
          setLoginKhususLolos(resJson.login_khusus_lolos);
        }
        fetchData(false, newTahap);
        Swal.fire('Berhasil', `Tahap ujian CBT aktif berhasil diubah ke ${label}.`, 'success');
      }
    } catch (err: any) {
      Swal.fire('Error', err.message, 'error');
    }
  };

  const handleResetAllLogin = async () => {
    if (!isAdmin) return;
    const labelCabang = filterCabang !== 'Semua' ? `Cabang ${filterCabang}` : 'SEMUA Cabang Lomba';
    const confirm = await Swal.fire({
      title: 'Reset Massal Kunci Login Perangkat?',
      html: `Fitur ini akan membuka kunci login 1 perangkat untuk seluruh peserta aktif (<b>${labelCabang}</b>).<br/><br/><b>Jawaban dan sisa waktu ujian peserta TIDAK akan terhapus</b>, namun peserta yang sedang login diwajibkan login ulang.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d97706',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Reset Semua Kunci Login',
      cancelButtonText: 'Batal',
    });
    if (!confirm.isConfirmed) return;

    setActionLoading(true);
    try {
      const res = await fetch('/api/cbt/monitoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset_all_login',
          cabang: filterCabang,
        }),
      });
      const json = await res.json();
      if (json.success) {
        Swal.fire('Berhasil!', json.message, 'success');
        await fetchData(false, tahapPantau);
      } else {
        Swal.fire('Gagal', json.error || 'Gagal mereset login', 'error');
      }
    } catch (err: any) {
      Swal.fire('Error', err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetAllSesi = async () => {
    if (!isAdmin) return;
    const labelTahap = tahapPantau === 'final' ? 'Babak Final' : 'Babak Seleksi';
    const labelCabang = filterCabang !== 'Semua' ? `Cabang ${filterCabang}` : 'SEMUA Cabang Lomba';
    const confirm = await Swal.fire({
      title: `Reset Massal Sesi (${labelTahap})?`,
      html: `Anda akan menghapus seluruh data sesi pengerjaan CBT pada <b>${labelTahap}</b> (${labelCabang}).<br/><br/>Gunakan fitur ini untuk menghapus data simulasi atau mengulang babak dari awal.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus Semua Sesi Ini',
      cancelButtonText: 'Batal',
    });
    if (!confirm.isConfirmed) return;

    setActionLoading(true);
    try {
      const res = await fetch('/api/cbt/monitoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset_all_sesi',
          tahap: tahapPantau,
          cabang: filterCabang,
        }),
      });
      const json = await res.json();
      if (json.success) {
        Swal.fire('Berhasil!', json.message, 'success');
        await fetchData(false, tahapPantau);
      } else {
        Swal.fire('Gagal', json.error || 'Gagal mereset sesi', 'error');
      }
    } catch (err: any) {
      Swal.fire('Error', err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleCbt = async () => {
    if (!isAdmin) {
      Swal.fire('Akses Ditolak', 'Pengaturan buka/tutup ujian CBT hanya dapat dilakukan oleh Admin.', 'warning');
      return;
    }
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
        setAutoRefresh(newVal);
        if (newVal) {
          setCountdown(REFRESH_INTERVAL);
        }
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

  const handleToggleLoginKhususLolos = async () => {
    if (!isAdmin) {
      Swal.fire('Akses Ditolak', 'Pengaturan akses login CBT hanya dapat dilakukan oleh Admin.', 'warning');
      return;
    }
    try {
      const newVal = !loginKhususLolos;
      const res = await fetch('/api/olimpiade-seni/config-cbt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login_khusus_lolos: newVal }),
      });
      const resJson = await res.json();
      if (resJson.success) {
        setLoginKhususLolos(newVal);
        Swal.fire({
          icon: 'success',
          title: newVal ? 'Login Khusus Peserta Lolos Aktif' : 'Login Dibuka untuk Semua Peserta',
          text: newVal
            ? 'Hanya 30 peserta terbaik per cabang mapel (Lolos Final) dan akun Bypass yang dapat masuk ke Portal CBT.'
            : 'Semua peserta terdaftar kini dapat masuk kembali ke Portal CBT.',
          timer: 2400,
        });
      }
    } catch (err: any) {
      Swal.fire('Error', err.message, 'error');
    }
  };

  useEffect(() => {
    const sessionStr = localStorage.getItem('keren_user_data');
    if (sessionStr) {
      try {
        const session = JSON.parse(sessionStr);
        setIsAdmin(session.role === 'admin' || session.role === 'Admin' || session.role === 'ADMIN');
      } catch (e) {
        setIsAdmin(false);
      }
    }
    fetchData();
    fetchCbtConfig();
  }, []);

  // Auto-refresh interval (hanya aktif ketika Portal CBT dibuka)
  useEffect(() => {
    if (!cbtBuka || !autoRefresh) return;

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
  }, [cbtBuka, autoRefresh, tahapPantau]);

  // Aksi Kelola Sesi
  const handleAction = async (action: string, p: PesertaCBT, extraBody: any = {}) => {
    if (!isAdmin) {
      Swal.fire('Akses Ditolak', 'Aksi kelola dan reset sesi ujian ini hanya dapat dilakukan oleh Admin.', 'warning');
      return;
    }
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
    } else if (action === 'reset_login') {
      confirmTitle = `Reset Login Perangkat: ${p.nama}?`;
      confirmText = `Kunci login 1 perangkat untuk <b>${p.nama}</b> (${p.device_info || 'perangkat aktif'}) akan dibuka agar peserta dapat login ulang di perangkat baru.<br/><br/><i>Jawaban dan sisa waktu ujian tetap aman dan tidak dihapus.</i>`;
      confirmBtn = 'Ya, Reset Login';
      confirmColor = '#d97706';
    } else if (action === 'validasi_bayar_final') {
      confirmTitle = `Validasi Lunas: ${p.nama}?`;
      confirmText = `Tandai pembayaran pendaftaran Babak Final untuk <b>${p.nama}</b> (${p.nomor_peserta}) sebesar <b>Rp 50.000,-</b> sebagai <b>LUNAS</b>?`;
      confirmBtn = 'Ya, Validasi LUNAS';
      confirmColor = '#16a34a';
    } else if (action === 'tolak_bayar_final') {
      confirmTitle = `Tolak Pembayaran: ${p.nama}?`;
      confirmText = `Tolak bukti pembayaran Babak Final untuk <b>${p.nama}</b> (${p.nomor_peserta})? Status pendaftaran akan ditandai <b>Ditolak</b>.`;
      confirmBtn = 'Ya, Tolak';
      confirmColor = '#dc2626';
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
          tahap: tahapPantau,
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

  // Filter & Sort Data
  const filteredData = useMemo(() => {
    const list = data.filter((item) => {
      if (filterCabang !== 'Semua' && item.cabang_lomba !== filterCabang) return false;
      if (filterStatus === 'sedang_mengerjakan' && item.status !== 'sedang_mengerjakan') return false;
      if (filterStatus === 'selesai' && item.status !== 'selesai') return false;
      if (filterStatus === 'belum_mulai' && item.status !== 'belum_mulai') return false;
      if (filterStatus === 'ada_pelanggaran' && item.jumlah_pelanggaran === 0) return false;
      if (filterStatus === 'login_aktif' && !item.is_login_aktif) return false;
      if (filterStatus === 'bayar_lunas' && item.status_bayar_final !== 'Valid') return false;
      if (filterStatus === 'bayar_menunggu' && item.status_bayar_final !== 'Menunggu Verifikasi') return false;
      if (filterStatus === 'bayar_belum' && item.status_bayar_final !== 'Belum Bayar' && item.status_bayar_final !== 'Ditolak') return false;

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

    if (sortBy === 'mapel_nilai') {
      list.sort((a, b) => {
        const comp = (a.cabang_lomba || '').localeCompare(b.cabang_lomba || '', 'id');
        if (comp !== 0) return comp;
        const valA = a.nilai_akhir !== null && a.nilai_akhir !== undefined && a.nilai_akhir !== '-' ? Number(a.nilai_akhir) : -1;
        const valB = b.nilai_akhir !== null && b.nilai_akhir !== undefined && b.nilai_akhir !== '-' ? Number(b.nilai_akhir) : -1;
        if (valB !== valA) return valB - valA;
        return (a.nama || '').localeCompare(b.nama || '', 'id');
      });
    } else if (sortBy === 'nilai_desc') {
      list.sort((a, b) => {
        const valA = a.nilai_akhir !== null && a.nilai_akhir !== undefined && a.nilai_akhir !== '-' ? Number(a.nilai_akhir) : -1;
        const valB = b.nilai_akhir !== null && b.nilai_akhir !== undefined && b.nilai_akhir !== '-' ? Number(b.nilai_akhir) : -1;
        if (valB !== valA) return valB - valA;
        return (a.nama || '').localeCompare(b.nama || '', 'id');
      });
    }

    return list;
  }, [data, filterCabang, filterStatus, searchQuery, sortBy]);

  const totalPages = itemsPerPage === 999999 ? 1 : Math.ceil(filteredData.length / itemsPerPage) || 1;
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredData.length);
  const paginatedData = itemsPerPage === 999999 ? filteredData : filteredData.slice(startIndex, endIndex);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (safeCurrentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, '...', totalPages);
      } else if (safeCurrentPage >= totalPages - 3) {
        pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  // Export to Excel: Urut Mapel & Nilai Tertinggi
  const handleExportExcel = () => {
    if (filteredData.length === 0) {
      Swal.fire('Info', 'Tidak ada data untuk diexport.', 'info');
      return;
    }

    // Urutkan data untuk export: 1) Urut Mapel (Cabang Lomba), 2) Urut Nilai Tertinggi (descending)
    const sortedExportData = [...filteredData].sort((a, b) => {
      // 1. Urut Mapel (Cabang Lomba) secara alfabetis
      const compCabang = (a.cabang_lomba || '').localeCompare(b.cabang_lomba || '', 'id');
      if (compCabang !== 0) return compCabang;

      // 2. Di dalam mapel yang sama, urutkan berdasarkan Nilai Tertinggi
      const valA = a.nilai_akhir !== null && a.nilai_akhir !== undefined && a.nilai_akhir !== '-'
        ? Number(a.nilai_akhir)
        : -1;
      const valB = b.nilai_akhir !== null && b.nilai_akhir !== undefined && b.nilai_akhir !== '-'
        ? Number(b.nilai_akhir)
        : -1;

      if (valB !== valA) {
        return valB - valA;
      }

      // 3. Jika nilai sama: status selesai lebih didahulukan
      const statusWeight: Record<string, number> = { selesai: 1, sedang_mengerjakan: 2, belum_mulai: 3 };
      const statA = statusWeight[a.status] || 99;
      const statB = statusWeight[b.status] || 99;
      if (statA !== statB) return statA - statB;

      // 4. Jika nilai & status sama: durasi pengerjaan tercepat
      const durA = typeof a.durasi_menit === 'number' && a.durasi_menit >= 0 ? a.durasi_menit : Infinity;
      const durB = typeof b.durasi_menit === 'number' && b.durasi_menit >= 0 ? b.durasi_menit : Infinity;
      if (durA !== durB) return durA - durB;

      // 5. Nama Peserta (A-Z)
      return (a.nama || '').localeCompare(b.nama || '', 'id');
    });

    let lastCabang = '';
    let rankInMapel = 0;

    const rows = sortedExportData.map((p, idx) => {
      if (p.cabang_lomba !== lastCabang) {
        lastCabang = p.cabang_lomba;
        rankInMapel = 1;
      } else {
        rankInMapel++;
      }

      const hasScore = p.nilai_akhir !== null && p.nilai_akhir !== undefined && p.nilai_akhir !== '-';

      let statusLabel = 'Belum Mulai';
      if (p.status === 'sedang_mengerjakan') statusLabel = 'Sedang Mengerjakan';
      else if (p.status === 'selesai') statusLabel = 'Selesai';

      let durasiLabel = '-';
      if (p.durasi_menit !== null) durasiLabel = `${p.durasi_menit} Menit`;

      return {
        No: idx + 1,
        'Peringkat Mapel': hasScore ? rankInMapel : '-',
        'Cabang Lomba': p.cabang_lomba,
        'Nomor Peserta': p.nomor_peserta,
        'Nama Peserta': p.nama,
        'Asal Sekolah': p.asal_sekolah,
        'Nilai Akhir': hasScore ? Number(p.nilai_akhir) : '-',
        Status: statusLabel,
        'Terjawab / Total': `${p.terjawab} / ${p.total_soal}`,
        'Jumlah Pelanggaran': p.jumlah_pelanggaran,
        ...(tahapPantau === 'final' ? {
          'Daftar Ulang Final (50rb)': p.status_bayar_final || 'Belum Bayar',
          'Bukti Transfer Final': p.bukti_bayar_final_url || '-'
        } : {}),
        'Username CBT': p.username_cbt,
        'Password CBT': p.password_cbt,
        'Waktu Mulai': p.waktu_mulai ? new Date(p.waktu_mulai).toLocaleString('id-ID') : '-',
        'Waktu Selesai': p.waktu_selesai ? new Date(p.waktu_selesai).toLocaleString('id-ID') : '-',
        'Durasi Pengerjaan': durasiLabel,
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 6 },
      { wch: 16 },
      { wch: 18 },
      { wch: 18 },
      { wch: 32 },
      { wch: 30 },
      { wch: 14 },
      { wch: 20 },
      { wch: 16 },
      { wch: 18 },
      ...(tahapPantau === 'final' ? [{ wch: 24 }, { wch: 30 }] : []),
      { wch: 16 },
      { wch: 14 },
      { wch: 22 },
      { wch: 22 },
      { wch: 18 },
    ];

    const wb = XLSX.utils.book_new();
    const sheetName = tahapPantau === 'final' ? 'Rekap CBT Final' : 'Rekap CBT Seleksi';
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    const nowStr = new Date().toISOString().split('T')[0];
    const cabangStr = filterCabang !== 'Semua' ? `_${filterCabang}` : '_Semua_Mapel';
    const filename = `Rekap_Sesi_CBT_${tahapPantau === 'final' ? 'Final' : 'Seleksi'}${cabangStr}_${nowStr}.xlsx`;
    XLSX.writeFile(wb, filename);

    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'Rekap Sesi CBT berhasil diexport!',
      showConfirmButton: false,
      timer: 2000,
    });
  };

  const formatSeconds = (sec: number | null) => {
    if (sec === null || sec <= 0) return '-';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s.toString().padStart(2, '0')}s`;
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '24px 28px 60px' }}>
      <div style={{ width: '100%', maxWidth: '1680px', margin: '0 auto' }}>

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
            {isAdmin && (
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
            )}
          </div>

          {/* TOGGLE STATUS CBT & CONTROLS */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {isAdmin ? (
              <>
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
                <button
                  onClick={handleToggleLoginKhususLolos}
                  title={loginKhususLolos ? 'Saat ini hanya peserta Lolos Top 30 yang bisa login CBT. Klik untuk membuka semua peserta.' : 'Klik untuk membatasi login CBT hanya bagi peserta Lolos Top 30'}
                  style={{
                    background: loginKhususLolos ? '#e0f2fe' : '#f1f5f9',
                    color: loginKhususLolos ? '#0369a1' : '#475569',
                    border: `1.5px solid ${loginKhususLolos ? '#7dd3fc' : '#cbd5e1'}`,
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
                  <i className={`fas ${loginKhususLolos ? 'fa-user-shield' : 'fa-users'}`}></i>
                  Login CBT: {loginKhususLolos ? 'KHUSUS LOLOS (TOP 30)' : 'SEMUA PESERTA'}
                </button>
              </>
            ) : (
              <>
                <div
                  style={{
                    background: cbtBuka ? '#dcfce7' : '#f1f5f9',
                    color: cbtBuka ? '#15803d' : '#64748b',
                    border: `1.5px solid ${cbtBuka ? '#86efac' : '#cbd5e1'}`,
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <i className={`fas ${cbtBuka ? 'fa-lock-open' : 'fa-lock'}`}></i>
                  Status CBT: {cbtBuka ? 'BUKA' : 'DITUTUP'}
                </div>
                {loginKhususLolos && (
                  <div
                    style={{
                      background: '#e0f2fe',
                      color: '#0369a1',
                      border: '1.5px solid #7dd3fc',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <i className="fas fa-user-shield"></i>
                    Login: KHUSUS LOLOS (TOP 30)
                  </div>
                )}
              </>
            )}

            {/* AUTO REFRESH TOGGLE (Aktif hanya saat Portal CBT BUKA) */}
            <button
              type="button"
              onClick={() => {
                if (!cbtBuka) return;
                setAutoRefresh(!autoRefresh);
              }}
              disabled={!cbtBuka}
              title={
                cbtBuka
                  ? (autoRefresh ? 'Klik untuk jeda auto-refresh' : 'Klik untuk aktifkan auto-refresh')
                  : 'Auto-refresh hanya aktif ketika Portal CBT dibuka'
              }
              style={{
                background: cbtBuka && autoRefresh ? '#eff6ff' : '#f1f5f9',
                color: cbtBuka && autoRefresh ? '#1d4ed8' : '#64748b',
                border: `1.5px solid ${cbtBuka && autoRefresh ? '#bfdbfe' : '#cbd5e1'}`,
                padding: '8px 12px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: cbtBuka ? 'pointer' : 'not-allowed',
                opacity: cbtBuka ? 1 : 0.75,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                userSelect: 'none',
              }}
            >
              <i className={`fas fa-sync ${cbtBuka && autoRefresh ? 'fa-spin' : ''}`} style={{ color: cbtBuka && autoRefresh ? '#2563eb' : '#94a3b8' }}></i>
              <span>{!cbtBuka ? 'Auto: OFF (CBT Tutup)' : autoRefresh ? `Auto: ${countdown}s` : 'Auto: OFF'}</span>
            </button>

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
            {isAdmin && (
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  onClick={handleResetAllLogin}
                  disabled={actionLoading}
                  title="Buka kunci 1 device untuk semua peserta aktif (jawaban tetap aman)"
                  style={{
                    background: '#fef3c7',
                    color: '#b45309',
                    border: '1.5px solid #fcd34d',
                    padding: '10px 16px',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <i className="fas fa-unlock-alt"></i> Reset Semua Login ({summary.login_aktif || 0})
                </button>
                <button
                  onClick={handleResetAllSesi}
                  disabled={actionLoading}
                  style={{
                    background: '#fee2e2',
                    color: '#dc2626',
                    border: '1.5px solid #fca5a5',
                    padding: '10px 16px',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <i className="fas fa-trash-alt"></i> Reset Sesi ({tahapPantau === 'final' ? 'Final' : 'Seleksi'})
                </button>
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
            )}
          </div>

          {/* STAGE SELECTOR & ACTIVE CBT STAGE BANNER */}
          <div style={{
            marginTop: '20px',
            paddingTop: '18px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '14px'
          }}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>Pantau Sesi Babak:</span>
              <button
                type="button"
                onClick={() => {
                  setTahapPantau('seleksi');
                  setCurrentPage(1);
                  fetchData(false, 'seleksi');
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: tahapPantau === 'seleksi' ? 'none' : '1.5px solid #cbd5e1',
                  background: tahapPantau === 'seleksi' ? '#0284c7' : 'white',
                  color: tahapPantau === 'seleksi' ? 'white' : '#475569',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <i className="fas fa-list-check"></i> Babak Seleksi (Penyisihan)
              </button>
              <button
                type="button"
                onClick={() => {
                  setTahapPantau('final');
                  setCurrentPage(1);
                  fetchData(false, 'final');
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: tahapPantau === 'final' ? 'none' : '1.5px solid #cbd5e1',
                  background: tahapPantau === 'final' ? '#d97706' : 'white',
                  color: tahapPantau === 'final' ? 'white' : '#475569',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <i className="fas fa-trophy"></i> Babak Final (Finalis Top 30)
              </button>
            </div>

            {isAdmin && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '6px 12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>Tahap CBT Aktif Siswa:</span>
                <button
                  type="button"
                  onClick={() => handleChangeTahapAktif('seleksi')}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    background: tahapCbtAktif === 'seleksi' ? '#0f172a' : 'transparent',
                    color: tahapCbtAktif === 'seleksi' ? 'white' : '#64748b',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    cursor: 'pointer'
                  }}
                >
                  Seleksi
                </button>
                <button
                  type="button"
                  onClick={() => handleChangeTahapAktif('final')}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    background: tahapCbtAktif === 'final' ? '#b45309' : 'transparent',
                    color: tahapCbtAktif === 'final' ? 'white' : '#64748b',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    cursor: 'pointer'
                  }}
                >
                  Final
                </button>
              </div>
            )}
          </div>
        </div>

        {/* STATISTIK RINGKASAN */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))', gap: '14px', marginBottom: '24px' }}>
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

          {/* Login Aktif (Kunci 1 Device) */}
          <div
            onClick={() => setFilterStatus(filterStatus === 'login_aktif' ? 'Semua' : 'login_aktif')}
            style={{
              background: filterStatus === 'login_aktif' ? '#fffbeb' : 'white',
              padding: '18px 20px',
              borderRadius: '14px',
              border: `2px solid ${filterStatus === 'login_aktif' ? '#d97706' : '#fde68a'}`,
              boxShadow: '0 2px 8px rgba(217,119,6,0.08)',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#b45309', textTransform: 'uppercase' }}>Login Aktif (1 Device)</span>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-mobile-alt"></i>
              </div>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#92400e', marginTop: '8px' }}>
              {summary.login_aktif || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#b45309', marginTop: '4px', fontWeight: 600 }}>Perangkat terkunci saat ini</div>
          </div>
        </div>

        {/* STATISTIK DAFTAR ULANG FINAL (KHUSUS TAHAP FINAL) */}
        {tahapPantau === 'final' && (
          <div style={{
            background: 'linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%)',
            border: '1.5px solid #86efac',
            borderRadius: '16px',
            padding: '16px 20px',
            marginBottom: '24px',
            boxShadow: '0 4px 12px rgba(16,185,129,0.06)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#16a34a', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>
                  <i className="fas fa-money-bill-wave"></i>
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#166534' }}>
                    Status Registrasi Ulang Finalis (Rp 50.000 / Peserta)
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#15803d' }}>
                    Rekening BCA: <b>3686518888</b> a.n. MTs Almaarif 01 Singosari
                  </p>
                </div>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 600 }}>
                Total 150 Finalis (Top 30 per Mapel)
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              {/* Lunas */}
              <div
                onClick={() => setFilterStatus(filterStatus === 'bayar_lunas' ? 'Semua' : 'bayar_lunas')}
                style={{
                  background: filterStatus === 'bayar_lunas' ? '#15803d' : 'white',
                  color: filterStatus === 'bayar_lunas' ? 'white' : '#15803d',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '1.5px solid #86efac',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
                }}
              >
                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', opacity: 0.9 }}>
                  <i className="fas fa-check-circle" style={{ marginRight: '6px' }}></i>Lunas Terverifikasi
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, marginTop: '4px' }}>
                  {summary.bayar_lunas || 0}
                </div>
                <div style={{ fontSize: '0.72rem', marginTop: '2px', opacity: 0.8 }}>
                  Klik untuk filter LUNAS
                </div>
              </div>

              {/* Menunggu Verifikasi */}
              <div
                onClick={() => setFilterStatus(filterStatus === 'bayar_menunggu' ? 'Semua' : 'bayar_menunggu')}
                style={{
                  background: filterStatus === 'bayar_menunggu' ? '#b45309' : 'white',
                  color: filterStatus === 'bayar_menunggu' ? 'white' : '#b45309',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '1.5px solid #fde68a',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
                }}
              >
                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', opacity: 0.9 }}>
                  <i className="fas fa-hourglass-half" style={{ marginRight: '6px' }}></i>Menunggu Verifikasi
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, marginTop: '4px' }}>
                  {summary.bayar_menunggu || 0}
                </div>
                <div style={{ fontSize: '0.72rem', marginTop: '2px', opacity: 0.8 }}>
                  Sudah upload bukti transfer
                </div>
              </div>

              {/* Belum Bayar */}
              <div
                onClick={() => setFilterStatus(filterStatus === 'bayar_belum' ? 'Semua' : 'bayar_belum')}
                style={{
                  background: filterStatus === 'bayar_belum' ? '#475569' : 'white',
                  color: filterStatus === 'bayar_belum' ? 'white' : '#475569',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
                }}
              >
                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', opacity: 0.9 }}>
                  <i className="fas fa-clock" style={{ marginRight: '6px' }}></i>Belum Upload / Ditolak
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, marginTop: '4px' }}>
                  {summary.bayar_belum || 0}
                </div>
                <div style={{ fontSize: '0.72rem', marginTop: '2px', opacity: 0.8 }}>
                  Belum mengirimkan bukti
                </div>
              </div>
            </div>
          </div>
        )}

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
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
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
                onChange={(e) => {
                  setFilterCabang(e.target.value);
                  setCurrentPage(1);
                }}
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
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setCurrentPage(1);
                }}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.88rem', background: 'white' }}
              >
                <option value="Semua">Semua Status</option>
                <option value="sedang_mengerjakan">Sedang Mengerjakan</option>
                <option value="selesai">Sudah Selesai</option>
                <option value="belum_mulai">Belum Mulai</option>
                <option value="ada_pelanggaran">Ada Peringatan</option>
                <option value="login_aktif">🔒 Login Aktif (1 Device)</option>
                {tahapPantau === 'final' && (
                  <>
                    <option value="bayar_lunas">💰 Daftar Ulang: Lunas</option>
                    <option value="bayar_menunggu">⏳ Daftar Ulang: Menunggu Verifikasi</option>
                    <option value="bayar_belum">⚠️ Daftar Ulang: Belum Bayar / Ditolak</option>
                  </>
                )}
              </select>
            </div>

            {/* Urutan Tampilan */}
            <div style={{ minWidth: '190px' }}>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as any);
                  setCurrentPage(1);
                }}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.88rem', background: 'white' }}
              >
                <option value="status">Urut: Status Ujian</option>
                <option value="mapel_nilai">Urut: Mapel & Nilai Tertinggi</option>
                <option value="nilai_desc">Urut: Nilai Tertinggi</option>
              </select>
            </div>
          </div>

          {(filterCabang !== 'Semua' || filterStatus !== 'Semua' || sortBy !== 'status' || searchQuery) && (
            <button
              onClick={() => {
                setFilterCabang('Semua');
                setFilterStatus('Semua');
                setSortBy('status');
                setSearchQuery('');
                setCurrentPage(1);
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
            <>
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
                    {tahapPantau === 'final' && (
                      <th style={{ padding: '12px 14px', width: '160px', textAlign: 'center' }}>Daftar Ulang (50rb)</th>
                    )}
                    <th style={{ padding: '12px 14px', width: '180px', textAlign: 'center' }}>Aksi Kelola Sesi</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((p, idx) => {
                    const globalIdx = itemsPerPage === 999999 ? idx + 1 : startIndex + idx + 1;
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
                        <td style={{ padding: '14px', color: '#94a3b8', fontWeight: 600 }}>{globalIdx}</td>

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
                                Akun: <b>{p.username_cbt}</b> {isAdmin && <>| <b>{p.password_cbt}</b></>}
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
                          {p.is_login_aktif ? (
                            <div
                              title={`Login pukul ${p.login_at ? new Date(p.login_at).toLocaleString('id-ID') : '-'}`}
                              style={{ marginTop: '6px', fontSize: '0.72rem', color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a', padding: '2px 7px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}
                            >
                              <i className="fas fa-lock"></i>
                              <span>{p.device_info || '1 Device Aktif'}</span>
                            </div>
                          ) : null}
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

                        {/* Daftar Ulang Final (50rb) */}
                        {tahapPantau === 'final' && (
                          <td style={{ padding: '14px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                              {p.status_bayar_final === 'Valid' ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '12px', fontWeight: 800, fontSize: '0.75rem', border: '1px solid #86efac' }}>
                                  <i className="fas fa-check-circle"></i> LUNAS
                                </span>
                              ) : p.status_bayar_final === 'Menunggu Verifikasi' ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fef3c7', color: '#b45309', padding: '3px 8px', borderRadius: '12px', fontWeight: 800, fontSize: '0.75rem', border: '1px solid #fde68a' }}>
                                  <i className="fas fa-hourglass-half"></i> Menunggu
                                </span>
                              ) : p.status_bayar_final === 'Ditolak' ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fee2e2', color: '#b91c1c', padding: '3px 8px', borderRadius: '12px', fontWeight: 800, fontSize: '0.75rem', border: '1px solid #fecaca' }}>
                                  <i className="fas fa-times-circle"></i> Ditolak
                                </span>
                              ) : (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', color: '#64748b', padding: '3px 8px', borderRadius: '12px', fontWeight: 700, fontSize: '0.75rem' }}>
                                  <i className="fas fa-clock"></i> Belum Bayar
                                </span>
                              )}

                              {p.bukti_bayar_final_url && (
                                <a
                                  href={p.bukti_bayar_final_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Klik untuk membuka bukti transfer di tab baru"
                                  style={{
                                    fontSize: '0.72rem',
                                    color: '#0284c7',
                                    textDecoration: 'none',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    marginTop: '2px',
                                    fontWeight: 700
                                  }}
                                >
                                  <i className="fas fa-receipt"></i> Bukti
                                </a>
                              )}

                              {isAdmin && (
                                <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                                  {p.status_bayar_final !== 'Valid' && (
                                    <button
                                      onClick={() => handleAction('validasi_bayar_final', p)}
                                      disabled={actionLoading}
                                      title="Setujui dan tandai LUNAS"
                                      style={{
                                        background: '#16a34a',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        padding: '3px 7px',
                                        fontSize: '0.7rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '3px'
                                      }}
                                    >
                                      <i className="fas fa-check"></i> Lunas
                                    </button>
                                  )}
                                  {p.status_bayar_final !== 'Ditolak' && p.status_bayar_final !== 'Belum Bayar' && (
                                    <button
                                      onClick={() => handleAction('tolak_bayar_final', p)}
                                      disabled={actionLoading}
                                      title="Tolak bukti transfer"
                                      style={{
                                        background: '#dc2626',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        padding: '3px 7px',
                                        fontSize: '0.7rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '3px'
                                      }}
                                    >
                                      <i className="fas fa-times"></i> Tolak
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        )}

                        {/* Aksi */}
                        <td style={{ padding: '14px', textAlign: 'center' }}>
                          {!isAdmin ? (
                            <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <i className="fas fa-lock"></i> Hanya Admin
                            </span>
                          ) : (
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            {/* Tombol Reset Login Perangkat jika sedang terkunci di 1 device */}
                            {p.is_login_aktif && (
                              <button
                                onClick={() => handleAction('reset_login', p)}
                                disabled={actionLoading}
                                title={`Reset kunci login 1 perangkat (${p.device_info || 'device aktif'}) tanpa menghapus jawaban`}
                                style={{
                                  background: '#fef3c7',
                                  color: '#b45309',
                                  border: '1px solid #fcd34d',
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
                                <i className="fas fa-unlock-alt"></i> Reset Login
                              </button>
                            )}

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
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {filteredData.length > 0 && (
              <div style={{
                padding: '16px 20px',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '14px',
                background: '#f8fafc',
                borderRadius: '0 0 16px 16px'
              }}>
                <div style={{ fontSize: '0.86rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 600 }}>Tampilkan:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      style={{
                        padding: '5px 10px',
                        borderRadius: '6px',
                        border: '1.5px solid #cbd5e1',
                        outline: 'none',
                        background: 'white',
                        color: '#334155',
                        fontWeight: 600,
                        fontSize: '0.84rem',
                        cursor: 'pointer'
                      }}
                    >
                      <option value={30}>30 per halaman</option>
                      <option value={50}>50 per halaman</option>
                      <option value={100}>100 per halaman</option>
                      <option value={999999}>Semua</option>
                    </select>
                  </div>
                  <span>
                    Menampilkan <b>{startIndex + 1} - {endIndex}</b> dari total <b>{filteredData.length}</b> peserta CBT
                  </span>
                </div>

                {totalPages > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={safeCurrentPage === 1}
                      style={{
                        padding: '6px 12px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        background: safeCurrentPage === 1 ? '#f1f5f9' : 'white',
                        cursor: safeCurrentPage === 1 ? 'not-allowed' : 'pointer',
                        color: safeCurrentPage === 1 ? '#94a3b8' : '#334155',
                        fontSize: '0.84rem',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <i className="fas fa-chevron-left" style={{ fontSize: '0.75rem' }}></i> Sebelumnya
                    </button>

                    {getPageNumbers().map((page, pIdx) => (
                      typeof page === 'number' ? (
                        <button
                          key={pIdx}
                          type="button"
                          onClick={() => setCurrentPage(page)}
                          style={{
                            minWidth: '34px',
                            height: '34px',
                            padding: '0 8px',
                            border: safeCurrentPage === page ? 'none' : '1px solid #cbd5e1',
                            borderRadius: '6px',
                            background: safeCurrentPage === page ? '#0284c7' : 'white',
                            color: safeCurrentPage === page ? 'white' : '#334155',
                            cursor: 'pointer',
                            fontSize: '0.84rem',
                            fontWeight: safeCurrentPage === page ? 700 : 500,
                            transition: 'all 0.15s'
                          }}
                        >
                          {page}
                        </button>
                      ) : (
                        <span key={pIdx} style={{ padding: '0 6px', color: '#94a3b8', fontSize: '0.9rem' }}>
                          {page}
                        </span>
                      )
                    ))}

                    <button
                      type="button"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={safeCurrentPage === totalPages}
                      style={{
                        padding: '6px 12px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        background: safeCurrentPage === totalPages ? '#f1f5f9' : 'white',
                        cursor: safeCurrentPage === totalPages ? 'not-allowed' : 'pointer',
                        color: safeCurrentPage === totalPages ? '#94a3b8' : '#334155',
                        fontSize: '0.84rem',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      Selanjutnya <i className="fas fa-chevron-right" style={{ fontSize: '0.75rem' }}></i>
                    </button>
                  </div>
                )}
              </div>
            )}
            </>
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
                  {isAdmin && (
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
                  )}
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
