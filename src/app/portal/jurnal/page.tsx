'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PortalJurnal() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sessionStr = localStorage.getItem('portal_session');
    if (!sessionStr) {
      router.replace('/portal/login');
      return;
    }
    const student = JSON.parse(sessionStr);

    fetch(`/api/portal/jurnal?kelas=${encodeURIComponent(student.kelas)}`)
      .then(res => res.json())
      .then(resData => {
        if (resData.success) {
          setData(resData.data);
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
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Jurnal Pembelajaran</h2>
      </div>

      <div className="portal-content" style={{ marginTop: '16px' }}>
        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
          Menampilkan materi yang diajarkan di kelas anak Anda selama 3 bulan terakhir.
        </p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', marginBottom: '12px' }}></i>
            <p>Memuat data...</p>
          </div>
        ) : data.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
            <i className="fas fa-book-open" style={{ fontSize: '32px', marginBottom: '12px' }}></i>
            <p>Belum ada jurnal pembelajaran yang dicatat.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {data.map((item, idx) => (
              <div key={idx} className="portal-card" style={{ padding: '16px', marginBottom: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', marginBottom: '12px' }}>
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#1e293b' }}>{item.mapel}</h4>
                    <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}><i className="fas fa-user-tie" style={{marginRight:'4px'}}></i> {item.namaGuru}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#0ea5e9' }}>
                      {new Date(item.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Jam ke: {item.jamKe}</div>
                  </div>
                </div>
                <div>
                  <h5 style={{ margin: '0 0 6px 0', fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase' }}>Materi / Kegiatan:</h5>
                  <p style={{ margin: 0, fontSize: '14px', color: '#334155', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                    {item.materi || '-'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
