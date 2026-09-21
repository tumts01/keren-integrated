'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PortalNilai() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const sessionStr = localStorage.getItem('portal_session');
    if (!sessionStr) {
      router.replace('/portal/login');
      return;
    }
    const student = JSON.parse(sessionStr);

    fetch(`/api/portal/nilai?nisn=${student.nisn}`)
      .then(res => res.json())
      .then(resData => {
        if (resData.success) {
          setData(resData.data);
          setMessage(resData.message);
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
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Nilai & Rapor</h2>
      </div>

      <div className="portal-content" style={{ marginTop: '16px' }}>
        
        {message && (
          <div style={{ background: '#fef3c7', borderRadius: '12px', padding: '12px 16px', marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <i className="fas fa-tools" style={{ color: '#d97706', marginTop: '4px' }}></i>
            <p style={{ margin: 0, fontSize: '13px', color: '#92400e', lineHeight: 1.5 }}>
              {message}
            </p>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', marginBottom: '12px' }}></i>
            <p>Memuat data...</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data.map((item, idx) => (
              <div key={idx} className="portal-card" style={{ padding: '16px', marginBottom: 0 }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#1e293b', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                  {item.mapel}
                </h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', textAlign: 'center' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>PH 1</div>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: '#334155' }}>{item.ph1}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>PH 2</div>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: '#334155' }}>{item.ph2}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>STS</div>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: '#0ea5e9' }}>{item.pts}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>SAS</div>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: '#10b981' }}>{item.pas}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
