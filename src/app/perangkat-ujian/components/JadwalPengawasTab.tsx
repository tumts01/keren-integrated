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
  pengganti?: Record<string, string>; // roomName -> namaPengganti (opsional)
}

interface RoomListBlock {
  key: string;
  dayId: string;
  dayIndex: number;
  tanggal: string;
  labelHariTanggal: string;
  sessionIds: string[];
  jamLabel: string;
  waktuLabel: string;
  mapelLabel: string;
  pengawasByRoom: Record<string, string>;
  penggantiByRoom: Record<string, string>;
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

interface SeragamItem {
  id: string;
  hari: string;
  seragam: string;
}

interface TeacherDayRule {
  mode: 'only' | 'exclude'; // 'only' = hanya di hari terpilih; 'exclude' = tidak boleh di hari terpilih
  dayIds: string[];
}

interface GroupScheduleState {
  headerInfo: HeaderInfo;
  rooms: string[];
  days: ExamDay[];
  excludedKodes: string[];
  teacherDayRules: Record<string, TeacherDayRule>;
  roomFloors: Record<string, string>;
  teacherFloorRules: Record<string, string[]>;
  seragamList: SeragamItem[];
  catatanInfo: string;
}

const AVAILABLE_FLOORS = ['1', '2', '3'];

const DEFAULT_SERAGAM_LIST: Array<{ hari: string; seragam: string }> = [
  { hari: 'Senin - Selasa', seragam: 'Seragam Dinas / PDH' },
  { hari: 'Rabu - Kamis', seragam: 'Batik Khas Madrasah' },
  { hari: 'Jumat - Sabtu', seragam: 'Baju Muslim / Pramuka' }
];

const DEFAULT_CATATAN_INFO = [
  '1. Pengawas hadir di ruang ujian 15 menit sebelum ujian dimulai.',
  '2. Mengambil & mengembalikan berkas soal serta LJK di ruang panitia.',
  '3. Bila berhalangan hadir, harap segera menghubungi panitia ujian.'
].join('\n');

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

function formatRoomNumberOnly(room: string): string {
  const s = String(room || '').trim();
  const m = s.match(/^(?:r\.?|ruang)\s*0*(\d+)$/i) || s.match(/^0*(\d+)$/);
  if (m) return String(parseInt(m[1], 10));
  return s;
}

function buildRoomListBlocks(group: GroupScheduleState, splitAllSessions: boolean): RoomListBlock[] {
  const blocks: RoomListBlock[] = [];
  const rooms = group.rooms || [];

  group.days.forEach((day, dIdx) => {
    interface RawAcc {
      dayId: string;
      dayIndex: number;
      tanggal: string;
      labelHariTanggal: string;
      sessions: ExamSession[];
      pengawasByRoom: Record<string, string>;
    }

    const dayAccs: RawAcc[] = [];

    day.sessions.forEach(ses => {
      const curPengawas: Record<string, string> = {};
      rooms.forEach(r => {
        curPengawas[r] = (ses.pengawas?.[r] || '').trim();
      });

      const last = dayAccs[dayAccs.length - 1];
      const sameAssignment =
        !splitAllSessions &&
        Boolean(last) &&
        rooms.every(r => (last.pengawasByRoom[r] || '') === (curPengawas[r] || ''));

      if (sameAssignment && last) {
        last.sessions.push(ses);
      } else {
        dayAccs.push({
          dayId: day.id,
          dayIndex: dIdx,
          tanggal: day.tanggal || '',
          labelHariTanggal: day.labelHariTanggal || `Hari ${dIdx + 1}`,
          sessions: [ses],
          pengawasByRoom: curPengawas
        });
      }
    });

    dayAccs.forEach((acc, bIdx) => {
      const jamItems = acc.sessions.map(s => String(s.jamKe || '').trim()).filter(Boolean);
      const jamLabel =
        jamItems.length > 1
          ? `Jam ${jamItems[0]} – ${jamItems[jamItems.length - 1]}`
          : jamItems.length === 1
          ? `Jam ${jamItems[0]}`
          : `Sesi ${bIdx + 1}`;

      const waktuItems = Array.from(
        new Set(acc.sessions.map(s => String(s.waktu || '').trim()).filter(Boolean))
      );
      const waktuLabel = waktuItems.join(' / ');

      const mapelItems = Array.from(
        new Set(
          acc.sessions
            .map(s => formatMapelShort(s.mataUjian || ''))
            .map(s => s.trim())
            .filter(Boolean)
        )
      );
      const mapelLabel = mapelItems.join(', ');

      const penggantiByRoom: Record<string, string> = {};
      rooms.forEach(r => {
        for (const s of acc.sessions) {
          const val = String(s.pengganti?.[r] || '').trim();
          if (val) {
            penggantiByRoom[r] = val;
            break;
          }
        }
      });

      blocks.push({
        key: `${day.id}__blk_${bIdx}_${acc.sessions.map(s => s.id).join('_')}`,
        dayId: acc.dayId,
        dayIndex: acc.dayIndex,
        tanggal: acc.tanggal,
        labelHariTanggal: acc.labelHariTanggal,
        sessionIds: acc.sessions.map(s => s.id),
        jamLabel,
        waktuLabel,
        mapelLabel,
        pengawasByRoom: acc.pengawasByRoom,
        penggantiByRoom
      });
    });
  });

  return blocks;
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
    excludedKodes: [],
    teacherDayRules: {},
    roomFloors: {},
    teacherFloorRules: {},
    seragamList: DEFAULT_SERAGAM_LIST.map((s, idx) => ({ id: `srg-${groupKey}-${idx}`, ...s })),
    catatanInfo: DEFAULT_CATATAN_INFO
  };
}

function getRoomFloor(room: string, roomFloors?: Record<string, string>): string {
  const f = roomFloors?.[room];
  return f ? String(f) : '1';
}

function isTeacherAllowedInRoom(
  kode: string,
  room: string,
  roomFloors?: Record<string, string>,
  teacherFloorRules?: Record<string, string[]>
): boolean {
  const allowed = teacherFloorRules?.[kode];
  if (!allowed || allowed.length === 0) return true;
  return allowed.includes(getRoomFloor(room, roomFloors));
}

// Bipartite matching (Kuhn DFS) to ensure teachers fit room floor rules & prioritize unrepeated rooms
function matchTeachersToRooms(
  candidateTeachers: GuruOption[],
  rooms: string[],
  roomFloors?: Record<string, string>,
  teacherFloorRules?: Record<string, string[]>,
  prevRoomTeacher?: Record<string, string>,
  roomHistory?: Record<string, Set<string>>
): Record<string, GuruOption> | null {
  const matchTeacherForRoom = new Array<number>(rooms.length).fill(-1);

  // Order room choices per teacher: prefer rooms not in prevRoomTeacher & not yet visited in roomHistory
  const getPreferredRooms = (t: GuruOption): number[] => {
    const allowedIndices: number[] = [];
    for (let rIdx = 0; rIdx < rooms.length; rIdx++) {
      if (isTeacherAllowedInRoom(t.kode, rooms[rIdx], roomFloors, teacherFloorRules)) {
        allowedIndices.push(rIdx);
      }
    }
    allowedIndices.sort((a, b) => {
      const rmA = rooms[a];
      const rmB = rooms[b];
      const prevA = prevRoomTeacher?.[rmA] === t.kode ? 1 : 0;
      const prevB = prevRoomTeacher?.[rmB] === t.kode ? 1 : 0;
      if (prevA !== prevB) return prevA - prevB;
      const histA = roomHistory?.[t.kode]?.has(rmA) ? 1 : 0;
      const histB = roomHistory?.[t.kode]?.has(rmB) ? 1 : 0;
      return histA - histB;
    });
    return allowedIndices;
  };

  const adj = candidateTeachers.map(getPreferredRooms);

  const dfs = (tIdx: number, visitedRoom: boolean[]): boolean => {
    for (const rIdx of adj[tIdx]) {
      if (visitedRoom[rIdx]) continue;
      visitedRoom[rIdx] = true;
      if (matchTeacherForRoom[rIdx] === -1 || dfs(matchTeacherForRoom[rIdx], visitedRoom)) {
        matchTeacherForRoom[rIdx] = tIdx;
        return true;
      }
    }
    return false;
  };

  let matchedCount = 0;
  for (let tIdx = 0; tIdx < candidateTeachers.length; tIdx++) {
    if (dfs(tIdx, new Array(rooms.length).fill(false))) {
      matchedCount += 1;
    }
  }

  if (matchedCount < Math.min(candidateTeachers.length, rooms.length)) {
    return null;
  }

  const result: Record<string, GuruOption> = {};
  for (let rIdx = 0; rIdx < rooms.length; rIdx++) {
    const tIdx = matchTeacherForRoom[rIdx];
    if (tIdx >= 0) {
      result[rooms[rIdx]] = candidateTeachers[tIdx];
    }
  }
  return result;
}

function isTeacherAllowedOnDay(
  kode: string,
  dayId: string,
  rules: Record<string, TeacherDayRule> | undefined,
  validDayIds: Set<string>
): boolean {
  const rule = rules?.[kode];
  if (!rule || !Array.isArray(rule.dayIds)) return true;
  const activeRuleDays = rule.dayIds.filter(id => validDayIds.has(id));
  if (activeRuleDays.length === 0) {
    // If 'exclude' has 0 valid days, allow all; if 'only' has 0 valid days, teacher cannot supervise on existing days
    return rule.mode !== 'only';
  }
  if (rule.mode === 'only') {
    return activeRuleDays.includes(dayId);
  }
  if (rule.mode === 'exclude') {
    return !activeRuleDays.includes(dayId);
  }
  return true;
}

function isStafJabatan(jabatan: string): boolean {
  const j = (jabatan || '').toLowerCase();
  if (j.includes('guru')) return false;
  return /(staf|tata usaha|perpustakaan|bendahara|satpam|kebersihan|laboran|tendik)/i.test(j);
}

function normWaktuKey(w: string): string {
  return String(w || '').toLowerCase().replace(/\s+/g, '');
}

function formatMapelShort(rawName: string): string {
  const s = String(rawName || '').trim();
  if (!s) return '';
  const low = s.toLowerCase();
  if (low.includes('jasmani') || low.includes('olahraga') || low.includes('olah raga') || low.includes('pjok')) {
    return 'PJOK';
  }
  if (low.includes('ilmu pengetahuan alam') || low === 'ipa') return 'IPA';
  if (low.includes('ilmu pengetahuan sosial') || low === 'ips') return 'IPS';
  if (low.includes('sejarah kebudayaan islam') || low === 'ski') return 'SKI';
  if (low.includes('pendidikan pancasila') || low.includes('ppkn') || low === 'pkn') return 'PPKn';
  if (low.includes('bimbingan') && low.includes('konseling')) return 'BK';
  if (low.includes('quran') && low.includes('hadis')) return 'Al-Quran Hadis';
  if (low.includes('quran') && low.includes('hadits')) return 'Al-Quran Hadis';
  return s;
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
  const [showDayRulesPanel, setShowDayRulesPanel] = useState(false);
  const [ruleDraftKode, setRuleDraftKode] = useState('');
  const [ruleDraftMode, setRuleDraftMode] = useState<'only' | 'exclude'>('only');
  const [ruleDraftDayIds, setRuleDraftDayIds] = useState<string[]>([]);
  const [showFloorRulesPanel, setShowFloorRulesPanel] = useState(false);
  const [floorRuleDraftKode, setFloorRuleDraftKode] = useState('');
  const [floorRuleDraftFloors, setFloorRuleDraftFloors] = useState<string[]>(['2']);
  const [rangeStartIdx, setRangeStartIdx] = useState(0);
  const [rangeEndIdx, setRangeEndIdx] = useState(0);
  const [rangeTargetFloor, setRangeTargetFloor] = useState('2');

  const [groups, setGroups] = useState<Record<ScheduleGroupKey, GroupScheduleState>>({
    kelas78: createInitialGroupState('kelas78'),
    kelas9: createInitialGroupState('kelas9')
  });

  const [roomCountInput, setRoomCountInput] = useState<number>(17);
  const [highlightedKode, setHighlightedKode] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'matrix' | 'room_list'>('matrix');
  const [listSelectedDayId, setListSelectedDayId] = useState<string>('ALL');
  const [listSplitAllSessions, setListSplitAllSessions] = useState<boolean>(false);
  const [listShowKode, setListShowKode] = useState<boolean>(false);

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
    setListSelectedDayId('ALL');
  }, [activeGroup]);

  useEffect(() => {
    if (listSelectedDayId !== 'ALL' && !currentGroup.days.some(d => d.id === listSelectedDayId)) {
      setListSelectedDayId('ALL');
    }
  }, [currentGroup.days, listSelectedDayId]);

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
                    : [],
                  teacherDayRules:
                    parsed.groups.kelas78?.teacherDayRules && typeof parsed.groups.kelas78.teacherDayRules === 'object'
                      ? parsed.groups.kelas78.teacherDayRules
                      : {},
                  roomFloors:
                    parsed.groups.kelas78?.roomFloors && typeof parsed.groups.kelas78.roomFloors === 'object'
                      ? parsed.groups.kelas78.roomFloors
                      : {},
                  teacherFloorRules:
                    parsed.groups.kelas78?.teacherFloorRules && typeof parsed.groups.kelas78.teacherFloorRules === 'object'
                      ? parsed.groups.kelas78.teacherFloorRules
                      : {},
                  seragamList: Array.isArray(parsed.groups.kelas78?.seragamList)
                    ? parsed.groups.kelas78.seragamList
                    : init78.seragamList,
                  catatanInfo:
                    typeof parsed.groups.kelas78?.catatanInfo === 'string'
                      ? parsed.groups.kelas78.catatanInfo
                      : init78.catatanInfo
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
                    : [],
                  teacherDayRules:
                    parsed.groups.kelas9?.teacherDayRules && typeof parsed.groups.kelas9.teacherDayRules === 'object'
                      ? parsed.groups.kelas9.teacherDayRules
                      : {},
                  roomFloors:
                    parsed.groups.kelas9?.roomFloors && typeof parsed.groups.kelas9.roomFloors === 'object'
                      ? parsed.groups.kelas9.roomFloors
                      : {},
                  teacherFloorRules:
                    parsed.groups.kelas9?.teacherFloorRules && typeof parsed.groups.kelas9.teacherFloorRules === 'object'
                      ? parsed.groups.kelas9.teacherFloorRules
                      : {},
                  seragamList: Array.isArray(parsed.groups.kelas9?.seragamList)
                    ? parsed.groups.kelas9.seragamList
                    : init9.seragamList,
                  catatanInfo:
                    typeof parsed.groups.kelas9?.catatanInfo === 'string'
                      ? parsed.groups.kelas9.catatanInfo
                      : init9.catatanInfo
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
                  excludedKodes: Array.isArray(parsed.excludedKodes) ? parsed.excludedKodes : [],
                  teacherDayRules:
                    parsed.teacherDayRules && typeof parsed.teacherDayRules === 'object'
                      ? parsed.teacherDayRules
                      : {},
                  roomFloors:
                    parsed.roomFloors && typeof parsed.roomFloors === 'object'
                      ? parsed.roomFloors
                      : {},
                  teacherFloorRules:
                    parsed.teacherFloorRules && typeof parsed.teacherFloorRules === 'object'
                      ? parsed.teacherFloorRules
                      : {},
                  seragamList: Array.isArray(parsed.seragamList) ? parsed.seragamList : init78.seragamList,
                  catatanInfo: typeof parsed.catatanInfo === 'string' ? parsed.catatanInfo : init78.catatanInfo
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

  const validDayIds = useMemo(() => new Set(currentGroup.days.map(d => d.id)), [currentGroup.days]);

  const activeRuleEntries = useMemo(() => {
    const rules = currentGroup.teacherDayRules || {};
    return Object.entries(rules)
      .map(([kode, rule]) => ({
        kode,
        teacher: teacherByKode.get(kode),
        mode: rule.mode,
        dayIds: (rule.dayIds || []).filter(id => validDayIds.has(id)),
      }))
      .filter(item => item.dayIds.length > 0)
      .sort((a, b) => Number(a.kode) - Number(b.kode) || a.kode.localeCompare(b.kode));
  }, [currentGroup.teacherDayRules, teacherByKode, validDayIds]);

  const dayEligibleCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    currentGroup.days.forEach(d => {
      map[d.id] = activePool.filter(t =>
        isTeacherAllowedOnDay(t.kode, d.id, currentGroup.teacherDayRules, validDayIds)
      ).length;
    });
    return map;
  }, [currentGroup.days, currentGroup.teacherDayRules, activePool, validDayIds]);

  const floorCounts = useMemo(() => {
    const counts: Record<string, number> = { '1': 0, '2': 0, '3': 0 };
    currentGroup.rooms.forEach(r => {
      const f = getRoomFloor(r, currentGroup.roomFloors);
      counts[f] = (counts[f] || 0) + 1;
    });
    return counts;
  }, [currentGroup.rooms, currentGroup.roomFloors]);

  const hasCustomFloors = useMemo(
    () => currentGroup.rooms.some(r => getRoomFloor(r, currentGroup.roomFloors) !== '1'),
    [currentGroup.rooms, currentGroup.roomFloors]
  );

  const activeFloorRuleEntries = useMemo(() => {
    const rules = currentGroup.teacherFloorRules || {};
    return Object.entries(rules)
      .filter(([, fls]) => Array.isArray(fls) && fls.length > 0)
      .map(([kode, floors]) => ({
        kode,
        teacher: teacherByKode.get(kode),
        floors: [...floors].sort(),
      }))
      .sort((a, b) => Number(a.kode) - Number(b.kode) || a.kode.localeCompare(b.kode));
  }, [currentGroup.teacherFloorRules, teacherByKode]);

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

  const roomListBlocks = useMemo(
    () => buildRoomListBlocks(currentGroup, listSplitAllSessions),
    [currentGroup, listSplitAllSessions]
  );

  const filteredRoomListBlocks = useMemo(() => {
    if (listSelectedDayId === 'ALL') return roomListBlocks;
    return roomListBlocks.filter(b => b.dayId === listSelectedDayId);
  }, [roomListBlocks, listSelectedDayId]);

  const resolveTeacherDisplayName = (kode: string): string => {
    const clean = String(kode || '').trim();
    if (!clean) return '';
    const found = teacherByKode.get(clean);
    const baseName = found?.nama || `Guru Kode ${clean}`;
    return listShowKode ? `[${clean}] ${baseName}` : baseName;
  };

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
    updateCurrentGroup(prev => {
      const nextRules: Record<string, TeacherDayRule> = {};
      Object.entries(prev.teacherDayRules || {}).forEach(([kode, rule]) => {
        const remainingIds = (rule.dayIds || []).filter(id => id !== dayId);
        if (remainingIds.length > 0) {
          nextRules[kode] = { ...rule, dayIds: remainingIds };
        }
      });
      return {
        ...prev,
        days: prev.days.filter(d => d.id !== dayId),
        teacherDayRules: nextRules,
      };
    });
  };

  const handleSelectTeacherForRule = (kode: string) => {
    setRuleDraftKode(kode);
    const existing = currentGroup.teacherDayRules?.[kode];
    if (existing) {
      setRuleDraftMode(existing.mode);
      setRuleDraftDayIds((existing.dayIds || []).filter(id => validDayIds.has(id)));
    } else {
      setRuleDraftMode('only');
      setRuleDraftDayIds([]);
    }
  };

  const handleToggleRuleDay = (dayId: string) => {
    setRuleDraftDayIds(prev =>
      prev.includes(dayId) ? prev.filter(id => id !== dayId) : [...prev, dayId]
    );
  };

  const handleSaveTeacherDayRule = () => {
    if (!ruleDraftKode) {
      Swal.fire('Pilih Guru', 'Silakan pilih guru terlebih dahulu.', 'info');
      return;
    }
    if (ruleDraftDayIds.length === 0) {
      Swal.fire(
        'Pilih Hari',
        ruleDraftMode === 'only'
          ? 'Pilih minimal 1 hari di mana guru tersebut boleh mengawas.'
          : 'Pilih minimal 1 hari di mana guru tersebut tidak boleh mengawas.',
        'info'
      );
      return;
    }

    updateCurrentGroup(prev => ({
      ...prev,
      teacherDayRules: {
        ...(prev.teacherDayRules || {}),
        [ruleDraftKode]: {
          mode: ruleDraftMode,
          dayIds: [...ruleDraftDayIds],
        },
      },
    }));

    const t = teacherByKode.get(ruleDraftKode);
    setRuleDraftKode('');
    setRuleDraftDayIds([]);
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: `Aturan hari khusus untuk ${t?.nama || ruleDraftKode} diterapkan.`,
      showConfirmButton: false,
      timer: 2000,
    });
  };

  const handleDeleteTeacherDayRule = (kode: string) => {
    updateCurrentGroup(prev => {
      const next = { ...(prev.teacherDayRules || {}) };
      delete next[kode];
      return { ...prev, teacherDayRules: next };
    });
    if (ruleDraftKode === kode) {
      setRuleDraftKode('');
      setRuleDraftDayIds([]);
    }
  };

  const handleCopyDayRulesFromOther = async () => {
    const sourceRules = otherGroup.teacherDayRules || {};
    const sourceValidIds = new Set(otherGroup.days.map(d => d.id));
    const entries = Object.entries(sourceRules).filter(([, r]) =>
      (r.dayIds || []).some(id => sourceValidIds.has(id))
    );

    const sourceLabel = otherGroupKey === 'kelas78' ? 'Kelas 7–8' : 'Kelas 9';
    if (entries.length === 0) {
      Swal.fire(
        'Belum Ada Aturan',
        `Aturan hari khusus guru di jadwal ${sourceLabel} masih kosong.`,
        'info'
      );
      return;
    }

    if (activeRuleEntries.length > 0) {
      const confirm = await Swal.fire({
        title: `Tarik Aturan dari ${sourceLabel}?`,
        text: `Aturan hari khusus pada ${activeGroupLabel} akan diganti dengan aturan dari ${sourceLabel} (${entries.length} guru).`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Ya, Tarik Data',
        cancelButtonText: 'Batal',
      });
      if (!confirm.isConfirmed) return;
    }

    // Petakan ID hari sumber ke ID hari tujuan berdasarkan tanggal -> label -> urutan hari
    const mapSourceDayIdToTarget = (srcDayId: string): string | null => {
      const srcIdx = otherGroup.days.findIndex(d => d.id === srcDayId);
      if (srcIdx < 0) return null;
      const srcDay = otherGroup.days[srcIdx];

      if (srcDay.tanggal) {
        const byIso = currentGroup.days.find(d => d.tanggal === srcDay.tanggal);
        if (byIso) return byIso.id;
      }
      if (srcDay.labelHariTanggal) {
        const normLbl = srcDay.labelHariTanggal.trim().toLowerCase();
        const byLbl = currentGroup.days.find(
          d => (d.labelHariTanggal || '').trim().toLowerCase() === normLbl
        );
        if (byLbl) return byLbl.id;
      }
      return currentGroup.days[srcIdx]?.id || null;
    };

    const nextRules: Record<string, TeacherDayRule> = {};
    let copiedCount = 0;

    entries.forEach(([kode, rule]) => {
      const mappedIds = Array.from(
        new Set(
          (rule.dayIds || [])
            .filter(id => sourceValidIds.has(id))
            .map(id => mapSourceDayIdToTarget(id))
            .filter((id): id is string => Boolean(id))
        )
      );
      if (mappedIds.length > 0) {
        nextRules[kode] = { mode: rule.mode, dayIds: mappedIds };
        copiedCount += 1;
      }
    });

    if (copiedCount === 0) {
      Swal.fire(
        'Tidak Ada Hari Cocok',
        `Tanggal/hari di ${activeGroupLabel} belum cocok dengan aturan di ${sourceLabel}.`,
        'warning'
      );
      return;
    }

    updateCurrentGroup(prev => ({ ...prev, teacherDayRules: nextRules }));
    setRuleDraftKode('');
    setRuleDraftDayIds([]);
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: `${copiedCount} aturan hari khusus guru ditarik dari ${sourceLabel}.`,
      showConfirmButton: false,
      timer: 2400,
    });
  };

  // --- Pengaturan Lantai Ruang & Aturan Lantai Guru ---
  const handleSetRoomFloor = (room: string, floor: string) => {
    updateCurrentGroup(prev => ({
      ...prev,
      roomFloors: { ...(prev.roomFloors || {}), [room]: floor }
    }));
  };

  const handleApplyRoomFloorRange = () => {
    const rooms = currentGroup.rooms;
    if (rooms.length === 0) return;
    const s = Math.max(0, Math.min(rooms.length - 1, rangeStartIdx));
    const e = Math.max(0, Math.min(rooms.length - 1, rangeEndIdx));
    const lo = Math.min(s, e);
    const hi = Math.max(s, e);
    updateCurrentGroup(prev => {
      const next = { ...(prev.roomFloors || {}) };
      for (let i = lo; i <= hi; i++) {
        next[rooms[i]] = rangeTargetFloor;
      }
      return { ...prev, roomFloors: next };
    });
  };

  const handleSelectTeacherForFloorRule = (kode: string) => {
    setFloorRuleDraftKode(kode);
    const existing = currentGroup.teacherFloorRules?.[kode];
    if (existing && existing.length > 0) {
      setFloorRuleDraftFloors([...existing]);
    } else {
      setFloorRuleDraftFloors(['2']);
    }
  };

  const handleToggleFloorDraft = (fl: string) => {
    setFloorRuleDraftFloors(prev =>
      prev.includes(fl) ? prev.filter(x => x !== fl) : [...prev, fl].sort()
    );
  };

  const handleSaveTeacherFloorRule = () => {
    if (!floorRuleDraftKode) {
      Swal.fire('Pilih Guru', 'Silakan pilih guru terlebih dahulu.', 'info');
      return;
    }
    if (floorRuleDraftFloors.length === 0) {
      Swal.fire('Pilih Lantai', 'Pilih minimal 1 lantai tempat guru tersebut diperbolehkan mengawas.', 'info');
      return;
    }

    updateCurrentGroup(prev => ({
      ...prev,
      teacherFloorRules: {
        ...(prev.teacherFloorRules || {}),
        [floorRuleDraftKode]: [...floorRuleDraftFloors].sort()
      }
    }));

    const t = teacherByKode.get(floorRuleDraftKode);
    setFloorRuleDraftKode('');
    setFloorRuleDraftFloors(['2']);
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: `Aturan lantai untuk ${t?.nama || floorRuleDraftKode} diterapkan.`,
      showConfirmButton: false,
      timer: 2000,
    });
  };

  const handleDeleteTeacherFloorRule = (kode: string) => {
    updateCurrentGroup(prev => {
      const next = { ...(prev.teacherFloorRules || {}) };
      delete next[kode];
      return { ...prev, teacherFloorRules: next };
    });
    if (floorRuleDraftKode === kode) {
      setFloorRuleDraftKode('');
      setFloorRuleDraftFloors(['2']);
    }
  };

  const handleCopyFloorRulesFromOther = async () => {
    const sourceLabel = otherGroupKey === 'kelas78' ? 'Kelas 7–8' : 'Kelas 9';
    const srcFloors = otherGroup.roomFloors || {};
    const srcTeacherRules = otherGroup.teacherFloorRules || {};
    const hasSrcFloors = Object.values(srcFloors).some(v => v && v !== '1');
    const srcTeacherCount = Object.values(srcTeacherRules).filter(v => Array.isArray(v) && v.length > 0).length;

    if (!hasSrcFloors && srcTeacherCount === 0) {
      Swal.fire(
        'Belum Ada Konfigurasi Lantai',
        `Pengaturan lantai ruang & guru di jadwal ${sourceLabel} masih bawaan (semua Lantai 1, 0 aturan guru).`,
        'info'
      );
      return;
    }

    if (hasCustomFloors || activeFloorRuleEntries.length > 0) {
      const confirm = await Swal.fire({
        title: `Tarik Setting Lantai dari ${sourceLabel}?`,
        text: `Peta lantai ruang & aturan lantai guru pada ${activeGroupLabel} akan mengikuti jadwal ${sourceLabel}.`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Ya, Tarik Data',
        cancelButtonText: 'Batal',
      });
      if (!confirm.isConfirmed) return;
    }

    const nextRoomFloors: Record<string, string> = {};
    currentGroup.rooms.forEach(r => {
      if (srcFloors[r]) nextRoomFloors[r] = srcFloors[r];
    });

    updateCurrentGroup(prev => ({
      ...prev,
      roomFloors: nextRoomFloors,
      teacherFloorRules: JSON.parse(JSON.stringify(srcTeacherRules)),
    }));
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: `Pengaturan lantai ruang & guru ditarik dari ${sourceLabel}.`,
      showConfirmButton: false,
      timer: 2200,
    });
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

    // Validasi ketersediaan pengawas pada setiap hari setelah aturan hari khusus & aturan lantai diterapkan
    const shortDays = currentGroup.days
      .map(day => {
        const eligiblePool = activePool.filter(t =>
          isTeacherAllowedOnDay(t.kode, day.id, currentGroup.teacherDayRules, validDayIds)
        );
        const matchOk =
          eligiblePool.length >= targetRooms.length &&
          matchTeachersToRooms(
            eligiblePool,
            targetRooms,
            currentGroup.roomFloors,
            currentGroup.teacherFloorRules
          ) !== null;
        return { day, eligibleCount: eligiblePool.length, matchOk };
      })
      .filter(item => !item.matchOk);

    if (shortDays.length > 0) {
      const detail = shortDays
        .map(s =>
          s.eligibleCount < targetRooms.length
            ? `• ${s.day.labelHariTanggal || s.day.tanggal}: tersedia ${s.eligibleCount} guru (butuh ${targetRooms.length})`
            : `• ${s.day.labelHariTanggal || s.day.tanggal}: kombinasi guru & lantai ruang tidak memenuhi ${targetRooms.length} ruang (cek distribusi lantai ruang & aturan lantai guru)`
        )
        .join('\n');
      Swal.fire(
        'Guru / Lantai Tidak Memenuhi',
        `Aturan hari atau lantai khusus membuat beberapa hari tidak bisa dipasangkan ke seluruh ruang:\n${detail}`,
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
      const dayEligiblePool = activePool.filter(t =>
        isTeacherAllowedOnDay(t.kode, day.id, currentGroup.teacherDayRules, validDayIds)
      );

      // Kelompokkan sesi per hari menjadi blok 2 jam: [Jam 1, Jam 2], lalu [Jam 3] (dan seterusnya)
      const sessionBlocks: number[][] = [];
      for (let i = 0; i < day.sessions.length; i += 2) {
        if (i + 1 < day.sessions.length) {
          sessionBlocks.push([i, i + 1]);
        } else {
          sessionBlocks.push([i]);
        }
      }

      const newSessions = day.sessions.map(s => ({ ...s, pengawas: {} as Record<string, string> }));
      let prevBlockTeachers = new Set<string>();
      let prevBlockRoomTeacher: Record<string, string> = {};

      for (const blockIndices of sessionBlocks) {
        const busySetsInBlock = blockIndices.map(sIdx => {
          const ses = day.sessions[sIdx];
          const wKey = normWaktuKey(ses.waktu);
          return (tgl && wKey ? otherBusyAtDateTime.get(`${tgl}|${wKey}`) : undefined) || new Set<string>();
        });

        const scoredPool = dayEligiblePool.map(t => {
          const crossClashCount = busySetsInBlock.reduce(
            (acc, set) => acc + (set.has(t.kode) ? 1 : 0),
            0
          );
          return {
            teacher: t,
            // Prioritas 1: jangan sampai bentrok dengan jadwal pasangan di tanggal & waktu sama pada blok ini
            crossClash: crossClashCount > 0 ? 1 : 0,
            // Prioritas 2: sudah mengawas di blok sebelumnya pada hari yang sama (agar Jam ke-3 ganti pengawas)
            wasPrevBlock: prevBlockTeachers.has(t.kode) ? 1 : 0,
            // Prioritas 3: beban total di jadwal ini (menjamin merata)
            total: totalCount[t.kode] || 0,
            // Prioritas 4: beban hari ini (jadwal ini + jadwal pasangan)
            dayLoad: (dayCount[t.kode] || 0) + (otherSameDayMap[t.kode] || 0),
            // Prioritas 5: beban gabungan total (jadwal ini + jadwal pasangan)
            combinedTotal: (totalCount[t.kode] || 0) + (otherStats.counts[t.kode] || 0),
            rand: Math.random()
          };
        });

        scoredPool.sort(
          (a, b) =>
            a.crossClash - b.crossClash ||
            a.wasPrevBlock - b.wasPrevBlock ||
            a.total - b.total ||
            a.dayLoad - b.dayLoad ||
            a.combinedTotal - b.combinedTotal ||
            a.rand - b.rand
        );

        // Pilih tepat N guru dengan tetap menjamin kecocokan 1-to-1 terhadap aturan lantai masing-masing ruang
        const chosen: GuruOption[] = [];
        for (const cand of scoredPool) {
          if (chosen.length >= targetRooms.length) break;
          const trial = [...chosen, cand.teacher];
          if (
            matchTeachersToRooms(
              trial,
              targetRooms,
              currentGroup.roomFloors,
              currentGroup.teacherFloorRules
            ) !== null
          ) {
            chosen.push(cand.teacher);
          }
        }

        const roomAssignmentMap =
          matchTeachersToRooms(
            chosen,
            targetRooms,
            currentGroup.roomFloors,
            currentGroup.teacherFloorRules,
            prevBlockRoomTeacher,
            roomHistory
          ) || {};

        const blockRoomPengawas: Record<string, string> = {};
        for (const room of targetRooms) {
          const picked = roomAssignmentMap[room];
          if (!picked) continue;
          blockRoomPengawas[room] = picked.kode;

          const weight = blockIndices.length;
          totalCount[picked.kode] = (totalCount[picked.kode] || 0) + weight;
          dayCount[picked.kode] = (dayCount[picked.kode] || 0) + weight;
          roomHistory[picked.kode].add(room);
        }

        // Terapkan pengawas yang sama untuk semua sesi dalam blok ini (Jam 1 & 2 sama; Jam 3 pengawas baru)
        for (const sIdx of blockIndices) {
          newSessions[sIdx] = {
            ...newSessions[sIdx],
            pengawas: { ...blockRoomPengawas }
          };
        }

        prevBlockTeachers = new Set(chosen.map(c => c.kode));
        prevBlockRoomTeacher = blockRoomPengawas;
      }

      return { ...day, sessions: newSessions };
    });

    updateCurrentGroup(prev => ({ ...prev, days: updatedDays }));

    const activeRuleMap = currentGroup.teacherDayRules || {};
    const unrestrictedVals = activePool
      .filter(t => !(activeRuleMap[t.kode]?.dayIds || []).some(id => validDayIds.has(id)))
      .map(t => totalCount[t.kode] || 0);
    const vals = unrestrictedVals.length > 0 ? unrestrictedVals : Object.values(totalCount);
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

  const handlePrintPdf = (mode: 'single' | 'per-pengawas' = 'single') => {
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

    const { headerInfo, rooms, days, seragamList, catatanInfo } = currentGroup;
    const activeSeragamRows = (seragamList || []).filter(s => s.hari.trim() || s.seragam.trim());
    const catatanLines = String(catatanInfo || '')
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean);
    const originUrl = typeof window !== 'undefined' ? window.location.origin : '';

    // Tentukan daftar halaman yang dicetak:
    // - 'single': 1 halaman (jika ada sorotan aktif, sorot kode tsb)
    // - 'per-pengawas': 1 halaman per pengawas yang bertugas (masing-masing sudah ada sorotnya)
    let pageTargets: Array<{ targetKode: string | null; targetNama?: string; count?: number }> = [];
    if (mode === 'per-pengawas') {
      const assigned = legendTeachers.filter(t => t.count > 0);
      if (assigned.length === 0) {
        win.close();
        Swal.fire('Belum Ada Pengawas', 'Generate atau isi kode pengawas terlebih dahulu sebelum mencetak per pengawas.', 'info');
        return;
      }
      pageTargets = assigned.map(t => ({ targetKode: t.kode, targetNama: t.nama, count: t.count }));
    } else {
      const hInfo = highlightedKode ? teacherByKode.get(highlightedKode) : null;
      pageTargets = [
        {
          targetKode: highlightedKode,
          targetNama: hInfo?.nama,
          count: highlightedKode ? (scheduleStats.counts[highlightedKode] || 0) : undefined
        }
      ];
    }

    const maxLegendRows = Math.max(legendColumns[0].length, legendColumns[1].length, legendColumns[2].length);

    const buildSingleSheet = (
      targetKode: string | null,
      targetNama?: string,
      targetCount?: number,
      isLastPage = true
    ) => {
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
                .map(r => {
                  const k = (ses.pengawas?.[r] || '').trim();
                  const isHit = Boolean(targetKode && k === targetKode);
                  const cls = isHit ? 'center bold kode-cell hl-cell' : 'center bold kode-cell';
                  return `<td class="${cls}">${esc(k)}</td>`;
                })
                .join('');
              const mapelDisplay = formatMapelShort(ses.mataUjian);
              return `<tr>
                ${dayCells}
                <td class="center bold">${esc(ses.jamKe)}</td>
                <td class="center nowrap">${esc(ses.waktu)}</td>
                <td class="left mapel-col">${esc(mapelDisplay)}</td>
                ${roomCells}
              </tr>`;
            })
            .join('');
        })
        .join('');

      const legendRowsHtml = Array.from({ length: maxLegendRows }, (_, i) => {
        const renderPair = (item: { kode: string; nama: string } | undefined) => {
          const isHit = Boolean(targetKode && item && item.kode === targetKode);
          const rowCls = isHit ? 'hl-legend' : '';
          return `
            <td class="center bold kode-lg ${rowCls}">${item ? esc(item.kode) : ''}</td>
            <td class="left nama-lg ${rowCls}">${item ? esc(item.nama) : ''}</td>
          `;
        };
        return `<tr>
          ${renderPair(legendColumns[0][i])}
          ${renderPair(legendColumns[1][i])}
          ${renderPair(legendColumns[2][i])}
        </tr>`;
      }).join('');

      const pengawasBadgeHtml = targetKode
        ? `<div class="target-badge">
             <div class="tb-lbl">JADWAL PENGAWAS</div>
             <div class="tb-val">[${esc(targetKode)}] ${esc(targetNama || '')}</div>
             <div class="tb-cnt">${targetCount ?? 0}x Mengawas</div>
           </div>`
        : '<div class="header-spacer"></div>';

      const seragamBoxHtml =
        activeSeragamRows.length > 0
          ? `<div class="extra-col-seragam">
               <div class="legend-title">Jadwal Seragam Pengawas</div>
               <table class="seragam-tbl">
                 <thead>
                   <tr>
                     <th style="width: 110px;">Hari / Tanggal</th>
                     <th>Seragam / Pakaian</th>
                   </tr>
                 </thead>
                 <tbody>
                   ${activeSeragamRows
                     .map(
                       sr => `<tr>
                         <td class="bold">${esc(sr.hari)}</td>
                         <td>${esc(sr.seragam)}</td>
                       </tr>`
                     )
                     .join('')}
                 </tbody>
               </table>
             </div>`
          : '';

      const catatanBoxHtml =
        catatanLines.length > 0
          ? `<div class="extra-col-catatan">
               <div class="legend-title">Catatan / Informasi</div>
               <div class="catatan-box">
                 ${catatanLines.map(line => `<div class="catatan-line">${esc(line)}</div>`).join('')}
               </div>
             </div>`
          : '';

      const extraFooterHtml =
        seragamBoxHtml || catatanBoxHtml
          ? `<div class="extra-footer">${seragamBoxHtml}${catatanBoxHtml}</div>`
          : '';

      return `
        <div class="sheet ${isLastPage ? '' : 'page-break'}">
          <div class="sheet-inner">
            <div class="header">
              <div class="logo-wrap">
                <img src="${originUrl}/logo.png" alt="Logo" class="logo-img" />
              </div>
              <div class="header-titles">
                <h2>${esc(headerInfo.judul)}</h2>
                <h3>${esc(headerInfo.subJudul)}</h3>
              </div>
              ${pengawasBadgeHtml}
            </div>

            <table class="main-tbl">
              <thead>
                <tr>
                  <th rowspan="2" style="width: 24px;">NO</th>
                  <th rowspan="2" style="width: 96px;">HARI / TANGGAL</th>
                  <th rowspan="2" style="width: 30px;">JAM</th>
                  <th rowspan="2" style="width: 72px;">WAKTU</th>
                  <th rowspan="2" style="width: 105px;">MATA UJIAN</th>
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
                <div class="ttd-space">
                  <img src="${originUrl}/ttd%20bu%20palupi.png" alt="TTD Kepala Madrasah" class="ttd-img" onerror="this.style.display='none'" />
                </div>
                <div class="ttd-name">${esc(headerInfo.kepalaMadrasah)}</div>
              </div>
            </div>
            ${extraFooterHtml}
          </div>
        </div>
      `;
    };

    const sheetsHtml = pageTargets
      .map((p, idx) => buildSingleSheet(p.targetKode, p.targetNama, p.count, idx === pageTargets.length - 1))
      .join('');

    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>${esc(headerInfo.judul)}${mode === 'per-pengawas' ? ' (Per Pengawas)' : ''}</title>
  <style>
    @page { size: A4 landscape; margin: 5mm 6mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; color: #000; background: #fff; }
    .sheet { width: 285mm; height: 199mm; overflow: hidden; margin: 0 auto; position: relative; }
    .page-break { page-break-after: always; break-after: page; }
    .sheet-inner { width: 100%; transform-origin: top left; }
    .header { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 5px; border-bottom: 2px solid #000; padding-bottom: 4px; }
    .logo-wrap { width: 52px; display: flex; align-items: center; justify-content: flex-start; flex-shrink: 0; }
    .logo-img { height: 38px; width: auto; object-fit: contain; }
    .header-titles { flex: 1; text-align: center; }
    .header-titles h2 { margin: 0; font-size: 11pt; font-weight: 800; letter-spacing: 0.3px; }
    .header-titles h3 { margin: 1px 0 0; font-size: 9.5pt; font-weight: 700; }
    .header-spacer { width: 52px; flex-shrink: 0; }
    .target-badge { min-width: 170px; max-width: 240px; border: 1.5px solid #ca8a04; background: #fef08a; padding: 3px 8px; border-radius: 4px; text-align: right; flex-shrink: 0; }
    .target-badge .tb-lbl { font-size: 6pt; font-weight: 800; color: #854d0e; letter-spacing: 0.4px; }
    .target-badge .tb-val { font-size: 7.5pt; font-weight: 800; color: #713f12; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .target-badge .tb-cnt { font-size: 6.5pt; font-weight: 700; color: #92400e; }
    table { width: 100%; border-collapse: collapse; }
    table.main-tbl th, table.main-tbl td { border: 1.1px solid #000; padding: 1.8px 3px; vertical-align: middle; line-height: 1.15; }
    table.main-tbl th { background: #f1f5f9; font-weight: 800; text-align: center; font-size: 7.5pt; }
    table.main-tbl td { font-size: 7.4pt; }
    .center { text-align: center; }
    .left { text-align: left; }
    .bold { font-weight: 700; }
    .nowrap { white-space: nowrap; }
    .hari-col { font-size: 7pt; line-height: 1.15; }
    .mapel-col { font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 118px; }
    .kode-cell { min-width: 22px; font-size: 7.6pt; }
    .hl-cell { background: #fde047 !important; color: #713f12 !important; font-weight: 900 !important; box-shadow: inset 0 0 0 1.4px #b45309; }
    .hl-legend { background: #fde047 !important; color: #713f12 !important; font-weight: 800 !important; }
    .bottom-wrap { display: flex; justify-content: space-between; align-items: flex-start; gap: 14px; margin-top: 6px; }
    .legend-box { flex: 1; }
    .legend-title { font-weight: 800; font-size: 7.8pt; margin-bottom: 2px; }
    table.legend td { padding: 1px 4px; font-size: 6.7pt; border: 1px solid #000; line-height: 1.15; }
    .kode-lg { width: 24px; }
    .nama-lg { white-space: nowrap; }
    .ttd-box { width: 195px; text-align: left; padding-top: 6px; font-size: 8pt; flex-shrink: 0; line-height: 1.25; }
    .ttd-space { height: 52px; display: flex; align-items: center; justify-content: flex-start; overflow: visible; }
    .ttd-img { height: 92px; width: auto; max-width: 210px; object-fit: contain; margin: -18px 0 -20px 14px; display: block; pointer-events: none; }
    .ttd-name { font-weight: 800; text-decoration: underline; position: relative; z-index: 2; }
    .extra-footer { display: flex; gap: 12px; align-items: stretch; margin-top: 6px; }
    .extra-col-seragam { flex: 0 0 42%; }
    .extra-col-catatan { flex: 1; display: flex; flex-direction: column; }
    table.seragam-tbl th, table.seragam-tbl td { border: 1px solid #000; padding: 2px 5px; font-size: 7pt; line-height: 1.2; text-align: left; }
    table.seragam-tbl th { background: #f1f5f9; font-weight: 800; }
    .catatan-box { flex: 1; border: 1px solid #000; padding: 4px 7px; font-size: 7.1pt; line-height: 1.3; background: #fff; }
    .catatan-line { margin-bottom: 1.5px; }
    .catatan-line:last-child { margin-bottom: 0; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  ${sheetsHtml}
  <script>
    window.addEventListener('load', function() {
      var sheets = document.querySelectorAll('.sheet');
      sheets.forEach(function(sheet) {
        var inner = sheet.querySelector('.sheet-inner');
        if (!inner) return;
        var maxH = sheet.clientHeight - 2;
        var maxW = sheet.clientWidth - 2;
        var h = inner.scrollHeight;
        var w = inner.scrollWidth;
        var scale = Math.min(1, maxH / h, maxW / w);
        if (scale < 0.999) {
          inner.style.zoom = String(scale);
        }
      });
      setTimeout(function() { window.print(); }, 350);
    });
  </script>
</body>
</html>`);
    win.document.close();
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

  const handleUpdatePengganti = (dayId: string, sessionIds: string[], room: string, value: string) => {
    const targetIds = new Set(sessionIds);
    updateCurrentGroup(prev => ({
      ...prev,
      days: prev.days.map(d => {
        if (d.id !== dayId) return d;
        return {
          ...d,
          sessions: d.sessions.map(s => {
            if (!targetIds.has(s.id)) return s;
            const nextPengganti = { ...(s.pengganti || {}) };
            if (!value) {
              delete nextPengganti[room];
            } else {
              nextPengganti[room] = value;
            }
            return { ...s, pengganti: nextPengganti };
          })
        };
      })
    }));
  };

  const handleCopyRoomListText = async (block: RoomListBlock) => {
    const colHeader = activeGroup === 'kelas78' ? 'PENGAWAS 7 & 8' : 'PENGAWAS 9';
    const titleGroup = activeGroup === 'kelas78' ? 'Kelas 7 & 8' : 'Kelas 9';
    const lines: string[] = [
      `DAFTAR PENGAWAS UJIAN (${titleGroup})`,
      `${block.labelHariTanggal} · ${block.jamLabel}${block.waktuLabel ? ` (${block.waktuLabel})` : ''}`,
      block.mapelLabel ? `Mapel: ${block.mapelLabel}` : '',
      `RUANG | ${colHeader} | PENGGANTI`,
      ...currentGroup.rooms.map(r => {
        const no = formatRoomNumberOnly(r);
        const nama = resolveTeacherDisplayName(block.pengawasByRoom[r] || '') || '-';
        const pg = block.penggantiByRoom[r] || '';
        return `${no}. ${nama}${pg ? ` (Pengganti: ${pg})` : ''}`;
      })
    ].filter(Boolean);

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: `List pengawas ${block.labelHariTanggal} (${block.jamLabel}) disalin.`,
        showConfirmButton: false,
        timer: 2000
      });
    } catch {
      Swal.fire('Info', 'Browser tidak mengizinkan salin otomatis ke clipboard.', 'info');
    }
  };

  const handlePrintRoomListPdf = () => {
    if (filteredRoomListBlocks.length === 0) {
      Swal.fire('Belum Ada Data', 'Tidak ada sesi jadwal pada pilihan hari ini.', 'info');
      return;
    }

    const win = window.open('', '_blank', 'width=960,height=800');
    if (!win) {
      Swal.fire('Popup Diblokir', 'Izinkan pop-up browser untuk mencetak list nama pengawas.', 'warning');
      return;
    }

    const esc = (s: string) =>
      String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    const { headerInfo, rooms } = currentGroup;
    const isK78 = activeGroup === 'kelas78';
    const docTitle = isK78
      ? 'DAFTAR NAMA PENGAWAS UJIAN KELAS 7 & 8'
      : 'DAFTAR NAMA PENGAWAS UJIAN KELAS 9';
    const colTitle = isK78 ? 'PENGAWAS 7 & 8' : 'PENGAWAS 9';
    const originUrl = typeof window !== 'undefined' ? window.location.origin : '';

    const sheetsHtml = filteredRoomListBlocks
      .map((block, bIdx) => {
        const isLast = bIdx === filteredRoomListBlocks.length - 1;
        const rowsHtml = rooms
          .map(r => {
            const roomNo = formatRoomNumberOnly(r);
            const namaPengawas = resolveTeacherDisplayName(block.pengawasByRoom[r] || '');
            const namaPengganti = block.penggantiByRoom[r] || '';
            return `<tr>
              <td class="room-cell">${esc(roomNo)}</td>
              <td class="name-cell">${esc(namaPengawas)}</td>
              <td class="sub-cell">${esc(namaPengganti)}</td>
            </tr>`;
          })
          .join('');

        return `
          <div class="sheet ${isLast ? '' : 'page-break'}">
            <div class="sheet-inner">
              <div class="kop">
                <img src="${originUrl}/logo.png" alt="Logo" class="logo-img" onerror="this.style.display='none'" />
                <div class="kop-text">
                  <h2>${esc(docTitle)}</h2>
                  <h3>${esc(headerInfo.subJudul)}</h3>
                </div>
                <div class="kop-spacer"></div>
              </div>

              <div class="meta-strip">
                <div><strong>Hari / Tanggal:</strong> ${esc(block.labelHariTanggal)}</div>
                <div><strong>Jam:</strong> ${esc(block.jamLabel)}${block.waktuLabel ? ` (${esc(block.waktuLabel)})` : ''}</div>
                <div><strong>Mata Ujian:</strong> ${esc(block.mapelLabel || '-')}</div>
              </div>

              <table class="list-tbl">
                <thead>
                  <tr>
                    <th class="col-room">RUANG</th>
                    <th class="col-pengawas">${esc(colTitle)}</th>
                    <th class="col-pengganti">PENGGANTI</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml}
                </tbody>
              </table>
            </div>
          </div>
        `;
      })
      .join('');

    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>${esc(docTitle)}</title>
  <style>
    @page { size: A4 portrait; margin: 10mm 12mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; color: #000; background: #fff; }
    .sheet { width: 186mm; height: 277mm; overflow: hidden; margin: 0 auto; }
    .page-break { page-break-after: always; break-after: page; }
    .sheet-inner { width: 100%; transform-origin: top left; }
    .kop { display: flex; align-items: center; justify-content: space-between; gap: 10px; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 8px; }
    .logo-img { height: 40px; width: auto; object-fit: contain; }
    .kop-spacer { width: 40px; }
    .kop-text { flex: 1; text-align: center; }
    .kop-text h2 { margin: 0; font-size: 12pt; font-weight: 800; }
    .kop-text h3 { margin: 2px 0 0; font-size: 9.5pt; font-weight: 700; }
    .meta-strip { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 6px 14px; font-size: 9pt; margin-bottom: 8px; padding: 5px 8px; border: 1px solid #000; background: #f8fafc; }
    table.list-tbl { width: 100%; border-collapse: collapse; table-layout: fixed; }
    table.list-tbl th, table.list-tbl td { border: 1.4px solid #000; padding: 6px 8px; vertical-align: middle; font-size: 10pt; }
    table.list-tbl th { background: #fff; font-weight: 800; text-align: center; font-size: 10.5pt; padding: 8px 6px; letter-spacing: 0.2px; }
    .col-room { width: 68px; }
    .col-pengawas { width: 52%; }
    .col-pengganti { width: auto; }
    .room-cell { text-align: center; font-weight: 700; height: 29px; }
    .name-cell { text-align: left; font-weight: 600; padding-left: 10px; }
    .sub-cell { text-align: left; padding-left: 10px; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  ${sheetsHtml}
  <script>
    window.addEventListener('load', function() {
      var sheets = document.querySelectorAll('.sheet');
      sheets.forEach(function(sheet) {
        var inner = sheet.querySelector('.sheet-inner');
        if (!inner) return;
        var maxH = sheet.clientHeight - 2;
        var maxW = sheet.clientWidth - 2;
        var scale = Math.min(1, maxH / inner.scrollHeight, maxW / inner.scrollWidth);
        if (scale < 0.999) {
          inner.style.zoom = String(scale);
        }
      });
      setTimeout(function() { window.print(); }, 300);
    });
  </script>
</body>
</html>`);
    win.document.close();
  };

  const handleExportRoomListExcel = () => {
    if (filteredRoomListBlocks.length === 0) {
      Swal.fire('Belum Ada Data', 'Tidak ada sesi jadwal pada pilihan hari ini.', 'info');
      return;
    }

    const wb = XLSX.utils.book_new();
    const isK78 = activeGroup === 'kelas78';
    const docTitle = isK78
      ? 'DAFTAR NAMA PENGAWAS UJIAN KELAS 7 & 8'
      : 'DAFTAR NAMA PENGAWAS UJIAN KELAS 9';
    const colTitle = isK78 ? 'PENGAWAS 7 & 8' : 'PENGAWAS 9';
    const usedSheetNames = new Set<string>();

    filteredRoomListBlocks.forEach((block, idx) => {
      const aoa: (string | number)[][] = [
        [docTitle],
        [`${block.labelHariTanggal} | ${block.jamLabel}${block.waktuLabel ? ` (${block.waktuLabel})` : ''}${block.mapelLabel ? ` | Mapel: ${block.mapelLabel}` : ''}`],
        [],
        ['RUANG', colTitle, 'PENGGANTI'],
        ...currentGroup.rooms.map(r => {
          const roomNo = formatRoomNumberOnly(r);
          const parsedNo = /^\d+$/.test(roomNo) ? Number(roomNo) : roomNo;
          return [
            parsedNo,
            resolveTeacherDisplayName(block.pengawasByRoom[r] || ''),
            block.penggantiByRoom[r] || ''
          ];
        })
      ];

      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } }
      ];
      ws['!cols'] = [{ wch: 10 }, { wch: 42 }, { wch: 36 }];

      const dayShort = (block.labelHariTanggal.split(',')[0] || `H${block.dayIndex + 1}`).trim();
      const jamShort = block.jamLabel.replace(/[:\\/?*\[\]]/g, '').trim();
      let sheetName = `${idx + 1}. ${dayShort} ${jamShort}`.replace(/[:\\/?*\[\]]/g, '').slice(0, 31);
      while (usedSheetNames.has(sheetName)) {
        sheetName = `${sheetName.slice(0, 28)}_${idx + 1}`;
      }
      usedSheetNames.add(sheetName);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    XLSX.writeFile(
      wb,
      isK78 ? 'List_Pengawas_Ruang_Kelas_7-8.xlsx' : 'List_Pengawas_Ruang_Kelas_9.xlsx'
    );
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
      <datalist id="pengawas-pengganti-list">
        {teachers.map(t => (
          <option key={t.kode} value={t.nama} />
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
            onClick={() => handlePrintPdf('single')}
            style={{
              background: highlightedKode ? '#ca8a04' : '#1e293b',
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
            title="Cetak 1 halaman jadwal (A4 Landscape)"
          >
            <i className="fas fa-print"></i>
            {highlightedKode ? `Cetak Sorot (${highlightedKode})` : `Cetak ${activeGroupLabel}`}
          </button>
          <button
            type="button"
            onClick={() => handlePrintPdf('per-pengawas')}
            style={{
              background: '#7c3aed',
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
            title="Cetak semua halaman per pengawas (tiap lembar sudah tersorot untuk guru masing-masing)"
          >
            <i className="fas fa-user-check"></i> Cetak Per Pengawas
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
          <button
            type="button"
            onClick={() => setViewMode(prev => (prev === 'matrix' ? 'room_list' : 'matrix'))}
            style={{
              background: viewMode === 'room_list' ? '#0f766e' : '#f0fdfa',
              color: viewMode === 'room_list' ? 'white' : '#0f766e',
              border: '1.5px solid #0d9488',
              padding: '9px 14px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.86rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px'
            }}
            title="Lihat / Cetak List Nama Pengawas per Ruang (Kelas 7–8 dan Kelas 9 terpisah)"
          >
            <i className={viewMode === 'room_list' ? 'fas fa-table' : 'fas fa-list-ol'}></i>
            {viewMode === 'room_list' ? 'Kembali ke Matriks' : `List Pengawas Ruang (${activeGroupLabel})`}
          </button>
        </div>
      </div>

      {viewMode === 'room_list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Panel Kontrol List Nama Pengawas per Ruang */}
          <div style={{ background: '#f0fdfa', border: '1.5px solid #99f6e4', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#115e59' }}>
                  <i className="fas fa-clipboard-list" style={{ marginRight: '8px' }}></i>
                  List Nama Pengawas Ujian per Ruang — {activeGroup === 'kelas78' ? 'Kelas 7 & 8' : 'Kelas 9'}
                </h3>
                <div style={{ fontSize: '0.8rem', color: '#0f766e', marginTop: '3px' }}>
                  Format kolom <b>RUANG | {activeGroup === 'kelas78' ? 'PENGAWAS 7 & 8' : 'PENGAWAS 9'} | PENGGANTI</b> (terpisah antara Kelas 7–8 dan Kelas 9).
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handlePrintRoomListPdf}
                  style={{ background: '#0f172a', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '8px', fontWeight: 700, fontSize: '0.84rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '7px' }}
                >
                  <i className="fas fa-print"></i> Cetak List ({activeGroupLabel})
                </button>
                <button
                  type="button"
                  onClick={handleExportRoomListExcel}
                  style={{ background: '#16a34a', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '8px', fontWeight: 700, fontSize: '0.84rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '7px' }}
                >
                  <i className="fas fa-file-excel"></i> Export Excel List ({activeGroupLabel})
                </button>
              </div>
            </div>

            {/* Filter Hari & Opsi */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderTop: '1px solid #ccfbf1', paddingTop: '10px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#134e4a', marginRight: '4px' }}>Filter Hari:</span>
                <button
                  type="button"
                  onClick={() => setListSelectedDayId('ALL')}
                  style={{
                    padding: '5px 11px',
                    borderRadius: '999px',
                    border: listSelectedDayId === 'ALL' ? '1.5px solid #0d9488' : '1px solid #cbd5e1',
                    background: listSelectedDayId === 'ALL' ? '#0d9488' : 'white',
                    color: listSelectedDayId === 'ALL' ? 'white' : '#334155',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Semua Hari ({currentGroup.days.length})
                </button>
                {currentGroup.days.map((d, idx) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setListSelectedDayId(d.id)}
                    style={{
                      padding: '5px 11px',
                      borderRadius: '999px',
                      border: listSelectedDayId === d.id ? '1.5px solid #0d9488' : '1px solid #cbd5e1',
                      background: listSelectedDayId === d.id ? '#0d9488' : 'white',
                      color: listSelectedDayId === d.id ? 'white' : '#334155',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {d.labelHariTanggal || `Hari ${idx + 1}`}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600, color: '#134e4a', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={listSplitAllSessions}
                    onChange={e => setListSplitAllSessions(e.target.checked)}
                    style={{ accentColor: '#0d9488', cursor: 'pointer' }}
                  />
                  Pisahkan tiap jam meski pengawasnya sama
                </label>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600, color: '#134e4a', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={listShowKode}
                    onChange={e => setListShowKode(e.target.checked)}
                    style={{ accentColor: '#0d9488', cursor: 'pointer' }}
                  />
                  Tampilkan Kode Guru
                </label>
              </div>
            </div>
          </div>

          {/* Daftar Tabel per Hari / Blok Jam */}
          {filteredRoomListBlocks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
              Belum ada hari atau sesi ujian untuk {activeGroupLabel}.
            </div>
          ) : (
            filteredRoomListBlocks.map(block => (
              <div key={block.key} style={{ border: '1px solid #cbd5e1', borderRadius: '10px', overflow: 'hidden', background: 'white', boxShadow: '0 2px 6px rgba(15,23,42,0.04)' }}>
                <div style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 14px', alignItems: 'center' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>
                      <i className="far fa-calendar-alt" style={{ color: '#0284c7', marginRight: '6px' }}></i>
                      {block.labelHariTanggal}
                    </span>
                    <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 10px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 700 }}>
                      {block.jamLabel}{block.waktuLabel ? ` · ${block.waktuLabel}` : ''}
                    </span>
                    {block.mapelLabel && (
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>
                        Mapel: {block.mapelLabel}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyRoomListText(block)}
                    style={{ padding: '5px 11px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white', color: '#334155', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                  >
                    <i className="far fa-copy"></i> Salin Teks
                  </button>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                    <thead>
                      <tr style={{ background: '#ffffff', borderBottom: '2px solid #0f172a' }}>
                        <th style={{ border: '1.5px solid #0f172a', padding: '9px 8px', textAlign: 'center', width: '90px', fontWeight: 900, color: '#0f172a' }}>
                          RUANG
                        </th>
                        <th style={{ border: '1.5px solid #0f172a', padding: '9px 12px', textAlign: 'center', width: '48%', fontWeight: 900, color: '#0f172a' }}>
                          {activeGroup === 'kelas78' ? 'PENGAWAS 7 & 8' : 'PENGAWAS 9'}
                        </th>
                        <th style={{ border: '1.5px solid #0f172a', padding: '9px 12px', textAlign: 'center', fontWeight: 900, color: '#0f172a' }}>
                          PENGGANTI
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentGroup.rooms.map((room, rIdx) => {
                        const roomNo = formatRoomNumberOnly(room);
                        const kode = block.pengawasByRoom[room] || '';
                        const namaPengawas = resolveTeacherDisplayName(kode);
                        const penggantiVal = block.penggantiByRoom[room] || '';
                        return (
                          <tr key={room} style={{ background: rIdx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                            <td style={{ border: '1.2px solid #334155', padding: '7px 8px', textAlign: 'center', fontWeight: 700, color: '#0f172a' }}>
                              {roomNo}
                            </td>
                            <td style={{ border: '1.2px solid #334155', padding: '7px 12px', fontWeight: 600, color: namaPengawas ? '#0f172a' : '#94a3b8' }}>
                              {namaPengawas || '- Belum diisi -'}
                            </td>
                            <td style={{ border: '1.2px solid #334155', padding: '4px 8px' }}>
                              <input
                                type="text"
                                list="pengawas-pengganti-list"
                                value={penggantiVal}
                                onChange={e => handleUpdatePengganti(block.dayId, block.sessionIds, room, e.target.value)}
                                placeholder="Kosong (siap tulis tangan saat cetak)..."
                                style={{
                                  width: '100%',
                                  padding: '5px 8px',
                                  border: '1px solid transparent',
                                  borderRadius: '4px',
                                  background: 'transparent',
                                  fontSize: '0.86rem',
                                  color: '#0f172a',
                                  boxSizing: 'border-box'
                                }}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {viewMode === 'matrix' && (
        <>

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

          <button
            type="button"
            onClick={() => setShowDayRulesPanel(prev => !prev)}
            style={{
              padding: '7px 12px',
              borderRadius: '6px',
              border: `1px solid ${activeRuleEntries.length > 0 ? '#f59e0b' : '#cbd5e1'}`,
              background: showDayRulesPanel ? '#fef3c7' : activeRuleEntries.length > 0 ? '#fffbeb' : 'white',
              color: activeRuleEntries.length > 0 || showDayRulesPanel ? '#b45309' : '#334155',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <i className="fas fa-calendar-check"></i>
            Atur Hari Khusus Guru {activeRuleEntries.length > 0 ? `(${activeRuleEntries.length})` : ''}
          </button>

          <button
            type="button"
            onClick={() => setShowFloorRulesPanel(prev => !prev)}
            style={{
              padding: '7px 12px',
              borderRadius: '6px',
              border: `1px solid ${hasCustomFloors || activeFloorRuleEntries.length > 0 ? '#8b5cf6' : '#cbd5e1'}`,
              background: showFloorRulesPanel ? '#ede9fe' : hasCustomFloors || activeFloorRuleEntries.length > 0 ? '#f5f3ff' : 'white',
              color: hasCustomFloors || activeFloorRuleEntries.length > 0 || showFloorRulesPanel ? '#6d28d9' : '#334155',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <i className="fas fa-building"></i>
            Atur Lantai Ruang &amp; Guru {activeFloorRuleEntries.length > 0 ? `(${activeFloorRuleEntries.length})` : ''}
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
                const rule = currentGroup.teacherDayRules?.[t.kode];
                const ruleDaysCount = (rule?.dayIds || []).filter(id => validDayIds.has(id)).length;
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
                    <span style={{ color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }} title={`${t.nama} (${t.jabatan})`}>
                      {t.nama}
                    </span>
                    {ruleDaysCount > 0 && (
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '1px 5px',
                          borderRadius: '4px',
                          background: rule?.mode === 'only' ? '#dcfce7' : '#fee2e2',
                          color: rule?.mode === 'only' ? '#15803d' : '#b91c1c',
                          whiteSpace: 'nowrap'
                        }}
                        title="Klik Atur Hari Khusus Guru untuk mengubah"
                      >
                        {rule?.mode === 'only' ? `Hanya ${ruleDaysCount}h` : `Libur ${ruleDaysCount}h`}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Panel Aturan Hari Khusus Per Guru */}
        {showDayRulesPanel && (
          <div style={{ background: 'white', border: '1px solid #fcd34d', borderRadius: '8px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#92400e' }}>
                  <i className="fas fa-calendar-check" style={{ marginRight: '6px' }}></i>
                  Aturan Hari Mengawas Khusus — {activeGroupLabel}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Tentukan guru tertentu hanya mengawas di hari tertentu atau tidak boleh mengawas di hari tertentu sebelum klik <b>Generate Pengawas</b>.
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleCopyDayRulesFromOther}
                  style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #bae6fd', background: '#f0f9ff', color: '#0369a1', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                >
                  <i className="fas fa-download"></i>
                  Tarik Data dari {otherGroupKey === 'kelas78' ? 'Kelas 7–8' : 'Kelas 9'}
                </button>
                {activeRuleEntries.length > 0 && (
                  <button
                    type="button"
                    onClick={() => updateCurrentGroup(prev => ({ ...prev, teacherDayRules: {} }))}
                    style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Hapus Semua Aturan ({activeRuleEntries.length})
                  </button>
                )}
              </div>
            </div>

            {/* Form Tambah / Ubah Aturan */}
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'flex-end' }}>
                <div style={{ flex: '1 1 240px' }}>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#78350f', marginBottom: '4px' }}>
                    1. Pilih Guru Pengawas
                  </label>
                  <select
                    value={ruleDraftKode}
                    onChange={e => handleSelectTeacherForRule(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #fcd34d', fontSize: '0.84rem', background: 'white' }}
                  >
                    <option value="">-- Pilih Guru --</option>
                    {activePool.map(t => (
                      <option key={t.kode} value={t.kode}>
                        [{t.kode}] {t.nama}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ flex: '1 1 280px' }}>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#78350f', marginBottom: '4px' }}>
                    2. Jenis Aturan
                  </label>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => setRuleDraftMode('only')}
                      style={{
                        flex: 1,
                        padding: '7px 10px',
                        borderRadius: '6px',
                        border: `1.5px solid ${ruleDraftMode === 'only' ? '#16a34a' : '#cbd5e1'}`,
                        background: ruleDraftMode === 'only' ? '#dcfce7' : 'white',
                        color: ruleDraftMode === 'only' ? '#15803d' : '#475569',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      ✓ Hanya di Hari Terpilih
                    </button>
                    <button
                      type="button"
                      onClick={() => setRuleDraftMode('exclude')}
                      style={{
                        flex: 1,
                        padding: '7px 10px',
                        borderRadius: '6px',
                        border: `1.5px solid ${ruleDraftMode === 'exclude' ? '#dc2626' : '#cbd5e1'}`,
                        background: ruleDraftMode === 'exclude' ? '#fee2e2' : 'white',
                        color: ruleDraftMode === 'exclude' ? '#b91c1c' : '#475569',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      ✕ Tidak Boleh di Hari Terpilih
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#78350f', marginBottom: '6px' }}>
                  3. Pilih Hari Ujian ({ruleDraftMode === 'only' ? 'Guru hanya bertugas pada hari yang dicentang' : 'Guru tidak ditugaskan pada hari yang dicentang'}):
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '6px' }}>
                  {currentGroup.days.map((d, dIdx) => {
                    const isChecked = ruleDraftDayIds.includes(d.id);
                    const eligCount = dayEligibleCountMap[d.id] ?? activePool.length;
                    const isLow = eligCount < currentGroup.rooms.length;
                    return (
                      <label
                        key={d.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '6px',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          border: `1px solid ${isChecked ? (ruleDraftMode === 'only' ? '#4ade80' : '#fca5a5') : '#cbd5e1'}`,
                          background: isChecked ? (ruleDraftMode === 'only' ? '#f0fdf4' : '#fef2f2') : 'white',
                          fontSize: '0.78rem',
                          cursor: 'pointer'
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleRuleDay(d.id)}
                          />
                          <span style={{ fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            #{dIdx + 1} {d.labelHariTanggal || d.tanggal || `Hari ${dIdx + 1}`}
                          </span>
                        </span>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            color: isLow ? '#dc2626' : '#64748b',
                            whiteSpace: 'nowrap'
                          }}
                          title="Jumlah pengawas tersedia hari ini"
                        >
                          {eligCount} gr
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                {ruleDraftKode && currentGroup.teacherDayRules?.[ruleDraftKode] && (
                  <button
                    type="button"
                    onClick={() => handleDeleteTeacherDayRule(ruleDraftKode)}
                    style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Hapus Aturan Guru Ini
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSaveTeacherDayRule}
                  style={{ padding: '7px 14px', borderRadius: '6px', border: 'none', background: '#0284c7', color: 'white', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  <i className="fas fa-check" style={{ marginRight: '5px' }}></i>
                  Terapkan Aturan
                </button>
              </div>
            </div>

            {/* Daftar Aturan Aktif */}
            {activeRuleEntries.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                  Daftar Aturan Aktif ({activeRuleEntries.length} Guru):
                </div>
                {activeRuleEntries.map(entry => {
                  const dayLabels = entry.dayIds
                    .map(id => {
                      const dIdx = currentGroup.days.findIndex(d => d.id === id);
                      const d = dIdx >= 0 ? currentGroup.days[dIdx] : null;
                      return d ? (d.labelHariTanggal || `Hari ${dIdx + 1}`) : '';
                    })
                    .filter(Boolean)
                    .join(', ');
                  const isOnly = entry.mode === 'only';
                  return (
                    <div
                      key={entry.kode}
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                        background: '#f8fafc',
                        fontSize: '0.8rem'
                      }}
                    >
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 800, color: '#0369a1' }}>[{entry.kode}]</span>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>{entry.teacher?.nama || 'Guru'}</span>
                        <span
                          style={{
                            padding: '2px 7px',
                            borderRadius: '999px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: isOnly ? '#dcfce7' : '#fee2e2',
                            color: isOnly ? '#15803d' : '#b91c1c'
                          }}
                        >
                          {isOnly ? 'Hanya di:' : 'Tidak boleh di:'}
                        </span>
                        <span style={{ color: '#334155' }}>{dayLabels}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => handleSelectTeacherForRule(entry.kode)}
                          style={{ padding: '4px 8px', borderRadius: '5px', border: '1px solid #cbd5e1', background: 'white', color: '#0369a1', fontSize: '0.74rem', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Ubah
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTeacherDayRule(entry.kode)}
                          style={{ padding: '4px 8px', borderRadius: '5px', border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: '0.74rem', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Panel Pengaturan Lantai Ruang & Aturan Lantai Guru */}
        {showFloorRulesPanel && (
          <div style={{ background: 'white', border: '1px solid #c4b5fd', borderRadius: '8px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#5b21b6' }}>
                  <i className="fas fa-building" style={{ marginRight: '6px' }}></i>
                  Konfigurasi Lantai Ruang &amp; Aturan Lantai Guru — {activeGroupLabel}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Atur setiap ruang berada di lantai berapa, lalu tentukan guru sepuh/khusus yang harus mengawas di lantai tertentu (misal Lantai 2).
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleCopyFloorRulesFromOther}
                  style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #bae6fd', background: '#f0f9ff', color: '#0369a1', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                >
                  <i className="fas fa-download"></i>
                  Tarik Setting Lantai dari {otherGroupKey === 'kelas78' ? 'Kelas 7–8' : 'Kelas 9'}
                </button>
                <button
                  type="button"
                  onClick={() => updateCurrentGroup(prev => ({ ...prev, roomFloors: {} }))}
                  style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Reset Ruang ke Lantai 1
                </button>
              </div>
            </div>

            {/* 1. Peta Lantai per Ruang */}
            <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4c1d95' }}>
                  1. Peta Lokasi Lantai per Ruang ({currentGroup.rooms.length} Ruang · Lantai 1: {floorCounts['1'] || 0}, Lantai 2: {floorCounts['2'] || 0}{(floorCounts['3'] || 0) > 0 ? `, Lantai 3: ${floorCounts['3']}` : ''})
                </div>

                {/* Quick Range Setter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', fontSize: '0.78rem' }}>
                  <span style={{ color: '#5b21b6', fontWeight: 600 }}>Set cepat:</span>
                  <select
                    value={Math.min(rangeStartIdx, Math.max(0, currentGroup.rooms.length - 1))}
                    onChange={e => setRangeStartIdx(Number(e.target.value))}
                    style={{ padding: '4px 6px', borderRadius: '5px', border: '1px solid #c4b5fd', background: 'white', fontSize: '0.78rem' }}
                  >
                    {currentGroup.rooms.map((r, i) => (
                      <option key={`rs-${r}`} value={i}>{r}</option>
                    ))}
                  </select>
                  <span>s/d</span>
                  <select
                    value={Math.min(rangeEndIdx, Math.max(0, currentGroup.rooms.length - 1))}
                    onChange={e => setRangeEndIdx(Number(e.target.value))}
                    style={{ padding: '4px 6px', borderRadius: '5px', border: '1px solid #c4b5fd', background: 'white', fontSize: '0.78rem' }}
                  >
                    {currentGroup.rooms.map((r, i) => (
                      <option key={`re-${r}`} value={i}>{r}</option>
                    ))}
                  </select>
                  <span>&rarr;</span>
                  <select
                    value={rangeTargetFloor}
                    onChange={e => setRangeTargetFloor(e.target.value)}
                    style={{ padding: '4px 6px', borderRadius: '5px', border: '1px solid #c4b5fd', background: 'white', fontSize: '0.78rem', fontWeight: 700 }}
                  >
                    {AVAILABLE_FLOORS.map(f => (
                      <option key={`rf-${f}`} value={f}>Lantai {f}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleApplyRoomFloorRange}
                    style={{ padding: '4px 10px', borderRadius: '5px', border: 'none', background: '#7c3aed', color: 'white', fontWeight: 700, fontSize: '0.76rem', cursor: 'pointer' }}
                  >
                    Terapkan
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(145px, 1fr))', gap: '6px' }}>
                {currentGroup.rooms.map(room => {
                  const curFloor = getRoomFloor(room, currentGroup.roomFloors);
                  return (
                    <div
                      key={room}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '6px',
                        padding: '5px 8px',
                        borderRadius: '6px',
                        border: `1px solid ${curFloor === '2' ? '#a78bfa' : curFloor === '3' ? '#38bdf8' : '#cbd5e1'}`,
                        background: 'white'
                      }}
                    >
                      <span style={{ fontWeight: 800, fontSize: '0.8rem', color: '#1e293b' }}>{room}</span>
                      <div style={{ display: 'inline-flex', borderRadius: '4px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                        {AVAILABLE_FLOORS.map(fl => {
                          const active = curFloor === fl;
                          return (
                            <button
                              key={fl}
                              type="button"
                              onClick={() => handleSetRoomFloor(room, fl)}
                              style={{
                                padding: '2px 6px',
                                border: 'none',
                                borderLeft: fl === '1' ? 'none' : '1px solid #e2e8f0',
                                background: active
                                  ? fl === '2'
                                    ? '#7c3aed'
                                    : fl === '3'
                                    ? '#0284c7'
                                    : '#1e293b'
                                  : '#f8fafc',
                                color: active ? 'white' : '#64748b',
                                fontWeight: active ? 800 : 600,
                                fontSize: '0.72rem',
                                cursor: 'pointer'
                              }}
                              title={`Set ${room} di Lantai ${fl}`}
                            >
                              L{fl}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Aturan Lantai Khusus Guru (misal guru sepuh di Lantai 2) */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>
                2. Guru dengan Ketentuan Lantai Khusus (Misal Guru Sepuh Hanya di Lantai 2)
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'flex-end' }}>
                <div style={{ flex: '1 1 240px' }}>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Pilih Guru
                  </label>
                  <select
                    value={floorRuleDraftKode}
                    onChange={e => handleSelectTeacherForFloorRule(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.84rem', background: 'white' }}
                  >
                    <option value="">-- Pilih Guru --</option>
                    {activePool.map(t => (
                      <option key={t.kode} value={t.kode}>
                        [{t.kode}] {t.nama}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Hanya Boleh Mengawas di:
                  </label>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {AVAILABLE_FLOORS.map(fl => {
                      const isChecked = floorRuleDraftFloors.includes(fl);
                      const rCount = floorCounts[fl] || 0;
                      return (
                        <label
                          key={fl}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: `1.5px solid ${isChecked ? '#7c3aed' : '#cbd5e1'}`,
                            background: isChecked ? '#ede9fe' : 'white',
                            color: isChecked ? '#5b21b6' : '#475569',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleFloorDraft(fl)}
                          />
                          Lantai {fl} ({rCount} r)
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  {floorRuleDraftKode && currentGroup.teacherFloorRules?.[floorRuleDraftKode] && (
                    <button
                      type="button"
                      onClick={() => handleDeleteTeacherFloorRule(floorRuleDraftKode)}
                      style={{ padding: '7px 12px', borderRadius: '6px', border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Hapus Aturan
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveTeacherFloorRule}
                    style={{ padding: '7px 14px', borderRadius: '6px', border: 'none', background: '#7c3aed', color: 'white', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    <i className="fas fa-check" style={{ marginRight: '5px' }}></i>
                    Terapkan Aturan Lantai
                  </button>
                </div>
              </div>

              {activeFloorRuleEntries.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                  <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#334155' }}>
                    Daftar Guru dengan Aturan Lantai ({activeFloorRuleEntries.length} Guru):
                  </div>
                  {activeFloorRuleEntries.map(entry => (
                    <div
                      key={entry.kode}
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        padding: '7px 10px',
                        borderRadius: '6px',
                        border: '1px solid #ddd6fe',
                        background: 'white',
                        fontSize: '0.8rem'
                      }}
                    >
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 800, color: '#6d28d9' }}>[{entry.kode}]</span>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>{entry.teacher?.nama || 'Guru'}</span>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '999px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: '#ede9fe',
                            color: '#5b21b6'
                          }}
                        >
                          Hanya {entry.floors.map(f => `Lantai ${f}`).join(' / ')}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => handleSelectTeacherForFloorRule(entry.kode)}
                          style={{ padding: '4px 8px', borderRadius: '5px', border: '1px solid #cbd5e1', background: 'white', color: '#0369a1', fontSize: '0.74rem', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Ubah
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTeacherFloorRule(entry.kode)}
                          style={{ padding: '4px 8px', borderRadius: '5px', border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: '0.74rem', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
              {currentGroup.rooms.map(r => {
                const fl = getRoomFloor(r, currentGroup.roomFloors);
                return (
                  <th
                    key={r}
                    style={{ border: '1px solid #334155', padding: '5px 4px', textAlign: 'center', minWidth: '38px' }}
                    title={`${r} (Lantai ${fl})`}
                  >
                    <div>{r}</div>
                    {hasCustomFloors && (
                      <div style={{ fontSize: '0.62rem', fontWeight: 600, color: fl === '2' ? '#fde047' : fl === '3' ? '#7dd3fc' : '#cbd5e1', lineHeight: 1 }}>
                        Lt.{fl}
                      </div>
                    )}
                  </th>
                );
              })}
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
                  <td
                    style={{ border: '1px solid #cbd5e1', padding: '6px 10px', fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap' }}
                    title={ses.mataUjian || ''}
                  >
                    {ses.mataUjian ? formatMapelShort(ses.mataUjian) : <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Belum diisi</span>}
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

      {/* Pengaturan Custom: Jadwal Seragam & Catatan / Info (Tampil di bagian bawah cetak) */}
      <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '16px', background: '#f8fafc', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: '#1e293b' }}>
              <i className="fas fa-tshirt" style={{ color: '#0ea5e9', marginRight: '7px' }}></i>
              Jadwal Seragam Pengawas — {activeGroupLabel}
            </h3>
            <button
              type="button"
              onClick={() =>
                updateCurrentGroup(prev => ({
                  ...prev,
                  seragamList: [...(prev.seragamList || []), { id: uid('srg'), hari: '', seragam: '' }]
                }))
              }
              style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #0ea5e9', background: 'white', color: '#0284c7', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}
            >
              <i className="fas fa-plus" style={{ marginRight: '4px' }}></i> Tambah Baris
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {(currentGroup.seragamList || []).map(sr => (
              <div key={sr.id} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 30px', gap: '6px', alignItems: 'center' }}>
                <input
                  type="text"
                  value={sr.hari}
                  onChange={e =>
                    updateCurrentGroup(prev => ({
                      ...prev,
                      seragamList: prev.seragamList.map(item => (item.id === sr.id ? { ...item, hari: e.target.value } : item))
                    }))
                  }
                  placeholder="Hari (mis. Senin - Selasa)"
                  style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 600, background: 'white' }}
                />
                <input
                  type="text"
                  value={sr.seragam}
                  onChange={e =>
                    updateCurrentGroup(prev => ({
                      ...prev,
                      seragamList: prev.seragamList.map(item => (item.id === sr.id ? { ...item, seragam: e.target.value } : item))
                    }))
                  }
                  placeholder="Ketentuan seragam..."
                  style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', background: 'white' }}
                />
                <button
                  type="button"
                  onClick={() =>
                    updateCurrentGroup(prev => ({
                      ...prev,
                      seragamList: prev.seragamList.filter(item => item.id !== sr.id)
                    }))
                  }
                  style={{ padding: '6px', borderRadius: '6px', border: 'none', background: '#fee2e2', color: '#dc2626', cursor: 'pointer' }}
                  title="Hapus baris"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            ))}
            {(currentGroup.seragamList || []).length === 0 && (
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>
                Tidak ada jadwal seragam (bagian seragam disembunyikan saat cetak).
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '0.92rem', fontWeight: 700, color: '#1e293b' }}>
            <i className="fas fa-info-circle" style={{ color: '#0ea5e9', marginRight: '7px' }}></i>
            Catatan / Informasi — {activeGroupLabel}
          </h3>
          <textarea
            rows={4}
            value={currentGroup.catatanInfo}
            onChange={e => updateCurrentGroup(prev => ({ ...prev, catatanInfo: e.target.value }))}
            placeholder="Tulis catatan atau informasi penting untuk pengawas (tiap baris baru akan rapi tampil di cetak)..."
            style={{
              width: '100%',
              flex: 1,
              padding: '8px 10px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.82rem',
              lineHeight: 1.45,
              background: 'white',
              resize: 'vertical',
              boxSizing: 'border-box'
            }}
          />
          <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px' }}>
            Kosongkan jika tidak ingin menampilkan kotak catatan saat dicetak. Jangan lupa klik <b>Simpan Semua</b> setelah mengubah.
          </div>
        </div>
      </div>
        </>
      )}

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
