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
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // States for Bulk Upload
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<any>(null);
  const [semester, setSemester] = useState<'Ganjil' | 'Genap'>('Ganjil');
  const [tanggalCetak, setTanggalCetak] = useState<string>(() => {
    const d = new Date();
    const bln = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    return `${d.getDate()} ${bln[d.getMonth()]} ${d.getFullYear()}`;
  });
  const [previewStudent, setPreviewStudent] = useState<any | null>(null);

  const mapMinatBakat: Record<string, string> = {
    '7A': 'SAINS RISET', '7B': 'SAINS RISET',
    '7C': 'OLAHRAGA SENI', '7D': 'OLAHRAGA SENI',
    '7E': 'MULTILINGUAL', '7F': 'MULTILINGUAL',
    '7G': 'KETERAMPILAN KREATIF PRODUKTIF',
    '7H': 'AGAMA TAHFIDZ', '7I': 'AGAMA TAHFIDZ',
    '8A': 'OLAHRAGA SENI', '8B': 'MULTILINGUAL',
    '8C': 'OLAHRAGA SENI', '8D': 'MULTILINGUAL',
    '8E': 'SAINS RISET', '8F': 'KETERAMPILAN KREATIF PRODUKTIF',
    '8G': 'SAINS RISET', '8H': 'AGAMA TAHFIDZ', '8I': 'AGAMA TAHFIDZ'
  };

  const getPredikat = (scoreNum: number) => {
    if (isNaN(scoreNum) || scoreNum === 0) return { predikat: '-', ket: '-', deskripsi: 'Belum ada nilai' };
    if (scoreNum >= 90) return { predikat: 'A', ket: 'Sangat Baik', deskripsi: 'Menunjukkan penguasaan kompetensi yang sangat baik dan aktif dalam seluruh capaian pembelajaran.' };
    if (scoreNum >= 80) return { predikat: 'B', ket: 'Baik', deskripsi: 'Menunjukkan penguasaan kompetensi yang baik dan konsisten dalam capaian pembelajaran.' };
    if (scoreNum >= 70) return { predikat: 'C', ket: 'Cukup', deskripsi: 'Menunjukkan penguasaan kompetensi yang cukup, perlu peningkatan pemahaman pada beberapa materi.' };
    return { predikat: 'D', ket: 'Perlu Bimbingan', deskripsi: 'Perlu bimbingan dan pendampingan lebih lanjut untuk mencapai kriteria ketuntasan tujuan pembelajaran.' };
  };

  const generateRaporHtml = (s: any) => {
    const scores = s.scores || {};
    const finalMapel = mapel;
    const minatBakat = mapMinatBakat[kelas.toUpperCase().trim()] || 'Program Khusus Unggulan';
    const rataNum = parseFloat(scores.rata || '0');
    const { predikat, ket, deskripsi } = getPredikat(rataNum);
    const guruPengajar = profile?.name || profile?.username || 'Guru Pengajar PK';

    const materiRows = [1, 2, 3, 4, 5, 6].map(m => {
      const s1 = scores[`m${m}s1`] || '';
      const s2 = scores[`m${m}s2`] || '';
      const s3 = scores[`m${m}s3`] || '';
      const validSub = [s1, s2, s3].filter((v: any) => v !== '' && !isNaN(Number(v))).map(Number);
      const avgM = validSub.length > 0 ? Math.round(validSub.reduce((a: number, b: number) => a + b, 0) / validSub.length) : '';
      return `
        <tr>
          <td style="text-align: center; border: 1px solid #000; padding: 5px;">${m}</td>
          <td style="border: 1px solid #000; padding: 5px 8px;">Materi / Capaian Pembelajaran ${m}</td>
          <td style="text-align: center; border: 1px solid #000; padding: 5px;">${s1 || '-'}</td>
          <td style="text-align: center; border: 1px solid #000; padding: 5px;">${s2 || '-'}</td>
          <td style="text-align: center; border: 1px solid #000; padding: 5px;">${s3 || '-'}</td>
          <td style="text-align: center; border: 1px solid #000; padding: 5px; font-weight: bold; background: #fafafa;">${avgM || '-'}</td>
        </tr>
      `;
    }).join('');

    return `
      <div class="page-break" style="font-family: 'Times New Roman', Times, serif; color: #000; padding: 10px 15px; max-width: 800px; margin: 0 auto; background: white;">
        <!-- KOP MADRASAH -->
        <div style="display: flex; align-items: center; border-bottom: 2.5px double #000; padding-bottom: 8px; margin-bottom: 14px;">
          <img src="/logo.png" alt="Logo" style="width: 70px; height: 70px; margin-right: 15px; object-fit: contain;" />
          <div style="text-align: center; flex: 1;">
            <div style="font-size: 11pt; font-weight: bold; text-transform: uppercase;">YAYASAN PENDIDIKAN ALMAARIF SINGOSARI</div>
            <div style="font-size: 14pt; font-weight: bold; text-transform: uppercase;">MADRASAH TSANAWIYAH ALMAARIF 01 SINGOSARI</div>
            <div style="font-size: 9.5pt; font-weight: bold; letter-spacing: 0.5px;">STATUS TERAKREDITASI &quot;A&quot; (UNGGUL)</div>
            <div style="font-size: 8.5pt; color: #333; margin-top: 2px;">
              NSM: 121235070115 &nbsp;|&nbsp; NPSN: 20581318<br/>
              Jl. Masjid No. 33 Singosari, Kab. Malang 65153 &nbsp;|&nbsp; Telp. 0341-458355
            </div>
          </div>
        </div>

        <!-- JUDUL -->
        <div style="text-align: center; margin-bottom: 14px;">
          <div style="font-size: 12pt; font-weight: bold; text-decoration: underline; text-transform: uppercase; letter-spacing: 0.5px;">
            LAPORAN HASIL PENILAIAN PROGRAM KHUSUS
          </div>
          <div style="font-size: 10pt; font-weight: bold; margin-top: 3px;">
            SEMESTER ${semester.toUpperCase()} &mdash; TAHUN PELAJARAN ${tahunAjaran}
          </div>
        </div>

        <!-- IDENTITAS SISWA -->
        <table style="width: 100%; font-size: 9.5pt; margin-bottom: 12px; border-collapse: collapse;">
          <tbody>
            <tr>
              <td style="width: 140px; padding: 2px 0;">Nama Peserta Didik</td>
              <td style="width: 10px;">:</td>
              <td style="font-weight: bold;">${s.nama}</td>
              <td style="width: 130px; padding: 2px 0;">Kelas / Rombel</td>
              <td style="width: 10px;">:</td>
              <td style="font-weight: bold;">${kelas}</td>
            </tr>
            <tr>
              <td style="padding: 2px 0;">Nomor Induk (NIS)</td>
              <td>:</td>
              <td>${s.induk}</td>
              <td style="padding: 2px 0;">Peminatan / Bidang</td>
              <td>:</td>
              <td style="font-weight: bold;">${minatBakat}</td>
            </tr>
            <tr>
              <td style="padding: 2px 0;">Mata Pelajaran PK</td>
              <td>:</td>
              <td style="font-weight: bold;">${finalMapel}</td>
              <td style="padding: 2px 0;">Jenis Kelamin</td>
              <td>:</td>
              <td>${s.jk === 'L' ? 'Laki-laki' : s.jk === 'P' ? 'Perempuan' : s.jk || '-'}</td>
            </tr>
          </tbody>
        </table>

        <!-- TABEL RINCIAN NILAI -->
        <table style="width: 100%; border-collapse: collapse; font-size: 9pt; margin-bottom: 14px; border: 1px solid #000;">
          <thead>
            <tr style="background: #f1f5f9; text-align: center;">
              <th rowspan="2" style="border: 1px solid #000; padding: 6px 4px; width: 35px;">No</th>
              <th rowspan="2" style="border: 1px solid #000; padding: 6px 8px; text-align: left;">Capaian Materi / Pembelajaran</th>
              <th colspan="3" style="border: 1px solid #000; padding: 4px;">Nilai Sub Materi</th>
              <th rowspan="2" style="border: 1px solid #000; padding: 6px 4px; width: 85px;">Rata-Rata Harian</th>
            </tr>
            <tr style="background: #f8fafc; text-align: center;">
              <th style="border: 1px solid #000; padding: 4px; width: 60px;">Sub 1</th>
              <th style="border: 1px solid #000; padding: 4px; width: 60px;">Sub 2</th>
              <th style="border: 1px solid #000; padding: 4px; width: 60px;">Sub 3</th>
            </tr>
          </thead>
          <tbody>
            ${materiRows}
          </tbody>
        </table>

        <!-- TABEL REKAPITULASI PENILAIAN AKHIR -->
        <table style="width: 100%; border-collapse: collapse; font-size: 9.5pt; margin-bottom: 14px; border: 1px solid #000;">
          <thead>
            <tr style="background: #f1f5f9; text-align: center;">
              <th style="border: 1px solid #000; padding: 6px; width: 25%;">Rata-Rata Formatif</th>
              <th style="border: 1px solid #000; padding: 6px; width: 25%;">Nilai STS</th>
              <th style="border: 1px solid #000; padding: 6px; width: 25%;">Nilai SAS</th>
              <th style="border: 1px solid #000; padding: 6px; width: 25%;">Nilai Akhir (NA)</th>
            </tr>
          </thead>
          <tbody>
            <tr style="text-align: center; font-size: 11pt; font-weight: bold;">
              <td style="border: 1px solid #000; padding: 8px;">
                ${(() => {
                  const allH = [scores.m1s1, scores.m1s2, scores.m1s3, scores.m2s1, scores.m2s2, scores.m2s3, scores.m3s1, scores.m3s2, scores.m3s3, scores.m4s1, scores.m4s2, scores.m4s3, scores.m5s1, scores.m5s2, scores.m5s3, scores.m6s1, scores.m6s2, scores.m6s3].filter((v: any) => v !== '' && !isNaN(Number(v))).map(Number);
                  return allH.length > 0 ? Math.round(allH.reduce((a: number, b: number) => a + b, 0) / allH.length) : '-';
                })()}
              </td>
              <td style="border: 1px solid #000; padding: 8px;">${scores.sts || '-'}</td>
              <td style="border: 1px solid #000; padding: 8px;">${scores.sas || '-'}</td>
              <td style="border: 1px solid #000; padding: 8px; color: #0284c7; font-size: 13pt;">${scores.rata || '-'}</td>
            </tr>
            <tr>
              <td colspan="4" style="border: 1px solid #000; padding: 6px 10px; background: #fafafa; font-size: 9pt;">
                <strong>Predikat:</strong> <span style="font-weight: bold; color: #1e293b;">${predikat} (${ket || '-'})</span> &nbsp;|&nbsp;
                <strong>Deskripsi:</strong> <em>${deskripsi}</em>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- TANDA TANGAN -->
        <table style="width: 100%; font-size: 9.5pt; margin-top: 25px; text-align: center; border-collapse: collapse;">
          <tbody>
            <tr>
              <td style="width: 33%; vertical-align: top;">
                Mengetahui,<br/>
                Orang Tua / Wali Murid<br/><br/><br/><br/><br/>
                <b>( ........................................ )</b>
              </td>
              <td style="width: 34%; vertical-align: top;">
                Singosari, ${tanggalCetak}<br/>
                Guru Pembimbing PK<br/><br/><br/><br/><br/>
                <b><u>${guruPengajar}</u></b>
              </td>
              <td style="width: 33%; vertical-align: top;">
                Mengetahui,<br/>
                Kepala Madrasah<br/><br/><br/><br/><br/>
                <b><u>Dwi Retno Palupi, M.Pd.</u></b>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  };

  const doPrint = (contentHtml: string, title: string) => {
    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            @page { size: A4 portrait; margin: 12mm 12mm 12mm 15mm; }
            body { font-family: 'Times New Roman', Times, serif; color: #000; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .page-break { page-break-after: always; break-after: page; }
            .page-break:last-child { page-break-after: auto; break-after: auto; }
            table { border-collapse: collapse; }
          </style>
        </head>
        <body>
          ${contentHtml}
        </body>
      </html>
    `;
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
    const iframeDoc = iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(fullHtml);
      iframeDoc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1500);
      }, 500);
    }
  };

  const handlePrintAll = () => {
    if (!rekapStudents || rekapStudents.length === 0) {
      Swal.fire('Perhatian', 'Belum ada data siswa untuk dicetak. Silakan tampilkan data terlebih dahulu.', 'warning');
      return;
    }
    let allHtml = '';
    rekapStudents.forEach(s => {
      allHtml += generateRaporHtml(s);
    });
    doPrint(allHtml, `Rapor PK Kelas ${kelas} - ${mapel}`);
  };

  const handlePrintSingle = (s: any) => {
    doPrint(generateRaporHtml(s), `Rapor PK - ${s.nama}`);
  };
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
      if (!pkMapelList.includes(prevMapel) && pkMapelList.length > 0) {
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
    setIsEditing(false);
    const finalMapel = mapel;
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

  const handleEditRekap = (idx: number, field: string, value: string) => {
    const updated = [...rekapStudents];
    updated[idx].scores[field] = value;
    
    const s = updated[idx].scores;
    const allHarian = [s.m1s1, s.m1s2, s.m1s3, s.m2s1, s.m2s2, s.m2s3, s.m3s1, s.m3s2, s.m3s3, s.m4s1, s.m4s2, s.m4s3, s.m5s1, s.m5s2, s.m5s3, s.m6s1, s.m6s2, s.m6s3];
    const validHarian = allHarian.filter(v => v !== '' && v !== undefined && !isNaN(Number(v))).map(Number);
    const avgHarian = validHarian.length > 0 ? validHarian.reduce((a,b)=>a+b,0) / validHarian.length : 0;
    
    let bobotHarian = 0.6;
    let bobotSts = 0;
    let bobotSas = 0;
    let denom = 0;
    
    if (validHarian.length > 0) denom += bobotHarian;
    if (s.sts && !isNaN(Number(s.sts))) { bobotSts = 0.2; denom += bobotSts; }
    if (s.sas && !isNaN(Number(s.sas))) { bobotSas = 0.2; denom += bobotSas; }
    
    if (denom > 0) {
      const rata = ((avgHarian * bobotHarian) + (Number(s.sts||0) * bobotSts) + (Number(s.sas||0) * bobotSas)) / denom;
      s.rata = Math.round(rata);
    } else {
      s.rata = '';
    }
    
    setRekapStudents(updated);
  };

  const saveRekap = async () => {
    setSaving(true);
    const finalMapel = mapel;
    
    const dataNilai = rekapStudents.map(s => {
      const obj: any = { induk: s.induk, nama: s.nama, jk: s.jk };
      obj['MATERI 1 S1'] = s.scores.m1s1; obj['MATERI 1 S2'] = s.scores.m1s2; obj['MATERI 1 S3'] = s.scores.m1s3;
      obj['MATERI 2 S1'] = s.scores.m2s1; obj['MATERI 2 S2'] = s.scores.m2s2; obj['MATERI 2 S3'] = s.scores.m2s3;
      obj['MATERI 3 S1'] = s.scores.m3s1; obj['MATERI 3 S2'] = s.scores.m3s2; obj['MATERI 3 S3'] = s.scores.m3s3;
      obj['MATERI 4 S1'] = s.scores.m4s1; obj['MATERI 4 S2'] = s.scores.m4s2; obj['MATERI 4 S3'] = s.scores.m4s3;
      obj['MATERI 5 S1'] = s.scores.m5s1; obj['MATERI 5 S2'] = s.scores.m5s2; obj['MATERI 5 S3'] = s.scores.m5s3;
      obj['MATERI 6 S1'] = s.scores.m6s1; obj['MATERI 6 S2'] = s.scores.m6s2; obj['MATERI 6 S3'] = s.scores.m6s3;
      obj['STS'] = s.scores.sts;
      obj['SAS'] = s.scores.sas;
      return obj;
    });

    try {
      const res = await fetch('/api/nilai-siswa/pk/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kelas,
          mapel: finalMapel,
          tahunAjaran,
          dataNilai,
          guru: profile?.nama || ''
        })
      });
      const result = await res.json();
      if (result.success) {
        Swal.fire('Berhasil', 'Nilai berhasil diupdate', 'success');
        setIsEditing(false);
      } else {
        Swal.fire('Gagal', result.error, 'error');
      }
    } catch (err: any) {
      Swal.fire('Error', err.message, 'error');
    }
    setSaving(false);
  };

  const fetchStudents = async () => {
    if (!kelas || !tahunAjaran) {
      Swal.fire('Peringatan', 'Silakan pilih Kelas dan Tahun Ajaran terlebih dahulu', 'warning');
      return;
    }
    setLoading(true);
    const finalMapel = mapel;
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
    const finalMapel = mapel;
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

    const finalMapel = mapel;
    const fileNameUpper = file.name.toUpperCase();
    
    // Check if filename contains the mapel words and kelas
    const mapelWords = finalMapel.toUpperCase().replace(/[^A-Z0-9]/g, ' ').trim().split(/\s+/).filter(Boolean);
    const isMapelMatch = mapelWords.length > 0 && mapelWords.some((word: string) => fileNameUpper.includes(word));
    const isKelasMatch = kelas && fileNameUpper.includes(kelas.toUpperCase());

    if (!isMapelMatch || !isKelasMatch) {
      Swal.fire({
        title: 'Upload Ditolak',
        html: `File yang Anda upload: <b>${file.name}</b><br><br>Sepertinya tidak cocok dengan dropdown terpilih:<br>Kelas: <b>${kelas}</b><br>Mapel Program Khusus: <b>${finalMapel}</b><br><br><b>Silakan upload file yang benar agar nilai tidak tertukar!</b>`,
        icon: 'error',
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'Tutup'
      }).then(() => {
        if (fileInputRef.current) fileInputRef.current.value = '';
      });
      return;
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
    const finalMapel = mapel;
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
        <i className="fas fa-award" style={{ color: '#f59e0b', filter: 'drop-shadow(0 2px 4px rgba(245,158,11,0.4))', fontSize: '1.2em' }}></i> Program Khusus
      </h1>
      <p className={styles.subtitle}>
        Input dan kelola nilai Program Khusus siswa madrasah.
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
            
            <button className={`${styles.tabBtn} ${subTab === 'rekap' ? styles.activeTab : ''}`} onClick={() => setSubTab('rekap')}>
              <i className="fas fa-table"></i> Cek Nilai (Rekap)
            </button>

            <button className={`${styles.tabBtn} ${subTab === 'cetak' ? styles.activeTab : ''}`} onClick={() => setSubTab('cetak')}>
              <i className="fas fa-print"></i> Cetak Rapor PK
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
                    
                  </select>
                </div>

                
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

          {subTab === 'cetak' && (
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
                  <label>Mata Pelajaran PK</label>
                  <select className={styles.select} value={mapel} onChange={e => setMapel(e.target.value)}>
                    {mapelList.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Semester</label>
                  <select className={styles.select} value={semester} onChange={e => setSemester(e.target.value as any)}>
                    <option value="Ganjil">Semester Ganjil</option>
                    <option value="Genap">Semester Genap</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Tanggal Rapor</label>
                  <input 
                    type="text" 
                    className={styles.input} 
                    value={tanggalCetak} 
                    onChange={e => setTanggalCetak(e.target.value)} 
                    placeholder="Contoh: 9 November 2026"
                  />
                </div>
                
                <div className={styles.formGroup} style={{ justifyContent: 'flex-end' }}>
                  <button className={styles.btnSubmit} onClick={fetchRekap} disabled={loading || !kelas}>
                    {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-search"></i>}
                    Tampilkan Data
                  </button>
                </div>
              </div>

              {rekapStudents.length > 0 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px', background: '#f8fafc', padding: '12px 18px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ background: '#0284c7', color: 'white', padding: '4px 10px', borderRadius: '6px', fontWeight: 700, fontSize: '0.85rem' }}>
                        Kelas {kelas}
                      </span>
                      <span style={{ fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>
                        {mapel} &bull; {rekapStudents.length} Siswa Terdaftar
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button 
                        onClick={handlePrintAll}
                        style={{ 
                          background: '#059669', 
                          color: 'white', 
                          border: 'none', 
                          padding: '9px 20px', 
                          borderRadius: '8px', 
                          cursor: 'pointer', 
                          fontWeight: 700, 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px',
                          fontSize: '0.9rem',
                          boxShadow: '0 2px 4px rgba(5,150,105,0.2)'
                        }}
                      >
                        <i className="fas fa-print"></i> Cetak Semua Rapor (Massal)
                      </button>
                    </div>
                  </div>

                  <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th style={{ width: '45px', textAlign: 'center' }}>No</th>
                          <th style={{ width: '120px' }}>No Induk</th>
                          <th>Nama Lengkap Siswa</th>
                          <th style={{ width: '60px', textAlign: 'center' }}>L/P</th>
                          <th style={{ width: '90px', textAlign: 'center' }}>Nilai Akhir</th>
                          <th style={{ width: '120px', textAlign: 'center' }}>Predikat</th>
                          <th style={{ width: '190px', textAlign: 'center' }}>Aksi Cetak</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rekapStudents.map((s, idx) => {
                          const rataNum = parseFloat(s.scores?.rata || '0');
                          const { predikat, ket } = getPredikat(rataNum);
                          return (
                            <tr key={idx}>
                              <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                              <td>{s.induk}</td>
                              <td style={{ fontWeight: 600, color: '#1e293b' }}>{s.nama}</td>
                              <td style={{ textAlign: 'center' }}>{s.jk}</td>
                              <td style={{ textAlign: 'center', fontWeight: 800, color: '#0284c7' }}>
                                {s.scores?.rata || '-'}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <span style={{ 
                                  padding: '3px 10px', 
                                  borderRadius: '6px', 
                                  fontWeight: 700, 
                                  fontSize: '0.8rem',
                                  background: predikat === 'A' ? '#dcfce7' : predikat === 'B' ? '#e0f2fe' : predikat === 'C' ? '#fef3c7' : '#fee2e2',
                                  color: predikat === 'A' ? '#15803d' : predikat === 'B' ? '#0369a1' : predikat === 'C' ? '#b45309' : '#b91c1c'
                                }}>
                                  {predikat} {ket !== '-' ? `(${ket})` : ''}
                                </span>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                  <button
                                    onClick={() => setPreviewStudent(s)}
                                    style={{
                                      background: '#f1f5f9',
                                      color: '#475569',
                                      border: '1px solid #cbd5e1',
                                      padding: '6px 12px',
                                      borderRadius: '6px',
                                      cursor: 'pointer',
                                      fontSize: '0.8rem',
                                      fontWeight: 600,
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}
                                    title="Preview Rapor"
                                  >
                                    <i className="fas fa-eye"></i> Preview
                                  </button>
                                  <button
                                    onClick={() => handlePrintSingle(s)}
                                    style={{
                                      background: '#0284c7',
                                      color: 'white',
                                      border: 'none',
                                      padding: '6px 14px',
                                      borderRadius: '6px',
                                      cursor: 'pointer',
                                      fontSize: '0.8rem',
                                      fontWeight: 600,
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '5px'
                                    }}
                                    title="Cetak Rapor Siswa"
                                  >
                                    <i className="fas fa-print"></i> Cetak
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Modal Preview Rapor PK */}
              {previewStudent && (
                <div style={{
                  position: 'fixed',
                  top: 0, left: 0, right: 0, bottom: 0,
                  background: 'rgba(15, 23, 42, 0.7)',
                  zIndex: 9999,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '20px',
                  backdropFilter: 'blur(3px)'
                }}>
                  <div style={{
                    background: 'white',
                    borderRadius: '12px',
                    maxWidth: '850px',
                    width: '100%',
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      padding: '12px 20px',
                      background: '#1e293b',
                      color: 'white',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i className="fas fa-certificate" style={{ color: '#38bdf8' }}></i>
                        Preview Rapor Program Khusus &mdash; {previewStudent.nama}
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handlePrintSingle(previewStudent)}
                          style={{
                            background: '#059669',
                            color: 'white',
                            border: 'none',
                            padding: '6px 14px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <i className="fas fa-print"></i> Cetak Dokumen
                        </button>
                        <button
                          onClick={() => setPreviewStudent(null)}
                          style={{
                            background: '#475569',
                            color: 'white',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '0.85rem'
                          }}
                        >
                          Tutup
                        </button>
                      </div>
                    </div>
                    <div style={{ padding: '24px', overflowY: 'auto', flex: 1, background: '#f8fafc' }}>
                      <div 
                        style={{ background: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
                        dangerouslySetInnerHTML={{ __html: generateRaporHtml(previewStudent) }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          
        </>
      )}

    </div>
  );
}
