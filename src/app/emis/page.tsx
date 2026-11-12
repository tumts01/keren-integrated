'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Swal from 'sweetalert2';
import styles from './Emis.module.css';
import InlineLoading from '@/components/InlineLoading';

interface SiswaEmis {
  nisn: string;
  nis: string;
  nama: string;
  kelas: string;
  tahunAjaran: string;
  masukEMIS: boolean;
  emisValid: 'SAMA' | 'BEDA';
  tglMasukEMIS: string;
  tglEMISValid: string;
  validasiWalkel: string;
  tglValidasiWalkel: string;
  ttl: string;
  asalSekolah: string;
  npsnSekolah: string;
  alamatSekolah: string;
}

export default function EmisPage() {
  const [data, setData] = useState<SiswaEmis[]>([]);
  const [loading, setLoading] = useState(true);
  const [tahunAjaranList, setTahunAjaranList] = useState<string[]>([]);
  const [filterTA, setFilterTA] = useState('');
  const [filterKelas, setFilterKelas] = useState('');
  const [filterMasuk, setFilterMasuk] = useState('');   // '' | 'sudah' | 'belum'
  const [filterValid, setFilterValid] = useState('');   // '' | 'sudah' | 'belum'
  const [filterWalkel, setFilterWalkel] = useState(''); // '' | 'valid' | 'perbaikan' | 'belum'
  const [searchTerm, setSearchTerm] = useState('');
  const [updating, setUpdating] = useState<string>(''); // key saat update
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  useEffect(() => {
    // Cek role dari localStorage
    const stored = localStorage.getItem('keren_user_data');
    if (stored) {
      try {
        const user = JSON.parse(stored);
        const role = (user.role || user.role || '').toLowerCase().trim();
        setIsAdmin(role === 'admin');
      } catch {}
    }
  }, []);

  const fetchData = useCallback(async (ta?: string) => {
    setLoading(true);
    try {
      const url = `/api/emis${ta ? `?tahunAjaran=${encodeURIComponent(ta)}` : ''}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setTahunAjaranList(json.tahunAjaranList || []);
        if (!filterTA && json.tahunAjaranList?.[0]) setFilterTA(json.tahunAjaranList[0]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Kelas unik dari data
  const kelasList = Array.from(new Set(data.map(s => s.kelas).filter(Boolean))).sort();

  // Filter & Urutkan berdasarkan Kelas, kemudian Nama Siswa
  const filtered = data
    .filter(s => {
      if (filterTA && s.tahunAjaran !== filterTA) return false;
      if (filterKelas && s.kelas !== filterKelas) return false;
      if (filterMasuk === 'sudah' && !s.masukEMIS) return false;
      if (filterMasuk === 'belum' && s.masukEMIS) return false;
      if (filterValid === 'sudah' && s.emisValid !== 'SAMA') return false;
      if (filterValid === 'belum' && s.emisValid === 'SAMA') return false;
      
      if (filterWalkel === 'valid' && s.validasiWalkel !== 'VALID') return false;
      if (filterWalkel === 'perbaikan' && s.validasiWalkel !== 'PERBAIKAN') return false;
      if (filterWalkel === 'belum' && (s.validasiWalkel === 'VALID' || s.validasiWalkel === 'PERBAIKAN')) return false;

      if (searchTerm && !s.nama.toLowerCase().includes(searchTerm.toLowerCase()) && !s.nisn.includes(searchTerm)) return false;
      return true;
    })
    .sort((a, b) => {
      const kA = (a.kelas || '').trim();
      const kB = (b.kelas || '').trim();
      if (!kA && kB) return 1;
      if (kA && !kB) return -1;
      const c = kA.localeCompare(kB, 'id', { numeric: true, sensitivity: 'base' });
      if (c !== 0) return c;
      return (a.nama || '').localeCompare(b.nama || '', 'id');
    });

  // Pagination (Maksimal 50 baris per halaman)
  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Stats berdasarkan filter TA & kelas saja (bukan filter tombol)
  const statsBase = data.filter(s => {
    if (filterTA && s.tahunAjaran !== filterTA) return false;
    if (filterKelas && s.kelas !== filterKelas) return false;
    return true;
  });
  const totalSiswa = statsBase.length;
  const sudahMasuk = statsBase.filter(s => s.masukEMIS).length;
  const sudahValid = statsBase.filter(s => s.emisValid === 'SAMA').length;
  const sudahValidWalkel = statsBase.filter(s => s.validasiWalkel === 'VALID').length;
  const perluPerbaikanWalkel = statsBase.filter(s => s.validasiWalkel === 'PERBAIKAN').length;

  const handleToggle = async (siswa: SiswaEmis, field: 'masukEMIS' | 'emisValid' | 'validasiWalkel') => {
    if (!isAdmin && field !== 'validasiWalkel') {
      Swal.fire('Akses Ditolak', 'Hanya Admin yang dapat mengubah status EMIS.', 'warning');
      return;
    }
    const key = `${siswa.nisn}-${field}`;
    if (updating === key) return;


    let action = '';
    let confirm = null;
    let selectedValue = '';

    if (field === 'validasiWalkel') {
      const res = await Swal.fire({
        title: 'Validasi Walkel',
        text: `Tentukan status validasi untuk ${siswa.nama}:`,
        icon: 'question',
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: '✅ Valid',
        denyButtonText: '⚠️ Perbaikan',
        cancelButtonText: 'Reset (Belum)',
        confirmButtonColor: '#16a34a',
        denyButtonColor: '#ea580c',
        cancelButtonColor: '#64748b'
      });
      
      if (res.isDismissed && (res.dismiss === Swal.DismissReason.backdrop || res.dismiss === Swal.DismissReason.esc || res.dismiss === Swal.DismissReason.close)) return;

      if (res.isConfirmed) {
        selectedValue = 'VALID';
      } else if (res.isDenied) {
        selectedValue = 'PERBAIKAN';
      } else if (res.isDismissed && res.dismiss === Swal.DismissReason.cancel) {
        selectedValue = '';
      } else {
        return;
      }
    } else {
      let label = field === 'masukEMIS' ? 'Data Masuk EMIS' : 'Data EMIS Valid';
      let current = field === 'masukEMIS' ? siswa.masukEMIS : siswa.emisValid === 'SAMA';
      action = current ? 'tandai BELUM' : 'tandai SUDAH';
      confirm = await Swal.fire({
        title: `${label}`,
        text: `${action} untuk ${siswa.nama}?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Ya',
        cancelButtonText: 'Batal',
        confirmButtonColor: current ? '#ef4444' : '#16a34a',
      });
      if (!confirm.isConfirmed) return;
    }

    setUpdating(key);
    try {
      const res = await fetch('/api/emis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nisn: siswa.nisn,
          nama: siswa.nama,
          kelas: siswa.kelas,
          tahunAjaran: siswa.tahunAjaran,
          field,
          value: selectedValue
        }),
      });
      const json = await res.json();
      if (json.success) {
        setData(prev => prev.map(s =>
          s.nisn === siswa.nisn
            ? { ...s, [field]: json.newValue }
            : s
        ));
      } else {
        Swal.fire('Gagal', json.error || 'Terjadi kesalahan', 'error');
      }
    } catch {
      Swal.fire('Error', 'Gagal terhubung ke server', 'error');
    } finally {
      setUpdating('');
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}><i className="fas fa-database"></i></div>
          <div>
            <h1 className={styles.title}>Pendataan EMIS</h1>
            <p className={styles.subtitle}>Tracking status data siswa di Education Management Information System</p>
          </div>
        </div>
        <div>
          <Link
            href="/vervalpd"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 16px',
              background: '#ecfdf5',
              color: '#059669',
              border: '1px solid #a7f3d0',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '0.85rem',
              textDecoration: 'none'
            }}
            title="Buka menu matching & rekonsiliasi VervalPD"
          >
            <i className="fas fa-clipboard-check"></i> Buka VervalPD
          </Link>
        </div>
      </header>

      {/* Stats */}
      <div className={styles.statsGrid}>
        <div 
          className={styles.statCard}
          style={{ cursor: 'pointer' }}
          onClick={() => { setFilterMasuk(''); setFilterValid(''); setFilterWalkel(''); setCurrentPage(1); }}
          title="Klik untuk melihat semua siswa"
        >
          <div className={styles.statIcon} style={{ background: '#eff6ff', color: '#3b82f6' }}>
            <i className="fas fa-users"></i>
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Total Siswa</span>
            <span className={styles.statValue}>{totalSiswa}</span>
            <span className={styles.statSub}>Semua data</span>
          </div>
        </div>

        <div 
          className={styles.statCard}
          style={{ cursor: 'pointer', border: filterMasuk === 'sudah' ? '2px solid #f59e0b' : undefined }}
          onClick={() => { setFilterMasuk(prev => prev === 'sudah' ? '' : 'sudah'); setCurrentPage(1); }}
          title="Klik untuk memfilter: Sudah Masuk EMIS"
        >
          <div className={styles.statIcon} style={{ background: '#fef3c7', color: '#f59e0b' }}>
            <i className="fas fa-upload"></i>
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Sudah Masuk EMIS</span>
            <span className={styles.statValue} style={{ color: '#f59e0b' }}>{sudahMasuk}</span>
            <span className={styles.statSub}>{totalSiswa > 0 ? Math.round(sudahMasuk / totalSiswa * 100) : 0}%</span>
          </div>
        </div>

        <div 
          className={styles.statCard}
          style={{ cursor: 'pointer', border: filterValid === 'sudah' ? '2px solid #16a34a' : undefined }}
          onClick={() => { setFilterValid(prev => prev === 'sudah' ? '' : 'sudah'); setCurrentPage(1); }}
          title="Klik untuk memfilter: Data EMIS Valid"
        >
          <div className={styles.statIcon} style={{ background: '#dcfce7', color: '#16a34a' }}>
            <i className="fas fa-check-double"></i>
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Data EMIS Valid</span>
            <span className={styles.statValue} style={{ color: '#16a34a' }}>{sudahValid}</span>
            <span className={styles.statSub}>{totalSiswa > 0 ? Math.round(sudahValid / totalSiswa * 100) : 0}%</span>
          </div>
        </div>

        <div 
          className={styles.statCard}
          style={{ cursor: 'pointer', border: filterMasuk === 'belum' ? '2px solid #ef4444' : undefined }}
          onClick={() => { setFilterMasuk(prev => prev === 'belum' ? '' : 'belum'); setCurrentPage(1); }}
          title="Klik untuk memfilter: Belum Masuk EMIS"
        >
          <div className={styles.statIcon} style={{ background: '#fee2e2', color: '#ef4444' }}>
            <i className="fas fa-clock"></i>
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Belum Masuk EMIS</span>
            <span className={styles.statValue} style={{ color: '#ef4444' }}>{totalSiswa - sudahMasuk}</span>
            <span className={styles.statSub}>{totalSiswa > 0 ? Math.round((totalSiswa - sudahMasuk) / totalSiswa * 100) : 0}%</span>
          </div>
        </div>

        <div 
          className={styles.statCard}
          style={{ cursor: 'pointer', border: filterWalkel === 'valid' ? '2px solid #8b5cf6' : undefined }}
          onClick={() => { setFilterWalkel(prev => prev === 'valid' ? '' : 'valid'); setCurrentPage(1); }}
          title="Klik untuk memfilter: Validasi Walkel Valid"
        >
          <div className={styles.statIcon} style={{ background: '#f5f3ff', color: '#8b5cf6' }}>
            <i className="fas fa-user-check"></i>
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Walkel Valid</span>
            <span className={styles.statValue} style={{ color: '#8b5cf6' }}>{sudahValidWalkel}</span>
            <span className={styles.statSub}>{totalSiswa > 0 ? Math.round(sudahValidWalkel / totalSiswa * 100) : 0}%</span>
          </div>
        </div>

        <div 
          className={styles.statCard}
          style={{ cursor: 'pointer', border: filterWalkel === 'perbaikan' ? '2px solid #ea580c' : undefined }}
          onClick={() => { setFilterWalkel(prev => prev === 'perbaikan' ? '' : 'perbaikan'); setCurrentPage(1); }}
          title="Klik untuk memfilter: Walkel Butuh Perbaikan"
        >
          <div className={styles.statIcon} style={{ background: '#ffedd5', color: '#ea580c' }}>
            <i className="fas fa-exclamation-triangle"></i>
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Walkel Butuh Perbaikan</span>
            <span className={styles.statValue} style={{ color: '#ea580c' }}>{perluPerbaikanWalkel}</span>
            <span className={styles.statSub}>{totalSiswa > 0 ? Math.round(perluPerbaikanWalkel / totalSiswa * 100) : 0}%</span>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <i className="fas fa-search" style={{ color: '#94a3b8' }}></i>
          <input
            type="text"
            placeholder="Cari nama / NISN..."
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className={styles.searchInput}
          />
        </div>
        <select value={filterTA} onChange={e => { setFilterTA(e.target.value); fetchData(e.target.value); setCurrentPage(1); }} className={styles.filterSelect}>
          <option value="">Semua Tahun Ajaran</option>
          {tahunAjaranList.map(ta => <option key={ta} value={ta}>{ta}</option>)}
        </select>
        <select value={filterKelas} onChange={e => { setFilterKelas(e.target.value); setCurrentPage(1); }} className={styles.filterSelect}>
          <option value="">Semua Kelas</option>
          {kelasList.map(k => <option key={k} value={k}>{k}</option>)}
        </select>
        <select value={filterMasuk} onChange={e => { setFilterMasuk(e.target.value); setCurrentPage(1); }} className={styles.filterSelect}>
          <option value="">Masuk EMIS: Semua</option>
          <option value="sudah">✅ Sudah Masuk</option>
          <option value="belum">⏳ Belum Masuk</option>
        </select>
        <select value={filterValid} onChange={e => { setFilterValid(e.target.value); setCurrentPage(1); }} className={styles.filterSelect}>
          <option value="">EMIS Valid: Semua</option>
          <option value="sudah">✅ Sudah Valid</option>
          <option value="belum">❌ Belum Valid</option>
        </select>
        <select value={filterWalkel} onChange={e => { setFilterWalkel(e.target.value); setCurrentPage(1); }} className={styles.filterSelect}>
          <option value="">Val. Walkel: Semua</option>
          <option value="valid">✅ Valid</option>
          <option value="perbaikan">⚠️ Perbaikan</option>
          <option value="belum">➖ Belum</option>
        </select>
        <button className={styles.refreshBtn} onClick={() => fetchData(filterTA)} title="Refresh data">
          <i className="fas fa-sync-alt"></i>
        </button>
      </div>

      {/* Table */}
      <div className={styles.card}>
        {loading ? (
          <InlineLoading message="Memuat data EMIS..." />
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>No</th>
                    <th style={{ width: 180, maxWidth: 220 }}>Nama Siswa</th>
                    <th style={{ width: 90 }}>Kelas</th>
                    <th style={{ width: 230 }}>TTL</th>
                    <th style={{ width: 140 }}>NISN</th>
                    <th style={{ width: 160 }}>Asal Sekolah</th>
                    <th style={{ width: 120 }}>NPSN Sekolah</th>
                    <th style={{ width: 200 }}>Alamat Asal Sekolah</th>
                    <th style={{ width: 70, textAlign: 'center', whiteSpace: 'normal', lineHeight: 1.2 }}>Data Masuk</th>
                    <th style={{ width: 70, textAlign: 'center', whiteSpace: 'normal', lineHeight: 1.2 }}>EMIS Valid</th>
                    <th style={{ width: 75, textAlign: 'center', whiteSpace: 'normal', lineHeight: 1.2 }}>Validasi Walkel</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={11} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                      <i className="fas fa-folder-open" style={{ fontSize: '2rem', display: 'block', marginBottom: 8 }}></i>
                      Tidak ada data
                    </td></tr>
                  ) : paginated.map((s, i) => {
                    const rowNumber = (currentPage - 1) * pageSize + i + 1;
                    return (
                    <tr key={s.nisn || rowNumber} className={styles.tableRow}>
                      <td style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>{rowNumber}</td>
                      <td style={{ maxWidth: 220 }}>
                        <div className={styles.namaCell}>
                          <span className={styles.nama} style={{ whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.35 }}>{s.nama}</span>
                          {s.kelas && <span className={styles.kelasBadge}>{s.kelas}</span>}
                        </div>
                      </td>
                      <td style={{ fontWeight: 600 }}>{s.kelas || '-'}</td>
                      <td style={{ fontSize: '0.85rem' }}>{s.ttl || '-'}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>{s.nisn || '-'}</td>
                      <td style={{ fontSize: '0.85rem' }}>{s.asalSekolah || '-'}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#0369a1' }}>{s.npsnSekolah || '-'}</td>
                      <td style={{ fontSize: '0.85rem', color: '#64748b' }}>{s.alamatSekolah || '-'}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className={`${styles.statusBtn} ${styles.iconOnly} ${s.masukEMIS ? styles.statusBtnDone : styles.statusBtnPending} ${!isAdmin ? styles.statusBtnReadOnly : ''}`}
                          onClick={() => handleToggle(s, 'masukEMIS')}
                          disabled={updating === `${s.nisn}-masukEMIS`}
                          title={s.masukEMIS ? `Sudah Masuk (Tanggal: ${s.tglMasukEMIS})` : (!isAdmin ? 'Hanya Admin yang dapat mengubah' : 'Belum Masuk')}
                        >
                          {updating === `${s.nisn}-masukEMIS` ? (
                            <i className="fas fa-spinner fa-spin"></i>
                          ) : s.masukEMIS ? (
                            <i className="fas fa-check"></i>
                          ) : (
                            <i className={isAdmin ? 'fas fa-minus' : 'fas fa-lock'}></i>
                          )}
                        </button>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div
                          className={`${styles.statusBtn} ${styles.iconOnly} ${s.emisValid === 'SAMA' ? styles.statusBtnValid : styles.statusBtnPending} ${styles.statusBtnReadOnly}`}
                          style={s.emisValid === 'BEDA' ? { background: '#fee2e2', color: '#ef4444', borderColor: '#fca5a5' } : {}}
                          title={s.emisValid === 'SAMA' ? 'Data SAMA' : 'Data BEDA'}
                        >
                          {s.emisValid === 'SAMA' ? (
                            <i className="fas fa-check-double"></i>
                          ) : (
                            <i className="fas fa-times"></i>
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className={`${styles.statusBtn} ${styles.iconOnly} ${
                            s.validasiWalkel === 'VALID' ? styles.statusBtnValid 
                            : s.validasiWalkel === 'PERBAIKAN' ? styles.statusBtnError 
                            : styles.statusBtnPending
                          }`}
                          style={s.validasiWalkel === 'PERBAIKAN' ? { background: '#fef2f2', color: '#b91c1c', borderColor: '#fca5a5' } : s.validasiWalkel === 'VALID' ? { background: '#dcfce7', color: '#15803d', borderColor: '#86efac' } : {}}
                          onClick={() => handleToggle(s, 'validasiWalkel')}
                          disabled={updating === `${s.nisn}-validasiWalkel`}
                          title={s.validasiWalkel === 'VALID' ? `Data Valid (${s.tglValidasiWalkel})` : s.validasiWalkel === 'PERBAIKAN' ? `Perlu Perbaikan (${s.tglValidasiWalkel})` : 'Belum Validasi (Klik untuk ubah)'}
                        >
                          {updating === `${s.nisn}-validasiWalkel` ? (
                            <i className="fas fa-spinner fa-spin"></i>
                          ) : s.validasiWalkel === 'VALID' ? (
                            <i className="fas fa-check"></i>
                          ) : s.validasiWalkel === 'PERBAIKAN' ? (
                            <i className="fas fa-exclamation"></i>
                          ) : (
                            <i className="fas fa-minus"></i>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                </tbody>
              </table>
            </div>
            <div className={styles.tableFooter} style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div>
                Menampilkan <b>{filtered.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</b> - <b>{Math.min(currentPage * pageSize, filtered.length)}</b> dari <b>{filtered.length}</b> siswa
                {filtered.length !== totalSiswa && ` (Total ${totalSiswa} siswa)`}
                <span style={{ marginLeft: '8px', color: '#64748b', fontSize: '0.78rem' }}>• Maks. 50 baris per halaman</span>
              </div>

              {totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(1)}
                    style={{
                      background: currentPage === 1 ? '#f1f5f9' : 'white',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontSize: '12px',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      color: currentPage === 1 ? '#94a3b8' : '#334155'
                    }}
                    title="Halaman Pertama"
                  >
                    <i className="fas fa-angle-double-left"></i>
                  </button>
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    style={{
                      background: currentPage === 1 ? '#f1f5f9' : 'white',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      color: currentPage === 1 ? '#94a3b8' : '#334155'
                    }}
                    title="Sebelumnya"
                  >
                    <i className="fas fa-chevron-left"></i> Prev
                  </button>

                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', padding: '0 6px' }}>
                    {currentPage} / {totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    style={{
                      background: currentPage >= totalPages ? '#f1f5f9' : 'white',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                      color: currentPage >= totalPages ? '#94a3b8' : '#334155'
                    }}
                    title="Berikutnya"
                  >
                    Next <i className="fas fa-chevron-right"></i>
                  </button>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                    style={{
                      background: currentPage >= totalPages ? '#f1f5f9' : 'white',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontSize: '12px',
                      cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                      color: currentPage >= totalPages ? '#94a3b8' : '#334155'
                    }}
                    title="Halaman Terakhir"
                  >
                    <i className="fas fa-angle-double-right"></i>
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
