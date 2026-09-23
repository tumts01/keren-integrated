'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';

export default function PendaftaranOlimpiadeSeni() {
  const router = useRouter();
  const [jenisPendaftaran, setJenisPendaftaran] = useState<'individu' | 'kolektif' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State for Individu
  const [form, setForm] = useState({
    nama: '',
    nisn: '',
    namaSekolah: '',
    npsn: '',
    kelas: '',
    kategori: 'Olimpiade Akademik',
    lombaDipilih: 'Matematika',
    namaRegu: ''
  });
  const [loading, setLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [buktiIndividu, setBuktiIndividu] = useState<File | null>(null);
  const [buktiKolektif, setBuktiKolektif] = useState<File | null>(null);
  const [formKolektif, setFormKolektif] = useState({
    asalSekolah: ''
  });
  const [kolektifKategori, setKolektifKategori] = useState<'Olimpiade Akademik' | 'Lomba Seni'>('Olimpiade Akademik');
  const [kolektifLombaDipilih, setKolektifLombaDipilih] = useState('Matematika');
  const [kolektifLombaList, setKolektifLombaList] = useState<string[]>([]);

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

  const handleSubmitIndividu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buktiIndividu) {
      Swal.fire('Peringatan', 'Bukti pembayaran wajib diunggah!', 'warning');
      return;
    }
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('jenisPendaftaran', 'individu');
      formData.append('buktiPembayaran', buktiIndividu);
      
      Object.keys(form).forEach(key => {
        formData.append(key, (form as any)[key]);
      });

      const res = await fetch('/api/olimpiade-seni/daftar', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (data.success) {
        Swal.fire('Berhasil!', 'Pendaftaran Individu Berhasil!', 'success').then(() => {
          router.push('/olimpiade-seni');
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

  const handleDownloadTemplate = () => {
    const ws_data = [
      ['NO', 'NAMA', 'NISN', 'NAMA SD/MI', 'NPSN SD/MI', 'KELAS', 'LOMBA YANG DIPILIH', 'NAMA REGU/GRUP (LOMBA MAPEL TIDAK PERLU MENGISI)'],
      // Contoh isi
      [1, 'Ahmad Budi', '0123456789', 'MIN 1 Malang', '20500000', '6', 'Olimpiade Matematika', ''],
      [2, 'Grup Al-Banjari', '-', 'SDIT Ahmad Yani', '20511111', '5', 'Banjari', 'Grup Shalawat A'],
      [],
      ['*** PENTING: Pilihan "LOMBA YANG DIPILIH" harus sama persis dengan daftar di bawah ini (tanpa typo): ***'],
      ['Olimpiade Matematika, Olimpiade IPA, Olimpiade IPS, Olimpiade PAI, Kaligrafi, Banjari, Pidato Bahasa Arab, Pidato Bahasa Inggris, Singer']
    ];
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    
    // Atur lebar kolom
    ws['!cols'] = [
      { wch: 5 }, { wch: 25 }, { wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 10 }, { wch: 35 }, { wch: 50 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template Pendaftaran");
    XLSX.writeFile(wb, "Template_Pendaftaran_Kolektif.xlsx");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      try {
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const excelData = XLSX.utils.sheet_to_json(ws);
        
        const validLomba = [...lombaOptions['Olimpiade Akademik'], ...lombaOptions['Lomba Seni']];
        const errorMsgs: string[] = [];
        
        excelData.forEach((row: any, index: number) => {
          const namaLomba = row['LOMBA YANG DIPILIH'];
          // Lewati baris kosong atau baris instruksi yang kita tambahkan di bawah
          if (namaLomba && typeof namaLomba === 'string' && !namaLomba.includes('*** PENTING')) {
            const trimmed = namaLomba.trim();
            if (!validLomba.includes(trimmed)) {
              errorMsgs.push(`Baris excel ke-${index + 2}: "${trimmed}"`);
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
          return;
        }

        setUploadedFile(file);
      } catch (err) {
        Swal.fire('Gagal', 'Gagal membaca file Excel. Pastikan formatnya benar.', 'error');
        if (fileInputRef.current) fileInputRef.current.value = '';
        setUploadedFile(null);
      }
    }
  };

  const handleSubmitKolektif = async () => {
    if (!formKolektif.asalSekolah || kolektifLombaList.length === 0) {
      Swal.fire('Peringatan', 'Silakan isi Asal Sekolah dan tambahkan minimal 1 Jenis Lomba!', 'warning');
      return;
    }
    if (!uploadedFile) {
      Swal.fire('Peringatan', 'Silakan pilih file Excel terlebih dahulu!', 'warning');
      return;
    }
    if (!buktiKolektif) {
      Swal.fire('Peringatan', 'Bukti pembayaran wajib diunggah!', 'warning');
      return;
    }
    
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('jenisPendaftaran', 'kolektif');
      formData.append('fileExcel', uploadedFile);
      formData.append('buktiPembayaran', buktiKolektif);
      formData.append('namaSekolah', formKolektif.asalSekolah);
      formData.append('detailLomba', kolektifLombaList.join(', '));

      // Parse Excel untuk menghitung jumlah peserta per lomba
      try {
        const buffer = await uploadedFile.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const excelData = XLSX.utils.sheet_to_json(ws);
        
        const counts: Record<string, number> = {};
        excelData.forEach((row: any) => {
          const lomba = row['LOMBA YANG DIPILIH'];
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
        Swal.fire('Berhasil!', 'Pendaftaran Kolektif Berhasil!', 'success').then(() => {
          router.push('/olimpiade-seni');
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

                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Asal Sekolah (SD/MI) <span style={{ color: 'red' }}>*</span></label>
                  <input 
                    type="text" required value={form.namaSekolah} onChange={e => setForm({...form, namaSekolah: e.target.value})}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none' }}
                    placeholder="Contoh: MIN 1 Malang"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>NPSN Sekolah <span style={{ color: 'red' }}>*</span></label>
                  <input 
                    type="text" required value={form.npsn} onChange={e => setForm({...form, npsn: e.target.value})}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none' }}
                    placeholder="Contoh: 20500000"
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

                {form.kategori === 'Seni' && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Nama Regu/Grup (Opsional)</label>
                    <input 
                      type="text" value={form.namaRegu} onChange={e => setForm({...form, namaRegu: e.target.value})}
                      style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none' }}
                      placeholder="Contoh: Grup Shalawat Al-Ikhlas"
                    />
                    <small style={{ color: '#94a3b8', display: 'block', marginTop: '4px' }}>*Hanya diisi jika mendaftar lomba berkelompok (seperti Banjari)</small>
                  </div>
                )}

                <div style={{ gridColumn: '1 / -1', background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                  <label style={{ display: 'block', fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                    <i className="fas fa-receipt" style={{ marginRight: '8px', color: '#3b82f6' }}></i>
                    Upload Bukti Pembayaran <span style={{ color: 'red' }}>*</span>
                  </label>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 12px 0' }}>Format gambar (.jpg, .png, .jpeg). Wajib diisi.</p>
                  <input 
                    type="file" 
                    accept="image/*"
                    required 
                    onChange={e => setBuktiIndividu(e.target.files ? e.target.files[0] : null)}
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '20px', alignItems: 'end' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Kategori Pendaftaran</label>
                    <select 
                      value={kolektifKategori} onChange={e => handleKolektifKategoriChange(e.target.value as 'Olimpiade Akademik' | 'Lomba Seni')}
                      style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none', background: 'white' }}
                    >
                      <option value="Olimpiade Akademik">Olimpiade Akademik</option>
                      <option value="Lomba Seni">Lomba Seni</option>
                    </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Pilihan Lomba</label>
                  <select 
                    value={kolektifLombaDipilih} onChange={e => setKolektifLombaDipilih(e.target.value)}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none', background: 'white' }}
                  >
                    {lombaOptions[kolektifKategori].map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <button 
                  onClick={handleAddKolektifLomba}
                  style={{ padding: '12px 24px', borderRadius: '10px', background: '#0ea5e9', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer', height: '45px' }}
                >
                  <i className="fas fa-plus"></i> Tambah
                </button>
              </div>
              
              {/* List Lomba Terpilih */}
              <div style={{ marginTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {kolektifLombaList.length === 0 ? (
                  <span style={{ fontSize: '0.9rem', color: '#94a3b8', fontStyle: 'italic' }}>Belum ada lomba yang ditambahkan. Silakan pilih dan klik "Tambah"</span>
                ) : (
                  kolektifLombaList.map(lomba => (
                    <div key={lomba} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: '#f1f5f9', borderRadius: '20px', border: '1px solid #cbd5e1', fontSize: '0.9rem', color: '#334155' }}>
                      {lomba}
                      <i className="fas fa-times" style={{ color: '#ef4444', cursor: 'pointer' }} onClick={() => handleRemoveKolektifLomba(lomba)}></i>
                    </div>
                  ))
                )}
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
                    onClick={() => setUploadedFile(null)}
                    style={{ padding: '8px 16px', borderRadius: '8px', background: '#f1f5f9', color: '#475569', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}
                  >
                    Batal Pilih Excel
                  </button>
                </div>
              )}
            </div>

            <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '12px', padding: '24px', textAlign: 'center' }}>
              <i className="fas fa-receipt" style={{ fontSize: '3rem', color: '#f59e0b', marginBottom: '16px' }}></i>
              <h3 style={{ margin: '0 0 8px 0', color: '#0f172a' }}>3. Unggah Bukti Pembayaran</h3>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '16px' }}>Format gambar (.jpg, .png). Wajib diunggah untuk verifikasi pendaftaran kolektif.</p>
              
              <input 
                type="file" 
                accept="image/*"
                required
                onChange={e => setBuktiKolektif(e.target.files ? e.target.files[0] : null)}
                style={{ width: '100%', maxWidth: '300px', padding: '8px', background: 'white', borderRadius: '8px', border: '1px solid #cbd5e1', margin: '0 auto' }}
              />
            </div>

            <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end', gap: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '24px' }}>
              <button 
                onClick={handleSubmitKolektif}
                disabled={loading || !uploadedFile || !buktiKolektif}
                style={{ padding: '12px 32px', borderRadius: '10px', background: '#0f172a', color: 'white', border: 'none', fontWeight: 700, cursor: (loading || !uploadedFile || !buktiKolektif) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'center', fontSize: '1.1rem' }}
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
