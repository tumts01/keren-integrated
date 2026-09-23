'use client';

import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';

export default function AdminSoalCBT() {
  const [soalList, setSoalList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [lombaFilter, setLombaFilter] = useState('Matematika');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const lombaOptions = ['Matematika', 'IPAS', 'PAI', 'Inggris', 'Arab'];

  useEffect(() => {
    fetchSoal();
  }, [lombaFilter]);

  const fetchSoal = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cbt/admin/soal?lomba=${lombaFilter}`);
      const data = await res.json();
      if (data.success) {
        setSoalList(data.data);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleDownloadTemplate = () => {
    const ws_data = [
      ['LOMBA', 'NOMOR_SOAL', 'PERTANYAAN', 'OPSI_A', 'OPSI_B', 'OPSI_C', 'OPSI_D', 'OPSI_E', 'KUNCI', 'BOBOT'],
      ['Matematika', 1, 'Berapakah 1+1?', '1', '2', '3', '4', '', 'B', 1],
      ['Matematika', 2, 'Siapakah penemu angka 0?', 'Al-Khawarizmi', 'Newton', 'Einstein', 'Galileo', '', 'A', 1]
    ];
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template Soal");
    XLSX.writeFile(wb, "Template_Soal_CBT.xlsx");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Swal.fire({
      title: 'Mengunggah Soal...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const formData = new FormData();
      formData.append('type', 'excel');
      formData.append('fileExcel', file);

      const res = await fetch('/api/cbt/admin/soal', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (data.success) {
        Swal.fire('Berhasil', data.message, 'success');
        fetchSoal();
      } else {
        Swal.fire('Gagal', data.error, 'error');
      }
    } catch (err: any) {
      Swal.fire('Error', err.message, 'error');
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeleteAll = async () => {
    if (!confirm(`Yakin ingin menghapus semua soal untuk ${lombaFilter}?`)) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/cbt/admin/soal?lomba=${lombaFilter}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchSoal();
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm(`Yakin ingin menghapus soal ini?`)) return;
    try {
      const res = await fetch(`/api/cbt/admin/soal?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) fetchSoal();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ padding: '40px', background: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', background: 'white', padding: '32px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        <h1 style={{ fontSize: '1.8rem', color: '#0f172a', marginBottom: '24px' }}>Bank Soal CBT Olimpiade</h1>

        <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', flexWrap: 'wrap', alignItems: 'center' }}>
          <select 
            value={lombaFilter} 
            onChange={e => setLombaFilter(e.target.value)}
            style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', minWidth: '200px' }}
          >
            {lombaOptions.map(l => <option key={l} value={l}>{l}</option>)}
          </select>

          <button 
            onClick={handleDownloadTemplate}
            style={{ padding: '10px 20px', borderRadius: '8px', background: '#10b981', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600 }}
          >
            <i className="fas fa-file-excel" style={{ marginRight: '8px' }}></i> Download Template
          </button>

          <button 
            onClick={() => fileInputRef.current?.click()}
            style={{ padding: '10px 20px', borderRadius: '8px', background: '#3b82f6', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600 }}
          >
            <i className="fas fa-upload" style={{ marginRight: '8px' }}></i> Upload Excel Soal
          </button>
          <input type="file" accept=".xlsx, .xls" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} />

          <button 
            onClick={handleDeleteAll}
            style={{ padding: '10px 20px', borderRadius: '8px', background: '#ef4444', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600, marginLeft: 'auto' }}
          >
            <i className="fas fa-trash" style={{ marginRight: '8px' }}></i> Kosongkan Soal {lombaFilter}
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {soalList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748b', background: '#f1f5f9', borderRadius: '12px' }}>
                Belum ada soal untuk {lombaFilter}
              </div>
            ) : (
              soalList.map(soal => (
                <div key={soal.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>Soal No. {soal.nomor_soal}</div>
                    <button onClick={() => handleDelete(soal.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><i className="fas fa-times"></i></button>
                  </div>
                  <div style={{ fontSize: '1.05rem', color: '#334155', marginBottom: '16px' }}>{soal.pertanyaan}</div>
                  
                  {soal.gambar_url && (
                    <img src={soal.gambar_url} alt="Gambar Soal" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', marginBottom: '16px' }} />
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.9rem' }}>
                    <div style={{ background: soal.kunci_jawaban === 'A' ? '#dcfce7' : '#f8fafc', padding: '8px 12px', borderRadius: '6px' }}>A. {soal.opsi_a}</div>
                    <div style={{ background: soal.kunci_jawaban === 'B' ? '#dcfce7' : '#f8fafc', padding: '8px 12px', borderRadius: '6px' }}>B. {soal.opsi_b}</div>
                    <div style={{ background: soal.kunci_jawaban === 'C' ? '#dcfce7' : '#f8fafc', padding: '8px 12px', borderRadius: '6px' }}>C. {soal.opsi_c}</div>
                    <div style={{ background: soal.kunci_jawaban === 'D' ? '#dcfce7' : '#f8fafc', padding: '8px 12px', borderRadius: '6px' }}>D. {soal.opsi_d}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
