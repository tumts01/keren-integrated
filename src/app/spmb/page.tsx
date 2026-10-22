'use client';
import { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Swal from 'sweetalert2';
import styles from './Spmb.module.css';
import ModalAturJalur, { JalurItem } from './components/ModalAturJalur';

export default function SpmbPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [sekolahRef, setSekolahRef] = useState<{nama: string, alamat: string, npsn?: string}[]>([]);

  // Admin & Jalur Config States
  const [isAdmin, setIsAdmin] = useState(false);
  const [jalurList, setJalurList] = useState<JalurItem[]>([]);
  const [pendaftaranBuka, setPendaftaranBuka] = useState(true);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);

  useEffect(() => {
    // Check if logged in user is admin
    const userStr = localStorage.getItem('keren_user_data');
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        const role = (u.role || '').toLowerCase();
        if (role === 'admin' || role === 'pimpinan') {
          setIsAdmin(true);
        }
      } catch (e) {
        console.error(e);
      }
    }

    // Load SPMB config (jalur aktif/tidak & status buka)
    fetch('/api/spmb/config')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.jalur)) {
          setJalurList(data.jalur);
          setPendaftaranBuka(data.pendaftaran_buka ?? true);
          const activeList = data.jalur.filter((j: JalurItem) => j.aktif);
          if (activeList.length > 0) {
            setFormData(prev => ({
              ...prev,
              jalurPendaftaran: activeList.some((j: JalurItem) => j.nama === prev.jalurPendaftaran)
                ? prev.jalurPendaftaran
                : activeList[0].nama
            }));
          }
        }
      })
      .catch(err => console.error('Gagal memuat konfigurasi jalur SPMB', err))
      .finally(() => setLoadingConfig(false));

    // Load referensi sekolah
    fetch('/api/spmb/sekolah')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSekolahRef(data.data);
        }
      })
      .catch(err => console.error('Gagal memuat referensi sekolah', err));
  }, []);

  const activeJalurList = useMemo(() => {
    return jalurList.filter(j => j.aktif);
  }, [jalurList]);

  const handleSaveConfigSuccess = (updatedJalur: JalurItem[], buka: boolean) => {
    setJalurList(updatedJalur);
    setPendaftaranBuka(buka);
    const activeList = updatedJalur.filter(j => j.aktif);
    if (activeList.length > 0) {
      setFormData(prev => ({
        ...prev,
        jalurPendaftaran: activeList.some(j => j.nama === prev.jalurPendaftaran)
          ? prev.jalurPendaftaran
          : activeList[0].nama
      }));
    }
  };

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
    prestasi: ''
  });

  const [fileKk, setFileKk] = useState<File | null>(null);

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

    if (!pendaftaranBuka) {
      showToast('Pendaftaran SPMB Online sedang ditutup sementara oleh madrasah.', 'error');
      return;
    }

    if (activeJalurList.length === 0) {
      showToast('Tidak ada jalur pendaftaran yang aktif saat ini.', 'error');
      return;
    }

    if (!fileKk) {
      showToast('File Kartu Keluarga wajib diunggah!', 'error');
      return;
    }

    if (!formData.namaLengkap) {
      showToast('Nama Lengkap wajib diisi terlebih dahulu!', 'error');
      return;
    }

    setLoading(true);
    try {
      // Format nama untuk file: hilangkan spasi ganda, ganti spasi dengan underscore
      const safeName = formData.namaLengkap.trim().replace(/\s+/g, '_');

      // 1. Upload KK dengan rename otomatis
      const linkKk = await uploadToDrive(fileKk, `KK_${safeName}`);

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
        npsnSekolahAsal: formData.npsnSekolahAsal,
        alamatSekolahAsal: formData.alamatSekolahAsal,
        namaAyah: formData.namaAyah,
        pekerjaanAyah: formData.pekerjaanAyah,
        namaIbu: formData.namaIbu,
        pekerjaanIbu: formData.pekerjaanIbu,
        nomorWaAyah: formData.nomorWaAyah,
        nomorWaIbu: formData.nomorWaIbu,
        alamatLengkap: formData.alamatLengkap,
        desa: formData.desa,
        kecamatan: formData.kecamatan,
        kabupaten: formData.kabupaten,
        prestasi: formData.prestasi,
        linkKk: linkKk
      };

      const res = await fetch('/api/spmb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbPayload)
      });

      const result = await res.json();

      if (result.success) {
        const noReg = result.nomorPendaftaran || '';
        const regId = result.id;
        const studentName = formData.namaLengkap;

        // Auto-save SPMB session so parent can directly access portal
        if (regId) {
          try {
            const sessionData = {
              id: regId,
              nomorPendaftaran: noReg,
              namaLengkap: studentName,
              nisn: formData.nisn,
              jalurPendaftaran: formData.jalurPendaftaran,
              asalSekolah: formData.asalSekolah,
              statusVerifikasi: 'menunggu',
              statusKelulusan: 'proses'
            };
            localStorage.setItem('spmb_session', JSON.stringify(sessionData));
            localStorage.setItem('keren_app_preference', 'spmb');
          } catch (e) {
            console.error('Error saving spmb session', e);
          }
        }

        Swal.fire({
          icon: 'success',
          title: '🎉 Pendaftaran Berhasil!',
          html: `
            <div style="text-align: left; font-size: 14px; color: #334155; line-height: 1.6; margin-top: 10px;">
              <p style="margin: 0 0 12px 0;">Alhamdulillah, data pendaftaran ananda <b>${studentName}</b> telah berhasil tersimpan di sistem.</p>
              <div style="background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 12px; padding: 14px; text-align: center; margin-bottom: 12px;">
                <div style="font-size: 12px; color: #166534; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Nomor Pendaftaran Anda:</div>
                <div style="font-size: 22px; font-weight: 800; color: #15803d; letter-spacing: 1px; margin-top: 4px;">${noReg || 'MTS01-2026-XXXXX'}</div>
              </div>
              <div style="background: #eff6ff; border: 1.5px solid #bfdbfe; border-radius: 10px; padding: 12px; margin-bottom: 12px;">
                <div style="font-size: 12.5px; font-weight: 700; color: #1e40af; margin-bottom: 4px;">
                  📋 Berkas yang Harus Dikumpulkan:
                </div>
                <div style="font-size: 12px; color: #1e3a8a; line-height: 1.5;">
                  Calon siswa wajib mengumpulkan berkas <b>Fotokopi Rapor Kelas 5 (Semester 1 & 2)</b>. Berkas boleh diserahkan fisik langsung ke madrasah atau dikirim file/foto ke WhatsApp Panitia SPMB untuk diverifikasi.
                </div>
              </div>
              <p style="margin: 0; font-size: 12px; color: #64748b;">
                <b>Catatan:</b> Simpan Nomor Pendaftaran ini untuk memantau status verifikasi berkas dan pengumuman di <b>Portal Calon Siswa</b>.
              </p>
            </div>
          `,
          showCancelButton: true,
          confirmButtonColor: '#059669',
          cancelButtonColor: '#0284c7',
          confirmButtonText: '<i class="fas fa-user-check"></i> Masuk ke Portal Calon Siswa',
          cancelButtonText: '<i class="fas fa-print"></i> Cetak Kartu Sekarang',
          allowOutsideClick: false
        }).then((choice) => {
          if (choice.isConfirmed) {
            router.push('/spmb/portal');
          } else if (regId) {
            router.push('/spmb/cetak/' + regId);
          }
        });
        
        // Reset Form
        setFormData({
          jalurPendaftaran: activeJalurList[0]?.nama || 'Reguler',
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
          prestasi: ''
        });
        setFileKk(null);
        if (fileKkRef.current) fileKkRef.current.value = '';

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

      {/* Banner Utama (Hero Madrasah Header) */}
      <div className={styles.header}>
        <img
          src="/logo.png"
          alt="Logo MTs Almaarif"
          style={{ width: '85px', height: 'auto', marginBottom: '14px', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))' }}
        />
        
        {/* Badge Kategori SPMB */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(255, 255, 255, 0.18)',
          backdropFilter: 'blur(6px)',
          padding: '6px 18px',
          borderRadius: '50px',
          fontSize: '0.85rem',
          fontWeight: 800,
          letterSpacing: '0.6px',
          textTransform: 'uppercase',
          marginBottom: '10px',
          border: '1px solid rgba(255, 255, 255, 0.3)'
        }}>
          <i className="fas fa-graduation-cap"></i> PENDAFTARAN SPMB ONLINE
        </div>

        {/* Nama Madrasah Lebih Menonjol & Gagah */}
        <h1 style={{
          fontSize: '2.1rem',
          fontWeight: 900,
          margin: '0 0 8px 0',
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
          textShadow: '0 2px 8px rgba(0,0,0,0.2)',
          lineHeight: 1.2
        }}>
          MTs Almaarif 01 Singosari
        </h1>

        <p className={styles.subtitle} style={{ fontSize: '1rem', opacity: 0.95 }}>
          Seleksi Penerimaan Murid Baru • <strong>Tahun Ajaran {spmbYear}</strong>
        </p>

        {/* Admin Quick Control Button */}
        {isAdmin && (
          <div style={{ marginTop: '14px' }}>
            <button
              type="button"
              onClick={() => setShowConfigModal(true)}
              style={{
                background: '#047857',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.3)',
                padding: '8px 18px',
                borderRadius: '50px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 10px rgba(0, 0, 0, 0.15)',
                transition: 'all 0.2s ease'
              }}
            >
              <i className="fas fa-sliders-h"></i> Atur Jalur Pendaftaran (Admin)
            </button>
          </div>
        )}
      </div>

      {/* Action Cards (Dipisahkan dari Banner Hijau) */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '14px',
        marginBottom: '4px'
      }}>
        {/* Tombol Download Brosur SPMB */}
        <a
          href="https://drive.google.com/file/d/16tGIlXUxRzfErVTR81XhuEfb9WpUvUl1/view?usp=sharing"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            flex: '1 1 280px',
            background: 'white',
            border: '1.5px solid #e2e8f0',
            borderRadius: '16px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            textDecoration: 'none',
            boxShadow: '0 3px 10px rgba(0, 0, 0, 0.03)',
            transition: 'all 0.2s ease',
            cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: '#fee2e2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              flexShrink: 0
            }}>
              <i className="fas fa-file-pdf"></i>
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>
                Brosur Informasi SPMB
              </div>
              <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                Unduh rincian & panduan masuk
              </div>
            </div>
          </div>
          <span style={{
            background: '#dc2626',
            color: 'white',
            fontSize: '11.5px',
            fontWeight: 800,
            padding: '7px 12px',
            borderRadius: '8px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap'
          }}>
            <i className="fas fa-download"></i> Unduh
          </span>
        </a>

        {/* Tombol Masuk ke Portal Calon Siswa */}
        <Link
          href="/spmb/login"
          style={{
            flex: '1 1 320px',
            background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)',
            border: '1.5px solid #a7f3d0',
            borderRadius: '16px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            textDecoration: 'none',
            boxShadow: '0 3px 10px rgba(16, 185, 129, 0.08)',
            transition: 'all 0.2s ease',
            cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: '#10b981',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              flexShrink: 0
            }}>
              <i className="fas fa-id-card"></i>
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#065f46' }}>
                Sudah Pernah Mendaftar?
              </div>
              <div style={{ fontSize: '11.5px', color: '#047857' }}>
                Pantau verifikasi berkas & kelulusan
              </div>
            </div>
          </div>
          <span style={{
            background: '#047857',
            color: 'white',
            fontSize: '11.5px',
            fontWeight: 800,
            padding: '7px 14px',
            borderRadius: '8px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap'
          }}>
            Portal Siswa &rarr;
          </span>
        </Link>
      </div>

      <div className={styles.card} style={{ position: 'relative' }}>
        {loading && (
          <div className={styles.loadingOverlay}>
            <i className={`fas fa-spinner ${styles.spinner}`}></i>
            Memproses Pendaftaran & Upload Berkas...
          </div>
        )}

        <form onSubmit={handleSubmit}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div className={styles.sectionTitle} style={{ margin: 0 }}>
              <i className="fas fa-info-circle"></i> Informasi Pendaftaran
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowConfigModal(true)}
                style={{
                  background: '#f0fdf4',
                  color: '#15803d',
                  border: '1.5px solid #86efac',
                  padding: '5px 12px',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <i className="fas fa-sliders-h"></i> Atur Jalur Aktif
              </button>
            )}
          </div>

          {/* Banner jika Pendaftaran ditutup */}
          {!pendaftaranBuka && (
            <div style={{
              background: '#fef2f2',
              border: '1.5px solid #fecaca',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              color: '#991b1b'
            }}>
              <i className="fas fa-lock fa-2x" style={{ color: '#ef4444' }}></i>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.98rem' }}>Pendaftaran SPMB Ditutup Sementara</div>
                <div style={{ fontSize: '0.85rem', color: '#b91c1c', marginTop: '2px' }}>
                  Mohon maaf, pendaftaran murid baru online saat ini sedang ditutup oleh pihak madrasah.
                </div>
              </div>
            </div>
          )}

          {/* Banner jika tidak ada jalur aktif */}
          {pendaftaranBuka && activeJalurList.length === 0 && !loadingConfig && (
            <div style={{
              background: '#fffbeb',
              border: '1.5px solid #fde68a',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              color: '#92400e'
            }}>
              <i className="fas fa-exclamation-triangle fa-2x" style={{ color: '#f59e0b' }}></i>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.98rem' }}>Belum Ada Jalur Pendaftaran yang Aktif</div>
                <div style={{ fontSize: '0.85rem', color: '#b45309', marginTop: '2px' }}>
                  Seluruh jalur pendaftaran sedang dinonaktifkan sementara. Silakan hubungi pihak panitia SPMB madrasah.
                </div>
              </div>
            </div>
          )}

          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Jalur Pendaftaran <span>*</span></label>
              <select
                name="jalurPendaftaran"
                className={styles.select}
                value={formData.jalurPendaftaran}
                onChange={handleInputChange}
                required
                disabled={!pendaftaranBuka || activeJalurList.length === 0}
              >
                {activeJalurList.length > 0 ? (
                  activeJalurList.map(j => (
                    <option key={j.id} value={j.nama}>{j.nama}</option>
                  ))
                ) : (
                  <option value="" disabled>-- Tidak ada jalur pendaftaran yang aktif --</option>
                )}
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
          </div>

          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Tempat Lahir <span>*</span></label>
              <input type="text" name="tempatLahir" className={styles.input} value={formData.tempatLahir} onChange={handleInputChange} required />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Tanggal Lahir <span>*</span></label>
              <input type="date" name="tanggalLahir" className={styles.input} value={formData.tanggalLahir} onChange={handleInputChange} required />
            </div>
          </div>

          <div className={styles.formGrid}>
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
                <option value="Khonghucu">Khonghucu</option>
              </select>
            </div>
          </div>

          <div className={styles.sectionTitle}>
            <i className="fas fa-school"></i> Data Asal Sekolah
          </div>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Asal Sekolah / Madrasah <span>*</span></label>
              <input 
                type="text" 
                name="asalSekolah" 
                list="daftarSekolah" 
                className={styles.input} 
                placeholder="Ketik atau pilih nama SD/MI asal..." 
                value={formData.asalSekolah} 
                onChange={handleInputChange} 
                required 
              />
              <datalist id="daftarSekolah">
                {sekolahRef.map((s, idx) => (
                  <option key={idx} value={s.nama}>{s.alamat ? `${s.nama} (${s.alamat})` : s.nama}</option>
                ))}
              </datalist>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>NPSN Sekolah Asal</label>
              <input type="text" name="npsnSekolahAsal" className={styles.input} placeholder="Contoh: 20512345" value={formData.npsnSekolahAsal} onChange={handleInputChange} />
            </div>
          </div>

          <div className={styles.formGrid}>
            <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
              <label className={styles.label}>Alamat Sekolah Asal</label>
              <input type="text" name="alamatSekolahAsal" className={styles.input} placeholder="Desa/Kelurahan, Kecamatan, Kota/Kabupaten" value={formData.alamatSekolahAsal} onChange={handleInputChange} />
            </div>
          </div>

          <div className={styles.sectionTitle}>
            <i className="fas fa-users"></i> Data Orang Tua / Wali
          </div>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Nama Ayah Kandung <span>*</span></label>
              <input type="text" name="namaAyah" className={styles.input} value={formData.namaAyah} onChange={handleInputChange} required />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Pekerjaan Ayah <span>*</span></label>
              <input type="text" name="pekerjaanAyah" className={styles.input} value={formData.pekerjaanAyah} onChange={handleInputChange} required />
            </div>
          </div>

          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Nama Ibu Kandung <span>*</span></label>
              <input type="text" name="namaIbu" className={styles.input} value={formData.namaIbu} onChange={handleInputChange} required />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Pekerjaan Ibu <span>*</span></label>
              <input type="text" name="pekerjaanIbu" className={styles.input} value={formData.pekerjaanIbu} onChange={handleInputChange} required />
            </div>
          </div>

          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Nomor WhatsApp Ayah <span>*</span></label>
              <input type="tel" name="nomorWaAyah" className={styles.input} placeholder="08xxxxxxxxxx" value={formData.nomorWaAyah} onChange={handleInputChange} required />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Nomor WhatsApp Ibu</label>
              <input type="tel" name="nomorWaIbu" className={styles.input} placeholder="08xxxxxxxxxx" value={formData.nomorWaIbu} onChange={handleInputChange} />
            </div>
          </div>

          <div className={styles.sectionTitle}>
            <i className="fas fa-map-marker-alt"></i> Alamat Tempat Tinggal
          </div>
          <div className={styles.formGrid}>
            <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
              <label className={styles.label}>Alamat Lengkap (Jalan / RT / RW) <span>*</span></label>
              <textarea name="alamatLengkap" className={styles.textarea} rows={3} placeholder="Contoh: Jl. Raya Singosari No. 12 RT 02 RW 01" value={formData.alamatLengkap} onChange={handleInputChange} required></textarea>
            </div>
          </div>

          <div className={styles.formGrid3}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Desa / Kelurahan <span>*</span></label>
              <input type="text" name="desa" className={styles.input} value={formData.desa} onChange={handleInputChange} required />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Kecamatan <span>*</span></label>
              <input type="text" name="kecamatan" className={styles.input} value={formData.kecamatan} onChange={handleInputChange} required />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Kabupaten / Kota <span>*</span></label>
              <input type="text" name="kabupaten" className={styles.input} value={formData.kabupaten} onChange={handleInputChange} required />
            </div>
          </div>

          <div className={styles.sectionTitle}>
            <i className="fas fa-trophy"></i> Prestasi (Opsional)
          </div>
          <div className={styles.formGrid}>
            <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
              <label className={styles.label}>Prestasi yang Pernah Diraih</label>
              <textarea name="prestasi" className={styles.textarea} rows={2} placeholder="Sebutkan prestasi akademik / non-akademik beserta tingkat kejuaraan jika ada" value={formData.prestasi} onChange={handleInputChange}></textarea>
            </div>
          </div>

          <div className={styles.sectionTitle}>
            <i className="fas fa-file-upload"></i> Unggah Berkas Persyaratan
          </div>
          <div className={styles.fileGrid}>
            
            {/* KK Upload */}
            <div className={`${styles.fileUploadBox} ${fileKk ? styles.hasFile : ''}`} onClick={() => fileKkRef.current?.click()}>
              <input 
                type="file" 
                accept="image/*,.pdf" 
                className={styles.hiddenInput} 
                ref={fileKkRef} 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file && file.size > 2.5 * 1024 * 1024) {
                    showToast('Ukuran file terlalu besar! Maksimal 2.5 MB.', 'error');
                    if (fileKkRef.current) fileKkRef.current.value = '';
                    setFileKk(null);
                  } else {
                    setFileKk(file || null);
                  }
                }}
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

          <div style={{
            background: '#f0fdf4',
            border: '1.5px solid #86efac',
            borderRadius: '12px',
            padding: '14px 18px',
            marginBottom: '20px',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start'
          }}>
            <i className="fas fa-info-circle" style={{ color: '#16a34a', fontSize: '1.25rem', marginTop: '2px', flexShrink: 0 }}></i>
            <div style={{ fontSize: '13px', color: '#166534', lineHeight: '1.5' }}>
              <strong>Pengumpulan Berkas Rapor Setelah Mendaftar:</strong><br/>
              Setelah pendaftaran online, calon siswa wajib mengumpulkan berkas <strong>Fotokopi Rapor Kelas 5 (Semester 1 &amp; 2)</strong>. Berkas boleh diserahkan secara fisik langsung ke madrasah atau dikirim dalam bentuk file/foto via WhatsApp ke Panitia SPMB.
            </div>
          </div>

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading || !pendaftaranBuka || activeJalurList.length === 0}
          >
            {!pendaftaranBuka ? (
              <>
                <i className="fas fa-lock"></i> Pendaftaran SPMB Ditutup
              </>
            ) : activeJalurList.length === 0 ? (
              <>
                <i className="fas fa-ban"></i> Tidak Ada Jalur Aktif
              </>
            ) : (
              <>
                <i className="fas fa-paper-plane"></i> Kirim Pendaftaran SPMB
              </>
            )}
          </button>

        </form>
      </div>

      {/* Modal Pengaturan Jalur SPMB (Khusus Admin) */}
      <ModalAturJalur
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        onSaveSuccess={handleSaveConfigSuccess}
      />
    </div>
  );
}
