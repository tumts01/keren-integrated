'use client';
import { useState, useEffect, useMemo } from 'react';
import Swal from 'sweetalert2';
import styles from './Prestasi.module.css';
import InlineLoading from '@/components/InlineLoading';

interface Prestasi {
  id?: number;
  no: string | number;
  tahun_pelajaran: string;
  tanggal: string;
  nama: string;
  kelas: string;
  nama_lomba: string;
  penyelenggara: string;
  peringkat: string;
  tingkat: string;
  link_sertifikat: string;
  induk: string;
  sertifikat_fisik: string;
  emis: string;
}

export default function PrestasiPage() {
  const [data, setData] = useState<Prestasi[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTahun, setFilterTahun] = useState('Semua');
  const [filterTingkat, setFilterTingkat] = useState('Semua');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingData, setEditingData] = useState<Prestasi | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [form, setForm] = useState<Prestasi>({
    no: '', tahun_pelajaran: '2026-2027', tanggal: '', nama: '', kelas: '',
    nama_lomba: '', penyelenggara: '', peringkat: '', tingkat: 'KABUPATEN/KOTA',
    link_sertifikat: '', induk: '', sertifikat_fisik: '', emis: ''
  });

  const [siswaList, setSiswaList] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetchData();
    
    // Check if user is admin
    const storedUser = localStorage.getItem('keren_user_data');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        const role = (parsed.role || '').toLowerCase();
        if (role === 'admin' || role === 'administrator') setIsAdmin(true);
      } catch(e) {}
    }
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resPrestasi, resSiswa] = await Promise.all([
        fetch('/api/prestasi'),
        fetch('/api/siswa')
      ]);
      const jsonPrestasi = await resPrestasi.json();
      if (jsonPrestasi.success) {
        setData(jsonPrestasi.data);
      }
      
      const jsonSiswa = await resSiswa.json();
      if (jsonSiswa.success) {
        // Hanya ambil data siswa terbaru (isLatest) dan pastikan tidak duplikat induk
        const latestSiswa = jsonSiswa.data.filter((s: any) => s.isLatest);
        // Buat deduplikasi kalau-kalau induknya sama
        const uniqueSiswa = Array.from(new Map(latestSiswa.map((s: any) => [s.nis, s])).values());
        setSiswaList(uniqueSiswa);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };



  const uniqueTahun = Array.from(new Set(data.map(d => d.tahun_pelajaran).filter(Boolean)));
  const uniqueTingkat = Array.from(new Set(data.map(d => d.tingkat).filter(Boolean)));

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchSearch = item.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.nama_lomba.toLowerCase().includes(searchQuery.toLowerCase());
      const matchTahun = filterTahun === 'Semua' || item.tahun_pelajaran === filterTahun;
      const matchTingkat = filterTingkat === 'Semua' || item.tingkat === filterTingkat;
      return matchSearch && matchTahun && matchTingkat;
    });
  }, [data, searchQuery, filterTahun, filterTingkat]);

  const handleOpenModal = (prestasi?: Prestasi) => {
    if (prestasi) {
      setEditingData(prestasi);
      setForm(prestasi);
    } else {
      setEditingData(null);
      setForm({
        no: data.length + 1, tahun_pelajaran: '2026-2027', tanggal: '', nama: '', kelas: '',
        nama_lomba: '', penyelenggara: '', peringkat: '', tingkat: 'KABUPATEN/KOTA',
        link_sertifikat: '', induk: '', sertifikat_fisik: '', emis: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/prestasi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const result = await res.json();
      if (result.success) {
        Swal.fire({ icon: 'success', title: 'Berhasil', text: result.message, timer: 1500, showConfirmButton: false });
        setIsModalOpen(false);
        fetchData();
      } else {
        Swal.fire('Gagal', result.error, 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Terjadi kesalahan sistem', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    const confirm = await Swal.fire({
      title: 'Hapus data?',
      text: 'Data prestasi ini akan dihapus secara permanen.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Ya, Hapus'
    });

    if (confirm.isConfirmed) {
      try {
        const res = await fetch(`/api/prestasi?id=${id}`, { method: 'DELETE' });
        const result = await res.json();
        if (result.success) {
          fetchData();
          Swal.fire('Terhapus!', 'Data berhasil dihapus.', 'success');
        } else {
          Swal.fire('Gagal', result.error, 'error');
        }
      } catch (err) {
        Swal.fire('Error', 'Gagal menghapus data', 'error');
      }
    }
  };

  const stats = useMemo(() => {
    const s = { internasional: 0, nasional: 0, provinsi: 0, kabupaten: 0, kecamatan: 0 };
    filteredData.forEach(item => {
      const t = (item.tingkat || '').toUpperCase();
      if (t.includes('INTERNASIONAL')) s.internasional++;
      else if (t.includes('NASIONAL')) s.nasional++;
      else if (t.includes('PROVINSI')) s.provinsi++;
      else if (t.includes('KABUPATEN') || t.includes('KOTA')) s.kabupaten++;
      else if (t.includes('KECAMATAN')) s.kecamatan++;
    });
    return s;
  }, [filteredData]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Data Prestasi Siswa</h1>
          <p className={styles.subtitle}>Kelola rekapitulasi data prestasi siswa madrasah</p>
        </div>
        {isAdmin && (
          <button className={styles.btnAdd} onClick={() => handleOpenModal()}>
            <i className="fas fa-plus"></i> Tambah Prestasi
          </button>
        )}
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ color: '#8b5cf6', backgroundColor: '#ede9fe' }}>
            <i className="fas fa-globe fa-spin" style={{ animationDuration: '3s' }}></i>
          </div>
          <div className={styles.statInfo}>
            <h3>{stats.internasional}</h3>
            <p>Internasional</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ color: '#ef4444', backgroundColor: '#fee2e2' }}>
            <i className="fas fa-flag fa-beat" style={{ '--fa-animation-iteration-count': 'infinite', '--fa-beat-scale': '1.2' } as any}></i>
          </div>
          <div className={styles.statInfo}>
            <h3>{stats.nasional}</h3>
            <p>Nasional</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ color: '#f59e0b', backgroundColor: '#fef3c7' }}>
            <i className="fas fa-map-marked-alt fa-bounce" style={{ '--fa-animation-iteration-count': 'infinite', '--fa-bounce-height': '-3px' } as any}></i>
          </div>
          <div className={styles.statInfo}>
            <h3>{stats.provinsi}</h3>
            <p>Provinsi</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ color: '#10b981', backgroundColor: '#d1fae5' }}>
            <i className="fas fa-city fa-beat-fade"></i>
          </div>
          <div className={styles.statInfo}>
            <h3>{stats.kabupaten}</h3>
            <p>Kab/Kota</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ color: '#64748b', backgroundColor: '#f1f5f9' }}>
            <i className="fas fa-map-pin fa-shake" style={{ '--fa-animation-iteration-count': 'infinite' } as any}></i>
          </div>
          <div className={styles.statInfo}>
            <h3>{stats.kecamatan}</h3>
            <p>Kecamatan</p>
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.filterSection}>
          <div className={styles.searchBox}>
            <i className="fas fa-search"></i>
            <input 
              type="text" 
              placeholder="Cari nama siswa atau lomba..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className={styles.filters}>
            <select value={filterTahun} onChange={e => setFilterTahun(e.target.value)} className={styles.select}>
              <option value="Semua">Semua Tahun Pelajaran</option>
              {uniqueTahun.map((t, i) => <option key={i} value={t}>{t}</option>)}
            </select>
            
            <select value={filterTingkat} onChange={e => setFilterTingkat(e.target.value)} className={styles.select}>
              <option value="Semua">Semua Tingkat</option>
              {uniqueTingkat.map((t, i) => <option key={i} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <InlineLoading message="Memuat data..." />
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>No</th>
                  <th>Tanggal</th>
                  <th>Siswa</th>
                  <th>Lomba & Penyelenggara</th>
                  <th>Peringkat / Tingkat</th>
                  <th style={{ width: '120px', textAlign: 'center' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                      Tidak ada data yang sesuai filter
                    </td>
                  </tr>
                ) : (
                  filteredData.map((item, index) => (
                    <tr key={item.id}>
                      <td style={{ textAlign: 'center' }}>{index + 1}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{item.tahun_pelajaran}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{item.tanggal ? new Date(item.tanggal).toLocaleDateString('id-ID') : '-'}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{item.nama}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{item.kelas ? `Kelas ${item.kelas}` : '-'}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#0ea5e9' }}>{item.nama_lomba}</div>
                        <div style={{ fontSize: '0.85rem' }}>{item.penyelenggara}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#f59e0b' }}>{item.peringkat}</div>
                        <div style={{ fontSize: '0.85rem' }}>{item.tingkat}</div>
                      </td>
                      <td>
                        <div className={styles.actionButtons}>
                          {item.link_sertifikat && (
                            <a href={item.link_sertifikat} target="_blank" rel="noreferrer" className={styles.btnIcon} title="Lihat Sertifikat" style={{ color: '#3b82f6' }}>
                              <i className="fas fa-certificate"></i>
                            </a>
                          )}
                          {isAdmin && (
                            <>
                              <button onClick={() => handleOpenModal(item)} className={styles.btnIcon} title="Edit" style={{ color: '#10b981' }}>
                                <i className="fas fa-edit"></i>
                              </button>
                              <button onClick={() => handleDelete(item.id!)} className={styles.btnIcon} title="Hapus" style={{ color: '#ef4444' }}>
                                <i className="fas fa-trash"></i>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className={styles.modalOverlay} onClick={() => !isSaving && setIsModalOpen(false)}>
          <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{editingData ? 'Edit Data Prestasi' : 'Tambah Prestasi Baru'}</h2>
              <button className={styles.btnClose} onClick={() => !isSaving && setIsModalOpen(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <form onSubmit={handleSave} className={styles.modalBody}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>Tahun Pelajaran</label>
                  <input type="text" required value={form.tahun_pelajaran} onChange={e => setForm({...form, tahun_pelajaran: e.target.value})} />
                </div>
                <div className={styles.formGroup}>
                  <label>Tanggal</label>
                  <input type="date" required value={form.tanggal ? new Date(form.tanggal).toISOString().split('T')[0] : ''} onChange={e => setForm({...form, tanggal: e.target.value})} />
                </div>
                
                <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                  <label>Nama Siswa</label>
                  <input 
                    type="text" 
                    required 
                    list="siswa-datalist"
                    value={form.nama} 
                    onChange={e => {
                      const val = e.target.value.toUpperCase();
                      const matchedSiswa = siswaList.find(s => s.nama.toUpperCase() === val);
                      setForm({
                        ...form, 
                        nama: val,
                        kelas: matchedSiswa ? matchedSiswa.rombel : form.kelas,
                        induk: matchedSiswa ? matchedSiswa.nis : form.induk
                      });
                    }} 
                    placeholder="Ketik atau pilih nama siswa..."
                  />
                  <datalist id="siswa-datalist">
                    {siswaList.map((s, i) => <option key={i} value={s.nama} />)}
                  </datalist>
                </div>
                
                <div className={styles.formGroup}>
                  <label>Kelas</label>
                  <input type="text" value={form.kelas} onChange={e => setForm({...form, kelas: e.target.value.toUpperCase()})} placeholder="Otomatis terisi" />
                </div>
                
                <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                  <label>Nama Lomba</label>
                  <input type="text" required value={form.nama_lomba} onChange={e => setForm({...form, nama_lomba: e.target.value.toUpperCase()})} />
                </div>
                
                <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                  <label>Penyelenggara</label>
                  <input type="text" required value={form.penyelenggara} onChange={e => setForm({...form, penyelenggara: e.target.value.toUpperCase()})} />
                </div>
                
                <div className={styles.formGroup}>
                  <label>Peringkat</label>
                  <input type="text" required value={form.peringkat} onChange={e => setForm({...form, peringkat: e.target.value.toUpperCase()})} placeholder="Contoh: JUARA 1" />
                </div>
                
                <div className={styles.formGroup}>
                  <label>Tingkat</label>
                  <select value={form.tingkat} onChange={e => setForm({...form, tingkat: e.target.value})}>
                    <option value="KECAMATAN">Kecamatan</option>
                    <option value="KABUPATEN/KOTA">Kabupaten/Kota</option>
                    <option value="PROVINSI">Provinsi</option>
                    <option value="NASIONAL">Nasional</option>
                    <option value="INTERNASIONAL">Internasional</option>
                  </select>
                </div>
                
                <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                  <label>Link Sertifikat (Drive)</label>
                  <input type="url" value={form.link_sertifikat} onChange={e => setForm({...form, link_sertifikat: e.target.value})} placeholder="https://drive.google.com/..." />
                </div>
                
                <div className={styles.formGroup}>
                  <label>Sertifikat Fisik (Ada/Tidak)</label>
                  <select value={form.sertifikat_fisik} onChange={e => setForm({...form, sertifikat_fisik: e.target.value})}>
                    <option value="">Tidak Ada</option>
                    <option value="ADA">Ada</option>
                  </select>
                </div>
              </div>
              
              <div className={styles.modalFooter}>
                <button type="button" className={styles.btnCancel} onClick={() => setIsModalOpen(false)}>Batal</button>
                <button type="submit" className={styles.btnSave} disabled={isSaving}>
                  {isSaving ? <><i className="fas fa-spinner fa-spin"></i> Menyimpan...</> : <><i className="fas fa-save"></i> Simpan Data</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
