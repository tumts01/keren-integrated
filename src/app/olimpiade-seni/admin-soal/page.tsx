'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';

export default function AdminSoalCBT() {
  const router = useRouter();
  const [soalList, setSoalList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [lombaFilter, setLombaFilter] = useState('Matematika');
  const [tahapSoal, setTahapSoal] = useState<'seleksi' | 'final'>('seleksi');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State untuk melacak ID soal yang sedang diupload gambarnya
  const [uploadingImageId, setUploadingImageId] = useState<number | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [cbtBuka, setCbtBuka] = useState(false);
  const [tahapCbtAktif, setTahapCbtAktif] = useState<'seleksi' | 'final'>('seleksi');
  const [soalCounts, setSoalCounts] = useState<Record<string, number>>({});

  const lombaOptions = ['Matematika', 'IPAS', 'PAI', 'Inggris', 'Arab'];

  const getSoalCount = (lomba: string, tahap: 'seleksi' | 'final' = tahapSoal) => {
    const key = tahap === 'final' ? `${lomba}_FINAL` : lomba;
    return soalCounts[key] || 0;
  };

  useEffect(() => {
    fetchSoal();
  }, [lombaFilter, tahapSoal]);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/olimpiade-seni/config-cbt');
      const json = await res.json();
      if (json.success) {
        setCbtBuka(json.cbt_buka);
        if (json.tahap_cbt === 'final' || json.tahap_cbt === 'seleksi') {
          setTahapCbtAktif(json.tahap_cbt);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleCbt = async () => {
    try {
      const newVal = !cbtBuka;
      const res = await fetch('/api/olimpiade-seni/config-cbt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buka: newVal })
      });
      const data = await res.json();
      if (data.success) {
        setCbtBuka(newVal);
        Swal.fire('Berhasil', newVal ? 'Ujian CBT telah BUKA (bisa diakses siswa)' : 'Ujian CBT telah DITUTUP (disembunyikan dari siswa)', 'success');
      }
    } catch (err: any) {
      Swal.fire('Error', err.message, 'error');
    }
  };

  const handleChangeTahapAktif = async (newTahap: 'seleksi' | 'final') => {
    if (newTahap === tahapCbtAktif) return;
    const label = newTahap === 'final' ? 'Babak Final' : 'Babak Seleksi (Penyisihan)';
    const confirm = await Swal.fire({
      title: `Aktifkan Ujian ${label}?`,
      text: newTahap === 'final'
        ? 'Portal CBT siswa akan diarahkan ke paket soal Babak Final (hanya peserta yang Lolos Top 30 Seleksi yang dapat mengerjakan).'
        : 'Portal CBT siswa akan diarahkan ke paket soal Babak Seleksi (Penyisihan).',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#0284c7',
      confirmButtonText: `Ya, Aktifkan ${label}`,
      cancelButtonText: 'Batal'
    });
    if (!confirm.isConfirmed) return;

    try {
      const res = await fetch('/api/olimpiade-seni/config-cbt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tahap_cbt: newTahap })
      });
      const data = await res.json();
      if (data.success) {
        setTahapCbtAktif(newTahap);
        setTahapSoal(newTahap);
        Swal.fire('Berhasil', `Tahap ujian CBT aktif berhasil diubah ke ${label}.`, 'success');
      }
    } catch (err: any) {
      Swal.fire('Error', err.message, 'error');
    }
  };

  const fetchSoal = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cbt/admin/soal?lomba=${lombaFilter}&tahap=${tahapSoal}`);
      const data = await res.json();
      if (data.success) {
        setSoalList(data.data);
        if (data.counts) {
          setSoalCounts(data.counts);
        }
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleDownloadTemplate = () => {
    const ws_data = [
      ['LOMBA', 'NOMOR_SOAL', 'PERTANYAAN', 'OPSI_A', 'OPSI_B', 'OPSI_C', 'OPSI_D', 'OPSI_E', 'KUNCI'],
      ['Matematika', 1, 'Berapakah 1+1?', '1', '2', '3', '4', '', 'B'],
      ['Matematika', 2, 'Siapakah penemu angka 0?', 'Al-Khawarizmi', 'Newton', 'Einstein', 'Galileo', '', 'A']
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
      title: `Mengunggah Soal (${tahapSoal === 'final' ? 'Babak Final' : 'Babak Seleksi'})...`,
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const formData = new FormData();
      formData.append('type', 'excel');
      formData.append('tahap', tahapSoal);
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
    const labelTahap = tahapSoal === 'final' ? 'Babak Final' : 'Babak Seleksi';
    if (!confirm(`Yakin ingin menghapus semua soal ${lombaFilter} untuk ${labelTahap}?`)) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/cbt/admin/soal?lomba=${lombaFilter}&tahap=${tahapSoal}`, { method: 'DELETE' });
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

  // Fungsi untuk memicu input file gambar
  const triggerImageUpload = (id: number) => {
    setUploadingImageId(id);
    if (imageInputRef.current) {
      imageInputRef.current.click();
    }
  };

  // Handler saat gambar dipilih
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingImageId) return;

    Swal.fire({
      title: 'Mengunggah Gambar...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const formData = new FormData();
      formData.append('id', uploadingImageId.toString());
      formData.append('gambar', file);

      const res = await fetch('/api/cbt/admin/soal', {
        method: 'PATCH',
        body: formData
      });
      const data = await res.json();

      if (data.success) {
        Swal.fire('Berhasil', 'Gambar soal berhasil diperbarui', 'success');
        fetchSoal();
      } else {
        Swal.fire('Gagal', data.error, 'error');
      }
    } catch (err: any) {
      Swal.fire('Error', err.message, 'error');
    }

    setUploadingImageId(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  return (
    <div style={{ padding: '40px', background: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', background: 'white', padding: '32px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', color: '#0f172a', margin: 0 }}>Bank Soal CBT Olimpiade</h1>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.9rem' }}>
              Kelola paket soal terpisah untuk <b>Babak Seleksi (Penyisihan)</b> dan <b>Babak Final</b>
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => router.push('/olimpiade-seni/cbt-monitoring')}
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                background: '#7c3aed',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 8px rgba(124, 58, 237, 0.3)'
              }}
            >
              <i className="fas fa-desktop"></i> Monitoring CBT & Sesi
            </button>
            <button 
              onClick={handleToggleCbt}
              style={{ 
                padding: '10px 20px', 
                borderRadius: '8px', 
                background: cbtBuka ? '#ef4444' : '#10b981', 
                color: 'white', 
                border: 'none', 
                cursor: 'pointer', 
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <i className={`fas ${cbtBuka ? 'fa-eye-slash' : 'fa-eye'}`}></i> 
              {cbtBuka ? 'Tutup CBT (Sembunyikan)' : 'Buka CBT (Tampilkan)'}
            </button>
          </div>
        </div>

        {/* PENGATURAN TAHAP UJIAN CBT AKTIF */}
        <div style={{
          background: tahapCbtAktif === 'final' ? '#fffbeb' : '#f0f9ff',
          border: `1.5px solid ${tahapCbtAktif === 'final' ? '#fde68a' : '#bae6fd'}`,
          borderRadius: '12px',
          padding: '14px 20px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <div style={{ fontWeight: 800, color: tahapCbtAktif === 'final' ? '#92400e' : '#0369a1', fontSize: '0.95rem' }}>
              <i className={`fas ${tahapCbtAktif === 'final' ? 'fa-trophy' : 'fa-filter'}`} style={{ marginRight: '8px' }}></i>
              Tahap Ujian CBT Aktif Saat Ini: <span style={{ textDecoration: 'underline' }}>{tahapCbtAktif === 'final' ? 'BABAK FINAL' : 'BABAK SELEKSI (PENYISIHAN)'}</span>
            </div>
            <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '2px' }}>
              {tahapCbtAktif === 'final'
                ? 'Siswa yang login ke CBT saat ini akan mengerjakan Paket Soal Babak Final (khusus Finalis Top 30).'
                : 'Siswa yang login ke CBT saat ini akan mengerjakan Paket Soal Babak Seleksi.'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => handleChangeTahapAktif('seleksi')}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: tahapCbtAktif === 'seleksi' ? 'none' : '1px solid #cbd5e1',
                background: tahapCbtAktif === 'seleksi' ? '#0284c7' : 'white',
                color: tahapCbtAktif === 'seleksi' ? 'white' : '#475569',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              Set Aktif: Babak Seleksi
            </button>
            <button
              type="button"
              onClick={() => handleChangeTahapAktif('final')}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: tahapCbtAktif === 'final' ? 'none' : '1px solid #cbd5e1',
                background: tahapCbtAktif === 'final' ? '#d97706' : 'white',
                color: tahapCbtAktif === 'final' ? 'white' : '#475569',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              <i className="fas fa-trophy" style={{ marginRight: '6px' }}></i>
              Set Aktif: Babak Final
            </button>
          </div>
        </div>

        {/* TAB PILIHAN PAKET SOAL (SELEKSI VS FINAL) */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #e2e8f0', paddingBottom: '12px' }}>
          <button
            type="button"
            onClick={() => setTahapSoal('seleksi')}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              border: 'none',
              background: tahapSoal === 'seleksi' ? '#0f172a' : '#f1f5f9',
              color: tahapSoal === 'seleksi' ? 'white' : '#475569',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <i className="fas fa-list-check"></i> Paket Soal Babak Seleksi
          </button>
          <button
            type="button"
            onClick={() => setTahapSoal('final')}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              border: 'none',
              background: tahapSoal === 'final' ? '#b45309' : '#f1f5f9',
              color: tahapSoal === 'final' ? 'white' : '#475569',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <i className="fas fa-award"></i> Paket Soal Babak Final
          </button>
        </div>

        <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', flexWrap: 'wrap', alignItems: 'center' }}>
          {(() => {
            const selectedCount = getSoalCount(lombaFilter, tahapSoal);
            const isSelectedUploaded = selectedCount > 0;
            return (
              <select 
                value={lombaFilter} 
                onChange={e => setLombaFilter(e.target.value)}
                style={{
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border: `2px solid ${isSelectedUploaded ? '#22c55e' : '#ef4444'}`,
                  background: isSelectedUploaded ? '#f0fdf4' : '#fef2f2',
                  color: isSelectedUploaded ? '#15803d' : '#b91c1c',
                  fontWeight: 700,
                  fontSize: '1rem',
                  minWidth: '280px',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                {lombaOptions.map(l => {
                  const cnt = getSoalCount(l, tahapSoal);
                  const uploaded = cnt > 0;
                  return (
                    <option
                      key={l}
                      value={l}
                      style={{
                        color: uploaded ? '#15803d' : '#dc2626',
                        background: 'white',
                        fontWeight: 700
                      }}
                    >
                      {uploaded ? `✅ ${l} (${tahapSoal === 'final' ? 'Final' : 'Seleksi'}) — ${cnt} Soal` : `🔴 ${l} (${tahapSoal === 'final' ? 'Final' : 'Seleksi'}) — Belum Diupload`}
                    </option>
                  );
                })}
              </select>
            );
          })()}

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
            <i className="fas fa-upload" style={{ marginRight: '8px' }}></i> Upload Excel Soal ({tahapSoal === 'final' ? 'Babak Final' : 'Babak Seleksi'})
          </button>
          <input type="file" accept=".xlsx, .xls" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} />

          <button 
            onClick={handleDeleteAll}
            style={{ padding: '10px 20px', borderRadius: '8px', background: '#ef4444', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600, marginLeft: 'auto' }}
          >
            <i className="fas fa-trash" style={{ marginRight: '8px' }}></i> Kosongkan Soal {lombaFilter} ({tahapSoal === 'final' ? 'Final' : 'Seleksi'})
          </button>
        </div>

        {/* Input file tersembunyi untuk gambar soal */}
        <input 
          type="file" 
          accept="image/*" 
          ref={imageInputRef} 
          onChange={handleImageChange} 
          style={{ display: 'none' }} 
        />

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {soalList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748b', background: '#f1f5f9', borderRadius: '12px' }}>
                Belum ada soal untuk {lombaFilter} pada {tahapSoal === 'final' ? 'Babak Final' : 'Babak Seleksi'}
              </div>
            ) : (
              soalList.map(soal => (
                <div key={soal.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>Soal No. {soal.nomor_soal}</div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button 
                        onClick={() => triggerImageUpload(soal.id)} 
                        style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#334155', padding: '4px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
                      >
                        <i className="fas fa-image" style={{ marginRight: '6px' }}></i> {soal.gambar_url ? 'Ganti Gambar' : 'Tambah Gambar'}
                      </button>
                      <button 
                        onClick={() => handleDelete(soal.id)} 
                        style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#ef4444', padding: '4px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>
                  <div style={{ fontSize: '1.05rem', color: '#334155', marginBottom: '16px' }}>{soal.pertanyaan}</div>
                  
                  {soal.gambar_url && (
                    <div style={{ marginBottom: '16px' }}>
                      <img src={`/api/proxy-image?url=${encodeURIComponent(soal.gambar_url)}`} alt="Gambar Soal" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px' }} />
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.9rem' }}>
                    {['A', 'B', 'C', 'D'].map(opt => {
                      const opsiValue = soal[`opsi_${opt.toLowerCase()}`];
                      if (!opsiValue) return null;
                      const isImage = opsiValue.startsWith('http') && opsiValue.includes('drive.google.com');
                      return (
                        <div key={opt} style={{ background: soal.kunci_jawaban === opt ? '#dcfce7' : '#f8fafc', padding: '8px 12px', borderRadius: '6px', display: 'flex', gap: '8px' }}>
                          <span style={{ fontWeight: 600 }}>{opt}.</span> 
                          {isImage ? (
                            <img src={`/api/proxy-image?url=${encodeURIComponent(opsiValue)}`} alt={`Opsi ${opt}`} style={{ maxWidth: '100%', maxHeight: '100px', borderRadius: '4px' }} />
                          ) : (
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{opsiValue}</span>
                          )}
                        </div>
                      );
                    })}
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
