'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Swal from 'sweetalert2';
import LoadingScreen from '@/components/LoadingScreen';

export default function SpmbPortalDashboard() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedRekening, setCopiedRekening] = useState(false);
  const [uploadingBukti, setUploadingBukti] = useState(false);
  const [showBiodata, setShowBiodata] = useState(false);
  const [pengumumanList, setPengumumanList] = useState<any[]>([]);

  const fetchPengumuman = async (jalur: string) => {
    try {
      const res = await fetch(`/api/spmb/pengumuman?jalur=${encodeURIComponent(jalur || '')}&t=${Date.now()}`);
      const resJson = await res.json();
      if (resJson.success) {
        setPengumumanList(resJson.data || []);
      }
    } catch (e) {
      console.warn('Gagal memuat pengumuman SPMB', e);
    }
  };

  useEffect(() => {
    try {
      localStorage.setItem('keren_app_preference', 'spmb');
    } catch {}

    const sessionStr = localStorage.getItem('spmb_session');
    if (!sessionStr) {
      router.replace('/spmb/login');
      return;
    }

    try {
      const parsed = JSON.parse(sessionStr);
      setData(parsed);
      // Fetch latest updates in background
      refreshData(parsed.id);
      fetchPengumuman(parsed.jalurPendaftaran || '');
    } catch (e) {
      localStorage.removeItem('spmb_session');
      router.replace('/spmb/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  const refreshData = async (id: number) => {
    if (!id) return;
    setRefreshing(true);
    try {
      const res = await fetch(`/api/spmb/auth?id=${id}`);
      const resJson = await res.json();
      if (resJson.success && resJson.data) {
        setData(resJson.data);
        localStorage.setItem('spmb_session', JSON.stringify(resJson.data));
        fetchPengumuman(resJson.data.jalurPendaftaran || '');
      }
    } catch (err) {
      console.warn('Gagal memuat status terbaru SPMB', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = () => {
    Swal.fire({
      title: 'Keluar dari Portal?',
      text: 'Anda dapat masuk kembali kapan saja menggunakan Nomor Pendaftaran Anda.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#059669',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Ya, Keluar',
      cancelButtonText: 'Batal'
    }).then(result => {
      if (result.isConfirmed) {
        localStorage.removeItem('spmb_session');
        router.replace('/spmb/login');
      }
    });
  };

  const copyNomor = () => {
    if (data?.nomorPendaftaran) {
      navigator.clipboard.writeText(data.nomorPendaftaran);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const copyRekeningBCA = () => {
    navigator.clipboard.writeText('3680380359');
    setCopiedRekening(true);
    setTimeout(() => setCopiedRekening(false), 2500);
  };

  const handleUploadBuktiDaftarUlang = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !data) return;

    if (file.size > 10 * 1024 * 1024) {
      Swal.fire('File Terlalu Besar', 'Maksimal ukuran file adalah 10MB.', 'warning');
      return;
    }

    try {
      setUploadingBukti(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'bukti_daftar_ulang');

      const res = await fetch('/api/spmb/upload', {
        method: 'POST',
        body: formData
      });

      const resJson = await res.json();
      if (resJson.success && resJson.link) {
        const link = resJson.link;

        const bs = data.biayaDaftarUlang !== undefined && data.biayaDaftarUlang !== '' ? Number(data.biayaDaftarUlang) : 4500000;
        const pot = Number(data.potonganDaftarUlang || 0);
        const tagihan = Math.max(0, bs - pot);
        const dibayar = Number(data.nominalDibayarDaftarUlang || 0);

        let newStatus = 'menunggu_verifikasi';
        if (dibayar >= tagihan && tagihan > 0) newStatus = 'lunas';
        else if (dibayar > 0) newStatus = 'cicilan';

        const patchRes = await fetch(`/api/spmb/${data.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            buktiDaftarUlang: link,
            statusDaftarUlang: newStatus,
            metodeBayarDaftarUlang: 'transfer'
          })
        });

        const patchJson = await patchRes.json();
        if (patchJson.success) {
          const updated = {
            ...data,
            buktiDaftarUlang: link,
            statusDaftarUlang: newStatus,
            metodeBayarDaftarUlang: 'transfer'
          };
          setData(updated);
          localStorage.setItem('spmb_session', JSON.stringify(updated));

          Swal.fire({
            icon: 'success',
            title: 'Bukti Berhasil Diunggah!',
            html: `
              <p style="font-size: 13.5px; color: #475569; margin-bottom: 12px;">
                Bukti pembayaran telah berhasil disimpan. Silakan klik tombol <b>WhatsApp Ibu Ida</b> untuk konfirmasi dan validasi nominal pembayaran.
              </p>
            `,
            confirmButtonText: 'OK',
            confirmButtonColor: '#059669'
          });
        } else {
          Swal.fire('Gagal Menyimpan', patchJson.error || 'Terjadi kesalahan saat menyimpan bukti', 'error');
        }
      } else {
        Swal.fire('Gagal Mengunggah', resJson.error || 'Gagal mengunggah berkas ke server', 'error');
      }
    } catch (err: any) {
      Swal.fire('Error', 'Gagal memproses unggahan bukti: ' + err.message, 'error');
    } finally {
      setUploadingBukti(false);
    }
  };

  const getWaIbuIdaUrl = () => {
    if (!data) return '';
    const cleanPhone = '6285708332179';
    const text = encodeURIComponent(
      `Assalamu'alaikum Ibu Ida (Panitia Pembayaran SPMB MTs Almaarif 01 Singosari).\n\n` +
      `Saya wali dari calon santri:\n` +
      `*Nama:* ${data.namaLengkap}\n` +
      `*No. Pendaftaran:* ${data.nomorPendaftaran}\n` +
      `*Jalur:* ${data.jalurPendaftaran || 'Reguler'}\n\n` +
      `Saya telah melakukan pembayaran daftar ulang via transfer Bank BCA dan mengunggah bukti pembayaran di Portal Calon Siswa SPMB.\n\n` +
      `Mohon bantuannya untuk memeriksa dan memvalidasi nominal pembayaran kami. Terima kasih.`
    );
    return `https://wa.me/${cleanPhone}?text=${text}`;
  };

  if (loading) {
    return <LoadingScreen message="Memuat Portal Calon Siswa SPMB..." />;
  }

  if (!data) return null;

  const statusVerifikasiKk = data.statusVerifikasi || 'menunggu';
  const statusVerifikasiRapor = data.statusVerifikasiRapor || 'menunggu';
  const statusKelulusan = data.statusKelulusan || 'proses';

  const biayaStandar = data.biayaDaftarUlang !== undefined && data.biayaDaftarUlang !== '' ? Number(data.biayaDaftarUlang) : 4500000;
  const potongan = Number(data.potonganDaftarUlang || 0);
  const totalTagihan = Math.max(0, biayaStandar - potongan);
  const nominalDibayar = Number(data.nominalDibayarDaftarUlang || 0);
  const sisaTagihan = Math.max(0, totalTagihan - nominalDibayar);

  let statusDaftarUlang = data.statusDaftarUlang || 'belum_bayar';
  if (nominalDibayar >= totalTagihan && totalTagihan > 0) {
    statusDaftarUlang = 'lunas';
  } else if (nominalDibayar > 0) {
    statusDaftarUlang = 'cicilan';
  } else if (data.buktiDaftarUlang && nominalDibayar === 0) {
    statusDaftarUlang = 'menunggu_verifikasi';
  }

  const getWaUrl = (phone: string, namaPanitia: string, customTopic?: string) => {
    const cleanPhone = phone.replace(/\D/g, '').replace(/^0/, '62');
    const topicText = customTopic || 'Ingin menanyakan perihal seleksi SPMB.';
    const text = encodeURIComponent(
      `Assalamu'alaikum ${namaPanitia} (Panitia SPMB MTs Almaarif 01 Singosari).\n\nSaya wali dari calon santri:\nNama: ${data.namaLengkap}\nNo. Pendaftaran: ${data.nomorPendaftaran}\nJalur: ${data.jalurPendaftaran}\n\n${topicText}\n\nTerima kasih.`
    );
    return `https://wa.me/${cleanPhone}?text=${text}`;
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', paddingBottom: '60px' }}>
      
      {/* Top Navbar */}
      <nav style={{
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '14px 20px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
      }}>
        <div style={{
          maxWidth: '960px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/logo.png" alt="Logo MTs" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
            <div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#064e3b', lineHeight: 1.2 }}>
                Portal Calon Siswa SPMB
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
                MTs Almaarif 01 Singosari
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => refreshData(data.id)}
              disabled={refreshing}
              title="Perbarui Status"
              style={{
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                color: '#334155',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <i className={`fas fa-sync-alt ${refreshing ? 'fa-spin' : ''}`} style={{ color: '#059669' }}></i>
              <span style={{ display: 'none', md: 'inline' } as any}>Perbarui</span>
            </button>

            <button
              onClick={handleLogout}
              style={{
                background: '#fee2e2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <i className="fas fa-sign-out-alt"></i>
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: '960px', margin: '24px auto', padding: '0 16px' }}>

        {/* Hero Card Header */}
        <div style={{
          background: 'linear-gradient(135deg, #064e3b 0%, #047857 60%, #059669 100%)',
          borderRadius: '20px',
          padding: '28px 24px',
          color: 'white',
          boxShadow: '0 10px 25px -5px rgba(6, 78, 59, 0.3)',
          position: 'relative',
          overflow: 'hidden',
          marginBottom: '24px'
        }}>
          <i className="fas fa-graduation-cap" style={{
            position: 'absolute',
            right: '-15px',
            bottom: '-25px',
            fontSize: '9rem',
            color: 'rgba(255, 255, 255, 0.08)',
            pointerEvents: 'none'
          }} />

          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255, 255, 255, 0.2)', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, marginBottom: '12px' }}>
              <i className="fas fa-star" style={{ color: '#facc15' }}></i> Jalur {data.jalurPendaftaran || 'Reguler'}
            </div>

            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 6px 0', lineHeight: 1.3 }}>
              {data.namaLengkap}
            </h1>

            <p style={{ margin: '0 0 18px 0', fontSize: '14px', opacity: 0.9 }}>
              Asal Sekolah: <strong>{data.asalSekolah || '-'}</strong>
            </p>

            {/* Nomor Pendaftaran Pill */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px',
              background: 'rgba(0, 0, 0, 0.25)',
              padding: '8px 16px',
              borderRadius: '12px',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.15)'
            }}>
              <span style={{ fontSize: '12.5px', opacity: 0.85 }}>Nomor Pendaftaran:</span>
              <span style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '0.8px', color: '#a7f3d0' }}>
                {data.nomorPendaftaran}
              </span>
              <button
                onClick={copyNomor}
                style={{
                  background: copied ? '#10b981' : 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: 'white',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <i className={`fas ${copied ? 'fa-check' : 'fa-copy'}`}></i>
                {copied ? 'Tersalin!' : 'Salin'}
              </button>
            </div>
          </div>
        </div>

        {/* Status Kelulusan Banner (Jika sudah ada keputusan) */}
        {statusKelulusan === 'diterima' && (
          <div style={{
            background: 'linear-gradient(135deg, #15803d, #16a34a)',
            borderRadius: '16px',
            padding: '24px',
            color: 'white',
            marginBottom: '24px',
            boxShadow: '0 8px 20px rgba(22, 163, 74, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '18px'
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              flexShrink: 0
            }}>
              🎉
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '1.25rem', fontWeight: 800 }}>
                Selamat! Anda Dinyatakan DITERIMA
              </h3>
              <p style={{ margin: '0', fontSize: '14px', opacity: 0.95, lineHeight: 1.5 }}>
                Ananda <strong>{data.namaLengkap}</strong> resmi dinyatakan diterima sebagai calon santri baru MTs Almaarif 01 Singosari. Silakan melakukan proses daftar ulang sesuai petunjuk madrasah.
              </p>
            </div>
          </div>
        )}

        {statusKelulusan === 'tidak_diterima' && (
          <div style={{
            background: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '16px',
            padding: '20px',
            color: '#991b1b',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <i className="fas fa-info-circle" style={{ fontSize: '2rem', color: '#ef4444' }}></i>
            <div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', fontWeight: 800 }}>
                Informasi Hasil Seleksi
              </h3>
              <p style={{ margin: '0', fontSize: '13.5px', color: '#7f1d1d' }}>
                Mohon maaf, ananda saat ini belum dapat diterima pada pilihan kuota jalur ini. Terima kasih telah mengikuti proses seleksi di MTs Almaarif 01 Singosari.
              </p>
            </div>
          </div>
        )}

        {/* Card Pengumpulan Berkas Rapor */}
        <div style={{
          background: statusVerifikasiRapor === 'valid' ? '#f0fdf4' : statusVerifikasiRapor === 'perbaikan' ? '#fff5f5' : '#fffbeb',
          border: `1.5px solid ${statusVerifikasiRapor === 'valid' ? '#86efac' : statusVerifikasiRapor === 'perbaikan' ? '#fecaca' : '#fde68a'}`,
          borderRadius: '16px',
          padding: '22px 24px',
          marginBottom: '24px',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
            <div style={{ display: 'flex', gap: '14px', flex: 1, minWidth: '280px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: statusVerifikasiRapor === 'valid' ? '#dcfce7' : statusVerifikasiRapor === 'perbaikan' ? '#fee2e2' : '#fef3c7',
                color: statusVerifikasiRapor === 'valid' ? '#15803d' : statusVerifikasiRapor === 'perbaikan' ? '#ef4444' : '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.3rem',
                flexShrink: 0
              }}>
                <i className={statusVerifikasiRapor === 'valid' ? 'fas fa-clipboard-check' : 'fas fa-file-invoice'}></i>
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '15.5px', fontWeight: 800, color: statusVerifikasiRapor === 'valid' ? '#166534' : statusVerifikasiRapor === 'perbaikan' ? '#991b1b' : '#92400e' }}>
                  {statusVerifikasiRapor === 'valid' 
                    ? '✅ Berkas Rapor Telah Diverifikasi (VALID)' 
                    : statusVerifikasiRapor === 'perbaikan' 
                    ? '⚠️ Perbaikan Berkas Rapor' 
                    : '📋 Pengumpulan Berkas Rapor Kelas 5 (Semester 1 & 2)'}
                </h3>

                {statusVerifikasiRapor === 'valid' ? (
                  <p style={{ margin: 0, fontSize: '13.5px', color: '#166534', lineHeight: 1.5 }}>
                    Alhamdulillah, berkas fotokopi / file <strong>Rapor Kelas 5 (Semester 1 &amp; 2)</strong> ananda <strong>{data.namaLengkap}</strong> telah diterima dan dinyatakan <strong>VALID &amp; LENGKAP</strong> oleh Panitia SPMB.
                  </p>
                ) : statusVerifikasiRapor === 'perbaikan' ? (
                  <div>
                    <p style={{ margin: '0 0 8px 0', fontSize: '13.5px', color: '#991b1b', lineHeight: 1.5 }}>
                      Terdapat catatan dari panitia mengenai berkas rapor Anda:
                    </p>
                    <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px', fontSize: '13px', color: '#7f1d1d', fontWeight: 600 }}>
                      <i className="fas fa-exclamation-triangle" style={{ marginRight: '6px' }}></i>
                      {data.catatanVerifikasiRapor || 'Foto/file rapor kurang jelas atau berkas semester 1/2 belum lengkap. Silakan kirim ulang.'}
                    </div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <a
                        href={getWaUrl('085659735348', 'Pak Alfian', 'Berikut saya kirimkan perbaikan berkas/dokumen FC Rapor Kelas 5 Semester 1 & 2 ananda.')}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          background: '#15803d',
                          color: 'white',
                          padding: '8px 14px',
                          borderRadius: '8px',
                          fontSize: '12.5px',
                          fontWeight: 700,
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <i className="fab fa-whatsapp"></i> Kirim Ulang ke Pak Alfian
                      </a>
                      <a
                        href={getWaUrl('087859171158', 'Bu Izza', 'Berikut saya kirimkan perbaikan berkas/dokumen FC Rapor Kelas 5 Semester 1 & 2 ananda.')}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          background: '#047857',
                          color: 'white',
                          padding: '8px 14px',
                          borderRadius: '8px',
                          fontSize: '12.5px',
                          fontWeight: 700,
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <i className="fab fa-whatsapp"></i> Kirim Ulang ke Bu Izza
                      </a>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p style={{ margin: '0 0 10px 0', fontSize: '13.5px', color: '#78350f', lineHeight: 1.5 }}>
                      Setelah mendaftar online, calon siswa wajib mengumpulkan berkas <strong>Fotokopi Rapor Kelas 5 (Semester 1 &amp; 2)</strong>. Pengumpulan dapat dilakukan dengan 2 pilihan:
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: '#78350f' }}>
                        <i className="fas fa-school" style={{ color: '#d97706', marginTop: '3px' }}></i>
                        <div><strong>1. Secara Fisik:</strong> Diserahkan langsung ke Sekretariat Panitia SPMB di MTs Almaarif 01 Singosari.</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: '#78350f' }}>
                        <i className="fab fa-whatsapp" style={{ color: '#16a34a', marginTop: '3px' }}></i>
                        <div><strong>2. Secara Online / File:</strong> Foto atau PDF rapor dapat dikirimkan langsung ke nomor WhatsApp Panitia SPMB.</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <a
                        href={getWaUrl('085659735348', 'Pak Alfian', 'Berikut saya kirimkan berkas/dokumen FC Rapor Kelas 5 Semester 1 & 2 untuk verifikasi pendaftaran ananda.')}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          background: '#15803d',
                          color: 'white',
                          padding: '9px 16px',
                          borderRadius: '8px',
                          fontSize: '12.5px',
                          fontWeight: 700,
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 2px 4px rgba(21, 128, 61, 0.2)'
                        }}
                      >
                        <i className="fab fa-whatsapp"></i> Kirim Rapor ke Pak Alfian
                      </a>
                      <a
                        href={getWaUrl('087859171158', 'Bu Izza', 'Berikut saya kirimkan berkas/dokumen FC Rapor Kelas 5 Semester 1 & 2 untuk verifikasi pendaftaran ananda.')}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          background: '#047857',
                          color: 'white',
                          padding: '9px 16px',
                          borderRadius: '8px',
                          fontSize: '12.5px',
                          fontWeight: 700,
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 2px 4px rgba(4, 120, 87, 0.2)'
                        }}
                      >
                        <i className="fab fa-whatsapp"></i> Kirim Rapor ke Bu Izza
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ flexShrink: 0 }}>
              <span style={{
                display: 'inline-block',
                padding: '4px 12px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 800,
                background: statusVerifikasiRapor === 'valid' ? '#dcfce7' : statusVerifikasiRapor === 'perbaikan' ? '#fee2e2' : '#fef3c7',
                color: statusVerifikasiRapor === 'valid' ? '#15803d' : statusVerifikasiRapor === 'perbaikan' ? '#b91c1c' : '#b45309',
                border: `1px solid ${statusVerifikasiRapor === 'valid' ? '#86efac' : statusVerifikasiRapor === 'perbaikan' ? '#fca5a5' : '#fde68a'}`
              }}>
                Status: {statusVerifikasiRapor === 'valid' ? 'Valid' : statusVerifikasiRapor === 'perbaikan' ? 'Perlu Perbaikan' : 'Belum Dikumpulkan'}
              </span>
            </div>
          </div>
        </div>

        {/* Card Informasi & Pembayaran Daftar Ulang */}
        {(statusKelulusan === 'diterima' || nominalDibayar > 0 || data.buktiDaftarUlang) && (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            border: `2px solid ${statusDaftarUlang === 'lunas' ? '#86efac' : statusDaftarUlang === 'cicilan' ? '#fde68a' : '#cbd5e1'}`,
            marginBottom: '24px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)'
          }}>
            {/* Header Card */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: statusDaftarUlang === 'lunas' ? '#dcfce7' : statusDaftarUlang === 'cicilan' ? '#fef3c7' : '#eff6ff',
                  color: statusDaftarUlang === 'lunas' ? '#15803d' : statusDaftarUlang === 'cicilan' ? '#b45309' : '#0284c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem'
                }}>
                  <i className="fas fa-money-check-alt"></i>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                    Informasi &amp; Administrasi Daftar Ulang
                  </h3>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                    Pembayaran administrasi calon santri baru MTs Almaarif 01 Singosari
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div>
                {statusDaftarUlang === 'lunas' && (
                  <span style={{
                    background: '#dcfce7',
                    color: '#15803d',
                    border: '1.5px solid #86efac',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '12.5px',
                    fontWeight: 800,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <i className="fas fa-check-circle"></i> STATUS: LUNAS
                  </span>
                )}
                {statusDaftarUlang === 'cicilan' && (
                  <span style={{
                    background: '#fef3c7',
                    color: '#b45309',
                    border: '1.5px solid #fde68a',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '12.5px',
                    fontWeight: 800,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <i className="fas fa-clock"></i> CICILAN (Kurang Rp {sisaTagihan.toLocaleString('id-ID')})
                  </span>
                )}
                {statusDaftarUlang === 'menunggu_verifikasi' && (
                  <span style={{
                    background: '#e0f2fe',
                    color: '#0369a1',
                    border: '1.5px solid #bae6fd',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '12.5px',
                    fontWeight: 800,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <i className="fas fa-hourglass-half"></i> Menunggu Verifikasi Panitia
                  </span>
                )}
                {statusDaftarUlang === 'belum_bayar' && (
                  <span style={{
                    background: '#f1f5f9',
                    color: '#475569',
                    border: '1.5px solid #cbd5e1',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    Belum Melakukan Pembayaran
                  </span>
                )}
              </div>
            </div>

            {/* Financial Summary Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: '12px',
              marginBottom: '18px'
            }}>
              <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Biaya Standar:</div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#334155', marginTop: '2px' }}>
                  Rp {biayaStandar.toLocaleString('id-ID')}
                </div>
              </div>

              {potongan > 0 && (
                <div style={{ background: '#ecfdf5', padding: '12px 14px', borderRadius: '10px', border: '1px solid #a7f3d0' }}>
                  <div style={{ fontSize: '11px', color: '#047857', fontWeight: 600 }}>Potongan / Beasiswa:</div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#047857', marginTop: '2px' }}>
                    - Rp {potongan.toLocaleString('id-ID')}
                  </div>
                </div>
              )}

              <div style={{ background: '#f0fdf4', padding: '12px 14px', borderRadius: '10px', border: '1px solid #86efac' }}>
                <div style={{ fontSize: '11px', color: '#166534', fontWeight: 600 }}>Total Tagihan:</div>
                <div style={{ fontSize: '15px', fontWeight: 900, color: '#166534', marginTop: '2px' }}>
                  Rp {totalTagihan.toLocaleString('id-ID')}
                </div>
              </div>

              <div style={{ background: '#eff6ff', padding: '12px 14px', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
                <div style={{ fontSize: '11px', color: '#1e40af', fontWeight: 600 }}>Telah Divalidasi:</div>
                <div style={{ fontSize: '15px', fontWeight: 900, color: '#1d4ed8', marginTop: '2px' }}>
                  Rp {nominalDibayar.toLocaleString('id-ID')}
                </div>
              </div>

              <div style={{
                background: sisaTagihan === 0 ? '#dcfce7' : '#fffbeb',
                padding: '12px 14px',
                borderRadius: '10px',
                border: `1.5px solid ${sisaTagihan === 0 ? '#86efac' : '#fde68a'}`
              }}>
                <div style={{ fontSize: '11px', color: sisaTagihan === 0 ? '#15803d' : '#92400e', fontWeight: 600 }}>
                  {sisaTagihan === 0 ? 'Kewajiban Tagihan:' : 'Sisa Tagihan (Kurang):'}
                </div>
                <div style={{ fontSize: '15px', fontWeight: 900, color: sisaTagihan === 0 ? '#15803d' : '#b45309', marginTop: '2px' }}>
                  {sisaTagihan === 0 ? 'Rp 0 (LUNAS ✅)' : `Rp ${sisaTagihan.toLocaleString('id-ID')}`}
                </div>
              </div>
            </div>

            {/* Rekening & Panduan Pembayaran Section */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '14px',
              marginBottom: '20px'
            }}>
              {/* Opsi 1: Bank BCA */}
              <div style={{
                background: '#f8fafc',
                border: '1.5px solid #cbd5e1',
                borderRadius: '12px',
                padding: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <i className="fas fa-university" style={{ color: '#0284c7' }}></i>
                  <strong style={{ fontSize: '13.5px', color: '#0f172a' }}>Pilihan 1: Transfer Bank BCA</strong>
                </div>
                <div style={{ fontSize: '12.5px', color: '#475569', lineHeight: 1.6 }}>
                  <div>Bank: <b>Bank BCA</b></div>
                  <div>Atas Nama: <b>MTS Almaarif 01 singosari</b></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                    <span>No. Rekening: <b style={{ fontSize: '15px', color: '#0f172a', letterSpacing: '0.5px' }}>3680380359</b></span>
                    <button
                      type="button"
                      onClick={copyRekeningBCA}
                      style={{
                        background: copiedRekening ? '#10b981' : '#e0f2fe',
                        border: '1px solid',
                        borderColor: copiedRekening ? '#059669' : '#bae6fd',
                        color: copiedRekening ? 'white' : '#0369a1',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <i className={`fas ${copiedRekening ? 'fa-check' : 'fa-copy'}`}></i>
                      {copiedRekening ? 'Tersalin!' : 'Salin'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Opsi 2: Tunai di Madrasah */}
              <div style={{
                background: '#f8fafc',
                border: '1.5px solid #cbd5e1',
                borderRadius: '12px',
                padding: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <i className="fas fa-school" style={{ color: '#047857' }}></i>
                  <strong style={{ fontSize: '13.5px', color: '#0f172a' }}>Pilihan 2: Tunai / Langsung</strong>
                </div>
                <div style={{ fontSize: '12.5px', color: '#475569', lineHeight: 1.6 }}>
                  <div>Lokasi: <b>Sekretariat / Bendahara SPMB MTs Almaarif 01 Singosari</b></div>
                  <div>Waktu: Hari kerja madrasah (Pukul 07.30 - 13.00 WIB)</div>
                  <div style={{ marginTop: '4px', color: '#047857', fontWeight: 600 }}>
                    <i className="fas fa-info-circle"></i> Dapat dibayar secara <b>Lunas</b> atau <b>Cicilan</b> langsung ke panitia madrasah.
                  </div>
                </div>
              </div>
            </div>

            {/* Catatan Panitia jika ada */}
            {data.catatanDaftarUlang && (
              <div style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '10px',
                padding: '12px 16px',
                marginBottom: '16px',
                fontSize: '13px',
                color: '#1e40af'
              }}>
                <i className="fas fa-sticky-note" style={{ marginRight: '6px' }}></i>
                <b>Catatan Panitia:</b> {data.catatanDaftarUlang}
              </div>
            )}

            {/* Upload Bukti Pembayaran & Tombol WhatsApp Panitia */}
            <div style={{
              background: '#f8fafc',
              border: '1px dashed #cbd5e1',
              borderRadius: '12px',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '14px'
            }}>
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>
                  <i className="fas fa-receipt" style={{ color: '#047857', marginRight: '6px' }}></i>
                  {data.buktiDaftarUlang ? 'Bukti Pembayaran Terunggah' : 'Unggah Bukti Transfer (BCA)'}
                </div>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                  {data.buktiDaftarUlang 
                    ? 'Bukti telah tersimpan di sistem. Hubungi Ibu Ida via WhatsApp untuk konfirmasi dan pencatatan nominal valid.'
                    : 'Setelah transfer BCA, unggah bukti pembayaran di sini lalu kirim konfirmasi WhatsApp ke Ibu Ida.'}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {data.buktiDaftarUlang && (
                  <a
                    href={data.buktiDaftarUlang}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: '#047857',
                      color: 'white',
                      padding: '9px 14px',
                      borderRadius: '8px',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <i className="fas fa-external-link-alt"></i> Lihat Bukti
                  </a>
                )}

                <label style={{
                  background: uploadingBukti ? '#94a3b8' : '#334155',
                  color: 'white',
                  padding: '9px 14px',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: uploadingBukti ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <i className={`fas ${uploadingBukti ? 'fa-spinner fa-spin' : 'fa-upload'}`}></i>
                  <span>{uploadingBukti ? 'Mengunggah...' : data.buktiDaftarUlang ? 'Ganti Bukti' : 'Unggah Bukti Transfer'}</span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    disabled={uploadingBukti}
                    onChange={handleUploadBuktiDaftarUlang}
                    style={{ display: 'none' }}
                  />
                </label>

                {/* Tombol WhatsApp ke Ibu Ida */}
                <a
                  href={getWaIbuIdaUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: '#22c55e',
                    color: 'white',
                    padding: '9px 16px',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 6px rgba(34, 197, 94, 0.3)'
                  }}
                  title="Kirim konfirmasi pembayaran ke Ibu Ida via WhatsApp"
                >
                  <i className="fab fa-whatsapp" style={{ fontSize: '15px' }}></i>
                  <span>WA Panitia Pembayaran (Ibu Ida)</span>
                </a>
              </div>
            </div>

          </div>
        )}

        {/* Timeline Tahapan Seleksi Card */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
          border: '1px solid #e2e8f0',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fas fa-stream" style={{ color: '#047857' }}></i>
              Alur & Status Seleksi
            </h2>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Terkini: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            
            {/* Step 1 */}
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#dcfce7',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '15px',
                flexShrink: 0
              }}>
                <i className="fas fa-check"></i>
              </div>
              <div style={{ flex: 1, paddingTop: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 700, color: '#0f172a' }}>
                    1. Pendaftaran Online
                  </h4>
                  <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
                    Selesai
                  </span>
                </div>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                  Data formulir pendaftaran telah tersimpan pada {data.timestamp || '-'}.
                </p>
              </div>
            </div>

            {/* Step 2: Verifikasi KK / Identitas */}
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: statusVerifikasiKk === 'valid' ? '#dcfce7' : statusVerifikasiKk === 'perbaikan' ? '#fee2e2' : '#fef3c7',
                color: statusVerifikasiKk === 'valid' ? '#16a34a' : statusVerifikasiKk === 'perbaikan' ? '#ef4444' : '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '15px',
                flexShrink: 0
              }}>
                {statusVerifikasiKk === 'valid' ? (
                  <i className="fas fa-check"></i>
                ) : statusVerifikasiKk === 'perbaikan' ? (
                  <i className="fas fa-exclamation"></i>
                ) : (
                  <i className="fas fa-clock"></i>
                )}
              </div>
              <div style={{ flex: 1, paddingTop: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 700, color: '#0f172a' }}>
                    2. Verifikasi Dokumen KK &amp; Identitas
                  </h4>
                  {statusVerifikasiKk === 'valid' && (
                    <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
                      KK Valid
                    </span>
                  )}
                  {statusVerifikasiKk === 'perbaikan' && (
                    <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
                      Perlu Perbaikan KK
                    </span>
                  )}
                  {statusVerifikasiKk === 'menunggu' && (
                    <span style={{ background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
                      Sedang Diverifikasi Panitia
                    </span>
                  )}
                </div>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
                  {statusVerifikasiKk === 'valid' && 'Dokumen Kartu Keluarga dan data identitas pendaftaran Anda telah disetujui (VALID) oleh panitia.'}
                  {statusVerifikasiKk === 'perbaikan' && (
                    <span style={{ color: '#b91c1c', fontWeight: 600 }}>
                      Catatan Panitia: {data.catatanVerifikasi || 'Dokumen KK kurang jelas / perlu diupload ulang. Hubungi panitia SPMB.'}
                    </span>
                  )}
                  {statusVerifikasiKk === 'menunggu' && 'Panitia SPMB sedang memvalidasi keabsahan dokumen Kartu Keluarga yang Anda unggah.'}
                </p>
              </div>
            </div>

            {/* Step 3: Verifikasi Berkas Rapor */}
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: statusVerifikasiRapor === 'valid' ? '#dcfce7' : statusVerifikasiRapor === 'perbaikan' ? '#fee2e2' : '#fef3c7',
                color: statusVerifikasiRapor === 'valid' ? '#16a34a' : statusVerifikasiRapor === 'perbaikan' ? '#ef4444' : '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '15px',
                flexShrink: 0
              }}>
                {statusVerifikasiRapor === 'valid' ? (
                  <i className="fas fa-check"></i>
                ) : statusVerifikasiRapor === 'perbaikan' ? (
                  <i className="fas fa-exclamation"></i>
                ) : (
                  <i className="fas fa-file-alt"></i>
                )}
              </div>
              <div style={{ flex: 1, paddingTop: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 700, color: '#0f172a' }}>
                    3. Verifikasi Berkas Rapor Kelas 5 (Sem 1 &amp; 2)
                  </h4>
                  {statusVerifikasiRapor === 'valid' && (
                    <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
                      Rapor Valid
                    </span>
                  )}
                  {statusVerifikasiRapor === 'perbaikan' && (
                    <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
                      Perlu Perbaikan Rapor
                    </span>
                  )}
                  {statusVerifikasiRapor === 'menunggu' && (
                    <span style={{ background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
                      Belum Dikumpulkan
                    </span>
                  )}
                </div>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
                  {statusVerifikasiRapor === 'valid' && 'Berkas FC Rapor Kelas 5 Semester 1 & 2 telah diterima dan dinyatakan VALID oleh panitia.'}
                  {statusVerifikasiRapor === 'perbaikan' && (
                    <span style={{ color: '#b91c1c', fontWeight: 600 }}>
                      Catatan Panitia: {data.catatanVerifikasiRapor || 'Berkas rapor kurang jelas / perlu dikirim ulang. Hubungi panitia SPMB.'}
                    </span>
                  )}
                  {statusVerifikasiRapor === 'menunggu' && 'Calon siswa wajib mengumpulkan berkas Fotokopi Rapor Kelas 5 (Semester 1 & 2) secara fisik ke madrasah atau kirim via WhatsApp Panitia.'}
                </p>
              </div>
            </div>

            {/* Step 4: Observasi */}
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: data.jadwalTes ? '#e0f2fe' : '#f1f5f9',
                color: data.jadwalTes ? '#0284c7' : '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '15px',
                flexShrink: 0
              }}>
                <i className="fas fa-clipboard-list"></i>
              </div>
              <div style={{ flex: 1, paddingTop: '4px' }}>
                <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 700, color: '#0f172a' }}>
                  4. Tes / Observasi Calon Santri
                </h4>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                  {data.jadwalTes ? (
                    <strong style={{ color: '#0284c7' }}>Jadwal Anda: {data.jadwalTes}</strong>
                  ) : (
                    'Jadwal dan teknis pelaksanaan observasi akan diumumkan oleh panitia madrasah.'
                  )}
                </p>
              </div>
            </div>

            {/* Step 5: Pengumuman Kelulusan */}
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: statusKelulusan === 'diterima' ? '#dcfce7' : statusKelulusan === 'tidak_diterima' ? '#fee2e2' : '#f1f5f9',
                color: statusKelulusan === 'diterima' ? '#16a34a' : statusKelulusan === 'tidak_diterima' ? '#ef4444' : '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '15px',
                flexShrink: 0
              }}>
                <i className="fas fa-bullhorn"></i>
              </div>
              <div style={{ flex: 1, paddingTop: '4px' }}>
                <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 700, color: '#0f172a' }}>
                  5. Pengumuman Kelulusan
                </h4>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                  {statusKelulusan === 'diterima' && (
                    <strong style={{ color: '#16a34a' }}>Alhamdulillah, Diterima di MTs Almaarif 01 Singosari.</strong>
                  )}
                  {statusKelulusan === 'tidak_diterima' && (
                    <strong style={{ color: '#ef4444' }}>Belum memenuhi kuota seleksi tahun ini.</strong>
                  )}
                  {statusKelulusan === 'proses' && 'Hasil seleksi akan diumumkan secara serentak di portal ini.'}
                </p>
              </div>
            </div>

            {/* Step 6: Daftar Ulang & Administrasi Madrasah */}
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: statusDaftarUlang === 'lunas' ? '#dcfce7' : statusDaftarUlang === 'cicilan' ? '#fef3c7' : statusDaftarUlang === 'menunggu_verifikasi' ? '#e0f2fe' : '#f1f5f9',
                color: statusDaftarUlang === 'lunas' ? '#16a34a' : statusDaftarUlang === 'cicilan' ? '#d97706' : statusDaftarUlang === 'menunggu_verifikasi' ? '#0284c7' : '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '15px',
                flexShrink: 0
              }}>
                <i className={statusDaftarUlang === 'lunas' ? 'fas fa-check-double' : statusDaftarUlang === 'cicilan' ? 'fas fa-clock' : statusDaftarUlang === 'menunggu_verifikasi' ? 'fas fa-hourglass-half' : 'fas fa-wallet'}></i>
              </div>
              <div style={{ flex: 1, paddingTop: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 700, color: '#0f172a' }}>
                    6. Daftar Ulang &amp; Administrasi Madrasah
                  </h4>
                  {statusDaftarUlang === 'lunas' && (
                    <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
                      ✅ Lunas
                    </span>
                  )}
                  {statusDaftarUlang === 'cicilan' && (
                    <span style={{ background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
                      ⏳ Cicilan (Kurang Rp {sisaTagihan.toLocaleString('id-ID')})
                    </span>
                  )}
                  {statusDaftarUlang === 'menunggu_verifikasi' && (
                    <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
                      📄 Menunggu Verifikasi Panitia
                    </span>
                  )}
                  {statusDaftarUlang === 'belum_bayar' && (
                    <span style={{ background: '#f1f5f9', color: '#64748b', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
                      Belum Daftar Ulang
                    </span>
                  )}
                </div>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
                  {statusDaftarUlang === 'lunas' && (
                    <span style={{ color: '#166534', fontWeight: 600 }}>
                      Alhamdulillah, administrasi daftar ulang Anda telah LUNAS tervalidasi sebesar Rp {nominalDibayar.toLocaleString('id-ID')}.
                    </span>
                  )}
                  {statusDaftarUlang === 'cicilan' && (
                    <span style={{ color: '#b45309', fontWeight: 600 }}>
                      Telah dibayar cicilan: Rp {nominalDibayar.toLocaleString('id-ID')} &bull; Sisa kekurangan: Rp {sisaTagihan.toLocaleString('id-ID')}.
                    </span>
                  )}
                  {statusDaftarUlang === 'menunggu_verifikasi' && (
                    <span style={{ color: '#0284c7', fontWeight: 600 }}>
                      Bukti transfer telah diunggah. Silakan hubungi Ibu Ida (0857-0833-2179) untuk validasi nominal pembayaran.
                    </span>
                  )}
                  {statusDaftarUlang === 'belum_bayar' && (
                    statusKelulusan === 'diterima'
                      ? 'Biaya daftar ulang sebesar Rp 4.500.000 (bisa lunas atau dicicil) dapat dibayar via transfer Bank BCA 3680380359 a.n MTS Almaarif 01 singosari atau tunai langsung ke madrasah.'
                      : 'Biaya daftar ulang sejumlah Rp 4.500.000 (dapat dibayar lunas atau dicicil via Bank BCA 3680380359 atau langsung ke madrasah). Tahapan ini aktif setelah kelulusan.'
                  )}
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Card Pengumuman Resmi SPMB */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
          border: '1px solid #e2e8f0',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fas fa-bullhorn" style={{ color: '#0284c7' }}></i>
              Pengumuman Resmi SPMB
            </h2>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Jalur Pendaftaran: <strong style={{ color: '#047857' }}>{data.jalurPendaftaran || 'Reguler'}</strong>
            </span>
          </div>

          {pengumumanList.length === 0 ? (
            <div style={{
              background: '#f8fafc',
              borderRadius: '12px',
              padding: '24px 20px',
              textAlign: 'center',
              color: '#64748b',
              fontSize: '13.5px',
              border: '1px dashed #cbd5e1'
            }}>
              <i className="fas fa-bell-slash" style={{ fontSize: '2rem', color: '#94a3b8', marginBottom: '8px', display: 'block' }}></i>
              Belum ada pengumuman terbaru untuk jalur pendaftaran Anda. Silakan pantau halaman ini secara berkala.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {pengumumanList.slice(0, 2).map(item => {
                const isGeneral = (item.targetJalur || '').toLowerCase() === 'semua jalur' || (item.targetJalur || '').toLowerCase() === 'semua';
                return (
                  <div
                    key={item.id}
                    style={{
                      background: isGeneral ? '#f0fdf4' : '#eff6ff',
                      border: `1.5px solid ${isGeneral ? '#bbf7d0' : '#bfdbfe'}`,
                      borderRadius: '12px',
                      padding: '18px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                      <span style={{
                        background: isGeneral ? '#dcfce7' : '#dbeafe',
                        color: isGeneral ? '#166534' : '#1e40af',
                        border: `1px solid ${isGeneral ? '#86efac' : '#93c5fd'}`,
                        padding: '3px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.4px'
                      }}>
                        {isGeneral ? '📢 Pengumuman Umum' : `⭐ Khusus Jalur: ${item.targetJalur}`}
                      </span>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>
                        <i className="far fa-clock" style={{ marginRight: '4px' }}></i>
                        {item.tanggal} &bull; {item.jam}
                      </span>
                    </div>

                    <h3 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                      {item.judul}
                    </h3>

                    <p style={{ margin: 0, fontSize: '13.5px', color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {item.pesan}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Actions Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          
          {/* Card Cetak Kartu */}
          <Link
            href={`/spmb/cetak/${data.id}`}
            style={{
              background: 'white',
              borderRadius: '16px',
              padding: '20px',
              border: '1.5px solid #bbf7d0',
              textDecoration: 'none',
              color: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
              transition: 'all 0.2s'
            }}
          >
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '12px',
              background: '#dcfce7',
              color: '#15803d',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              flexShrink: 0
            }}>
              <i className="fas fa-print"></i>
            </div>
            <div>
              <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#064e3b', marginBottom: '2px' }}>
                Cetak Kartu Pendaftaran
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                Cetak ulang atau unduh PDF kartu bukti pendaftaran Anda
              </div>
            </div>
          </Link>

          {/* Card Bantuan Panitia WA: Bu Izza */}
          <a
            href={getWaUrl('087859171158', 'Bu Izza')}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: 'white',
              borderRadius: '16px',
              padding: '20px',
              border: '1.5px solid #bbf7d0',
              textDecoration: 'none',
              color: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
              transition: 'all 0.2s'
            }}
          >
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '12px',
              background: '#22c55e',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              flexShrink: 0
            }}>
              <i className="fab fa-whatsapp"></i>
            </div>
            <div>
              <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#166534', marginBottom: '2px' }}>
                WA Panitia: Bu Izza
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                0878-5917-1158 (Chat WhatsApp)
              </div>
            </div>
          </a>

          {/* Card Bantuan Panitia WA: Pak Alfian */}
          <a
            href={getWaUrl('085659735348', 'Pak Alfian')}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: 'white',
              borderRadius: '16px',
              padding: '20px',
              border: '1.5px solid #bbf7d0',
              textDecoration: 'none',
              color: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
              transition: 'all 0.2s'
            }}
          >
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '12px',
              background: '#22c55e',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              flexShrink: 0
            }}>
              <i className="fab fa-whatsapp"></i>
            </div>
            <div>
              <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#166534', marginBottom: '2px' }}>
                WA Panitia: Pak Alfian
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                0856-5973-5348 (Chat WhatsApp)
              </div>
            </div>
          </a>

          {/* Card Bantuan Panitia Pembayaran WA: Ibu Ida */}
          <a
            href={getWaIbuIdaUrl()}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: 'white',
              borderRadius: '16px',
              padding: '20px',
              border: '1.5px solid #bbf7d0',
              textDecoration: 'none',
              color: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
              transition: 'all 0.2s'
            }}
          >
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '12px',
              background: '#059669',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              flexShrink: 0
            }}>
              <i className="fab fa-whatsapp"></i>
            </div>
            <div>
              <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#065f46', marginBottom: '2px' }}>
                Panitia Pembayaran: Ibu Ida
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                0857-0833-2179 (Konfirmasi Daftar Ulang)
              </div>
            </div>
          </a>

        </div>

        {/* Accordion / Card Rincian Biodata */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '22px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
        }}>
          <div 
            onClick={() => setShowBiodata(!showBiodata)}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              cursor: 'pointer',
              userSelect: 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="fas fa-id-card-alt" style={{ color: '#047857', fontSize: '18px' }}></i>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#1e293b' }}>
                Rincian Biodata Pendaftar
              </h3>
            </div>
            <button
              type="button"
              style={{
                background: '#f1f5f9',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                color: '#475569',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>{showBiodata ? 'Tutup' : 'Lihat Biodata'}</span>
              <i className={`fas fa-chevron-${showBiodata ? 'up' : 'down'}`}></i>
            </button>
          </div>

          {showBiodata && (
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                
                {/* Data Calon Siswa */}
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 800, color: '#047857', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Data Calon Siswa
                  </h4>
                  <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr>
                        <td style={{ color: '#64748b', padding: '4px 0', width: '40%' }}>Nama Lengkap</td>
                        <td style={{ fontWeight: 600, color: '#0f172a' }}>: {data.namaLengkap}</td>
                      </tr>
                      <tr>
                        <td style={{ color: '#64748b', padding: '4px 0' }}>NISN</td>
                        <td style={{ fontWeight: 600, color: '#0f172a' }}>: {data.nisn || '-'}</td>
                      </tr>
                      <tr>
                        <td style={{ color: '#64748b', padding: '4px 0' }}>TTL</td>
                        <td style={{ fontWeight: 600, color: '#0f172a' }}>: {data.tempatTanggalLahir || '-'}</td>
                      </tr>
                      <tr>
                        <td style={{ color: '#64748b', padding: '4px 0' }}>Jenis Kelamin</td>
                        <td style={{ fontWeight: 600, color: '#0f172a' }}>: {data.jenisKelamin || '-'}</td>
                      </tr>
                      <tr>
                        <td style={{ color: '#64748b', padding: '4px 0' }}>Agama</td>
                        <td style={{ fontWeight: 600, color: '#0f172a' }}>: {data.agama || '-'}</td>
                      </tr>
                      <tr>
                        <td style={{ color: '#64748b', padding: '4px 0' }}>Asal Sekolah</td>
                        <td style={{ fontWeight: 600, color: '#0f172a' }}>: {data.asalSekolah || '-'}</td>
                      </tr>
                      <tr>
                        <td style={{ color: '#64748b', padding: '4px 0' }}>Prestasi</td>
                        <td style={{ fontWeight: 600, color: '#0f172a' }}>: {data.prestasi || '-'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Data Orang Tua & Alamat */}
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 800, color: '#047857', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Orang Tua & Domisili
                  </h4>
                  <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr>
                        <td style={{ color: '#64748b', padding: '4px 0', width: '40%' }}>Nama Ayah</td>
                        <td style={{ fontWeight: 600, color: '#0f172a' }}>: {data.namaAyah || '-'}</td>
                      </tr>
                      <tr>
                        <td style={{ color: '#64748b', padding: '4px 0' }}>Pekerjaan Ayah</td>
                        <td style={{ fontWeight: 600, color: '#0f172a' }}>: {data.pekerjaanAyah || '-'}</td>
                      </tr>
                      <tr>
                        <td style={{ color: '#64748b', padding: '4px 0' }}>No. WA Ayah</td>
                        <td style={{ fontWeight: 600, color: '#0f172a' }}>: {data.nomorWaAyah || '-'}</td>
                      </tr>
                      <tr>
                        <td style={{ color: '#64748b', padding: '4px 0' }}>Nama Ibu</td>
                        <td style={{ fontWeight: 600, color: '#0f172a' }}>: {data.namaIbu || '-'}</td>
                      </tr>
                      <tr>
                        <td style={{ color: '#64748b', padding: '4px 0' }}>Pekerjaan Ibu</td>
                        <td style={{ fontWeight: 600, color: '#0f172a' }}>: {data.pekerjaanIbu || '-'}</td>
                      </tr>
                      <tr>
                        <td style={{ color: '#64748b', padding: '4px 0' }}>No. WA Ibu</td>
                        <td style={{ fontWeight: 600, color: '#0f172a' }}>: {data.nomorWaIbu || '-'}</td>
                      </tr>
                      <tr>
                        <td style={{ color: '#64748b', padding: '4px 0' }}>Alamat</td>
                        <td style={{ fontWeight: 600, color: '#0f172a' }}>: {data.alamatLengkap || '-'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

              </div>

              {/* Berkas Terlampir */}
              {data.linkKk && (
                <div style={{ marginTop: '14px', textAlign: 'right' }}>
                  <a
                    href={data.linkKk}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: '12.5px',
                      color: '#047857',
                      fontWeight: 700,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <i className="fas fa-file-pdf"></i> Lihat Berkas KK yang Diunggah
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Media Sosial Madrasah */}
        <div style={{
          marginTop: '24px',
          background: 'white',
          borderRadius: '16px',
          padding: '22px 24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
          textAlign: 'center'
        }}>
          <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <i className="fas fa-globe" style={{ color: '#047857' }}></i>
            Media Sosial & Informasi Madrasah
          </h4>
          <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#64748b' }}>
            Ikuti info terbaru, kegiatan pendaftaran, dan informasi seputar MTs Almaarif 01 Singosari:
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '14px',
            maxWidth: '680px',
            margin: '0 auto'
          }}>
            {/* YouTube Button / Card */}
            <a
              href="https://www.youtube.com/@mtsalmaarif01singosari"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '14px 18px',
                borderRadius: '12px',
                background: '#fef2f2',
                border: '1.5px solid #fecaca',
                textDecoration: 'none',
                color: '#991b1b',
                transition: 'all 0.2s ease',
                textAlign: 'left'
              }}
            >
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                background: '#dc2626',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.4rem',
                flexShrink: 0
              }}>
                <i className="fab fa-youtube"></i>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#991b1b', lineHeight: 1.2 }}>
                  YouTube Resmi
                </div>
                <div style={{ fontSize: '12px', color: '#b91c1c', opacity: 0.85, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  @mtsalmaarif01singosari
                </div>
              </div>
              <i className="fas fa-external-link-alt" style={{ fontSize: '12px', color: '#ef4444' }}></i>
            </a>

            {/* Instagram Button / Card */}
            <a
              href="https://www.instagram.com/mtsalmaarif01singosari/"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '14px 18px',
                borderRadius: '12px',
                background: '#fdf2f8',
                border: '1.5px solid #fbcfe8',
                textDecoration: 'none',
                color: '#831843',
                transition: 'all 0.2s ease',
                textAlign: 'left'
              }}
            >
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.4rem',
                flexShrink: 0
              }}>
                <i className="fab fa-instagram"></i>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#831843', lineHeight: 1.2 }}>
                  Instagram Resmi
                </div>
                <div style={{ fontSize: '12px', color: '#9d174d', opacity: 0.85, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  @mtsalmaarif01singosari
                </div>
              </div>
              <i className="fas fa-external-link-alt" style={{ fontSize: '12px', color: '#ec4899' }}></i>
            </a>
          </div>

          <div style={{ marginTop: '18px', fontSize: '12px', color: '#94a3b8' }}>
            &copy; {new Date().getFullYear()} MTs Almaarif 01 Singosari &bull; Panitia SPMB
          </div>
        </div>

      </div>

    </div>
  );
}
