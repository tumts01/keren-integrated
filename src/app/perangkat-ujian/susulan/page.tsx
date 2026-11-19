'use client';
import { useState, useRef, useEffect, useMemo } from 'react';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import InlineLoading from '@/components/InlineLoading';
import { supabase } from '@/lib/supabase';
import PaginationBar from '../components/PaginationBar';

interface Participant {
  nisn: string;
  noUjian: string;
  ruang: string;
  nama?: string;
  kelas?: string;
  foto?: string;
}

interface InputRow {
  id?: number;
  nisn: string;
  nama: string;
  kelas: string;
  ruang: string;
  noUjian: string;
  mapel: string;
  isSelesai?: boolean;
  isEditing: boolean;
}

const SearchableSelect = ({ value, options, onChange, placeholder }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((o: any) => o.value === value);
  const filteredOptions = options.filter((o: any) => o.label.toLowerCase().includes(search.toLowerCase()));

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%', minWidth: '180px' }}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: 'white', cursor: 'pointer', minHeight: '38px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <span style={{ color: selectedOption ? '#334155' : '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.95rem' }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <i className="fas fa-chevron-down" style={{ fontSize: '12px', color: '#94a3b8' }}></i>
      </div>

      {isOpen && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '4px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
          <div style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari..."
              style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none', fontSize: '0.9rem' }}
            />
          </div>
          <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
            {filteredOptions.length === 0 ? (
              <div style={{ padding: '12px', color: '#94a3b8', textAlign: 'center', fontSize: '0.9rem' }}>Tidak ditemukan</div>
            ) : (
              filteredOptions.map((o: any) => (
                <div
                  key={o.value}
                  onClick={() => {
                    onChange(o.value);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  style={{ padding: '10px 12px', cursor: 'pointer', background: o.value === value ? '#e0f2fe' : 'transparent', color: o.value === value ? '#0369a1' : '#334155', fontSize: '0.9rem', borderBottom: '1px solid #f1f5f9' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = o.value === value ? '#e0f2fe' : 'transparent')}
                >
                  {o.label}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default function SusulanPage() {
  const [activeTab, setActiveTab] = useState<'rekap-data' | 'input'>('rekap-data');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [pulling, setPulling] = useState(false);

  // Rekap Data search & pagination (max 50 rows/page)
  const [rekapSearch, setRekapSearch] = useState('');
  const [rekapPage, setRekapPage] = useState(1);
  const [rekapPageSize, setRekapPageSize] = useState(50);

  // Input Tab states
  const [mapelList, setMapelList] = useState<string[]>([]);
  const [inputRows, setInputRows] = useState<InputRow[]>([]);
  const [isFetchingInput, setIsFetchingInput] = useState(false);
  const [resettingInput, setResettingInput] = useState(false);
  const [inputSearch, setInputSearch] = useState('');
  const [inputFilterStatus, setInputFilterStatus] = useState('Semua');
  const [inputFilterRuang, setInputFilterRuang] = useState('Semua');
  const [inputPage, setInputPage] = useState(1);
  const [inputPageSize, setInputPageSize] = useState(50);

  // Load existing data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch participants (Rekap Data)
        const resPart = await fetch('/api/perangkat-ujian/susulan');
        const resData = await resPart.json();
        if (resData.success && resData.data) {
          const loaded: Participant[] = resData.data.map((row: any) => ({
            nisn: row.metadata?.['NISN'] || '',
            nama: row.metadata?.['NAMA'] || '',
            kelas: row.metadata?.['KELAS'] || '',
            noUjian: row.metadata?.['NO UJIAN'] || '',
            ruang: row.metadata?.['RUANG'] || ''
          }));
          setParticipants(loaded);
        }

        // Fetch Mapel list
        const resMapel = await fetch('/api/jadwal/mapel');
        const mapelData = await resMapel.json();
        if (mapelData.success && mapelData.data) {
          setMapelList(mapelData.data.map((m: any) => m.namaMapel));
        }

        // Fetch Input Rows
        setIsFetchingInput(true);
        const resInput = await fetch('/api/perangkat-ujian/susulan/input');
        const inputData = await resInput.json();
        if (inputData.success && inputData.data) {
          const loadedInputs: InputRow[] = inputData.data.map((row: any) => ({
            id: row.id,
            nisn: row.metadata?.nisn || '',
            nama: row.metadata?.nama || '',
            kelas: row.metadata?.kelas || '',
            ruang: row.metadata?.ruang || '',
            noUjian: row.metadata?.noUjian || '',
            mapel: row.metadata?.mapel || '',
            isSelesai: !!row.metadata?.isSelesai,
            isEditing: false
          }));
          setInputRows(loadedInputs);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsFetchingInput(false);
      }
    };
    fetchData();
  }, []);

  // --- Input Tab Handlers ---
  const handleAddInputRow = () => {
    setInputRows([{ id: undefined, nisn: '', nama: '', kelas: '', ruang: '', noUjian: '', mapel: '', isSelesai: false, isEditing: true }, ...inputRows]);
    setInputPage(1);
  };

  const handleInputRowChange = (index: number, field: keyof InputRow, value: string) => {
    const updated = [...inputRows];
    if (field === 'nisn') {
      // Auto-fill nama, kelas, dll
      const participant = participants.find(p => p.nisn === value);
      if (participant) {
        updated[index] = { ...updated[index], nisn: value, nama: participant.nama || '', kelas: participant.kelas || '', ruang: participant.ruang || '', noUjian: participant.noUjian || '' };
      } else {
        updated[index] = { ...updated[index], nisn: value, nama: '', kelas: '', ruang: '', noUjian: '' };
      }
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setInputRows(updated);
  };

  const handleSaveInputRow = async (index: number) => {
    const row = inputRows[index];
    if (!row.nisn || !row.mapel) {
      Swal.fire('Error', 'Nama dan Mapel harus diisi', 'error');
      return;
    }

    try {
      const action = row.id ? 'edit' : 'add';
      const payload = {
        nisn: row.nisn,
        nama: row.nama,
        kelas: row.kelas,
        ruang: row.ruang,
        noUjian: row.noUjian,
        mapel: row.mapel,
        isSelesai: row.isSelesai
      };

      const res = await fetch('/api/perangkat-ujian/susulan/input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, id: row.id, payload })
      });
      const resData = await res.json();
      
      if (resData.success) {
        const updated = [...inputRows];
        updated[index] = { ...updated[index], id: resData.data.id, isEditing: false };
        setInputRows(updated);
        Swal.fire({ icon: 'success', title: 'Tersimpan', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
      } else {
        Swal.fire('Error', resData.error || 'Gagal menyimpan', 'error');
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Terjadi kesalahan jaringan', 'error');
    }
  };

  const handleToggleSelesai = async (index: number) => {
    const row = inputRows[index];
    if (!row.id) return; // Only saved rows can be toggled

    const newStatus = !row.isSelesai;
    try {
      const payload = {
        nisn: row.nisn,
        nama: row.nama,
        kelas: row.kelas,
        ruang: row.ruang,
        noUjian: row.noUjian,
        mapel: row.mapel,
        isSelesai: newStatus
      };

      const res = await fetch('/api/perangkat-ujian/susulan/input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'edit', id: row.id, payload })
      });
      const resData = await res.json();
      
      if (resData.success) {
        const updated = [...inputRows];
        updated[index] = { ...updated[index], isSelesai: newStatus };
        setInputRows(updated);
        Swal.fire({ icon: 'success', title: newStatus ? 'Ditandai Selesai' : 'Batal Selesai', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Terjadi kesalahan jaringan', 'error');
    }
  };

  const handleDeleteInputRow = async (index: number) => {
    const row = inputRows[index];
    if (!row.id) {
      // Remove unsaved row directly
      setInputRows(inputRows.filter((_, i) => i !== index));
      return;
    }

    const { isConfirmed } = await Swal.fire({ title: 'Hapus data?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Ya, hapus!' });
    if (!isConfirmed) return;

    try {
      const res = await fetch('/api/perangkat-ujian/susulan/input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id: row.id })
      });
      const resData = await res.json();
      
      if (resData.success) {
        setInputRows(inputRows.filter((_, i) => i !== index));
      } else {
        Swal.fire('Error', resData.error || 'Gagal menghapus', 'error');
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Terjadi kesalahan jaringan', 'error');
    }
  };

  const handleExportInputExcel = () => {
    const rowsToExport = filteredInputRows.filter(
      (r) => r.nama || r.nisn || r.mapel
    );
    if (rowsToExport.length === 0) {
      Swal.fire('Info', 'Tidak ada data input susulan untuk diexport.', 'info');
      return;
    }

    const excelRows = rowsToExport.map((row, idx) => ({
      No: idx + 1,
      NISN: row.nisn || '-',
      'Nama Siswa': row.nama || '-',
      'No Ujian': row.noUjian || '-',
      Kelas: row.kelas || '-',
      Ruang: row.ruang || '-',
      'Mata Pelajaran': row.mapel || '-',
      'Status Susulan': row.isSelesai ? 'Selesai' : 'Belum Selesai',
    }));

    const ws = XLSX.utils.json_to_sheet(excelRows);
    ws['!cols'] = [
      { wch: 5 },
      { wch: 15 },
      { wch: 30 },
      { wch: 18 },
      { wch: 10 },
      { wch: 14 },
      { wch: 26 },
      { wch: 16 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data Input Susulan');

    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Data_Input_Susulan_${dateStr}.xlsx`);
  };

  const handleResetInputData = async () => {
    if (inputRows.length === 0) {
      Swal.fire('Info', 'Data input susulan sudah kosong.', 'info');
      return;
    }

    const { isConfirmed } = await Swal.fire({
      title: 'Reset Semua Data Input Susulan?',
      html: `Sebanyak <b>${inputRows.length}</b> baris data input susulan akan dihapus permanen.<br/><span style="color:#64748b;font-size:0.9rem;">Disarankan klik <b>Export Excel</b> terlebih dahulu jika data lama masih diperlukan sebagai arsip.</span>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Ya, Reset Semua',
      cancelButtonText: 'Batal',
    });

    if (!isConfirmed) return;

    setResettingInput(true);
    try {
      const res = await fetch('/api/perangkat-ujian/susulan/input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      });
      const resData = await res.json();

      if (resData.success) {
        setInputRows([]);
        setInputSearch('');
        setInputFilterStatus('Semua');
        setInputFilterRuang('Semua');
        setInputPage(1);
        Swal.fire({
          icon: 'success',
          title: 'Semua data input susulan berhasil direset',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 2000,
        });
      } else {
        Swal.fire('Error', resData.error || 'Gagal mereset data input susulan', 'error');
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Terjadi kesalahan jaringan', 'error');
    } finally {
      setResettingInput(false);
    }
  };
  // --------------------------

  const handlePullFromRoomConfig = async () => {
    setPulling(true);
    try {
      const { data, error } = await supabase
        .from('rapor_config')
        .select('value')
        .eq('key', 'konfigurasi_ruang_ujian')
        .maybeSingle();

      let rawValue: string | null = !error && data?.value ? data.value : null;
      if (!rawValue) {
        rawValue = localStorage.getItem('konfigurasi_ruang_ujian');
      }

      if (!rawValue) {
        Swal.fire(
          'Belum Ada Data',
          'Konfigurasi pembagian ruang belum tersimpan. Silakan bagi ruang terlebih dahulu di menu Perangkat Ujian.',
          'info'
        );
        return;
      }

      const parsed = JSON.parse(rawValue);
      if (!Array.isArray(parsed.assignments) || parsed.assignments.length === 0) {
        Swal.fire('Belum Ada Data', 'Data pembagian peserta di Konfigurasi Ruang masih kosong.', 'info');
        return;
      }

      const mapped: Participant[] = parsed.assignments
        .map((a: { nisn?: string; nama?: string; rombel?: string; kelas?: string; noUjian?: string; ruang?: string }) => ({
          nisn: String(a.nisn || ''),
          nama: a.nama || '-',
          kelas: a.rombel || a.kelas || '-',
          noUjian: a.noUjian || '-',
          ruang: a.ruang || '-'
        }))
        .filter((p: Participant) => p.nisn);

      const res = await fetch('/api/perangkat-ujian/susulan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participants: mapped })
      });
      const resData = await res.json();

      if (!resData.success) {
        Swal.fire(
          'Error',
          resData.error || 'Gagal menyimpan data susulan. Pastikan tabel data_susulan sudah ada.',
          'error'
        );
        return;
      }

      setParticipants(mapped);
      setRekapPage(1);
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: `${mapped.length} peserta berhasil ditarik & disimpan.`,
        showConfirmButton: false,
        timer: 2500
      });
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Gagal menarik data dari Konfigurasi Pembagian Ruang.', 'error');
    } finally {
      setPulling(false);
    }
  };

  const filteredParticipants = useMemo(() => {
    const q = rekapSearch.trim().toLowerCase();
    if (!q) return participants;
    return participants.filter(
      p =>
        (p.nama || '').toLowerCase().includes(q) ||
        (p.nisn || '').toLowerCase().includes(q) ||
        (p.kelas || '').toLowerCase().includes(q) ||
        (p.noUjian || '').toLowerCase().includes(q) ||
        (p.ruang || '').toLowerCase().includes(q)
    );
  }, [participants, rekapSearch]);

  const effectiveRekapPageSize = Math.min(50, rekapPageSize);
  const totalRekapPages = Math.max(1, Math.ceil(filteredParticipants.length / effectiveRekapPageSize));
  const safeRekapPage = Math.min(Math.max(1, rekapPage), totalRekapPages);
  const paginatedParticipants = useMemo(() => {
    const start = (safeRekapPage - 1) * effectiveRekapPageSize;
    return filteredParticipants.slice(start, start + effectiveRekapPageSize);
  }, [filteredParticipants, safeRekapPage, effectiveRekapPageSize]);

  const uniqueInputRuang = Array.from(new Set(inputRows.map(r => r.ruang).filter(Boolean))).sort();

  const filteredInputRows = useMemo(() => {
    const q = inputSearch.trim().toLowerCase();
    return inputRows.filter(row => {
      const matchesSearch =
        !q ||
        row.nama.toLowerCase().includes(q) ||
        row.mapel.toLowerCase().includes(q) ||
        row.kelas.toLowerCase().includes(q) ||
        row.ruang.toLowerCase().includes(q);

      let matchesStatus = true;
      if (inputFilterStatus === 'Selesai') matchesStatus = !!row.isSelesai;
      if (inputFilterStatus === 'Belum Selesai') matchesStatus = !row.isSelesai;

      const matchesRuang = inputFilterRuang === 'Semua' || row.ruang === inputFilterRuang;

      return matchesSearch && matchesStatus && matchesRuang;
    });
  }, [inputRows, inputSearch, inputFilterStatus, inputFilterRuang]);

  const effectiveInputPageSize = Math.min(50, inputPageSize);
  const totalInputPages = Math.max(1, Math.ceil(filteredInputRows.length / effectiveInputPageSize));
  const safeInputPage = Math.min(Math.max(1, inputPage), totalInputPages);
  const paginatedInputRows = useMemo(() => {
    const start = (safeInputPage - 1) * effectiveInputPageSize;
    return filteredInputRows.slice(start, start + effectiveInputPageSize);
  }, [filteredInputRows, safeInputPage, effectiveInputPageSize]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ background: 'white', padding: '24px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#1e293b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <i className="fas fa-file-alt" style={{ color: '#3b82f6' }}></i>
          Perangkat Ujian Susulan
        </h1>
        <p style={{ color: '#64748b' }}>Kelola data perangkat ujian susulan.</p>
      </div>

      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveTab('rekap-data')}
          style={{ padding: '12px 20px', background: 'none', border: 'none', borderBottom: activeTab === 'rekap-data' ? '3px solid #0ea5e9' : '3px solid transparent', color: activeTab === 'rekap-data' ? '#0ea5e9' : '#64748b', fontWeight: activeTab === 'rekap-data' ? 'bold' : 'normal', cursor: 'pointer', fontSize: '15px' }}
        >
          <i className="fas fa-database" style={{ marginRight: '8px' }}></i>
          Rekap Data
        </button>
        <button
          onClick={() => setActiveTab('input')}
          style={{ padding: '12px 20px', background: 'none', border: 'none', borderBottom: activeTab === 'input' ? '3px solid #0ea5e9' : '3px solid transparent', color: activeTab === 'input' ? '#0ea5e9' : '#64748b', fontWeight: activeTab === 'input' ? 'bold' : 'normal', cursor: 'pointer', fontSize: '15px' }}
        >
          <i className="fas fa-edit" style={{ marginRight: '8px' }}></i>
          Input
        </button>
      </div>

      <div style={{ background: 'white', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', minHeight: '400px' }}>
        {activeTab === 'rekap-data' && (
          <div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#334155', margin: 0, display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 auto' }}>
                Rekap Data Susulan
                {participants.length > 0 && (
                  <span style={{ fontSize: '13px', padding: '4px 10px', background: '#e2e8f0', color: '#475569', borderRadius: '12px', fontWeight: 'normal' }}>
                    {participants.length} Peserta
                  </span>
                )}
              </h2>
              {participants.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', minWidth: '220px' }}>
                  <i className="fas fa-search" style={{ color: '#94a3b8', marginRight: '8px' }}></i>
                  <input
                    type="text"
                    placeholder="Cari nama / NISN / kelas / ruang..."
                    value={rekapSearch}
                    onChange={(e) => {
                      setRekapSearch(e.target.value);
                      setRekapPage(1);
                    }}
                    style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.9rem' }}
                  />
                </div>
              )}
              <button
                onClick={handlePullFromRoomConfig}
                disabled={pulling}
                style={{
                  padding: '8px 16px',
                  background: pulling ? '#94a3b8' : '#0ea5e9',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: pulling ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: 'white',
                  fontWeight: 'bold',
                  whiteSpace: 'nowrap',
                  fontSize: '0.9rem'
                }}
              >
                <i className={pulling ? 'fas fa-spinner fa-spin' : 'fas fa-sync-alt'}></i>
                {pulling ? 'Menarik Data...' : 'Tarik Data Pembagian Ruang'}
              </button>
            </div>

            {participants.length > 0 ? (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                        <th style={{ padding: '12px', textAlign: 'center', color: '#475569', width: '56px' }}>No</th>
                        <th style={{ padding: '12px', textAlign: 'left', color: '#475569' }}>NISN</th>
                        <th style={{ padding: '12px', textAlign: 'left', color: '#475569' }}>Nama Siswa</th>
                        <th style={{ padding: '12px', textAlign: 'left', color: '#475569' }}>Kelas</th>
                        <th style={{ padding: '12px', textAlign: 'left', color: '#475569' }}>No Ujian</th>
                        <th style={{ padding: '12px', textAlign: 'left', color: '#475569' }}>Ruang</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedParticipants.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                            Tidak ada peserta yang sesuai dengan pencarian.
                          </td>
                        </tr>
                      ) : (
                        paginatedParticipants.map((p, idx) => (
                          <tr key={`${p.nisn}-${idx}`} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '12px', textAlign: 'center', color: '#64748b' }}>
                              {(safeRekapPage - 1) * effectiveRekapPageSize + idx + 1}
                            </td>
                            <td style={{ padding: '12px' }}>{p.nisn}</td>
                            <td style={{ padding: '12px', fontWeight: 'bold', color: '#334155' }}>{p.nama}</td>
                            <td style={{ padding: '12px' }}>{p.kelas}</td>
                            <td style={{ padding: '12px' }}>
                              <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 8px', borderRadius: '4px' }}>{p.noUjian}</span>
                            </td>
                            <td style={{ padding: '12px' }}>{p.ruang}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <PaginationBar
                  totalItems={filteredParticipants.length}
                  currentPage={safeRekapPage}
                  pageSize={effectiveRekapPageSize}
                  onPageChange={setRekapPage}
                  onPageSizeChange={(size) => {
                    setRekapPageSize(Math.min(50, size));
                    setRekapPage(1);
                  }}
                  pageSizeOptions={[25, 50]}
                />
              </>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                <i className="fas fa-door-open" style={{ fontSize: '48px', color: '#cbd5e1', marginBottom: '16px', display: 'block' }}></i>
                Belum ada data. Klik &quot;Tarik Data Pembagian Ruang&quot; untuk memuat data peserta.
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'input' && (
          <div>
            {/* Header toolbar — wraps on mobile */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'flex-start', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#334155', margin: 0, width: '100%' }}>
                Input Data Susulan
              </h2>

              {/* Search */}
              <div style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', flex: '1 1 200px', minWidth: '160px' }}>
                <i className="fas fa-search" style={{ color: '#94a3b8', marginRight: '8px' }}></i>
                <input 
                  type="text" 
                  placeholder="Cari siswa / mapel..." 
                  value={inputSearch}
                  onChange={(e) => {
                    setInputSearch(e.target.value);
                    setInputPage(1);
                  }}
                  style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.9rem' }}
                />
              </div>

              {/* Filter Status */}
              <select 
                value={inputFilterStatus} 
                onChange={(e) => {
                  setInputFilterStatus(e.target.value);
                  setInputPage(1);
                }}
                style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem', color: '#475569', flex: '1 1 130px', minWidth: '120px' }}
              >
                <option value="Semua">Semua Status</option>
                <option value="Selesai">Selesai</option>
                <option value="Belum Selesai">Belum Selesai</option>
              </select>

              {/* Filter Ruang */}
              <select 
                value={inputFilterRuang} 
                onChange={(e) => {
                  setInputFilterRuang(e.target.value);
                  setInputPage(1);
                }}
                style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem', color: '#475569', flex: '1 1 120px', minWidth: '110px' }}
              >
                <option value="Semua">Semua Ruang</option>
                {uniqueInputRuang.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>

              {/* Tambah Baris, Export Excel & Reset */}
              <button onClick={handleAddInputRow} style={{ padding: '8px 16px', background: '#3b82f6', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: 'white', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                <i className="fas fa-plus"></i> Tambah Baris
              </button>
              <button
                onClick={handleExportInputExcel}
                disabled={filteredInputRows.length === 0}
                style={{
                  padding: '8px 16px',
                  background: filteredInputRows.length === 0 ? '#cbd5e1' : '#10b981',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: filteredInputRows.length === 0 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: 'white',
                  fontWeight: 'bold',
                  whiteSpace: 'nowrap'
                }}
              >
                <i className="fas fa-file-excel"></i> Export Excel
              </button>
              <button
                onClick={handleResetInputData}
                disabled={inputRows.length === 0 || resettingInput}
                style={{
                  padding: '8px 16px',
                  background: inputRows.length === 0 || resettingInput ? '#cbd5e1' : '#ef4444',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: inputRows.length === 0 || resettingInput ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: 'white',
                  fontWeight: 'bold',
                  whiteSpace: 'nowrap'
                }}
              >
                <i className={resettingInput ? 'fas fa-spinner fa-spin' : 'fas fa-redo'}></i> {resettingInput ? 'Mereset...' : 'Reset'}
              </button>
            </div>

            {isFetchingInput ? (
          <InlineLoading message="Memuat data..." />
        ) : inputRows.length > 0 ? (
              /* Horizontal scroll wrapper so the table doesn't overflow on mobile */
              <>
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                        <th style={{ padding: '12px', textAlign: 'left', color: '#475569', whiteSpace: 'nowrap' }}>Nama Siswa</th>
                        <th style={{ padding: '12px', textAlign: 'center', color: '#475569', width: '80px', whiteSpace: 'nowrap' }}>Susulan</th>
                        <th style={{ padding: '12px', textAlign: 'left', color: '#475569', whiteSpace: 'nowrap' }}>Mata Pelajaran</th>
                        <th style={{ padding: '12px', textAlign: 'left', color: '#475569', whiteSpace: 'nowrap' }}>Kelas</th>
                        <th style={{ padding: '12px', textAlign: 'left', color: '#475569', whiteSpace: 'nowrap' }}>Ruang</th>
                        <th style={{ padding: '12px', textAlign: 'center', color: '#475569', width: '140px', whiteSpace: 'nowrap' }}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedInputRows.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                            Tidak ada data yang sesuai dengan pencarian atau filter.
                          </td>
                        </tr>
                      ) : (
                        paginatedInputRows.map((row) => {
                          const idx = inputRows.findIndex(r => r === row);
                          return (
                            <tr key={row.id ?? `new-${idx}`} style={{ borderBottom: '1px solid #e2e8f0', background: row.isSelesai ? '#ecfdf5' : 'transparent' }}>
                              <td style={{ padding: '12px', minWidth: '160px' }}>
                                {row.isEditing ? (
                                  <SearchableSelect 
                                    value={row.nisn} 
                                    onChange={(val: string) => handleInputRowChange(idx, 'nisn', val)}
                                    placeholder="Pilih Siswa..."
                                    options={participants.map(p => ({ value: p.nisn, label: p.nama }))}
                                  />
                                ) : (
                                  <span style={{ fontWeight: 'bold', color: '#334155' }}>{row.nama}</span>
                                )}
                              </td>
                              <td style={{ padding: '12px', textAlign: 'center' }}>
                                {row.isSelesai ? (
                                  <i className="fas fa-check-circle" style={{ color: '#10b981', fontSize: '1.2rem' }}></i>
                                ) : (
                                  <span style={{ color: '#cbd5e1' }}>-</span>
                                )}
                              </td>
                              <td style={{ padding: '12px', minWidth: '150px' }}>
                                {row.isEditing ? (
                                  <SearchableSelect 
                                    value={row.mapel} 
                                    onChange={(val: string) => handleInputRowChange(idx, 'mapel', val)}
                                    placeholder="Pilih Mata Pelajaran..."
                                    options={mapelList.map(m => ({ value: m, label: m }))}
                                  />
                                ) : (
                                  <span>{row.mapel}</span>
                                )}
                              </td>
                              <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>{row.kelas}</td>
                              <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>{row.ruang}</td>
                              <td style={{ padding: '12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                {row.isEditing ? (
                                  <button onClick={() => handleSaveInputRow(idx)} style={{ background: '#10b981', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', marginRight: '4px' }} title="Simpan">
                                    <i className="fas fa-save"></i>
                                  </button>
                                ) : (
                                  <>
                                    <button 
                                      onClick={() => handleToggleSelesai(idx)} 
                                      style={{ background: row.isSelesai ? '#64748b' : '#3b82f6', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', marginRight: '4px' }}
                                      title={row.isSelesai ? "Batalkan Selesai" : "Tandai Selesai"}
                                    >
                                      <i className={row.isSelesai ? "fas fa-undo" : "fas fa-check"}></i>
                                    </button>
                                    <button onClick={() => {
                                      const updated = [...inputRows];
                                      updated[idx].isEditing = true;
                                      setInputRows(updated);
                                    }} style={{ background: '#f59e0b', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', marginRight: '4px' }} title="Edit">
                                      <i className="fas fa-edit"></i>
                                    </button>
                                  </>
                                )}
                                <button onClick={() => handleDeleteInputRow(idx)} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer' }} title="Hapus">
                                  <i className="fas fa-trash"></i>
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                <PaginationBar
                  totalItems={filteredInputRows.length}
                  currentPage={safeInputPage}
                  pageSize={effectiveInputPageSize}
                  onPageChange={setInputPage}
                  onPageSizeChange={(size) => {
                    setInputPageSize(Math.min(50, size));
                    setInputPage(1);
                  }}
                  pageSizeOptions={[25, 50]}
                />
              </>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                <p>Belum ada data input susulan. Klik &quot;Tambah Baris&quot; untuk memulai.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
