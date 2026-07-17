'use client';
import { useState, useRef } from 'react';
import styles from './Spmb.module.css';

export default function SpmbPage() {
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

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
    namaAyah: '',
    namaIbu: '',
    nomorWaAyah: '',
    nomorWaIbu: '',
    alamatLengkap: '',
    prestasi: ''
  });

  const [fileKk, setFileKk] = useState<File | null>(null);
  const [fileAkta, setFileAkta] = useState<File | null>(null);

  const fileKkRef = useRef<HTMLInputElement>(null);
  const fileAktaRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const uploadToDrive = async (file: File): Promise<string> => {
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);
    
    // We will hit our local API which will then hit the Google Apps Script
    // But since the local API expects 'folderId' and type 'spmb', let's set it up.
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
    if (!fileKk || !fileAkta) {
      showToast('File Kartu Keluarga dan Akta Kelahiran wajib diunggah!', 'error');
      return;
    }

    setLoading(true);
    try {
      // 1. Upload KK
      const linkKk = await uploadToDrive(fileKk);
      
      // 2. Upload Akta
      const linkAkta = await uploadToDrive(fileAkta);

      // 3. Save to Database
      const tempatTanggalLahir = `${formData.tempatLahir}, ${formData.tanggalLahir}`;

      const dbPayload = {
        jalurPendaftaran: formData.jalurPendaftaran,
        namaLengkap: formData.namaLengkap,
        nisn: formData.nisn,
        tempatTanggalLahir: tempatTanggalLahir,
        jenisKelamin: formData.jenisKelamin,
        agama: formData.agama,
        asalSekolah: formData.asalSekolah,
        alamatSekolahAsal: formData.alamatSekolahAsal,
        namaAyah: formData.namaAyah,
        namaIbu: formData.namaIbu,
        nomorWaAyah: formData.nomorWaAyah,
        nomorWaIbu: formData.nomorWaIbu,
        alamatLengkap: formData.alamatLengkap,
        prestasi: formData.prestasi,
        linkKk: linkKk,
        linkAkta: linkAkta
      };

      const res = await fetch('/api/spmb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbPayload)
      });

      const result = await res.json();

      if (result.success) {
        showToast('Pendaftaran Berhasil! Data Anda telah tersimpan.', 'success');
        
        // Reset Form
        setFormData({
          jalurPendaftaran: 'Reguler',
          namaLengkap: '',
          nisn: '',
          tempatLahir: '',
          tanggalLahir: '',
          jenisKelamin: 'Laki-laki',
          agama: 'Islam',
          asalSekolah: '',
          alamatSekolahAsal: '',
          namaAyah: '',
          namaIbu: '',
          nomorWaAyah: '',
          nomorWaIbu: '',
          alamatLengkap: '',
          prestasi: ''
        });
        setFileKk(null);
        setFileAkta(null);
        if (fileKkRef.current) fileKkRef.current.value = '';
        if (fileAktaRef.current) fileAktaRef.current.value = '';

      } else {
        showToast(`Gagal mendaftar: ${result.error}`, 'error');
      }

    } catch (error: any) {
      showToast(error.message || 'Terjadi kesalahan sistem saat mendaftar.', 'error');
    } finally {
      setLoading(false);
    }
  };

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
        <div className={styles.title}>
          <div className={styles.titleIcon}>
            <i className="fas fa-user-graduate"></i>
          </div>
          Pendaftaran SPMB Online
        </div>
        <p className={styles.subtitle}>
          Seleksi Penerimaan Murid Baru MTs Almaarif 01 Singosari Tahun Ajaran 2026/2027
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
            <div className={styles.formGroupFull}>
              <label className={styles.label}>Alamat Lengkap (Tempat Tinggal) <span>*</span></label>
              <textarea name="alamatLengkap" className={styles.textarea} placeholder="Jalan, RT/RW, Desa/Kelurahan, Kecamatan, Kabupaten" value={formData.alamatLengkap} onChange={handleInputChange} required></textarea>
            </div>
          </div>

          <div className={styles.sectionTitle}>
            <i className="fas fa-school"></i> Data Asal Sekolah
          </div>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Nama Asal Sekolah (SD/MI) <span>*</span></label>
              <input type="text" name="asalSekolah" className={styles.input} placeholder="Contoh: MI Almaarif 01" value={formData.asalSekolah} onChange={handleInputChange} required />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Alamat Sekolah Asal <span>*</span></label>
              <input type="text" name="alamatSekolahAsal" className={styles.input} placeholder="Contoh: Singosari, Kab. Malang" value={formData.alamatSekolahAsal} onChange={handleInputChange} required />
            </div>
            <div className={styles.formGroupFull}>
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
              <label className={styles.label}>Nomor WA Ayah <span>*</span></label>
              <input type="tel" name="nomorWaAyah" className={styles.input} placeholder="Contoh: 081234567890" value={formData.nomorWaAyah} onChange={handleInputChange} required />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Nama Ibu <span>*</span></label>
              <input type="text" name="namaIbu" className={styles.input} value={formData.namaIbu} onChange={handleInputChange} required />
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

            {/* Akta Upload */}
            <div className={`${styles.fileUploadBox} ${fileAkta ? styles.hasFile : ''}`} onClick={() => fileAktaRef.current?.click()}>
              <input 
                type="file" 
                accept="image/*,.pdf" 
                className={styles.hiddenInput} 
                ref={fileAktaRef} 
                onChange={(e) => setFileAkta(e.target.files?.[0] || null)}
              />
              <i className={`fas fa-child ${styles.fileIcon}`}></i>
              <div className={styles.fileTitle}>Akta Kelahiran <span>*</span></div>
              {fileAkta ? (
                <div className={styles.fileName}><i className="fas fa-check"></i> {fileAkta.name}</div>
              ) : (
                <div className={styles.fileDesc}>Klik untuk memilih file PDF atau Gambar</div>
              )}
            </div>

          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            <i className="fas fa-paper-plane"></i> Kirim Pendaftaran SPMB
          </button>

        </form>
      </div>
    </div>
  );
}
