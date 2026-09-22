'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';

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
    kategori: 'Olimpiade',
    lombaDipilih: 'Olimpiade Matematika',
    namaRegu: ''
  });
  const [loading, setLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const lombaOptions = {
    'Olimpiade': ['Olimpiade Matematika', 'Olimpiade IPA', 'Olimpiade IPS', 'Olimpiade PAI'],
    'Seni': ['Kaligrafi', 'Banjari', 'Pidato Bahasa Arab', 'Pidato Bahasa Inggris', 'Singer']
  };

  const handleKategoriChange = (kat: 'Olimpiade' | 'Seni') => {
    setForm({
      ...form,
      kategori: kat,
      lombaDipilih: lombaOptions[kat][0],
      namaRegu: '' // Reset regu
    });
  };

  const handleSubmitIndividu = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // TODO: Submit to Supabase
    setTimeout(() => {
      alert('Pendaftaran Individu Berhasil! (Simulasi)');
      setLoading(false);
      router.push('/olimpiade-seni');
    }, 1000);
  };

  const handleDownloadTemplate = () => {
    const ws_data = [
      ['NO', 'NAMA', 'NISN', 'NAMA SD/MI', 'NPSN SD/MI', 'KELAS', 'LOMBA YANG DIPILIH', 'NAMA REGU/GRUP (LOMBA MAPEL TIDAK PERLU MENGISI)'],
      // Contoh isi
      [1, 'Ahmad Budi', '0123456789', 'MIN 1 Malang', '20500000', '6', 'Olimpiade Matematika', ''],
      [2, 'Grup Al-Banjari', '-', 'SDIT Ahmad Yani', '20511111', '5', 'Banjari', 'Grup Shalawat A']
    ];
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    
    // Atur lebar kolom
    ws['!cols'] = [
      { wch: 5 }, { wch: 25 }, { wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 10 }, { wch: 25 }, { wch: 50 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template Pendaftaran");
    XLSX.writeFile(wb, "Template_Pendaftaran_Kolektif.xlsx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0]);
    }
  };

  const handleSubmitKolektif = () => {
    if (!uploadedFile) {
      alert('Silakan pilih file Excel terlebih dahulu!');
      return;
    }
    setLoading(true);
    // TODO: Parsing excel to Supabase logic
    setTimeout(() => {
      alert(`Berhasil mengunggah file ${uploadedFile.name} (Simulasi)`);
      setLoading(false);
      router.push('/olimpiade-seni');
    }, 1500);
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
                    value={form.kategori} onChange={e => handleKategoriChange(e.target.value as 'Olimpiade' | 'Seni')}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none', background: 'white' }}
                  >
                    <option value="Olimpiade">Olimpiade Akademik</option>
                    <option value="Seni">Lomba Seni</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Pilihan Lomba <span style={{ color: 'red' }}>*</span></label>
                  <select 
                    value={form.lombaDipilih} onChange={e => setForm({...form, lombaDipilih: e.target.value})}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none', background: 'white' }}
                  >
                    {lombaOptions[form.kategori as 'Olimpiade' | 'Seni'].map(opt => (
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

            <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '12px', padding: '24px', textAlign: 'center' }}>
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
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={() => setUploadedFile(null)}
                      style={{ padding: '8px 16px', borderRadius: '8px', background: '#f1f5f9', color: '#475569', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}
                    >
                      Batal
                    </button>
                    <button 
                      onClick={handleSubmitKolektif}
                      disabled={loading}
                      style={{ padding: '8px 24px', borderRadius: '8px', background: '#0f172a', color: 'white', border: 'none', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-upload"></i>}
                      Proses Upload
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
