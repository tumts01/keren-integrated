'use client';

import React, { useState, useEffect } from 'react';
import styles from '../BukuInduk.module.css';
import InlineLoading from '@/components/InlineLoading';

export default function UploadLeggerPage() {
  const [loading, setLoading] = useState(true);
  const [rekap, setRekap] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [previewData, setPreviewData] = useState<any[] | null>(null);
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
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const formData = new FormData();
    Array.from(files).forEach(f => formData.append('file', f));

    try {
      const res = await fetch('/api/buku-induk/upload-legger', {
        method: 'POST',
        body: formData,
      });
      const result = await res.json();
      if (result.success) {
        setPreviewData(result.previews);
      } else {
        alert(`Gagal membaca file: ${result.error}`);
      }
    } catch (err: any) {
      alert(`Error upload: ${err.message}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirmSave = async () => {
    if (!previewData) return;
    setIsUploading(true);
    try {
      const payloads = previewData.filter(p => !p.error).map(p => ({
        kelas: p.kelas,
        semester: p.semester,
        tahun_ajaran: p.tahun_ajaran,
        insertPayload: p.insertPayload
      }));

      if (payloads.length === 0) {
        alert('Tidak ada file valid untuk disimpan.');
        setIsUploading(false);
        return;
      }

      const res = await fetch('/api/buku-induk/upload-legger?action=save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payloads })
      });
      const result = await res.json();
      if (result.success) {
        alert(`Berhasil menyimpan ${result.count} data nilai!`);
        setPreviewData(null);
        fetchRekap();
      } else {
        alert('Gagal menyimpan: ' + result.error);
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (r: any) => {
    if (!confirm(`Yakin ingin menghapus Legger Kelas ${r.kelas} Semester ${r.semester} Tahun Ajaran ${r.tahun_ajaran}? Data nilai yang terhapus tidak bisa dikembalikan.`)) return;
    
    try {
      const res = await fetch('/api/buku-induk/rekap-upload', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kelas: r.kelas,
          semester: r.semester,
          tahun_ajaran: r.tahun_ajaran
        })
      });
      const json = await res.json();
      if (json.success) {
        alert('Data berhasil dihapus!');
        fetchRekap();
      } else {
        alert('Gagal menghapus: ' + json.error);
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
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
            multiple
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
            {isUploading ? 'Memproses...' : 'Upload Legger Excel'}
          </button>
        </div>
      </div>

      {previewData && (
        <div className={styles.card} style={{ marginBottom: '1.5rem', border: '2px solid #3b82f6' }}>
          <div className="section-title" style={{ marginBottom: '1rem', fontWeight: 'bold', color: '#1e40af' }}>
            Review Data Legger (Belum Disimpan)
          </div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nama File</th>
                <th>Status</th>
                <th>Tahun Ajaran</th>
                <th>Semester</th>
                <th>Kelas</th>
                <th>Jumlah Siswa Terdeteksi</th>
              </tr>
            </thead>
            <tbody>
              {previewData.map((p, idx) => (
                <tr key={idx} style={{ backgroundColor: p.error ? '#fee2e2' : 'inherit' }}>
                  <td>{p.fileName}</td>
                  <td>{p.error ? <span style={{color: 'red'}}>{p.error}</span> : <span style={{color: 'green'}}>Valid</span>}</td>
                  <td>{p.tahun_ajaran || '-'}</td>
                  <td>{p.semester || '-'}</td>
                  <td>{p.kelas || '-'}</td>
                  <td>{p.siswaCount ? `${p.siswaCount} Siswa` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button 
              className={styles.primaryButton}
              onClick={() => setPreviewData(null)}
              style={{ backgroundColor: '#6b7280', padding: '0.6rem 1.2rem', borderRadius: '0.5rem', color: 'white', border: 'none', cursor: 'pointer' }}
            >
              Batal
            </button>
            <button 
              className={styles.primaryButton}
              onClick={handleConfirmSave}
              disabled={isUploading || !previewData.some(p => !p.error)}
              style={{ backgroundColor: '#10b981', padding: '0.6rem 1.2rem', borderRadius: '0.5rem', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
            >
              {isUploading ? 'Menyimpan...' : 'Simpan Semua Data Valid'}
            </button>
          </div>
        </div>
      )}

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
                  <th>Aksi</th>
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
                    <td>
                      <button 
                        onClick={() => handleDelete(r)}
                        style={{
                          backgroundColor: '#ef4444',
                          color: 'white',
                          border: 'none',
                          padding: '0.4rem 0.8rem',
                          borderRadius: '0.375rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          fontSize: '0.875rem'
                        }}
                      >
                        <i className="fa-solid fa-trash"></i> Hapus
                      </button>
                    </td>
                  </tr>
                ))}
                {rekap.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>Belum ada Legger yang diupload.</td>
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
