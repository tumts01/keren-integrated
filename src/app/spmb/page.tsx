'use client';
import { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Swal from 'sweetalert2';
import styles from './Spmb.module.css';
import ModalAturJalur, { JalurItem } from './components/ModalAturJalur';
import { compressDocumentImage, formatFileSize } from '@/lib/image-compression';

const BULAN_OPTIONS = [
  { val: '01', label: 'Januari' },
  { val: '02', label: 'Februari' },
  { val: '03', label: 'Maret' },
  { val: '04', label: 'April' },
  { val: '05', label: 'Mei' },
  { val: '06', label: 'Juni' },
  { val: '07', label: 'Juli' },
  { val: '08', label: 'Agustus' },
  { val: '09', label: 'September' },
  { val: '10', label: 'Oktober' },
  { val: '11', label: 'November' },
  { val: '12', label: 'Desember' }
];

const HARI_OPTIONS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
const TAHUN_LAHIR_OPTIONS = Array.from({ length: 18 }, (_, i) => String(2022 - i));

const PENDIDIKAN_OPTIONS = [
  'SD / MI Sederajat',
  'SMP / MTs Sederajat',
  'SMA / SMK / MA Sederajat',
  'D1 / D2 / D3',
  'D4 / S1',
  'S2',
  'S3',
  'Tidak Bersekolah'
];

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
                : ''
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
          : ''
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

  // Date of Birth Dropdown States
  const [tglLahirHari, setTglLahirHari] = useState('');
  const [tglLahirBulan, setTglLahirBulan] = useState('');
  const [tglLahirTahun, setTglLahirTahun] = useState('');

  // Form States
  const [formData, setFormData] = useState({
    jalurPendaftaran: '',
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
    pendidikanAyah: '',
    pekerjaanAyah: '',
    namaIbu: '',
    pendidikanIbu: '',
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
  const [compressingKk, setCompressingKk] = useState(false);
  const [kkFileInfo, setKkFileInfo] = useState<{
    originalSize: number;
    compressedSize: number;
    isCompressed: boolean;
  } | null>(null);

  const fileKkRef = useRef<HTMLInputElement>(null);

  const handleFileKkChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value agar dapat memilih ulang file yang sama jika diperlukan
    if (fileKkRef.current) {
      fileKkRef.current.value = '';
    }

    const fileName = (file.name || '').toLowerCase();
    const fileType = (file.type || '').toLowerCase();

    // 0. Tolak secara tegas jika berkas berupa VIDEO
    const isVideo = fileType.startsWith('video/') || /\.(mp4|mov|avi|mkv|webm|3gp|wmv|flv|m4v|mpg|mpeg)$/i.test(fileName);
    if (isVideo) {
      Swal.fire({
        icon: 'error',
        title: 'Berkas Video Ditolak!',
        html: `
          <div style="text-align: left; font-size: 13.5px; color: #475569; line-height: 1.6;">
            Mohon maaf, berkas Kartu Keluarga <b>tidak boleh dalam format video</b>.<br/><br/>
            Silakan unggah <b>foto dokumen KK</b> (JPG/PNG) atau <b>dokumen scan PDF</b>.
          </div>
        `,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'Mengerti'
      });
      setFileKk(null);
      setKkFileInfo(null);
      return;
    }

    // 1. Jika berkas berupa PDF
    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      if (file.size > 5 * 1024 * 1024) {
        showToast('Ukuran file PDF terlalu besar! Maksimal 5 MB.', 'error');
        setFileKk(null);
        setKkFileInfo(null);
        return;
      }
      setFileKk(file);
      setKkFileInfo({
        originalSize: file.size,
        compressedSize: file.size,
        isCompressed: false,
      });
      return;
    }

    // 2. Jika berkas berupa Gambar (Foto Kamera, Galeri HP, JPG, PNG, WEBP, dll)
    if (fileType.startsWith('image/') || /\.(jpe?g|png|webp|heic|bmp)$/i.test(fileName)) {
      setCompressingKk(true);
      try {
        const result = await compressDocumentImage(file, {
          maxDimension: 2200,      // Resolusi tinggi agar teks/angka di KK tetap tajam & tidak pecah
          initialQuality: 0.85,    // Kualitas JPEG jernih
          maxFileSizeBytes: 2.5 * 1024 * 1024 // Target di bawah 2.5 MB
        });

        if (result.file.size > 2.5 * 1024 * 1024) {
          showToast('Ukuran file foto KK masih di atas 2.5 MB. Mohon gunakan foto dengan pencahayaan cukup.', 'error');
          setFileKk(null);
          setKkFileInfo(null);
          return;
        }

        setFileKk(result.file);
        setKkFileInfo({
          originalSize: result.originalSize,
          compressedSize: result.compressedSize,
          isCompressed: result.isCompressed,
        });

        if (result.isCompressed) {
          showToast(
            `Foto KK berhasil dioptimasi (${formatFileSize(result.originalSize)} ➔ ${formatFileSize(result.compressedSize)}) dengan kualitas tajam!`,
            'success'
          );
        }
      } catch (err) {
        console.error('Gagal mengompresi gambar KK:', err);
        if (file.size > 2.5 * 1024 * 1024) {
          showToast('Ukuran file terlalu besar! Maksimal 2.5 MB.', 'error');
          setFileKk(null);
          setKkFileInfo(null);
        } else {
          setFileKk(file);
          setKkFileInfo({
            originalSize: file.size,
            compressedSize: file.size,
            isCompressed: false,
          });
        }
      } finally {
        setCompressingKk(false);
      }
      return;
    }

    // 3. Jika format tidak sesuai
    showToast('Format file tidak didukung! Gunakan foto (JPG/PNG) atau dokumen PDF.', 'error');
    setFileKk(null);
    setKkFileInfo(null);
  };

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

    if (!formData.jalurPendaftaran) {
      showToast('Silakan pilih Jalur Pendaftaran terlebih dahulu!', 'error');
      return;
    }

    if (formData.jalurPendaftaran.toLowerCase().includes('prestasi') && !formData.prestasi.trim()) {
      showToast('Untuk Jalur Prestasi, mohon sebutkan prestasi yang pernah diraih pada kolom Prestasi!', 'error');
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

    if (!tglLahirHari || !tglLahirBulan || !tglLahirTahun) {
      showToast('Mohon lengkapi Hari, Bulan, dan Tahun Tanggal Lahir!', 'error');
      return;
    }

    setLoading(true);
    try {
      // Format nama untuk file: hilangkan spasi ganda, ganti spasi dengan underscore
      const safeName = formData.namaLengkap.trim().replace(/\s+/g, '_');

      // 1. Upload KK dengan rename otomatis
      const linkKk = await uploadToDrive(fileKk, `KK_${safeName}`);

      // 3. Save to Database
      const tanggalLahir = (tglLahirHari && tglLahirBulan && tglLahirTahun) ? `${tglLahirTahun}-${tglLahirBulan}-${tglLahirHari}` : formData.tanggalLahir;
      const tempatTanggalLahir = `${formData.tempatLahir}, ${tanggalLahir}`;

      const dbPayload = {
        jalurPendaftaran: formData.jalurPendaftaran,
        namaLengkap: formData.namaLengkap,
        nisn: formData.nisn,
        tempatTanggalLahir: tempatTanggalLahir,
        jenisKelamin: formData.jenisKelamin,
        agama: 'Islam',
        asalSekolah: formData.asalSekolah,
        npsnSekolahAsal: formData.npsnSekolahAsal,
        alamatSekolahAsal: formData.alamatSekolahAsal,
        namaAyah: formData.namaAyah,
        pendidikanAyah: formData.pendidikanAyah,
        pekerjaanAyah: formData.pekerjaanAyah,
        namaIbu: formData.namaIbu,
        pendidikanIbu: formData.pendidikanIbu,
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
          jalurPendaftaran: '',
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
          pendidikanAyah: '',
          pekerjaanAyah: '',
          namaIbu: '',
          pendidikanIbu: '',
          pekerjaanIbu: '',
          nomorWaAyah: '',
          nomorWaIbu: '',
          alamatLengkap: '',
          desa: '',
          kecamatan: '',
          kabupaten: '',
          prestasi: ''
        });
        setTglLahirHari('');
        setTglLahirBulan('');
        setTglLahirTahun('');
        setFileKk(null);
        setKkFileInfo(null);
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

  const jalurLower = (formData.jalurPendaftaran || '').toLowerCase();
  const isTerpadu = jalurLower.includes('terpadu');
  const isPrestasi = jalurLower.includes('prestasi');
  const isAfirmasi = jalurLower.includes('afirmasi');
  const isReguler = jalurLower.includes('reguler');

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
        <div className={styles.heroWrapper}>
          <img
            src="/logo.png"
            alt="Logo MTs Almaarif"
            className={styles.heroLogo}
          />
          
          <div className={styles.heroContent}>
            {/* Badge Kategori SPMB */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(255, 255, 255, 0.18)',
              backdropFilter: 'blur(6px)',
              padding: '5px 16px',
              borderRadius: '50px',
              fontSize: '0.82rem',
              fontWeight: 800,
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              marginBottom: '8px',
              border: '1px solid rgba(255, 255, 255, 0.3)'
            }}>
              <i className="fas fa-graduation-cap"></i> PENDAFTARAN SPMB ONLINE
            </div>

            {/* Nama Madrasah Menonjol & Menyatu dengan Logo */}
            <h1 style={{
              fontSize: '2.1rem',
              fontWeight: 900,
              margin: '0 0 6px 0',
              letterSpacing: '0.4px',
              textTransform: 'uppercase',
              textShadow: '0 2px 8px rgba(0,0,0,0.2)',
              lineHeight: 1.2
            }}>
              MTs Almaarif 01 Singosari
            </h1>

            <p style={{ margin: 0, fontSize: '0.98rem', opacity: 0.95, lineHeight: 1.4, fontWeight: 500 }}>
              Seleksi Penerimaan Murid Baru • <strong>Tahun Ajaran {spmbYear}</strong>
            </p>
          </div>
        </div>

        {/* Admin Quick Control Button */}
        {isAdmin && (
          <div style={{ marginTop: '16px', textAlign: 'center' }}>
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
            <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
              <label className={styles.label}>Jalur Pendaftaran <span>*</span></label>
              <select
                name="jalurPendaftaran"
                className={styles.select}
                value={formData.jalurPendaftaran}
                onChange={handleInputChange}
                required
                disabled={!pendaftaranBuka || activeJalurList.length === 0}
              >
                <option value="">-- Pilih Jalur Pendaftaran --</option>
                {activeJalurList.length > 0 ? (
                  activeJalurList.map(j => (
                    <option key={j.id} value={j.nama}>{j.nama}</option>
                  ))
                ) : (
                  <option value="" disabled>-- Tidak ada jalur pendaftaran yang aktif --</option>
                )}
              </select>

              {/* Keterangan Khusus Jalur Inden Terpadu */}
              {isTerpadu && (
                <div style={{
                  marginTop: '12px',
                  padding: '14px 18px',
                  background: '#f0fdf4',
                  border: '1.5px solid #86efac',
                  borderRadius: '12px',
                  display: 'flex',
                  gap: '14px',
                  alignItems: 'flex-start',
                  boxShadow: '0 2px 8px rgba(22, 163, 74, 0.08)'
                }}>
                  <div style={{
                    background: '#dcfce7',
                    color: '#16a34a',
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    fontSize: '18px'
                  }}>
                    <i className="fas fa-building"></i>
                  </div>
                  <div style={{ flex: 1, fontSize: '0.88rem', color: '#14532d', lineHeight: '1.55' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#166534', marginBottom: '4px' }}>
                      Ketentuan Khusus Jalur Inden Terpadu:
                    </div>
                    <p style={{ margin: '0 0 8px 0' }}>
                      Pilihan <strong>Jalur Inden Terpadu</strong> khusus untuk pendaftar asal sekolah yang <strong>1 yayasan dengan MTs Almaarif 01 Singosari</strong>, yaitu:
                    </p>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          const s = sekolahRef.find(item => item.nama.toUpperCase().includes('MI ALMAARIF 02 SINGOSARI'));
                          setFormData(prev => ({
                            ...prev,
                            asalSekolah: s ? s.nama : 'MI ALMAARIF 02 SINGOSARI',
                            alamatSekolahAsal: s?.alamat || prev.alamatSekolahAsal,
                            npsnSekolahAsal: s?.npsn || prev.npsnSekolahAsal
                          }));
                          showToast('Asal sekolah diatur ke MI Almaarif 02 Singosari', 'success');
                        }}
                        style={{
                          background: '#ffffff',
                          border: '1.5px solid #16a34a',
                          color: '#166534',
                          padding: '6px 14px',
                          borderRadius: '20px',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
                        }}
                        title="Klik untuk memilih MI Almaarif 02 Singosari"
                      >
                        <i className="fas fa-check-circle" style={{ color: '#16a34a' }}></i> MI Almaarif 02 Singosari
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const s = sekolahRef.find(item => item.nama.toUpperCase().includes('SDI ALMAARIF 02 SINGOSARI'));
                          setFormData(prev => ({
                            ...prev,
                            asalSekolah: s ? s.nama : 'SDI ALMAARIF 02 SINGOSARI',
                            alamatSekolahAsal: s?.alamat || prev.alamatSekolahAsal,
                            npsnSekolahAsal: s?.npsn || prev.npsnSekolahAsal
                          }));
                          showToast('Asal sekolah diatur ke SDI Almaarif 02 Singosari', 'success');
                        }}
                        style={{
                          background: '#ffffff',
                          border: '1.5px solid #16a34a',
                          color: '#166534',
                          padding: '6px 14px',
                          borderRadius: '20px',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
                        }}
                        title="Klik untuk memilih SDI Almaarif 02 Singosari"
                      >
                        <i className="fas fa-check-circle" style={{ color: '#16a34a' }}></i> SDI Almaarif 02 Singosari
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Keterangan Khusus Jalur Inden Prestasi */}
              {isPrestasi && (
                <div style={{
                  marginTop: '12px',
                  padding: '14px 18px',
                  background: '#fffbeb',
                  border: '1.5px solid #fcd34d',
                  borderRadius: '12px',
                  display: 'flex',
                  gap: '14px',
                  alignItems: 'flex-start',
                  boxShadow: '0 2px 8px rgba(217, 119, 6, 0.08)'
                }}>
                  <div style={{
                    background: '#fef3c7',
                    color: '#d97706',
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    fontSize: '18px'
                  }}>
                    <i className="fas fa-trophy"></i>
                  </div>
                  <div style={{ flex: 1, fontSize: '0.88rem', color: '#78350f', lineHeight: '1.55' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#92400e', marginBottom: '4px' }}>
                      Ketentuan Khusus Jalur Prestasi:
                    </div>
                    <p style={{ margin: '0 0 6px 0' }}>
                      Pilihan <strong>Jalur Prestasi</strong> khusus diperuntukkan bagi calon peserta didik yang <strong>memiliki prestasi kejuaraan atau sertifikat perlombaan</strong>, antara lain:
                    </p>
                    <ul style={{ margin: '0 0 8px 18px', padding: 0 }}>
                      <li><strong>Prestasi Akademik:</strong> Juara Olimpiade Sains / Matematika / IPA / IPS, KSM, Lomba Cerdas Cermat, Pidato Bahasa, dll.</li>
                      <li><strong>Prestasi Non-Akademik:</strong> Juara Bidang Olahraga (O2SN, Pencak Silat, Renang, dll.), Bidang Seni (Al-Banjari, Singer, Kaligrafi, Tari), Kepramukaan, atau Tahfidz Al-Qur&apos;an / MTQ.</li>
                    </ul>
                    <div style={{
                      background: '#fef3c7',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      borderLeft: '3px solid #d97706',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      color: '#b45309'
                    }}>
                      <i className="fas fa-award" style={{ marginRight: '6px' }}></i>
                      Wajib mengisi rincian capaian kejuaraan pada kolom <strong>Prestasi yang Pernah Diraih</strong> di bagian bawah formulir ini.
                    </div>
                  </div>
                </div>
              )}

              {/* Keterangan Khusus Jalur Inden Afirmasi */}
              {isAfirmasi && (
                <div style={{
                  marginTop: '12px',
                  padding: '14px 18px',
                  background: '#eff6ff',
                  border: '1.5px solid #93c5fd',
                  borderRadius: '12px',
                  display: 'flex',
                  gap: '14px',
                  alignItems: 'flex-start',
                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.08)'
                }}>
                  <div style={{
                    background: '#dbeafe',
                    color: '#2563eb',
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    fontSize: '18px'
                  }}>
                    <i className="fas fa-map-marked-alt"></i>
                  </div>
                  <div style={{ flex: 1, fontSize: '0.88rem', color: '#1e3a8a', lineHeight: '1.55' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1e40af', marginBottom: '4px' }}>
                      Ketentuan Khusus Jalur Afirmasi:
                    </div>
                    <p style={{ margin: '0 0 6px 0' }}>
                      Pilihan <strong>Jalur Afirmasi</strong> khusus diperuntukkan bagi calon peserta didik yang <strong>berada / berdomisili atau berasal dari sekolah di Luar Provinsi Jawa Timur</strong>.
                    </p>
                    <div style={{
                      background: '#dbeafe',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      borderLeft: '3px solid #2563eb',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      color: '#1d4ed8'
                    }}>
                      <i className="fas fa-info-circle" style={{ marginRight: '6px' }}></i>
                      Pastikan data <strong>Asal Sekolah</strong> dan <strong>Alamat Lengkap Tempat Tinggal</strong> mencantumkan provinsi/kabupaten di luar Jawa Timur dengan jelas.
                    </div>
                  </div>
                </div>
              )}

              {/* Keterangan Khusus Jalur Inden Reguler */}
              {isReguler && (
                <div style={{
                  marginTop: '12px',
                  padding: '14px 18px',
                  background: '#f8fafc',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '12px',
                  display: 'flex',
                  gap: '14px',
                  alignItems: 'flex-start',
                  boxShadow: '0 2px 8px rgba(100, 116, 139, 0.08)'
                }}>
                  <div style={{
                    background: '#e2e8f0',
                    color: '#475569',
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    fontSize: '18px'
                  }}>
                    <i className="fas fa-users"></i>
                  </div>
                  <div style={{ flex: 1, fontSize: '0.88rem', color: '#334155', lineHeight: '1.55' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1e293b', marginBottom: '4px' }}>
                      Informasi Jalur Reguler:
                    </div>
                    <p style={{ margin: '0' }}>
                      Pilihan <strong>Jalur Reguler</strong> terbuka untuk <strong>Umum</strong>, diperuntukkan bagi seluruh calon peserta didik lulusan SD/MI dari berbagai sekolah mana pun tanpa batasan domisili, sekolah yayasan, maupun piagam kejuaraan khusus.
                    </p>
                  </div>
                </div>
              )}
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
              <input type="text" name="tempatLahir" className={styles.input} placeholder="Kota/Kabupaten Lahir" value={formData.tempatLahir} onChange={handleInputChange} required />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Tanggal Lahir (Hari / Bulan / Tahun) <span>*</span></label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                <select
                  value={tglLahirHari}
                  onChange={e => setTglLahirHari(e.target.value)}
                  className={styles.select}
                  required
                >
                  <option value="">Hari</option>
                  {HARI_OPTIONS.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <select
                  value={tglLahirBulan}
                  onChange={e => setTglLahirBulan(e.target.value)}
                  className={styles.select}
                  required
                >
                  <option value="">Bulan</option>
                  {BULAN_OPTIONS.map(b => (
                    <option key={b.val} value={b.val}>{b.label}</option>
                  ))}
                </select>
                <select
                  value={tglLahirTahun}
                  onChange={e => setTglLahirTahun(e.target.value)}
                  className={styles.select}
                  required
                >
                  <option value="">Tahun</option>
                  {TAHUN_LAHIR_OPTIONS.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
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
              <input 
                type="text" 
                name="agama" 
                className={styles.input} 
                value="Islam" 
                readOnly 
                style={{ background: '#f8fafc', color: '#0f172a', fontWeight: 600, cursor: 'not-allowed' }}
                title="Agama calon santri/siswa MTs Almaarif 01 adalah Islam" 
              />
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
              {isTerpadu && (
                <div style={{ fontSize: '0.8rem', color: '#15803d', fontWeight: 600, marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fas fa-info-circle"></i> Khusus Jalur Inden Terpadu: diperuntukkan bagi lulusan <strong>MI Almaarif 02 Singosari</strong> atau <strong>SDI Almaarif 02 Singosari</strong>.
                </div>
              )}
              {isAfirmasi && (
                <div style={{ fontSize: '0.8rem', color: '#1d4ed8', fontWeight: 600, marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fas fa-info-circle"></i> Khusus Jalur Afirmasi: diperuntukkan bagi calon peserta didik dari <strong>luar Jawa Timur</strong>.
                </div>
              )}
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
              <label className={styles.label}>Pendidikan Terakhir Ayah <span>*</span></label>
              <select name="pendidikanAyah" className={styles.select} value={formData.pendidikanAyah} onChange={handleInputChange} required>
                <option value="">-- Pilih Pendidikan Terakhir --</option>
                {PENDIDIKAN_OPTIONS.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Pekerjaan Ayah <span>*</span></label>
              <input type="text" name="pekerjaanAyah" className={styles.input} placeholder="Contoh: Wiraswasta / Karyawan / PNS" value={formData.pekerjaanAyah} onChange={handleInputChange} required />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Nomor WhatsApp Ayah <span>*</span></label>
              <input type="tel" name="nomorWaAyah" className={styles.input} placeholder="08xxxxxxxxxx" value={formData.nomorWaAyah} onChange={handleInputChange} required />
            </div>
          </div>

          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Nama Ibu Kandung <span>*</span></label>
              <input type="text" name="namaIbu" className={styles.input} value={formData.namaIbu} onChange={handleInputChange} required />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Pendidikan Terakhir Ibu <span>*</span></label>
              <select name="pendidikanIbu" className={styles.select} value={formData.pendidikanIbu} onChange={handleInputChange} required>
                <option value="">-- Pilih Pendidikan Terakhir --</option>
                {PENDIDIKAN_OPTIONS.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Pekerjaan Ibu <span>*</span></label>
              <input type="text" name="pekerjaanIbu" className={styles.input} placeholder="Contoh: Ibu Rumah Tangga / Guru / Karyawan" value={formData.pekerjaanIbu} onChange={handleInputChange} required />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Nomor WhatsApp Ibu</label>
              <input type="tel" name="nomorWaIbu" className={styles.input} placeholder="08xxxxxxxxxx (Opsional)" value={formData.nomorWaIbu} onChange={handleInputChange} />
            </div>
          </div>

          <div className={styles.sectionTitle}>
            <i className="fas fa-map-marker-alt"></i> Alamat Tempat Tinggal
          </div>
          {isAfirmasi && (
            <div style={{
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              padding: '10px 14px',
              borderRadius: '8px',
              marginBottom: '14px',
              fontSize: '0.82rem',
              color: '#1e40af',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <i className="fas fa-map-pin"></i>
              <span><strong>Catatan Jalur Afirmasi:</strong> Mohon cantumkan alamat lengkap domisili di luar Provinsi Jawa Timur (sertakan nama Kabupaten/Kota dan Provinsi asal).</span>
            </div>
          )}
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
            <i className="fas fa-trophy"></i> Prestasi {isPrestasi ? <span style={{ color: '#dc2626', fontSize: '0.9rem', fontWeight: 700 }}>(Wajib Diisi untuk Jalur Prestasi *)</span> : '(Opsional)'}
          </div>
          <div className={styles.formGrid}>
            <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
              <label className={styles.label}>
                Prestasi yang Pernah Diraih {isPrestasi && <span style={{ color: '#dc2626' }}>*</span>}
              </label>
              <textarea 
                name="prestasi" 
                className={styles.textarea} 
                rows={2} 
                placeholder={isPrestasi ? "Wajib diisi: Sebutkan nama kejuaraan/prestasi, bidang (akademik/non-akademik/tahfidz), tingkat kejuaraan (Kecamatan/Kabupaten/Provinsi/Nasional), dan perolehan juara" : "Sebutkan prestasi akademik / non-akademik beserta tingkat kejuaraan jika ada"} 
                value={formData.prestasi} 
                onChange={handleInputChange}
                required={isPrestasi}
              ></textarea>
              {isPrestasi && (
                <div style={{ fontSize: '0.8rem', color: '#b45309', fontWeight: 600, marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fas fa-award"></i> Calon siswa Jalur Prestasi wajib memiliki dan mencantumkan prestasi kejuaraan / lomba / tahfidz yang pernah diraih.
                </div>
              )}
            </div>
          </div>

          <div className={styles.sectionTitle}>
            <i className="fas fa-file-upload"></i> Unggah Berkas Persyaratan
          </div>
          <div className={styles.fileGrid}>
            
            {/* KK Upload */}
            <div 
              className={`${styles.fileUploadBox} ${fileKk ? styles.hasFile : ''}`} 
              onClick={() => !compressingKk && fileKkRef.current?.click()}
              style={{ cursor: compressingKk ? 'wait' : 'pointer' }}
            >
              <input 
                type="file" 
                accept="image/jpeg,image/png,image/webp,image/jpg,application/pdf,.pdf" 
                className={styles.hiddenInput} 
                ref={fileKkRef} 
                onChange={handleFileKkChange}
                disabled={compressingKk}
              />
              <i 
                className={`fas ${compressingKk ? 'fa-spinner fa-spin' : fileKk ? 'fa-check-circle' : 'fa-id-card'} ${styles.fileIcon}`} 
                style={{ color: compressingKk ? '#3b82f6' : fileKk ? '#16a34a' : undefined }}
              ></i>
              <div className={styles.fileTitle}>Kartu Keluarga (KK) <span>*</span></div>
              
              {compressingKk ? (
                <div style={{ fontSize: '0.82rem', color: '#2563eb', fontWeight: 600, marginTop: '6px' }}>
                  <i className="fas fa-magic"></i> Mengoptimasi foto KK agar tajam &amp; hemat kuota...
                </div>
              ) : fileKk ? (
                <div style={{ marginTop: '4px' }}>
                  <div className={styles.fileName}>
                    <i className="fas fa-file-image"></i> {fileKk.name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#15803d', marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span>Ukuran: <b>{formatFileSize(fileKk.size)}</b></span>
                    {kkFileInfo?.isCompressed && (
                      <span style={{ background: '#dcfce7', color: '#166534', padding: '1px 7px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>
                        <i className="fas fa-shield-alt"></i> HD Terkompresi
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '5px' }}>
                    Klik untuk mengganti foto / dokumen
                  </div>
                </div>
              ) : (
                <>
                  <div className={styles.fileDesc}>Klik untuk memilih Foto KK (Kamera / Galeri) atau Dokumen PDF</div>
                  <div style={{ fontSize: '0.73rem', color: '#047857', marginTop: '6px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                    <i className="fas fa-bolt" style={{ color: '#f59e0b' }}></i> Foto kamera besar otomatis dikompresi resolusi HD (teks tetap jernih &amp; tajam)
                  </div>
                  <div style={{ fontSize: '0.71rem', color: '#dc2626', marginTop: '4px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                    <i className="fas fa-ban"></i> Format Video Ditolak (Wajib Foto Dokumen atau PDF)
                  </div>
                </>
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
