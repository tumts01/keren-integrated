'use client';

import React, { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import styles from './presensi.module.css';

const MultiSelectDropdown = ({ options, selected, onChange, placeholder, className }: { options: string[], selected: string[], onChange: (s: string[]) => void, placeholder: string, className?: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);
  
  const toggle = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter(x => x !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <div 
        className={className} 
        style={{ minHeight: '38px', cursor: 'pointer', display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}
        onClick={() => setIsOpen(!isOpen)}
      >
        {selected.length === 0 ? <span style={{ color: '#9ca3af' }}>{placeholder}</span> : 
          selected.map(s => (
            <span key={s} style={{ background: '#e0e7ff', color: '#3730a3', padding: '2px 8px', borderRadius: 4, fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center' }}>
              {s}
              <button 
                onClick={(e) => { e.stopPropagation(); toggle(s); }} 
                style={{ background: 'transparent', border: 'none', color: '#4f46e5', marginLeft: 4, cursor: 'pointer', fontSize: '0.9rem', lineHeight: 1 }}
              >
                &times;
              </button>
            </span>
          ))
        }
      </div>
      {isOpen && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #d1d5db', zIndex: 50, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', borderRadius: '4px', marginTop: '4px' }}>
          {options.map(opt => (
            <div 
              key={opt} 
              style={{ padding: '8px 12px', cursor: 'pointer', background: selected.includes(opt) ? '#f3f4f6' : 'white', display: 'flex', alignItems: 'center', fontSize: '0.9rem' }}
              onClick={() => toggle(opt)}
            >
              <input type="checkbox" checked={selected.includes(opt)} readOnly style={{ marginRight: 8, cursor: 'pointer' }} />
              {opt}
            </div>
          ))}
          {options.length === 0 && <div style={{ padding: '8px 12px', color: '#9ca3af', fontSize: '0.9rem' }}>Tidak ada pilihan</div>}
        </div>
      )}
    </div>
  );
};

export default function PresensiPage() {
  const [activeTab, setActiveTab] = useState<'absen' | 'piket' | 'jurnal' | 'jurnal_piket' | 'rekap_piket' | 'rekap_siswa' | 'rekap_jurnal'>('absen');

  // States for Absen Siswa
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [selectedKelas, setSelectedKelas] = useState('');
  const [selectedMapel, setSelectedMapel] = useState('');
  const [isMapelDropdownOpen, setIsMapelDropdownOpen] = useState(false);
  const [searchMapel, setSearchMapel] = useState('');
  const [isGuruDropdownOpen, setIsGuruDropdownOpen] = useState(false);
  const [searchGuru, setSearchGuru] = useState('');
  const [selectedJam, setSelectedJam] = useState<number[]>([]);
  const [jamTersedia, setJamTersedia] = useState<number[]>([1,2,3,4,5,6,7,8,9,10,11,12,13]);
  const [jamConfigLoading, setJamConfigLoading] = useState(false);
  const [showJamConfig, setShowJamConfig] = useState(false);
  const [konfigJam, setKonfigJam] = useState<number[]>([1,2,3,4,5,6,7,8,9,10,11,12,13]);
  const [konfigKeterangan, setKonfigKeterangan] = useState('');
  const [hasJamConfig, setHasJamConfig] = useState(false); // ada config khusus untuk tanggal ini
  
  // Dummy/Mock data states for template
  const [kelasList, setKelasList] = useState<any[]>([]);
  const [mapelList, setMapelList] = useState<string[]>([]);
  const [siswaList, setSiswaList] = useState<any[]>([]);
  const [presensi, setPresensi] = useState<Record<string, string>>({}); // { nisn: 'H' | 'S' | 'I' | 'A' }
  const [loadingSiswa, setLoadingSiswa] = useState(false);
  // Cache siswa per kelas agar tidak refetch ulang ke server
  const siswaCache = useRef<Record<string, any[]>>({});
  // Semua nama siswa aktif (untuk datalist piket, tidak terbatas kelas)
  const [allSiswaNames, setAllSiswaNames] = useState<string[]>([]);

  const [piketStudents, setPiketStudents] = useState<string[]>([]);
  // Piket: dynamic rows (1 row = 1 siswa, bisa tambah)
  const [piketRows, setPiketRows] = useState<Array<{ id: string; nama: string; status: string }>>([
    { id: `row_${Date.now()}`, nama: '', status: 'A' }
  ]);
  const [piketDropdownOpenId, setPiketDropdownOpenId] = useState<string | null>(null);
  const [piketSearchSiswa, setPiketSearchSiswa] = useState('');

  useEffect(() => {
    if (!tanggal || !selectedKelas) {
      setPiketStudents([]);
      return;
    }
    fetch(`/api/presensi?tanggal=${tanggal}`).then(r => r.json()).then(res => {
      if (res.success) {
        const pikets = res.data.filter((r: any) => r.mapel === 'PIKET' && r.kelas === selectedKelas);
        setPiketStudents(pikets.map((r: any) => r.namaSiswa));
      }
    });
  }, [tanggal, selectedKelas, activeTab]);

  // Jurnal: guru yang mengajar
  const [guruList, setGuruList] = useState<string[]>([]);
  const [selectedGuru, setSelectedGuru] = useState('');

  // Jurnal Piket states
  const [jpPetugasPiket, setJpPetugasPiket] = useState<string[]>([]);
  const [jpGuruDispo, setJpGuruDispo] = useState<string[]>([]);
  const [jpEntries, setJpEntries] = useState([
    { guruIzin: '', alasanIzin: '', kelasDitinggalkan: '', materi: '', guruPengganti: '' }
  ]);

  // Rekap Jurnal
  const [rekapJurnalData, setRekapJurnalData] = useState<any[]>([]);
  const [editingJurnal, setEditingJurnal] = useState<any>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [rekapJurnalLoading, setRekapJurnalLoading] = useState(false);
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [filterGuruRekap, setFilterGuruRekap] = useState('');
  const [guruListRekap, setGuruListRekap] = useState<string[]>([]);
  const [filterKelasRekap, setFilterKelasRekap] = useState('');
  const [isGuruRekapDropdownOpen, setIsGuruRekapDropdownOpen] = useState(false);
  const [searchGuruRekap, setSearchGuruRekap] = useState('');
  const [kelasListRekap, setKelasListRekap] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUsername, setCurrentUsername] = useState('');
  const [fixUnknownLoading, setFixUnknownLoading] = useState(false);

  // Rekap Siswa
  const [rekapSiswaData, setRekapSiswaData] = useState<any[]>([]);
  const [rekapSiswaLoading, setRekapSiswaLoading] = useState(false);
  const [rsSubTab, setRsSubTab] = useState<'semua' | 'alpha'>('semua');
  const [rsFilterFrom, setRsFilterFrom] = useState('');
  const [rsFilterTo, setRsFilterTo] = useState('');
  const [rsFilterNama, setRsFilterNama] = useState('');
  const [rsFilterKelas, setRsFilterKelas] = useState('');
  const [rsFilterDomisili, setRsFilterDomisili] = useState('');
  const [editRsId, setEditRsId] = useState<string | null>(null);
  const [editRsStatus, setEditRsStatus] = useState<string>('');
  const [editRsJam, setEditRsJam] = useState<string>('');

  // Rekap Piket
  const [rekapPiketData, setRekapPiketData] = useState<any[]>([]);
  const [rekapPiketLoading, setRekapPiketLoading] = useState(false);
  const [rpFilterFrom, setRpFilterFrom] = useState('');
  const [rpFilterTo, setRpFilterTo] = useState('');

  // Load classes and mapel
  useEffect(() => {
    fetch('/api/kelas').then(res => res.json()).then(data => {
      if (data.success) {
        // Unique kelas list, filter out invalid names like '-' or '7'
        const uniqueKelas = Array.from(new Set(data.data.map((k: any) => k.rombel)))
          .filter((k: any) => k && k.length >= 2 && k !== '-') as string[];
        
        // Sort properly (7A, 7B, 8A, etc.)
        uniqueKelas.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
        setKelasList(uniqueKelas);
      }
    }).catch(err => console.error(err));

    fetch('/api/jadwal/mapel').then(res => res.json()).then(data => {
      if (data.success && data.data) {
        setMapelList(data.data.map((m: any) => m.namaMapel));
      }
    }).catch(err => console.error(err));

    // Load daftar guru aktif untuk pilihan guru di jurnal
    fetch('/api/guru').then(res => res.json()).then(data => {
      if (data.success && data.data) {
        const namaGuru = data.data
          .filter((g: any) => (g.status || '').toLowerCase().trim() === 'aktif')
          .map((g: any) => g.nama)
          .filter(Boolean);
        setGuruList(namaGuru);
      }
      // Pre-fill dengan nama user yang login
      const loginName = localStorage.getItem('username') || '';
      setSelectedGuru(loginName);
    }).catch(() => {
      setSelectedGuru(localStorage.getItem('username') || '');
    });

    // Load user role — gunakan NAMA LENGKAP (u.nama) untuk cocok dengan namaGuru di jurnal
    const storedUser = localStorage.getItem('keren_user_data');
    const usernameRaw = localStorage.getItem('username') || '';
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        const role = (u.role || u.role || '').toLowerCase();
        const namaLengkap = u.nama || usernameRaw; 
        setCurrentUsername(namaLengkap);
        setIsAdmin(role === 'admin');
        if (role !== 'admin') setFilterGuruRekap(namaLengkap);
      } catch {
        setCurrentUsername(usernameRaw);
        setFilterGuruRekap(usernameRaw);
      }
    } else {
      setCurrentUsername(usernameRaw);
      setFilterGuruRekap(usernameRaw);
    }
    // Load semua nama siswa aktif untuk datalist piket
    fetch('/api/siswa').then(res => res.json()).then(data => {
      if (data.success && data.data) {
        const names = data.data
          .filter((s: any) => s.isLatest && (s.status || '').toLowerCase().trim() === 'aktif')
          .map((s: any) => s.nama)
          .filter(Boolean)
          .sort();
        setAllSiswaNames(names);
      }
    }).catch(() => {});
  }, []);

  // Fetch jam config setiap kali tanggal berubah
  useEffect(() => {
    if (!tanggal) return;
    setJamConfigLoading(true);
    fetch(`/api/jam-config?tanggal=${tanggal}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setJamTersedia(data.jamTersedia);
          const isDefault = data.jamTersedia.length === 13 && [1,2,3,4,5,6,7,8,9,10,11,12,13].every((j: number) => data.jamTersedia.includes(j));
          setHasJamConfig(!isDefault);
          setKonfigJam(data.jamTersedia);
          setKonfigKeterangan(data.keterangan || '');
          setSelectedJam(prev => prev.filter(j => data.jamTersedia.includes(j)));
        }
      })
      .catch(() => {})
      .finally(() => setJamConfigLoading(false));
  }, [tanggal]);

  // Auto-load rekap jurnal ketika tab rekap_jurnal dibuka
  useEffect(() => {
    if (activeTab === 'rekap_jurnal' && rekapJurnalData.length === 0 && !rekapJurnalLoading) {
      fetchRekapJurnal();
    }
    if (activeTab === 'rekap_siswa' && rekapSiswaData.length === 0 && !rekapSiswaLoading) {
      fetchRekapSiswa();
    }
    if (activeTab === 'rekap_piket' && rekapPiketData.length === 0 && !rekapPiketLoading) {
      fetchRekapPiket();
    }
  }, [activeTab]);

  const fetchRekapPiket = async () => {
    setRekapPiketLoading(true);
    try {
      const res = await fetch('/api/jurnal-piket');
      const json = await res.json();
      if (json.success) {
        setRekapPiketData(json.data);
      }
    } catch (e) { console.error(e); }
    finally { setRekapPiketLoading(false); }
  };

  const fetchRekapSiswa = async () => {
    setRekapSiswaLoading(true);
    try {
      const res = await fetch('/api/presensi');
      const json = await res.json();
      if (json.success) {
        setRekapSiswaData(json.data);
      }
    } catch (e) { console.error(e); }
    finally { setRekapSiswaLoading(false); }
  };

  const handleSaveRsEdit = async (id: string) => {
    if (!editRsStatus) return;
    
    const isHadir = editRsStatus === 'H';
    const confirmMsg = isHadir 
      ? 'Jika diubah ke Hadir (H), catatan presensi (S/I/A) ini akan dihapus secara permanen. Lanjutkan?'
      : 'Yakin ingin menyimpan perubahan presensi ini?';

    const result = await Swal.fire({
      title: 'Konfirmasi Simpan',
      text: confirmMsg,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#16a34a',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Ya, Simpan',
      cancelButtonText: 'Batal'
    });

    if (!result.isConfirmed) return;
    
    setRekapSiswaLoading(true);
    try {
      const res = await fetch('/api/presensi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', id, status: editRsStatus, jamKe: editRsJam })
      });
      const data = await res.json();
      if (data.success) {
        Swal.fire('Berhasil', 'Presensi berhasil diperbarui', 'success');
        setEditRsId(null);
        setEditRsStatus('');
        setEditRsJam('');
        fetchRekapSiswa(); // Refresh data
      } else {
        Swal.fire('Gagal', data.error || 'Gagal memperbarui', 'error');
      }
    } catch (e) {
      Swal.fire('Error', 'Terjadi kesalahan jaringan', 'error');
    } finally {
      setRekapSiswaLoading(false);
    }
  };

  const handleDeleteRs = async (id: string) => {
    const result = await Swal.fire({
      title: 'Konfirmasi Hapus',
      text: 'Yakin ingin menghapus data presensi ini secara permanen?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    });

    if (!result.isConfirmed) return;
    
    setRekapSiswaLoading(true);
    try {
      const res = await fetch('/api/presensi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id })
      });
      const data = await res.json();
      if (data.success) {
        Swal.fire('Berhasil', 'Presensi berhasil dihapus', 'success');
        fetchRekapSiswa(); // Refresh data
      } else {
        Swal.fire('Gagal', data.error || 'Gagal menghapus', 'error');
      }
    } catch (e) {
      Swal.fire('Error', 'Terjadi kesalahan jaringan', 'error');
    } finally {
      setRekapSiswaLoading(false);
    }
  };

  // Hitung jumlah jam dari field JAM KE (comma-separated: "1,2" = 2 jam)
  const countJamSIA = (jamKe: string) => {
    if (!jamKe) return 1;
    return jamKe.split(',').map(s => s.trim()).filter(Boolean).length;
  };

  const exportSiswaExcel = (filtered: any[]) => {
    const rows = filtered.map((r, i) => ({
      'No': i + 1,
      'Tanggal': r.tanggal || '',
      'Nama Siswa': r.namaSiswa || '',
      'Kelas': r.kelas || '',
      'Domisili': r.domisili || '',
      'Mata Pelajaran': r.mapel || '',
      'Jam Ke': r.jamKe || '',
      'Keterangan': r.kehadiran || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 5 }, { wch: 12 }, { wch: 30 }, { wch: 10 }, { wch: 20 }, { wch: 20 }, { wch: 10 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Presensi Siswa');
    XLSX.writeFile(wb, `Rekap_Presensi_${new Date().toLocaleDateString('id-ID').replace(/\//g, '-')}.xlsx`);
  };

  const exportAlphaExcel = (alphaList: any[]) => {
    const rows = alphaList.map((s, i) => ({
      'No': i + 1,
      'Nama Siswa': s.nama,
      'Kelas': s.kelas,
      'Domisili': s.domisili,
      'Sakit / S (Hari)': Number((s.S / 10).toFixed(1)),
      'Izin / I (Hari)': Number((s.I / 10).toFixed(1)),
      'Alpha / A (Hari)': Number((s.A / 10).toFixed(1)),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 5 }, { wch: 32 }, { wch: 10 }, { wch: 20 }, { wch: 16 }, { wch: 16 }, { wch: 16 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rekap S-I-A');
    XLSX.writeFile(wb, `Rekap_SIA_${new Date().toLocaleDateString('id-ID').replace(/\//g, '-')}.xlsx`);
  };

  const exportPiketExcel = (filtered: any[]) => {
    const rows = filtered.map((r, i) => ({
      'No': i + 1,
      'Tanggal': r.tanggal || '',
      'Petugas Piket': r.petugasPiket || '',
      'Guru Izin': r.guruIzin || '',
      'Alasan Izin': r.alasanIzin || '',
      'Kelas Ditinggalkan': r.kelasDitinggalkan || '',
      'Materi / Tugas': r.materi || '',
      'Guru Pengganti': r.guruPengganti || '',
      'Guru Dispo': r.guruDispo || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 5 }, { wch: 12 }, { wch: 25 }, { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 30 }, { wch: 25 }, { wch: 25 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rekap Piket');
    XLSX.writeFile(wb, `Rekap_Piket_${new Date().toLocaleDateString('id-ID').replace(/\//g, '-')}.xlsx`);
  };

  // ── Rekap Jurnal Helper ──────────────────────────────────────────────────

  const handleSaveEditJurnal = async () => {
    if (!editingJurnal) return;
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
        fetchRekapJurnal();
      } else {
        Swal.fire('Gagal', data.error, 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Gagal memperbarui jurnal.', 'error');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const fetchRekapJurnal = async () => {
    setRekapJurnalLoading(true);
    try {
      const res = await fetch('/api/jurnal');
      const json = await res.json();
      if (json.success) {
        setRekapJurnalData(json.data);
        // Normalize: trim + collapse multiple spaces, lalu deduplikasi
        const gurus = Array.from(new Set(
          json.data
            .map((r: any) => (r.namaGuru || '').trim().replace(/\s+/g, ' '))
            .filter(Boolean)
        )) as string[];
        gurus.sort();
        setGuruListRekap(gurus);

        const kelasList = Array.from(new Set(
          json.data.map((r: any) => (r.kelas || '').trim()).filter(Boolean)
        )) as string[];
        kelasList.sort();
        setKelasListRekap(kelasList);
      }
    } catch (e) { console.error(e); }
    finally { setRekapJurnalLoading(false); }
  };

  const handleExportExcel = (filtered: any[]) => {
    // Hitung jam per entri: "9,10" = 2 jam, "1,2,3" = 3 jam
    const countJam = (jamKe: string) => {
      if (!jamKe) return 1;
      return jamKe.split(',').map(s => s.trim()).filter(Boolean).length;
    };

    // Group by namaGuru (normalized), akumulasi total jam
    const grouped: Record<string, number> = {};
    for (const r of filtered) {
      const mapelStr = (r.mapel || '').toLowerCase();
      if (mapelStr.includes('program khusus') || mapelStr.includes('proksus')) continue;

      const nama = (r.namaGuru || '').trim().replace(/\s+/g, ' ');
      if (!nama) continue;
      grouped[nama] = (grouped[nama] || 0) + countJam(r.jamKe || '');
    }

    const rows = Object.entries(grouped)
      .sort(([a], [b]) => {
        const idxA = guruList.indexOf(a);
        const idxB = guruList.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.localeCompare(b, 'id');
      })
      .map(([nama, jumlah], i) => ([
        i + 1,
        nama,
        jumlah
      ]));

    const filterText = (filterFrom || filterTo) ? `${filterFrom ? filterFrom : 'Awal'} s.d. ${filterTo ? filterTo : 'Akhir'}` : 'Semua Tanggal';
    const cetakText = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });

    const aoa = [
      ['REKAP JAM MENGAJAR GURU'],
      [`Periode: ${filterText}`],
      [`Dicetak: ${cetakText}`],
      [],
      ['No', 'Nama Guru', 'Jumlah Jam Mengajar'],
      ...rows
    ];

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    // Set column widths
    ws['!cols'] = [{ wch: 5 }, { wch: 40 }, { wch: 22 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rekap Jam Mengajar');
    const now = new Date().toLocaleDateString('id-ID').replace(/\//g, '-');
    XLSX.writeFile(wb, `Rekap_Jam_Mengajar_${now}.xlsx`);
  };

  const handleExportProksus = (filtered: any[]) => {
    const dataProksus = filtered.filter(r => (r.mapel || '').toLowerCase().includes('program khusus') || (r.mapel || '').toLowerCase().includes('proksus'));
    if (dataProksus.length === 0) {
      Swal.fire('Info', 'Tidak ada data jurnal Program Khusus pada filter saat ini', 'info');
      return;
    }
    
    // Grouping per guru
    const countJam = (jamKe: string) => {
      if (!jamKe) return 1;
      return jamKe.split(',').map(s => s.trim()).filter(Boolean).length;
    };

    const grouped: Record<string, number> = {};
    for (const r of dataProksus) {
      const nama = (r.namaGuru || '').trim().replace(/\s+/g, ' ');
      if (!nama) continue;
      grouped[nama] = (grouped[nama] || 0) + countJam(r.jamKe || '');
    }

    const rows = Object.entries(grouped)
      .sort(([a], [b]) => {
        const idxA = guruList.indexOf(a);
        const idxB = guruList.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.localeCompare(b, 'id');
      })
      .map(([nama, jam], i) => ([
        i + 1,
        nama,
        jam
      ]));

    const filterText = (filterFrom || filterTo) ? `${filterFrom ? filterFrom : 'Awal'} s.d. ${filterTo ? filterTo : 'Akhir'}` : 'Semua Tanggal';
    const cetakText = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });

    const aoa = [
      ['REKAP JURNAL PROGRAM KHUSUS'],
      [`Periode: ${filterText}`],
      [`Dicetak: ${cetakText}`],
      [],
      ['No', 'Nama Guru', 'Total Jam / Pertemuan'],
      ...rows
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(aoa);
    worksheet['!cols'] = [
      { wch: 5 }, { wch: 40 }, { wch: 25 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Proksus');
    XLSX.writeFile(workbook, `Rekap_Jurnal_Program_Khusus.xlsx`);
  };

  const handleFixUnknown = async () => {
    const confirmResult = await Swal.fire({
      title: 'Fix Nama Guru Unknown?',
      html: 'Sistem akan mencoba mencocokkan data jurnal yang <b>Unknown</b> dengan jadwal mengajar.<br><br>Data di spreadsheet akan diperbarui otomatis jika ditemukan.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#7c3aed',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, Proses!',
      cancelButtonText: 'Batal'
    });
    if (!confirmResult.isConfirmed) return;

    setFixUnknownLoading(true);
    try {
      // Ambil data jadwal dulu dari client (hemat quota — tidak perlu buka 2 spreadsheet di server)
      const jadwalRes = await fetch('/api/jadwal');
      const jadwalJson = await jadwalRes.json();
      const jadwalData = jadwalJson.success ? jadwalJson.data : [];

      const res = await fetch('/api/jurnal', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jadwalData })
      });
      const json = await res.json();
      if (json.success) {
        let html = `<div style="text-align:left">`;
        html += `<p>📊 Total Unknown: <b>${json.totalUnknown}</b></p>`;
        html += `<p>✅ Berhasil difix: <b>${json.fixed}</b></p>`;
        if (json.ambiguous?.length > 0) {
          html += `<p>⚠️ Ambigu (lebih dari 1 kandidat):</p><ul style="margin:4px 0 8px 16px;font-size:0.85rem">`;
          json.ambiguous.forEach((a: any) => {
            html += `<li>${a.tanggal} — ${a.kelas} ${a.mapel}: <em>${a.candidates.join(', ')}</em></li>`;
          });
          html += `</ul>`;
        }
        if (json.notFound?.length > 0) {
          html += `<p>❌ Tidak ditemukan di jadwal (${json.notFound.length} baris) — perlu update manual</p>`;
        }
        html += `</div>`;
        await Swal.fire({
          title: json.fixed > 0 ? 'Selesai!' : 'Hasil Proses',
          html,
          icon: json.fixed > 0 ? 'success' : 'info',
          width: 520
        });
        if (json.fixed > 0) fetchRekapJurnal(); // Refresh data
      } else {
        Swal.fire({ icon: 'error', title: 'Gagal', text: json.error || 'Terjadi kesalahan' });
      }
    } catch (e: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: e.message });
    } finally {
      setFixUnknownLoading(false);
    }
  };

  // Effect when class changes (Mock loading students)
  useEffect(() => {
    if (selectedKelas) {
      // Pakai cache kalau data kelas ini sudah pernah diambil
      if (siswaCache.current[selectedKelas]) {
        const cached = siswaCache.current[selectedKelas];
        setSiswaList(cached);
        const defaultPresensi: Record<string, string> = {};
        cached.forEach((s: any) => { defaultPresensi[s.id] = 'H'; });
        setPresensi(defaultPresensi);
        return;
      }
      setLoadingSiswa(true);
      setSiswaList([]);
      setPresensi({});
      fetch('/api/siswa').then(res => res.json()).then(data => {
        if (data.success) {
          const filtered = data.data.filter((s: any) =>
            s.rombel === selectedKelas &&
            s.isLatest &&
            (s.status || '').toLowerCase().trim() === 'aktif'
          );
          // Simpan ke cache
          siswaCache.current[selectedKelas] = filtered;
          if (filtered.length > 0) {
            setSiswaList(filtered);
            const defaultPresensi: Record<string, string> = {};
            filtered.forEach((s: any) => { defaultPresensi[s.id] = 'H'; });
            setPresensi(defaultPresensi);
          } else {
            setSiswaList([]);
            setPresensi({});
          }
        }
      }).finally(() => setLoadingSiswa(false));
    } else {
      setSiswaList([]);
      setPresensi({});
    }
  }, [selectedKelas]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [materi, setMateri] = useState('');

  const displaySiswa = activeTab === 'absen' ? siswaList.filter(s => !piketStudents.includes(s.nama)) : siswaList;

  const handlePresensiChange = (id: string, status: string) => {
    setPresensi(prev => ({
      ...prev,
      [id]: status
    }));
  };

  const toggleJam = (jam: number) => {
    setSelectedJam(prev => 
      prev.includes(jam) ? prev.filter(j => j !== jam) : [...prev, jam].sort((a,b) => a-b)
    );
  };

  const handleSubmit = async () => {
    const finalMapel = activeTab === 'piket' ? 'PIKET' : selectedMapel;
    if (!selectedKelas || !finalMapel) {
      Swal.fire({ icon: 'warning', title: 'Oops...', text: 'Mohon pilih Kelas dan Mata Pelajaran terlebih dahulu!' });
      return;
    }
    if (selectedJam.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Oops...', text: 'Mohon pilih Jam Ke!' });
      return;
    }

    // Piket: validasi minimal 1 baris ada nama siswa
    if (activeTab === 'piket') {
      const validRows = piketRows.filter(r => r.nama.trim() !== '');
      if (validRows.length === 0) {
        Swal.fire({ icon: 'warning', title: 'Oops...', text: 'Mohon pilih minimal satu siswa!' });
        return;
      }
    }

    const result = await Swal.fire({
      title: 'Konfirmasi',
      text: `Simpan presensi untuk kelas ${selectedKelas}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Ya, Simpan!',
      cancelButtonText: 'Batal'
    });

    if (!result.isConfirmed) return;

    setIsSubmitting(true);
    const guru = currentUsername || 'Unknown';
    try {
      let siswaPayload: any[];
      let presensiPayload: Record<string, string>;

      if (activeTab === 'piket') {
        // Build from piketRows: only rows with a name
        const validRows = piketRows.filter(r => r.nama.trim() !== '');
        siswaPayload = validRows.map(r => ({ id: r.id, nama: r.nama, nisn: '' }));
        presensiPayload = Object.fromEntries(validRows.map(r => [r.id, r.status]));
      } else {
        siswaPayload = displaySiswa;
        presensiPayload = presensi;
      }

      const res = await fetch('/api/presensi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tanggal,
          jamKe: selectedJam.join(','),
          kelas: selectedKelas,
          mapel: finalMapel,
          guru,
          tahunAjaran: '2024/2025',
          presensi: presensiPayload,
          siswaList: siswaPayload
        })
      });
      const data = await res.json();
      
      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Berhasil!',
          text: `Berhasil menyimpan presensi! ${data.totalSaved > 0 ? (data.totalSaved + ' data S/I/A tercatat.') : 'Semua siswa Hadir (tidak ada data absen ke sheet).'}`
        });
        if (activeTab === 'piket') {
          // reset piket rows after save
          setPiketRows([{ id: `row_${Date.now()}`, nama: '', status: 'A' }]);
        }
      } else {
        Swal.fire({ icon: 'error', title: 'Gagal', text: 'Gagal menyimpan: ' + (data.error || 'Terjadi kesalahan') });
      }
    } catch (error: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Terjadi kesalahan sistem: ' + error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJurnalSubmit = async () => {
    if (!selectedKelas || !selectedMapel) {
      Swal.fire({ icon: 'warning', title: 'Oops...', text: 'Mohon pilih Kelas dan Mata Pelajaran terlebih dahulu!' });
      return;
    }
    if (selectedJam.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Oops...', text: 'Mohon pilih Jam Ke!' });
      return;
    }
    if (!materi.trim()) {
      Swal.fire({ icon: 'warning', title: 'Oops...', text: 'Mohon isi Materi yang diajarkan!' });
      return;
    }

    const guru = selectedGuru || currentUsername || 'Unknown';
    // Format tanggal ke format Indonesia yang mudah dibaca, misal: 25 Juli 2026
    const formattedTanggal = tanggal ? new Date(tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-';
    
    const detailHtml = `
      <div style="text-align: left; font-size: 0.9rem; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; margin-top: 10px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 4px 0; width: 110px; color: #64748b; font-weight: 600;">Tanggal</td><td>: <strong>${formattedTanggal}</strong></td></tr>
          <tr><td style="padding: 4px 0; color: #64748b; font-weight: 600;">Guru</td><td>: <strong>${guru}</strong></td></tr>
          <tr><td style="padding: 4px 0; color: #64748b; font-weight: 600;">Kelas</td><td>: <strong>${selectedKelas}</strong></td></tr>
          <tr><td style="padding: 4px 0; color: #64748b; font-weight: 600;">Mapel</td><td>: <strong>${selectedMapel}</strong></td></tr>
          <tr><td style="padding: 4px 0; color: #64748b; font-weight: 600;">Jam Ke</td><td>: <strong>${selectedJam.join(', ')}</strong></td></tr>
          <tr><td style="padding: 4px 0; color: #64748b; font-weight: 600; vertical-align: top;">Materi</td><td style="padding-top: 4px; line-height: 1.4;">: <em>${materi.replace(/\n/g, '<br>')}</em></td></tr>
        </table>
      </div>
    `;

    const result = await Swal.fire({
      title: 'Konfirmasi Simpan',
      html: `Apakah Anda yakin ingin menyimpan jurnal mengajar ini? ${detailHtml}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#16a34a',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Simpan!',
      cancelButtonText: 'Batal'
    });

    if (!result.isConfirmed) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/jurnal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tanggal,
          jamKe: selectedJam.join(', '),
          kelas: selectedKelas,
          mapel: selectedMapel,
          guru,
          materi,
          tahunAjaran: new Date().getFullYear().toString() + '/' + (new Date().getFullYear() + 1).toString()
        })
      });
      const data = await res.json();
      
      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Berhasil!',
          text: 'Jurnal mengajar berhasil disimpan.'
        });
        setMateri('');
        setSelectedJam([]);
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Gagal',
          text: 'Gagal menyimpan: ' + (data.error || 'Terjadi kesalahan')
        });
      }
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Terjadi kesalahan sistem: ' + error.message
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJurnalPiketSubmit = async () => {
    if (jpPetugasPiket.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Oops...', text: 'Mohon isi Nama Petugas Piket!' });
      return;
    }

    if (jpGuruDispo.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Oops...', text: 'Mohon isi Guru Dispo!' });
      return;
    }

    if (jpEntries.some(e => !e.guruIzin.trim() && (e.alasanIzin || e.kelasDitinggalkan || e.materi || e.guruPengganti))) {
      Swal.fire({ icon: 'warning', title: 'Oops...', text: 'Nama Guru Izin harus diisi jika ada isian lain di baris tersebut!' });
      return;
    }

    const result = await Swal.fire({
      title: 'Konfirmasi',
      text: `Simpan Jurnal Piket untuk tanggal ${tanggal}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Ya, Simpan!',
      cancelButtonText: 'Batal'
    });

    if (!result.isConfirmed) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/jurnal-piket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tanggal,
          petugasPiket: jpPetugasPiket.join(', '),
          guruDispo: jpGuruDispo.join(', '),
          entries: jpEntries.filter(e => e.guruIzin.trim() !== '') // hanya kirim baris yang ada isinya
        })
      });
      const data = await res.json();
      
      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Berhasil!',
          text: 'Jurnal Piket berhasil disimpan.'
        });
        setJpEntries([{ guruIzin: '', alasanIzin: '', kelasDitinggalkan: '', materi: '', guruPengganti: '' }]);
        setJpPetugasPiket([]);
        setJpGuruDispo([]);
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Gagal',
          text: 'Gagal menyimpan: ' + (data.error || 'Terjadi kesalahan')
        });
      }
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Terjadi kesalahan sistem: ' + error.message
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Rekap Piket Filtering ──
  const rpFiltered = rekapPiketData.filter(r => {
    if (rpFilterFrom && r.tanggal < rpFilterFrom) return false;
    if (rpFilterTo && r.tanggal > rpFilterTo) return false;
    return true;
  });

  // ── Rekap Siswa: semua komputasi di LUAR JSX ─────────────────────────────
  const rsFiltered = rekapSiswaData.filter(r => {
    if (rsFilterFrom && r.tanggal < rsFilterFrom) return false;
    if (rsFilterTo && r.tanggal > rsFilterTo) return false;
    if (rsFilterNama && !r.namaSiswa.toLowerCase().includes(rsFilterNama.toLowerCase())) return false;
    if (rsFilterKelas && r.kelas.trim() !== rsFilterKelas.trim()) return false;
    if (rsFilterDomisili && (r.domisili || '').trim() !== rsFilterDomisili.trim()) return false;
    return true;
  }).sort((a, b) => {
    const dc = (a.tanggal || '').localeCompare(b.tanggal || '');
    return dc !== 0 ? dc : (a.namaSiswa || '').localeCompare(b.namaSiswa || '', 'id');
  });
  const rsKelasList = Array.from(new Set(rekapSiswaData.map(r => (r.kelas || '').trim()).filter(Boolean))).sort() as string[];
  const rsDomisiliList = Array.from(new Set(rekapSiswaData.map(r => (r.domisili || '').trim()).filter(Boolean))).sort() as string[];
  const rsAlphaMap: Record<string, { nama: string; kelas: string; domisili: string; S: number; I: number; A: number }> = {};
  for (const r of rsFiltered) {
    const nm = r.namaSiswa; const jm = countJamSIA(r.jamKe);
    if (!rsAlphaMap[nm]) rsAlphaMap[nm] = { nama: nm, kelas: r.kelas, domisili: r.domisili || '', S: 0, I: 0, A: 0 };
    if (r.kehadiran === 'S') rsAlphaMap[nm].S += jm;
    else if (r.kehadiran === 'I') rsAlphaMap[nm].I += jm;
    else if (r.kehadiran === 'A') rsAlphaMap[nm].A += jm;
  }
  // Tampilkan jika total jam (S+I+A) > 0 (memiliki minimal 1 jam S/I/A)
  const rsSiaList = Object.values(rsAlphaMap).filter(s => (s.S + s.I + s.A) > 0).sort((a, b) => (b.S + b.I + b.A) - (a.S + a.I + a.A));
  // ──────────────────────────────────────────────────────────────────────────

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Presensi Kelas & Jurnal Mengajar</h1>
        <p className={styles.subtitle}>Kelola kehadiran siswa dan aktivitas jurnal harian</p>
      </header>

      <div className={styles.tabsContainer}>
        <div className={styles.tabsWrapper}>
          <div className={styles.tabs}>
            <button 
              className={`${styles.tab} ${activeTab === 'absen' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('absen')}
            >
              <i className="fas fa-user-check"></i>
              Absen Siswa
            </button>
            <button 
              className={`${styles.tab} ${activeTab === 'piket' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('piket')}
            >
              <i className="fas fa-clipboard-check"></i>
              Presensi Piket
            </button>
            <button 
              className={`${styles.tab} ${activeTab === 'jurnal' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('jurnal')}
            >
              <i className="fas fa-book-open"></i>
              Jurnal Mengajar
            </button>
            <button 
              className={`${styles.tab} ${activeTab === 'jurnal_piket' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('jurnal_piket')}
            >
              <i className="fas fa-clipboard"></i>
              Jurnal Piket
            </button>
            <button 
              className={`${styles.tab} ${activeTab === 'rekap_piket' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('rekap_piket')}
            >
              <i className="fas fa-clipboard-list"></i>
              Rekap Piket
            </button>
            <button 
              className={`${styles.tab} ${activeTab === 'rekap_siswa' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('rekap_siswa')}
            >
              <i className="fas fa-users"></i>
              Rekap Siswa
            </button>
            <button 
              className={`${styles.tab} ${activeTab === 'rekap_jurnal' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('rekap_jurnal')}
            >
              <i className="fas fa-clipboard-list"></i>
              Rekap Jurnal
            </button>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        {(activeTab === 'absen' || activeTab === 'piket') && (
          <div className={styles.card}>
            <h2>{activeTab === 'piket' ? 'Presensi Piket' : 'Absen Siswa'}</h2>
            
            {activeTab === 'piket' && (
              <div className={styles.alertMessage} style={{ background: '#fffbeb', color: '#b45309', border: '1px solid #fef3c7', marginBottom: 20 }}>
                <i className="fas fa-exclamation-triangle mr-2"></i> <strong>Penting:</strong> Menu ini khusus digunakan untuk Guru Piket. Siswa yang diabsen S/I/A di menu ini namanya tidak akan muncul lagi di menu Absen Siswa Guru mata pelajaran.
              </div>
            )}

            {activeTab === 'absen' && (
              <div className={styles.alertMessage} style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #d1fae5', marginBottom: 20 }}>
                <div style={{ marginBottom: '4px' }}>
                  <i className="fas fa-info-circle mr-2" style={{ marginRight: '6px' }}></i> Jika siswa <strong>masuk semua</strong>, abaikan menu ini dan langsung isi <strong>Jurnal Mengajar</strong>.
                </div>
                <div>
                  <i className="fas fa-info-circle mr-2" style={{ marginRight: '6px', opacity: 0 }}></i> Siswa yang mengikuti kegiatan madrasah maka dianggap <strong>Hadir</strong>.
                </div>
              </div>
            )}

            <div className={styles.filterSection}>
              <div className={styles.filterGroup}>
                <label>Tanggal</label>
                <input 
                  type="date" 
                  value={tanggal} 
                  onChange={(e) => setTanggal(e.target.value)}
                  className={styles.inputField}
                />
              </div>
              
              <div className={styles.filterGroup}>
                <label>Kelas</label>
                <select 
                  value={selectedKelas} 
                  onChange={(e) => setSelectedKelas(e.target.value)}
                  className={styles.inputField}
                >
                  <option value="">-- Pilih Kelas --</option>
                  {kelasList.map(kelas => (
                    <option key={kelas} value={kelas}>{kelas}</option>
                  ))}
                </select>
              </div>

              <div className={styles.filterGroup}>
                <label>Jam Ke</label>
                <div className={styles.jamPills}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(jam => (
                    <button
                      key={jam}
                      className={`${styles.jamPill} ${selectedJam.includes(jam) ? styles.jamPillActive : ''}`}
                      onClick={() => toggleJam(jam)}
                    >
                      {jam}
                    </button>
                  ))}
                </div>
              </div>

              {activeTab === 'piket' ? (
                <div className={styles.filterGroup}>
                  <label>Mata Pelajaran</label>
                  <input type="text" value="PIKET" disabled className={styles.inputField} style={{ background: '#f1f5f9', cursor: 'not-allowed', fontWeight: 600, color: '#475569' }} />
                </div>
              ) : activeTab === 'absen' ? (
                <div className={styles.filterGroup}>
                  <label>Mata Pelajaran</label>
                  <div className={styles.dropdownContainer}>
                    <div 
                      className={styles.dropdownButton} 
                      onClick={() => {
                        setIsMapelDropdownOpen(!isMapelDropdownOpen);
                        if (!isMapelDropdownOpen) setSearchMapel('');
                      }}
                    >
                      <span style={{ color: selectedMapel ? '#1e293b' : '#94a3b8' }}>
                        {selectedMapel || '-- Pilih Mata Pelajaran --'}
                      </span>
                      <i className="fas fa-chevron-down" style={{ color: '#94a3b8' }}></i>
                    </div>

                    {isMapelDropdownOpen && (
                      <div className={styles.dropdownMenu}>
                        <div className={styles.dropdownSearch}>
                          <input 
                            type="text" 
                            placeholder="Cari mapel..." 
                            value={searchMapel}
                            onChange={(e) => setSearchMapel(e.target.value)}
                            autoFocus
                          />
                        </div>
                        <div className={styles.dropdownList}>
                          {mapelList
                            .filter(m => m.toLowerCase().includes(searchMapel.toLowerCase()))
                            .map((m, i) => (
                              <div 
                                key={i} 
                                className={styles.dropdownItem}
                                onClick={() => {
                                  setSelectedMapel(m);
                                  setIsMapelDropdownOpen(false);
                                }}
                              >
                                {m}
                              </div>
                            ))}
                          {mapelList.filter(m => m.toLowerCase().includes(searchMapel.toLowerCase())).length === 0 && (
                            <div style={{ padding: '10px', textAlign: 'center', color: '#94a3b8' }}>Mapel tidak ditemukan</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            {/* PIKET: Dynamic row input */}
            {activeTab === 'piket' && selectedKelas && (
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ width: '50px', textAlign: 'center' }}>No</th>
                      <th>Nama Siswa</th>
                      <th style={{ textAlign: 'center', width: '220px' }}>Keterangan</th>
                      <th style={{ width: '50px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {piketRows.map((row, i) => (
                      <tr key={row.id}>
                        <td style={{ textAlign: 'center', color: '#94a3b8' }}>{i + 1}</td>
                        <td>
                          <div className={styles.dropdownContainer}>
                            <div 
                              className={styles.dropdownButton} 
                              onClick={() => {
                                setPiketDropdownOpenId(piketDropdownOpenId === row.id ? null : row.id);
                                setPiketSearchSiswa('');
                              }}
                              style={{ padding: '8px 10px', fontSize: '14px', borderRadius: '6px' }}
                            >
                              <span style={{ color: row.nama ? '#1e293b' : '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {row.nama || 'Cari nama siswa...'}
                              </span>
                              <i className="fas fa-chevron-down" style={{ color: '#94a3b8' }}></i>
                            </div>

                            {piketDropdownOpenId === row.id && (
                              <div className={styles.dropdownMenu} style={{ minWidth: '300px' }}>
                                <div className={styles.dropdownSearch}>
                                  <input 
                                    type="text" 
                                    placeholder="Cari siswa..." 
                                    value={piketSearchSiswa}
                                    onChange={(e) => setPiketSearchSiswa(e.target.value)}
                                    autoFocus
                                  />
                                </div>
                                <div className={styles.dropdownList} style={{ maxHeight: '200px' }}>
                                  {siswaList
                                    .filter((s: any) => s.nama.toLowerCase().includes(piketSearchSiswa.toLowerCase()))
                                    .map((s: any, idx: number) => (
                                      <div 
                                        key={idx} 
                                        className={styles.dropdownItem}
                                        onClick={() => {
                                          setPiketRows(prev => prev.map(r => r.id === row.id ? { ...r, nama: s.nama } : r));
                                          setPiketDropdownOpenId(null);
                                        }}
                                      >
                                        {s.nama}
                                      </div>
                                    ))}
                                  {siswaList.filter((s: any) => s.nama.toLowerCase().includes(piketSearchSiswa.toLowerCase())).length === 0 && (
                                    <div style={{ padding: '10px', textAlign: 'center', color: '#94a3b8' }}>Nama tidak ditemukan</div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className={styles.radioGroup}>
                            {['S', 'I', 'A'].map(status => (
                              <label
                                key={status}
                                className={`${styles.radioLabel} ${row.status === status ? (status === 'S' ? styles.radioCheckedS : status === 'I' ? styles.radioCheckedI : styles.radioCheckedA) : ''}`}
                              >
                                <input
                                  type="radio"
                                  name={`piket_${row.id}`}
                                  value={status}
                                  checked={row.status === status}
                                  onChange={() => setPiketRows(prev => prev.map(r => r.id === row.id ? { ...r, status } : r))}
                                />
                                {status}
                              </label>
                            ))}
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {piketRows.length > 1 && (
                            <button
                              onClick={() => setPiketRows(prev => prev.filter(r => r.id !== row.id))}
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '16px', padding: '4px' }}
                              title="Hapus baris"
                            >
                              <i className="fas fa-times-circle"></i>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                  <button
                    onClick={() => setPiketRows(prev => [...prev, { id: `row_${Date.now()}`, nama: '', status: 'A' }])}
                    style={{ padding: '8px 16px', background: '#f0f9ff', border: '1px solid #7dd3fc', borderRadius: '8px', cursor: 'pointer', color: '#0369a1', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <i className="fas fa-plus"></i> Tambah Siswa
                  </button>
                  <button
                    className={styles.submitBtn}
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    style={{ opacity: isSubmitting ? 0.7 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
                  >
                    <i className={isSubmitting ? 'fas fa-spinner fa-spin' : 'fas fa-save'} style={{ marginRight: '8px' }}></i>
                    {isSubmitting ? 'Menyimpan...' : 'Simpan Presensi'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'piket' && !selectedKelas && (
              <div className={styles.emptyState}>
                <i className="fas fa-chalkboard-user"></i>
                <p>Silakan pilih kelas terlebih dahulu.</p>
              </div>
            )}

            {/* ABSEN: full student list */}
            {activeTab === 'absen' && (
              loadingSiswa ? (
                <div className={styles.loading}>Memuat data siswa...</div>
              ) : displaySiswa.length > 0 ? (
                <div className={styles.tableContainer}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th style={{ width: '50px', textAlign: 'center' }}>No</th>
                        <th>NISN</th>
                        <th>Nama Siswa</th>
                        <th style={{ textAlign: 'center', width: '200px' }}>Kehadiran</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displaySiswa.map((siswa: any, i: number) => (
                        <tr key={siswa.id}>
                          <td style={{ textAlign: 'center' }}>{i + 1}</td>
                          <td className={styles.nisn}>{siswa.nisn}</td>
                          <td className={styles.nama}>{siswa.nama}</td>
                          <td>
                            <div className={styles.radioGroup}>
                              {['H', 'S', 'I', 'A'].map(status => (
                                <label key={status} className={`${styles.radioLabel} ${presensi[siswa.id] === status ? (status === 'H' ? styles.radioCheckedH : status === 'S' ? styles.radioCheckedS : status === 'I' ? styles.radioCheckedI : styles.radioCheckedA) : ''}`}>
                                  <input
                                    type="radio"
                                    name={`presensi_${siswa.id}`}
                                    value={status}
                                    checked={presensi[siswa.id] === status}
                                    onChange={() => handlePresensiChange(siswa.id, status)}
                                  />
                                  {status}
                                </label>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                    <button
                      className={styles.submitBtn}
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      style={{ opacity: isSubmitting ? 0.7 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
                    >
                      <i className={isSubmitting ? 'fas fa-spinner fa-spin' : 'fas fa-save'} style={{ marginRight: '8px' }}></i>
                      {isSubmitting ? 'Menyimpan...' : 'Simpan Presensi'}
                    </button>
                  </div>
                </div>
              ) : selectedKelas ? (
                <div className={styles.emptyState}>
                  <i className="fas fa-users-slash"></i>
                  <p>{piketStudents.length > 0 ? `Semua siswa di kelas ${selectedKelas} telah diabsen S/I/A oleh Guru Piket hari ini.` : `Data siswa kelas ${selectedKelas} tidak ditemukan.`}</p>
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <i className="fas fa-chalkboard-user"></i>
                  <p>Silakan pilih kelas terlebih dahulu untuk melihat daftar siswa.</p>
                </div>
              )
            )}
          </div>
        )}
        
        {activeTab === 'jurnal' && (
          <div className={styles.card}>
            <h2>Jurnal Mengajar</h2>
            
            <div className={styles.filterSection}>
              <div className={styles.filterGroup}>
                <label>Tanggal</label>
                <input 
                  type="date" 
                  value={tanggal} 
                  onChange={(e) => setTanggal(e.target.value)}
                  className={styles.inputField}
                />
              </div>
              
              <div className={styles.filterGroup}>
                <label>Mata Pelajaran</label>
                <div className={styles.dropdownContainer}>
                  <div 
                    className={styles.dropdownButton} 
                    onClick={() => {
                      setIsMapelDropdownOpen(!isMapelDropdownOpen);
                      if (!isMapelDropdownOpen) setSearchMapel('');
                    }}
                  >
                    <span style={{ color: selectedMapel ? '#1e293b' : '#94a3b8' }}>
                      {selectedMapel || '-- Pilih Mata Pelajaran --'}
                    </span>
                    <i className="fas fa-chevron-down" style={{ color: '#94a3b8' }}></i>
                  </div>

                  {isMapelDropdownOpen && (
                    <div className={styles.dropdownMenu}>
                      <div className={styles.dropdownSearch}>
                        <input 
                          type="text" 
                          placeholder="Cari mapel..." 
                          value={searchMapel}
                          onChange={(e) => setSearchMapel(e.target.value)}
                          autoFocus
                        />
                      </div>
                      <div className={styles.dropdownList}>
                        {mapelList
                          .filter(m => m.toLowerCase().includes(searchMapel.toLowerCase()))
                          .map((m, i) => (
                            <div 
                              key={i} 
                              className={styles.dropdownItem}
                              onClick={() => {
                                setSelectedMapel(m);
                                setIsMapelDropdownOpen(false);
                              }}
                            >
                              {m}
                            </div>
                          ))}
                        {mapelList.filter(m => m.toLowerCase().includes(searchMapel.toLowerCase())).length === 0 && (
                          <div style={{ padding: '10px', textAlign: 'center', color: '#94a3b8' }}>Mapel tidak ditemukan</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.filterGroup}>
                <label>Kelas</label>
                <select 
                  value={selectedKelas} 
                  onChange={(e) => setSelectedKelas(e.target.value)}
                  className={styles.inputField}
                >
                  <option value="">-- Pilih Kelas --</option>
                  {kelasList.map(k => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>

              <div className={styles.filterGroup}>
                <label>Guru yang Mengajar</label>
                <div className={styles.dropdownContainer}>
                  <div 
                    className={styles.dropdownButton} 
                    onClick={() => {
                      setIsGuruDropdownOpen(!isGuruDropdownOpen);
                      if (!isGuruDropdownOpen) setSearchGuru('');
                    }}
                  >
                    <span style={{ color: selectedGuru ? '#1e293b' : '#94a3b8' }}>
                      {selectedGuru || '-- Pilih Nama Guru --'}
                    </span>
                    <i className="fas fa-chevron-down" style={{ color: '#94a3b8' }}></i>
                  </div>

                  {isGuruDropdownOpen && (
                    <div className={styles.dropdownMenu}>
                      <div className={styles.dropdownSearch}>
                        <input 
                          type="text" 
                          placeholder="Cari guru..." 
                          value={searchGuru}
                          onChange={(e) => setSearchGuru(e.target.value)}
                          autoFocus
                        />
                      </div>
                      <div className={styles.dropdownList}>
                        {guruList
                          .filter(g => g.toLowerCase().includes(searchGuru.toLowerCase()))
                          .map((g, i) => (
                            <div 
                              key={i} 
                              className={styles.dropdownItem}
                              onClick={() => {
                                setSelectedGuru(g);
                                setIsGuruDropdownOpen(false);
                              }}
                            >
                              {g}
                            </div>
                          ))}
                        {guruList.filter(g => g.toLowerCase().includes(searchGuru.toLowerCase())).length === 0 && (
                          <div style={{ padding: '10px', textAlign: 'center', color: '#94a3b8' }}>Guru tidak ditemukan</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className={styles.filterGroup} style={{ flex: '1 1 100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <label style={{ margin: 0 }}>Jam Ke (Bisa pilih lebih dari satu)</label>
                  {hasJamConfig && (
                    <span style={{ fontSize: '0.72rem', background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', borderRadius: 6, padding: '1px 8px', fontWeight: 600 }}>
                      <i className="fas fa-cog" style={{ marginRight: 4 }}></i>Jam dikonfigurasi
                    </span>
                  )}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setShowJamConfig(v => !v)}
                      style={{ fontSize: '0.75rem', background: showJamConfig ? '#e0e7ff' : '#f1f5f9', border: '1px solid #c7d2fe', color: '#4338ca', borderRadius: 6, padding: '2px 10px', cursor: 'pointer', marginLeft: 'auto' }}
                    >
                      <i className="fas fa-sliders-h" style={{ marginRight: 4 }}></i>{showJamConfig ? 'Tutup Pengaturan' : 'Atur Jam'}
                    </button>
                  )}
                </div>
                <div className={styles.jamPills}>
                  {[1,2,3,4,5,6,7,8,9,10,11,12,13].map(jam => {
                    const available = jamTersedia.includes(jam);
                    const isExtra = jam >= 11;
                    const isActive = selectedJam.includes(jam);
                    
                    let customStyle: any = {};
                    if (!available) {
                      customStyle = { opacity: 0.25, cursor: 'not-allowed', textDecoration: 'line-through' };
                    } else if (isExtra) {
                      customStyle = {
                        background: isActive ? '#ef4444' : '#fee2e2',
                        color: isActive ? 'white' : '#ef4444',
                        borderColor: isActive ? '#ef4444' : '#fca5a5'
                      };
                    }

                    return (
                      <button
                        key={jam}
                        type="button"
                        onClick={() => available ? toggleJam(jam) : null}
                        className={`${styles.jamPill} ${isActive && !isExtra ? styles.jamPillActive : ''}`}
                        style={customStyle}
                        title={!available ? `Jam ${jam} tidak tersedia untuk tanggal ini` : `Jam ${jam}`}
                      >
                        {jam}
                      </button>
                    );
                  })}
                  {jamConfigLoading && <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: 4 }}><i className="fas fa-spinner fa-spin"></i></span>}
                </div>

                {/* Panel konfigurasi jam — admin only */}
                {isAdmin && showJamConfig && (
                  <div style={{ marginTop: 12, background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: 16 }}>
                    <p style={{ margin: '0 0 10px', fontWeight: 700, color: '#0369a1', fontSize: '0.85rem' }}>
                      <i className="fas fa-cog" style={{ marginRight: 6 }}></i>Atur Jam Tersedia untuk {tanggal || 'tanggal ini'}
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                      {[1,2,3,4,5,6,7,8,9,10,11,12,13].map(j => (
                        <label key={j} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', padding: '4px 10px', background: konfigJam.includes(j) ? '#0284c7' : '#e2e8f0', color: konfigJam.includes(j) ? 'white' : '#475569', borderRadius: 8, fontWeight: 600, fontSize: '0.85rem', userSelect: 'none' }}>
                          <input
                            type="checkbox"
                            checked={konfigJam.includes(j)}
                            onChange={() => setKonfigJam(prev => prev.includes(j) ? prev.filter(x => x !== j) : [...prev, j].sort((a,b) => a-b))}
                            style={{ display: 'none' }}
                          />
                          Jam {j}
                        </label>
                      ))}
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <input
                        type="text"
                        placeholder="Keterangan (opsional), contoh: Hari Pendek"
                        value={konfigKeterangan}
                        onChange={e => setKonfigKeterangan(e.target.value)}
                        style={{ width: '100%', padding: '6px 10px', border: '1px solid #bae6fd', borderRadius: 6, fontSize: '0.85rem' }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        onClick={async () => {
                          if (konfigJam.length === 0) { alert('Pilih minimal 1 jam!'); return; }
                          const res = await fetch('/api/jam-config', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ tanggal, jamTersedia: konfigJam, keterangan: konfigKeterangan })
                          });
                          const data = await res.json();
                          if (data.success) {
                            setJamTersedia(konfigJam);
                            setHasJamConfig(true);
                            setSelectedJam(prev => prev.filter(j => konfigJam.includes(j)));
                            setShowJamConfig(false);
                            Swal.fire({ icon: 'success', title: 'Tersimpan!', text: `Jam ${konfigJam.join(', ')} diatur untuk ${tanggal}`, timer: 1500, showConfirmButton: false });
                          }
                        }}
                        style={{ background: '#0284c7', color: 'white', border: 'none', borderRadius: 8, padding: '6px 16px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                      >
                        <i className="fas fa-save" style={{ marginRight: 4 }}></i>Simpan Konfigurasi
                      </button>
                      {hasJamConfig && (
                        <button
                          type="button"
                          onClick={async () => {
                            const res = await fetch(`/api/jam-config?tanggal=${tanggal}`, { method: 'DELETE' });
                            const data = await res.json();
                            if (data.success) {
                              setJamTersedia([1,2,3,4,5,6,7,8,9,10,11,12,13]);
                              setKonfigJam([1,2,3,4,5,6,7,8,9,10,11,12,13]);
                              setKonfigKeterangan('');
                              setHasJamConfig(false);
                              setShowJamConfig(false);
                              Swal.fire({ icon: 'success', title: 'Direset!', text: `Konfigurasi jam untuk ${tanggal} dihapus`, timer: 1500, showConfirmButton: false });
                            }
                          }}
                          style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: 8, padding: '6px 16px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                        >
                          <i className="fas fa-undo" style={{ marginRight: 4 }}></i>Reset (Semua Jam)
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {selectedKelas ? (
              <div style={{ marginTop: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#334155' }}>
                  Materi Pembelajaran
                </label>
                <textarea 
                  className={styles.inputField}
                  style={{ width: '100%', height: '120px', resize: 'vertical' }}
                  placeholder="Tuliskan materi yang diajarkan pada sesi ini..."
                  value={materi}
                  onChange={(e) => setMateri(e.target.value)}
                />
                <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button 
                    className={styles.submitBtn} 
                    onClick={handleJurnalSubmit} 
                    disabled={isSubmitting}
                    style={{ opacity: isSubmitting ? 0.7 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
                  >
                    <i className={isSubmitting ? "fas fa-spinner fa-spin" : "fas fa-save"} style={{ marginRight: '8px' }}></i>
                    {isSubmitting ? 'Menyimpan...' : 'Simpan Jurnal'}
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.emptyState}>
                <i className="fas fa-book-open"></i>
                <p>Silakan pilih kelas terlebih dahulu untuk mengisi materi jurnal.</p>
              </div>
            )}
          </div>
        )}


        {activeTab === 'rekap_siswa' && (
          <div className={styles.card}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#1e293b' }}>
                <i className="fas fa-users" style={{ marginRight: 8, color: '#237227' }}></i>
                Rekap Presensi Siswa
              </h2>
              <button onClick={fetchRekapSiswa} style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: '0.82rem', color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="fas fa-sync-alt"></i> Refresh
              </button>
            </div>

            {/* Sub-tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '2px solid #e2e8f0' }}>
              {([{ key: 'semua', label: '📋 Semua Presensi' }, { key: 'alpha', label: `⚠️ Rekap S/I/A (${rsSiaList.length} siswa)` }] as const).map(t => (
                <button key={t.key} onClick={() => setRsSubTab(t.key as 'semua' | 'alpha')}
                  style={{ padding: '8px 16px', border: 'none', background: rsSubTab === t.key ? '#237227' : 'transparent', color: rsSubTab === t.key ? 'white' : '#64748b', borderRadius: '6px 6px 0 0', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s' }}
                >{t.label}</button>
              ))}
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16, padding: '12px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Dari Tanggal</label>
                <input type="date" value={rsFilterFrom} onChange={e => setRsFilterFrom(e.target.value)} style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '0.85rem' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Sampai Tanggal</label>
                <input type="date" value={rsFilterTo} onChange={e => setRsFilterTo(e.target.value)} style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '0.85rem' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Nama Siswa</label>
                <input type="text" placeholder="Cari nama..." value={rsFilterNama} onChange={e => setRsFilterNama(e.target.value)} style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '0.85rem', minWidth: 160 }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Kelas</label>
                <select value={rsFilterKelas} onChange={e => setRsFilterKelas(e.target.value)} style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '0.85rem' }}>
                  <option value="">Semua Kelas</option>
                  {rsKelasList.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Domisili</label>
                <select value={rsFilterDomisili} onChange={e => setRsFilterDomisili(e.target.value)} style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '0.85rem', minWidth: 120 }}>
                  <option value="">Semua Domisili</option>
                  {rsDomisiliList.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, justifyContent: 'flex-end' }}>
                <button onClick={() => { setRsFilterFrom(''); setRsFilterTo(''); setRsFilterNama(''); setRsFilterKelas(''); setRsFilterDomisili(''); }}
                  style={{ padding: '6px 12px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>
                  <i className="fas fa-times"></i> Reset
                </button>
              </div>
            </div>

            {rekapSiswaLoading ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: '#64748b' }}>
                <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', display: 'block', marginBottom: 12 }}></i>
                Memuat data presensi...
              </div>
            ) : rsSubTab === 'semua' ? (
              /* ── TAB SEMUA PRESENSI ── */
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: '0.82rem', color: '#64748b' }}>{rsFiltered.length} entri</span>
                  <button onClick={() => exportSiswaExcel(rsFiltered)}
                    style={{ background: '#16a34a', border: 'none', padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: '0.82rem', color: 'white', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                    <i className="fas fa-file-excel"></i> Export Excel ({rsFiltered.length})
                  </button>
                </div>
                {rsFiltered.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8' }}>
                    <i className="fas fa-inbox" style={{ fontSize: '2rem', display: 'block', marginBottom: 8 }}></i>
                    Tidak ada data
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ background: '#1e3a5f', color: 'white' }}>
                          {['No','Tanggal','Nama Siswa','Kelas','Domisili','Mata Pelajaran','Jam Ke','Ket.', 'Aksi'].map(h => (
                            <th key={h} style={{ padding: '8px 12px', textAlign: (h === 'Jam Ke' || h === 'Ket.' || h === 'Aksi') ? 'center' : 'left', whiteSpace: 'nowrap', fontWeight: 700, width: h === 'Jam Ke' ? '120px' : 'auto' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rsFiltered.map((r, i) => (
                          <tr key={`${r.tanggal}-${r.namaSiswa}-${i}`} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? 'white' : '#f8fafc' }}>
                            <td style={{ padding: '7px 12px', color: '#94a3b8' }}>{i + 1}</td>
                            <td style={{ padding: '7px 12px', whiteSpace: 'nowrap' }}>{r.tanggal}</td>
                            <td style={{ padding: '7px 12px', fontWeight: 600 }}>{r.namaSiswa}</td>
                            <td style={{ padding: '7px 12px' }}>{r.kelas}</td>
                            <td style={{ padding: '7px 12px', color: '#64748b' }}>{r.domisili || '-'}</td>
                            <td style={{ padding: '7px 12px', color: '#475569' }}>{r.mapel}</td>
                            <td style={{ padding: '7px 12px', textAlign: 'center', maxWidth: '120px' }}>
                              {editRsId === r.id ? (
                                <input
                                  type="text"
                                  value={editRsJam}
                                  onChange={(e) => setEditRsJam(e.target.value)}
                                  style={{ padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem', width: '60px', textAlign: 'center' }}
                                />
                              ) : (
                                <span style={{ display: 'inline-block', background: '#eff6ff', color: '#2563eb', padding: '4px 8px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'normal', lineHeight: '1.4' }}>Jam {String(r.jamKe).replace(/,/g, ', ')}</span>
                              )}
                            </td>
                            <td style={{ padding: '7px 12px', textAlign: 'center' }}>
                              {editRsId === r.id ? (
                                <select 
                                  value={editRsStatus} 
                                  onChange={(e) => setEditRsStatus(e.target.value)}
                                  style={{ padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                                >
                                  <option value="S">Sakit (S)</option>
                                  <option value="I">Izin (I)</option>
                                  <option value="A">Alpha (A)</option>
                                  <option value="H">Hadir (Hapus)</option>
                                </select>
                              ) : (
                                <span style={{
                                  background: r.kehadiran === 'A' ? '#fef2f2' : r.kehadiran === 'I' ? '#fff7ed' : '#fefce8',
                                  color: r.kehadiran === 'A' ? '#dc2626' : r.kehadiran === 'I' ? '#ea580c' : '#ca8a04',
                                  padding: '3px 10px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 700
                                }}>{r.kehadiran}</span>
                              )}
                            </td>
                            <td style={{ padding: '7px 12px', textAlign: 'center' }}>
                              {editRsId === r.id ? (
                                <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                  <button onClick={() => handleSaveRsEdit(r.id)} style={{ background: '#16a34a', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }} title="Simpan"><i className="fas fa-check"></i></button>
                                  <button onClick={() => setEditRsId(null)} style={{ background: '#94a3b8', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }} title="Batal"><i className="fas fa-times"></i></button>
                                </div>
                              ) : (
                                <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                  <button onClick={() => { setEditRsId(r.id); setEditRsStatus(r.kehadiran); setEditRsJam(r.jamKe); }} style={{ background: '#f59e0b', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }} title="Edit"><i className="fas fa-edit"></i></button>
                                  <button onClick={() => handleDeleteRs(r.id)} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }} title="Hapus"><i className="fas fa-trash"></i></button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              /* ── TAB REKAP S/I/A ── */
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span style={{ fontSize: '0.82rem', color: '#64748b' }}>{rsSiaList.length} siswa dengan total S/I/A tercatat</span>
                    <span style={{ fontSize: '0.78rem', background: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: 20 }}>🔴 = lebih dari atau sama dengan 5 hari</span>
                  </div>
                  <button onClick={() => exportAlphaExcel(rsSiaList)}
                    style={{ background: '#16a34a', border: 'none', padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: '0.82rem', color: 'white', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                    <i className="fas fa-file-excel"></i> Export Excel
                  </button>
                </div>
                {rsSiaList.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8' }}>
                    <i className="fas fa-check-circle" style={{ fontSize: '2rem', color: '#22c55e', display: 'block', marginBottom: 8 }}></i>
                    Semua siswa hadir (Tidak ada catatan S/I/A)
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ background: '#1e3a5f', color: 'white' }}>
                          <th style={{ padding: '8px 14px', textAlign: 'center', width: 44, fontWeight: 700 }}>No</th>
                          <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 700 }}>Nama Siswa</th>
                          <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 700 }}>Kelas</th>
                          <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 700 }}>Domisili</th>
                          <th style={{ padding: '8px 14px', textAlign: 'center', fontWeight: 700, background: '#fbbf24', color: '#1e293b' }}>Sakit (S)</th>
                          <th style={{ padding: '8px 14px', textAlign: 'center', fontWeight: 700, background: '#fb923c', color: 'white' }}>Izin (I)</th>
                          <th style={{ padding: '8px 14px', textAlign: 'center', fontWeight: 700, background: '#ef4444', color: 'white' }}>Alpha (A)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rsSiaList.map((s, i) => {
                          const sDays = s.S / 10;
                          const iDays = s.I / 10;
                          const aDays = s.A / 10;
                          
                          return (
                            <tr key={s.nama} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? 'white' : '#f8fafc' }}>
                              <td style={{ padding: '9px 14px', textAlign: 'center', color: '#94a3b8' }}>{i + 1}</td>
                              <td style={{ padding: '9px 14px', fontWeight: 600, color: '#1e293b' }}>
                                {s.nama}
                              </td>
                              <td style={{ padding: '9px 14px', color: '#475569' }}>{s.kelas}</td>
                              <td style={{ padding: '9px 14px', color: '#64748b' }}>{s.domisili || '-'}</td>
                              <td style={{ padding: '9px 14px', textAlign: 'center', fontWeight: 700, color: sDays >= 5 ? '#dc2626' : s.S > 0 ? '#d97706' : '#94a3b8', background: sDays >= 5 ? '#fee2e2' : 'transparent' }}>{s.S > 0 ? Number(sDays.toFixed(1)) : '-'}</td>
                              <td style={{ padding: '9px 14px', textAlign: 'center', fontWeight: 700, color: iDays >= 5 ? '#dc2626' : s.I > 0 ? '#ea580c' : '#94a3b8', background: iDays >= 5 ? '#fee2e2' : 'transparent' }}>{s.I > 0 ? Number(iDays.toFixed(1)) : '-'}</td>
                              <td style={{ padding: '9px 14px', textAlign: 'center', fontWeight: 700, color: aDays >= 5 ? '#dc2626' : s.A > 0 ? '#7c3aed' : '#94a3b8', background: aDays >= 5 ? '#fee2e2' : 'transparent' }}>{s.A > 0 ? Number(aDays.toFixed(1)) : '-'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Jurnal Piket Tab */}
        {activeTab === 'jurnal_piket' && (
          <div className={styles.card}>
            <h2>Jurnal Piket</h2>
            <datalist id="guru-datalist">
              {guruList.map(g => (
                <option key={g} value={g} />
              ))}
            </datalist>
            <div className={styles.filterSection} style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: 20, marginBottom: 20 }}>
              <div className={styles.filterGroup}>
                <label>Tanggal</label>
                <input 
                  type="date" 
                  value={tanggal} 
                  onChange={(e) => setTanggal(e.target.value)}
                  className={styles.inputField}
                />
              </div>
              <div className={styles.filterGroup}>
                <label>Petugas Piket <span style={{color: 'red'}}>*</span></label>
                <MultiSelectDropdown 
                  options={guruList}
                  selected={jpPetugasPiket}
                  onChange={setJpPetugasPiket}
                  placeholder="Pilih Petugas Piket..."
                  className={styles.inputField}
                />
              </div>
              <div className={styles.filterGroup}>
                <label>Guru Dispo</label>
                <MultiSelectDropdown 
                  options={guruList}
                  selected={jpGuruDispo}
                  onChange={setJpGuruDispo}
                  placeholder="Pilih Guru Dispo..."
                  className={styles.inputField}
                />
              </div>
            </div>

            <div style={{ marginBottom: 15, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Daftar Guru Izin / Laporan Kejadian</h3>
              <button 
                onClick={() => setJpEntries([...jpEntries, { guruIzin: '', alasanIzin: '', kelasDitinggalkan: '', materi: '', guruPengganti: '' }])}
                style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: '0.85rem' }}
              >
                <i className="fas fa-plus"></i> Tambah Baris
              </button>
            </div>

            <div style={{ overflowX: 'auto', marginBottom: 20 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '10px', textAlign: 'left' }}>No</th>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Nama Guru Izin</th>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Alasan Izin</th>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Kelas Ditinggalkan</th>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Materi / Tugas</th>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Guru Pengganti</th>
                    <th style={{ padding: '10px', textAlign: 'center' }}>Hapus</th>
                  </tr>
                </thead>
                <tbody>
                  {jpEntries.map((entry, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 10px', textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <input 
                          type="text" 
                          list="guru-datalist"
                          value={entry.guruIzin}
                          onChange={(e) => {
                            const newEntries = [...jpEntries];
                            newEntries[idx].guruIzin = e.target.value;
                            setJpEntries(newEntries);
                          }}
                          placeholder="Nama Guru"
                          className={styles.inputField}
                          style={{ marginBottom: 0, padding: '6px 10px' }}
                        />
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <input 
                          type="text" 
                          value={entry.alasanIzin}
                          onChange={(e) => {
                            const newEntries = [...jpEntries];
                            newEntries[idx].alasanIzin = e.target.value;
                            setJpEntries(newEntries);
                          }}
                          placeholder="Sakit/Izin/Dinas"
                          className={styles.inputField}
                          style={{ marginBottom: 0, padding: '6px 10px' }}
                        />
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <input 
                          type="text" 
                          value={entry.kelasDitinggalkan}
                          onChange={(e) => {
                            const newEntries = [...jpEntries];
                            newEntries[idx].kelasDitinggalkan = e.target.value;
                            setJpEntries(newEntries);
                          }}
                          placeholder="7A, 8B"
                          className={styles.inputField}
                          style={{ marginBottom: 0, padding: '6px 10px' }}
                        />
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <input 
                          type="text" 
                          value={entry.materi}
                          onChange={(e) => {
                            const newEntries = [...jpEntries];
                            newEntries[idx].materi = e.target.value;
                            setJpEntries(newEntries);
                          }}
                          placeholder="Tugas Mengerjakan LKS"
                          className={styles.inputField}
                          style={{ marginBottom: 0, padding: '6px 10px' }}
                        />
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <input 
                          type="text" 
                          list="guru-datalist"
                          value={entry.guruPengganti}
                          onChange={(e) => {
                            const newEntries = [...jpEntries];
                            newEntries[idx].guruPengganti = e.target.value;
                            setJpEntries(newEntries);
                          }}
                          placeholder="Nama Pengganti"
                          className={styles.inputField}
                          style={{ marginBottom: 0, padding: '6px 10px' }}
                        />
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        <button 
                          onClick={() => {
                            if (jpEntries.length > 1) {
                              setJpEntries(jpEntries.filter((_, i) => i !== idx));
                            } else {
                              setJpEntries([{ guruIzin: '', alasanIzin: '', kelasDitinggalkan: '', materi: '', guruPengganti: '' }]);
                            }
                          }}
                          style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '5px' }}
                          title="Hapus baris"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button 
              className={styles.submitBtn} 
              onClick={handleJurnalPiketSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <> <i className="fas fa-spinner fa-spin"></i> Menyimpan... </>
              ) : (
                <> <i className="fas fa-save"></i> Simpan Jurnal Piket </>
              )}
            </button>
          </div>
        )}

        {/* Rekap Piket Tab */}
        {activeTab === 'rekap_piket' && (
          <div className={styles.card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
              <h2 style={{ margin: 0 }}>Rekap Jurnal Piket</h2>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <input type="date" value={rpFilterFrom} onChange={(e) => setRpFilterFrom(e.target.value)} className={styles.inputField} style={{ marginBottom: 0, padding: '6px 12px', width: 'auto' }} />
                <span>s/d</span>
                <input type="date" value={rpFilterTo} onChange={(e) => setRpFilterTo(e.target.value)} className={styles.inputField} style={{ marginBottom: 0, padding: '6px 12px', width: 'auto' }} />
                
                <button 
                  onClick={() => exportPiketExcel(rpFiltered)}
                  style={{ background: '#16a34a', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <i className="fas fa-file-excel"></i> Export Excel
                </button>
                <button 
                  onClick={fetchRekapPiket}
                  style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '8px 12px', borderRadius: 6, cursor: 'pointer' }}
                  disabled={rekapPiketLoading}
                >
                  <i className={`fas fa-sync-alt ${rekapPiketLoading ? 'fa-spin' : ''}`}></i>
                </button>
              </div>
            </div>

            {rekapPiketLoading ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: '#64748b' }}>
                <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', display: 'block', marginBottom: 12 }}></i>
                Memuat data rekap piket...
              </div>
            ) : rpFiltered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8' }}>
                <i className="fas fa-inbox" style={{ fontSize: '2rem', display: 'block', marginBottom: 8 }}></i>
                Tidak ada data
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: '#1e3a5f', color: 'white' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left', whiteSpace: 'nowrap', fontWeight: 700 }}>No</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', whiteSpace: 'nowrap', fontWeight: 700 }}>Tanggal</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', whiteSpace: 'nowrap', fontWeight: 700 }}>Petugas Piket</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', whiteSpace: 'nowrap', fontWeight: 700 }}>Guru Dispo</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', whiteSpace: 'nowrap', fontWeight: 700 }}>Guru Izin</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', whiteSpace: 'nowrap', fontWeight: 700 }}>Alasan Izin</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', whiteSpace: 'nowrap', fontWeight: 700 }}>Kls Kosong</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', whiteSpace: 'nowrap', fontWeight: 700 }}>Materi</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', whiteSpace: 'nowrap', fontWeight: 700 }}>Pengganti</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rpFiltered.map((r, i) => (
                      <tr key={r.id || i} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? 'white' : '#f8fafc' }}>
                        <td style={{ padding: '7px 12px', color: '#94a3b8' }}>{i + 1}</td>
                        <td style={{ padding: '7px 12px', whiteSpace: 'nowrap' }}>{r.tanggal}</td>
                        <td style={{ padding: '7px 12px', fontWeight: 600 }}>{r.petugasPiket}</td>
                        <td style={{ padding: '7px 12px', fontWeight: 600 }}>{r.guruDispo}</td>
                        <td style={{ padding: '7px 12px', color: '#b45309', fontWeight: 600 }}>{r.guruIzin}</td>
                        <td style={{ padding: '7px 12px' }}>{r.alasanIzin}</td>
                        <td style={{ padding: '7px 12px', color: '#dc2626', fontWeight: 600 }}>{r.kelasDitinggalkan}</td>
                        <td style={{ padding: '7px 12px' }}>{r.materi}</td>
                        <td style={{ padding: '7px 12px', color: '#16a34a' }}>{r.guruPengganti}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'rekap_jurnal' && (
          <div className={styles.card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#1e293b' }}>
                  <i className="fas fa-clipboard-list" style={{ marginRight: 8, color: '#237227' }}></i>
                  Rekap Jurnal Mengajar
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                  {isAdmin ? 'Data semua guru' : `Data jurnal: ${currentUsername}`}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={fetchRekapJurnal}
                  style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: '0.85rem', color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <i className="fas fa-sync-alt"></i> Muat Data
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
              {isAdmin && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, position: 'relative' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Filter Guru</label>
                  <div style={{ position: 'relative', minWidth: 220 }}>
                    <div
                      onClick={() => { setIsGuruRekapDropdownOpen(!isGuruRekapDropdownOpen); if (!isGuruRekapDropdownOpen) setSearchGuruRekap(''); }}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.9rem', background: 'white', cursor: 'pointer', minWidth: 220 }}
                    >
                      <span style={{ color: filterGuruRekap ? '#1e293b' : '#94a3b8' }}>
                        {filterGuruRekap || 'Semua Guru'}
                      </span>
                      <i className="fas fa-chevron-down" style={{ color: '#94a3b8', fontSize: '0.75rem' }}></i>
                    </div>
                    {isGuruRekapDropdownOpen && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 999, background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', marginTop: 2 }}>
                        <div style={{ padding: '8px' }}>
                          <input
                            type="text"
                            placeholder="Cari guru..."
                            value={searchGuruRekap}
                            onChange={e => setSearchGuruRekap(e.target.value)}
                            autoFocus
                            style={{ width: '100%', padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '0.85rem', boxSizing: 'border-box' }}
                          />
                        </div>
                        <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                          <div
                            onClick={() => { setFilterGuruRekap(''); setIsGuruRekapDropdownOpen(false); }}
                            style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '0.88rem', color: '#64748b', background: !filterGuruRekap ? '#f1f5f9' : 'white' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#f1f5f9')}
                            onMouseLeave={e => (e.currentTarget.style.background = !filterGuruRekap ? '#f1f5f9' : 'white')}
                          >Semua Guru</div>
                          {guruListRekap
                            .filter(g => g.toLowerCase().includes(searchGuruRekap.toLowerCase()))
                            .map((g, i) => (
                              <div
                                key={i}
                                onClick={() => { setFilterGuruRekap(g); setIsGuruRekapDropdownOpen(false); }}
                                style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '0.88rem', color: '#1e293b', background: filterGuruRekap === g ? '#eff6ff' : 'white' }}
                                onMouseEnter={e => (e.currentTarget.style.background = '#f1f5f9')}
                                onMouseLeave={e => (e.currentTarget.style.background = filterGuruRekap === g ? '#eff6ff' : 'white')}
                              >{g}</div>
                            ))}
                          {guruListRekap.filter(g => g.toLowerCase().includes(searchGuruRekap.toLowerCase())).length === 0 && (
                            <div style={{ padding: '10px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>Guru tidak ditemukan</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Filter Kelas</label>
                <select value={filterKelasRekap} onChange={e => setFilterKelasRekap(e.target.value)}
                  style={{ padding: '7px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.9rem', minWidth: 150 }}>
                  <option value="">Semua Kelas</option>
                  {kelasListRekap.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
              {(filterFrom || filterTo || filterKelasRekap || (isAdmin && filterGuruRekap)) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, justifyContent: 'flex-end' }}>
                  <button onClick={() => { setFilterFrom(''); setFilterTo(''); setFilterKelasRekap(''); if (isAdmin) setFilterGuruRekap(''); }}
                    style={{ padding: '7px 14px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                    <i className="fas fa-times"></i> Reset
                  </button>
                </div>
              )}
            </div>

            {rekapJurnalLoading ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: '#64748b' }}>
                <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', display: 'block', marginBottom: 12 }}></i>
                Memuat data jurnal...
              </div>
            ) : rekapJurnalData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', display: 'block', marginBottom: 12 }}></i>
                Memuat data jurnal...
              </div>
            ) : (() => {
              const filtered = rekapJurnalData.filter(r => {
                if (!isAdmin && r.namaGuru !== currentUsername) return false;
                if (filterGuruRekap && r.namaGuru !== filterGuruRekap) return false;
                if (filterKelasRekap && r.kelas !== filterKelasRekap) return false;
                if (filterFrom && r.tanggal < filterFrom) return false;
                if (filterTo && r.tanggal > filterTo) return false;
                return true;
              });
              return (
                <div>
                  {filtered.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8' }}>
                      <i className="fas fa-search" style={{ fontSize: '2rem', display: 'block', marginBottom: 8 }}></i>
                      Tidak ada data jurnal ditemukan
                      {!isAdmin && <p style={{ fontSize: '0.82rem', marginTop: 8 }}>Pastikan nama akun Anda cocok dengan nama guru di jurnal: <strong>{currentUsername}</strong></p>}
                    </div>
                  ) : (
                    <div>
                      {/* Export button */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10, gap: '8px' }}>
                        <button
                          onClick={() => handleExportProksus(filtered)}
                          style={{ background: '#ecfdf5', border: '1px solid #10b981', padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: '0.82rem', color: '#059669', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
                        >
                          <i className="fas fa-file-excel"></i> Export Proksus
                        </button>
                        <button
                          onClick={() => handleExportExcel(filtered)}
                          style={{ background: '#16a34a', border: 'none', padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: '0.82rem', color: 'white', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
                        >
                          <i className="fas fa-file-excel"></i> Export Excel ({filtered.length} data)
                        </button>
                      </div>
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
                              <td style={{ padding: '10px 14px', color: '#94a3b8' }}>{i + 1}</td>
                              <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', color: '#334155', fontWeight: 500 }}>
                                {r.tanggal ? new Date(r.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                              </td>
                              {isAdmin && (
                                <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                                  <span style={{ background: '#e0e7ff', color: '#4338ca', padding: '3px 10px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600 }}>{r.namaGuru}</span>
                                </td>
                              )}
                              <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', fontWeight: 600, color: '#1e293b' }}>{r.kelas}</td>
                              <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', color: '#475569' }}>{r.mapel}</td>
                              <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                <span style={{ background: /(11|12|13)/.test(r.jamKe) ? '#fee2e2' : '#dcfce7', color: /(11|12|13)/.test(r.jamKe) ? '#ef4444' : '#16a34a', padding: '3px 10px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600 }}>Jam {r.jamKe}</span>
                              </td>
                              <td style={{ padding: '10px 14px', color: '#475569', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.materi}>{r.materi}</td>
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
                        Menampilkan {filtered.length} dari {rekapJurnalData.length} entri
                      </div>
                    </div>
                  </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>

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
                <button onClick={handleSaveEditJurnal} disabled={isSavingEdit} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#0ea5e9', color: 'white', cursor: 'pointer', fontWeight: 600 }}>
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
