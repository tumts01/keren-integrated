'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import BukuIndukPrint from '../cetak/[id]/BukuIndukPrint';
import LoadingScreen from '@/components/LoadingScreen';

function CetakTerpilihContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [studentsData, setStudentsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const fetchBatchData = async () => {
      try {
        // 1. Get IDs from sessionStorage or searchParams
        let ids: string[] = [];
        const paramIds = searchParams.get('ids');
        if (paramIds) {
          ids = paramIds.split(',').map(s => s.trim()).filter(Boolean);
        } else {
          try {
            const raw = sessionStorage.getItem('buku_induk_selected_ids');
            if (raw) ids = JSON.parse(raw);
          } catch (e) {
            console.error('Error reading sessionStorage:', e);
          }
        }

        if (ids.length === 0) {
          setError('Tidak ada siswa yang dipilih untuk dicetak. Silakan kembali ke menu Buku Induk dan pilih siswa.');
          setLoading(false);
          return;
        }

        const res = await fetch('/api/buku-induk/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids })
        });

        const json = await res.json();
        if (isMounted) {
          if (json.success && json.data) {
            setStudentsData(json.data);
          } else {
            setError(json.error || 'Gagal memuat data cetak siswa.');
          }
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Terjadi kesalahan sistem');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchBatchData();
    return () => { isMounted = false; };
  }, [searchParams]);

  if (loading) return <LoadingScreen />;

  if (error) {
    return (
      <div style={{ padding: '3rem 1.5rem', textAlign: 'center', fontFamily: 'sans-serif', maxWidth: '500px', margin: '4rem auto', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
        <div style={{ fontSize: '3rem', color: '#ef4444', marginBottom: '1rem' }}>⚠️</div>
        <h2 style={{ color: '#1e293b', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Perhatian</h2>
        <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.5 }}>{error}</p>
        <button 
          onClick={() => router.push('/buku-induk')}
          style={{ padding: '0.6rem 1.5rem', marginTop: '1.5rem', cursor: 'pointer', backgroundColor: '#0284c7', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem' }}
        >
          &larr; Kembali ke Buku Induk
        </button>
      </div>
    );
  }

  if (studentsData.length === 0) return null;

  return (
    <div className="print-bg" style={{ minHeight: '100vh', padding: '1.5rem 0' }}>
      <div className="no-print" style={{ maxWidth: '1000px', margin: '0 auto', marginBottom: '1rem', padding: '0.75rem 1rem', background: '#1e293b', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
        <button 
          onClick={() => router.push('/buku-induk')}
          style={{ padding: '0.5rem 1rem', cursor: 'pointer', backgroundColor: '#334155', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          &larr; Kembali
        </button>

        <div style={{ color: 'white', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>📑 Cetak Masal ({studentsData.length} Siswa — {studentsData.length * 2} Halaman)</span>
        </div>

        <button 
          onClick={() => window.print()}
          style={{ padding: '0.5rem 1.25rem', cursor: 'pointer', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 6px rgba(16, 185, 129, 0.4)' }}
        >
          <i className="fa-solid fa-print"></i> Cetak Dokumen
        </button>
      </div>

      {/* Map each student to BukuIndukPrint */}
      {studentsData.map((student, idx) => (
        <BukuIndukPrint key={student.nis || student.id_siswa || idx} data={student} />
      ))}
    </div>
  );
}

export default function CetakTerpilihPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <CetakTerpilihContent />
    </Suspense>
  );
}
