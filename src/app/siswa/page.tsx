'use client';
import { useState, useEffect } from 'react';
import styles from './Siswa.module.css';

interface Siswa {
  id: number;
  no: string;
  nisn: string;
  nama: string;
  foto?: string;
  jenisKelamin: string;
  rombel: string;
  status: string;
  domisili: string;
  alamat: string;
  namaAyah: string;
  namaIbu: string;
  noHp: string;
  tahunAjaran: string;
}

export default function SiswaPage() {
  const [data, setData] = useState<Siswa[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSiswa, setSelectedSiswa] = useState<Siswa | null>(null);
  const [selectedTahun, setSelectedTahun] = useState<string>('Semua');
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/siswa');
        const result = await res.json();
        if (result.success) {
          setData(result.data);
          
          // Set default tahun ajaran to the most recent/common one if any exist
          const tahunList = Array.from(new Set(result.data.map((s: Siswa) => s.tahunAjaran).filter(Boolean))) as string[];
          if (tahunList.length > 0) {
            // Sort to try and get the latest
            tahunList.sort((a, b) => b.localeCompare(a));
            setSelectedTahun(tahunList[0]);
          }
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

  const uniqueTahun = Array.from(new Set(data.map(s => s.tahunAjaran).filter(Boolean))).sort((a, b) => b.localeCompare(a));

  // Filter based on Tahun Ajaran and Search Term
  const filteredData = data.filter(s => {
    const matchTahun = selectedTahun === 'Semua' || s.tahunAjaran === selectedTahun;
    const matchSearch = s.nama.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        s.nisn.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        s.rombel.toLowerCase().includes(searchTerm.toLowerCase());
    return matchTahun && matchSearch;
  });

  // Calculate Stats based on selected Tahun Ajaran (or all if 'Semua')
  const statsData = data.filter(s => selectedTahun === 'Semua' || s.tahunAjaran === selectedTahun);
  const activeData = statsData.filter(s => ['aktif', 'lulus'].includes(s.status.toLowerCase().trim()));
  const nonActiveData = statsData.filter(s => !['aktif', 'lulus'].includes(s.status.toLowerCase().trim()) && s.status.trim() !== '');

  const totalSiswa = activeData.length;
  const totalLaki = activeData.filter(s => s.jenisKelamin.toLowerCase().includes('laki')).length;
  const totalPr = activeData.filter(s => s.jenisKelamin.toLowerCase().includes('perempuan')).length;

  const totalKelas7Aktif = activeData.filter(s => s.rombel.startsWith('7')).length;
  const totalKelas8Aktif = activeData.filter(s => s.rombel.startsWith('8')).length;
  const totalKelas9Aktif = activeData.filter(s => s.rombel.startsWith('9')).length;

  const totalKelas7Non = nonActiveData.filter(s => s.rombel.startsWith('7')).length;
  const totalKelas8Non = nonActiveData.filter(s => s.rombel.startsWith('8')).length;
  const totalKelas9Non = nonActiveData.filter(s => s.rombel.startsWith('9')).length;

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  // Reset page to 1 when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedTahun]);

  return (
    <div className={styles.container}>
      {selectedSiswa && (
        <div className={styles.modalOverlay} onClick={() => setSelectedSiswa(null)}>
          <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2><i className="fas fa-id-card"></i> Detail Siswa</h2>
              <button className={styles.closeBtn} onClick={() => setSelectedSiswa(null)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalPhotoFrame}>
                {selectedSiswa.foto ? (
                  <img src={selectedSiswa.foto} alt="Profile" className={styles.modalPhoto} />
                ) : (
                  <div style={{ fontSize: '4rem', fontWeight: 700, color: '#94a3b8' }}>
                    {selectedSiswa.nama.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
              </div>
              <div className={styles.modalInfo}>
                <div className={`${styles.infoGroup} ${styles.infoFull}`}>
                  <span className={styles.infoLabel}>Nama Lengkap</span>
                  <div className={styles.infoValue}>{selectedSiswa.nama || '-'}</div>
                </div>
                <div className={styles.infoGroup}>
                  <span className={styles.infoLabel}>NISN</span>
                  <div className={styles.infoValue}>{selectedSiswa.nisn || '-'}</div>
                </div>
                <div className={styles.infoGroup}>
                  <span className={styles.infoLabel}>Rombel / Kelas</span>
                  <div className={styles.infoValue}>{selectedSiswa.rombel || '-'}</div>
                </div>
                <div className={styles.infoGroup}>
                  <span className={styles.infoLabel}>Status</span>
                  <div className={styles.infoValue}>
                    <span className={`${styles.badge} ${['aktif', 'lulus'].includes(selectedSiswa.status.toLowerCase().trim()) ? styles.badgeAktif : styles.badgeNon}`}>
                      {selectedSiswa.status || '-'}
                    </span>
                  </div>
                </div>
                <div className={styles.infoGroup}>
                  <span className={styles.infoLabel}>Jenis Kelamin</span>
                  <div className={styles.infoValue}>{selectedSiswa.jenisKelamin || '-'}</div>
                </div>
                <div className={styles.infoGroup}>
                  <span className={styles.infoLabel}>No. HP / WA (Ortu)</span>
                  <div className={styles.infoValue}><i className="fab fa-whatsapp" style={{ color: '#22c55e', marginRight: '6px' }}></i> {selectedSiswa.noHp || '-'}</div>
                </div>
                <div className={`${styles.infoGroup} ${styles.infoFull}`}>
                  <span className={styles.infoLabel}>Nama Orang Tua</span>
                  <div className={styles.infoValue}>
                    Ayah: {selectedSiswa.namaAyah || '-'} <br/>
                    Ibu: {selectedSiswa.namaIbu || '-'}
                  </div>
                </div>
                <div className={`${styles.infoGroup} ${styles.infoFull}`}>
                  <span className={styles.infoLabel}>Domisili & Alamat</span>
                  <div className={styles.infoValue}>
                    <strong>{selectedSiswa.domisili || '-'}</strong> - {selectedSiswa.alamat || '-'}
                  </div>
                </div>
                <div className={styles.infoGroup}>
                  <span className={styles.infoLabel}>Tahun Ajaran</span>
                  <div className={styles.infoValue}>{selectedSiswa.tahunAjaran || '-'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={styles.header}>
        <div className={styles.title}>
          <div className={styles.titleIcon}>
            <i className="fas fa-users"></i>
          </div>
          Data Siswa
        </div>
        
        <div className={styles.actions}>
          <select 
            className={styles.filterSelect}
            value={selectedTahun}
            onChange={(e) => setSelectedTahun(e.target.value)}
          >
            <option value="Semua">Semua Tahun Ajaran</option>
            {uniqueTahun.map(tahun => (
              <option key={tahun} value={tahun}>{tahun}</option>
            ))}
          </select>
          <div className={styles.searchBox}>
            <i className={`fas fa-search ${styles.searchIcon}`}></i>
            <input 
              type="text" 
              placeholder="Cari nama, NISN, atau kelas..." 
              className={styles.searchInput}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="btn btn-primary">
            <i className="fas fa-plus"></i> Tambah Siswa
          </button>
        </div>
      </div>

      {!loading && !error && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard} style={{ borderLeftColor: '#3b82f6' }}>
            <div className={styles.statIcon} style={{ color: '#3b82f6', background: '#eff6ff' }}>
              <i className="fas fa-user-graduate"></i>
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statLabel}>Total Siswa Aktif</span>
              <span className={styles.statValue}>{totalSiswa}</span>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px', fontWeight: 500 }}>
                Kls 7: {totalKelas7Aktif} Aktif ({totalKelas7Non} Non) <br/>
                Kls 8: {totalKelas8Aktif} Aktif ({totalKelas8Non} Non) <br/>
                Kls 9: {totalKelas9Aktif} Aktif ({totalKelas9Non} Non)
              </div>
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
            <p>Memuat Data Siswa dari Spreadsheet...</p>
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
                  <th>NISN</th>
                  <th>Jenis Kelamin</th>
                  <th>Rombel</th>
                  <th>Domisili</th>
                  <th>Alamat</th>
                  <th>Nama Ayah</th>
                  <th>Nama Ibu</th>
                  <th>No. WA</th>
                  <th>Tahun Ajaran</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {currentData.length > 0 ? (
                  currentData.map(siswa => (
                    <tr key={siswa.id}>
                      <td style={{ minWidth: '250px' }}>
                        <div className={styles.profileCell}>
                          {siswa.foto ? (
                            <img src={siswa.foto} alt="Profile" className={styles.avatar} style={{ objectFit: 'cover' }} />
                          ) : (
                            <div className={styles.avatar}>
                              {siswa.nama.charAt(0).toUpperCase() || 'U'}
                            </div>
                          )}
                          <div>
                            <span className={styles.nama}>{siswa.nama || '-'}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`${styles.badge} ${['aktif', 'lulus'].includes(siswa.status.toLowerCase().trim()) ? styles.badgeAktif : styles.badgeNon}`}>
                          {siswa.status || 'Tidak Diketahui'}
                        </span>
                      </td>
                      <td>{siswa.nisn || '-'}</td>
                      <td>{siswa.jenisKelamin || '-'}</td>
                      <td>{siswa.rombel || '-'}</td>
                      <td>{siswa.domisili || '-'}</td>
                      <td>{siswa.alamat || '-'}</td>
                      <td>{siswa.namaAyah || '-'}</td>
                      <td>{siswa.namaIbu || '-'}</td>
                      <td>{siswa.noHp || '-'}</td>
                      <td>{siswa.tahunAjaran || '-'}</td>
                      <td>
                        <button 
                          className="btn btn-primary" 
                          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                          onClick={() => setSelectedSiswa(siswa)}
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={12} style={{ textAlign: 'center', padding: '40px' }}>
                      <i className="fas fa-folder-open" style={{ fontSize: '3rem', color: '#cbd5e1', marginBottom: '16px', display: 'block' }}></i>
                      Tidak ada data siswa yang ditemukan.
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
