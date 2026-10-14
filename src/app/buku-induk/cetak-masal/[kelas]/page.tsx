'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import BukuIndukPrint from '../../cetak/[id]/BukuIndukPrint';
import LoadingScreen from '@/components/LoadingScreen';

export default function CetakMasalBukuIndukPage() {
  const params = useParams();
  const router = useRouter();
  const kelas = params?.kelas ? decodeURIComponent(params.kelas as string) : '';

  const [studentsData, setStudentsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!kelas) return;
    
    let isMounted = true;
    const fetchBukuInduk = async () => {
      try {
        const res = await fetch(`/api/buku-induk/kelas/${encodeURIComponent(kelas)}`);
        const json = await res.json();
        
        if (isMounted) {
          if (json.success) {
            setStudentsData(json.data);
          } else {
            setError(json.error || 'Failed to load data');
          }
        }
      } catch (err: any) {
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    fetchBukuInduk();
    
    return () => { isMounted = false; };
  }, [kelas]);

  if (loading) return <LoadingScreen />;
  
  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h2 style={{ color: 'red' }}>Error</h2>
        <p>{error}</p>
        <button 
          onClick={() => router.back()}
          style={{ padding: '0.5rem 1rem', marginTop: '1rem', cursor: 'pointer' }}
        >
          Kembali
        </button>
      </div>
    );
  }

  if (studentsData.length === 0) return null;

  return (
    <div className="print-bg" style={{ minHeight: '100vh', padding: '1.5rem 0' }}>
      <div className="no-print" style={{ maxWidth: '1000px', margin: '0 auto', marginBottom: '1rem', padding: '0.75rem 1rem', background: '#1e293b', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
        <button 
          onClick={() => router.back()}
          style={{ padding: '0.5rem 1rem', cursor: 'pointer', backgroundColor: '#334155', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '0.875rem' }}
        >
          &larr; Kembali
        </button>
        <div style={{ color: 'white', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>📑 Cetak Masal Kelas {kelas} ({studentsData.length} Siswa — {studentsData.length * 2} Halaman)</span>
        </div>
        <button 
          onClick={() => window.print()}
          style={{ padding: '0.5rem 1.25rem', cursor: 'pointer', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 6px rgba(16, 185, 129, 0.4)' }}
        >
          <i className="fa-solid fa-print"></i> Cetak Dokumen
        </button>
      </div>
      
      {/* Map each student to a BukuIndukPrint component */}
      {studentsData.map((student, idx) => (
        <BukuIndukPrint key={student.nis || idx} data={student} />
      ))}
    </div>
  );
}
