'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import styles from './sts.module.css';
import InlineLoading from '@/components/InlineLoading';

interface Siswa {
  id: string;
  nis?: string;
  nisn: string;
  nama: string;
  jenisKelamin: string;
  rombel: string;
  tahunAjaran: string;
  status: string;
  noAbsen?: string;
  noInduk?: string;
}

export default function StsPage() {
  const [activeTab, setActiveTab] = useState<'input' | 'cetak' | 'review'>('input');
  
  // Filters
  const [tahunAjaran, setTahunAjaran] = useState('2026/2027');
  const [semester, setSemester] = useState('Ganjil');
  const [kelas, setKelas] = useState('');
  const [mapel, setMapel] = useState('');
  const [tanggalCetak, setTanggalCetak] = useState(() => new Date().toISOString().split('T')[0]);
  
  // Data
  const [siswaList, setSiswaList] = useState<Siswa[]>([]);
  const [kelasList, setKelasList] = useState<any[]>([]);
  const [allMapel, setAllMapel] = useState<string[]>([]);
  
  // Upload Data
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cetak Rapor Data
  const [gradesData, setGradesData] = useState<any[]>([]);
  const [prosusData, setProsusData] = useState<any[]>([]);
  const [rekapPresensi, setRekapPresensi] = useState<Record<string, { S: number, I: number, A: number }>>({});
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

  // Fetch Mapel dari API Jadwal dan nilai_pk
  useEffect(() => {
    const fetchAllMapels = async () => {
      try {
        const [resPK, resUmum] = await Promise.all([
          (kelas && tahunAjaran) ? fetch(`/api/nilai-pk/mapel?kelas=${encodeURIComponent(kelas)}&tahunAjaran=${encodeURIComponent(tahunAjaran)}&tipe=sts`) : Promise.resolve(null),
          fetch(`/api/jadwal/mapel`)
        ]);

        let combinedMapels = new Set<string>();

        // Tambahkan mapel umum
        if (resUmum) {
          const jsonUmum = await resUmum.json();
          if (jsonUmum.success && jsonUmum.data) {
            jsonUmum.data.forEach((m: any) => m.namaMapel && combinedMapels.add(m.namaMapel));
          }
        }

        // Tambahkan mapel PK (jika kelas dipilih)
        if (resPK) {
          const jsonPK = await resPK.json();
          if (jsonPK.success && jsonPK.data) {
            jsonPK.data.forEach((m: string) => m && combinedMapels.add(m));
          }
        }

        const finalMapels = Array.from(combinedMapels).sort();
        setAllMapel(finalMapels);
        
        if (finalMapels.length > 0) {
          setMapel(finalMapels[0]);
        } else {
          setMapel('');
        }
      } catch (err) {
        console.error('Gagal fetch mapel gabungan', err);
        setAllMapel([]);
        setMapel('');
      }
    };
    fetchAllMapels();
  }, [kelas, tahunAjaran]);

  useEffect(() => {
    if (activeTab === 'cetak' && kelas) {
      fetchGrades();
      fetchRekapPresensi();
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

      // Ambil data kelas
      const resKelas = await fetch('/api/kelas');
      const jsonKelas = await resKelas.json();
      if (jsonKelas.success && jsonKelas.data) {
        setKelasList(jsonKelas.data);
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

      // Fetch Prosus Data (Pengembangan Potensi Minat & Bakat)
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
      
      const prosusName = mapMinatBakat[kelas.toUpperCase().trim()] || '';
      let targetMapels: string[] = [];
      
      if (prosusName === 'SAINS RISET') targetMapels = ['Ilmu Pengetahuan Alam', 'Ilmu Pengetahuan Sosial', 'Matematika', 'Bahasa Indonesia'];
      else if (prosusName === 'OLAHRAGA SENI') targetMapels = ['Pendidikan Jasmani, Olah Raga dan Kesehatan', 'Seni Budaya'];
      else if (prosusName === 'MULTILINGUAL') targetMapels = ['Bahasa Arab', 'Bahasa Indonesia'];
      else if (prosusName === 'KETERAMPILAN KREATIF PRODUKTIF') targetMapels = ['Keterampilan Kreatif Produktif'];
      else if (prosusName === 'AGAMA TAHFIDZ') targetMapels = ['Pendidikan Agama Islam', 'Tahfidh'];

      if (targetMapels.length > 0) {
        const pkRes = await fetch(`/api/nilai-sts/prosus?tahunAjaran=${encodeURIComponent(tahunAjaran)}&kelas=${encodeURIComponent(kelas)}&mapels=${encodeURIComponent(targetMapels.join(','))}`);
        const pkJson = await pkRes.json();
        if (pkJson.success) setProsusData(pkJson.data);
        else setProsusData([]);
      } else {
        setProsusData([]);
      }

    } catch (err) {
      console.error(err);
    } finally {
      setIsFetchingGrades(false);
    }
  };

  const fetchRekapPresensi = async () => {
    try {
      const res = await fetch('/api/presensi');
      const json = await res.json();
      if (json.success && json.data) {
        const grouped = json.data.reduce((acc: any, curr: any) => {
          if ((curr.kelas || '').trim() !== kelas) return acc;
          if ((curr.tahunAjaran || '').trim() !== tahunAjaran) return acc;
          
          const dateStr = curr.tanggal || '';
          if (dateStr) {
            let m = 0;
            if (dateStr.includes('/')) {
              // Usually mm/dd/yyyy or dd/mm/yyyy. Try parsing with Date if possible
              m = new Date(dateStr).getMonth() + 1;
            } else if (dateStr.includes('-')) {
              m = parseInt(dateStr.split('-')[1] || '0', 10);
            }
            if (!isNaN(m) && m > 0) {
              if (semester === 'Ganjil' && (m < 7 || m > 12)) return acc;
              if (semester === 'Genap' && (m < 1 || m > 6)) return acc;
            }
          }

          const nama = (curr.namaSiswa || '').trim().toUpperCase();
          if (!nama) return acc;
          if (!acc[nama]) acc[nama] = { S: 0, I: 0, A: 0 };
          
          const status = curr.kehadiran || '';
          const jams = (curr.jamKe || '').toString().split(',').length;
          
          if (status === 'S' || status.toUpperCase() === 'SAKIT') acc[nama].S += jams;
          else if (status === 'I' || status.toUpperCase() === 'IZIN') acc[nama].I += jams;
          else if (status === 'A' || status.toUpperCase() === 'ALPHA' || status.toUpperCase() === 'TANPA KETERANGAN') acc[nama].A += jams;

          return acc;
        }, {});
        
        Object.keys(grouped).forEach(k => {
          grouped[k].S = Number((grouped[k].S / 10).toFixed(1));
          grouped[k].I = Number((grouped[k].I / 10).toFixed(1));
          grouped[k].A = Number((grouped[k].A / 10).toFixed(1));
        });
        
        setRekapPresensi(grouped);
      }
    } catch (err) {
      console.error('Gagal mengambil presensi', err);
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // FITUR KEAMANAN EKSTRA: Cek kecocokan nama file dengan kelas & mapel
    const safeMapel = mapel.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const fileNameSafe = file.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    
    // Jika nama file tidak mengandung nama kelas atau nama mapel (yang sudah di-sanitize)
    if (!fileNameSafe.includes(kelas.toLowerCase()) || !fileNameSafe.includes(safeMapel)) {
      await Swal.fire({
        title: 'Upload Ditolak',
        html: `File yang Anda upload: <b>${file.name}</b><br><br>Sepertinya tidak cocok dengan dropdown terpilih:<br>Kelas: <b>${kelas}</b><br>Mapel: <b>${mapel}</b><br><br><b>Silakan upload file yang benar agar nilai tidak tertukar!</b>`,
        icon: 'error',
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'Tutup'
      });

      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

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

  const cetakRapor = (siswa: Siswa, idx: number) => {
    // Cari wali kelas dari kelasList
    const targetKelas = kelasList.find(k => k.rombel === siswa.rombel || k.nama_kelas === siswa.rombel);
    const waliKelas = targetKelas?.waliKelas || targetKelas?.wali_kelas || '';
    const waliKelasText = (waliKelas && waliKelas !== '-') ? `<b><u>${waliKelas}</u></b>` : '_________________________';

    // Mapping Minat & Bakat
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
    const minatBakat = mapMinatBakat[siswa.rombel.toUpperCase().trim()] || '';

    let prosusHtml = `
      <tr>
        <td style="text-align:center;border:1px solid #333;padding:5px 4px;">1</td>
        <td style="border:1px solid #333;padding:5px 4px;"></td>
        <td style="border:1px solid #333;padding:5px 4px;"></td>
        <td style="border:1px solid #333;padding:5px 4px;"></td>
        <td style="border:1px solid #333;padding:5px 4px;"></td>
        <td style="border:1px solid #333;padding:5px 4px;"></td>
        <td style="border:1px solid #333;padding:5px 4px;"></td>
        <td style="border:1px solid #333;padding:5px 4px;"></td>
        <td style="border:1px solid #333;padding:5px 4px;"></td>
        <td style="border:1px solid #333;padding:5px 4px;"></td>
      </tr>`;
    
    if (minatBakat) {
      const pkStudent = prosusData.find(p => {
        const idPK = String(p.induk || p.nisn).trim();
        return idPK === String(siswa.nis || '').trim() || 
               idPK === String(siswa.id_siswa || '').trim() || 
               (siswa.nisn && idPK === String(siswa.nisn).trim());
      });
      if (pkStudent) {
        const tp1 = pkStudent.tp1;
        const tp2 = pkStudent.tp2;
        const tp3 = pkStudent.tp3;
        const tp4 = pkStudent.tp4;
        const tp5 = pkStudent.tp5;
        const tp6 = pkStudent.tp6;
        const sts = pkStudent.sts;
        let na = '';
        const tps = [tp1, tp2, tp3, tp4, tp5, tp6].filter(val => val !== '' && !isNaN(Number(val))).map(Number);
        const stsNum = parseFloat(String(sts).replace(',', '.'));
        if (tps.length > 0 && !isNaN(stsNum)) {
           const avgHarian = tps.reduce((a, b) => a + b, 0) / tps.length;
           na = String(Math.round((avgHarian * 0.6) + (stsNum * 0.4)));
        }

        prosusHtml = `<tr>
          <td style="text-align:center;border:1px solid #333;padding:5px 4px;">1</td>
          <td style="border:1px solid #333;padding:5px 4px;padding-left:14px;">${minatBakat}</td>
          <td style="text-align:center;border:1px solid #333;padding:5px 4px;">${tp1}</td>
          <td style="text-align:center;border:1px solid #333;padding:5px 4px;">${tp2}</td>
          <td style="text-align:center;border:1px solid #333;padding:5px 4px;">${tp3}</td>
          <td style="text-align:center;border:1px solid #333;padding:5px 4px;">${tp4}</td>
          <td style="text-align:center;border:1px solid #333;padding:5px 4px;">${tp5}</td>
          <td style="text-align:center;border:1px solid #333;padding:5px 4px;">${tp6}</td>
          <td style="text-align:center;border:1px solid #333;padding:5px 4px;">${sts}</td>
          <td style="text-align:center;border:1px solid #333;padding:5px 4px;">${na}</td>
        </tr>`;
      } else {
        prosusHtml = `<tr>
          <td style="text-align:center;border:1px solid #333;padding:5px 4px;">1</td>
          <td style="border:1px solid #333;padding:5px 4px;padding-left:14px;">${minatBakat}</td>
          <td style="text-align:center;border:1px solid #333;padding:5px 4px;"></td>
          <td style="text-align:center;border:1px solid #333;padding:5px 4px;"></td>
          <td style="text-align:center;border:1px solid #333;padding:5px 4px;"></td>
          <td style="text-align:center;border:1px solid #333;padding:5px 4px;"></td>
          <td style="text-align:center;border:1px solid #333;padding:5px 4px;"></td>
          <td style="text-align:center;border:1px solid #333;padding:5px 4px;"></td>
          <td style="text-align:center;border:1px solid #333;padding:5px 4px;"></td>
          <td style="text-align:center;border:1px solid #333;padding:5px 4px;"></td>
        </tr>`;
      }
    }

    // Helper: cari nilai siswa dari data per mapel
    const getNilai = (mapelName: string) => {
      const doc = gradesData.find(d => d.mata_pelajaran.toLowerCase().trim() === mapelName.toLowerCase().trim());
      if (!doc) return { tp1: '', tp2: '', tp3: '', tp4: '', tp5: '', tp6: '', sts: '', na: '' };
      const keys = Object.keys(doc.data_nilai?.[0] || {});
      const nisnKey = keys.find(k => k.trim().toLowerCase() === 'nisn');
      const nameKey = keys.find(k => k.trim().toLowerCase().includes('nama'));
      const baris = doc.data_nilai?.find((n: any) =>
        (nisnKey && String(n[nisnKey]).trim() === String(siswa.nisn).trim()) ||
        (nameKey && n[nameKey]?.toString().toUpperCase().trim() === siswa.nama.toUpperCase().trim())
      );
      if (!baris) return { tp1: '', tp2: '', tp3: '', tp4: '', tp5: '', tp6: '', sts: '', na: '' };

      const calcAvg = (materiIndex: number) => {
        let sum = 0;
        let count = 0;
        for (let s = 1; s <= 3; s++) {
          const val = baris[`MATERI ${materiIndex} S${s}`] ?? baris[`Materi ${materiIndex} S${s}`];
          if (val !== undefined && val !== null && val !== '') {
            const num = parseFloat(String(val).replace(',', '.'));
            if (!isNaN(num)) {
              sum += num;
              count++;
            }
          }
        }
        if (count === 0) return '';
        return Math.round(sum / count);
      };

      const tp1 = baris['TP1'] ?? baris['tp1'] ?? calcAvg(1);
      const tp2 = baris['TP2'] ?? baris['tp2'] ?? calcAvg(2);
      const tp3 = baris['TP3'] ?? baris['tp3'] ?? calcAvg(3);
      const tp4 = baris['TP4'] ?? baris['tp4'] ?? calcAvg(4);
      const tp5 = baris['TP5'] ?? baris['tp5'] ?? calcAvg(5);
      const tp6 = baris['TP6'] ?? baris['tp6'] ?? calcAvg(6);
      const sts = baris['SUMATIF TENGAH SEMESTER'] ?? baris['STS'] ?? baris['Nilai STS'] ?? baris['NILAI STS'] ?? '';

      let na = baris['NILAI AKHIR'] ?? baris['Nilai Akhir'] ?? baris['NA'] ?? '';

      const tps = [tp1, tp2, tp3, tp4, tp5, tp6].filter(val => val !== '' && !isNaN(Number(val))).map(Number);
      const stsNum = parseFloat(String(sts).replace(',', '.'));

      if (tps.length > 0 && !isNaN(stsNum)) {
        const avgHarian = tps.reduce((a, b) => a + b, 0) / tps.length;
        // Asumsi proporsi 60% harian dan 40% STS (agar total 100%)
        na = Math.round((avgHarian * 0.6) + (stsNum * 0.4));
      }

      return { tp1, tp2, tp3, tp4, tp5, tp6, sts, na };
    };

    // mkRow: only sub-mapel gets indent; main rows (2-10) and sub-mapel both are NOT bold
    const mkRow = (no: string | number, nama: string, mapelKey: string, isSubMapel = false) => {
      const v = getNilai(mapelKey);
      const nameStyle = isSubMapel ? 'padding-left: 14px;' : '';
      const B = 'border:1px solid #333;';
      const P = 'padding:5px 4px;';
      return `<tr>
        <td style="text-align:center;${B}${P}">${no}</td>
        <td style="${B}${P}${nameStyle}">${nama}</td>
        <td style="text-align:center;${B}${P}">${v.tp1}</td>
        <td style="text-align:center;${B}${P}">${v.tp2}</td>
        <td style="text-align:center;${B}${P}">${v.tp3}</td>
        <td style="text-align:center;${B}${P}">${v.tp4}</td>
        <td style="text-align:center;${B}${P}">${v.tp5}</td>
        <td style="text-align:center;${B}${P}">${v.tp6}</td>
        <td style="text-align:center;${B}${P}font-weight:bold;">${v.sts}</td>
        <td style="text-align:center;${B}${P}font-weight:bold;">${v.na}</td>
      </tr>`;
    };

    const mkGroupHeader = (label: string) => `<tr>
      <td colspan="10" style="border:1px solid #333;padding:5px 5px;font-weight:bold;background:#f5f5f5;">${label}</td>
    </tr>`;

    const logoUrl = '/logo.png';
    const cetakDate = new Date(tanggalCetak);
    const bulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    const tanggal = `${cetakDate.getDate()} ${bulan[cetakDate.getMonth()]} ${cetakDate.getFullYear()}`;

    // Cari data presensi
    const presensi = rekapPresensi[siswa.nama.toUpperCase().trim()] || { S: 0, I: 0, A: 0 };

    const html = `
      <html>
        <head>
          <title>Rapor STS - ${siswa.nama}</title>
          <style>
            @page { size: A4 portrait; margin: 10mm 10mm 10mm 15mm; }
            body { font-family: 'Times New Roman', Times, serif; font-size: 9.5pt; color: #000; margin: 0; }
            table { border-collapse: collapse; }
            .kop { display: flex; align-items: center; border-bottom: 3px double #000; padding-bottom: 4px; margin-bottom: 6px; }
            .kop img { width: 60px; height: 60px; margin-right: 12px; }
            .kop-text { text-align: center; flex: 1; }
            .kop-text .instansi { font-size: 7.5pt; }
            .kop-text .yayasan { font-size: 9pt; font-weight: bold; }
            .kop-text .sekolah { font-size: 12pt; font-weight: bold; }
            .kop-text .alamat { font-size: 7.5pt; }
            .judul { text-align: center; font-weight: bold; font-size: 11pt; border: 1px solid #000; padding: 4px; margin: 6px 0; }
            .info { width: 100%; margin-bottom: 6px; font-size: 9.5pt; }
            .info td { padding: 1px 4px; }
            .section-label { font-weight: bold; margin: 4px 0 2px 0; font-size: 9.5pt; }
            .nilai-table { width: 100%; border-collapse: collapse; font-size: 8.5pt; margin-bottom: 6px; }
            .nilai-table th { background: #ddd; border: 1px solid #333; padding: 3px 2px; text-align: center; }
            .nilai-table td { border: 1px solid #333; }
            .absent-table { width: 100%; border-collapse: collapse; font-size: 8.5pt; margin-bottom: 8px; }
            .absent-table td, .absent-table th { border: 1px solid #333; padding: 4px 5px; }
            .ttd { width: 88%; margin: 22px auto 0 auto; font-size: 9.5pt; }
            .ttd td { width: 50%; vertical-align: top; padding-top: 4px; }
            @media print { body { -webkit-print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <!-- KOP SURAT -->
          <div class="kop">
            <img src="${logoUrl}" alt="Logo">
            <div class="kop-text">
              <div class="instansi">KEMENTERIAN AGAMA REPUBLIK INDONESIA</div>
              <div class="yayasan">YAYASAN PENDIDIKAN ALMAARIF SINGOSARI</div>
              <div class="sekolah">MADRASAH TSANAWIYAH ALMAARIF 01 SINGOSARI</div>
              <div class="alamat">Jl. Masjid No. 33 Singosari. Telp. 0341-458355</div>
            </div>
          </div>

          <!-- JUDUL -->
          <div class="judul">LAPORAN HASIL SUMATIF TENGAH SEMESTER (STS)</div>

          <!-- INFO SISWA: right side aligned with ~TP5 (≈55% from left) -->
          <table class="info">
            <colgroup>
              <col style="width:12%"><col style="width:1%"><col style="width:40%">
              <col style="width:2%">
              <col style="width:16%"><col style="width:1%"><col>
            </colgroup>
            <tr>
              <td>No.Absen</td><td>:</td><td>${idx + 1}</td>
              <td></td>
              <td>Kelas</td><td>:</td><td>${siswa.rombel}</td>
            </tr>
            <tr>
              <td>Nama Siswa</td><td>:</td><td>${siswa.nama}</td>
              <td></td>
              <td>Semester</td><td>:</td><td>${semester}</td>
            </tr>
            <tr>
              <td>No.Induk</td><td>:</td><td>${siswa.nis || siswa.id || '-'}</td>
              <td></td>
              <td>Tahun Pelajaran</td><td>:</td><td>${tahunAjaran}</td>
            </tr>
            <tr>
              <td>NISN</td><td>:</td><td>${siswa.nisn || '-'}</td>
              <td></td><td></td><td></td><td></td>
            </tr>
          </table>

          <!-- TABEL NILAI -->
          <div class="section-label">CAPAIAN</div>
          <table class="nilai-table">
            <thead>
              <tr>
                <th rowspan="2" style="width:3%;">No</th>
                <th rowspan="2" style="width:24%; text-align:left; padding-left:6px;">Mata Pelajaran</th>
                <th colspan="6">NILAI SUMATIF HARIAN</th>
                <th rowspan="2" style="width:11%;">SUMATIF TENGAH SEMESTER</th>
                <th rowspan="2" style="width:9%;">NILAI</th>
              </tr>
              <tr>
                <th style="width:7%;">TP1</th>
                <th style="width:7%;">TP2</th>
                <th style="width:7%;">TP3</th>
                <th style="width:7%;">TP4</th>
                <th style="width:7%;">TP5</th>
                <th style="width:7%;">TP6</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="text-align:center;border:1px solid #333;padding:5px 4px;font-weight:bold;">1</td>
                <td colspan="9" style="border:1px solid #333;padding:5px 5px;font-weight:bold;">Pendidikan Agama Islam</td>
              </tr>
              ${mkRow('', 'a. Alquran Hadis', 'Alquran Hadis', true)}
              ${mkRow('', 'b. Akidah Akhlak', 'Akidah Akhlak', true)}
              ${mkRow('', 'c. Fikih', 'Fikih', true)}
              ${mkRow('', 'd. Sejarah Kebudayaan Islam', 'Sejarah Kebudayaan Islam', true)}
              ${mkRow(2, 'Pendidikan Pancasila', 'Pendidikan Pancasila')}
              ${mkRow(3, 'Bahasa Indonesia', 'Bahasa Indonesia')}
              ${mkRow(4, 'Bahasa Arab', 'Bahasa Arab')}
              ${mkRow(5, 'Matematika', 'Matematika')}
              ${mkRow(6, 'Ilmu Pengetahuan Alam', 'Ilmu Pengetahuan Alam')}
              ${mkRow(7, 'Ilmu Pengetahuan Sosial', 'Ilmu Pengetahuan Sosial')}
              ${mkRow(8, 'Bahasa Inggris', 'Bahasa Inggris')}
              ${mkRow(9, 'Pendidikan Jasmani, Olah Raga dan Kesehatan', 'Pendidikan Jasmani, Olah Raga dan Kesehatan')}
              ${mkRow(10, 'Informatika', 'Informatika')}

              ${mkGroupHeader('Mata Pelajaran Pilihan')}
              ${mkRow(1, 'Seni Budaya', 'Seni Budaya', true)}
              ${mkRow(2, 'Prakarya', 'Prakarya', true)}

              ${mkGroupHeader('Muatan Lokal')}
              ${mkRow(1, 'Bahasa Daerah', 'Bahasa Daerah', true)}
              ${mkRow(2, 'KE-NU-AN', 'KE-NU-AN', true)}

              ${mkGroupHeader('Pengembangan Potensi Minat &amp; Bakat')}
              ${prosusHtml}
            </tbody>
          </table>

          <!-- KETIDAKHADIRAN -->
          <table class="absent-table">
            <tr>
              <td colspan="2" style="font-weight:bold;background:#f5f5f5;">Ketidakhadiran</td>
            </tr>
            <tr>
              <td style="width:20%;">1 &nbsp; Sakit</td>
              <td style="width:80%;">${presensi.S > 0 ? presensi.S + ' hari' : '-'}</td>
            </tr>
            <tr>
              <td>2 &nbsp; Izin</td>
              <td>${presensi.I > 0 ? presensi.I + ' hari' : '-'}</td>
            </tr>
            <tr>
              <td>3 &nbsp; Tanpa Keterangan</td>
              <td>${presensi.A > 0 ? presensi.A + ' hari' : '-'}</td>
            </tr>
          </table>

          <!-- TTD -->
          <table class="ttd">
            <tr>
              <td>Mengetahui:<br>Orang Tua/Wali<br><br><br><br><br>_________________________</td>
              <td style="text-align:right;">Singosari, ${tanggal}<br>Wali Kelas:<br><br><br><br><br>${waliKelasText}</td>
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
          {activeTab === 'cetak' && (
            <div className={styles.filterGroup}>
              <label>Tanggal Cetak</label>
              <input 
                type="date" 
                className={styles.select} 
                value={tanggalCetak} 
                onChange={e => setTanggalCetak(e.target.value)} 
              />
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
                          onClick={() => cetakRapor(s, i)}
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
          <tr><td colSpan={5} style={{ textAlign: 'center' }}><InlineLoading message="Memuat data..." /></td></tr>
        ) : reviewData.length > 0 ? (
                  reviewData.map((d, i) => (
                    <tr key={`${d.id}-${d.source}`}>
                      <td>{i + 1}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{fontWeight: 600}}>{d.mata_pelajaran}</span>
                          {d.source === 'PK' ? (
                            <span style={{ fontSize: '0.65rem', background: '#e0e7ff', color: '#4338ca', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', border: '1px solid #c7d2fe' }}>NILAI PK</span>
                          ) : (
                            <span style={{ fontSize: '0.65rem', background: '#dcfce7', color: '#16a34a', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', border: '1px solid #bbf7d0' }}>NILAI STS</span>
                          )}
                        </div>
                      </td>
                      <td>{Array.isArray(d.data_nilai) ? d.data_nilai.length : 0} Siswa</td>
                      <td>{d.updated_at ? new Date(d.updated_at).toLocaleString('id-ID') : '-'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button 
                            className={styles.btnPrimary} 
                            style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                            onClick={() => { setViewingGrade(d); setEditingGradeId(null); }}
                          >
                            <i className="fas fa-eye"></i> Lihat
                          </button>
                          {d.source !== 'PK' && (
                            <>
                              <button 
                                className={styles.btnPrimary} 
                                style={{ padding: '6px 12px', fontSize: '0.85rem', background: '#eab308' }}
                                onClick={() => { 
                                  setViewingGrade(d); 
                                  setEditingGradeId(d.id); 
                                  setEditedNilaiData(JSON.parse(JSON.stringify(d.data_nilai || []))); 
                                }}
                                title="Edit Nilai"
                              >
                                <i className="fas fa-edit"></i>
                              </button>
                              <button 
                                className={styles.btnOutline} 
                                style={{ padding: '6px 12px', fontSize: '0.85rem', borderColor: '#ef4444', color: '#ef4444' }}
                                onClick={() => handleDeleteGrade(d.id, d.mata_pelajaran)}
                                title="Hapus"
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            </>
                          )}
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
