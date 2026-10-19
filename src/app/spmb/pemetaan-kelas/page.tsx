'use client';

import Link from 'next/link';
import styles from '../rekap/Rekap.module.css';

export default function PemetaanKelasPage() {
  return (
    <div className={styles.container}>
      {/* Top Header */}
      <div className={styles.header}>
        <div className={styles.title}>
          <div className={styles.titleIcon}>
            <i className="fas fa-layer-group"></i>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span>Pemetaan Kelas SPMB</span>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500, marginTop: '2px' }}>
              MTs Almaarif 01 Singosari
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link
            href="/spmb/rekap"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 18px',
              background: '#047857',
              color: 'white',
              borderRadius: '10px',
              fontSize: '0.88rem',
              fontWeight: 700,
              textDecoration: 'none',
              boxShadow: '0 2px 4px rgba(4, 120, 87, 0.2)'
            }}
          >
            <i className="fas fa-arrow-left"></i> Rekap Pendaftar
          </Link>
        </div>
      </div>

      {/* Main Card - Under Construction / Coming Soon */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '48px 24px',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.05)',
        border: '1px solid #e2e8f0',
        textAlign: 'center',
        maxWidth: '850px',
        margin: '20px auto'
      }}>
        {/* Animated / Gradient Icon */}
        <div style={{
          width: '84px',
          height: '84px',
          borderRadius: '24px',
          background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
          color: '#047857',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2.5rem',
          marginBottom: '20px',
          boxShadow: '0 8px 16px rgba(4, 120, 87, 0.12)'
        }}>
          <i className="fas fa-layer-group"></i>
        </div>

        {/* Badge */}
        <div style={{ marginBottom: '14px' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: '#fef3c7',
            color: '#b45309',
            fontSize: '12px',
            fontWeight: 800,
            padding: '4px 14px',
            borderRadius: '20px',
            letterSpacing: '0.5px',
            textTransform: 'uppercase'
          }}>
            <i className="fas fa-tools"></i> Fitur Dalam Pengembangan
          </span>
        </div>

        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '10px' }}>
          Pemetaan Kelas Calon Siswa Baru
        </h2>

        <p style={{
          fontSize: '0.95rem',
          color: '#475569',
          lineHeight: '1.6',
          maxWidth: '620px',
          margin: '0 auto 32px auto'
        }}>
          Fitur ini disiapkan untuk memetakan dan mendistribusikan calon santri baru yang telah dinyatakan <b>Diterima</b> ke dalam rombel (kelas 7A, 7B, 7C, dst.) secara terorganisir.
        </p>

        {/* Feature Highlights Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          textAlign: 'left',
          marginBottom: '36px'
        }}>
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '16px 18px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{ color: '#047857', fontSize: '1.1rem' }}>
                <i className="fas fa-sliders-h"></i>
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>
                Distribusi Seimbang
              </div>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.5 }}>
              Proporsi merata berdasarkan jenis kelamin, jalur pendaftaran, dan sebaran asal sekolah.
            </div>
          </div>

          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '16px 18px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{ color: '#0284c7', fontSize: '1.1rem' }}>
                <i className="fas fa-chart-line"></i>
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>
                Pertimbangan Nilai
              </div>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.5 }}>
              Mempertimbangkan hasil tes peminatan, rapor kelas 5, dan nilai observasi calon santri.
            </div>
          </div>

          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '16px 18px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{ color: '#f59e0b', fontSize: '1.1rem' }}>
                <i className="fas fa-file-export"></i>
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>
                Sinkronisasi Otomatis
              </div>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.5 }}>
              Hasil pemetaan dapat langsung diintegrasikan ke modul Data Kelas dan Buku Induk madrasah.
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <Link
            href="/spmb/rekap"
            style={{
              padding: '10px 22px',
              borderRadius: '10px',
              background: '#047857',
              color: 'white',
              fontWeight: 700,
              fontSize: '0.9rem',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <i className="fas fa-list-alt"></i> Buka Rekap SPMB
          </Link>
          <Link
            href="/spmb"
            style={{
              padding: '10px 22px',
              borderRadius: '10px',
              background: '#f1f5f9',
              color: '#334155',
              fontWeight: 700,
              fontSize: '0.9rem',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              border: '1px solid #cbd5e1'
            }}
          >
            <i className="fas fa-user-plus"></i> Formulir Pendaftaran
          </Link>
        </div>
      </div>
    </div>
  );
}
