'use client';
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
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

interface SelectOption {
  value: string;
  label: string;
  badge?: string;
  keywords?: string;
}

const SearchableSelect = ({
  value,
  options,
  onChange,
  placeholder,
}: {
  value: string;
  options: SelectOption[];
  onChange: (val: string) => void;
  placeholder: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [menuPos, setMenuPos] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updateMenuPosition = useCallback(() => {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;
    const openUpward = spaceBelow < 210 && spaceAbove > spaceBelow;
    const availHeight = openUpward ? spaceAbove : spaceBelow;
    const maxListHeight = Math.min(240, Math.max(120, availHeight - 58));
    const width = Math.min(Math.max(rect.width, 250), window.innerWidth - 16);
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);

    setMenuPos({
      top: openUpward ? undefined : rect.bottom + 4,
      bottom: openUpward ? window.innerHeight - rect.top + 4 : undefined,
      left,
      width,
      maxHeight: maxListHeight,
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    updateMenuPosition();

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(target) &&
        (!menuRef.current || !menuRef.current.contains(target))
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', updateMenuPosition, true);
    window.addEventListener('resize', updateMenuPosition);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', updateMenuPosition, true);
      window.removeEventListener('resize', updateMenuPosition);
    };
  }, [isOpen, updateMenuPosition]);

  const selectedOption = options.find((o) => o.value === value);
  const query = search.trim().toLowerCase();
  const filteredOptions = useMemo(() => {
    if (!query) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(query) ||
        (o.keywords && o.keywords.toLowerCase().includes(query))
    );
  }, [options, query]);

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%', minWidth: '180px' }}>
      <div
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          padding: '7px 10px',
          border: `1px solid ${isOpen ? '#3b82f6' : '#cbd5e1'}`,
          borderRadius: '6px',
          background: 'white',
          cursor: 'pointer',
          minHeight: '36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          boxShadow: isOpen ? '0 0 0 2px rgba(59, 130, 246, 0.15)' : 'none',
        }}
      >
        <span
          style={{
            color: selectedOption ? '#1e293b' : '#94a3b8',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            fontSize: '0.9rem',
            fontWeight: selectedOption ? 500 : 400,
          }}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <i
          className={`fas fa-chevron-${isOpen ? 'up' : 'down'}`}
          style={{ fontSize: '11px', color: '#94a3b8', flexShrink: 0 }}
        ></i>
      </div>

      {isOpen &&
        menuPos &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: menuPos.top,
              bottom: menuPos.bottom,
              left: menuPos.left,
              width: menuPos.width,
              zIndex: 9999,
              background: 'white',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              boxShadow: '0 12px 28px -4px rgba(15, 23, 42, 0.18)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '7px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <input
                type="text"
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && filteredOptions.length > 0) {
                    e.preventDefault();
                    onChange(filteredOptions[0].value);
                    setIsOpen(false);
                    setSearch('');
                  }
                }}
                placeholder="Ketik untuk mencari..."
                style={{
                  width: '100%',
                  padding: '6px 9px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '5px',
                  outline: 'none',
                  fontSize: '0.88rem',
                  background: 'white',
                }}
              />
            </div>
            <div style={{ maxHeight: `${menuPos.maxHeight}px`, overflowY: 'auto' }}>
              {filteredOptions.length === 0 ? (
                <div style={{ padding: '12px', color: '#94a3b8', textAlign: 'center', fontSize: '0.88rem' }}>
                  Tidak ditemukan
                </div>
              ) : (
                filteredOptions.map((o) => {
                  const isSelected = o.value === value;
                  return (
                    <div
                      key={o.value}
                      onClick={() => {
                        onChange(o.value);
                        setIsOpen(false);
                        setSearch('');
                      }}
                      style={{
                        padding: '8px 10px',
                        cursor: 'pointer',
                        background: isSelected ? '#e0f2fe' : 'transparent',
                        color: isSelected ? '#0369a1' : '#334155',
                        fontSize: '0.88rem',
                        borderBottom: '1px solid #f1f5f9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.background = '#f1f5f9';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = isSelected ? '#e0f2fe' : 'transparent';
                      }}
                    >
                      <span style={{ fontWeight: isSelected ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {o.label}
                      </span>
                      {o.badge && (
                        <span
                          style={{
                            fontSize: '0.75rem',
                            color: isSelected ? '#0369a1' : '#64748b',
                            background: isSelected ? '#bae6fd' : '#f1f5f9',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                          }}
                        >
                          {o.badge}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default function SusulanPage() {
  const [activeTab, setActiveTab] = useState<'rekap-data' | 'input'>('rekap-data');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [pulling, setPulling] = useState(false);

  // Active Exam Info
  const [activeExamTitle, setActiveExamTitle] = useState<string>('');
  const [activeExamTA, setActiveExamTA] = useState<string>('');
  const [examConfigLoaded, setExamConfigLoaded] = useState<boolean>(false);

  // Rekap Data search & pagination (max 50 rows/page)
  const [rekapSearch, setRekapSearch] = useState('');
  const [rekapPage, setRekapPage] = useState(1);
  const [rekapPageSize, setRekapPageSize] = useState(50);

  // Input Tab states
  const [mapelList, setMapelList] = useState<string[]>([]);
  const [inputRows, setInputRows] = useState<InputRow[]>([]);
  const [isFetchingInput, setIsFetchingInput] = useState(false);
  const [resettingInput, setResettingInput] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickNisn, setQuickNisn] = useState('');
  const [quickMapel, setQuickMapel] = useState('');
  const [savingQuickAdd, setSavingQuickAdd] = useState(false);
  const [inputSearch, setInputSearch] = useState('');
  const [inputFilterStatus, setInputFilterStatus] = useState('Semua');
  const [inputFilterRuang, setInputFilterRuang] = useState('Semua');
  const [inputPage, setInputPage] = useState(1);
  const [inputPageSize, setInputPageSize] = useState(50);

  const participantOptions = useMemo<SelectOption[]>(
    () =>
      participants.map((p) => {
        const badge = [p.kelas, p.ruang].filter((v) => v && v !== '-').join(' · ');
        return {
          value: p.nisn,
          label: p.nama || p.nisn,
          badge: badge || undefined,
          keywords: `${p.nama || ''} ${p.kelas || ''} ${p.ruang || ''} ${p.nisn || ''}`,
        };
      }),
    [participants]
  );

  const mapelOptions = useMemo<SelectOption[]>(
    () => mapelList.map((m) => ({ value: m, label: m })),
    [mapelList]
  );

  const selectedQuickParticipant = useMemo(
    () => participants.find((p) => p.nisn === quickNisn) || null,
    [participants, quickNisn]
  );

  // Load existing data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch active exam info from rapor_config (susulan_exam_info & konfigurasi_ruang_ujian)
        let resolvedTitle = '';
        let resolvedTA = '';
        try {
          const { data: cfgRows, error: cfgErr } = await supabase
            .from('rapor_config')
            .select('key, value')
            .in('key', ['susulan_exam_info', 'konfigurasi_ruang_ujian']);

          if (!cfgErr && cfgRows) {
            const susulanCfg = cfgRows.find((r: any) => r.key === 'susulan_exam_info');
            const roomCfg = cfgRows.find((r: any) => r.key === 'konfigurasi_ruang_ujian');

            if (roomCfg?.value) {
              try {
                const parsedRoom = JSON.parse(roomCfg.value);
                if (parsedRoom.examTitle) resolvedTitle = String(parsedRoom.examTitle).trim();
                if (parsedRoom.tahunAjaranFilter) resolvedTA = String(parsedRoom.tahunAjaranFilter).trim();
              } catch {}
            }

            if (susulanCfg?.value) {
              try {
                const parsedSusulan = JSON.parse(susulanCfg.value);
                if (parsedSusulan.examTitle) resolvedTitle = String(parsedSusulan.examTitle).trim();
                if (parsedSusulan.tahunAjaran !== undefined) resolvedTA = String(parsedSusulan.tahunAjaran).trim();
              } catch {}
            }
          }

          if (!resolvedTitle) {
            const localSusulan = localStorage.getItem('susulan_exam_info');
            if (localSusulan) {
              try {
                const parsed = JSON.parse(localSusulan);
                if (parsed.examTitle) resolvedTitle = String(parsed.examTitle).trim();
                if (parsed.tahunAjaran) resolvedTA = String(parsed.tahunAjaran).trim();
              } catch {}
            }
          }
          if (!resolvedTitle) {
            const localRoom = localStorage.getItem('konfigurasi_ruang_ujian');
            if (localRoom) {
              try {
                const parsed = JSON.parse(localRoom);
                if (parsed.examTitle) resolvedTitle = String(parsed.examTitle).trim();
                if (parsed.tahunAjaranFilter) resolvedTA = String(parsed.tahunAjaranFilter).trim();
              } catch {}
            }
          }
        } catch {}

        setActiveExamTitle(resolvedTitle);
        setActiveExamTA(resolvedTA);
        setExamConfigLoaded(true);

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
    setShowQuickAdd((prev) => !prev);
  };

  const handleSaveQuickAdd = async () => {
    if (!quickNisn || !quickMapel) {
      Swal.fire('Info', 'Pilih Siswa dan Mata Pelajaran terlebih dahulu.', 'info');
      return;
    }

    const participant = participants.find((p) => p.nisn === quickNisn);
    const payload = {
      nisn: quickNisn,
      nama: participant?.nama || '',
      kelas: participant?.kelas || '',
      ruang: participant?.ruang || '',
      noUjian: participant?.noUjian || '',
      mapel: quickMapel,
      isSelesai: false,
    };

    setSavingQuickAdd(true);
    try {
      const res = await fetch('/api/perangkat-ujian/susulan/input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', payload }),
      });
      const resData = await res.json();

      if (resData.success && resData.data) {
        const newRow: InputRow = {
          id: resData.data.id,
          ...payload,
          isEditing: false,
        };
        setInputRows((prev) => [newRow, ...prev]);
        setInputPage(1);
        setQuickNisn('');
        setQuickMapel('');
        Swal.fire({
          icon: 'success',
          title: 'Data susulan ditambahkan',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 1500,
        });
      } else {
        Swal.fire('Error', resData.error || 'Gagal menyimpan data susulan', 'error');
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Terjadi kesalahan jaringan', 'error');
    } finally {
      setSavingQuickAdd(false);
    }
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

    const dateStr = new Date().toISOString().slice(0, 10);
    const examLabel = activeExamTitle || 'Ujian Susulan';
    const aoa: (string | number)[][] = [
      [`DATA INPUT UJIAN SUSULAN — ${examLabel.toUpperCase()}`],
      [`${activeExamTA ? `Tahun Ajaran: ${activeExamTA}  |  ` : ''}Tanggal Export: ${dateStr}`],
      [],
      ['No', 'NISN', 'Nama Siswa', 'No Ujian', 'Kelas', 'Ruang', 'Mata Pelajaran', 'Status Susulan'],
      ...rowsToExport.map((row, idx) => [
        idx + 1,
        row.nisn || '-',
        row.nama || '-',
        row.noUjian || '-',
        row.kelas || '-',
        row.ruang || '-',
        row.mapel || '-',
        row.isSelesai ? 'Selesai' : 'Belum Selesai',
      ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },
    ];
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
  const saveActiveExamInfo = async (examTitle: string, tahunAjaran: string) => {
    const payload = { examTitle: examTitle.trim(), tahunAjaran: tahunAjaran.trim() };
    setActiveExamTitle(payload.examTitle);
    setActiveExamTA(payload.tahunAjaran);
    try {
      localStorage.setItem('susulan_exam_info', JSON.stringify(payload));
      await supabase
        .from('rapor_config')
        .upsert({ key: 'susulan_exam_info', value: JSON.stringify(payload) }, { onConflict: 'key' });
    } catch (err) {
      console.error('Error saving susulan_exam_info:', err);
    }
  };

  const handleEditActiveExam = async () => {
    const esc = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const result = await Swal.fire({
      title: 'Atur Info Ujian Aktif',
      html: `
        <div style="text-align:left;display:flex;flex-direction:column;gap:12px;">
          <div>
            <label style="display:block;font-size:0.85rem;font-weight:600;color:#334155;margin-bottom:4px;">Nama Ujian</label>
            <input id="swal-exam-title" class="swal2-input" style="margin:0;width:100%;font-size:0.95rem;" value="${esc(activeExamTitle)}" placeholder="Misal: SUMATIF AKHIR SEMESTER GANJIL" />
          </div>
          <div>
            <label style="display:block;font-size:0.85rem;font-weight:600;color:#334155;margin-bottom:4px;">Tahun Ajaran</label>
            <input id="swal-exam-ta" class="swal2-input" style="margin:0;width:100%;font-size:0.95rem;" value="${esc(activeExamTA)}" placeholder="Misal: 2026/2027" />
          </div>
          <div style="font-size:0.8rem;color:#64748b;">
            Otomatis tersinkron saat menarik data dari <b>Konfigurasi Pembagian Ruang</b>, atau dapat diubah manual di sini.
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Simpan',
      cancelButtonText: 'Batal',
      preConfirm: () => {
        const titleEl = document.getElementById('swal-exam-title') as HTMLInputElement | null;
        const taEl = document.getElementById('swal-exam-ta') as HTMLInputElement | null;
        const titleVal = titleEl?.value.trim() || '';
        const taVal = taEl?.value.trim() || '';
        if (!titleVal) {
          Swal.showValidationMessage('Nama Ujian wajib diisi');
          return null;
        }
        return { titleVal, taVal };
      },
    });

    if (result.isConfirmed && result.value) {
      await saveActiveExamInfo(result.value.titleVal, result.value.taVal);
      Swal.fire({
        icon: 'success',
        title: 'Info ujian aktif diperbarui',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 1800,
      });
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

      const syncedTitle = String(parsed.examTitle || '').trim();
      const syncedTA = String(parsed.tahunAjaranFilter || '').trim();
      if (syncedTitle || syncedTA) {
        await saveActiveExamInfo(syncedTitle || activeExamTitle, syncedTA);
      }

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
      <div style={{ background: 'white', padding: '24px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#1e293b', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className="fas fa-file-alt" style={{ color: '#3b82f6' }}></i>
            Perangkat Ujian Susulan
          </h1>
          <p style={{ color: '#64748b', margin: 0 }}>Kelola data perangkat ujian susulan.</p>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 14px',
            borderRadius: '8px',
            background: activeExamTitle ? '#f0fdf4' : '#fffbeb',
            border: `1px solid ${activeExamTitle ? '#bbf7d0' : '#fde68a'}`,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: activeExamTitle ? '#15803d' : '#b45309' }}>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '999px',
                  background: activeExamTitle ? '#22c55e' : '#f59e0b',
                  display: 'inline-block',
                }}
              />
              Ujian Aktif
            </div>
            <div style={{ fontSize: '0.96rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
              {!examConfigLoaded ? 'Memuat info ujian...' : activeExamTitle || 'Belum diatur'}
              {activeExamTA && (
                <span
                  style={{
                    marginLeft: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    background: 'white',
                    border: '1px solid #cbd5e1',
                    color: '#334155',
                  }}
                >
                  TA {activeExamTA}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleEditActiveExam}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: 'white',
              color: '#334155',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              whiteSpace: 'nowrap',
            }}
            title="Ubah Info Ujian Aktif"
          >
            <i className="fas fa-pen" style={{ fontSize: '0.72rem' }}></i>
            Ubah
          </button>
        </div>
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
              <button
                onClick={handleAddInputRow}
                style={{
                  padding: '8px 16px',
                  background: showQuickAdd ? '#1d4ed8' : '#3b82f6',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: 'white',
                  fontWeight: 'bold',
                  whiteSpace: 'nowrap',
                }}
              >
                <i className={showQuickAdd ? 'fas fa-times' : 'fas fa-plus'}></i>
                {showQuickAdd ? 'Tutup Input' : 'Tambah Baris'}
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

            {showQuickAdd && (
              <div
                style={{
                  background: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  marginBottom: '16px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <div style={{ flex: '2 1 240px', minWidth: '200px' }}>
                  <SearchableSelect
                    value={quickNisn}
                    onChange={(val) => setQuickNisn(val)}
                    placeholder="Pilih Siswa (ketik nama / kelas)..."
                    options={participantOptions}
                  />
                </div>

                {selectedQuickParticipant && (
                  <div
                    style={{
                      padding: '6px 10px',
                      background: 'white',
                      border: '1px solid #bae6fd',
                      borderRadius: '6px',
                      fontSize: '0.84rem',
                      color: '#0369a1',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Kelas <b>{selectedQuickParticipant.kelas || '-'}</b> · Ruang <b>{selectedQuickParticipant.ruang || '-'}</b>
                  </div>
                )}

                <div style={{ flex: '2 1 220px', minWidth: '180px' }}>
                  <SearchableSelect
                    value={quickMapel}
                    onChange={(val) => setQuickMapel(val)}
                    placeholder="Pilih Mata Pelajaran..."
                    options={mapelOptions}
                  />
                </div>

                <button
                  onClick={handleSaveQuickAdd}
                  disabled={savingQuickAdd}
                  style={{
                    padding: '8px 16px',
                    background: savingQuickAdd ? '#94a3b8' : '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    cursor: savingQuickAdd ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <i className={savingQuickAdd ? 'fas fa-spinner fa-spin' : 'fas fa-save'}></i>
                  {savingQuickAdd ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            )}

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
                                    options={participantOptions}
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
                                    options={mapelOptions}
                                  />
                                ) : (
                                  <span>{row.mapel}</span>
                                )}
                              </td>
                              <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>{row.kelas}</td>
                              <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>{row.ruang}</td>
                              <td style={{ padding: '12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                {row.isEditing ? (
                                  <>
                                    <button onClick={() => handleSaveInputRow(idx)} style={{ background: '#10b981', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', marginRight: '4px' }} title="Simpan">
                                      <i className="fas fa-save"></i>
                                    </button>
                                    {row.id && (
                                      <button
                                        onClick={() => {
                                          const updated = [...inputRows];
                                          updated[idx].isEditing = false;
                                          setInputRows(updated);
                                        }}
                                        style={{ background: '#64748b', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', marginRight: '4px' }}
                                        title="Batal Edit"
                                      >
                                        <i className="fas fa-times"></i>
                                      </button>
                                    )}
                                  </>
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
