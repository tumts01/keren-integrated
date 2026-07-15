'use client';
import { useState, useEffect } from 'react';
import styles from './Guru.module.css';

interface Guru {
  id: number;
  status: string;
  nip: string;
  pegId: string;
  nama: string;
  jenisKelamin: string;
  jabatan: string;
  noHp: string;
  alamat: string;
  email: string;
}

export default function GuruPage() {
  const [data, setData] = useState<Guru[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/guru');
        const result = await res.json();
        if (result.success) {
          setData(result.data);
        } else {
          setError(result.error);
        }
      } catch (err) {
        setError('Gagal memuat data. Periksa koneksi internet Anda.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredData = data.filter(g => 
    g.nama.toLowerCase().includes(searchTerm.toLowerCase()) || 
    g.nip.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.jabatan.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>
          <div className={styles.titleIcon}>
            <i className="fas fa-chalkboard-teacher"></i>
          </div>
          Data Guru & Staf
        </div>
        
        <div className={styles.actions}>
          <div className={styles.searchBox}>
            <i className={`fas fa-search ${styles.searchIcon}`}></i>
            <input 
              type="text" 
              placeholder="Cari nama, NIP, atau jabatan..." 
              className={styles.searchInput}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="btn btn-primary">
            <i className="fas fa-plus"></i> Tambah Data
          </button>
        </div>
      </div>

      <div className={styles.card}>
        {loading ? (
          <div className={styles.loading}>
            <i className={`fas fa-circle-notch ${styles.spinner}`}></i>
            <p>Memuat Data Guru dari Spreadsheet...</p>
          </div>
        ) : error ? (
          <div className={styles.loading} style={{ color: 'var(--danger)' }}>
            <i className="fas fa-exclamation-triangle" style={{ fontSize: '2rem' }}></i>
            <p>{error}</p>
          </div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Profil</th>
                  <th>Jenis Kelamin</th>
                  <th>Jabatan</th>
                  <th>Kontak</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length > 0 ? (
                  filteredData.map(guru => (
                    <tr key={guru.id}>
                      <td>
                        <div className={styles.profileCell}>
                          <div className={styles.avatar}>
                            {guru.nama.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div>
                            <span className={styles.nama}>{guru.nama || '-'}</span>
                            <span className={styles.nip}>{guru.nip ? `NIP: ${guru.nip}` : 'NIP: -'}</span>
                          </div>
                        </div>
                      </td>
                      <td>{guru.jenisKelamin || '-'}</td>
                      <td>{guru.jabatan || '-'}</td>
                      <td>
                        <div style={{ fontSize: '0.85rem' }}>
                          <div style={{ color: '#0f172a', fontWeight: 500 }}><i className="fab fa-whatsapp" style={{ color: '#22c55e', width: '16px' }}></i> {guru.noHp || '-'}</div>
                          <div style={{ color: '#64748b' }}><i className="far fa-envelope" style={{ width: '16px' }}></i> {guru.email || '-'}</div>
                        </div>
                      </td>
                      <td>
                        <span className={`${styles.badge} ${guru.status.toLowerCase().includes('aktif') && !guru.status.toLowerCase().includes('non') ? styles.badgeAktif : styles.badgeNon}`}>
                          {guru.status || 'Tidak Diketahui'}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Detail</button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}>
                      <i className="fas fa-folder-open" style={{ fontSize: '3rem', color: '#cbd5e1', marginBottom: '16px', display: 'block' }}></i>
                      Tidak ada data guru yang ditemukan. Coba cek isi Excel Anda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
