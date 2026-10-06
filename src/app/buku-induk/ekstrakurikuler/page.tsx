'use client';
import React, { useState, useEffect } from 'react';
import styles from '../BukuInduk.module.css';
import Swal from 'sweetalert2';

export default function UploadEkstraPage() {
  const [loading, setLoading] = useState(true);
  const [rekap, setRekap] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [viewData, setViewData] = useState<any | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Download Form
  const [kelas, setKelas] = useState('');
  const [semester, setSemester] = useState('Ganjil');
  const [ta, setTa] = useState('2025/2026');

  const fetchRekap = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/buku-induk/ekstra/rekap');
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

  const handleDownloadTemplate = () => {
    if (!kelas || !semester || !ta) {
      Swal.fire('Perhatian', 'Harap isi Kelas, Semester, dan Tahun Ajaran', 'warning');
      return;
    }
    window.open(`/api/buku-induk/ekstra/template?kelas=${encodeURIComponent(kelas)}&semester=${encodeURIComponent(semester)}&ta=${encodeURIComponent(ta)}`);
  };

  const handleUploadEkstra = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const formData = new FormData();
    Array.from(files).forEach(f => formData.append('file', f));

    try {
      const res = await fetch('/api/buku-induk/ekstra/upload', {
        method: 'POST',
        body: formData,
      });
      const result = await res.json();
      if (result.success) {
        if (result.errors && result.errors.length > 0) {
          Swal.fire({
            title: 'Berhasil dengan Catatan',
            html: `Berhasil menyimpan <b>${result.count}</b> data nilai ekstra.<br/><br/><span style="color:red">Sebagian file gagal:</span><br/>${result.errors.join('<br/>')}`,
            icon: 'warning'
          });
        } else {
          Swal.fire({
            title: 'Berhasil!',
            text: `Upload selesai. ${result.count} data nilai ekstra berhasil disimpan!`,
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
          });
        }
        fetchRekap(); // refresh table
      } else {
        Swal.fire('Gagal!', `Gagal upload: ${result.error}`, 'error');
      }
    } catch (err: any) {
      Swal.fire('Error!', `Terjadi kesalahan sistem: ${err.message}`, 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleView = async (r: any) => {
    try {
      const res = await fetch(`/api/buku-induk/ekstra/rekap?kelas=${encodeURIComponent(r.kelas)}&semester=${encodeURIComponent(r.semester)}&ta=${encodeURIComponent(r.tahun_ajaran)}`);
      const json = await res.json();
      if (json.success) {
        setViewData({ r, dataEkstra: json.data });
      } else {
        Swal.fire('Gagal!', 'Gagal mengambil data: ' + json.error, 'error');
      }
    } catch (err: any) {
      Swal.fire('Error!', err.message, 'error');
    }
  };

  const handleDelete = async (r: any) => {
    const confirmResult = await Swal.fire({
      title: 'Hapus Data Ekstra?',
      text: `Data Nilai Ekstra Kelas ${r.kelas} Semester ${r.semester} (${r.tahun_ajaran}) akan dihapus permanen!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    });

    if (!confirmResult.isConfirmed) return;
    
    try {
      const res = await fetch('/api/buku-induk/ekstra/rekap', {
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
        Swal.fire('Terhapus!', 'Data nilai ekstra berhasil dihapus.', 'success');
        fetchRekap();
      } else {
        Swal.fire('Gagal!', 'Gagal menghapus: ' + json.error, 'error');
      }
    } catch (err: any) {
      Swal.fire('Error!', err.message, 'error');
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Upload Nilai Ekstrakurikuler</h1>
          <p className={styles.pageSubtitle}>Download template excel, isi nilai siswa, lalu upload kembali</p>
        </div>
      </div>

      <div className={styles.card} style={{ marginBottom: '1.5rem' }}>
        <div className="section-title" style={{ marginBottom: '1rem', fontWeight: 'bold' }}>
          1. Download Template Excel
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: 1, minWidth: '150px' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#4b5563' }}>Kelas (Contoh: 7A, 8B, 9C)</label>
            <input 
              type="text" 
              className={styles.searchInput} 
              value={kelas}
              onChange={e => setKelas(e.target.value.toUpperCase())}
              placeholder="Ketik kelas..."
              style={{ padding: '0.6rem 1rem' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: 1, minWidth: '150px' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#4b5563' }}>Semester</label>
            <select 
              className={styles.filterSelect}
              value={semester}
              onChange={e => setSemester(e.target.value)}
              style={{ padding: '0.6rem 1rem' }}
            >
              <option value="Ganjil">Ganjil</option>
              <option value="Genap">Genap</option>
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: 1, minWidth: '150px' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#4b5563' }}>Tahun Ajaran</label>
            <input 
              type="text" 
              className={styles.searchInput} 
              value={ta}
              onChange={e => setTa(e.target.value)}
              placeholder="Contoh: 2025/2026"
              style={{ padding: '0.6rem 1rem' }}
            />
          </div>
          <button 
            className={styles.primaryButton}
            onClick={handleDownloadTemplate}
            style={{ padding: '0.6rem 1.5rem', backgroundColor: '#10b981', display: 'flex', gap: '0.5rem', alignItems: 'center' }}
          >
            <i className="fa-solid fa-download"></i> Download Template
          </button>
        </div>
      </div>

      <div className={styles.card} style={{ marginBottom: '2rem' }}>
        <div className="section-title" style={{ marginBottom: '1rem', fontWeight: 'bold' }}>
          2. Upload Template Yang Sudah Diisi
        </div>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
          * Anda bisa mengupload banyak file excel skaligus. File lama di semester & kelas yang sama akan tertimpa.
        </p>
        <input 
          type="file" 
          accept=".xlsx" 
          multiple
          ref={fileInputRef} 
          onChange={handleUploadEkstra} 
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
          {isUploading ? 'Memproses...' : 'Upload Excel Ekstrakurikuler'}
        </button>
      </div>

      <div className={styles.card}>
        <div className="section-title" style={{ marginBottom: '1rem', fontWeight: 'bold' }}>
          Monitoring Nilai Ekstra Terupload
        </div>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
            <i className="fa-solid fa-spinner fa-spin fa-2x mb-3"></i>
            <p>Memuat rekap...</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>No</th>
                  <th>Tahun Ajaran</th>
                  <th>Semester</th>
                  <th>Kelas</th>
                  <th>Siswa Terisi Nilai</th>
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
                    <td>{r.siswa_count} Siswa</td>
                    <td>{new Date(r.created_at).toLocaleString('id-ID')}</td>
                    <td style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        onClick={() => handleView(r)}
                        style={{
                          backgroundColor: '#3b82f6',
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
                        <i className="fa-solid fa-eye"></i> Lihat Data
                      </button>
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
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>Belum ada Legger Ekstra yang diupload.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {viewData && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem'
        }}>
          <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', width: '100%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>
                Review Nilai Ekstrakurikuler {viewData.r.kelas} - {viewData.r.semester} ({viewData.r.tahun_ajaran})
              </h2>
              <button onClick={() => setViewData(null)} style={{ border: 'none', background: 'transparent', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>
            <div style={{ padding: '1.5rem', overflow: 'auto', flex: 1 }}>
              <table className={styles.table} style={{ whiteSpace: 'nowrap' }}>
                <thead>
                  <tr>
                    <th style={{ backgroundColor: '#f3f4f6' }}>No</th>
                    <th style={{ backgroundColor: '#f3f4f6' }}>NIS</th>
                    <th style={{ backgroundColor: '#f3f4f6' }}>Nama Siswa</th>
                    <th style={{ backgroundColor: '#f3f4f6' }}>Jenis Ekstrakurikuler</th>
                    <th style={{ backgroundColor: '#f3f4f6' }}>Nilai</th>
                  </tr>
                </thead>
                <tbody>
                  {viewData.dataEkstra.map((s: any, idx: number) => (
                    <tr key={idx}>
                      <td>{idx + 1}</td>
                      <td>{s.nis}</td>
                      <td>{s.nama}</td>
                      <td>{s.jenis_ekstra}</td>
                      <td style={{ textAlign: 'center' }}>{s.nilai}</td>
                    </tr>
                  ))}
                  {viewData.dataEkstra.length === 0 && (
                    <tr><td colSpan={5} style={{textAlign: 'center'}}>Tidak ada data tercatat</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
