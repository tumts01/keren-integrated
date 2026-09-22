'use client';
import { useRouter } from 'next/navigation';

export default function RekapOlimpiadeSeni() {
  const router = useRouter();

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <button 
          onClick={() => router.back()}
          style={{ width: '40px', height: '40px', borderRadius: '50%', border: 'none', background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}
        >
          <i className="fas fa-arrow-left"></i>
        </button>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Rekap Data Pendaftar</h1>
      </div>
      <div style={{ background: 'white', borderRadius: '16px', padding: '32px', textAlign: 'center', color: '#64748b' }}>
        <i className="fas fa-tools" style={{ fontSize: '3rem', color: '#cbd5e1', marginBottom: '16px' }}></i>
        <p>Halaman rekap data pendaftar sedang dalam pengembangan.</p>
      </div>
    </div>
  );
}
