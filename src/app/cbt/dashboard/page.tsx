'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';

function isCabangMatch(cabang1: string, cabang2: string) {
  const c1 = (cabang1 || '').trim().toLowerCase();
  const c2 = (cabang2 || '').trim().toLowerCase();
  if (!c1 || !c2) return false;
  if (c1 === c2) return true;
  if (
    (c1.includes('arab') && c2.includes('arab')) ||
    (c1.includes('inggris') && c2.includes('inggris')) ||
    (c1.includes('matematika') && c2.includes('matematika')) ||
    (c1.includes('ipas') && c2.includes('ipas')) ||
    (c1.includes('ipa') && c2.includes('ipa')) ||
    (c1.includes('pai') && c2.includes('pai')) ||
    (c1.includes('banjari') && c2.includes('banjari')) ||
    (c1.includes('singer') && c2.includes('singer')) ||
    (c1.includes('sms') && c2.includes('sms'))
  ) {
    return true;
  }
  return false;
}

export default function DashboardCBT() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [sesi, setSesi] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [hasilPublished, setHasilPublished] = useState(false);
  const [statusLolos, setStatusLolos] = useState<boolean | null>(null);
  const [tampilkanPengumumanLolos, setTampilkanPengumumanLolos] = useState(false);
  const [cbtBuka, setCbtBuka] = useState(false);
  const [tahapCbt, setTahapCbt] = useState<'seleksi' | 'final'>('seleksi');
  const [pembayaranFinal, setPembayaranFinal] = useState<{
    status: string;
    bukti_url: string;
    waktu_bayar: string | null;
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const INFO_BANK = {
    bank: 'BCA',
    noRek: '3686518888',
    atasNama: 'MTs Almaarif 01 Singosari'
  };

  const handleCopyRek = () => {
    navigator.clipboard.writeText(INFO_BANK.noRek);
    Swal.fire({
      icon: 'success',
      title: 'Nomor Rekening Disalin!',
      text: `Nomor rekening ${INFO_BANK.bank} ${INFO_BANK.noRek} a.n. ${INFO_BANK.atasNama} berhasil disalin ke clipboard.`,
      timer: 2000,
      showConfirmButton: false
    });
  };

  useEffect(() => {
    const data = localStorage.getItem('cbt_user');
    if (!data) {
      router.push('/cbt');
      return;
    }
    const parsed = JSON.parse(data);
    setUser(parsed);
    fetchSesi(parsed.nomorPeserta);
    fetchConfig(parsed.nomorPeserta, parsed.lomba);
    fetchCbtConfig();
  }, [router]);

  const fetchCbtConfig = async () => {
    try {
      const res = await fetch('/api/olimpiade-seni/config-cbt');
      const json = await res.json();
      if (json.success) {
        setCbtBuka(json.cbt_buka);
        if (json.tahap_cbt === 'final' || json.tahap_cbt === 'seleksi') {
          setTahapCbt(json.tahap_cbt);
        }
      }
    } catch { /* silent */ }
  };

  const fetchConfig = async (nomorPeserta: string, userLomba?: string) => {
    try {
      const res = await fetch('/api/olimpiade-seni/config');
      const json = await res.json();
      if (json.success) {
        const pubCabangs: string[] = Array.isArray(json.published_cabang) ? json.published_cabang : [];
        const targetLomba = userLomba || user?.lomba || '';
        
        // Cek apakah lomba peserta ini termasuk yang dipublikasikan oleh admin
        const isMyLombaPublished = pubCabangs.some(c => isCabangMatch(c, targetLomba)) || 
          (pubCabangs.length === 0 && Boolean(json.hasil_published));

        setHasilPublished(isMyLombaPublished);
        if (isMyLombaPublished) {
          checkLolosStatus(nomorPeserta);
        } else {
          setStatusLolos(null);
          setTampilkanPengumumanLolos(false);
        }
      }
    } catch { /* silent */ }
  };

  const checkLolosStatus = async (nomorPeserta: string) => {
    try {
      const res = await fetch('/api/olimpiade-seni/monitoring?tahap=seleksi');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const pesertaUser = json.data.find((d: any) => d.nomor_peserta === nomorPeserta);
        const isLolos = Boolean(pesertaUser && pesertaUser.lolos_seleksi);
        setStatusLolos(isLolos);
        setTampilkanPengumumanLolos(isLolos);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSesi = async (nomorPeserta: string) => {
    try {
      const res = await fetch(`/api/cbt/sesi?nomorPeserta=${nomorPeserta}`);
      const data = await res.json();
      if (data.isDeleted) {
        localStorage.removeItem('cbt_user');
        await Swal.fire({
          icon: 'error',
          title: 'Akses Ditolak',
          text: data.error || 'Akun pendaftaran Anda tidak ditemukan atau telah dihapus dari sistem.',
          confirmButtonColor: '#059669'
        });
        router.push('/cbt');
        return;
      }
      if (data.isNotQualified) {
        localStorage.removeItem('cbt_user');
        await Swal.fire({
          icon: 'info',
          title: 'Khusus Peserta Lolos Final',
          text: data.error || 'Akses Portal CBT saat ini hanya dibuka untuk 30 peserta terbaik per cabang mapel yang dinyatakan LOLOS ke Babak Final.',
          confirmButtonColor: '#0284c7',
          confirmButtonText: 'Mengerti'
        });
        router.push('/cbt');
        return;
      }
      if (data.success) {
        if (data.tahap_cbt === 'final' || data.tahap_cbt === 'seleksi') {
          setTahapCbt(data.tahap_cbt);
        }
        if (typeof data.cbt_buka === 'boolean') {
          setCbtBuka(data.cbt_buka);
        }
        if (typeof data.hasil_published === 'boolean') {
          setHasilPublished(data.hasil_published);
        }
        if (typeof data.lolos_seleksi === 'boolean' || data.lolos_seleksi === null) {
          setStatusLolos(data.lolos_seleksi);
        }
        if (typeof data.tampilkan_pengumuman_lolos === 'boolean') {
          setTampilkanPengumumanLolos(data.tampilkan_pengumuman_lolos);
        }
        if (data.pembayaran_final) {
          setPembayaranFinal(data.pembayaran_final);
        } else {
          setPembayaranFinal(null);
        }
        setSesi(data.sesi || null);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const isBypassUser = Boolean(user?.isBypass || user?.nomorPeserta?.startsWith('BYPASS-'));
  const canStart = cbtBuka || isBypassUser;

  const handleMulaiUjian = () => {
    if (!canStart && (!sesi || sesi.status !== 'selesai')) {
      Swal.fire('Ujian Belum Dibuka', 'Ujian CBT saat ini sedang disembunyikan/ditutup oleh panitia.', 'info');
      return;
    }
    if (tahapCbt === 'final' && statusLolos === false && !isBypassUser) {
      Swal.fire(
        'Khusus Finalis (Top 30)',
        'Ujian CBT yang sedang berlangsung saat ini adalah Babak Final khusus bagi peserta yang lolos Top 30 Babak Seleksi.',
        'warning'
      );
      return;
    }
    const labelTahap = tahapCbt === 'final' ? 'Babak Final' : 'Babak Seleksi';
    Swal.fire({
      title: `Mulai Ujian ${labelTahap}?`,
      text: "Waktu akan berjalan selama 90 menit. Pastikan koneksi internet Anda stabil.",
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#0284c7',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'Ya, Mulai Sekarang'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const el = document.documentElement as any;
          if (el.requestFullscreen) {
            await el.requestFullscreen();
          } else if (el.webkitRequestFullscreen) {
            await el.webkitRequestFullscreen();
          }
        } catch {
          // ignore if denied by browser, the fullscreen gate on ujian page will handle it
        }
        router.push('/cbt/ujian');
      }
    });
  };

  const handleUploadBukti = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    Swal.fire({ title: 'Mengunggah Bukti...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
      const formData = new FormData();
      formData.append('nomorPeserta', user.nomorPeserta);
      formData.append('buktiPembayaran', file);

      const res = await fetch('/api/cbt/bayar', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (data.success) {
        setPembayaranFinal({
          status: data.status || 'Menunggu Verifikasi',
          bukti_url: data.bukti_url || '',
          waktu_bayar: data.waktu_bayar || new Date().toISOString()
        });
        await Swal.fire({
          icon: 'success',
          title: 'Bukti Pembayaran Terkirim!',
          text: 'Bukti transfer daftar ulang Babak Final berhasil diunggah. Menunggu verifikasi dari panitia.',
          confirmButtonColor: '#0284c7'
        });
      } else {
        Swal.fire('Gagal', data.error || 'Gagal mengunggah bukti', 'error');
      }
    } catch (err: any) {
      Swal.fire('Error', err.message, 'error');
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleResetSesi = async () => {
    const confirm = await Swal.fire({
      title: 'Reset Sesi Uji Coba?',
      text: 'Jawaban dan riwayat pengerjaan sesi sebelumnya akan direset agar Anda dapat mencoba kembali ujian CBT mapel ini dari awal.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#0284c7',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Reset Sesi',
      cancelButtonText: 'Batal'
    });
    if (confirm.isConfirmed) {
      setLoading(true);
      try {
        const res = await fetch('/api/cbt/sesi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'reset', nomorPeserta: user.nomorPeserta })
        });
        const data = await res.json();
        if (data.success) {
          await Swal.fire('Berhasil', 'Sesi ujian telah direset. Anda dapat memulai kembali.', 'success');
          setSesi(null);
          await fetchSesi(user.nomorPeserta);
        } else {
          Swal.fire('Gagal', data.error || 'Gagal reset sesi', 'error');
        }
      } catch (e: any) {
        Swal.fire('Error', e.message, 'error');
      }
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('cbt_user');
    router.push('/cbt');
  };

  if (!user || loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Memuat Dashboard...</div>;

  const isSelesai = sesi && sesi.status === 'selesai';
  const labelTahap = tahapCbt === 'final' ? 'Babak Final' : 'Babak Seleksi (Penyisihan)';

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '40px 20px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '1.5rem', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/logo_olimpiade_seni.png" alt="Logo" style={{ height: '32px', width: 'auto' }} /> 
            Portal CBT
          </h1>
          <button onClick={handleLogout} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#ef4444', fontWeight: 600, cursor: 'pointer' }}>
            <i className="fas fa-sign-out-alt"></i> Keluar
          </button>
        </div>

        <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <div style={{ background: tahapCbt === 'final' ? 'linear-gradient(135deg, #b45309, #d97706)' : '#0284c7', padding: '24px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ margin: '0 0 8px 0' }}>Selamat Datang, {user.nama}</h2>
              <p style={{ margin: 0, opacity: 0.9 }}>Asal Sekolah: {user.asalSekolah}</p>
            </div>
            <span style={{
              background: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.4)',
              padding: '6px 14px',
              borderRadius: '20px',
              fontWeight: 800,
              fontSize: '0.85rem'
            }}>
              <i className={`fas ${tahapCbt === 'final' ? 'fa-trophy' : 'fa-layer-group'}`} style={{ marginRight: '6px' }}></i>
              Tahap: {labelTahap}
            </span>
          </div>
          
          <div style={{ padding: '32px' }}>
            {isBypassUser && (
              <div style={{ background: '#ecfdf5', border: '1.5px solid #10b981', borderRadius: '12px', padding: '14px 18px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ background: '#10b981', color: 'white', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800 }}>AKUN BYPASS UJI COBA</span>
                  <span style={{ fontSize: '0.9rem', color: '#065f46', fontWeight: 600 }}>
                    Akses pengujian aktif untuk mapel <b>{user.lomba}</b>. CBT dapat dicoba kapan saja meski sistem ditutup untuk umum.
                  </span>
                </div>
                {sesi && (
                  <button
                    onClick={handleResetSesi}
                    style={{ padding: '8px 16px', background: '#0284c7', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <i className="fas fa-redo"></i> Reset Sesi Uji Coba
                  </button>
                )}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '28px' }}>
              <div style={{ border: '1px solid #e2e8f0', padding: '16px', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '4px' }}>Nomor Peserta</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>{user.nomorPeserta}</div>
              </div>
              <div style={{ border: '1px solid #e2e8f0', padding: '16px', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '4px' }}>Mata Uji</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>{user.lomba}</div>
              </div>
            </div>

            {/* CARD UCAPAN SELAMAT & PEMBAYARAN FINALIS (TOP 30) */}
            {/* Hanya ditampilkan jika admin SUDAH mempublikasikan pemenang/live score dan peserta dinyatakan lolos (atau akun bypass) */}
            {(isBypassUser || (hasilPublished && (statusLolos === true || tampilkanPengumumanLolos))) && (
              <div style={{
                background: 'white',
                borderRadius: '16px',
                border: '2px solid #86efac',
                boxShadow: '0 8px 24px rgba(16, 185, 129, 0.12)',
                overflow: 'hidden',
                marginBottom: '28px'
              }}>
                {/* Header Card */}
                <div style={{
                  background: 'linear-gradient(135deg, #065f46, #059669)',
                  padding: '20px 24px',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px'
                }}>
                  <div style={{
                    fontSize: '2.2rem',
                    background: 'rgba(255,255,255,0.2)',
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    🎉
                  </div>
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1.25rem', fontWeight: 800 }}>
                      SELAMAT! Anda Dinyatakan LOLOS ke Babak Final!
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.95 }}>
                      Berdasarkan hasil seleksi CBT, Anda berhasil masuk sebagai <b>Top 30 Peserta Terbaik</b> cabang lomba <b>{user.lomba}</b>.
                    </p>
                  </div>
                </div>

                {/* Body Card */}
                <div style={{ padding: '24px' }}>
                  {/* Box Biaya & Himbauan */}
                  <div style={{
                    background: '#f0fdf4',
                    border: '1.5px solid #bbf7d0',
                    borderRadius: '12px',
                    padding: '18px 20px',
                    marginBottom: '20px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#166534', fontWeight: 700, fontSize: '1rem', marginBottom: '8px' }}>
                      <i className="fas fa-bullhorn"></i> Himbauan Registrasi Ulang Babak Final
                    </div>
                    <p style={{ margin: '0 0 12px 0', color: '#15803d', fontSize: '0.92rem', lineHeight: '1.5' }}>
                      Peserta yang lolos ke Babak Final diwajibkan melakukan registrasi ulang dengan biaya pendaftaran sebesar:
                    </p>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'baseline',
                      gap: '8px',
                      background: '#dcfce7',
                      padding: '8px 18px',
                      borderRadius: '8px',
                      border: '1px solid #86efac'
                    }}>
                      <span style={{ fontSize: '0.85rem', color: '#166534', fontWeight: 700 }}>Biaya Registrasi:</span>
                      <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#14532d' }}>Rp 50.000,-</span>
                    </div>
                  </div>

                  {/* Box Rekening Bank Transfer */}
                  <div style={{
                    background: '#f8fafc',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '18px 20px',
                    marginBottom: '20px'
                  }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                      Rekening Transfer Resmi Madrasah:
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                      <div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', letterSpacing: '1px' }}>
                          {INFO_BANK.bank} {INFO_BANK.noRek}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: '#475569', fontWeight: 600, marginTop: '2px' }}>
                          a.n. {INFO_BANK.atasNama}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyRek}
                        style={{
                          padding: '10px 18px',
                          borderRadius: '8px',
                          background: '#0284c7',
                          color: 'white',
                          border: 'none',
                          fontWeight: 700,
                          fontSize: '0.88rem',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          boxShadow: '0 2px 6px rgba(2,132,199,0.3)',
                          transition: 'all 0.2s'
                        }}
                      >
                        <i className="fas fa-copy"></i> Salin No. Rekening
                      </button>
                    </div>
                  </div>

                  {/* Status Pembayaran & Upload Bukti */}
                  <div style={{
                    background: '#ffffff',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '18px 20px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155' }}>
                        Status Pembayaran Babak Final:
                      </div>
                      <div>
                        {pembayaranFinal?.status === 'Valid' ? (
                          <span style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', padding: '6px 14px', borderRadius: '20px', fontWeight: 800, fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <i className="fas fa-check-circle"></i> Terverifikasi (LUNAS)
                          </span>
                        ) : pembayaranFinal?.status === 'Ditolak' ? (
                          <span style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', padding: '6px 14px', borderRadius: '20px', fontWeight: 800, fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <i className="fas fa-times-circle"></i> Bukti Ditolak
                          </span>
                        ) : pembayaranFinal?.bukti_url ? (
                          <span style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', padding: '6px 14px', borderRadius: '20px', fontWeight: 800, fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <i className="fas fa-clock"></i> Menunggu Verifikasi Panitia
                          </span>
                        ) : (
                          <span style={{ background: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1', padding: '6px 14px', borderRadius: '20px', fontWeight: 800, fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <i className="fas fa-exclamation-circle"></i> Belum Mengunggah Bukti
                          </span>
                        )}
                      </div>
                    </div>

                    {pembayaranFinal?.status === 'Valid' ? (
                      <div style={{ color: '#166534', fontSize: '0.88rem', lineHeight: '1.5', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                        <div>
                          Alhamdulillah, pembayaran daftar ulang Babak Final Anda telah <b>divalidasi oleh Panitia</b>. Anda dapat langsung mengerjakan soal Babak Final saat jadwal pelaksanaan dibuka.
                        </div>
                        {pembayaranFinal?.bukti_url && (
                          <a
                            href={pembayaranFinal.bukti_url}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              padding: '8px 14px',
                              borderRadius: '6px',
                              background: '#f0fdf4',
                              color: '#166534',
                              border: '1px solid #86efac',
                              fontWeight: 700,
                              fontSize: '0.82rem',
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <i className="fas fa-receipt"></i> Bukti Transfer
                          </a>
                        )}
                      </div>
                    ) : (
                      <div>
                        <p style={{ margin: '0 0 14px 0', fontSize: '0.88rem', color: '#475569', lineHeight: '1.5' }}>
                          Silakan transfer tepat sebesar <b>Rp 50.000,-</b>, kemudian foto / screenshot bukti transfer Anda dan unggah pada tombol di bawah:
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            disabled={uploading}
                            style={{
                              padding: '10px 20px',
                              borderRadius: '8px',
                              background: '#10b981',
                              color: 'white',
                              border: 'none',
                              fontWeight: 700,
                              fontSize: '0.9rem',
                              cursor: uploading ? 'not-allowed' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '8px',
                              boxShadow: '0 2px 6px rgba(16,185,129,0.3)'
                            }}
                          >
                            <i className={`fas ${uploading ? 'fa-spinner fa-spin' : 'fa-upload'}`}></i>
                            {uploading ? 'Mengunggah Bukti...' : pembayaranFinal?.bukti_url ? 'Unggah Ulang Bukti Transfer' : 'Unggah Bukti Transfer (Rp 50.000)'}
                          </button>

                          {pembayaranFinal?.bukti_url && (
                            <a
                              href={pembayaranFinal.bukti_url}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                padding: '9px 16px',
                                borderRadius: '8px',
                                background: '#f8fafc',
                                color: '#0284c7',
                                border: '1.5px solid #cbd5e1',
                                fontWeight: 700,
                                fontSize: '0.88rem',
                                textDecoration: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              <i className="fas fa-receipt"></i> Lihat Bukti Terunggah
                            </a>
                          )}
                        </div>
                        <input type="file" accept="image/*,application/pdf" ref={fileRef} onChange={handleUploadBukti} style={{ display: 'none' }} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {tahapCbt === 'final' && statusLolos === false ? (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '24px', textAlign: 'center' }}>
                <i className="fas fa-award" style={{ fontSize: '3rem', color: '#d97706', marginBottom: '12px' }}></i>
                <h3 style={{ color: '#92400e', margin: '0 0 8px 0' }}>Tahap Ujian Saat Ini: Babak Final</h3>
                <p style={{ color: '#b45309', margin: 0, lineHeight: '1.6' }}>
                  Saat ini sedang berlangsung Ujian CBT Babak Final bagi peserta yang masuk <b>Top 30 Babak Seleksi</b>. Terima kasih atas partisipasi dan semangat Anda dalam mengikuti Olimpiade Akademik!
                </p>
              </div>
            ) : isSelesai ? (
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <div style={{ fontSize: '4rem', color: '#0284c7', marginBottom: '16px' }}>
                  <i className="fas fa-flag-checkered"></i>
                </div>
                <h3 style={{ fontSize: '1.5rem', color: '#0f172a', margin: '0 0 8px 0' }}>
                  Ujian {labelTahap} Selesai!
                </h3>
                <p style={{ color: '#64748b', fontSize: '1.1rem', marginBottom: '24px' }}>
                  Terima kasih telah mengerjakan soal {labelTahap} dengan sebaik-baiknya.
                </p>

                {tahapCbt === 'final' ? (
                  <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '24px', textAlign: 'left' }}>
                    <h4 style={{ color: '#1d4ed8', fontSize: '1.1rem', margin: '0 0 10px 0' }}>
                      <i className="fas fa-trophy" style={{ marginRight: '8px' }}></i>
                      Jawaban Babak Final Tersimpan
                    </h4>
                    <p style={{ color: '#1e40af', margin: 0, lineHeight: '1.6' }}>
                      Penentuan Juara ditentukan murni dari hasil Babak Final ini. Silakan memantau halaman pengumuman resmi / Live Score dari panitia.
                    </p>
                  </div>
                ) : !hasilPublished && !isBypassUser ? (
                  <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '24px', textAlign: 'left' }}>
                    <h4 style={{ color: '#1d4ed8', fontSize: '1.1rem', margin: '0 0 10px 0' }}>
                      <i className="fas fa-clock" style={{ marginRight: '8px' }}></i>
                      Menunggu Pengumuman Resmi
                    </h4>
                    <p style={{ color: '#1e40af', margin: '0 0 12px 0', lineHeight: '1.6' }}>
                      Hasil seleksi akan diumumkan secara resmi oleh panitia setelah seluruh peserta menyelesaikan ujian. Mohon bersabar dan pantau pengumuman dari pihak madrasah atau Live Score.
                    </p>
                    <div style={{ background: 'white', borderRadius: '8px', padding: '12px 16px', display: 'inline-block', border: '1px solid #bfdbfe' }}>
                      <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Mata Uji: </span>
                      <strong style={{ color: '#0f172a' }}>{user.lomba}</strong>
                    </div>
                  </div>
                ) : (statusLolos === true || tampilkanPengumumanLolos) ? (
                  <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '12px', padding: '24px', textAlign: 'left' }}>
                    <h4 style={{ color: '#065f46', fontSize: '1.2rem', margin: '0 0 8px 0' }}>🎉 Selamat, Anda dinyatakan LOLOS ke Babak Final!</h4>
                    <p style={{ color: '#047857', margin: 0, lineHeight: '1.5' }}>
                      Pengumuman resmi Babak Final telah dipublikasikan. Silakan menyelesaikan registrasi ulang dan mengunggah bukti pembayaran pada kartu panduan di atas untuk melanjutkan ke Babak Final CBT.
                    </p>
                  </div>
                ) : statusLolos === false ? (
                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '24px' }}>
                    <p style={{ color: '#92400e', margin: 0, lineHeight: '1.5', fontSize: '1.1rem' }}>
                      Terima kasih telah berpartisipasi dalam Olimpiade Akademik. Tetap semangat dan terus belajar!
                    </p>
                  </div>
                ) : (
                  <div style={{ padding: '20px', color: '#64748b' }}>
                    <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i> Memuat status hasil seleksi...
                  </div>
                )}

                {isBypassUser && (
                  <div style={{ marginTop: '24px', textAlign: 'center' }}>
                    <button
                      onClick={handleResetSesi}
                      style={{ padding: '12px 24px', borderRadius: '8px', background: '#0284c7', color: 'white', border: 'none', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)' }}
                    >
                      <i className="fas fa-redo"></i> Reset & Uji Coba Ulang Ujian Ini
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                {tahapCbt === 'final' && statusLolos === true && (
                  <div style={{ background: '#ecfdf5', border: '1.5px solid #86efac', padding: '16px 20px', borderRadius: '12px', marginBottom: '20px', color: '#065f46' }}>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: '4px' }}>
                      🎉 Selamat! Anda Lolos sebagai Finalis {user.lomba}
                    </div>
                    <div style={{ fontSize: '0.9rem' }}>
                      Silakan kerjakan Ujian CBT <b>Babak Final</b> di bawah ini. Penentuan Juara 1, 2, dan 3 ditentukan murni dari nilai Babak Final ini.
                    </div>
                  </div>
                )}

                <div style={{ background: '#fef3c7', border: '1px solid #fde68a', padding: '20px', borderRadius: '12px', marginBottom: '32px' }}>
                  <h3 style={{ margin: '0 0 12px 0', color: '#b45309', fontSize: '1.1rem' }}><i className="fas fa-info-circle"></i> Tata Tertib Ujian ({labelTahap})</h3>
                  <ul style={{ margin: 0, paddingLeft: '20px', color: '#92400e', lineHeight: '1.6' }}>
                    <li>Waktu ujian adalah <strong>90 menit</strong>.</li>
                    <li>Pilih jawaban yang paling tepat. Jawaban otomatis tersimpan.</li>
                    <li>Jangan menutup jendela *browser* sebelum mengklik tombol <strong>Selesai</strong> di akhir ujian.</li>
                    <li>Jika terjadi gangguan koneksi, Anda bisa masuk kembali ke sistem dan melanjutkan ujian dari soal terakhir.</li>
                    <li><strong>Sistem Anti-Curang Aktif:</strong> Segala bentuk pelanggaran (berpindah tab, meminimalkan layar, keluar dari layar penuh, atau copy-paste) akan direkam oleh sistem. <strong>3x Pelanggaran = Ujian dikumpulkan otomatis.</strong></li>
                  </ul>
                </div>

                <button 
                  onClick={handleMulaiUjian}
                  style={{ width: '100%', padding: '16px', borderRadius: '12px', background: canStart ? '#10b981' : '#94a3b8', color: 'white', border: 'none', fontWeight: 700, fontSize: '1.2rem', cursor: canStart ? 'pointer' : 'not-allowed', boxShadow: canStart ? '0 4px 14px rgba(16, 185, 129, 0.4)' : 'none' }}
                >
                  <i className={`fas ${canStart ? 'fa-play' : 'fa-lock'}`} style={{ marginRight: '8px' }}></i> {!canStart ? 'Ujian Belum Dibuka' : (sesi ? `Lanjutkan Ujian ${labelTahap}` : `Mulai Ujian ${labelTahap}`)}
                </button>
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
