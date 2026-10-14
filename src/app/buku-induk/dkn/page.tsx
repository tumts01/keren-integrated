'use client';

import React from 'react';
import Link from 'next/link';
import styles from '../BukuInduk.module.css';

export default function DknPage() {
  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>DKN (Daftar Kumpulan Nilai)</h1>
          <p className={styles.pageDescription}>
            Halaman Daftar Kumpulan Nilai (DKN) Buku Induk siswa.
          </p>
        </div>
        <div>
          <Link 
            href="/buku-induk" 
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              background: '#f1f5f9',
              borderRadius: '8px',
              color: '#334155',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: 600
            }}
          >
            &larr; Kembali ke Buku Induk
          </Link>
        </div>
      </div>

      <div className={styles.card} style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: '#e0f2fe',
          color: '#0284c7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2rem',
          margin: '0 auto 1.5rem auto'
        }}>
          <i className="fas fa-file-invoice"></i>
        </div>
        <h2 style={{ fontSize: '1.4rem', color: '#0f172a', margin: '0 0 0.5rem 0' }}>
          Menu DKN (Daftar Kumpulan Nilai)
        </h2>
        <p style={{ color: '#64748b', maxWidth: '500px', margin: '0 auto 1.5rem auto', lineHeight: 1.6 }}>
          Sub menu DKN telah berhasil disiapkan di menu Buku Induk. Format tabel dan cetak DKN akan segera disesuaikan sesuai kebutuhan madrasah.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link 
            href="/buku-induk" 
            style={{
              padding: '10px 20px',
              background: '#0284c7',
              color: 'white',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.9rem'
            }}
          >
            Buku Induk Siswa
          </Link>
          <Link 
            href="/buku-induk/upload" 
            style={{
              padding: '10px 20px',
              background: '#f8fafc',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.9rem'
            }}
          >
            Upload Legger
          </Link>
        </div>
      </div>
    </div>
  );
}
