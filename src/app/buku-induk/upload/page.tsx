'use client';

import React, { useState, useEffect } from 'react';
import styles from '../BukuInduk.module.css';
import InlineLoading from '@/components/InlineLoading';

export default function UploadLeggerPage() {
  const [loading, setLoading] = useState(true);
  const [rekap, setRekap] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const fetchRekap = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/buku-induk/rekap-upload');
      const json = await res.json();
      if (json.success) {
        setRekap(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRekap();
  }, []);

  const handleUploadLegger = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/buku-induk/upload-legger', {
        method: 'POST',
        body: formData,
      });
      const result = await res.json();
      if (result.success) {
        alert(`Berhasil upload legger Kelas ${result.kelas} Semester ${result.semester}! (${result.count} data nilai tersimpan)`);
        fetchRekap(); // refresh table
      } else {
        alert(`Gagal upload: ${result.error}`);
      }
    } catch (err: any) {
      alert(`Error upload: ${err.message}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Upload Legger Nilai</h1>
          <p className={styles.pageDescription}>Upload file Excel Legger Nilai untuk Buku Induk.</p>
        </div>
        <div>
          <input 
            type="file" 
            accept=".xlsx" 
            ref={fileInputRef} 
            onChange={handleUploadLegger} 
            style={{ display: 'none' }} 
          />
          <button 
            className={styles.primaryButton} 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              backgroundColor: '#3b82f6',
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              fontWeight: '600',
              borderRadius: '0.5rem',
              boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3), 0 2px 4px -1px rgba(59, 130, 246, 0.06)',
              cursor: isUploading ? 'not-allowed' : 'pointer',
              color: 'white',
              border: 'none',
              transition: 'all 0.2s ease-in-out'
            }}
          >
            <i className={`fa-solid ${isUploading ? 'fa-spinner fa-spin' : 'fa-upload'}`}></i> 
            {isUploading ? 'Mengupload...' : 'Upload Legger Excel'}
          </button>
        </div>
      </div>

      <div className={styles.card}>
        <div className="section-title" style={{ marginBottom: '1rem', fontWeight: 'bold' }}>
          Monitoring Legger Terupload
        </div>
        {loading ? (
          <InlineLoading message="Memuat rekap..." />
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>No</th>
                  <th>Tahun Ajaran</th>
                  <th>Semester</th>
                  <th>Kelas</th>
                  <th>Jumlah Mapel Terupload</th>
                  <th>Waktu Upload Terakhir</th>
                </tr>
              </thead>
              <tbody>
                {rekap.map((r, idx) => (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td>{r.tahun_ajaran}</td>
                    <td>{r.semester}</td>
                    <td>{r.kelas}</td>
                    <td>{r.mapel_count} Mapel</td>
                    <td>{new Date(r.created_at).toLocaleString('id-ID')}</td>
                  </tr>
                ))}
                {rekap.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>Belum ada Legger yang diupload.</td>
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
