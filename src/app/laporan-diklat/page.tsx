'use client';
import LaporanDiklatTab from '@/components/LaporanDiklatTab';
import styles from '@/app/jurnal-kegiatan/JurnalKegiatan.module.css';

export default function LaporanDiklatPage() {
  return (
    <div className={styles.container}>
      <div className={styles.header} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '6px', marginBottom: '10px' }}>
        <h1 className={styles.title}>
          <i className="fas fa-graduation-cap" style={{ color: '#059669', marginRight: '8px' }}></i>
          Laporan Diklat &amp; Workshop
        </h1>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem' }}>
          Dokumentasi dan pelaporan resmi hasil workshop, diklat, dan pelatihan guru &amp; staf MTs Almaarif 01 Singosari.
        </p>
      </div>

      <LaporanDiklatTab />
    </div>
  );
}
