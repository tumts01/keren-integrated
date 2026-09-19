'use client';
import { Lottie } from 'lottie-react';
import searchingAnimation from '@/assets/animations/searching.json';

interface InlineLoadingProps {
  message?: string;
}

export default function InlineLoading({ message = 'Memuat data...' }: InlineLoadingProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      gap: '8px',
    }}>
      <div style={{ width: 100, height: 100 }}>
        <Lottie src={searchingAnimation} loop autoplay />
      </div>
      <p style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 500, margin: 0 }}>{message}</p>
    </div>
  );
}
