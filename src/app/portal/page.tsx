'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PortalIndex() {
  const router = useRouter();

  useEffect(() => {
    const session = localStorage.getItem('portal_session');
    if (session) {
      router.replace('/portal/dashboard');
    } else {
      router.replace('/portal/login');
    }
  }, [router]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8fafc' }}>
      <div style={{ color: '#94a3b8' }}>Memuat...</div>
    </div>
  );
}
