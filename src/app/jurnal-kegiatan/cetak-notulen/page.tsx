'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import LoadingScreen from '@/components/LoadingScreen';

interface NotulenData {
  id: string;
  db_id?: number;
  tanggal: string;
  waktu: string;
  tempatRapat: string;
  agendaRapat: string;
  pimpinanRapat: string;
  dihadiriOleh: string;
  notulis: string;
  hasilNotulen: string;
  dokumentasi: string;
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

function formatFullDateIndo(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
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

function formatDateIndo(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const tgl = d.getDate();
    const bln = BULAN_MAP[d.getMonth()] || '';
    const thn = d.getFullYear();
    return `${tgl} ${bln} ${thn}`;
  } catch {
    return dateStr;
  }
}

function CetakNotulenContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get('id') || '';

  const [notulen, setNotulen] = useState<NotulenData | null>(null);
  const [gurus, setGurus] = useState<GuruItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showKop, setShowKop] = useState(true);
  const [showDokumentasi, setShowDokumentasi] = useState(true);

  // 1. Fetch Daftar Guru & Notulen
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [resGuru, resNotulen] = await Promise.all([
          fetch('/api/guru').then(r => r.json()).catch(() => ({ success: false })),
          id ? fetch(`/api/notulen?id=${encodeURIComponent(id)}`).then(r => r.json()).catch(() => ({ success: false })) : Promise.resolve(null)
        ]);

        if (resGuru.success && Array.isArray(resGuru.data)) {
          setGurus(resGuru.data.map((g: any) => ({
            nama: g.nama || '',
            jabatan: g.jabatan || g.metadata?.Jabatan || 'Guru'
          })));
        }

        if (resNotulen && resNotulen.success && resNotulen.data) {
          setNotulen(resNotulen.data);
        } else if (!id) {
          // If no id, fetch latest notulen as fallback
          const allRes = await fetch('/api/notulen').then(r => r.json()).catch(() => ({ success: false }));
          if (allRes.success && Array.isArray(allRes.data) && allRes.data.length > 0) {
            setNotulen(allRes.data[0]);
          }
        }
      } catch (err) {
        console.error('Error loading notulen print data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id]);

  // 2. Compute attendance list
  const attendanceList = useMemo(() => {
    if (!notulen) return [];
    const dihadiri = (notulen.dihadiriOleh || '').trim();
    if (!dihadiri) return [];

    if (dihadiri.toLowerCase() === 'seluruh gtk' || dihadiri.toLowerCase().includes('seluruh')) {
      return gurus.map(g => ({
        nama: g.nama,
        jabatan: g.jabatan || 'Guru'
      }));
    }

    const rawNames = dihadiri.split('||').map(s => s.trim()).filter(Boolean);
    return rawNames.map(nama => {
      const match = gurus.find(g => g.nama.toLowerCase() === nama.toLowerCase());
      return {
        nama,
        jabatan: match?.jabatan || 'Guru'
      };
    });
  }, [notulen, gurus]);

  // 3. Documentation Photos
  const docPhotos = useMemo(() => {
    if (!notulen?.dokumentasi) return [];
    return notulen.dokumentasi
      .split('||')
      .map(url => url.trim())
      .filter(Boolean);
  }, [notulen]);

  return (
    <div style={{ background: '#f1f5f9', minHeight: '100vh', paddingBottom: '60px' }}>
      {/* ── Toolbar Aksi (Tidak Tampil Saat Cetak) ── */}
      <div className="no-print" style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
              Preview Cetak Notulen Rapat
            </div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              {notulen?.agendaRapat || 'Memuat dokumen...'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          {/* Toggle Kop Surat */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#334155', cursor: 'pointer', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={showKop}
              onChange={e => setShowKop(e.target.checked)}
              style={{ cursor: 'pointer', accentColor: '#0284c7', width: '16px', height: '16px' }}
            />
            <span>Gunakan Kop Surat</span>
          </label>

          {/* Toggle Dokumentasi */}
          {docPhotos.length > 0 && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#334155', cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={showDokumentasi}
                onChange={e => setShowDokumentasi(e.target.checked)}
                style={{ cursor: 'pointer', accentColor: '#0284c7', width: '16px', height: '16px' }}
              />
              <span>Sertakan Foto ({docPhotos.length})</span>
            </label>
          )}

          {/* Tombol Cetak */}
          <button
            onClick={() => window.print()}
            disabled={loading || !notulen}
            style={{
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#ffffff',
              border: 'none',
              padding: '9px 20px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 6px rgba(2, 132, 199, 0.35)'
            }}
          >
            <i className="fas fa-print"></i> Cetak / Simpan PDF
          </button>
        </div>
      </div>

      {/* ── Konten Dokumen Kertas A4 ── */}
      <div style={{ maxWidth: '850px', margin: '30px auto 0 auto', padding: '0 16px' }}>
        <div className="sheet-paper" style={{
          background: '#ffffff',
          borderRadius: '4px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          padding: '24mm 20mm',
          color: '#000000',
          fontFamily: '"Times New Roman", Times, serif',
          minHeight: '297mm',
          boxSizing: 'border-box'
        }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '80px 0', color: '#64748b' }}>
              <i className="fas fa-spinner fa-spin fa-2x" style={{ color: '#0284c7', marginBottom: '12px' }}></i>
              <div style={{ fontWeight: 600, fontSize: '14px' }}>Memuat data notulen rapat...</div>
            </div>
          ) : !notulen ? (
            <div style={{ textAlign: 'center', padding: '80px 0', color: '#ef4444' }}>
              <i className="fas fa-exclamation-triangle fa-2x" style={{ marginBottom: '12px' }}></i>
              <div style={{ fontWeight: 700, fontSize: '15px' }}>Data Notulen Tidak Ditemukan</div>
              <div style={{ fontSize: '13px', color: '#64748b', marginTop: '6px' }}>Silakan periksa kembali link atau pilih notulen dari tabel.</div>
            </div>
          ) : (
            <>
              {/* Kop Surat Madrasah */}
              {showKop && (
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                  <img
                    src="/kop_surat_mts.png"
                    alt="Kop Surat MTs Almaarif 01 Singosari"
                    style={{
                      width: '100%',
                      maxHeight: '92px',
                      objectFit: 'contain',
                      display: 'block',
                      margin: '0 auto'
                    }}
                  />
                  <div style={{ height: '2px', background: '#000000', marginTop: '8px', marginBottom: '14px' }}></div>
                </div>
              )}

              {/* Title Block */}
              <div style={{ textAlign: 'center', marginBottom: '22px' }}>
                <h2 style={{
                  margin: '0 0 4px 0',
                  fontSize: '14pt',
                  fontWeight: 900,
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  textDecoration: 'underline'
                }}>
                  NOTULEN RAPAT
                </h2>
                <h3 style={{
                  margin: '4px 0',
                  fontSize: '12pt',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  color: '#0f172a'
                }}>
                  {notulen.agendaRapat}
                </h3>
                <div style={{
                  fontSize: '10.5pt',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  color: '#334155',
                  letterSpacing: '0.3px'
                }}>
                  MTs ALMAARIF 01 SINGOSARI
                </div>
              </div>

              {/* Rincian Pelaksanaan Rapat */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px', fontSize: '11pt', lineHeight: 1.5 }}>
                <tbody>
                  <tr>
                    <td style={{ width: '22%', padding: '4px 0', fontWeight: 'bold' }}>Hari / Tanggal</td>
                    <td style={{ width: '3%', padding: '4px 0' }}>:</td>
                    <td style={{ padding: '4px 0' }}>{formatFullDateIndo(notulen.tanggal)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 0', fontWeight: 'bold' }}>Waktu</td>
                    <td style={{ padding: '4px 0' }}>:</td>
                    <td style={{ padding: '4px 0' }}>{notulen.waktu ? `${notulen.waktu} WIB s.d. Selesai` : '-'}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 0', fontWeight: 'bold' }}>Tempat</td>
                    <td style={{ padding: '4px 0' }}>:</td>
                    <td style={{ padding: '4px 0' }}>{notulen.tempatRapat || '-'}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 0', fontWeight: 'bold' }}>Pimpinan Rapat</td>
                    <td style={{ padding: '4px 0' }}>:</td>
                    <td style={{ padding: '4px 0' }}>{notulen.pimpinanRapat || '-'}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 0', fontWeight: 'bold' }}>Notulis</td>
                    <td style={{ padding: '4px 0' }}>:</td>
                    <td style={{ padding: '4px 0' }}>{notulen.notulis || '-'}</td>
                  </tr>
                </tbody>
              </table>

              {/* I. DAFTAR HADIR */}
              <div style={{ marginBottom: '26px' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '11pt', fontWeight: 800 }}>I. DAFTAR HADIR</h4>
                {attendanceList.length === 0 ? (
                  <div style={{ fontSize: '10.5pt', fontStyle: 'italic', color: '#64748b' }}>
                    (Tidak ada data daftar hadir tercatat)
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5pt' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        <th style={{ border: '1px solid #000000', padding: '6px 8px', textAlign: 'center', width: '45px', fontWeight: 800 }}>No.</th>
                        <th style={{ border: '1px solid #000000', padding: '6px 8px', textAlign: 'left', fontWeight: 800 }}>Nama Lengkap</th>
                        <th style={{ border: '1px solid #000000', padding: '6px 8px', textAlign: 'left', width: '32%', fontWeight: 800 }}>Jabatan</th>
                        <th style={{ border: '1px solid #000000', padding: '6px 8px', textAlign: 'center', width: '95px', fontWeight: 800 }}>Keterangan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceList.map((item, idx) => (
                        <tr key={idx}>
                          <td style={{ border: '1px solid #000000', padding: '5px 8px', textAlign: 'center' }}>{idx + 1}</td>
                          <td style={{ border: '1px solid #000000', padding: '5px 8px' }}>{item.nama}</td>
                          <td style={{ border: '1px solid #000000', padding: '5px 8px' }}>{item.jabatan}</td>
                          <td style={{ border: '1px solid #000000', padding: '5px 8px', textAlign: 'center' }}>Hadir</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* II. HASIL DAN KEPUTUSAN RAPAT */}
              <div style={{ marginBottom: '32px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '11pt', fontWeight: 800 }}>II. HASIL DAN KEPUTUSAN RAPAT</h4>
                <div style={{
                  fontSize: '11pt',
                  lineHeight: 1.65,
                  whiteSpace: 'pre-wrap',
                  textAlign: 'justify'
                }}>
                  {notulen.hasilNotulen || '(Tidak ada rincian hasil notulen yang dicatat)'}
                </div>
              </div>

              {/* Lembar Tanda Tangan */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11pt', marginTop: '24px', pageBreakInside: 'avoid' }}>
                <tbody>
                  <tr>
                    <td style={{ width: '45%', textAlign: 'center', verticalAlign: 'top' }}>
                      <div>Mengetahui,</div>
                      <div style={{ fontWeight: 700 }}>Kepala MTs Almaarif 01 Singosari</div>
                      <div style={{ height: '65px' }}></div>
                      <div style={{ fontWeight: 800, textDecoration: 'underline' }}>DWI RETNO PALUPI, M.Pd.</div>
                      <div style={{ fontSize: '9.5pt' }}>NIP. 121235070115110029</div>
                    </td>
                    <td style={{ width: '10%' }}></td>
                    <td style={{ width: '45%', textAlign: 'center', verticalAlign: 'top' }}>
                      <div>Singosari, {formatDateIndo(notulen.tanggal)}</div>
                      <div style={{ fontWeight: 700 }}>Notulis Rapat,</div>
                      <div style={{ height: '65px' }}></div>
                      <div style={{ fontWeight: 800, textDecoration: 'underline' }}>{notulen.notulis || '................................'}</div>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* III. LAMPIRAN DOKUMENTASI KEGIATAN */}
              {showDokumentasi && docPhotos.length > 0 && (
                <div style={{ pageBreakBefore: 'always', marginTop: '36px' }}>
                  <h4 style={{
                    textAlign: 'center',
                    margin: '0 0 20px 0',
                    fontSize: '12pt',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    textDecoration: 'underline'
                  }}>
                    LAMPIRAN: DOKUMENTASI KEGIATAN RAPAT
                  </h4>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: docPhotos.length === 1 ? '1fr' : 'repeat(2, 1fr)',
                    gap: '20px',
                    alignItems: 'center'
                  }}>
                    {docPhotos.map((url, i) => (
                      <div key={i} style={{
                        textAlign: 'center',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        padding: '10px',
                        background: '#f8fafc'
                      }}>
                        <img
                          src={`/api/proxy-image?url=${encodeURIComponent(url)}`}
                          alt={`Dokumentasi Rapat ${i + 1}`}
                          style={{
                            maxWidth: '100%',
                            maxHeight: '380px',
                            objectFit: 'contain',
                            display: 'block',
                            margin: '0 auto',
                            borderRadius: '4px'
                          }}
                        />
                        <div style={{ fontSize: '9pt', color: '#64748b', marginTop: '6px', fontStyle: 'italic' }}>
                          Dokumentasi {i + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── CSS Khusus Print ── */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 15mm 18mm 15mm 18mm;
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
        }
      `}</style>
    </div>
  );
}

export default function CetakNotulenPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <CetakNotulenContent />
    </Suspense>
  );
}
