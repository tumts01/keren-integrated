'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import styles from '../../Spmb.module.css';

export default function SpmbEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [fetching, setFetching] = useState(true);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [sekolahRef, setSekolahRef] = useState<{nama: string, alamat: string, npsn?: string}[]>([]);

  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      try {
        const userStr = localStorage.getItem('keren_user_data');
        if (!userStr) {
          router.push('/portal/login');
          return;
        }
        
        let user;
        try {
          user = JSON.parse(userStr);
        } catch(e) {
          router.push('/portal/login');
          return;
        }
        
        if (user?.role?.toLowerCase() !== 'admin') {
          router.push('/portal/dashboard');
          return;
        }

        // Fetch sekolah reference
        fetch('/api/spmb/sekolah')
          .then(res => res.json())
          .then(data => {
            if (isMounted && data.success) {
              setSekolahRef(data.data);
            }
          })
          .catch(err => console.error('Gagal memuat referensi sekolah', err));

        if (!id) return;

        // Fetch existing SPMB
        const res = await fetch(`/api/spmb/${id}`);
        const resData = await res.json();
        
        if (resData.success && resData.data && isMounted) {
          const meta = resData.data.metadata || {};
          let ttl = meta['Tempat, Tanggal Lahir'] || '';
          let tLahir = '';
          let dLahir = '';
          if (ttl.includes(', ')) {
            const parts = ttl.split(', ');
            tLahir = parts[0];
            dLahir = parts[1];
          }

          setFormData(prev => ({
            ...prev,
            jalurPendaftaran: meta['Jalur Pendaftaran'] || 'Reguler',
            namaLengkap: meta['Nama Lengkap'] || '',
            nisn: meta['NISN'] || '',
            tempatLahir: tLahir,
            tanggalLahir: dLahir,
            jenisKelamin: meta['Jenis Kelamin'] || 'Laki-laki',
            agama: meta['Agama'] || 'Islam',
            asalSekolah: meta['Asal Sekolah'] || '',
            npsnSekolahAsal: meta['NPSN SD/MI'] || '',
            alamatSekolahAsal: meta['Alamat Sekolah Asal'] || '',
            namaAyah: meta['Nama Ayah'] || '',
            pekerjaanAyah: meta['Pekerjaan Ayah'] || '',
            namaIbu: meta['Nama Ibu'] || '',
            pekerjaanIbu: meta['Pekerjaan Ibu'] || '',
            nomorWaAyah: meta['Nomor WA Ayah'] || '',
            nomorWaIbu: meta['Nomor WA Ibu'] || '',
            alamatLengkap: meta['Alamat (Jalan/RT/RW)'] || '',
            desa: meta['Desa/Kelurahan'] || '',
            kecamatan: meta['Kecamatan'] || '',
            kabupaten: meta['Kabupaten/Kota'] || '',
            prestasi: meta['Prestasi (Jika Ada)'] || '',
            linkKk: meta['File KK'] || '',
            linkAkta: meta['File Akta'] || ''
          }));
        }
      } catch (err) {
        console.error('Error loading SPMB edit data:', err);
      } finally {
        if (isMounted) setFetching(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [id, router]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Hitung Tahun Ajaran Otomatis
  const today = new Date();
  const currentYear = today.getFullYear();
  const month = today.getMonth(); // 0-indexed
  let spmbYear = '';
  if (month >= 6) {
    spmbYear = `${currentYear + 1}/${currentYear + 2}`;
  } else {
    spmbYear = `${currentYear}/${currentYear + 1}`;
  }

  // Form States
  const [formData, setFormData] = useState({
    jalurPendaftaran: 'Reguler',
    namaLengkap: '',
    nisn: '',
    tempatLahir: '',
    tanggalLahir: '',
    jenisKelamin: 'Laki-laki',
    agama: 'Islam',
    asalSekolah: '',
    alamatSekolahAsal: '',
    npsnSekolahAsal: '',
    namaAyah: '',
    pekerjaanAyah: '',
    namaIbu: '',
    pekerjaanIbu: '',
    nomorWaAyah: '',
    nomorWaIbu: '',
    alamatLengkap: '',
    desa: '',
    kecamatan: '',
    kabupaten: '',
    prestasi: '',
    linkKk: '',
    linkAkta: ''
  });

  const [fileKk, setFileKk] = useState<File | null>(null);
  const [fileAkta, setFileAkta] = useState<File | null>(null);

  const fileKkRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      
      // Auto-fill alamat dan NPSN sekolah jika asalSekolah dipilih dari referensi
      if (name === 'asalSekolah') {
        const selected = sekolahRef.find(s => s.nama === value);
        if (selected) {
          if (selected.alamat) newData.alamatSekolahAsal = selected.alamat;
          if (selected.npsn) newData.npsnSekolahAsal = selected.npsn;
        }
      }
      
      return newData;
    });
  };

  const uploadToDrive = async (file: File, newName: string): Promise<string> => {
    // Ambil ekstensi file asli (misal: pdf, jpg, png)
    const ext = file.name.split('.').pop();
    // Buat file baru dengan nama yang sudah direname dan ekstensi aslinya
    const renamedFile = new File([file], `${newName}.${ext}`, { type: file.type });

    const uploadFormData = new FormData();
    uploadFormData.append('file', renamedFile);
    
    // We will hit our local API which will then hit the Google Apps Script
    uploadFormData.append('type', 'spmb');

    const res = await fetch('/api/spmb/upload', {
      method: 'POST',
      body: uploadFormData
    });
    
    const result = await res.json();
    if (!result.success) throw new Error(result.error);
    return result.link;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.namaLengkap) {
      showToast('Nama Lengkap wajib diisi terlebih dahulu!', 'error');
      return;
    }
    setLoading(true);
    try {
      const safeName = formData.namaLengkap.trim().replace(/\s+/g, '_');
      let newLinkKk = formData.linkKk || '';
      
      if (fileKk) newLinkKk = await uploadToDrive(fileKk, `KK_${safeName}`);

      const tempatTanggalLahir = `${formData.tempatLahir}, ${formData.tanggalLahir}`;
      const dbPayload = {
        ...formData,
        tempatTanggalLahir,
        linkKk: newLinkKk
      };

      const res = await fetch(`/api/spmb/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbPayload)
      });
      
      const result = await res.json();
      if (result.success) {
        showToast('Update Data SPMB Berhasil!', 'success');
        setTimeout(() => router.push('/spmb/rekap'), 1500);
      } else {
        showToast(`Gagal mengupdate: ${result.error}`, 'error');
      }
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div style={{ padding: '40px', textAlign: 'center' }}>Memuat data...</div>;

  return (
    <div className={styles.container}>
      {toast && (
        <div className={styles.toastContainer}>
          <div className={`${styles.toast} ${styles[toast.type]}`}>
            <i className={`fas ${toast.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} ${styles.toastIcon}`}></i>
            {toast.message}
          </div>
        </div>
      )}



      <div className={styles.header}>
        <img src="/logo.png" alt="Logo MTs Almaarif" style={{ width: '80px', height: 'auto', marginBottom: '16px' }} />
        <div className={styles.title}>
          <div className={styles.titleIcon}>
            <i className="fas fa-user-graduate"></i>
          </div>
          Pendaftaran SPMB Online
        </div>
        <p className={styles.subtitle}>
          Seleksi Penerimaan Murid Baru MTs Almaarif 01 Singosari<br />
          <p>Admin Mode - Update Data Pendaftar</p>
        </p>
      </div>

      <div className={styles.card} style={{ position: 'relative' }}>
        {loading && (
          <div className={styles.loadingOverlay}>
            <i className={`fas fa-spinner ${styles.spinner}`}></i>
            Memproses Pendaftaran & Upload Berkas...
          </div>
        )}

        <form onSubmit={handleSubmit}>
          
          <div className={styles.sectionTitle}>
            <i className="fas fa-info-circle"></i> Informasi Pendaftaran
          </div>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Jalur Pendaftaran <span>*</span></label>
              <select name="jalurPendaftaran" className={styles.select} value={formData.jalurPendaftaran} onChange={handleInputChange} required>
                <option value="Inden">Inden</option>
                <option value="Reguler">Reguler</option>
                <option value="Terpadu">Terpadu</option>
                <option value="Afirmasi">Afirmasi</option>
                <option value="Prestasi">Prestasi</option>
                <option value="Mandiri">Mandiri</option>
              </select>
            </div>
          </div>

          <div className={styles.sectionTitle}>
            <i className="fas fa-user"></i> Data Calon Peserta Didik
          </div>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Nama Lengkap <span>*</span></label>
              <input type="text" name="namaLengkap" className={styles.input} placeholder="Sesuai Akta Kelahiran" value={formData.namaLengkap} onChange={handleInputChange} required />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>NISN <span>*</span></label>
              <input type="text" name="nisn" className={styles.input} placeholder="Nomor Induk Siswa Nasional" value={formData.nisn} onChange={handleInputChange} required />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Tempat Lahir <span>*</span></label>
              <input type="text" name="tempatLahir" className={styles.input} placeholder="Contoh: Malang" value={formData.tempatLahir} onChange={handleInputChange} required />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Tanggal Lahir <span>*</span></label>
              <input type="date" name="tanggalLahir" className={styles.input} value={formData.tanggalLahir} onChange={handleInputChange} required />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Jenis Kelamin <span>*</span></label>
              <select name="jenisKelamin" className={styles.select} value={formData.jenisKelamin} onChange={handleInputChange} required>
                <option value="Laki-laki">Laki-laki</option>
                <option value="Perempuan">Perempuan</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Agama <span>*</span></label>
              <select name="agama" className={styles.select} value={formData.agama} onChange={handleInputChange} required>
                <option value="Islam">Islam</option>
                <option value="Kristen">Kristen</option>
                <option value="Katolik">Katolik</option>
                <option value="Hindu">Hindu</option>
                <option value="Buddha">Buddha</option>
                <option value="Konghucu">Konghucu</option>
              </select>
            </div>
              <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                <label className={styles.label}>Jalan / RT / RW (Tempat Tinggal) <span>*</span></label>
                <textarea name="alamatLengkap" className={styles.textarea} placeholder="Contoh: Jl. Diponegoro No. 10, RT 01 RW 02" value={formData.alamatLengkap} onChange={handleInputChange} required></textarea>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Desa / Kelurahan <span>*</span></label>
                <input type="text" name="desa" className={styles.input} placeholder="Contoh: Toyomarto" value={formData.desa} onChange={handleInputChange} required />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Kecamatan <span>*</span></label>
                <input type="text" name="kecamatan" className={styles.input} placeholder="Contoh: Singosari" value={formData.kecamatan} onChange={handleInputChange} required />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Kabupaten / Kota <span>*</span></label>
                <input type="text" name="kabupaten" className={styles.input} placeholder="Contoh: Malang" value={formData.kabupaten} onChange={handleInputChange} required />
              </div>
          </div>

          <div className={styles.sectionTitle}>
            <i className="fas fa-school"></i> Data Asal Sekolah
          </div>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Nama Asal Sekolah (SD/MI) <span>*</span></label>
              <input type="text" name="asalSekolah" className={styles.input} placeholder="Contoh: MI Almaarif 01" value={formData.asalSekolah} onChange={handleInputChange} list="sekolah-list" required />
              <datalist id="sekolah-list">
                {sekolahRef.map((s, idx) => (
                  <option key={idx} value={s.nama} />
                ))}
              </datalist>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>NPSN SD/MI <span>*</span></label>
              <input type="text" name="npsnSekolahAsal" className={styles.input} placeholder="Contoh: 20554142" value={formData.npsnSekolahAsal} onChange={handleInputChange} required />
            </div>
            <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
              <label className={styles.label}>Alamat Sekolah Asal <span>*</span></label>
              <input type="text" name="alamatSekolahAsal" className={styles.input} placeholder="Contoh: Singosari, Kab. Malang" value={formData.alamatSekolahAsal} onChange={handleInputChange} required />
            </div>
            <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
              <label className={styles.label}>Prestasi (Jika Ada)</label>
              <input type="text" name="prestasi" className={styles.input} placeholder="Tuliskan prestasi yang pernah diraih (Contoh: Juara 1 Lomba Puisi Tingkat Kabupaten)" value={formData.prestasi} onChange={handleInputChange} />
            </div>
          </div>

          <div className={styles.sectionTitle}>
            <i className="fas fa-users"></i> Data Orang Tua
          </div>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Nama Ayah <span>*</span></label>
              <input type="text" name="namaAyah" className={styles.input} value={formData.namaAyah} onChange={handleInputChange} required />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Pekerjaan Ayah <span>*</span></label>
              <input type="text" name="pekerjaanAyah" className={styles.input} value={formData.pekerjaanAyah} onChange={handleInputChange} required />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Nomor WA Ayah <span>*</span></label>
              <input type="tel" name="nomorWaAyah" className={styles.input} placeholder="Contoh: 081234567890" value={formData.nomorWaAyah} onChange={handleInputChange} required />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Nama Ibu <span>*</span></label>
              <input type="text" name="namaIbu" className={styles.input} value={formData.namaIbu} onChange={handleInputChange} required />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Pekerjaan Ibu <span>*</span></label>
              <input type="text" name="pekerjaanIbu" className={styles.input} value={formData.pekerjaanIbu} onChange={handleInputChange} required />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Nomor WA Ibu <span>*</span></label>
              <input type="tel" name="nomorWaIbu" className={styles.input} placeholder="Contoh: 081234567890" value={formData.nomorWaIbu} onChange={handleInputChange} required />
            </div>
          </div>

          <div className={styles.sectionTitle}>
            <i className="fas fa-file-upload"></i> Upload Berkas Persyaratan
          </div>
          <div className={styles.fileGrid}>
            
            {/* KK Upload */}
            {formData.linkKk && !fileKk && (
                <div style={{ padding: '12px', background: '#eef2ff', borderRadius: '12px', gridColumn: '1 / -1', fontSize: '0.9rem', marginBottom: '12px' }}>
                  <strong>File Kartu Keluarga (KK) Saat Ini:</strong><br/>
                  <a href={formData.linkKk} target="_blank" rel="noreferrer" style={{ color: '#4f46e5', textDecoration: 'underline' }}>Lihat File KK Tersimpan</a>
                </div>
            )}
            <div className={`${styles.fileUploadBox} ${fileKk ? styles.hasFile : ''}`} onClick={() => fileKkRef.current?.click()}>
              <input 
                type="file" 
                accept="image/*,.pdf" 
                className={styles.hiddenInput} 
                ref={fileKkRef} 
                onChange={(e) => setFileKk(e.target.files?.[0] || null)}
              />
              <i className={`fas fa-id-card ${styles.fileIcon}`}></i>
              <div className={styles.fileTitle}>Kartu Keluarga (KK) <span>*</span></div>
              {fileKk ? (
                <div className={styles.fileName}><i className="fas fa-check"></i> {fileKk.name}</div>
              ) : (
                <div className={styles.fileDesc}>Klik untuk memilih file PDF atau Gambar</div>
              )}
            </div>

          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            <i className="fas fa-save"></i> Simpan Perubahan
          </button>

        </form>
      </div>
    </div>
  );
}


