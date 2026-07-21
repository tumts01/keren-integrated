'use client';

import React, { useEffect, useState } from 'react';
import styles from './sajian-data.module.css';

export default function SajianDataPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/sajian-data')
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          setData(json.data);
        } else {
          setError(json.error || 'Gagal memuat data');
        }
      })
      .catch(err => {
        setError('Terjadi kesalahan jaringan');
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', marginBottom: '16px' }}></i>
          Memuat Sajian Data...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px' }}></i>
          {error || 'Data tidak tersedia'}
        </div>
      </div>
    );
  }

  const { guruStaf, siswa } = data;

  const renderRincianLP = (label: string, lpObj: { L: number, P: number }) => {
    const total = (lpObj.L || 0) + (lpObj.P || 0);
    return (
      <div className={styles.statRow} key={label}>
        <span className={styles.statLabel}>{label}</span>
        <span>
          <span className={styles.statValueL}>{lpObj.L} L</span> / <span className={styles.statValueP}>{lpObj.P} P</span>
          <span style={{ marginLeft: '8px', color: '#94a3b8' }}>({total})</span>
        </span>
      </div>
    );
  };

  const renderRincianSingle = (label: string, value: number) => {
    return (
      <div className={styles.statRow} key={label}>
        <span className={styles.statLabel}>{label}</span>
        <span className={styles.statValue}>{value}</span>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Sajian Data</h1>
        <p className={styles.subtitle}>Rekapitulasi data statistik Guru, Staf, dan Siswa</p>
      </header>

      {/* Bagian Guru & Staf */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <i className="fas fa-chalkboard-user" style={{ color: '#0ea5e9' }}></i>
          Data Guru & Staf
        </h2>
        
        <div className={styles.grid}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>Total Guru & Staf</div>
            <div className={styles.totalHighlight}>{guruStaf.total.Total}</div>
            <div className={styles.subTotal}>
              <span className={styles.badgeL}><i className="fas fa-mars mr-1"></i> {guruStaf.total.L} Laki-laki</span>
              <span className={styles.badgeP}><i className="fas fa-venus mr-1"></i> {guruStaf.total.P} Perempuan</span>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>Pendidikan Terakhir</div>
            {Object.keys(guruStaf.pendidikan).map(k => renderRincianLP(k, guruStaf.pendidikan[k]))}
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>Domisili</div>
            {Object.keys(guruStaf.domisili).map(k => renderRincianLP(k, guruStaf.domisili[k]))}
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>Status Guru</div>
            {Object.keys(guruStaf.status).map(k => renderRincianLP(k, guruStaf.status[k]))}
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>Sertifikasi</div>
            {renderRincianLP('Sudah Sertifikasi', guruStaf.sertifikasi)}
          </div>
        </div>
      </section>

      {/* Bagian Siswa */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <i className="fas fa-user-graduate" style={{ color: '#10b981' }}></i>
          Data Siswa
        </h2>
        
        <div className={styles.grid}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>Total Siswa</div>
            <div className={styles.totalHighlight} style={{ color: '#10b981' }}>{siswa.total.Total}</div>
            <div className={styles.subTotal}>
              <span className={styles.badgeL}><i className="fas fa-mars mr-1"></i> {siswa.total.L} Laki-laki</span>
              <span className={styles.badgeP}><i className="fas fa-venus mr-1"></i> {siswa.total.P} Perempuan</span>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>Asal Sekolah</div>
            {Object.keys(siswa.asalSekolah).map(k => renderRincianLP(k, siswa.asalSekolah[k]))}
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>Domisili Siswa</div>
            {Object.keys(siswa.domisili).map(k => renderRincianSingle(k, siswa.domisili[k]))}
          </div>
        </div>
      </section>
    </div>
  );
}
