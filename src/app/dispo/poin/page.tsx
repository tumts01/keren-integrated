'use client';
import { useState, useEffect, useMemo } from 'react';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import styles from '../../presensi/presensi.module.css';

interface PoinRecord {
  id: string;
  tanggal: string;
  timestamp: string;
  namaSiswa: string;
  kelas: string;
  tipe: 'Apresiasi' | 'Pelanggaran';
  keterangan: string;
  poin: number;
  petugas: string;
  dbId?: number;
}

interface Siswa {
  id: string;
  nama: string;
  rombel: string;
}

export default function PoinSiswaPage() {
  const [data, setData] = useState<PoinRecord[]>([]);
  const [siswaList, setSiswaList] = useState<Siswa[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form States
  const [tipe, setTipe] = useState<'Apresiasi' | 'Pelanggaran'>('Apresiasi');
  const [searchSiswa, setSearchSiswa] = useState('');
  const [selectedSiswa, setSelectedSiswa] = useState<Siswa | null>(null);
  const [keterangan, setKeterangan] = useState('');
  const [poin, setPoin] = useState(5);
  const [tanggal, setTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter States
  const [filterBulan, setFilterBulan] = useState('Semua');
  const [filterKelas, setFilterKelas] = useState('Semua');
  const [filterTipe, setFilterTipe] = useState('Semua');
  const [searchRiwayat, setSearchRiwayat] = useState('');

  const [userName, setUserName] = useState('');

  useEffect(() => {
    const userStr = localStorage.getItem('keren_user_data');
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        setUserName(u.nama || '');
      } catch (e) {}
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resPoin, resSiswa] = await Promise.all([
        fetch('/api/poin-siswa').then(r => r.json()),
        fetch('/api/siswa').then(r => r.json())
      ]);
      
      if (resPoin.success) setData(resPoin.data);
      if (resSiswa.success) {
        setSiswaList(resSiswa.data.filter((s: any) => s.isLatest && (s.status || '').toLowerCase() === 'aktif'));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredSiswaList = useMemo(() => {
    if (!searchSiswa.trim()) return [];
    return siswaList.filter(s => s.nama.toLowerCase().includes(searchSiswa.toLowerCase())).slice(0, 5);
  }, [searchSiswa, siswaList]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSiswa || !keterangan || !poin || !tanggal) {
      Swal.fire('Error', 'Lengkapi semua data form!', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        tanggal,
        namaSiswa: selectedSiswa.nama,
        kelas: selectedSiswa.rombel,
        tipe,
        keterangan,
        poin: tipe === 'Pelanggaran' ? -Math.abs(poin) : Math.abs(poin),
        petugas: userName
      };

      const res = await fetch('/api/poin-siswa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      
      if (json.success) {
        Swal.fire('Berhasil!', `Data ${tipe} berhasil ditambahkan.`, 'success');
        setSearchSiswa('');
        setSelectedSiswa(null);
        setKeterangan('');
        setPoin(5);
        fetchData();
      } else {
        Swal.fire('Gagal', json.error, 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Terjadi kesalahan sistem.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Hapus Data?',
      text: 'Data yang dihapus tidak dapat dikembalikan.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Ya, Hapus'
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/poin-siswa?id=${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
          Swal.fire('Terhapus!', 'Data berhasil dihapus.', 'success');
          setData(prev => prev.filter(item => item.id !== id));
        } else {
          Swal.fire('Gagal', json.error, 'error');
        }
      } catch (err) {
        Swal.fire('Error', 'Gagal menghapus data.', 'error');
      }
    }
  };

  const riwayatData = useMemo(() => {
    return data.filter(r => {
      if (filterTipe !== 'Semua' && r.tipe !== filterTipe) return false;
      if (filterKelas !== 'Semua' && r.kelas !== filterKelas) return false;
      if (filterBulan !== 'Semua') {
        const m = new Date(r.tanggal).getMonth() + 1;
        if (m.toString() !== filterBulan) return false;
      }
      if (searchRiwayat) {
        return r.namaSiswa.toLowerCase().includes(searchRiwayat.toLowerCase()) || 
               r.keterangan.toLowerCase().includes(searchRiwayat.toLowerCase());
      }
      return true;
    });
  }, [data, filterTipe, filterKelas, filterBulan, searchRiwayat]);

  const rekapData = useMemo(() => {
    const map: Record<string, { nama: string, kelas: string, apresiasi: number, pelanggaran: number, total: number }> = {};
    data.forEach(r => {
      const key = `${r.namaSiswa}_${r.kelas}`;
      if (!map[key]) map[key] = { nama: r.namaSiswa, kelas: r.kelas, apresiasi: 0, pelanggaran: 0, total: 0 };
      if (r.tipe === 'Apresiasi') {
        map[key].apresiasi += Math.abs(r.poin);
      } else {
        map[key].pelanggaran += Math.abs(r.poin);
      }
    });
    return Object.values(map).map(m => ({
      ...m,
      total: m.apresiasi - m.pelanggaran
    })).sort((a, b) => b.total - a.total);
  }, [data]);

  const uniqueKelas = Array.from(new Set(siswaList.map(s => s.rombel))).sort();

  const handleExportRiwayat = () => {
    const rows = riwayatData.map((r, i) => ({
      'No': i + 1,
      'Tanggal': r.tanggal,
      'Tipe': r.tipe,
      'Nama Siswa': r.namaSiswa,
      'Kelas': r.kelas,
      'Keterangan': r.keterangan,
      'Poin': Math.abs(r.poin),
      'Petugas': r.petugas
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Riwayat Poin");
    XLSX.writeFile(wb, `Riwayat_Poin_Siswa_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const handleExportRekap = () => {
    const rows = rekapData.map((r, i) => ({
      'No': i + 1,
      'Nama Siswa': r.nama,
      'Kelas': r.kelas,
      'Total Apresiasi': r.apresiasi,
      'Total Pelanggaran': r.pelanggaran,
      'Poin Bersih': r.total
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap Poin");
    XLSX.writeFile(wb, `Rekap_Poin_Siswa_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Apresiasi & Pelanggaran</h1>
        <p className={styles.subtitle}>Kelola poin apresiasi dan catatan pelanggaran siswa</p>
      </header>

      <div className={styles.content}>
        <div className={styles.card} style={{ maxWidth: '600px', margin: '0 auto 30px' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '15px' }}>
            <i className="fas fa-edit" style={{ color: '#ea580c' }}></i> Input Data
          </h2>
          <form onSubmit={handleSubmit}>
            <div className={styles.filterSection} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div className={styles.filterGroup}>
                <label>Tipe Data</label>
                <div style={{ display: 'flex', gap: '20px', marginTop: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#1d4ed8', fontWeight: 'bold' }}>
                    <input type="radio" name="tipe" checked={tipe === 'Apresiasi'} onChange={() => { setTipe('Apresiasi'); setPoin(5); }} />
                    Apresiasi
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#b91c1c', fontWeight: 'bold' }}>
                    <input type="radio" name="tipe" checked={tipe === 'Pelanggaran'} onChange={() => { setTipe('Pelanggaran'); setPoin(5); }} />
                    Pelanggaran
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '15px' }}>
                <div className={styles.filterGroup} style={{ flex: 1 }}>
                  <label>Tanggal</label>
                  <input 
                    type="date" 
                    value={tanggal} 
                    onChange={e => setTanggal(e.target.value)}
                    className={styles.inputField}
                    required
                  />
                </div>
                <div className={styles.filterGroup} style={{ flex: 1, position: 'relative' }}>
                  <label>Cari Siswa</label>
                  {!selectedSiswa ? (
                    <>
                      <input 
                        type="text" 
                        value={searchSiswa} 
                        onChange={e => setSearchSiswa(e.target.value)}
                        placeholder="Ketik nama siswa..."
                        className={styles.inputField}
                      />
                      {filteredSiswaList.length > 0 && (
                        <div style={{ position: 'absolute', zIndex: 10, width: '100%', marginTop: '5px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
                          {filteredSiswaList.map(s => (
                            <div 
                              key={s.id} 
                              onClick={() => setSelectedSiswa(s)}
                              style={{ padding: '10px 15px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                            >
                              <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#1e293b' }}>{s.nama}</div>
                              <div style={{ fontSize: '12px', color: '#64748b' }}>Kelas {s.rombel}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', border: '1px solid #22c55e', backgroundColor: '#f0fdf4', borderRadius: '8px' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#166534' }}>{selectedSiswa.nama}</div>
                        <div style={{ fontSize: '12px', color: '#15803d' }}>Kelas {selectedSiswa.rombel}</div>
                      </div>
                      <button type="button" onClick={() => setSelectedSiswa(null)} style={{ background: 'none', border: 'none', color: '#166534', cursor: 'pointer' }}>
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.filterGroup}>
                <label>Keterangan {tipe}</label>
                <input 
                  type="text" 
                  value={keterangan} 
                  onChange={e => setKeterangan(e.target.value)}
                  placeholder={tipe === 'Apresiasi' ? 'Contoh: Juara 1 Lomba Pidato' : 'Contoh: Terlambat masuk kelas, Membuang sampah sembarangan'}
                  className={styles.inputField}
                  required
                />
              </div>

              <div className={styles.filterGroup}>
                <label>Poin {tipe}</label>
                <select 
                  value={poin} 
                  onChange={e => setPoin(Number(e.target.value))}
                  className={styles.inputField}
                >
                  <option value={5}>{tipe === 'Apresiasi' ? '+5 Poin (Ringan)' : '-5 Poin (Ringan)'}</option>
                  <option value={10}>{tipe === 'Apresiasi' ? '+10 Poin (Sedang)' : '-10 Poin (Sedang)'}</option>
                  <option value={15}>{tipe === 'Apresiasi' ? '+15 Poin (Tinggi)' : '-15 Poin (Berat)'}</option>
                  <option value={20}>{tipe === 'Apresiasi' ? '+20 Poin (Sangat Tinggi)' : '-20 Poin (Sangat Berat)'}</option>
                  <option value={50}>{tipe === 'Apresiasi' ? '+50 Poin (Luar Biasa)' : '-50 Poin (Fatal)'}</option>
                </select>
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting || !selectedSiswa}
                style={{ width: '100%', background: (!selectedSiswa || isSubmitting) ? '#94a3b8' : (tipe === 'Apresiasi' ? '#2563eb' : '#dc2626'), color: 'white', padding: '12px', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 600, cursor: (!selectedSiswa || isSubmitting) ? 'not-allowed' : 'pointer', marginTop: '10px' }}
              >
                {isSubmitting ? 'Menyimpan...' : 'Simpan Data'}
              </button>
            </div>
          </form>
        </div>

        <div className={styles.card} style={{ maxWidth: '1100px', margin: '40px auto 30px' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '15px' }}>
            <i className="fas fa-history" style={{ color: '#475569' }}></i> Riwayat Input
          </h2>
          <div className={styles.filterSection} style={{ marginBottom: '20px' }}>
            <div className={styles.filterGroup}>
              <label>Filter Tipe</label>
              <select value={filterTipe} onChange={e => setFilterTipe(e.target.value)} className={styles.inputField}>
                <option value="Semua">Semua Tipe</option>
                <option value="Apresiasi">Apresiasi</option>
                <option value="Pelanggaran">Pelanggaran</option>
              </select>
            </div>
            <div className={styles.filterGroup}>
              <label>Filter Kelas</label>
              <select value={filterKelas} onChange={e => setFilterKelas(e.target.value)} className={styles.inputField}>
                <option value="Semua">Semua Kelas</option>
                {uniqueKelas.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div className={styles.filterGroup}>
              <label>Filter Bulan</label>
              <select value={filterBulan} onChange={e => setFilterBulan(e.target.value)} className={styles.inputField}>
                <option value="Semua">Semua Bulan</option>
                {Array.from({length: 12}).map((_, i) => (
                  <option key={i+1} value={(i+1).toString()}>{new Date(2000, i).toLocaleString('id-ID', {month:'long'})}</option>
                ))}
              </select>
            </div>
            <div className={styles.filterGroup}>
              <label>Cari</label>
              <input 
                type="text" 
                value={searchRiwayat}
                onChange={e => setSearchRiwayat(e.target.value)}
                placeholder="Cari siswa/keterangan..." 
                className={styles.inputField}
              />
            </div>
            <div className={styles.filterGroup} style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button onClick={handleExportRiwayat} style={{ background: '#10b981', border: 'none', padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontSize: '0.9rem', color: 'white', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, height: '42px' }}>
                <i className="fas fa-file-excel"></i> Export Excel
              </button>
            </div>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'center' }}>No</th>
                  <th>Tanggal</th>
                  <th>Tipe</th>
                  <th>Nama Siswa</th>
                  <th>Kelas</th>
                  <th>Keterangan</th>
                  <th style={{ textAlign: 'center' }}>Poin</th>
                  <th>Petugas</th>
                  <th style={{ textAlign: 'center' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: '30px' }}><i className="fas fa-spinner fa-spin"></i> Memuat data...</td></tr>
                ) : riwayatData.length > 0 ? riwayatData.map((r, i) => (
                  <tr key={r.id}>
                    <td style={{ textAlign: 'center' }}>{i + 1}</td>
                    <td>{r.tanggal}</td>
                    <td>
                      <span style={{ padding: '4px 8px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', backgroundColor: r.tipe === 'Apresiasi' ? '#dbeafe' : '#fee2e2', color: r.tipe === 'Apresiasi' ? '#1d4ed8' : '#b91c1c' }}>
                        {r.tipe}
                      </span>
                    </td>
                    <td style={{ fontWeight: 'bold' }}>{r.namaSiswa}</td>
                    <td>{r.kelas}</td>
                    <td>{r.keterangan}</td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold', color: r.tipe === 'Apresiasi' ? '#2563eb' : '#dc2626' }}>
                      {r.tipe === 'Apresiasi' ? '+' : '-'}{Math.abs(r.poin)}
                    </td>
                    <td style={{ fontSize: '0.85rem', color: '#64748b' }}>{r.petugas}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button onClick={() => handleDelete(r.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>
                        <i className="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '20px' }}>Data tidak ditemukan.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className={styles.card} style={{ maxWidth: '1100px', margin: '40px auto 30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '15px' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <i className="fas fa-chart-bar" style={{ color: '#475569' }}></i> Rekapitulasi Poin Siswa
            </h2>
            <button onClick={handleExportRekap} style={{ background: '#10b981', border: 'none', padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontSize: '0.9rem', color: 'white', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
              <i className="fas fa-file-excel"></i> Export Rekap
            </button>
          </div>
          
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'center' }}>Peringkat</th>
                  <th>Nama Siswa</th>
                  <th>Kelas</th>
                  <th style={{ textAlign: 'center' }}>Total Apresiasi</th>
                  <th style={{ textAlign: 'center' }}>Total Pelanggaran</th>
                  <th style={{ textAlign: 'center', backgroundColor: '#f8fafc' }}>Poin Bersih</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '30px' }}><i className="fas fa-spinner fa-spin"></i> Memuat data...</td></tr>
                ) : rekapData.length > 0 ? rekapData.map((r, i) => (
                  <tr key={i}>
                    <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#94a3b8' }}>#{i + 1}</td>
                    <td style={{ fontWeight: 'bold' }}>{r.nama}</td>
                    <td>{r.kelas}</td>
                    <td style={{ textAlign: 'center', color: '#2563eb' }}>+{r.apresiasi}</td>
                    <td style={{ textAlign: 'center', color: '#dc2626' }}>-{r.pelanggaran}</td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold', backgroundColor: '#f8fafc', color: r.total > 0 ? '#1d4ed8' : r.total < 0 ? '#b91c1c' : '#64748b' }}>
                      {r.total > 0 ? '+' : ''}{r.total}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>Belum ada data rekap.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}