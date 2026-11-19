'use client';

import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import { supabase } from '@/lib/supabase';
import InlineLoading from '@/components/InlineLoading';

const CONFIG_KEY = 'jadwal_pengawas_ujian';
const ROOM_CONFIG_KEY = 'konfigurasi_ruang_ujian';

type ScheduleGroupKey = 'kelas78' | 'kelas9';

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
  tanggal: string; // YYYY-MM-DD
  labelHariTanggal: string; // e.g. "Senin, 04 Mei 2026"
  sessions: ExamSession[];
}

interface HeaderInfo {
  judul: string;
  subJudul: string;
  tanggalTtd: string;
  kepalaMadrasah: string;
}

interface GroupScheduleState {
  headerInfo: HeaderInfo;
  rooms: string[];
  days: ExamDay[];
  excludedKodes: string[];
}

const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI'];
const DEFAULT_WAKTU_PAGI = ['07.30 - 09.30', '10.00 - 11.30', '11.45 - 13.00', '13.15 - 14.30'];
const DEFAULT_WAKTU_SIANG = ['12.30 - 14.00', '14.15 - 15.45', '16.00 - 17.00'];

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

function createInitialDay(groupKey: ScheduleGroupKey, dateIso?: string): ExamDay {
  const today = new Date();
  const iso =
    dateIso ||
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const waktuDefaults = groupKey === 'kelas9' ? DEFAULT_WAKTU_PAGI : DEFAULT_WAKTU_PAGI;
  return {
    id: uid('day'),
    tanggal: iso,
    labelHariTanggal: formatTanggalIndonesia(iso),
    sessions: [
      { id: uid('ses'), jamKe: 'I', waktu: waktuDefaults[0], mataUjian: '', pengawas: {} },
      { id: uid('ses'), jamKe: 'II', waktu: waktuDefaults[1], mataUjian: '', pengawas: {} }
    ]
  };
}

function createInitialGroupState(groupKey: ScheduleGroupKey): GroupScheduleState {
  const defaultDateTtd = `Singosari, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  return {
    headerInfo: {
      judul: groupKey === 'kelas78' ? 'JADWAL PENGAWAS UJIAN KELAS VII & VIII' : 'JADWAL PENGAWAS UJIAN KELAS IX',
      subJudul: 'MADRASAH TSANAWIYAH ALMAARIF 01 SINGOSARI',
      tanggalTtd: defaultDateTtd,
      kepalaMadrasah: 'Dwi Retno Palupi, M.Pd.'
    },
    rooms: createDefaultRooms(groupKey === 'kelas78' ? 17 : 15),
    days: [createInitialDay(groupKey)],
    excludedKodes: []
  };
}

function isStafJabatan(jabatan: string): boolean {
  const j = (jabatan || '').toLowerCase();
  if (j.includes('guru')) return false;
  return /(staf|tata usaha|perpustakaan|bendahara|satpam|kebersihan|laboran|tendik)/i.test(j);
}

function normWaktuKey(w: string): string {
  return String(w || '').toLowerCase().replace(/\s+/g, '');
}

function formatWaktuRangeInput(raw: string, prev: string): string {
  const prevDigits = String(prev || '').replace(/\D/g, '');
  let digits = String(raw || '').replace(/\D/g, '').slice(0, 8);

  // Jika user menekan Backspace pada pemisah '.' atau ' - ', mundurkan 1 digit agar kursor tidak macet
  if (raw.length < prev.length && digits.length === prevDigits.length && digits.length > 0) {
    digits = digits.slice(0, -1);
  }

  if (digits.length === 0) return '';
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 6) return `${digits.slice(0, 2)}.${digits.slice(2, 4)} - ${digits.slice(4)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)} - ${digits.slice(4, 6)}.${digits.slice(6, 8)}`;
}

function extractGradeNum(rombelOrKelas: string): number | null {
  const s = String(rombelOrKelas || '').toUpperCase().trim();
  if (!s) return null;
  if (/^(9|IX)\b|^9|^IX/.test(s)) return 9;
  if (/^(8|VIII)\b|^8|^VIII/.test(s)) return 8;
  if (/^(7|VII)\b|^7|^VII/.test(s)) return 7;
  return null;
}

function computeGroupStats(group: GroupScheduleState, otherGroup: GroupScheduleState) {
  const counts: Record<string, number> = {};
  const clashes: Array<{ dayLabel: string; jamKe: string; kode: string; rooms: string[]; reason: string }> = [];
  const clashCellKeys = new Set<string>();
  let totalSlots = 0;
  let filledSlots = 0;

  // Map jadwal pasangan berdasarkan (tanggal|waktu) untuk cek bentrok lintas jadwal
  const otherBusyByDateTime = new Map<string, Map<string, string>>();
  otherGroup.days.forEach(od => {
    const tgl = (od.tanggal || od.labelHariTanggal || '').trim();
    if (!tgl) return;
    od.sessions.forEach(oses => {
      const wKey = normWaktuKey(oses.waktu);
      if (!wKey) return;
      const dtKey = `${tgl}|${wKey}`;
      if (!otherBusyByDateTime.has(dtKey)) otherBusyByDateTime.set(dtKey, new Map());
      const map = otherBusyByDateTime.get(dtKey)!;
      otherGroup.rooms.forEach(rm => {
        const k = (oses.pengawas?.[rm] || '').trim();
        if (k) map.set(k, rm);
      });
    });
  });

  group.days.forEach(day => {
    const tgl = (day.tanggal || day.labelHariTanggal || '').trim();
    day.sessions.forEach(ses => {
      const seenInSession: Record<string, string[]> = {};
      const wKey = normWaktuKey(ses.waktu);
      const otherBusyAtTime = tgl && wKey ? otherBusyByDateTime.get(`${tgl}|${wKey}`) : undefined;

      group.rooms.forEach(room => {
        totalSlots++;
        const kode = (ses.pengawas?.[room] || '').trim();
        if (kode) {
          filledSlots++;
          counts[kode] = (counts[kode] || 0) + 1;
          if (!seenInSession[kode]) seenInSession[kode] = [];
          seenInSession[kode].push(room);

          if (otherBusyAtTime && otherBusyAtTime.has(kode)) {
            const otherRoom = otherBusyAtTime.get(kode)!;
            clashes.push({
              dayLabel: day.labelHariTanggal,
              jamKe: ses.jamKe,
              kode,
              rooms: [room, `Jadwal lain (${otherRoom})`],
              reason: 'Bentrok waktu dengan jadwal pasangan'
            });
            clashCellKeys.add(`${day.id}|${ses.id}|${room}`);
          }
        }
      });

      Object.entries(seenInSession).forEach(([kode, rList]) => {
        if (rList.length > 1) {
          clashes.push({
            dayLabel: day.labelHariTanggal,
            jamKe: ses.jamKe,
            kode,
            rooms: rList,
            reason: 'Double ruang di sesi yang sama'
          });
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
}

export default function JadwalPengawasTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeGroup, setActiveGroup] = useState<ScheduleGroupKey>('kelas78');

  const [teachers, setTeachers] = useState<GuruOption[]>([]);
  const [mapelOptions, setMapelOptions] = useState<string[]>([]);
  const [showTeacherPicker, setShowTeacherPicker] = useState(false);
  const [teacherSearch, setTeacherSearch] = useState('');

  const [groups, setGroups] = useState<Record<ScheduleGroupKey, GroupScheduleState>>({
    kelas78: createInitialGroupState('kelas78'),
    kelas9: createInitialGroupState('kelas9')
  });

  const [roomCountInput, setRoomCountInput] = useState<number>(17);
  const [highlightedKode, setHighlightedKode] = useState<string | null>(null);

  const [editingCell, setEditingCell] = useState<{
    dayId: string;
    sessionId: string;
    room: string;
    label: string;
    jamKe: string;
    mataUjian: string;
    currentKode: string;
  } | null>(null);

  const currentGroup = groups[activeGroup];
  const otherGroupKey: ScheduleGroupKey = activeGroup === 'kelas78' ? 'kelas9' : 'kelas78';
  const otherGroup = groups[otherGroupKey];

  useEffect(() => {
    setRoomCountInput(groups[activeGroup].rooms.length);
  }, [activeGroup, groups[activeGroup].rooms.length]);

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
            if (parsed.format === 'v2_dual_group' && parsed.groups) {
              const init78 = createInitialGroupState('kelas78');
              const init9 = createInitialGroupState('kelas9');
              setGroups({
                kelas78: {
                  headerInfo: { ...init78.headerInfo, ...(parsed.groups.kelas78?.headerInfo || {}) },
                  rooms: Array.isArray(parsed.groups.kelas78?.rooms) && parsed.groups.kelas78.rooms.length > 0
                    ? parsed.groups.kelas78.rooms
                    : init78.rooms,
                  days: Array.isArray(parsed.groups.kelas78?.days) && parsed.groups.kelas78.days.length > 0
                    ? parsed.groups.kelas78.days
                    : init78.days,
                  excludedKodes: Array.isArray(parsed.groups.kelas78?.excludedKodes)
                    ? parsed.groups.kelas78.excludedKodes
                    : []
                },
                kelas9: {
                  headerInfo: { ...init9.headerInfo, ...(parsed.groups.kelas9?.headerInfo || {}) },
                  rooms: Array.isArray(parsed.groups.kelas9?.rooms) && parsed.groups.kelas9.rooms.length > 0
                    ? parsed.groups.kelas9.rooms
                    : init9.rooms,
                  days: Array.isArray(parsed.groups.kelas9?.days) && parsed.groups.kelas9.days.length > 0
                    ? parsed.groups.kelas9.days
                    : init9.days,
                  excludedKodes: Array.isArray(parsed.groups.kelas9?.excludedKodes)
                    ? parsed.groups.kelas9.excludedKodes
                    : []
                }
              });
            } else if (Array.isArray(parsed.days)) {
              // Migrasi otomatis format v1 lama -> masuk ke kelas78
              const init78 = createInitialGroupState('kelas78');
              setGroups(prev => ({
                ...prev,
                kelas78: {
                  headerInfo: { ...init78.headerInfo, ...(parsed.headerInfo || {}) },
                  rooms: Array.isArray(parsed.rooms) && parsed.rooms.length > 0 ? parsed.rooms : init78.rooms,
                  days: parsed.days.length > 0 ? parsed.days : init78.days,
                  excludedKodes: Array.isArray(parsed.excludedKodes) ? parsed.excludedKodes : []
                }
              }));
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

  const updateCurrentGroup = (updater: (prev: GroupScheduleState) => GroupScheduleState) => {
    setGroups(prev => ({
      ...prev,
      [activeGroup]: updater(prev[activeGroup])
    }));
  };

  const teacherByKode = useMemo(() => {
    const map = new Map<string, GuruOption>();
    teachers.forEach(t => map.set(t.kode, t));
    return map;
  }, [teachers]);

  const activePool = useMemo(() => {
    const excl = new Set(currentGroup.excludedKodes);
    return teachers.filter(t => !excl.has(t.kode));
  }, [teachers, currentGroup.excludedKodes]);

  const stats78 = useMemo(() => computeGroupStats(groups.kelas78, groups.kelas9), [groups]);
  const stats9 = useMemo(() => computeGroupStats(groups.kelas9, groups.kelas78), [groups]);

  const scheduleStats = activeGroup === 'kelas78' ? stats78 : stats9;
  const otherStats = activeGroup === 'kelas78' ? stats9 : stats78;

  const legendTeachers = useMemo(() => {
    if (scheduleStats.usedKodes.length > 0) {
      return scheduleStats.usedKodes.map(kode => {
        const found = teacherByKode.get(kode);
        const curCount = scheduleStats.counts[kode] || 0;
        const otherCount = otherStats.counts[kode] || 0;
        return {
          kode,
          nama: found?.nama || `Guru Kode ${kode}`,
          count: curCount,
          totalCombined: curCount + otherCount
        };
      });
    }
    return activePool.map(t => ({
      kode: t.kode,
      nama: t.nama,
      count: 0,
      totalCombined: otherStats.counts[t.kode] || 0
    }));
  }, [scheduleStats, otherStats, teacherByKode, activePool]);

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
    updateCurrentGroup(prev => ({ ...prev, rooms: createDefaultRooms(clamped) }));
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
      const assignments: any[] = Array.isArray(parsed.assignments) ? parsed.assignments : [];

      // Filter ruang sesuai jenjang aktif (Kelas 7-8 atau Kelas 9)
      const matchingAssignments = assignments.filter(a => {
        const g = extractGradeNum(a.rombel || a.kelas || '');
        if (activeGroup === 'kelas78') return g === 7 || g === 8;
        return g === 9;
      });

      const sourceList = matchingAssignments.length > 0 ? matchingAssignments : assignments;
      const rawRooms: string[] = Array.from(
        new Set(sourceList.map((a: any) => String(a.ruang || '').trim()).filter(Boolean))
      ) as string[];

      if (rawRooms.length === 0) {
        Swal.fire('Belum Ada Data', 'Data ruang pada Konfigurasi Ruang masih kosong.', 'info');
        return;
      }

      rawRooms.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
      const formatted = rawRooms.map(formatRoomShort);
      updateCurrentGroup(prev => ({ ...prev, rooms: formatted }));
      setRoomCountInput(formatted.length);
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: `${formatted.length} ruang (${activeGroup === 'kelas78' ? 'Kelas 7–8' : 'Kelas 9'}) ditarik.`,
        showConfirmButton: false,
        timer: 2000
      });
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Gagal menarik daftar ruang dari Konfigurasi Ruang.', 'error');
    }
  };

  const handleAddDay = () => {
    const lastDay = currentGroup.days[currentGroup.days.length - 1];
    const nextIso = lastDay?.tanggal ? addDaysIso(lastDay.tanggal, 1) : undefined;
    updateCurrentGroup(prev => ({
      ...prev,
      days: [...prev.days, createInitialDay(activeGroup, nextIso)]
    }));
  };

  const handleRemoveDay = (dayId: string) => {
    if (currentGroup.days.length <= 1) return;
    updateCurrentGroup(prev => ({
      ...prev,
      days: prev.days.filter(d => d.id !== dayId)
    }));
  };

  const handleUpdateDayDate = (dayId: string, newIso: string) => {
    updateCurrentGroup(prev => ({
      ...prev,
      days: prev.days.map(d =>
        d.id === dayId
          ? { ...d, tanggal: newIso, labelHariTanggal: formatTanggalIndonesia(newIso) || d.labelHariTanggal }
          : d
      )
    }));
  };

  const handleUpdateDayLabel = (dayId: string, label: string) => {
    updateCurrentGroup(prev => ({
      ...prev,
      days: prev.days.map(d => (d.id === dayId ? { ...d, labelHariTanggal: label } : d))
    }));
  };

  const handleAddSession = (dayId: string) => {
    updateCurrentGroup(prev => ({
      ...prev,
      days: prev.days.map(d => {
        if (d.id !== dayId) return d;
        const idx = d.sessions.length;
        const waktuList = activeGroup === 'kelas78' ? DEFAULT_WAKTU_PAGI : DEFAULT_WAKTU_SIANG;
        return {
          ...d,
          sessions: [
            ...d.sessions,
            {
              id: uid('ses'),
              jamKe: ROMAN_NUMERALS[idx] || String(idx + 1),
              waktu: DEFAULT_WAKTU_PAGI[idx] || waktuList[idx] || '',
              mataUjian: '',
              pengawas: {}
            }
          ]
        };
      })
    }));
  };

  const handleRemoveSession = (dayId: string, sessionId: string) => {
    updateCurrentGroup(prev => ({
      ...prev,
      days: prev.days.map(d => {
        if (d.id !== dayId || d.sessions.length <= 1) return d;
        return { ...d, sessions: d.sessions.filter(s => s.id !== sessionId) };
      })
    }));
  };

  const handleUpdateSessionField = (
    dayId: string,
    sessionId: string,
    field: 'jamKe' | 'waktu' | 'mataUjian',
    value: string
  ) => {
    updateCurrentGroup(prev => ({
      ...prev,
      days: prev.days.map(d => {
        if (d.id !== dayId) return d;
        return {
          ...d,
          sessions: d.sessions.map(s => (s.id === sessionId ? { ...s, [field]: value } : s))
        };
      })
    }));
  };

  // Salin susunan hari/jam/mapel dari jadwal pasangannya (tanpa menyalin pengawas) untuk mempercepat input
  const handleCopyScheduleStructureFromOther = async () => {
    const otherLabel = otherGroupKey === 'kelas78' ? 'Kelas 7–8' : 'Kelas 9';
    const curLabel = activeGroup === 'kelas78' ? 'Kelas 7–8' : 'Kelas 9';
    const res = await Swal.fire({
      title: `Salin Susunan Hari & Mapel dari ${otherLabel}?`,
      text: `Hari, Jam Ke, Waktu, dan Mata Ujian pada jadwal ${curLabel} akan diisi mengikuti jadwal ${otherLabel} (kode pengawas tetap kosong untuk digenerate ulang).`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Ya, Salin Susunan',
      cancelButtonText: 'Batal'
    });
    if (!res.isConfirmed) return;

    const clonedDays: ExamDay[] = otherGroup.days.map(d => ({
      id: uid('day'),
      tanggal: d.tanggal,
      labelHariTanggal: d.labelHariTanggal,
      sessions: d.sessions.map(s => ({
        id: uid('ses'),
        jamKe: s.jamKe,
        waktu: s.waktu,
        mataUjian: s.mataUjian,
        pengawas: {}
      }))
    }));
    updateCurrentGroup(prev => ({ ...prev, days: clonedDays }));
  };

  // Algoritma Generate Pengawas Otomatis: merata di jadwal aktif, menyeimbangkan beban gabungan, & bebas bentrok (termasuk lintas jadwal jika tanggal+waktu sama)
  const handleGeneratePengawas = () => {
    const targetRooms = currentGroup.rooms;
    if (targetRooms.length === 0) {
      Swal.fire('Perhatian', 'Jumlah ruang harus minimal 1.', 'warning');
      return;
    }
    if (activePool.length < targetRooms.length) {
      Swal.fire(
        'Jumlah Guru Kurang',
        `Jumlah guru pengawas terpilih (${activePool.length}) lebih sedikit dari jumlah ruang (${targetRooms.length}).`,
        'warning'
      );
      return;
    }

    // Petakan guru yang sedang bertugas di jadwal pasangan pada (tanggal + waktu) yang persis sama, dan beban hariannya
    const otherBusyAtDateTime = new Map<string, Set<string>>();
    const otherDayCount = new Map<string, Record<string, number>>();
    otherGroup.days.forEach(od => {
      const tgl = (od.tanggal || od.labelHariTanggal || '').trim();
      if (!tgl) return;
      if (!otherDayCount.has(tgl)) otherDayCount.set(tgl, {});
      const dMap = otherDayCount.get(tgl)!;
      od.sessions.forEach(oses => {
        const wKey = normWaktuKey(oses.waktu);
        const dtKey = wKey ? `${tgl}|${wKey}` : '';
        if (dtKey && !otherBusyAtDateTime.has(dtKey)) otherBusyAtDateTime.set(dtKey, new Set());
        otherGroup.rooms.forEach(rm => {
          const k = (oses.pengawas?.[rm] || '').trim();
          if (k) {
            dMap[k] = (dMap[k] || 0) + 1;
            if (dtKey) otherBusyAtDateTime.get(dtKey)!.add(k);
          }
        });
      });
    });

    const totalCount: Record<string, number> = {};
    const roomHistory: Record<string, Set<string>> = {};
    activePool.forEach(t => {
      totalCount[t.kode] = 0;
      roomHistory[t.kode] = new Set();
    });

    const updatedDays = currentGroup.days.map(day => {
      const dayCount: Record<string, number> = {};
      const tgl = (day.tanggal || day.labelHariTanggal || '').trim();
      const otherSameDayMap = otherDayCount.get(tgl) || {};
      let prevSessionSet = new Set<string>();

      const newSessions = day.sessions.map(ses => {
        const wKey = normWaktuKey(ses.waktu);
        const busyInOtherAtExactTime = (tgl && wKey ? otherBusyAtDateTime.get(`${tgl}|${wKey}`) : undefined) || new Set<string>();

        const scoredPool = activePool.map(t => ({
          teacher: t,
          // Prioritas 1: jangan sampai bentrok dengan jadwal pasangan di tanggal & waktu sama
          crossClash: busyInOtherAtExactTime.has(t.kode) ? 1 : 0,
          // Prioritas 2: beban total di jadwal ini (menjamin merata selisih <= 1)
          total: totalCount[t.kode] || 0,
          // Prioritas 3: beban hari ini (jadwal ini + jadwal pasangan)
          dayLoad: (dayCount[t.kode] || 0) + (otherSameDayMap[t.kode] || 0),
          // Prioritas 4: beban gabungan total (jadwal ini + jadwal pasangan)
          combinedTotal: (totalCount[t.kode] || 0) + (otherStats.counts[t.kode] || 0),
          // Prioritas 5: hindari sesi berurutan langsung jika masih ada pilihan
          wasPrev: prevSessionSet.has(t.kode) ? 1 : 0,
          rand: Math.random()
        }));

        scoredPool.sort(
          (a, b) =>
            a.crossClash - b.crossClash ||
            a.total - b.total ||
            a.dayLoad - b.dayLoad ||
            a.combinedTotal - b.combinedTotal ||
            a.wasPrev - b.wasPrev ||
            a.rand - b.rand
        );

        const chosen = scoredPool.slice(0, targetRooms.length).map(x => x.teacher);
        const remainingTeachers = [...chosen];
        const newPengawas: Record<string, string> = {};

        for (const room of targetRooms) {
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

    updateCurrentGroup(prev => ({ ...prev, days: updatedDays }));

    const vals = Object.values(totalCount);
    const minV = Math.min(...vals);
    const maxV = Math.max(...vals);
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: `Pengawas ${activeGroup === 'kelas78' ? 'Kelas 7–8' : 'Kelas 9'} digenerate merata (${minV}–${maxV}x/guru).`,
      showConfirmButton: false,
      timer: 2800
    });
  };

  const handleClearPengawas = () => {
    updateCurrentGroup(prev => ({
      ...prev,
      days: prev.days.map(d => ({
        ...d,
        sessions: d.sessions.map(s => ({ ...s, pengawas: {} }))
      }))
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        format: 'v2_dual_group',
        groups,
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
        title: 'Kedua Jadwal Pengawas (Kelas 7–8 & Kelas 9) berhasil disimpan!',
        showConfirmButton: false,
        timer: 2200
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
    updateCurrentGroup(prev => ({
      ...prev,
      days: prev.days.map(d => {
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
    }));
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

    const { headerInfo, rooms, days } = currentGroup;

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

  const buildSheetForGroup = (grp: GroupScheduleState, st: ReturnType<typeof computeGroupStats>) => {
    const aoa: (string | number)[][] = [
      [grp.headerInfo.judul],
      [grp.headerInfo.subJudul],
      [],
      ['NO', 'HARI / TANGGAL', 'JAM KE', 'WAKTU', 'MATA UJIAN', 'RUANG & KODE PENGAWAS', ...Array(Math.max(0, grp.rooms.length - 1)).fill('')],
      ['', '', '', '', '', ...grp.rooms]
    ];

    const merges: XLSX.Range[] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 4 + grp.rooms.length } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 4 + grp.rooms.length } },
      { s: { r: 3, c: 0 }, e: { r: 4, c: 0 } },
      { s: { r: 3, c: 1 }, e: { r: 4, c: 1 } },
      { s: { r: 3, c: 2 }, e: { r: 4, c: 2 } },
      { s: { r: 3, c: 3 }, e: { r: 4, c: 3 } },
      { s: { r: 3, c: 4 }, e: { r: 4, c: 4 } },
      { s: { r: 3, c: 5 }, e: { r: 3, c: 4 + grp.rooms.length } }
    ];

    let curRow = 5;
    grp.days.forEach((day, dIdx) => {
      const startR = curRow;
      day.sessions.forEach((ses, sIdx) => {
        aoa.push([
          sIdx === 0 ? dIdx + 1 : '',
          sIdx === 0 ? day.labelHariTanggal : '',
          ses.jamKe,
          ses.waktu,
          ses.mataUjian,
          ...grp.rooms.map(r => ses.pengawas?.[r] || '')
        ]);
        curRow++;
      });
      if (day.sessions.length > 1) {
        merges.push({ s: { r: startR, c: 0 }, e: { r: curRow - 1, c: 0 } });
        merges.push({ s: { r: startR, c: 1 }, e: { r: curRow - 1, c: 1 } });
      }
    });

    const usedList = st.usedKodes.map(k => ({
      kode: k,
      nama: teacherByKode.get(k)?.nama || `Guru Kode ${k}`
    }));
    const perCol = Math.ceil(usedList.length / 3) || 1;
    const cols = [usedList.slice(0, perCol), usedList.slice(perCol, perCol * 2), usedList.slice(perCol * 2)];

    aoa.push([]);
    aoa.push(['Kode & Nama Pengawas']);
    const maxRows = Math.max(cols[0].length, cols[1].length, cols[2].length);
    for (let i = 0; i < maxRows; i++) {
      aoa.push([
        cols[0][i]?.kode || '', cols[0][i]?.nama || '', '',
        cols[1][i]?.kode || '', cols[1][i]?.nama || '', '',
        cols[2][i]?.kode || '', cols[2][i]?.nama || ''
      ]);
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!merges'] = merges;
    return ws;
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, buildSheetForGroup(groups.kelas78, stats78), 'Jadwal Kls 7-8');
    XLSX.utils.book_append_sheet(wb, buildSheetForGroup(groups.kelas9, stats9), 'Jadwal Kls 9');

    // Sheet 3: Rekap Beban Gabungan
    const allUsedKodes = Array.from(
      new Set([...teachers.map(t => t.kode), ...stats78.usedKodes, ...stats9.usedKodes])
    ).sort((a, b) => Number(a) - Number(b));

    const rekapRows: (string | number)[][] = [
      ['No', 'Kode Guru', 'Nama Guru', 'Jabatan', 'Mengawas Kls 7-8', 'Mengawas Kls 9', 'Total Mengawas']
    ];
    allUsedKodes.forEach((kode, idx) => {
      const info = teacherByKode.get(kode);
      const c78 = stats78.counts[kode] || 0;
      const c9 = stats9.counts[kode] || 0;
      rekapRows.push([idx + 1, kode, info?.nama || `Guru Kode ${kode}`, info?.jabatan || 'Guru', c78, c9, c78 + c9]);
    });
    const wsRekap = XLSX.utils.aoa_to_sheet(rekapRows);
    XLSX.utils.book_append_sheet(wb, wsRekap, 'Rekap Beban Gabungan');

    XLSX.writeFile(wb, 'Jadwal_Pengawas_Ujian_78_dan_9.xlsx');
  };

  if (loading) {
    return <InlineLoading message="Memuat data guru dan konfigurasi jadwal pengawas..." />;
  }

  const editingSessionObj = editingCell
    ? currentGroup.days.find(d => d.id === editingCell.dayId)?.sessions.find(s => s.id === editingCell.sessionId)
    : null;

  const busyKodesInEditingSession = new Map<string, string>();
  if (editingCell && editingSessionObj) {
    currentGroup.rooms.forEach(r => {
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

  const activeGroupLabel = activeGroup === 'kelas78' ? 'Kelas 7–8' : 'Kelas 9';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <datalist id="pengawas-mapel-list">
        {mapelOptions.map(m => (
          <option key={m} value={m} />
        ))}
      </datalist>

      {/* Switcher 2 Jadwal: Kelas 7-8 & Kelas 9 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '2px solid #e2e8f0', paddingBottom: '14px' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => {
              setActiveGroup('kelas78');
              setShowTeacherPicker(false);
            }}
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              border: activeGroup === 'kelas78' ? '2px solid #0284c7' : '1px solid #cbd5e1',
              background: activeGroup === 'kelas78' ? '#e0f2fe' : 'white',
              color: activeGroup === 'kelas78' ? '#0369a1' : '#475569',
              fontWeight: 700,
              fontSize: '0.92rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <i className="fas fa-layer-group"></i>
            Jadwal Pengawas Kelas 7–8
            <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '999px', background: activeGroup === 'kelas78' ? '#0284c7' : '#e2e8f0', color: activeGroup === 'kelas78' ? 'white' : '#475569' }}>
              {stats78.filledSlots}/{stats78.totalSlots}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveGroup('kelas9');
              setShowTeacherPicker(false);
            }}
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              border: activeGroup === 'kelas9' ? '2px solid #0284c7' : '1px solid #cbd5e1',
              background: activeGroup === 'kelas9' ? '#e0f2fe' : 'white',
              color: activeGroup === 'kelas9' ? '#0369a1' : '#475569',
              fontWeight: 700,
              fontSize: '0.92rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <i className="fas fa-graduation-cap"></i>
            Jadwal Pengawas Kelas 9
            <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '999px', background: activeGroup === 'kelas9' ? '#0284c7' : '#e2e8f0', color: activeGroup === 'kelas9' ? 'white' : '#475569' }}>
              {stats9.filledSlots}/{stats9.totalSlots}
            </span>
          </button>
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
            <i className="fas fa-magic"></i> Generate Pengawas ({activeGroupLabel})
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
            {saving ? 'Menyimpan...' : 'Simpan Semua'}
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
            <i className="fas fa-print"></i> Cetak {activeGroupLabel}
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
            <i className="fas fa-file-excel"></i> Export Excel
          </button>
        </div>
      </div>

      {/* Pengaturan Kop & Ruang untuk Jadwal Aktif */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
              Judul Jadwal ({activeGroupLabel})
            </label>
            <input
              type="text"
              value={currentGroup.headerInfo.judul}
              onChange={e => updateCurrentGroup(prev => ({ ...prev, headerInfo: { ...prev.headerInfo, judul: e.target.value } }))}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.86rem', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Sub Judul / Nama Madrasah</label>
            <input
              type="text"
              value={currentGroup.headerInfo.subJudul}
              onChange={e => updateCurrentGroup(prev => ({ ...prev, headerInfo: { ...prev.headerInfo, subJudul: e.target.value } }))}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.86rem', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Tempat &amp; Tanggal TTD</label>
            <input
              type="text"
              value={currentGroup.headerInfo.tanggalTtd}
              onChange={e => updateCurrentGroup(prev => ({ ...prev, headerInfo: { ...prev.headerInfo, tanggalTtd: e.target.value } }))}
              placeholder="Singosari, 18 April 2026"
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.86rem', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Nama Kepala Madrasah</label>
            <input
              type="text"
              value={currentGroup.headerInfo.kepalaMadrasah}
              onChange={e => updateCurrentGroup(prev => ({ ...prev, headerInfo: { ...prev.headerInfo, kepalaMadrasah: e.target.value } }))}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.86rem', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* Bar Ruang & Pool Pengawas */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '0.84rem', fontWeight: 700, color: '#334155' }}>Jumlah Ruang ({activeGroupLabel}):</label>
            <input
              type="number"
              min={1}
              max={40}
              value={roomCountInput}
              onChange={e => setRoomCountInput(Number(e.target.value))}
              style={{ width: '64px', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.88rem', fontWeight: 700, textAlign: 'center' }}
            />
            <button
              type="button"
              onClick={handleApplyRoomCount}
              style={{ padding: '6px 11px', borderRadius: '6px', border: '1px solid #0ea5e9', background: 'white', color: '#0284c7', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}
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
            Tarik Ruang ({activeGroupLabel})
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
            Pilih Guru Pengawas ({activePool.length}/{teachers.length} Guru)
          </button>

          {scheduleStats.filledSlots > 0 && (
            <button
              type="button"
              onClick={handleClearPengawas}
              style={{ marginLeft: 'auto', padding: '7px 12px', borderRadius: '6px', border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}
            >
              <i className="fas fa-eraser" style={{ marginRight: '5px' }}></i>
              Kosongkan Pengawas
            </button>
          )}
        </div>

        {/* Panel Checklist Guru Pengawas */}
        {showTeacherPicker && (
          <div style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
              <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#1e293b' }}>
                Guru Pengawas untuk {activeGroupLabel} (Staf otomatis tidak disertakan):
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
                  onClick={() => updateCurrentGroup(prev => ({ ...prev, excludedKodes: [] }))}
                  style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Pilih Semua
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const ks = teachers.filter(t => t.jabatan.toLowerCase().includes('kepala')).map(t => t.kode);
                    updateCurrentGroup(prev => ({ ...prev, excludedKodes: Array.from(new Set([...prev.excludedKodes, ...ks])) }));
                  }}
                  style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #fde68a', background: '#fffbeb', color: '#b45309', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Kecualikan Kepala Madrasah
                </button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '6px', maxHeight: '220px', overflowY: 'auto' }}>
              {filteredTeachersPicker.map(t => {
                const checked = !currentGroup.excludedKodes.includes(t.kode);
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
                        updateCurrentGroup(prev => ({
                          ...prev,
                          excludedKodes: prev.excludedKodes.includes(t.kode)
                            ? prev.excludedKodes.filter(k => k !== t.kode)
                            : [...prev.excludedKodes, t.kode]
                        }))
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
            Susunan Hari, Jam Ke &amp; Mata Ujian — {activeGroupLabel} ({currentGroup.days.length} Hari · {currentGroup.days.reduce((a, d) => a + d.sessions.length, 0)} Sesi)
          </h3>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleCopyScheduleStructureFromOther}
              style={{ background: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1', padding: '7px 12px', borderRadius: '6px', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <i className="fas fa-copy"></i> Salin Hari &amp; Mapel dari {otherGroupKey === 'kelas78' ? 'Kelas 7–8' : 'Kelas 9'}
            </button>
            <button
              type="button"
              onClick={handleAddDay}
              style={{ background: '#0ea5e9', color: 'white', border: 'none', padding: '7px 14px', borderRadius: '6px', fontWeight: 700, fontSize: '0.83rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <i className="fas fa-plus"></i> Tambah Hari Ujian
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {currentGroup.days.map((day, dIdx) => (
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
                {currentGroup.days.length > 1 && (
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
                      inputMode="numeric"
                      value={ses.waktu}
                      onChange={e =>
                        handleUpdateSessionField(
                          day.id,
                          ses.id,
                          'waktu',
                          formatWaktuRangeInput(e.target.value, ses.waktu)
                        )
                      }
                      placeholder="07.30 - 09.30"
                      style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.84rem', textAlign: 'center', background: 'white' }}
                      title="Ketik angka jam (misal 07000845), titik dan tanda hubung muncul otomatis"
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
          Slot {activeGroupLabel}: {scheduleStats.filledSlots} / {scheduleStats.totalSlots}
        </span>
        <span style={{ padding: '6px 12px', borderRadius: '999px', background: '#e0f2fe', color: '#0369a1', fontSize: '0.82rem', fontWeight: 700 }}>
          Guru Bertugas: {scheduleStats.usedKodes.length} / {activePool.length}
        </span>
        {scheduleStats.filledSlots > 0 && (
          <span style={{ padding: '6px 12px', borderRadius: '999px', background: '#dcfce7', color: '#166534', fontSize: '0.82rem', fontWeight: 700 }}>
            Beban ({activeGroupLabel}): {scheduleStats.minLoad === scheduleStats.maxLoad ? `${scheduleStats.minLoad}x` : `${scheduleStats.minLoad}–${scheduleStats.maxLoad}x`} / Guru
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
              <th colSpan={currentGroup.rooms.length} style={{ border: '1px solid #334155', padding: '6px 8px', textAlign: 'center' }}>
                RUANG &amp; KODE PENGAWAS ({activeGroupLabel.toUpperCase()})
              </th>
            </tr>
            <tr style={{ background: '#2d5a8e', color: 'white' }}>
              {currentGroup.rooms.map(r => (
                <th key={r} style={{ border: '1px solid #334155', padding: '5px 4px', textAlign: 'center', minWidth: '38px' }}>
                  {r}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentGroup.days.map((day, dIdx) =>
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
                  {currentGroup.rooms.map(r => {
                    const kode = ses.pengawas?.[r] || '';
                    const isClash = scheduleStats.clashCellKeys.has(`${day.id}|${ses.id}|${r}`);
                    const isHighlighted = Boolean(highlightedKode && kode === highlightedKode);
                    const isDimmed = Boolean(highlightedKode && !isHighlighted && !isClash);
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
                          fontWeight: isHighlighted ? 900 : 700,
                          cursor: 'pointer',
                          background: isClash
                            ? '#fee2e2'
                            : isHighlighted
                            ? '#facc15'
                            : undefined,
                          boxShadow: isHighlighted && !isClash
                            ? 'inset 0 0 0 2px #b45309'
                            : undefined,
                          color: isClash
                            ? '#dc2626'
                            : isHighlighted
                            ? '#713f12'
                            : isDimmed
                            ? '#cbd5e1'
                            : kode
                            ? '#0f172a'
                            : '#cbd5e1',
                          transition: 'background-color 0.15s ease, color 0.15s ease'
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1e293b' }}>
            Kode &amp; Nama Pengawas — {activeGroupLabel} ({legendTeachers.length} Guru)
            <span style={{ fontSize: '0.78rem', fontWeight: 500, color: '#64748b', marginLeft: '8px' }}>
              (Klik nama pengawas untuk menyorot kodenya di tabel)
            </span>
          </h3>
          {highlightedKode && (
            <button
              type="button"
              onClick={() => setHighlightedKode(null)}
              style={{
                background: '#fef08a',
                color: '#854d0e',
                border: '1px solid #eab308',
                padding: '4px 12px',
                borderRadius: '999px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <i className="fas fa-highlighter"></i>
              Menyorot [{highlightedKode}] {teacherByKode.get(highlightedKode)?.nama || ''} · Tutup
            </button>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: '10px' }}>
          {legendColumns.map((col, colIdx) => (
            <table key={colIdx} style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', background: 'white' }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={{ border: '1px solid #cbd5e1', padding: '5px 6px', width: '44px', textAlign: 'center' }}>Kode</th>
                  <th style={{ border: '1px solid #cbd5e1', padding: '5px 8px', textAlign: 'left' }}>Nama Pengawas</th>
                  <th style={{ border: '1px solid #cbd5e1', padding: '5px 6px', width: '54px', textAlign: 'center' }} title={`Jumlah mengawas di ${activeGroupLabel}`}>
                    Jml
                  </th>
                  <th style={{ border: '1px solid #cbd5e1', padding: '5px 6px', width: '54px', textAlign: 'center' }} title="Total gabungan Kelas 7-8 + Kelas 9">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {col.map(t => {
                  const isRowSelected = highlightedKode === t.kode;
                  return (
                    <tr
                      key={t.kode}
                      onClick={() => setHighlightedKode(prev => (prev === t.kode ? null : t.kode))}
                      style={{
                        cursor: 'pointer',
                        background: isRowSelected ? '#fef08a' : undefined,
                        transition: 'background-color 0.15s ease'
                      }}
                      title="Klik untuk menyorot kode pengawas ini di tabel jadwal"
                    >
                      <td style={{ border: '1px solid #cbd5e1', padding: '4px 6px', textAlign: 'center', fontWeight: 800, color: isRowSelected ? '#92400e' : '#0369a1' }}>
                        {t.kode}
                      </td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '4px 8px', color: isRowSelected ? '#78350f' : '#1e293b', fontWeight: isRowSelected ? 700 : 400 }}>
                        {t.nama}
                      </td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '4px 6px', textAlign: 'center', fontWeight: 700, color: t.count > 0 ? '#15803d' : '#94a3b8' }}>
                        {t.count}x
                      </td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '4px 6px', textAlign: 'center', fontWeight: 700, color: '#334155', background: isRowSelected ? '#fde047' : '#f8fafc' }}>
                        {t.totalCombined}x
                      </td>
                    </tr>
                  );
                })}
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
                  Pilih Pengawas ({activeGroupLabel}) — {editingCell.room}
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
                const combinedTugas = totalTugas + (otherStats.counts[t.kode] || 0);
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
                      {totalTugas}x (Tot {combinedTugas}x)
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
