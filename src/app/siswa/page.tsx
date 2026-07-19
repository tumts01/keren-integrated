'use client';
import { useState, useEffect, useRef } from 'react';
import styles from './Siswa.module.css';
import * as XLSX from 'xlsx';

interface Siswa {
  id: number;
  nis: string;
  nisn: string;
  nik: string;
  tempatLahir: string;
  tanggalLahir: string;
  nama: string;
  foto?: string;
  jenisKelamin: string;
  rombel: string;
  status: string;
  domisili: string;
  alamat: string;
  namaAyah: string;
  namaIbu: string;
  pekerjaanAyah: string;
  pekerjaanIbu: string;
  noHp: string;
  tahunAjaran: string;
  isLatest: boolean;
}

// ===== CETAK MODAL (print langsung dari halaman) =====
function PrintSiswaModal({
  allData,
  onClose,
}: {
  allData: Siswa[];
  onClose: () => void;
}) {
  const [mode, setMode] = useState<'angkatan' | 'kelas'>('angkatan');
  const [angkatan, setAngkatan] = useState<string>('7');
  const [kelas, setKelas] = useState<string>('');
  const printRef = useRef<HTMLDivElement>(null);

  // Kelas unik dari data aktif
  const activeData = allData.filter(s =>
    ['aktif'].includes(s.status.toLowerCase().trim()) && s.isLatest
  );
  const kelasList = Array.from(new Set(activeData.map(s => s.rombel).filter(Boolean))).sort();

  // Data yang akan dicetak
  const selectedData = mode === 'angkatan'
    ? activeData.filter(s => s.rombel.startsWith(angkatan)).sort((a, b) => a.rombel.localeCompare(b.rombel) || a.nama.localeCompare(b.nama))
    : activeData.filter(s => s.rombel === kelas).sort((a, b) => a.nama.localeCompare(b.nama));

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head>
      <title>Daftar Siswa</title>
      <style>
        @page { size: A4 portrait; margin: 15mm 12mm; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; font-size: 10pt; color: #000; }
        .kop { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
        .kop img { width: 60px; height: 60px; object-fit: contain; }
        .kop-text { flex: 1; text-align: center; }
        .kop-title { font-size: 14pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
        .kop-sub { font-size: 10pt; font-weight: 600; }
        .kop-addr { font-size: 9pt; color: #555; }
        .kop-line { border-top: 3px solid #000; border-bottom: 1px solid #000; margin: 6px 0 10px; height: 4px; }
        .doc-title { text-align: center; font-size: 12pt; font-weight: 800; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px; }
        .doc-sub { text-align: center; font-size: 9.5pt; color: #444; margin-bottom: 12px; }
        table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
        th { background: #1e293b; color: white; padding: 7px 8px; font-weight: 700; text-align: left; }
        td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
        tr:nth-child(even) td { background: #f8fafc; }
        .col-no { width: 32px; text-align: center; }
        .col-nama { min-width: 180px; font-weight: 600; }
        .col-ket { min-width: 130px; }
        .group-header td { background: #e2e8f0; font-weight: 800; font-size: 9pt; padding: 5px 8px; color: #1e293b; border-top: 2px solid #94a3b8; }
        .ttd { margin-top: 24px; display: flex; justify-content: flex-end; }
        .ttd-box { text-align: center; min-width: 180px; }
        .ttd-city { margin-bottom: 4px; font-size: 9.5pt; }
        .ttd-space { height: 50px; }
        .ttd-name { font-weight: 700; font-size: 10pt; border-top: 1px solid #000; padding-top: 2px; }
        .footer-note { margin-top: 10px; font-size: 8pt; color: #888; }
        @media print { body { -webkit-print-color-adjust: exact; } }
      </style>
    </head><body>${content.innerHTML}</body></html>`);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 400);
  };

  // Group by kelas jika angkatan
  const groupedByKelas: Record<string, Siswa[]> = {};
  if (mode === 'angkatan') {
    selectedData.forEach(s => {
      if (!groupedByKelas[s.rombel]) groupedByKelas[s.rombel] = [];
      groupedByKelas[s.rombel].push(s);
    });
  }

  const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const judulCetak = mode === 'angkatan' ? `Kelas ${angkatan}` : `Kelas ${kelas}`;

  return (
    <div className={styles.printModalOverlay} onClick={onClose}>
      <div className={styles.printModalCard} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.printModalHeader}>
          <div>
            <h3><i className="fas fa-print"></i> Cetak Daftar Siswa</h3>
            <p>Pilih mode cetak dan klik tombol cetak</p>
          </div>
          <button className={styles.printModalClose} onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Opsi */}
        <div className={styles.printModalBody}>
          <div className={styles.printModeRow}>
            <button
              className={`${styles.printModeBtn} ${mode === 'angkatan' ? styles.printModeBtnActive : ''}`}
              onClick={() => setMode('angkatan')}
            >
              <i className="fas fa-layer-group"></i>
              <span>Per Angkatan</span>
              <small>Cetak semua kelas dalam 1 tingkat</small>
            </button>
            <button
              className={`${styles.printModeBtn} ${mode === 'kelas' ? styles.printModeBtnActive : ''}`}
              onClick={() => setMode('kelas')}
            >
              <i className="fas fa-chalkboard-teacher"></i>
              <span>Per Kelas</span>
              <small>Cetak 1 kelas tertentu saja</small>
            </button>
          </div>

          {mode === 'angkatan' ? (
            <div className={styles.printSelectRow}>
              <label>Pilih Angkatan:</label>
              <div className={styles.angkatanBtns}>
                {['7', '8', '9'].map(a => (
                  <button
                    key={a}
                    className={`${styles.angkatanBtn} ${angkatan === a ? styles.angkatanBtnActive : ''}`}
                    onClick={() => setAngkatan(a)}
                  >
                    Kelas {a}
                    <small>{activeData.filter(s => s.rombel.startsWith(a)).length} siswa</small>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className={styles.printSelectRow}>
              <label>Pilih Kelas:</label>
              <div className={styles.kelasBtns}>
                {kelasList.map(k => (
                  <button
                    key={k}
                    className={`${styles.kelasBtn} ${kelas === k ? styles.kelasBtnActive : ''}`}
                    onClick={() => setKelas(k)}
                  >
                    {k}
                    <small>{activeData.filter(s => s.rombel === k).length}</small>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className={styles.printPreviewInfo}>
            <i className="fas fa-info-circle"></i>
            <span>
              {selectedData.length} siswa akan dicetak
              {mode === 'kelas' && !kelas ? ' — pilih kelas terlebih dahulu' : ''}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.printModalFooter}>
          <button className={styles.printCancelBtn} onClick={onClose}>
            Batal
          </button>
          <button
            className={styles.printConfirmBtn}
            onClick={handlePrint}
            disabled={mode === 'kelas' && !kelas}
          >
            <i className="fas fa-print"></i> Cetak Sekarang
          </button>
        </div>

        {/* Hidden print content */}
        <div style={{ display: 'none' }}>
          <div ref={printRef}>
            {/* KOP */}
            <div className="kop">
              <img src="/logo.png" alt="Logo" />
              <div className="kop-text">
                <div className="kop-title">MTs Almaarif 01 Singosari</div>
                <div className="kop-sub">MADRASAH TSANAWIYAH ALMAARIF 01 SINGOSARI</div>
                <div className="kop-addr">Jl. Masjid No. 33 Pagentan Singosari Malang — NSM: 121235070033</div>
              </div>
            </div>
            <div className="kop-line"></div>

            <div className="doc-title">Daftar Siswa — {judulCetak}</div>
            <div className="doc-sub">
              Tahun Ajaran {activeData[0]?.tahunAjaran || '2026/2027'} &nbsp;|&nbsp; Dicetak: {today}
            </div>

            {mode === 'angkatan' ? (
              // Group per kelas
              Object.entries(groupedByKelas).sort(([a], [b]) => a.localeCompare(b)).map(([rombel, siswaList]) => (
                <div key={rombel} style={{ marginBottom: 12 }}>
                  <table>
                    <thead>
                      <tr>
                        <td colSpan={3} className="group-header">Kelas {rombel} — {siswaList.length} Siswa</td>
                      </tr>
                      <tr>
                        <th className="col-no">No</th>
                        <th className="col-nama">Nama Siswa</th>
                        <th className="col-ket">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {siswaList.map((s, i) => (
                        <tr key={s.id}>
                          <td className="col-no">{i + 1}</td>
                          <td className="col-nama">{s.nama}</td>
                          <td className="col-ket"></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))
            ) : (
              // Single kelas
              <table>
                <thead>
                  <tr>
                    <th className="col-no">No</th>
                    <th className="col-nama">Nama Siswa</th>
                    <th className="col-ket">Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedData.map((s, i) => (
                    <tr key={s.id}>
                      <td className="col-no">{i + 1}</td>
                      <td className="col-nama">{s.nama}</td>
                      <td className="col-ket"></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div className="ttd">
              <div className="ttd-box">
                <div className="ttd-city">Singosari, {today}</div>
                <div>Kepala Madrasah,</div>
                <div className="ttd-space"></div>
                <div className="ttd-name">Dwi Retno Palupi, M.Pd.</div>
              </div>
            </div>
            <div className="footer-note">* Dokumen ini dicetak secara otomatis oleh Sistem Informasi MTs Almaarif 01 Singosari</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SiswaPage() {
  const [data, setData] = useState<Siswa[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSiswa, setSelectedSiswa] = useState<Siswa | null>(null);
  const [selectedTahun, setSelectedTahun] = useState<string>('Semua');
  const [selectedTingkat, setSelectedTingkat] = useState<string>('Semua');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showPrintModal, setShowPrintModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/siswa');
        const result = await res.json();
        if (result.success) {
          setData(result.data);
          const tahunList = Array.from(new Set(result.data.map((s: Siswa) => s.tahunAjaran).filter(Boolean))) as string[];
          if (tahunList.length > 0) {
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

  const filteredData = data.filter(s => {
    const matchSearch = s.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        s.nisn.includes(searchTerm) ||
                        s.rombel.toLowerCase().includes(searchTerm.toLowerCase());
    const matchTahun = selectedTahun === 'Semua' ? s.isLatest : s.tahunAjaran === selectedTahun;
    const matchTingkat = selectedTingkat === 'Semua' ? true : s.rombel.startsWith(selectedTingkat);
    return matchSearch && matchTahun && matchTingkat;
  });

  const statsData = data.filter(s => selectedTahun === 'Semua' ? s.isLatest : s.tahunAjaran === selectedTahun);
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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedTahun, selectedTingkat]);

  const handleExportExcel = () => {
    const dataToExport = filteredData.map((s, index) => ({
      'No': index + 1,
      'NIS': s.nis,
      'NISN': s.nisn,
      'Nama Lengkap': s.nama,
      'Jenis Kelamin': s.jenisKelamin,
      'Tempat Lahir': s.tempatLahir,
      'Tanggal Lahir': s.tanggalLahir,
      'Rombel/Kelas': s.rombel,
      'Status': s.status,
      'Tahun Ajaran': s.tahunAjaran,
      'Domisili': s.domisili,
      'Alamat': s.alamat,
      'Nama Ayah': s.namaAyah,
      'Pekerjaan Ayah': s.pekerjaanAyah,
      'Nama Ibu': s.namaIbu,
      'Pekerjaan Ibu': s.pekerjaanIbu,
      'No. HP / WA': s.noHp
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Siswa');
    worksheet['!cols'] = [
      { wch: 5 }, { wch: 15 }, { wch: 15 }, { wch: 35 },
      { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 12 },
      { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 40 },
      { wch: 25 }, { wch: 20 }, { wch: 25 }, { wch: 20 }, { wch: 18 }
    ];
    XLSX.writeFile(workbook, `Data_Siswa_${selectedTahun === 'Semua' ? 'All' : selectedTahun}.xlsx`);
  };

  return (
    <div className={styles.container}>
      {/* Print Modal */}
      {showPrintModal && (
        <PrintSiswaModal allData={data} onClose={() => setShowPrintModal(false)} />
      )}

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

      <div className={styles.stickyTop}>
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
            <select
              className={styles.filterSelect}
              value={selectedTingkat}
              onChange={(e) => setSelectedTingkat(e.target.value)}
            >
              <option value="Semua">Semua Tingkat</option>
              <option value="7">Tingkat 7</option>
              <option value="8">Tingkat 8</option>
              <option value="9">Tingkat 9</option>
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
            <button onClick={handleExportExcel} className="btn btn-gold" style={{ marginRight: '8px' }}>
              <i className="fas fa-file-excel"></i> Export Excel
            </button>
            <button onClick={() => setShowPrintModal(true)} className="btn btn-primary" style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', borderColor: '#7c3aed' }}>
              <i className="fas fa-print"></i> Cetak Daftar
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
      </div>

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
                  <th>NIK</th>
                  <th>Tempat Lahir</th>
                  <th>Tanggal Lahir</th>
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
                      <td>{siswa.nik || '-'}</td>
                      <td>{siswa.tempatLahir || '-'}</td>
                      <td>{siswa.tanggalLahir || '-'}</td>
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
                    <td colSpan={15} style={{ textAlign: 'center', padding: '40px' }}>
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
    </div>
  );
}
