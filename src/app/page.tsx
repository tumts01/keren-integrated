import styles from "./page.module.css";
import Link from 'next/link';

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto', padding: '60px 20px' }}>
          <img src="/logo.png" alt="Logo Sekolah" style={{ width: '120px', height: '120px', objectFit: 'contain', marginBottom: '20px' }} />
          <h1 style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--text-main)', marginBottom: '8px', letterSpacing: '-1px' }}>
            KEREN
          </h1>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '16px' }}>
            Sistem Informasi Administrasi Digital MTs Almaarif 01 Singosari
          </h2>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', marginBottom: '40px', fontStyle: 'italic' }}>
            "Administrasi Lebih Mudah, Cepat, dan KEREN"
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
