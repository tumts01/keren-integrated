'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CetakKartuPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const rawData = localStorage.getItem('cetak_kartu_data');
    if (!rawData) {
      router.push('/olimpiade-seni');
      return;
    }
    setData(JSON.parse(rawData));
  }, [router]);

  if (!data) return null;

  const isAkademik = data.USERNAME_CBT && data.PASSWORD_CBT;

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px' }}>
      
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
          <i className="fas fa-print"></i> Cetak Kartu (PDF)
        </button>
      </div>

      <div id="printable-card" style={{ 
        width: '100%', 
        maxWidth: '500px', 
        background: 'white', 
        borderRadius: '16px', 
        overflow: 'hidden',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        border: '1px solid #e2e8f0'
      }}>
        {/* Header */}
        <div style={{ background: '#0f172a', padding: '24px', textAlign: 'center', color: 'white' }}>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '1.5rem' }}>KARTU PESERTA</h2>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>Olimpiade & Lomba Seni MTs Almaarif 01 Singosari</p>
        </div>

        {/* Body */}
        <div style={{ padding: '32px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Nomor Peserta</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0284c7', letterSpacing: '2px' }}>{data.NOMOR_PESERTA || '-'}</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <DetailRow label="Nama Lengkap" value={data.NAMA} />
            <DetailRow label="Asal Sekolah" value={data.ASAL_SEKOLAH} />
            <DetailRow label="Cabang Lomba" value={data.LOMBA_DIPILIH} />
          </div>

          {isAkademik && (
            <div style={{ marginTop: '32px', background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
              <div style={{ textAlign: 'center', marginBottom: '16px', fontWeight: 700, color: '#0f172a' }}>
                <i className="fas fa-desktop" style={{ color: '#3b82f6', marginRight: '8px' }}></i>
                AKUN LOGIN CBT
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ background: 'white', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px' }}>Username</div>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontFamily: 'monospace', fontSize: '1.1rem' }}>{data.USERNAME_CBT}</div>
                </div>
                <div style={{ background: 'white', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px' }}>Password</div>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontFamily: 'monospace', fontSize: '1.1rem' }}>{data.PASSWORD_CBT}</div>
                </div>
              </div>
              <p style={{ margin: '16px 0 0 0', fontSize: '0.8rem', color: '#64748b', textAlign: 'center' }}>
                *Gunakan akun ini untuk login pada saat ujian CBT. Jaga kerahasiaan password Anda.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ background: '#f8fafc', padding: '16px', textAlign: 'center', borderTop: '1px solid #e2e8f0' }}>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>Dicetak pada: {new Date().toLocaleString('id-ID')}</p>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          #printable-card { box-shadow: none !important; border: 2px solid #000 !important; }
        }
      `}} />
    </div>
  );
}

function DetailRow({ label, value }: { label: string, value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <span style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '4px' }}>{label}</span>
      <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
        {value}
      </span>
    </div>
  );
}
