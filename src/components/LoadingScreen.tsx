'use client';
import { Lottie } from 'lottie-react';
import searchingAnimation from '@/assets/animations/searching.json';

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({ message = 'Memuat data...' }: LoadingScreenProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      gap: '16px',
    }}>
      <div style={{ width: 160, height: 160 }}>
        <Lottie src={searchingAnimation} loop autoplay />
      </div>
      <p style={{ color: '#64748b', fontSize: '1rem', fontWeight: 500 }}>{message}</p>
    </div>
  );
}
