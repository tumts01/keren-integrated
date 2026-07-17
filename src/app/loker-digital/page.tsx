'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import styles from './Loker.module.css';

export default function LokerDigital() {
  const [lokerData, setLokerData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [needsConfig, setNeedsConfig] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadingFolderId, setUploadingFolderId] = useState<string | null>(null);

  useEffect(() => {
    fetchLokerData();
  }, []);

  const fetchLokerData = async () => {
    try {
      const res = await fetch('/api/loker');
      const json = await res.json();
      
      if (json.success) {
        setLokerData(json.data);
      } else {
        setError(json.error);
        if (json.needsConfig) {
          setNeedsConfig(true);
        }
      }
    } catch (err) {
      setError('Gagal memuat data Loker Digital.');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, folderId: string) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    setUploadingFolderId(folderId);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folderId', folderId);

    try {
      const res = await fetch('/api/loker/upload', {
        method: 'POST',
        body: formData
      });
      const json = await res.json();
      
      if (json.success) {
        alert('File berhasil diunggah ke Google Drive!');
      } else {
        alert('Gagal mengunggah: ' + json.error);
      }
    } catch (err) {
      alert('Terjadi kesalahan saat mengunggah file.');
    } finally {
      setUploadingFolderId(null);
      // Reset input
      e.target.value = '';
    }
  };

  const filteredData = lokerData.filter(item => 
    item.nama.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>
          <div className={styles.titleIcon}>
            <i className="fas fa-folder-open"></i>
          </div>
          Loker Digital GTK
        </div>
        
        <div className={styles.searchBox}>
          <i className={`fas fa-search ${styles.searchIcon}`}></i>
          <input 
            type="text" 
            placeholder="Cari guru..." 
            className={styles.searchInput}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>
          <i className={`fas fa-circle-notch ${styles.spinner}`}></i>
          <p>Sinkronisasi Loker Digital dengan Google Drive...</p>
        </div>
      ) : error ? (
        <div className={styles.errorState}>
          <i className="fas fa-exclamation-triangle"></i>
          <h3>Oops, Terjadi Kesalahan!</h3>
          <p>{error}</p>
          {needsConfig && (
            <p style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '10px' }}>
              Tambahkan <strong>GOOGLE_DRIVE_LOKER_GTK_FOLDER_ID=id_folder</strong> ke file <code>.env.local</code> Anda.
            </p>
          )}
        </div>
      ) : (
        <div className={styles.grid}>
          {filteredData.map((guru) => (
            <div key={guru.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.avatar}>
                  {guru.foto ? (
                    <img src={guru.foto} alt={guru.nama} className={styles.avatarImg} />
                  ) : (
                    getInitials(guru.nama)
                  )}
                </div>
                <div className={styles.info}>
                  <div className={styles.nama} title={guru.nama}>{guru.nama}</div>
                  <div className={styles.status}>{guru.status}</div>
                </div>
              </div>

              {!guru.lokerFolder && (
                <div className={styles.noFolder}>
                  <i className="fas fa-times-circle"></i> Folder tidak ditemukan di Drive
                </div>
              )}

              <div className={styles.actions}>
                {guru.lokerFolder ? (
                  <a 
                    href={guru.lokerFolder.webViewLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={`${styles.btnLoker} ${styles.active}`}
                  >
                    <i className="fas fa-external-link-alt"></i> Buka Loker
                  </a>
                ) : (
                  <button className={styles.btnLoker} disabled>
                    <i className="fas fa-folder-minus"></i> Loker Kosong
                  </button>
                )}
                
                <input 
                  type="file" 
                  id={`file-${guru.id}`} 
                  style={{ display: 'none' }}
                  onChange={(e) => guru.lokerFolder && handleUpload(e, guru.lokerFolder.id)}
                />
                <button 
                  className={styles.btnUpload} 
                  title="Upload Berkas" 
                  disabled={!guru.lokerFolder || uploadingFolderId === guru.lokerFolder?.id}
                  onClick={() => document.getElementById(`file-${guru.id}`)?.click()}
                >
                  {uploadingFolderId === guru.lokerFolder?.id ? (
                    <i className="fas fa-spinner fa-spin"></i>
                  ) : (
                    <i className="fas fa-cloud-upload-alt"></i>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
