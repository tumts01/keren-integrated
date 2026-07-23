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


// ===== CETAK PRESENSI MODAL =====
function PrintPresensiModal({
  allData,
  onClose,
}: {
  allData: Siswa[];
  onClose: () => void;
}) {
  const [tingkat, setTingkat] = useState<string>('7');
  const [tglMulai, setTglMulai] = useState<string>('');
  const [tglSelesai, setTglSelesai] = useState<string>('');
  const [semester, setSemester] = useState<string>('GANJIL');
  const [tahunAjaran, setTahunAjaran] = useState<string>('2026/2027');

  const handlePrint = () => {
    if (!tglMulai || !tglSelesai) {
      alert('Pilih tanggal mulai dan tanggal selesai');
      return;
    }

    const activeData = allData.filter(s =>
      ['aktif'].includes(s.status.toLowerCase().trim()) && s.isLatest && s.rombel.startsWith(tingkat)
    );

    const grouped: Record<string, Siswa[]> = {};
    activeData.forEach(s => {
      if (!grouped[s.rombel]) grouped[s.rombel] = [];
      grouped[s.rombel].push(s);
    });

    const rombels = Object.keys(grouped).sort();
    if (rombels.length === 0) {
      alert('Tidak ada data siswa aktif untuk tingkat ini');
      return;
    }

    const dates: Date[] = [];
    let d = new Date(tglMulai);
    const end = new Date(tglSelesai);
    while (d <= end && dates.length < 6) {
      if (d.getDay() !== 0) {
        dates.push(new Date(d));
      }
      d.setDate(d.getDate() + 1);
    }

    if (dates.length === 0) {
      alert('Rentang tanggal tidak valid (atau hanya berisi hari Minggu)');
      return;
    }

    const getCols = (day: number) => {
      if (day === 5) return 8; // Jumat
      if (day === 6) return 9; // Sabtu
      return 10;
    };

    const tglMulaiStr = new Date(tglMulai).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const tglSelesaiStr = new Date(tglSelesai).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    let printHtml = '';

    rombels.forEach((rombel, rIndex) => {
      const siswaList = grouped[rombel].sort((a, b) => a.nama.localeCompare(b.nama));
      
      let tableHtml = `
        <table class="main-table">
          <thead>
            <tr>
              <th rowspan="2" style="width: 25px;">No</th>
              <th rowspan="2" style="width: 200px; text-align: center;">NAMA</th>
              <th rowspan="2" style="width: 20px;">L<br/>P</th>
      `;

      dates.forEach(date => {
        const dayName = date.toLocaleDateString('id-ID', { weekday: 'long' }).toUpperCase();
        const shortDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear().toString().slice(-2)}`;
        const cols = getCols(date.getDay());
        tableHtml += `<th colspan="${cols}">${dayName} (${shortDate})</th>`;
      });
      tableHtml += `</tr><tr>`;

      dates.forEach(date => {
        const cols = getCols(date.getDay());
        for (let i = 1; i <= cols; i++) {
          tableHtml += `<th style="width:12px; font-size:7pt; padding:1px;">${i}</th>`;
        }
      });
      tableHtml += `</tr></thead><tbody>`;

      siswaList.forEach((s, i) => {
        const jk = s.jenisKelamin?.toLowerCase().startsWith('l') ? 'L' : 'P';
        tableHtml += `
          <tr>
            <td style="text-align: center; font-size: 8pt;">${i + 1}</td>
            <td style="text-align: left; padding: 2px 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px; font-size: 8pt;">${s.nama}</td>
            <td style="text-align: center; font-size: 8pt;">${jk}</td>
        `;
        dates.forEach(date => {
          const cols = getCols(date.getDay());
          for (let j = 1; j <= cols; j++) {
            tableHtml += `<td style="padding:0;"></td>`;
          }
        });
        tableHtml += `</tr>`;
      });

      tableHtml += `</tbody></table>`;

      printHtml += `
        <div class="page">
          <div class="header">
            <h3>PRESENSI KELAS ${rombel}</h3>
            <h3>MTS ALMAARIF 01 SINGOSARI</h3>
            <h3>TAHUN AJARAN ${tahunAjaran}</h3>
          </div>
          <div class="sub-header">
            <div>SEMESTER: ${semester}</div>
            <div>${tglMulaiStr} s.d. ${tglSelesaiStr}</div>
          </div>
          ${tableHtml}
        </div>
      `;
      if (rIndex < rombels.length - 1) {
        printHtml += `<div style="page-break-after: always;"></div>`;
      }
    });

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html>
      <head>
        <title>Presensi Kelas</title>
        <style>
          @page { size: 330mm 215mm landscape; margin: 10mm; }
          body { font-family: 'Arial', sans-serif; font-size: 9pt; margin: 0; padding: 0; }
          .page { width: 100%; box-sizing: border-box; }
          .header { text-align: center; margin-bottom: 10px; }
          .header h3 { margin: 0; font-size: 12pt; font-weight: bold; }
          .sub-header { display: flex; justify-content: space-between; font-weight: bold; font-size: 9pt; margin-bottom: 5px; text-transform: uppercase; }
          table.main-table { width: 100%; border-collapse: collapse; }
          table.main-table th, table.main-table td { border: 1px solid black; padding: 2px; text-align: center; height: 22px; }
          table.main-table th { font-weight: bold; }
          @media print { body { -webkit-print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        ${printHtml}
      </body>
      </html>
    `);
    win.document.close();
    setTimeout(() => win.print(), 500);
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2><i className="fas fa-print"></i> Cetak Presensi Kelas</h2>
          <button className={styles.closeBtn} onClick={onClose}><i className="fas fa-times"></i></button>
        </div>
        <div className={styles.modalBody} style={{ padding: '20px' }}>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' }}>Tingkat Kelas</label>
            <select value={tingkat} onChange={e => setTingkat(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
              <option value="7">Kelas 7</option>
              <option value="8">Kelas 8</option>
              <option value="9">Kelas 9</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' }}>Tanggal Mulai</label>
              <input type="date" value={tglMulai} onChange={e => setTglMulai(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' }}>Tanggal Selesai</label>
              <input type="date" value={tglSelesai} onChange={e => setTglSelesai(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' }}>Semester</label>
              <select value={semester} onChange={e => setSemester(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                <option value="GANJIL">Ganjil</option>
                <option value="GENAP">Genap</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' }}>Tahun Ajaran</label>
              <input type="text" value={tahunAjaran} onChange={e => setTahunAjaran(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            </div>
          </div>

          <button onClick={handlePrint} className="btn btn-primary" style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg,#10b981,#059669)', borderColor: '#10b981' }}>
            <i className="fas fa-print" style={{ marginRight: '8px' }}></i> Cetak Absensi
          </button>
        </div>
      </div>
    </div>
  );
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

    // Hitung ukuran baris agar 1 kelas = 1 halaman A4
    // A4 usable: ~774pt (273mm). Overhead title+subtitle+header = ~70pt
    const maxCount = mode === 'angkatan'
      ? Math.max(...Object.values(groupedByKelas).map(l => l.length), 1)
      : Math.max(selectedData.length, 1);
    const availablePt = 774 - (mode === 'angkatan' ? 88 : 70);
    const rowHeightPt = Math.min(availablePt / maxCount, 20);
    const fontSizePt  = Math.max(Math.min(rowHeightPt * 0.60, 9), 6);
    const paddingPt   = Math.max((rowHeightPt - fontSizePt * 1.2) / 2, 1);
    const titlePt     = Math.min(fontSizePt + 1.5, 10);
    const subPt       = Math.max(fontSizePt - 0.5, 6);

    win.document.write(`<!DOCTYPE html><html><head>
      <title>Daftar Siswa</title>
      <style>
        @page { size: A4 portrait; margin: 12mm 10mm; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; font-size: ${fontSizePt}pt; font-weight: 400; color: #000; }
        .doc-title { text-align: center; font-size: ${titlePt}pt; font-weight: 600; text-transform: uppercase; margin-bottom: 2px; }
        .doc-sub { text-align: center; font-size: ${subPt}pt; color: #333; margin-bottom: 6px; }
        table { width: 100%; border-collapse: collapse; font-size: ${fontSizePt}pt; }
        thead { display: table-header-group; }
        th { background: #f0f0f0; padding: ${paddingPt}pt 5pt; font-weight: 600; text-align: left; border: 1px solid #999; }
        td { padding: ${paddingPt}pt 5pt; border: 1px solid #bbb; vertical-align: middle; height: ${rowHeightPt}pt; }
        .col-no { width: 26pt; text-align: center; }
        .col-nama { width: 55%; }
        .group-header td { background: #e8e8e8; font-weight: 600; font-size: ${subPt}pt; padding: ${Math.max(paddingPt - 1, 1)}pt 5pt; border: 1px solid #999; }
        .page-section { page-break-after: always; }
        .page-section:last-child { page-break-after: avoid; }
        @media print { body { -webkit-print-color-adjust: exact; } }
      </style>
    </head><body>${content.innerHTML}</body></html>`);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 400);
  };

  const handleExportExcel = () => {
    if (mode === 'angkatan') {
      // Export per angkatan: 1 sheet per kelas
      const wb = XLSX.utils.book_new();
      Object.entries(groupedByKelas).sort(([a], [b]) => a.localeCompare(b)).forEach(([rombel, list]) => {
        const rows = list.map((s, i) => ({
          'No': i + 1,
          'Nama Siswa': s.nama,
          'NIS': s.nis,
          'NISN': s.nisn,
          'NIK': s.nik,
          'Jenis Kelamin': s.jenisKelamin,
          'Tempat Lahir': s.tempatLahir,
          'Tanggal Lahir': s.tanggalLahir,
          'Kelas': s.rombel,
          'Alamat': s.alamat,
          'No. HP / WA': s.noHp,
          'Nama Ayah': s.namaAyah,
          'Nama Ibu': s.namaIbu,
          'Tahun Ajaran': s.tahunAjaran,
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, `Kelas ${rombel}`);
      });
      XLSX.writeFile(wb, `Daftar_Siswa_Angkatan_${angkatan}_${new Date().toISOString().slice(0,10)}.xlsx`);
    } else {
      // Export per kelas: 1 sheet
      const rows = selectedData.map((s, i) => ({
        'No': i + 1,
        'Nama Siswa': s.nama,
        'NIS': s.nis,
        'NISN': s.nisn,
        'NIK': s.nik,
        'Jenis Kelamin': s.jenisKelamin,
        'Tempat Lahir': s.tempatLahir,
        'Tanggal Lahir': s.tanggalLahir,
        'Kelas': s.rombel,
        'Alamat': s.alamat,
        'No. HP / WA': s.noHp,
        'Nama Ayah': s.namaAyah,
        'Nama Ibu': s.namaIbu,
        'Tahun Ajaran': s.tahunAjaran,
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Kelas ${kelas}`);
      XLSX.writeFile(wb, `Daftar_Siswa_${kelas}_${new Date().toISOString().slice(0,10)}.xlsx`);
    }
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
            className={styles.printExcelBtn}
            onClick={handleExportExcel}
            disabled={mode === 'kelas' && !kelas}
          >
            <i className="fas fa-file-excel"></i> Export Excel
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

            {mode === 'angkatan' ? (
              // Setiap kelas = 1 halaman
              Object.entries(groupedByKelas).sort(([a], [b]) => a.localeCompare(b)).map(([rombel, siswaList]) => (
                <div key={rombel} className="page-section">
                  <div className="doc-title">Daftar Siswa — Kelas {rombel}</div>
                  <div className="doc-sub">
                    Tahun Ajaran {activeData[0]?.tahunAjaran || '2026/2027'} &nbsp;|&nbsp; Dicetak: {today} &nbsp;|&nbsp; {siswaList.length} Siswa
                  </div>
                  <table>
                    <thead>
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
              // Single kelas = 1 halaman
              <div className="page-section">
                <div className="doc-title">Daftar Siswa — Kelas {kelas}</div>
                <div className="doc-sub">
                  Tahun Ajaran {activeData[0]?.tahunAjaran || '2026/2027'} &nbsp;|&nbsp; Dicetak: {today} &nbsp;|&nbsp; {selectedData.length} Siswa
                </div>
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
              </div>
            )}
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
  const [selectedRombel, setSelectedRombel] = useState<string>('Semua');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showPresensiModal, setShowPresensiModal] = useState(false);

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

  const uniqueRombel = Array.from(new Set(
    data.filter(s => 
      (selectedTahun === 'Semua' ? s.isLatest : s.tahunAjaran === selectedTahun) && 
      (selectedTingkat === 'Semua' ? true : s.rombel.startsWith(selectedTingkat))
    ).map(s => (s.rombel || '').trim()).filter(Boolean)
  )).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const filteredData = data.filter(s => {
    const matchSearch = s.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        s.nisn.includes(searchTerm) ||
                        s.rombel.toLowerCase().includes(searchTerm.toLowerCase());
    const matchTahun = selectedTahun === 'Semua' ? s.isLatest : s.tahunAjaran === selectedTahun;
    const matchTingkat = selectedTingkat === 'Semua' ? true : s.rombel.startsWith(selectedTingkat);
    const matchRombel = selectedRombel === 'Semua' ? true : (s.rombel || '').trim() === selectedRombel;
    return matchSearch && matchTahun && matchTingkat && matchRombel;
  });

  const statsData = data.filter(s => selectedTahun === 'Semua' ? s.isLatest : s.tahunAjaran === selectedTahun);
  const activeData = statsData.filter(s => ['aktif'].includes(s.status.toLowerCase().trim()));
  const nonActiveData = statsData.filter(s => !['aktif'].includes(s.status.toLowerCase().trim()) && s.status.trim() !== '');

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
      {showPresensiModal && (
        <PrintPresensiModal allData={data} onClose={() => setShowPresensiModal(false)} />
      )}

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
                    <span className={`${styles.badge} ${['aktif'].includes(selectedSiswa.status.toLowerCase().trim()) ? styles.badgeAktif : styles.badgeNon}`}>
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
              onChange={(e) => { setSelectedTingkat(e.target.value); setSelectedRombel('Semua'); }}
            >
              <option value="Semua">Semua Tingkat</option>
              <option value="7">Tingkat 7</option>
              <option value="8">Tingkat 8</option>
              <option value="9">Tingkat 9</option>
            </select>
            <select
              className={styles.filterSelect}
              value={selectedRombel}
              onChange={(e) => setSelectedRombel(e.target.value)}
            >
              <option value="Semua">Semua Rombel</option>
              {uniqueRombel.map(r => (
                <option key={r} value={r}>{r}</option>
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
            <button onClick={handleExportExcel} className="btn btn-gold" style={{ marginRight: '8px' }}>
              <i className="fas fa-file-excel"></i> Export Excel
            </button>
            <button onClick={() => setShowPresensiModal(true)} className="btn btn-primary" style={{ background: "linear-gradient(135deg,#10b981,#059669)", borderColor: "#10b981", marginRight: "8px" }}>
              <i className="fas fa-calendar-check"></i> Cetak Absensi
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
                        <span className={`${styles.badge} ${['aktif'].includes(siswa.status.toLowerCase().trim()) ? styles.badgeAktif : styles.badgeNon}`}>
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
