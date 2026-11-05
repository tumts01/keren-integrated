'use client';

import React, { useRef, useState } from 'react';
import Swal from 'sweetalert2';

interface ModalCetakStrukPos80Props {
  isOpen: boolean;
  onClose: () => void;
  student: any;
}

export default function ModalCetakStrukPos80({
  isOpen,
  onClose,
  student
}: ModalCetakStrukPos80Props) {
  const printIframeRef = useRef<HTMLIFrameElement | null>(null);
  const previewReceiptRef = useRef<HTMLDivElement | null>(null);

  // Opsi tinggi kertas (agar Chrome tidak menganggap roll tak terbatas 3276mm)
  const [selectedHeightPreset, setSelectedHeightPreset] = useState<'auto' | '160' | '185' | '220'>('auto');

  // Pilihan jumlah rangkap cetak (1, 2, atau 3 rangkap)
  const [copiesCount, setCopiesCount] = useState<number>(1);

  if (!isOpen || !student) return null;

  const biaya = student.biayaDaftarUlang !== undefined && student.biayaDaftarUlang !== '' 
    ? Number(student.biayaDaftarUlang) 
    : 4500000;
  const potongan = Number(student.potonganDaftarUlang || 0);
  const tagihan = Math.max(0, biaya - potongan);
  const dibayar = Number(student.nominalDibayarDaftarUlang || 0);
  const sisa = Math.max(0, tagihan - dibayar);

  let statusLabel = 'BELUM BAYAR';
  if (dibayar >= tagihan && tagihan > 0) statusLabel = 'LUNAS';
  else if (dibayar > 0) statusLabel = 'CICILAN / TITIPAN';
  else if (student.buktiDaftarUlang && dibayar === 0) statusLabel = 'MENUNGGU VERIFIKASI';

  const formatRupiah = (num: number) => {
    return (num || 0).toLocaleString('id-ID');
  };

  const now = new Date();
  const tglCetak = now.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  const jamCetak = now.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const noStruk = `STRUK-${student.nomorPendaftaran || 'SPMB'}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const tglBayarFormatted = student.tglBayarDaftarUlang
    ? (student.tglBayarDaftarUlang.includes('T') ? student.tglBayarDaftarUlang.split('T')[0] : student.tglBayarDaftarUlang)
    : tglCetak;

  // Riwayat angsuran/cicilan berkali-kali
  const riwayatList: any[] = Array.isArray(student.riwayatBuktiDaftarUlang) && student.riwayatBuktiDaftarUlang.length > 0
    ? student.riwayatBuktiDaftarUlang
    : (student.buktiDaftarUlang ? [{
        id: 'bkt_cur',
        ke: 1,
        url: student.buktiDaftarUlang,
        waktu: student.tglBayarDaftarUlang || tglCetak,
        keterangan: 'Pembayaran'
      }] : []);

  // Hitung tinggi proporsional kertas dalam mm (otomatis bertambah jika cicilan banyak)
  const calculateHeightMm = (): number => {
    if (selectedHeightPreset !== 'auto') {
      return Number(selectedHeightPreset);
    }
    if (previewReceiptRef.current) {
      const px = previewReceiptRef.current.offsetHeight;
      if (px > 0) {
        // Konversi 96 DPI: px -> mm + 8mm safety margin
        const mm = Math.ceil((px / 96) * 25.4) + 8;
        return Math.max(140, mm); // Otomatis bertambah panjang jika riwayat cicilan banyak!
      }
    }
    return 165;
  };

  // Label per lembar rangkap
  const getCopyLabel = (copyIndex: number, totalCopies: number) => {
    if (totalCopies === 1) return '';
    if (totalCopies === 2) {
      return copyIndex === 0 ? '--- [ LEMBAR WALI SANTRI ] ---' : '--- [ LEMBAR ARSIP MADRASAH ] ---';
    }
    if (totalCopies === 3) {
      if (copyIndex === 0) return '--- [ LEMBAR WALI SANTRI ] ---';
      if (copyIndex === 1) return '--- [ LEMBAR BENDAHARA / KASIR ] ---';
      return '--- [ LEMBAR ARSIP SPMB ] ---';
    }
    return `--- [ LEMBAR SALINAN #${copyIndex + 1} ] ---`;
  };

  const getSingleReceiptBodyHtml = (copyIndex: number, totalCopies: number) => {
    const copyBadge = getCopyLabel(copyIndex, totalCopies);

    return `
    ${copyBadge ? `
      <div style="text-align: center; font-size: 10px; font-weight: bold; margin-bottom: 4px; letter-spacing: 0.5px;">
        ${copyBadge}
      </div>
    ` : ''}

    <div class="receipt-header">
      <div class="bold" style="font-size: 13px;">MTs ALMAARIF 01 SINGOSARI</div>
      <div style="font-size: 10px;">PANITIA PENERIMAAN SANTRI BARU (SPMB)</div>
      <div style="font-size: 9px;">Jl. Masjid No. 33 Pagentan Singosari Malang</div>
      <div style="font-size: 9px;">Telp/WA: +62 852-3666-0862</div>
    </div>

    <div class="double-divider"></div>
    <div class="receipt-title">STRUK BUKTI DAFTAR ULANG (DPP)</div>
    <div class="double-divider"></div>

    <div class="row">
      <div class="row-title">No. Struk</div>
      <div class="row-value bold">${noStruk}</div>
    </div>
    <div class="row">
      <div class="row-title">Waktu Cetak</div>
      <div class="row-value">${tglCetak} ${jamCetak}</div>
    </div>
    <div class="row">
      <div class="row-title">Petugas</div>
      <div class="row-value">Bendahara SPMB</div>
    </div>

    <div class="divider"></div>
    <div class="bold" style="margin-bottom: 2px;">DATA CALON SISWA:</div>
    <div class="student-name-center">
      ${(student.namaLengkap || '-').toUpperCase()}
    </div>
    <div class="row">
      <div class="row-title">No. Reg</div>
      <div class="row-value bold">${student.nomorPendaftaran || '-'}</div>
    </div>
    <div class="row">
      <div class="row-title">Jalur</div>
      <div class="row-value">${student.jalurPendaftaran || '-'}</div>
    </div>
    <div class="row">
      <div class="row-title">NISN</div>
      <div class="row-value">${student.nisn || '-'}</div>
    </div>
    <div class="row">
      <div class="row-title">Asal Sekolah</div>
      <div class="row-value">${student.asalSekolah || '-'}</div>
    </div>

    <div class="divider"></div>
    <div class="bold" style="margin-bottom: 2px;">RINCIAN BIAYA &amp; PEMBAYARAN:</div>
    <div class="row">
      <div class="row-title">Biaya Standar DPP</div>
      <div class="row-value">Rp ${formatRupiah(biaya)}</div>
    </div>
    ${potongan > 0 ? `
    <div class="row" style="color: #000;">
      <div class="row-title">Potongan / Keringanan</div>
      <div class="row-value">-Rp ${formatRupiah(potongan)}</div>
    </div>
    ${student.keteranganPotongan ? `
    <div style="font-size: 9px; font-style: italic; margin-bottom: 2px;">
      Ket: ${student.keteranganPotongan}
    </div>` : ''}
    ` : ''}
    <div class="row bold">
      <div class="row-title">Total Tagihan DPP</div>
      <div class="row-value">Rp ${formatRupiah(tagihan)}</div>
    </div>

    <div class="divider"></div>
    <div class="row bold" style="font-size: 11px;">
      <div class="row-title">TOTAL DIBAYAR</div>
      <div class="row-value">Rp ${formatRupiah(dibayar)}</div>
    </div>
    <div class="row bold">
      <div class="row-title">SISA TAGIHAN</div>
      <div class="row-value">Rp ${formatRupiah(sisa)}</div>
    </div>

    <div class="divider"></div>
    <div class="text-center">
      <div class="badge-status">${statusLabel}</div>
    </div>

    <div class="row">
      <div class="row-title">Metode Bayar</div>
      <div class="row-value" style="text-transform: uppercase;">${student.metodeBayarDaftarUlang || 'Transfer BCA'}</div>
    </div>
    <div class="row">
      <div class="row-title">Tgl Bayar</div>
      <div class="row-value">${tglBayarFormatted}</div>
    </div>
    ${student.catatanDaftarUlang ? `
    <div class="row">
      <div class="row-title">Catatan</div>
      <div class="row-value">${student.catatanDaftarUlang}</div>
    </div>` : ''}

    ${riwayatList.length > 1 ? `
    <div class="divider"></div>
    <div class="bold" style="margin-bottom: 2px; font-size: 10px;">RIWAYAT PEMBAYARAN (${riwayatList.length}x ANGSURAN):</div>
    ${riwayatList.map((r, idx) => `
      <div class="row" style="font-size: 9.5px;">
        <div class="row-title">#${r.ke || idx + 1} ${r.keterangan || 'Angsuran'} (${r.waktu ? (r.waktu.includes('T') ? r.waktu.split('T')[0] : r.waktu) : '-'})</div>
        <div class="row-value bold">${r.nominal ? 'Rp ' + formatRupiah(Number(r.nominal)) : 'Tervalidasi'}</div>
      </div>
    `).join('')}
    ` : ''}

    <div class="double-divider"></div>
    <div style="font-size: 9px; text-align: center; margin: 3px 0;">
      * Simpan struk ini sebagai bukti pembayaran sah *<br/>
      Terima kasih telah mendaftar di MTs Almaarif 01 Singosari
    </div>

    <div class="footer-sign">
      <div>Singosari, ${tglCetak}</div>
      <div style="margin-top: 2px;">Bendahara SPMB,</div>
      <div style="height: 30px;"></div>
      <div class="bold">( S. Nur Ainy, S.Pd. )</div>
    </div>
    `;
  };

  const getFullReceiptDocumentHtml = (pageHeightMm: number, totalCopies: number) => {
    // Generate separate page for each copy with page-break-after to trigger printer auto-cut
    let pagesHtml = '';
    for (let i = 0; i < totalCopies; i++) {
      pagesHtml += `
      <div class="receipt-page">
        ${getSingleReceiptBodyHtml(i, totalCopies)}
      </div>
      `;
    }

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Struk Bukti Pembayaran SPMB - ${student.namaLengkap || ''}</title>
  <style>
    @page {
      size: 80mm ${pageHeightMm}mm;
      margin: 0mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      width: 80mm;
      margin: 0 auto;
      padding: 0;
      background: #fff;
    }
    .receipt-page {
      width: 80mm;
      min-height: ${pageHeightMm}mm;
      height: ${pageHeightMm}mm;
      page-break-after: always;
      break-after: page;
      padding: 3mm 4mm 5mm 4mm;
      box-sizing: border-box;
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      line-height: 1.32;
      color: #000;
      overflow: hidden;
    }
    .receipt-page:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .bold { font-weight: bold; }
    .divider {
      border-top: 1px dashed #000;
      margin: 4px 0;
    }
    .double-divider {
      border-top: 2px solid #000;
      margin: 4px 0;
    }
    .row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 2px;
    }
    .row-title {
      flex: 1;
      padding-right: 4px;
    }
    .row-value {
      text-align: right;
      white-space: nowrap;
    }
    .receipt-header {
      text-align: center;
      margin-bottom: 4px;
    }
    .receipt-title {
      font-size: 12px;
      font-weight: bold;
      text-align: center;
      margin: 3px 0;
      letter-spacing: 0.5px;
    }
    .student-name-center {
      text-align: center;
      font-size: 13.5px;
      font-weight: 900;
      text-transform: uppercase;
      margin: 4px 0 5px 0;
      line-height: 1.25;
      letter-spacing: 0.3px;
    }
    .badge-status {
      display: inline-block;
      padding: 2px 6px;
      font-weight: bold;
      border: 1px solid #000;
      margin: 3px 0;
      font-size: 10.5px;
    }
    .footer-sign {
      margin-top: 8px;
      text-align: right;
    }
    @media print {
      .receipt-page {
        width: 100%;
        margin: 0;
      }
    }
  </style>
</head>
<body>
  ${pagesHtml}
</body>
</html>`;
  };

  const handlePrint = () => {
    const iframe = printIframeRef.current;
    if (!iframe) return;

    const heightMm = calculateHeightMm();

    iframe.style.width = '80mm';
    iframe.style.height = `${heightMm * copiesCount}mm`;

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) return;

    iframeDoc.open();
    iframeDoc.write(getFullReceiptDocumentHtml(heightMm, copiesCount));
    iframeDoc.close();

    // Tunggu render sebelum print
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 280);
  };

  const handleCopyText = () => {
    let plainText = `
========================================
       MTs ALMAARIF 01 SINGOSARI
 PANITIA PENERIMAAN SANTRI BARU (SPMB)
Jl. Masjid No. 33 Pagentan Singosari Malang
========================================
STRUK BUKTI DAFTAR ULANG (DPP)
----------------------------------------
No. Struk    : ${noStruk}
Waktu Cetak  : ${tglCetak} ${jamCetak}
Petugas      : Bendahara SPMB
----------------------------------------
DATA CALON SISWA:
=== ${(student.namaLengkap || '-').toUpperCase()} ===
No. Reg      : ${student.nomorPendaftaran || '-'}
Jalur        : ${student.jalurPendaftaran || '-'}
NISN         : ${student.nisn || '-'}
Asal Sekolah : ${student.asalSekolah || '-'}
----------------------------------------
RINCIAN BIAYA & PEMBAYARAN:
Biaya DPP    : Rp ${formatRupiah(biaya)}
${potongan > 0 ? `Potongan     : -Rp ${formatRupiah(potongan)} (${student.keteranganPotongan || 'Keringanan'})\n` : ''}Total Tagihan: Rp ${formatRupiah(tagihan)}
TOTAL BAYAR  : Rp ${formatRupiah(dibayar)}
SISA TAGIHAN : Rp ${formatRupiah(sisa)}
STATUS       : [ ${statusLabel} ]
Metode       : ${(student.metodeBayarDaftarUlang || 'Transfer BCA').toUpperCase()}
Tgl Bayar    : ${tglBayarFormatted}
${student.catatanDaftarUlang ? `Catatan      : ${student.catatanDaftarUlang}\n` : ''}`;

    if (riwayatList.length > 1) {
      plainText += `----------------------------------------\nRIWAYAT PEMBAYARAN (${riwayatList.length}x):\n`;
      riwayatList.forEach((r, idx) => {
        plainText += `- #${r.ke || idx + 1} ${r.keterangan || 'Angsuran'}: ${r.nominal ? 'Rp ' + formatRupiah(Number(r.nominal)) : 'Tervalidasi'} (${r.waktu ? (r.waktu.includes('T') ? r.waktu.split('T')[0] : r.waktu) : '-'})\n`;
      });
    }

    plainText += `----------------------------------------
* Simpan struk ini sebagai bukti resmi *
Bendahara SPMB: S. Nur Ainy, S.Pd. (+62 852-3666-0862)
========================================`;

    navigator.clipboard.writeText(plainText.trim()).then(() => {
      Swal.fire({
        icon: 'success',
        title: 'Teks Struk Disalin',
        text: 'Format teks struk berhasil disalin ke clipboard.',
        timer: 1500,
        showConfirmButton: false
      });
    });
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '16px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '520px',
        maxHeight: '94vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden'
      }}>
        {/* Header Modal */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: '#ecfdf5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '17px'
            }}>
              <i className="fas fa-print"></i>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                Cetak Struk POS 80mm
              </h3>
              <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
                Format thermal roll 80mm &bull; Auto-Cut per rangkap
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '20px',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            &times;
          </button>
        </div>

        {/* Panel Pengaturan Cetak: Jumlah Rangkap & Tinggi Kertas */}
        <div style={{
          background: '#f8fafc',
          padding: '12px 18px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          {/* Pilihan Jumlah Rangkap (Auto-Cut Per Lembar) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>
              <i className="fas fa-copy" style={{ marginRight: '6px', color: '#2563eb' }}></i>
              Jumlah Rangkap:
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                onClick={() => setCopiesCount(1)}
                style={{
                  background: copiesCount === 1 ? '#2563eb' : '#ffffff',
                  color: copiesCount === 1 ? '#ffffff' : '#334155',
                  border: `1px solid ${copiesCount === 1 ? '#2563eb' : '#cbd5e1'}`,
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                1 Lembar
              </button>
              <button
                type="button"
                onClick={() => setCopiesCount(2)}
                style={{
                  background: copiesCount === 2 ? '#2563eb' : '#ffffff',
                  color: copiesCount === 2 ? '#ffffff' : '#334155',
                  border: `1px solid ${copiesCount === 2 ? '#2563eb' : '#cbd5e1'}`,
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                2 Rangkap (Wali + Arsip)
              </button>
              <button
                type="button"
                onClick={() => setCopiesCount(3)}
                style={{
                  background: copiesCount === 3 ? '#2563eb' : '#ffffff',
                  color: copiesCount === 3 ? '#ffffff' : '#334155',
                  border: `1px solid ${copiesCount === 3 ? '#2563eb' : '#cbd5e1'}`,
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                3 Rangkap (Wali + Kasir + Arsip)
              </button>
            </div>
          </div>

          {/* Pilihan Tinggi Kertas */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#475569' }}>
              <i className="fas fa-ruler-vertical" style={{ marginRight: '6px', color: '#059669' }}></i>
              Panjang Struk:
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                onClick={() => setSelectedHeightPreset('auto')}
                style={{
                  background: selectedHeightPreset === 'auto' ? '#059669' : '#ffffff',
                  color: selectedHeightPreset === 'auto' ? '#ffffff' : '#475569',
                  border: `1px solid ${selectedHeightPreset === 'auto' ? '#059669' : '#cbd5e1'}`,
                  padding: '3px 8px',
                  borderRadius: '5px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Otomatis Sesuai Konten
              </button>
              <button
                type="button"
                onClick={() => setSelectedHeightPreset('160')}
                style={{
                  background: selectedHeightPreset === '160' ? '#059669' : '#ffffff',
                  color: selectedHeightPreset === '160' ? '#ffffff' : '#475569',
                  border: `1px solid ${selectedHeightPreset === '160' ? '#059669' : '#cbd5e1'}`,
                  padding: '3px 8px',
                  borderRadius: '5px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                16 cm
              </button>
              <button
                type="button"
                onClick={() => setSelectedHeightPreset('185')}
                style={{
                  background: selectedHeightPreset === '185' ? '#059669' : '#ffffff',
                  color: selectedHeightPreset === '185' ? '#ffffff' : '#475569',
                  border: `1px solid ${selectedHeightPreset === '185' ? '#059669' : '#cbd5e1'}`,
                  padding: '3px 8px',
                  borderRadius: '5px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                18.5 cm
              </button>
              <button
                type="button"
                onClick={() => setSelectedHeightPreset('220')}
                style={{
                  background: selectedHeightPreset === '220' ? '#059669' : '#ffffff',
                  color: selectedHeightPreset === '220' ? '#ffffff' : '#475569',
                  border: `1px solid ${selectedHeightPreset === '220' ? '#059669' : '#cbd5e1'}`,
                  padding: '3px 8px',
                  borderRadius: '5px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                22 cm
              </button>
            </div>
          </div>
        </div>

        {/* Content / Preview Kertas Struk Thermal */}
        <div style={{
          padding: '16px',
          overflowY: 'auto',
          background: '#f1f5f9',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px'
        }}>
          {/* Petunjuk Auto-Cut & Margin Chrome */}
          <div style={{
            width: '330px',
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: '6px',
            padding: '8px 10px',
            fontSize: '10.5px',
            color: '#065f46',
            lineHeight: 1.45
          }}>
            <div style={{ fontWeight: 700, marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <i className="fas fa-cut" style={{ color: '#059669' }}></i>
              Tips Cetak Banyak Rangkap &amp; Auto-Cut:
            </div>
            <div>
              &bull; Pilih jumlah rangkap di atas (misal: <b>{copiesCount} Rangkap</b>). Di dialog Chrome cukup biarkan <b>Copies: 1</b>.<br/>
              &bull; Di dialog Chrome (<i>More settings</i>), atur <b>Margins: &quot;None&quot;</b>.
            </div>
          </div>

          {/* Kertas Struk Virtual POS 80 */}
          <div
            ref={previewReceiptRef}
            style={{
              background: '#ffffff',
              width: '330px',
              padding: '16px 14px',
              boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
              border: '1px solid #e2e8f0',
              borderRadius: '4px',
              fontFamily: "'Courier New', Courier, monospace",
              fontSize: '11px',
              lineHeight: 1.35,
              color: '#111827'
            }}
          >
            {copiesCount > 1 && (
              <div style={{
                textAlign: 'center',
                fontSize: '10px',
                fontWeight: 700,
                color: '#2563eb',
                marginBottom: '6px',
                background: '#eff6ff',
                padding: '2px 6px',
                borderRadius: '4px',
                border: '1px dashed #bfdbfe'
              }}>
                [ PRATINJAU: DIBUAT {copiesCount} RANGKAP TERPISAH ]
              </div>
            )}

            <div style={{ textAlign: 'center', marginBottom: '6px' }}>
              <div style={{ fontWeight: 800, fontSize: '12.5px' }}>MTs ALMAARIF 01 SINGOSARI</div>
              <div style={{ fontSize: '10px' }}>PANITIA SPMB TAHUN 2026</div>
              <div style={{ fontSize: '9px', color: '#64748b' }}>Jl. Masjid No. 33 Pagentan Singosari Malang</div>
              <div style={{ fontSize: '9px', color: '#64748b' }}>WA: +62 852-3666-0862</div>
            </div>

            <div style={{ borderTop: '2px solid #000', margin: '5px 0' }}></div>
            <div style={{ textAlign: 'center', fontWeight: 800, fontSize: '11.5px', letterSpacing: '0.5px' }}>
              STRUK BUKTI DAFTAR ULANG
            </div>
            <div style={{ borderTop: '2px solid #000', margin: '5px 0' }}></div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span>No. Struk</span>
              <span style={{ fontWeight: 700 }}>{noStruk}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span>Waktu</span>
              <span>{tglCetak} {jamCetak}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span>Petugas</span>
              <span>Bendahara SPMB</span>
            </div>

            <div style={{ borderTop: '1px dashed #94a3b8', margin: '5px 0' }}></div>
            <div style={{ fontWeight: 700, marginBottom: '2px' }}>DATA CALON SISWA:</div>
            <div style={{
              textAlign: 'center',
              margin: '4px 0 6px 0',
              padding: '2px 0'
            }}>
              <div style={{
                fontSize: '13.5px',
                fontWeight: 900,
                textTransform: 'uppercase',
                lineHeight: 1.25,
                letterSpacing: '0.3px',
                color: '#0f172a'
              }}>
                {student.namaLengkap || '-'}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span>No. Reg</span>
              <span style={{ fontWeight: 700 }}>{student.nomorPendaftaran || '-'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span>Jalur</span>
              <span>{student.jalurPendaftaran || '-'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span>NISN</span>
              <span>{student.nisn || '-'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span>Asal SD/MI</span>
              <span style={{ maxWidth: '170px', textAlign: 'right', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {student.asalSekolah || '-'}
              </span>
            </div>

            <div style={{ borderTop: '1px dashed #94a3b8', margin: '5px 0' }}></div>
            <div style={{ fontWeight: 700, marginBottom: '2px' }}>RINCIAN PEMBAYARAN:</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span>Biaya Standar DPP</span>
              <span>Rp {formatRupiah(biaya)}</span>
            </div>
            {potongan > 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span>Potongan/Diskon</span>
                  <span style={{ color: '#047857', fontWeight: 700 }}>-Rp {formatRupiah(potongan)}</span>
                </div>
                {student.keteranganPotongan && (
                  <div style={{ fontSize: '9px', fontStyle: 'italic', color: '#047857', marginBottom: '2px' }}>
                    Ket: {student.keteranganPotongan}
                  </div>
                )}
              </>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginBottom: '2px' }}>
              <span>Total Tagihan DPP</span>
              <span>Rp {formatRupiah(tagihan)}</span>
            </div>

            <div style={{ borderTop: '1px dashed #94a3b8', margin: '5px 0' }}></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '11.5px', marginBottom: '2px' }}>
              <span>TOTAL DIBAYAR</span>
              <span>Rp {formatRupiah(dibayar)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginBottom: '2px' }}>
              <span>SISA TAGIHAN</span>
              <span style={{ color: sisa > 0 ? '#b91c1c' : '#15803d' }}>
                Rp {formatRupiah(sisa)}
              </span>
            </div>

            <div style={{ textAlign: 'center', margin: '6px 0' }}>
              <span style={{
                display: 'inline-block',
                padding: '2px 8px',
                border: '1.5px solid #000',
                fontWeight: 800,
                fontSize: '11px',
                background: statusLabel === 'LUNAS' ? '#dcfce7' : statusLabel.includes('CICILAN') ? '#fef3c7' : '#f1f5f9'
              }}>
                {statusLabel}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '2px' }}>
              <span>Metode</span>
              <span style={{ textTransform: 'uppercase' }}>{student.metodeBayarDaftarUlang || 'Transfer BCA'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '2px' }}>
              <span>Tgl Bayar</span>
              <span>{tglBayarFormatted}</span>
            </div>
            {student.catatanDaftarUlang && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '2px' }}>
                <span>Catatan</span>
                <span style={{ maxWidth: '170px', textAlign: 'right' }}>{student.catatanDaftarUlang}</span>
              </div>
            )}

            {/* Riwayat Angsuran jika lebih dari 1 */}
            {riwayatList.length > 1 && (
              <div style={{ marginTop: '5px', paddingTop: '5px', borderTop: '1px dashed #94a3b8' }}>
                <div style={{ fontWeight: 700, fontSize: '10px', marginBottom: '3px' }}>
                  RIWAYAT PEMBAYARAN ({riwayatList.length}x ANGSURAN):
                </div>
                {riwayatList.map((r, idx) => (
                  <div key={r.id || idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9.5px', marginBottom: '2px' }}>
                    <span>#{r.ke || idx + 1} {r.keterangan || 'Angsuran'} ({r.waktu ? (r.waktu.includes('T') ? r.waktu.split('T')[0] : r.waktu) : '-'})</span>
                    <span style={{ fontWeight: 700 }}>{r.nominal ? 'Rp ' + formatRupiah(Number(r.nominal)) : 'Tervalidasi'}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ borderTop: '2px solid #000', margin: '6px 0 5px 0' }}></div>
            <div style={{ fontSize: '9px', textAlign: 'center', color: '#475569', marginBottom: '8px' }}>
              Simpan struk ini sebagai bukti pembayaran sah.
            </div>

            <div style={{ textAlign: 'right', fontSize: '10px' }}>
              <div>Singosari, {tglCetak}</div>
              <div style={{ marginTop: '2px' }}>Bendahara SPMB,</div>
              <div style={{ height: '30px' }}></div>
              <div style={{ fontWeight: 800 }}>( S. Nur Ainy, S.Pd. )</div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '14px 20px',
          borderTop: '1px solid #e2e8f0',
          background: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '8px'
        }}>
          <button
            onClick={handleCopyText}
            style={{
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#475569',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <i className="fas fa-copy"></i> Salin Teks
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={onClose}
              style={{
                background: '#f1f5f9',
                border: 'none',
                padding: '9px 14px',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: 600,
                color: '#64748b',
                cursor: 'pointer'
              }}
            >
              Tutup
            </button>
            <button
              onClick={handlePrint}
              style={{
                background: '#059669',
                border: 'none',
                padding: '9px 18px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                color: '#ffffff',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 6px rgba(5, 150, 105, 0.3)'
              }}
            >
              <i className="fas fa-print"></i> Cetak {copiesCount > 1 ? `${copiesCount} Rangkap` : 'Struk POS 80'}
            </button>
          </div>
        </div>
      </div>

      {/* Hidden iframe for isolated printing */}
      <iframe
        ref={printIframeRef}
        style={{
          position: 'fixed',
          right: '-1000px',
          bottom: '-1000px',
          width: '80mm',
          height: '200mm',
          border: 'none',
          visibility: 'hidden'
        }}
        title="Print POS 80 Frame"
      />
    </div>
  );
}
