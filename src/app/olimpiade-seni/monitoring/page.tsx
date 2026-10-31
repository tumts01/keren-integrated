'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
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
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(30);

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

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/olimpiade-seni/monitoring');
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        
        // Ekstrak cabang lomba unik
        const cabangs = Array.from(new Set(json.data.map((d: any) => d.cabang_lomba))).filter(Boolean).sort();
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

  // Data yang boleh dilihat (Admin melihat semua, Non-admin hanya melihat cabang yang dipublikasikan)
  const visibleData = useMemo(() => {
    if (isAdmin) return data;
    return data.filter(d => publishedCabang.includes(d.cabang_lomba));
  }, [isAdmin, data, publishedCabang]);

  // Hitung ambang batas nilai per cabang lomba untuk top-30 (dengan tie-handling)
  const getLolosThresholdPerCabang = () => {
    const thresholdMap: Record<string, number> = {};
    const cabangs = Array.from(new Set(visibleData.map((d: any) => d.cabang_lomba))).filter(Boolean);
    cabangs.forEach(cabang => {
      const pesertaCabang = visibleData
        .filter((d: any) => d.cabang_lomba === cabang && Number(d.rata_rata) > 0)
        .map((d: any) => Number(d.rata_rata))
        .sort((a: number, b: number) => b - a);
      
      if (pesertaCabang.length === 0) {
        thresholdMap[cabang as string] = -Infinity;
        return;
      }
      // Ambil nilai peserta ke-30 (index 29). Semua peserta dengan nilai >= nilai ini dinyatakan lolos.
      const cutoff = pesertaCabang[Math.min(MAX_LOLOS - 1, pesertaCabang.length - 1)];
      thresholdMap[cabang as string] = cutoff;
    });
    return thresholdMap;
  };

  const lolosThreshold = getLolosThresholdPerCabang();

  const isLolos = (d: any) => {
    const threshold = lolosThreshold[d.cabang_lomba];
    return Number(d.rata_rata) > 0 && threshold !== undefined && Number(d.rata_rata) >= threshold;
  };

  const filteredData = filterCabang === 'Semua' 
    ? visibleData 
    : visibleData.filter(d => d.cabang_lomba === filterCabang);

  // Re-sort karena gabungan mungkin tidak urut per cabang
  const sortedData = [...filteredData].sort((a, b) => Number(b.rata_rata) - Number(a.rata_rata));

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
        <button 
          onClick={() => router.push('/olimpiade-seni/cbt-monitoring')}
          style={{ background: '#7c3aed', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', boxShadow: '0 2px 6px rgba(124,58,237,0.3)' }}
        >
          <i className="fas fa-desktop"></i> Monitoring Pengerjaan CBT & Sesi
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: '0 0 8px 0', color: '#0f172a' }}>Monitoring Pemenang (Live Score)</h2>
          <p style={{ margin: 0, color: '#64748b' }}>Klasemen nilai peserta Olimpiade & Lomba Seni secara real-time</p>
        </div>
        {(isAdmin || publishedCabang.length > 0) && (
          <button 
            onClick={() => { fetchData(); fetchConfig(); }}
            style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
          >
            <i className={`fas fa-sync ${loading ? 'fa-spin' : ''}`}></i> Refresh
          </button>
        )}
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

          {juaraUmumList.length > 0 && (
            <div style={{ background: 'linear-gradient(to right, #1e293b, #0f172a)', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginBottom: '24px', color: 'white' }}>
              <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '10px', color: '#f8fafc' }}>
                <i className="fas fa-crown" style={{ color: '#fbbf24', fontSize: '1.2rem' }}></i>
                Klasemen Juara Umum Sekolah
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                {juaraUmumList.slice(0, 6).map((juara, index) => (
                  <div key={juara.sekolah} style={{ background: 'rgba(255,255,255,0.1)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ 
                      width: '40px', height: '40px', borderRadius: '50%', 
                      background: index === 0 ? '#fbbf24' : index === 1 ? '#94a3b8' : index === 2 ? '#b45309' : '#475569', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      color: 'white', fontWeight: 'bold', fontSize: '1.2rem',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}>
                      {index + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {juara.sekolah}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#cbd5e1', display: 'flex', gap: '12px' }}>
                        <span title="Juara 1"><i className="fas fa-medal" style={{ color: '#fbbf24' }}></i> {juara.j1}</span>
                        <span title="Juara 2"><i className="fas fa-medal" style={{ color: '#e2e8f0' }}></i> {juara.j2}</span>
                        <span title="Juara 3"><i className="fas fa-medal" style={{ color: '#b45309' }}></i> {juara.j3}</span>
                      </div>
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#f8fafc' }}>
                      {juara.totalPoints}<span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: '#94a3b8', marginLeft: '4px' }}>pts</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#334155' }}>Filter Cabang Lomba</label>
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
                        <th style={{ padding: '15px', textAlign: 'center' }}>Juri/CBT</th>
                        <th style={{ padding: '15px', textAlign: 'center' }}>Pelanggaran</th>
                        <th style={{ padding: '15px', textAlign: 'center' }}>Waktu Mengerjakan</th>
                        <th style={{ padding: '15px', textAlign: 'right' }}>Nilai</th>
                        <th style={{ padding: '15px', textAlign: 'center' }}>Status (Top {MAX_LOLOS})</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedData.length === 0 ? (
                        <tr>
                          <td colSpan={filterCabang === 'Semua' ? 9 : 8} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                            Belum ada data nilai masuk untuk kategori ini.
                          </td>
                        </tr>
                      ) : (
                        paginatedData.map((d, i) => {
                          const globalRank = itemsPerPage === 999999 ? i + 1 : startIndex + i + 1;
                          const lolos = isLolos(d);
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
                          
                          return (
                            <tr key={d.id} style={{ borderBottom: '1px solid #e2e8f0', background: lolos ? (i === 0 ? '#fef9c3' : i === 1 ? '#f0fdf4' : i === 2 ? '#fff7ed' : '#f0fdf4') : '#fff5f5' }}>
                              <td style={{ padding: '15px', fontWeight: 'bold', color: globalRank === 1 ? '#ca8a04' : globalRank === 2 ? '#64748b' : globalRank === 3 ? '#ea580c' : '#334155' }}>
                                {globalRank === 1 ? <><i className="fas fa-trophy" style={{color: '#eab308'}}></i> 1</> : 
                                 globalRank === 2 ? <><i className="fas fa-medal" style={{color: '#94a3b8'}}></i> 2</> : 
                                 globalRank === 3 ? <><i className="fas fa-medal" style={{color: '#c2410c'}}></i> 3</> : 
                                 globalRank}
                              </td>
                              <td style={{ padding: '15px', fontWeight: 600 }}>{d.nama}</td>
                              <td style={{ padding: '15px', color: '#64748b' }}>{d.asal_sekolah || '-'}</td>
                              {filterCabang === 'Semua' && <td style={{ padding: '15px', color: '#0ea5e9', fontWeight: 500 }}>{d.cabang_lomba}</td>}
                              <td style={{ padding: '15px', textAlign: 'center' }}>
                                <span style={{ background: '#e2e8f0', padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem' }}>
                                  {d.jumlah_juri === 1 && d.detail_nilai?.[0]?.olimpiade_juri?.nama_juri === 'Sistem CBT' ? 'CBT' : `${d.jumlah_juri} Juri`}
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
                              <td style={{ padding: '15px', textAlign: 'center', color: '#64748b', fontSize: '0.9rem', fontWeight: 500 }}>
                                {durationText !== '-' ? (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', padding: '4px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                    <i className="fas fa-clock" style={{ color: '#94a3b8' }}></i> {durationText}
                                  </span>
                                ) : '-'}
                              </td>
                              <td style={{ padding: '15px', textAlign: 'right', fontWeight: 'bold', fontSize: '1.1rem', color: lolos ? '#10b981' : '#94a3b8' }}>
                                {d.rata_rata}
                              </td>
                              <td style={{ padding: '15px', textAlign: 'center' }}>
                                {Number(d.rata_rata) === 0 ? (
                                  <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Belum ada nilai</span>
                                ) : lolos ? (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#dcfce7', color: '#16a34a', borderRadius: '20px', padding: '4px 14px', fontWeight: 700, fontSize: '0.85rem', border: '1px solid #86efac' }}>
                                    <i className="fas fa-check-circle"></i> LOLOS
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
                          {count} peserta terdaftar
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
