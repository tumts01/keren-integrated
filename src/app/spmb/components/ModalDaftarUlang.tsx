'use client';
import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { compressDocumentImage } from '@/lib/image-compression';

interface ModalDaftarUlangProps {
  isOpen: boolean;
  onClose: () => void;
  student: any;
  onSuccess: (updated: any) => void;
  onOpenViewer?: (url: string, title: string) => void;
}

export default function ModalDaftarUlang({
  isOpen,
  onClose,
  student,
  onSuccess,
  onOpenViewer
}: ModalDaftarUlangProps) {
  const [biayaStandar, setBiayaStandar] = useState<number>(4500000);
  const [potongan, setPotongan] = useState<number>(0);
  const [nominalDibayar, setNominalDibayar] = useState<number>(0);
  const [metodeBayar, setMetodeBayar] = useState<string>('transfer');
  const [tglBayar, setTglBayar] = useState<string>('');
  const [catatan, setCatatan] = useState<string>('');
  const [buktiUrl, setBuktiUrl] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [uploadingBukti, setUploadingBukti] = useState(false);

  useEffect(() => {
    if (student) {
      const bs = student.biayaDaftarUlang !== undefined && student.biayaDaftarUlang !== '' 
        ? Number(student.biayaDaftarUlang) 
        : 4500000;
      const pot = Number(student.potonganDaftarUlang || 0);
      const dibayar = Number(student.nominalDibayarDaftarUlang || 0);
      const metode = student.metodeBayarDaftarUlang || 'transfer';
      const tgl = student.tglBayarDaftarUlang 
        ? (student.tglBayarDaftarUlang.includes('T') ? student.tglBayarDaftarUlang.split('T')[0] : student.tglBayarDaftarUlang)
        : new Date().toISOString().split('T')[0];
      const cat = student.catatanDaftarUlang || '';
      const bkt = student.buktiDaftarUlang || '';

      setBiayaStandar(bs);
      setPotongan(pot);
      setNominalDibayar(dibayar);
      setMetodeBayar(metode);
      setTglBayar(tgl);
      setCatatan(cat);
      setBuktiUrl(bkt);
    }
  }, [student, isOpen]);

  if (!isOpen || !student) return null;

  // Perhitungan Keuangan Real-Time
  const totalTagihan = Math.max(0, biayaStandar - potongan);
  const sisaTagihan = Math.max(0, totalTagihan - nominalDibayar);

  // Status otomatis berdasarkan nominal yang divalidasi
  let calculatedStatus = 'belum_bayar';
  if (nominalDibayar >= totalTagihan && totalTagihan > 0) {
    calculatedStatus = 'lunas';
  } else if (nominalDibayar > 0) {
    calculatedStatus = 'cicilan';
  } else if (buktiUrl) {
    calculatedStatus = 'menunggu_verifikasi';
  }

  const formatRupiah = (val: number) => {
    return (val || 0).toLocaleString('id-ID');
  };

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = (file.name || '').toLowerCase();
    const fileType = (file.type || '').toLowerCase();
    const isVideo = fileType.startsWith('video/') || /\.(mp4|mov|avi|mkv|webm|3gp|wmv|flv|m4v|mpg|mpeg)$/i.test(fileName);
    if (isVideo) {
      Swal.fire({
        icon: 'error',
        title: 'Berkas Video Ditolak!',
        text: 'Bukti transfer tidak boleh berupa video. Silakan upload foto bukti transfer (JPG/PNG) atau file PDF.',
        confirmButtonColor: '#ef4444'
      });
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      Swal.fire('File Terlalu Besar', 'Maksimal ukuran file adalah 15MB.', 'warning');
      return;
    }

    try {
      setUploadingBukti(true);

      let uploadFile = file;
      if (file.type.startsWith('image/')) {
        try {
          const compResult = await compressDocumentImage(file, {
            maxDimension: 2200,
            initialQuality: 0.85,
            maxFileSizeBytes: 2.5 * 1024 * 1024,
          });
          uploadFile = compResult.file;
        } catch (e) {
          console.warn('Compress fallback to original:', e);
        }
      }

      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('type', 'bukti_daftar_ulang');

      const res = await fetch('/api/spmb/upload', {
        method: 'POST',
        body: formData
      });

      const resJson = await res.json();
      if (resJson.success && resJson.link) {
        setBuktiUrl(resJson.link);
        Swal.fire({
          icon: 'success',
          title: 'Bukti Berhasil Diunggah',
          text: 'File bukti transfer telah disimpan ke Google Drive.',
          timer: 1800,
          showConfirmButton: false
        });
      } else {
        Swal.fire('Gagal Mengunggah', resJson.error || 'Terjadi kesalahan saat upload.', 'error');
      }
    } catch (err: any) {
      Swal.fire('Error', 'Gagal menghubungi server untuk upload berkas.', 'error');
    } finally {
      setUploadingBukti(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = {
        biayaDaftarUlang: biayaStandar,
        potonganDaftarUlang: potongan,
        nominalDibayarDaftarUlang: nominalDibayar,
        statusDaftarUlang: calculatedStatus,
        metodeBayarDaftarUlang: metodeBayar,
        tglBayarDaftarUlang: tglBayar,
        catatanDaftarUlang: catatan,
        buktiDaftarUlang: buktiUrl
      };

      const res = await fetch(`/api/spmb/${student.rowNumber}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const resJson = await res.json();
      if (resJson.success) {
        Swal.fire({
          icon: 'success',
          title: 'Validasi Berhasil Disimpan',
          html: `
            Status: <b>${calculatedStatus === 'lunas' ? 'LUNAS' : calculatedStatus === 'cicilan' ? `CICILAN (Kurang Rp ${formatRupiah(sisaTagihan)})` : 'BELUM BAYAR'}</b><br/>
            Nominal Tervalidasi: <b>Rp ${formatRupiah(nominalDibayar)}</b>
          `,
          timer: 2200,
          showConfirmButton: false
        });
        onSuccess({
          ...student,
          ...payload
        });
        onClose();
      } else {
        Swal.fire('Gagal Menyimpan', resJson.error || 'Terjadi kesalahan pada server', 'error');
      }
    } catch (err: any) {
      Swal.fire('Error', 'Gagal memperbarui data pendaftar: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSendWaNotification = () => {
    const rawPhone = student.nomorWaAyah || student.nomorWaIbu;
    if (!rawPhone) {
      Swal.fire('Nomor Tidak Ditemukan', 'Calon santri ini tidak mencantumkan nomor WA ayah maupun ibu.', 'info');
      return;
    }

    const cleanPhone = rawPhone.replace(/\D/g, '').replace(/^0/, '62');
    const statusMsg = calculatedStatus === 'lunas'
      ? `Telah LUNAS sepenuhnya (Rp ${formatRupiah(nominalDibayar)}).`
      : `Telah tercatat TITIPAN / CICILAN sebesar Rp ${formatRupiah(nominalDibayar)} (Sisa tagihan: Rp ${formatRupiah(sisaTagihan)}).`;

    const text = encodeURIComponent(
      `Assalamu'alaikum Warahmatullahi Wabarakatuh.\n\n` +
      `Kepada Yth. Orang Tua / Wali dari ananda:\n` +
      `*Nama:* ${student.namaLengkap}\n` +
      `*No. Pendaftaran:* ${student.nomorPendaftaran}\n` +
      `*Jalur:* ${student.jalurPendaftaran}\n\n` +
      `Kami informasikan bahwa pembayaran Daftar Ulang administrasi santri baru MTs Almaarif 01 Singosari:\n` +
      `*Status:* ${statusMsg}\n` +
      (catatan ? `*Catatan Panitia:* ${catatan}\n` : '') +
      `\nTerima kasih atas kepercayaan Bapak/Ibu kepada MTs Almaarif 01 Singosari.\n\n` +
      `Wassalamu'alaikum Wr. Wb.\n` +
      `_Panitia SPMB MTs Almaarif 01 Singosari_`
    );

    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '680px',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden'
      }}>
        {/* Header Modal */}
        <div style={{
          padding: '18px 24px',
          background: 'linear-gradient(135deg, #064e3b 0%, #047857 100%)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px'
            }}>
              <i className="fas fa-cash-register"></i>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>
                Validasi &amp; Kelola Daftar Ulang
              </h3>
              <p style={{ margin: 0, fontSize: '12px', opacity: 0.9 }}>
                Kelola nominal pembayaran, potongan, dan status daftar ulang santri
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              color: 'white',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px'
            }}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Body Modal */}
        <div style={{
          padding: '20px 24px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          {/* Card Ringkasan Siswa */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                {student.namaLengkap}
              </div>
              <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px' }}>
                No. Reg: <b style={{ color: '#047857' }}>{student.nomorPendaftaran}</b> &bull; Jalur: <b>{student.jalurPendaftaran || 'Reguler'}</b>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                background: student.statusKelulusan === 'diterima' ? '#dcfce7' : '#f1f5f9',
                color: student.statusKelulusan === 'diterima' ? '#15803d' : '#64748b',
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '11.5px',
                fontWeight: 700,
                border: `1px solid ${student.statusKelulusan === 'diterima' ? '#86efac' : '#cbd5e1'}`
              }}>
                Kelulusan: {student.statusKelulusan === 'diterima' ? 'Diterima' : student.statusKelulusan || 'Proses'}
              </span>
            </div>
          </div>

          {/* Form Biaya & Potongan */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Biaya Standar Daftar Ulang (Rp)
              </label>
              <input
                type="number"
                min="0"
                step="50000"
                value={biayaStandar}
                onChange={e => setBiayaStandar(Math.max(0, Number(e.target.value) || 0))}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '14px',
                  fontWeight: 600,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
                Standar: Rp 4.500.000
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Potongan Biaya / Beasiswa (Opsional)
              </label>
              <input
                type="number"
                min="0"
                step="50000"
                placeholder="0"
                value={potongan}
                onChange={e => setPotongan(Math.max(0, Number(e.target.value) || 0))}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: potongan > 0 ? '#15803d' : '#0f172a',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <div style={{ fontSize: '11px', color: potongan > 0 ? '#15803d' : '#64748b', marginTop: '3px' }}>
                {potongan > 0 ? `Diskon Rp ${formatRupiah(potongan)} diberikan` : 'Isi nominal jika mendapat beasiswa / dispensasi'}
              </div>
            </div>
          </div>

          {/* Banner Total Tagihan Bersih */}
          <div style={{
            background: '#ecfdf5',
            border: '1.5px solid #a7f3d0',
            borderRadius: '12px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <div>
              <div style={{ fontSize: '12px', color: '#065f46', fontWeight: 600 }}>
                Total Kewajiban Tagihan (Setelah Potongan):
              </div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: '#047857' }}>
                Rp {formatRupiah(totalTagihan)}
              </div>
            </div>
            {potongan > 0 && (
              <span style={{ background: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
                Hemat Rp {formatRupiah(potongan)}
              </span>
            )}
          </div>

          {/* Input Nominal yang Telah Divalidasi / Dibayar */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
              <label style={{ fontSize: '12.5px', fontWeight: 800, color: '#0f172a' }}>
                Nominal yang Divalidasi / Dibayar (Rp) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              {/* Quick Fill Buttons */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setNominalDibayar(totalTagihan)}
                  style={{
                    background: '#dcfce7',
                    border: '1px solid #86efac',
                    color: '#15803d',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  ⚡ Set Lunas ({formatRupiah(totalTagihan)})
                </button>
                <button
                  type="button"
                  onClick={() => setNominalDibayar(500000)}
                  style={{
                    background: '#fef3c7',
                    border: '1px solid #fde68a',
                    color: '#b45309',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Titip 500 Rb
                </button>
                <button
                  type="button"
                  onClick={() => setNominalDibayar(1000000)}
                  style={{
                    background: '#fef3c7',
                    border: '1px solid #fde68a',
                    color: '#b45309',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Titip 1 Jt
                </button>
                <button
                  type="button"
                  onClick={() => setNominalDibayar(1500000)}
                  style={{
                    background: '#fef3c7',
                    border: '1px solid #fde68a',
                    color: '#b45309',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Cicilan 1,5 Jt
                </button>
                <button
                  type="button"
                  onClick={() => setNominalDibayar(2000000)}
                  style={{
                    background: '#fef3c7',
                    border: '1px solid #fde68a',
                    color: '#b45309',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Cicilan 2 Jt
                </button>
                <button
                  type="button"
                  onClick={() => setNominalDibayar(0)}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    color: '#64748b',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Reset (0)
                </button>
              </div>
            </div>

            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '14px',
                fontWeight: 700,
                color: '#64748b'
              }}>
                Rp
              </span>
              <input
                type="number"
                min="0"
                step="50000"
                value={nominalDibayar}
                onChange={e => setNominalDibayar(Math.max(0, Number(e.target.value) || 0))}
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 38px',
                  borderRadius: '10px',
                  border: '2px solid #047857',
                  fontSize: '16px',
                  fontWeight: 800,
                  color: '#047857',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Live Calculation Badge / Summary */}
            <div style={{
              marginTop: '10px',
              padding: '10px 14px',
              borderRadius: '8px',
              background: calculatedStatus === 'lunas' ? '#f0fdf4' : calculatedStatus === 'cicilan' ? '#fffbeb' : '#f8fafc',
              border: `1.5px solid ${calculatedStatus === 'lunas' ? '#86efac' : calculatedStatus === 'cicilan' ? '#fde68a' : '#cbd5e1'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: '#475569', fontWeight: 600 }}>Status Otomatis:</span>
                {calculatedStatus === 'lunas' && (
                  <span style={{ background: '#16a34a', color: 'white', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800 }}>
                    ✅ LUNAS
                  </span>
                )}
                {calculatedStatus === 'cicilan' && (
                  <span style={{ background: '#d97706', color: 'white', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800 }}>
                    ⏳ CICILAN / TITIPAN
                  </span>
                )}
                {calculatedStatus === 'menunggu_verifikasi' && (
                  <span style={{ background: '#0284c7', color: 'white', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800 }}>
                    📄 Menunggu Verifikasi
                  </span>
                )}
                {calculatedStatus === 'belum_bayar' && (
                  <span style={{ background: '#64748b', color: 'white', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800 }}>
                    Belum Bayar
                  </span>
                )}
              </div>

              <div style={{ fontSize: '12.5px', fontWeight: 700 }}>
                {calculatedStatus === 'lunas' ? (
                  <span style={{ color: '#15803d' }}>Semua tagihan telah terlunasi!</span>
                ) : calculatedStatus === 'cicilan' ? (
                  <span style={{ color: '#b91c1c' }}>Kurang: Rp {formatRupiah(sisaTagihan)}</span>
                ) : (
                  <span style={{ color: '#64748b' }}>Sisa: Rp {formatRupiah(totalTagihan)}</span>
                )}
              </div>
            </div>
          </div>

          {/* Metode & Tanggal Pembayaran */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Metode Pembayaran
              </label>
              <select
                value={metodeBayar}
                onChange={e => setMetodeBayar(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  outline: 'none',
                  boxSizing: 'border-box',
                  background: 'white'
                }}
              >
                <option value="transfer">💳 Transfer Bank BCA (3680380359)</option>
                <option value="tunai">💵 Tunai / Langsung di Madrasah</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Tanggal Pembayaran / Validasi
              </label>
              <input
                type="date"
                value={tglBayar}
                onChange={e => setTglBayar(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Catatan Panitia */}
          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              Catatan Panitia / Administrasi (Opsional)
            </label>
            <input
              type="text"
              placeholder="Contoh: Cicilan ke-1 tunai via Bu Ida, sisa pelunasan sebelum awal semester"
              value={catatan}
              onChange={e => setCatatan(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1.5px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Bukti Transfer / File */}
          <div style={{
            background: '#f8fafc',
            border: '1px dashed #cbd5e1',
            borderRadius: '10px',
            padding: '12px 16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#1e293b' }}>
                  <i className="fas fa-file-invoice" style={{ color: '#047857', marginRight: '6px' }}></i>
                  Bukti Pembayaran / Transfer
                </div>
                <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                  {buktiUrl ? 'Pendaftar telah mengunggah bukti pembayaran.' : 'Belum ada bukti pembayaran terunggah.'}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {buktiUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenViewer) {
                        onOpenViewer(buktiUrl, `Bukti Transfer - ${student.namaLengkap}`);
                      } else {
                        window.open(buktiUrl, '_blank');
                      }
                    }}
                    style={{
                      background: '#047857',
                      color: 'white',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <i className="fas fa-eye"></i> Lihat Bukti
                  </button>
                )}

                <label style={{
                  background: uploadingBukti ? '#94a3b8' : '#e2e8f0',
                  color: '#334155',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: uploadingBukti ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}>
                  <i className={`fas ${uploadingBukti ? 'fa-spinner fa-spin' : 'fa-upload'}`}></i>
                  <span>{uploadingBukti ? 'Mengunggah...' : buktiUrl ? 'Ganti Bukti' : 'Unggah Bukti'}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/jpg,application/pdf,.pdf"
                    disabled={uploadingBukti}
                    onChange={handleUploadFile}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '16px 24px',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          {/* WhatsApp Notification Button */}
          {(student.nomorWaAyah || student.nomorWaIbu) && (
            <button
              type="button"
              onClick={handleSendWaNotification}
              style={{
                background: '#22c55e',
                color: 'white',
                border: 'none',
                padding: '9px 14px',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
              title="Kirim pesan tanda terima pembayaran ke nomor WA wali"
            >
              <i className="fab fa-whatsapp" style={{ fontSize: '15px' }}></i>
              <span>Kirim Konfirmasi WA ke Wali</span>
            </button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              style={{
                background: 'white',
                border: '1px solid #cbd5e1',
                color: '#475569',
                padding: '9px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Batal
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={{
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                color: 'white',
                border: 'none',
                padding: '9px 20px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: saving ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 4px rgba(4, 120, 87, 0.3)'
              }}
            >
              {saving ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <i className="fas fa-save"></i>
                  <span>Simpan Validasi</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
