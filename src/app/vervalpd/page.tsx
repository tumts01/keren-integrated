'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import styles from './VervalPD.module.css';
import InlineLoading from '@/components/InlineLoading';

interface InternalStudent {
  idSiswa: string;
  nisn: string;
  nik: string;
  nama: string;
  tempatLahir: string;
  tanggalLahir: string;
  ibuKandung: string;
  jenisKelamin: string;
  kelas: string;
  tahunAjaran: string;
  status: string;
}

type VervalField =
  | 'nisn'
  | 'nik'
  | 'nama'
  | 'tempatLahir'
  | 'tanggalLahir'
  | 'ibuKandung'
  | 'jenisKelamin';

interface VervalRow {
  nisn: string;
  nik: string;
  nama: string;
  tempatLahir: string;
  tanggalLahir: string;
  ibuKandung: string;
  jenisKelamin: string;
  rawRowNumber?: number;
}

type ReconciliationStatus =
  | 'COCOK_SEMPURNA'
  | 'BEDA_DATA'
  | 'HANYA_INTERNAL'
  | 'HANYA_VERVALPD';

type DiffField =
  | 'nisn'
  | 'nik'
  | 'nama'
  | 'tempatLahir'
  | 'tanggalLahir'
  | 'ibuKandung'
  | 'jenisKelamin';

interface ComparisonRecord {
  id: string;
  status: ReconciliationStatus;
  kelas: string;
  diffFields: DiffField[];
  internal?: InternalStudent;
  verval?: VervalRow;
}

const INDO_MONTH_MAP: Record<string, string> = {
  jan: '01', januari: '01',
  feb: '02', februari: '02',
  mar: '03', maret: '03',
  apr: '04', april: '04',
  mei: '05', may: '05',
  jun: '06', juni: '06',
  jul: '07', juli: '07',
  agu: '08', agustus: '08', aug: '08',
  sep: '09', september: '09',
  okt: '10', oktober: '10', oct: '10',
  nov: '11', november: '11',
  des: '12', desember: '12', dec: '12'
};

function normalizeDate(raw: any): string {
  if (!raw) return '';
  if (raw instanceof Date && !isNaN(raw.getTime())) {
    return raw.toISOString().slice(0, 10);
  }
  if (typeof raw === 'number') {
    const date = new Date(Math.round((raw - 25569) * 86400 * 1000));
    return isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
  }
  const str = String(raw).trim().toLowerCase();

  // YYYY-MM-DD
  const mIso = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (mIso) {
    return `${mIso[1]}-${mIso[2].padStart(2, '0')}-${mIso[3].padStart(2, '0')}`;
  }

  // DD-MM-YYYY or DD/MM/YYYY
  const mDmy = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (mDmy) {
    return `${mDmy[3]}-${mDmy[2].padStart(2, '0')}-${mDmy[1].padStart(2, '0')}`;
  }

  // 12 MARET 2013 or 6 DESEMBER 2012
  const mWord = str.match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/);
  if (mWord) {
    const day = mWord[1].padStart(2, '0');
    const month = INDO_MONTH_MAP[mWord[2]] || '01';
    const year = mWord[3];
    return `${year}-${month}-${day}`;
  }

  return str;
}

function normalizeIdNumber(raw: any): string {
  if (!raw) return '';
  return String(raw).replace(/['"\s-]/g, '').trim();
}

function normalizeText(raw: any): string {
  if (!raw) return '';
  return String(raw).trim().replace(/\s+/g, ' ').toUpperCase();
}

function normalizeGender(raw: any): string {
  if (!raw) return '';
  const s = String(raw).trim().toUpperCase();
  if (s === 'L' || s.startsWith('LAKI') || s === 'PRIA' || s === 'M' || s === 'MALE') return 'L';
  if (s === 'P' || s.startsWith('PEREMPUAN') || s === 'WANITA' || s === 'F' || s === 'FEMALE') return 'P';
  return s;
}

const ALIASES: Record<VervalField, string[]> = {
  nisn: ['nisn', 'nomornisn', 'nonisn'],
  nik: ['nik', 'nomornik', 'nonik', 'noktp', 'niksiswa'],
  nama: ['nama', 'namasiswa', 'namapesertadidik', 'namalengkap', 'namasantri'],
  tempatLahir: ['tempatlahir', 'tempat', 'tmplahir', 'tplahir', 'kotaslahir'],
  tanggalLahir: ['tanggallahir', 'tgllahir', 'tgl', 'tanggallahirsiswa'],
  ibuKandung: ['ibukandung', 'namaibukandung', 'namaibu', 'ibu'],
  jenisKelamin: ['jeniskelamin', 'jk', 'gender', 'sex', 'lp', 'jeniskel']
};

export default function VervalPDPage() {
  const [internalData, setInternalData] = useState<InternalStudent[]>([]);
  const [tahunAjaranList, setTahunAjaranList] = useState<string[]>([]);
  const [selectedTA, setSelectedTA] = useState<string>('');
  const [loadingInternal, setLoadingInternal] = useState(true);

  // VervalPD file state
  const [vervalData, setVervalData] = useState<VervalRow[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filters & Pagination
  const [tabFilter, setTabFilter] = useState<'all' | 'hanya_internal' | 'beda_data' | 'cocok_sempurna' | 'hanya_vervalpd'>('all');
  const [filterKelas, setFilterKelas] = useState('');
  const [filterDiffField, setFilterDiffField] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  // 1. Fetch Internal Student Data
  const fetchInternal = useCallback(async (ta?: string) => {
    setLoadingInternal(true);
    try {
      const url = `/api/vervalpd${ta ? `?tahunAjaran=${encodeURIComponent(ta)}` : ''}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setInternalData(json.data || []);
        setTahunAjaranList(json.tahunAjaranList || []);
        if (!selectedTA && json.activeTahunAjaran) {
          setSelectedTA(json.activeTahunAjaran);
        }
      } else {
        Swal.fire('Gagal', json.error || 'Gagal memuat data internal', 'error');
      }
    } catch {
      Swal.fire('Error', 'Gagal terhubung ke server', 'error');
    } finally {
      setLoadingInternal(false);
    }
  }, [selectedTA]);

  useEffect(() => {
    fetchInternal();

    // Check cached uploaded file in sessionStorage
    try {
      const cached = sessionStorage.getItem('vervalpd_file_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.data && parsed.fileName) {
          setVervalData(parsed.data);
          setFileName(parsed.fileName);
        }
      }
    } catch {}
  }, [fetchInternal]);

  // 2. Parse Excel File
  const handleFileUpload = (file: File) => {
    if (!file) return;
    const validExts = ['.xlsx', '.xls', '.csv'];
    const isVal = validExts.some(ext => file.name.toLowerCase().endsWith(ext));
    if (!isVal) {
      Swal.fire('Format Salah', 'Harap unggah file Excel (.xlsx / .xls) atau .csv', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const wb = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: true });
        const sheetName = wb.SheetNames[0];
        const sheet = wb.Sheets[sheetName];
        if (!sheet) {
          Swal.fire('File Kosong', 'Tidak ada data sheet yang ditemukan', 'warning');
          return;
        }

        const rawMatrix: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        if (!rawMatrix || rawMatrix.length === 0) {
          Swal.fire('File Kosong', 'File Excel tidak memiliki baris data', 'warning');
          return;
        }

        // Detect Header Row index (search first 10 rows)
        let headerRowIdx = 0;
        let bestScore = 0;

        for (let r = 0; r < Math.min(rawMatrix.length, 12); r++) {
          const row = rawMatrix[r];
          if (!Array.isArray(row)) continue;
          let score = 0;
          row.forEach(cell => {
            const clean = String(cell || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            if (!clean) return;
            for (const key of Object.keys(ALIASES) as VervalField[]) {
              if (ALIASES[key].some(a => clean === a || clean.includes(a))) {
                score++;
                break;
              }
            }
          });
          if (score > bestScore) {
            bestScore = score;
            headerRowIdx = r;
          }
        }

        const headerRow = rawMatrix[headerRowIdx] || [];
        const colMap: Partial<Record<VervalField, number>> = {};

        headerRow.forEach((colName: any, idx: number) => {
          const clean = String(colName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          if (!clean) return;

          for (const key of Object.keys(ALIASES) as VervalField[]) {
            if (colMap[key] === undefined) {
              if (ALIASES[key].some(a => clean === a || clean.includes(a))) {
                colMap[key] = idx;
              }
            }
          }
        });

        if (colMap.nisn === undefined && colMap.nama === undefined) {
          Swal.fire(
            'Format Kolom Tidak Sesuai',
            'File Excel harus memiliki kolom NISN dan Nama siswa. Silakan unduh template yang disediakan.',
            'error'
          );
          return;
        }

        // Parse data rows
        const parsedRows: VervalRow[] = [];
        for (let i = headerRowIdx + 1; i < rawMatrix.length; i++) {
          const row = rawMatrix[i];
          if (!Array.isArray(row) || row.every(c => c === '' || c === null || c === undefined)) continue;

          const nisn = colMap.nisn !== undefined ? String(row[colMap.nisn] ?? '').trim() : '';
          const nik = colMap.nik !== undefined ? String(row[colMap.nik] ?? '').trim() : '';
          const nama = colMap.nama !== undefined ? String(row[colMap.nama] ?? '').trim() : '';
          const tempatLahir = colMap.tempatLahir !== undefined ? String(row[colMap.tempatLahir] ?? '').trim() : '';
          const tanggalLahir = colMap.tanggalLahir !== undefined ? normalizeDate(row[colMap.tanggalLahir]) : '';
          const ibuKandung = colMap.ibuKandung !== undefined ? String(row[colMap.ibuKandung] ?? '').trim() : '';
          const jenisKelamin = colMap.jenisKelamin !== undefined ? String(row[colMap.jenisKelamin] ?? '').trim() : '';

          // Only add if at least name or NISN is present
          if (nama || nisn) {
            parsedRows.push({
              nisn,
              nik,
              nama,
              tempatLahir,
              tanggalLahir,
              ibuKandung,
              jenisKelamin,
              rawRowNumber: i + 1
            });
          }
        }

        setVervalData(parsedRows);
        setFileName(file.name);
        setCurrentPage(1);

        try {
          sessionStorage.setItem('vervalpd_file_cache', JSON.stringify({
            data: parsedRows,
            fileName: file.name
          }));
        } catch {}

        Swal.fire({
          icon: 'success',
          title: 'Berhasil Membaca File',
          text: `Berhasil memproses ${parsedRows.length} data siswa dari file ${file.name}.`,
          timer: 2000,
          showConfirmButton: false
        });
      } catch (err: any) {
        console.error('Error parsing excel:', err);
        Swal.fire('Gagal Membaca File', 'Pastikan file Excel tidak terproteksi atau rusak: ' + (err.message || ''), 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleClearFile = () => {
    Swal.fire({
      title: 'Hapus File VervalPD?',
      text: 'Data hasil matching akan direset. Anda dapat mengunggah file kembali kapan saja.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Ya, Reset',
      cancelButtonText: 'Batal'
    }).then(res => {
      if (res.isConfirmed) {
        setVervalData([]);
        setFileName('');
        try {
          sessionStorage.removeItem('vervalpd_file_cache');
        } catch {}
      }
    });
  };

  // 3. Reconciliation / Matching Engine
  const comparisonResults = useMemo<ComparisonRecord[]>(() => {
    if (!vervalData || vervalData.length === 0) {
      // If no VervalPD file uploaded, simply list all internal students
      return internalData.map((s, idx) => ({
        id: `int-${s.idSiswa || idx}`,
        status: 'HANYA_INTERNAL',
        kelas: s.kelas || '-',
        diffFields: [],
        internal: s
      }));
    }

    // Build Maps for fast internal lookup
    const internalByNisn = new Map<string, InternalStudent>();
    const internalByNik = new Map<string, InternalStudent>();
    const internalByName = new Map<string, InternalStudent>();

    internalData.forEach(s => {
      const cleanNisn = normalizeIdNumber(s.nisn);
      if (cleanNisn) internalByNisn.set(cleanNisn, s);

      const cleanNik = normalizeIdNumber(s.nik);
      if (cleanNik) internalByNik.set(cleanNik, s);

      const cleanNama = normalizeText(s.nama);
      if (cleanNama) internalByName.set(cleanNama, s);
    });

    const matchedInternalIds = new Set<string>();
    const results: ComparisonRecord[] = [];

    // Match each Verval row
    vervalData.forEach((v, vIdx) => {
      const cleanNisn = normalizeIdNumber(v.nisn);
      const cleanNik = normalizeIdNumber(v.nik);
      const cleanNama = normalizeText(v.nama);

      let matchedInternal: InternalStudent | undefined;

      // 1. Match by NISN
      if (cleanNisn && internalByNisn.has(cleanNisn)) {
        matchedInternal = internalByNisn.get(cleanNisn);
      }
      // 2. Fallback to NIK
      else if (cleanNik && internalByNik.has(cleanNik)) {
        matchedInternal = internalByNik.get(cleanNik);
      }
      // 3. Fallback to Nama
      else if (cleanNama && internalByName.has(cleanNama)) {
        matchedInternal = internalByName.get(cleanNama);
      }

      if (matchedInternal) {
        matchedInternalIds.add(matchedInternal.idSiswa);

        // Check each attribute
        const diffs: DiffField[] = [];

        // NISN
        if (cleanNisn && normalizeIdNumber(matchedInternal.nisn) && cleanNisn !== normalizeIdNumber(matchedInternal.nisn)) {
          diffs.push('nisn');
        }

        // NIK
        const intNik = normalizeIdNumber(matchedInternal.nik);
        if (cleanNik && intNik && cleanNik !== intNik) {
          diffs.push('nik');
        }

        // Nama
        if (cleanNama !== normalizeText(matchedInternal.nama)) {
          diffs.push('nama');
        }

        // Tempat Lahir
        if (normalizeText(v.tempatLahir) !== normalizeText(matchedInternal.tempatLahir)) {
          diffs.push('tempatLahir');
        }

        // Tanggal Lahir
        if (normalizeDate(v.tanggalLahir) !== normalizeDate(matchedInternal.tanggalLahir)) {
          diffs.push('tanggalLahir');
        }

        // Ibu Kandung
        if (normalizeText(v.ibuKandung) !== normalizeText(matchedInternal.ibuKandung)) {
          diffs.push('ibuKandung');
        }

        // Jenis Kelamin
        if (normalizeGender(v.jenisKelamin) !== normalizeGender(matchedInternal.jenisKelamin)) {
          diffs.push('jenisKelamin');
        }

        results.push({
          id: `match-${matchedInternal.idSiswa}-${vIdx}`,
          status: diffs.length === 0 ? 'COCOK_SEMPURNA' : 'BEDA_DATA',
          kelas: matchedInternal.kelas || '-',
          diffFields: diffs,
          internal: matchedInternal,
          verval: v
        });
      } else {
        // In VervalPD but not matched to any internal student
        results.push({
          id: `verval-only-${vIdx}`,
          status: 'HANYA_VERVALPD',
          kelas: '-',
          diffFields: [],
          verval: v
        });
      }
    });

    // Check internal students not found in VervalPD
    internalData.forEach((s, idx) => {
      if (!matchedInternalIds.has(s.idSiswa)) {
        results.push({
          id: `int-only-${s.idSiswa || idx}`,
          status: 'HANYA_INTERNAL',
          kelas: s.kelas || '-',
          diffFields: [],
          internal: s
        });
      }
    });

    return results;
  }, [internalData, vervalData]);

  // Statistics
  const stats = useMemo(() => {
    const totalInternal = internalData.length;
    const totalVerval = vervalData.length;
    const selisih = totalVerval - totalInternal;

    let cocokSempurna = 0;
    let bedaData = 0;
    let hanyaInternal = 0;
    let hanyaVerval = 0;

    comparisonResults.forEach(r => {
      if (r.status === 'COCOK_SEMPURNA') cocokSempurna++;
      else if (r.status === 'BEDA_DATA') bedaData++;
      else if (r.status === 'HANYA_INTERNAL') hanyaInternal++;
      else if (r.status === 'HANYA_VERVALPD') hanyaVerval++;
    });

    return {
      totalInternal,
      totalVerval,
      selisih,
      cocokSempurna,
      bedaData,
      hanyaInternal,
      hanyaVerval
    };
  }, [internalData.length, vervalData.length, comparisonResults]);

  // Available Classes
  const kelasList = useMemo(() => {
    return Array.from(new Set(internalData.map(s => s.kelas).filter(Boolean))).sort();
  }, [internalData]);

  // Filtered Comparison List
  const filteredRecords = useMemo(() => {
    return comparisonResults
      .filter(item => {
        // Tab Status Filter
        if (tabFilter === 'hanya_internal' && item.status !== 'HANYA_INTERNAL') return false;
        if (tabFilter === 'beda_data' && item.status !== 'BEDA_DATA') return false;
        if (tabFilter === 'cocok_sempurna' && item.status !== 'COCOK_SEMPURNA') return false;
        if (tabFilter === 'hanya_vervalpd' && item.status !== 'HANYA_VERVALPD') return false;

        // Kelas Filter
        if (filterKelas && item.kelas !== filterKelas) return false;

        // Specific Diff Field Filter
        if (filterDiffField && !item.diffFields.includes(filterDiffField as DiffField)) return false;

        // Search Term Filter
        if (searchTerm) {
          const q = searchTerm.toLowerCase();
          const matchInt =
            (item.internal?.nama || '').toLowerCase().includes(q) ||
            (item.internal?.nisn || '').includes(q) ||
            (item.internal?.nik || '').includes(q);
          const matchVerval =
            (item.verval?.nama || '').toLowerCase().includes(q) ||
            (item.verval?.nisn || '').includes(q) ||
            (item.verval?.nik || '').includes(q);
          if (!matchInt && !matchVerval) return false;
        }

        return true;
      })
      .sort((a, b) => {
        // Priority order in sorting:
        // 1. HANYA_INTERNAL first (most critical)
        // 2. BEDA_DATA second
        // 3. HANYA_VERVALPD third
        // 4. COCOK_SEMPURNA last
        const priority: Record<ReconciliationStatus, number> = {
          HANYA_INTERNAL: 1,
          BEDA_DATA: 2,
          HANYA_VERVALPD: 3,
          COCOK_SEMPURNA: 4
        };
        const pA = priority[a.status] || 99;
        const pB = priority[b.status] || 99;
        if (pA !== pB) return pA - pB;

        // Sort by class then name
        const kA = (a.kelas || '').trim();
        const kB = (b.kelas || '').trim();
        const c = kA.localeCompare(kB, 'id', { numeric: true });
        if (c !== 0) return c;

        const nameA = a.internal?.nama || a.verval?.nama || '';
        const nameB = b.internal?.nama || b.verval?.nama || '';
        return nameA.localeCompare(nameB, 'id');
      });
  }, [comparisonResults, tabFilter, filterKelas, filterDiffField, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    return filteredRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [filteredRecords, currentPage]);

  // 4. Download Template Excel
  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const headers = ['NISN', 'NIK', 'Nama', 'Tempat Lahir', 'Tanggal Lahir', 'Ibu Kandung', 'Jenis Kelamin'];
    const sampleData = [
      headers,
      ['0135593041', '3317057008130002', 'AKIFA NAJWA KHAIRA WILDA', 'REMBANG', '2013-08-30', 'SULASTRI', 'PEREMPUAN'],
      ['3148228961', '3507236607120002', 'NABILA HASNA AMIRA', 'SUMEDANG', '2014-10-26', 'DIANA LISAADAH', 'PEREMPUAN']
    ];
    const ws = XLSX.utils.aoa_to_sheet(sampleData);
    XLSX.utils.book_append_sheet(wb, ws, 'Data VervalPD');
    XLSX.writeFile(wb, 'Template_Import_VervalPD.xlsx');
  };

  // 5. Export Reconciliation Results to Excel
  const handleExportResults = () => {
    if (comparisonResults.length === 0) {
      Swal.fire('Tidak Ada Data', 'Belum ada data untuk diekspor', 'info');
      return;
    }

    const wb = XLSX.utils.book_new();

    // Summary Sheet
    const summaryRows = [
      ['LAPORAN REKONSILIASI & MATCHING DATA EMIS / VERVALPD'],
      ['Tanggal Cetak', new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })],
      ['Tahun Ajaran', selectedTA],
      [],
      ['PARAMETER', 'JUMLAH SISWA'],
      ['Total Siswa Database Internal', stats.totalInternal],
      ['Total Siswa File VervalPD', stats.totalVerval],
      ['Selisih Jumlah', stats.selisih],
      ['Cocok Sempurna (100% Sama)', stats.cocokSempurna],
      ['Ada Perbedaan Data (Perlu Koreksi)', stats.bedaData],
      ['Belum Terdaftar di VervalPD (Hanya di Internal)', stats.hanyaInternal],
      ['Hanya di VervalPD (Belum Ada di Internal)', stats.hanyaVerval]
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Rangkuman');

    // Discrepancy & Missing Sheet
    const detailHeaders = [
      'Status', 'Kelas',
      'NISN Internal', 'NISN Verval',
      'NIK Internal', 'NIK Verval',
      'Nama Internal', 'Nama Verval',
      'Tempat Lahir Internal', 'Tempat Lahir Verval',
      'Tgl Lahir Internal', 'Tgl Lahir Verval',
      'Ibu Kandung Internal', 'Ibu Kandung Verval',
      'Jenis Kelamin Internal', 'Jenis Kelamin Verval',
      'Kolom Berbeda'
    ];

    const detailRows = comparisonResults.map(r => {
      let statusLabel = 'Cocok Sempurna';
      if (r.status === 'HANYA_INTERNAL') statusLabel = 'Belum Ada di VervalPD';
      else if (r.status === 'BEDA_DATA') statusLabel = 'Ada Perbedaan Data';
      else if (r.status === 'HANYA_VERVALPD') statusLabel = 'Hanya di VervalPD';

      return [
        statusLabel,
        r.kelas,
        r.internal?.nisn || '', r.verval?.nisn || '',
        r.internal?.nik || '', r.verval?.nik || '',
        r.internal?.nama || '', r.verval?.nama || '',
        r.internal?.tempatLahir || '', r.verval?.tempatLahir || '',
        r.internal?.tanggalLahir || '', r.verval?.tanggalLahir || '',
        r.internal?.ibuKandung || '', r.verval?.ibuKandung || '',
        r.internal?.jenisKelamin || '', r.verval?.jenisKelamin || '',
        r.diffFields.join(', ')
      ];
    });

    const wsDetail = XLSX.utils.aoa_to_sheet([detailHeaders, ...detailRows]);
    XLSX.utils.book_append_sheet(wb, wsDetail, 'Detail Perbandingan');

    // Missing Sheet Specifically (High priority for user)
    const missingRows = comparisonResults
      .filter(r => r.status === 'HANYA_INTERNAL')
      .map(r => [
        r.kelas,
        r.internal?.nisn || '',
        r.internal?.nik || '',
        r.internal?.nama || '',
        r.internal?.tempatLahir || '',
        r.internal?.tanggalLahir || '',
        r.internal?.ibuKandung || '',
        r.internal?.jenisKelamin || ''
      ]);
    const wsMissing = XLSX.utils.aoa_to_sheet([
      ['Kelas', 'NISN', 'NIK', 'Nama Lengkap', 'Tempat Lahir', 'Tanggal Lahir', 'Ibu Kandung', 'Jenis Kelamin'],
      ...missingRows
    ]);
    XLSX.utils.book_append_sheet(wb, wsMissing, 'Belum Ada di VervalPD');

    XLSX.writeFile(wb, `Hasil_Rekonsiliasi_VervalPD_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>
            <i className="fas fa-clipboard-check"></i>
          </div>
          <div>
            <h1 className={styles.title}>Matching & Rekonsiliasi VervalPD</h1>
            <p className={styles.subtitle}>
              Pemeriksaan kesesuaian data siswa internal dengan ekspor VervalPD Kemendikbud/Kemenag
            </p>
          </div>
        </div>

        <div className={styles.headerActions}>
          <Link
            href="/emis"
            className={styles.btnTemplate}
            title="Buka menu Pendataan EMIS"
            style={{ textDecoration: 'none' }}
          >
            <i className="fas fa-database"></i> Buka EMIS
          </Link>
          <button
            type="button"
            className={styles.btnTemplate}
            onClick={handleDownloadTemplate}
            title="Unduh contoh format file Excel"
          >
            <i className="fas fa-download"></i> Unduh Template Excel
          </button>
          <button
            type="button"
            className={styles.btnExport}
            onClick={handleExportResults}
            disabled={comparisonResults.length === 0}
            title="Ekspor hasil rekonsiliasi ke Excel"
          >
            <i className="fas fa-file-excel"></i> Ekspor Hasil (.xlsx)
          </button>
        </div>
      </header>

      {/* Upload Dropzone / File Status Card */}
      <div className={styles.uploadCard}>
        {vervalData.length > 0 ? (
          <div className={styles.uploadedFileBar}>
            <div className={styles.uploadedFileInfo}>
              <div className={styles.fileIcon}>
                <i className="fas fa-file-excel"></i>
              </div>
              <div>
                <div className={styles.fileName}>{fileName}</div>
                <div className={styles.fileMeta}>
                  <i className="fas fa-check-circle"></i> Berhasil dimuat • <b>{vervalData.length} baris data siswa VervalPD</b>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="file"
                ref={fileInputRef}
                accept=".xlsx,.xls,.csv"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
                }}
              />
              <button
                type="button"
                className={styles.btnTemplate}
                onClick={() => fileInputRef.current?.click()}
                title="Ganti dengan file Excel lain"
              >
                <i className="fas fa-sync-alt"></i> Ganti File
              </button>
              <button
                type="button"
                className={styles.btnResetFile}
                onClick={handleClearFile}
                title="Hapus file dan reset"
              >
                <i className="fas fa-trash-alt"></i> Hapus
              </button>
            </div>
          </div>
        ) : (
          <div>
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx,.xls,.csv"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
              }}
            />
            <div
              className={`${styles.dropzone} ${isDragging ? styles.dropzoneActive : ''}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]);
              }}
            >
              <i className={`fas fa-cloud-upload-alt ${styles.dropzoneIcon}`}></i>
              <div className={styles.dropzoneTitle}>Klik atau Seret File Excel VervalPD ke Sini</div>
              <div className={styles.dropzoneSubtitle}>
                Mendukung file <b>.xlsx, .xls, .csv</b> dengan kolom: <i>NISN, NIK, Nama, Tempat Lahir, Tanggal Lahir, Ibu Kandung, Jenis Kelamin</i>.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <div
          className={styles.statCard}
          onClick={() => { setTabFilter('all'); setCurrentPage(1); }}
          title="Total siswa aktif di Database Internal"
        >
          <div className={styles.statIcon} style={{ background: '#eff6ff', color: '#2563eb' }}>
            <i className="fas fa-database"></i>
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Internal</span>
            <span className={styles.statValue} style={{ color: '#2563eb' }}>{stats.totalInternal}</span>
            <span className={styles.statSub}>Siswa Aktif</span>
          </div>
        </div>

        <div
          className={styles.statCard}
          onClick={() => { setTabFilter('all'); setCurrentPage(1); }}
          title="Total baris data dari file VervalPD"
        >
          <div className={styles.statIcon} style={{ background: '#f0fdfa', color: '#0d9488' }}>
            <i className="fas fa-cloud"></i>
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>VervalPD</span>
            <span className={styles.statValue} style={{ color: '#0d9488' }}>{stats.totalVerval}</span>
            <span className={styles.statSub}>File Excel</span>
          </div>
        </div>

        <div
          className={styles.statCard}
          title={stats.selisih === 0 ? 'Jumlah siswa persis sama' : `Terdapat selisih ${Math.abs(stats.selisih)} siswa antara Internal & VervalPD`}
          style={{ borderColor: stats.selisih !== 0 ? '#fca5a5' : undefined }}
        >
          <div
            className={styles.statIcon}
            style={{
              background: stats.selisih === 0 ? '#f0fdf4' : '#fef2f2',
              color: stats.selisih === 0 ? '#16a34a' : '#dc2626'
            }}
          >
            <i className="fas fa-balance-scale"></i>
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Selisih</span>
            <span
              className={styles.statValue}
              style={{ color: stats.selisih === 0 ? '#16a34a' : '#dc2626' }}
            >
              {stats.selisih > 0 ? `+${stats.selisih}` : stats.selisih}
            </span>
            <span className={styles.statSub}>
              {stats.selisih === 0
                ? 'Sama Persis'
                : stats.selisih < 0
                ? `Internal > Verval (${Math.abs(stats.selisih)})`
                : `Verval > Internal (${stats.selisih})`}
            </span>
          </div>
        </div>

        <div
          className={styles.statCard}
          onClick={() => { setTabFilter('cocok_sempurna'); setCurrentPage(1); }}
          style={{ borderColor: tabFilter === 'cocok_sempurna' ? '#16a34a' : undefined }}
          title="Siswa dengan seluruh data identitas cocok 100%"
        >
          <div className={styles.statIcon} style={{ background: '#ecfdf5', color: '#16a34a' }}>
            <i className="fas fa-check-double"></i>
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Cocok Sempurna</span>
            <span className={styles.statValue} style={{ color: '#16a34a' }}>{stats.cocokSempurna}</span>
            <span className={styles.statSub}>
              {stats.totalInternal > 0 ? Math.round((stats.cocokSempurna / stats.totalInternal) * 100) : 0}%
            </span>
          </div>
        </div>

        <div
          className={styles.statCard}
          onClick={() => { setTabFilter('beda_data'); setCurrentPage(1); }}
          style={{ borderColor: tabFilter === 'beda_data' ? '#d97706' : undefined }}
          title="Siswa ditemukan di kedua data tapi ada atribut yang berbeda"
        >
          <div className={styles.statIcon} style={{ background: '#fffbeb', color: '#d97706' }}>
            <i className="fas fa-exclamation-triangle"></i>
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Ada Perbedaan</span>
            <span className={styles.statValue} style={{ color: '#d97706' }}>{stats.bedaData}</span>
            <span className={styles.statSub}>
              {stats.totalInternal > 0 ? Math.round((stats.bedaData / stats.totalInternal) * 100) : 0}%
            </span>
          </div>
        </div>

        <div
          className={styles.statCard}
          onClick={() => { setTabFilter('hanya_internal'); setCurrentPage(1); }}
          style={{
            borderColor: tabFilter === 'hanya_internal' ? '#e11d48' : stats.hanyaInternal > 0 ? '#fca5a5' : undefined,
            background: stats.hanyaInternal > 0 ? '#fff1f2' : 'white'
          }}
          title="Siswa ada di database internal tapi BELUM ada di VervalPD"
        >
          <div className={styles.statIcon} style={{ background: '#ffe4e6', color: '#e11d48' }}>
            <i className="fas fa-user-times"></i>
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Belum di Verval</span>
            <span className={styles.statValue} style={{ color: '#e11d48' }}>{stats.hanyaInternal}</span>
            <span className={styles.statSub}>Hanya Internal</span>
          </div>
        </div>

        <div
          className={styles.statCard}
          onClick={() => { setTabFilter('hanya_vervalpd'); setCurrentPage(1); }}
          style={{ borderColor: tabFilter === 'hanya_vervalpd' ? '#7c3aed' : undefined }}
          title="Siswa ada di file VervalPD tapi tidak terdaftar di database internal"
        >
          <div className={styles.statIcon} style={{ background: '#f5f3ff', color: '#7c3aed' }}>
            <i className="fas fa-user-plus"></i>
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Hanya di Verval</span>
            <span className={styles.statValue} style={{ color: '#7c3aed' }}>{stats.hanyaVerval}</span>
            <span className={styles.statSub}>Data Luar</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className={styles.filterBar}>
        {/* Tab Pills */}
        <div className={styles.tabPills}>
          <button
            type="button"
            className={`${styles.tabPill} ${tabFilter === 'all' ? styles.tabPillActive : ''}`}
            onClick={() => { setTabFilter('all'); setCurrentPage(1); }}
          >
            <span>Semua Data</span>
            <span className={styles.tabCount}>{comparisonResults.length}</span>
          </button>

          <button
            type="button"
            className={`${styles.tabPill} ${tabFilter === 'hanya_internal' ? styles.tabPillActive : ''}`}
            onClick={() => { setTabFilter('hanya_internal'); setCurrentPage(1); }}
            style={tabFilter !== 'hanya_internal' && stats.hanyaInternal > 0 ? { color: '#e11d48', borderColor: '#fca5a5', background: '#fff1f2' } : {}}
          >
            <i className="fas fa-user-times"></i>
            <span>Belum Ada di VervalPD</span>
            <span className={styles.tabCount}>{stats.hanyaInternal}</span>
          </button>

          <button
            type="button"
            className={`${styles.tabPill} ${tabFilter === 'beda_data' ? styles.tabPillActive : ''}`}
            onClick={() => { setTabFilter('beda_data'); setCurrentPage(1); }}
            style={tabFilter !== 'beda_data' && stats.bedaData > 0 ? { color: '#d97706', borderColor: '#fde68a', background: '#fffbeb' } : {}}
          >
            <i className="fas fa-exclamation-triangle"></i>
            <span>Ada Perbedaan Data</span>
            <span className={styles.tabCount}>{stats.bedaData}</span>
          </button>

          <button
            type="button"
            className={`${styles.tabPill} ${tabFilter === 'cocok_sempurna' ? styles.tabPillActive : ''}`}
            onClick={() => { setTabFilter('cocok_sempurna'); setCurrentPage(1); }}
          >
            <i className="fas fa-check-double"></i>
            <span>Cocok Sempurna</span>
            <span className={styles.tabCount}>{stats.cocokSempurna}</span>
          </button>

          <button
            type="button"
            className={`${styles.tabPill} ${tabFilter === 'hanya_vervalpd' ? styles.tabPillActive : ''}`}
            onClick={() => { setTabFilter('hanya_vervalpd'); setCurrentPage(1); }}
          >
            <i className="fas fa-user-plus"></i>
            <span>Hanya di VervalPD</span>
            <span className={styles.tabCount}>{stats.hanyaVerval}</span>
          </button>
        </div>

        {/* Search */}
        <div className={styles.filterGroup}>
          <i className="fas fa-search" style={{ color: '#94a3b8' }}></i>
          <input
            type="text"
            placeholder="Cari nama siswa / NISN / NIK..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className={styles.searchInput}
          />
        </div>

        {/* Tahun Ajaran */}
        <select
          value={selectedTA}
          onChange={(e) => {
            setSelectedTA(e.target.value);
            fetchInternal(e.target.value);
            setCurrentPage(1);
          }}
          className={styles.filterSelect}
          title="Tahun Ajaran"
        >
          {tahunAjaranList.map(ta => (
            <option key={ta} value={ta}>{ta}</option>
          ))}
        </select>

        {/* Kelas */}
        <select
          value={filterKelas}
          onChange={(e) => { setFilterKelas(e.target.value); setCurrentPage(1); }}
          className={styles.filterSelect}
        >
          <option value="">Semua Kelas</option>
          {kelasList.map(k => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>

        {/* Filter Kolom Beda (Hanya aktif jika tab beda_data atau all) */}
        <select
          value={filterDiffField}
          onChange={(e) => { setFilterDiffField(e.target.value); setCurrentPage(1); }}
          className={styles.filterSelect}
        >
          <option value="">Perbedaan: Semua Kolom</option>
          <option value="nik">Beda NIK</option>
          <option value="nama">Beda Nama</option>
          <option value="tempatLahir">Beda Tempat Lahir</option>
          <option value="tanggalLahir">Beda Tanggal Lahir</option>
          <option value="ibuKandung">Beda Ibu Kandung</option>
          <option value="jenisKelamin">Beda Jenis Kelamin</option>
          <option value="nisn">Beda NISN</option>
        </select>

        {/* Refresh button */}
        <button
          type="button"
          className={styles.refreshBtn}
          onClick={() => fetchInternal(selectedTA)}
          title="Refresh Data Internal"
        >
          <i className="fas fa-sync-alt"></i>
        </button>
      </div>

      {/* Table Card */}
      <div className={styles.card}>
        {loadingInternal ? (
          <InlineLoading message="Memuat dan mencocokkan data..." />
        ) : filteredRecords.length === 0 ? (
          <div className={styles.emptyState}>
            <i className="fas fa-inbox" style={{ fontSize: '3rem', color: '#cbd5e1' }}></i>
            <h3 style={{ margin: 0, color: '#1e293b' }}>Tidak Ada Data</h3>
            <p style={{ margin: 0 }}>
              {vervalData.length === 0
                ? 'Silakan unggah file Excel VervalPD untuk memulai rekonsiliasi data.'
                : 'Tidak ada data siswa yang cocok dengan filter yang Anda terapkan.'}
            </p>
          </div>
        ) : (
          <>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>No</th>
                    <th style={{ width: '60px' }}>Kelas</th>
                    <th style={{ width: '150px' }}>Status</th>
                    <th style={{ minWidth: '180px' }}>Nama Siswa</th>
                    <th style={{ minWidth: '120px' }}>NISN</th>
                    <th style={{ minWidth: '150px' }}>NIK</th>
                    <th style={{ minWidth: '160px' }}>Tempat Lahir</th>
                    <th style={{ minWidth: '120px' }}>Tgl Lahir</th>
                    <th style={{ minWidth: '160px' }}>Ibu Kandung</th>
                    <th style={{ width: '60px', textAlign: 'center' }}>JK</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRecords.map((item, idx) => {
                    const rowNum = (currentPage - 1) * pageSize + idx + 1;
                    const isDiff = item.status === 'BEDA_DATA';
                    const isMissingInVerval = item.status === 'HANYA_INTERNAL';
                    const isOnlyInVerval = item.status === 'HANYA_VERVALPD';

                    return (
                      <tr
                        key={item.id}
                        style={{
                          backgroundColor:
                            isMissingInVerval
                              ? '#fff1f2'
                              : isDiff
                              ? '#fffbeb'
                              : undefined
                        }}
                      >
                        <td style={{ textAlign: 'center', color: '#64748b' }}>{rowNum}</td>
                        <td style={{ fontWeight: 700, color: '#065f46' }}>{item.kelas}</td>
                        <td>
                          {item.status === 'COCOK_SEMPURNA' && (
                            <span className={`${styles.badge} ${styles.badgeMatch}`}>
                              <i className="fas fa-check-circle"></i> Cocok
                            </span>
                          )}
                          {item.status === 'BEDA_DATA' && (
                            <span className={`${styles.badge} ${styles.badgeDiff}`} title={item.diffFields.join(', ')}>
                              <i className="fas fa-exclamation-triangle"></i> Beda ({item.diffFields.length})
                            </span>
                          )}
                          {item.status === 'HANYA_INTERNAL' && (
                            <span className={`${styles.badge} ${styles.badgeMissingInVerval}`}>
                              <i className="fas fa-times-circle"></i> Belum di Verval
                            </span>
                          )}
                          {item.status === 'HANYA_VERVALPD' && (
                            <span className={`${styles.badge} ${styles.badgeOnlyInVerval}`}>
                              <i className="fas fa-info-circle"></i> Hanya Verval
                            </span>
                          )}
                        </td>

                        {/* Nama */}
                        <td>
                          {isDiff && item.diffFields.includes('nama') ? (
                            <div className={styles.compCell}>
                              <span className={styles.valInternal}>
                                <span className={`${styles.valTag} ${styles.tagInternal}`}>Int</span> {item.internal?.nama}
                              </span>
                              <span className={`${styles.valVerval} ${styles.valDiff}`}>
                                <span className={`${styles.valTag} ${styles.tagVerval}`}>Vpd</span> {item.verval?.nama}
                              </span>
                            </div>
                          ) : (
                            <span style={{ fontWeight: 600 }}>
                              {item.internal?.nama || item.verval?.nama}
                            </span>
                          )}
                        </td>

                        {/* NISN */}
                        <td>
                          {isDiff && item.diffFields.includes('nisn') ? (
                            <div className={styles.compCell}>
                              <span className={styles.valInternal}>
                                <span className={`${styles.valTag} ${styles.tagInternal}`}>Int</span> {item.internal?.nisn || '-'}
                              </span>
                              <span className={`${styles.valVerval} ${styles.valDiff}`}>
                                <span className={`${styles.valTag} ${styles.tagVerval}`}>Vpd</span> {item.verval?.nisn || '-'}
                              </span>
                            </div>
                          ) : (
                            <span style={{ fontFamily: 'monospace' }}>
                              {item.internal?.nisn || item.verval?.nisn || '-'}
                            </span>
                          )}
                        </td>

                        {/* NIK */}
                        <td>
                          {isDiff && item.diffFields.includes('nik') ? (
                            <div className={styles.compCell}>
                              <span className={styles.valInternal}>
                                <span className={`${styles.valTag} ${styles.tagInternal}`}>Int</span> {item.internal?.nik || '-'}
                              </span>
                              <span className={`${styles.valVerval} ${styles.valDiff}`}>
                                <span className={`${styles.valTag} ${styles.tagVerval}`}>Vpd</span> {item.verval?.nik || '-'}
                              </span>
                            </div>
                          ) : (
                            <span style={{ fontFamily: 'monospace' }}>
                              {item.internal?.nik || item.verval?.nik || '-'}
                            </span>
                          )}
                        </td>

                        {/* Tempat Lahir */}
                        <td>
                          {isDiff && item.diffFields.includes('tempatLahir') ? (
                            <div className={styles.compCell}>
                              <span className={styles.valInternal}>
                                <span className={`${styles.valTag} ${styles.tagInternal}`}>Int</span> {item.internal?.tempatLahir || '-'}
                              </span>
                              <span className={`${styles.valVerval} ${styles.valDiff}`}>
                                <span className={`${styles.valTag} ${styles.tagVerval}`}>Vpd</span> {item.verval?.tempatLahir || '-'}
                              </span>
                            </div>
                          ) : (
                            <span>{item.internal?.tempatLahir || item.verval?.tempatLahir || '-'}</span>
                          )}
                        </td>

                        {/* Tanggal Lahir */}
                        <td>
                          {isDiff && item.diffFields.includes('tanggalLahir') ? (
                            <div className={styles.compCell}>
                              <span className={styles.valInternal}>
                                <span className={`${styles.valTag} ${styles.tagInternal}`}>Int</span> {item.internal?.tanggalLahir || '-'}
                              </span>
                              <span className={`${styles.valVerval} ${styles.valDiff}`}>
                                <span className={`${styles.valTag} ${styles.tagVerval}`}>Vpd</span> {item.verval?.tanggalLahir || '-'}
                              </span>
                            </div>
                          ) : (
                            <span>{item.internal?.tanggalLahir || item.verval?.tanggalLahir || '-'}</span>
                          )}
                        </td>

                        {/* Ibu Kandung */}
                        <td>
                          {isDiff && item.diffFields.includes('ibuKandung') ? (
                            <div className={styles.compCell}>
                              <span className={styles.valInternal}>
                                <span className={`${styles.valTag} ${styles.tagInternal}`}>Int</span> {item.internal?.ibuKandung || '-'}
                              </span>
                              <span className={`${styles.valVerval} ${styles.valDiff}`}>
                                <span className={`${styles.valTag} ${styles.tagVerval}`}>Vpd</span> {item.verval?.ibuKandung || '-'}
                              </span>
                            </div>
                          ) : (
                            <span>{item.internal?.ibuKandung || item.verval?.ibuKandung || '-'}</span>
                          )}
                        </td>

                        {/* Jenis Kelamin */}
                        <td style={{ textAlign: 'center' }}>
                          {isDiff && item.diffFields.includes('jenisKelamin') ? (
                            <div className={styles.compCell} style={{ alignItems: 'center' }}>
                              <span className={styles.valInternal}>{item.internal?.jenisKelamin || '-'}</span>
                              <span className={`${styles.valVerval} ${styles.valDiff}`}>{item.verval?.jenisKelamin || '-'}</span>
                            </div>
                          ) : (
                            <span style={{ fontWeight: 700, color: (item.internal?.jenisKelamin || item.verval?.jenisKelamin) === 'P' ? '#ec4899' : '#2563eb' }}>
                              {normalizeGender(item.internal?.jenisKelamin || item.verval?.jenisKelamin)}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table Footer with Pagination */}
            <div className={styles.tableFooter}>
              <div>
                Menampilkan <b>{filteredRecords.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</b> - <b>{Math.min(currentPage * pageSize, filteredRecords.length)}</b> dari <b>{filteredRecords.length}</b> siswa
                {filteredRecords.length !== comparisonResults.length && ` (Total ${comparisonResults.length} hasil)`}
              </div>

              {totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(1)}
                    style={{
                      background: currentPage === 1 ? '#f1f5f9' : 'white',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontSize: '12px',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      color: currentPage === 1 ? '#94a3b8' : '#334155'
                    }}
                    title="Halaman Pertama"
                  >
                    <i className="fas fa-angle-double-left"></i>
                  </button>
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    style={{
                      background: currentPage === 1 ? '#f1f5f9' : 'white',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      color: currentPage === 1 ? '#94a3b8' : '#334155'
                    }}
                    title="Sebelumnya"
                  >
                    <i className="fas fa-chevron-left"></i> Prev
                  </button>

                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', padding: '0 6px' }}>
                    {currentPage} / {totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    style={{
                      background: currentPage >= totalPages ? '#f1f5f9' : 'white',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                      color: currentPage >= totalPages ? '#94a3b8' : '#334155'
                    }}
                    title="Berikutnya"
                  >
                    Next <i className="fas fa-chevron-right"></i>
                  </button>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                    style={{
                      background: currentPage >= totalPages ? '#f1f5f9' : 'white',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontSize: '12px',
                      cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                      color: currentPage >= totalPages ? '#94a3b8' : '#334155'
                    }}
                    title="Halaman Terakhir"
                  >
                    <i className="fas fa-angle-double-right"></i>
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
