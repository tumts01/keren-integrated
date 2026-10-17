'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';

// Rangkuman Biaya Pendaftaran Olimpiade dan Lomba Seni 2026:
// - Olimpiade (Matematika, IPAS, PAI, Bahasa Arab, Bahasa Inggris):
//   Babak Penyisihan: Gratis (tidak dikenai biaya).
//   Babak Final: Rp50.000 per peserta (khusus bagi peserta yang lolos ke final).
// - Lomba Singer: Rp50.000 per peserta.
// - Lomba Seni Al-Banjari: Rp100.000 per grup.
// - Lomba Pramuka SMS (Sandi, Morse, Semaphore): Rp50.000 per tim.

export const INFO_BANK = {
  bank: 'BCA',
  noRek: '3686518888',
  atasNama: 'MTs Almaarif 01 Singosari'
};

export const formatRupiah = (val: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
};

export function getBiayaIndividu(lomba: string) {
  const l = (lomba || '').toLowerCase();
  if (l.includes('singer') || l.includes('solo')) {
    return { tarif: 50000, satuan: 'peserta', keterangan: 'Biaya Pendaftaran: Rp50.000 / peserta', isGratis: false, subtotal: 50000 };
  }
  if (l.includes('banjari')) {
    return { tarif: 100000, satuan: 'grup', keterangan: 'Biaya Pendaftaran: Rp100.000 / grup', isGratis: false, subtotal: 100000 };
  }
  if (l.includes('sandi') || l.includes('morse') || l.includes('sms')) {
    return { tarif: 50000, satuan: 'tim', keterangan: 'Biaya Pendaftaran: Rp50.000 / tim', isGratis: false, subtotal: 50000 };
  }
  // Olimpiade Akademik
  return { 
    tarif: 0, 
    satuan: 'peserta', 
    keterangan: 'Babak Penyisihan: Gratis (tidak dikenai biaya). Babak Final: Rp50.000 per peserta (khusus bagi peserta yang lolos ke final).', 
    isGratis: true,
    subtotal: 0
  };
}

export function hitungBiayaKolektif(excelRows: any[]) {
  let countSinger = 0;
  const banjariGrupSet = new Set<string>();
  let banjariTanpaGrup = 0;
  const smsTimSet = new Set<string>();
  let smsTanpaTim = 0;
  let countOlimpiade = 0;
  const olimpiadeMap: Record<string, number> = {};

  excelRows.forEach((row) => {
    let namaLomba = row['LOMBA YANG DIPILIH'];
    if (!namaLomba) {
      for (const k of Object.keys(row)) {
        if (k.toLowerCase().includes('lomba')) {
          namaLomba = row[k];
          break;
        }
      }
    }
    const l = String(namaLomba || '').toLowerCase().trim();

    let regu = row['NAMA REGU/GRUP (KHUSUS LOMBA BEREGU)'];
    if (!regu) {
      for (const k of Object.keys(row)) {
        if (k.toLowerCase().includes('regu') || k.toLowerCase().includes('grup')) {
          regu = row[k];
          break;
        }
      }
    }
    const reguStr = String(regu || '').trim();

    if (l.includes('singer') || l.includes('solo')) {
      countSinger++;
    } else if (l.includes('banjari')) {
      if (reguStr) {
        banjariGrupSet.add(reguStr.toLowerCase());
      } else {
        banjariTanpaGrup++;
      }
    } else if (l.includes('sandi') || l.includes('morse') || l.includes('sms')) {
      if (reguStr) {
        smsTimSet.add(reguStr.toLowerCase());
      } else {
        smsTanpaTim++;
      }
    } else {
      countOlimpiade++;
      let mapel = 'Matematika';
      if (l.includes('ipa') || l.includes('ipas')) mapel = 'IPAS';
      else if (l.includes('pai') || l.includes('agama')) mapel = 'PAI';
      else if (l.includes('inggris') || l.includes('english')) mapel = 'Inggris';
      else if (l.includes('arab')) mapel = 'Arab';
      olimpiadeMap[mapel] = (olimpiadeMap[mapel] || 0) + 1;
    }
  });

  const totalGrupBanjari = banjariGrupSet.size + (banjariTanpaGrup > 0 ? 1 : 0);
  const totalTimSms = smsTimSet.size + (smsTanpaTim > 0 ? 1 : 0);

  const rincian: {
    lomba: string;
    detail: string;
    jumlah: number;
    satuan: string;
    tarif: number;
    subtotal: number;
    keterangan: string;
    isGratis: boolean;
  }[] = [];

  if (countOlimpiade > 0) {
    const detailMapel = Object.entries(olimpiadeMap).map(([m, c]) => `${c} ${m}`).join(', ');
    rincian.push({
      lomba: 'Olimpiade Akademik',
      detail: detailMapel || `${countOlimpiade} peserta`,
      jumlah: countOlimpiade,
      satuan: 'peserta',
      tarif: 0,
      subtotal: 0,
      keterangan: 'Babak Penyisihan: Gratis (Final: Rp50.000 jika lolos)',
      isGratis: true
    });
  }

  if (countSinger > 0) {
    rincian.push({
      lomba: 'Singer (solo)',
      detail: `${countSinger} peserta`,
      jumlah: countSinger,
      satuan: 'peserta',
      tarif: 50000,
      subtotal: countSinger * 50000,
      keterangan: 'Rp50.000 / peserta',
      isGratis: false
    });
  }

  if (totalGrupBanjari > 0) {
    const grupNames = Array.from(banjariGrupSet);
    const detailBanjari = [
      ...grupNames,
      ...(banjariTanpaGrup > 0 ? [`${banjariTanpaGrup} peserta`] : [])
    ].join(', ');
    rincian.push({
      lomba: 'Lomba Seni Al-Banjari',
      detail: `${totalGrupBanjari} grup (${detailBanjari})`,
      jumlah: totalGrupBanjari,
      satuan: 'grup',
      tarif: 100000,
      subtotal: totalGrupBanjari * 100000,
      keterangan: 'Rp100.000 / grup',
      isGratis: false
    });
  }

  if (totalTimSms > 0) {
    const timNames = Array.from(smsTimSet);
    const detailSms = [
      ...timNames,
      ...(smsTanpaTim > 0 ? [`${smsTanpaTim} peserta`] : [])
    ].join(', ');
    rincian.push({
      lomba: 'Lomba Pramuka SMS (Sandi, Morse, Semaphore)',
      detail: `${totalTimSms} tim (${detailSms})`,
      jumlah: totalTimSms,
      satuan: 'tim',
      tarif: 50000,
      subtotal: totalTimSms * 50000,
      keterangan: 'Rp50.000 / tim',
      isGratis: false
    });
  }

  const totalBiaya = rincian.reduce((acc, curr) => acc + curr.subtotal, 0);

  return {
    totalBiaya,
    countOlimpiade,
    countSinger,
    totalGrupBanjari,
    totalTimSms,
    totalPeserta: excelRows.length,
    rincian
  };
}

export default function PendaftaranOlimpiadeSeni() {
  const router = useRouter();
  const [jenisPendaftaran, setJenisPendaftaran] = useState<'individu' | 'kolektif' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isBuka, setIsBuka] = useState(true);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    fetch('/api/olimpiade-seni/config-pendaftaran')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.pendaftaran_buka !== undefined) {
          setIsBuka(data.pendaftaran_buka);
        }
      })
      .catch(() => {})
      .finally(() => setIsChecking(false));
  }, []);

  // State for Individu
  const [form, setForm] = useState({
    nama: '',
    nisn: '',
    noWa: '',
    namaSekolah: '',
    kelas: '',
    kategori: 'Olimpiade Akademik',
    lombaDipilih: 'Matematika',
    namaRegu: ''
  });
  const [loading, setLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [buktiIndividu, setBuktiIndividu] = useState<File | null>(null);
  const [buktiSsIndividu, setBuktiSsIndividu] = useState<File | null>(null);
  const [buktiKolektif, setBuktiKolektif] = useState<File | null>(null);
  const [buktiSsKolektif, setBuktiSsKolektif] = useState<File | null>(null);
  const [formKolektif, setFormKolektif] = useState({
    asalSekolah: '',
    noWa: ''
  });
  const [kolektifKategori, setKolektifKategori] = useState<'Olimpiade Akademik' | 'Lomba Seni'>('Olimpiade Akademik');
  const [kolektifLombaDipilih, setKolektifLombaDipilih] = useState('Matematika');
  const [kolektifLombaList, setKolektifLombaList] = useState<string[]>([]);
  const [biayaKolektif, setBiayaKolektif] = useState<ReturnType<typeof hitungBiayaKolektif> | null>(null);

  const lombaOptions = {
    'Olimpiade Akademik': ['Matematika', 'IPAS', 'PAI', 'Inggris', 'Arab'],
    'Lomba Seni': ['Singer (solo)', 'Al Banjari', 'Sandi Morse Semaphore (SMS)']
  };

  const handleKategoriChange = (kat: 'Olimpiade Akademik' | 'Lomba Seni') => {
    setForm({
      ...form,
      kategori: kat,
      lombaDipilih: lombaOptions[kat][0],
      namaRegu: '' // Reset regu
    });
  };

  const handleKolektifKategoriChange = (kat: 'Olimpiade Akademik' | 'Lomba Seni') => {
    setKolektifKategori(kat);
    setKolektifLombaDipilih(lombaOptions[kat][0]);
  };

  const handleAddKolektifLomba = () => {
    if (!kolektifLombaList.includes(kolektifLombaDipilih)) {
      setKolektifLombaList([...kolektifLombaList, kolektifLombaDipilih]);
    }
  };

  const handleRemoveKolektifLomba = (lomba: string) => {
    setKolektifLombaList(kolektifLombaList.filter(item => item !== lomba));
  };

  const renderBankCard = () => (
    <div style={{
      background: '#ffffff',
      border: '1.5px solid #bfdbfe',
      borderRadius: '10px',
      padding: '12px 16px',
      margin: '12px 0 16px 0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '12px',
      textAlign: 'left',
      boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: '8px',
          background: '#005baa',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 900,
          fontSize: '0.95rem',
          letterSpacing: '0.5px',
          flexShrink: 0
        }}>
          BCA
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
            Rekening Transfer Resmi
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', letterSpacing: '0.5px', lineHeight: 1.2 }}>
            {INFO_BANK.noRek}
          </div>
          <div style={{ fontSize: '0.84rem', color: '#334155', fontWeight: 600 }}>
            a.n. {INFO_BANK.atasNama}
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(INFO_BANK.noRek);
          Swal.fire({
            icon: 'success',
            title: 'Tersalin!',
            text: `Nomor rekening ${INFO_BANK.bank} ${INFO_BANK.noRek} berhasil disalin ke clipboard.`,
            timer: 1500,
            showConfirmButton: false
          });
        }}
        style={{
          padding: '8px 14px',
          borderRadius: '6px',
          background: '#eff6ff',
          color: '#0284c7',
          border: '1px solid #bfdbfe',
          fontSize: '0.82rem',
          fontWeight: 700,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          transition: 'all 0.2s'
        }}
      >
        <i className="fas fa-copy"></i> Salin No. Rekening
      </button>
    </div>
  );

  const handleSubmitIndividu = async (e: React.FormEvent) => {
    e.preventDefault();
    const biayaInfo = getBiayaIndividu(form.lombaDipilih);
    if (!biayaInfo.isGratis && !buktiIndividu) {
      Swal.fire('Peringatan', `Bukti pembayaran wajib diunggah untuk pendaftaran ${form.lombaDipilih} (${formatRupiah(biayaInfo.subtotal)})!`, 'warning');
      return;
    }
    if (!buktiSsIndividu) {
      Swal.fire('Peringatan', 'Bukti Screenshot Share Poster wajib diunggah!', 'warning');
      return;
    }
    setLoading(true);
    Swal.fire({
      title: 'Memproses Pendaftaran...',
      text: 'Mohon tunggu, data sedang dikirim ke server.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      const formData = new FormData();
      formData.append('jenisPendaftaran', 'individu');
      formData.append('totalBiaya', String(biayaInfo.subtotal));
      formData.append('rincianBiaya', JSON.stringify(biayaInfo));
      if (buktiIndividu) {
        formData.append('buktiPembayaran', buktiIndividu);
      }
      if (buktiSsIndividu) {
        formData.append('buktiSs', buktiSsIndividu);
      }
      
      Object.keys(form).forEach(key => {
        formData.append(key, (form as any)[key]);
      });

      const res = await fetch('/api/olimpiade-seni/daftar', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (data.success) {
        localStorage.setItem('cetak_kartu_data', JSON.stringify(data.pesertaData));
        Swal.fire('Berhasil!', 'Pendaftaran Individu Berhasil!', 'success').then(() => {
          router.push('/olimpiade-seni/kartu');
        });
      } else {
        Swal.fire('Gagal', 'Gagal mendaftar: ' + data.error, 'error');
      }
    } catch (err: any) {
      Swal.fire('Error', 'Terjadi kesalahan sistem: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const isDummyOrInstructionRow = (row: any): boolean => {
    if (!row) return true;
    const str = Object.values(row).map(v => String(v ?? '').trim()).join(' ').toLowerCase();

    // Baris instruksi / catatan penting
    if (str.includes('*** penting') || str.includes('pilihan "lomba') || str.includes('tanpa typo')) {
      return true;
    }

    // Baris contoh template bawaan
    if (str.includes('ahmad budi') || str.includes('0123456789') || str.includes('sdit ahmad yani') || str.includes('grup al-banjari') || str.includes('grup shalawat a')) {
      return true;
    }

    // Cari apakah ada nama dan lomba
    let nama = '';
    let lomba = '';
    for (const [k, v] of Object.entries(row)) {
      const key = k.toLowerCase();
      if (key.includes('nama') && !key.includes('sekolah') && !key.includes('sd') && !key.includes('regu')) {
        nama = String(v ?? '').trim();
      }
      if (key.includes('lomba')) {
        lomba = String(v ?? '').trim();
      }
    }

    if (!nama && !lomba) return true;
    if (nama.toLowerCase().includes('contoh') || nama.toLowerCase().includes('sample') || nama.toLowerCase().includes('dummy')) {
      return true;
    }

    return false;
  };

  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Form Pendaftaran (BERSIH - Hanya Header Kolom, siap diisi tanpa dummy data)
    const formHeaders = [
      ['NO', 'NAMA LENGKAP SISWA', 'NISN', 'NAMA SD/MI', 'NPSN SD/MI', 'KELAS', 'LOMBA YANG DIPILIH', 'NAMA REGU/GRUP (KHUSUS LOMBA BEREGU)']
    ];
    const wsForm = XLSX.utils.aoa_to_sheet(formHeaders);
    wsForm['!cols'] = [
      { wch: 6 }, { wch: 30 }, { wch: 18 }, { wch: 30 }, { wch: 15 }, { wch: 10 }, { wch: 32 }, { wch: 35 }
    ];
    XLSX.utils.book_append_sheet(wb, wsForm, "Form Pendaftaran");

    // Sheet 2: Petunjuk & Contoh Pengisian (Terpisah agar tidak ikut terupload sebagai data)
    const petunjukData = [
      ['PETUNJUK PENGISIAN TEMPLATE KOLEKTIF OLIMPIADE & LOMBA SENI'],
      [''],
      ['1. Isi data calon peserta hanya pada Sheet "Form Pendaftaran".'],
      ['2. Kolom "LOMBA YANG DIPILIH" WAJIB diisi sama persis dengan nama resmi di bawah ini (tanpa typo):'],
      ['   - Matematika'],
      ['   - IPAS'],
      ['   - PAI'],
      ['   - Inggris'],
      ['   - Arab'],
      ['   - Singer (solo)'],
      ['   - Al Banjari'],
      ['   - Sandi Morse Semaphore (SMS)'],
      ['3. Kolom "NAMA REGU/GRUP" hanya diisi untuk cabang beregu (Al Banjari atau SMS). Untuk lomba mapel/solo dikosongkan.'],
      ['4. Akun CBT (Username & Password) untuk lomba akademik akan di-generate otomatis oleh sistem setelah upload.'],
      ['5. Rekening transfer pendaftaran Lomba Seni: BCA 3686518888 a.n. MTs Almaarif 01 Singosari.'],
      [''],
      ['CONTOH PENGISIAN YANG BENAR (Lihat di bawah ini, JANGAN isi di sheet ini):'],
      ['NO', 'NAMA LENGKAP SISWA', 'NISN', 'NAMA SD/MI', 'NPSN SD/MI', 'KELAS', 'LOMBA YANG DIPILIH', 'NAMA REGU/GRUP'],
      [1, 'Fulan bin Fulan', '0081234567', 'MIN 1 Malang', '20500000', '6', 'Matematika', ''],
      [2, 'Grup Shalawat Al-Ikhlas', '-', 'SDIT Harapan', '20511111', '5', 'Al Banjari', 'Grup Al-Ikhlas A']
    ];
    const wsPetunjuk = XLSX.utils.aoa_to_sheet(petunjukData);
    wsPetunjuk['!cols'] = [
      { wch: 6 }, { wch: 30 }, { wch: 18 }, { wch: 30 }, { wch: 15 }, { wch: 10 }, { wch: 32 }, { wch: 35 }
    ];
    XLSX.utils.book_append_sheet(wb, wsPetunjuk, "Petunjuk & Contoh");

    XLSX.writeFile(wb, "Template_Pendaftaran_Kolektif.xlsx");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      try {
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array' });
        const sheetName = wb.SheetNames.includes('Form Pendaftaran') ? 'Form Pendaftaran' : wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const rawExcelData = XLSX.utils.sheet_to_json<any>(ws);

        // Filter baris contoh dummy atau baris petunjuk secara otomatis
        const excelData = rawExcelData.filter((row: any) => !isDummyOrInstructionRow(row));

        if (excelData.length === 0) {
          Swal.fire({
            icon: 'warning',
            title: 'File Excel Kosong!',
            text: 'Tidak ditemukan data siswa yang valid di dalam file Excel. Silakan isi data peserta pada sheet Form Pendaftaran.'
          });
          if (fileInputRef.current) fileInputRef.current.value = '';
          setUploadedFile(null);
          setKolektifLombaList([]);
          setBiayaKolektif(null);
          return;
        }

        const validLomba = [...lombaOptions['Olimpiade Akademik'], ...lombaOptions['Lomba Seni']];
        const errorMsgs: string[] = [];
        const uniqueLombas = new Set<string>();
        
        excelData.forEach((row: any, index: number) => {
          let namaLomba = row['LOMBA YANG DIPILIH'];
          if (!namaLomba) {
            for (const key of Object.keys(row)) {
              if (key.toLowerCase().includes('lomba')) {
                namaLomba = row[key];
                break;
              }
            }
          }

          if (namaLomba && typeof namaLomba === 'string') {
            const trimmed = namaLomba.trim();
            const matched = validLomba.find(v => v.toLowerCase() === trimmed.toLowerCase());
            if (!matched) {
              errorMsgs.push(`Baris ke-${index + 2}: "${trimmed}"`);
            } else {
              uniqueLombas.add(matched);
            }
          }
        });

        if (errorMsgs.length > 0) {
          Swal.fire({
            icon: 'error',
            title: 'Gagal Upload!',
            html: `Ditemukan penulisan jenis lomba yang tidak sesuai/typo di dalam Excel:<br><br><div style="text-align: left; background: #fee2e2; padding: 10px; border-radius: 8px; max-height: 200px; overflow-y: auto;">${errorMsgs.join('<br>')}</div><br>Silakan perbaiki excelnya (sesuaikan dengan nama lomba resmi) dan upload ulang.`
          });
          
          if (fileInputRef.current) fileInputRef.current.value = '';
          setUploadedFile(null);
          setKolektifLombaList([]);
          setBiayaKolektif(null);
          return;
        }

        const dummyIgnoredCount = rawExcelData.length - excelData.length;
        if (dummyIgnoredCount > 0) {
          Swal.fire({
            icon: 'info',
            title: 'Excel Berhasil Dibaca',
            html: `Terdeteksi <b>${excelData.length} peserta valid</b>.<br><small style="color: #64748b;">(${dummyIgnoredCount} baris contoh/instruksi otomatis diabaikan sistem)</small>`,
            timer: 2500,
            showConfirmButton: false
          });
        }

        const kalkulasi = hitungBiayaKolektif(excelData);
        setBiayaKolektif(kalkulasi);
        setKolektifLombaList(Array.from(uniqueLombas));
        setUploadedFile(file);
      } catch (err) {
        Swal.fire('Gagal', 'Gagal membaca file Excel. Pastikan formatnya benar.', 'error');
        if (fileInputRef.current) fileInputRef.current.value = '';
        setUploadedFile(null);
        setBiayaKolektif(null);
      }
    }
  };

  const handleSubmitKolektif = async () => {
    if (!formKolektif.asalSekolah || kolektifLombaList.length === 0) {
      Swal.fire('Peringatan', 'Silakan isi Asal Sekolah dan unggah file Excel data peserta!', 'warning');
      return;
    }
    if (!uploadedFile) {
      Swal.fire('Peringatan', 'Silakan pilih file Excel terlebih dahulu!', 'warning');
      return;
    }
    const totalBiaya = biayaKolektif ? biayaKolektif.totalBiaya : 0;
    const isSeniSelected = kolektifLombaList.some(l => lombaOptions['Lomba Seni'].includes(l));
    if (totalBiaya > 0 && !buktiKolektif) {
      Swal.fire('Peringatan', `Bukti pembayaran wajib diunggah karena total biaya pendaftaran Lomba Seni adalah ${formatRupiah(totalBiaya)}!`, 'warning');
      return;
    }
    if (!buktiSsKolektif) {
      Swal.fire('Peringatan', 'Bukti Screenshot Share Poster wajib diunggah!', 'warning');
      return;
    }
    
    setLoading(true);
    Swal.fire({
      title: 'Memproses Pendaftaran...',
      text: 'Mohon tunggu, data sedang dikirim ke server.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      const formData = new FormData();
      formData.append('jenisPendaftaran', 'kolektif');
      formData.append('kategori', isSeniSelected ? 'Lomba Seni' : 'Olimpiade Akademik');
      formData.append('hasLombaSeni', isSeniSelected ? 'true' : 'false');
      formData.append('totalBiaya', String(totalBiaya));
      if (biayaKolektif) {
        formData.append('rincianBiaya', JSON.stringify(biayaKolektif));
      }
      formData.append('fileExcel', uploadedFile);
      if (buktiKolektif) {
        formData.append('buktiPembayaran', buktiKolektif);
      }
      if (buktiSsKolektif) {
        formData.append('buktiSs', buktiSsKolektif);
      }
      formData.append('namaSekolah', formKolektif.asalSekolah);
      formData.append('noWa', formKolektif.noWa);
      formData.append('detailLomba', kolektifLombaList.join(', '));

      // Parse Excel untuk menghitung jumlah peserta per lomba (abaikan baris dummy/contoh)
      try {
        const buffer = await uploadedFile.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array' });
        const sheetName = wb.SheetNames.includes('Form Pendaftaran') ? 'Form Pendaftaran' : wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const rawExcelData = XLSX.utils.sheet_to_json<any>(ws);
        const excelData = rawExcelData.filter((row: any) => !isDummyOrInstructionRow(row));
        
        const counts: Record<string, number> = {};
        excelData.forEach((row: any) => {
          let lomba = row['LOMBA YANG DIPILIH'];
          if (!lomba) {
            for (const key of Object.keys(row)) {
              if (key.toLowerCase().includes('lomba')) {
                lomba = row[key];
                break;
              }
            }
          }
          if (lomba && typeof lomba === 'string') {
            counts[lomba.trim()] = (counts[lomba.trim()] || 0) + 1;
          }
        });
        formData.append('rekapPesertaExcel', JSON.stringify(counts));
      } catch (parseError) {
        console.error('Gagal membaca excel:', parseError);
        formData.append('rekapPesertaExcel', '{}');
      }

      const res = await fetch('/api/olimpiade-seni/daftar', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (data.success) {
        if (data.pesertaKolektif) {
          localStorage.setItem('cetak_kartu_data', JSON.stringify(data.pesertaKolektif));
        }
        
        if (data.excelDownloadUrl) {
          Swal.fire({
            title: 'Berhasil!',
            html: `Pendaftaran Kolektif Berhasil!<br/><br/><a href="${data.excelDownloadUrl}" target="_blank" style="display:inline-block;padding:10px 20px;background:#10b981;color:white;text-decoration:none;border-radius:8px;font-weight:bold;margin-bottom:10px;">Unduh Excel Akun CBT</a><br/><small>Silakan klik OK untuk lanjut mencetak Kartu Peserta.</small>`,
            icon: 'success'
          }).then(() => {
            router.push('/olimpiade-seni/kartu');
          });
        } else {
          Swal.fire('Berhasil!', 'Pendaftaran Kolektif Berhasil!', 'success').then(() => {
            router.push('/olimpiade-seni/kartu');
          });
        }
      } else {
        Swal.fire('Gagal', 'Gagal mendaftar: ' + data.error, 'error');
      }
    } catch (err: any) {
      Swal.fire('Error', 'Terjadi kesalahan sistem: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (isChecking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <i className="fas fa-spinner fa-spin fa-3x" style={{ color: '#0284c7' }}></i>
      </div>
    );
  }

  if (!isBuka) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '40px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: '500px', width: '100%', background: 'white', padding: '40px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', textAlign: 'center' }}>
          <i className="fas fa-lock" style={{ fontSize: '48px', color: '#cbd5e1', marginBottom: '24px' }}></i>
          <h2 style={{ fontSize: '1.5rem', color: '#0f172a', marginBottom: '12px', fontWeight: 700 }}>Pendaftaran Ditutup</h2>
          <p style={{ color: '#64748b', lineHeight: 1.6, marginBottom: '24px' }}>
            Mohon maaf, pendaftaran Olimpiade & Seni MTs Almaarif 01 Singosari saat ini sedang ditutup. Silakan hubungi panitia untuk informasi lebih lanjut.
          </p>
          <button 
            onClick={() => router.push('/olimpiade-seni')}
            style={{ padding: '12px 24px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '40px 20px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <button 
            onClick={() => jenisPendaftaran ? setJenisPendaftaran(null) : router.back()}
            style={{ width: '40px', height: '40px', borderRadius: '50%', border: 'none', background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}
          >
            <i className="fas fa-arrow-left"></i>
          </button>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
            Pendaftaran Peserta {jenisPendaftaran === 'individu' && '- Individu'}{jenisPendaftaran === 'kolektif' && '- Kolektif'}
          </h1>
        </div>

        {/* STEP 1: PILIH JENIS PENDAFTARAN */}
        {!jenisPendaftaran && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div 
              onClick={() => setJenisPendaftaran('individu')}
              style={{ background: 'white', borderRadius: '20px', padding: '40px', textAlign: 'center', cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '2px solid transparent', transition: 'all 0.2s' }}
              onMouseOver={(e) => { e.currentTarget.style.borderColor = '#0284c7'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
              onMouseOut={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', margin: '0 auto 20px' }}>
                <i className="fas fa-user"></i>
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '10px' }}>Pendaftaran Individu</h2>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>Pendaftaran untuk 1 peserta atau 1 regu tunggal secara mandiri.</p>
            </div>

            <div 
              onClick={() => setJenisPendaftaran('kolektif')}
              style={{ background: 'white', borderRadius: '20px', padding: '40px', textAlign: 'center', cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '2px solid transparent', transition: 'all 0.2s' }}
              onMouseOver={(e) => { e.currentTarget.style.borderColor = '#16a34a'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
              onMouseOut={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', margin: '0 auto 20px' }}>
                <i className="fas fa-users"></i>
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '10px' }}>Pendaftaran Kolektif</h2>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>Pendaftaran masal oleh instansi menggunakan format Excel.</p>
            </div>
          </div>
        )}

        {/* STEP 2A: FORM INDIVIDU */}
        {jenisPendaftaran === 'individu' && (
          <div style={{ background: 'white', borderRadius: '20px', padding: '32px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            <form onSubmit={handleSubmitIndividu}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Nama Lengkap Peserta / Perwakilan Regu <span style={{ color: 'red' }}>*</span></label>
                  <input 
                    type="text" required value={form.nama} onChange={e => setForm({...form, nama: e.target.value})}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none' }}
                    placeholder="Masukkan nama lengkap..."
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>NISN <span style={{ color: 'red' }}>*</span></label>
                  <input 
                    type="text" required value={form.nisn} onChange={e => setForm({...form, nisn: e.target.value})}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none' }}
                    placeholder="0123456789"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Kelas <span style={{ color: 'red' }}>*</span></label>
                  <select 
                    required value={form.kelas} onChange={e => setForm({...form, kelas: e.target.value})}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none', background: 'white' }}
                  >
                    <option value="" disabled>Pilih Kelas...</option>
                    <option value="4">Kelas 4</option>
                    <option value="5">Kelas 5</option>
                    <option value="6">Kelas 6</option>
                  </select>
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Nomor WhatsApp (Aktif) <span style={{ color: 'red' }}>*</span></label>
                  <input 
                    type="text" required value={form.noWa} onChange={e => setForm({...form, noWa: e.target.value})}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none' }}
                    placeholder="Contoh: 081234567890"
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Asal Sekolah (SD/MI) <span style={{ color: 'red' }}>*</span></label>
                  <input 
                    type="text" required value={form.namaSekolah} onChange={e => setForm({...form, namaSekolah: e.target.value})}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none' }}
                    placeholder="Contoh: MIN 1 Malang"
                  />
                </div>

                

                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Kategori Pendaftaran <span style={{ color: 'red' }}>*</span></label>
                  <select 
                    value={form.kategori} onChange={e => handleKategoriChange(e.target.value as 'Olimpiade Akademik' | 'Lomba Seni')}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none', background: 'white' }}
                  >
                    <option value="Olimpiade Akademik">Olimpiade Akademik</option>
                    <option value="Lomba Seni">Lomba Seni</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Pilihan Lomba <span style={{ color: 'red' }}>*</span></label>
                  <select 
                    value={form.lombaDipilih} onChange={e => setForm({...form, lombaDipilih: e.target.value})}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none', background: 'white' }}
                  >
                    {lombaOptions[form.kategori as 'Olimpiade Akademik' | 'Lomba Seni'].map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                {form.kategori === 'Lomba Seni' && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Nama Regu/Grup (Opsional)</label>
                    <input 
                      type="text" value={form.namaRegu} onChange={e => setForm({...form, namaRegu: e.target.value})}
                      style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none' }}
                      placeholder="Contoh: Grup Shalawat Al-Ikhlas"
                    />
                    <small style={{ color: '#94a3b8', display: 'block', marginTop: '4px' }}>*Hanya diisi jika mendaftar lomba berkelompok (seperti Banjari / SMS)</small>
                  </div>
                )}

                {/* Kartu Rincian & Kalkulasi Biaya Individu */}
                {(() => {
                  const info = getBiayaIndividu(form.lombaDipilih);
                  return (
                    <div style={{
                      gridColumn: '1 / -1',
                      background: info.isGratis ? '#f0fdf4' : '#eff6ff',
                      border: `1.5px solid ${info.isGratis ? '#86efac' : '#93c5fd'}`,
                      borderRadius: '12px',
                      padding: '16px 20px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '14px'
                    }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '10px',
                        background: info.isGratis ? '#dcfce7' : '#dbeafe',
                        color: info.isGratis ? '#16a34a' : '#0284c7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.25rem',
                        flexShrink: 0
                      }}>
                        <i className={info.isGratis ? "fas fa-gift" : "fas fa-receipt"}></i>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                          <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                            Biaya Pendaftaran: {form.lombaDipilih}
                          </span>
                          <span style={{
                            fontSize: '1.15rem',
                            fontWeight: 800,
                            color: info.isGratis ? '#16a34a' : '#0284c7'
                          }}>
                            {info.isGratis ? 'GRATIS (Rp 0)' : formatRupiah(info.tarif)}
                            {!info.isGratis && <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}> / {info.satuan}</span>}
                          </span>
                        </div>
                        <p style={{ margin: '6px 0 0 0', fontSize: '0.84rem', color: info.isGratis ? '#166534' : '#334155', lineHeight: 1.5 }}>
                          {info.keterangan}
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {form.kategori === 'Lomba Seni' && (() => {
                  const info = getBiayaIndividu(form.lombaDipilih);
                  return (
                    <div style={{ gridColumn: '1 / -1', background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                      <label style={{ display: 'block', fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                        <i className="fas fa-receipt" style={{ marginRight: '8px', color: '#3b82f6' }}></i>
                        Upload Bukti Pembayaran ({formatRupiah(info.subtotal)}) <span style={{ color: 'red' }}>*</span>
                      </label>
                      <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 12px 0' }}>
                        Biaya pendaftaran sebesar <strong>{formatRupiah(info.subtotal)}</strong>. Silakan transfer ke rekening resmi berikut lalu unggah bukti transfer di bawah ini:
                      </p>
                      {renderBankCard()}
                      <input 
                        type="file" 
                        accept="image/*"
                        required={form.kategori === 'Lomba Seni'}
                        onChange={e => setBuktiIndividu(e.target.files ? e.target.files[0] : null)}
                        style={{ width: '100%', padding: '8px', background: 'white', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                  );
                })()}
                  
                <div style={{ gridColumn: '1 / -1', background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                  <label style={{ display: 'block', fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                    <i className="fas fa-share-alt" style={{ marginRight: '8px', color: '#10b981' }}></i>
                    Upload Bukti SS Share Poster <span style={{ color: 'red' }}>*</span>
                  </label>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 12px 0' }}>Format gambar (.jpg, .png, .jpeg). Wajib diisi oleh seluruh pendaftar.</p>
                  <input 
                    type="file" 
                    accept="image/*"
                    required 
                    onChange={e => setBuktiSsIndividu(e.target.files ? e.target.files[0] : null)}
                    style={{ width: '100%', padding: '8px', background: 'white', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>

              </div>

              <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end', gap: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '24px' }}>
                <button 
                  type="submit" disabled={loading}
                  style={{ padding: '12px 32px', borderRadius: '10px', background: '#0284c7', color: 'white', border: 'none', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'center', fontSize: '1.1rem' }}
                >
                  {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>}
                  Simpan Pendaftaran Individu
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 2B: FORM KOLEKTIF */}
        {jenisPendaftaran === 'kolektif' && (
          <div style={{ background: 'white', borderRadius: '20px', padding: '32px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#0f172a', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>Identitas Instansi / Sekolah</h3>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Asal Sekolah / Instansi <span style={{ color: 'red' }}>*</span></label>
                <input 
                  type="text" required value={formKolektif.asalSekolah} onChange={e => setFormKolektif({...formKolektif, asalSekolah: e.target.value})}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none' }}
                  placeholder="Contoh: MIN 1 Malang"
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Nomor WhatsApp Guru Pendamping <span style={{ color: 'red' }}>*</span></label>
                <input 
                  type="text" required value={formKolektif.noWa} onChange={e => setFormKolektif({...formKolektif, noWa: e.target.value})}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none' }}
                  placeholder="Contoh: 081234567890"
                />
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: '#0f172a', fontWeight: 700 }}>
                  <i className="fas fa-info-circle" style={{ color: '#3b82f6', marginRight: '8px' }}></i>
                  Panduan Pendaftaran Kolektif
                </h4>
                <ol style={{ margin: '0 0 16px 0', paddingLeft: '20px', fontSize: '0.9rem', color: '#475569', lineHeight: '1.6' }}>
                  <li>Isi <strong>Asal Sekolah / Instansi</strong> pada kolom di atas.</li>
                  <li>Unduh template Excel resmi (Poin 1), lalu isi data peserta secara lengkap.</li>
                  <li>Unggah file Excel (Poin 2). Sistem akan mendeteksi pilihan lomba secara otomatis.</li>
                  <li>Jika terdapat peserta <strong>Lomba Seni</strong>, lakukan pembayaran ke rekening <strong>BCA 3686518888 a.n. MTs Almaarif 01 Singosari</strong> dan wajib mengunggah Bukti Pembayaran (Poin 3). Jika <strong>hanya Olimpiade Akademik</strong>, pendaftaran <strong>GRATIS</strong> (tidak perlu bukti transfer).</li>
                  <li>Klik <strong>Proses Pendaftaran Kolektif</strong> dan tunggu hingga selesai.</li>
                  <li style={{ color: '#ef4444', fontWeight: 600 }}>PENTING: Jangan lupa untuk langsung mengunduh file Excel Akun CBT (berisi Username & Password peserta) yang muncul setelah pendaftaran berhasil!</li>
                </ol>
                
                {/* List Lomba Terdeteksi Otomatis */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {kolektifLombaList.length === 0 ? (
                    <span style={{ fontSize: '0.9rem', color: '#94a3b8', fontStyle: 'italic' }}>Daftar lomba akan muncul otomatis setelah file Excel diunggah...</span>
                  ) : (
                    kolektifLombaList.map(lomba => (
                      <div key={lomba} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: '#dcfce7', borderRadius: '20px', border: '1px solid #22c55e', fontSize: '0.9rem', color: '#166534', fontWeight: 600 }}>
                        <i className="fas fa-check-circle"></i> {lomba}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '12px', padding: '24px', textAlign: 'center', marginBottom: '32px' }}>
              <i className="fas fa-file-excel" style={{ fontSize: '3rem', color: '#10b981', marginBottom: '16px' }}></i>
              <h3 style={{ margin: '0 0 8px 0', color: '#0f172a' }}>1. Unduh Template Excel</h3>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '16px' }}>Silakan gunakan template resmi ini agar format data pendaftar sesuai dengan sistem kami.</p>
              <button 
                onClick={handleDownloadTemplate}
                style={{ padding: '10px 24px', borderRadius: '8px', background: 'white', color: '#10b981', border: '2px solid #10b981', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <i className="fas fa-download"></i> Download Template
              </button>
            </div>

            <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '12px', padding: '24px', textAlign: 'center', marginBottom: '32px' }}>
              <i className="fas fa-cloud-upload-alt" style={{ fontSize: '3rem', color: '#3b82f6', marginBottom: '16px' }}></i>
              <h3 style={{ margin: '0 0 8px 0', color: '#0f172a' }}>2. Unggah Data Pendaftar</h3>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '16px' }}>Pilih file excel (.xlsx) yang sudah Anda isi dengan lengkap.</p>
              
              <input 
                type="file" 
                accept=".xlsx, .xls"
                ref={fileInputRef}
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              
              {!uploadedFile ? (
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  style={{ padding: '10px 24px', borderRadius: '8px', background: '#3b82f6', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  <i className="fas fa-folder-open"></i> Pilih File Excel
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <div style={{ padding: '12px', background: '#dbeafe', color: '#1e40af', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fas fa-check-circle"></i> {uploadedFile.name}
                  </div>
                  <button 
                    onClick={() => { setUploadedFile(null); setBiayaKolektif(null); setKolektifLombaList([]); }}
                    style={{ padding: '8px 16px', borderRadius: '8px', background: '#f1f5f9', color: '#475569', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}
                  >
                    Batal Pilih Excel
                  </button>
                </div>
              )}
            </div>

            {/* Box Rincian & Kalkulasi Biaya Kolektif */}
            {biayaKolektif && (
              <div style={{
                background: 'white',
                border: '2px solid #0284c7',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '32px',
                boxShadow: '0 4px 15px rgba(2, 132, 199, 0.08)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                      <i className="fas fa-calculator"></i>
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>Kalkulasi Biaya Pendaftaran</h3>
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                        Rincian biaya otomatis berdasarkan data cabang lomba peserta di file Excel
                      </p>
                    </div>
                  </div>
                  <div style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    background: biayaKolektif.totalBiaya === 0 ? '#dcfce7' : '#fef3c7',
                    color: biayaKolektif.totalBiaya === 0 ? '#166534' : '#b45309',
                    fontWeight: 700,
                    fontSize: '0.85rem'
                  }}>
                    {biayaKolektif.totalBiaya === 0 ? '✓ Pendaftaran Gratis' : 'Memerlukan Pembayaran'}
                  </div>
                </div>

                <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                        <th style={{ padding: '10px 14px' }}>Cabang Lomba</th>
                        <th style={{ padding: '10px 14px' }}>Jumlah Peserta / Tim</th>
                        <th style={{ padding: '10px 14px' }}>Tarif</th>
                        <th style={{ padding: '10px 14px' }}>Subtotal</th>
                        <th style={{ padding: '10px 14px' }}>Keterangan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {biayaKolektif.rincian.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0f172a' }}>{item.lomba}</td>
                          <td style={{ padding: '12px 14px', color: '#334155' }}>
                            <span style={{ fontWeight: 600 }}>{item.jumlah} {item.satuan}</span>
                            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>({item.detail})</div>
                          </td>
                          <td style={{ padding: '12px 14px', color: '#475569' }}>
                            {item.isGratis ? 'Gratis' : `${formatRupiah(item.tarif)} / ${item.satuan}`}
                          </td>
                          <td style={{ padding: '12px 14px', fontWeight: 700, color: item.isGratis ? '#16a34a' : '#0f172a' }}>
                            {item.isGratis ? 'Rp 0' : formatRupiah(item.subtotal)}
                          </td>
                          <td style={{ padding: '12px 14px', fontSize: '0.82rem', color: '#64748b' }}>{item.keterangan}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1' }}>
                        <td colSpan={3} style={{ padding: '14px', fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>
                          TOTAL BIAYA PENDAFTARAN
                        </td>
                        <td colSpan={2} style={{ padding: '14px', fontWeight: 900, fontSize: '1.25rem', color: biayaKolektif.totalBiaya === 0 ? '#16a34a' : '#0284c7' }}>
                          {biayaKolektif.totalBiaya === 0 ? 'GRATIS (Rp 0)' : formatRupiah(biayaKolektif.totalBiaya)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {biayaKolektif.totalBiaya > 0 ? (
                  <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '10px', padding: '16px', color: '#92400e', fontSize: '0.85rem' }}>
                    <div style={{ marginBottom: '8px', fontWeight: 600 }}>
                      <i className="fas fa-info-circle" style={{ marginRight: '6px' }}></i>
                      Harap melakukan transfer pembayaran sebesar <strong>{formatRupiah(biayaKolektif.totalBiaya)}</strong> ke rekening panitia di bawah ini, lalu unggah bukti transfer pada Poin 3:
                    </div>
                    {renderBankCard()}
                  </div>
                ) : (
                  <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '10px', padding: '12px 16px', color: '#166534', fontSize: '0.85rem' }}>
                    <i className="fas fa-check-circle" style={{ marginRight: '6px' }}></i>
                    Semua peserta yang didaftarkan mengikuti cabang <strong>Olimpiade Akademik Babak Penyisihan</strong>, sehingga <strong>tidak dikenakan biaya (GRATIS)</strong>. Anda tidak perlu mengunggah bukti pembayaran.
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {/* Bukti Pembayaran Kolektif */}
              <div style={{ 
                background: biayaKolektif && biayaKolektif.totalBiaya === 0 ? '#f0fdf4' : biayaKolektif && biayaKolektif.totalBiaya > 0 ? '#fffbeb' : '#f8fafc', 
                border: biayaKolektif && biayaKolektif.totalBiaya === 0 ? '1px solid #86efac' : biayaKolektif && biayaKolektif.totalBiaya > 0 ? '1px solid #fcd34d' : '1px dashed #cbd5e1', 
                borderRadius: '12px', 
                padding: '24px', 
                textAlign: 'center' 
              }}>
                <i className="fas fa-receipt" style={{ 
                  fontSize: '3rem', 
                  color: biayaKolektif && biayaKolektif.totalBiaya === 0 ? '#16a34a' : biayaKolektif && biayaKolektif.totalBiaya > 0 ? '#d97706' : '#94a3b8', 
                  marginBottom: '16px' 
                }}></i>
                <h3 style={{ margin: '0 0 8px 0', color: '#0f172a' }}>3. Unggah Bukti Pembayaran</h3>
                {biayaKolektif && biayaKolektif.totalBiaya === 0 ? (
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', background: '#dcfce7', color: '#166534', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px' }}>
                      <i className="fas fa-check-circle"></i> GRATIS (Olimpiade Akademik)
                    </div>
                    <p style={{ color: '#15803d', fontSize: '0.85rem', margin: 0 }}>
                      Pendaftaran Olimpiade tidak dipungut biaya. Anda tidak perlu mengunggah bukti pembayaran.
                    </p>
                  </div>
                ) : biayaKolektif && biayaKolektif.totalBiaya > 0 ? (
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', background: '#fee2e2', color: '#b91c1c', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px' }}>
                      <i className="fas fa-exclamation-triangle"></i> Wajib Diunggah: {formatRupiah(biayaKolektif.totalBiaya)}
                    </div>
                    <p style={{ color: '#b91c1c', fontSize: '0.85rem', margin: '0 0 10px 0', fontWeight: 600 }}>
                      Terdeteksi peserta Lomba Seni. Silakan unggah bukti transfer pembayaran sebesar <b>{formatRupiah(biayaKolektif.totalBiaya)}</b> ke rekening resmi:
                    </p>
                    {renderBankCard()}
                  </div>
                ) : (
                  <div style={{ marginBottom: '12px' }}>
                    <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '8px' }}>Format (.jpg, .png). Wajib jika ada Lomba Seni (Olimpiade Gratis).</p>
                    <div style={{ fontSize: '0.82rem', color: '#475569', background: '#f1f5f9', padding: '8px 12px', borderRadius: '8px', textAlign: 'center' }}>
                      Rekening Transfer: <strong>BCA 3686518888</strong> a.n. <strong>MTs Almaarif 01 Singosari</strong>
                    </div>
                  </div>
                )}
                
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={e => setBuktiKolektif(e.target.files ? e.target.files[0] : null)}
                  style={{ width: '100%', maxWidth: '300px', padding: '8px', background: 'white', borderRadius: '8px', border: '1px solid #cbd5e1', margin: '0 auto' }}
                />
              </div>

              {/* Bukti SS Share Poster Kolektif */}
              <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '12px', padding: '24px', textAlign: 'center' }}>
                <i className="fas fa-share-alt" style={{ fontSize: '3rem', color: '#10b981', marginBottom: '16px' }}></i>
                <h3 style={{ margin: '0 0 8px 0', color: '#0f172a' }}>4. Unggah Bukti Share Poster</h3>
                <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '16px' }}>Format (.jpg, .png). Wajib untuk semua pendaftaran.</p>
                
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={e => setBuktiSsKolektif(e.target.files ? e.target.files[0] : null)}
                  style={{ width: '100%', maxWidth: '300px', padding: '8px', background: 'white', borderRadius: '8px', border: '1px solid #cbd5e1', margin: '0 auto' }}
                />
              </div>
            </div>

            <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end', gap: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '24px' }}>
              <button 
                onClick={handleSubmitKolektif}
                disabled={loading || !uploadedFile || ((biayaKolektif ? biayaKolektif.totalBiaya > 0 : kolektifLombaList.some(l => lombaOptions['Lomba Seni'].includes(l))) && !buktiKolektif)}
                style={{ padding: '12px 32px', borderRadius: '10px', background: '#0f172a', color: 'white', border: 'none', fontWeight: 700, cursor: (loading || !uploadedFile || ((biayaKolektif ? biayaKolektif.totalBiaya > 0 : kolektifLombaList.some(l => lombaOptions['Lomba Seni'].includes(l))) && !buktiKolektif)) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'center', fontSize: '1.1rem' }}
              >
                {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-upload"></i>}
                Proses Pendaftaran Kolektif
              </button>
            </div>


          </div>
        )}

      </div>
    </div>
  );
}
