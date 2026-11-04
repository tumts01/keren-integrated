'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import LoadingScreen from '@/components/LoadingScreen';
import ModalDaftarUlang from '../components/ModalDaftarUlang';
import ModalCetakStrukPos80 from '../components/ModalCetakStrukPos80';
import ModalAturSebaranDpp from '../components/ModalAturSebaranDpp';
import ModalEditPlotingSiswa from '../components/ModalEditPlotingSiswa';
import ModalRekapPembayaran from '../components/ModalRekapPembayaran';

export interface SebaranKomponen {
  id: string;
  nama: string;
  nominal: number;
}

export default function PembayaranSpmbPage() {
  const router = useRouter();

  // Auth states
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  // Data states
  const [data, setData] = useState<any[]>([]);
  const [komponenList, setKomponenList] = useState<SebaranKomponen[]>([]);

  // Navigation tab inside Pembayaran: 'daftar_ulang' | 'sebaran_dpp'
  const [activeTab, setActiveTab] = useState<'daftar_ulang' | 'sebaran_dpp'>('daftar_ulang');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterJalur, setFilterJalur] = useState('semua');
  const [filterStatusBayar, setFilterStatusBayar] = useState('semua');
  const [filterSekolah, setFilterSekolah] = useState('');
  const [sortOrder, setSortOrder] = useState<'terbaru' | 'nama_asc' | 'nominal_desc' | 'sisa_desc'>('terbaru');

  // Pagination for Daftar Ulang tab
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Modals state
  const [showDaftarUlangModal, setShowDaftarUlangModal] = useState(false);
  const [selectedForDaftarUlang, setSelectedForDaftarUlang] = useState<any | null>(null);

  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedForPrint, setSelectedForPrint] = useState<any | null>(null);

  const [showAturKomponenModal, setShowAturKomponenModal] = useState(false);

  const [showEditPlotingModal, setShowEditPlotingModal] = useState(false);
  const [selectedForPloting, setSelectedForPloting] = useState<any | null>(null);

  const [showRekapModal, setShowRekapModal] = useState(false);

  // Document Viewer Modal for proofs
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerTitle, setViewerTitle] = useState('');

  // 1. Auth & Admin check
  useEffect(() => {
    const userStr = localStorage.getItem('keren_user_data');
    if (!userStr) {
      router.replace('/');
      return;
    }
    try {
      const user = JSON.parse(userStr);
      if (user) {
        const role = (user.role || '').toLowerCase();
        const adminAllowed = role === 'admin' || role.includes('admin') || role === 'pimpinan';
        setIsAdmin(adminAllowed);
        setIsAuthorized(true);
      } else {
        router.replace('/');
      }
    } catch (e) {
      console.error(e);
      router.replace('/');
    }
  }, [router]);

  // 2. Fetch Data SPMB & Config Sebaran DPP
  const fetchData = async () => {
    try {
      setLoading(true);
      const [resRekap, resConfig] = await Promise.all([
        fetch('/api/spmb/rekap'),
        fetch('/api/spmb/pembayaran/sebaran-config')
      ]);

      const jsonRekap = await resRekap.json();
      if (jsonRekap.success && Array.isArray(jsonRekap.data)) {
        setData(jsonRekap.data);
      }

      const jsonConfig = await resConfig.json();
      if (jsonConfig.success && Array.isArray(jsonConfig.komponen)) {
        setKomponenList(jsonConfig.komponen);
      }
    } catch (err) {
      console.error('Error fetching SPMB payment data:', err);
      Swal.fire('Error', 'Gagal memuat data pembayaran SPMB.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      fetchData();
    }
  }, [isAuthorized]);

  // Helper formatting currency
  const formatRupiah = (val: number) => {
    return (val || 0).toLocaleString('id-ID');
  };

  // Unique list of Asal Sekolah for dropdown
  const listSekolah = useMemo(() => {
    const setSekolah = new Set<string>();
    data.forEach(item => {
      if (item.asalSekolah && item.asalSekolah.trim()) {
        setSekolah.add(item.asalSekolah.trim());
      }
    });
    return Array.from(setSekolah).sort();
  }, [data]);

  // Helper calculating student financial values
  const getStudentFinance = (item: any) => {
    const biaya = item.biayaDaftarUlang !== undefined && item.biayaDaftarUlang !== '' 
      ? Number(item.biayaDaftarUlang) 
      : 4500000;
    const pot = Number(item.potonganDaftarUlang || 0);
    const tagihan = Math.max(0, biaya - pot);
    const dibayar = Number(item.nominalDibayarDaftarUlang || 0);
    const sisa = Math.max(0, tagihan - dibayar);

    let status = item.statusDaftarUlang || 'belum_bayar';
    if (dibayar >= tagihan && tagihan > 0) {
      status = 'lunas';
    } else if (dibayar > 0) {
      status = 'cicilan';
    } else if (item.buktiDaftarUlang && dibayar === 0) {
      status = 'menunggu_verifikasi';
    }

    return { biaya, pot, tagihan, dibayar, sisa, status };
  };

  // KPI Calculations across all data
  const stats = useMemo(() => {
    let totalSantri = data.length;
    let totalTagihan = 0;
    let totalTerbayar = 0;
    let totalSisa = 0;
    let countLunas = 0;
    let countCicilan = 0;
    let countMenunggu = 0;
    let countBelum = 0;

    data.forEach(item => {
      const fin = getStudentFinance(item);
      totalTagihan += fin.tagihan;
      totalTerbayar += fin.dibayar;
      totalSisa += fin.sisa;

      if (fin.status === 'lunas') countLunas++;
      else if (fin.status === 'cicilan') countCicilan++;
      else if (fin.status === 'menunggu_verifikasi') countMenunggu++;
      else countBelum++;
    });

    return {
      totalSantri,
      totalTagihan,
      totalTerbayar,
      totalSisa,
      countLunas,
      countCicilan,
      countMenunggu,
      countBelum
    };
  }, [data]);

  // Filtered Data
  const filteredData = useMemo(() => {
    return data.filter(item => {
      // Search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const nama = (item.namaLengkap || '').toLowerCase();
        const nopes = (item.nomorPendaftaran || '').toLowerCase();
        const nisn = (item.nisn || '').toLowerCase();
        const asal = (item.asalSekolah || '').toLowerCase();
        if (!nama.includes(q) && !nopes.includes(q) && !nisn.includes(q) && !asal.includes(q)) {
          return false;
        }
      }

      // Filter Jalur
      if (filterJalur !== 'semua') {
        if ((item.jalurPendaftaran || '').toLowerCase() !== filterJalur.toLowerCase()) {
          return false;
        }
      }

      // Filter Status Bayar
      if (filterStatusBayar !== 'semua') {
        const fin = getStudentFinance(item);
        if (fin.status !== filterStatusBayar) {
          return false;
        }
      }

      // Filter Asal Sekolah
      if (filterSekolah.trim()) {
        if ((item.asalSekolah || '').toLowerCase() !== filterSekolah.toLowerCase()) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortOrder === 'nama_asc') {
        return (a.namaLengkap || '').localeCompare(b.namaLengkap || '');
      }
      if (sortOrder === 'nominal_desc') {
        return Number(b.nominalDibayarDaftarUlang || 0) - Number(a.nominalDibayarDaftarUlang || 0);
      }
      if (sortOrder === 'sisa_desc') {
        const sisaA = getStudentFinance(a).sisa;
        const sisaB = getStudentFinance(b).sisa;
        return sisaB - sisaA;
      }
      // default: terbaru
      return Number(b.rowNumber || b.id || 0) - Number(a.rowNumber || a.id || 0);
    });
  }, [data, searchTerm, filterJalur, filterStatusBayar, filterSekolah, sortOrder]);

  // Pagination slice for Tab 1
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;

  // Sebaran DPP Calculations per Student
  const getStudentSebaranValues = (item: any) => {
    const fin = getStudentFinance(item);
    // Kolom Uang DPP disesuaikan dengan uang yang sudah masuk/dibayar
    const uangDpp = fin.dibayar;
    const existingAlloc = item.sebaranDpp || {};

    let totalPloting = 0;
    const values: { [key: string]: number } = {};

    // Total nominal standar dari semua komponen yang aktif
    const defaultSum = komponenList.reduce((acc, curr) => acc + (Number(curr.nominal) || 0), 0);

    komponenList.forEach((k, idx) => {
      let val = 0;
      if (existingAlloc[k.id] !== undefined) {
        val = Number(existingAlloc[k.id]) || 0;
      } else {
        // Jika belum ada custom allocation dari admin:
        if (uangDpp === 0) {
          // Belum bayar: dana yang bisa diploting adalah 0
          val = 0;
        } else if (uangDpp >= defaultSum) {
          // Lunas / mencapai standar: gunakan nominal default komponen
          val = Number(k.nominal) || 0;
        } else {
          // Cicilan / sebagian: alokasikan proporsional sesuai rasio uang masuk
          const ratio = defaultSum > 0 ? (uangDpp / defaultSum) : 0;
          if (idx === komponenList.length - 1) {
            val = Math.max(0, uangDpp - totalPloting);
          } else {
            val = Math.round((k.nominal * ratio) / 1000) * 1000;
          }
        }
      }
      values[k.id] = val;
      totalPloting += val;
    });

    const selisih = uangDpp - totalPloting;
    return { uangDpp, values, totalPloting, selisih, fin };
  };

  // Sebaran DPP Total Summary Row
  const sebaranTotals = useMemo(() => {
    let sumUangDpp = 0;
    let sumTotalPloting = 0;
    let sumSelisih = 0;
    const compSums: { [key: string]: number } = {};

    komponenList.forEach(k => {
      compSums[k.id] = 0;
    });

    filteredData.forEach(item => {
      const s = getStudentSebaranValues(item);
      sumUangDpp += s.uangDpp;
      sumTotalPloting += s.totalPloting;
      sumSelisih += s.selisih;

      komponenList.forEach(k => {
        compSums[k.id] += (s.values[k.id] || 0);
      });
    });

    return {
      sumUangDpp,
      sumTotalPloting,
      sumSelisih,
      compSums
    };
  }, [filteredData, komponenList]);

  // Export Sebaran DPP to Excel
  const handleExportExcelSebaran = () => {
    if (filteredData.length === 0) {
      Swal.fire('Data Kosong', 'Tidak ada data siswa untuk diekspor.', 'warning');
      return;
    }

    const headers = [
      'No',
      'No. Pendaftaran',
      'Nama Calon Siswa',
      'Jalur',
      'Asal SD/MI',
      'Uang DPP Masuk (Rp)',
      ...komponenList.map(k => `${k.nama} (Rp)`),
      'Total Ploting (Rp)',
      'Selisih (Rp)',
      'Status Bayar'
    ];

    const rows: any[][] = [];

    filteredData.forEach((item, idx) => {
      const fin = getStudentFinance(item);
      const s = getStudentSebaranValues(item);

      const row = [
        idx + 1,
        item.nomorPendaftaran || '-',
        item.namaLengkap || '-',
        item.jalurPendaftaran || '-',
        item.asalSekolah || '-',
        s.uangDpp,
        ...komponenList.map(k => s.values[k.id] || 0),
        s.totalPloting,
        s.selisih,
        fin.status.toUpperCase()
      ];
      rows.push(row);
    });

    // Summary row
    const footerRow = [
      'TOTAL',
      '',
      `Total (${filteredData.length} Santri)`,
      '',
      '',
      sebaranTotals.sumUangDpp,
      ...komponenList.map(k => sebaranTotals.compSums[k.id] || 0),
      sebaranTotals.sumTotalPloting,
      sebaranTotals.sumSelisih,
      ''
    ];
    rows.push(footerRow);

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sebaran DPP');

    const fileName = `Sebaran_DPP_SPMB_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    Swal.fire({
      icon: 'success',
      title: 'Berhasil Diekspor',
      text: `File ${fileName} berhasil diunduh.`,
      timer: 1800,
      showConfirmButton: false
    });
  };

  // Open Document Viewer (for payment proofs)
  const openViewer = (url: string, title: string) => {
    setViewerUrl(url);
    setViewerTitle(title);
  };

  if (!isAuthorized) {
    return <LoadingScreen message="Memeriksa akses keamanan SPMB..." />;
  }

  if (!isAdmin) {
    return (
      <div style={{ padding: '40px 20px', maxWidth: '600px', margin: '40px auto', textAlign: 'center' }}>
        <div style={{
          background: '#fff',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          border: '1px solid #fee2e2'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: '#fee2e2',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
            margin: '0 auto 16px auto'
          }}>
            <i className="fas fa-lock"></i>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>
            Akses Khusus Admin SPMB
          </h2>
          <p style={{ color: '#64748b', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
            Menu Pembayaran SPMB hanya dapat diakses oleh Administrator dan Bendahara Madrasah.
          </p>
          <Link
            href="/spmb/rekap"
            style={{
              background: '#059669',
              color: '#fff',
              padding: '10px 22px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <i className="fas fa-arrow-left"></i> Kembali ke Rekap Pendaftar
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '12px 16px', maxWidth: '100%', width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
      {/* HEADER SECTION */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '18px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h1 style={{
            fontSize: '1.65rem',
            fontWeight: 800,
            color: '#1e293b',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            margin: 0
          }}>
            <i className="fas fa-wallet" style={{ color: '#059669' }}></i>
            Pembayaran &amp; Daftar Ulang (DPP) SPMB
          </h1>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.88rem' }}>
            Validasi pembayaran DPP, cetak struk POS 80 thermal, kelola keringanan, dan analisis sebaran dana DPP
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={fetchData}
            disabled={loading}
            style={{
              background: '#ffffff',
              border: '1.5px solid #cbd5e1',
              color: '#334155',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '0.86rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i> Refresh
          </button>

          {activeTab === 'daftar_ulang' && (
            <button
              onClick={() => setShowRekapModal(true)}
              style={{
                background: '#059669',
                border: 'none',
                color: '#ffffff',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.86rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)'
              }}
            >
              <i className="fas fa-file-invoice-dollar"></i> Unduh Rekap Pembayaran
            </button>
          )}

          {activeTab === 'sebaran_dpp' && (
            <>
              <button
                onClick={() => setShowAturKomponenModal(true)}
                style={{
                  background: '#eff6ff',
                  border: '1.5px solid #bfdbfe',
                  color: '#1d4ed8',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  fontSize: '0.86rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <i className="fas fa-sliders-h"></i> Atur Komponen Sebaran
              </button>

              <button
                onClick={handleExportExcelSebaran}
                style={{
                  background: '#059669',
                  border: 'none',
                  color: '#ffffff',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '0.86rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)'
                }}
              >
                <i className="fas fa-file-excel"></i> Ekspor Excel (.xlsx)
              </button>
            </>
          )}
        </div>
      </div>

      {/* TOP NAVIGATION TABS (SPMB SUBSITE) */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '20px',
        borderBottom: '2px solid #e2e8f0',
        paddingBottom: '2px',
        overflowX: 'auto'
      }}>
        <Link
          href="/spmb/rekap"
          style={{
            padding: '10px 18px',
            fontSize: '0.92rem',
            fontWeight: 600,
            color: '#64748b',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap'
          }}
        >
          <i className="fas fa-list-alt"></i> Rekap Tabel Data Siswa
        </Link>
        <Link
          href="/spmb/pemantauan"
          style={{
            padding: '10px 18px',
            fontSize: '0.92rem',
            fontWeight: 600,
            color: '#64748b',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap'
          }}
        >
          <i className="fas fa-chart-pie"></i> Menu Pemantauan Input
        </Link>
        <Link
          href="/spmb/pemetaan-kelas"
          style={{
            padding: '10px 18px',
            fontSize: '0.92rem',
            fontWeight: 600,
            color: '#64748b',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap'
          }}
        >
          <i className="fas fa-layer-group"></i> Pemetaan Kelas
        </Link>
        <div
          style={{
            padding: '10px 18px',
            fontSize: '0.92rem',
            fontWeight: 700,
            color: '#059669',
            borderBottom: '3px solid #059669',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap',
            cursor: 'default'
          }}
        >
          <i className="fas fa-wallet"></i> Pembayaran &amp; Daftar Ulang
        </div>
      </div>

      {/* SUMMARY KPI CARDS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '14px',
        marginBottom: '20px'
      }}>
        {/* Card 1: Total Pendaftar */}
        <div style={{
          background: '#ffffff',
          borderRadius: '14px',
          padding: '16px 18px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Total Calon Santri
            </span>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: '#f1f5f9',
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <i className="fas fa-users"></i>
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a' }}>
            {stats.totalSantri}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
            Siswa terdaftar di SPMB
          </div>
        </div>

        {/* Card 2: Total Kewajiban DPP */}
        <div style={{
          background: '#ffffff',
          borderRadius: '14px',
          padding: '16px 18px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Total Tagihan DPP
            </span>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <i className="fas fa-file-invoice-dollar"></i>
            </div>
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#2563eb' }}>
            Rp {formatRupiah(stats.totalTagihan)}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
            Setelah potongan/keringanan
          </div>
        </div>

        {/* Card 3: Total Terbayar */}
        <div style={{
          background: '#ffffff',
          borderRadius: '14px',
          padding: '16px 18px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Dana Masuk (Tervalidasi)
            </span>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: '#ecfdf5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <i className="fas fa-check-double"></i>
            </div>
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#059669' }}>
            Rp {formatRupiah(stats.totalTerbayar)}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 700, marginTop: '4px' }}>
            {stats.totalTagihan > 0 ? `${((stats.totalTerbayar / stats.totalTagihan) * 100).toFixed(1)}% terealisasi` : '0%'}
          </div>
        </div>

        {/* Card 4: Sisa Piutang */}
        <div style={{
          background: '#ffffff',
          borderRadius: '14px',
          padding: '16px 18px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Sisa Piutang DPP
            </span>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: '#fef2f2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <i className="fas fa-hand-holding-usd"></i>
            </div>
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 900, color: stats.totalSisa > 0 ? '#dc2626' : '#15803d' }}>
            Rp {formatRupiah(stats.totalSisa)}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
            Belum terbayarkan
          </div>
        </div>
      </div>

      {/* TABS SWITCHER: TAB 1: DAFTAR ULANG (DPP) vs TAB 2: SEBARAN DPP */}
      <div style={{
        background: '#ffffff',
        borderRadius: '14px',
        padding: '6px',
        display: 'inline-flex',
        gap: '6px',
        border: '1px solid #cbd5e1',
        marginBottom: '18px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <button
          onClick={() => setActiveTab('daftar_ulang')}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            border: 'none',
            fontSize: '0.94rem',
            fontWeight: activeTab === 'daftar_ulang' ? 800 : 600,
            color: activeTab === 'daftar_ulang' ? '#ffffff' : '#64748b',
            background: activeTab === 'daftar_ulang' ? '#059669' : 'transparent',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <i className="fas fa-receipt"></i> 1. Daftar Ulang (DPP)
        </button>
        <button
          onClick={() => setActiveTab('sebaran_dpp')}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            border: 'none',
            fontSize: '0.94rem',
            fontWeight: activeTab === 'sebaran_dpp' ? 800 : 600,
            color: activeTab === 'sebaran_dpp' ? '#ffffff' : '#64748b',
            background: activeTab === 'sebaran_dpp' ? '#059669' : 'transparent',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <i className="fas fa-chart-pie"></i> 2. Sebaran DPP (Alokasi 4.5 Jt)
        </button>
      </div>

      {/* FILTER & PENCARIAN BAR */}
      <div style={{
        background: '#ffffff',
        borderRadius: '14px',
        padding: '16px',
        border: '1px solid #e2e8f0',
        marginBottom: '18px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px'
        }}>
          {/* Pencarian */}
          <div>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
              Cari Calon Siswa
            </label>
            <div style={{ position: 'relative' }}>
              <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}></i>
              <input
                type="text"
                placeholder="Nama / No. Reg / NISN / Sekolah..."
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 34px',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Filter Jalur */}
          <div>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
              Jalur Pendaftaran
            </label>
            <select
              value={filterJalur}
              onChange={e => { setFilterJalur(e.target.value); setCurrentPage(1); }}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1.5px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
                cursor: 'pointer',
                boxSizing: 'border-box'
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

          {/* Filter Status Bayar */}
          <div>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
              Status Pembayaran
            </label>
            <select
              value={filterStatusBayar}
              onChange={e => { setFilterStatusBayar(e.target.value); setCurrentPage(1); }}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1.5px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
                cursor: 'pointer',
                boxSizing: 'border-box'
              }}
            >
              <option value="semua">Semua Status Bayar</option>
              <option value="lunas">✅ Lunas ({stats.countLunas})</option>
              <option value="cicilan">⏳ Cicilan / Titipan ({stats.countCicilan})</option>
              <option value="menunggu_verifikasi">📄 Menunggu Verifikasi ({stats.countMenunggu})</option>
              <option value="belum_bayar">⚪ Belum Bayar ({stats.countBelum})</option>
            </select>
          </div>

          {/* Filter Asal Sekolah */}
          <div>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
              Asal SD / MI
            </label>
            <select
              value={filterSekolah}
              onChange={e => { setFilterSekolah(e.target.value); setCurrentPage(1); }}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1.5px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
                cursor: 'pointer',
                boxSizing: 'border-box'
              }}
            >
              <option value="">Semua Asal Sekolah ({listSekolah.length})</option>
              {listSekolah.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Urutan Sort */}
          <div>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
              Urutkan Data
            </label>
            <select
              value={sortOrder}
              onChange={e => setSortOrder(e.target.value as any)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1.5px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
                cursor: 'pointer',
                boxSizing: 'border-box'
              }}
            >
              <option value="terbaru">Pendaftar Terbaru</option>
              <option value="nama_asc">Nama Siswa (A - Z)</option>
              <option value="nominal_desc">Nominal Terbayar Tertinggi</option>
              <option value="sisa_desc">Sisa Tagihan Tertinggi</option>
            </select>
          </div>
        </div>

        {/* Quick Filter Reset Button */}
        {(searchTerm || filterJalur !== 'semua' || filterStatusBayar !== 'semua' || filterSekolah) && (
          <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterJalur('semua');
                setFilterStatusBayar('semua');
                setFilterSekolah('');
                setCurrentPage(1);
              }}
              style={{
                background: '#fee2e2',
                color: '#b91c1c',
                border: 'none',
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <i className="fas fa-times"></i> Reset Semua Filter
            </button>
          </div>
        )}
      </div>

      {/* TAB 1: DAFTAR ULANG (DPP) */}
      {activeTab === 'daftar_ulang' && (
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden',
          width: '100%'
        }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#1e293b' }}>
                Menampilkan {filteredData.length} Calon Santri ({paginatedData.length} per halaman)
              </div>
              <button
                type="button"
                onClick={() => setShowRekapModal(true)}
                style={{
                  background: '#ecfdf5',
                  border: '1.5px solid #a7f3d0',
                  color: '#047857',
                  padding: '5px 12px',
                  borderRadius: '7px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <i className="fas fa-file-invoice-dollar"></i> Unduh Rekap Masuk (Pilih Tanggal)
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#64748b' }}>
              <span>Tampilkan:</span>
              <select
                value={itemsPerPage}
                onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem'
                }}
              >
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: '1150px', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 14px', fontSize: '0.82rem', fontWeight: 800, color: '#475569', width: '45px', textAlign: 'center' }}>NO</th>
                  <th style={{ padding: '12px 14px', fontSize: '0.82rem', fontWeight: 800, color: '#475569' }}>NO. REG &amp; JALUR</th>
                  <th style={{ padding: '12px 14px', fontSize: '0.82rem', fontWeight: 800, color: '#475569' }}>NAMA CALON SISWA</th>
                  <th style={{ padding: '12px 14px', fontSize: '0.82rem', fontWeight: 800, color: '#475569' }}>ASAL SD / MI</th>
                  <th style={{ padding: '12px 14px', fontSize: '0.82rem', fontWeight: 800, color: '#475569' }}>KEWAJIBAN DPP</th>
                  <th style={{ padding: '12px 14px', fontSize: '0.82rem', fontWeight: 800, color: '#475569' }}>SUDAH DIBAYAR</th>
                  <th style={{ padding: '12px 14px', fontSize: '0.82rem', fontWeight: 800, color: '#475569' }}>SISA TAGIHAN</th>
                  <th style={{ padding: '12px 14px', fontSize: '0.82rem', fontWeight: 800, color: '#475569' }}>STATUS BAYAR</th>
                  <th style={{ padding: '12px 14px', fontSize: '0.82rem', fontWeight: 800, color: '#475569' }}>BUKTI TF</th>
                  <th style={{ padding: '12px 14px', fontSize: '0.82rem', fontWeight: 800, color: '#475569', textAlign: 'center' }}>AKSI</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8', fontSize: '0.92rem' }}>
                      <i className="fas fa-inbox" style={{ fontSize: '2rem', marginBottom: '8px', display: 'block' }}></i>
                      Tidak ada data siswa yang cocok dengan filter.
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((item, idx) => {
                    const rowNo = (currentPage - 1) * itemsPerPage + idx + 1;
                    const fin = getStudentFinance(item);
                    const riwayatCount = Array.isArray(item.riwayatBuktiDaftarUlang) ? item.riwayatBuktiDaftarUlang.length : (item.buktiDaftarUlang ? 1 : 0);

                    return (
                      <tr key={item.id || item.rowNumber || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 600, color: '#64748b' }}>
                          {rowNo}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.88rem' }}>
                            {item.nomorPendaftaran || '-'}
                          </div>
                          <span style={{
                            display: 'inline-block',
                            marginTop: '2px',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: '#f1f5f9',
                            color: '#475569',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            textTransform: 'uppercase'
                          }}>
                            {item.jalurPendaftaran || 'Reguler'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.92rem' }}>
                            {item.namaLengkap}
                          </div>
                          {item.nisn && (
                            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                              NISN: {item.nisn}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 600, color: '#334155', fontSize: '0.88rem' }}>
                            {item.asalSekolah || '-'}
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>
                            Rp {formatRupiah(fin.tagihan)}
                          </div>
                          {fin.pot > 0 && (
                            <div style={{ fontSize: '0.74rem', color: '#047857', fontWeight: 600 }}>
                              Potongan: -Rp {formatRupiah(fin.pot)}
                              {item.keteranganPotongan ? ` (${item.keteranganPotongan})` : ''}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 800, color: fin.dibayar > 0 ? '#15803d' : '#64748b', fontSize: '0.9rem' }}>
                            Rp {formatRupiah(fin.dibayar)}
                          </div>
                          {item.tglBayarDaftarUlang && (
                            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                              {item.tglBayarDaftarUlang.includes('T') ? item.tglBayarDaftarUlang.split('T')[0] : item.tglBayarDaftarUlang}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 800, color: fin.sisa > 0 ? '#b91c1c' : '#15803d', fontSize: '0.9rem' }}>
                            Rp {formatRupiah(fin.sisa)}
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          {fin.status === 'lunas' && (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '0.78rem',
                              fontWeight: 800,
                              background: '#dcfce7',
                              color: '#15803d',
                              border: '1px solid #86efac'
                            }}>
                              <i className="fas fa-check-circle"></i> LUNAS
                            </span>
                          )}
                          {fin.status === 'cicilan' && (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '0.78rem',
                              fontWeight: 800,
                              background: '#fef3c7',
                              color: '#b45309',
                              border: '1px solid #fde68a'
                            }}>
                              <i className="fas fa-clock"></i> CICILAN
                            </span>
                          )}
                          {fin.status === 'menunggu_verifikasi' && (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '0.78rem',
                              fontWeight: 800,
                              background: '#e0f2fe',
                              color: '#0369a1',
                              border: '1px solid #bae6fd'
                            }}>
                              <i className="fas fa-file-invoice-dollar"></i> CEK BUKTI
                            </span>
                          )}
                          {fin.status === 'belum_bayar' && (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              background: '#f1f5f9',
                              color: '#64748b',
                              border: '1px solid #cbd5e1'
                            }}>
                              Belum Bayar
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          {item.buktiDaftarUlang ? (
                            <button
                              type="button"
                              onClick={() => openViewer(item.buktiDaftarUlang, `Bukti Transfer - ${item.namaLengkap}`)}
                              style={{
                                background: '#eff6ff',
                                color: '#1d4ed8',
                                border: '1px solid #bfdbfe',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              title="Lihat Bukti Transfer"
                            >
                              <i className="fas fa-receipt"></i> Bukti{riwayatCount > 1 ? ` (${riwayatCount})` : ''}
                            </button>
                          ) : (
                            <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>Tidak Ada</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedForDaftarUlang(item);
                                setShowDaftarUlangModal(true);
                              }}
                              style={{
                                background: '#ecfdf5',
                                color: '#047857',
                                border: '1px solid #a7f3d0',
                                padding: '5px 10px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              title="Validasi Pembayaran & Potongan"
                            >
                              <i className="fas fa-coins"></i> Validasi
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedForPrint(item);
                                setShowPrintModal(true);
                              }}
                              style={{
                                background: '#f8fafc',
                                color: '#334155',
                                border: '1.5px solid #cbd5e1',
                                padding: '5px 10px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              title="Cetak Struk POS 80 Thermal"
                            >
                              <i className="fas fa-print"></i> Cetak POS 80
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{
              padding: '14px 18px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Halaman <b>{currentPage}</b> dari <b>{totalPages}</b>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: currentPage === 1 ? '#f1f5f9' : '#ffffff',
                    color: currentPage === 1 ? '#94a3b8' : '#334155',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                  }}
                >
                  <i className="fas fa-chevron-left"></i> Sebelumnya
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: currentPage === totalPages ? '#f1f5f9' : '#ffffff',
                    color: currentPage === totalPages ? '#94a3b8' : '#334155',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                  }}
                >
                  Berikutnya <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SEBARAN DPP (PLOTING DANA 4.5 JT) */}
      {activeTab === 'sebaran_dpp' && (
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden',
          width: '100%'
        }}>
          {/* Info Banner Sebaran DPP */}
          <div style={{
            background: '#f8fafc',
            borderBottom: '1.5px solid #e2e8f0',
            padding: '14px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                <i className="fas fa-project-diagram" style={{ color: '#2563eb', marginRight: '6px' }}></i>
                Matriks Ploting Sebaran Uang DPP Santri Baru
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                Menampilkan sebaran alokasi dana DPP (standar Rp 4.500.000 atau tagihan bersih santri) ke dalam pos-pos alokasi madrasah.
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setShowAturKomponenModal(true)}
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #cbd5e1',
                  color: '#1e293b',
                  padding: '7px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <i className="fas fa-cog"></i> Atur Pos Ploting ({komponenList.length} Kolom)
              </button>
            </div>
          </div>

          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: '1350px', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                  <th style={{ padding: '12px 14px', fontSize: '0.82rem', fontWeight: 800, color: '#334155', width: '45px', textAlign: 'center' }}>NO</th>
                  <th style={{ padding: '12px 14px', fontSize: '0.82rem', fontWeight: 800, color: '#334155' }}>NAMA CALON SISWA</th>
                  <th style={{ padding: '12px 14px', fontSize: '0.82rem', fontWeight: 800, color: '#334155' }}>JALUR</th>
                  <th style={{ padding: '12px 14px', fontSize: '0.82rem', fontWeight: 800, color: '#334155' }}>ASAL SD / MI</th>
                  <th style={{ padding: '12px 14px', fontSize: '0.82rem', fontWeight: 800, color: '#047857', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    UANG DPP (MASUK)
                    <div style={{ fontSize: '10px', color: '#059669', fontWeight: 600 }}>
                      (Tervalidasi)
                    </div>
                  </th>

                  {/* Dynamic Columns Ploting */}
                  {komponenList.map(k => (
                    <th key={k.id} style={{ padding: '12px 14px', fontSize: '0.82rem', fontWeight: 800, color: '#1e40af', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {k.nama.toUpperCase()}
                      <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 500 }}>
                        (Std: Rp {formatRupiah(k.nominal)})
                      </div>
                    </th>
                  ))}

                  <th style={{ padding: '12px 14px', fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', textAlign: 'right' }}>TOTAL PLOTING</th>
                  <th style={{ padding: '12px 14px', fontSize: '0.82rem', fontWeight: 800, color: '#475569', textAlign: 'right' }}>SELISIH</th>
                  <th style={{ padding: '12px 14px', fontSize: '0.82rem', fontWeight: 800, color: '#475569', textAlign: 'center' }}>AKSI</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={8 + komponenList.length} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8', fontSize: '0.92rem' }}>
                      <i className="fas fa-inbox" style={{ fontSize: '2rem', marginBottom: '8px', display: 'block' }}></i>
                      Tidak ada data siswa yang cocok dengan filter.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((item, idx) => {
                    const s = getStudentSebaranValues(item);
                    const isCustomized = item.sebaranDpp && Object.keys(item.sebaranDpp).length > 0;

                    return (
                      <tr key={item.id || item.rowNumber || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600, color: '#64748b' }}>
                          {idx + 1}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.88rem' }}>
                            {item.namaLengkap}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {item.nomorPendaftaran}
                          </div>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: '#f1f5f9',
                            color: '#475569',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            textTransform: 'uppercase'
                          }}>
                            {item.jalurPendaftaran || 'Reguler'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: '0.85rem', color: '#334155' }}>
                          {item.asalSekolah || '-'}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, color: '#047857', fontSize: '0.88rem' }}>
                          Rp {formatRupiah(s.uangDpp)}
                          {s.fin.sisa > 0 && s.fin.dibayar > 0 && (
                            <div style={{ fontSize: '10px', color: '#b45309', fontWeight: 600 }}>
                              Kurang: Rp {formatRupiah(s.fin.sisa)}
                            </div>
                          )}
                          {s.fin.status === 'belum_bayar' && (
                            <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 500 }}>
                              Belum Bayar
                            </div>
                          )}
                        </td>

                        {/* Ploting values per component */}
                        {komponenList.map(k => (
                          <td key={k.id} style={{ padding: '10px 14px', textAlign: 'right', fontSize: '0.88rem', color: '#1e293b' }}>
                            Rp {formatRupiah(s.values[k.id] || 0)}
                          </td>
                        ))}

                        <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, color: '#0f172a', fontSize: '0.88rem' }}>
                          Rp {formatRupiah(s.totalPloting)}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: '0.86rem' }}>
                          {s.selisih === 0 ? (
                            <span style={{ color: '#15803d', fontWeight: 700 }}>0 (Pas)</span>
                          ) : s.selisih > 0 ? (
                            <span style={{ color: '#b45309', fontWeight: 700 }}>+Rp {formatRupiah(s.selisih)}</span>
                          ) : (
                            <span style={{ color: '#b91c1c', fontWeight: 700 }}>-Rp {formatRupiah(Math.abs(s.selisih))}</span>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedForPloting(item);
                              setShowEditPlotingModal(true);
                            }}
                            style={{
                              background: isCustomized ? '#eff6ff' : '#f8fafc',
                              color: isCustomized ? '#1d4ed8' : '#475569',
                              border: `1px solid ${isCustomized ? '#bfdbfe' : '#cbd5e1'}`,
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title="Sesuaikan Ploting Khusus Siswa Ini"
                          >
                            <i className="fas fa-edit"></i> {isCustomized ? 'Custom' : 'Edit'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* FOOTER TOTAL SUMMARY (JUMLAH-JUMLAH DI AKHIR TABEL) */}
              {filteredData.length > 0 && (
                <tfoot>
                  <tr style={{ background: '#ecfdf5', borderTop: '2px solid #059669', borderBottom: '2px solid #059669' }}>
                    <td colSpan={4} style={{ padding: '14px', fontWeight: 900, color: '#065f46', fontSize: '0.92rem', textAlign: 'center' }}>
                      TOTAL KESELURUHAN ({filteredData.length} Calon Santri)
                    </td>
                    <td style={{ padding: '14px', textAlign: 'right', fontWeight: 900, color: '#047857', fontSize: '0.94rem' }}>
                      Rp {formatRupiah(sebaranTotals.sumUangDpp)}
                    </td>

                    {/* Total per column */}
                    {komponenList.map(k => (
                      <td key={k.id} style={{ padding: '14px', textAlign: 'right', fontWeight: 800, color: '#1e40af', fontSize: '0.9rem' }}>
                        Rp {formatRupiah(sebaranTotals.compSums[k.id] || 0)}
                      </td>
                    ))}

                    <td style={{ padding: '14px', textAlign: 'right', fontWeight: 900, color: '#0f172a', fontSize: '0.94rem' }}>
                      Rp {formatRupiah(sebaranTotals.sumTotalPloting)}
                    </td>
                    <td style={{ padding: '14px', textAlign: 'right', fontWeight: 900, fontSize: '0.92rem' }}>
                      <span style={{ color: sebaranTotals.sumSelisih === 0 ? '#15803d' : sebaranTotals.sumSelisih > 0 ? '#b45309' : '#b91c1c' }}>
                        Rp {formatRupiah(sebaranTotals.sumSelisih)}
                      </span>
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: VALIDASI & DAFTAR ULANG */}
      {showDaftarUlangModal && selectedForDaftarUlang && (
        <ModalDaftarUlang
          isOpen={showDaftarUlangModal}
          onClose={() => {
            setShowDaftarUlangModal(false);
            setSelectedForDaftarUlang(null);
          }}
          student={selectedForDaftarUlang}
          onSuccess={(updated) => {
            setData(prev => prev.map(s => s.rowNumber === updated.rowNumber ? { ...s, ...updated } : s));
          }}
          onOpenViewer={openViewer}
          onPrintPos80={(studentToPrint) => {
            setSelectedForPrint(studentToPrint);
            setShowPrintModal(true);
          }}
        />
      )}

      {/* MODAL 2: CETAK STRUK POS 80 */}
      {showPrintModal && selectedForPrint && (
        <ModalCetakStrukPos80
          isOpen={showPrintModal}
          onClose={() => {
            setShowPrintModal(false);
            setSelectedForPrint(null);
          }}
          student={selectedForPrint}
        />
      )}

      {/* MODAL 3: ATUR KOMPONEN SEBARAN DPP */}
      {showAturKomponenModal && (
        <ModalAturSebaranDpp
          isOpen={showAturKomponenModal}
          onClose={() => setShowAturKomponenModal(false)}
          initialKomponen={komponenList}
          onSaveSuccess={(updated) => {
            setKomponenList(updated);
          }}
        />
      )}

      {/* MODAL 4: EDIT PLOTING SISWA */}
      {showEditPlotingModal && selectedForPloting && (
        <ModalEditPlotingSiswa
          isOpen={showEditPlotingModal}
          onClose={() => {
            setShowEditPlotingModal(false);
            setSelectedForPloting(null);
          }}
          student={selectedForPloting}
          komponenList={komponenList}
          onSaveSuccess={(updated) => {
            setData(prev => prev.map(s => s.rowNumber === updated.rowNumber ? { ...s, ...updated } : s));
          }}
        />
      )}

      {/* MODAL 5: REKAP PEMBAYARAN MASUK (RENTANG TANGGAL) */}
      {showRekapModal && (
        <ModalRekapPembayaran
          isOpen={showRekapModal}
          onClose={() => setShowRekapModal(false)}
          data={data}
        />
      )}

      {/* DOCUMENT VIEWER MODAL */}
      {viewerUrl && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 999999,
          padding: '20px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
            color: 'white'
          }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{viewerTitle || 'Pratinjau Dokumen'}</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <a
                href={viewerUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  background: 'white',
                  color: '#1e293b',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 600
                }}
              >
                <i className="fas fa-external-link-alt"></i> Tab Baru
              </a>
              <button
                onClick={() => setViewerUrl(null)}
                style={{
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Tutup
              </button>
            </div>
          </div>
          <div style={{
            flex: 1,
            backgroundColor: 'white',
            borderRadius: '12px',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {viewerUrl.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/i) || viewerUrl.includes('drive.google.com/uc?') ? (
              <img
                src={viewerUrl}
                alt="Bukti Transfer"
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              />
            ) : (
              <iframe
                src={viewerUrl}
                style={{ width: '100%', height: '100%', border: 'none' }}
                title="Viewer Dokumen"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
