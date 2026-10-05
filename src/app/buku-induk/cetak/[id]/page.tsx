'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import BukuIndukPrint from './BukuIndukPrint';
import LoadingScreen from '@/components/LoadingScreen';

export default function CetakBukuIndukPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    
    let isMounted = true;
    const fetchBukuInduk = async () => {
      try {
        const res = await fetch(`/api/buku-induk/${id}`);
        const json = await res.json();
        
        if (isMounted) {
          if (json.success) {
            setData(json.data);
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
  }, [id]);

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

  if (!data) return null;

  return (
    <div style={{ backgroundColor: '#525659', minHeight: '100vh', padding: '2rem 0' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
        <button 
          onClick={() => router.back()}
          style={{ padding: '0.5rem 1rem', cursor: 'pointer', backgroundColor: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}
        >
          &larr; Kembali
        </button>
        <button 
          onClick={() => window.print()}
          style={{ padding: '0.5rem 1rem', cursor: 'pointer', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}
        >
          <i className="fa-solid fa-print"></i> Cetak Dokumen
        </button>
      </div>
      
      {/* The Printable Component */}
      <BukuIndukPrint data={data} />
    </div>
  );
}
