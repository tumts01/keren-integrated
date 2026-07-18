'use client';

import React, { useState } from 'react';
import styles from './presensi.module.css';

export default function PresensiPage() {
  const [activeTab, setActiveTab] = useState<'absen' | 'jurnal' | 'rekap_siswa' | 'rekap_jurnal'>('absen');

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Presensi & Jurnal Mengajar</h1>
        <p className={styles.subtitle}>Kelola kehadiran siswa dan aktivitas jurnal harian</p>
      </header>

      <div className={styles.tabsContainer}>
        <div className={styles.tabsWrapper}>
          <div className={styles.tabs}>
            <button 
              className={`${styles.tab} ${activeTab === 'absen' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('absen')}
            >
              <i className="fas fa-user-check"></i>
              Absen Siswa
            </button>
            <button 
              className={`${styles.tab} ${activeTab === 'jurnal' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('jurnal')}
            >
              <i className="fas fa-book-open"></i>
              Jurnal Mengajar
            </button>
            <button 
              className={`${styles.tab} ${activeTab === 'rekap_siswa' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('rekap_siswa')}
            >
              <i className="fas fa-users"></i>
              Rekap Siswa
            </button>
            <button 
              className={`${styles.tab} ${activeTab === 'rekap_jurnal' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('rekap_jurnal')}
            >
              <i className="fas fa-clipboard-list"></i>
              Rekap Jurnal
            </button>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        {activeTab === 'absen' && (
          <div className={styles.card}>
            <h2>Absen Siswa</h2>
            <p className={styles.placeholderText}>Modul pengisian absensi siswa akan segera hadir. Menunggu konfigurasi spreadsheet.</p>
          </div>
        )}
        
        {activeTab === 'jurnal' && (
          <div className={styles.card}>
            <h2>Jurnal Mengajar</h2>
            <p className={styles.placeholderText}>Modul pengisian jurnal mengajar akan segera hadir. Menunggu konfigurasi spreadsheet.</p>
          </div>
        )}

        {activeTab === 'rekap_siswa' && (
          <div className={styles.card}>
            <h2>Rekap Siswa</h2>
            <p className={styles.placeholderText}>Modul rekap absensi per siswa akan segera hadir. Menunggu konfigurasi spreadsheet.</p>
          </div>
        )}

        {activeTab === 'rekap_jurnal' && (
          <div className={styles.card}>
            <h2>Rekap Jurnal</h2>
            <p className={styles.placeholderText}>Modul rekap jurnal mengajar akan segera hadir. Menunggu konfigurasi spreadsheet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
