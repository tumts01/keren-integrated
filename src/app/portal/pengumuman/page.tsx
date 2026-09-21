'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PortalPengumuman() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sessionStr = localStorage.getItem('portal_session');
    if (!sessionStr) {
      router.replace('/portal/login');
      return;
    }

    fetch(`/api/pengumuman`)
      .then(res => res.json())
      .then(resData => {
        if (resData.success) {
          setData(resData.data);
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  const getDriveUrl = (url: string) => {
    if (!url) return '';
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    return match ? `https://drive.google.com/thumbnail?id=${match[1]}&sz=w600` : '';
  };

  return (
    <div className="portal-container" style={{ paddingBottom: '40px' }}>
      <div className="portal-header" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer' }}>
          <i className="fas fa-arrow-left"></i>
        </button>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Pengumuman Madrasah</h2>
      </div>

      <div className="portal-content" style={{ marginTop: '16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', marginBottom: '12px' }}></i>
            <p>Memuat data...</p>
          </div>
        ) : data.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
            <i className="fas fa-bell-slash" style={{ fontSize: '32px', marginBottom: '12px' }}></i>
            <p>Belum ada pengumuman.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {data.map((item, idx) => {
              const imgUrl = getDriveUrl(item.lampiran);
              return (
                <div key={idx} className="portal-card" style={{ padding: '0', overflow: 'hidden', marginBottom: 0 }}>
                  {imgUrl && (
                    <img 
                      src={imgUrl} 
                      alt="Lampiran" 
                      style={{ width: '100%', height: 'auto', maxHeight: '200px', objectFit: 'cover', display: 'block' }} 
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}
                  <div style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontSize: '12px', color: '#64748b', background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px' }}>
                        <i className="far fa-calendar-alt" style={{ marginRight: '4px' }}></i>
                        {item.tanggal}
                      </span>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                        {item.jam}
                      </span>
                    </div>
                    
                    <p style={{ margin: 0, fontSize: '14px', color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {item.isi}
                    </p>

                    <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #f1f5f9', fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="fas fa-user-circle"></i>
                      Oleh: {item.pengirim || 'Admin'}
                    </div>
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
