'use client';
import PortalFooter from '@/components/PortalFooter';
import PortalHeaderBrand from '@/components/PortalHeaderBrand';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';

export default function PortalDashboard() {
  const router = useRouter();
  const [student, setStudent] = useState<any>(null);
  const [kendaraan, setKendaraan] = useState<any>(null);

  // Verifikasi Ijazah States
  const [verifikasi, setVerifikasi] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [namaWali, setNamaWali] = useState('');
  const [hubunganWali, setHubunganWali] = useState('Ayah Kandung');
  const [setujuCheckbox, setSetujuCheckbox] = useState(false);

  // Modal Pengajuan Perbaikan States
  const [showPerbaikanModal, setShowPerbaikanModal] = useState(false);
  const [isSubmittingPerbaikan, setIsSubmittingPerbaikan] = useState(false);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [perbaikanForm, setPerbaikanForm] = useState<Record<string, string>>({});
  const [alasanPerbaikan, setAlasanPerbaikan] = useState('');
  const [pemohonNama, setPemohonNama] = useState('');
  const [pemohonHubungan, setPemohonHubungan] = useState('Ayah Kandung');
  const [pemohonNoHp, setPemohonNoHp] = useState('');

  // Modal Dokumen SPTJM (Surat Pernyataan)
  const [showSptjmModal, setShowSptjmModal] = useState(false);

  useEffect(() => {
    const sessionStr = localStorage.getItem('portal_session');
    if (!sessionStr) {
      router.replace('/portal/login');
      return;
    }
    
    try {
      localStorage.setItem('keren_app_preference', 'portal');
      const parsed = JSON.parse(sessionStr);
      setStudent(parsed);
      if (parsed.verifikasiIjazah) {
        setVerifikasi(parsed.verifikasiIjazah);
      }
      if (parsed.namaAyah || parsed.namaIbu) {
        setNamaWali(parsed.namaAyah || parsed.namaIbu || '');
        setPemohonNama(parsed.namaAyah || parsed.namaIbu || '');
      }
      if (parsed.noHp) {
        setPemohonNoHp(parsed.noHp);
      }

      // Fetch latest student & verifikasi status from API
      const q = parsed.nisn || parsed.nis;
      if (q) {
        fetch('/api/portal/verifikasi?nisn=' + encodeURIComponent(q))
          .then(r => r.json())
          .then(res => {
            if (res.success && res.data) {
              setStudent((prev: any) => ({ ...prev, ...res.data }));
              if (res.data.verifikasiIjazah) {
                setVerifikasi(res.data.verifikasiIjazah);
              }
              if (res.data.namaAyah || res.data.namaIbu) {
                setNamaWali((prevName: string) => prevName || res.data.namaAyah || res.data.namaIbu || '');
                setPemohonNama((prevName: string) => prevName || res.data.namaAyah || res.data.namaIbu || '');
              }
              if (res.data.noHp) {
                setPemohonNoHp((prevHp: string) => prevHp || res.data.noHp);
              }
              // Save updated session in localStorage
              try {
                localStorage.setItem('portal_session', JSON.stringify({ ...parsed, ...res.data }));
              } catch {}
            }
          })
          .catch(err => console.error('Fetch verifikasi error:', err));
      }
    } catch {
      localStorage.removeItem('portal_session');
      router.replace('/portal/login');
    }
  }, [router]);

  const handleLogout = () => {
    Swal.fire({
      title: 'Keluar?',
      text: 'Anda akan keluar dari Portal Wali Murid',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonText: 'Batal',
      confirmButtonText: 'Ya, Keluar'
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem('portal_session');
        router.replace('/portal/login');
      }
    });
  };

  useEffect(() => {
    if (student?.nis || student?.nisn) {
      const q = student.nis || student.nisn;
      fetch('/api/kendaraan-siswa?nis=' + encodeURIComponent(q))
        .then(r => r.json())
        .then(res => {
          if (res.success && res.data) {
            setKendaraan(res.data);
          }
        })
        .catch(() => {});
    }
  }, [student]);

  // Handle Setuju / Verifikasi Data
  const handleSetujuData = async () => {
    if (!setujuCheckbox) {
      Swal.fire({
        icon: 'warning',
        title: 'Persetujuan Wajib Dicentang',
        text: 'Silakan centang pernyataan tanggung jawab kebenaran data terlebih dahulu.'
      });
      return;
    }

    if (!namaWali.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Nama Orang Tua Kosong',
        text: 'Mohon isi nama Orang Tua / Wali yang menyatakan kebenaran data.'
      });
      return;
    }

    const confirm = await Swal.fire({
      title: 'Konfirmasi Verifikasi Data',
      html: `
        <div style="text-align: left; font-size: 13px; line-height: 1.6;">
          <p>Apakah Bapak/Ibu yakin data peserta didik <b>${student.nama}</b> telah sesuai dengan <b>Akta Kelahiran</b> dan <b>Kartu Keluarga (KK)</b>?</p>
          <div style="background: #fef3c7; border: 1px solid #fcd34d; padding: 10px; border-radius: 8px; color: #92400e; margin-top: 10px;">
            ⚠️ <b>Penting:</b> Setelah diverifikasi, data ini akan <b>dikunci</b> sebagai rujukan resmi pencetakan Ijazah dan madrasah dibebaskan dari tuntutan jika ada kekeliruan data.
          </div>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Data Sudah Benar & Kunci',
      cancelButtonText: 'Periksa Kembali'
    });

    if (!confirm.isConfirmed) return;

    setIsVerifying(true);
    try {
      const res = await fetch('/api/portal/verifikasi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nisn: student.nisn,
          nis: student.nis,
          action: 'SETUJU',
          dataVerifikasi: {
            namaWali: namaWali.trim(),
            hubungan: hubunganWali
          }
        })
      });

      const json = await res.json();
      if (json.success) {
        setVerifikasi(json.verifikasi);
        // update local storage
        try {
          const current = JSON.parse(localStorage.getItem('portal_session') || '{}');
          localStorage.setItem('portal_session', JSON.stringify({ ...current, verifikasiIjazah: json.verifikasi }));
        } catch {}

        Swal.fire({
          icon: 'success',
          title: 'Verifikasi Berhasil!',
          text: 'Data telah berhasil divalidasi dan dikunci untuk penerbitan Ijazah. Anda dapat melihat Surat Pernyataan resmi.',
          confirmButtonColor: '#10b981',
          confirmButtonText: 'Lihat Surat Pernyataan (SPTJM)'
        }).then((result) => {
          if (result.isConfirmed) {
            setShowSptjmModal(true);
          }
        });
      } else {
        Swal.fire({ icon: 'error', title: 'Gagal Menyimpan', text: json.error || 'Terjadi kesalahan sistem' });
      }
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'Kesalahan Sistem', text: err.message });
    } finally {
      setIsVerifying(false);
    }
  };

  // Open Perbaikan Modal
  const openModalPerbaikan = () => {
    setSelectedFields([]);
    setPerbaikanForm({});
    setAlasanPerbaikan('');
    setPemohonNama(namaWali || student.namaAyah || student.namaIbu || '');
    setPemohonHubungan(hubunganWali || 'Ayah Kandung');
    setPemohonNoHp(student.noHp || '');
    setShowPerbaikanModal(true);
  };

  // Toggle field selection for perbaikan
  const toggleField = (fieldKey: string, currentVal: string) => {
    if (selectedFields.includes(fieldKey)) {
      setSelectedFields(selectedFields.filter(f => f !== fieldKey));
      const next = { ...perbaikanForm };
      delete next[fieldKey];
      setPerbaikanForm(next);
    } else {
      setSelectedFields([...selectedFields, fieldKey]);
      setPerbaikanForm({ ...perbaikanForm, [fieldKey]: currentVal });
    }
  };

  // Submit Perbaikan Data
  const handleSubmitPerbaikan = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedFields.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Belum Ada Data Dipilih',
        text: 'Silakan pilih minimal satu item data yang perlu diperbaiki.'
      });
      return;
    }

    if (!pemohonNama.trim()) {
      Swal.fire({ icon: 'warning', title: 'Nama Pemohon Kosong', text: 'Nama pemohon wajib diisi.' });
      return;
    }

    // Map labels
    const fieldLabels: Record<string, string> = {
      'NAMA': 'Nama Lengkap Siswa',
      'TEMPAT, TANGGAL LAHIR': 'Tempat, Tanggal Lahir (TTL)',
      'NIK': 'Nomor Induk Kependudukan (NIK)',
      'NISN': 'Nomor Induk Siswa Nasional (NISN)',
      'JENIS KELAMIN': 'Jenis Kelamin',
      'NAMA AYAH KANDUNG': 'Nama Ayah Kandung',
      'NAMA IBU KANDUNG': 'Nama Ibu Kandung',
      'SD/MI': 'Asal SD/MI'
    };

    const currentFieldValues: Record<string, string> = {
      'NAMA': student.nama || '',
      'TEMPAT, TANGGAL LAHIR': student.ttl || '',
      'NIK': student.nik || '',
      'NISN': student.nisn || '',
      'JENIS KELAMIN': student.jenisKelamin || '',
      'NAMA AYAH KANDUNG': student.namaAyah || '',
      'NAMA IBU KANDUNG': student.namaIbu || '',
      'SD/MI': student.asalSekolah || ''
    };

    const itemsToSubmit = selectedFields.map(f => ({
      field: f,
      label: fieldLabels[f] || f,
      dataLama: currentFieldValues[f] || '-',
      dataBaru: perbaikanForm[f] || ''
    }));

    // Verify all selected have new values
    const emptyNew = itemsToSubmit.find(item => !item.dataBaru.trim());
    if (emptyNew) {
      Swal.fire({
        icon: 'warning',
        title: 'Data Baru Belum Diisi',
        text: `Mohon isi usulan data yang benar untuk ${emptyNew.label}.`
      });
      return;
    }

    const confirm = await Swal.fire({
      title: 'Kirim Pengajuan Perbaikan?',
      text: `Anda mengajukan perubahan untuk ${itemsToSubmit.length} data. Data akan diperiksa oleh bagian Tata Usaha madrasah.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#f59e0b',
      confirmButtonText: 'Ya, Kirim Pengajuan',
      cancelButtonText: 'Batal'
    });

    if (!confirm.isConfirmed) return;

    setIsSubmittingPerbaikan(true);
    try {
      const res = await fetch('/api/portal/verifikasi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nisn: student.nisn,
          nis: student.nis,
          action: 'AJUKAN_PERBAIKAN',
          dataPerbaikan: {
            namaPemohon: pemohonNama.trim(),
            hubungan: pemohonHubungan,
            noHp: pemohonNoHp.trim(),
            perbaikan: itemsToSubmit,
            alasan: alasanPerbaikan.trim()
          }
        })
      });

      const json = await res.json();
      if (json.success) {
        setVerifikasi(json.verifikasi);
        setShowPerbaikanModal(false);
        try {
          const current = JSON.parse(localStorage.getItem('portal_session') || '{}');
          localStorage.setItem('portal_session', JSON.stringify({ ...current, verifikasiIjazah: json.verifikasi }));
        } catch {}

        Swal.fire({
          icon: 'success',
          title: 'Pengajuan Berhasil Dikirim!',
          text: 'Pengajuan perbaikan data Anda telah tersimpan. Silakan konfirmasi ke ruang TU madrasah dengan membawa bukti fisik (Akta Kelahiran/KK).',
          confirmButtonColor: '#0284c7'
        });
      } else {
        Swal.fire({ icon: 'error', title: 'Gagal Mengirim', text: json.error || 'Terjadi kesalahan sistem' });
      }
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'Kesalahan Sistem', text: err.message });
    } finally {
      setIsSubmittingPerbaikan(false);
    }
  };

  // Handle Batalkan Pengajuan Perbaikan
  const handleBatalPengajuan = async () => {
    const confirm = await Swal.fire({
      title: 'Batalkan Pengajuan Perbaikan?',
      text: 'Status akan dikembalikan ke belum diverifikasi.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonText: 'Tidak',
      confirmButtonText: 'Ya, Batalkan'
    });

    if (!confirm.isConfirmed) return;

    try {
      const res = await fetch('/api/portal/verifikasi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nisn: student.nisn,
          nis: student.nis,
          action: 'BATAL'
        })
      });

      const json = await res.json();
      if (json.success) {
        setVerifikasi(null);
        try {
          const current = JSON.parse(localStorage.getItem('portal_session') || '{}');
          delete current.verifikasiIjazah;
          localStorage.setItem('portal_session', JSON.stringify(current));
        } catch {}
        Swal.fire({ icon: 'info', title: 'Pengajuan Dibatalkan', text: 'Anda sekarang dapat memverifikasi atau mengajukan ulang.' });
      }
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: err.message });
    }
  };

  if (!student) return null;

  const menus = [
    { title: 'Presensi', icon: 'fa-calendar-check', color: '#10b981', path: '/portal/presensi' },
    { title: 'Jurnal Kelas', icon: 'fa-book-open', color: '#0284c7', path: '/portal/jurnal' },
    { title: 'Nilai & Rapor', icon: 'fa-file-alt', color: '#3b82f6', path: '/portal/nilai' },
    { title: 'Prestasi Siswa', icon: 'fa-trophy', color: '#f59e0b', path: '/portal/prestasi' },
    { title: 'Pengumuman', icon: 'fa-bullhorn', color: '#8b5cf6', path: '/portal/pengumuman' },
    { title: 'Penilaian Karakter', icon: 'fa-star', color: '#ec4899', path: '/portal/penilaian-diri' }
  ];

  // Helper date formatter
  const formatDate = (isoStr: string) => {
    if (!isoStr) return '-';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' WIB';
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="portal-container" style={{ paddingBottom: '80px' }}>
      <PortalHeaderBrand />
      
      {/* Header Profile */}
      <div className="portal-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: '18px', margin: '0 0 4px 0', fontWeight: 700 }}>
              Halo, Wali dari
            </h2>
            <h1 style={{ fontSize: '24px', margin: 0, fontWeight: 800 }}>
              {student.nama.split(' ')[0]}
            </h1>
          </div>
          <button 
            onClick={handleLogout} 
            title="Keluar"
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer' }}
          >
            <i className="fas fa-sign-out-alt"></i>
          </button>
        </div>

        {/* Teks Sambutan Portal */}
        <div style={{ 
          marginTop: '16px', 
          background: 'rgba(255, 255, 255, 0.15)', 
          backdropFilter: 'blur(8px)',
          borderRadius: '12px', 
          padding: '10px 14px', 
          border: '1px solid rgba(255, 255, 255, 0.25)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px'
        }}>
          <i className="fas fa-info-circle" style={{ marginTop: '2px', fontSize: '13px', color: '#ffffff', opacity: 0.9 }}></i>
          <p style={{ margin: 0, fontSize: '12px', color: '#ffffff', lineHeight: 1.5, fontWeight: 500 }}>
            Selamat datang di Portal Wali Murid. Anda dapat memantau kehadiran, kegiatan belajar, rapor, dan status data anak Anda di sini.
          </p>
        </div>
      </div>

      <div className="portal-content" style={{ marginTop: '-20px' }}>
        
        {/* Student Card Info - Detail Siswa Layout */}
        <div className="portal-card" style={{ position: 'relative', zIndex: 10, padding: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Foto Top Section */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ 
                width: '120px', height: '160px', borderRadius: '12px', background: '#e2e8f0', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', color: '#94a3b8',
                overflow: 'hidden', border: '4px solid white', boxShadow: '0 4px 10px rgba(0,0,0,0.05)'
              }}>
                {student.foto ? (
                  <img src={student.foto} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <i className="fas fa-user-graduate"></i>
                )}
              </div>
            </div>

            {/* Grid Detail Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>Nama Lengkap Siswa</span>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', background: '#f8fafc', padding: '9px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>{student.nama || '-'}</div>
              </div>

              {/* TTL (Tempat, Tanggal Lahir) - PROMINENT */}
              <div>
                <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', marginBottom: '2px' }}>
                  <i className="fas fa-calendar-alt" style={{ marginRight: '4px' }}></i> Tempat, Tanggal Lahir (TTL)
                </span>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0369a1', background: '#f0f9ff', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #bae6fd', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{student.ttl || (student.tempatLahir && student.tanggalLahir ? `${student.tempatLahir}, ${student.tanggalLahir}` : student.tempatLahir || '-')}</span>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>NISN</span>
                  <div style={{ fontSize: '14px', color: '#334155', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>{student.nisn || '-'}</div>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>Rombel / Kelas</span>
                  <div style={{ fontSize: '14px', color: '#334155', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>{student.kelas || '-'}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>NIK Siswa</span>
                  <div style={{ fontSize: '14px', color: '#334155', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>{student.nik || '-'}</div>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>Jenis Kelamin</span>
                  <div style={{ fontSize: '14px', color: '#334155', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>{student.jenisKelamin || '-'}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>Status Siswa</span>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#16a34a', background: '#dcfce7', padding: '8px 12px', borderRadius: '8px', border: '1px solid #bbf7d0', textAlign: 'center' }}>{student.status || 'AKTIF'}</div>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>Asal SD/MI</span>
                  <div style={{ fontSize: '13px', color: '#334155', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={student.asalSekolah}>
                    {student.asalSekolah || '-'}
                  </div>
                </div>
              </div>

              {student.noHp && (
                <div>
                  <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>No. HP / WA (Ortu)</span>
                  <div style={{ fontSize: '14px', color: '#334155', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}><i className="fab fa-whatsapp" style={{ color: '#22c55e', marginRight: '6px' }}></i> {student.noHp}</div>
                </div>
              )}

              <div>
                <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>Nama Orang Tua</span>
                <div style={{ fontSize: '13px', color: '#334155', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', lineHeight: 1.6 }}>
                  Ayah: <strong>{student.namaAyah || '-'}</strong><br/>
                  Ibu: <strong>{student.namaIbu || '-'}</strong>
                </div>
              </div>

              <div>
                <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>Domisili & Alamat</span>
                <div style={{ fontSize: '13px', color: '#334155', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', lineHeight: 1.5 }}>
                  <strong>{student.domisili || '-'}</strong> - {student.alamat || '-'}
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* FITUR KHUSUS: VERIFIKASI KEBENARAN DATA ACUAN IJAZAH OLEH ORANG TUA */}
        {/* ========================================================================= */}
        <div style={{
          background: verifikasi?.status === 'VERIFIED' ? '#f0fdf4' : verifikasi?.status === 'MENGAJUKAN_PERBAIKAN' ? '#fffbeb' : '#ffffff',
          borderRadius: '16px',
          border: verifikasi?.status === 'VERIFIED' ? '2px solid #86efac' : verifikasi?.status === 'MENGAJUKAN_PERBAIKAN' ? '2px solid #fde047' : '2px solid #0284c7',
          padding: '20px',
          marginBottom: '20px',
          boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
          position: 'relative'
        }}>
          {/* Header Banner */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                width: '32px', height: '32px', borderRadius: '8px',
                background: verifikasi?.status === 'VERIFIED' ? '#dcfce7' : verifikasi?.status === 'MENGAJUKAN_PERBAIKAN' ? '#fef3c7' : '#e0f2fe',
                color: verifikasi?.status === 'VERIFIED' ? '#16a34a' : verifikasi?.status === 'MENGAJUKAN_PERBAIKAN' ? '#d97706' : '#0284c7',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px'
              }}>
                <i className={verifikasi?.status === 'VERIFIED' ? 'fas fa-shield-check' : verifikasi?.status === 'MENGAJUKAN_PERBAIKAN' ? 'fas fa-clock' : 'fas fa-file-signature'}></i>
              </span>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                  Verifikasi Data Ijazah
                </h3>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Oleh Orang Tua / Wali Murid</span>
              </div>
            </div>

            {/* Status Badge */}
            {verifikasi?.status === 'VERIFIED' ? (
              <span style={{ background: '#16a34a', color: 'white', fontSize: '11px', fontWeight: 800, padding: '4px 10px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <i className="fas fa-check-circle"></i> DATA TERKUNCI
              </span>
            ) : verifikasi?.status === 'MENGAJUKAN_PERBAIKAN' ? (
              <span style={{ background: '#d97706', color: 'white', fontSize: '11px', fontWeight: 800, padding: '4px 10px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <i className="fas fa-hourglass-half"></i> PROSES REVISI TU
              </span>
            ) : (
              <span style={{ background: '#dc2626', color: 'white', fontSize: '11px', fontWeight: 800, padding: '4px 10px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <i className="fas fa-exclamation-circle"></i> BELUM DIVERIFIKASI
              </span>
            )}
          </div>

          {/* KONDISI 1: SUDAH DIVERIFIKASI (VERIFIED) */}
          {verifikasi?.status === 'VERIFIED' && (
            <div>
              <div style={{ background: '#ffffff', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '14px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <i className="fas fa-certificate" style={{ color: '#16a34a', fontSize: '20px', marginTop: '2px' }}></i>
                  <div style={{ fontSize: '12px', color: '#166534', lineHeight: 1.5 }}>
                    <strong>Data Telah Sesuai & Sah:</strong> Telah diverifikasi oleh <strong>{verifikasi.nama_wali}</strong> ({verifikasi.hubungan}) pada <strong>{formatDate(verifikasi.verified_at)}</strong>.
                  </div>
                </div>
                <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #dcfce7', fontSize: '11px', color: '#4b5563', lineHeight: 1.5 }}>
                  <i className="fas fa-lock" style={{ marginRight: '5px', color: '#059669' }}></i>
                  Data ini telah disetujui menjadi rujukan permanen pencetakan Ijazah dan Dokumen Kelulusan. Pihak madrasah dibebaskan dari tuntutan hukum jika terdapat kesalahan yang bersumber dari kelalaian pemeriksaan data oleh wali murid.
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setShowSptjmModal(true)}
                  style={{
                    flex: '1', minWidth: '160px',
                    padding: '10px 14px',
                    background: '#059669',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)'
                  }}
                >
                  <i className="fas fa-print"></i> Lihat / Cetak Surat Pernyataan
                </button>

                <button
                  type="button"
                  onClick={openModalPerbaikan}
                  style={{
                    padding: '10px 14px',
                    background: '#f8fafc',
                    color: '#64748b',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <i className="fas fa-edit"></i> Ada Kesalahan Mendadak?
                </button>
              </div>
            </div>
          )}

          {/* KONDISI 2: SEDANG MENGAJUKAN PERBAIKAN */}
          {verifikasi?.status === 'MENGAJUKAN_PERBAIKAN' && (
            <div>
              <div style={{ background: '#ffffff', border: '1px solid #fef08a', borderRadius: '12px', padding: '14px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#854d0e', fontWeight: 700, fontSize: '13px', marginBottom: '8px' }}>
                  <i className="fas fa-tools"></i> Permohonan Revisi Data Sedang Diproses
                </div>
                <div style={{ fontSize: '12px', color: '#713f12', marginBottom: '10px' }}>
                  Diajukan oleh: <strong>{verifikasi.nama_pemohon}</strong> ({verifikasi.hubungan})<br/>
                  Tanggal Pengajuan: <strong>{formatDate(verifikasi.submitted_at)}</strong>
                </div>

                <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Rincian Data yang Diajukan:</div>
                <div style={{ background: '#fafafa', borderRadius: '8px', border: '1px solid #f1f5f9', overflow: 'hidden', marginBottom: '10px' }}>
                  {(verifikasi.perbaikan || []).map((item: any, i: number) => (
                    <div key={i} style={{ padding: '8px 10px', borderBottom: i === verifikasi.perbaikan.length - 1 ? 'none' : '1px solid #e2e8f0', fontSize: '11.5px' }}>
                      <div style={{ fontWeight: 700, color: '#0369a1' }}>{item.label || item.field}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', marginTop: '2px' }}>
                        <span>Lama: <del>{item.dataLama || '-'}</del></span>
                        <span style={{ color: '#16a34a', fontWeight: 700 }}>Baru: {item.dataBaru}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {verifikasi.alasan && (
                  <div style={{ fontSize: '11.5px', color: '#475569', fontStyle: 'italic', marginBottom: '8px' }}>
                    Alasan: "{verifikasi.alasan}"
                  </div>
                )}

                <div style={{ background: '#fef3c7', padding: '8px 10px', borderRadius: '6px', fontSize: '11px', color: '#92400e', lineHeight: 1.4 }}>
                  <i className="fas fa-info-circle"></i> <b>Langkah Selanjutnya:</b> Silakan konfirmasi ke staf Tata Usaha (TU) madrasah dengan membawa fotokopi/asli <b>Akta Kelahiran</b> atau <b>Kartu Keluarga</b> untuk validasi berkas fisik.
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={openModalPerbaikan}
                  style={{
                    flex: '1', padding: '9px 12px', background: '#d97706', color: 'white', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  <i className="fas fa-edit"></i> Ubah Pengajuan
                </button>
                <button
                  type="button"
                  onClick={handleBatalPengajuan}
                  style={{
                    padding: '9px 12px', background: '#fff', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  <i className="fas fa-times"></i> Batalkan
                </button>
              </div>
            </div>
          )}

          {/* KONDISI 3: BELUM DIVERIFIKASI */}
          {(!verifikasi || verifikasi.status === 'BELUM_VERIFIKASI') && (
            <div>
              <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#475569', lineHeight: 1.5 }}>
                Bapak/Ibu Orang Tua/Wali Murid, data di bawah ini adalah data pokok anak Anda yang akan digunakan sebagai <strong>acuan mutlak pencetakan Ijazah dan Dokumen Kelulusan</strong>. Mohon periksa kebenarannya dengan dokumen resmi negara (Akta Kelahiran & Kartu Keluarga).
              </p>

              {/* Rincian 8 Data Ijazah */}
              <div style={{ background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '10px 12px', marginBottom: '14px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '6px 0', color: '#64748b', width: '110px' }}>Nama Lengkap</td>
                      <td style={{ padding: '6px 4px', color: '#64748b', width: '8px' }}>:</td>
                      <td style={{ padding: '6px 0', fontWeight: 700, color: '#0f172a' }}>{student.nama || '-'}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #f1f5f9', background: '#f0f9ff' }}>
                      <td style={{ padding: '6px 4px', color: '#0284c7', fontWeight: 700 }}>Tempat, Tgl Lahir</td>
                      <td style={{ padding: '6px 4px', color: '#0284c7', width: '8px' }}>:</td>
                      <td style={{ padding: '6px 4px', fontWeight: 700, color: '#0369a1' }}>
                        {student.ttl || (student.tempatLahir && student.tanggalLahir ? `${student.tempatLahir}, ${student.tanggalLahir}` : student.tempatLahir || '-')}
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '6px 0', color: '#64748b' }}>NISN</td>
                      <td style={{ padding: '6px 4px', color: '#64748b' }}>:</td>
                      <td style={{ padding: '6px 0', color: '#334155' }}>{student.nisn || '-'}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '6px 0', color: '#64748b' }}>NIK Siswa</td>
                      <td style={{ padding: '6px 4px', color: '#64748b' }}>:</td>
                      <td style={{ padding: '6px 0', color: '#334155' }}>{student.nik || '-'}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '6px 0', color: '#64748b' }}>Jenis Kelamin</td>
                      <td style={{ padding: '6px 4px', color: '#64748b' }}>:</td>
                      <td style={{ padding: '6px 0', color: '#334155' }}>{student.jenisKelamin || '-'}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '6px 0', color: '#64748b' }}>Nama Ayah</td>
                      <td style={{ padding: '6px 4px', color: '#64748b' }}>:</td>
                      <td style={{ padding: '6px 0', color: '#334155' }}>{student.namaAyah || '-'}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '6px 0', color: '#64748b' }}>Nama Ibu</td>
                      <td style={{ padding: '6px 4px', color: '#64748b' }}>:</td>
                      <td style={{ padding: '6px 0', color: '#334155' }}>{student.namaIbu || '-'}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '6px 0', color: '#64748b' }}>Asal SD/MI</td>
                      <td style={{ padding: '6px 4px', color: '#64748b' }}>:</td>
                      <td style={{ padding: '6px 0', color: '#334155' }}>{student.asalSekolah || '-'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Klausul Hukum Bebas Tuntutan (SPTJM) */}
              <div style={{
                background: '#fffbeb',
                border: '1.5px solid #fcd34d',
                borderRadius: '10px',
                padding: '12px',
                marginBottom: '14px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, color: '#92400e', fontSize: '12px', marginBottom: '6px' }}>
                  <i className="fas fa-balance-scale"></i> PERNYATAAN TANGGUNG JAWAB MUTLAK (SPTJM)
                </div>
                <p style={{ margin: 0, fontSize: '11px', color: '#78350f', lineHeight: 1.5 }}>
                  "Dengan ini saya menyatakan bahwa seluruh data di atas telah saya periksa dengan seksama dan <strong>BENAR sesuai Akta Kelahiran dan Kartu Keluarga</strong>. Data ini saya setujui menjadi rujukan mutlak pencetakan Ijazah dan Dokumen Kelulusan. Apabila di kemudian hari terdapat kesalahan akibat kelalaian pemeriksaan ini, maka menjadi tanggung jawab kami dan <strong>kami tidak akan menuntut pihak madrasah</strong>."
                </p>

                <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #fde68a' }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>
                    <input 
                      type="checkbox" 
                      checked={setujuCheckbox} 
                      onChange={(e) => setSetujuCheckbox(e.target.checked)} 
                      style={{ marginTop: '2px', width: '16px', height: '16px', cursor: 'pointer', accentColor: '#10b981' }}
                    />
                    <span>Saya telah memeriksa dengan teliti, memahami, dan MENYETUJUI pernyataan di atas.</span>
                  </label>
                </div>
              </div>

              {/* Form Input Wali Penandatangan */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Nama Orang Tua/Wali:</label>
                  <input
                    type="text"
                    value={namaWali}
                    onChange={(e) => setNamaWali(e.target.value)}
                    placeholder="Contoh: Heri Jatmiko"
                    style={{ width: '100%', padding: '8px 10px', boxSizing: 'border-box', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Hubungan:</label>
                  <select
                    value={hubunganWali}
                    onChange={(e) => setHubunganWali(e.target.value)}
                    style={{ width: '100%', padding: '8px 6px', boxSizing: 'border-box', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
                  >
                    <option value="Ayah Kandung">Ayah Kandung</option>
                    <option value="Ibu Kandung">Ibu Kandung</option>
                    <option value="Wali">Wali Murid</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleSetujuData}
                  disabled={isVerifying || !setujuCheckbox}
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: setujuCheckbox ? '#10b981' : '#94a3b8',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: setujuCheckbox ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: setujuCheckbox ? '0 4px 10px rgba(16, 185, 129, 0.3)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  <i className="fas fa-check-circle"></i>
                  {isVerifying ? 'Menyimpan...' : 'Verifikasi & Setujui Kebenaran Data'}
                </button>

                <button
                  type="button"
                  onClick={openModalPerbaikan}
                  style={{
                    width: '100%',
                    padding: '10px',
                    backgroundColor: 'white',
                    color: '#d97706',
                    border: '1.5px solid #f59e0b',
                    borderRadius: '10px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <i className="fas fa-edit"></i> Ada Data yang Salah? Ajukan Perbaikan Data
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Badge Kendaraan Terdaftar */}
        {kendaraan && (
          <div style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            color: 'white',
            borderRadius: '16px',
            padding: '18px 20px',
            marginTop: '16px',
            marginBottom: '20px',
            boxShadow: '0 4px 10px rgba(15, 23, 42, 0.15)',
            border: '1px solid #334155'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 700, color: '#38bdf8' }}>
                <i className="fas fa-motorcycle" style={{ fontSize: '15px' }}></i>
                KENDARAAN TERDAFTAR (PARKIR YAYASAN)
              </div>
              {kendaraan.izin_ortu ? (
                <span style={{ background: '#059669', color: 'white', fontSize: '10px', fontWeight: 800, padding: '3px 8px', borderRadius: '12px' }}>
                  <i className="fas fa-check-circle"></i> ADA IZIN ORTU
                </span>
              ) : (
                <span style={{ background: '#d97706', color: 'white', fontSize: '10px', fontWeight: 800, padding: '3px 8px', borderRadius: '12px' }}>
                  <i className="fas fa-exclamation-triangle"></i> BELUM IZIN
                </span>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '1.5px', fontFamily: 'monospace' }}>
                  {kendaraan.plat_nomor}
                </div>
                <div style={{ fontSize: '13px', color: '#cbd5e1', marginTop: '2px' }}>
                  {kendaraan.merk_motor || 'Sepeda Motor'} {kendaraan.warna_motor ? '(' + kendaraan.warna_motor + ')' : ''}
                </div>
              </div>
              {kendaraan.keterangan && (
                <div style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic', maxWidth: '200px', textAlign: 'right' }}>
                  {kendaraan.keterangan}
                </div>
              )}
            </div>
          </div>
        )}

        <h3 style={{ fontSize: '16px', margin: '0 0 16px 0', color: '#334155' }}>Menu Utama</h3>

        {/* Menu Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {menus.map((menu, idx) => (
            <div 
              key={idx} 
              onClick={() => router.push(menu.path)}
              style={{ 
                background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', 
                padding: '20px 16px', textAlign: 'center', cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
              }}
            >
              <div style={{ 
                width: '48px', height: '48px', borderRadius: '12px', 
                background: `${menu.color}20`, color: menu.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                fontSize: '20px', margin: '0 auto 12px auto' 
              }}>
                <i className={`fas ${menu.icon}`}></i>
              </div>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>{menu.title}</span>
            </div>
          ))}
        </div>

      </div>

      <PortalFooter />

      {/* ========================================================================= */}
      {/* MODAL: PENGAJUAN PERBAIKAN DATA */}
      {/* ========================================================================= */}
      {showPerbaikanModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          backdropFilter: 'blur(3px)'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '460px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{ padding: '16px 20px', background: '#0284c7', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Ajukan Perbaikan Data</h4>
                <span style={{ fontSize: '11px', opacity: 0.9 }}>Koreksi data untuk rujukan cetak Ijazah</span>
              </div>
              <button 
                onClick={() => setShowPerbaikanModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '18px', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitPerbaikan} style={{ padding: '16px 20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>
                Silakan centang item data yang perlu diperbaiki, lalu ketikkan data yang benar sesuai dengan <strong>Akta Kelahiran</strong> atau <strong>Kartu Keluarga</strong>.
              </p>

              {/* Data Items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { key: 'NAMA', label: 'Nama Lengkap Siswa', val: student.nama },
                  { key: 'TEMPAT, TANGGAL LAHIR', label: 'Tempat, Tanggal Lahir (TTL)', val: student.ttl },
                  { key: 'NIK', label: 'NIK Siswa', val: student.nik },
                  { key: 'NISN', label: 'NISN', val: student.nisn },
                  { key: 'JENIS KELAMIN', label: 'Jenis Kelamin', val: student.jenisKelamin },
                  { key: 'NAMA AYAH KANDUNG', label: 'Nama Ayah Kandung', val: student.namaAyah },
                  { key: 'NAMA IBU KANDUNG', label: 'Nama Ibu Kandung', val: student.namaIbu },
                  { key: 'SD/MI', label: 'Asal SD/MI', val: student.asalSekolah },
                ].map((item) => {
                  const isChecked = selectedFields.includes(item.key);
                  return (
                    <div key={item.key} style={{
                      border: isChecked ? '1.5px solid #0284c7' : '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '10px',
                      background: isChecked ? '#f0f9ff' : '#ffffff'
                    }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleField(item.key, item.val || '')}
                          style={{ width: '16px', height: '16px', accentColor: '#0284c7' }}
                        />
                        <span>{item.label}</span>
                      </label>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px', marginLeft: '24px' }}>
                        Tercatat: <b>{item.val || '-'}</b>
                      </div>

                      {/* Input New Value */}
                      {isChecked && (
                        <div style={{ marginTop: '8px', marginLeft: '24px' }}>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#0369a1', marginBottom: '2px' }}>
                            Ketik Data yang Benar:
                          </label>
                          <input
                            type="text"
                            required
                            placeholder={`Masukkan ${item.label} yang benar`}
                            value={perbaikanForm[item.key] || ''}
                            onChange={(e) => setPerbaikanForm({ ...perbaikanForm, [item.key]: e.target.value })}
                            style={{
                              width: '100%', padding: '7px 10px', boxSizing: 'border-box',
                              borderRadius: '6px', border: '1px solid #7dd3fc', fontSize: '12px', background: '#fff'
                            }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Alasan / Catatan */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Alasan / Keterangan Perbaikan:
                </label>
                <textarea
                  rows={2}
                  value={alasanPerbaikan}
                  onChange={(e) => setAlasanPerbaikan(e.target.value)}
                  placeholder="Contoh: Tanggal lahir di Akta Kelahiran tertulis 15 Desember bukan 14 Desember..."
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
              </div>

              {/* Identitas Pemohon */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#334155', marginBottom: '2px' }}>Nama Pemohon:</label>
                  <input
                    type="text"
                    required
                    value={pemohonNama}
                    onChange={(e) => setPemohonNama(e.target.value)}
                    placeholder="Nama Orang Tua"
                    style={{ width: '100%', padding: '7px 8px', boxSizing: 'border-box', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#334155', marginBottom: '2px' }}>Hubungan:</label>
                  <select
                    value={pemohonHubungan}
                    onChange={(e) => setPemohonHubungan(e.target.value)}
                    style={{ width: '100%', padding: '7px 4px', boxSizing: 'border-box', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  >
                    <option value="Ayah Kandung">Ayah Kandung</option>
                    <option value="Ibu Kandung">Ibu Kandung</option>
                    <option value="Wali">Wali Murid</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#334155', marginBottom: '2px' }}>No. WhatsApp Aktif (untuk konfirmasi TU):</label>
                <input
                  type="text"
                  required
                  value={pemohonNoHp}
                  onChange={(e) => setPemohonNoHp(e.target.value)}
                  placeholder="Contoh: 08123456789"
                  style={{ width: '100%', padding: '7px 8px', boxSizing: 'border-box', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowPerbaikanModal(false)}
                  style={{ flex: 1, padding: '10px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPerbaikan}
                  style={{
                    flex: 2, padding: '10px', background: '#0284c7', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                  }}
                >
                  <i className="fas fa-paper-plane"></i>
                  {isSubmittingPerbaikan ? 'Mengirim...' : 'Kirim Pengajuan ke TU'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DOKUMEN SPTJM RESMI (SURAT PERNYATAAN TANGGUNG JAWAB MUTLAK) */}
      {/* ========================================================================= */}
      {showSptjmModal && (
        <div className="sptjm-modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.7)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          backdropFilter: 'blur(3px)'
        }}>
          <div className="sptjm-modal-content" style={{
            background: 'white',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '560px',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            overflow: 'hidden'
          }}>
            {/* Modal Actions Header (No-Print) */}
            <div className="no-print" style={{ padding: '12px 20px', background: '#1e293b', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fas fa-certificate" style={{ color: '#10b981' }}></i>
                Surat Pernyataan Tanggung Jawab Mutlak (SPTJM)
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => window.print()}
                  style={{ padding: '6px 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <i className="fas fa-print"></i> Cetak / PDF
                </button>
                <button
                  onClick={() => setShowSptjmModal(false)}
                  style={{ padding: '6px 10px', background: '#475569', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                >
                  Tutup
                </button>
              </div>
            </div>

            {/* Document Printable Body */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, fontFamily: 'serif', color: '#000', background: '#fff' }}>
              
              {/* Kop Surat Madrasah */}
              <div style={{ textAlign: 'center', borderBottom: '2.5px solid #000', paddingBottom: '10px', marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>YAYASAN PENDIDIKAN ALMAARIF SINGOSARI</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold' }}>MTs ALMAARIF 01 SINGOSARI</div>
                <div style={{ fontSize: '10px', color: '#333' }}>
                  NPSN : 20581318 | NSM : 121235070115<br/>
                  Jl. Masjid No. 33 Pagentan, Kec. Singosari, Kab. Malang, Jawa Timur | admin@mtsalmaarif01-sgs.sch.id
                </div>
              </div>

              {/* Judul Surat */}
              <div style={{ textAlign: 'center', marginBottom: '18px' }}>
                <div style={{ fontSize: '13px', fontWeight: 'bold', textDecoration: 'underline' }}>
                  SURAT PERNYATAAN TANGGUNG JAWAB MUTLAK (SPTJM)
                </div>
                <div style={{ fontSize: '11px', fontWeight: 'bold' }}>
                  KEBENARAN DATA PESERTA DIDIK UNTUK PENERBITAN IJAZAH
                </div>
              </div>

              {/* Pernyataan Identitas */}
              <p style={{ fontSize: '11.5px', lineHeight: 1.6, margin: '0 0 10px 0' }}>
                Yang bertanda tangan di bawah ini:
              </p>

              <table style={{ width: '100%', fontSize: '11.5px', marginBottom: '14px', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ width: '150px', padding: '2px 0' }}>Nama Orang Tua/Wali</td>
                    <td style={{ width: '10px' }}>:</td>
                    <td style={{ fontWeight: 'bold' }}>{verifikasi?.nama_wali || namaWali || student.namaAyah || '-'}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '2px 0' }}>Hubungan Keluarga</td>
                    <td>:</td>
                    <td>{verifikasi?.hubungan || hubunganWali || 'Orang Tua / Wali'}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '2px 0' }}>Orang Tua/Wali Dari</td>
                    <td>:</td>
                    <td style={{ fontWeight: 'bold' }}>{student.nama}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '2px 0' }}>Kelas / Rombel</td>
                    <td>:</td>
                    <td>Kelas {student.kelas}</td>
                  </tr>
                </tbody>
              </table>

              <p style={{ fontSize: '11.5px', lineHeight: 1.6, margin: '0 0 10px 0' }}>
                Menyatakan dengan sesungguhnya bahwa data peserta didik di bawah ini telah saya periksa dengan seksama dan <strong>BENAR SESUAI DOKUMEN NEGARA (Akta Kelahiran dan Kartu Keluarga)</strong>:
              </p>

              {/* Tabel Snapshot Data */}
              <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', marginBottom: '16px', border: '1px solid #000' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #000' }}>
                    <td style={{ padding: '4px 6px', width: '140px', background: '#f5f5f5', borderRight: '1px solid #000' }}>Nama Lengkap Siswa</td>
                    <td style={{ padding: '4px 6px', fontWeight: 'bold' }}>{student.nama}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #000' }}>
                    <td style={{ padding: '4px 6px', background: '#f5f5f5', borderRight: '1px solid #000' }}>Tempat, Tanggal Lahir (TTL)</td>
                    <td style={{ padding: '4px 6px', fontWeight: 'bold' }}>
                      {student.ttl || (student.tempatLahir && student.tanggalLahir ? `${student.tempatLahir}, ${student.tanggalLahir}` : student.tempatLahir || '-')}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #000' }}>
                    <td style={{ padding: '4px 6px', background: '#f5f5f5', borderRight: '1px solid #000' }}>NISN / NIK</td>
                    <td style={{ padding: '4px 6px' }}>{student.nisn || '-'} / {student.nik || '-'}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #000' }}>
                    <td style={{ padding: '4px 6px', background: '#f5f5f5', borderRight: '1px solid #000' }}>Jenis Kelamin</td>
                    <td style={{ padding: '4px 6px' }}>{student.jenisKelamin || '-'}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #000' }}>
                    <td style={{ padding: '4px 6px', background: '#f5f5f5', borderRight: '1px solid #000' }}>Nama Ayah Kandung</td>
                    <td style={{ padding: '4px 6px' }}>{student.namaAyah || '-'}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #000' }}>
                    <td style={{ padding: '4px 6px', background: '#f5f5f5', borderRight: '1px solid #000' }}>Nama Ibu Kandung</td>
                    <td style={{ padding: '4px 6px' }}>{student.namaIbu || '-'}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 6px', background: '#f5f5f5', borderRight: '1px solid #000' }}>Asal SD/MI</td>
                    <td style={{ padding: '4px 6px' }}>{student.asalSekolah || '-'}</td>
                  </tr>
                </tbody>
              </table>

              {/* Klausul Hukum */}
              <p style={{ fontSize: '11px', lineHeight: 1.6, textAlign: 'justify', margin: '0 0 16px 0' }}>
                Data tersebut di atas menjadi <strong>acuan mutlak pencetakan Ijazah, Surat Keterangan Lulus (SKL), dan Raport Buku Induk</strong>. Apabila di kemudian hari ditemukan kesalahan data yang disebabkan oleh kelalaian atau ketidaktelitian pemeriksaan dari pihak kami, maka hal tersebut <strong>sepenuhnya menjadi tanggung jawab Orang Tua/Wali Murid</strong> dan kami menyatakan <strong>TIDAK AKAN MENUNTUT pihak MTs Almaarif 01 Singosari</strong> baik secara perdata maupun pidana.
              </p>

              {/* Tanda Tangan */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '20px' }}>
                <div style={{ textAlign: 'center', width: '200px' }}>
                  Mengetahui,<br/>
                  Kepala Madrasah<br/><br/><br/><br/>
                  <b>Drs. H. Dedy Dwitagama, M.Pd</b>
                </div>

                <div style={{ textAlign: 'center', width: '220px' }}>
                  Singosari, {verifikasi?.verified_at ? formatDate(verifikasi.verified_at).split(' WIB')[0] : '........................'}<br/>
                  Yang Menyatakan (Wali Murid),<br/>
                  <div style={{ margin: '8px auto', padding: '4px', border: '1px dashed #10b981', borderRadius: '4px', background: '#f0fdf4', color: '#166534', fontSize: '9px', width: '170px' }}>
                    <i className="fas fa-check-circle"></i> TERVALIDASI SECARA DIGITAL<br/>
                    Portal Wali Murid
                  </div>
                  <b>{verifikasi?.nama_wali || namaWali || '( ........................................ )'}</b>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
