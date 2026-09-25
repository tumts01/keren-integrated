'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CetakKartuPage() {
  const router = useRouter();
  const [pesertaList, setPesertaList] = useState<any[]>([]);

  useEffect(() => {
    const rawData = localStorage.getItem('cetak_kartu_data');
    if (!rawData) {
      router.push('/olimpiade-seni');
      return;
    }
    try {
      const parsed = JSON.parse(rawData);
      // Support array (Kolektif) or single object (Individu)
      if (Array.isArray(parsed)) {
        setPesertaList(parsed);
      } else {
        setPesertaList([parsed]);
      }
    } catch (e) {
      router.push('/olimpiade-seni');
    }
  }, [router]);

  if (pesertaList.length === 0) return null;

  return (
    <div className="kartu-wrapper" style={{ minHeight: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px' }}>
      
      <div className="no-print" style={{ marginBottom: '24px', display: 'flex', gap: '16px' }}>
        <button 
          onClick={() => router.push('/olimpiade-seni')}
          style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer', fontWeight: 600 }}
        >
          <i className="fas fa-arrow-left"></i> Kembali
        </button>
        <button 
          onClick={() => window.print()}
          style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#0284c7', color: 'white', cursor: 'pointer', fontWeight: 600 }}
        >
          <i className="fas fa-print"></i> Cetak {pesertaList.length > 1 ? `Semua Kartu (${pesertaList.length})` : 'Kartu'} (PDF)
        </button>
      </div>

      <div className="print-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center' }}>
        {pesertaList.map((data, index) => {
          const isAkademik = data.USERNAME_CBT && data.PASSWORD_CBT;
          const lombaRaw = data.LOMBA_DIPILIH || data['LOMBA YANG DIPILIH'] || '-';
          
          return (
            <div key={index} className="kartu-peserta" style={{ 
              width: '8cm', 
              height: '10.5cm', 
              background: 'white', 
              boxSizing: 'border-box',
              border: '2px solid #0f172a',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              fontFamily: 'Arial, sans-serif'
            }}>
              {/* Header */}
              <div style={{ background: '#0f172a', padding: '8px', textAlign: 'center', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12pt', fontWeight: 'bold', margin: '0' }}>KARTU PESERTA</div>
                  <div style={{ fontSize: '7pt', color: '#e2e8f0', marginTop: '2px' }}>Olimpiade & Lomba Seni MTs Almaarif 01</div>
                </div>
              </div>

              {/* Body */}
              <div style={{ padding: '10px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', position: 'relative', overflow: 'hidden' }}>
                
                {/* Watermark Logo */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 0,
                  pointerEvents: 'none'
                }}>
                  <img 
                    src="/logo_olimpiade_seni.png" 
                    alt="Watermark" 
                    style={{
                      width: '6cm',
                      height: '6cm',
                      opacity: 0.15,
                      objectFit: 'contain'
                    }} 
                  />
                </div>

                <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', marginBottom: '8px' }}>
                  <div style={{ fontSize: '7pt', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Nomor Peserta</div>
                  <div style={{ fontSize: '14pt', fontWeight: 900, color: '#0f172a' }}>{data.NOMOR_PESERTA || '-'}</div>
                </div>

                <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
                  <DetailRow label="Nama" value={data.NAMA || data.Nama || '-'} />
                  <DetailRow label="Asal Sekolah" value={data.ASAL_SEKOLAH || data['Asal Sekolah'] || '-'} />
                  <DetailRow label="Cabang Lomba" value={lombaRaw} />
                  {data.NAMA_REGU && <DetailRow label="Grup/Regu" value={data.NAMA_REGU} />}
                </div>

                {isAkademik && (
                  <div style={{ position: 'relative', zIndex: 1, marginTop: 'auto', border: '1px solid #94a3b8', borderRadius: '4px', padding: '6px', background: 'rgba(255, 255, 255, 0.8)' }}>
                    <div style={{ textAlign: 'center', fontSize: '7pt', fontWeight: 'bold', color: '#0f172a', marginBottom: '4px' }}>
                      AKUN LOGIN CBT
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dotted #94a3b8', paddingTop: '4px' }}>
                      <div style={{ textAlign: 'center', flex: 1, borderRight: '1px dotted #94a3b8' }}>
                        <div style={{ fontSize: '6pt', color: '#64748b' }}>Username</div>
                        <div style={{ fontSize: '9pt', fontWeight: 'bold', color: '#0f172a' }}>{data.USERNAME_CBT}</div>
                      </div>
                      <div style={{ textAlign: 'center', flex: 1 }}>
                        <div style={{ fontSize: '6pt', color: '#64748b' }}>Password</div>
                        <div style={{ fontSize: '9pt', fontWeight: 'bold', color: '#0f172a' }}>{data.PASSWORD_CBT}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Footer */}
              <div style={{ background: '#f8fafc', padding: '4px', textAlign: 'center', borderTop: '1px solid #e2e8f0', fontSize: '6pt', color: '#64748b' }}>
                Panitia Olimpiade & Lomba Seni
              </div>
            </div>
          );
        })}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { background: white !important; margin: 0; padding: 0; }
          .no-print, .print-header, footer { display: none !important; }
          
          /* Remove the grey wrapper background and padding during print */
          .kartu-wrapper {
            background: white !important;
            padding: 0 !important;
            min-height: auto !important;
          }

          .print-container { 
            display: block !important;
            gap: 0 !important;
          }
          .kartu-peserta {
            page-break-inside: avoid;
            margin: 0.5cm;
            float: left;
            box-shadow: none !important;
          }
        }
      `}} />
    </div>
  );
}

function DetailRow({ label, value }: { label: string, value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <span style={{ fontSize: '6pt', color: '#64748b' }}>{label}</span>
      <span style={{ fontSize: '9pt', fontWeight: 'bold', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {value}
      </span>
    </div>
  );
}
