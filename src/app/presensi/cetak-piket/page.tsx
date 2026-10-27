'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import LoadingScreen from '@/components/LoadingScreen';

interface RekapTugasItem {
  nama: string;
  piket: number;
  dispo: number;
  total: number;
  tglPiket: string[];
  tglDispo: string[];
}

function normalizeCleanName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/^(h\.|hj\.|drs\.|dra\.|dr\.|kh\.)\s+/gi, '')
    .split(',')[0]
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function formatDateIndo(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatDateShort(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
  return dateStr;
}

function CetakPiketContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialFrom = searchParams.get('from') || (() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  })();

  const initialTo = searchParams.get('to') || (() => {
    return new Date().toISOString().split('T')[0];
  })();

  const [dateFrom, setDateFrom] = useState(initialFrom);
  const [dateTo, setDateTo] = useState(initialTo);
  const [onlyActive, setOnlyActive] = useState(true);
  const [piketRecords, setPiketRecords] = useState<any[]>([]);
  const [guruList, setGuruList] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Load active teachers
  useEffect(() => {
    fetch('/api/guru')
      .then(r => r.json())
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          const names = res.data
            .filter((g: any) => (g.status || g.metadata?.Status || '').toLowerCase().trim() === 'aktif')
            .map((g: any) => g.nama)
            .filter(Boolean);
          setGuruList(names);
        }
      })
      .catch(() => {});
  }, []);

  // 2. Fetch piket records for selected date range
  useEffect(() => {
    if (!dateFrom || !dateTo) return;
    setLoading(true);

    fetch(`/api/jurnal-piket?from=${dateFrom}&to=${dateTo}`)
      .then(r => r.json())
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          setPiketRecords(res.data);
        }
      })
      .catch((err) => {
        console.error('Error loading jurnal piket:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [dateFrom, dateTo]);

  // 3. Compute duty recap per teacher
  const rekapList = useMemo(() => {
    const sortedGuruList = [...guruList].sort((a, b) => b.length - a.length);
    const dutyMap = new Map<string, { piketDates: Set<string>; dispoDates: Set<string> }>();

    for (const g of guruList) {
      dutyMap.set(g, { piketDates: new Set<string>(), dispoDates: new Set<string>() });
    }

    for (const r of piketRecords) {
      const tanggal = r.tanggal || '';
      if (!tanggal) continue;
      const pStr = (r.petugasPiket || '').trim();
      const dStr = (r.guruDispo || '').trim();

      if (pStr) {
        let matched = false;
        for (const g of sortedGuruList) {
          const normG = normalizeCleanName(g);
          const normP = normalizeCleanName(pStr);
          if (pStr.toLowerCase().includes(g.toLowerCase()) || (normG.length >= 4 && normP.includes(normG))) {
            matched = true;
            if (!dutyMap.has(g)) dutyMap.set(g, { piketDates: new Set(), dispoDates: new Set() });
            dutyMap.get(g)!.piketDates.add(tanggal);
          }
        }
        if (!matched) {
          pStr.split(',').forEach((part: string) => {
            const trimmed = part.trim();
            if (trimmed && trimmed.length > 3) {
              if (!dutyMap.has(trimmed)) dutyMap.set(trimmed, { piketDates: new Set(), dispoDates: new Set() });
              dutyMap.get(trimmed)!.piketDates.add(tanggal);
            }
          });
        }
      }

      if (dStr) {
        let matched = false;
        for (const g of sortedGuruList) {
          const normG = normalizeCleanName(g);
          const normD = normalizeCleanName(dStr);
          if (dStr.toLowerCase().includes(g.toLowerCase()) || (normG.length >= 4 && normD.includes(normG))) {
            matched = true;
            if (!dutyMap.has(g)) dutyMap.set(g, { piketDates: new Set(), dispoDates: new Set() });
            dutyMap.get(g)!.dispoDates.add(tanggal);
          }
        }
        if (!matched) {
          dStr.split(',').forEach((part: string) => {
            const trimmed = part.trim();
            if (trimmed && trimmed.length > 3) {
              if (!dutyMap.has(trimmed)) dutyMap.set(trimmed, { piketDates: new Set(), dispoDates: new Set() });
              dutyMap.get(trimmed)!.dispoDates.add(tanggal);
            }
          });
        }
      }
    }

    const list: RekapTugasItem[] = [];
    for (const [nama, record] of dutyMap.entries()) {
      const piket = record.piketDates.size;
      const dispo = record.dispoDates.size;
      const total = piket + dispo;
      const tglPiket = Array.from(record.piketDates).sort();
      const tglDispo = Array.from(record.dispoDates).sort();
      list.push({ nama, piket, dispo, total, tglPiket, tglDispo });
    }

    return list.sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      return a.nama.localeCompare(b.nama);
    });
  }, [guruList, piketRecords]);

  // Filter list based on onlyActive toggle
  const displayedList = useMemo(() => {
    if (onlyActive) {
      return rekapList.filter(item => item.total > 0);
    }
    return rekapList;
  }, [rekapList, onlyActive]);

  // Overall Statistics
  const stats = useMemo(() => {
    const totalGuruBertugas = rekapList.filter(x => x.total > 0).length;
    const totalPiket = rekapList.reduce((acc, curr) => acc + curr.piket, 0);
    const totalDispo = rekapList.reduce((acc, curr) => acc + curr.dispo, 0);
    const totalTugas = totalPiket + totalDispo;
    return { totalGuruBertugas, totalPiket, totalDispo, totalTugas };
  }, [rekapList]);

  // Export to Excel
  const handleExportExcel = () => {
    const listToExport = displayedList.length > 0 ? displayedList : rekapList;
    const fromLabel = dateFrom ? dateFrom.split('-').reverse().join('-') : 'Awal';
    const toLabel = dateTo ? dateTo.split('-').reverse().join('-') : 'Akhir';
    const cetakDate = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });

    const aoa: any[][] = [
      ['REKAPITULASI JUMLAH TUGAS PIKET & DISPO GURU'],
      ['MTs ALMAARIF 01 SINGOSARI'],
      [`Periode: ${fromLabel} s.d. ${toLabel}  |  Dicetak: ${cetakDate}`],
      [],
      ['No', 'Nama Guru', 'Jumlah Piket', 'Jumlah Dispo', 'Total Tugas', 'Rincian Tanggal Piket', 'Rincian Tanggal Dispo']
    ];

    listToExport.forEach((item, idx) => {
      aoa.push([
        idx + 1,
        item.nama,
        `${item.piket}x`,
        `${item.dispo}x`,
        `${item.total}x`,
        item.tglPiket.map(t => t.split('-').reverse().join('/')).join(', ') || '-',
        item.tglDispo.map(t => t.split('-').reverse().join('/')).join(', ') || '-'
      ]);
    });

    aoa.push([]);
    aoa.push(['TOTAL', `${stats.totalGuruBertugas} Guru Bertugas`, `${stats.totalPiket}x`, `${stats.totalDispo}x`, `${stats.totalTugas}x`, '', '']);

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [
      { wch: 5 }, { wch: 36 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 35 }, { wch: 35 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rekap Piket & Dispo');
    XLSX.writeFile(wb, `Rekap_Tugas_Piket_Dispo_${fromLabel}_sd_${toLabel}.xlsx`);
  };

  const periodeLabel = `${formatDateIndo(dateFrom)} s.d. ${formatDateIndo(dateTo)}`;
  const tanggalCetak = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', fontFamily: 'Arial, sans-serif', color: '#000000' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4 landscape;
            margin: 7mm 7mm;
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
          .print-sheet {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>Dari:</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                router.replace(`/presensi/cetak-piket?from=${encodeURIComponent(e.target.value)}&to=${encodeURIComponent(dateTo)}`);
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

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>Sampai:</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                router.replace(`/presensi/cetak-piket?from=${encodeURIComponent(dateFrom)}&to=${encodeURIComponent(e.target.value)}`);
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

          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '12px', fontWeight: 600, color: '#475569', cursor: 'pointer', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={onlyActive}
              onChange={(e) => setOnlyActive(e.target.checked)}
              style={{ cursor: 'pointer', width: 15, height: 15, accentColor: '#059669' }}
            />
            <span>Hanya guru bertugas (Total &gt; 0)</span>
          </label>
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
            <i className="fas fa-print"></i> Cetak / Simpan PDF
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

      {/* Sheet Container */}
      <div style={{ padding: '16px', display: 'flex', justifyContent: 'center' }}>
        <div className="print-sheet" style={{
          background: '#ffffff',
          width: '100%',
          maxWidth: '287mm',
          padding: '10mm 10mm',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          boxSizing: 'border-box'
        }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
              <i className="fas fa-spinner fa-spin fa-2x" style={{ color: '#0284c7', marginBottom: '12px' }}></i>
              <div style={{ fontWeight: 600, fontSize: '14px' }}>Memuat data rekapitulasi piket & dispo...</div>
            </div>
          ) : (
            <>
              {/* Title Block */}
              <div style={{ textAlign: 'center', marginBottom: '14px' }}>
                <h2 style={{
                  margin: 0,
                  fontSize: '12.5pt',
                  fontWeight: 900,
                  letterSpacing: '0.4px',
                  textTransform: 'uppercase',
                  color: '#000000',
                  lineHeight: 1.2
                }}>
                  REKAPITULASI PENUGASAN PIKET &amp; DISPO GURU
                </h2>
                <div style={{
                  fontSize: '10pt',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  marginTop: '1px',
                  color: '#000000'
                }}>
                  MTs ALMAARIF 01 SINGOSARI
                </div>
                <div style={{
                  fontSize: '9pt',
                  fontWeight: 700,
                  marginTop: '2px',
                  color: '#1e293b'
                }}>
                  Periode: {periodeLabel}
                </div>
              </div>

              {/* Summary Cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '8px',
                marginBottom: '10px',
                fontSize: '8pt',
                fontWeight: 700
              }}>
                <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '6px 10px', borderRadius: '4px', textAlign: 'center' }}>
                  <div style={{ color: '#64748b', fontSize: '7pt', textTransform: 'uppercase' }}>Guru Bertugas</div>
                  <div style={{ fontSize: '11pt', fontWeight: 900, color: '#1e293b' }}>
                    {stats.totalGuruBertugas} <span style={{ fontSize: '7.5pt', fontWeight: 500, color: '#64748b' }}>/ {guruList.length} guru</span>
                  </div>
                </div>
                <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '6px 10px', borderRadius: '4px', textAlign: 'center' }}>
                  <div style={{ color: '#047857', fontSize: '7pt', textTransform: 'uppercase' }}>Total Piket</div>
                  <div style={{ fontSize: '11pt', fontWeight: 900, color: '#065f46' }}>
                    {stats.totalPiket} <span style={{ fontSize: '7.5pt', fontWeight: 500 }}>penugasan</span>
                  </div>
                </div>
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '6px 10px', borderRadius: '4px', textAlign: 'center' }}>
                  <div style={{ color: '#b45309', fontSize: '7pt', textTransform: 'uppercase' }}>Total Dispo</div>
                  <div style={{ fontSize: '11pt', fontWeight: 900, color: '#92400e' }}>
                    {stats.totalDispo} <span style={{ fontSize: '7.5pt', fontWeight: 500 }}>penugasan</span>
                  </div>
                </div>
                <div style={{ background: '#e0e7ff', border: '1px solid #c7d2fe', padding: '6px 10px', borderRadius: '4px', textAlign: 'center' }}>
                  <div style={{ color: '#4338ca', fontSize: '7pt', textTransform: 'uppercase' }}>Total Seluruh Tugas</div>
                  <div style={{ fontSize: '11pt', fontWeight: 900, color: '#312e81' }}>
                    {stats.totalTugas} <span style={{ fontSize: '7.5pt', fontWeight: 500 }}>penugasan</span>
                  </div>
                </div>
              </div>

              {/* Table */}
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
                      <th style={{ width: '28px', border: '1px solid #000000', padding: '5px 2px' }}>NO</th>
                      <th style={{ width: '190px', border: '1px solid #000000', padding: '5px 6px', textAlign: 'left' }}>Nama Guru</th>
                      <th style={{ width: '70px', border: '1px solid #000000', padding: '5px 4px' }}>Jumlah Piket</th>
                      <th style={{ width: '70px', border: '1px solid #000000', padding: '5px 4px' }}>Jumlah Dispo</th>
                      <th style={{ width: '75px', border: '1px solid #000000', padding: '5px 4px' }}>Total Tugas</th>
                      <th style={{ border: '1px solid #000000', padding: '5px 6px', textAlign: 'left' }}>Rincian Tanggal Tugas</th>
                    </tr>
                  </thead>

                  <tbody>
                    {displayedList.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '30px', border: '1px solid #000000', color: '#64748b' }}>
                          Tidak ada data penugasan piket atau dispo pada periode yang dipilih.
                        </td>
                      </tr>
                    ) : (
                      displayedList.map((item, idx) => (
                        <tr key={item.nama} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                          <td style={{ border: '1px solid #000000', padding: '3px 2px', textAlign: 'center' }}>{idx + 1}</td>
                          <td style={{ border: '1px solid #000000', padding: '3px 6px', fontWeight: 600 }}>{item.nama}</td>
                          <td style={{ border: '1px solid #000000', padding: '3px 4px', textAlign: 'center', fontWeight: 700, color: item.piket > 0 ? '#15803d' : '#94a3b8' }}>
                            {item.piket}x
                          </td>
                          <td style={{ border: '1px solid #000000', padding: '3px 4px', textAlign: 'center', fontWeight: 700, color: item.dispo > 0 ? '#b45309' : '#94a3b8' }}>
                            {item.dispo}x
                          </td>
                          <td style={{ border: '1px solid #000000', padding: '3px 4px', textAlign: 'center', fontWeight: 800, color: item.total > 0 ? '#1e3a8a' : '#94a3b8' }}>
                            {item.total}x
                          </td>
                          <td style={{ border: '1px solid #000000', padding: '3px 6px', lineHeight: 1.3, fontSize: '7pt' }}>
                            {item.tglPiket.length > 0 && (
                              <div>
                                <span style={{ fontWeight: 700, color: '#15803d' }}>Piket ({item.tglPiket.length}):</span>{' '}
                                {item.tglPiket.map(t => formatDateShort(t)).join(', ')}
                              </div>
                            )}
                            {item.tglDispo.length > 0 && (
                              <div style={{ marginTop: item.tglPiket.length > 0 ? '2px' : '0' }}>
                                <span style={{ fontWeight: 700, color: '#b45309' }}>Dispo ({item.tglDispo.length}):</span>{' '}
                                {item.tglDispo.map(t => formatDateShort(t)).join(', ')}
                              </div>
                            )}
                            {item.total === 0 && (
                              <span style={{ color: '#94a3b8' }}>-</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>

                  <tfoot>
                    <tr style={{ background: '#fef9c3', fontWeight: 800, textAlign: 'center' }}>
                      <td colSpan={2} style={{ border: '1px solid #000000', padding: '4px 6px', textAlign: 'center' }}>
                        JUMLAH PENUGASAN
                      </td>
                      <td style={{ border: '1px solid #000000', padding: '4px' }}>{stats.totalPiket}x</td>
                      <td style={{ border: '1px solid #000000', padding: '4px' }}>{stats.totalDispo}x</td>
                      <td style={{ border: '1px solid #000000', padding: '4px' }}>{stats.totalTugas}x</td>
                      <td style={{ border: '1px solid #000000', padding: '4px 6px', textAlign: 'left', fontSize: '7pt' }}>
                        {stats.totalGuruBertugas} Guru Bertugas
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Signatures */}
              <div style={{
                marginTop: '18px',
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
                  <div>Singosari, {tanggalCetak}</div>
                  <div style={{ fontWeight: 700, marginTop: '2px' }}>Koordinator Jurnal Piket</div>
                  <div style={{ height: '50px' }}></div>
                  <div style={{
                    fontWeight: 900,
                    textDecoration: 'underline',
                    fontSize: '9pt'
                  }}>
                    .......................................................
                  </div>
                  <div style={{ marginTop: '2px', fontSize: '8pt' }}>
                    NIP. -
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CetakPiketPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <CetakPiketContent />
    </Suspense>
  );
}
