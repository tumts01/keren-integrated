'use client';
import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
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
  pendidikan: string;
}

export default function GuruPage() {
  const [data, setData] = useState<Guru[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedGuru, setSelectedGuru] = useState<Guru | null>(null);
  const [showDaftarHadir, setShowDaftarHadir] = useState(false);
  const [namaKegiatan, setNamaKegiatan] = useState('');

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

  const handleExportExcel = () => {
    const dataToExport = filteredData.map((g, index) => ({
      'No': index + 1,
      'Nama Lengkap': g.nama,
      'Status': g.status,
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

      <div className={styles.stickyTop}>
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
            <button onClick={handleExportExcel} className="btn btn-gold" style={{ marginRight: '8px' }}>
              <i className="fas fa-file-excel"></i> Export Excel
            </button>
            <button onClick={() => setShowDaftarHadir(true)} className="btn btn-primary" style={{ marginRight: '8px', background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', borderColor: '#7c3aed' }}>
              <i className="fas fa-clipboard-list"></i> Daftar Hadir
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
                    <td colSpan={17} style={{ textAlign: 'center', padding: '40px' }}>
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

      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px) scale(0.96) } to { opacity: 1; transform: translateY(0) scale(1) } }
      `}</style>
    </div>
  );

  function handleCetakDaftarHadir(kegiatan: string) {
    const guruList = data.sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;

    const today = new Date();
    const tgl = today.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
    const hari = today.toLocaleDateString('id-ID', { weekday: 'long' });

    const rows = guruList.map((g, i) => `
      <tr>
        <td style="text-align:center;padding:6px 8px;border:1px solid #333;">${i + 1}</td>
        <td style="padding:6px 10px;border:1px solid #333;">${g.nama}</td>
        <td style="text-align:center;padding:6px 8px;border:1px solid #333;">${g.jabatan || '-'}</td>
        <td style="border:1px solid #333;width:160px;"></td>
      </tr>
    `).join('');

    win.document.write(`
      <html>
      <head>
        <title>Daftar Hadir - ${kegiatan}</title>
        <style>
          @page { size: A4 portrait; margin: 15mm 15mm 15mm 20mm; }
          body { font-family: 'Times New Roman', serif; font-size: 12pt; color: #000; margin: 0; padding: 0; }
          .header { text-align: center; margin-bottom: 20px; }
          .header h2 { margin: 0 0 4px; font-size: 15pt; text-transform: uppercase; letter-spacing: 1px; }
          .header h3 { margin: 0 0 4px; font-size: 13pt; font-weight: normal; }
          .header .lembaga { font-size: 11pt; color: #333; margin: 0 0 2px; }
          .header hr { border: none; border-top: 2px solid #333; margin: 10px 0; }
          .info { margin-bottom: 14px; font-size: 11pt; }
          .info td { padding: 2px 8px 2px 0; vertical-align: top; }
          table.main { width: 100%; border-collapse: collapse; font-size: 10.5pt; }
          table.main th { background: #f0f0f0; border: 1px solid #333; padding: 7px 8px; text-align: center; font-weight: bold; }
          table.main td { font-size: 10.5pt; }
          .footer { margin-top: 30px; display: flex; justify-content: flex-end; }
          .footer .ttd { text-align: center; min-width: 220px; }
          .footer .ttd .line { margin-top: 70px; }
          @media print { body { -webkit-print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <div class="header">
          <p class="lembaga" style="margin:0;font-size:11pt;">YAYASAN PENDIDIKAN AL AMIN</p>
          <h2>MTs AL AMIN SINGOSARI</h2>
          <p class="lembaga">NSM: 121235070055 &nbsp;|&nbsp; NPSN: 20549512</p>
          <p class="lembaga">Jl. Kyai Mu'min No. 40, Pagentan, Singosari, Kab. Malang</p>
          <hr/>
          <h3 style="margin-top:12px;"><strong>DAFTAR HADIR</strong></h3>
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
}
