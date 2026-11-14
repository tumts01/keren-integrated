'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import InlineLoading from '@/components/InlineLoading';

export default function MonitoringOlimpiadePage() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCabang, setFilterCabang] = useState('Semua');
  const [cabangOptions, setCabangOptions] = useState<string[]>([]);
  const [publishedByTahap, setPublishedByTahap] = useState<{
    seleksi: string[];
    final: string[];
    seni: string[];
  }>({ seleksi: [], final: [], seni: [] });
  const [publishedAtByTahap, setPublishedAtByTahap] = useState<{
    seleksi: string | null;
    final: string | null;
    seni: string | null;
  }>({ seleksi: null, final: null, seni: null });
  const [linkSkByTahap, setLinkSkByTahap] = useState<{
    seleksi: string;
    final: string;
    seni: string;
  }>({ seleksi: '', final: '', seni: '' });
  const [tempLinkSk, setTempLinkSk] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [tempSelectedCabang, setTempSelectedCabang] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tahapView, setTahapView] = useState<'seleksi' | 'final' | 'seni'>('seleksi');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(30);

  const publishedCabang = publishedByTahap[tahapView] || [];
  const publishedAt = publishedAtByTahap[tahapView] || null;
  const linkSkPengumuman = linkSkByTahap[tahapView] || '';
  const anyStagePublished =
    publishedByTahap.seleksi.length > 0 ||
    publishedByTahap.final.length > 0 ||
    publishedByTahap.seni.length > 0;
  const tahapLabel =
    tahapView === 'final'
      ? 'Babak Final (Akademik)'
      : tahapView === 'seni'
      ? 'Lomba Seni'
      : 'Babak Seleksi (Akademik)';

  const applyConfigResponse = (json: any) => {
    const seleksiList = Array.isArray(json.published_cabang_seleksi) ? json.published_cabang_seleksi : [];
    const finalList = Array.isArray(json.published_cabang_final) ? json.published_cabang_final : [];
    const seniList = Array.isArray(json.published_cabang_seni) ? json.published_cabang_seni : [];
    setPublishedByTahap({ seleksi: seleksiList, final: finalList, seni: seniList });

    if (json.published_at_by_tahap) {
      setPublishedAtByTahap({
        seleksi: json.published_at_by_tahap.seleksi || null,
        final: json.published_at_by_tahap.final || null,
        seni: json.published_at_by_tahap.seni || null,
      });
    }
    if (json.link_sk_pengumuman_by_tahap) {
      setLinkSkByTahap({
        seleksi: json.link_sk_pengumuman_by_tahap.seleksi || '',
        final: json.link_sk_pengumuman_by_tahap.final || '',
        seni: json.link_sk_pengumuman_by_tahap.seni || '',
      });
    }
  };

  useEffect(() => {
    const sessionStr = localStorage.getItem('keren_user_data');
    if (sessionStr) {
      try {
        const session = JSON.parse(sessionStr);
        const role = (session.role || '').toLowerCase();
        setIsAdmin(role === 'admin' || role === 'administrator' || role.includes('admin'));
      } catch (e) {
        setIsAdmin(false);
      }
    }
    fetchData('seleksi');
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/olimpiade-seni/config');
      const json = await res.json();
      if (json.success) {
        applyConfigResponse(json);
      }
    } catch (err) {
      console.error('Gagal fetch config:', err);
    }
  };

  const fetchData = async (targetTahap?: 'seleksi' | 'final' | 'seni') => {
    const t = targetTahap || tahapView;
    setLoading(true);
    try {
      const res = await fetch(`/api/olimpiade-seni/monitoring?tahap=${t}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        
        // Ekstrak cabang lomba unik (gunakan cabang_list dari API agar semua mapel selalu muncul)
        const fromList = Array.isArray(json.cabang_list) ? json.cabang_list : [];
        const fromData = json.data.map((d: any) => d.cabang_lomba).filter(Boolean);
        const cabangs = Array.from(new Set([...fromList, ...fromData])).sort();
        setCabangOptions(cabangs as string[]);
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Gagal memuat data monitoring', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Toggle publikasi cabang tertentu untuk tahap aktif (1-klik dari banner quick toggle)
  const handleToggleCabang = async (cabangName: string) => {
    setPublishing(true);
    try {
      const isCurrentlyPub = publishedCabang.includes(cabangName);
      const res = await fetch('/api/olimpiade-seni/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toggle_cabang: cabangName, tahap: tahapView }),
      });
      const json = await res.json();
      if (json.success) {
        applyConfigResponse(json);
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: isCurrentlyPub ? 'info' : 'success',
          title: isCurrentlyPub ? `[${tahapLabel}] ${cabangName} disembunyikan` : `[${tahapLabel}] ${cabangName} dipublikasikan!`,
          showConfirmButton: false,
          timer: 2000,
        });
      } else {
        Swal.fire('Gagal', json.error, 'error');
      }
    } catch (err: any) {
      Swal.fire('Error', 'Gagal mengubah status publikasi', 'error');
    } finally {
      setPublishing(false);
    }
  };

  // Buka dialog custom publikasi
  const openPublishModal = () => {
    setTempSelectedCabang(publishedCabang.filter(c => cabangOptions.includes(c)));
    setTempLinkSk(linkSkPengumuman || '');
    setShowPublishModal(true);
  };

  // Simpan perubahan dari modal custom publikasi untuk tahap aktif
  const handleSaveModal = async () => {
    setPublishing(true);
    try {
      const res = await fetch('/api/olimpiade-seni/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tahap: tahapView,
          published_cabang: tempSelectedCabang,
          link_sk_pengumuman: (tempLinkSk || '').trim()
        }),
      });
      const json = await res.json();
      if (json.success) {
        applyConfigResponse(json);
        setShowPublishModal(false);
        Swal.fire('Berhasil!', `Pengaturan publikasi ${tahapLabel} berhasil disimpan (${(json.published_cabang || []).length} lomba dipublikasikan).`, 'success');
      } else {
        Swal.fire('Gagal', json.error, 'error');
      }
    } catch (err: any) {
      Swal.fire('Error', 'Gagal menyimpan publikasi lomba', 'error');
    } finally {
      setPublishing(false);
    }
  };

  // Aksi Download SK Pengumuman
  const handleDownloadSK = () => {
    const isSkReady = publishedCabang.length > 0;
    if (!isSkReady) {
      Swal.fire({
        icon: 'info',
        title: 'SK Belum Tersedia',
        text: 'Tombol Download SK Pengumuman masih dinonaktifkan karena panitia belum mempublikasikan hasil lomba.',
        confirmButtonColor: '#3b82f6',
        confirmButtonText: 'Mengerti',
      });
      return;
    }

    if (!linkSkPengumuman || !linkSkPengumuman.trim()) {
      if (isAdmin) {
        Swal.fire({
          icon: 'warning',
          title: 'Tautan SK Belum Diatur',
          text: 'Anda masuk sebagai Admin. Tautan dokumen SK Pengumuman belum diatur. Apakah Anda ingin mengaturnya sekarang?',
          showCancelButton: true,
          confirmButtonColor: '#f59e0b',
          confirmButtonText: 'Atur Link Sekarang',
          cancelButtonText: 'Nanti',
        }).then((result) => {
          if (result.isConfirmed) {
            handleEditLinkSK();
          }
        });
      } else {
        Swal.fire({
          icon: 'info',
          title: 'Tautan SK Sedang Disiapkan',
          text: 'Dokumen SK Pengumuman sedang disiapkan oleh panitia. Silakan cek kembali beberapa saat lagi.',
          confirmButtonColor: '#3b82f6',
          confirmButtonText: 'Tutup',
        });
      }
      return;
    }

    window.open(linkSkPengumuman.trim(), '_blank', 'noopener,noreferrer');
  };

  // Admin: Atur URL Tautan SK Pengumuman untuk tahap aktif
  const handleEditLinkSK = async () => {
    const { value: url } = await Swal.fire({
      title: `Atur Link SK (${tahapLabel})`,
      text: `Masukkan URL dokumen SK Pengumuman resmi untuk ${tahapLabel}:`,
      input: 'url',
      inputValue: linkSkPengumuman || '',
      inputPlaceholder: 'https://drive.google.com/...',
      showCancelButton: true,
      confirmButtonText: '<i class="fas fa-save"></i> Simpan Link',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#0284c7',
      inputValidator: (val) => {
        if (val && !val.trim().startsWith('http://') && !val.trim().startsWith('https://')) {
          return 'URL harus diawali dengan http:// atau https://';
        }
      }
    });

    if (url !== undefined) {
      const cleanUrl = (url || '').trim();
      try {
        Swal.showLoading();
        const res = await fetch('/api/olimpiade-seni/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ link_sk_pengumuman: cleanUrl, tahap: tahapView }),
        });
        const json = await res.json();
        if (json.success) {
          applyConfigResponse(json);
          Swal.fire({
            icon: 'success',
            title: 'Berhasil Disimpan!',
            text: cleanUrl ? `Tautan dokumen SK ${tahapLabel} berhasil disimpan.` : `Tautan dokumen SK ${tahapLabel} dikosongkan.`,
            timer: 2000,
            showConfirmButton: false,
          });
        } else {
          Swal.fire('Gagal', json.error || 'Gagal menyimpan tautan SK', 'error');
        }
      } catch (e: any) {
        Swal.fire('Error', e.message, 'error');
      }
    }
  };

  // Sembunyikan semua cabang pada tahap aktif
  const handleUnpublishAll = async () => {
    const result = await Swal.fire({
      title: `Sembunyikan Semua Hasil ${tahapLabel}?`,
      text: `Semua nilai cabang lomba pada ${tahapLabel} akan disembunyikan kembali dari publik dan peserta (tahap lain tidak terpengaruh). Lanjutkan?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Sembunyikan Tahap Ini',
      cancelButtonText: 'Batal',
    });

    if (!result.isConfirmed) return;

    setPublishing(true);
    try {
      const res = await fetch('/api/olimpiade-seni/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publish: false, tahap: tahapView }),
      });
      const json = await res.json();
      if (json.success) {
        applyConfigResponse(json);
        Swal.fire('Berhasil!', `Semua hasil ${tahapLabel} telah disembunyikan.`, 'success');
      } else {
        Swal.fire('Gagal', json.error, 'error');
      }
    } catch (err: any) {
      Swal.fire('Error', 'Gagal membatalkan publikasi', 'error');
    } finally {
      setPublishing(false);
    }
  };

  // Publikasikan semua cabang pada tahap aktif
  const handlePublishAll = async () => {
    const result = await Swal.fire({
      title: `Publikasikan Semua ${tahapLabel}?`,
      text: `Seluruh (${cabangOptions.length}) cabang lomba pada ${tahapLabel} akan dipublikasikan ke peserta dan publik (tahap lain tetap terpisah). Lanjutkan?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Publikasikan Tahap Ini',
      cancelButtonText: 'Batal',
    });

    if (!result.isConfirmed) return;

    setPublishing(true);
    try {
      const res = await fetch('/api/olimpiade-seni/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publish: true, published_cabang: cabangOptions, tahap: tahapView }),
      });
      const json = await res.json();
      if (json.success) {
        applyConfigResponse(json);
        Swal.fire('Berhasil!', `Semua cabang pada ${tahapLabel} berhasil dipublikasikan!`, 'success');
      } else {
        Swal.fire('Gagal', json.error, 'error');
      }
    } catch (err: any) {
      Swal.fire('Error', 'Gagal mempublikasikan hasil', 'error');
    } finally {
      setPublishing(false);
    }
  };

  const MAX_LOLOS = 30;
  const MAX_SENI_SMS_WINNERS = 6; // Juara 1-3 & Harapan 1-3

  // Filter cabang yang dapat ditampilkan di dropdown
  const displayCabangOptions = useMemo(() => {
    if (isAdmin) return cabangOptions;
    return cabangOptions.filter(c => publishedCabang.includes(c));
  }, [isAdmin, cabangOptions, publishedCabang]);

  // Data yang boleh dilihat (Admin melihat semua cabang, Non-admin hanya cabang yang dipublikasikan; Akademik max Top 30; khusus SMS hanya Juara 1-3 & Harapan 1-3)
  const visibleData = useMemo(() => {
    const base = isAdmin ? data : data.filter(d => publishedCabang.includes(d.cabang_lomba));
    const byCabangCount: Record<string, number> = {};
    const compareRow = (a: any, b: any) => {
      const diff = Number(b.rata_rata) - Number(a.rata_rata);
      if (diff !== 0) return diff;
      const durA = a.waktu_mulai && a.waktu_selesai ? Math.max(0, new Date(a.waktu_selesai).getTime() - new Date(a.waktu_mulai).getTime()) : Infinity;
      const durB = b.waktu_mulai && b.waktu_selesai ? Math.max(0, new Date(b.waktu_selesai).getTime() - new Date(b.waktu_mulai).getTime()) : Infinity;
      if (durA !== durB) return durA - durB;
      const finA = a.waktu_selesai ? new Date(a.waktu_selesai).getTime() : Infinity;
      const finB = b.waktu_selesai ? new Date(b.waktu_selesai).getTime() : Infinity;
      if (finA !== finB) return finA - finB;
      return (a.nomor_peserta || '').localeCompare(b.nomor_peserta || '');
    };

    const sortedBase = [...base].sort(compareRow);
    return sortedBase.filter(d => {
      if (d.kategori_lomba === 'akademik') {
        if (!d.lolos_seleksi) return false;
        byCabangCount[d.cabang_lomba] = (byCabangCount[d.cabang_lomba] || 0) + 1;
        return byCabangCount[d.cabang_lomba] <= MAX_LOLOS;
      }
      if ((d.cabang_lomba || '').trim().toUpperCase() === 'SMS') {
        if (Number(d.rata_rata) <= 0) return false;
        byCabangCount[d.cabang_lomba] = (byCabangCount[d.cabang_lomba] || 0) + 1;
        return byCabangCount[d.cabang_lomba] <= MAX_SENI_SMS_WINNERS;
      }
      return true;
    });
  }, [isAdmin, data, publishedCabang]);

  const isLolos = (d: any) => Boolean(d.lolos_seleksi);

  const filteredData = filterCabang === 'Semua' 
    ? visibleData 
    : visibleData.filter(d => d.cabang_lomba === filterCabang);

  // Hitung peringkat di dalam cabang lombanya masing-masing (1 s.d. 30 per mapel)
  const rankInCabangMap = useMemo(() => {
    const map: Record<string, number> = {};
    const byCabang: Record<string, any[]> = {};
    visibleData.forEach(d => {
      if ((tahapView === 'final' || tahapView === 'seni') && Number(d.rata_rata) <= 0) return;
      if (!byCabang[d.cabang_lomba]) byCabang[d.cabang_lomba] = [];
      byCabang[d.cabang_lomba].push(d);
    });
    Object.values(byCabang).forEach(list => {
      list.sort((a, b) => {
        const diff = Number(b.rata_rata) - Number(a.rata_rata);
        if (diff !== 0) return diff;
        const durA = a.waktu_mulai && a.waktu_selesai
          ? Math.max(0, new Date(a.waktu_selesai).getTime() - new Date(a.waktu_mulai).getTime())
          : Infinity;
        const durB = b.waktu_mulai && b.waktu_selesai
          ? Math.max(0, new Date(b.waktu_selesai).getTime() - new Date(b.waktu_mulai).getTime())
          : Infinity;
        if (durA !== durB) return durA - durB;
        const finA = a.waktu_selesai ? new Date(a.waktu_selesai).getTime() : Infinity;
        const finB = b.waktu_selesai ? new Date(b.waktu_selesai).getTime() : Infinity;
        if (finA !== finB) return finA - finB;
        return (a.nomor_peserta || '').localeCompare(b.nomor_peserta || '');
      });
      list.forEach((item, idx) => {
        map[item.id] = idx + 1;
      });
    });
    return map;
  }, [visibleData, tahapView]);

  // Urutkan per cabang lalu berdasarkan peringkat nilai tertinggi (tie-breaker: durasi lebih cepat)
  const sortedData = [...filteredData].sort((a, b) => {
    if (filterCabang === 'Semua' && a.cabang_lomba !== b.cabang_lomba) {
      return (a.cabang_lomba || '').localeCompare(b.cabang_lomba || '', 'id');
    }
    const diff = Number(b.rata_rata) - Number(a.rata_rata);
    if (diff !== 0) return diff;
    const durA = a.waktu_mulai && a.waktu_selesai
      ? Math.max(0, new Date(a.waktu_selesai).getTime() - new Date(a.waktu_mulai).getTime())
      : Infinity;
    const durB = b.waktu_mulai && b.waktu_selesai
      ? Math.max(0, new Date(b.waktu_selesai).getTime() - new Date(b.waktu_mulai).getTime())
      : Infinity;
    if (durA !== durB) return durA - durB;
    const finA = a.waktu_selesai ? new Date(a.waktu_selesai).getTime() : Infinity;
    const finB = b.waktu_selesai ? new Date(b.waktu_selesai).getTime() : Infinity;
    if (finA !== finB) return finA - finB;
    const selRankDiff = (a.peringkat_seleksi || 999) - (b.peringkat_seleksi || 999);
    if (selRankDiff !== 0) return selRankDiff;
    return (a.nomor_peserta || '').localeCompare(b.nomor_peserta || '');
  });

  const totalPages = itemsPerPage === 999999 ? 1 : Math.ceil(sortedData.length / itemsPerPage) || 1;
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, sortedData.length);
  const paginatedData = itemsPerPage === 999999 ? sortedData : sortedData.slice(startIndex, endIndex);

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

  // Export ke Excel
  const handleExportExcel = () => {
    if (!sortedData || sortedData.length === 0) {
      Swal.fire('Info', 'Tidak ada data peserta untuk di-download.', 'info');
      return;
    }

    const rows = sortedData.map((d, i) => {
      const globalRank = i + 1;
      const lolos = isLolos(d);
      const cabangRank = rankInCabangMap[d.id] || null;
      const displayRank = cabangRank || d.peringkat_seleksi || globalRank;
      const hasScore = Number(d.rata_rata) > 0;

      const durationText = (() => {
        if (d.waktu_mulai && d.waktu_selesai) {
          const start = new Date(d.waktu_mulai).getTime();
          const end = new Date(d.waktu_selesai).getTime();
          const diffInSeconds = Math.floor((end - start) / 1000);
          if (diffInSeconds < 0) return '-';
          const minutes = Math.floor(diffInSeconds / 60);
          const seconds = diffInSeconds % 60;
          return `${minutes}m ${seconds}s`;
        }
        return '-';
      })();

      let predikatStatus = '-';
      if (tahapView === 'final') {
        if (!hasScore) {
          predikatStatus = 'Finalis (Belum Ujian Final)';
        } else if (cabangRank && cabangRank <= 3) {
          predikatStatus = 'Peraih Medali Emas';
        } else if (cabangRank && cabangRank <= 6) {
          predikatStatus = 'Peraih Medali Perak';
        } else if (cabangRank && cabangRank <= 9) {
          predikatStatus = 'Peraih Medali Perunggu';
        } else {
          predikatStatus = `Finalis (#${cabangRank})`;
        }
      } else if (tahapView === 'seni') {
        if (!hasScore) {
          predikatStatus = 'Belum Dinilai Juri';
        } else if (cabangRank === 1) {
          predikatStatus = 'JUARA 1';
        } else if (cabangRank === 2) {
          predikatStatus = 'JUARA 2';
        } else if (cabangRank === 3) {
          predikatStatus = 'JUARA 3';
        } else if (cabangRank === 4) {
          predikatStatus = 'HARAPAN 1';
        } else if (cabangRank === 5) {
          predikatStatus = 'HARAPAN 2';
        } else if (cabangRank === 6) {
          predikatStatus = 'HARAPAN 3';
        } else {
          predikatStatus = `Peserta (#${cabangRank})`;
        }
      } else {
        if (!hasScore) {
          predikatStatus = 'Belum ada nilai';
        } else if (lolos) {
          predikatStatus = `LOLOS FINAL (Top ${MAX_LOLOS})`;
        } else {
          predikatStatus = 'TIDAK LOLOS';
        }
      }

      const rowObj: Record<string, any> = {
        'Peringkat': displayRank,
        'Nomor Peserta': d.nomor_peserta || '-',
        'Nama Peserta': d.nama || '-',
        'Asal Sekolah': d.asal_sekolah || '-',
        'Cabang Lomba': d.cabang_lomba || '-',
        'Kategori Lomba': d.kategori_lomba === 'akademik' ? 'Olimpiade Akademik' : 'Lomba Seni',
      };

      if (isAdmin) {
        rowObj['Penilai'] = d.kategori_lomba === 'akademik'
          ? (tahapView === 'final' ? 'CBT Final' : 'CBT Seleksi')
          : `${d.jumlah_juri || 0} Juri`;
        if (tahapView !== 'seni') {
          rowObj['Pelanggaran'] = d.log_kecurangan && d.log_kecurangan.length > 0
            ? `${d.log_kecurangan.length}x`
            : '0x (Bersih)';
        }
      }

      if (tahapView !== 'seni') {
        rowObj['Waktu Mengerjakan'] = durationText;
      }

      if (tahapView === 'final') {
        if (d.kategori_lomba === 'akademik') {
          const smFinal = d.skor_mentah_final !== null && d.skor_mentah_final !== undefined
            ? d.skor_mentah_final
            : (d.skor_mentah !== null && d.skor_mentah !== undefined ? d.skor_mentah : (hasScore ? Math.round(Number(d.rata_rata) * 1.2) : '-'));
          rowObj['Skor Mentah Final'] = smFinal;
        }
        rowObj['Nilai Final CBT'] = hasScore ? Number(d.rata_rata) : 0;
        if (d.kategori_lomba === 'akademik') {
          const smSeleksi = d.skor_mentah_seleksi !== null && d.skor_mentah_seleksi !== undefined
            ? d.skor_mentah_seleksi
            : (d.nilai_seleksi && Number(d.nilai_seleksi) > 0 ? Math.round(Number(d.nilai_seleksi) * 1.6) : '-');
          rowObj['Skor Mentah Penyisihan'] = smSeleksi;
          rowObj['Nilai Penyisihan CBT'] = d.nilai_seleksi && Number(d.nilai_seleksi) > 0 ? Number(d.nilai_seleksi) : '-';
        }
        rowObj['Predikat / Medali'] = predikatStatus;
      } else if (tahapView === 'seni') {
        rowObj['Nilai Akhir (Juri)'] = hasScore ? Number(d.rata_rata) : 0;
        rowObj['Predikat / Juara'] = predikatStatus;
      } else {
        if (d.kategori_lomba === 'akademik') {
          const smSeleksi = d.skor_mentah_seleksi !== null && d.skor_mentah_seleksi !== undefined
            ? d.skor_mentah_seleksi
            : (d.skor_mentah !== null && d.skor_mentah !== undefined ? d.skor_mentah : (hasScore ? Math.round(Number(d.rata_rata) * 1.6) : '-'));
          rowObj['Skor Mentah Penyisihan'] = smSeleksi;
        }
        rowObj['Nilai Penyisihan CBT'] = hasScore ? Number(d.rata_rata) : 0;
        if (d.kategori_lomba === 'akademik') {
          const smFinal = d.skor_mentah_final !== null && d.skor_mentah_final !== undefined
            ? d.skor_mentah_final
            : (d.nilai_final && Number(d.nilai_final) > 0 ? Math.round(Number(d.nilai_final) * 1.2) : '-');
          rowObj['Skor Mentah Final'] = smFinal;
          rowObj['Nilai Final CBT'] = d.nilai_final && Number(d.nilai_final) > 0 ? Number(d.nilai_final) : '-';
        }
        rowObj['Status Kelolosan'] = predikatStatus;
      }

      return rowObj;
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 10 },
      { wch: 18 },
      { wch: 32 },
      { wch: 32 },
      { wch: 20 },
      { wch: 20 },
      ...(isAdmin ? [{ wch: 16 }, ...(tahapView !== 'seni' ? [{ wch: 16 }] : [])] : []),
      ...(tahapView !== 'seni' ? [{ wch: 20 }] : []),
      ...(tahapView !== 'seni' ? [{ wch: 22 }] : []),
      { wch: 20 },
      ...(tahapView !== 'seni' ? [{ wch: 22 }, { wch: 20 }] : []),
      { wch: 26 },
    ];

    const wb = XLSX.utils.book_new();
    const sheetName = tahapView === 'final' 
      ? 'Final Akademik' 
      : tahapView === 'seni' 
      ? 'Juara Seni' 
      : 'Seleksi Akademik';
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    const dateStr = new Date().toISOString().slice(0, 10);
    const cabangStr = filterCabang !== 'Semua' ? `_${filterCabang.replace(/\s+/g, '_')}` : '_Semua_Cabang';
    const filename = `Klasemen_LiveScore_${tahapView === 'final' ? 'Final_Akademik' : tahapView === 'seni' ? 'Juara_Seni' : 'Seleksi_Akademik'}${cabangStr}_${dateStr}.xlsx`;

    XLSX.writeFile(wb, filename);

    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'File Excel berhasil di-download!',
      showConfirmButton: false,
      timer: 2000,
    });
  };

  const juaraUmumList = useMemo(() => {
    const activeCabangs = isAdmin ? cabangOptions : displayCabangOptions;
    if (!activeCabangs || activeCabangs.length === 0 || visibleData.length === 0) return [];
    
    const schoolPoints: Record<string, { totalPoints: number, j1: number, j2: number, j3: number }> = {};

    activeCabangs.forEach(cabang => {
      // Dapatkan top 3 untuk cabang ini
      const inCabang = visibleData
        .filter(d => d.cabang_lomba === cabang && Number(d.rata_rata) > 0)
        .sort((a, b) => Number(b.rata_rata) - Number(a.rata_rata));

      const getSekolah = (row: any) => {
        if (!row || !row.asal_sekolah || row.asal_sekolah.trim() === '-' || row.asal_sekolah.trim() === '') return null;
        return row.asal_sekolah.trim().toUpperCase();
      };

      if (inCabang[0]) {
        const s1 = getSekolah(inCabang[0]);
        if (s1) {
          if (!schoolPoints[s1]) schoolPoints[s1] = { totalPoints: 0, j1: 0, j2: 0, j3: 0 };
          schoolPoints[s1].j1 += 1;
          schoolPoints[s1].totalPoints += 3;
        }
      }
      
      if (inCabang[1]) {
        const s2 = getSekolah(inCabang[1]);
        if (s2) {
          if (!schoolPoints[s2]) schoolPoints[s2] = { totalPoints: 0, j1: 0, j2: 0, j3: 0 };
          schoolPoints[s2].j2 += 1;
          schoolPoints[s2].totalPoints += 2;
        }
      }

      if (inCabang[2]) {
        const s3 = getSekolah(inCabang[2]);
        if (s3) {
          if (!schoolPoints[s3]) schoolPoints[s3] = { totalPoints: 0, j1: 0, j2: 0, j3: 0 };
          schoolPoints[s3].j3 += 1;
          schoolPoints[s3].totalPoints += 1;
        }
      }
    });

    return Object.entries(schoolPoints)
      .map(([sekolah, stats]) => ({ sekolah, ...stats }))
      .sort((a, b) => b.totalPoints - a.totalPoints || b.j1 - a.j1 || b.j2 - a.j2 || b.j3 - a.j3 || a.sekolah.localeCompare(b.sekolah));
  }, [visibleData, cabangOptions, displayCabangOptions, isAdmin]);

  const publishedCountInView = cabangOptions.filter(c => publishedCabang.includes(c)).length;
  const isAllPublished = cabangOptions.length > 0 && publishedCountInView === cabangOptions.length;
  const isPartiallyPublished = publishedCountInView > 0 && !isAllPublished;

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button 
          onClick={() => router.push('/olimpiade-seni')}
          style={{ background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem' }}
        >
          <i className="fas fa-arrow-left"></i> Kembali ke Beranda Olimpiade
        </button>
        {isAdmin && (
          <button 
            onClick={() => router.push('/olimpiade-seni/cbt-monitoring')}
            style={{ background: '#7c3aed', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', boxShadow: '0 2px 6px rgba(124,58,237,0.3)' }}
          >
            <i className="fas fa-desktop"></i> Monitoring Pengerjaan CBT & Sesi
          </button>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h2 style={{ margin: '0 0 8px 0', color: '#0f172a' }}>Monitoring Pemenang (Live Score)</h2>
          <p style={{ margin: 0, color: '#64748b' }}>Klasemen nilai peserta Olimpiade & Lomba Seni secara real-time</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Tombol Download SK Pengumuman: Aktif jika hasil lomba dipublis, Mati jika belum */}
          <button
            onClick={handleDownloadSK}
            title={
              publishedCabang.length === 0
                ? 'Tombol SK Pengumuman belum aktif karena hasil lomba belum dipublikasikan oleh panitia'
                : linkSkPengumuman
                ? 'Klik untuk mengunduh / membuka Dokumen SK Pengumuman Resmi'
                : 'Dokumen SK Pengumuman (Tautan sedang disiapkan)'
            }
            style={{
              background: publishedCabang.length > 0
                ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)'
                : '#94a3b8',
              color: 'white',
              border: 'none',
              padding: '10px 18px',
              borderRadius: '8px',
              cursor: publishedCabang.length > 0 ? 'pointer' : 'not-allowed',
              fontWeight: 700,
              fontSize: '0.9rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: publishedCabang.length > 0 ? '0 2px 8px rgba(220,38,38,0.35)' : 'none',
              opacity: publishedCabang.length > 0 ? 1 : 0.65,
              transition: 'all 0.15s ease',
            }}
          >
            <i className={`fas ${publishedCabang.length > 0 ? 'fa-file-pdf' : 'fa-lock'}`}></i>
            <span>Download SK Pengumuman</span>
            {publishedCabang.length === 0 && (
              <span style={{
                background: 'rgba(0,0,0,0.22)',
                padding: '2px 7px',
                borderRadius: '4px',
                fontSize: '0.72rem',
                fontWeight: 600,
                letterSpacing: '0.3px',
                marginLeft: '2px'
              }}>
                Terkunci
              </span>
            )}
          </button>

          {/* Tombol Admin: Atur Link SK & Manajemen Juri */}
          {isAdmin && (
            <>
              <button
                onClick={() => router.push('/olimpiade-seni/admin-juri')}
                title="Kelola Akun Juri, Tabel Kriteria Penilaian & Monitoring Juri Seni"
                style={{
                  background: '#7c3aed',
                  color: 'white',
                  border: 'none',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 6px rgba(124,58,237,0.25)',
                  transition: 'all 0.15s ease'
                }}
              >
                <i className="fas fa-gavel"></i> Manajemen Juri Seni
              </button>
              <button
                onClick={handleEditLinkSK}
                title={`Atur tautan URL dokumen SK Pengumuman (${tahapLabel})`}
                style={{
                  background: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 6px rgba(245,158,11,0.25)',
                  transition: 'all 0.15s ease'
                }}
              >
                <i className="fas fa-link"></i> Atur Link SK ({tahapView === 'seleksi' ? 'Seleksi' : tahapView === 'final' ? 'Final' : 'Seni'})
              </button>
            </>
          )}

          {(isAdmin || publishedCabang.length > 0) && (
            <button 
              onClick={handleExportExcel}
              title="Download data klasemen pemenang ke file Excel"
              style={{
                background: '#16a34a',
                color: 'white',
                border: 'none',
                padding: '10px 18px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.9rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 6px rgba(22,163,74,0.3)',
                transition: 'all 0.15s ease'
              }}
            >
              <i className="fas fa-file-excel"></i> Download Excel
            </button>
          )}
          {(isAdmin || anyStagePublished) && (
            <button 
              onClick={() => { fetchData(); fetchConfig(); }}
              style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}
            >
              <i className={`fas fa-sync ${loading ? 'fa-spin' : ''}`}></i> Refresh
            </button>
          )}
        </div>
      </div>

      {/* Tampilan jika belum ada satupun tahap & cabang yang dipublikasikan (khusus non-admin) */}
      {!isAdmin && !anyStagePublished ? (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '60px 20px', textAlign: 'center', marginTop: '40px' }}>
          <i className="fas fa-eye-slash" style={{ fontSize: '4rem', color: '#fcd34d', marginBottom: '20px' }}></i>
          <h3 style={{ margin: '0 0 12px 0', color: '#92400e', fontSize: '1.5rem' }}>Live Score Sedang Disembunyikan</h3>
          <p style={{ margin: '0 0 16px 0', color: '#b45309', fontSize: '1.1rem' }}>
            Hasil ujian belum dipublikasikan oleh panitia. Mohon menunggu pengumuman resmi.
          </p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#fef3c7', padding: '8px 16px', borderRadius: '8px', color: '#92400e', fontSize: '0.88rem' }}>
            <i className="fas fa-info-circle"></i>
            <span>Tombol <b>Download SK Pengumuman</b> di atas akan aktif otomatis setelah hasil lomba resmi diumumkan panitia.</span>
          </div>
        </div>
      ) : (
        <>
          {/* Status Banner Publikasi untuk Admin (Full Custom) */}
          {isAdmin && (
            <div style={{
              background: isAllPublished ? '#f0fdf4' : isPartiallyPublished ? '#f0f9ff' : '#fffbeb',
              border: `1.5px solid ${isAllPublished ? '#86efac' : isPartiallyPublished ? '#bae6fd' : '#fde68a'}`,
              borderRadius: '12px',
              padding: '16px 20px',
              marginBottom: '24px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '10px',
                    background: isAllPublished ? '#16a34a' : isPartiallyPublished ? '#0284c7' : '#f59e0b',
                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.25rem', boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                  }}>
                    <i className={`fas ${publishedCabang.length > 0 ? 'fa-bullhorn' : 'fa-eye-slash'}`}></i>
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', color: isAllPublished ? '#15803d' : isPartiallyPublished ? '#0369a1' : '#92400e', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{
                        padding: '2px 9px',
                        borderRadius: '6px',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.4px',
                        background: tahapView === 'final' ? '#fef3c7' : tahapView === 'seni' ? '#f3e8ff' : '#e0f2fe',
                        color: tahapView === 'final' ? '#92400e' : tahapView === 'seni' ? '#6d28d9' : '#0369a1',
                        border: `1px solid ${tahapView === 'final' ? '#fcd34d' : tahapView === 'seni' ? '#d8b4fe' : '#7dd3fc'}`
                      }}>
                        {tahapLabel}
                      </span>
                      <span>
                        {isAllPublished
                          ? 'Semua Cabang Lomba Telah Dipublikasikan'
                          : isPartiallyPublished
                          ? `Publikasi Kustom Aktif (${publishedCountInView} dari ${cabangOptions.length} Lomba)`
                          : `Hasil ${tahapLabel} Masih Disembunyikan`}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: isAllPublished ? '#16a34a' : isPartiallyPublished ? '#0284c7' : '#b45309', marginTop: '4px' }}>
                      {publishedCabang.length > 0
                        ? `Peserta & publik hanya dapat melihat nilai ${tahapLabel} untuk lomba yang dicentang (${publishedCabang.join(', ')}).`
                        : `Peserta dan publik saat ini belum bisa melihat klasemen ${tahapLabel}.`}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                      {(['seleksi', 'final', 'seni'] as const).map((t) => {
                        const cnt = publishedByTahap[t].length;
                        const label = t === 'seleksi' ? 'Seleksi' : t === 'final' ? 'Final' : 'Seni';
                        const active = tahapView === t;
                        return (
                          <span
                            key={t}
                            style={{
                              fontSize: '0.73rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '999px',
                              background: cnt > 0 ? '#dcfce7' : '#f1f5f9',
                              color: cnt > 0 ? '#15803d' : '#64748b',
                              border: `1px solid ${active ? '#0284c7' : cnt > 0 ? '#86efac' : '#cbd5e1'}`
                            }}
                          >
                            {label}: {cnt > 0 ? `${cnt} Publik` : 'Tertutup'}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    onClick={openPublishModal}
                    disabled={publishing}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      background: '#0284c7',
                      color: 'white',
                      border: 'none',
                      fontWeight: 700,
                      cursor: publishing ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '0.88rem',
                      boxShadow: '0 2px 4px rgba(2,132,199,0.25)'
                    }}
                  >
                    <i className="fas fa-sliders-h"></i> Atur Publikasi Lomba
                  </button>

                  {!isAllPublished && (
                    <button
                      onClick={handlePublishAll}
                      disabled={publishing}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        fontWeight: 700,
                        cursor: publishing ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '0.88rem'
                      }}
                    >
                      <i className="fas fa-check-double"></i> Publikasikan Semua
                    </button>
                  )}

                  {publishedCabang.length > 0 && (
                    <button
                      onClick={handleUnpublishAll}
                      disabled={publishing}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        fontWeight: 700,
                        cursor: publishing ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '0.88rem'
                      }}
                    >
                      <i className="fas fa-eye-slash"></i> Sembunyikan Semua
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Toggle Badges */}
              <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Quick Toggle {tahapLabel} (Klik nama lomba untuk publikasi / sembunyikan langsung):
                  </span>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    Terbit: <b style={{ color: '#16a34a' }}>{publishedCountInView}</b> | Tertutup: <b style={{ color: '#dc2626' }}>{Math.max(0, cabangOptions.length - publishedCountInView)}</b>
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {cabangOptions.map(c => {
                    const isPub = publishedCabang.includes(c);
                    const countPeserta = data.filter(d => d.cabang_lomba === c).length;
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => handleToggleCabang(c)}
                        disabled={publishing}
                        title={isPub ? `Klik untuk menyembunyikan ${c}` : `Klik untuk mempublikasikan ${c}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 14px',
                          borderRadius: '20px',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: publishing ? 'not-allowed' : 'pointer',
                          border: isPub ? '1px solid #86efac' : '1px dashed #cbd5e1',
                          background: isPub ? '#ecfdf5' : '#ffffff',
                          color: isPub ? '#065f46' : '#64748b',
                          boxShadow: isPub ? '0 1px 2px rgba(16,185,129,0.1)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <i className={`fas ${isPub ? 'fa-check-circle' : 'fa-circle-notch'}`} style={{ color: isPub ? '#10b981' : '#94a3b8' }}></i>
                        <span>{c}</span>
                        <span style={{
                          background: isPub ? '#a7f3d0' : '#f1f5f9',
                          color: isPub ? '#047857' : '#64748b',
                          padding: '1px 6px',
                          borderRadius: '10px',
                          fontSize: '0.72rem'
                        }}>
                          {countPeserta}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: isPub ? '#059669' : '#94a3b8', marginLeft: '2px' }}>
                          [{isPub ? 'PUBLIK' : 'OFF'}]
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Info & Pengaturan Dokumen SK Pengumuman di Admin Banner */}
              <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                  <i className="fas fa-file-pdf" style={{ color: '#dc2626', fontSize: '1rem' }}></i>
                  <span style={{ fontWeight: 700, color: '#334155' }}>Dokumen SK Pengumuman:</span>
                  {linkSkPengumuman ? (
                    <a
                      href={linkSkPengumuman}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#0284c7', textDecoration: 'underline', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <span>{linkSkPengumuman.length > 45 ? `${linkSkPengumuman.slice(0, 45)}...` : linkSkPengumuman}</span>
                      <i className="fas fa-external-link-alt" style={{ fontSize: '0.75rem' }}></i>
                    </a>
                  ) : (
                    <span style={{ color: '#b45309', fontStyle: 'italic', background: '#fef3c7', padding: '2px 8px', borderRadius: '4px' }}>
                      Belum diatur (klik tombol di samping untuk mengatur tautan SK)
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleEditLinkSK}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: 'white',
                    color: '#0f172a',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <i className="fas fa-edit" style={{ color: '#f59e0b' }}></i> Ubah Link SK
                </button>
              </div>
            </div>
          )}

          {/* Banner Informasi untuk Publik/Peserta jika tahap ini dipublikasikan */}
          {!isAdmin && publishedCabang.length > 0 && (
            <div style={{
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '10px',
              padding: '12px 18px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: '#1e40af',
              fontSize: '0.92rem'
            }}>
              <i className="fas fa-bullhorn" style={{ color: '#2563eb', fontSize: '1.1rem' }}></i>
              <div>
                <span>Cabang lomba {tahapLabel} yang telah dipublikasikan ({publishedCabang.length}): <b>{publishedCabang.join(', ')}</b>.</span>
                {cabangOptions.length > publishedCountInView && (
                  <span style={{ color: '#64748b', marginLeft: '6px' }}>(Cabang lainnya masih dalam tahap penilaian / belum dipublikasikan)</span>
                )}
              </div>
            </div>
          )}

          {/* Klasemen Juara Umum Sekolah sementara dinonaktifkan */}

          {/* TAB TAHAPAN: BABAK SELEKSI vs BABAK FINAL AKADEMIK vs JUARA LOMBA SENI */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '12px',
            marginBottom: '20px'
          }}>
            {/* TAB 1: Babak Seleksi Olimpiade Akademik */}
            <button
              type="button"
              onClick={() => {
                setTahapView('seleksi');
                setFilterCabang('Semua');
                setCurrentPage(1);
                fetchData('seleksi');
              }}
              style={{
                padding: '16px 20px',
                borderRadius: '12px',
                border: tahapView === 'seleksi' ? '2px solid #0284c7' : '1.5px solid #cbd5e1',
                background: tahapView === 'seleksi' ? '#f0f9ff' : 'white',
                color: tahapView === 'seleksi' ? '#0369a1' : '#475569',
                cursor: 'pointer',
                textAlign: 'left',
                boxShadow: tahapView === 'seleksi' ? '0 4px 12px rgba(2,132,199,0.15)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ fontWeight: 800, fontSize: '1.02rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fas fa-filter" style={{ color: tahapView === 'seleksi' ? '#0284c7' : '#94a3b8' }}></i>
                  1. Babak Seleksi (Olimpiade Akademik)
                </span>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '999px',
                  background: publishedByTahap.seleksi.length > 0 ? '#dcfce7' : '#f1f5f9',
                  color: publishedByTahap.seleksi.length > 0 ? '#15803d' : '#64748b',
                  border: `1px solid ${publishedByTahap.seleksi.length > 0 ? '#86efac' : '#cbd5e1'}`
                }}>
                  {publishedByTahap.seleksi.length > 0 ? `${publishedByTahap.seleksi.length} Publik` : 'Disembunyikan'}
                </span>
              </div>
              <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '4px', lineHeight: 1.4 }}>
                Penyaringan <b>Top {MAX_LOLOS} Peserta Terbaik</b> per cabang lomba Akademik untuk melaju ke Babak Final CBT.
              </div>
            </button>

            {/* TAB 2: Babak Final & Penentuan Juara (Akademik) */}
            <button
              type="button"
              onClick={() => {
                setTahapView('final');
                setFilterCabang('Semua');
                setCurrentPage(1);
                fetchData('final');
              }}
              style={{
                padding: '16px 20px',
                borderRadius: '12px',
                border: tahapView === 'final' ? '2px solid #d97706' : '1.5px solid #cbd5e1',
                background: tahapView === 'final' ? '#fffbeb' : 'white',
                color: tahapView === 'final' ? '#92400e' : '#475569',
                cursor: 'pointer',
                textAlign: 'left',
                boxShadow: tahapView === 'final' ? '0 4px 12px rgba(217,119,6,0.15)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ fontWeight: 800, fontSize: '1.02rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fas fa-trophy" style={{ color: tahapView === 'final' ? '#d97706' : '#94a3b8' }}></i>
                  2. Babak Final &amp; Medali (Akademik)
                </span>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '999px',
                  background: publishedByTahap.final.length > 0 ? '#dcfce7' : '#f1f5f9',
                  color: publishedByTahap.final.length > 0 ? '#15803d' : '#64748b',
                  border: `1px solid ${publishedByTahap.final.length > 0 ? '#86efac' : '#cbd5e1'}`
                }}>
                  {publishedByTahap.final.length > 0 ? `${publishedByTahap.final.length} Publik` : 'Disembunyikan'}
                </span>
              </div>
              <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '4px', lineHeight: 1.4 }}>
                Penentuan <b>Medali Emas (1–3), Perak (4–6), Perunggu (7–9)</b> &amp; Peringkat 10–30 dari Nilai CBT Final.
              </div>
            </button>

            {/* TAB 3: Penentuan Juara (Lomba Seni) */}
            <button
              type="button"
              onClick={() => {
                setTahapView('seni');
                setFilterCabang('Semua');
                setCurrentPage(1);
                fetchData('seni');
              }}
              style={{
                padding: '16px 20px',
                borderRadius: '12px',
                border: tahapView === 'seni' ? '2px solid #7c3aed' : '1.5px solid #cbd5e1',
                background: tahapView === 'seni' ? '#faf5ff' : 'white',
                color: tahapView === 'seni' ? '#6d28d9' : '#475569',
                cursor: 'pointer',
                textAlign: 'left',
                boxShadow: tahapView === 'seni' ? '0 4px 12px rgba(124,58,237,0.15)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ fontWeight: 800, fontSize: '1.02rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fas fa-palette" style={{ color: tahapView === 'seni' ? '#7c3aed' : '#94a3b8' }}></i>
                  3. Penentuan Juara (Lomba Seni)
                </span>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '999px',
                  background: publishedByTahap.seni.length > 0 ? '#dcfce7' : '#f1f5f9',
                  color: publishedByTahap.seni.length > 0 ? '#15803d' : '#64748b',
                  border: `1px solid ${publishedByTahap.seni.length > 0 ? '#86efac' : '#cbd5e1'}`
                }}>
                  {publishedByTahap.seni.length > 0 ? `${publishedByTahap.seni.length} Publik` : 'Disembunyikan'}
                </span>
              </div>
              <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '4px', lineHeight: 1.4 }}>
                Penentuan <b>Juara 1–3 &amp; Harapan 1–3</b> tiap cabang murni dari akumulasi &amp; rata-rata penilaian Dewan Juri Seni.
              </div>
            </button>
          </div>

          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
            {!isAdmin && publishedCabang.length === 0 ? (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '48px 20px', textAlign: 'center' }}>
                <i className="fas fa-eye-slash" style={{ fontSize: '3rem', color: '#fcd34d', marginBottom: '14px' }}></i>
                <h3 style={{ margin: '0 0 8px 0', color: '#92400e', fontSize: '1.25rem' }}>
                  Hasil {tahapLabel} Belum Dipublikasikan
                </h3>
                <p style={{ margin: 0, color: '#b45309', fontSize: '0.96rem' }}>
                  Panitia belum mempublikasikan klasemen untuk tahap ini. Anda tetap dapat melihat tahap lain yang bertanda <b>Publik</b> pada tab di atas.
                </p>
              </div>
            ) : (
              <>
            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#334155' }}>
                  Filter Cabang Lomba ({tahapView === 'final' ? 'Babak Final Akademik' : tahapView === 'seni' ? 'Lomba Seni' : 'Babak Seleksi Akademik'})
                </label>
                <select 
                  value={filterCabang} 
                  onChange={(e) => {
                    setFilterCabang(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{ padding: '10px 15px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', minWidth: '300px' }}
                >
                  <option value="Semua">Semua Cabang Lomba</option>
                  {displayCabangOptions.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleExportExcel}
                  title="Download data klasemen ke file Excel"
                  style={{
                    background: '#16a34a',
                    color: 'white',
                    border: 'none',
                    padding: '9px 16px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.86rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 2px 6px rgba(22,163,74,0.25)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <i className="fas fa-file-excel"></i> Download Excel
                </button>
                <div style={{ fontSize: '0.85rem', color: '#64748b', background: '#f8fafc', padding: '8px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  {tahapView === 'final' ? (
                    <>
                      <i className="fas fa-medal" style={{ color: '#d97706', marginRight: '6px' }}></i>
                      Penentuan <b>Peraih Medali Emas (1–3)</b>, <b>Perak (4–6)</b>, <b>Perunggu (7–9)</b> &amp; <b>Peringkat 10–30</b> murni dari nilai Babak Final CBT.
                    </>
                  ) : tahapView === 'seni' ? (
                    <>
                      <i className="fas fa-palette" style={{ color: '#7c3aed', marginRight: '6px' }}></i>
                      Penentuan <b>Juara 1–3 &amp; Harapan 1–3</b> tiap cabang Lomba Seni ditentukan murni dari penilaian Dewan Juri
                      {(filterCabang === 'Semua' || filterCabang === 'SMS') && (
                        <> (khusus cabang <b>SMS</b> hanya menampilkan peraih Juara 1–3 &amp; Harapan 1–3)</>
                      )}.
                    </>
                  ) : (
                    <>
                      <i className="fas fa-info-circle" style={{ color: '#0284c7', marginRight: '6px' }}></i>
                      Menampilkan <b>{MAX_LOLOS} peserta yang lolos (Peringkat 1 s.d. {MAX_LOLOS})</b> pada setiap cabang mapel Olimpiade Akademik.
                    </>
                  )}
                </div>
              </div>
            </div>

            {loading ? (
              <div style={{ padding: '40px 0', textAlign: 'center' }}>
                <InlineLoading message="Menghitung klasemen..." />
              </div>
            ) : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', color: '#334155', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
                        <th style={{ padding: '15px' }}>Peringkat</th>
                        <th style={{ padding: '15px' }}>Nama Peserta</th>
                        <th style={{ padding: '15px' }}>Asal Sekolah</th>
                        {filterCabang === 'Semua' && <th style={{ padding: '15px' }}>Cabang Lomba</th>}
                        {isAdmin && (
                          <>
                            <th style={{ padding: '15px', textAlign: 'center' }}>Penilai</th>
                            {tahapView !== 'seni' && <th style={{ padding: '15px', textAlign: 'center' }}>Pelanggaran</th>}
                          </>
                        )}
                        {tahapView !== 'seni' && <th style={{ padding: '15px', textAlign: 'center' }}>Waktu Mengerjakan</th>}
                        {tahapView !== 'seni' && (
                          <th style={{ padding: '15px', textAlign: 'center' }}>Skor Mentah</th>
                        )}
                        <th style={{ padding: '15px', textAlign: 'center' }}>
                          {tahapView === 'final' ? 'Nilai Final CBT' : tahapView === 'seni' ? 'Nilai Akhir (Juri)' : 'Nilai Seleksi CBT'}
                        </th>
                        <th style={{ padding: '15px', textAlign: 'center' }}>
                          {tahapView === 'seleksi' ? `Status (Top ${MAX_LOLOS})` : tahapView === 'final' ? 'Predikat / Medali' : 'Predikat / Juara'}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedData.length === 0 ? (
                        <tr>
                          <td colSpan={6 + (filterCabang === 'Semua' ? 1 : 0) + (isAdmin ? (tahapView === 'seni' ? 1 : 2) : 0) - (tahapView === 'seni' ? 1 : 0) + (tahapView !== 'seni' ? 1 : 0)} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                            {tahapView === 'final'
                              ? 'Belum ada data Finalis atau nilai Babak Final Olimpiade Akademik.'
                              : tahapView === 'seni'
                              ? 'Belum ada data peserta atau penilaian Dewan Juri untuk Lomba Seni.'
                              : 'Belum ada data nilai Babak Seleksi Olimpiade Akademik.'}
                          </td>
                        </tr>
                      ) : (
                        paginatedData.map((d, i) => {
                          const globalRank = itemsPerPage === 999999 ? i + 1 : startIndex + i + 1;
                          const lolos = isLolos(d);
                          const cabangRank = rankInCabangMap[d.id] || null;
                          const displayRank = cabangRank || d.peringkat_seleksi || globalRank;
                          const hasScore = Number(d.rata_rata) > 0;
                          const showMedal = hasScore && (tahapView === 'final' ? displayRank <= 9 : tahapView === 'seni' ? displayRank <= 6 : displayRank <= 3);
                          const durationText = (() => {
                            if (d.waktu_mulai && d.waktu_selesai) {
                              const start = new Date(d.waktu_mulai).getTime();
                              const end = new Date(d.waktu_selesai).getTime();
                              const diffInSeconds = Math.floor((end - start) / 1000);
                              if (diffInSeconds < 0) return '-';
                              const minutes = Math.floor(diffInSeconds / 60);
                              const seconds = diffInSeconds % 60;
                              return `${minutes}m ${seconds}s`;
                            }
                            return '-';
                          })();

                          const rowBg = tahapView === 'final'
                            ? (cabangRank && cabangRank <= 3 ? '#fef9c3' : cabangRank && cabangRank <= 6 ? '#f1f5f9' : cabangRank && cabangRank <= 9 ? '#fff7ed' : 'white')
                            : tahapView === 'seni'
                            ? (cabangRank === 1 ? '#fef9c3' : cabangRank === 2 ? '#f1f5f9' : cabangRank === 3 ? '#fff7ed' : (cabangRank && cabangRank <= 6 ? '#faf5ff' : 'white'))
                            : (lolos ? (displayRank === 1 ? '#fef9c3' : displayRank === 2 ? '#f0fdf4' : displayRank === 3 ? '#fff7ed' : '#f0fdf4') : '#fff5f5');
                          
                          return (
                            <tr key={d.id} style={{ borderBottom: '1px solid #e2e8f0', background: rowBg }}>
                              <td style={{ padding: '15px', fontWeight: 'bold', color: showMedal ? (tahapView === 'final' ? (displayRank <= 3 ? '#ca8a04' : displayRank <= 6 ? '#475569' : '#ea580c') : tahapView === 'seni' ? (displayRank === 1 ? '#ca8a04' : displayRank === 2 ? '#64748b' : displayRank === 3 ? '#ea580c' : '#7c3aed') : (displayRank === 1 ? '#ca8a04' : displayRank === 2 ? '#64748b' : '#ea580c')) : '#334155' }}>
                                {tahapView === 'final' ? (
                                  showMedal && displayRank <= 3 ? <><i className="fas fa-medal" style={{color: '#eab308'}}></i> {displayRank}</> :
                                  showMedal && displayRank <= 6 ? <><i className="fas fa-medal" style={{color: '#94a3b8'}}></i> {displayRank}</> :
                                  showMedal && displayRank <= 9 ? <><i className="fas fa-medal" style={{color: '#c2410c'}}></i> {displayRank}</> :
                                  displayRank
                                ) : tahapView === 'seni' ? (
                                  showMedal && displayRank === 1 ? <><i className="fas fa-trophy" style={{color: '#eab308'}}></i> 1</> :
                                  showMedal && displayRank === 2 ? <><i className="fas fa-medal" style={{color: '#94a3b8'}}></i> 2</> :
                                  showMedal && displayRank === 3 ? <><i className="fas fa-medal" style={{color: '#c2410c'}}></i> 3</> :
                                  showMedal && displayRank <= 6 ? <><i className="fas fa-award" style={{color: '#7c3aed'}}></i> {displayRank}</> :
                                  displayRank
                                ) : (
                                  showMedal && displayRank === 1 ? <><i className="fas fa-trophy" style={{color: '#eab308'}}></i> 1</> : 
                                  showMedal && displayRank === 2 ? <><i className="fas fa-medal" style={{color: '#94a3b8'}}></i> 2</> : 
                                  showMedal && displayRank === 3 ? <><i className="fas fa-medal" style={{color: '#c2410c'}}></i> 3</> : 
                                  displayRank
                                )}
                              </td>
                              <td style={{ padding: '15px', fontWeight: 600 }}>
                                <div>{d.nama}</div>
                                {d.nomor_peserta && (
                                  <div style={{ fontSize: '0.76rem', color: '#94a3b8', fontWeight: 500 }}>{d.nomor_peserta}</div>
                                )}
                              </td>
                              <td style={{ padding: '15px', color: '#64748b' }}>{d.asal_sekolah || '-'}</td>
                              {filterCabang === 'Semua' && <td style={{ padding: '15px', color: '#0ea5e9', fontWeight: 500 }}>{d.cabang_lomba}</td>}
                              {isAdmin && (
                                <>
                                  <td style={{ padding: '15px', textAlign: 'center' }}>
                                    <span style={{ background: '#e2e8f0', padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem' }}>
                                      {d.kategori_lomba === 'akademik' ? (tahapView === 'final' ? 'CBT Final' : 'CBT Seleksi') : `${d.jumlah_juri} Juri`}
                                    </span>
                                  </td>
                                  {tahapView !== 'seni' && (
                                    <td style={{ padding: '15px', textAlign: 'center' }}>
                                      {d.log_kecurangan && d.log_kecurangan.length > 0 ? (
                                        <div
                                          title={d.log_kecurangan.map((l: any) => `${l.ke}. ${l.jenis === 'tab_switch' ? 'Pindah Tab' : l.jenis === 'fullscreen_exit' ? 'Keluar Fullscreen' : l.jenis} (${new Date(l.waktu).toLocaleTimeString('id-ID')})`).join('\n')}
                                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#fef2f2', color: '#ef4444', borderRadius: '20px', padding: '4px 12px', fontWeight: 700, fontSize: '0.85rem', cursor: 'help', border: '1px solid #fca5a5' }}
                                        >
                                          <i className="fas fa-exclamation-triangle"></i> {d.log_kecurangan.length}x
                                        </div>
                                      ) : (
                                        <span style={{ color: '#10b981', fontSize: '0.85rem' }}>
                                          <i className="fas fa-check-circle"></i> Bersih
                                        </span>
                                      )}
                                    </td>
                                  )}
                                </>
                              )}
                              {tahapView !== 'seni' && (
                                <td style={{ padding: '15px', textAlign: 'center', color: '#64748b', fontSize: '0.9rem', fontWeight: 500 }}>
                                  {durationText !== '-' ? (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', padding: '4px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                      <i className="fas fa-clock" style={{ color: '#94a3b8' }}></i> {durationText}
                                    </span>
                                  ) : '-'}
                                </td>
                              )}
                              {tahapView !== 'seni' && (
                                <td style={{ padding: '15px', textAlign: 'center' }}>
                                  {hasScore ? (
                                    <span style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      background: '#f8fafc',
                                      color: '#1e293b',
                                      border: '1.5px solid #cbd5e1',
                                      fontWeight: 800,
                                      fontSize: '0.95rem',
                                      padding: '3px 10px',
                                      borderRadius: '8px',
                                      minWidth: '46px'
                                    }}>
                                      {d.skor_mentah !== undefined && d.skor_mentah !== null
                                        ? d.skor_mentah
                                        : Math.round(Number(d.rata_rata) * (tahapView === 'final' ? 1.2 : 1.6))}
                                    </span>
                                  ) : (
                                    <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>-</span>
                                  )}
                                  {tahapView === 'final' && d.kategori_lomba === 'akademik' && d.skor_mentah_seleksi !== null && d.skor_mentah_seleksi !== undefined ? (
                                    <div style={{ fontSize: '0.73rem', color: '#64748b', marginTop: '3px' }}>
                                      Penyisihan: {d.skor_mentah_seleksi}
                                    </div>
                                  ) : null}
                                </td>
                              )}
                              <td style={{ padding: '15px', textAlign: 'center' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: Number(d.rata_rata) > 0 ? '#10b981' : '#94a3b8' }}>
                                  {d.rata_rata}
                                </div>
                                {tahapView === 'final' && d.kategori_lomba === 'akademik' && d.nilai_seleksi && Number(d.nilai_seleksi) > 0 ? (
                                  <div style={{ fontSize: '0.73rem', color: '#64748b', marginTop: '2px' }}>
                                    Seleksi: {d.nilai_seleksi}
                                  </div>
                                ) : null}
                              </td>
                              <td style={{ padding: '15px', textAlign: 'center' }}>
                                {tahapView === 'final' ? (
                                  Number(d.rata_rata) === 0 ? (
                                    <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                                      Finalis (Belum Ujian Final)
                                    </span>
                                  ) : cabangRank !== null && cabangRank <= 3 ? (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#fef08a', color: '#854d0e', borderRadius: '20px', padding: '5px 14px', fontWeight: 800, fontSize: '0.84rem', border: '1px solid #facc15' }}>
                                      <i className="fas fa-medal" style={{ color: '#ca8a04' }}></i> Peraih Medali Emas
                                    </span>
                                  ) : cabangRank !== null && cabangRank <= 6 ? (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#e2e8f0', color: '#334155', borderRadius: '20px', padding: '5px 14px', fontWeight: 800, fontSize: '0.84rem', border: '1px solid #cbd5e1' }}>
                                      <i className="fas fa-medal" style={{ color: '#64748b' }}></i> Peraih Medali Perak
                                    </span>
                                  ) : cabangRank !== null && cabangRank <= 9 ? (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#ffedd5', color: '#9a3412', borderRadius: '20px', padding: '5px 14px', fontWeight: 800, fontSize: '0.84rem', border: '1px solid #fdba74' }}>
                                      <i className="fas fa-medal" style={{ color: '#ea580c' }}></i> Peraih Medali Perunggu
                                    </span>
                                  ) : (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#f1f5f9', color: '#475569', borderRadius: '20px', padding: '4px 12px', fontWeight: 600, fontSize: '0.82rem' }}>
                                      Finalis (#{cabangRank})
                                    </span>
                                  )
                                ) : tahapView === 'seni' ? (
                                  Number(d.rata_rata) === 0 ? (
                                    <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                                      Belum Dinilai Juri
                                    </span>
                                  ) : cabangRank === 1 ? (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#fef08a', color: '#854d0e', borderRadius: '20px', padding: '5px 14px', fontWeight: 800, fontSize: '0.85rem', border: '1px solid #facc15' }}>
                                      <i className="fas fa-trophy" style={{ color: '#ca8a04' }}></i> JUARA 1
                                    </span>
                                  ) : cabangRank === 2 ? (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#e2e8f0', color: '#334155', borderRadius: '20px', padding: '5px 14px', fontWeight: 800, fontSize: '0.85rem', border: '1px solid #cbd5e1' }}>
                                      <i className="fas fa-medal" style={{ color: '#64748b' }}></i> JUARA 2
                                    </span>
                                  ) : cabangRank === 3 ? (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#ffedd5', color: '#9a3412', borderRadius: '20px', padding: '5px 14px', fontWeight: 800, fontSize: '0.85rem', border: '1px solid #fdba74' }}>
                                      <i className="fas fa-medal" style={{ color: '#ea580c' }}></i> JUARA 3
                                    </span>
                                  ) : cabangRank === 4 ? (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#ede9fe', color: '#5b21b6', borderRadius: '20px', padding: '5px 14px', fontWeight: 800, fontSize: '0.85rem', border: '1px solid #c4b5fd' }}>
                                      <i className="fas fa-award" style={{ color: '#7c3aed' }}></i> HARAPAN 1
                                    </span>
                                  ) : cabangRank === 5 ? (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#ede9fe', color: '#5b21b6', borderRadius: '20px', padding: '5px 14px', fontWeight: 800, fontSize: '0.85rem', border: '1px solid #c4b5fd' }}>
                                      <i className="fas fa-award" style={{ color: '#7c3aed' }}></i> HARAPAN 2
                                    </span>
                                  ) : cabangRank === 6 ? (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#ede9fe', color: '#5b21b6', borderRadius: '20px', padding: '5px 14px', fontWeight: 800, fontSize: '0.85rem', border: '1px solid #c4b5fd' }}>
                                      <i className="fas fa-award" style={{ color: '#7c3aed' }}></i> HARAPAN 3
                                    </span>
                                  ) : (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#f1f5f9', color: '#475569', borderRadius: '20px', padding: '4px 12px', fontWeight: 600, fontSize: '0.82rem' }}>
                                      Peserta (#{cabangRank})
                                    </span>
                                  )
                                ) : Number(d.rata_rata) === 0 ? (
                                  <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Belum ada nilai</span>
                                ) : lolos ? (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#dcfce7', color: '#16a34a', borderRadius: '20px', padding: '4px 14px', fontWeight: 700, fontSize: '0.85rem', border: '1px solid #86efac' }}>
                                    <i className="fas fa-check-circle"></i> LOLOS FINAL
                                  </span>
                                ) : (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#fef2f2', color: '#ef4444', borderRadius: '20px', padding: '4px 14px', fontWeight: 700, fontSize: '0.85rem', border: '1px solid #fca5a5' }}>
                                    <i className="fas fa-times-circle"></i> TIDAK LOLOS
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {sortedData.length > 0 && (
                  <div style={{
                    padding: '16px 20px',
                    borderTop: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '14px',
                    background: '#f8fafc',
                    borderRadius: '0 0 12px 12px'
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
                        Menampilkan <b>{startIndex + 1} - {endIndex}</b> dari total <b>{sortedData.length}</b> data peserta
                      </span>
                      <button
                        type="button"
                        onClick={handleExportExcel}
                        title="Download seluruh data klasemen ini ke file Excel"
                        style={{
                          background: '#f0fdf4',
                          color: '#15803d',
                          border: '1px solid #86efac',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <i className="fas fa-file-excel"></i> Download Excel
                      </button>
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
                                background: safeCurrentPage === page ? '#3b82f6' : 'white',
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
              </>
            )}
          </div>
        </>
      )}

      {/* MODAL ATUR PUBLIKASI CABANG LOMBA */}
      {showPublishModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '560px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '90vh'
          }}>
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', background: '#0284c7', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fas fa-sliders-h"></i> Publikasi {tahapLabel}
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', opacity: 0.9 }}>
                  Pilih cabang lomba pada <b>{tahapLabel}</b> yang ingin dipublikasikan ke peserta & umum
                </p>
              </div>
              <button
                onClick={() => setShowPublishModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '1.2rem', cursor: 'pointer', padding: '4px' }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Modal Quick Actions */}
            <div style={{ padding: '14px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>
                Terpilih: <b>{tempSelectedCabang.length}</b> dari {cabangOptions.length} Lomba
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setTempSelectedCabang([...cabangOptions])}
                  style={{ padding: '5px 12px', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white', color: '#0284c7', fontWeight: 700, cursor: 'pointer' }}
                >
                  <i className="fas fa-check-double"></i> Pilih Semua
                </button>
                <button
                  type="button"
                  onClick={() => setTempSelectedCabang([])}
                  style={{ padding: '5px 12px', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white', color: '#ef4444', fontWeight: 700, cursor: 'pointer' }}
                >
                  <i className="fas fa-times"></i> Kosongkan
                </button>
              </div>
            </div>

            {/* Modal Body: Checkbox List */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {cabangOptions.map(c => {
                const isChecked = tempSelectedCabang.includes(c);
                const count = data.filter(d => d.cabang_lomba === c).length;
                return (
                  <label
                    key={c}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      border: `1.5px solid ${isChecked ? '#38bdf8' : '#e2e8f0'}`,
                      background: isChecked ? '#f0f9ff' : '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setTempSelectedCabang(prev => [...prev, c]);
                          } else {
                            setTempSelectedCabang(prev => prev.filter(x => x !== c));
                          }
                        }}
                        style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#0284c7' }}
                      />
                      <div>
                        <div style={{ fontWeight: 700, color: isChecked ? '#0369a1' : '#334155', fontSize: '0.95rem' }}>
                          {c}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                          {tahapView === 'seleksi' ? `${count} peserta lolos` : tahapView === 'final' ? `${count} peserta finalis` : `${count} peserta seni`}
                        </div>
                      </div>
                    </div>

                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: isChecked ? '#dcfce7' : '#f1f5f9',
                      color: isChecked ? '#15803d' : '#64748b',
                      border: `1px solid ${isChecked ? '#86efac' : '#e2e8f0'}`
                    }}>
                      {isChecked ? 'Dipublikasikan' : 'Disembunyikan'}
                    </span>
                  </label>
                );
              })}
            </div>

            {/* Modal Section: Pengaturan Link SK Pengumuman */}
            <div style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
              <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                <i className="fas fa-file-pdf" style={{ color: '#dc2626', marginRight: '6px' }}></i>
                Link Dokumen SK Pengumuman ({tahapLabel}):
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="url"
                  value={tempLinkSk}
                  onChange={(e) => setTempLinkSk(e.target.value)}
                  placeholder="https://drive.google.com/... (Google Drive / tautan PDF berkas SK)"
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem'
                  }}
                />
                {tempLinkSk && (
                  <a
                    href={tempLinkSk}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '8px 12px',
                      background: '#e0f2fe',
                      color: '#0369a1',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <i className="fas fa-external-link-alt"></i> Tes
                  </a>
                )}
              </div>
              <p style={{ margin: '6px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                Link ini akan dibuka ketika pengunjung mengklik tombol <b>Download SK Pengumuman</b> setelah hasil lomba dipublikasikan.
              </p>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowPublishModal(false)}
                disabled={publishing}
                style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#64748b', fontWeight: 600, cursor: 'pointer' }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveModal}
                disabled={publishing}
                style={{ padding: '10px 22px', borderRadius: '8px', background: '#0284c7', color: 'white', border: 'none', fontWeight: 700, cursor: publishing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <i className={`fas ${publishing ? 'fa-spinner fa-spin' : 'fa-check'}`}></i>
                {publishing ? 'Menyimpan...' : 'Simpan & Terapkan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
