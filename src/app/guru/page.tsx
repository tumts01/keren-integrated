'use client';
import { useState, useEffect } from 'react';
import styles from './Guru.module.css';

interface Guru {
  id: number;
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
}

export default function GuruPage() {
  const [data, setData] = useState<Guru[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedGuru, setSelectedGuru] = useState<Guru | null>(null);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchData = async () => {
      try {
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
    fetchData();
  }, []);

  const filteredData = data.filter(g => 
    g.nama.toLowerCase().includes(searchTerm.toLowerCase()) || 
    g.nip.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.jabatan.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
  }, [searchTerm]);

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
                  <span className={styles.infoLabel}>Status</span>
                  <div className={styles.infoValue}>
                    <span className={`${styles.badge} ${selectedGuru.status.toLowerCase().includes('aktif') && !selectedGuru.status.toLowerCase().includes('non') ? styles.badgeAktif : styles.badgeNon}`}>
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

      <div className={styles.header}>
        <div className={styles.title}>
          <div className={styles.titleIcon}>
            <i className="fas fa-chalkboard-teacher"></i>
          </div>
          Data Guru & Staf
        </div>
        
        <div className={styles.actions}>
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

      <div className={styles.card}>
        {loading ? (
          <div className={styles.loading}>
            <i className={`fas fa-circle-notch ${styles.spinner}`}></i>
            <p>Memuat Data Guru dari Spreadsheet...</p>
          </div>
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
                  <th>Profil (Nama)</th>
                  <th>Status</th>
                  <th>Nomor Induk Pegawai</th>
                  <th>PEG ID</th>
                  <th>Jabatan</th>
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
                  currentData.map(guru => (
                    <tr key={guru.id}>
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
                        <span className={`${styles.badge} ${guru.status.toLowerCase().includes('aktif') && !guru.status.toLowerCase().includes('non') ? styles.badgeAktif : styles.badgeNon}`}>
                          {guru.status || 'Tidak Diketahui'}
                        </span>
                      </td>
                      <td>{guru.nip || '-'}</td>
                      <td>{guru.pegId || '-'}</td>
                      <td>{guru.jabatan || '-'}</td>
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
                    <td colSpan={16} style={{ textAlign: 'center', padding: '40px' }}>
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
              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Menampilkan {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredData.length)} dari {filteredData.length} data
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
    </div>
  );
}
