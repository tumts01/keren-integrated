'use client';

import React, { useState, useEffect } from 'react';
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
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Cek apakah admin
    if (localStorage.getItem('olimpiade_admin') === 'true') {
      setIsAdmin(true);
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
        setPublishedAt(json.published_at);
      }
    } catch (err) {
      console.error('Gagal fetch config:', err);
    }
  };

  const handleTogglePublish = async () => {
    if (!isAdmin) {
      const auth = await Swal.fire({
        title: 'Otorisasi Admin',
        input: 'password',
        inputPlaceholder: 'Masukkan password admin',
        showCancelButton: true,
        confirmButtonText: 'Lanjut',
        cancelButtonText: 'Batal'
      });

      if (!auth.isConfirmed) return;
      if (auth.value !== 'admin123') {
        Swal.fire('Akses Ditolak', 'Password salah', 'error');
        return;
      }
      localStorage.setItem('olimpiade_admin', 'true');
      setIsAdmin(true);
    }

    const action = hasilPublished ? 'Batalkan Publikasi' : 'Publikasikan';
    const confirmText = hasilPublished
      ? 'Hasil akan disembunyikan kembali dari peserta. Lanjutkan?'
      : 'Setelah dipublikasikan, semua peserta yang sudah login dapat melihat status LOLOS/TIDAK LOLOS mereka. Lanjutkan?';

    const result = await Swal.fire({
      title: `${action} Hasil?`,
      text: confirmText,
      icon: hasilPublished ? 'warning' : 'question',
      showCancelButton: true,
      confirmButtonColor: hasilPublished ? '#ef4444' : '#10b981',
      cancelButtonColor: '#64748b',
      confirmButtonText: `Ya, ${action}`,
      cancelButtonText: 'Batal',
    });

    if (!result.isConfirmed) return;

    setPublishing(true);
    try {
      const res = await fetch('/api/olimpiade-seni/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publish: !hasilPublished }),
      });
      const json = await res.json();
      if (json.success) {
        setHasilPublished(!hasilPublished);
        await fetchConfig();
        Swal.fire('Berhasil!', hasilPublished ? 'Hasil disembunyikan.' : 'Hasil berhasil dipublikasikan ke peserta!', 'success');
      } else {
        Swal.fire('Gagal', json.error, 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Gagal mengubah status publikasi', 'error');
    } finally {
      setPublishing(false);
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

  const MAX_LOLOS = 30;

  // Hitung ambang batas nilai per cabang lomba untuk top-30 (dengan tie-handling)
  const getLolosThresholdPerCabang = () => {
    const thresholdMap: Record<string, number> = {};
    const cabangs = Array.from(new Set(data.map((d: any) => d.cabang_lomba))).filter(Boolean);
    cabangs.forEach(cabang => {
      const pesertaCabang = data
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
    ? data 
    : data.filter(d => d.cabang_lomba === filterCabang);

  // Re-sort karena gabungan mungkin tidak urut per cabang
  const sortedData = [...filteredData].sort((a, b) => Number(b.rata_rata) - Number(a.rata_rata));

  return (
    <div style={{ padding: '20px' }}>
      <button 
        onClick={() => router.push('/olimpiade-seni')}
        style={{ marginBottom: '20px', background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem' }}
      >
        <i className="fas fa-arrow-left"></i> Kembali ke Beranda Olimpiade
      </button>

      {/* Status Banner Publikasi - SELALU MUNCUL DI ATAS, SEBAGAI GERBANG ADMIN */}
      <div style={{ background: hasilPublished ? '#dcfce7' : '#fef3c7', border: `1px solid ${hasilPublished ? '#86efac' : '#fde68a'}`, borderRadius: '10px', padding: '14px 20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <i className={`fas ${hasilPublished ? 'fa-bullhorn' : 'fa-eye-slash'}`} style={{ color: hasilPublished ? '#16a34a' : '#b45309', fontSize: '1.2rem' }}></i>
          <div>
            <div style={{ fontWeight: 700, color: hasilPublished ? '#15803d' : '#92400e' }}>
              {hasilPublished ? 'Hasil Sudah Dipublikasikan' : 'Hasil Belum Dipublikasikan'}
            </div>
            <div style={{ fontSize: '0.8rem', color: hasilPublished ? '#16a34a' : '#b45309' }}>
              {hasilPublished && publishedAt
                ? `Dipublikasikan pada ${new Date(publishedAt).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })}`
                : 'Peserta melihat "Menunggu Pengumuman". Klik tombol untuk mempublikasikan.'}
            </div>
          </div>
        </div>
        <button
          onClick={handleTogglePublish}
          disabled={publishing}
          style={{ padding: '10px 20px', borderRadius: '8px', background: hasilPublished ? '#ef4444' : '#10b981', color: 'white', border: 'none', fontWeight: 700, cursor: publishing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', opacity: publishing ? 0.7 : 1 }}
        >
          <i className={`fas ${publishing ? 'fa-spinner fa-spin' : hasilPublished ? 'fa-eye-slash' : 'fa-bullhorn'}`}></i>
          {publishing ? 'Memproses...' : hasilPublished ? 'Batalkan Publikasi' : 'Publikasikan Hasil'}
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: '0 0 8px 0', color: '#0f172a' }}>Monitoring Pemenang (Live Score)</h2>
          <p style={{ margin: 0, color: '#64748b' }}>Klasemen nilai peserta Olimpiade & Lomba Seni secara real-time</p>
        </div>
        {(isAdmin || hasilPublished) && (
          <button 
            onClick={fetchData}
            style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
          >
            <i className={`fas fa-sync ${loading ? 'fa-spin' : ''}`}></i> Refresh
          </button>
        )}
      </div>

      {!hasilPublished && !isAdmin ? (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '60px 20px', textAlign: 'center', marginTop: '40px' }}>
          <i className="fas fa-eye-slash" style={{ fontSize: '4rem', color: '#fcd34d', marginBottom: '20px' }}></i>
          <h3 style={{ margin: '0 0 12px 0', color: '#92400e', fontSize: '1.5rem' }}>Live Score Sedang Disembunyikan</h3>
          <p style={{ margin: 0, color: '#b45309', fontSize: '1.1rem' }}>
            Hasil ujian belum dipublikasikan oleh panitia. Mohon menunggu pengumuman resmi.
          </p>
        </div>
      ) : (
        <>

          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#334155' }}>Filter Cabang Lomba</label>
          <select 
            value={filterCabang} 
            onChange={(e) => setFilterCabang(e.target.value)}
            style={{ padding: '10px 15px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', minWidth: '300px' }}
          >
            <option value="Semua">Semua Cabang Lomba</option>
            {cabangOptions.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div style={{ padding: '40px 0', textAlign: 'center' }}>
            <InlineLoading message="Menghitung klasemen..." />
          </div>
        ) : (
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
                  <th style={{ padding: '15px', textAlign: 'right' }}>Nilai</th>
                  <th style={{ padding: '15px', textAlign: 'center' }}>Status (Top {MAX_LOLOS})</th>
                </tr>
              </thead>
              <tbody>
                {sortedData.length === 0 ? (
                  <tr>
                    <td colSpan={filterCabang === 'Semua' ? 7 : 6} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                      Belum ada data nilai masuk.
                    </td>
                  </tr>
                ) : (
                  sortedData.map((d, i) => {
                    const lolos = isLolos(d);
                    return (
                    <tr key={d.id} style={{ borderBottom: '1px solid #e2e8f0', background: lolos ? (i === 0 ? '#fef9c3' : i === 1 ? '#f0fdf4' : i === 2 ? '#fff7ed' : '#f0fdf4') : '#fff5f5' }}>
                      <td style={{ padding: '15px', fontWeight: 'bold', color: i === 0 ? '#ca8a04' : i === 1 ? '#64748b' : i === 2 ? '#ea580c' : '#334155' }}>
                        {i === 0 ? <><i className="fas fa-trophy" style={{color: '#eab308'}}></i> 1</> : 
                         i === 1 ? <><i className="fas fa-medal" style={{color: '#94a3b8'}}></i> 2</> : 
                         i === 2 ? <><i className="fas fa-medal" style={{color: '#c2410c'}}></i> 3</> : 
                         i + 1}
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
        )}
          </div>
        </>
      )}
    </div>
  );
}
