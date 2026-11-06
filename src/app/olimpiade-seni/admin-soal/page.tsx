'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import { formatMathSymbols } from '@/lib/cbt-format';

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

  // State untuk modal edit soal langsung
  const [editingSoal, setEditingSoal] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    nomor_soal: 1,
    pertanyaan: '',
    opsi_a: '',
    opsi_b: '',
    opsi_c: '',
    opsi_d: '',
    opsi_e: '',
    kunci_jawaban: 'A',
    bobot_skor: 1,
    gambar_url: null as string | null,
    hapus_gambar: false
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editActiveTab, setEditActiveTab] = useState<'form' | 'preview'>('form');

  const lombaOptions = ['Matematika', 'IPAS', 'PAI', 'Inggris', 'Arab'];

  const isArabicText = (txt?: string | null): boolean => {
    if (!txt) return false;
    return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(txt);
  };

  const renderMixedText = (text?: string | null, isFullArab?: boolean) => {
    if (!text) return null;
    const formatted = formatMathSymbols(text);
    if (isFullArab) return formatted;
    if (!/[\u0600-\u06FF]/.test(formatted)) return formatted;

    const parts = formatted.split(/([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+(?:[\s\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]*[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+)?)/g);

    return parts.map((part, i) => {
      if (/[\u0600-\u06FF]/.test(part)) {
        return (
          <span
            key={i}
            dir="rtl"
            style={{
              fontFamily: "'KFGQPC Uthman Taha Naskh', 'Uthman Taha Naskh', 'Traditional Arabic', 'Amiri', serif",
              fontSize: '1.28em',
              lineHeight: '1.8',
              unicodeBidi: 'isolate',
              wordSpacing: '2px',
              display: 'inline'
            }}
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

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
    const isArab = lombaFilter === 'Arab';
    const ws_data = isArab ? [
      ['LOMBA', 'NOMOR_SOAL', 'PERTANYAAN', 'OPSI_A', 'OPSI_B', 'OPSI_C', 'OPSI_D', 'OPSI_E', 'KUNCI'],
      ['Arab', 1, 'مَا هَذَا؟ هَذَا ...', 'قَلَمٌ', 'كِتَابٌ', 'مَكْتَبٌ', 'بَابٌ', '', 'A'],
      ['Arab', 2, 'أَيْنَ تَدْرُسُ؟', 'فِي الْمَدْرَسَةِ', 'فِي الْبَيْتِ', 'فِي الْمَسْجِدِ', 'فِي الْمَكْتَبَةِ', '', 'A']
    ] : [
      ['LOMBA', 'NOMOR_SOAL', 'PERTANYAAN', 'OPSI_A', 'OPSI_B', 'OPSI_C', 'OPSI_D', 'OPSI_E', 'KUNCI'],
      [lombaFilter, 1, 'Berapakah 1+1?', '1', '2', '3', '4', '', 'B'],
      [lombaFilter, 2, 'Siapakah penemu angka 0?', 'Al-Khawarizmi', 'Newton', 'Einstein', 'Galileo', '', 'A']
    ];
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template Soal");
    XLSX.writeFile(wb, `Template_Soal_${lombaFilter}_CBT.xlsx`);
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

  const openEditModal = (soal: any) => {
    setEditingSoal(soal);
    setEditForm({
      nomor_soal: soal.nomor_soal || 1,
      pertanyaan: soal.pertanyaan || '',
      opsi_a: soal.opsi_a || '',
      opsi_b: soal.opsi_b || '',
      opsi_c: soal.opsi_c || '',
      opsi_d: soal.opsi_d || '',
      opsi_e: soal.opsi_e || '',
      kunci_jawaban: (soal.kunci_jawaban || 'A').toUpperCase(),
      bobot_skor: soal.bobot_skor || 1,
      gambar_url: soal.gambar_url || null,
      hapus_gambar: false
    });
    setEditActiveTab('form');
  };

  const closeEditModal = () => {
    if (isSavingEdit) return;
    setEditingSoal(null);
  };

  const handleSaveEdit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingSoal) return;

    if (!editForm.pertanyaan.trim()) {
      Swal.fire('Peringatan', 'Teks pertanyaan tidak boleh kosong', 'warning');
      return;
    }
    if (!editForm.opsi_a.trim() || !editForm.opsi_b.trim() || !editForm.opsi_c.trim() || !editForm.opsi_d.trim()) {
      Swal.fire('Peringatan', 'Opsi A, B, C, dan D wajib diisi', 'warning');
      return;
    }

    setIsSavingEdit(true);
    try {
      const res = await fetch('/api/cbt/admin/soal', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingSoal.id,
          nomor_soal: editForm.nomor_soal,
          pertanyaan: editForm.pertanyaan,
          opsi_a: editForm.opsi_a,
          opsi_b: editForm.opsi_b,
          opsi_c: editForm.opsi_c,
          opsi_d: editForm.opsi_d,
          opsi_e: editForm.opsi_e,
          kunci_jawaban: editForm.kunci_jawaban,
          bobot_skor: editForm.bobot_skor,
          hapus_gambar: editForm.hapus_gambar
        })
      });
      const result = await res.json();
      if (result.success) {
        Swal.fire({
          icon: 'success',
          title: 'Soal Berhasil Diperbarui',
          text: `Perubahan Soal No. ${editForm.nomor_soal} telah disimpan!`,
          timer: 1500,
          showConfirmButton: false
        });
        setEditingSoal(null);
        fetchSoal();
      } else {
        Swal.fire('Gagal Menyimpan', result.error || 'Terjadi kesalahan saat menyimpan perubahan', 'error');
      }
    } catch (err: any) {
      Swal.fire('Error', err.message, 'error');
    } finally {
      setIsSavingEdit(false);
    }
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
              soalList.map(soal => {
                const isFullArab = lombaFilter === 'Arab';
                const isQuestionOnlyArab = !isFullArab && isArabicText(soal.pertanyaan) && !/[a-zA-Z]/.test(soal.pertanyaan);
                const isRtl = isFullArab || isQuestionOnlyArab;

                return (
                  <div key={soal.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', background: isFullArab ? '#fcfffd' : 'white' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>Soal No. {soal.nomor_soal}</div>
                        {isFullArab && (
                          <span style={{ fontSize: '0.72rem', background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                            Arab Naskh
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button 
                          onClick={() => openEditModal(soal)} 
                          style={{ 
                            background: '#eff6ff', 
                            border: '1px solid #bfdbfe', 
                            color: '#1d4ed8', 
                            padding: '6px 14px', 
                            borderRadius: '6px', 
                            cursor: 'pointer', 
                            fontSize: '0.85rem', 
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 1px 2px rgba(29, 78, 216, 0.05)'
                          }}
                          title="Edit teks soal, opsi pilihan jawaban, dan kunci"
                        >
                          <i className="fas fa-edit"></i> Edit Soal
                        </button>
                        <button 
                          onClick={() => triggerImageUpload(soal.id)} 
                          style={{ 
                            background: '#f8fafc', 
                            border: '1px solid #cbd5e1', 
                            color: '#334155', 
                            padding: '6px 12px', 
                            borderRadius: '6px', 
                            cursor: 'pointer', 
                            fontSize: '0.85rem', 
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <i className="fas fa-image"></i> {soal.gambar_url ? 'Ganti Gambar' : 'Tambah Gambar'}
                        </button>
                        <button 
                          onClick={() => handleDelete(soal.id)} 
                          style={{ 
                            background: '#fee2e2', 
                            border: '1px solid #fca5a5', 
                            color: '#ef4444', 
                            padding: '6px 12px', 
                            borderRadius: '6px', 
                            cursor: 'pointer', 
                            fontSize: '0.85rem', 
                            fontWeight: 600 
                          }}
                          title="Hapus soal ini"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </div>
                    
                    <div 
                      dir={isRtl ? "rtl" : "ltr"}
                      style={{ 
                        fontSize: isFullArab ? '1.5rem' : '1.05rem', 
                        color: '#0f172a', 
                        marginBottom: '18px',
                        fontFamily: isFullArab ? "'KFGQPC Uthman Taha Naskh', 'Uthman Taha Naskh', 'Traditional Arabic', 'Amiri', serif" : 'inherit',
                        lineHeight: isFullArab ? '2.4' : '1.7',
                        textAlign: isRtl ? 'right' : 'left',
                        wordSpacing: isFullArab ? '2px' : 'normal',
                        padding: isFullArab ? '4px 0' : '0',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word'
                      }}
                    >
                      {renderMixedText(soal.pertanyaan, isFullArab)}
                    </div>
                    
                    {soal.gambar_url && (
                      <div style={{ marginBottom: '16px' }}>
                        <img src={`/api/proxy-image?url=${encodeURIComponent(soal.gambar_url)}`} alt="Gambar Soal" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px' }} />
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: isFullArab ? '1fr 1fr' : '1fr 1fr', gap: '10px', fontSize: isFullArab ? '1.25rem' : '0.9rem' }}>
                      {['A', 'B', 'C', 'D', 'E'].map(opt => {
                        const opsiValue = soal[`opsi_${opt.toLowerCase()}`];
                        if (!opsiValue) return null;
                        const isImage = opsiValue.startsWith('http') && opsiValue.includes('drive.google.com');
                        const isOptOnlyArab = !isFullArab && isArabicText(opsiValue) && !/[a-zA-Z]/.test(opsiValue);
                        const isOptRtl = isFullArab || isOptOnlyArab;
                        const isKey = soal.kunci_jawaban === opt;
                        return (
                          <div 
                            key={opt} 
                            style={{ 
                              background: isKey ? '#dcfce7' : '#f8fafc', 
                              border: isKey ? '1.5px solid #86efac' : '1px solid #e2e8f0',
                              padding: '10px 14px', 
                              borderRadius: '8px', 
                              display: 'flex', 
                              gap: '10px',
                              alignItems: 'center'
                            }}
                          >
                            <span style={{ 
                              fontWeight: 700, 
                              color: isKey ? '#166534' : '#64748b', 
                              minWidth: '24px',
                              textAlign: 'center',
                              background: isKey ? '#bbf7d0' : '#e2e8f0',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.85rem',
                              flexShrink: 0
                            }}>
                              {opt}
                            </span> 
                            {isImage ? (
                              <img src={`/api/proxy-image?url=${encodeURIComponent(opsiValue)}`} alt={`Opsi ${opt}`} style={{ maxWidth: '100%', maxHeight: '100px', borderRadius: '4px' }} />
                            ) : (
                              <span 
                                dir={isOptRtl ? "rtl" : "ltr"}
                                style={{ 
                                  fontFamily: isFullArab ? "'KFGQPC Uthman Taha Naskh', 'Uthman Taha Naskh', 'Traditional Arabic', 'Amiri', serif" : 'inherit',
                                  fontSize: isFullArab ? '1.35rem' : 'inherit',
                                  lineHeight: isFullArab ? '2.1' : '1.5',
                                  textAlign: isOptRtl ? 'right' : 'left',
                                  wordBreak: 'break-word',
                                  wordSpacing: isFullArab ? '2px' : 'normal',
                                  whiteSpace: 'pre-wrap',
                                  flex: 1,
                                  color: '#1e293b'
                                }}
                              >
                                {renderMixedText(opsiValue, isFullArab)}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* MODAL EDIT SOAL */}
      {editingSoal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeEditModal();
          }}
        >
          <div 
            style={{
              background: 'white',
              borderRadius: '16px',
              maxWidth: '840px',
              width: '100%',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
              border: '1px solid #e2e8f0'
            }}
          >
            {/* Modal Header */}
            <div 
              style={{
                padding: '16px 24px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#f8fafc'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: '#dbeafe',
                  color: '#1d4ed8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.1rem'
                }}>
                  <i className="fas fa-edit"></i>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a', fontWeight: 800 }}>
                    Edit Soal No. {editForm.nomor_soal}
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                    Mata Pelajaran: <b>{lombaFilter}</b> &bull; Paket: <b>{tahapSoal === 'final' ? 'Babak Final' : 'Babak Seleksi'}</b>
                  </div>
                </div>
              </div>

              {/* Tab Selector & Close Button */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: '8px', padding: '3px' }}>
                  <button
                    type="button"
                    onClick={() => setEditActiveTab('form')}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      background: editActiveTab === 'form' ? 'white' : 'transparent',
                      color: editActiveTab === 'form' ? '#0f172a' : '#64748b',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      boxShadow: editActiveTab === 'form' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                    }}
                  >
                    <i className="fas fa-pen-to-square" style={{ marginRight: '5px' }}></i> Form
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditActiveTab('preview')}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      background: editActiveTab === 'preview' ? 'white' : 'transparent',
                      color: editActiveTab === 'preview' ? '#0f172a' : '#64748b',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      boxShadow: editActiveTab === 'preview' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                    }}
                  >
                    <i className="fas fa-eye" style={{ marginRight: '5px' }}></i> Preview
                  </button>
                </div>

                <button
                  type="button"
                  onClick={closeEditModal}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    fontSize: '1.25rem',
                    padding: '4px 8px',
                    borderRadius: '6px'
                  }}
                  title="Tutup Modal"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              {editActiveTab === 'form' ? (
                <form onSubmit={handleSaveEdit} id="edit-soal-form" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  {/* Row 1: Nomor Soal, Kunci Jawaban, Bobot Skor */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontWeight: 700, fontSize: '0.82rem', color: '#334155', marginBottom: '6px' }}>
                        Nomor Soal
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={editForm.nomor_soal}
                        onChange={(e) => setEditForm(prev => ({ ...prev, nomor_soal: parseInt(e.target.value, 10) || 1 }))}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: '8px',
                          border: '1.5px solid #cbd5e1',
                          fontWeight: 700,
                          fontSize: '0.9rem',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                        required
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontWeight: 700, fontSize: '0.82rem', color: '#334155', marginBottom: '6px' }}>
                        Kunci Jawaban <span style={{ color: '#16a34a' }}>*</span>
                      </label>
                      <select
                        value={editForm.kunci_jawaban}
                        onChange={(e) => setEditForm(prev => ({ ...prev, kunci_jawaban: e.target.value.toUpperCase() }))}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: '8px',
                          border: '2px solid #22c55e',
                          background: '#f0fdf4',
                          color: '#15803d',
                          fontWeight: 800,
                          fontSize: '0.9rem',
                          outline: 'none',
                          cursor: 'pointer',
                          boxSizing: 'border-box'
                        }}
                      >
                        <option value="A">Kunci Opsi A</option>
                        <option value="B">Kunci Opsi B</option>
                        <option value="C">Kunci Opsi C</option>
                        <option value="D">Kunci Opsi D</option>
                        <option value="E">Kunci Opsi E</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontWeight: 700, fontSize: '0.82rem', color: '#334155', marginBottom: '6px' }}>
                        Bobot Skor
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={editForm.bobot_skor}
                        onChange={(e) => setEditForm(prev => ({ ...prev, bobot_skor: parseInt(e.target.value, 10) || 1 }))}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: '8px',
                          border: '1.5px solid #cbd5e1',
                          fontWeight: 700,
                          fontSize: '0.9rem',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>

                  {/* Row 2: Teks Pertanyaan */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>
                        Teks Pertanyaan <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px' }}>
                        Enter & baris baru dipertahankan
                      </span>
                    </div>
                    <textarea
                      rows={6}
                      value={editForm.pertanyaan}
                      onChange={(e) => setEditForm(prev => ({ ...prev, pertanyaan: e.target.value }))}
                      dir={lombaFilter === 'Arab' ? 'rtl' : 'ltr'}
                      placeholder="Tuliskan isi pertanyaan di sini..."
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '10px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: lombaFilter === 'Arab' ? '1.25rem' : '0.95rem',
                        fontFamily: lombaFilter === 'Arab' ? "'KFGQPC Uthman Taha Naskh', 'Uthman Taha Naskh', 'Traditional Arabic', 'Amiri', serif" : 'inherit',
                        lineHeight: lombaFilter === 'Arab' ? '2.1' : '1.6',
                        outline: 'none',
                        resize: 'vertical',
                        boxSizing: 'border-box',
                        whiteSpace: 'pre-wrap'
                      }}
                      required
                    />
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <i className="fas fa-info-circle" style={{ color: '#3b82f6' }}></i>
                      <span>Simbol satuan seperti <code>cm2</code>, <code>m2</code>, <code>cm3</code>, <code>m3</code>, atau pangkat <code>^2</code> otomatis diformat menjadi <code>cm²</code>, <code>m²</code>, <code>cm³</code>, <code>m³</code> saat disimpan.</span>
                    </div>
                  </div>

                  {/* Row Gambar (jika ada) */}
                  {editForm.gambar_url && (
                    <div style={{
                      padding: '12px 16px',
                      background: editForm.hapus_gambar ? '#fef2f2' : '#f8fafc',
                      borderRadius: '10px',
                      border: `1.5px dashed ${editForm.hapus_gambar ? '#fca5a5' : '#cbd5e1'}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px'
                    }}>
                      <img 
                        src={`/api/proxy-image?url=${encodeURIComponent(editForm.gambar_url)}`} 
                        alt="Gambar Soal" 
                        style={{ 
                          maxWidth: '120px', 
                          maxHeight: '75px', 
                          borderRadius: '6px', 
                          border: '1px solid #e2e8f0',
                          opacity: editForm.hapus_gambar ? 0.35 : 1
                        }} 
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: editForm.hapus_gambar ? '#b91c1c' : '#334155' }}>
                          {editForm.hapus_gambar ? 'Gambar akan DIHAPUS saat Anda menekan Simpan' : 'Soal ini memiliki lampiran gambar'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                          Untuk mengganti dengan gambar baru, simpan lalu klik tombol <b>Ganti Gambar</b> di kartu soal.
                        </div>
                      </div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem', color: '#dc2626' }}>
                        <input
                          type="checkbox"
                          checked={editForm.hapus_gambar}
                          onChange={(e) => setEditForm(prev => ({ ...prev, hapus_gambar: e.target.checked }))}
                        />
                        Hapus Gambar
                      </label>
                    </div>
                  )}

                  {/* Row 3: Pilihan Jawaban A, B, C, D, E */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <label style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>
                        Pilihan Jawaban
                      </label>
                      <span style={{ fontSize: '0.75rem', color: '#0369a1', background: '#e0f2fe', padding: '3px 10px', borderRadius: '12px', fontWeight: 700 }}>
                        <i className="fas fa-hand-pointer" style={{ marginRight: '4px' }}></i> Klik tombol huruf (A/B/C/D/E) untuk set sebagai Kunci
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {(['A', 'B', 'C', 'D', 'E'] as const).map(opt => {
                        const isKey = editForm.kunci_jawaban === opt;
                        const fieldName = `opsi_${opt.toLowerCase()}` as 'opsi_a' | 'opsi_b' | 'opsi_c' | 'opsi_d' | 'opsi_e';
                        const isOptE = opt === 'E';

                        return (
                          <div 
                            key={opt}
                            style={{
                              display: 'flex',
                              gap: '10px',
                              alignItems: 'flex-start',
                              padding: '8px 12px',
                              borderRadius: '10px',
                              background: isKey ? '#f0fdf4' : '#ffffff',
                              border: `1.5px solid ${isKey ? '#86efac' : '#e2e8f0'}`
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => setEditForm(prev => ({ ...prev, kunci_jawaban: opt }))}
                              style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '8px',
                                border: 'none',
                                background: isKey ? '#22c55e' : '#e2e8f0',
                                color: isKey ? 'white' : '#475569',
                                fontWeight: 800,
                                fontSize: '0.95rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                transition: 'all 0.15s ease'
                              }}
                              title={`Klik untuk jadikan Opsi ${opt} sebagai Kunci Jawaban`}
                            >
                              {opt}
                            </button>

                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: isKey ? '#15803d' : '#64748b' }}>
                                  Opsi {opt} {isOptE ? '(Opsional)' : '*'}
                                </span>
                                {isKey && (
                                  <span style={{ fontSize: '0.68rem', background: '#dcfce7', color: '#166534', padding: '1px 8px', borderRadius: '10px', fontWeight: 800 }}>
                                    <i className="fas fa-check-circle" style={{ marginRight: '4px' }}></i> KUNCI JAWABAN
                                  </span>
                                )}
                              </div>
                              <textarea
                                rows={2}
                                value={editForm[fieldName]}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setEditForm(prev => ({ ...prev, [fieldName]: val }));
                                }}
                                dir={lombaFilter === 'Arab' ? 'rtl' : 'ltr'}
                                placeholder={isOptE ? 'Kosongkan jika hanya ada 4 opsi (A-D)...' : `Masukkan teks opsi ${opt}...`}
                                style={{
                                  width: '100%',
                                  padding: '8px 10px',
                                  borderRadius: '6px',
                                  border: `1px solid ${isKey ? '#86efac' : '#cbd5e1'}`,
                                  fontSize: lombaFilter === 'Arab' ? '1.15rem' : '0.9rem',
                                  fontFamily: lombaFilter === 'Arab' ? "'KFGQPC Uthman Taha Naskh', 'Uthman Taha Naskh', 'Traditional Arabic', 'Amiri', serif" : 'inherit',
                                  outline: 'none',
                                  resize: 'vertical',
                                  boxSizing: 'border-box',
                                  whiteSpace: 'pre-wrap'
                                }}
                                required={!isOptE}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </form>
              ) : (
                /* Tab Live Preview */
                <div>
                  <div style={{ marginBottom: '14px', fontSize: '0.85rem', color: '#64748b' }}>
                    Tampilan berikut memvisualisasikan bagaimana soal akan dilihat oleh siswa saat ujian CBT:
                  </div>

                  <div style={{ border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '20px', background: lombaFilter === 'Arab' ? '#fcfffd' : 'white' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px', alignItems: 'center' }}>
                      <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.05rem' }}>
                        Soal No. {editForm.nomor_soal}
                      </div>
                      <span style={{ fontSize: '0.75rem', background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                        Bobot Skor: {editForm.bobot_skor}
                      </span>
                    </div>

                    <div 
                      dir={lombaFilter === 'Arab' ? 'rtl' : 'ltr'}
                      style={{ 
                        fontSize: lombaFilter === 'Arab' ? '1.5rem' : '1.05rem', 
                        color: '#0f172a', 
                        marginBottom: '18px',
                        fontFamily: lombaFilter === 'Arab' ? "'KFGQPC Uthman Taha Naskh', 'Uthman Taha Naskh', 'Traditional Arabic', 'Amiri', serif" : 'inherit',
                        lineHeight: lombaFilter === 'Arab' ? '2.4' : '1.7',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word'
                      }}
                    >
                      {renderMixedText(formatMathSymbols(editForm.pertanyaan), lombaFilter === 'Arab')}
                    </div>

                    {editForm.gambar_url && !editForm.hapus_gambar && (
                      <div style={{ marginBottom: '16px' }}>
                        <img 
                          src={`/api/proxy-image?url=${encodeURIComponent(editForm.gambar_url)}`} 
                          alt="Gambar Soal" 
                          style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                        />
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      {(['A', 'B', 'C', 'D', 'E'] as const).map(opt => {
                        const fieldName = `opsi_${opt.toLowerCase()}` as 'opsi_a' | 'opsi_b' | 'opsi_c' | 'opsi_d' | 'opsi_e';
                        const opsiVal = editForm[fieldName];
                        if (!opsiVal && opt === 'E') return null;
                        const isKey = editForm.kunci_jawaban === opt;

                        return (
                          <div 
                            key={opt}
                            style={{
                              background: isKey ? '#dcfce7' : '#f8fafc',
                              border: isKey ? '1.5px solid #86efac' : '1px solid #e2e8f0',
                              padding: '10px 14px',
                              borderRadius: '8px',
                              display: 'flex',
                              gap: '10px',
                              alignItems: 'center'
                            }}
                          >
                            <span style={{
                              fontWeight: 800,
                              color: isKey ? '#166534' : '#64748b',
                              minWidth: '24px',
                              textAlign: 'center',
                              background: isKey ? '#bbf7d0' : '#e2e8f0',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.85rem',
                              flexShrink: 0
                            }}>
                              {opt}
                            </span>
                            <span 
                              dir={lombaFilter === 'Arab' ? 'rtl' : 'ltr'}
                              style={{
                                fontFamily: lombaFilter === 'Arab' ? "'KFGQPC Uthman Taha Naskh', 'Uthman Taha Naskh', 'Traditional Arabic', 'Amiri', serif" : 'inherit',
                                fontSize: lombaFilter === 'Arab' ? '1.35rem' : '0.9rem',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                color: '#1e293b',
                                flex: 1
                              }}
                            >
                              {renderMixedText(formatMathSymbols(opsiVal), lombaFilter === 'Arab')}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div 
              style={{
                padding: '14px 24px',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#f8fafc'
              }}
            >
              <button
                type="button"
                onClick={closeEditModal}
                disabled={isSavingEdit}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: 'white',
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  cursor: isSavingEdit ? 'not-allowed' : 'pointer'
                }}
              >
                Batal
              </button>

              <button
                type="submit"
                form="edit-soal-form"
                disabled={isSavingEdit}
                onClick={editActiveTab === 'preview' ? () => handleSaveEdit() : undefined}
                style={{
                  padding: '9px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#2563eb',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: isSavingEdit ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)'
                }}
              >
                {isSavingEdit ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i> Menyimpan...
                  </>
                ) : (
                  <>
                    <i className="fas fa-check"></i> Simpan Perubahan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
