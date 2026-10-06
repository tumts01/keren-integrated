'use client';

import React, { useState, useEffect } from 'react';
import styles from '../BukuInduk.module.css';
import InlineLoading from '@/components/InlineLoading';
import Swal from 'sweetalert2';

export default function UploadLeggerPage() {
  const [loading, setLoading] = useState(true);
  const [rekap, setRekap] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [viewData, setViewData] = useState<any | null>(null);
  const [isLoadingView, setIsLoadingView] = useState(false);
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

  const handleView = async (r: any) => {
    setIsLoadingView(true);
    try {
      const res = await fetch(`/api/buku-induk/review-legger?kelas=${encodeURIComponent(r.kelas)}&semester=${encodeURIComponent(r.semester)}&ta=${encodeURIComponent(r.tahun_ajaran)}`);
      const json = await res.json();
      if (json.success) {
        const mapels = json.data.map((d: any) => d.mata_pelajaran);
        const studentMap: Record<string, any> = {};
        
        json.data.forEach((m: any) => {
          m.data_nilai.forEach((d: any) => {
            if (!studentMap[d.nis]) {
              studentMap[d.nis] = { nis: d.nis, nama: d.nama, mapels: {} };
            }
            studentMap[d.nis].mapels[m.mata_pelajaran] = d.nilai;
          });
        });

        const students = Object.values(studentMap).sort((a: any, b: any) => a.nama.localeCompare(b.nama));
        setViewData({ r, mapels, students });
      } else {
        Swal.fire('Gagal!', 'Gagal mengambil data: ' + json.error, 'error');
      }
    } catch (err: any) {
      Swal.fire('Error!', err.message, 'error');
    } finally {
      setIsLoadingView(false);
    }
  };

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
        if (result.errors && result.errors.length > 0) {
          Swal.fire({
            title: 'Berhasil dengan Catatan',
            html: `Berhasil menyimpan <b>${result.count}</b> data nilai.<br/><br/><span style="color:red">Sebagian file gagal:</span><br/>${result.errors.join('<br/>')}`,
            icon: 'warning'
          });
        } else {
          Swal.fire({
            title: 'Berhasil!',
            text: `Upload selesai. ${result.count} data nilai berhasil disimpan!`,
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

  const handleDelete = async (r: any) => {
    const confirmResult = await Swal.fire({
      title: 'Hapus Data Legger?',
      text: `Legger Kelas ${r.kelas} Semester ${r.semester} (${r.tahun_ajaran}) akan dihapus permanen!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    });

    if (!confirmResult.isConfirmed) return;
    
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
        Swal.fire('Terhapus!', 'Data legger berhasil dihapus.', 'success');
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
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>Belum ada Legger yang diupload.</td>
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
          <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', width: '100%', maxWidth: '1200px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>
                Review Nilai Kelas {viewData.r.kelas} - Semester {viewData.r.semester} ({viewData.r.tahun_ajaran})
              </h2>
              <button onClick={() => setViewData(null)} style={{ border: 'none', background: 'transparent', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>
            <div style={{ padding: '1.5rem', overflow: 'auto', flex: 1 }}>
              <table className={styles.table} style={{ whiteSpace: 'nowrap' }}>
                <thead>
                  <tr>
                    <th style={{ position: 'sticky', left: 0, backgroundColor: '#f3f4f6' }}>No</th>
                    <th style={{ position: 'sticky', left: '40px', backgroundColor: '#f3f4f6' }}>NIS</th>
                    <th style={{ position: 'sticky', left: '120px', backgroundColor: '#f3f4f6', minWidth: '200px' }}>Nama Siswa</th>
                    {viewData.mapels.map((m: string) => <th key={m}>{m}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {viewData.students.map((s: any, idx: number) => (
                    <tr key={s.nis}>
                      <td style={{ position: 'sticky', left: 0, backgroundColor: 'white' }}>{idx + 1}</td>
                      <td style={{ position: 'sticky', left: '40px', backgroundColor: 'white' }}>{s.nis}</td>
                      <td style={{ position: 'sticky', left: '120px', backgroundColor: 'white' }}>{s.nama}</td>
                      {viewData.mapels.map((m: string) => (
                        <td key={m} style={{ textAlign: 'center' }}>{s.mapels[m] ?? '-'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
