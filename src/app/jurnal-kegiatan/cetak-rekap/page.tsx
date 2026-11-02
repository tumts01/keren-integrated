'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import LoadingScreen from '@/components/LoadingScreen';

interface JurnalStafItem {
  rowNumber?: number;
  timestamp: string;
  namaStaf: string;
  kegiatan: string;
  tanggal: string;
  mulaiDari?: string;
  sampaiDengan?: string;
  keterangan?: string;
  fotoKegiatan?: string;
  fileLink?: string;
}

interface GuruItem {
  nama: string;
  jabatan?: string;
}

const HARI_MAP: Record<number, string> = {
  0: 'Minggu',
  1: 'Senin',
  2: 'Selasa',
  3: 'Rabu',
  4: 'Kamis',
  5: 'Jumat',
  6: 'Sabtu'
};

const BULAN_MAP: Record<number, string> = {
  0: 'Januari',
  1: 'Februari',
  2: 'Maret',
  3: 'April',
  4: 'Mei',
  5: 'Juni',
  6: 'Juli',
  7: 'Agustus',
  8: 'September',
  9: 'Oktober',
  10: 'November',
  11: 'Desember'
};

function parseDateToIso(dStr: string): string {
  if (!dStr) return '';
  const trimmed = dStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  
  const sep = trimmed.includes('/') ? '/' : (trimmed.includes('-') ? '-' : null);
  if (sep) {
    const parts = trimmed.split(sep);
    if (parts.length === 3) {
      if (parts[2].length === 4) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      } else if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      }
    }
  }
  return trimmed;
}

function formatDateIndo(dateStr: string): string {
  if (!dateStr) return '-';
  const iso = parseDateToIso(dateStr);
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return dateStr;
    const hari = HARI_MAP[d.getDay()] || '';
    const tgl = d.getDate();
    const bln = BULAN_MAP[d.getMonth()] || '';
    const thn = d.getFullYear();
    return `${hari}, ${tgl} ${bln} ${thn}`;
  } catch {
    return dateStr;
  }
}

function CetakRekapContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [jurnalList, setJurnalList] = useState<JurnalStafItem[]>([]);
  const [gurus, setGurus] = useState<GuruItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [filterNama, setFilterNama] = useState(searchParams.get('nama') || '');
  const [filterStartDate, setFilterStartDate] = useState(searchParams.get('startDate') || '');
  const [filterEndDate, setFilterEndDate] = useState(searchParams.get('endDate') || '');
  const [showKop, setShowKop] = useState(true);
  const [showFoto, setShowFoto] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [resJurnal, resGuru] = await Promise.all([
          fetch('/api/jurnal-staf').then(r => r.json()).catch(() => ({ success: false })),
          fetch('/api/guru').then(r => r.json()).catch(() => ({ success: false }))
        ]);

        if (resJurnal.success && Array.isArray(resJurnal.data)) {
          setJurnalList(resJurnal.data);
        }
        if (resGuru.success && Array.isArray(resGuru.data)) {
          setGurus(resGuru.data.map((g: any) => ({
            nama: g.nama || '',
            jabatan: g.jabatan || g.metadata?.Jabatan || 'Guru'
          })));
        }
      } catch (err) {
        console.error('Error fetching data for cetak rekap:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Filtered entries
  const filteredData = useMemo(() => {
    return jurnalList.filter(item => {
      let match = true;
      const isoDate = parseDateToIso(item.tanggal);
      if (filterStartDate && isoDate < filterStartDate) match = false;
      if (filterEndDate && isoDate > filterEndDate) match = false;
      if (filterNama && !item.namaStaf?.toLowerCase().includes(filterNama.toLowerCase())) match = false;
      return match;
    }).sort((a, b) => {
      const dateA = parseDateToIso(a.tanggal);
      const dateB = parseDateToIso(b.tanggal);
      return dateA.localeCompare(dateB); // urut tanggal ascending untuk laporan cetak
    });
  }, [jurnalList, filterNama, filterStartDate, filterEndDate]);

  // Distinct guru names from journal entries
  const distinctNames = useMemo(() => {
    const set = new Set<string>();
    jurnalList.forEach(j => {
      if (j.namaStaf) set.add(j.namaStaf.trim());
    });
    return Array.from(set).sort();
  }, [jurnalList]);

  // Selected guru detail (if filtered by single guru)
  const targetGuru = useMemo(() => {
    if (!filterNama) return null;
    return gurus.find(g => g.nama.toLowerCase() === filterNama.toLowerCase()) || null;
  }, [filterNama, gurus]);

  return (
    <div style={{ background: '#f1f5f9', minHeight: '100vh', paddingBottom: '60px' }}>
      {/* ── Toolbar Aksi & Filter (Hanya tampil di layar) ── */}
      <div className="no-print" style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '14px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={() => router.back()}
            style={{
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              color: '#334155',
              padding: '8px 14px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <i className="fas fa-arrow-left"></i> Kembali
          </button>
          <div>
            <div style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a' }}>
              Cetak Rekap Jurnal Kegiatan Guru & Staf
            </div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              {filterNama || 'Semua Guru & Staf'} &bull; {filteredData.length} Kegiatan Terpilih
            </div>
          </div>
        </div>

        {/* Filter Controls di Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <select
              value={filterNama}
              onChange={e => setFilterNama(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                maxWidth: '220px'
              }}
            >
              <option value="">-- Semua Guru / Staf --</option>
              {distinctNames.map((n, idx) => (
                <option key={idx} value={n}>{n}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
            <input
              type="date"
              value={filterStartDate}
              onChange={e => setFilterStartDate(e.target.value)}
              style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
            />
            <span style={{ color: '#64748b' }}>s/d</span>
            <input
              type="date"
              value={filterEndDate}
              onChange={e => setFilterEndDate(e.target.value)}
              style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
            />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: '#334155', cursor: 'pointer', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={showKop}
              onChange={e => setShowKop(e.target.checked)}
              style={{ cursor: 'pointer', accentColor: '#0284c7' }}
            />
            <span>Kop Surat</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: '#334155', cursor: 'pointer', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={showFoto}
              onChange={e => setShowFoto(e.target.checked)}
              style={{ cursor: 'pointer', accentColor: '#0284c7' }}
            />
            <span>Tampilkan QR / Foto</span>
          </label>

          <button
            onClick={() => window.print()}
            disabled={loading || filteredData.length === 0}
            style={{
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#ffffff',
              border: 'none',
              padding: '9px 20px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '13px',
              cursor: filteredData.length === 0 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 6px rgba(2, 132, 199, 0.35)',
              opacity: filteredData.length === 0 ? 0.6 : 1
            }}
          >
            <i className="fas fa-print"></i> Cetak / Simpan PDF
          </button>
        </div>
      </div>

      {/* ── Kertas Dokumen Cetak A4 ── */}
      <div style={{ maxWidth: '950px', margin: '24px auto 0 auto', padding: '0 16px' }}>
        <div className="sheet-paper" style={{
          background: '#ffffff',
          borderRadius: '4px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          padding: '20mm 18mm',
          minHeight: '297mm',
          fontFamily: '"Times New Roman", Times, serif',
          color: '#000000',
          position: 'relative'
        }}>
          {loading ? (
            <div style={{ padding: '80px 0', textAlign: 'center' }}>
              <LoadingScreen />
              <p style={{ marginTop: '16px', color: '#64748b', fontSize: '14px' }}>Memuat rekap jurnal kegiatan...</p>
            </div>
          ) : (
            <>
              {/* Kop Surat Resmi */}
              {showKop && (
                <div style={{ textAlign: 'center', marginBottom: '16px', borderBottom: '3px double #000000', paddingBottom: '10px' }}>
                  <img
                    src="/kop_surat_mts.png"
                    alt="Kop Surat MTs Almaarif 01"
                    style={{ maxWidth: '100%', height: 'auto', maxHeight: '120px', display: 'block', margin: '0 auto' }}
                  />
                </div>
              )}

              {/* Judul Dokumen */}
              <div style={{ textAlign: 'center', margin: '14px 0 20px 0' }}>
                <h2 style={{
                  fontSize: '14pt',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  margin: 0,
                  letterSpacing: '0.5px',
                  textDecoration: 'underline'
                }}>
                  REKAPITULASI JURNAL KEGIATAN GURU & STAF
                </h2>
                <div style={{ fontSize: '11pt', fontWeight: 'bold', marginTop: '4px' }}>
                  MTS ALMAARIF 01 SINGOSARI
                </div>
              </div>

              {/* Metadata Informasi Rekap */}
              <table style={{ width: '100%', marginBottom: '18px', fontSize: '11pt', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ width: '160px', padding: '3px 0', fontWeight: 'bold' }}>Nama Guru / Staf</td>
                    <td style={{ width: '15px', padding: '3px 0' }}>:</td>
                    <td style={{ padding: '3px 0', fontWeight: filterNama ? 'bold' : 'normal' }}>
                      {filterNama || 'Seluruh Guru & Staf (Kolektif)'}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '3px 0', fontWeight: 'bold' }}>Jabatan</td>
                    <td style={{ padding: '3px 0' }}>:</td>
                    <td style={{ padding: '3px 0' }}>
                      {targetGuru?.jabatan || (filterNama ? 'Guru / Staf' : 'Seluruh GTK')}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '3px 0', fontWeight: 'bold' }}>Periode Tanggal</td>
                    <td style={{ padding: '3px 0' }}>:</td>
                    <td style={{ padding: '3px 0' }}>
                      {filterStartDate && filterEndDate
                        ? `${formatDateIndo(filterStartDate)} s/d ${formatDateIndo(filterEndDate)}`
                        : filterStartDate
                        ? `Mulai ${formatDateIndo(filterStartDate)}`
                        : filterEndDate
                        ? `Sampai dengan ${formatDateIndo(filterEndDate)}`
                        : 'Semua Periode Tercatat'}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '3px 0', fontWeight: 'bold' }}>Jumlah Kegiatan</td>
                    <td style={{ padding: '3px 0' }}>:</td>
                    <td style={{ padding: '3px 0' }}>
                      <b>{filteredData.length}</b> Kegiatan
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Tabel Rekapitulasi Kegiatan */}
              {filteredData.length === 0 ? (
                <div style={{
                  border: '1px dashed #cbd5e1',
                  borderRadius: '6px',
                  padding: '30px',
                  textAlign: 'center',
                  color: '#64748b',
                  fontSize: '11pt'
                }}>
                  Tidak ada catatan jurnal kegiatan yang sesuai dengan filter yang dipilih.
                </div>
              ) : (
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '10pt',
                  marginBottom: '24px'
                }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9' }}>
                      <th style={{ border: '1px solid #000000', padding: '8px 6px', width: '35px', textAlign: 'center' }}>No</th>
                      <th style={{ border: '1px solid #000000', padding: '8px 8px', width: '130px', textAlign: 'center' }}>Hari, Tanggal & Waktu</th>
                      {!filterNama && (
                        <th style={{ border: '1px solid #000000', padding: '8px 8px', width: '160px', textAlign: 'center' }}>Nama Guru / Staf</th>
                      )}
                      <th style={{ border: '1px solid #000000', padding: '8px 10px', textAlign: 'left' }}>Uraian Kegiatan</th>
                      <th style={{ border: '1px solid #000000', padding: '8px 8px', width: '130px', textAlign: 'left' }}>Keterangan</th>
                      {showFoto && (
                        <th style={{ border: '1px solid #000000', padding: '8px 6px', width: '75px', textAlign: 'center' }}>Dokumentasi</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((item, index) => {
                      const photoUrls = (item.fotoKegiatan || item.fileLink || '')
                        .split(/[,|]/)
                        .map(u => u.trim())
                        .filter(Boolean);

                      return (
                        <tr key={index} style={{ pageBreakInside: 'avoid' }}>
                          <td style={{ border: '1px solid #000000', padding: '8px 6px', textAlign: 'center', verticalAlign: 'top' }}>
                            {index + 1}
                          </td>
                          <td style={{ border: '1px solid #000000', padding: '8px 8px', verticalAlign: 'top' }}>
                            <div style={{ fontWeight: 'bold' }}>{formatDateIndo(item.tanggal)}</div>
                            {(item.mulaiDari || item.sampaiDengan) && (
                              <div style={{ fontSize: '9pt', color: '#334155', marginTop: '2px' }}>
                                <i className="fas fa-clock" style={{ marginRight: '4px', fontSize: '8pt' }}></i>
                                {item.mulaiDari && item.sampaiDengan ? `${item.mulaiDari} - ${item.sampaiDengan} WIB` : item.mulaiDari || item.sampaiDengan}
                              </div>
                            )}
                          </td>
                          {!filterNama && (
                            <td style={{ border: '1px solid #000000', padding: '8px 8px', verticalAlign: 'top' }}>
                              <div style={{ fontWeight: 'bold' }}>{item.namaStaf}</div>
                              <div style={{ fontSize: '9pt', color: '#475569' }}>
                                {(() => {
                                  const g = gurus.find(x => x.nama.toLowerCase() === item.namaStaf?.toLowerCase());
                                  return g?.jabatan || 'Guru';
                                })()}
                              </div>
                            </td>
                          )}
                          <td style={{ border: '1px solid #000000', padding: '8px 10px', verticalAlign: 'top', lineHeight: 1.45 }}>
                            {item.kegiatan}
                          </td>
                          <td style={{ border: '1px solid #000000', padding: '8px 8px', verticalAlign: 'top', color: item.keterangan ? '#000000' : '#64748b' }}>
                            {item.keterangan || '-'}
                          </td>
                          {showFoto && (
                            <td style={{ border: '1px solid #000000', padding: '8px 6px', textAlign: 'center', verticalAlign: 'top' }}>
                              {photoUrls.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                  <a 
                                    href={photoUrls[0]} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    title="Buka Foto"
                                    style={{ color: '#0284c7', textDecoration: 'none', fontSize: '8.5pt', fontWeight: 'bold' }}
                                  >
                                    <i className="fas fa-image" style={{ marginRight: '3px' }}></i>
                                    {photoUrls.length > 1 ? `${photoUrls.length} Foto` : 'Lihat'}
                                  </a>
                                  {/* QR Code thumbnail for printed paper verification */}
                                  <div style={{ marginTop: '2px' }}>
                                    <img 
                                      src={`https://api.qrserver.com/v1/create-qr-code/?size=55x55&data=${encodeURIComponent(photoUrls[0])}`} 
                                      alt="QR" 
                                      style={{ width: '45px', height: '45px', display: 'block', margin: '0 auto', border: '1px solid #e2e8f0' }} 
                                    />
                                  </div>
                                </div>
                              ) : (
                                <span style={{ color: '#94a3b8' }}>-</span>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {/* Tanda Tangan */}
              {filteredData.length > 0 && (
                <div style={{ marginTop: '40px', pageBreakInside: 'avoid' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11pt' }}>
                    <div style={{ textAlign: 'center', width: '220px' }}>
                      <p style={{ margin: 0 }}>Mengetahui,</p>
                      <p style={{ margin: '4px 0 0 0', fontWeight: 'bold' }}>Kepala Madrasah</p>
                      <div style={{ height: '70px' }}></div>
                      <p style={{ fontWeight: 'bold', textDecoration: 'underline', margin: 0 }}>
                        Dwi Retno Palupi, S.Pd., M.Pd.
                      </p>
                    </div>

                    <div style={{ textAlign: 'center', width: '240px' }}>
                      <p style={{ margin: 0 }}>Singosari, {formatDateIndo(new Date().toISOString().split('T')[0])}</p>
                      <p style={{ margin: '4px 0 0 0', fontWeight: 'bold' }}>
                        {filterNama ? 'Pembuat Jurnal' : 'Koordinator GTK'}
                      </p>
                      <div style={{ height: '70px' }}></div>
                      <p style={{ fontWeight: 'bold', textDecoration: 'underline', margin: 0 }}>
                        {filterNama || '( .................................................... )'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── CSS Khusus Print (A4) ── */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 15mm 12mm 15mm;
          }

          body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .no-print,
          header,
          footer,
          aside,
          nav,
          [class*="Sidebar"],
          [class*="Header"] {
            display: none !important;
          }

          .sheet-paper {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            min-height: auto !important;
          }

          table {
            page-break-inside: auto;
          }

          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }

          thead {
            display: table-header-group;
          }

          tfoot {
            display: table-footer-group;
          }
        }
      `}</style>
    </div>
  );
}

export default function CetakRekapPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <CetakRekapContent />
    </Suspense>
  );
}
