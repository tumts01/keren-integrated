'use client';

import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import styles from './sts.module.css';

interface Siswa {
  id: string;
  nisn: string;
  nama: string;
  jenisKelamin: string;
  rombel: string;
}

export default function StsPage() {
  const [activeTab, setActiveTab] = useState<'input' | 'cetak'>('input');
  
  // Filters
  const [tahunAjaran, setTahunAjaran] = useState('2026/2027');
  const [semester, setSemester] = useState('Ganjil');
  const [kelas, setKelas] = useState('');
  const [mapel, setMapel] = useState('');
  
  // Data
  const [siswaList, setSiswaList] = useState<Siswa[]>([]);
  const [allKelas, setAllKelas] = useState<string[]>([]);
  const [allMapel, setAllMapel] = useState<string[]>([]);
  
  // Upload Data
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDataAwal();
  }, []);

  const fetchDataAwal = async () => {
    try {
      // Ambil data siswa (untuk daftar kelas & template)
      const resSiswa = await fetch('/api/siswa');
      const jsonSiswa = await resSiswa.json();
      if (jsonSiswa.success && jsonSiswa.data) {
        const data = jsonSiswa.data;
        setSiswaList(data);
        
        const kelasUnik = Array.from(new Set(data.map((s: any) => s.rombel))).filter(Boolean).sort() as string[];
        setAllKelas(kelasUnik);
        if (kelasUnik.length > 0) setKelas(kelasUnik[0]);
      }

      // Ambil mata pelajaran
      const resMapel = await fetch('/api/jadwal/mapel');
      const jsonMapel = await resMapel.json();
      if (jsonMapel.success && jsonMapel.data) {
        const mapels = jsonMapel.data.map((m: any) => m.nama_mapel).sort();
        setAllMapel(mapels);
        if (mapels.length > 0) setMapel(mapels[0]);
      }
    } catch (err) {
      console.error('Gagal memuat data awal', err);
    }
  };

  const handleDownloadTemplate = () => {
    if (!kelas || !mapel) {
      Swal.fire('Oops', 'Pilih kelas dan mata pelajaran terlebih dahulu', 'warning');
      return;
    }

    const siswaKelas = siswaList
      .filter(s => s.rombel === kelas)
      .sort((a, b) => a.nama.localeCompare(b.nama));

    if (siswaKelas.length === 0) {
      Swal.fire('Kosong', 'Tidak ada siswa di kelas ini', 'info');
      return;
    }

    // Struktur Template: 
    // Header Row 1: Informasi Mapel/Kelas (Bisa diabaikan oleh parser nanti, kita pakai Header Row 2)
    const headerRow = [
      'NO', 'NISN', 'NAMA SISWA', 'L/P', 
      'MATERI 1 S1', 'MATERI 1 S2', 'MATERI 1 S3',
      'MATERI 2 S1', 'MATERI 2 S2', 'MATERI 2 S3',
      'MATERI 3 S1', 'MATERI 3 S2', 'MATERI 3 S3',
      'MATERI 4 S1', 'MATERI 4 S2', 'MATERI 4 S3',
      'MATERI 5 S1', 'MATERI 5 S2', 'MATERI 5 S3',
      'MATERI 6 S1', 'MATERI 6 S2', 'MATERI 6 S3',
      'STS', 'SAS', 'NILAI AKHIR'
    ];

    const dataRows = siswaKelas.map((s, i) => [
      i + 1,
      s.nisn,
      s.nama.toUpperCase(),
      s.jenisKelamin === 'Laki-laki' ? 'L' : (s.jenisKelamin === 'Perempuan' ? 'P' : '-'),
      ...Array(21).fill('') // Kolom nilai kosong
    ]);

    const wsData = [headerRow, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Styling lebar kolom
    ws['!cols'] = [
      { wch: 5 }, { wch: 15 }, { wch: 35 }, { wch: 5 },
      ...Array(21).fill({ wch: 12 })
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Input Nilai STS');
    XLSX.writeFile(wb, `Template_Nilai_STS_${kelas}_${mapel.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        // Baca sebagai array of arrays
        const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
        
        if (rawData.length < 2) {
          throw new Error("Format file tidak valid (terlalu sedikit baris).");
        }

        // Asumsi baris 1 adalah header (index 0)
        const headerArr = rawData[0] || [];
        setHeaders(headerArr.map(String));

        const parsedData = [];
        for (let i = 1; i < rawData.length; i++) {
          const row = rawData[i];
          if (!row || row.length === 0 || !row[1]) continue; // Lewati jika kosong atau tidak ada NISN

          const obj: any = {};
          headerArr.forEach((col: string, colIdx: number) => {
            obj[col] = row[colIdx] ?? '';
          });
          parsedData.push(obj);
        }

        setPreviewData(parsedData);
      } catch (err: any) {
        Swal.fire('Error', 'Gagal membaca file Excel: ' + err.message, 'error');
      }
      
      // Reset input file
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const handleSimpan = async () => {
    if (previewData.length === 0) return;
    if (!kelas || !mapel) {
      Swal.fire('Oops', 'Pilih kelas dan mapel dulu', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        tahunAjaran,
        semester,
        kelas,
        mataPelajaran: mapel,
        dataNilai: previewData
      };

      const res = await fetch('/api/nilai-sts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json();

      if (result.success) {
        Swal.fire('Sukses!', 'Data nilai berhasil disimpan ke database.', 'success');
        setPreviewData([]); // Reset preview
      } else {
        throw new Error(result.error || 'Gagal menyimpan');
      }
    } catch (err: any) {
      Swal.fire('Error', err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Perangkat Ujian STS</h1>
        <p>Manajemen Nilai dan Cetak Rapor Sumatif Tengah Semester</p>
      </div>

      <div className={styles.tabs}>
        <button 
          className={`${styles.tab} ${activeTab === 'input' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('input')}
        >
          <i className="fas fa-upload" style={{marginRight: '8px'}}></i> Input Nilai (Excel)
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'cetak' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('cetak')}
        >
          <i className="fas fa-print" style={{marginRight: '8px'}}></i> Cetak Rapor
        </button>
      </div>

      {activeTab === 'input' && (
        <div className={styles.card}>
          <div className={styles.alert}>
            <i className="fas fa-info-circle fa-lg"></i>
            <div>
              <strong>Langkah Input Nilai:</strong><br/>
              1. Filter Kelas dan Mata Pelajaran di bawah ini.<br/>
              2. Klik <b>Download Template Excel</b> (Otomatis berisi daftar siswa di kelas tersebut).<br/>
              3. Isi nilai siswa secara offline di Excel.<br/>
              4. Klik <b>Upload File Excel</b> yang sudah diisi.<br/>
              5. Cek preview tabel di bawah, lalu klik <b>Simpan ke Database</b>.
            </div>
          </div>

          <div className={styles.filterGrid}>
            <div className={styles.filterGroup}>
              <label>Tahun Ajaran</label>
              <select className={styles.select} value={tahunAjaran} onChange={e => setTahunAjaran(e.target.value)}>
                <option value="2026/2027">2026/2027</option>
                <option value="2025/2026">2025/2026</option>
              </select>
            </div>
            <div className={styles.filterGroup}>
              <label>Semester</label>
              <select className={styles.select} value={semester} onChange={e => setSemester(e.target.value)}>
                <option value="Ganjil">Ganjil</option>
                <option value="Genap">Genap</option>
              </select>
            </div>
            <div className={styles.filterGroup}>
              <label>Kelas</label>
              <select className={styles.select} value={kelas} onChange={e => setKelas(e.target.value)}>
                {allKelas.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div className={styles.filterGroup}>
              <label>Mata Pelajaran</label>
              <select className={styles.select} value={mapel} onChange={e => setMapel(e.target.value)}>
                {allMapel.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div className={styles.actionRow}>
            <button className={styles.btnSecondary} onClick={handleDownloadTemplate}>
              <i className="fas fa-file-excel"></i> Download Template Excel
            </button>
            
            <div className={styles.fileInputWrapper}>
              <button className={styles.btnOutline}>
                <i className="fas fa-upload"></i> Upload File Excel
              </button>
              <input 
                type="file" 
                className={styles.fileInput} 
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
                ref={fileInputRef}
              />
            </div>
          </div>

          {previewData.length > 0 && (
            <div style={{ marginTop: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Preview Data ({previewData.length} baris)</h3>
                <button 
                  className={styles.btnPrimary} 
                  onClick={handleSimpan}
                  disabled={isSaving}
                >
                  <i className={isSaving ? 'fas fa-spinner fa-spin' : 'fas fa-save'}></i> 
                  {isSaving ? 'Menyimpan...' : 'Simpan ke Database'}
                </button>
              </div>
              
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      {headers.map((h, i) => <th key={i}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, i) => (
                      <tr key={i}>
                        {headers.map((h, j) => (
                          <td key={j}>{row[h]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'cetak' && (
        <div className={styles.card}>
          <h3>Mode Cetak Rapor STS</h3>
          <p style={{marginTop: '8px', color: '#64748b'}}>
            Fitur cetak rapor sedang dalam pengembangan layout HTML/PDF yang meniru persis template cetak rapor Spreadsheet Bapak/Ibu.
          </p>
        </div>
      )}
    </div>
  );
}
