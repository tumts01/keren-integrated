'use client';
import { useState, useEffect, useCallback } from 'react';
import Swal from 'sweetalert2';
import styles from './Emis.module.css';

interface SiswaEmis {
  nisn: string;
  nis: string;
  nama: string;
  kelas: string;
  tahunAjaran: string;
  masukEMIS: boolean;
  emisValid: boolean;
  tglMasukEMIS: string;
  tglEMISValid: string;
}

export default function EmisPage() {
  const [data, setData] = useState<SiswaEmis[]>([]);
  const [loading, setLoading] = useState(true);
  const [tahunAjaranList, setTahunAjaranList] = useState<string[]>([]);
  const [filterTA, setFilterTA] = useState('');
  const [filterKelas, setFilterKelas] = useState('');
  const [filterMasuk, setFilterMasuk] = useState('');   // '' | 'sudah' | 'belum'
  const [filterValid, setFilterValid] = useState('');   // '' | 'sudah' | 'belum'
  const [searchTerm, setSearchTerm] = useState('');
  const [updating, setUpdating] = useState<string>(''); // key saat update
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Cek role dari localStorage
    const stored = localStorage.getItem('keren_user_data');
    if (stored) {
      try {
        const user = JSON.parse(stored);
        const role = (user.rule || user.role || '').toLowerCase().trim();
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

  // Filter
  const filtered = data.filter(s => {
    if (filterTA && s.tahunAjaran !== filterTA) return false;
    if (filterKelas && s.kelas !== filterKelas) return false;
    if (filterMasuk === 'sudah' && !s.masukEMIS) return false;
    if (filterMasuk === 'belum' && s.masukEMIS) return false;
    if (filterValid === 'sudah' && !s.emisValid) return false;
    if (filterValid === 'belum' && s.emisValid) return false;
    if (searchTerm && !s.nama.toLowerCase().includes(searchTerm.toLowerCase()) && !s.nisn.includes(searchTerm)) return false;
    return true;
  });

  // Stats berdasarkan filter TA & kelas saja (bukan filter tombol)
  const statsBase = data.filter(s => {
    if (filterTA && s.tahunAjaran !== filterTA) return false;
    if (filterKelas && s.kelas !== filterKelas) return false;
    return true;
  });
  const totalSiswa = statsBase.length;
  const sudahMasuk = statsBase.filter(s => s.masukEMIS).length;
  const sudahValid = statsBase.filter(s => s.emisValid).length;

  const handleToggle = async (siswa: SiswaEmis, field: 'masukEMIS' | 'emisValid') => {
    if (!isAdmin) {
      Swal.fire('Akses Ditolak', 'Hanya Admin yang dapat mengubah status EMIS.', 'warning');
      return;
    }
    const key = `${siswa.nisn}-${field}`;
    if (updating === key) return;

    const label = field === 'masukEMIS' ? 'Data Masuk EMIS' : 'Data EMIS Valid';
    const current = field === 'masukEMIS' ? siswa.masukEMIS : siswa.emisValid;
    const action = current ? 'tandai BELUM' : 'tandai SUDAH';

    const confirm = await Swal.fire({
      title: `${label}`,
      text: `${action} untuk ${siswa.nama}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Ya',
      cancelButtonText: 'Batal',
      confirmButtonColor: current ? '#ef4444' : '#16a34a',
    });
    if (!confirm.isConfirmed) return;

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
      </header>

      {/* Stats */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#eff6ff', color: '#3b82f6' }}>
            <i className="fas fa-users"></i>
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Total Siswa</span>
            <span className={styles.statValue}>{totalSiswa}</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#fef3c7', color: '#f59e0b' }}>
            <i className="fas fa-upload"></i>
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Sudah Masuk EMIS</span>
            <span className={styles.statValue} style={{ color: '#f59e0b' }}>{sudahMasuk}</span>
            <span className={styles.statSub}>{totalSiswa > 0 ? Math.round(sudahMasuk / totalSiswa * 100) : 0}%</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#dcfce7', color: '#16a34a' }}>
            <i className="fas fa-check-double"></i>
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Data EMIS Valid</span>
            <span className={styles.statValue} style={{ color: '#16a34a' }}>{sudahValid}</span>
            <span className={styles.statSub}>{totalSiswa > 0 ? Math.round(sudahValid / totalSiswa * 100) : 0}%</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#fee2e2', color: '#ef4444' }}>
            <i className="fas fa-clock"></i>
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Belum Masuk EMIS</span>
            <span className={styles.statValue} style={{ color: '#ef4444' }}>{totalSiswa - sudahMasuk}</span>
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
            onChange={e => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <select value={filterTA} onChange={e => { setFilterTA(e.target.value); fetchData(e.target.value); }} className={styles.filterSelect}>
          <option value="">Semua Tahun Ajaran</option>
          {tahunAjaranList.map(ta => <option key={ta} value={ta}>{ta}</option>)}
        </select>
        <select value={filterKelas} onChange={e => setFilterKelas(e.target.value)} className={styles.filterSelect}>
          <option value="">Semua Kelas</option>
          {kelasList.map(k => <option key={k} value={k}>{k}</option>)}
        </select>
        <select value={filterMasuk} onChange={e => setFilterMasuk(e.target.value)} className={styles.filterSelect}>
          <option value="">Masuk EMIS: Semua</option>
          <option value="sudah">✅ Sudah Masuk</option>
          <option value="belum">⏳ Belum Masuk</option>
        </select>
        <select value={filterValid} onChange={e => setFilterValid(e.target.value)} className={styles.filterSelect}>
          <option value="">EMIS Valid: Semua</option>
          <option value="sudah">✅ Sudah Valid</option>
          <option value="belum">⏳ Belum Valid</option>
        </select>
        <button className={styles.refreshBtn} onClick={() => fetchData(filterTA)} title="Refresh data">
          <i className="fas fa-sync-alt"></i>
        </button>
      </div>

      {/* Table */}
      <div className={styles.card}>
        {loading ? (
          <div className={styles.loading}>
            <i className="fas fa-circle-notch fa-spin" style={{ fontSize: '2rem', color: '#3b82f6' }}></i>
            <p>Memuat data EMIS...</p>
          </div>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>No</th>
                    <th>Nama Siswa</th>
                    <th style={{ width: 90 }}>Kelas</th>
                    <th style={{ width: 140 }}>NISN</th>
                    <th style={{ width: 175 }}>Data Masuk EMIS</th>
                    <th style={{ width: 175 }}>Data EMIS Valid</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                      <i className="fas fa-folder-open" style={{ fontSize: '2rem', display: 'block', marginBottom: 8 }}></i>
                      Tidak ada data
                    </td></tr>
                  ) : filtered.map((s, i) => (
                    <tr key={s.nisn || i} className={styles.tableRow}>
                      <td style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>{i + 1}</td>
                      <td>
                        <div className={styles.namaCell}>
                          <span className={styles.nama}>{s.nama}</span>
                          {s.kelas && <span className={styles.kelasBadge}>{s.kelas}</span>}
                        </div>
                      </td>
                      <td style={{ fontWeight: 600 }}>{s.kelas || '-'}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>{s.nisn || '-'}</td>
                      <td>
                        <button
                          className={`${styles.statusBtn} ${s.masukEMIS ? styles.statusBtnDone : styles.statusBtnPending} ${!isAdmin ? styles.statusBtnReadOnly : ''}`}
                          onClick={() => handleToggle(s, 'masukEMIS')}
                          disabled={updating === `${s.nisn}-masukEMIS`}
                          title={!isAdmin ? 'Hanya Admin yang dapat mengubah' : (s.tglMasukEMIS ? `Tanggal: ${s.tglMasukEMIS}` : '')}
                        >
                          {updating === `${s.nisn}-masukEMIS` ? (
                            <i className="fas fa-spinner fa-spin"></i>
                          ) : s.masukEMIS ? (
                            <><i className="fas fa-check-circle"></i> Sudah Masuk</>  
                          ) : (
                            <><i className={isAdmin ? 'fas fa-circle' : 'fas fa-lock'}></i> Belum Masuk</>
                          )}
                        </button>
                      </td>
                      <td>
                        <button
                          className={`${styles.statusBtn} ${s.emisValid ? styles.statusBtnValid : styles.statusBtnPending} ${!isAdmin ? styles.statusBtnReadOnly : ''}`}
                          onClick={() => handleToggle(s, 'emisValid')}
                          disabled={updating === `${s.nisn}-emisValid`}
                          title={!isAdmin ? 'Hanya Admin yang dapat mengubah' : (s.tglEMISValid ? `Tanggal: ${s.tglEMISValid}` : '')}
                        >
                          {updating === `${s.nisn}-emisValid` ? (
                            <i className="fas fa-spinner fa-spin"></i>
                          ) : s.emisValid ? (
                            <><i className="fas fa-check-double"></i> Data Valid</>
                          ) : (
                            <><i className={isAdmin ? 'fas fa-circle' : 'fas fa-lock'}></i> Belum Valid</>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={styles.tableFooter}>
              Menampilkan {filtered.length} dari {totalSiswa} siswa
            </div>
          </>
        )}
      </div>
    </div>
  );
}
