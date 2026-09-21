'use client';
import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import styles from './NilaiSiswa.module.css';

export default function NilaiSiswaPage() {
  const [mainTab, setMainTab] = useState<'pk'>('pk');
  const [subTab, setSubTab] = useState<'input'|'cetak'|'rekap'>('input');
  
  // PK States
  const [kelas, setKelas] = useState('');
  const [mapel, setMapel] = useState('BTQ');
  const [mapelLain, setMapelLain] = useState('');
  const [tipe, setTipe] = useState<'materi_harian'|'sts'|'sas'>('materi_harian');
  const [materi, setMateri] = useState('Materi 1');
  const [subMateri, setSubMateri] = useState('S1');
  
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const defaultTA = currentMonth >= 6 ? `${currentYear}/${currentYear + 1}` : `${currentYear - 1}/${currentYear}`;
  const [tahunAjaran, setTahunAjaran] = useState(defaultTA);
  
  const [students, setStudents] = useState<any[]>([]);
  const [rekapStudents, setRekapStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // States for Bulk Upload
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<any>(null);
  const pkMapelList = [
    'Ilmu Pengetahuan Alam',
    'Ilmu Pengetahuan Sosial',
    'Matematika',
    'Bahasa Indonesia',
    'Pendidikan Jasmani, Olah Raga dan Kesehatan',
    'Seni Budaya',
    'Bahasa Inggris',
    'Bahasa Arab',
    'Keterampilan Kreatif Produktif',
    'Pendidikan Agama Islam',
    'Tahfidh'
  ];

  const [mapelList, setMapelList] = useState<string[]>(pkMapelList);

  useEffect(() => {
    const userStr = localStorage.getItem('keren_user_data');
    if (userStr) {
      try {
        setProfile(JSON.parse(userStr));
      } catch (e) {}
    }
    
    // Set initial mapel correctly since we removed API fetch
    setMapel(prevMapel => {
      if (!pkMapelList.includes(prevMapel) && prevMapel !== 'Lainnya' && pkMapelList.length > 0) {
        return pkMapelList[0];
      }
      return prevMapel;
    });
  }, []);

  const fetchRekap = async () => {
    if (!kelas || !tahunAjaran) {
      Swal.fire('Peringatan', 'Silakan pilih Kelas dan Tahun Ajaran terlebih dahulu', 'warning');
      return;
    }
    setLoading(true);
    const finalMapel = mapel === 'Lainnya' ? mapelLain : mapel;
    try {
      const res = await fetch(`/api/nilai-siswa/pk/rekap?kelas=${encodeURIComponent(kelas)}&mapel=${encodeURIComponent(finalMapel)}&tahunAjaran=${encodeURIComponent(tahunAjaran)}`);
      const result = await res.json();
      if (result.success) {
        setRekapStudents(result.data);
      } else {
        Swal.fire('Gagal', result.error || 'Gagal mengambil rekap', 'error');
      }
    } catch (err: any) {
      Swal.fire('Error', err.message, 'error');
    }
    setLoading(false);
  };

  const fetchStudents = async () => {
    if (!kelas || !tahunAjaran) {
      Swal.fire('Peringatan', 'Silakan pilih Kelas dan Tahun Ajaran terlebih dahulu', 'warning');
      return;
    }
    setLoading(true);
    const finalMapel = mapel === 'Lainnya' ? mapelLain : mapel;
    try {
      const res = await fetch(`/api/nilai-siswa/pk?kelas=${encodeURIComponent(kelas)}&mapel=${encodeURIComponent(finalMapel)}&tipe=${tipe}&materi=${encodeURIComponent(materi)}&sub=${encodeURIComponent(subMateri)}&tahunAjaran=${encodeURIComponent(tahunAjaran)}`);
      const result = await res.json();
      if (result.success) {
        setStudents(result.data);
      } else {
        Swal.fire('Gagal', result.error || 'Gagal mengambil data', 'error');
      }
    } catch (err: any) {
      Swal.fire('Error', err.message, 'error');
    }
    setLoading(false);
  };

  const handleDownloadTemplate = async () => {
    if (!kelas || !tahunAjaran) {
      Swal.fire('Peringatan', 'Silakan pilih Kelas dan Tahun Ajaran terlebih dahulu', 'warning');
      return;
    }
    setLoading(true);
    const finalMapel = mapel === 'Lainnya' ? mapelLain : mapel;
    try {
      // Just fetch students for the class (omit tipe so it returns empty scores)
      const res = await fetch(`/api/nilai-siswa/pk?kelas=${encodeURIComponent(kelas)}&mapel=${encodeURIComponent(finalMapel)}&tahunAjaran=${encodeURIComponent(tahunAjaran)}`);
      const result = await res.json();
      if (result.success) {
        const siswaKelas = result.data.sort((a: any, b: any) => a.nama.localeCompare(b.nama));
        
        if (siswaKelas.length === 0) {
          Swal.fire('Kosong', 'Tidak ada siswa di kelas ini pada tahun ajaran tersebut', 'info');
          setLoading(false);
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
          'STS', 'SAS'
        ];

        const dataRows = siswaKelas.map((s: any, i: number) => [
          i + 1,
          s.induk,
          s.nama.toUpperCase(),
          (s.jk || '').toLowerCase().includes('l') ? 'L' : 'P',
          ...Array(20).fill('')
        ]);

        const wsData = [headerRow, ...dataRows];
        const ws = XLSX.utils.aoa_to_sheet(wsData);

        ws['!cols'] = [
          { wch: 5 }, { wch: 15 }, { wch: 35 }, { wch: 5 },
          ...Array(20).fill({ wch: 12 })
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Input Nilai PK');
        XLSX.writeFile(wb, `Template_Nilai_PK_${kelas}_${finalMapel.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
      } else {
        Swal.fire('Gagal', result.error || 'Gagal mengambil data siswa', 'error');
      }
    } catch (err: any) {
      Swal.fire('Error', err.message, 'error');
    }
    setLoading(false);
  };

  const processUpload = (file: File) => {
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

          const rowObj: any = {};
          headerArr.forEach((h: any, j: number) => {
            rowObj[h] = row[j] ?? '';
          });
          
          rowObj.induk = rowObj['NISN'];
          rowObj.nama = rowObj['NAMA SISWA'];
          rowObj.jk = rowObj['L/P'];
          
          parsedData.push(rowObj);
        }

        setPreviewData(parsedData);
      } catch (err: any) {
        Swal.fire('Error', 'Gagal membaca file Excel: ' + err.message, 'error');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const finalMapel = mapel === 'Lainnya' ? mapelLain : mapel;
    const fileNameUpper = file.name.toUpperCase();
    
    // Check if filename contains the mapel words and kelas
    const mapelWords = finalMapel.toUpperCase().replace(/[^A-Z0-9]/g, ' ').trim().split(/\s+/).filter(Boolean);
    const isMapelMatch = mapelWords.length > 0 && mapelWords.some((word: string) => fileNameUpper.includes(word));
    const isKelasMatch = kelas && fileNameUpper.includes(kelas.toUpperCase());

    if (!isMapelMatch || !isKelasMatch) {
      Swal.fire({
        title: 'Peringatan Keamanan',
        html: `Nama file Excel yang diupload (<b>${file.name}</b>) tidak sesuai dengan Kelas (<b>${kelas}</b>) atau Mapel Program Khusus (<b>${finalMapel}</b>) yang sedang dipilih.<br><br>Apakah Anda yakin ingin melanjutkan? Pastikan file ini benar agar nilai tidak tertukar!`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Ya, Lanjutkan',
        cancelButtonText: 'Batal',
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33'
      }).then((result) => {
        if (result.isConfirmed) {
          processUpload(file);
        } else {
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      });
    } else {
      processUpload(file);
    }
  };

  const saveBulkScores = async () => {
    if (previewData.length === 0) return;
    
    const confirm = await Swal.fire({
      title: 'Simpan Nilai?',
      text: `Anda akan menyimpan nilai untuk ${previewData.length} siswa. Data sebelumnya akan ditimpa.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: '<i class="fas fa-save"></i> Ya, Simpan',
      cancelButtonText: 'Batal',
      reverseButtons: true
    });

    if (!confirm.isConfirmed) return;

    setSaving(true);
    const finalMapel = mapel === 'Lainnya' ? mapelLain : mapel;
    try {
      const res = await fetch('/api/nilai-siswa/pk/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kelas,
          mapel: finalMapel,
          dataNilai: previewData,
          guru: profile?.nama || '',
          tahunAjaran
        })
      });
      const result = await res.json();
      if (result.success) {
        Swal.fire({
          title: 'Mantap Keren!',
          text: 'Nilai berhasil disimpan ke sistem.',
          icon: 'success',
          timer: 2500,
          showConfirmButton: false
        });
        setPreviewData([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        Swal.fire('Gagal', result.error || 'Gagal menyimpan nilai', 'error');
      }
    } catch (err: any) {
      Swal.fire('Error', err.message, 'error');
    }
    setSaving(false);
  };


  const kelasOptions = ['7A','7B','7C','7D','7E','7F','7G','7H','7I','8A','8B','8C','8D','8E','8F','8G','8H','8I','9A','9B','9C','9D','9E','9F','9G','9H','9I'];

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>
        <i className="fas fa-award" style={{ color: '#f59e0b', filter: 'drop-shadow(0 2px 4px rgba(245,158,11,0.4))', fontSize: '1.2em' }}></i> Nilai Siswa
      </h1>
      <p className={styles.subtitle}>
        Input dan kelola nilai siswa madrasah.
      </p>

      <div className={styles.tabContainer}>
        <button className={`${styles.tabBtn} ${mainTab === 'pk' ? styles.activeTab : ''}`} onClick={() => setMainTab('pk')}>
          <i className="fas fa-book-open"></i> Nilai Program Khusus
        </button>
      </div>

      {mainTab === 'pk' && (
        <>
          <div className={styles.tabContainer} style={{ marginTop: '-10px', transform: 'scale(0.9)', transformOrigin: 'left' }}>
            <button className={`${styles.tabBtn} ${subTab === 'input' ? styles.activeTab : ''}`} onClick={() => setSubTab('input')}>
              <i className="fas fa-edit"></i> Input Nilai
            </button>
            <button className={`${styles.tabBtn} ${subTab === 'cetak' ? styles.activeTab : ''}`} onClick={() => setSubTab('cetak')}>
              <i className="fas fa-print"></i> Cetak Rapor
            </button>
            <button className={`${styles.tabBtn} ${subTab === 'rekap' ? styles.activeTab : ''}`} onClick={() => setSubTab('rekap')}>
              <i className="fas fa-table"></i> Cek Nilai (Rekap)
            </button>
          </div>

          {subTab === 'input' && (
            <div>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>Tahun Ajaran</label>
                  <select className={styles.select} value={tahunAjaran} onChange={e => setTahunAjaran(e.target.value)}>
                    <option value="2023/2024">2023/2024</option>
                    <option value="2024/2025">2024/2025</option>
                    <option value="2025/2026">2025/2026</option>
                    <option value="2026/2027">2026/2027</option>
                    <option value="2027/2028">2027/2028</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Kelas</label>
                  <select className={styles.select} value={kelas} onChange={e => setKelas(e.target.value)}>
                    <option value="">-- Pilih Kelas --</option>
                    {kelasOptions.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
                
                <div className={styles.formGroup}>
                  <label>Mata Pelajaran</label>
                  <select className={styles.select} value={mapel} onChange={e => setMapel(e.target.value)}>
                    {mapelList.map(m => <option key={m} value={m}>{m}</option>)}
                    <option value="Lainnya">Lainnya...</option>
                  </select>
                </div>

                {mapel === 'Lainnya' && (
                  <div className={styles.formGroup}>
                    <label>Nama Mapel Lainnya</label>
                    <input type="text" className={styles.input} value={mapelLain} onChange={e => setMapelLain(e.target.value)} placeholder="Tulis mapel..." />
                  </div>
                )}
              </div>

              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'center' }}>
                <i className="fas fa-info-circle fa-2x" style={{ color: '#3b82f6' }}></i>
                <div>
                  <strong style={{ display: 'block', marginBottom: '4px', color: '#1e3a8a' }}>Langkah Input Nilai PK:</strong>
                  <div style={{ fontSize: '0.9rem', color: '#1e40af', lineHeight: 1.5 }}>
                    1. Pastikan Filter Kelas dan Mata Pelajaran sudah benar.<br/>
                    2. Klik <b>Download Template Excel</b> (Otomatis berisi daftar siswa di kelas tersebut berurut abjad).<br/>
                    3. Isi nilai siswa secara offline di Excel.<br/>
                    4. Klik <b>Upload File Excel</b> yang sudah diisi.<br/>
                    5. Cek preview tabel di bawah, lalu klik <b>Simpan ke Database</b>.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', flexWrap: 'wrap' }}>
                <button 
                  style={{ background: 'white', border: '1px solid #cbd5e1', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
                  onClick={handleDownloadTemplate}
                  disabled={loading}
                >
                  {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-file-excel" style={{ color: '#10b981' }}></i>}
                  Download Template Excel
                </button>
                
                <div style={{ position: 'relative' }}>
                  <button style={{ background: 'white', border: '1px solid #cbd5e1', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fas fa-upload" style={{ color: '#3b82f6' }}></i> Upload File Excel
                  </button>
                  <input 
                    type="file" 
                    accept=".xlsx, .xls"
                    onChange={handleFileUpload}
                    ref={fileInputRef}
                    style={{ position: 'absolute', left: 0, top: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                  />
                </div>
              </div>

              {previewData.length > 0 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Preview Data ({previewData.length} baris)</h3>
                    <button 
                      className={styles.btnSubmit} 
                      onClick={saveBulkScores}
                      disabled={saving}
                    >
                      {saving ? <><i className="fas fa-spinner fa-spin"></i> Menyimpan...</> : <><i className="fas fa-save"></i> Simpan ke Database</>}
                    </button>
                  </div>
                  
                  <div className={styles.tableWrapper} style={{ maxHeight: '500px', overflowY: 'auto' }}>
                    <table className={styles.table}>
                      <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
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

          {subTab === 'rekap' && (
            <div>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>Tahun Ajaran</label>
                  <select className={styles.select} value={tahunAjaran} onChange={e => setTahunAjaran(e.target.value)}>
                    <option value="2023/2024">2023/2024</option>
                    <option value="2024/2025">2024/2025</option>
                    <option value="2025/2026">2025/2026</option>
                    <option value="2026/2027">2026/2027</option>
                    <option value="2027/2028">2027/2028</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Kelas</label>
                  <select className={styles.select} value={kelas} onChange={e => setKelas(e.target.value)}>
                    <option value="">-- Pilih Kelas --</option>
                    {kelasOptions.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Mata Pelajaran</label>
                  <select className={styles.select} value={mapel} onChange={e => setMapel(e.target.value)}>
                    {mapelList.map(m => <option key={m} value={m}>{m}</option>)}
                    <option value="Lainnya">Lainnya...</option>
                  </select>
                </div>
                {mapel === 'Lainnya' && (
                  <div className={styles.formGroup}>
                    <label>Nama Mapel Lainnya</label>
                    <input type="text" className={styles.input} value={mapelLain} onChange={e => setMapelLain(e.target.value)} placeholder="Tulis mapel..." />
                  </div>
                )}
                <div className={styles.formGroup} style={{ justifyContent: 'flex-end' }}>
                  <button className={styles.btnSubmit} onClick={fetchRekap} disabled={loading || !kelas}>
                    {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-search"></i>}
                    Tampilkan Rekap
                  </button>
                </div>
              </div>

              {rekapStudents.length > 0 && (
                <div className={styles.tableWrapper}>
                  <table className={styles.table} style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        <th rowSpan={2} style={{width: '40px'}}>No</th>
                        <th rowSpan={2}>No Induk</th>
                        <th rowSpan={2} style={{minWidth: '200px'}}>Nama Lengkap</th>
                        <th rowSpan={2}>L/P</th>
                        {[1,2,3,4,5,6].map(m => (
                          <th key={m} colSpan={3} style={{textAlign: 'center', borderLeft: '1px solid #e2e8f0'}}>Materi {m}</th>
                        ))}
                        <th rowSpan={2} style={{borderLeft: '1px solid #e2e8f0'}}>STS</th>
                        <th rowSpan={2}>SAS</th>
                        <th rowSpan={2}>Rata-Rata</th>
                      </tr>
                      <tr>
                        {[1,2,3,4,5,6].map(m => (
                          <React.Fragment key={m}>
                            <th style={{borderLeft: '1px solid #e2e8f0', textAlign: 'center'}}>S1</th>
                            <th style={{textAlign: 'center'}}>S2</th>
                            <th style={{textAlign: 'center'}}>S3</th>
                          </React.Fragment>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rekapStudents.map((s, idx) => (
                        <tr key={idx}>
                          <td>{idx + 1}</td>
                          <td>{s.induk}</td>
                          <td>{s.nama}</td>
                          <td style={{textAlign: 'center'}}>{s.jk}</td>
                          {[1,2,3,4,5,6].map(m => (
                            <React.Fragment key={m}>
                              <td style={{borderLeft: '1px solid #e2e8f0', textAlign: 'center'}}>{s.scores[`m${m}s1`]}</td>
                              <td style={{textAlign: 'center'}}>{s.scores[`m${m}s2`]}</td>
                              <td style={{textAlign: 'center'}}>{s.scores[`m${m}s3`]}</td>
                            </React.Fragment>
                          ))}
                          <td style={{borderLeft: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 'bold'}}>{s.scores.sts}</td>
                          <td style={{textAlign: 'center', fontWeight: 'bold'}}>{s.scores.sas}</td>
                          <td style={{textAlign: 'center', fontWeight: 'bold', color: '#0ea5e9'}}>{s.scores.rata}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {subTab === 'cetak' && (
            <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
              <i className="fas fa-print" style={{ fontSize: '3rem', color: '#94a3b8', marginBottom: '1rem' }}></i>
              <h2 style={{ color: '#475569', marginBottom: '0.5rem' }}>Cetak Rapor Program Khusus</h2>
              <p style={{ color: '#64748b' }}>Fitur cetak rapor sedang dalam tahap pengembangan.</p>
            </div>
          )}
        </>
      )}

    </div>
  );
}
