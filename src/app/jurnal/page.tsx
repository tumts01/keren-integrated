'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import styles from './jurnal.module.css';
import InlineLoading from '@/components/InlineLoading';

interface JurnalRecord {
  id: string;
  timestamp: string;
  tanggal: string;
  jamKe: string;
  tahunAjaran: string;
  kelas: string;
  mapel: string;
  namaGuru: string;
  materi: string;
}

export default function JurnalPage() {
  const [activeTab, setActiveTab] = useState<'isi' | 'rekap'>('isi');

  // --- ISI JURNAL STATE ---
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [selectedKelas, setSelectedKelas] = useState('');
  const [selectedMapel, setSelectedMapel] = useState('');
  const [selectedJam, setSelectedJam] = useState<number[]>([]);
  const [materi, setMateri] = useState('');
  const [kelasList, setKelasList] = useState<string[]>([]);
  const [mapelList, setMapelList] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- REKAP STATE ---
  const [rekapData, setRekapData] = useState<JurnalRecord[]>([]);
  const [rekapLoading, setRekapLoading] = useState(false);
  const [filterFrom, setFilterFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0]; });
  const [filterTo, setFilterTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [filterGuru, setFilterGuru] = useState('');
  const [filterKelas, setFilterKelas] = useState('');
  const [filterMapel, setFilterMapel] = useState('');
  const [guruList, setGuruList] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUsername, setCurrentUsername] = useState('');

  // --- EDIT STATE ---
  const [editingJurnal, setEditingJurnal] = useState<JurnalRecord | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  useEffect(() => {
    // Load user info
    const storedUser = localStorage.getItem('keren_user_data');
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        const role = (u.role || u.role || '').toLowerCase();
        const namaGuru = u.nama || u.username || '';
        setCurrentUsername(namaGuru);
        setIsAdmin(role === 'admin');
        if (role !== 'admin') setFilterGuru(namaGuru);
      } catch {}
    }

    // Load kelas & mapel
    fetch('/api/kelas').then(r => r.json()).then(data => {
      if (data.success) {
        const uniqueKelas = Array.from(new Set(data.data.map((k: any) => k.rombel)))
          .filter((k: any) => k && k.length >= 2 && k !== '-') as string[];
        uniqueKelas.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
        setKelasList(uniqueKelas);
      }
    }).catch(console.error);

    fetch('/api/jadwal/mapel').then(r => r.json()).then(data => {
      if (data.success && data.data) {
        setMapelList(data.data.map((m: any) => m.namaMapel));
      }
    }).catch(console.error);
  }, []);

  const fetchRekap = useCallback(async () => {
    setRekapLoading(true);
    try {
      const qs = new URLSearchParams();
      if (filterFrom) qs.set('from', filterFrom);
      if (filterTo) qs.set('to', filterTo);
      const res = await fetch('/api/jurnal?' + qs.toString());
      const json = await res.json();
      if (json.success) {
        setRekapData(json.data);
        // Build guru list for admin filter
        const gurus = Array.from(new Set(json.data.map((r: JurnalRecord) => r.namaGuru).filter(Boolean))) as string[];
        gurus.sort();
        setGuruList(gurus);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRekapLoading(false);
    }
  }, [filterFrom, filterTo]);

  useEffect(() => {
    if (activeTab === 'rekap') fetchRekap();
  }, [activeTab, fetchRekap]);

  const toggleJam = (jam: number) => {
    if (selectedMapel.toLowerCase().includes('program khusus')) {
      if (jam !== 1) {
        Swal.fire({ icon: 'warning', title: 'Perhatian', text: 'Program Khusus hanya bisa diisi di Jam ke-1.' });
        return;
      }
      setSelectedJam([1]);
      return;
    }
    
    setSelectedJam(prev =>
      prev.includes(jam) ? prev.filter(j => j !== jam) : [...prev, jam].sort((a, b) => a - b)
    );
  };

  const handleSaveEdit = async () => {
    if (!editingJurnal) return;
    
    if (editingJurnal.mapel.toLowerCase().includes('program khusus')) {
      const jamStr = editingJurnal.jamKe.trim();
      if (jamStr !== '1') {
        Swal.fire({ 
          icon: 'warning', 
          title: 'Aturan Program Khusus', 
          text: 'Mata pelajaran Program Khusus HANYA DAPAT diisi di Jam ke-1 dan berdurasi 1 Jam.' 
        });
        return;
      }
    }
    
    setIsSavingEdit(true);
    try {
      const res = await fetch('/api/jurnal', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingJurnal)
      });
      const data = await res.json();
      if (data.success) {
        Swal.fire('Berhasil!', 'Jurnal berhasil diperbarui.', 'success');
        setEditingJurnal(null);
        fetchRekap();
      } else {
        Swal.fire('Gagal', data.error, 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Gagal memperbarui jurnal.', 'error');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedKelas || !selectedMapel) {
      Swal.fire({ icon: 'warning', title: 'Oops...', text: 'Mohon pilih Kelas dan Mata Pelajaran!' });
      return;
    }
    if (selectedJam.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Oops...', text: 'Mohon pilih Jam Ke!' });
      return;
    }
    
    if (selectedMapel.toLowerCase().includes('program khusus')) {
      if (selectedJam.length > 1 || !selectedJam.includes(1)) {
        Swal.fire({ 
          icon: 'warning', 
          title: 'Aturan Program Khusus', 
          text: 'Mata pelajaran Program Khusus HANYA DAPAT diisi di Jam ke-1 dan berdurasi maksimal 1 Jam.' 
        });
        setSelectedJam([1]);
        return;
      }
    }
    
    if (!materi.trim()) {
      Swal.fire({ icon: 'warning', title: 'Oops...', text: 'Mohon isi Materi!' });
      return;
    }
    const result = await Swal.fire({
      title: 'Konfirmasi',
      text: `Simpan jurnal mengajar untuk kelas ${selectedKelas}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Ya, Simpan!',
      cancelButtonText: 'Batal'
    });
    if (!result.isConfirmed) return;

    setIsSubmitting(true);
    // Ambil nama guru dari keren_user_data (field 'nama'), bukan 'username' yang tidak tersimpan
    let guru = 'Unknown';
    try {
      const stored = localStorage.getItem('keren_user_data');
      if (stored) {
        const parsed = JSON.parse(stored);
        guru = parsed.nama || parsed.username || 'Unknown';
      }
    } catch {}
    try {
      const res = await fetch('/api/jurnal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tanggal, jamKe: selectedJam.join(', '), kelas: selectedKelas,
          mapel: selectedMapel, guru, materi,
          tahunAjaran: new Date().getFullYear() + '/' + (new Date().getFullYear() + 1)
        })
      });
      const data = await res.json();
      if (data.success) {
        Swal.fire({ icon: 'success', title: 'Berhasil!', text: 'Jurnal mengajar berhasil disimpan.' });
        setMateri('');
        setSelectedJam([]);
      } else {
        Swal.fire({ icon: 'error', title: 'Gagal', text: data.error || 'Terjadi kesalahan' });
      }
    } catch (error: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter rekap
  let filtered = rekapData.filter(r => {
      if (!isAdmin && r.namaGuru?.trim().toLowerCase() !== currentUsername?.trim().toLowerCase()) return false;
      if (filterGuru && r.namaGuru?.trim().toLowerCase() !== filterGuru?.trim().toLowerCase()) return false;
      if (filterKelas && r.kelas?.trim().toLowerCase() !== filterKelas?.trim().toLowerCase()) return false;
      if (filterMapel && r.mapel?.trim().toLowerCase() !== filterMapel?.trim().toLowerCase()) return false;
      if (filterFrom && r.tanggal < filterFrom) return false;
      if (filterTo && r.tanggal > filterTo) return false;
      return true;
    });

    // Urutkan berdasarkan tanggal (terbaru ke terlama) lalu jam ke (awal ke akhir)
    filtered.sort((a, b) => {
      if (a.tanggal > b.tanggal) return -1;
      if (a.tanggal < b.tanggal) return 1;
      
      const jamA = parseInt(a.jamKe.split(',')[0]) || 0;
      const jamB = parseInt(b.jamKe.split(',')[0]) || 0;
      return jamA - jamB;
    });

  // Group by guru for admin summary
  const guruSummary = filtered.reduce((acc: Record<string, number>, r) => {
    acc[r.namaGuru] = (acc[r.namaGuru] || 0) + 1;
    return acc;
  }, {});

  const handleExportRincianGuruModal = async (targetGuruParam?: string) => {
    const allGurus = Array.from(new Set(guruList))
      .map(g => (g || '').trim().replace(/\s+/g, ' '))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, 'id'));

    const defaultGuru = targetGuruParam || (isAdmin ? (filterGuru || '') : currentUsername);
    const now = new Date();
    const defaultFrom = filterFrom || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const defaultTo = filterTo || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const { value: formValues } = await Swal.fire({
      title: 'Export Rincian Jurnal Guru',
      width: 540,
      html: `
        <div style="text-align: left; font-size: 0.88rem;">
          <p style="margin: 0 0 14px; color: #64748b; font-size: 0.82rem; line-height: 1.4;">
            Pilih nama guru dan rentang tanggal untuk mengunduh <strong>rincian jadwal KBM lengkap</strong> (hari, tanggal, jam ke, durasi jam, kelas, mata pelajaran, dan materi pembahasan) dalam format <strong>Excel (.xlsx)</strong>.
          </p>
          <div style="margin-bottom: 12px;">
            <label style="display: block; font-weight: 700; margin-bottom: 4px; color: #334155;">Pilih Guru:</label>
            ${isAdmin ? `
              <input id="swal-rg-guru" list="swal-rg-guru-list" value="${defaultGuru}" placeholder="Ketik atau pilih nama guru..." style="width: 100%; padding: 8px 12px; border-radius: 8px; border: 1.5px solid #7c3aed; font-size: 0.9rem; box-sizing: border-box; background: #faf5ff; color: #6b21a8; font-weight: 700;" />
              <datalist id="swal-rg-guru-list">
                ${allGurus.map(g => `<option value="${g}"></option>`).join('')}
              </datalist>
            ` : `
              <input id="swal-rg-guru" type="text" value="${currentUsername}" readonly style="width: 100%; padding: 8px 12px; border-radius: 8px; border: 1.5px solid #cbd5e1; font-size: 0.9rem; box-sizing: border-box; background: #f1f5f9; color: #475569; font-weight: 700; cursor: not-allowed;" />
            `}
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
            <div>
              <label style="display: block; font-weight: 700; margin-bottom: 4px; color: #334155;">Dari Tanggal:</label>
              <input id="swal-rg-from" type="date" value="${defaultFrom}" style="width: 100%; padding: 8px 10px; border-radius: 8px; border: 1.5px solid #cbd5e1; font-size: 0.88rem; box-sizing: border-box;" />
            </div>
            <div>
              <label style="display: block; font-weight: 700; margin-bottom: 4px; color: #334155;">Sampai Tanggal:</label>
              <input id="swal-rg-to" type="date" value="${defaultTo}" style="width: 100%; padding: 8px 10px; border-radius: 8px; border: 1.5px solid #cbd5e1; font-size: 0.88rem; box-sizing: border-box;" />
            </div>
          </div>
          <div style="margin-bottom: 12px;">
            <label style="display: block; font-weight: 700; margin-bottom: 4px; color: #334155;">Kategori Mata Pelajaran:</label>
            <select id="swal-rg-kategori" style="width: 100%; padding: 8px 10px; border-radius: 8px; border: 1.5px solid #cbd5e1; font-size: 0.88rem; box-sizing: border-box; background: white;">
              <option value="semua">Semua Mata Pelajaran (Reguler & Proksus)</option>
              <option value="reguler">Hanya Mapel Reguler (di luar Proksus)</option>
              <option value="proksus">Hanya Program Khusus (Proksus)</option>
            </select>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonColor: '#7c3aed',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: '<i class="fas fa-file-excel" style="margin-right: 6px;"></i> Unduh Excel',
      cancelButtonText: 'Batal',
      preConfirm: () => {
        const g = (document.getElementById('swal-rg-guru') as HTMLInputElement)?.value.trim();
        const f = (document.getElementById('swal-rg-from') as HTMLInputElement)?.value;
        const t = (document.getElementById('swal-rg-to') as HTMLInputElement)?.value;
        const k = (document.getElementById('swal-rg-kategori') as HTMLSelectElement)?.value || 'semua';

        if (!g) {
          Swal.showValidationMessage('Nama guru wajib dipilih atau diisi!');
          return false;
        }
        if (!f || !t) {
          Swal.showValidationMessage('Rentang tanggal (Dari & Sampai) harus ditentukan!');
          return false;
        }
        if (f > t) {
          Swal.showValidationMessage('Tanggal Mulai tidak boleh melewati Tanggal Selesai!');
          return false;
        }
        return { guru: g, from: f, to: t, kategori: k };
      }
    });

    if (!formValues) return;

    const { guru: targetGuru, from: targetFrom, to: targetTo, kategori: targetKategori } = formValues;

    Swal.fire({
      title: 'Menyiapkan Data Excel...',
      html: `Mengambil rincian jurnal untuk <b>${targetGuru}</b>...`,
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      const res = await fetch(`/api/jurnal?from=${targetFrom}&to=${targetTo}`);
      const json = await res.json();
      if (!json.success || !Array.isArray(json.data)) {
        Swal.fire('Gagal', 'Tidak dapat mengambil data jurnal.', 'error');
        return;
      }

      const norm = (s: string) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
      const targetNorm = norm(targetGuru);

      let matched = json.data.filter((r: any) => {
        const gNorm = norm(r.namaGuru);
        return gNorm === targetNorm || gNorm.includes(targetNorm) || targetNorm.includes(gNorm);
      });

      if (targetKategori === 'reguler') {
        matched = matched.filter((r: any) => {
          const m = (r.mapel || '').toLowerCase();
          return !m.includes('program khusus') && !m.includes('proksus');
        });
      } else if (targetKategori === 'proksus') {
        matched = matched.filter((r: any) => {
          const m = (r.mapel || '').toLowerCase();
          return m.includes('program khusus') || m.includes('proksus');
        });
      }

      if (matched.length === 0) {
        Swal.fire('Info', `Tidak ditemukan data jurnal untuk <b>${targetGuru}</b> pada periode ${targetFrom} s.d. ${targetTo}.`, 'info');
        return;
      }

      matched.sort((a: any, b: any) => {
        if (a.tanggal !== b.tanggal) return a.tanggal.localeCompare(b.tanggal);
        const jamA = parseInt((a.jamKe || '').split(',')[0], 10) || 0;
        const jamB = parseInt((b.jamKe || '').split(',')[0], 10) || 0;
        return jamA - jamB;
      });

      const countJam = (jamKe: string) => {
        if (!jamKe) return 1;
        return jamKe.split(',').map((s: string) => s.trim()).filter(Boolean).length;
      };

      let totalJamReguler = 0;
      let totalJamProksus = 0;

      matched.forEach((r: any) => {
        const j = countJam(r.jamKe || '');
        const m = (r.mapel || '').toLowerCase();
        if (m.includes('program khusus') || m.includes('proksus')) {
          totalJamProksus += j;
        } else {
          totalJamReguler += j;
        }
      });

      const totalJamSemua = totalJamReguler + totalJamProksus;

      const formatTglIndo = (str: string) => {
        if (!str) return '-';
        try {
          const [yStr, mStr, dStr] = str.split('-');
          if (yStr && mStr && dStr) {
            const d = new Date(parseInt(yStr, 10), parseInt(mStr, 10) - 1, parseInt(dStr, 10));
            return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
          }
          const d = new Date(str);
          return isNaN(d.getTime()) ? str : d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
        } catch {
          return str;
        }
      };

      const periodeText = `${formatTglIndo(targetFrom)} s.d. ${formatTglIndo(targetTo)}`;
      const cetakText = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });

      const aoa: any[][] = [
        ['RINCIAN JURNAL MENGAJAR GURU'],
        ['MTs ALMAARIF 01 SINGOSARI'],
        [`Nama Guru   : ${targetGuru}`],
        [`Periode     : ${periodeText}`],
        [`Kategori    : ${targetKategori === 'reguler' ? 'Hanya Mapel Reguler' : targetKategori === 'proksus' ? 'Hanya Program Khusus' : 'Semua Mapel'}`],
        [`Dicetak     : ${cetakText}`],
        [],
        ['No', 'Hari', 'Tanggal', 'Jam Ke', 'Durasi (Jam)', 'Kelas', 'Mata Pelajaran', 'Materi Pembahasan']
      ];

      matched.forEach((r: any, idx: number) => {
        let hari = '-';
        let tglFmt = r.tanggal || '-';
        if (r.tanggal) {
          try {
            const [yStr, mStr, dStr] = r.tanggal.split('-');
            if (yStr && mStr && dStr) {
              const d = new Date(parseInt(yStr, 10), parseInt(mStr, 10) - 1, parseInt(dStr, 10));
              hari = d.toLocaleDateString('id-ID', { weekday: 'long' });
              tglFmt = d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
            } else {
              const d = new Date(r.tanggal);
              if (!isNaN(d.getTime())) {
                hari = d.toLocaleDateString('id-ID', { weekday: 'long' });
                tglFmt = d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
              }
            }
          } catch {}
        }
        const durasi = countJam(r.jamKe || '');
        aoa.push([
          idx + 1,
          hari,
          tglFmt,
          r.jamKe ? `Jam ${r.jamKe}` : '-',
          durasi,
          r.kelas || '-',
          r.mapel || '-',
          r.materi || '-'
        ]);
      });

      aoa.push([]);
      aoa.push(['RINGKASAN JAM MENGAJAR:']);
      aoa.push(['Total Pertemuan / KBM', '', '', '', matched.length, 'entri']);
      if (targetKategori !== 'proksus') {
        aoa.push(['Total Jam Mengajar Reguler', '', '', '', totalJamReguler, 'Jam']);
      }
      if (targetKategori !== 'reguler' && (totalJamProksus > 0 || targetKategori === 'proksus')) {
        aoa.push(['Total Jam Program Khusus (Proksus)', '', '', '', totalJamProksus, 'Jam']);
      }
      aoa.push(['TOTAL KESELURUHAN JAM', '', '', '', totalJamSemua, 'Jam']);

      aoa.push([]);
      aoa.push([]);
      aoa.push(['', '', 'Mengetahui,', '', '', '', '', `Singosari, ${cetakText}`]);
      aoa.push(['', '', 'Kepala Madrasah / Kepala TU,', '', '', '', '', 'Guru Pengajar,']);
      aoa.push([]);
      aoa.push([]);
      aoa.push([]);
      aoa.push(['', '', '( __________________________ )', '', '', '', '', `( ${targetGuru} )`]);

      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws['!cols'] = [
        { wch: 5 },
        { wch: 10 },
        { wch: 14 },
        { wch: 12 },
        { wch: 14 },
        { wch: 10 },
        { wch: 28 },
        { wch: 65 }
      ];

      const wb = XLSX.utils.book_new();
      const safeSheetName = (targetGuru || 'Guru').replace(/[\\/?*\[\]:]/g, ' ').trim().slice(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, safeSheetName || 'Rincian Jurnal');

      const safeFileName = `Rincian_Jurnal_${targetGuru.replace(/[^a-zA-Z0-9]/g, '_')}_${targetFrom}_sd_${targetTo}.xlsx`;
      XLSX.writeFile(wb, safeFileName);
      Swal.close();

      Swal.fire({
        icon: 'success',
        title: 'Berhasil Diexport!',
        html: `File <b>${safeFileName}</b> berhasil diunduh.<br><span style="font-size:0.85rem;color:#64748b;">(${matched.length} KBM, Total ${totalJamSemua} Jam)</span>`,
        timer: 3000,
        showConfirmButton: true,
        confirmButtonColor: '#7c3aed'
      });
    } catch (err: any) {
      Swal.fire('Error', 'Gagal membuat file Excel: ' + err.message, 'error');
    }
  };

  const handleExportProksus = () => {
    const dataProksus = filtered.filter(r => (r.mapel || '').toLowerCase().includes('program khusus') || (r.mapel || '').toLowerCase().includes('proksus'));
    if (dataProksus.length === 0) {
      Swal.fire('Info', 'Tidak ada data jurnal Program Khusus pada filter saat ini', 'info');
      return;
    }
    
    const excelData = dataProksus.map((r, i) => ({
      'No': i + 1,
      'Tanggal': r.tanggal ? new Date(r.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
      'Nama Guru': r.namaGuru,
      'Kelas': r.kelas,
      'Mata Pelajaran': r.mapel,
      'Jam Ke': r.jamKe,
      'Materi': r.materi
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    worksheet['!cols'] = [
      { wch: 5 }, { wch: 15 }, { wch: 30 }, { wch: 10 }, { wch: 25 }, { wch: 10 }, { wch: 60 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Proksus');
    XLSX.writeFile(workbook, `Rekap_Jurnal_Program_Khusus.xlsx`);
  };

  return (
    <div className={styles.container}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '0', background: 'white', borderRadius: '12px 12px 0 0', border: '1px solid #e2e8f0', borderBottom: 'none', overflow: 'hidden' }}>
        <button
          onClick={() => setActiveTab('isi')}
          style={{
            flex: 1, padding: '14px 20px', border: 'none', background: activeTab === 'isi' ? 'var(--primary)' : 'white',
            color: activeTab === 'isi' ? 'white' : '#64748b', fontWeight: 600, fontSize: '0.95rem',
            cursor: 'pointer', transition: 'all 0.2s', borderBottom: activeTab === 'isi' ? 'none' : '1px solid #e2e8f0'
          }}
        >
          <i className="fas fa-pen" style={{ marginRight: 8 }}></i>Isi Jurnal
        </button>
        <button
          onClick={() => setActiveTab('rekap')}
          style={{
            flex: 1, padding: '14px 20px', border: 'none', background: activeTab === 'rekap' ? 'var(--primary)' : 'white',
            color: activeTab === 'rekap' ? 'white' : '#64748b', fontWeight: 600, fontSize: '0.95rem',
            cursor: 'pointer', transition: 'all 0.2s', borderBottom: activeTab === 'rekap' ? 'none' : '1px solid #e2e8f0'
          }}
        >
          <i className="fas fa-chart-bar" style={{ marginRight: 8 }}></i>Rekap Jurnal
        </button>
      </div>

      {/* ISI JURNAL TAB */}
      {activeTab === 'isi' && (
        <div className={styles.card} style={{ borderRadius: '0 0 12px 12px', marginTop: 0 }}>
          <div className={styles.header}>
            <h2><i className="fas fa-book-open"></i> Jurnal Mengajar</h2>
            <p>Isi jurnal kegiatan pembelajaran kelas.</p>
          </div>
          <div className={styles.filterSection}>
            <div className={styles.filterGroup}>
              <label>Tanggal</label>
              <input type="date" className={styles.inputField} value={tanggal} onChange={e => setTanggal(e.target.value)} />
            </div>
            <div className={styles.filterGroup}>
              <label>Mata Pelajaran</label>
              <select 
                value={selectedMapel} 
                onChange={e => {
                  const val = e.target.value;
                  setSelectedMapel(val);
                  if (val.toLowerCase().includes('program khusus')) {
                    setSelectedJam([1]);
                  }
                }} 
                className={styles.inputField}
              >
                <option value="">-- Pilih Mapel --</option>
                {mapelList.map((m, i) => <option key={i} value={m}>{m}</option>)}
              </select>
            </div>
            <div className={styles.filterGroup}>
              <label>Kelas</label>
              <select value={selectedKelas} onChange={e => setSelectedKelas(e.target.value)} className={styles.inputField}>
                <option value="">-- Pilih Kelas --</option>
                {kelasList.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div className={styles.filterGroup} style={{ flex: '1 1 100%' }}>
              <label>Jam Ke (Pilih satu atau lebih)</label>
              <div className={styles.jamPills}>
                {[1,2,3,4,5,6,7,8,9,10,11,12,13].map(jam => {
                  const isExtra = jam >= 11;
                  const isActive = selectedJam.includes(jam);
                  return (
                    <button key={jam} type="button" onClick={() => toggleJam(jam)}
                      className={`${styles.jamPill} ${isActive && !isExtra ? styles.jamPillActive : ''}`}
                      style={isExtra ? {
                        background: isActive ? '#ef4444' : '#fee2e2',
                        color: isActive ? 'white' : '#ef4444',
                        borderColor: isActive ? '#ef4444' : '#fca5a5'
                      } : {}}
                    >
                      {jam}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          {selectedKelas && (
            <div style={{ marginTop: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold', color: '#334155' }}>Materi Pembelajaran</label>
              <textarea className={styles.inputField} style={{ width: '100%', height: 120, resize: 'vertical' }}
                placeholder="Tuliskan materi yang diajarkan pada sesi ini..."
                value={materi} onChange={e => setMateri(e.target.value)} />
            </div>
          )}
          <div className={styles.actions} style={{ marginTop: 30, display: 'flex', justifyContent: 'flex-end' }}>
            <button className={styles.btnSave} onClick={handleSubmit} disabled={isSubmitting}
              style={{ opacity: isSubmitting ? 0.7 : 1, width: '100%' }}>
              {isSubmitting ? 'Menyimpan...' : <><i className="fas fa-save"></i> Simpan Jurnal</>}
            </button>
          </div>
        </div>
      )}

      {/* REKAP JURNAL TAB */}
      {activeTab === 'rekap' && (
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '0 0 12px 12px', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#1e293b' }}>
                <i className="fas fa-chart-bar" style={{ marginRight: 8, color: 'var(--primary)' }}></i>
                Rekap Jurnal Mengajar
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                {isAdmin ? 'Menampilkan data semua guru' : `Data jurnal: ${currentUsername}`}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={() => handleExportRincianGuruModal()}
                style={{ background: '#7c3aed', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: '0.85rem', color: 'white', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, boxShadow: '0 2px 6px rgba(124,58,237,0.25)' }}
                title="Export rincian jurnal mengajar guru tertentu pada rentang tanggal tertentu"
              >
                <i className="fas fa-user-check"></i> Export Rincian Jurnal Guru
              </button>
              <button onClick={handleExportProksus} style={{ background: '#ecfdf5', border: '1px solid #10b981', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: '0.85rem', color: '#059669', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                <i className="fas fa-file-excel"></i> Export Proksus
              </button>
              <button onClick={fetchRekap} style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: '0.85rem', color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="fas fa-sync-alt"></i> Refresh
              </button>
            </div>
          </div>

          {/* Filter */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20, padding: 16, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Dari Tanggal</label>
              <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
                style={{ padding: '7px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.9rem' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Sampai Tanggal</label>
              <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
                style={{ padding: '7px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.9rem' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Filter Kelas</label>
              <select value={filterKelas} onChange={e => setFilterKelas(e.target.value)}
                style={{ padding: '7px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.9rem', minWidth: 130 }}>
                <option value="">Semua Kelas</option>
                {kelasList.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Filter Mapel</label>
              <select value={filterMapel} onChange={e => setFilterMapel(e.target.value)}
                style={{ padding: '7px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.9rem', minWidth: 150 }}>
                <option value="">Semua Mapel</option>
                {mapelList.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            {isAdmin && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Filter Guru</label>
                <select value={filterGuru} onChange={e => setFilterGuru(e.target.value)}
                  style={{ padding: '7px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.9rem', minWidth: 180 }}>
                  <option value="">Semua Guru</option>
                  {guruList.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            )}
            {(filterFrom || filterTo || filterKelas || filterMapel || (isAdmin && filterGuru)) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, justifyContent: 'flex-end' }}>
                <button onClick={() => { setFilterFrom(''); setFilterTo(''); setFilterKelas(''); setFilterMapel(''); if (isAdmin) setFilterGuru(''); }}
                  style={{ padding: '7px 14px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                  <i className="fas fa-times"></i> Reset Filter
                </button>
              </div>
            )}
          </div>

          {/* Summary cards (admin only) */}
          {isAdmin && !filterGuru && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 600 }}>TOTAL ENTRI</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e40af' }}>{filtered.length}</span>
              </div>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>JUMLAH GURU</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#15803d' }}>{Object.keys(guruSummary).length}</span>
              </div>
              {Object.entries(guruSummary).sort((a,b) => b[1]-a[1]).slice(0,3).map(([nama, count]) => (
                <div key={nama} style={{ background: '#fefce8', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 600 }}>🏆 {nama}</span>
                  <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#92400e' }}>{count} <span style={{fontSize:'0.8rem', fontWeight:500}}>entri</span></span>
                </div>
              ))}
            </div>
          )}

          {/* Table */}
          {rekapLoading ? (
            <InlineLoading message="Memuat data jurnal..." />
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>
              <i className="fas fa-inbox" style={{ fontSize: '2.5rem', display: 'block', marginBottom: 12 }}></i>
              Tidak ada data jurnal ditemukan
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>No</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>Tanggal</th>
                    {isAdmin && <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>Nama Guru</th>}
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>Kelas</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>Mata Pelajaran</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>Jam Ke</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#475569' }}>Materi</th>
                    {isAdmin && <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>Aksi</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => (
                    <tr key={r.id || i} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                      <td style={{ padding: '10px 14px', color: '#94a3b8', fontWeight: 500 }}>{i + 1}</td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', color: '#334155', fontWeight: 500 }}>
                        {r.tanggal ? new Date(r.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                      </td>
                      {isAdmin && (
                        <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                          <span
                            onClick={() => handleExportRincianGuruModal(r.namaGuru)}
                            title={`Klik untuk export rincian jurnal ${r.namaGuru}`}
                            style={{ background: '#e0e7ff', color: '#4338ca', padding: '3px 10px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                          >
                            {r.namaGuru}
                          </span>
                        </td>
                      )}
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', fontWeight: 600, color: '#1e293b' }}>{r.kelas}</td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', color: '#475569' }}>{r.mapel}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <span style={{ background: /(11|12|13)/.test(r.jamKe) ? '#fee2e2' : '#dcfce7', color: /(11|12|13)/.test(r.jamKe) ? '#ef4444' : '#16a34a', padding: '3px 10px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600 }}>Jam {r.jamKe}</span>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#475569', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.materi}>{r.materi}</td>
                      {isAdmin && (
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          <button
                            style={{ background: '#f59e0b', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}
                            onClick={() => setEditingJurnal(r)}
                          >
                            <i className="fas fa-edit"></i> Edit
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: 12, fontSize: '0.8rem', color: '#94a3b8', textAlign: 'right' }}>
                Menampilkan {filtered.length} dari {rekapData.length} entri
              </div>
            </div>
          )}
        </div>
      )}
      {editingJurnal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', padding: '24px', borderRadius: '12px', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#1e293b' }}><i className="fas fa-edit"></i> Edit Jurnal Mengajar</h3>
              <button onClick={() => !isSavingEdit && setEditingJurnal(null)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Tanggal</label>
                <input type="date" value={editingJurnal.tanggal} onChange={e => setEditingJurnal({ ...editingJurnal, tanggal: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Kelas</label>
                  <input type="text" value={editingJurnal.kelas} onChange={e => setEditingJurnal({ ...editingJurnal, kelas: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Jam Ke (pisahkan dengan koma)</label>
                  <input type="text" value={editingJurnal.jamKe} onChange={e => setEditingJurnal({ ...editingJurnal, jamKe: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Nama Guru</label>
                <input type="text" value={editingJurnal.namaGuru} onChange={e => setEditingJurnal({ ...editingJurnal, namaGuru: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Mata Pelajaran</label>
                <input type="text" value={editingJurnal.mapel} onChange={e => setEditingJurnal({ ...editingJurnal, mapel: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Materi</label>
                <textarea rows={4} value={editingJurnal.materi} onChange={e => setEditingJurnal({ ...editingJurnal, materi: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', resize: 'vertical' }} />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button onClick={() => setEditingJurnal(null)} disabled={isSavingEdit} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f1f5f9', cursor: 'pointer', fontWeight: 600 }}>Batal</button>
                <button onClick={handleSaveEdit} disabled={isSavingEdit} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#0ea5e9', color: 'white', cursor: 'pointer', fontWeight: 600 }}>
                  {isSavingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

