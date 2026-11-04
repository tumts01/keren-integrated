'use client';

import React, { useState, useMemo, useRef } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Swal from 'sweetalert2';

interface ModalRekapPembayaranProps {
  isOpen: boolean;
  onClose: () => void;
  data: any[];
}

export default function ModalRekapPembayaran({
  isOpen,
  onClose,
  data
}: ModalRekapPembayaranProps) {
  const printIframeRef = useRef<HTMLIFrameElement | null>(null);

  // Helper date preset strings
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const startOfMonthStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  }, []);
  const sevenDaysAgoStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  }, []);
  const thirtyDaysAgoStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  }, []);

  // Filter States
  const [startDate, setStartDate] = useState<string>(startOfMonthStr);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [selectedJalur, setSelectedJalur] = useState<string>('semua');
  const [selectedMetode, setSelectedMetode] = useState<string>('semua');
  const [selectedStatus, setSelectedStatus] = useState<string>('semua'); // 'semua' | 'lunas' | 'cicilan'
  const [groupMode, setGroupMode] = useState<'per_siswa' | 'per_transaksi'>('per_siswa');

  // Preview tab: 'filter' | 'preview'
  const [activeTab, setActiveTab] = useState<'filter' | 'preview'>('filter');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Helpers
  const formatRupiah = (num: number) => {
    return (num || 0).toLocaleString('id-ID');
  };

  const formatTanggalIndo = (dateStr: string) => {
    if (!dateStr) return '-';
    const clean = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const parts = clean.split('-');
    if (parts.length === 3) {
      const y = parts[0];
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      const bulan = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      return `${d} ${bulan[m - 1] || ''} ${y}`;
    }
    return dateStr;
  };

  const getCleanDate = (val: string): string => {
    if (!val) return '';
    const s = String(val).trim();
    if (s.includes('T')) return s.split('T')[0];
    if (s.match(/^\d{4}-\d{2}-\d{2}/)) return s.substring(0, 10);
    const dmy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
    if (dmy) {
      return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
    }
    return s;
  };

  // Extract all payment transactions based on filters
  const processedPayments = useMemo(() => {
    const list: any[] = [];

    data.forEach(item => {
      const dibayar = Number(item.nominalDibayarDaftarUlang || 0);
      if (dibayar <= 0) return; // hanya yang sudah ada uang masuk

      const biaya = item.biayaDaftarUlang !== undefined && item.biayaDaftarUlang !== ''
        ? Number(item.biayaDaftarUlang)
        : 4500000;
      const potongan = Number(item.potonganDaftarUlang || 0);
      const tagihan = Math.max(0, biaya - potongan);
      const sisa = Math.max(0, tagihan - dibayar);

      let statusBayar = 'cicilan';
      if (dibayar >= tagihan && tagihan > 0) {
        statusBayar = 'lunas';
      }

      // Filter Jalur
      if (selectedJalur !== 'semua' && (item.jalurPendaftaran || '').toLowerCase() !== selectedJalur.toLowerCase()) {
        return;
      }

      // Filter Status
      if (selectedStatus !== 'semua' && statusBayar !== selectedStatus) {
        return;
      }

      // Filter Metode
      const studentMetode = (item.metodeBayarDaftarUlang || 'transfer').toLowerCase();
      if (selectedMetode !== 'semua' && studentMetode !== selectedMetode.toLowerCase()) {
        return;
      }

      const riwayat = Array.isArray(item.riwayatBuktiDaftarUlang) && item.riwayatBuktiDaftarUlang.length > 0
        ? item.riwayatBuktiDaftarUlang
        : [];

      // MODE 1: PER SISWA (Default)
      if (groupMode === 'per_siswa') {
        let tgl = getCleanDate(item.tglBayarDaftarUlang);
        if (!tgl && riwayat.length > 0) {
          tgl = getCleanDate(riwayat[riwayat.length - 1].waktu);
        }
        if (!tgl && item.timestamp) {
          tgl = getCleanDate(item.timestamp);
        }
        if (!tgl) {
          tgl = todayStr;
        }

        // Cek range tanggal
        if (startDate && tgl < startDate) return;
        if (endDate && tgl > endDate) return;

        list.push({
          id: `siswa_${item.rowNumber || item.id}`,
          rowNumber: item.rowNumber,
          nomorPendaftaran: item.nomorPendaftaran || '-',
          namaLengkap: item.namaLengkap || '-',
          jalurPendaftaran: item.jalurPendaftaran || 'Reguler',
          asalSekolah: item.asalSekolah || '-',
          tanggalBayar: tgl,
          metodeBayar: item.metodeBayarDaftarUlang || 'Transfer',
          nominalMasuk: dibayar,
          tagihan,
          sisa,
          statusBayar,
          keterangan: riwayat.length > 1 ? `${riwayat.length}x Cicilan` : (item.catatanDaftarUlang || 'Daftar Ulang')
        });
      }
      // MODE 2: PER TRANSAKSI / RIWAYAT ANGSURAN
      else {
        if (riwayat.length > 0) {
          riwayat.forEach((r: any, idx: number) => {
            let tgl = getCleanDate(r.waktu) || getCleanDate(item.tglBayarDaftarUlang) || todayStr;
            if (startDate && tgl < startDate) return;
            if (endDate && tgl > endDate) return;

            const nom = Number(r.nominal) > 0 ? Number(r.nominal) : (idx === riwayat.length - 1 ? dibayar : 0);

            list.push({
              id: `trans_${item.rowNumber}_${idx}`,
              rowNumber: item.rowNumber,
              nomorPendaftaran: item.nomorPendaftaran || '-',
              namaLengkap: item.namaLengkap || '-',
              jalurPendaftaran: item.jalurPendaftaran || 'Reguler',
              asalSekolah: item.asalSekolah || '-',
              tanggalBayar: tgl,
              metodeBayar: item.metodeBayarDaftarUlang || 'Transfer',
              nominalMasuk: nom > 0 ? nom : dibayar,
              tagihan,
              sisa,
              statusBayar,
              keterangan: r.keterangan || `Angsuran ke-${r.ke || idx + 1}`
            });
          });
        } else {
          let tgl = getCleanDate(item.tglBayarDaftarUlang) || getCleanDate(item.timestamp) || todayStr;
          if (startDate && tgl < startDate) return;
          if (endDate && tgl > endDate) return;

          list.push({
            id: `siswa_${item.rowNumber || item.id}`,
            rowNumber: item.rowNumber,
            nomorPendaftaran: item.nomorPendaftaran || '-',
            namaLengkap: item.namaLengkap || '-',
            jalurPendaftaran: item.jalurPendaftaran || 'Reguler',
            asalSekolah: item.asalSekolah || '-',
            tanggalBayar: tgl,
            metodeBayar: item.metodeBayarDaftarUlang || 'Transfer',
            nominalMasuk: dibayar,
            tagihan,
            sisa,
            statusBayar,
            keterangan: item.catatanDaftarUlang || 'Daftar Ulang'
          });
        }
      }
    });

    // Urutkan berdasarkan tanggal terbaru lalu nama
    return list.sort((a, b) => {
      const cmpDate = (b.tanggalBayar || '').localeCompare(a.tanggalBayar || '');
      if (cmpDate !== 0) return cmpDate;
      return (a.namaLengkap || '').localeCompare(b.namaLengkap || '');
    });
  }, [data, startDate, endDate, selectedJalur, selectedMetode, selectedStatus, groupMode, todayStr]);

  // Summary Metrics
  const summary = useMemo(() => {
    let totalNominal = 0;
    let countLunas = 0;
    let countCicilan = 0;
    let countTransfer = 0;
    let countTunai = 0;

    processedPayments.forEach(p => {
      totalNominal += p.nominalMasuk;
      if (p.statusBayar === 'lunas') countLunas++;
      else countCicilan++;

      const m = (p.metodeBayar || '').toLowerCase();
      if (m.includes('tunai') || m.includes('cash')) countTunai++;
      else countTransfer++;
    });

    return {
      totalNominal,
      countTransaksi: processedPayments.length,
      countLunas,
      countCicilan,
      countTransfer,
      countTunai
    };
  }, [processedPayments]);

  if (!isOpen) return null;

  // Preset Handlers
  const handlePreset = (type: 'today' | '7days' | '30days' | 'this_month' | 'all') => {
    if (type === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (type === '7days') {
      setStartDate(sevenDaysAgoStr);
      setEndDate(todayStr);
    } else if (type === '30days') {
      setStartDate(thirtyDaysAgoStr);
      setEndDate(todayStr);
    } else if (type === 'this_month') {
      setStartDate(startOfMonthStr);
      setEndDate(todayStr);
    } else if (type === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  // Generate Modern HTML for printing
  const getDocumentHtml = () => {
    const periodeLabel = startDate && endDate
      ? `${formatTanggalIndo(startDate)} s/d ${formatTanggalIndo(endDate)}`
      : startDate
      ? `Mulai ${formatTanggalIndo(startDate)}`
      : endDate
      ? `Sampai ${formatTanggalIndo(endDate)}`
      : 'Semua Periode Pendaftaran';

    const tglCetak = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    const jamCetak = new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="utf-8" />
        <title>Rekap Pembayaran Masuk SPMB</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 12mm 15mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #0f172a;
            background: #ffffff;
            margin: 0;
            padding: 0;
            font-size: 11px;
            line-height: 1.4;
          }
          
          /* HEADER MODERN */
          .doc-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 2.5px solid #059669;
            padding-bottom: 12px;
            margin-bottom: 14px;
          }
          .doc-header-left {
            display: flex;
            align-items: center;
            gap: 14px;
          }
          .doc-logo-emblem {
            width: 52px;
            height: 52px;
            border-radius: 12px;
            background: #059669;
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 900;
            font-size: 19px;
            letter-spacing: -0.5px;
            box-shadow: 0 4px 10px rgba(5, 150, 105, 0.25);
          }
          .doc-institution {
            font-size: 15px;
            font-weight: 900;
            color: #065f46;
            letter-spacing: 0.3px;
            margin: 0;
            text-transform: uppercase;
          }
          .doc-title {
            font-size: 13px;
            font-weight: 700;
            color: #1e293b;
            margin: 2px 0 0 0;
          }
          .doc-address {
            font-size: 9.5px;
            color: #64748b;
            margin-top: 2px;
          }
          .doc-header-right {
            text-align: right;
          }
          .badge-periode {
            display: inline-block;
            background: #ecfdf5;
            border: 1px solid #a7f3d0;
            color: #047857;
            padding: 4px 12px;
            border-radius: 20px;
            font-weight: 700;
            font-size: 10px;
            margin-bottom: 4px;
          }
          .doc-print-meta {
            font-size: 9px;
            color: #64748b;
          }

          /* KPI SUMMARY CARDS */
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin-bottom: 14px;
          }
          .summary-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 9px 12px;
          }
          .summary-label {
            font-size: 9px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }
          .summary-value {
            font-size: 14px;
            font-weight: 900;
            color: #0f172a;
            margin-top: 2px;
          }
          .summary-card.highlight {
            background: #ecfdf5;
            border-color: #a7f3d0;
          }
          .summary-card.highlight .summary-label {
            color: #059669;
          }
          .summary-card.highlight .summary-value {
            color: #065f46;
          }

          /* TABEL TRANSAKSI MODERN */
          table.data-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
          }
          table.data-table th {
            background: #059669;
            color: #ffffff;
            font-weight: 700;
            text-align: left;
            padding: 8px 10px;
            font-size: 9.5px;
            letter-spacing: 0.3px;
            border: 1px solid #047857;
          }
          table.data-table th.text-center { text-align: center; }
          table.data-table th.text-right { text-align: right; }
          
          table.data-table td {
            padding: 7px 10px;
            border: 1px solid #e2e8f0;
            color: #1e293b;
            vertical-align: middle;
          }
          table.data-table tr:nth-child(even) td {
            background: #f8fafc;
          }
          table.data-table tr.total-row td {
            background: #f1f5f9;
            border-top: 2px solid #059669;
            font-weight: 800;
            font-size: 11px;
            color: #0f172a;
          }

          /* BADGES */
          .pill-badge {
            display: inline-block;
            padding: 2px 7px;
            border-radius: 12px;
            font-size: 8.5px;
            font-weight: 700;
            text-transform: uppercase;
          }
          .badge-lunas {
            background: #d1fae5;
            color: #047857;
            border: 1px solid #a7f3d0;
          }
          .badge-cicilan {
            background: #fef3c7;
            color: #b45309;
            border: 1px solid #fde68a;
          }
          .badge-transfer {
            background: #eff6ff;
            color: #1d4ed8;
            border: 1px solid #bfdbfe;
          }
          .badge-tunai {
            background: #f5f3ff;
            color: #6d28d9;
            border: 1px solid #ddd6fe;
          }

          /* TANDA TANGAN SECTION */
          .sign-section {
            margin-top: 24px;
            display: flex;
            justify-content: space-between;
            page-break-inside: avoid;
          }
          .sign-box {
            text-align: center;
            width: 240px;
          }
          .sign-role {
            font-size: 10px;
            font-weight: 600;
            color: #475569;
            margin-bottom: 50px;
          }
          .sign-name {
            font-size: 11px;
            font-weight: 800;
            color: #0f172a;
            border-bottom: 1px solid #0f172a;
            display: inline-block;
            padding-bottom: 2px;
          }
          .sign-nip {
            font-size: 9px;
            color: #64748b;
            margin-top: 3px;
          }

          .doc-footer-note {
            margin-top: 18px;
            padding-top: 8px;
            border-top: 1px dashed #cbd5e1;
            font-size: 8.5px;
            color: #94a3b8;
            display: flex;
            justify-content: space-between;
          }
        </style>
      </head>
      <body>
        <!-- KOP LAPORAN MODERN -->
        <div class="doc-header">
          <div class="doc-header-left">
            <div class="doc-logo-emblem">MTS</div>
            <div>
              <h1 class="doc-institution">MTs Almaarif 01 Singosari Malang</h1>
              <div class="doc-title">Laporan Rekapitulasi Pembayaran &amp; Daftar Ulang (DPP) SPMB</div>
              <div class="doc-address">Jl. Masjid No. 33 Pagentan Singosari Malang 65153 • Telp: (0341) 458784 • Website: mtsalmaarif01.sch.id</div>
            </div>
          </div>
          <div class="doc-header-right">
            <div class="badge-periode">📅 ${periodeLabel}</div>
            <div class="doc-print-meta">Dicetak: ${tglCetak}, ${jamCetak} WIB</div>
            <div class="doc-print-meta">Oleh: Panitia SPMB / Bendahara</div>
          </div>
        </div>

        <!-- KPI SUMMARY CARDS -->
        <div class="summary-grid">
          <div class="summary-card highlight">
            <div class="summary-label">Total Uang Masuk</div>
            <div class="summary-value">Rp ${formatRupiah(summary.totalNominal)}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Total Transaksi Santri</div>
            <div class="summary-value">${summary.countTransaksi} Data</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Status Pelunasan</div>
            <div class="summary-value" style="font-size: 12.5px;">${summary.countLunas} Lunas • ${summary.countCicilan} Cicilan</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Metode Pembayaran</div>
            <div class="summary-value" style="font-size: 12.5px;">${summary.countTransfer} Transfer • ${summary.countTunai} Tunai</div>
          </div>
        </div>

        <!-- TABEL DATA -->
        <table class="data-table">
          <thead>
            <tr>
              <th class="text-center" style="width: 32px;">NO</th>
              <th class="text-center" style="width: 85px;">TGL BAYAR</th>
              <th style="width: 110px;">NO. DAFTAR</th>
              <th>NAMA CALON SANTRI</th>
              <th style="width: 80px;">JALUR</th>
              <th style="width: 150px;">ASAL SD / MI</th>
              <th class="text-center" style="width: 75px;">METODE</th>
              <th class="text-center" style="width: 80px;">STATUS</th>
              <th class="text-right" style="width: 115px;">NOMINAL MASUK</th>
            </tr>
          </thead>
          <tbody>
            ${processedPayments.length === 0 ? `
              <tr>
                <td colspan="9" style="text-align: center; padding: 24px; color: #64748b;">
                  Tidak ada transaksi pembayaran pada rentang tanggal yang dipilih.
                </td>
              </tr>
            ` : processedPayments.map((p, idx) => `
              <tr>
                <td class="text-center" style="color: #64748b; font-weight: 600;">${idx + 1}</td>
                <td class="text-center" style="font-weight: 600;">${formatTanggalIndo(p.tanggalBayar)}</td>
                <td style="font-family: monospace; font-size: 9.5px; font-weight: 600;">${p.nomorPendaftaran}</td>
                <td style="font-weight: 700; color: #0f172a;">${p.namaLengkap}</td>
                <td>${p.jalurPendaftaran}</td>
                <td>${p.asalSekolah}</td>
                <td class="text-center">
                  <span class="pill-badge ${p.metodeBayar.toLowerCase().includes('tunai') ? 'badge-tunai' : 'badge-transfer'}">
                    ${p.metodeBayar}
                  </span>
                </td>
                <td class="text-center">
                  <span class="pill-badge ${p.statusBayar === 'lunas' ? 'badge-lunas' : 'badge-cicilan'}">
                    ${p.statusBayar === 'lunas' ? 'LUNAS' : 'CICILAN'}
                  </span>
                </td>
                <td class="text-right" style="font-weight: 800; color: #047857;">
                  Rp ${formatRupiah(p.nominalMasuk)}
                </td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="8" class="text-right" style="padding-right: 14px; text-transform: uppercase;">
                TOTAL KESELURUHAN PEMBAYARAN MASUK :
              </td>
              <td class="text-right" style="color: #065f46; font-size: 12px;">
                Rp ${formatRupiah(summary.totalNominal)}
              </td>
            </tr>
          </tbody>
        </table>

        <!-- PENGESAHAN / TANDA TANGAN -->
        <div class="sign-section">
          <div class="sign-box">
            <div class="sign-role">Mengetahui,<br/>Kepala MTs Almaarif 01</div>
            <div class="sign-name">H. M. Ilham Fahrudi, M.Pd.</div>
            <div class="sign-nip">NIP. 19780512 200501 1 004</div>
          </div>
          <div class="sign-box">
            <div class="sign-role">Singosari, ${tglCetak}<br/>Bendahara SPMB</div>
            <div class="sign-name">Ibu S. Nur Ainy</div>
            <div class="sign-nip">NIP. -</div>
          </div>
        </div>

        <!-- FOOTER VERIFIKASI -->
        <div class="doc-footer-note">
          <span>* Dokumen resmi rekapitulasi pembayaran digenerate otomatis oleh Sistem Terpadu Madrasah SPMB.</span>
          <span>Halaman 1 dari 1</span>
        </div>
      </body>
      </html>
    `;
  };

  // Action: Print / Save as PDF via Browser
  const handlePrintDocument = () => {
    const htmlContent = getDocumentHtml();
    const iframe = printIframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(htmlContent);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 450);
  };

  // Action: Direct Download PDF via jsPDF & autoTable
  const handleDownloadDirectPdf = () => {
    try {
      setIsGeneratingPdf(true);
      const doc = new jsPDF('l', 'mm', 'a4'); // Landscape A4: 297mm x 210mm
      const pageWidth = 297;
      const margin = 14;

      const periodeLabel = startDate && endDate
        ? `${formatTanggalIndo(startDate)} s/d ${formatTanggalIndo(endDate)}`
        : startDate
        ? `Mulai ${formatTanggalIndo(startDate)}`
        : endDate
        ? `Sampai ${formatTanggalIndo(endDate)}`
        : 'Semua Periode Pendaftaran';

      const tglCetak = new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      // 1. Header Banner
      doc.setFillColor(5, 150, 105); // #059669
      doc.rect(margin, 12, 10, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('MTS', margin + 5, 18.5, { align: 'center' });

      doc.setTextColor(6, 95, 70); // #065f46
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('MTs ALMAARIF 01 SINGOSARI MALANG', margin + 14, 17);

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(10);
      doc.text('Laporan Rekapitulasi Pembayaran & Daftar Ulang (DPP) SPMB', margin + 14, 22);

      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('Jl. Masjid No. 33 Pagentan Singosari Malang 65153 • Telp: (0341) 458784 • Website: mtsalmaarif01.sch.id', margin, 27);

      // Meta Kanan
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(5, 150, 105);
      doc.setFontSize(9);
      doc.text(`Periode: ${periodeLabel}`, pageWidth - margin, 17, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(8);
      doc.text(`Dicetak: ${tglCetak} | Oleh: Bendahara SPMB`, pageWidth - margin, 22, { align: 'right' });

      // Divider line
      doc.setDrawColor(5, 150, 105);
      doc.setLineWidth(0.6);
      doc.line(margin, 29, pageWidth - margin, 29);

      // 2. Summary Mini Cards
      const cardY = 32;
      const cardW = (pageWidth - (margin * 2) - 9) / 4;
      const cardH = 13;

      // Card 1
      doc.setFillColor(236, 253, 245); // light green
      doc.setDrawColor(167, 243, 208);
      doc.roundedRect(margin, cardY, cardW, cardH, 2, 2, 'FD');
      doc.setTextColor(5, 150, 105);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text('TOTAL UANG MASUK', margin + 4, cardY + 4.5);
      doc.setTextColor(6, 95, 70);
      doc.setFontSize(10.5);
      doc.text(`Rp ${formatRupiah(summary.totalNominal)}`, margin + 4, cardY + 10);

      // Card 2
      const c2x = margin + cardW + 3;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(c2x, cardY, cardW, cardH, 2, 2, 'FD');
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(7.5);
      doc.text('TOTAL TRANSAKSI', c2x + 4, cardY + 4.5);
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(10.5);
      doc.text(`${summary.countTransaksi} Calon Santri`, c2x + 4, cardY + 10);

      // Card 3
      const c3x = c2x + cardW + 3;
      doc.roundedRect(c3x, cardY, cardW, cardH, 2, 2, 'FD');
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(7.5);
      doc.text('STATUS PELUNASAN', c3x + 4, cardY + 4.5);
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(9);
      doc.text(`${summary.countLunas} Lunas • ${summary.countCicilan} Cicilan`, c3x + 4, cardY + 10);

      // Card 4
      const c4x = c3x + cardW + 3;
      doc.roundedRect(c4x, cardY, cardW, cardH, 2, 2, 'FD');
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(7.5);
      doc.text('METODE PEMBAYARAN', c4x + 4, cardY + 4.5);
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(9);
      doc.text(`${summary.countTransfer} Transfer • ${summary.countTunai} Tunai`, c4x + 4, cardY + 10);

      // 3. Table Data
      const tableRows = processedPayments.map((p, idx) => [
        idx + 1,
        formatTanggalIndo(p.tanggalBayar),
        p.nomorPendaftaran,
        p.namaLengkap,
        p.jalurPendaftaran,
        p.asalSekolah,
        p.metodeBayar,
        p.statusBayar.toUpperCase(),
        `Rp ${formatRupiah(p.nominalMasuk)}`
      ]);

      // Total row
      const footRows = [
        [
          { content: 'TOTAL KESELURUHAN DANA MASUK', colSpan: 8, styles: { halign: 'right', fontStyle: 'bold' } },
          { content: `Rp ${formatRupiah(summary.totalNominal)}`, styles: { halign: 'right', fontStyle: 'bold', textColor: [6, 95, 70] } }
        ]
      ];

      autoTable(doc, {
        startY: cardY + cardH + 4,
        margin: { left: margin, right: margin },
        head: [['NO', 'TGL BAYAR', 'NO. REG', 'NAMA CALON SANTRI', 'JALUR', 'ASAL SD / MI', 'METODE', 'STATUS', 'NOMINAL MASUK']],
        body: tableRows.length > 0 ? tableRows : [['-', '-', '-', 'Tidak ada data transaksi pembayaran pada rentang tanggal ini', '-', '-', '-', '-', '-']],
        foot: footRows as any,
        theme: 'striped',
        styles: {
          font: 'helvetica',
          fontSize: 8,
          cellPadding: 2,
          textColor: [30, 41, 59],
          valign: 'middle'
        },
        headStyles: {
          fillColor: [5, 150, 105],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'left',
          fontSize: 8.5
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 26, halign: 'center' },
          2: { cellWidth: 28, halign: 'center' },
          3: { cellWidth: 55, fontStyle: 'bold' },
          4: { cellWidth: 24, halign: 'center' },
          5: { cellWidth: 50 },
          6: { cellWidth: 22, halign: 'center' },
          7: { cellWidth: 22, halign: 'center' },
          8: { cellWidth: 32, halign: 'right', fontStyle: 'bold' }
        },
        footStyles: {
          fillColor: [241, 245, 249],
          fontSize: 9
        },
        didDrawPage: (data) => {
          // Page Numbering
          const pageStr = `Halaman ${doc.getNumberOfPages()}`;
          doc.setFontSize(8);
          doc.setTextColor(148, 163, 184);
          doc.text(pageStr, pageWidth - margin, 202, { align: 'right' });
          doc.text('* Dokumen resmi rekapitulasi pembayaran digenerate otomatis oleh Sistem Terpadu Madrasah MTs Almaarif 01.', margin, 202);
        }
      });

      // 4. Signatures (Check if space allows on same page)
      let finalY = (doc as any).lastAutoTable.finalY + 12;
      if (finalY > 170) {
        doc.addPage();
        finalY = 25;
      }

      const signW = 60;
      // Kiri: Kamad
      doc.setTextColor(71, 85, 105);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text('Mengetahui,', margin + 15, finalY);
      doc.text('Kepala MTs Almaarif 01', margin + 15, finalY + 4.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(9);
      doc.text('H. M. Ilham Fahrudi, M.Pd.', margin + 15, finalY + 25);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('NIP. 19780512 200501 1 004', margin + 15, finalY + 29);

      // Kanan: Bendahara
      const signRightX = pageWidth - margin - signW;
      doc.setTextColor(71, 85, 105);
      doc.setFontSize(8.5);
      doc.text(`Singosari, ${tglCetak}`, signRightX + 10, finalY);
      doc.text('Bendahara SPMB', signRightX + 10, finalY + 4.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(9);
      doc.text('Ibu S. Nur Ainy', signRightX + 10, finalY + 25);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('NIP. -', signRightX + 10, finalY + 29);

      // Save PDF
      const cleanStart = startDate || 'awal';
      const cleanEnd = endDate || 'akhir';
      const filename = `Rekap_Pembayaran_SPMB_MTs01_${cleanStart}_sd_${cleanEnd}.pdf`;
      doc.save(filename);

      Swal.fire({
        icon: 'success',
        title: 'PDF Berhasil Diunduh',
        text: `File ${filename} telah tersimpan di komputer Anda.`,
        timer: 2000,
        showConfirmButton: false
      });
    } catch (err: any) {
      console.error('Error generating PDF:', err);
      Swal.fire('Gagal Mengunduh PDF', err.message || 'Terjadi kesalahan teknis saat membuat PDF.', 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.7)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '16px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '20px',
        width: '100%',
        maxWidth: activeTab === 'preview' ? '1100px' : '720px',
        maxHeight: '94vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        transition: 'max-width 0.2s ease'
      }}>
        {/* MODAL HEADER */}
        <div style={{
          padding: '16px 22px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#f8fafc'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#ecfdf5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '15px'
              }}>
                <i className="fas fa-file-invoice-dollar"></i>
              </div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#1e293b' }}>
                Rekap Pembayaran Masuk SPMB
              </h3>
            </div>
            <p style={{ margin: '3px 0 0 40px', fontSize: '11.5px', color: '#64748b' }}>
              Pilih rentang tanggal untuk mengunduh laporan berformat modern, bersih, dan profesional
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '18px',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px'
            }}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* TAB TOGGLE: FILTER / PREVIEW */}
        <div style={{
          padding: '10px 22px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#ffffff',
          gap: '10px',
          flexWrap: 'wrap'
        }}>
          <div style={{
            background: '#f1f5f9',
            padding: '3px',
            borderRadius: '10px',
            display: 'inline-flex',
            gap: '4px'
          }}>
            <button
              onClick={() => setActiveTab('filter')}
              style={{
                padding: '6px 14px',
                borderRadius: '7px',
                border: 'none',
                fontSize: '12px',
                fontWeight: activeTab === 'filter' ? 700 : 600,
                color: activeTab === 'filter' ? '#0f172a' : '#64748b',
                background: activeTab === 'filter' ? '#ffffff' : 'transparent',
                cursor: 'pointer',
                boxShadow: activeTab === 'filter' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              <i className="fas fa-sliders-h" style={{ marginRight: '6px' }}></i> 1. Pengaturan Filter
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              style={{
                padding: '6px 14px',
                borderRadius: '7px',
                border: 'none',
                fontSize: '12px',
                fontWeight: activeTab === 'preview' ? 700 : 600,
                color: activeTab === 'preview' ? '#0f172a' : '#64748b',
                background: activeTab === 'preview' ? '#ffffff' : 'transparent',
                cursor: 'pointer',
                boxShadow: activeTab === 'preview' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              <i className="fas fa-eye" style={{ marginRight: '6px' }}></i> 2. Pratinjau Dokumen ({processedPayments.length})
            </button>
          </div>

          {/* Quick Metrics Tag */}
          <div style={{ fontSize: '12px', color: '#047857', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ background: '#ecfdf5', padding: '4px 10px', borderRadius: '15px', border: '1px solid #a7f3d0' }}>
              💰 Kas Masuk: <b>Rp {formatRupiah(summary.totalNominal)}</b> ({summary.countTransaksi} Transaksi)
            </span>
          </div>
        </div>

        {/* MODAL BODY */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}>
          {activeTab === 'filter' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* RENTANG TANGGAL */}
              <div style={{
                background: '#f8fafc',
                border: '1.5px solid #e2e8f0',
                borderRadius: '14px',
                padding: '16px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="fas fa-calendar-alt" style={{ color: '#059669' }}></i> Rentang Tanggal Pembayaran
                  </label>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    Filter transaksi uang masuk
                  </span>
                </div>

                {/* Preset Chips */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
                  <button
                    type="button"
                    onClick={() => handlePreset('today')}
                    style={{
                      background: startDate === todayStr && endDate === todayStr ? '#059669' : '#ffffff',
                      color: startDate === todayStr && endDate === todayStr ? '#ffffff' : '#334155',
                      border: '1px solid #cbd5e1',
                      borderRadius: '20px',
                      padding: '4px 12px',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Hari Ini
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePreset('7days')}
                    style={{
                      background: startDate === sevenDaysAgoStr && endDate === todayStr ? '#059669' : '#ffffff',
                      color: startDate === sevenDaysAgoStr && endDate === todayStr ? '#ffffff' : '#334155',
                      border: '1px solid #cbd5e1',
                      borderRadius: '20px',
                      padding: '4px 12px',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    7 Hari Terakhir
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePreset('this_month')}
                    style={{
                      background: startDate === startOfMonthStr && endDate === todayStr ? '#059669' : '#ffffff',
                      color: startDate === startOfMonthStr && endDate === todayStr ? '#ffffff' : '#334155',
                      border: '1px solid #cbd5e1',
                      borderRadius: '20px',
                      padding: '4px 12px',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Bulan Ini (Nov 2026)
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePreset('30days')}
                    style={{
                      background: startDate === thirtyDaysAgoStr && endDate === todayStr ? '#059669' : '#ffffff',
                      color: startDate === thirtyDaysAgoStr && endDate === todayStr ? '#ffffff' : '#334155',
                      border: '1px solid #cbd5e1',
                      borderRadius: '20px',
                      padding: '4px 12px',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    30 Hari Terakhir
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePreset('all')}
                    style={{
                      background: !startDate && !endDate ? '#059669' : '#ffffff',
                      color: !startDate && !endDate ? '#ffffff' : '#334155',
                      border: '1px solid #cbd5e1',
                      borderRadius: '20px',
                      padding: '4px 12px',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Semua Periode
                  </button>
                </div>

                {/* Input Dari & Sampai */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      Dari Tanggal:
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '13px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      Sampai Tanggal:
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '13px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* FILTER TAMBAHAN (OPSIONAL) */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '16px'
              }}>
                <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#1e293b', marginBottom: '12px' }}>
                  Filter Tambahan (Opsional)
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      Jalur Pendaftaran
                    </label>
                    <select
                      value={selectedJalur}
                      onChange={e => setSelectedJalur(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '12.5px',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="semua">Semua Jalur</option>
                      <option value="inden">Inden</option>
                      <option value="reguler">Reguler</option>
                      <option value="terpadu">Terpadu</option>
                      <option value="afirmasi">Afirmasi</option>
                      <option value="prestasi">Prestasi</option>
                      <option value="mandiri">Mandiri</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      Status Pembayaran
                    </label>
                    <select
                      value={selectedStatus}
                      onChange={e => setSelectedStatus(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '12.5px',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="semua">Semua (Lunas &amp; Cicilan)</option>
                      <option value="lunas">Hanya Lunas</option>
                      <option value="cicilan">Hanya Cicilan / Titipan</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      Metode Pembayaran
                    </label>
                    <select
                      value={selectedMetode}
                      onChange={e => setSelectedMetode(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '12.5px',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="semua">Semua Metode</option>
                      <option value="transfer">Transfer Bank (BCA / Lainnya)</option>
                      <option value="tunai">Tunai / Cash (Bendahara)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* STATISTIK HASIL FILTER */}
              <div style={{
                background: '#ecfdf5',
                border: '1.5px solid #a7f3d0',
                borderRadius: '14px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#065f46', textTransform: 'uppercase' }}>
                    Hasil Pencocokan Data
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: '#047857', marginTop: '2px' }}>
                    Rp {formatRupiah(summary.totalNominal)}
                  </div>
                  <div style={{ fontSize: '12px', color: '#065f46', marginTop: '2px' }}>
                    Ditemukan <b>{summary.countTransaksi} calon santri</b> ({summary.countLunas} Lunas, {summary.countCicilan} Cicilan)
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  style={{
                    background: '#059669',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 18px',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)'
                  }}
                >
                  <i className="fas fa-eye"></i> Lihat Pratinjau Dokumen
                </button>
              </div>
            </div>
          ) : (
            /* PREVIEW DOKUMEN MODERN */
            <div>
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '16px',
                overflowX: 'auto',
                boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.03)'
              }}>
                {/* Visual Preview Container */}
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '24px',
                  minWidth: '780px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                }}>
                  {/* Header */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '2.5px solid #059669',
                    paddingBottom: '12px',
                    marginBottom: '14px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '10px',
                        background: '#059669',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 900,
                        fontSize: '16px'
                      }}>
                        MTS
                      </div>
                      <div>
                        <div style={{ fontSize: '13.5px', fontWeight: 900, color: '#065f46', textTransform: 'uppercase' }}>
                          MTs Almaarif 01 Singosari Malang
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>
                          Laporan Rekapitulasi Pembayaran &amp; Daftar Ulang (DPP) SPMB
                        </div>
                        <div style={{ fontSize: '9px', color: '#64748b' }}>
                          Jl. Masjid No. 33 Pagentan Singosari Malang 65153 • Telp: (0341) 458784
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        background: '#ecfdf5',
                        border: '1px solid #a7f3d0',
                        color: '#047857',
                        padding: '3px 10px',
                        borderRadius: '20px',
                        fontWeight: 700,
                        fontSize: '9.5px',
                        display: 'inline-block'
                      }}>
                        📅 Periode: {startDate ? formatTanggalIndo(startDate) : 'Awal'} s/d {endDate ? formatTanggalIndo(endDate) : 'Akhir'}
                      </span>
                      <div style={{ fontSize: '8.5px', color: '#64748b', marginTop: '3px' }}>
                        Dicetak: {new Date().toLocaleDateString('id-ID')}
                      </div>
                    </div>
                  </div>

                  {/* 4 Mini Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '14px' }}>
                    <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '8px 10px' }}>
                      <div style={{ fontSize: '8.5px', fontWeight: 700, color: '#059669' }}>TOTAL UANG MASUK</div>
                      <div style={{ fontSize: '13.5px', fontWeight: 900, color: '#065f46' }}>Rp {formatRupiah(summary.totalNominal)}</div>
                    </div>
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 10px' }}>
                      <div style={{ fontSize: '8.5px', fontWeight: 700, color: '#64748b' }}>TRANSAKSI SANTRI</div>
                      <div style={{ fontSize: '13.5px', fontWeight: 900, color: '#0f172a' }}>{summary.countTransaksi} Siswa</div>
                    </div>
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 10px' }}>
                      <div style={{ fontSize: '8.5px', fontWeight: 700, color: '#64748b' }}>STATUS PELUNASAN</div>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a', marginTop: '3px' }}>{summary.countLunas} Lunas • {summary.countCicilan} Cicilan</div>
                    </div>
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 10px' }}>
                      <div style={{ fontSize: '8.5px', fontWeight: 700, color: '#64748b' }}>METODE BAYAR</div>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a', marginTop: '3px' }}>{summary.countTransfer} Transfer • {summary.countTunai} Tunai</div>
                    </div>
                  </div>

                  {/* Table */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5px' }}>
                    <thead>
                      <tr style={{ background: '#059669', color: '#fff' }}>
                        <th style={{ padding: '6px 8px', textAlign: 'center', width: '25px' }}>NO</th>
                        <th style={{ padding: '6px 8px', textAlign: 'center', width: '80px' }}>TGL BAYAR</th>
                        <th style={{ padding: '6px 8px', textAlign: 'center', width: '100px' }}>NO. REG</th>
                        <th style={{ padding: '6px 8px', textAlign: 'left' }}>NAMA CALON SANTRI</th>
                        <th style={{ padding: '6px 8px', textAlign: 'center', width: '70px' }}>JALUR</th>
                        <th style={{ padding: '6px 8px', textAlign: 'left', width: '130px' }}>ASAL SEKOLAH</th>
                        <th style={{ padding: '6px 8px', textAlign: 'center', width: '65px' }}>METODE</th>
                        <th style={{ padding: '6px 8px', textAlign: 'center', width: '65px' }}>STATUS</th>
                        <th style={{ padding: '6px 8px', textAlign: 'right', width: '105px' }}>NOMINAL (RP)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {processedPayments.length === 0 ? (
                        <tr>
                          <td colSpan={9} style={{ textAlign: 'center', padding: '16px', color: '#64748b' }}>
                            Tidak ada data transaksi pembayaran pada rentang tanggal ini.
                          </td>
                        </tr>
                      ) : processedPayments.slice(0, 15).map((p, idx) => (
                        <tr key={p.id} style={{ borderBottom: '1px solid #e2e8f0', background: idx % 2 === 1 ? '#f8fafc' : '#fff' }}>
                          <td style={{ padding: '5px 8px', textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                          <td style={{ padding: '5px 8px', textAlign: 'center' }}>{formatTanggalIndo(p.tanggalBayar)}</td>
                          <td style={{ padding: '5px 8px', textAlign: 'center', fontFamily: 'monospace' }}>{p.nomorPendaftaran}</td>
                          <td style={{ padding: '5px 8px', fontWeight: 700 }}>{p.namaLengkap}</td>
                          <td style={{ padding: '5px 8px', textAlign: 'center' }}>{p.jalurPendaftaran}</td>
                          <td style={{ padding: '5px 8px' }}>{p.asalSekolah}</td>
                          <td style={{ padding: '5px 8px', textAlign: 'center' }}>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '8px',
                              fontSize: '8px',
                              fontWeight: 700,
                              background: p.metodeBayar.toLowerCase().includes('tunai') ? '#f5f3ff' : '#eff6ff',
                              color: p.metodeBayar.toLowerCase().includes('tunai') ? '#6d28d9' : '#1d4ed8'
                            }}>
                              {p.metodeBayar}
                            </span>
                          </td>
                          <td style={{ padding: '5px 8px', textAlign: 'center' }}>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '8px',
                              fontSize: '8px',
                              fontWeight: 700,
                              background: p.statusBayar === 'lunas' ? '#d1fae5' : '#fef3c7',
                              color: p.statusBayar === 'lunas' ? '#047857' : '#b45309'
                            }}>
                              {p.statusBayar === 'lunas' ? 'LUNAS' : 'CICILAN'}
                            </span>
                          </td>
                          <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 800, color: '#047857' }}>
                            Rp {formatRupiah(p.nominalMasuk)}
                          </td>
                        </tr>
                      ))}
                      {processedPayments.length > 15 && (
                        <tr>
                          <td colSpan={9} style={{ textAlign: 'center', padding: '8px', background: '#f8fafc', color: '#64748b', fontSize: '9px', fontStyle: 'italic' }}>
                            ... dan {processedPayments.length - 15} santri lainnya (seluruhnya akan tercetak lengkap di PDF).
                          </td>
                        </tr>
                      )}
                      <tr style={{ background: '#f1f5f9', fontWeight: 800, borderTop: '2px solid #059669' }}>
                        <td colSpan={8} style={{ padding: '6px 8px', textAlign: 'right' }}>
                          TOTAL PEMBAYARAN MASUK :
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', color: '#065f46', fontSize: '10.5px' }}>
                          Rp {formatRupiah(summary.totalNominal)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER ACTIONS */}
        <div style={{
          padding: '14px 22px',
          borderTop: '1px solid #e2e8f0',
          background: '#f8fafc',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#ffffff',
              border: '1.5px solid #cbd5e1',
              color: '#475569',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Tutup
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            {/* OPSI 1: CETAK / SAVE AS PDF DARI BROWSER */}
            <button
              type="button"
              onClick={handlePrintDocument}
              disabled={processedPayments.length === 0}
              style={{
                background: '#ffffff',
                border: '1.5px solid #059669',
                color: '#059669',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: processedPayments.length === 0 ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <i className="fas fa-print"></i> Cetak / Preview A4
            </button>

            {/* OPSI 2: DOWNLOAD LANGSUNG SEBAGAI PDF (.pdf) */}
            <button
              type="button"
              onClick={handleDownloadDirectPdf}
              disabled={processedPayments.length === 0 || isGeneratingPdf}
              style={{
                background: '#059669',
                border: 'none',
                color: '#ffffff',
                padding: '8px 18px',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: processedPayments.length === 0 || isGeneratingPdf ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)'
              }}
            >
              <i className={`fas ${isGeneratingPdf ? 'fa-spinner fa-spin' : 'fa-file-pdf'}`}></i>
              {isGeneratingPdf ? 'Membuat PDF...' : 'Download PDF (.pdf)'}
            </button>
          </div>
        </div>
      </div>

      {/* Hidden iframe for native browser printing */}
      <iframe
        ref={printIframeRef}
        style={{
          position: 'fixed',
          top: -9999,
          left: -9999,
          width: '1px',
          height: '1px',
          opacity: 0,
          border: 'none'
        }}
        title="Print Rekap Pembayaran"
      />
    </div>
  );
}
