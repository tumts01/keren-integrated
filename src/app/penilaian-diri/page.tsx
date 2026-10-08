'use client';
import React, { useState, useEffect } from 'react';
import styles from '@/styles/presensi.module.css';

export default function PenilaianDiriPage() {
  const [loading, setLoading] = useState(false);

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>Penilaian Diri</h1>
      <p className={styles.pageSubtitle}>Form evaluasi dan penilaian diri untuk guru dan siswa</p>

      <div className={styles.card} style={{ maxWidth: '800px', margin: '20px auto' }}>
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
          <i className="fas fa-tools" style={{ fontSize: '3rem', marginBottom: '15px', color: '#cbd5e1' }}></i>
          <h3>Sedang Dalam Pengembangan</h3>
          <p>Fitur Penilaian Diri akan segera hadir di sini.</p>
        </div>
      </div>
    </div>
  );
}
