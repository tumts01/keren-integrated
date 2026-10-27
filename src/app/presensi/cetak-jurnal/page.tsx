'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import LoadingScreen from '@/components/LoadingScreen';

interface JurnalItem {
  id: string;
  tanggal: string;
  jamKe: string;
  kelas: string;
  mapel: string;
  namaGuru: string;
  materi: string;
  tahunAjaran?: string;
}

interface WaliInfo {
  rombel: string;
  nama: string;
  nip: string;
}

function cleanJamKe(val: string): string {
  if (!val) return '';
  return val.replace(/,(19|20)\d{2}$/g, '').replace(/^'/, '').trim();
}

function formatTanggalIndo(tglStr: string): { hari: string; tanggalFormat: string } {
  if (!tglStr) return { hari: '-', tanggalFormat: '-' };
  try {
    const d = new Date(tglStr);
    if (isNaN(d.getTime())) return { hari: '-', tanggalFormat: tglStr };
    const hari = d.toLocaleDateString('id-ID', { weekday: 'long' });
    const tanggalFormat = d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return { hari, tanggalFormat };
  } catch {
    return { hari: '-', tanggalFormat: tglStr };
  }
}

function CetakJurnalContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const rawKelasParam = searchParams.get('kelas') || '7A';
  const initialBulan = searchParams.get('bulan') || (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  })();

  const [selectedBulan, setSelectedBulan] = useState(initialBulan);
  const [kelasList, setKelasList] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>(() => {
    if (rawKelasParam.toUpperCase() === 'ALL') return [];
    return rawKelasParam
      .split(',')
      .map(k => k.trim().toUpperCase())
      .filter(Boolean);
  });

  const [jurnalRecords, setJurnalRecords] = useState<JurnalItem[]>([]);
  const [waliMap, setWaliMap] = useState<Record<string, WaliInfo>>({});
  const [loading, setLoading] = useState(true);

  // Parse Year and Month
  const { year, month, daysInMonth, monthName, tahunPelajaran } = useMemo(() => {
    const parts = selectedBulan.split('-');
    const y = parseInt(parts[0], 10) || new Date().getFullYear();
    const m = parseInt(parts[1], 10) || (new Date().getMonth() + 1);
    const dCount = new Date(y, m, 0).getDate();

    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const mName = monthNames[m - 1] || '';
    const ta = m >= 7 ? `${y}/${y + 1}` : `${y - 1}/${y}`;

    return {
      year: y,
      month: m,
      daysInMonth: dCount,
      monthName: mName,
      tahunPelajaran: ta
    };
  }, [selectedBulan]);

  // Load all classes from API
  useEffect(() => {
    fetch('/api/kelas')
      .then(r => r.json())
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          const kNames = res.data
            .map((k: any) => k.rombel || k.metadata?.['ROMBEL'] || '')
            .filter(Boolean);
          const uniq = Array.from(new Set(kNames)).sort() as string[];
          if (uniq.length > 0) {
            setKelasList(uniq);
            if (rawKelasParam.toUpperCase() === 'ALL') {
              setSelectedClasses(uniq);
            }
          }
        }
      })
      .catch(() => {});
  }, [rawKelasParam]);

  // Load Wali Kelas for all classes
  useEffect(() => {
    fetch('/api/portal/wali-kelas?kelas=ALL')
      .then(r => r.json())
      .then(res => {
        if (res.success && res.data) {
          setWaliMap(res.data);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch Jurnal Data for selected Month
  useEffect(() => {
    if (!selectedBulan) return;
    setLoading(true);

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

    fetch(`/api/jurnal?from=${startDate}&to=${endDate}`)
      .then(r => r.json())
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          const mapped = res.data.map((r: any) => ({
            id: r.id || '',
            tanggal: r.tanggal || '',
            jamKe: cleanJamKe(r.jamKe || ''),
            kelas: (r.kelas || '').trim().toUpperCase(),
            mapel: r.mapel || '',
            namaGuru: r.namaGuru || '',
            materi: r.materi || '',
            tahunAjaran: r.tahunAjaran || ''
          }));
          setJurnalRecords(mapped);
        }
      })
      .catch((err) => {
        console.error('Error loading jurnal data:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [selectedBulan, year, month, daysInMonth]);

  // Effective classes to render
  const effectiveClasses = useMemo(() => {
    if (selectedClasses.length > 0) return selectedClasses;
    if (kelasList.length > 0) return [kelasList[0]];
    return ['7A'];
  }, [selectedClasses, kelasList]);

  // Aggregate Data for Each Class
  const classReports = useMemo(() => {
    return effectiveClasses.map(cls => {
      const clsClean = cls.trim().toUpperCase();
      const records = jurnalRecords
        .filter(r => {
          const rk = r.kelas;
          return rk === clsClean || rk.replace(/[^A-Z0-9]/g, '') === clsClean.replace(/[^A-Z0-9]/g, '');
        })
        .sort((a, b) => {
          // Sort ascending by date
          if (a.tanggal !== b.tanggal) return a.tanggal.localeCompare(b.tanggal);
          // Then ascending by jam
          const jamA = parseInt(a.jamKe.split(',')[0], 10) || 0;
          const jamB = parseInt(b.jamKe.split(',')[0], 10) || 0;
          return jamA - jamB;
        });

      const wali = waliMap[clsClean] || waliMap[clsClean.replace(/[^A-Z0-9]/g, '')] || {
        rombel: clsClean,
        nama: '',
        nip: ''
      };

      return {
        kelas: clsClean,
        records,
        wali
      };
    });
  }, [effectiveClasses, jurnalRecords, waliMap]);

  // Tanggal Tanda Tangan
  const tanggalTtd = `${daysInMonth} ${monthName} ${year}`;

  // Export to Excel function
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    const buildSheetAoa = (items: JurnalItem[], titleKelas?: string) => {
      const aoa: any[][] = [
        ['RINCIAN JURNAL MENGAJAR HARIAN'],
        ['MTs ALMAARIF 01 SINGOSARI'],
        [titleKelas ? `Kelas: ${titleKelas}  |  Periode: ${monthName} ${year}` : `Periode: ${monthName} ${year}`],
        [],
        ['No', 'Kelas', 'Hari', 'Tanggal', 'Jam Ke', 'Mata Pelajaran', 'Nama Guru', 'Materi Pembelajaran']
      ];

      items.forEach((r, idx) => {
        const { hari, tanggalFormat } = formatTanggalIndo(r.tanggal);
        aoa.push([
          idx + 1,
          r.kelas || '-',
          hari,
          tanggalFormat,
          r.jamKe || '-',
          r.mapel || '-',
          r.namaGuru || '-',
          r.materi || '-'
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws['!cols'] = [
        { wch: 5 },   // No
        { wch: 8 },   // Kelas
        { wch: 10 },  // Hari
        { wch: 12 },  // Tanggal
        { wch: 10 },  // Jam Ke
        { wch: 25 },  // Mapel
        { wch: 32 },  // Nama Guru
        { wch: 65 }   // Materi
      ];
      return ws;
    };

    // Filter all records for selected classes
    const allSelectedRecords = jurnalRecords
      .filter(r => effectiveClasses.includes(r.kelas) || effectiveClasses.includes(r.kelas.replace(/[^A-Z0-9]/g, '')))
      .sort((a, b) => {
        if (a.kelas !== b.kelas) return a.kelas.localeCompare(b.kelas);
        if (a.tanggal !== b.tanggal) return a.tanggal.localeCompare(b.tanggal);
        const jamA = parseInt(a.jamKe.split(',')[0], 10) || 0;
        const jamB = parseInt(b.jamKe.split(',')[0], 10) || 0;
        return jamA - jamB;
      });

    // 1. Master sheet
    const masterSheet = buildSheetAoa(allSelectedRecords);
    XLSX.utils.book_append_sheet(wb, masterSheet, 'Semua Kelas');

    // 2. Individual sheets per class if multiple classes selected
    if (effectiveClasses.length > 1) {
      effectiveClasses.forEach(cls => {
        const clsClean = cls.trim().toUpperCase();
        const clsItems = allSelectedRecords.filter(r => r.kelas === clsClean || r.kelas.replace(/[^A-Z0-9]/g, '') === clsClean.replace(/[^A-Z0-9]/g, ''));
        if (clsItems.length > 0) {
          const sheetName = clsClean.slice(0, 31);
          const ws = buildSheetAoa(clsItems, clsClean);
          XLSX.utils.book_append_sheet(wb, ws, sheetName);
        }
      });
    }

    const fileName = effectiveClasses.length === 1
      ? `Rincian_Jurnal_${effectiveClasses[0]}_${selectedBulan}.xlsx`
      : `Rincian_Jurnal_${effectiveClasses.length}_Kelas_${selectedBulan}.xlsx`;

    XLSX.writeFile(wb, fileName);
  };

  // Open modal to change classes
  const handleOpenClassPicker = async () => {
    const classSource = kelasList.length > 0 ? kelasList : ['7A', '7B', '7C', '7D', '7E', '7F', '7G', '7H', '7I', '8A', '8B', '8C', '8D', '8E', '8F', '8G', '8H', '8I', '9A', '9B', '9C', '9D', '9E', '9F', '9G', '9H'];

    const checkboxesHtml = classSource.map((k: string) => {
      const isChecked = effectiveClasses.includes(k);
      return `
        <label style="display: flex; align-items: center; gap: 6px; padding: 6px 8px; background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 6px; cursor: pointer; font-size: 0.82rem; font-weight: 700; color: #1e293b; user-select: none;">
          <input type="checkbox" class="modal-jurnal-cb" value="${k}" ${isChecked ? 'checked' : ''} style="cursor: pointer; width: 15px; height: 15px; accent-color: #0284c7;" />
          <span>${k}</span>
        </label>
      `;
    }).join('');

    const { value: selected } = await Swal.fire({
      title: 'Pilih Kelas Rincian Jurnal',
      width: 580,
      html: `
        <div style="text-align: left; font-size: 0.88rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <label style="font-weight: 700; color: #334155;">Pilih satu atau beberapa kelas:</label>
            <div style="display: flex; gap: 4px; flex-wrap: wrap;">
              <button type="button" id="mj-btn-all" style="background: #0284c7; color: white; border: none; padding: 2px 7px; border-radius: 4px; font-size: 0.72rem; font-weight: 700; cursor: pointer;">Semua</button>
              <button type="button" id="mj-btn-7" style="background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; padding: 2px 6px; border-radius: 4px; font-size: 0.72rem; font-weight: 700; cursor: pointer;">Kls 7</button>
              <button type="button" id="mj-btn-8" style="background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; padding: 2px 6px; border-radius: 4px; font-size: 0.72rem; font-weight: 700; cursor: pointer;">Kls 8</button>
              <button type="button" id="mj-btn-9" style="background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; padding: 2px 6px; border-radius: 4px; font-size: 0.72rem; font-weight: 700; cursor: pointer;">Kls 9</button>
              <button type="button" id="mj-btn-clear" style="background: #fee2e2; color: #dc2626; border: 1px solid #fecaca; padding: 2px 6px; border-radius: 4px; font-size: 0.72rem; font-weight: 700; cursor: pointer;">Reset</button>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; max-height: 220px; overflow-y: auto; padding: 8px; border: 1.5px solid #cbd5e1; border-radius: 8px; background: #f8fafc;">
            ${checkboxesHtml}
          </div>
        </div>
      `,
      didOpen: () => {
        document.getElementById('mj-btn-all')?.addEventListener('click', () => {
          document.querySelectorAll('.modal-jurnal-cb').forEach(cb => ((cb as HTMLInputElement).checked = true));
        });
        document.getElementById('mj-btn-clear')?.addEventListener('click', () => {
          document.querySelectorAll('.modal-jurnal-cb').forEach(cb => ((cb as HTMLInputElement).checked = false));
        });
        document.getElementById('mj-btn-7')?.addEventListener('click', () => {
          document.querySelectorAll('.modal-jurnal-cb').forEach(cb => {
            const input = cb as HTMLInputElement;
            if (input.value.startsWith('7')) input.checked = true;
          });
        });
        document.getElementById('mj-btn-8')?.addEventListener('click', () => {
          document.querySelectorAll('.modal-jurnal-cb').forEach(cb => {
            const input = cb as HTMLInputElement;
            if (input.value.startsWith('8')) input.checked = true;
          });
        });
        document.getElementById('mj-btn-9')?.addEventListener('click', () => {
          document.querySelectorAll('.modal-jurnal-cb').forEach(cb => {
            const input = cb as HTMLInputElement;
            if (input.value.startsWith('9')) input.checked = true;
          });
        });
      },
      showCancelButton: true,
      confirmButtonColor: '#0284c7',
      confirmButtonText: 'Terapkan Pilihan',
      cancelButtonText: 'Batal',
      preConfirm: () => {
        const checked = Array.from(document.querySelectorAll('.modal-jurnal-cb:checked')) as HTMLInputElement[];
        if (checked.length === 0) {
          Swal.showValidationMessage('Mohon pilih minimal 1 kelas!');
          return false;
        }
        return checked.map(c => c.value);
      }
    });

    if (selected && Array.isArray(selected) && selected.length > 0) {
      setSelectedClasses(selected);
      router.replace(`/presensi/cetak-jurnal?kelas=${encodeURIComponent(selected.join(','))}&bulan=${encodeURIComponent(selectedBulan)}`);
    }
  };

  return (
    <div style={{ background: '#f1f5f9', minHeight: '100vh', fontFamily: 'Arial, sans-serif', color: '#000000' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4 landscape;
            margin: 6mm 6mm;
          }
          html, body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .print-container {
            padding: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
          }
          .class-sheet {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            page-break-after: always !important;
            break-after: page !important;
          }
          .class-sheet:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
          }
          thead {
            display: table-header-group;
          }
          tfoot {
            display: table-footer-group;
          }
        }
      `}} />

      {/* Floating Toolbar (No Print) */}
      <div className="no-print" style={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        background: '#ffffff',
        borderBottom: '1px solid #cbd5e1',
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        boxShadow: '0 2px 10px rgba(0,0,0,0.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {/* Class Picker Trigger */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>Kelas:</span>
            <button
              onClick={handleOpenClassPicker}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1.5px solid #0284c7',
                fontWeight: 700,
                fontSize: '12px',
                background: '#f0f9ff',
                color: '#0369a1',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
              title="Klik untuk memilih atau mengubah kelas yang akan dicetak/diexport"
            >
              <i className="fas fa-layer-group"></i>
              {effectiveClasses.length === 1
                ? `Kelas ${effectiveClasses[0]}`
                : `${effectiveClasses.length} Kelas Dipilih (${effectiveClasses.slice(0, 3).join(', ')}${effectiveClasses.length > 3 ? '...' : ''})`}
              <i className="fas fa-caret-down" style={{ marginLeft: 2 }}></i>
            </button>
          </div>

          {/* Month Picker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>Bulan:</label>
            <input
              type="month"
              value={selectedBulan}
              onChange={(e) => {
                setSelectedBulan(e.target.value);
                router.replace(`/presensi/cetak-jurnal?kelas=${encodeURIComponent(effectiveClasses.join(','))}&bulan=${encodeURIComponent(e.target.value)}`);
              }}
              style={{
                padding: '5px 10px',
                borderRadius: '6px',
                border: '1.5px solid #0284c7',
                fontWeight: 600,
                fontSize: '13px',
                background: '#f0f9ff',
                color: '#0369a1',
                cursor: 'pointer'
              }}
            />
          </div>

          {/* Quick jump between classes if multiple */}
          {effectiveClasses.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Lompat ke:</label>
              <select
                onChange={(e) => {
                  const target = document.getElementById(`sheet-jurnal-${e.target.value}`);
                  if (target) target.scrollIntoView({ behavior: 'smooth' });
                }}
                style={{
                  padding: '5px 8px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12px',
                  background: '#ffffff',
                  cursor: 'pointer'
                }}
              >
                {effectiveClasses.map(k => (
                  <option key={k} value={k}>Kelas {k}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={handleExportExcel}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              background: '#16a34a',
              color: '#ffffff',
              border: 'none',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 2px 6px rgba(22,163,74,0.3)'
            }}
          >
            <i className="fas fa-file-excel"></i> Export Excel
          </button>

          <button
            onClick={() => window.print()}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              background: '#0284c7',
              color: '#ffffff',
              border: 'none',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 2px 6px rgba(2,132,199,0.3)'
            }}
          >
            <i className="fas fa-print"></i> Cetak / Simpan PDF ({effectiveClasses.length} Dokumen)
          </button>

          <button
            onClick={() => {
              if (window.opener) {
                window.close();
              } else {
                router.push('/presensi');
              }
            }}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              background: '#e2e8f0',
              color: '#475569',
              border: 'none',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            Kembali
          </button>
        </div>
      </div>

      {/* Printable Sheets Container */}
      <div className="print-container" style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '30px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#64748b' }}>
            <i className="fas fa-spinner fa-spin fa-2x" style={{ color: '#0284c7', marginBottom: '12px' }}></i>
            <div style={{ fontWeight: 600, fontSize: '14px' }}>Memuat dan menyusun rincian jurnal {effectiveClasses.length} kelas...</div>
          </div>
        ) : (
          classReports.map((report) => (
            <div
              key={report.kelas}
              id={`sheet-jurnal-${report.kelas}`}
              className="class-sheet"
              style={{
                background: '#ffffff',
                width: '100%',
                maxWidth: '287mm',
                padding: '8mm 8mm',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                boxSizing: 'border-box',
                borderRadius: '6px'
              }}
            >
              {/* Kop Surat Madrasah */}
              <div style={{ textAlign: 'center', marginBottom: '6px' }}>
                <img
                  src="/kop_surat_mts.png"
                  alt="Kop Surat MTs Almaarif 01 Singosari"
                  style={{
                    width: '100%',
                    maxHeight: '74px',
                    objectFit: 'contain',
                    display: 'block',
                    margin: '0 auto'
                  }}
                />
              </div>

              {/* Title Block */}
              <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                <h2 style={{
                  margin: 0,
                  fontSize: '12pt',
                  fontWeight: 900,
                  letterSpacing: '0.4px',
                  textTransform: 'uppercase',
                  color: '#000000',
                  lineHeight: 1.2
                }}>
                  RINCIAN JURNAL AGENDA MENGAJAR KELAS
                </h2>
                <div style={{
                  fontSize: '9.5pt',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  marginTop: '1px',
                  color: '#000000'
                }}>
                  MTs ALMAARIF 01 SINGOSARI
                </div>
                <div style={{
                  fontSize: '8.5pt',
                  fontWeight: 700,
                  marginTop: '1px',
                  color: '#000000'
                }}>
                  Tahun Pelajaran {tahunPelajaran}
                </div>
              </div>

              {/* Meta Grid 2 Kolom */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '8.5pt',
                fontWeight: 700,
                marginBottom: '8px',
                color: '#000000',
                lineHeight: 1.3
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div style={{ display: 'flex' }}>
                    <span style={{ width: '85px' }}>Kelas</span>
                    <span>: <strong>{report.kelas}</strong></span>
                  </div>
                  <div style={{ display: 'flex' }}>
                    <span style={{ width: '85px' }}>Wali Kelas</span>
                    <span>: <strong>{report.wali.nama || '-'}</strong></span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <span style={{ width: '100px', textAlign: 'left' }}>Bulan</span>
                    <span style={{ textAlign: 'left' }}>: <strong>{monthName} {year}</strong></span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <span style={{ width: '100px', textAlign: 'left' }}>Total Entri</span>
                    <span style={{ textAlign: 'left' }}>
                      : <strong>{report.records.length}</strong> Kegiatan KBM
                    </span>
                  </div>
                </div>
              </div>

              {/* Main Jurnal Table */}
              <div style={{ width: '100%', overflowX: 'auto' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '7.5pt',
                  fontFamily: 'Arial, sans-serif',
                  border: '1.5px solid #000000',
                  color: '#000000'
                }}>
                  <thead>
                    <tr style={{ background: '#dbeafe', textAlign: 'center', fontWeight: 800, color: '#000000' }}>
                      <th style={{ width: '24px', border: '1px solid #000000', padding: '5px 2px' }}>NO</th>
                      <th style={{ width: '75px', border: '1px solid #000000', padding: '5px 4px' }}>Hari</th>
                      <th style={{ width: '75px', border: '1px solid #000000', padding: '5px 4px' }}>Tanggal</th>
                      <th style={{ width: '60px', border: '1px solid #000000', padding: '5px 3px' }}>Jam Ke</th>
                      <th style={{ width: '135px', border: '1px solid #000000', padding: '5px 4px', textAlign: 'left' }}>Mata Pelajaran</th>
                      <th style={{ width: '170px', border: '1px solid #000000', padding: '5px 4px', textAlign: 'left' }}>Guru Pengajar</th>
                      <th style={{ border: '1px solid #000000', padding: '5px 6px', textAlign: 'left' }}>Materi Pembahasan / KBM</th>
                      <th style={{ width: '55px', border: '1px solid #000000', padding: '5px 2px' }}>Paraf</th>
                    </tr>
                  </thead>

                  <tbody>
                    {report.records.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '30px', border: '1px solid #000000', color: '#64748b' }}>
                          Tidak ada catatan jurnal mengajar di kelas {report.kelas} pada bulan {monthName} {year}.
                        </td>
                      </tr>
                    ) : (
                      report.records.map((r, i) => {
                        const { hari, tanggalFormat } = formatTanggalIndo(r.tanggal);
                        return (
                          <tr key={r.id || i} style={{ background: i % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                            <td style={{ border: '1px solid #000000', padding: '3.5px 2px', textAlign: 'center' }}>{i + 1}</td>
                            <td style={{ border: '1px solid #000000', padding: '3.5px 4px', textAlign: 'center', whiteSpace: 'nowrap' }}>{hari}</td>
                            <td style={{ border: '1px solid #000000', padding: '3.5px 4px', textAlign: 'center', whiteSpace: 'nowrap' }}>{tanggalFormat}</td>
                            <td style={{ border: '1px solid #000000', padding: '3.5px 3px', textAlign: 'center', fontWeight: 700 }}>
                              {r.jamKe ? `Jam ${r.jamKe}` : '-'}
                            </td>
                            <td style={{ border: '1px solid #000000', padding: '3.5px 4px', fontWeight: 600 }}>{r.mapel}</td>
                            <td style={{ border: '1px solid #000000', padding: '3.5px 4px' }}>{r.namaGuru}</td>
                            <td style={{ border: '1px solid #000000', padding: '3.5px 6px', lineHeight: 1.25 }}>{r.materi}</td>
                            <td style={{ border: '1px solid #000000', padding: '3.5px 2px', textAlign: 'center' }}></td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Signature Section */}
              <div style={{
                marginTop: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                pageBreakInside: 'avoid',
                fontSize: '8.5pt'
              }}>
                <div style={{ textAlign: 'center', minWidth: '220px' }}>
                  <div>Mengetahui,</div>
                  <div style={{ fontWeight: 700, marginTop: '2px' }}>Kepala Madrasah</div>
                  <div style={{ height: '50px' }}></div>
                  <div style={{
                    fontWeight: 900,
                    textDecoration: 'underline',
                    fontSize: '9pt'
                  }}>
                    DWI RETNO PALUPI, M.Pd.
                  </div>
                  <div style={{ marginTop: '2px', fontSize: '8pt' }}>
                    NIP. 121235070115110029
                  </div>
                </div>

                <div style={{ textAlign: 'center', minWidth: '220px' }}>
                  <div>Singosari, {tanggalTtd}</div>
                  <div style={{ fontWeight: 700, marginTop: '2px' }}>Wali Kelas {report.kelas}</div>
                  <div style={{ height: '50px' }}></div>
                  <div style={{
                    fontWeight: 900,
                    textDecoration: 'underline',
                    fontSize: '9pt'
                  }}>
                    {report.wali.nama || '...........................................'}
                  </div>
                  <div style={{ marginTop: '2px', fontSize: '8pt' }}>
                    {report.wali.nip ? `NIP. ${report.wali.nip}` : 'NIP. -'}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function CetakJurnalPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <CetakJurnalContent />
    </Suspense>
  );
}
