import styles from "./page.module.css";
import Link from 'next/link';

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto', padding: '60px 20px' }}>
          <i className="fas fa-school" style={{ fontSize: '4rem', color: 'var(--gold)', marginBottom: '24px' }}></i>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '16px' }}>
            Selamat Datang di KEREN Integrated
          </h1>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', marginBottom: '40px', lineHeight: 1.6 }}>
            Sistem Informasi Manajemen Terpadu MTs Almaarif 01 Singosari. Kelola data Kesiswaan dan Anggaran Nota Bon dalam satu portal pintar.
          </p>
          
          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/siswa" className="card" style={{ textDecoration: 'none', width: '250px', textAlign: 'center' }}>
              <i className="fas fa-users" style={{ fontSize: '2rem', color: 'var(--primary)', marginBottom: '16px' }}></i>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '8px', color: 'var(--text-main)' }}>Data Siswa</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Lihat & Kelola Profil</p>
            </Link>
            
            <Link href="/bon" className="card" style={{ textDecoration: 'none', width: '250px', textAlign: 'center' }}>
              <i className="fas fa-file-invoice-dollar" style={{ fontSize: '2rem', color: 'var(--gold)', marginBottom: '16px' }}></i>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '8px', color: 'var(--text-main)' }}>Nota Bon</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Pengajuan & Realisasi</p>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
