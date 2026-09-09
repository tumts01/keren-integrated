'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import styles from './sts.module.css';

interface Siswa {
  id: string;
  nisn: string;
  nama: string;
  jenisKelamin: string;
  rombel: string;
  tahunAjaran: string;
  status: string;
}

export default function StsPage() {
  const [activeTab, setActiveTab] = useState<'input' | 'cetak' | 'review'>('input');
  
  // Filters
  const [tahunAjaran, setTahunAjaran] = useState('2026/2027');
  const [semester, setSemester] = useState('Ganjil');
  const [kelas, setKelas] = useState('');
  const [mapel, setMapel] = useState('');
  
  // Data
  const [siswaList, setSiswaList] = useState<Siswa[]>([]);
  const [allMapel, setAllMapel] = useState<string[]>([]);
  
  // Upload Data
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cetak Rapor Data
  const [gradesData, setGradesData] = useState<any[]>([]);
  const [isFetchingGrades, setIsFetchingGrades] = useState(false);

  // Review Data
  const [reviewData, setReviewData] = useState<any[]>([]);
  const [isFetchingReview, setIsFetchingReview] = useState(false);
  const [viewingGrade, setViewingGrade] = useState<any>(null);
  const [editingGradeId, setEditingGradeId] = useState<string | null>(null);
  const [editedNilaiData, setEditedNilaiData] = useState<any[]>([]);

  const kelasOptions = useMemo(() =>
    Array.from(new Set(siswaList.filter(s => s.tahunAjaran === tahunAjaran && s.status?.toLowerCase().includes('aktif')).map(s => s.rombel))).filter(Boolean).sort() as string[]
  , [siswaList, tahunAjaran]);
  const siswaKelasSelected = siswaList.filter(s => s.rombel === kelas && s.tahunAjaran === tahunAjaran && s.status?.toLowerCase().includes('aktif')).sort((a, b) => a.nama.localeCompare(b.nama));

  useEffect(() => {
    fetchDataAwal();
  }, []);

  useEffect(() => {
    if (activeTab === 'cetak' && kelas) {
      fetchGrades();
    }
    if (activeTab === 'review' && kelas) {
      fetchReviewData();
    }
  }, [activeTab, tahunAjaran, semester, kelas]);

  const fetchReviewData = async () => {
    setIsFetchingReview(true);
    try {
      const res = await fetch(`/api/nilai-sts?tahunAjaran=${encodeURIComponent(tahunAjaran)}&semester=${encodeURIComponent(semester)}&kelas=${encodeURIComponent(kelas)}`);
      const json = await res.json();
      if (json.success) setReviewData(json.data || []);
      else Swal.fire('Gagal', json.error || 'Gagal memuat data', 'error');
    } catch (e) {
      Swal.fire('Error', 'Kesalahan jaringan', 'error');
    }
    setIsFetchingReview(false);
  };

  const handleDeleteGrade = async (id: string, mapelNama: string) => {
    const confirm = await Swal.fire({
      title: 'Hapus Nilai?',
      text: `Anda yakin ingin menghapus data nilai mata pelajaran ${mapelNama}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    });
    
    if (confirm.isConfirmed) {
      try {
        const res = await fetch(`/api/nilai-sts?id=${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
          Swal.fire('Terhapus', 'Data nilai berhasil dihapus.', 'success');
          fetchReviewData();
        } else {
          Swal.fire('Gagal', json.error || 'Gagal menghapus', 'error');
        }
      } catch(e) {
        Swal.fire('Error', 'Kesalahan jaringan', 'error');
      }
    }
  };
  const handleSaveEdit = async () => {
    setIsSaving(true);
    try {
      const payload = {
        tahunAjaran: viewingGrade.tahun_ajaran,
        semester: viewingGrade.semester,
        kelas: viewingGrade.kelas,
        mataPelajaran: viewingGrade.mata_pelajaran,
        dataNilai: editedNilaiData
      };
      const res = await fetch('/api/nilai-sts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (result.success) {
        Swal.fire('Sukses', 'Data nilai berhasil diperbarui', 'success');
        setViewingGrade(null);
        setEditingGradeId(null);
        fetchReviewData();
      } else throw new Error(result.error);
    } catch (e: any) {
      Swal.fire('Error', e.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };


  const fetchDataAwal = async () => {
    try {
      // Ambil data siswa
      const resSiswa = await fetch('/api/siswa');
      const jsonSiswa = await resSiswa.json();
      if (jsonSiswa.success && jsonSiswa.data) {
        const data = jsonSiswa.data;
        setSiswaList(data);
        
              }

      // Ambil mata pelajaran
      const resMapel = await fetch('/api/jadwal/mapel');
      const jsonMapel = await resMapel.json();
      if (jsonMapel.success && jsonMapel.data) {
        const mapels = jsonMapel.data.map((m: any) => m.namaMapel).filter(Boolean).sort();
        setAllMapel(mapels);
        if (mapels.length > 0) setMapel(mapels[0]);
      }
    } catch (err) {
      console.error('Gagal memuat data awal', err);
    }
  };

  const fetchGrades = async () => {
    setIsFetchingGrades(true);
    try {
      const res = await fetch(`/api/nilai-sts?tahunAjaran=${encodeURIComponent(tahunAjaran)}&semester=${encodeURIComponent(semester)}&kelas=${encodeURIComponent(kelas)}`);
      const json = await res.json();
      if (json.success) {
        setGradesData(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsFetchingGrades(false);
    }
  };

  useEffect(() => {
    if (kelasOptions.length > 0 && !kelasOptions.includes(kelas)) {
      setKelas(kelasOptions[0]);
    }
  }, [kelasOptions, kelas]);

  const handleDownloadTemplate = () => {
    if (!kelas || !mapel) {
      Swal.fire('Oops', 'Pilih kelas dan mata pelajaran terlebih dahulu', 'warning');
      return;
    }

    const siswaKelas = siswaList
      .filter(s => s.rombel === kelas && s.tahunAjaran === tahunAjaran && s.status?.toLowerCase().includes('aktif'))
      .sort((a, b) => a.nama.localeCompare(b.nama));

    if (siswaKelas.length === 0) {
      Swal.fire('Kosong', 'Tidak ada siswa di kelas ini', 'info');
      return;
    }

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
      (s.jenisKelamin || '').toLowerCase().includes('laki') || (s.jenisKelamin || '').toLowerCase() === 'l' ? 'L' : ((s.jenisKelamin || '').toLowerCase().includes('perempuan') || (s.jenisKelamin || '').toLowerCase() === 'p' ? 'P' : '-'),
      ...Array(21).fill('')
    ]);

    const wsData = [headerRow, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

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
        
        const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
        if (rawData.length < 2) throw new Error("Format file tidak valid.");

        const headerArr = rawData[0] || [];
        setHeaders(headerArr.map(String));

        const parsedData = [];
        for (let i = 1; i < rawData.length; i++) {
          const row = rawData[i];
          if (!row || row.length === 0 || !row[1]) continue;

          const obj: any = {};
          headerArr.forEach((col: string, colIdx: number) => {
            obj[col] = row[colIdx] ?? '';
          });
          parsedData.push(obj);
        }

        setPreviewData(parsedData);
      } catch (err: any) {
        Swal.fire('Error', 'Gagal membaca file: ' + err.message, 'error');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const handleSimpan = async () => {
    if (previewData.length === 0) return;
    
    const confirm = await Swal.fire({
      title: 'Simpan Nilai?',
      text: `Nilai Kelas ${kelas} Mapel ${mapel} akan disimpan. Data sebelumnya (jika ada) akan tertimpa.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'Ya, Simpan!',
      cancelButtonText: 'Batal'
    });

    if (!confirm.isConfirmed) return;

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
        Swal.fire('Sukses!', 'Data nilai berhasil disimpan.', 'success');
        setPreviewData([]);
        if (activeTab === 'cetak') fetchGrades();
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      Swal.fire('Error', err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const cetakRapor = (siswa: Siswa) => {
    // 1. Kumpulkan nilai dari seluruh mapel untuk siswa ini
    const nilaiSiswa = gradesData.map(doc => {
      const barisAnak = doc.data_nilai.find((n: any) => String(n['NISN']) === String(siswa.nisn) || n['NAMA SISWA'] === siswa.nama.toUpperCase());
      return {
        mapel: doc.mata_pelajaran,
        sts: barisAnak ? barisAnak['STS'] : '',
        na: barisAnak ? barisAnak['NILAI AKHIR'] : ''
      };
    }).sort((a, b) => a.mapel.localeCompare(b.mapel));

    // 2. Generate HTML
    const trHtml = nilaiSiswa.map((n, i) => `
      <tr>
        <td style="text-align: center; padding: 8px; border: 1px solid #333;">${i + 1}</td>
        <td style="padding: 8px; border: 1px solid #333;">${n.mapel}</td>
        <td style="text-align: center; padding: 8px; border: 1px solid #333;">${n.sts}</td>
        <td style="text-align: center; padding: 8px; border: 1px solid #333;">${n.na}</td>
      </tr>
    `).join('');

    const html = `
      <html>
        <head>
          <title>Cetak Rapor STS - ${siswa.nama}</title>
          <style>
            @page { size: A4 portrait; margin: 20mm; }
            body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; color: #000; margin: 0; padding: 0; }
            .header { text-align: center; border-bottom: 3px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
            .header h2, .header h3 { margin: 0; }
            .title { text-align: center; font-weight: bold; font-size: 14pt; margin-bottom: 20px; text-transform: uppercase; }
            .info-table { width: 100%; margin-bottom: 20px; font-size: 11pt; }
            .info-table td { padding: 3px; }
            .nilai-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 11pt; }
            .nilai-table th { background: #f0f0f0; padding: 10px; border: 1px solid #333; }
            .ttd-table { width: 100%; text-align: center; font-size: 11pt; }
            .ttd-table td { width: 33%; padding-bottom: 80px; vertical-align: top; }
            @media print { body { -webkit-print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h3>KEMENTERIAN AGAMA REPUBLIK INDONESIA</h3>
            <h2>RAPOR SUMATIF TENGAH SEMESTER (STS)</h2>
          </div>
          
          <div class="title">Laporan Hasil Penilaian Tengah Semester</div>

          <table class="info-table">
            <tr>
              <td width="18%">Nama Peserta Didik</td><td width="2%">:</td><td width="40%"><b>${siswa.nama.toUpperCase()}</b></td>
              <td width="15%">Kelas</td><td width="2%">:</td><td width="23%">${siswa.rombel}</td>
            </tr>
            <tr>
              <td>NISN</td><td>:</td><td>${siswa.nisn || '-'}</td>
              <td>Semester</td><td>:</td><td>${semester}</td>
            </tr>
            <tr>
              <td>Nama Sekolah</td><td>:</td><td>MTs/SMP ...</td>
              <td>Tahun Ajaran</td><td>:</td><td>${tahunAjaran}</td>
            </tr>
          </table>

          <table class="nilai-table">
            <thead>
              <tr>
                <th width="5%">No</th>
                <th width="55%">Mata Pelajaran</th>
                <th width="20%">Nilai STS</th>
                <th width="20%">Nilai Akhir (Raport)</th>
              </tr>
            </thead>
            <tbody>
              ${trHtml || '<tr><td colspan="4" style="text-align: center; padding: 20px;">Belum ada data nilai</td></tr>'}
            </tbody>
          </table>

          <table class="ttd-table">
            <tr>
              <td>Mengetahui,<br/>Orang Tua / Wali</td>
              <td><br/>Wali Kelas</td>
              <td>..........., .....................<br/>Kepala Madrasah</td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    const iframeDoc = iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.write(html);
      iframeDoc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }, 500);
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
        <button 
          className={`${styles.tab} ${activeTab === 'review' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('review')}
        >
          <i className="fas fa-list-check" style={{marginRight: '8px'}}></i> Review & Edit Nilai
        </button>
      </div>

      {/* FILTER GLOBAL */}
      <div className={styles.card}>
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
              {kelasOptions.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          {activeTab === 'input' && (
            <div className={styles.filterGroup}>
              <label>Mata Pelajaran</label>
              <select className={styles.select} value={mapel} onChange={e => setMapel(e.target.value)}>
                {allMapel.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      {activeTab === 'input' && (
        <div className={styles.card}>
          <div className={styles.alert}>
            <i className="fas fa-info-circle fa-lg"></i>
            <div>
              <strong>Langkah Input Nilai:</strong><br/>
              1. Pastikan Filter Kelas dan Mata Pelajaran sudah benar.<br/>
              2. Klik <b>Download Template Excel</b> (Otomatis berisi daftar siswa di kelas tersebut).<br/>
              3. Isi nilai siswa secara offline di Excel.<br/>
              4. Klik <b>Upload File Excel</b> yang sudah diisi.<br/>
              5. Cek preview tabel di bawah, lalu klik <b>Simpan ke Database</b>.
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0 }}>Daftar Siswa Kelas {kelas}</h3>
            <div>
              <span style={{ fontSize: '0.85rem', color: '#64748b', marginRight: '16px' }}>
                {isFetchingGrades ? 'Memuat data nilai...' : `Data nilai dari ${gradesData.length} mata pelajaran ditemukan`}
              </span>
              <button 
                className={styles.btnOutline} 
                onClick={fetchGrades}
                disabled={isFetchingGrades}
              >
                <i className={`fas fa-sync ${isFetchingGrades ? 'fa-spin' : ''}`}></i> Refresh
              </button>
            </div>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{width: '60px'}}>No</th>
                  <th style={{textAlign: 'left'}}>NISN</th>
                  <th style={{textAlign: 'left'}}>Nama Siswa</th>
                  <th style={{width: '120px'}}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {siswaKelasSelected.length > 0 ? (
                  siswaKelasSelected.map((s, i) => (
                    <tr key={s.id}>
                      <td>{i + 1}</td>
                      <td>{s.nisn || '-'}</td>
                      <td>{s.nama}</td>
                      <td>
                        <button 
                          className={styles.btnPrimary} 
                          style={{ padding: '6px 12px', fontSize: '0.85rem', margin: '0 auto' }}
                          onClick={() => cetakRapor(s)}
                        >
                          <i className="fas fa-print"></i> Cetak
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} style={{ padding: '24px' }}>Tidak ada siswa di kelas ini</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'review' && (
        <div className={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0 }}>Data Nilai Tersimpan - Kelas {kelas}</h3>
            <button 
              className={styles.btnOutline} 
              onClick={fetchReviewData}
              disabled={isFetchingReview}
            >
              <i className={`fas fa-sync ${isFetchingReview ? 'fa-spin' : ''}`}></i> Refresh
            </button>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{width: '60px'}}>No</th>
                  <th style={{textAlign: 'left'}}>Mata Pelajaran</th>
                  <th>Jumlah Siswa Dinilai</th>
                  <th style={{textAlign: 'left'}}>Terakhir Diperbarui</th>
                  <th style={{width: '120px'}}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {isFetchingReview ? (
                  <tr><td colSpan={5} style={{ padding: '24px' }}>Memuat data...</td></tr>
                ) : reviewData.length > 0 ? (
                  reviewData.map((d, i) => (
                    <tr key={d.id}>
                      <td>{i + 1}</td>
                      <td style={{fontWeight: 600}}>{d.mata_pelajaran}</td>
                      <td>{Array.isArray(d.data_nilai) ? d.data_nilai.length : 0} Siswa</td>
                      <td>{new Date(d.updated_at).toLocaleString('id-ID')}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button 
                            className={styles.btnPrimary} 
                            style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                            onClick={() => { setViewingGrade(d); setEditingGradeId(null); }}
                          >
                            <i className="fas fa-eye"></i> Lihat
                          </button>
                          <button 
                            className={styles.btnPrimary} 
                            style={{ padding: '6px 12px', fontSize: '0.85rem', background: '#eab308' }}
                            onClick={() => { 
                              setViewingGrade(d); 
                              setEditingGradeId(d.id); 
                              setEditedNilaiData(JSON.parse(JSON.stringify(d.data_nilai || []))); 
                            }}
                          >
                            <i className="fas fa-edit"></i> Edit
                          </button>
                          <button 
                            className={styles.btnPrimary} 
                            style={{ padding: '6px 12px', fontSize: '0.85rem', background: '#ef4444' }}
                            onClick={() => handleDeleteGrade(d.id, d.mata_pelajaran)}
                          >
                            <i className="fas fa-trash"></i> Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={{ padding: '24px' }}>Belum ada data nilai tersimpan untuk kelas ini.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewingGrade && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          padding: '20px'
        }}>
          <div className={styles.card} style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', margin: 0, position: 'relative' }}>
            <button 
              style={{ position: 'absolute', right: '20px', top: '20px', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}
              onClick={() => setViewingGrade(null)}
            >
              <i className="fas fa-times"></i>
            </button>
            
            <h2 style={{ marginTop: 0, marginBottom: '8px' }}>Review Nilai: {viewingGrade.mata_pelajaran}</h2>
            <p style={{ color: '#64748b', marginBottom: '20px', fontSize: '0.9rem' }}>
              Kelas {viewingGrade.kelas} | Semester {viewingGrade.semester} {viewingGrade.tahun_ajaran}
            </p>

            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: '50px' }}>No</th>
                    <th style={{ textAlign: 'left' }}>NISN</th>
                    <th style={{ textAlign: 'left' }}>Nama Siswa</th>
                    {(() => {
                      if (!viewingGrade.data_nilai || viewingGrade.data_nilai.length === 0) return null;
                      const keys = Object.keys(viewingGrade.data_nilai[0]);
                      const noKey = keys.find(k => k.trim().toLowerCase() === 'no' || k.trim().toLowerCase() === 'nomor');
                      const nisnKey = keys.find(k => k.trim().toLowerCase() === 'nisn');
                      const nameKey = keys.find(k => k.trim().toLowerCase().includes('nama'));
                      return keys.filter(k => k !== noKey && k !== nisnKey && k !== nameKey).map((col, idx) => (
                        <th key={idx}>{col}</th>
                      ));
                    })()}
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(viewingGrade.data_nilai) && viewingGrade.data_nilai.length > 0 ? (
                    viewingGrade.data_nilai.map((n: any, idx: number) => {
                      const keys = Object.keys(n);
                      const noKey = keys.find(k => k.trim().toLowerCase() === 'no' || k.trim().toLowerCase() === 'nomor');
                      const nisnKey = keys.find(k => k.trim().toLowerCase() === 'nisn');
                      const nameKey = keys.find(k => k.trim().toLowerCase().includes('nama'));
                      const gradeCols = keys.filter(k => k !== noKey && k !== nisnKey && k !== nameKey);
                      
                      return (
                        <tr key={idx}>
                          <td style={{ textAlign: 'center' }}>{noKey ? n[noKey] : (idx + 1)}</td>
                          <td>{nisnKey ? n[nisnKey] : '-'}</td>
                          <td>{nameKey ? n[nameKey] : '-'}</td>
                          {gradeCols.map((col, cIdx) => (
                            <td key={cIdx} style={{ textAlign: 'center', fontWeight: 'bold' }}>
                              {editingGradeId === viewingGrade.id ? (
                                <input 
                                  type="text"
                                  value={editedNilaiData[idx]?.[col] || ''}
                                  onChange={e => {
                                    const newData = [...editedNilaiData];
                                    if (!newData[idx]) newData[idx] = { ...n };
                                    newData[idx][col] = e.target.value;
                                    setEditedNilaiData(newData);
                                  }}
                                  style={{ width: '60px', textAlign: 'center', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                                />
                              ) : (
                                n[col]
                              )}
                            </td>
                          ))}
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '24px' }}>Tidak ada detail nilai.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {editingGradeId === viewingGrade.id && (
              <div style={{ marginTop: '20px', textAlign: 'right' }}>
                <button 
                  className={styles.btnOutline} 
                  style={{ marginRight: '10px' }}
                  onClick={() => setViewingGrade(null)}
                >
                  Batal
                </button>
                <button 
                  className={styles.btnPrimary} 
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                >
                  {isSaving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>} Simpan Perubahan
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
