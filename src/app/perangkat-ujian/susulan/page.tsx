'use client';
import { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';

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
  const [activeTab, setActiveTab] = useState<'rekap-data' | 'input' | 'rekap-susulan'>('rekap-data');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ nisn: '', noUjian: '', ruang: '' });

  // Input Tab states
  const [mapelList, setMapelList] = useState<string[]>([]);
  const [inputRows, setInputRows] = useState<InputRow[]>([]);
  const [isFetchingInput, setIsFetchingInput] = useState(false);
  const [inputSearch, setInputSearch] = useState('');
  const [inputFilterStatus, setInputFilterStatus] = useState('Semua');
  const [inputFilterKelas, setInputFilterKelas] = useState('Semua');

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
  // --------------------------

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/perangkat-ujian/susulan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participants })
      });
      const resData = await res.json();
      if (resData.success) {
        Swal.fire('Berhasil', 'Data Rekap Susulan berhasil disimpan', 'success');
      } else {
        Swal.fire('Error', resData.error || 'Gagal menyimpan data. Pastikan tabel data_susulan sudah ada.', 'error');
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Terjadi kesalahan sistem', 'error');
    }
    setSaving(false);
  };

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet([{ NISN: '1234567890', 'NO UJIAN': '001-01', RUANG: 'Ruang 1' }]);
    XLSX.utils.book_append_sheet(wb, ws, 'Template Susulan');
    XLSX.writeFile(wb, 'Template_Susulan.xlsx');
  };

  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nisn || !formData.noUjian || !formData.ruang) {
      Swal.fire('Error', 'Semua field harus diisi', 'error');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/perangkat-ujian/peserta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nisns: [formData.nisn] })
      });
      const resData = await res.json();
      
      if (!resData.success) {
        Swal.fire('Error', resData.error || 'Gagal memuat data peserta', 'error');
      } else {
        const dbData = resData.data;
        const match = dbData[formData.nisn];
        
        const newPart = {
          nisn: formData.nisn,
          noUjian: formData.noUjian,
          ruang: formData.ruang,
          nama: match?.nama || 'TIDAK DITEMUKAN',
          kelas: match?.rombel || '-'
        };
        
        setParticipants(prev => [...prev, newPart]);
        setIsModalOpen(false);
        setFormData({ nisn: '', noUjian: '', ruang: '' });
        Swal.fire('Berhasil', 'Siswa berhasil ditambahkan', 'success');
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Gagal menambahkan peserta', 'error');
    }
    setIsSubmitting(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

      if (rows.length === 0) {
        Swal.fire('Error', 'File Excel kosong', 'error');
        setLoading(false);
        return;
      }

      const parsed: Participant[] = rows.map(r => ({
        nisn: String(r['NISN'] || ''),
        noUjian: String(r['NO UJIAN'] || ''),
        ruang: String(r['RUANG'] || '')
      })).filter(p => p.nisn);

      // Fetch names from API
      const nisns = parsed.map(p => p.nisn);
      const res = await fetch('/api/perangkat-ujian/peserta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nisns })
      });
      const resData = await res.json();

      if (!resData.success) {
        Swal.fire('Error', resData.error || 'Gagal memuat data peserta', 'error');
      } else {
        const dbData = resData.data;
        const enriched = parsed.map(p => {
          const match = dbData[p.nisn];
          return {
            ...p,
            nama: match?.nama || 'TIDAK DITEMUKAN',
            kelas: match?.rombel || '-'
          };
        });
        setParticipants(enriched);
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Gagal membaca file Excel', 'error');
    }
    setLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uniqueInputKelas = Array.from(new Set(inputRows.map(r => r.kelas).filter(Boolean))).sort();

  const filteredInputRows = inputRows.filter(row => {
    const matchesSearch = row.nama.toLowerCase().includes(inputSearch.toLowerCase()) || 
                          row.mapel.toLowerCase().includes(inputSearch.toLowerCase());
    
    let matchesStatus = true;
    if (inputFilterStatus === 'Selesai') matchesStatus = !!row.isSelesai;
    if (inputFilterStatus === 'Belum Selesai') matchesStatus = !row.isSelesai;

    const matchesKelas = inputFilterKelas === 'Semua' || row.kelas === inputFilterKelas;

    return matchesSearch && matchesStatus && matchesKelas;
  });

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
        <button
          onClick={() => setActiveTab('rekap-susulan')}
          style={{ padding: '12px 20px', background: 'none', border: 'none', borderBottom: activeTab === 'rekap-susulan' ? '3px solid #0ea5e9' : '3px solid transparent', color: activeTab === 'rekap-susulan' ? '#0ea5e9' : '#64748b', fontWeight: activeTab === 'rekap-susulan' ? 'bold' : 'normal', cursor: 'pointer', fontSize: '15px' }}
        >
          <i className="fas fa-list-alt" style={{ marginRight: '8px' }}></i>
          Rekap Susulan
        </button>
      </div>

      <div style={{ background: 'white', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', minHeight: '400px' }}>
        {activeTab === 'rekap-data' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#334155', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                Rekap Data Susulan
                {participants.length > 0 && (
                  <span style={{ fontSize: '13px', padding: '4px 10px', background: '#e2e8f0', color: '#475569', borderRadius: '12px', fontWeight: 'normal' }}>
                    {participants.length} Peserta
                  </span>
                )}
              </h2>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={downloadTemplate} style={{ padding: '8px 16px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#475569' }}>
                  <i className="fas fa-download"></i> Template Excel
                </button>
                <button onClick={() => setIsModalOpen(true)} style={{ padding: '8px 16px', background: '#f59e0b', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: 'white', fontWeight: 'bold' }}>
                  <i className="fas fa-plus"></i> Tambah Data
                </button>
                <label style={{ padding: '8px 16px', background: '#3b82f6', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: 'white', fontWeight: 'bold' }}>
                  <i className="fas fa-upload"></i> {loading ? 'Memproses...' : 'Import Data'}
                  <input type="file" accept=".xlsx, .xls" style={{ display: 'none' }} ref={fileInputRef} onChange={handleFileUpload} disabled={loading} />
                </label>
                {participants.length > 0 && (
                  <button onClick={handleSave} disabled={saving} style={{ padding: '8px 16px', background: saving ? '#94a3b8' : '#10b981', border: 'none', borderRadius: '6px', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: 'white', fontWeight: 'bold' }}>
                    <i className={saving ? 'fas fa-spinner fa-spin' : 'fas fa-save'}></i> {saving ? 'Menyimpan...' : 'Simpan'}
                  </button>
                )}
              </div>
            </div>

            {participants.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '12px', textAlign: 'left', color: '#475569' }}>NISN</th>
                      <th style={{ padding: '12px', textAlign: 'left', color: '#475569' }}>Nama Siswa</th>
                      <th style={{ padding: '12px', textAlign: 'left', color: '#475569' }}>Kelas</th>
                      <th style={{ padding: '12px', textAlign: 'left', color: '#475569' }}>No Ujian</th>
                      <th style={{ padding: '12px', textAlign: 'left', color: '#475569' }}>Ruang</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participants.map((p, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '12px' }}>{p.nisn}</td>
                        <td style={{ padding: '12px', fontWeight: 'bold', color: '#334155' }}>{p.nama}</td>
                        <td style={{ padding: '12px' }}>{p.kelas}</td>
                        <td style={{ padding: '12px' }}>
                          <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 8px', borderRadius: '4px' }}>{p.noUjian}</span>
                        </td>
                        <td style={{ padding: '12px' }}>{p.ruang}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                <i className="fas fa-file-excel" style={{ fontSize: '48px', color: '#cbd5e1', marginBottom: '16px', display: 'block' }}></i>
                Belum ada data. Silakan import file Excel terlebih dahulu.
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'input' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#334155', margin: 0 }}>
                Input Data Susulan
              </h2>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                  <i className="fas fa-search" style={{ color: '#94a3b8', marginRight: '8px' }}></i>
                  <input 
                    type="text" 
                    placeholder="Cari siswa / mapel..." 
                    value={inputSearch}
                    onChange={(e) => setInputSearch(e.target.value)}
                    style={{ border: 'none', background: 'transparent', outline: 'none', width: '200px', fontSize: '0.9rem' }}
                  />
                </div>
                <select 
                  value={inputFilterStatus} 
                  onChange={(e) => setInputFilterStatus(e.target.value)}
                  style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem', color: '#475569' }}
                >
                  <option value="Semua">Semua Status</option>
                  <option value="Selesai">Selesai</option>
                  <option value="Belum Selesai">Belum Selesai</option>
                </select>
                <select 
                  value={inputFilterKelas} 
                  onChange={(e) => setInputFilterKelas(e.target.value)}
                  style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem', color: '#475569' }}
                >
                  <option value="Semua">Semua Kelas</option>
                  {uniqueInputKelas.map(k => (
                    <option key={k} value={k}>Kelas {k}</option>
                  ))}
                </select>
                <button onClick={handleAddInputRow} style={{ padding: '8px 16px', background: '#3b82f6', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: 'white', fontWeight: 'bold', marginLeft: '12px' }}>
                  <i className="fas fa-plus"></i> Tambah Baris
                </button>
              </div>
            </div>

            {isFetchingInput ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}><i className="fas fa-spinner fa-spin"></i> Memuat data...</div>
            ) : inputRows.length > 0 ? (
              <div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '12px', textAlign: 'left', color: '#475569' }}>Nama Siswa</th>
                      <th style={{ padding: '12px', textAlign: 'center', color: '#475569', width: '90px' }}>Susulan</th>
                      <th style={{ padding: '12px', textAlign: 'left', color: '#475569' }}>Mata Pelajaran</th>
                      <th style={{ padding: '12px', textAlign: 'left', color: '#475569' }}>Kelas</th>
                      <th style={{ padding: '12px', textAlign: 'left', color: '#475569' }}>Ruang</th>
                      <th style={{ padding: '12px', textAlign: 'center', color: '#475569', width: '150px' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInputRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                          Tidak ada data yang sesuai dengan pencarian atau filter.
                        </td>
                      </tr>
                    ) : (
                      filteredInputRows.map((row, _idx) => {
                        const idx = inputRows.findIndex(r => r === row);
                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', background: row.isSelesai ? '#ecfdf5' : 'transparent' }}>
                            <td style={{ padding: '12px' }}>
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
                            <td style={{ padding: '12px' }}>
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
                            <td style={{ padding: '12px' }}>{row.kelas}</td>
                            <td style={{ padding: '12px' }}>{row.ruang}</td>
                            <td style={{ padding: '12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                              {row.isEditing ? (
                                <button onClick={() => handleSaveInputRow(idx)} style={{ background: '#10b981', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', marginRight: '4px' }} title="Simpan">
                                  <i className="fas fa-save"></i>
                                </button>
                              ) : (
                                <>
                                  <button 
                                    onClick={() => handleToggleSelesai(idx)} 
                                    style={{ background: row.isSelesai ? '#64748b' : '#3b82f6', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', marginRight: '4px' }}
                                    title={row.isSelesai ? "Batalkan Selesai" : "Tandai Selesai"}
                                  >
                                    <i className={row.isSelesai ? "fas fa-undo" : "fas fa-check"}></i>
                                  </button>
                                  <button onClick={() => {
                                    const updated = [...inputRows];
                                    updated[idx].isEditing = true;
                                    setInputRows(updated);
                                  }} style={{ background: '#f59e0b', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', marginRight: '4px' }} title="Edit">
                                    <i className="fas fa-edit"></i>
                                  </button>
                                </>
                              )}
                              <button onClick={() => handleDeleteInputRow(idx)} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }} title="Hapus">
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
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                <p>Belum ada data input susulan. Klik "Tambah Baris" untuk memulai.</p>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'rekap-susulan' && (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#334155', marginBottom: '20px' }}>Rekap Susulan</h2>
            <p style={{ color: '#64748b' }}>Halaman ini sedang dalam tahap pengembangan.</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '400px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '1.2rem', color: '#1e293b' }}>Tambah Peserta Susulan</h3>
            <form onSubmit={handleAddParticipant}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#475569', fontSize: '0.9rem' }}>NISN</label>
                <input type="text" value={formData.nisn} onChange={e => setFormData({...formData, nisn: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }} placeholder="Masukkan NISN" required />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#475569', fontSize: '0.9rem' }}>No Ujian</label>
                <input type="text" value={formData.noUjian} onChange={e => setFormData({...formData, noUjian: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }} placeholder="Contoh: 7-09-001" required />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#475569', fontSize: '0.9rem' }}>Ruang</label>
                <input type="text" value={formData.ruang} onChange={e => setFormData({...formData, ruang: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }} placeholder="Contoh: Ruang 01" required />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '10px 16px', background: '#f1f5f9', border: 'none', borderRadius: '6px', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>Batal</button>
                <button type="submit" disabled={isSubmitting} style={{ padding: '10px 16px', background: '#3b82f6', border: 'none', borderRadius: '6px', color: 'white', fontWeight: 600, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}>
                  {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
