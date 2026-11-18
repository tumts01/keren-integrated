'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import styles from './Jadwal.module.css';
import InlineLoading from '@/components/InlineLoading';
import {
  DAYS,
  findTeacherClashes,
  JadwalKelasEntry,
} from '@/lib/jadwalGenerator';

interface Jadwal {
  id: string;
  kodeGuru: string;
  namaGuru: string;
  statusGuru: string;
  mataPelajaran: string;
  totalJam: string;
  keterangan: string;
  [key: string]: string; // For class columns
}

interface Mapel {
  id: string;
  namaMapel: string;
}

interface Guru {
  id: number;
  nama: string;
}

interface EditSlotTarget {
  hari: string;
  jamKe: number;
}

const KELAS_VII = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
const KELAS_VIII = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
const KELAS_IX = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

const STATUS_GURU = ['GTY', 'DPK', 'PTY', 'GTT', 'PTT'];

export default function JadwalMengajarPage() {
  const [jadwalList, setJadwalList] = useState<Jadwal[]>([]);
  const [mapelList, setMapelList] = useState<Mapel[]>([]);
  const [guruList, setGuruList] = useState<Guru[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('');
  const [currentUsername, setCurrentUsername] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Jadwal>>({});

  const [activeTab, setActiveTab] = useState<'guru' | 'kelas'>('guru');
  const [selectedKelas, setSelectedKelas] = useState('VII_A');
  const [jadwalPelajaran, setJadwalPelajaran] = useState<JadwalKelasEntry[]>([]);
  const [loadingPelajaran, setLoadingPelajaran] = useState(false);
  const [generatingKelas, setGeneratingKelas] = useState(false);
  const [savingKelas, setSavingKelas] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [hasUnsavedKelas, setHasUnsavedKelas] = useState(false);
  const [editSlot, setEditSlot] = useState<EditSlotTarget | null>(null);
  const [swapSource, setSwapSource] = useState<EditSlotTarget | null>(null);

  const router = useRouter();

  useEffect(() => {
    const userStr = localStorage.getItem('keren_user_data');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setUserRole((user.role || '').toLowerCase());
        setCurrentUsername(user.nama || user.username || '');
      } catch(e) {}
    }
    if (activeTab === 'guru') {
      fetchData();
    } else if (activeTab === 'kelas') {
      if (jadwalList.length === 0) fetchData();
      if (jadwalPelajaran.length === 0 && !loadingPelajaran) {
        fetchJadwalPelajaran();
      }
    }
  }, [activeTab]);

  const fetchJadwalPelajaran = async () => {
    setLoadingPelajaran(true);
    try {
      const res = await fetch('/api/jadwal-pelajaran', { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        setJadwalPelajaran(data.data || []);
        setHasUnsavedKelas(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPelajaran(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resJadwal, resMapel, resGuru] = await Promise.all([
        fetch('/api/jadwal'),
        fetch('/api/jadwal/mapel'),
        fetch('/api/guru')
      ]);
      const dataJadwal = await resJadwal.json();
      const dataMapel = await resMapel.json();
      const dataGuru = await resGuru.json();
      
      if (dataJadwal.success) setJadwalList(dataJadwal.data);
      if (dataMapel.success) setMapelList(dataMapel.data);
      if (dataGuru.success) setGuruList(dataGuru.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleJamChange = (prefix: string, kelas: string, value: string) => {
    const field = `${prefix}_${kelas}`;
    // Only allow numbers
    if (value && !/^\d*$/.test(value)) return;
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Calculate total jam dynamically
  const calculateTotal = () => {
    let total = 0;
    ['VII', 'VIII', 'IX'].forEach(prefix => {
      const arr = prefix === 'VII' ? KELAS_VII : prefix === 'VIII' ? KELAS_VIII : KELAS_IX;
      arr.forEach(k => {
        const val = parseInt(formData[`${prefix}_${k}`] || '0');
        if (!isNaN(val)) total += val;
      });
    });
    return total;
  };

  const openAddModal = () => {
    setFormData({
      statusGuru: 'GTY', // default
    });
    setShowModal(true);
  };

  const openEditModal = (item: Jadwal) => {
    setFormData({ ...item });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!isAdmin) { alert('Akses ditolak'); return; }
    if (!formData.kodeGuru || !formData.namaGuru || !formData.mataPelajaran) {
      alert('Kode Guru, Nama, dan Mata Pelajaran harus diisi!');
      return;
    }
    
    setSaving(true);
    try {
      const payload = { ...formData, totalJam: calculateTotal().toString() };
      
      const res = await fetch('/api/jadwal/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (data.success) {
        setShowModal(false);
        fetchData();
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert('Terjadi kesalahan jaringan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) { alert('Akses ditolak'); return; }
    if (!confirm('Apakah Anda yakin ingin menghapus jadwal ini?')) return;
    
    try {
      const res = await fetch('/api/jadwal/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert('Terjadi kesalahan');
    }
  };

  // Filter functionality
  const filteredList = jadwalList.filter(j => {
    const term = searchTerm.toLowerCase();
    return (
      (j.namaGuru || '').toLowerCase().includes(term) ||
      (j.mataPelajaran || '').toLowerCase().includes(term)
    );
  });

  const isAdmin = userRole === 'admin' || userRole === 'pimpinan';

  const ALL_KELAS_OPTIONS = useMemo(
    () => [
      ...KELAS_VII.map(k => `VII_${k}`),
      ...KELAS_VIII.map(k => `VIII_${k}`),
      ...KELAS_IX.map(k => `IX_${k}`),
    ],
    []
  );

  const classTargetJPMap = useMemo(() => {
    const map: Record<string, number> = {};
    jadwalList.forEach(j => {
      ALL_KELAS_OPTIONS.forEach(k => {
        const val = parseInt(j[k] || '0', 10);
        if (val > 0) map[k] = (map[k] || 0) + val;
      });
    });
    return map;
  }, [jadwalList, ALL_KELAS_OPTIONS]);

  const classRequirements = useMemo(() => {
    const reqs: Array<{
      kodeGuru: string;
      namaGuru: string;
      mataPelajaran: string;
      targetJP: number;
      scheduledJP: number;
    }> = [];
    const scheduledCount: Record<string, number> = {};
    jadwalPelajaran
      .filter(e => e.kelas === selectedKelas && !e.isPK && e.kodeGuru !== 'PK')
      .forEach(e => {
        const key = `${e.kodeGuru}|${e.mataPelajaran}`;
        scheduledCount[key] = (scheduledCount[key] || 0) + 1;
      });

    jadwalList.forEach(j => {
      const jp = parseInt(j[selectedKelas] || '0', 10);
      if (jp > 0) {
        const key = `${j.kodeGuru}|${j.mataPelajaran}`;
        reqs.push({
          kodeGuru: j.kodeGuru,
          namaGuru: j.namaGuru,
          mataPelajaran: j.mataPelajaran,
          targetJP: jp,
          scheduledJP: scheduledCount[key] || 0,
        });
      }
    });
    return reqs;
  }, [jadwalList, jadwalPelajaran, selectedKelas]);

  const allClashes = useMemo(() => findTeacherClashes(jadwalPelajaran), [jadwalPelajaran]);
  const clashCellMap = useMemo(() => {
    const map = new Map<string, string[]>();
    allClashes.forEach(c => {
      c.classes.forEach(cls => {
        if (cls === selectedKelas) {
          map.set(`${c.hari}|${c.jamKe}`, c.classes.filter(x => x !== cls));
        }
      });
    });
    return map;
  }, [allClashes, selectedKelas]);

  // Jadwal Kelas computed
  const classTimetable = useMemo(
    () => jadwalPelajaran.filter(j => j.kelas === selectedKelas),
    [jadwalPelajaran, selectedKelas]
  );

  const jamKeList = useMemo(() => {
    const fromEntries = classTimetable.map(j => Number(j.jamKe)).filter(n => !isNaN(n));
    const maxJam = Math.max(selectedKelas.startsWith('IX_') ? 9 : 10, ...fromEntries);
    return Array.from({ length: maxJam }, (_, i) => i + 1);
  }, [classTimetable, selectedKelas]);

  const scheduledRegularJP = useMemo(
    () => classTimetable.filter(e => !e.isPK && e.kodeGuru !== 'PK').length,
    [classTimetable]
  );
  const expectedClassJP = classTargetJPMap[selectedKelas] || 0;

  const getCellData = (hari: string, jam: number) => {
    return classTimetable.find(j => j.hari === hari && Number(j.jamKe) === jam) || null;
  };

  const handleGenerateJadwalKelas = async () => {
    if (!isAdmin) return;
    const confirmRes = await Swal.fire({
      title: 'Generate Jadwal Kelas Otomatis?',
      html: `
        <div style="text-align:left; font-size:0.9rem; color:#475569; line-height:1.5;">
          <p style="margin:0 0 8px 0;">Sistem akan menyusun jadwal pelajaran <b>Senin–Sabtu</b> untuk seluruh kelas secara otomatis bebas bentrok guru berdasarkan beban mengajar di tab <b>Jadwal Guru</b>.</p>
          <label style="display:flex; align-items:center; gap:8px; background:#f8fafc; padding:10px; border-radius:6px; border:1px solid #cbd5e1; cursor:pointer; margin-top:10px;">
            <input type="checkbox" id="swal-include-pk" checked style="width:16px; height:16px;" />
            <span>Set Jam ke-1 Kelas VII &amp; VIII sebagai <b>Program Khusus (PK)</b></span>
          </label>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Generate Sekarang',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#0ea5e9',
      preConfirm: () => {
        const cb = document.getElementById('swal-include-pk') as HTMLInputElement | null;
        return { includePK: cb ? cb.checked : true };
      },
    });

    if (!confirmRes.isConfirmed) return;

    setGeneratingKelas(true);
    try {
      const res = await fetch('/api/jadwal-pelajaran', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          includePK: confirmRes.value?.includePK !== false,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setJadwalPelajaran(data.data || []);
        setHasUnsavedKelas(false);
        setSwapSource(null);
        Swal.fire(
          'Berhasil',
          `Jadwal ${data.stats?.totalClasses || ''} kelas berhasil dibuat (${data.stats?.totalRegularJP || 0} JP KBM, ${data.stats?.clashCount || 0} bentrok).`,
          'success'
        );
      } else {
        Swal.fire('Gagal', data.error || 'Gagal generate jadwal kelas', 'error');
      }
    } catch (e) {
      console.error(e);
      Swal.fire('Error', 'Terjadi kesalahan jaringan', 'error');
    } finally {
      setGeneratingKelas(false);
    }
  };

  const handleSaveJadwalKelas = async () => {
    if (!isAdmin) return;
    setSavingKelas(true);
    try {
      const res = await fetch('/api/jadwal-pelajaran', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', entries: jadwalPelajaran }),
      });
      const data = await res.json();
      if (data.success) {
        setJadwalPelajaran(data.data || []);
        setHasUnsavedKelas(false);
        setEditMode(false);
        setSwapSource(null);
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Jadwal kelas berhasil disimpan',
          showConfirmButton: false,
          timer: 2000,
        });
      } else {
        Swal.fire('Gagal', data.error || 'Gagal menyimpan jadwal kelas', 'error');
      }
    } catch (e) {
      console.error(e);
      Swal.fire('Error', 'Terjadi kesalahan jaringan', 'error');
    } finally {
      setSavingKelas(false);
    }
  };

  const handleCellClick = (hari: string, jamKe: number) => {
    if (!editMode || !isAdmin) return;

    if (swapSource) {
      if (swapSource.hari === hari && swapSource.jamKe === jamKe) {
        setSwapSource(null);
        return;
      }
      // Swap two slots in selectedKelas
      setJadwalPelajaran(prev => {
        const entryA = prev.find(
          e => e.kelas === selectedKelas && e.hari === swapSource.hari && Number(e.jamKe) === swapSource.jamKe
        );
        const entryB = prev.find(
          e => e.kelas === selectedKelas && e.hari === hari && Number(e.jamKe) === jamKe
        );
        const rest = prev.filter(
          e =>
            !(
              e.kelas === selectedKelas &&
              ((e.hari === swapSource.hari && Number(e.jamKe) === swapSource.jamKe) ||
                (e.hari === hari && Number(e.jamKe) === jamKe))
            )
        );
        const next = [...rest];
        if (entryA) next.push({ ...entryA, hari, jamKe });
        if (entryB) next.push({ ...entryB, hari: swapSource.hari, jamKe: swapSource.jamKe });
        return next;
      });
      setSwapSource(null);
      setHasUnsavedKelas(true);
      return;
    }

    setEditSlot({ hari, jamKe });
  };

  const handleAssignSlot = (choice: {
    mode: 'empty' | 'pk' | 'teacher';
    kodeGuru?: string;
    namaGuru?: string;
    mataPelajaran?: string;
  }) => {
    if (!editSlot) return;
    const { hari, jamKe } = editSlot;
    setJadwalPelajaran(prev => {
      const filtered = prev.filter(
        e => !(e.kelas === selectedKelas && e.hari === hari && Number(e.jamKe) === jamKe)
      );
      if (choice.mode === 'empty') return filtered;
      if (choice.mode === 'pk') {
        return [
          ...filtered,
          {
            hari,
            kelas: selectedKelas,
            jamKe,
            kodeGuru: 'PK',
            namaGuru: 'Pembina Program Khusus',
            mataPelajaran: 'Program Khusus (PK)',
            isPK: true,
          },
        ];
      }
      return [
        ...filtered,
        {
          hari,
          kelas: selectedKelas,
          jamKe,
          kodeGuru: choice.kodeGuru || '',
          namaGuru: choice.namaGuru || '',
          mataPelajaran: choice.mataPelajaran || '',
        },
      ];
    });
    setHasUnsavedKelas(true);
    setEditSlot(null);
  };

  const handleExportExcel = () => {
    if (jadwalPelajaran.length === 0) return;
    const wb = XLSX.utils.book_new();
    const activeClasses = ALL_KELAS_OPTIONS.filter(k =>
      jadwalPelajaran.some(e => e.kelas === k)
    );

    // 1. Sheet Rekap per Hari (Master Matrix)
    const masterRows: (string | number)[][] = [
      ['JADWAL PELAJARAN PER KELAS (SEMUA KELAS)'],
      ['Hari', 'Jam Ke', ...activeClasses.map(c => c.replace('_', ' '))],
    ];
    DAYS.forEach(hari => {
      const dayEntries = jadwalPelajaran.filter(e => e.hari === hari);
      const maxJ = Math.max(10, ...dayEntries.map(e => Number(e.jamKe) || 0));
      for (let jam = 1; jam <= maxJ; jam++) {
        const row: (string | number)[] = [hari, jam];
        activeClasses.forEach(k => {
          const hit = dayEntries.find(e => e.kelas === k && Number(e.jamKe) === jam);
          row.push(hit ? (hit.isPK ? 'PK' : `${hit.mataPelajaran} (${hit.kodeGuru})`) : '-');
        });
        masterRows.push(row);
      }
    });
    const wsMaster = XLSX.utils.aoa_to_sheet(masterRows);
    XLSX.utils.book_append_sheet(wb, wsMaster, 'Semua Kelas');

    // 2. Sheet khusus kelas terpilih
    const classRows: (string | number)[][] = [
      [`JADWAL PELAJARAN KELAS ${selectedKelas.replace('_', ' ')}`],
      ['Jam Ke', ...DAYS],
    ];
    jamKeList.forEach(jam => {
      const row: (string | number)[] = [jam];
      DAYS.forEach(hari => {
        const hit = getCellData(hari, jam);
        row.push(hit ? `${hit.mataPelajaran}\n(${hit.namaGuru})` : '-');
      });
      classRows.push(row);
    });
    const wsClass = XLSX.utils.aoa_to_sheet(classRows);
    XLSX.utils.book_append_sheet(wb, wsClass, selectedKelas);

    XLSX.writeFile(wb, `Jadwal_Kelas_${selectedKelas}.xlsx`);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Jadwal Mengajar</h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Rincian beban jam mengajar guru dan jadwal pelajaran per kelas.
          </p>
        </div>
        {isAdmin && activeTab === 'guru' && (
          <button className={styles.addBtn} onClick={openAddModal}>
            <i className="fas fa-plus"></i> Tambah Jadwal
          </button>
        )}
        {activeTab === 'kelas' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {jadwalPelajaran.length > 0 && (
              <button
                onClick={handleExportExcel}
                style={{
                  background: '#16a34a',
                  color: 'white',
                  border: 'none',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <i className="fas fa-file-excel"></i> Export Excel
              </button>
            )}
            {isAdmin && (
              <>
                <button
                  onClick={() => {
                    setEditMode(prev => !prev);
                    setSwapSource(null);
                  }}
                  style={{
                    background: editMode ? '#f59e0b' : '#f1f5f9',
                    color: editMode ? 'white' : '#334155',
                    border: editMode ? 'none' : '1px solid #cbd5e1',
                    padding: '8px 14px',
                    borderRadius: '6px',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <i className={editMode ? 'fas fa-check' : 'fas fa-edit'}></i>
                  {editMode ? 'Selesai Edit' : 'Mode Edit / Tukar Jam'}
                </button>
                {hasUnsavedKelas && (
                  <button
                    onClick={handleSaveJadwalKelas}
                    disabled={savingKelas}
                    style={{
                      background: '#2563eb',
                      color: 'white',
                      border: 'none',
                      padding: '8px 14px',
                      borderRadius: '6px',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      cursor: savingKelas ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <i className={savingKelas ? 'fas fa-spinner fa-spin' : 'fas fa-save'}></i>
                    {savingKelas ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                )}
                <button
                  className={styles.addBtn}
                  onClick={handleGenerateJadwalKelas}
                  disabled={generatingKelas}
                  style={{ background: '#0ea5e9' }}
                >
                  <i className={generatingKelas ? 'fas fa-spinner fa-spin' : 'fas fa-magic'}></i>
                  {generatingKelas ? 'Menyusun...' : 'Generate dari Jadwal Guru'}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className={styles.tabs}>
        <button 
          className={`${styles.tab} ${activeTab === 'guru' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('guru')}
        >
          <i className="fas fa-chalkboard-teacher"></i>
          Jadwal Guru
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'kelas' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('kelas')}
        >
          <i className="fas fa-users"></i>
          Jadwal Kelas
        </button>
      </div>

      {activeTab === 'guru' && (
        <div className={styles.controls}>
          <input 
            type="text" 
            placeholder="Cari berdasarkan nama guru atau mata pelajaran..." 
            className={styles.searchInput}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      )}

      {activeTab === 'kelas' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
          <div className={styles.controls} style={{ marginBottom: 0, flexWrap: 'wrap', alignItems: 'center' }}>
            <select 
              className={styles.searchInput}
              value={selectedKelas}
              onChange={(e) => {
                setSelectedKelas(e.target.value);
                setSwapSource(null);
              }}
              style={{ maxWidth: '320px' }}
            >
              {ALL_KELAS_OPTIONS.map(k => {
                const target = classTargetJPMap[k] || 0;
                return (
                  <option key={k} value={k}>
                    Kelas {k.replace('_', ' ')} {target > 0 ? `(${target} JP)` : '(Belum ada beban di Jadwal Guru)'}
                  </option>
                );
              })}
            </select>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
              <span
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  padding: '6px 12px',
                  borderRadius: '999px',
                  background: expectedClassJP > 0 && scheduledRegularJP === expectedClassJP ? '#dcfce7' : '#fef3c7',
                  color: expectedClassJP > 0 && scheduledRegularJP === expectedClassJP ? '#166534' : '#92400e',
                  border: '1px solid #cbd5e1',
                }}
              >
                KBM Terjadwal: {scheduledRegularJP} / {expectedClassJP} JP
              </span>
              <span
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  padding: '6px 12px',
                  borderRadius: '999px',
                  background: allClashes.length === 0 ? '#e0f2fe' : '#fee2e2',
                  color: allClashes.length === 0 ? '#0369a1' : '#991b1b',
                  border: '1px solid #cbd5e1',
                }}
              >
                {allClashes.length === 0
                  ? '0 Bentrok Guru (Semua Kelas)'
                  : `${allClashes.length} Slot Bentrok Guru`}
              </span>
            </div>
          </div>

          {editMode && isAdmin && (
            <div style={{ padding: '10px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', fontSize: '0.85rem', color: '#92400e', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <span>
                {swapSource
                  ? `Mode Tukar Aktif: Pilih slot tujuan untuk ditukar dengan ${swapSource.hari} Jam ke-${swapSource.jamKe} (atau klik lagi untuk batal).`
                  : 'Mode Edit Aktif: Klik sel jadwal mana saja untuk mengganti mapel/guru, menghapus, atau menukar jam pelajaran.'}
              </span>
              {swapSource && (
                <button
                  onClick={() => setSwapSource(null)}
                  style={{ background: 'white', border: '1px solid #f59e0b', color: '#b45309', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                >
                  Batalkan Tukar
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <div className={styles.card}>
        {loading ? (
          <InlineLoading message="Memuat data jadwal..." />
        ) : activeTab === 'guru' ? (
          filteredList.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <p>Tidak ada data jadwal ditemukan.</p>
            </div>
          ) : (
            <div key="wrapper-guru" className={styles.tableWrapper}>
            <table className={`${styles.table} ${styles.tableGuru}`}>
              <thead>
                <tr>
                  <th rowSpan={2}>Kode</th>
                  <th rowSpan={2} className={styles.textLeft}>Nama Guru</th>
                  <th rowSpan={2}>Status</th>
                  <th rowSpan={2}>Mata Pelajaran</th>
                  <th colSpan={9}>Kelas VII</th>
                  <th colSpan={9}>Kelas VIII</th>
                  <th colSpan={9}>Kelas IX</th>
                  <th rowSpan={2}>JML</th>
                  <th rowSpan={2}>KET.</th>
                  {isAdmin && <th rowSpan={2}>Aksi</th>}
                </tr>
                <tr>
                  {KELAS_VII.map(k => <th key={`7${k}`}>{k}</th>)}
                  {KELAS_VIII.map(k => <th key={`8${k}`}>{k}</th>)}
                  {KELAS_IX.map(k => <th key={`9${k}`}>{k}</th>)}
                </tr>
              </thead>
              <tbody>
                {filteredList.map((item, idx) => {
                  const isCurrentUser = currentUsername.toLowerCase().includes(item.namaGuru?.toLowerCase()) && item.namaGuru.length > 3;
                  return (
                    <tr key={item.id} style={{ backgroundColor: isCurrentUser ? '#f0fdf4' : 'transparent' }}>
                      <td>{item.kodeGuru}</td>
                      <td className={styles.textLeft} style={{ fontWeight: isCurrentUser ? 700 : 500 }}>
                        {item.namaGuru} {isCurrentUser && <i className="fas fa-star" style={{color: '#f59e0b', fontSize: '10px', marginLeft: '4px'}}></i>}
                      </td>
                      <td>{item.statusGuru}</td>
                      <td style={{ fontWeight: 600 }}>{item.mataPelajaran}</td>
                      
                      {KELAS_VII.map(k => <td key={`7${k}`}>{item[`VII_${k}`] || '-'}</td>)}
                      {KELAS_VIII.map(k => <td key={`8${k}`}>{item[`VIII_${k}`] || '-'}</td>)}
                      {KELAS_IX.map(k => <td key={`9${k}`}>{item[`IX_${k}`] || '-'}</td>)}
                      
                      <td style={{ fontWeight: 'bold' }}>{item.totalJam || '0'}</td>
                      <td>{item.keterangan || '-'}</td>
                      
                      {isAdmin && (
                        <td>
                          <div className={styles.actionBtns}>
                            <button className={styles.editBtn} onClick={() => openEditModal(item)} title="Edit"><i className="fas fa-edit"></i></button>
                            <button className={styles.deleteBtn} onClick={() => handleDelete(item.id)} title="Hapus"><i className="fas fa-trash"></i></button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          )
        ) : (
          loadingPelajaran ? (
            <InlineLoading message="Memuat jadwal kelas..." />
          ) : classTimetable.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <i className="fas fa-calendar-times" style={{ fontSize: '40px', color: '#cbd5e1', marginBottom: '12px', display: 'block' }}></i>
              <p style={{ margin: '0 0 12px 0', fontSize: '0.95rem' }}>
                {expectedClassJP > 0
                  ? `Belum ada jadwal tersusun untuk kelas ${selectedKelas.replace('_', ' ')} (${expectedClassJP} JP di Jadwal Guru).`
                  : `Kelas ${selectedKelas.replace('_', ' ')} tidak memiliki alokasi jam di Jadwal Guru.`}
              </p>
              {isAdmin && expectedClassJP > 0 && (
                <button
                  onClick={handleGenerateJadwalKelas}
                  disabled={generatingKelas}
                  style={{
                    background: '#0ea5e9',
                    color: 'white',
                    border: 'none',
                    padding: '10px 18px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <i className={generatingKelas ? 'fas fa-spinner fa-spin' : 'fas fa-magic'}></i>
                  Generate Jadwal Kelas dari Jadwal Guru
                </button>
              )}
            </div>
          ) : (
            <div>
              <div key="wrapper-kelas" className={styles.tableWrapper}>
                <table className={styles.table} style={{ minWidth: '860px', tableLayout: 'fixed' }}>
                  <thead>
                    <tr style={{ background: '#1e3a5f', color: 'white' }}>
                      <th style={{ padding: '8px 4px', fontSize: '0.75rem', textAlign: 'center', width: '56px' }}>Jam Ke</th>
                      {DAYS.map(day => (
                        <th key={day} style={{ padding: '8px 4px', fontSize: '0.75rem', textAlign: 'center', width: '15.5%' }}>{day}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {jamKeList.map((jam) => (
                      <tr key={jam} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ fontWeight: 'bold', background: '#f8fafc', fontSize: '0.8rem', textAlign: 'center' }}>{jam}</td>
                        {DAYS.map(day => {
                          const entry = getCellData(day, jam);
                          const clashClasses = clashCellMap.get(`${day}|${jam}`);
                          const isSwapSrc = swapSource?.hari === day && swapSource?.jamKe === jam;
                          const isPK = Boolean(entry?.isPK || entry?.kodeGuru === 'PK');
                          return (
                            <td
                              key={`${day}-${jam}`}
                              onClick={() => handleCellClick(day, jam)}
                              style={{
                                padding: '5px',
                                verticalAlign: 'middle',
                                height: '54px',
                                whiteSpace: 'normal',
                                wordBreak: 'break-word',
                                cursor: editMode && isAdmin ? 'pointer' : 'default',
                                background: isSwapSrc
                                  ? '#fef08a'
                                  : clashClasses
                                  ? '#fee2e2'
                                  : isPK
                                  ? '#fef3c7'
                                  : undefined,
                                outline: isSwapSrc
                                  ? '2px solid #eab308'
                                  : editMode && isAdmin
                                  ? '1px dashed #cbd5e1'
                                  : undefined,
                              }}
                              title={
                                clashClasses
                                  ? `Bentrok dengan kelas: ${clashClasses.map(c => c.replace('_', ' ')).join(', ')}`
                                  : editMode && isAdmin
                                  ? 'Klik untuk edit atau tukar slot'
                                  : undefined
                              }
                            >
                              {entry ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'center', lineHeight: '1.2' }}>
                                  <span style={{ fontWeight: 700, color: isPK ? '#92400e' : '#1e3a5f', fontSize: '0.72rem' }}>
                                    {entry.mataPelajaran}
                                  </span>
                                  <span style={{ fontSize: '0.62rem', color: isPK ? '#b45309' : '#64748b', wordWrap: 'break-word' }}>
                                    {isPK ? 'Program Khusus' : `${entry.namaGuru} (${entry.kodeGuru})`}
                                  </span>
                                  {clashClasses && (
                                    <span style={{ fontSize: '0.6rem', color: '#dc2626', fontWeight: 700 }}>
                                      Bentrok: {clashClasses.map(c => c.replace('_', ' ')).join(', ')}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span style={{ color: '#cbd5e1' }}>-</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {classRequirements.length > 0 && (
                <div style={{ padding: '14px 16px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                    Kesesuaian Jam per Mapel (Kelas {selectedKelas.replace('_', ' ')}):
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {classRequirements.map((req, idx) => {
                      const matched = req.scheduledJP === req.targetJP;
                      return (
                        <span
                          key={`${req.kodeGuru}-${req.mataPelajaran}-${idx}`}
                          style={{
                            fontSize: '0.74rem',
                            padding: '4px 10px',
                            borderRadius: '999px',
                            background: matched ? '#dcfce7' : '#fef3c7',
                            color: matched ? '#166534' : '#92400e',
                            border: `1px solid ${matched ? '#86efac' : '#fde68a'}`,
                            fontWeight: 600,
                          }}
                          title={req.namaGuru}
                        >
                          {req.mataPelajaran} ({req.kodeGuru}): {req.scheduledJP}/{req.targetJP} JP {matched ? '✓' : ''}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        )}
      </div>

      {showModal && isAdmin && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3 className={styles.modalTitle}>{formData.id ? 'Edit Jadwal Mengajar' : 'Tambah Jadwal Mengajar'}</h3>
            
            <div className={styles.formGrid}>
              <div className={styles.inputGroup}>
                <label>Kode Guru (Urutan di Excel)</label>
                <input 
                  type="text" 
                  value={formData.kodeGuru || ''} 
                  onChange={(e) => handleInputChange('kodeGuru', e.target.value)}
                  placeholder="Misal: 1"
                />
              </div>
              
              <div className={styles.inputGroup}>
                <label>Nama Guru</label>
                <input 
                  type="text" 
                  list="guru-options"
                  value={formData.namaGuru || ''} 
                  onChange={(e) => handleInputChange('namaGuru', e.target.value)}
                  placeholder="Ketik atau pilih nama guru..."
                />
                <datalist id="guru-options">
                  {guruList.map(g => (
                    <option key={g.id} value={g.nama} />
                  ))}
                </datalist>
              </div>

              <div className={styles.inputGroup}>
                <label>Status Guru</label>
                <select 
                  value={formData.statusGuru || 'GTY'} 
                  onChange={(e) => handleInputChange('statusGuru', e.target.value)}
                >
                  {STATUS_GURU.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className={styles.inputGroup}>
                <label>Mata Pelajaran</label>
                <select 
                  value={formData.mataPelajaran || ''} 
                  onChange={(e) => handleInputChange('mataPelajaran', e.target.value)}
                >
                  <option value="" disabled>-- Pilih Mapel --</option>
                  {mapelList.map(m => (
                    <option key={m.id} value={m.namaMapel}>{m.namaMapel}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.sectionTitle}>Beban Jam Kelas VII</div>
            <div className={styles.kelasGrid}>
              {KELAS_VII.map(k => (
                <div key={k} className={styles.kelasItem}>
                  <label>{k}</label>
                  <input type="text" maxLength={2} value={formData[`VII_${k}`] || ''} onChange={(e) => handleJamChange('VII', k, e.target.value)} />
                </div>
              ))}
            </div>

            <div className={styles.sectionTitle} style={{marginTop: '16px'}}>Beban Jam Kelas VIII</div>
            <div className={styles.kelasGrid}>
              {KELAS_VIII.map(k => (
                <div key={k} className={styles.kelasItem}>
                  <label>{k}</label>
                  <input type="text" maxLength={2} value={formData[`VIII_${k}`] || ''} onChange={(e) => handleJamChange('VIII', k, e.target.value)} />
                </div>
              ))}
            </div>

            <div className={styles.sectionTitle} style={{marginTop: '16px'}}>Beban Jam Kelas IX</div>
            <div className={styles.kelasGrid}>
              {KELAS_IX.map(k => (
                <div key={k} className={styles.kelasItem}>
                  <label>{k}</label>
                  <input type="text" maxLength={2} value={formData[`IX_${k}`] || ''} onChange={(e) => handleJamChange('IX', k, e.target.value)} />
                </div>
              ))}
            </div>

            <div className={styles.formGrid} style={{ marginTop: '20px' }}>
              <div className={styles.inputGroup} style={{ gridColumn: 'span 2' }}>
                <label>Keterangan Tambahan</label>
                <input 
                  type="text" 
                  value={formData.keterangan || ''} 
                  onChange={(e) => handleInputChange('keterangan', e.target.value)}
                  placeholder="Opsional, misal: GUSER, WAKAMAD"
                />
              </div>
            </div>

            <div className={styles.summary}>
              <span>Total Jam Keseluruhan:</span>
              <span style={{ fontSize: '1.25rem', color: 'var(--primary)' }}>{calculateTotal()} Jam</span>
            </div>

            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setShowModal(false)} disabled={saving}>Batal</button>
              <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
                {saving ? 'Menyimpan...' : 'Simpan Jadwal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editSlot && isAdmin && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: '520px' }}>
            <h3 className={styles.modalTitle}>
              Edit Slot Kelas {selectedKelas.replace('_', ' ')} — {editSlot.hari} Jam ke-{editSlot.jamKe}
            </h3>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
              <button
                onClick={() => {
                  setSwapSource(editSlot);
                  setEditSlot(null);
                }}
                style={{
                  background: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <i className="fas fa-exchange-alt"></i> Tukar dengan Slot Lain
              </button>
              <button
                onClick={() => handleAssignSlot({ mode: 'pk' })}
                style={{
                  background: '#fef3c7',
                  color: '#92400e',
                  border: '1px solid #fde68a',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                }}
              >
                Set Program Khusus (PK)
              </button>
              <button
                onClick={() => handleAssignSlot({ mode: 'empty' })}
                style={{
                  background: '#fef2f2',
                  color: '#dc2626',
                  border: '1px solid #fecaca',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                }}
              >
                Kosongkan Slot
              </button>
            </div>

            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
              Pilih Guru &amp; Mapel Kelas {selectedKelas.replace('_', ' ')}:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '300px', overflowY: 'auto' }}>
              {classRequirements.map((req, idx) => {
                const busyOtherClass = jadwalPelajaran.find(
                  e =>
                    e.hari === editSlot.hari &&
                    Number(e.jamKe) === editSlot.jamKe &&
                    e.kodeGuru === req.kodeGuru &&
                    e.kelas !== selectedKelas &&
                    !e.isPK
                );
                return (
                  <button
                    key={`${req.kodeGuru}-${req.mataPelajaran}-${idx}`}
                    onClick={() =>
                      handleAssignSlot({
                        mode: 'teacher',
                        kodeGuru: req.kodeGuru,
                        namaGuru: req.namaGuru,
                        mataPelajaran: req.mataPelajaran,
                      })
                    }
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: `1px solid ${busyOtherClass ? '#fecaca' : '#cbd5e1'}`,
                      background: busyOtherClass ? '#fef2f2' : '#f8fafc',
                      cursor: 'pointer',
                      textAlign: 'left',
                      gap: '8px',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#1e3a5f' }}>
                        {req.mataPelajaran}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        {req.namaGuru} (Kode {req.kodeGuru})
                        {busyOtherClass && (
                          <span style={{ color: '#dc2626', fontWeight: 600, marginLeft: '6px' }}>
                            • Bentrok di {busyOtherClass.kelas.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '999px',
                        background: req.scheduledJP === req.targetJP ? '#dcfce7' : '#e0f2fe',
                        color: req.scheduledJP === req.targetJP ? '#166534' : '#0369a1',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {req.scheduledJP}/{req.targetJP} JP
                    </span>
                  </button>
                );
              })}
            </div>

            <div className={styles.modalActions} style={{ marginTop: '16px' }}>
              <button className={styles.cancelBtn} onClick={() => setEditSlot(null)}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
