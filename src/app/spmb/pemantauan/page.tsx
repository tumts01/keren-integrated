'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '../rekap/Rekap.module.css';
import MonitoringSpmb from '../components/MonitoringSpmb';
import LoadingScreen from '@/components/LoadingScreen';

export default function PemantauanSpmbPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const userStr = localStorage.getItem('keren_user_data');
    if (!userStr) {
      router.replace('/');
      return;
    }
    try {
      const user = JSON.parse(userStr);
      if (user) {
        setIsAuthorized(true);
      } else {
        router.replace('/');
        return;
      }
    } catch (e) {
      console.error(e);
      router.replace('/');
      return;
    }

    fetchData();
  }, [router]);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/spmb/rekap');
      const result = await res.json();
      if (result.success) {
        setData(result.data || []);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Gagal memuat data dari server.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSchoolFilter = (schoolName: string) => {
    router.push(`/spmb/rekap?sekolah=${encodeURIComponent(schoolName)}`);
  };

  const handleSelectLocationFilter = (locName: string) => {
    router.push(`/spmb/rekap?wilayah=${encodeURIComponent(locName)}`);
  };

  if (!isAuthorized || loading) {
    return <LoadingScreen message="Memuat data pemantauan input SPMB..." />;
  }

  return (
    <div className={styles.container}>
      {/* HEADER UTAMA */}
      <div className={styles.header}>
        <div className={styles.title}>
          <div className={styles.titleIcon} style={{ color: '#059669' }}>
            <i className="fas fa-chart-pie"></i>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span>Pemantauan Data Input SPMB</span>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500, marginTop: '2px' }}>
              Monitoring spesifik jumlah pendaftar masuk, sebaran asal SD/MI, wilayah domisili, dan jalur pendaftaran.
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            type="button"
            onClick={fetchData}
            style={{
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              color: '#334155',
              padding: '9px 16px',
              borderRadius: '10px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <i className="fas fa-sync-alt"></i> Refresh Data
          </button>

          <Link
            href="/spmb/rekap"
            style={{
              background: '#059669',
              color: 'white',
              padding: '9px 18px',
              borderRadius: '10px',
              fontSize: '0.88rem',
              fontWeight: 700,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)'
            }}
          >
            <i className="fas fa-list-alt"></i> Buka Tabel Rekap Siswa
          </Link>
        </div>
      </div>

      {/* SUB-MENU TABS SPMB */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '22px',
        borderBottom: '2px solid #e2e8f0',
        paddingBottom: '2px',
        overflowX: 'auto'
      }}>
        <Link
          href="/spmb/rekap"
          style={{
            padding: '10px 18px',
            fontSize: '0.92rem',
            fontWeight: 600,
            color: '#64748b',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap'
          }}
        >
          <i className="fas fa-list-alt"></i> Rekap Tabel Data Siswa
        </Link>
        <div
          style={{
            padding: '10px 18px',
            fontSize: '0.92rem',
            fontWeight: 700,
            color: '#059669',
            borderBottom: '3px solid #059669',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap',
            cursor: 'default'
          }}
        >
          <i className="fas fa-chart-pie"></i> Pemantauan Input &amp; Asal SD/MI
        </div>
        <Link
          href="/spmb/pemetaan-kelas"
          style={{
            padding: '10px 18px',
            fontSize: '0.92rem',
            fontWeight: 600,
            color: '#64748b',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap'
          }}
        >
          <i className="fas fa-layer-group"></i> Pemetaan Kelas
        </Link>
      </div>

      {/* ERROR ALERT IF ANY */}
      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #ef4444', color: '#b91c1c', padding: '12px 16px', borderRadius: 10, marginBottom: 16 }}>
          <i className="fas fa-exclamation-triangle" style={{ marginRight: 8 }}></i>
          {error}
        </div>
      )}

      {/* MONITORING DASHBOARD PANEL */}
      <MonitoringSpmb
        data={data}
        onSelectSchoolFilter={handleSelectSchoolFilter}
        onSelectLocationFilter={handleSelectLocationFilter}
      />
    </div>
  );
}
