'use client';

import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import { supabase } from '@/lib/supabase';
import InlineLoading from '@/components/InlineLoading';

const CONFIG_KEY = 'jadwal_pengawas_ujian';
const ROOM_CONFIG_KEY = 'konfigurasi_ruang_ujian';

interface GuruOption {
  id: number;
  kode: string;
  nama: string;
  jabatan: string;
}

interface ExamSession {
  id: string;
  jamKe: string;
  waktu: string;
  mataUjian: string;
  pengawas: Record<string, string>; // roomName -> kodeGuru
}

interface ExamDay {
  id: string;
  tanggal: string; // YYYY-MM-DD (optional helper)
  labelHariTanggal: string; // e.g. "Senin, 04 Mei 2026"
  sessions: ExamSession[];
}

interface HeaderInfo {
  judul: string;
  subJudul: string;
  tanggalTtd: string;
  kepalaMadrasah: string;
}

const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI'];
const DEFAULT_WAKTU = ['07.30 - 09.30', '10.00 - 11.30', '11.45 - 13.00', '13.15 - 14.30'];

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function formatTanggalIndonesia(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return dateStr;
  const [y, m, d] = parts;
  const dt = new Date(y, m - 1, d);
  const hariNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const bulanNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const dd = String(d).padStart(2, '0');
  return `${hariNames[dt.getDay()]}, ${dd} ${bulanNames[m - 1]} ${y}`;
}

function addDaysIso(dateStr: string, offsetDays: number): string {
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return '';
  const dt = new Date(parts[0], parts[1] - 1, parts[2] + offsetDays);
  // Skip Minggu otomatis
  if (dt.getDay() === 0) dt.setDate(dt.getDate() + 1);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatRoomShort(rawRoom: string): string {
  const s = rawRoom.trim();
  const m = s.match(/ruang\s*0*(\d+)/i);
  if (m) return `R.${parseInt(m[1], 10)}`;
  return s;
}

function createDefaultRooms(count: number): string[] {
  return Array.from({ length: Math.max(1, count) }, (_, i) => `R.${i + 1}`);
}

function createInitialDay(dateIso?: string): ExamDay {
  const today = new Date();
  const iso =
    dateIso ||
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return {
    id: uid('day'),
    tanggal: iso,
    labelHariTanggal: formatTanggalIndonesia(iso),
    sessions: [
      { id: uid('ses'), jamKe: 'I', waktu: '07.30 - 09.30', mataUjian: '', pengawas: {} },
      { id: uid('ses'), jamKe: 'II', waktu: '10.00 - 11.30', mataUjian: '', pengawas: {} }
    ]
  };
}

function isStafJabatan(jabatan: string): boolean {
  const j = (jabatan || '').toLowerCase();
  if (j.includes('guru')) return false;
  return /(staf|tata usaha|perpustakaan|bendahara|satpam|kebersihan|laboran|tendik)/i.test(j);
}

export default function JadwalPengawasTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [teachers, setTeachers] = useState<GuruOption[]>([]);
  const [mapelOptions, setMapelOptions] = useState<string[]>([]);
  const [excludedKodes, setExcludedKodes] = useState<string[]>([]);
  const [showTeacherPicker, setShowTeacherPicker] = useState(false);
  const [teacherSearch, setTeacherSearch] = useState('');

  const [headerInfo, setHeaderInfo] = useState<HeaderInfo>({
    judul: 'JADWAL PENGAWAS UJIAN',
    subJudul: 'MADRASAH TSANAWIYAH ALMAARIF 01 SINGOSARI',
    tanggalTtd: `Singosari, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    kepalaMadrasah: 'Dwi Retno Palupi, M.Pd.'
  });

  const [rooms, setRooms] = useState<string[]>(createDefaultRooms(15));
  const [roomCountInput, setRoomCountInput] = useState<number>(15);
  const [days, setDays] = useState<ExamDay[]>([createInitialDay()]);

  // Cell editor modal state
  const [editingCell, setEditingCell] = useState<{
    dayId: string;
    sessionId: string;
    room: string;
    label: string;
    jamKe: string;
    mataUjian: string;
    currentKode: string;
  } | null>(null);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      try {
        const [resGuru, resMapel, savedRes] = await Promise.all([
          fetch('/api/guru', { cache: 'no-store' }),
          fetch('/api/jadwal/mapel', { cache: 'no-store' }),
          supabase.from('rapor_config').select('value').eq('key', CONFIG_KEY).maybeSingle()
        ]);

        const guruJson = await resGuru.json();
        if (guruJson.success && Array.isArray(guruJson.data)) {
          const activeGuruOnly: GuruOption[] = guruJson.data
            .filter((g: any) => {
              const st = (g.status || '').toLowerCase().trim();
              if (st !== 'aktif') return false;
              if (isStafJabatan(g.jabatan || '')) return false;
              return true;
            })
            .map((g: any) => ({
              id: Number(g.id),
              kode: String(g.urutan ?? g.id),
              nama: String(g.nama || '').trim(),
              jabatan: String(g.jabatan || 'Guru').trim()
            }))
            .sort((a: GuruOption, b: GuruOption) => Number(a.kode) - Number(b.kode));
          setTeachers(activeGuruOnly);
        }

        const mapelJson = await resMapel.json();
        if (mapelJson.success && Array.isArray(mapelJson.data)) {
          const names = Array.from(
            new Set(mapelJson.data.map((m: any) => String(m.namaMapel || '').trim()).filter(Boolean))
          ) as string[];
          setMapelOptions(names.sort((a, b) => a.localeCompare(b)));
        }

        let rawSaved: string | null = !savedRes.error && savedRes.data?.value ? savedRes.data.value : null;
        if (!rawSaved && typeof window !== 'undefined') {
          rawSaved = localStorage.getItem(CONFIG_KEY);
        }

        if (rawSaved) {
          try {
            const parsed = JSON.parse(rawSaved);
            if (parsed.headerInfo) setHeaderInfo(prev => ({ ...prev, ...parsed.headerInfo }));
            if (Array.isArray(parsed.rooms) && parsed.rooms.length > 0) {
              setRooms(parsed.rooms);
              setRoomCountInput(parsed.rooms.length);
            }
            if (Array.isArray(parsed.days) && parsed.days.length > 0) {
              setDays(parsed.days);
            }
            if (Array.isArray(parsed.excludedKodes)) {
              setExcludedKodes(parsed.excludedKodes);
            }
          } catch (e) {
            console.error('Parse jadwal pengawas gagal:', e);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, []);

  const teacherByKode = useMemo(() => {
    const map = new Map<string, GuruOption>();
    teachers.forEach(t => map.set(t.kode, t));
    return map;
  }, [teachers]);

  const activePool = useMemo(() => {
    const excl = new Set(excludedKodes);
    return teachers.filter(t => !excl.has(t.kode));
  }, [teachers, excludedKodes]);

  // Hitung distribusi beban pengawas & deteksi bentrok per sesi
  const scheduleStats = useMemo(() => {
    const counts: Record<string, number> = {};
    const clashes: Array<{ dayLabel: string; jamKe: string; kode: string; rooms: string[] }> = [];
    const clashCellKeys = new Set<string>();
    let totalSlots = 0;
    let filledSlots = 0;

    days.forEach(day => {
      day.sessions.forEach(ses => {
        const seenInSession: Record<string, string[]> = {};
        rooms.forEach(room => {
          totalSlots++;
          const kode = (ses.pengawas?.[room] || '').trim();
          if (kode) {
            filledSlots++;
            counts[kode] = (counts[kode] || 0) + 1;
            if (!seenInSession[kode]) seenInSession[kode] = [];
            seenInSession[kode].push(room);
          }
        });
        Object.entries(seenInSession).forEach(([kode, rList]) => {
          if (rList.length > 1) {
            clashes.push({ dayLabel: day.labelHariTanggal, jamKe: ses.jamKe, kode, rooms: rList });
            rList.forEach(rm => clashCellKeys.add(`${day.id}|${ses.id}|${rm}`));
          }
        });
      });
    });

    const usedKodes = Object.keys(counts).sort((a, b) => Number(a) - Number(b));
    const countValues = Object.values(counts);
    const minLoad = countValues.length > 0 ? Math.min(...countValues) : 0;
    const maxLoad = countValues.length > 0 ? Math.max(...countValues) : 0;

    return {
      counts,
      usedKodes,
      clashes,
      clashCellKeys,
      totalSlots,
      filledSlots,
      minLoad,
      maxLoad
    };
  }, [days, rooms]);

  // Daftar guru untuk legend di bawah tabel (semua guru yang bertugas, atau activePool jika belum digenerate)
  const legendTeachers = useMemo(() => {
    if (scheduleStats.usedKodes.length > 0) {
      return scheduleStats.usedKodes.map(kode => {
        const found = teacherByKode.get(kode);
        return {
          kode,
          nama: found?.nama || `Guru Kode ${kode}`,
          count: scheduleStats.counts[kode] || 0
        };
      });
    }
    return activePool.map(t => ({ kode: t.kode, nama: t.nama, count: 0 }));
  }, [scheduleStats, teacherByKode, activePool]);

  // Bagi legend menjadi 3 kolom (seperti contoh gambar)
  const legendColumns = useMemo(() => {
    const colCount = 3;
    const perCol = Math.ceil(legendTeachers.length / colCount) || 1;
    return [
      legendTeachers.slice(0, perCol),
      legendTeachers.slice(perCol, perCol * 2),
      legendTeachers.slice(perCol * 2)
    ];
  }, [legendTeachers]);

  const handleApplyRoomCount = () => {
    const clamped = Math.max(1, Math.min(40, Number(roomCountInput) || 1));
    setRoomCountInput(clamped);
    setRooms(createDefaultRooms(clamped));
  };

  const handlePullRoomsFromConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('rapor_config')
        .select('value')
        .eq('key', ROOM_CONFIG_KEY)
        .maybeSingle();

      let rawValue: string | null = !error && data?.value ? data.value : null;
      if (!rawValue && typeof window !== 'undefined') {
        rawValue = localStorage.getItem(ROOM_CONFIG_KEY);
      }
      if (!rawValue) {
        Swal.fire('Belum Ada Data', 'Konfigurasi Ruang belum tersimpan di tab 1. Konfigurasi Ruang.', 'info');
        return;
      }
      const parsed = JSON.parse(rawValue);
      const rawRooms: string[] = Array.from(
        new Set(
          (parsed.assignments || [])
            .map((a: any) => String(a.ruang || '').trim())
            .filter(Boolean)
        )
      ) as string[];

      if (rawRooms.length === 0) {
        Swal.fire('Belum Ada Data', 'Data ruang pada Konfigurasi Ruang masih kosong.', 'info');
        return;
      }

      rawRooms.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
      const formatted = rawRooms.map(formatRoomShort);
      setRooms(formatted);
      setRoomCountInput(formatted.length);
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: `${formatted.length} ruang ditarik dari Konfigurasi Ruang.`,
        showConfirmButton: false,
        timer: 2000
      });
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Gagal menarik daftar ruang dari Konfigurasi Ruang.', 'error');
    }
  };

  const handleAddDay = () => {
    const lastDay = days[days.length - 1];
    const nextIso = lastDay?.tanggal ? addDaysIso(lastDay.tanggal, 1) : undefined;
    setDays(prev => [...prev, createInitialDay(nextIso)]);
  };

  const handleRemoveDay = (dayId: string) => {
    if (days.length <= 1) return;
    setDays(prev => prev.filter(d => d.id !== dayId));
  };

  const handleUpdateDayDate = (dayId: string, newIso: string) => {
    setDays(prev =>
      prev.map(d =>
        d.id === dayId
          ? { ...d, tanggal: newIso, labelHariTanggal: formatTanggalIndonesia(newIso) || d.labelHariTanggal }
          : d
      )
    );
  };

  const handleUpdateDayLabel = (dayId: string, label: string) => {
    setDays(prev => prev.map(d => (d.id === dayId ? { ...d, labelHariTanggal: label } : d)));
  };

  const handleAddSession = (dayId: string) => {
    setDays(prev =>
      prev.map(d => {
        if (d.id !== dayId) return d;
        const idx = d.sessions.length;
        return {
          ...d,
          sessions: [
            ...d.sessions,
            {
              id: uid('ses'),
              jamKe: ROMAN_NUMERALS[idx] || String(idx + 1),
              waktu: DEFAULT_WAKTU[idx] || '',
              mataUjian: '',
              pengawas: {}
            }
          ]
        };
      })
    );
  };

  const handleRemoveSession = (dayId: string, sessionId: string) => {
    setDays(prev =>
      prev.map(d => {
        if (d.id !== dayId) return d;
        if (d.sessions.length <= 1) return d;
        return { ...d, sessions: d.sessions.filter(s => s.id !== sessionId) };
      })
    );
  };

  const handleUpdateSessionField = (
    dayId: string,
    sessionId: string,
    field: 'jamKe' | 'waktu' | 'mataUjian',
    value: string
  ) => {
    setDays(prev =>
      prev.map(d => {
        if (d.id !== dayId) return d;
        return {
          ...d,
          sessions: d.sessions.map(s => (s.id === sessionId ? { ...s, [field]: value } : s))
        };
      })
    );
  };

  // Algoritma Generate Pengawas Otomatis: merata di seluruh guru terpilih & 0 bentrok per sesi
  const handleGeneratePengawas = () => {
    if (rooms.length === 0) {
      Swal.fire('Perhatian', 'Jumlah ruang harus minimal 1.', 'warning');
      return;
    }
    if (activePool.length < rooms.length) {
      Swal.fire(
        'Jumlah Guru Kurang',
        `Jumlah guru pengawas terpilih (${activePool.length}) lebih sedikit dari jumlah ruang (${rooms.length}). Kurangi jumlah ruang atau tambahkan guru pengawas terlebih dahulu.`,
        'warning'
      );
      return;
    }

    const totalCount: Record<string, number> = {};
    const roomHistory: Record<string, Set<string>> = {};
    activePool.forEach(t => {
      totalCount[t.kode] = 0;
      roomHistory[t.kode] = new Set();
    });

    const updatedDays = days.map(day => {
      const dayCount: Record<string, number> = {};
      let prevSessionSet = new Set<string>();

      const newSessions = day.sessions.map(ses => {
        // 1. Pilih N guru paling sedikit beban totalnya (dan paling sedikit beban hari ini)
        const scoredPool = activePool.map(t => ({
          teacher: t,
          total: totalCount[t.kode] || 0,
          dayLoad: dayCount[t.kode] || 0,
          wasPrev: prevSessionSet.has(t.kode) ? 1 : 0,
          rand: Math.random()
        }));

        scoredPool.sort(
          (a, b) =>
            a.total - b.total ||
            a.dayLoad - b.dayLoad ||
            a.wasPrev - b.wasPrev ||
            a.rand - b.rand
        );

        const chosen = scoredPool.slice(0, rooms.length).map(x => x.teacher);

        // 2. Pasangkan guru terpilih ke ruang R.1..R.N dengan meminimalkan pengulangan ruang yang sama
        const remainingTeachers = [...chosen];
        const newPengawas: Record<string, string> = {};

        // Acak sedikit urutan ruang saat penempatan agar tidak berat di satu sisi
        const roomOrder = [...rooms];
        for (const room of roomOrder) {
          // Cari guru di remainingTeachers yang belum pernah mengawas di ruang ini
          let pickIdx = remainingTeachers.findIndex(t => !roomHistory[t.kode].has(room));
          if (pickIdx === -1) pickIdx = 0;
          const [picked] = remainingTeachers.splice(pickIdx, 1);

          newPengawas[room] = picked.kode;
          totalCount[picked.kode] = (totalCount[picked.kode] || 0) + 1;
          dayCount[picked.kode] = (dayCount[picked.kode] || 0) + 1;
          roomHistory[picked.kode].add(room);
        }

        prevSessionSet = new Set(chosen.map(c => c.kode));
        return { ...ses, pengawas: newPengawas };
      });

      return { ...day, sessions: newSessions };
    });

    setDays(updatedDays);

    const vals = Object.values(totalCount);
    const minV = Math.min(...vals);
    const maxV = Math.max(...vals);
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: `Pengawas digenerate merata (${minV}–${maxV} sesi/guru, 0 bentrok).`,
      showConfirmButton: false,
      timer: 2800
    });
  };

  const handleClearPengawas = () => {
    setDays(prev =>
      prev.map(d => ({
        ...d,
        sessions: d.sessions.map(s => ({ ...s, pengawas: {} }))
      }))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        headerInfo,
        rooms,
        days,
        excludedKodes,
        updatedAt: new Date().toISOString()
      };
      const serialized = JSON.stringify(payload);
      if (typeof window !== 'undefined') {
        localStorage.setItem(CONFIG_KEY, serialized);
      }
      const { error } = await supabase
        .from('rapor_config')
        .upsert({ key: CONFIG_KEY, value: serialized }, { onConflict: 'key' });
      if (error) throw error;

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Jadwal Pengawas berhasil disimpan!',
        showConfirmButton: false,
        timer: 2000
      });
    } catch (err: any) {
      console.error(err);
      Swal.fire('Error', err?.message || 'Gagal menyimpan jadwal pengawas', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAssignCellManual = (newKode: string) => {
    if (!editingCell) return;
    setDays(prev =>
      prev.map(d => {
        if (d.id !== editingCell.dayId) return d;
        return {
          ...d,
          sessions: d.sessions.map(s => {
            if (s.id !== editingCell.sessionId) return s;
            const nextPengawas = { ...(s.pengawas || {}) };
            if (!newKode) {
              delete nextPengawas[editingCell.room];
            } else {
              nextPengawas[editingCell.room] = newKode;
            }
            return { ...s, pengawas: nextPengawas };
          })
        };
      })
    );
    setEditingCell(null);
  };

  const handlePrintPdf = () => {
    const win = window.open('', '_blank', 'width=1200,height=800');
    if (!win) {
      Swal.fire('Popup Diblokir', 'Izinkan pop-up browser untuk mencetak jadwal pengawas.', 'warning');
      return;
    }

    const esc = (s: string) =>
      String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    const bodyRowsHtml = days
      .map((day, dIdx) => {
        const span = day.sessions.length;
        return day.sessions
          .map((ses, sIdx) => {
            const dayCells =
              sIdx === 0
                ? `<td rowspan="${span}" class="center bold">${dIdx + 1}</td>
                   <td rowspan="${span}" class="center bold hari-col">${esc(day.labelHariTanggal)}</td>`
                : '';
            const roomCells = rooms
              .map(r => `<td class="center bold kode-cell">${esc(ses.pengawas?.[r] || '')}</td>`)
              .join('');
            return `<tr>
              ${dayCells}
              <td class="center bold">${esc(ses.jamKe)}</td>
              <td class="center nowrap">${esc(ses.waktu)}</td>
              <td class="left mapel-col">${esc(ses.mataUjian)}</td>
              ${roomCells}
            </tr>`;
          })
          .join('');
      })
      .join('');

    const maxLegendRows = Math.max(legendColumns[0].length, legendColumns[1].length, legendColumns[2].length);
    const legendRowsHtml = Array.from({ length: maxLegendRows }, (_, i) => {
      const c0 = legendColumns[0][i];
      const c1 = legendColumns[1][i];
      const c2 = legendColumns[2][i];
      return `<tr>
        <td class="center bold kode-lg">${c0 ? esc(c0.kode) : ''}</td>
        <td class="left nama-lg">${c0 ? esc(c0.nama) : ''}</td>
        <td class="center bold kode-lg">${c1 ? esc(c1.kode) : ''}</td>
        <td class="left nama-lg">${c1 ? esc(c1.nama) : ''}</td>
        <td class="center bold kode-lg">${c2 ? esc(c2.kode) : ''}</td>
        <td class="left nama-lg">${c2 ? esc(c2.nama) : ''}</td>
      </tr>`;
    }).join('');

    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>${esc(headerInfo.judul)}</title>
  <style>
    @page { size: A4 landscape; margin: 8mm 10mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #000; margin: 0; padding: 0; font-size: 9pt; }
    .header { text-align: center; margin-bottom: 8px; }
    .header h2 { margin: 0; font-size: 12pt; font-weight: 800; letter-spacing: 0.3px; }
    .header h3 { margin: 2px 0 0; font-size: 10.5pt; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1.2px solid #000; padding: 3px 4px; vertical-align: middle; }
    th { background: #f8fafc; font-weight: 800; text-align: center; font-size: 8.5pt; }
    .center { text-align: center; }
    .left { text-align: left; }
    .bold { font-weight: 700; }
    .nowrap { white-space: nowrap; }
    .hari-col { min-width: 98px; line-height: 1.25; }
    .mapel-col { min-width: 115px; font-weight: 600; }
    .kode-cell { min-width: 26px; font-size: 8.5pt; }
    .bottom-wrap { display: flex; justify-content: space-between; align-items: flex-start; gap: 18px; margin-top: 10px; }
    .legend-box { flex: 1; }
    .legend-title { font-weight: 800; font-size: 8.8pt; margin-bottom: 3px; }
    table.legend td { padding: 2px 5px; font-size: 7.8pt; border: 1px solid #000; }
    .kode-lg { width: 28px; }
    .nama-lg { white-space: nowrap; }
    .ttd-box { width: 220px; text-align: left; padding-top: 14px; font-size: 9pt; flex-shrink: 0; }
    .ttd-space { height: 58px; }
    .ttd-name { font-weight: 800; text-decoration: underline; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h2>${esc(headerInfo.judul)}</h2>
    <h3>${esc(headerInfo.subJudul)}</h3>
  </div>
  <table>
    <thead>
      <tr>
        <th rowspan="2" style="width: 28px;">NO</th>
        <th rowspan="2" style="width: 110px;">HARI / TANGGAL</th>
        <th rowspan="2" style="width: 36px;">JAM KE</th>
        <th rowspan="2" style="width: 82px;">WAKTU</th>
        <th rowspan="2" style="width: 130px;">MATA UJIAN</th>
        <th colspan="${rooms.length}">RUANG &amp; KODE PENGAWAS</th>
      </tr>
      <tr>
        ${rooms.map(r => `<th>${esc(r)}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${bodyRowsHtml}
    </tbody>
  </table>

  <div class="bottom-wrap">
    <div class="legend-box">
      <div class="legend-title">Kode &amp; Nama Pengawas</div>
      <table class="legend">
        <tbody>
          ${legendRowsHtml}
        </tbody>
      </table>
    </div>
    <div class="ttd-box">
      <div>${esc(headerInfo.tanggalTtd)}</div>
      <div>Kepala Madrasah,</div>
      <div class="ttd-space"></div>
      <div class="ttd-name">${esc(headerInfo.kepalaMadrasah)}</div>
    </div>
  </div>
</body>
</html>`);
    win.document.close();
    setTimeout(() => win.print(), 400);
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    const aoa: (string | number)[][] = [
      [headerInfo.judul],
      [headerInfo.subJudul],
      [],
      ['NO', 'HARI / TANGGAL', 'JAM KE', 'WAKTU', 'MATA UJIAN', 'RUANG & KODE PENGAWAS', ...Array(Math.max(0, rooms.length - 1)).fill('')],
      ['', '', '', '', '', ...rooms]
    ];

    const merges: XLSX.Range[] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 4 + rooms.length } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 4 + rooms.length } },
      { s: { r: 3, c: 0 }, e: { r: 4, c: 0 } },
      { s: { r: 3, c: 1 }, e: { r: 4, c: 1 } },
      { s: { r: 3, c: 2 }, e: { r: 4, c: 2 } },
      { s: { r: 3, c: 3 }, e: { r: 4, c: 3 } },
      { s: { r: 3, c: 4 }, e: { r: 4, c: 4 } },
      { s: { r: 3, c: 5 }, e: { r: 3, c: 4 + rooms.length } }
    ];

    let curRow = 5;
    days.forEach((day, dIdx) => {
      const startR = curRow;
      day.sessions.forEach((ses, sIdx) => {
        aoa.push([
          sIdx === 0 ? dIdx + 1 : '',
          sIdx === 0 ? day.labelHariTanggal : '',
          ses.jamKe,
          ses.waktu,
          ses.mataUjian,
          ...rooms.map(r => ses.pengawas?.[r] || '')
        ]);
        curRow++;
      });
      if (day.sessions.length > 1) {
        merges.push({ s: { r: startR, c: 0 }, e: { r: curRow - 1, c: 0 } });
        merges.push({ s: { r: startR, c: 1 }, e: { r: curRow - 1, c: 1 } });
      }
    });

    aoa.push([]);
    aoa.push(['Kode & Nama Pengawas']);
    const maxLegendRows = Math.max(legendColumns[0].length, legendColumns[1].length, legendColumns[2].length);
    for (let i = 0; i < maxLegendRows; i++) {
      const c0 = legendColumns[0][i];
      const c1 = legendColumns[1][i];
      const c2 = legendColumns[2][i];
      aoa.push([
        c0?.kode || '', c0?.nama || '', '',
        c1?.kode || '', c1?.nama || '', '',
        c2?.kode || '', c2?.nama || ''
      ]);
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!merges'] = merges;
    XLSX.utils.book_append_sheet(wb, ws, 'Jadwal Pengawas');

    // Sheet 2: Rekap Beban Pengawas
    const rekapRows: (string | number)[][] = [
      ['No', 'Kode Guru', 'Nama Guru', 'Jabatan', 'Jumlah Mengawas']
    ];
    legendTeachers.forEach((t, idx) => {
      const info = teacherByKode.get(t.kode);
      rekapRows.push([idx + 1, t.kode, t.nama, info?.jabatan || 'Guru', t.count]);
    });
    const wsRekap = XLSX.utils.aoa_to_sheet(rekapRows);
    XLSX.utils.book_append_sheet(wb, wsRekap, 'Rekap Beban');

    XLSX.writeFile(wb, 'Jadwal_Pengawas_Ujian.xlsx');
  };

  if (loading) {
    return <InlineLoading message="Memuat data guru dan konfigurasi jadwal pengawas..." />;
  }

  // Ambil sesi yang sedang diedit untuk cek bentrok saat memilih guru di modal
  const editingSessionObj = editingCell
    ? days.find(d => d.id === editingCell.dayId)?.sessions.find(s => s.id === editingCell.sessionId)
    : null;

  const busyKodesInEditingSession = new Map<string, string>();
  if (editingCell && editingSessionObj) {
    rooms.forEach(r => {
      if (r === editingCell.room) return;
      const k = editingSessionObj.pengawas?.[r];
      if (k) busyKodesInEditingSession.set(k, r);
    });
  }

  const filteredTeachersPicker = teachers.filter(t => {
    const q = teacherSearch.trim().toLowerCase();
    if (!q) return true;
    return t.nama.toLowerCase().includes(q) || t.kode.toLowerCase().includes(q) || t.jabatan.toLowerCase().includes(q);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <datalist id="pengawas-mapel-list">
        {mapelOptions.map(m => (
          <option key={m} value={m} />
        ))}
      </datalist>

      {/* Header & Aksi Utama */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#1e293b' }}>
            Jadwal Pengawas Ujian
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
            Atur hari/tanggal, jam ke, mata ujian, dan ruang secara kondisional, lalu generate kode guru pengawas otomatis secara merata &amp; bebas tabrakan.
          </p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <button
            type="button"
            onClick={handleGeneratePengawas}
            style={{
              background: '#0ea5e9',
              color: 'white',
              border: 'none',
              padding: '9px 16px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.86rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px'
            }}
          >
            <i className="fas fa-magic"></i> Generate Pengawas Otomatis
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              background: saving ? '#94a3b8' : '#10b981',
              color: 'white',
              border: 'none',
              padding: '9px 16px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.86rem',
              cursor: saving ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px'
            }}
          >
            <i className={saving ? 'fas fa-spinner fa-spin' : 'fas fa-save'}></i>
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
          <button
            type="button"
            onClick={handlePrintPdf}
            style={{
              background: '#1e293b',
              color: 'white',
              border: 'none',
              padding: '9px 16px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.86rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px'
            }}
          >
            <i className="fas fa-print"></i> Cetak / PDF
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            style={{
              background: '#16a34a',
              color: 'white',
              border: 'none',
              padding: '9px 14px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.86rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px'
            }}
          >
            <i className="fas fa-file-excel"></i> Excel
          </button>
        </div>
      </div>

      {/* Pengaturan Kop & Ruang */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Judul Jadwal (Cetak)</label>
            <input
              type="text"
              value={headerInfo.judul}
              onChange={e => setHeaderInfo(prev => ({ ...prev, judul: e.target.value }))}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.86rem', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Sub Judul / Nama Madrasah</label>
            <input
              type="text"
              value={headerInfo.subJudul}
              onChange={e => setHeaderInfo(prev => ({ ...prev, subJudul: e.target.value }))}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.86rem', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Tempat &amp; Tanggal TTD</label>
            <input
              type="text"
              value={headerInfo.tanggalTtd}
              onChange={e => setHeaderInfo(prev => ({ ...prev, tanggalTtd: e.target.value }))}
              placeholder="Singosari, 18 April 2026"
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.86rem', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Nama Kepala Madrasah</label>
            <input
              type="text"
              value={headerInfo.kepalaMadrasah}
              onChange={e => setHeaderInfo(prev => ({ ...prev, kepalaMadrasah: e.target.value }))}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.86rem', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* Bar Ruang & Pool Pengawas */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '0.84rem', fontWeight: 700, color: '#334155' }}>Jumlah Ruang:</label>
            <input
              type="number"
              min={1}
              max={40}
              value={roomCountInput}
              onChange={e => setRoomCountInput(Number(e.target.value))}
              style={{ width: '68px', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.88rem', fontWeight: 700, textAlign: 'center' }}
            />
            <button
              type="button"
              onClick={handleApplyRoomCount}
              style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #0ea5e9', background: 'white', color: '#0284c7', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}
            >
              Terapkan (R.1–R.{Math.max(1, Math.min(40, Number(roomCountInput) || 1))})
            </button>
          </div>

          <button
            type="button"
            onClick={handlePullRoomsFromConfig}
            style={{ padding: '7px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white', color: '#334155', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <i className="fas fa-door-open" style={{ color: '#0ea5e9' }}></i>
            Tarik Ruang dari Konfigurasi Ruang
          </button>

          <button
            type="button"
            onClick={() => setShowTeacherPicker(prev => !prev)}
            style={{
              padding: '7px 12px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: showTeacherPicker ? '#e0f2fe' : 'white',
              color: '#0369a1',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <i className="fas fa-users-cog"></i>
            Pilih Guru Pengawas ({activePool.length}/{teachers.length} Guru Aktif)
          </button>

          {scheduleStats.filledSlots > 0 && (
            <button
              type="button"
              onClick={handleClearPengawas}
              style={{ marginLeft: 'auto', padding: '7px 12px', borderRadius: '6px', border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}
            >
              <i className="fas fa-eraser" style={{ marginRight: '5px' }}></i>
              Kosongkan Kode Pengawas
            </button>
          )}
        </div>

        {/* Panel Checklist Guru Pengawas */}
        {showTeacherPicker && (
          <div style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
              <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#1e293b' }}>
                Daftar Guru Aktif (Staf otomatis tidak disertakan) — Kode diambil dari Database Guru &amp; Staf:
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Cari nama/kode guru..."
                  value={teacherSearch}
                  onChange={e => setTeacherSearch(e.target.value)}
                  style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                />
                <button
                  type="button"
                  onClick={() => setExcludedKodes([])}
                  style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Pilih Semua
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const ks = teachers.filter(t => t.jabatan.toLowerCase().includes('kepala')).map(t => t.kode);
                    setExcludedKodes(prev => Array.from(new Set([...prev, ...ks])));
                  }}
                  style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #fde68a', background: '#fffbeb', color: '#b45309', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Kecualikan Kepala Madrasah
                </button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '6px', maxHeight: '220px', overflowY: 'auto' }}>
              {filteredTeachersPicker.map(t => {
                const checked = !excludedKodes.includes(t.kode);
                return (
                  <label
                    key={t.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 8px',
                      borderRadius: '6px',
                      border: `1px solid ${checked ? '#bae6fd' : '#e2e8f0'}`,
                      background: checked ? '#f0f9ff' : '#f8fafc',
                      fontSize: '0.8rem',
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setExcludedKodes(prev =>
                          prev.includes(t.kode) ? prev.filter(k => k !== t.kode) : [...prev, t.kode]
                        )
                      }
                    />
                    <span style={{ fontWeight: 800, color: '#0369a1', minWidth: '24px' }}>{t.kode}</span>
                    <span style={{ color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={`${t.nama} (${t.jabatan})`}>
                      {t.nama}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Form Input Hari, Jam Ke, Waktu, Mata Ujian */}
      <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', background: 'white' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: '#1e293b' }}>
            <i className="fas fa-calendar-alt" style={{ color: '#0ea5e9', marginRight: '8px' }}></i>
            Susunan Hari, Jam Ke &amp; Mata Ujian ({days.length} Hari · {days.reduce((a, d) => a + d.sessions.length, 0)} Sesi)
          </h3>
          <button
            type="button"
            onClick={handleAddDay}
            style={{ background: '#0ea5e9', color: 'white', border: 'none', padding: '7px 14px', borderRadius: '6px', fontWeight: 700, fontSize: '0.83rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <i className="fas fa-plus"></i> Tambah Hari Ujian
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {days.map((day, dIdx) => (
            <div key={day.id} style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px', background: '#f8fafc' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ background: '#1e3a5f', color: 'white', fontWeight: 800, fontSize: '0.78rem', padding: '4px 10px', borderRadius: '6px' }}>
                  Hari #{dIdx + 1}
                </span>
                <input
                  type="date"
                  value={day.tanggal}
                  onChange={e => handleUpdateDayDate(day.id, e.target.value)}
                  style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                  title="Pilih tanggal untuk mengisi teks Hari/Tanggal otomatis"
                />
                <input
                  type="text"
                  value={day.labelHariTanggal}
                  onChange={e => handleUpdateDayLabel(day.id, e.target.value)}
                  placeholder="Contoh: Senin, 04 Mei 2026"
                  style={{ flex: '1 1 200px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.86rem', fontWeight: 600 }}
                />
                <button
                  type="button"
                  onClick={() => handleAddSession(day.id)}
                  style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #0ea5e9', background: 'white', color: '#0284c7', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  <i className="fas fa-plus" style={{ marginRight: '4px' }}></i> Tambah Jam
                </button>
                {days.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveDay(day.id)}
                    style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
                    title="Hapus Hari"
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {day.sessions.map(ses => (
                  <div key={ses.id} style={{ display: 'grid', gridTemplateColumns: '76px 135px 1fr 34px', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={ses.jamKe}
                      onChange={e => handleUpdateSessionField(day.id, ses.id, 'jamKe', e.target.value)}
                      placeholder="I / II"
                      style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.84rem', textAlign: 'center', fontWeight: 700, background: 'white' }}
                      title="Jam Ke"
                    />
                    <input
                      type="text"
                      value={ses.waktu}
                      onChange={e => handleUpdateSessionField(day.id, ses.id, 'waktu', e.target.value)}
                      placeholder="07.30 - 09.30"
                      style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.84rem', textAlign: 'center', background: 'white' }}
                      title="Waktu Ujian"
                    />
                    <input
                      type="text"
                      list="pengawas-mapel-list"
                      value={ses.mataUjian}
                      onChange={e => handleUpdateSessionField(day.id, ses.id, 'mataUjian', e.target.value)}
                      placeholder="Ketik atau pilih Mata Ujian..."
                      style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.86rem', background: 'white' }}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveSession(day.id, ses.id)}
                      disabled={day.sessions.length <= 1}
                      style={{
                        padding: '6px',
                        borderRadius: '6px',
                        border: 'none',
                        background: day.sessions.length <= 1 ? '#e2e8f0' : '#fee2e2',
                        color: day.sessions.length <= 1 ? '#94a3b8' : '#dc2626',
                        cursor: day.sessions.length <= 1 ? 'not-allowed' : 'pointer'
                      }}
                      title="Hapus Sesi"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ringkasan Pemerataan & Status Bentrok */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
        <span style={{ padding: '6px 12px', borderRadius: '999px', background: '#f1f5f9', color: '#334155', fontSize: '0.82rem', fontWeight: 700 }}>
          Slot Terisi: {scheduleStats.filledSlots} / {scheduleStats.totalSlots}
        </span>
        <span style={{ padding: '6px 12px', borderRadius: '999px', background: '#e0f2fe', color: '#0369a1', fontSize: '0.82rem', fontWeight: 700 }}>
          Guru Bertugas: {scheduleStats.usedKodes.length} / {activePool.length}
        </span>
        {scheduleStats.filledSlots > 0 && (
          <span style={{ padding: '6px 12px', borderRadius: '999px', background: '#dcfce7', color: '#166534', fontSize: '0.82rem', fontWeight: 700 }}>
            Beban Pengawas: {scheduleStats.minLoad === scheduleStats.maxLoad ? `${scheduleStats.minLoad}x` : `${scheduleStats.minLoad}–${scheduleStats.maxLoad}x`} per Guru
          </span>
        )}
        <span
          style={{
            padding: '6px 12px',
            borderRadius: '999px',
            background: scheduleStats.clashes.length === 0 ? '#dcfce7' : '#fee2e2',
            color: scheduleStats.clashes.length === 0 ? '#166534' : '#b91c1c',
            fontSize: '0.82rem',
            fontWeight: 700
          }}
        >
          {scheduleStats.clashes.length === 0 ? '0 Bentrok Pengawas' : `${scheduleStats.clashes.length} Bentrok Terdeteksi!`}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#64748b' }}>
          <i className="fas fa-info-circle" style={{ marginRight: '4px' }}></i>
          Klik sel kode pengawas di tabel untuk mengubah secara manual.
        </span>
      </div>

      {/* Tabel Matriks Jadwal Pengawas (Format sesuai contoh gambar) */}
      <div style={{ overflowX: 'auto', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', minWidth: '820px' }}>
          <thead>
            <tr style={{ background: '#1e3a5f', color: 'white' }}>
              <th rowSpan={2} style={{ border: '1px solid #334155', padding: '8px 6px', textAlign: 'center', width: '40px' }}>NO</th>
              <th rowSpan={2} style={{ border: '1px solid #334155', padding: '8px 8px', textAlign: 'center', minWidth: '130px' }}>HARI / TANGGAL</th>
              <th rowSpan={2} style={{ border: '1px solid #334155', padding: '8px 6px', textAlign: 'center', width: '54px' }}>JAM KE</th>
              <th rowSpan={2} style={{ border: '1px solid #334155', padding: '8px 8px', textAlign: 'center', minWidth: '100px' }}>WAKTU</th>
              <th rowSpan={2} style={{ border: '1px solid #334155', padding: '8px 10px', textAlign: 'left', minWidth: '150px' }}>MATA UJIAN</th>
              <th colSpan={rooms.length} style={{ border: '1px solid #334155', padding: '6px 8px', textAlign: 'center' }}>
                RUANG &amp; KODE PENGAWAS
              </th>
            </tr>
            <tr style={{ background: '#2d5a8e', color: 'white' }}>
              {rooms.map(r => (
                <th key={r} style={{ border: '1px solid #334155', padding: '5px 4px', textAlign: 'center', minWidth: '38px' }}>
                  {r}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((day, dIdx) =>
              day.sessions.map((ses, sIdx) => (
                <tr key={ses.id} style={{ background: dIdx % 2 === 0 ? 'white' : '#f8fafc' }}>
                  {sIdx === 0 && (
                    <>
                      <td
                        rowSpan={day.sessions.length}
                        style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'center', fontWeight: 700, color: '#0f172a' }}
                      >
                        {dIdx + 1}
                      </td>
                      <td
                        rowSpan={day.sessions.length}
                        style={{ border: '1px solid #cbd5e1', padding: '6px 8px', textAlign: 'center', fontWeight: 700, color: '#0f172a' }}
                      >
                        {day.labelHariTanggal || '-'}
                      </td>
                    </>
                  )}
                  <td style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'center', fontWeight: 700 }}>
                    {ses.jamKe}
                  </td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'center', whiteSpace: 'nowrap', color: '#475569' }}>
                    {ses.waktu || '-'}
                  </td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '6px 10px', fontWeight: 600, color: '#1e293b' }}>
                    {ses.mataUjian || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Belum diisi</span>}
                  </td>
                  {rooms.map(r => {
                    const kode = ses.pengawas?.[r] || '';
                    const isClash = scheduleStats.clashCellKeys.has(`${day.id}|${ses.id}|${r}`);
                    const teacher = kode ? teacherByKode.get(kode) : null;
                    return (
                      <td
                        key={r}
                        onClick={() =>
                          setEditingCell({
                            dayId: day.id,
                            sessionId: ses.id,
                            room: r,
                            label: day.labelHariTanggal,
                            jamKe: ses.jamKe,
                            mataUjian: ses.mataUjian,
                            currentKode: kode
                          })
                        }
                        title={teacher ? `${kode} - ${teacher.nama}${isClash ? ' (BENTROK!)' : ''}` : 'Klik untuk pilih pengawas'}
                        style={{
                          border: '1px solid #cbd5e1',
                          padding: '6px 4px',
                          textAlign: 'center',
                          fontWeight: 700,
                          cursor: 'pointer',
                          background: isClash ? '#fee2e2' : undefined,
                          color: isClash ? '#dc2626' : kode ? '#0f172a' : '#cbd5e1'
                        }}
                      >
                        {kode || '-'}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Tabel Legend: Kode & Nama Pengawas (3 Kolom seperti gambar) */}
      <div>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '0.95rem', fontWeight: 700, color: '#1e293b' }}>
          Kode &amp; Nama Pengawas ({legendTeachers.length} Guru)
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
          {legendColumns.map((col, colIdx) => (
            <table key={colIdx} style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', background: 'white' }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={{ border: '1px solid #cbd5e1', padding: '5px 6px', width: '46px', textAlign: 'center' }}>Kode</th>
                  <th style={{ border: '1px solid #cbd5e1', padding: '5px 8px', textAlign: 'left' }}>Nama Pengawas</th>
                  <th style={{ border: '1px solid #cbd5e1', padding: '5px 6px', width: '50px', textAlign: 'center' }}>Jml</th>
                </tr>
              </thead>
              <tbody>
                {col.map(t => (
                  <tr key={t.kode}>
                    <td style={{ border: '1px solid #cbd5e1', padding: '4px 6px', textAlign: 'center', fontWeight: 700, color: '#0369a1' }}>
                      {t.kode}
                    </td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '4px 8px', color: '#1e293b' }}>{t.nama}</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '4px 6px', textAlign: 'center', fontWeight: 700, color: t.count > 0 ? '#15803d' : '#94a3b8' }}>
                      {t.count}x
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}
        </div>
      </div>

      {/* Modal Edit Manual Sel Pengawas */}
      {editingCell && (
        <div
          onClick={() => setEditingCell(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '480px',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
            }}
          >
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1rem', color: '#0f172a' }}>
                  Pilih Pengawas — {editingCell.room}
                </h4>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                  {editingCell.label} · Jam ke-{editingCell.jamKe} {editingCell.mataUjian ? `(${editingCell.mataUjian})` : ''}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingCell(null)}
                style={{ border: 'none', background: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
              >
                &times;
              </button>
            </div>

            <div style={{ padding: '12px 18px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <button
                type="button"
                onClick={() => handleAssignCellManual('')}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #fecaca',
                  background: '#fef2f2',
                  color: '#dc2626',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <i className="fas fa-times-circle" style={{ marginRight: '6px' }}></i>
                Kosongkan Pengawas di {editingCell.room}
              </button>

              {activePool.map(t => {
                const busyRoom = busyKodesInEditingSession.get(t.kode);
                const isSelected = editingCell.currentKode === t.kode;
                const totalTugas = scheduleStats.counts[t.kode] || 0;
                return (
                  <button
                    key={t.kode}
                    type="button"
                    onClick={() => handleAssignCellManual(t.kode)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: `1px solid ${isSelected ? '#0284c7' : busyRoom ? '#fecaca' : '#e2e8f0'}`,
                      background: isSelected ? '#e0f2fe' : busyRoom ? '#fef2f2' : '#f8fafc',
                      cursor: 'pointer',
                      textAlign: 'left',
                      gap: '8px'
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 800, color: '#0369a1', marginRight: '8px' }}>[{t.kode}]</span>
                      <span style={{ fontWeight: 600, fontSize: '0.84rem', color: '#1e293b' }}>{t.nama}</span>
                      {busyRoom && (
                        <span style={{ display: 'block', fontSize: '0.72rem', color: '#dc2626', fontWeight: 700 }}>
                          Sedang mengawas di {busyRoom} pada jam ini!
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.74rem', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', background: '#e2e8f0', color: '#334155', whiteSpace: 'nowrap' }}>
                      {totalTugas}x
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
