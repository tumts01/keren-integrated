'use client';
import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import styles from './Guru.module.css';
import InlineLoading from '@/components/InlineLoading';

interface Guru {
  id: number;
  dbId?: number;
  urutan?: number;
  nama: string;
  foto?: string;
  status: string;
  nip: string;
  pegId: string;
  passEmisHijau: string;
  passEmisDev: string;
  jenisKelamin: string;
  jabatan: string;
  tempatLahir: string;
  tanggalLahir: string;
  nik: string;
  noHp: string;
  alamat: string;
  tanggalSk: string;
  email: string;
  pendidikan: string;
  isSertifikasi?: boolean;
}

export default function GuruPage() {
  const [data, setData] = useState<Guru[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSertifikasi, setFilterSertifikasi] = useState('Semua');
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedGuru, setSelectedGuru] = useState<Guru | null>(null);
  const [showDaftarHadir, setShowDaftarHadir] = useState(false);
  const [namaKegiatan, setNamaKegiatan] = useState('');
  const [isPrintingAlbum, setIsPrintingAlbum] = useState(false);

  // States untuk Atur Urutan Guru & Staf
  const [showUrutanModal, setShowUrutanModal] = useState(false);
  const [urutanList, setUrutanList] = useState<Guru[]>([]);
  const [searchUrutan, setSearchUrutan] = useState('');
  const [savingUrutan, setSavingUrutan] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/guru');
      const result = await res.json();
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Gagal memuat data. Periksa koneksi internet Anda.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenUrutanModal = () => {
    setUrutanList([...data]);
    setSearchUrutan('');
    setShowUrutanModal(true);
  };

  const moveItem = (id: number, direction: 'up' | 'down' | 'top' | 'bottom') => {
    setUrutanList(prev => {
      const index = prev.findIndex(item => item.id === id);
      if (index === -1) return prev;
      const next = [...prev];
      if (direction === 'up') {
        if (index === 0) return prev;
        const temp = next[index - 1];
        next[index - 1] = next[index];
        next[index] = temp;
      } else if (direction === 'down') {
        if (index >= next.length - 1) return prev;
        const temp = next[index + 1];
        next[index + 1] = next[index];
        next[index] = temp;
      } else if (direction === 'top') {
        if (index === 0) return prev;
        const [item] = next.splice(index, 1);
        next.unshift(item);
      } else if (direction === 'bottom') {
        if (index === next.length - 1) return prev;
        const [item] = next.splice(index, 1);
        next.push(item);
      }
      return next;
    });
  };

  const moveToPosition = (id: number, targetPos: number) => {
    setUrutanList(prev => {
      const fromIndex = prev.findIndex(item => item.id === id);
      if (fromIndex === -1) return prev;
      const toIndex = Math.max(0, Math.min(prev.length - 1, targetPos - 1));
      if (fromIndex === toIndex) return prev;
      const next = [...prev];
      const [item] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      return next;
    });
  };

  const handleSortByJabatan = () => {
    const getScore = (j: string) => {
      const low = (j || '').toLowerCase();
      if (low.includes('kepala madrasah') || low.includes('kamad')) return 1;
      if (low.includes('waka') || low.includes('wakil')) return 2;
      if (low.includes('ka. bendahara') || low.includes('ka. tata usaha') || low.includes('ka. tu')) return 3;
      if (low.includes('guru')) return 4;
      if (low.includes('perpustakaan')) return 5;
      if (low.includes('staf') || low.includes('tata usaha') || low.includes('tu') || low.includes('karyawan')) return 6;
      return 7;
    };
    setUrutanList(prev => [...prev].sort((a, b) => {
      const sA = getScore(a.jabatan);
      const sB = getScore(b.jabatan);
      if (sA !== sB) return sA - sB;
      return a.nama.localeCompare(b.nama);
    }));
  };

  const handleSortByName = () => {
    setUrutanList(prev => [...prev].sort((a, b) => a.nama.localeCompare(b.nama)));
  };

  const handleResetToCurrent = () => {
    setUrutanList([...data]);
  };

  const handleSaveUrutan = async () => {
    setSavingUrutan(true);
    try {
      const order = urutanList.map(g => g.id);
      const res = await fetch('/api/guru', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order })
      });
      const result = await res.json();
      if (result.success) {
        const updatedData = urutanList.map((g, idx) => ({
          ...g,
          urutan: idx + 1
        }));
        setData(updatedData);
        setShowUrutanModal(false);
        Swal.fire({
          icon: 'success',
          title: 'Berhasil Disimpan!',
          text: 'Urutan guru dan staf berhasil diperbarui.',
          timer: 2000,
          showConfirmButton: false
        });
      } else {
        Swal.fire('Error', result.error || 'Gagal menyimpan urutan', 'error');
      }
    } catch (err: any) {
      Swal.fire('Error', 'Terjadi kesalahan saat menyimpan urutan: ' + err.message, 'error');
    } finally {
      setSavingUrutan(false);
    }
  };

  const filteredUrutanList = urutanList.filter(g => {
    if (!searchUrutan.trim()) return true;
    const q = searchUrutan.toLowerCase().trim();
    return g.nama.toLowerCase().includes(q) ||
      g.jabatan.toLowerCase().includes(q) ||
      g.nip.toLowerCase().includes(q);
  });

  const filteredData = data.filter(g => {
    const matchSearch = g.nama.toLowerCase().includes(searchTerm.toLowerCase()) || 
      g.nip.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.jabatan.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchSertifikasi = filterSertifikasi === 'Semua' 
      ? true 
      : (filterSertifikasi === 'Sertifikasi' ? g.isSertifikasi : !g.isSertifikasi);

    return matchSearch && matchSertifikasi;
  });

  // Kalkulasi Rekapan Data
  const totalGuru = data.filter(g => g.jabatan.toLowerCase().includes('guru') || g.jabatan.toLowerCase().includes('kepala')).length;
  const totalTendik = data.length - totalGuru;
  const totalLaki = data.filter(g => g.jenisKelamin.toLowerCase().includes('laki')).length;
  const totalPr = data.filter(g => g.jenisKelamin.toLowerCase().includes('perempuan')).length;

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  // Reset page to 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterSertifikasi]);

  const handleExportExcel = () => {
    const dataToExport = filteredData.map((g, index) => ({
      'No': index + 1,
      'Nama Lengkap': g.nama,
      'Status': g.status,
      'Sertifikasi': g.isSertifikasi ? 'Sertifikasi' : '-',
      'NIP': g.nip,
      'Peg ID': g.pegId,
      'Pass Emis (Hijau)': g.passEmisHijau,
      'Pass Emis (Dev)': g.passEmisDev,
      'Jenis Kelamin': g.jenisKelamin,
      'Jabatan': g.jabatan,
      'Pendidikan': g.pendidikan,
      'Tempat Lahir': g.tempatLahir,
      'Tanggal Lahir': g.tanggalLahir,
      'NIK': g.nik,
      'No. HP': g.noHp,
      'Alamat': g.alamat,
      'Tanggal SK': g.tanggalSk,
      'Email': g.email,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Guru');
    XLSX.writeFile(workbook, `Data_Guru_dan_Staf.xlsx`);
  };

  return (
    <div className={styles.container}>
      {selectedGuru && (
        <div className={styles.modalOverlay} onClick={() => setSelectedGuru(null)}>
          <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2><i className="fas fa-id-card"></i> Detail Guru / Staf</h2>
              <button className={styles.closeBtn} onClick={() => setSelectedGuru(null)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalPhotoFrame}>
                {selectedGuru.foto ? (
                  <img src={selectedGuru.foto} alt="Profile" className={styles.modalPhoto} />
                ) : (
                  <div style={{ fontSize: '4rem', fontWeight: 700, color: '#94a3b8' }}>
                    {selectedGuru.nama.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
              </div>
              <div className={styles.modalInfo}>
                <div className={`${styles.infoGroup} ${styles.infoFull}`}>
                  <span className={styles.infoLabel}>Nama Lengkap</span>
                  <div className={styles.infoValue}>{selectedGuru.nama || '-'}</div>
                </div>
                <div className={styles.infoGroup}>
                  <span className={styles.infoLabel}>Nomor Induk Pegawai</span>
                  <div className={styles.infoValue}>{selectedGuru.nip || '-'}</div>
                </div>
                <div className={styles.infoGroup}>
                  <span className={styles.infoLabel}>Jabatan</span>
                  <div className={styles.infoValue}>{selectedGuru.jabatan || '-'}</div>
                </div>
                <div className={styles.infoGroup}>
                  <span className={styles.infoLabel}>Pendidikan</span>
                  <div className={styles.infoValue}>{selectedGuru.pendidikan || '-'}</div>
                </div>
                <div className={styles.infoGroup}>
                  <span className={styles.infoLabel}>Status</span>
                  <div className={styles.infoValue}>
                    <span className={`${styles.badge} ${selectedGuru.status.toLowerCase().includes('aktif') && !selectedGuru.status.toLowerCase().includes('non') && !selectedGuru.status.toLowerCase().includes('tidak') ? styles.badgeAktif : styles.badgeNon}`}>
                      {selectedGuru.status || '-'}
                    </span>
                  </div>
                </div>
                <div className={styles.infoGroup}>
                  <span className={styles.infoLabel}>No. HP / WA</span>
                  <div className={styles.infoValue}><i className="fab fa-whatsapp" style={{ color: '#22c55e', marginRight: '6px' }}></i> {selectedGuru.noHp || '-'}</div>
                </div>
                <div className={`${styles.infoGroup} ${styles.infoFull}`}>
                  <span className={styles.infoLabel}>Alamat Lengkap</span>
                  <div className={styles.infoValue}>{selectedGuru.alamat || '-'}</div>
                </div>
                <div className={styles.infoGroup}>
                  <span className={styles.infoLabel}>Tempat, Tgl Lahir</span>
                  <div className={styles.infoValue}>{selectedGuru.tempatLahir || '-'}, {selectedGuru.tanggalLahir || '-'}</div>
                </div>
                <div className={styles.infoGroup}>
                  <span className={styles.infoLabel}>Email</span>
                  <div className={styles.infoValue}>{selectedGuru.email || '-'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={styles.stickyTop}>
        <div className={styles.header}>
        <div className={styles.title}>
          <div className={styles.titleIcon}>
            <i className="fas fa-chalkboard-teacher"></i>
          </div>
          Data Guru & Staf
        </div>
        
        <div className={styles.actions}>
              <select
                value={filterSertifikasi}
                onChange={(e) => setFilterSertifikasi(e.target.value)}
                style={{ padding: '10px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', color: '#1e293b', outline: 'none', background: 'white' }}
              >
                <option value="Semua">Semua Sertifikasi</option>
                <option value="Sertifikasi">Sertifikasi</option>
                <option value="Non Sertifikasi">Non Sertifikasi</option>
              </select>
            <div className={styles.searchBox}>
              <i className={`fas fa-search ${styles.searchIcon}`}></i>
              <input 
                type="text" 
                placeholder="Cari nama, NIP, atau jabatan..." 
                className={styles.searchInput}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button onClick={handleExportExcel} className="btn btn-gold" style={{ marginRight: '8px' }}>
              <i className="fas fa-file-excel"></i> Export Excel
            </button>
            <button onClick={() => setShowDaftarHadir(true)} className="btn btn-primary" style={{ marginRight: '8px', background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', borderColor: '#7c3aed' }}>
              <i className="fas fa-clipboard-list"></i> Daftar Hadir
            </button>
            <button onClick={() => handleCetakAlbum()} className="btn btn-primary" style={{ marginRight: '8px', background: 'linear-gradient(135deg,#059669,#047857)', borderColor: '#059669' }}>
              <i className="fas fa-id-card"></i> Cetak Album
            </button>
            <button 
              onClick={handleOpenUrutanModal} 
              className="btn btn-primary" 
              style={{ 
                marginRight: '8px', 
                background: 'linear-gradient(135deg, #0284c7, #0369a1)', 
                borderColor: '#0284c7',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 600,
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)'
              }}
              title="Atur Urutan Guru & Staf"
            >
              <i className="fas fa-sort-numeric-down"></i> Atur Urutan
            </button>
            <button className="btn btn-primary">
            <i className="fas fa-plus"></i> Tambah Data
          </button>
        </div>
      </div>

      {!loading && !error && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard} style={{ borderLeftColor: '#3b82f6' }}>
            <div className={styles.statIcon} style={{ color: '#3b82f6', background: '#eff6ff' }}>
              <i className="fas fa-chalkboard-teacher"></i>
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statLabel}>Total Guru</span>
              <span className={styles.statValue}>{totalGuru}</span>
            </div>
          </div>
          <div className={styles.statCard} style={{ borderLeftColor: '#f59e0b' }}>
            <div className={styles.statIcon} style={{ color: '#f59e0b', background: '#fef3c7' }}>
              <i className="fas fa-user-tie"></i>
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statLabel}>Tenaga Kependidikan</span>
              <span className={styles.statValue}>{totalTendik}</span>
            </div>
          </div>
          <div className={styles.statCard} style={{ borderLeftColor: '#10b981' }}>
            <div className={styles.statIcon} style={{ color: '#10b981', background: '#dcfce7' }}>
              <i className="fas fa-male"></i>
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statLabel}>Laki-laki</span>
              <span className={styles.statValue}>{totalLaki}</span>
            </div>
          </div>
          <div className={styles.statCard} style={{ borderLeftColor: '#ec4899' }}>
            <div className={styles.statIcon} style={{ color: '#ec4899', background: '#fce7f3' }}>
              <i className="fas fa-female"></i>
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statLabel}>Perempuan</span>
              <span className={styles.statValue}>{totalPr}</span>
            </div>
          </div>
        </div>
      )}
      </div>

      <div className={styles.card}>
        {loading ? (
          <InlineLoading message="Memuat Data Guru dari Spreadsheet..." />
        ) : error ? (
          <div className={styles.loading} style={{ color: 'var(--danger)' }}>
            <i className="fas fa-exclamation-triangle" style={{ fontSize: '2rem' }}></i>
            <p>{error}</p>
          </div>
        ) : (
          <>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '50px', textAlign: 'center' }}>No</th>
                  <th>Profil (Nama)</th>
                  <th>Status</th>
                  <th>Sertifikasi</th>
                  <th>Nomor Induk Pegawai</th>
                  <th>PEG ID</th>
                  <th>Jabatan</th>
                  <th>Pendidikan</th>
                  <th>Jenis Kelamin</th>
                  <th>Tempat Lahir</th>
                  <th>Tanggal Lahir</th>
                  <th>NIK</th>
                  <th>No WA</th>
                  <th>Email</th>
                  <th>Alamat</th>
                  <th>Tanggal SK Awal</th>
                  <th>Pass EMIS Hijau</th>
                  <th>Pass EMIS DEV</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {currentData.length > 0 ? (
                  currentData.map((guru, index) => (
                    <tr key={guru.id}>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#64748b' }}>
                        {guru.urutan || (startIndex + index + 1)}
                      </td>
                      <td style={{ minWidth: '250px' }}>
                        <div className={styles.profileCell}>
                          {guru.foto ? (
                            <img src={guru.foto} alt="Profile" className={styles.avatar} style={{ objectFit: 'cover' }} />
                          ) : (
                            <div className={styles.avatar}>
                              {guru.nama.charAt(0).toUpperCase() || 'U'}
                            </div>
                          )}
                          <div>
                            <span className={styles.nama}>{guru.nama || '-'}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`${styles.badge} ${guru.status.toLowerCase().includes('aktif') && !guru.status.toLowerCase().includes('non') && !guru.status.toLowerCase().includes('tidak') ? styles.badgeAktif : styles.badgeNon}`}>
                          {guru.status || 'Tidak Diketahui'}
                        </span>
                      </td>
                      <td>
                        {guru.isSertifikasi ? (
                          <span style={{ background: '#dcfce7', color: '#16a34a', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>
                            <i className="fas fa-check-circle" style={{ marginRight: '4px' }}></i> Sertifikasi
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>-</span>
                        )}
                      </td>
                      <td>{guru.nip || '-'}</td>
                      <td>{guru.pegId || '-'}</td>
                      <td>{guru.jabatan || '-'}</td>
                      <td>{guru.pendidikan || '-'}</td>
                      <td>{guru.jenisKelamin || '-'}</td>
                      <td>{guru.tempatLahir || '-'}</td>
                      <td>{guru.tanggalLahir || '-'}</td>
                      <td>{guru.nik || '-'}</td>
                      <td>{guru.noHp || '-'}</td>
                      <td>{guru.email || '-'}</td>
                      <td>{guru.alamat || '-'}</td>
                      <td>{guru.tanggalSk || '-'}</td>
                      <td>{guru.passEmisHijau || '-'}</td>
                      <td>{guru.passEmisDev || '-'}</td>
                      <td>
                        <button 
                          className="btn btn-primary" 
                          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                          onClick={() => setSelectedGuru(guru)}
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={18} style={{ textAlign: 'center', padding: '40px' }}>
                      <i className="fas fa-folder-open" style={{ fontSize: '3rem', color: '#cbd5e1', marginBottom: '16px', display: 'block' }}></i>
                      Tidak ada data guru yang ditemukan. Coba cek isi Excel Anda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}>
              <div style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <select 
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', outline: 'none', background: 'white', color: '#475569', cursor: 'pointer' }}
                >
                  <option value={10}>10 Baris</option>
                  <option value={25}>25 Baris</option>
                  <option value={50}>50 Baris</option>
                  <option value={75}>75 Baris</option>
                  <option value={100}>100 Baris</option>
                </select>
                <span>
                  Menampilkan {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredData.length)} dari {filteredData.length} data
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                  disabled={currentPage === 1}
                  style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: currentPage === 1 ? '#f1f5f9' : 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', color: '#475569' }}
                >
                  Sebelumnya
                </button>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                  disabled={currentPage === totalPages}
                  style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: currentPage === totalPages ? '#f1f5f9' : 'white', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', color: '#475569' }}
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          )}
        </>
        )}
      </div>
      {/* ===== MODAL DAFTAR HADIR ===== */}
      {showDaftarHadir && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 99999
        }} onClick={() => setShowDaftarHadir(false)}>
          <div style={{
            background: 'white', borderRadius: '16px', width: '440px', maxWidth: '92vw',
            overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
            animation: 'slideUp 0.3s ease'
          }} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
              padding: '24px', textAlign: 'center', position: 'relative'
            }}>
              <div style={{
                position: 'absolute', top: '-15px', right: '-15px', width: '60px', height: '60px',
                borderRadius: '50%', background: 'rgba(255,255,255,0.08)'
              }}></div>
              <div style={{
                width: '52px', height: '52px', borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px',
                border: '2px solid rgba(255,255,255,0.3)'
              }}>
                <i className="fas fa-clipboard-list" style={{ fontSize: '22px', color: 'white' }}></i>
              </div>
              <h3 style={{ margin: 0, color: 'white', fontSize: '1.15rem', fontWeight: 700 }}>Buat Daftar Hadir</h3>
              <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.75)', fontSize: '0.82rem' }}>Cetak daftar hadir guru & staf</p>
            </div>

            {/* Body */}
            <div style={{ padding: '24px' }}>
              <label style={{ display: 'block', fontWeight: 600, color: '#374151', fontSize: '0.9rem', marginBottom: '8px' }}>
                Nama Kegiatan / Keperluan <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="Contoh: Rapat Dinas, Workshop Kurikulum..."
                value={namaKegiatan}
                onChange={(e) => setNamaKegiatan(e.target.value)}
                style={{
                  width: '100%', padding: '12px 16px', border: '2px solid #e2e8f0',
                  borderRadius: '10px', fontSize: '0.9rem', outline: 'none',
                  transition: 'border-color 0.2s', boxSizing: 'border-box'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#7c3aed'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                autoFocus
              />
              <p style={{ margin: '8px 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                <i className="fas fa-info-circle" style={{ marginRight: '4px' }}></i>
                Nama kegiatan akan menjadi judul pada lembar daftar hadir.
              </p>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
                <button
                  onClick={() => { setShowDaftarHadir(false); setNamaKegiatan(''); }}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '10px',
                    border: '2px solid #e2e8f0', background: 'white',
                    color: '#475569', fontWeight: 600, fontSize: '0.9rem',
                    cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  Batal
                </button>
                <button
                  onClick={() => {
                    if (!namaKegiatan.trim()) return;
                    handleCetakDaftarHadir(namaKegiatan.trim());
                    setShowDaftarHadir(false);
                    setNamaKegiatan('');
                  }}
                  disabled={!namaKegiatan.trim()}
                  style={{
                    flex: 2, padding: '12px', borderRadius: '10px',
                    border: 'none', background: namaKegiatan.trim() ? 'linear-gradient(135deg, #7c3aed, #6d28d9)' : '#e2e8f0',
                    color: namaKegiatan.trim() ? 'white' : '#94a3b8', fontWeight: 700, fontSize: '0.9rem',
                    cursor: namaKegiatan.trim() ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s', boxShadow: namaKegiatan.trim() ? '0 4px 14px rgba(124,58,237,0.3)' : 'none'
                  }}
                >
                  <i className="fas fa-print" style={{ marginRight: '6px' }}></i> Cetak Daftar Hadir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Atur Urutan Guru & Staf */}
      {showUrutanModal && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !savingUrutan) {
              setShowUrutanModal(false);
            }
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '820px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
              animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            {/* Header Modal */}
            <div
              style={{
                padding: '20px 24px',
                background: 'linear-gradient(135deg, #0f172a, #1e293b)',
                color: 'white',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem',
                    color: 'white',
                    boxShadow: '0 4px 10px rgba(2, 132, 199, 0.3)'
                  }}
                >
                  <i className="fas fa-sort-numeric-down"></i>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc' }}>
                    Atur Urutan Guru &amp; Staf
                  </h3>
                  <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                    Geser baris, gunakan tombol panah, atau ketik langsung angka urutan
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !savingUrutan && setShowUrutanModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  color: 'white',
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  cursor: savingUrutan ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1rem',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)')}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Quick Presets & Search Bar */}
            <div
              style={{
                padding: '14px 24px',
                background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '12px',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              {/* Search in modal */}
              <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: '340px' }}>
                <i
                  className="fas fa-search"
                  style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.85rem' }}
                ></i>
                <input
                  type="text"
                  placeholder="Cari guru di daftar..."
                  value={searchUrutan}
                  onChange={(e) => setSearchUrutan(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 34px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    outline: 'none',
                    background: 'white'
                  }}
                />
                {searchUrutan && (
                  <button
                    type="button"
                    onClick={() => setSearchUrutan('')}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
                  >
                    <i className="fas fa-times-circle"></i>
                  </button>
                )}
              </div>

              {/* Quick preset buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>Urutkan Cepat:</span>
                <button
                  type="button"
                  onClick={handleSortByJabatan}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    background: 'white',
                    color: '#334155',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                  title="Urutkan dari Kepala Madrasah, Waka, Guru, hingga Staf"
                >
                  <i className="fas fa-user-tie" style={{ color: '#0284c7' }}></i> Jabatan
                </button>
                <button
                  type="button"
                  onClick={handleSortByName}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    background: 'white',
                    color: '#334155',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                  title="Urutkan alfabet A sampai Z"
                >
                  <i className="fas fa-sort-alpha-down" style={{ color: '#16a34a' }}></i> Nama A-Z
                </button>
                <button
                  type="button"
                  onClick={handleResetToCurrent}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    background: 'white',
                    color: '#64748b',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                  title="Kembalikan ke urutan sebelum diubah di modal ini"
                >
                  <i className="fas fa-undo"></i> Reset
                </button>
              </div>
            </div>

            {/* List Body */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              {searchUrutan && (
                <div style={{ fontSize: '0.8rem', color: '#0369a1', background: '#e0f2fe', padding: '6px 12px', borderRadius: '8px', marginBottom: '4px' }}>
                  <i className="fas fa-info-circle" style={{ marginRight: '6px' }}></i>
                  Menampilkan hasil pencarian untuk &quot;{searchUrutan}&quot;. Posisi nomor urut tetap mengacu pada urutan global.
                </div>
              )}

              {filteredUrutanList.map((guru) => {
                const actualIndex = urutanList.findIndex(item => item.id === guru.id);
                const isFirst = actualIndex === 0;
                const isLast = actualIndex === urutanList.length - 1;
                const isKepala = guru.jabatan.toLowerCase().includes('kepala');
                const isWaka = guru.jabatan.toLowerCase().includes('waka');
                const isGuru = guru.jabatan.toLowerCase().includes('guru');

                return (
                  <div
                    key={guru.id}
                    draggable={!searchUrutan.trim()}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', String(actualIndex));
                      setDraggedIndex(actualIndex);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const sourceIdxStr = e.dataTransfer.getData('text/plain');
                      const sourceIdx = parseInt(sourceIdxStr);
                      if (!isNaN(sourceIdx) && sourceIdx !== actualIndex) {
                        setUrutanList(prev => {
                          const next = [...prev];
                          const [moved] = next.splice(sourceIdx, 1);
                          next.splice(actualIndex, 0, moved);
                          return next;
                        });
                      }
                      setDraggedIndex(null);
                    }}
                    onDragEnd={() => setDraggedIndex(null)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      background: draggedIndex === actualIndex ? '#e0f2fe' : '#ffffff',
                      border: draggedIndex === actualIndex ? '2px dashed #0284c7' : '1px solid #e2e8f0',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      transition: 'background 0.15s ease',
                      cursor: searchUrutan.trim() ? 'default' : 'grab'
                    }}
                  >
                    {/* Drag Handle */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '20px',
                        color: searchUrutan.trim() ? '#cbd5e1' : '#94a3b8',
                        cursor: searchUrutan.trim() ? 'default' : 'grab'
                      }}
                      title={searchUrutan.trim() ? 'Drag dinonaktifkan saat pencarian aktif' : 'Tahan & geser untuk mengubah posisi'}
                    >
                      <i className="fas fa-grip-vertical"></i>
                    </div>

                    {/* Nomor Urut Input Box */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input
                        type="number"
                        min={1}
                        max={urutanList.length}
                        value={actualIndex + 1}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          if (!isNaN(val) && val >= 1 && val <= urutanList.length) {
                            moveToPosition(guru.id, val);
                          }
                        }}
                        style={{
                          width: '46px',
                          height: '32px',
                          textAlign: 'center',
                          fontWeight: 800,
                          fontSize: '0.88rem',
                          borderRadius: '8px',
                          border: '1.5px solid #cbd5e1',
                          background: '#f8fafc',
                          color: '#0f172a',
                          outline: 'none'
                        }}
                        title="Ketik nomor untuk langsung melompat ke posisi tersebut"
                      />
                    </div>

                    {/* Foto / Avatar */}
                    {guru.foto ? (
                      <img
                        src={guru.foto}
                        alt=""
                        style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid #e2e8f0' }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '50%',
                          background: isKepala ? '#f3e8ff' : isWaka ? '#ede9fe' : isGuru ? '#e0f2fe' : '#fef3c7',
                          color: isKepala ? '#7e22ce' : isWaka ? '#6d28d9' : isGuru ? '#0284c7' : '#b45309',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.9rem',
                          flexShrink: 0,
                          border: '1px solid #cbd5e1'
                        }}
                      >
                        {guru.nama.charAt(0).toUpperCase()}
                      </div>
                    )}

                    {/* Detail Nama & Jabatan */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.92rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {guru.nama}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            padding: '1px 8px',
                            borderRadius: '6px',
                            background: isKepala ? '#f3e8ff' : isWaka ? '#ede9fe' : isGuru ? '#e0f2fe' : '#fef3c7',
                            color: isKepala ? '#7e22ce' : isWaka ? '#6d28d9' : isGuru ? '#0369a1' : '#b45309'
                          }}
                        >
                          {guru.jabatan || 'Guru'}
                        </span>
                        {guru.nip && (
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            NIP: {guru.nip}
                          </span>
                        )}
                        {guru.isSertifikasi && (
                          <span style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 600 }}>
                            <i className="fas fa-check-circle"></i> Sertifikasi
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Tombol Panah Aksi */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => moveItem(guru.id, 'top')}
                        disabled={isFirst}
                        title="Pindah ke Paling Atas"
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          background: isFirst ? '#f8fafc' : '#ffffff',
                          color: isFirst ? '#cbd5e1' : '#475569',
                          cursor: isFirst ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          transition: 'all 0.15s'
                        }}
                      >
                        <i className="fas fa-angle-double-up"></i>
                      </button>
                      <button
                        type="button"
                        onClick={() => moveItem(guru.id, 'up')}
                        disabled={isFirst}
                        title="Naik 1 posisi"
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          background: isFirst ? '#f8fafc' : '#ffffff',
                          color: isFirst ? '#cbd5e1' : '#475569',
                          cursor: isFirst ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          transition: 'all 0.15s'
                        }}
                      >
                        <i className="fas fa-arrow-up"></i>
                      </button>
                      <button
                        type="button"
                        onClick={() => moveItem(guru.id, 'down')}
                        disabled={isLast}
                        title="Turun 1 posisi"
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          background: isLast ? '#f8fafc' : '#ffffff',
                          color: isLast ? '#cbd5e1' : '#475569',
                          cursor: isLast ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          transition: 'all 0.15s'
                        }}
                      >
                        <i className="fas fa-arrow-down"></i>
                      </button>
                      <button
                        type="button"
                        onClick={() => moveItem(guru.id, 'bottom')}
                        disabled={isLast}
                        title="Pindah ke Paling Bawah"
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          background: isLast ? '#f8fafc' : '#ffffff',
                          color: isLast ? '#cbd5e1' : '#475569',
                          cursor: isLast ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          transition: 'all 0.15s'
                        }}
                      >
                        <i className="fas fa-angle-double-down"></i>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '16px 24px',
                background: '#f8fafc',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px'
              }}
            >
              <div style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="fas fa-users" style={{ color: '#0284c7' }}></i>
                Total: <b>{urutanList.length}</b> Guru &amp; Staf
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => !savingUrutan && setShowUrutanModal(false)}
                  disabled={savingUrutan}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    background: 'white',
                    color: '#475569',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                    cursor: savingUrutan ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveUrutan}
                  disabled={savingUrutan}
                  style={{
                    padding: '10px 22px',
                    borderRadius: '10px',
                    border: 'none',
                    background: savingUrutan ? '#94a3b8' : 'linear-gradient(135deg, #0284c7, #0369a1)',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: savingUrutan ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: savingUrutan ? 'none' : '0 4px 12px rgba(2, 132, 199, 0.3)',
                    transition: 'all 0.15s'
                  }}
                >
                  {savingUrutan ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i> Menyimpan...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save"></i> Simpan Urutan
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px) scale(0.96) } to { opacity: 1; transform: translateY(0) scale(1) } }
      `}</style>
    </div>
  );

  function handleCetakDaftarHadir(kegiatan: string) {
    const guruList = data; // urutan sesuai sheet db_gtk
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;

    const today = new Date();
    const tgl = today.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
    const hari = today.toLocaleDateString('id-ID', { weekday: 'long' });

    const rows = guruList.map((g, i) => `
      <tr>
        <td style="text-align:center;padding:12px 8px;border:1px solid #333;">${i + 1}</td>
        <td style="padding:12px 10px;border:1px solid #333;">${g.nama}</td>
        <td style="text-align:center;padding:12px 8px;border:1px solid #333;">${g.jabatan || '-'}</td>
        <td style="border:1px solid #333;width:160px;"></td>
      </tr>
    `).join('');

    win.document.write(`
      <html>
      <head>
        <title>Daftar Hadir - ${kegiatan}</title>
        <style>
          @page { size: A4 portrait; margin: 10mm 15mm 15mm 15mm; }
          body { font-family: 'Times New Roman', serif; font-size: 12pt; color: #000; margin: 0; padding: 0; }
          .kop { text-align: center; margin-bottom: 6px; }
          .kop img { width: 100%; max-width: 720px; height: auto; }
          .judul { text-align: center; margin-bottom: 16px; }
          .judul h3 { margin: 0 0 2px; font-size: 13pt; }
          .info { margin-bottom: 14px; font-size: 11pt; }
          .info td { padding: 2px 8px 2px 0; vertical-align: top; }
          table.main { width: 100%; border-collapse: collapse; font-size: 10.5pt; }
          table.main th { background: #f0f0f0; border: 1px solid #333; padding: 10px 8px; text-align: center; font-weight: bold; }
          table.main td { font-size: 10.5pt; }
          .footer { margin-top: 30px; display: flex; justify-content: flex-end; }
          .footer .ttd { text-align: center; min-width: 220px; }
          .footer .ttd .line { margin-top: 70px; }
          @media print { body { -webkit-print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <div class="kop">
          <img src="/kop_surat_mts.png" alt="Kop Surat" />
        </div>

        <div class="judul">
          <h3><strong>DAFTAR HADIR</strong></h3>
          <h3><strong>${kegiatan.toUpperCase()}</strong></h3>
        </div>

        <table class="info">
          <tr><td>Hari</td><td>:</td><td>${hari}</td></tr>
          <tr><td>Tanggal</td><td>:</td><td>${tgl}</td></tr>
        </table>

        <table class="main">
          <thead>
            <tr>
              <th style="width:40px;">No</th>
              <th>Nama</th>
              <th style="width:140px;">Jabatan</th>
              <th style="width:160px;">Tanda Tangan</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>

        <div class="footer">
          <div class="ttd">
            <p style="margin:0;">Singosari, ${tgl}</p>
            <p style="margin:0;">Kepala Madrasah,</p>
            <div class="line"></div>
            <p style="margin:0;font-weight:bold;text-decoration:underline;">DWI RETNO PALUPI, M.Pd.</p>
          </div>
        </div>
      </body>
      </html>
    `);
    win.document.close();
    setTimeout(() => win.print(), 500);
  }
  function handleCetakAlbum() {
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;

    const cards = data.map((g) => {
      const isAktif = g.status.toLowerCase().includes('aktif') && !g.status.toLowerCase().includes('non') && !g.status.toLowerCase().includes('tidak');
      const fotoHtml = g.foto
        ? `<img src="${g.foto}" alt="Foto" />`
        : `<div class="placeholder">${g.nama.charAt(0).toUpperCase()}</div>`;
      return `
        <div class="guru-card">
          <div class="foto-box">${fotoHtml}</div>
          <div class="info-box">
            <table class="info-tbl">
              <tr><td class="lbl">Nama</td><td class="sep">:</td><td class="val">${g.nama || '-'}</td></tr>
              <tr><td class="lbl">NIP</td><td class="sep">:</td><td class="val">${g.nip || '-'}</td></tr>
              <tr><td class="lbl">Jabatan</td><td class="sep">:</td><td class="val">${g.jabatan || '-'}</td></tr>
              <tr><td class="lbl">Pendidikan</td><td class="sep">:</td><td class="val">${g.pendidikan || '-'}</td></tr>
              <tr><td class="lbl">Status</td><td class="sep">:</td><td class="val"><span class="badge ${isAktif ? 'badge-aktif' : 'badge-non'}">${g.status || '-'}</span></td></tr>
              <tr><td class="lbl">No. HP</td><td class="sep">:</td><td class="val">${g.noHp || '-'}</td></tr>
              <tr><td class="lbl">Alamat</td><td class="sep">:</td><td class="val addr">${g.alamat || '-'}</td></tr>
              <tr><td class="lbl">TTL</td><td class="sep">:</td><td class="val">${g.tempatLahir || '-'}, ${g.tanggalLahir || '-'}</td></tr>
              <tr><td class="lbl">Email</td><td class="sep">:</td><td class="val">${g.email || '-'}</td></tr>
            </table>
          </div>
        </div>
      `;
    }).join('');

    win.document.write(`
      <html>
      <head>
        <title>Album Guru &amp; Staf - MTs Almaarif 01</title>
        <style>
          @page { size: A4 portrait; margin: 10mm 12mm; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #111; background: white; }
          .guru-card {
            display: flex; border: 1px solid #cbd5e1; border-radius: 8px;
            overflow: hidden; margin-bottom: 6mm;
            page-break-inside: avoid; break-inside: avoid;
            height: 42mm;
          }
          .foto-box {
            width: 30mm; min-width: 30mm; height: 100%;
            overflow: hidden; background: #e2e8f0; flex-shrink: 0;
          }
          .foto-box img { width: 100%; height: 100%; object-fit: cover; object-position: top center; display: block; }
          .foto-box .placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; font-weight: 700; color: #94a3b8; }
          .info-box { flex: 1; padding: 3px 8px; overflow: hidden; }
          .info-tbl { width: 100%; border-collapse: collapse; font-size: 7.5pt; }
          .info-tbl td { padding: 0.5px 2px; vertical-align: top; }
          .info-tbl .lbl { width: 55px; font-weight: 700; color: #475569; white-space: nowrap; }
          .info-tbl .sep { width: 8px; }
          .info-tbl .val { color: #1e293b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 0; width: 100%; }
          .info-tbl .val.addr { white-space: normal; font-size: 7pt; line-height: 1.2; }
          .badge { display: inline-block; padding: 0px 6px; border-radius: 8px; font-size: 6.5pt; font-weight: 700; }
          .badge-aktif { background: #dcfce7; color: #166534; }
          .badge-non { background: #fee2e2; color: #991b1b; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        ${cards}
      </body>
      </html>
    `);
    win.document.close();
    setTimeout(() => win.print(), 500);
  }
}
