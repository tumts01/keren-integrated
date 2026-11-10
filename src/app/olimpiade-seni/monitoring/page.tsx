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
  const [hasilPublished, setHasilPublished] = useState(false);
  const [publishedCabang, setPublishedCabang] = useState<string[]>([]);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [tempSelectedCabang, setTempSelectedCabang] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tahapView, setTahapView] = useState<'seleksi' | 'final'>('seleksi');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(30);

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
        setHasilPublished(json.hasil_published);
        setPublishedCabang(Array.isArray(json.published_cabang) ? json.published_cabang : []);
        setPublishedAt(json.published_at);
      }
    } catch (err) {
      console.error('Gagal fetch config:', err);
    }
  };

  const fetchData = async (targetTahap?: 'seleksi' | 'final') => {
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

  // Toggle publikasi cabang tertentu (1-klik dari banner quick toggle)
  const handleToggleCabang = async (cabangName: string) => {
    setPublishing(true);
    try {
      const isCurrentlyPub = publishedCabang.includes(cabangName);
      const res = await fetch('/api/olimpiade-seni/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toggle_cabang: cabangName }),
      });
      const json = await res.json();
      if (json.success) {
        setPublishedCabang(json.published_cabang);
        setHasilPublished(json.hasil_published);
        setPublishedAt(json.published_at);
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: isCurrentlyPub ? 'info' : 'success',
          title: isCurrentlyPub ? `${cabangName} disembunyikan` : `${cabangName} dipublikasikan!`,
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
    setTempSelectedCabang([...publishedCabang]);
    setShowPublishModal(true);
  };

  // Simpan perubahan dari modal custom publikasi
  const handleSaveModal = async () => {
    setPublishing(true);
    try {
      const res = await fetch('/api/olimpiade-seni/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published_cabang: tempSelectedCabang }),
      });
      const json = await res.json();
      if (json.success) {
        setPublishedCabang(json.published_cabang);
        setHasilPublished(json.hasil_published);
        setPublishedAt(json.published_at);
        setShowPublishModal(false);
        Swal.fire('Berhasil!', `Pengaturan publikasi berhasil disimpan (${json.published_cabang.length} lomba dipublikasikan).`, 'success');
      } else {
        Swal.fire('Gagal', json.error, 'error');
      }
    } catch (err: any) {
      Swal.fire('Error', 'Gagal menyimpan publikasi lomba', 'error');
    } finally {
      setPublishing(false);
    }
  };

  // Sembunyikan semua cabang sekaligus
  const handleUnpublishAll = async () => {
    const result = await Swal.fire({
      title: 'Sembunyikan Semua Hasil?',
      text: 'Semua nilai cabang lomba akan disembunyikan kembali dari publik dan peserta. Lanjutkan?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Sembunyikan Semua',
      cancelButtonText: 'Batal',
    });

    if (!result.isConfirmed) return;

    setPublishing(true);
    try {
      const res = await fetch('/api/olimpiade-seni/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publish: false }),
      });
      const json = await res.json();
      if (json.success) {
        setHasilPublished(false);
        setPublishedCabang([]);
        setPublishedAt(null);
        Swal.fire('Berhasil!', 'Semua hasil cabang lomba telah disembunyikan.', 'success');
      } else {
        Swal.fire('Gagal', json.error, 'error');
      }
    } catch (err: any) {
      Swal.fire('Error', 'Gagal membatalkan publikasi', 'error');
    } finally {
      setPublishing(false);
    }
  };

  // Publikasikan semua cabang sekaligus
  const handlePublishAll = async () => {
    const result = await Swal.fire({
      title: 'Publikasikan Semua Lomba?',
      text: `Seluruh (${cabangOptions.length}) cabang lomba akan dipublikasikan ke peserta dan publik. Lanjutkan?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Publikasikan Semua',
      cancelButtonText: 'Batal',
    });

    if (!result.isConfirmed) return;

    setPublishing(true);
    try {
      const res = await fetch('/api/olimpiade-seni/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publish: true }),
      });
      const json = await res.json();
      if (json.success) {
        setHasilPublished(true);
        setPublishedCabang(json.published_cabang);
        setPublishedAt(json.published_at);
        Swal.fire('Berhasil!', 'Semua cabang lomba berhasil dipublikasikan!', 'success');
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

  // Filter cabang yang dapat ditampilkan di dropdown
  const displayCabangOptions = useMemo(() => {
    if (isAdmin) return cabangOptions;
    return cabangOptions.filter(c => publishedCabang.includes(c));
  }, [isAdmin, cabangOptions, publishedCabang]);

  // Data yang boleh dilihat (Admin melihat semua cabang, Non-admin hanya cabang yang dipublikasikan; khusus mapel Akademik hanya Top 30 yang lolos)
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
      if (d.kategori_lomba !== 'akademik') return true;
      if (!d.lolos_seleksi) return false;
      byCabangCount[d.cabang_lomba] = (byCabangCount[d.cabang_lomba] || 0) + 1;
      return byCabangCount[d.cabang_lomba] <= MAX_LOLOS;
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
      if (tahapView === 'final' && Number(d.rata_rata) <= 0) return;
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
          predikatStatus = d.kategori_lomba === 'akademik' ? 'Finalis (Belum Ujian Final)' : 'Belum Dinilai Juri';
        } else if (cabangRank === 1) {
          predikatStatus = 'JUARA 1';
        } else if (cabangRank === 2) {
          predikatStatus = 'JUARA 2';
        } else if (cabangRank === 3) {
          predikatStatus = 'JUARA 3';
        } else {
          predikatStatus = `Finalis (#${cabangRank})`;
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
        rowObj['Pelanggaran'] = d.log_kecurangan && d.log_kecurangan.length > 0
          ? `${d.log_kecurangan.length}x`
          : '0x (Bersih)';
      }

      rowObj['Waktu Mengerjakan'] = durationText;

      if (tahapView === 'final') {
        rowObj['Nilai Final'] = hasScore ? Number(d.rata_rata) : 0;
        if (d.kategori_lomba === 'akademik') {
          rowObj['Nilai Seleksi'] = d.nilai_seleksi && Number(d.nilai_seleksi) > 0 ? Number(d.nilai_seleksi) : '-';
        }
        rowObj['Predikat / Juara'] = predikatStatus;
      } else {
        rowObj['Nilai Seleksi'] = hasScore ? Number(d.rata_rata) : 0;
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
      ...(isAdmin ? [{ wch: 16 }, { wch: 16 }] : []),
      { wch: 20 },
      { wch: 14 },
      ...(tahapView === 'final' ? [{ wch: 14 }] : []),
      { wch: 26 },
    ];

    const wb = XLSX.utils.book_new();
    const sheetName = tahapView === 'final' ? 'Babak Final' : 'Babak Seleksi';
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    const dateStr = new Date().toISOString().slice(0, 10);
    const cabangStr = filterCabang !== 'Semua' ? `_${filterCabang.replace(/\s+/g, '_')}` : '_Semua_Cabang';
    const filename = `Klasemen_LiveScore_${tahapView === 'final' ? 'Final' : 'Seleksi'}${cabangStr}_${dateStr}.xlsx`;

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

  const isAllPublished = cabangOptions.length > 0 && publishedCabang.length === cabangOptions.length;
  const isPartiallyPublished = publishedCabang.length > 0 && !isAllPublished;

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
          {(isAdmin || publishedCabang.length > 0) && (
            <button 
              onClick={() => { fetchData(); fetchConfig(); }}
              style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}
            >
              <i className={`fas fa-sync ${loading ? 'fa-spin' : ''}`}></i> Refresh
            </button>
          )}
        </div>
      </div>

      {/* Tampilan jika belum ada satupun cabang yang dipublikasikan (khusus non-admin) */}
      {!isAdmin && publishedCabang.length === 0 ? (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '60px 20px', textAlign: 'center', marginTop: '40px' }}>
          <i className="fas fa-eye-slash" style={{ fontSize: '4rem', color: '#fcd34d', marginBottom: '20px' }}></i>
          <h3 style={{ margin: '0 0 12px 0', color: '#92400e', fontSize: '1.5rem' }}>Live Score Sedang Disembunyikan</h3>
          <p style={{ margin: 0, color: '#b45309', fontSize: '1.1rem' }}>
            Hasil ujian belum dipublikasikan oleh panitia. Mohon menunggu pengumuman resmi.
          </p>
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
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', color: isAllPublished ? '#15803d' : isPartiallyPublished ? '#0369a1' : '#92400e' }}>
                      {isAllPublished
                        ? 'Semua Cabang Lomba Telah Dipublikasikan'
                        : isPartiallyPublished
                        ? `Publikasi Kustom Aktif (${publishedCabang.length} dari ${cabangOptions.length} Lomba)`
                        : 'Seluruh Hasil Masih Disembunyikan'}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: isAllPublished ? '#16a34a' : isPartiallyPublished ? '#0284c7' : '#b45309', marginTop: '3px' }}>
                      {publishedCabang.length > 0
                        ? `Peserta & publik hanya dapat melihat nilai lomba yang dicentang (${publishedCabang.join(', ')}).`
                        : 'Peserta dan publik saat ini belum bisa melihat klasemen Live Score.'}
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
                    Quick Toggle (Klik nama lomba untuk publikasi / sembunyikan langsung):
                  </span>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    Terbit: <b style={{ color: '#16a34a' }}>{publishedCabang.length}</b> | Tertutup: <b style={{ color: '#dc2626' }}>{Math.max(0, cabangOptions.length - publishedCabang.length)}</b>
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
            </div>
          )}

          {/* Banner Informasi untuk Publik/Peserta jika ada cabang yang belum dipublikasikan */}
          {!isAdmin && (
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
                <span>Cabang lomba yang telah dipublikasikan ({publishedCabang.length}): <b>{publishedCabang.join(', ')}</b>.</span>
                {cabangOptions.length > publishedCabang.length && (
                  <span style={{ color: '#64748b', marginLeft: '6px' }}>(Cabang lainnya masih dalam tahap penilaian juri)</span>
                )}
              </div>
            </div>
          )}

          {/* Klasemen Juara Umum Sekolah sementara dinonaktifkan */}

          {/* TAB TAHAPAN: BABAK SELEKSI VS BABAK FINAL */}
          <div style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '20px',
            flexWrap: 'wrap'
          }}>
            <button
              type="button"
              onClick={() => {
                setTahapView('seleksi');
                setFilterCabang('Semua');
                setCurrentPage(1);
                fetchData('seleksi');
              }}
              style={{
                flex: '1 1 280px',
                padding: '16px 20px',
                borderRadius: '12px',
                border: tahapView === 'seleksi' ? '2px solid #0284c7' : '1.5px solid #cbd5e1',
                background: tahapView === 'seleksi' ? '#f0f9ff' : 'white',
                color: tahapView === 'seleksi' ? '#0369a1' : '#475569',
                cursor: 'pointer',
                textAlign: 'left',
                boxShadow: tahapView === 'seleksi' ? '0 4px 12px rgba(2,132,199,0.12)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ fontWeight: 800, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fas fa-filter" style={{ color: tahapView === 'seleksi' ? '#0284c7' : '#94a3b8' }}></i>
                1. Babak Seleksi / Penyisihan (Olimpiade Akademik)
              </div>
              <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '4px' }}>
                Penyaringan <b>Top {MAX_LOLOS} Peserta Terbaik</b> per cabang lomba Akademik untuk melaju ke Babak Final CBT.
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setTahapView('final');
                setFilterCabang('Semua');
                setCurrentPage(1);
                fetchData('final');
              }}
              style={{
                flex: '1 1 280px',
                padding: '16px 20px',
                borderRadius: '12px',
                border: tahapView === 'final' ? '2px solid #d97706' : '1.5px solid #cbd5e1',
                background: tahapView === 'final' ? '#fffbeb' : 'white',
                color: tahapView === 'final' ? '#92400e' : '#475569',
                cursor: 'pointer',
                textAlign: 'left',
                boxShadow: tahapView === 'final' ? '0 4px 12px rgba(217,119,6,0.12)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ fontWeight: 800, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fas fa-trophy" style={{ color: tahapView === 'final' ? '#d97706' : '#94a3b8' }}></i>
                2. Babak Final & Penentuan Juara (Akademik & Seni)
              </div>
              <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '4px' }}>
                <b>Akademik:</b> Murni (100%) dari Nilai CBT Babak Final • <b>Cabang Seni:</b> Langsung Final dinilai oleh Dewan Juri.
              </div>
            </button>
          </div>

          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#334155' }}>Filter Cabang Lomba ({tahapView === 'final' ? 'Babak Final' : 'Babak Seleksi'})</label>
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
                      <i className="fas fa-award" style={{ color: '#d97706', marginRight: '6px' }}></i>
                      Penentuan <b>Juara 1, 2, 3</b> ditentukan murni dari perolehan nilai pada Babak Final ini.
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
                            <th style={{ padding: '15px', textAlign: 'center' }}>Pelanggaran</th>
                          </>
                        )}
                        <th style={{ padding: '15px', textAlign: 'center' }}>Waktu Mengerjakan</th>
                        <th style={{ padding: '15px', textAlign: 'right' }}>{tahapView === 'final' ? 'Nilai Final' : 'Nilai Seleksi'}</th>
                        <th style={{ padding: '15px', textAlign: 'center' }}>{tahapView === 'final' ? 'Predikat / Juara' : `Status (Top ${MAX_LOLOS})`}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedData.length === 0 ? (
                        <tr>
                          <td colSpan={6 + (filterCabang === 'Semua' ? 1 : 0) + (isAdmin ? 2 : 0)} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                            {tahapView === 'final'
                              ? 'Belum ada data Finalis atau nilai Babak Final untuk kategori ini.'
                              : 'Belum ada data nilai Babak Seleksi untuk kategori ini.'}
                          </td>
                        </tr>
                      ) : (
                        paginatedData.map((d, i) => {
                          const globalRank = itemsPerPage === 999999 ? i + 1 : startIndex + i + 1;
                          const lolos = isLolos(d);
                          const cabangRank = rankInCabangMap[d.id] || null;
                          const displayRank = cabangRank || d.peringkat_seleksi || globalRank;
                          const hasScore = Number(d.rata_rata) > 0;
                          const showMedal = hasScore && displayRank <= 3;
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
                            ? (cabangRank === 1 ? '#fef9c3' : cabangRank === 2 ? '#f0fdf4' : cabangRank === 3 ? '#fff7ed' : 'white')
                            : (lolos ? (displayRank === 1 ? '#fef9c3' : displayRank === 2 ? '#f0fdf4' : displayRank === 3 ? '#fff7ed' : '#f0fdf4') : '#fff5f5');
                          
                          return (
                            <tr key={d.id} style={{ borderBottom: '1px solid #e2e8f0', background: rowBg }}>
                              <td style={{ padding: '15px', fontWeight: 'bold', color: showMedal && displayRank === 1 ? '#ca8a04' : showMedal && displayRank === 2 ? '#64748b' : showMedal && displayRank === 3 ? '#ea580c' : '#334155' }}>
                                {showMedal && displayRank === 1 ? <><i className="fas fa-trophy" style={{color: '#eab308'}}></i> 1</> : 
                                 showMedal && displayRank === 2 ? <><i className="fas fa-medal" style={{color: '#94a3b8'}}></i> 2</> : 
                                 showMedal && displayRank === 3 ? <><i className="fas fa-medal" style={{color: '#c2410c'}}></i> 3</> : 
                                 displayRank}
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
                                </>
                              )}
                              <td style={{ padding: '15px', textAlign: 'center', color: '#64748b', fontSize: '0.9rem', fontWeight: 500 }}>
                                {durationText !== '-' ? (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', padding: '4px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                    <i className="fas fa-clock" style={{ color: '#94a3b8' }}></i> {durationText}
                                  </span>
                                ) : '-'}
                              </td>
                              <td style={{ padding: '15px', textAlign: 'right' }}>
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
                                      {d.kategori_lomba === 'akademik' ? 'Finalis (Belum Ujian Final)' : 'Belum Dinilai Juri'}
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
                                  ) : (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#f1f5f9', color: '#475569', borderRadius: '20px', padding: '4px 12px', fontWeight: 600, fontSize: '0.82rem' }}>
                                      Finalis (#{cabangRank})
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
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fas fa-sliders-h"></i> Atur Publikasi Cabang Lomba
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', opacity: 0.9 }}>
                  Pilih cabang lomba mana saja yang ingin dipublikasikan ke peserta & umum
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
                          {tahapView === 'seleksi' ? `${count} peserta lolos` : `${count} peserta finalis`}
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
