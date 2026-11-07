'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
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

interface ParsedPreviewRow extends Prestasi {
  isValid: boolean;
  missingFields: string[];
}

function parseExcelDate(val: any): string {
  if (!val) return '';
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString().split('T')[0];
  }
  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  // DD/MM/YYYY or DD-MM-YYYY
  const m1 = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m1) {
    const d = m1[1].padStart(2, '0');
    const mo = m1[2].padStart(2, '0');
    const y = m1[3];
    return `${y}-${mo}-${d}`;
  }

  // YYYY/MM/DD
  const m2 = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (m2) {
    const y = m2[1];
    const mo = m2[2].padStart(2, '0');
    const d = m2[3].padStart(2, '0');
    return `${y}-${mo}-${d}`;
  }

  // Excel serial number (e.g. 45588)
  const num = Number(str);
  if (!isNaN(num) && num > 25000 && num < 65000) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const jsDate = new Date(excelEpoch.getTime() + num * 86400000);
    return jsDate.toISOString().split('T')[0];
  }

  return str;
}

function normalizeTingkat(raw: string): string {
  const clean = (raw || '').toString().trim().toUpperCase();
  if (!clean) return 'KABUPATEN/KOTA';
  if (clean.includes('INTERNASIONAL')) return 'INTERNASIONAL';
  if (clean.includes('NASIONAL')) return 'NASIONAL';
  if (clean.includes('PROVINSI') || clean.includes('PROV')) return 'PROVINSI';
  if (clean.includes('KABUPATEN') || clean.includes('KOTA') || clean.includes('KAB')) return 'KABUPATEN/KOTA';
  if (clean.includes('KECAMATAN') || clean.includes('KEC')) return 'KECAMATAN';
  return clean;
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

  // State untuk Import Excel
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [parsedPreview, setParsedPreview] = useState<ParsedPreviewRow[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [form, setForm] = useState<Prestasi>({
    no: '', tahun_pelajaran: '2026-2027', tanggal: '', nama: '', kelas: '',
    nama_lomba: '', penyelenggara: '', peringkat: '', tingkat: 'KABUPATEN/KOTA',
    link_sertifikat: '', induk: '', sertifikat_fisik: '', emis: ''
  });

  const [siswaList, setSiswaList] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetchData();
    
    // Check if user is admin / authorized
    const storedUser = localStorage.getItem('keren_user_data');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        const role = (parsed.role || '').toLowerCase();
        if (
          !role ||
          role === 'admin' ||
          role === 'administrator' ||
          role.includes('admin') ||
          role === 'kesiswaan' ||
          role === 'operator' ||
          role === 'guru' ||
          role === 'staff'
        ) {
          setIsAdmin(true);
        }
      } catch(e) {
        setIsAdmin(true);
      }
    } else {
      setIsAdmin(true);
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

  const handleExportExcel = () => {
    if (filteredData.length === 0) {
      Swal.fire('Info', 'Tidak ada data untuk diekspor', 'info');
      return;
    }
    const ws_data = filteredData.map((item, index) => ({
      'No': index + 1,
      'Tahun Pelajaran': item.tahun_pelajaran,
      'Tanggal': item.tanggal,
      'NIS / Induk': item.induk || '',
      'Siswa': item.nama,
      'Kelas': item.kelas,
      'Nama Lomba': item.nama_lomba,
      'Penyelenggara': item.penyelenggara,
      'Peringkat': item.peringkat,
      'Tingkat': item.tingkat,
      'Link Sertifikat': item.link_sertifikat,
      'Sertifikat Fisik': item.sertifikat_fisik || '',
      'EMIS': item.emis || ''
    }));
    
    const ws = XLSX.utils.json_to_sheet(ws_data);
    ws['!cols'] = [
      { wch: 6 },
      { wch: 16 },
      { wch: 14 },
      { wch: 14 },
      { wch: 30 },
      { wch: 10 },
      { wch: 35 },
      { wch: 30 },
      { wch: 20 },
      { wch: 20 },
      { wch: 35 },
      { wch: 16 },
      { wch: 10 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data Prestasi");
    XLSX.writeFile(wb, `Data_Prestasi_Siswa_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Unduh Template Excel Resmi
  const handleDownloadTemplate = () => {
    const templateRows = [
      {
        'No': 1,
        'Tahun Pelajaran': '2026-2027',
        'Tanggal': '2026-10-15',
        'NIS / Induk': '13684',
        'Nama Siswa': 'AVIKA CESILIA FIRDAUS',
        'Kelas': '8C',
        'Nama Lomba': 'LOMBA TOLAK PELURU MAARIF DAY',
        'Penyelenggara': 'LP MAARIF NU KAB.MALANG',
        'Peringkat': 'JUARA 1',
        'Tingkat': 'KABUPATEN/KOTA',
        'Link Sertifikat': 'https://drive.google.com/file/d/contoh-link-sertifikat',
        'Sertifikat Fisik': 'ADA',
        'EMIS': 'SUDAH'
      },
      {
        'No': 2,
        'Tahun Pelajaran': '2026-2027',
        'Tanggal': '2026-09-25',
        'NIS / Induk': '13374',
        'Nama Siswa': 'ASYIFA DWINOV MAHARANI',
        'Kelas': '9G',
        'Nama Lomba': 'LOMBA PENCAK SILAT SENI TUNGGAL PUTRI',
        'Penyelenggara': 'KEMENPORA RI',
        'Peringkat': 'JUARA 3',
        'Tingkat': 'NASIONAL',
        'Link Sertifikat': '',
        'Sertifikat Fisik': 'ADA',
        'EMIS': ''
      },
      {
        'No': 3,
        'Tahun Pelajaran': '2026-2027',
        'Tanggal': '2026-11-02',
        'NIS / Induk': '',
        'Nama Siswa': 'MUHAMMAD RIZKY PRATAMA',
        'Kelas': '7A',
        'Nama Lomba': 'OLIMPIADE MATEMATIKA SAINS TINGKAT PROVINSI',
        'Penyelenggara': 'UNIVERSITAS NEGERI MALANG',
        'Peringkat': 'MEDALI PERAK',
        'Tingkat': 'PROVINSI',
        'Link Sertifikat': '',
        'Sertifikat Fisik': '',
        'EMIS': ''
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateRows);
    ws['!cols'] = [
      { wch: 6 },
      { wch: 16 },
      { wch: 14 },
      { wch: 14 },
      { wch: 32 },
      { wch: 10 },
      { wch: 40 },
      { wch: 32 },
      { wch: 20 },
      { wch: 20 },
      { wch: 38 },
      { wch: 16 },
      { wch: 10 },
    ];

    const guideRows = [
      { 'PANDUAN PENGISIAN TEMPLATE IMPORT PRESTASI SISWA': 'PETUNJUK LENGKAP & KETENTUAN KOLOM' },
      { 'PANDUAN PENGISIAN TEMPLATE IMPORT PRESTASI SISWA': '' },
      { 'PANDUAN PENGISIAN TEMPLATE IMPORT PRESTASI SISWA': '1. Kolom WAJIB diisi: Nama Siswa, Nama Lomba, Peringkat.' },
      { 'PANDUAN PENGISIAN TEMPLATE IMPORT PRESTASI SISWA': '2. Kolom Tahun Pelajaran: Isi tahun pelajaran aktif, misalnya 2026-2027 atau 2025-2026 (jika kosong, otomatis 2026-2027).' },
      { 'PANDUAN PENGISIAN TEMPLATE IMPORT PRESTASI SISWA': '3. Kolom Tanggal: Disarankan format YYYY-MM-DD (contoh: 2026-10-15) atau tanggal Excel biasa (15/10/2026).' },
      { 'PANDUAN PENGISIAN TEMPLATE IMPORT PRESTASI SISWA': '4. Kolom NIS / Induk & Kelas: Jika NIS atau Nama Siswa terdaftar pada Data Siswa madrasah, Kelas & NIS akan otomatis dilengkapi sistem.' },
      { 'PANDUAN PENGISIAN TEMPLATE IMPORT PRESTASI SISWA': '5. Kolom Tingkat: Pilihan standar (KECAMATAN, KABUPATEN/KOTA, PROVINSI, NASIONAL, INTERNASIONAL).' },
      { 'PANDUAN PENGISIAN TEMPLATE IMPORT PRESTASI SISWA': '6. Kolom Peringkat: Contoh pengisian: JUARA 1, JUARA 2, JUARA 3, JUARA HARAPAN 1, MEDALI EMAS, MEDALI PERAK, MEDALI PERUNGGU.' },
      { 'PANDUAN PENGISIAN TEMPLATE IMPORT PRESTASI SISWA': '7. Kolom Sertifikat Fisik: Isi ADA jika piagam fisik disimpan madrasah, atau kosongkan jika tidak ada.' },
      { 'PANDUAN PENGISIAN TEMPLATE IMPORT PRESTASI SISWA': '8. Kolom EMIS: Isi SUDAH / ADA jika sudah terinput ke EMIS Kemenag, atau kosongkan jika belum.' },
      { 'PANDUAN PENGISIAN TEMPLATE IMPORT PRESTASI SISWA': '9. Hapus 3 baris contoh di sheet "Template Prestasi", lalu masukkan data prestasi siswa madrasah Anda.' },
    ];
    const wsGuide = XLSX.utils.json_to_sheet(guideRows);
    wsGuide['!cols'] = [{ wch: 100 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template Prestasi");
    XLSX.utils.book_append_sheet(wb, wsGuide, "Panduan Pengisian");

    XLSX.writeFile(wb, "Template_Import_Prestasi_Siswa.xlsx");
  };

  // Buka Modal Import Excel
  const handleOpenImportModal = () => {
    setImportFile(null);
    setParsedPreview([]);
    setIsImportModalOpen(true);
  };

  // Parser File Excel
  const processExcelFile = (file: File) => {
    setImportFile(file);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        const wb = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: true });
        
        // Cari sheet pertama atau sheet dengan nama 'Template Prestasi'
        const targetSheetName = wb.SheetNames.find(n => n.toLowerCase().includes('prestasi')) || wb.SheetNames[0];
        const sheet = wb.Sheets[targetSheetName];

        if (!sheet) {
          Swal.fire('File Kosong', 'Tidak ditemukan sheet data pada file Excel ini.', 'warning');
          return;
        }

        const rawRows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });

        if (!rawRows || rawRows.length === 0) {
          Swal.fire('File Kosong', 'Tidak ada data baris yang terdeteksi di sheet Excel.', 'warning');
          return;
        }

        // Helper untuk mencocokkan nama kolom fleksibel
        const extractVal = (row: any, patterns: RegExp[]): string => {
          for (const p of patterns) {
            for (const key of Object.keys(row)) {
              if (p.test(key.trim())) {
                const val = row[key];
                return val !== null && val !== undefined ? String(val).trim() : '';
              }
            }
          }
          return '';
        };

        const previewList: ParsedPreviewRow[] = [];

        rawRows.forEach((row, index) => {
          const rawNama = extractVal(row, [/^nama\s*siswa$/i, /^nama$/i, /^siswa$/i, /^peserta$/i]);
          const rawLomba = extractVal(row, [/^nama\s*lomba$/i, /^lomba$/i, /^kejuaraan$/i, /^kegiatan$/i]);
          const rawPenyelenggara = extractVal(row, [/^penyelenggara$/i, /^instansi$/i]);
          const rawPeringkat = extractVal(row, [/^peringkat$/i, /^juara$/i, /^hasil$/i]);
          const rawTingkat = extractVal(row, [/^tingkat$/i, /^level$/i]);
          const rawTanggal = extractVal(row, [/^tanggal/i, /^tgl/i, /^date/i, /^waktu/i]);
          const rawTapel = extractVal(row, [/^tahun\s*pelajaran/i, /^tapel/i, /^tahun/i]);
          const rawKelas = extractVal(row, [/^kelas$/i, /^rombel$/i]);
          const rawInduk = extractVal(row, [/^nis\s*\/?\s*induk/i, /^nis$/i, /^no\s*induk/i, /^induk$/i]);
          const rawLink = extractVal(row, [/^link\s*sertifikat/i, /^link/i, /^drive/i, /^url/i]);
          const rawFisik = extractVal(row, [/^sertifikat\s*fisik/i, /^fisik/i]);
          const rawEmis = extractVal(row, [/^emis/i, /^status\s*emis/i]);
          const rawNo = extractVal(row, [/^no$/i, /^nomor$/i]);

          // Abaikan baris panduan atau baris kosong total
          if (!rawNama && !rawLomba && !rawPeringkat) {
            return;
          }

          let finalNama = rawNama.toUpperCase();
          let finalKelas = rawKelas.toUpperCase();
          let finalInduk = rawInduk;

          // Auto-match dengan data siswa madrasah
          if (finalNama || finalInduk) {
            const matchedSiswa = siswaList.find(s => 
              (finalInduk && String(s.nis).trim() === String(finalInduk).trim()) ||
              (finalNama && s.nama.toUpperCase() === finalNama)
            );
            if (matchedSiswa) {
              if (!finalKelas && matchedSiswa.rombel) finalKelas = String(matchedSiswa.rombel).toUpperCase();
              if (!finalInduk && matchedSiswa.nis) finalInduk = String(matchedSiswa.nis);
              if (!finalNama && matchedSiswa.nama) finalNama = String(matchedSiswa.nama).toUpperCase();
            }
          }

          // Validasi kolom wajib
          const missingFields: string[] = [];
          if (!finalNama) missingFields.push('Nama Siswa');
          if (!rawLomba) missingFields.push('Nama Lomba');
          if (!rawPeringkat) missingFields.push('Peringkat');

          const isValid = missingFields.length === 0;

          previewList.push({
            no: rawNo || index + 1,
            tahun_pelajaran: rawTapel || '2026-2027',
            tanggal: parseExcelDate(rawTanggal),
            nama: finalNama,
            kelas: finalKelas,
            nama_lomba: rawLomba.toUpperCase(),
            penyelenggara: rawPenyelenggara.toUpperCase(),
            peringkat: rawPeringkat.toUpperCase(),
            tingkat: normalizeTingkat(rawTingkat),
            link_sertifikat: rawLink,
            induk: finalInduk,
            sertifikat_fisik: /ada|ya|true|v|√/i.test(rawFisik) ? 'ADA' : '',
            emis: /ada|sudah|ya|true|v|√/i.test(rawEmis) ? '√' : '',
            isValid,
            missingFields
          });
        });

        if (previewList.length === 0) {
          Swal.fire('Tidak Ada Data', 'Tidak ditemukan baris data siswa yang valid pada sheet.', 'warning');
          setParsedPreview([]);
          return;
        }

        setParsedPreview(previewList);
      } catch (err: any) {
        console.error('Error membaca excel:', err);
        Swal.fire('Gagal Membaca File', 'Pastikan file yang diunggah berupa file Excel (.xlsx / .xls) yang valid.', 'error');
        setParsedPreview([]);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processExcelFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processExcelFile(file);
    }
  };

  // Simpan Data Massal ke Database
  const handleExecuteImport = async () => {
    const validItems = parsedPreview.filter(p => p.isValid);
    if (validItems.length === 0) {
      Swal.fire('Data Tidak Valid', 'Tidak ada data valid yang siap diimpor. Pastikan kolom Nama Siswa, Nama Lomba, dan Peringkat terisi.', 'warning');
      return;
    }

    const confirm = await Swal.fire({
      title: `Impor ${validItems.length} Data Prestasi?`,
      html: `Sistem akan menyimpan <b>${validItems.length} data prestasi</b> ke dalam database secara otomatis.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#0284c7',
      confirmButtonText: 'Ya, Impor Sekarang',
      cancelButtonText: 'Batal'
    });

    if (!confirm.isConfirmed) return;

    setIsImporting(true);
    try {
      const res = await fetch('/api/prestasi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bulk: true,
          items: validItems
        })
      });

      const json = await res.json();
      if (json.success) {
        await Swal.fire({
          icon: 'success',
          title: 'Berhasil Diimpor!',
          text: json.message || `${validItems.length} data prestasi berhasil ditambahkan ke sistem.`,
          timer: 2000,
          showConfirmButton: false
        });
        setIsImportModalOpen(false);
        setImportFile(null);
        setParsedPreview([]);
        fetchData();
      } else {
        Swal.fire('Gagal Impor', json.error || 'Terjadi kesalahan saat menyimpan data ke database.', 'error');
      }
    } catch (err: any) {
      console.error(err);
      Swal.fire('Error', 'Terjadi gangguan jaringan atau kesalahan sistem.', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const validCount = parsedPreview.filter(p => p.isValid).length;
  const invalidCount = parsedPreview.length - validCount;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Data Prestasi Siswa</h1>
          <p className={styles.subtitle}>Kelola rekapitulasi data prestasi siswa madrasah</p>
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button className={styles.btnAdd} onClick={handleExportExcel} style={{ backgroundColor: '#10b981' }} title="Export data ke Excel">
              <i className="fas fa-file-excel"></i> Export Excel
            </button>
            <button className={styles.btnImport} onClick={handleOpenImportModal} title="Input massal dengan template Excel">
              <i className="fas fa-file-upload"></i> Import Excel
            </button>
            <button className={styles.btnAdd} onClick={() => handleOpenModal()}>
              <i className="fas fa-plus"></i> Tambah Prestasi
            </button>
          </div>
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
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          {item.kelas ? `Kelas ${item.kelas}` : '-'} {item.induk ? `• NIS: ${item.induk}` : ''}
                        </div>
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

      {/* MODAL INPUT MANUAL (TAMBAH / EDIT) */}
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

                <div className={styles.formGroup}>
                  <label>NIS / Induk</label>
                  <input type="text" value={form.induk} onChange={e => setForm({...form, induk: e.target.value})} placeholder="Nomor Induk Siswa" />
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

                <div className={styles.formGroup}>
                  <label>Status EMIS</label>
                  <select value={form.emis} onChange={e => setForm({...form, emis: e.target.value})}>
                    <option value="">Belum Diinput</option>
                    <option value="√">Sudah Diinput (√)</option>
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

      {/* MODAL IMPORT EXCEL */}
      {isImportModalOpen && (
        <div className={styles.modalOverlay} onClick={() => !isImporting && setIsImportModalOpen(false)}>
          <div className={styles.modalLargeCard} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <i className="fas fa-file-excel" style={{ color: '#0284c7' }}></i>
                  Import Data Prestasi via Excel
                </h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                  Unggah file Excel untuk menambahkan banyak data prestasi siswa sekaligus tanpa input satu per satu.
                </p>
              </div>
              <button className={styles.btnClose} onClick={() => !isImporting && setIsImportModalOpen(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* LANGKAH 1: UNDUH TEMPLATE */}
              <div className={styles.stepBox}>
                <div className={styles.stepTitle}>
                  <span className={styles.stepNum}>1</span>
                  <span>Unduh Template Format Excel</span>
                </div>
                <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: '#64748b' }}>
                  Gunakan format template standar agar data otomatis terbaca dan tersusun dengan rapi:
                </p>
                <button 
                  type="button" 
                  onClick={handleDownloadTemplate}
                  style={{
                    background: '#f0fdf4',
                    color: '#166534',
                    border: '1.5px solid #86efac',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={e => e.currentTarget.style.background = '#dcfce7'}
                  onMouseOut={e => e.currentTarget.style.background = '#f0fdf4'}
                >
                  <i className="fas fa-download"></i> Unduh Template Excel (.xlsx)
                </button>
              </div>

              {/* LANGKAH 2: UPLOAD & PRATINJAU */}
              <div className={styles.stepBox}>
                <div className={styles.stepTitle}>
                  <span className={styles.stepNum}>2</span>
                  <span>Pilih atau Tarik File Excel yang Sudah Diisi</span>
                </div>

                <input 
                  type="file" 
                  ref={fileInputRef}
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileInputChange}
                  style={{ display: 'none' }}
                />

                <div 
                  className={`${styles.dropzone} ${isDragging ? styles.dropzoneActive : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                >
                  <i className="fas fa-cloud-upload-alt" style={{ fontSize: '2.5rem', color: '#0284c7', marginBottom: '8px' }}></i>
                  <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '1rem', marginBottom: '4px' }}>
                    {importFile ? importFile.name : 'Klik untuk memilih file Excel atau seret file ke sini'}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                    Mendukung format file <b>.xlsx, .xls</b> (Maksimal 10 MB)
                  </div>
                </div>
              </div>

              {/* PRATINJAU DATA HASIL PARSING */}
              {parsedPreview.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div className={styles.previewSummary}>
                      <span className={`${styles.summaryBadge} ${styles.badgeInfo}`}>
                        <i className="fas fa-list-ol"></i> Total: {parsedPreview.length} Baris
                      </span>
                      <span className={`${styles.summaryBadge} ${styles.badgeSuccess}`}>
                        <i className="fas fa-check-circle"></i> Siap Diimpor: {validCount}
                      </span>
                      {invalidCount > 0 && (
                        <span className={`${styles.summaryBadge} ${styles.badgeDanger}`}>
                          <i className="fas fa-exclamation-triangle"></i> Tidak Lengkap: {invalidCount}
                        </span>
                      )}
                    </div>
                    <button 
                      type="button" 
                      onClick={() => { setImportFile(null); setParsedPreview([]); }}
                      style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      <i className="fas fa-trash"></i> Hapus & Ganti File
                    </button>
                  </div>

                  <div className={styles.previewTableWrapper}>
                    <table className={styles.table} style={{ fontSize: '0.83rem' }}>
                      <thead>
                        <tr>
                          <th style={{ width: '40px' }}>No</th>
                          <th>Status</th>
                          <th>Nama Siswa</th>
                          <th>Kelas / NIS</th>
                          <th>Lomba</th>
                          <th>Penyelenggara</th>
                          <th>Peringkat / Tingkat</th>
                          <th>Tanggal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedPreview.map((item, idx) => (
                          <tr key={idx} style={{ background: item.isValid ? 'transparent' : '#fff1f2' }}>
                            <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                            <td>
                              {item.isValid ? (
                                <span style={{ background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '4px', fontWeight: 700, fontSize: '0.75rem' }}>
                                  Siap Impor
                                </span>
                              ) : (
                                <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '3px 8px', borderRadius: '4px', fontWeight: 700, fontSize: '0.75rem' }} title={`Wajib diisi: ${item.missingFields.join(', ')}`}>
                                  {item.missingFields.join(', ')} Kosong
                                </span>
                              )}
                            </td>
                            <td style={{ fontWeight: 600 }}>{item.nama || '-'}</td>
                            <td>{item.kelas || '-'} {item.induk ? `(${item.induk})` : ''}</td>
                            <td style={{ color: '#0284c7', fontWeight: 600 }}>{item.nama_lomba || '-'}</td>
                            <td>{item.penyelenggara || '-'}</td>
                            <td>
                              <div style={{ color: '#f59e0b', fontWeight: 700 }}>{item.peringkat || '-'}</div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.tingkat}</div>
                            </td>
                            <td>{item.tanggal || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    <i className="fas fa-info-circle" style={{ color: '#0284c7' }}></i> Baris dengan status <b>Siap Impor</b> akan dimasukkan ke dalam database. Data kelas & NIS yang cocok dengan arsip siswa madrasah otomatis dilengkapi.
                  </div>
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button 
                type="button" 
                className={styles.btnCancel} 
                onClick={() => setIsImportModalOpen(false)}
                disabled={isImporting}
              >
                Batal
              </button>
              <button 
                type="button" 
                className={styles.btnSave} 
                onClick={handleExecuteImport}
                disabled={isImporting || validCount === 0}
                style={{ background: validCount > 0 ? '#0284c7' : '#94a3b8' }}
              >
                {isImporting ? (
                  <><i className="fas fa-spinner fa-spin"></i> Menyimpan Data...</>
                ) : (
                  <><i className="fas fa-file-import"></i> Impor {validCount > 0 ? `(${validCount} Data)` : ''}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
