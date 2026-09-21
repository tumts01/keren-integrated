'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PortalPresensi() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [rekap, setRekap] = useState({ sakit: 0, izin: 0, alpha: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sessionStr = localStorage.getItem('portal_session');
    if (!sessionStr) {
      router.replace('/portal/login');
      return;
    }
    const student = JSON.parse(sessionStr);

    fetch(`/api/portal/presensi?nisn=${student.nisn}`)
      .then(res => res.json())
      .then(resData => {
        if (resData.success) {
          setData(resData.data);
          setRekap(resData.rekap);
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <div className="portal-container" style={{ paddingBottom: '40px' }}>
      <div className="portal-header" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer' }}>
          <i className="fas fa-arrow-left"></i>
        </button>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Kehadiran Siswa</h2>
      </div>

      <div className="portal-content" style={{ marginTop: '16px' }}>
        
        {/* Rekap Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          <div style={{ background: '#fef3c7', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#d97706' }}>{rekap.sakit}</div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#b45309' }}>SAKIT</div>
          </div>
          <div style={{ background: '#dbeafe', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#2563eb' }}>{rekap.izin}</div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#1d4ed8' }}>IZIN</div>
          </div>
          <div style={{ background: '#fee2e2', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#dc2626' }}>{rekap.alpha}</div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#b91c1c' }}>ALPHA</div>
          </div>
        </div>

        <h3 style={{ fontSize: '16px', margin: '0 0 16px 0', color: '#334155' }}>Riwayat Ketidakhadiran</h3>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', marginBottom: '12px' }}></i>
            <p>Memuat data...</p>
          </div>
        ) : data.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#10b981', background: '#ecfdf5', borderRadius: '16px' }}>
            <i className="fas fa-check-circle" style={{ fontSize: '32px', marginBottom: '12px' }}></i>
            <p style={{ margin: 0, fontWeight: 500 }}>Alhamdulillah, kehadiran 100%!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data.map((item, idx) => {
              const isAlpha = item.keterangan.toLowerCase().includes('alpha') || item.keterangan.toLowerCase().includes('alfa') || item.keterangan.toLowerCase() === 'a';
              const isIzin = item.keterangan.toLowerCase().includes('izin') || item.keterangan.toLowerCase().includes('ijin') || item.keterangan.toLowerCase() === 'i';
              
              const color = isAlpha ? '#ef4444' : isIzin ? '#3b82f6' : '#f59e0b';
              const bg = isAlpha ? '#fee2e2' : isIzin ? '#dbeafe' : '#fef3c7';

              return (
                <div key={idx} className="portal-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px', marginBottom: 0 }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: bg, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                    {item.keterangan.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#1e293b' }}>
                      {new Date(item.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </h4>
                    <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                      {item.mapel ? `${item.mapel} (${item.guru})` : 'Keterangan Umum'}
                    </p>
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: color }}>
                    {item.keterangan}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
