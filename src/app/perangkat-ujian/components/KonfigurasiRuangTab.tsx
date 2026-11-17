'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import { supabase } from '@/lib/supabase';
import InlineLoading from '@/components/InlineLoading';
import {
  AssignedParticipant,
  PrintPaperMode,
  RoomGroupPrintData,
  buildDaftarHadirHtml
} from './daftarHadirPrint';
import {
  DenahOrderPattern,
  DenahSesiView,
  buildDeskSlotsForRoom,
  buildDeskGrid,
  buildDenahRuangHtml
} from './denahRuangPrint';
import PaginationBar from './PaginationBar';

interface RawStudent {
  id: number;
  nis: string;
  nisn: string;
  nama: string;
  foto: string;
  jenisKelamin: string;
  status: string;
  rombel: string;
  tahunAjaran: string;
  isLatest: boolean;
  rawMetadata?: Record<string, string>;
}

type RoomGenderMode = 'L' | 'P' | 'CAMPUR';
type ExamSesi = 'Pagi' | 'Siang';
type GradeNumber = 7 | 8 | 9;
type GradeSessionMap = Record<GradeNumber, ExamSesi>;

const GRADE_NUMBERS: GradeNumber[] = [7, 8, 9];
const DEFAULT_GRADE_SESSION: GradeSessionMap = { 7: 'Siang', 8: 'Siang', 9: 'Pagi' };

function formatGradesShort(grades: GradeNumber[]): string {
  if (grades.length === 0) return 'Kosong';
  if (grades.length === 1) return `Kls ${grades[0]}`;
  return `Kls ${grades.join(' & ')}`;
}

function formatGradesLong(grades: GradeNumber[]): string {
  if (grades.length === 0) return 'Kosong';
  return `Kelas ${grades.join(' & ')}`;
}

const CONFIG_KEY = 'konfigurasi_ruang_ujian';
const SISWA_SESSION_CACHE_KEY = 'keren_ujian_siswa_compact_v1';
const SISWA_CACHE_TTL_MS = 15 * 60 * 1000; // 15 menit cache sesi agar hemat kuota Fast Data Transfer

function normalizeGender(jk?: string): 'L' | 'P' | 'UNKNOWN' {
  const v = (jk || '').toLowerCase().trim();
  if (!v) return 'UNKNOWN';
  if (
    v === 'l' ||
    v === 'lk' ||
    v === 'l.' ||
    v === 'm' ||
    v.includes('laki') ||
    v.includes('ikhwan') ||
    v.includes('putra')
  ) {
    return 'L';
  }
  if (
    v === 'p' ||
    v === 'pr' ||
    v === 'p.' ||
    v === 'f' ||
    v.includes('perempuan') ||
    v.includes('wanita') ||
    v.includes('akhwat') ||
    v.includes('putri')
  ) {
    return 'P';
  }
  return 'UNKNOWN';
}

function parseKelasOrder(rombel?: string): { tingkat: number; huruf: string; clean: string } {
  const clean = (rombel || '')
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[.-]/g, '');
  const match = clean.match(/^(\d+)([A-Z]+)$/);
  if (match) {
    return {
      tingkat: parseInt(match[1], 10),
      huruf: match[2],
      clean
    };
  }
  return {
    tingkat: 99,
    huruf: clean || 'ZZZ',
    clean: rombel || '-'
  };
}

function summarizeClasses(students: AssignedParticipant[]): string {
  const counts: Record<string, number> = {};
  students.forEach(s => {
    const k = s.rombel || '-';
    counts[k] = (counts[k] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([k, n]) => `${k} (${n})`)
    .join(', ');
}

export default function KonfigurasiRuangTab() {
  const [rawStudents, setRawStudents] = useState<RawStudent[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [refreshingStudents, setRefreshingStudents] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const hasLoadedInitialRef = useRef(false);

  // Configuration state
  const [tahunAjaranFilter, setTahunAjaranFilter] = useState<string>('SEMUA');
  const [jumlahRuang, setJumlahRuang] = useState<number>(20);
  const [customRoomQuotas, setCustomRoomQuotas] = useState<Record<number, number>>({});
  const [customRoomGenders, setCustomRoomGenders] = useState<Record<number, RoomGenderMode>>({});
  const [sortMode, setSortMode] = useState<'tingkat-huruf' | 'huruf-tingkat'>('tingkat-huruf');
  const [noUjianPrefix, setNoUjianPrefix] = useState<string>('');
  const [gradeSessionMap, setGradeSessionMap] = useState<GradeSessionMap>(DEFAULT_GRADE_SESSION);

  // Result state
  const [assignments, setAssignments] = useState<AssignedParticipant[]>([]);
  const [unassigned, setUnassigned] = useState<
    { nisn: string; nama: string; rombel: string; jenisKelamin: string; reason: string }[]
  >([]);
  const [lastUpdatedInfo, setLastUpdatedInfo] = useState<string>('');

  // Table Filters & Pagination
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterSesi, setFilterSesi] = useState<'ALL' | 'Pagi' | 'Siang'>('ALL');
  const [filterRuang, setFilterRuang] = useState<string>('ALL');
  const [filterGender, setFilterGender] = useState<'ALL' | 'L' | 'P'>('ALL');
  const [filterTingkat, setFilterTingkat] = useState<string>('ALL');
  const [filterKelas, setFilterKelas] = useState<string>('ALL');
  const [tablePage, setTablePage] = useState<number>(1);
  const [tablePageSize, setTablePageSize] = useState<number>(25);

  // Print Daftar Hadir Modal State
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [printTargetRoom, setPrintTargetRoom] = useState<string>('ALL');
  const [printTargetSesi, setPrintTargetSesi] = useState<'ALL' | 'Pagi' | 'Siang'>('ALL');
  const [printTargetTingkat, setPrintTargetTingkat] = useState<'ALL' | '7' | '8' | '9'>('ALL');
  const [printPaperMode, setPrintPaperMode] = useState<PrintPaperMode>('f4-landscape-2up');
  const [examTitle, setExamTitle] = useState<string>('ASESMEN MADRASAH');
  const [printTahunAjaran, setPrintTahunAjaran] = useState<string>('2026/2027');
  const [printMapel, setPrintMapel] = useState<string>('');
  const [printHariTanggal, setPrintHariTanggal] = useState<string>('');
  const [printWaktu, setPrintWaktu] = useState<string>('');
  const [duplicateSingleOn2Up, setDuplicateSingleOn2Up] = useState<boolean>(false);

  // Denah / Mapping Tempat Duduk Modal State
  const [showDenahModal, setShowDenahModal] = useState<boolean>(false);
  const [denahRoomNumber, setDenahRoomNumber] = useState<number>(1);
  const [denahCols, setDenahCols] = useState<number>(4);
  const [denahPattern, setDenahPattern] = useState<DenahOrderPattern>('baris-kiri-kanan');
  const [denahSesiView, setDenahSesiView] = useState<DenahSesiView>('gabungan');

  const fetchCompactStudents = async (forceFresh = false): Promise<RawStudent[]> => {
    if (!forceFresh && typeof window !== 'undefined') {
      try {
        const cachedRaw = sessionStorage.getItem(SISWA_SESSION_CACHE_KEY);
        if (cachedRaw) {
          const parsed = JSON.parse(cachedRaw);
          if (parsed && Array.isArray(parsed.data) && Date.now() - Number(parsed.ts || 0) < SISWA_CACHE_TTL_MS) {
            return parsed.data;
          }
        }
      } catch {}
    }

    const url = forceFresh ? '/api/siswa?mode=ujian&fresh=1' : '/api/siswa?mode=ujian';
    const siswaRes = await fetch(url).then(r => r.json()).catch(() => null);
    if (siswaRes?.success && Array.isArray(siswaRes.data)) {
      const activeList: RawStudent[] = siswaRes.data.filter((s: RawStudent) => {
        const isAktif = (s.status || '').toLowerCase().trim() === 'aktif';
        return s.isLatest && isAktif;
      });
      try {
        sessionStorage.setItem(
          SISWA_SESSION_CACHE_KEY,
          JSON.stringify({ ts: Date.now(), data: activeList })
        );
      } catch {}
      return activeList;
    }
    return [];
  };

  // Load students + saved room configuration on mount
  useEffect(() => {
    const loadInitial = async () => {
      setLoadingStudents(true);
      try {
        const [activeList, cfgRes] = await Promise.all([
          fetchCompactStudents(false),
          supabase.from('rapor_config').select('*').eq('key', CONFIG_KEY).maybeSingle()
        ]);

        if (activeList.length > 0) {
          setRawStudents(activeList);

          const taSet = Array.from(
            new Set(activeList.map(s => (s.tahunAjaran || '').trim()).filter(Boolean))
          ).sort();
          if (taSet.length > 0) {
            setPrintTahunAjaran(taSet[taSet.length - 1]);
          }
        }

        let savedRaw: string | null = null;
        if (!cfgRes.error && cfgRes.data?.value) {
          savedRaw = cfgRes.data.value;
        } else {
          savedRaw = localStorage.getItem(CONFIG_KEY);
        }

        if (savedRaw) {
          try {
            const parsed = JSON.parse(savedRaw);
            if (typeof parsed.jumlahRuang === 'number') setJumlahRuang(parsed.jumlahRuang);
            if (parsed.customRoomQuotas) setCustomRoomQuotas(parsed.customRoomQuotas);
            if (parsed.customRoomGenders) setCustomRoomGenders(parsed.customRoomGenders);
            if (parsed.sortMode) setSortMode(parsed.sortMode);
            if (typeof parsed.noUjianPrefix === 'string') setNoUjianPrefix(parsed.noUjianPrefix);
            if (typeof parsed.tahunAjaranFilter === 'string') setTahunAjaranFilter(parsed.tahunAjaranFilter);
            if (parsed.gradeSessionMap && typeof parsed.gradeSessionMap === 'object') {
              setGradeSessionMap({
                7: parsed.gradeSessionMap[7] === 'Pagi' ? 'Pagi' : 'Siang',
                8: parsed.gradeSessionMap[8] === 'Pagi' ? 'Pagi' : 'Siang',
                9: parsed.gradeSessionMap[9] === 'Siang' ? 'Siang' : 'Pagi'
              });
            }
            if (Array.isArray(parsed.assignments)) {
              setAssignments(
                parsed.assignments.map((a: any) => ({
                  ...a,
                  sesi: a.sesi === 'Pagi' || a.sesi === 'Siang' ? a.sesi : a.tingkat === 9 ? 'Pagi' : 'Siang'
                }))
              );
            }
            if (Array.isArray(parsed.unassigned)) setUnassigned(parsed.unassigned);
            if (parsed.examTitle) setExamTitle(parsed.examTitle);
            if (parsed.updatedAt) setLastUpdatedInfo(parsed.updatedAt);
          } catch {}
        }
      } catch (e) {
        console.error('Error loading Konfigurasi Ruang:', e);
      } finally {
        hasLoadedInitialRef.current = true;
        setLoadingStudents(false);
      }
    };

    loadInitial();
  }, []);

  const handleRefreshStudents = async () => {
    setRefreshingStudents(true);
    try {
      const freshList = await fetchCompactStudents(true);
      setRawStudents(freshList);
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: `Data ${freshList.length} siswa aktif berhasil disinkronkan.`,
        showConfirmButton: false,
        timer: 2000
      });
    } finally {
      setRefreshingStudents(false);
    }
  };

  // Auto-simpan draft konfigurasi ke localStorage setiap kali input ruang/quota diubah
  useEffect(() => {
    if (!hasLoadedInitialRef.current) return;
    try {
      const draft = {
        jumlahRuang,
        customRoomQuotas,
        customRoomGenders,
        sortMode,
        noUjianPrefix,
        tahunAjaranFilter,
        gradeSessionMap,
        examTitle,
        assignments,
        unassigned,
        updatedAt: lastUpdatedInfo
      };
      localStorage.setItem(CONFIG_KEY, JSON.stringify(draft));
    } catch {}
  }, [jumlahRuang, customRoomQuotas, customRoomGenders, sortMode, noUjianPrefix, tahunAjaranFilter, gradeSessionMap]);

  const tahunAjaranOptions = useMemo(() => {
    return Array.from(
      new Set(rawStudents.map(s => (s.tahunAjaran || '').trim()).filter(Boolean))
    ).sort();
  }, [rawStudents]);

  const activeStudentsPool = useMemo(() => {
    return rawStudents.filter(s => {
      if (tahunAjaranFilter !== 'SEMUA' && (s.tahunAjaran || '').trim() !== tahunAjaranFilter) {
        return false;
      }
      return true;
    });
  }, [rawStudents, tahunAjaranFilter]);

  const pagiGrades = useMemo(
    () => GRADE_NUMBERS.filter(g => gradeSessionMap[g] === 'Pagi'),
    [gradeSessionMap]
  );
  const siangGrades = useMemo(
    () => GRADE_NUMBERS.filter(g => gradeSessionMap[g] === 'Siang'),
    [gradeSessionMap]
  );
  const pagiPairMode = pagiGrades.length >= 2;
  const siangPairMode = siangGrades.length >= 2;
  const pagiGradesLabel = formatGradesShort(pagiGrades);
  const siangGradesLabel = formatGradesShort(siangGrades);
  const pagiGradesLong = formatGradesLong(pagiGrades);
  const siangGradesLong = formatGradesLong(siangGrades);

  const genderStats = useMemo(() => {
    let laki = 0;
    let perempuan = 0;
    let unknown = 0;
    let pagiL = 0;
    let pagiP = 0;
    let siangL = 0;
    let siangP = 0;
    let unknownGrade = 0;

    activeStudentsPool.forEach(s => {
      const g = normalizeGender(s.jenisKelamin);
      const { tingkat } = parseKelasOrder(s.rombel);
      if (g === 'L') laki++;
      else if (g === 'P') perempuan++;
      else {
        unknown++;
        return;
      }

      if (tingkat === 7 || tingkat === 8 || tingkat === 9) {
        if (gradeSessionMap[tingkat] === 'Pagi') {
          if (g === 'L') pagiL++;
          else pagiP++;
        } else {
          if (g === 'L') siangL++;
          else siangP++;
        }
      } else {
        unknownGrade++;
      }
    });

    return {
      total: activeStudentsPool.length,
      laki,
      perempuan,
      unknown,
      pagiTotal: pagiL + pagiP,
      pagiL,
      pagiP,
      siangTotal: siangL + siangP,
      siangL,
      siangP,
      unknownGrade
    };
  }, [activeStudentsPool, gradeSessionMap]);

  const getRoomQuota = (roomNumber: number) => {
    const custom = customRoomQuotas[roomNumber];
    return typeof custom === 'number' && custom >= 0 ? custom : 0;
  };

  // 1 bangku = 2 kursi -> 1 angkatan di sesi = 1 siswa/bangku (Math.ceil(kursi/2)); >=2 angkatan di sesi = 2 siswa/bangku (kursi penuh)
  const getRoomQuotaPagi = (roomNumber: number) => {
    if (pagiGrades.length === 0) return 0;
    const kursi = getRoomQuota(roomNumber);
    if (kursi <= 0) return 0;
    return pagiPairMode ? kursi : Math.ceil(kursi / 2);
  };

  const getRoomQuotaSiang = (roomNumber: number) => {
    if (siangGrades.length === 0) return 0;
    const kursi = getRoomQuota(roomNumber);
    if (kursi <= 0) return 0;
    return siangPairMode ? kursi : Math.ceil(kursi / 2);
  };

  const getRoomGenderMode = (roomNumber: number): RoomGenderMode => {
    const custom = customRoomGenders[roomNumber];
    if (custom === 'L' || custom === 'P' || custom === 'CAMPUR') return custom;
    return roomNumber % 2 === 1 ? 'L' : 'P';
  };

  const getRoomGenderLabel = (mode: RoomGenderMode) => {
    if (mode === 'L') return 'Laki-laki';
    if (mode === 'P') return 'Perempuan';
    return 'Campur (L/P)';
  };

  const capacityStats = useMemo(() => {
    const count = Math.max(1, Math.min(100, Number(jumlahRuang) || 1));
    let lRooms = 0;
    let pRooms = 0;
    let campurRooms = 0;
    let capPagiL = 0;
    let capPagiP = 0;
    let capPagiCampur = 0;
    let capSiangL = 0;
    let capSiangP = 0;
    let capSiangCampur = 0;
    let totalChairsConfigured = 0;

    for (let r = 1; r <= count; r++) {
      const rawKursi = getRoomQuota(r);
      totalChairsConfigured += rawKursi;
      const qPagi = getRoomQuotaPagi(r);
      const qSiang = getRoomQuotaSiang(r);
      const mode = getRoomGenderMode(r);
      if (mode === 'L') {
        lRooms++;
        capPagiL += qPagi;
        capSiangL += qSiang;
      } else if (mode === 'P') {
        pRooms++;
        capPagiP += qPagi;
        capSiangP += qSiang;
      } else {
        campurRooms++;
        capPagiCampur += qPagi;
        capSiangCampur += qSiang;
      }
    }

    return {
      count,
      lRooms,
      pRooms,
      campurRooms,
      capPagiL,
      capPagiP,
      capPagiCampur,
      capPagiTotal: capPagiL + capPagiP + capPagiCampur,
      capSiangL,
      capSiangP,
      capSiangCampur,
      capSiangTotal: capSiangL + capSiangP + capSiangCampur,
      capTotal: totalChairsConfigured
    };
  }, [jumlahRuang, customRoomQuotas, customRoomGenders, pagiPairMode, siangPairMode, pagiGrades.length, siangGrades.length]);

  const persistConfiguration = async (
    nextAssignments: AssignedParticipant[],
    nextUnassigned: { nisn: string; nama: string; rombel: string; jenisKelamin: string; reason: string }[],
    showToast = false
  ) => {
    const updatedAt = new Date().toLocaleString('id-ID');
    const payload = {
      jumlahRuang,
      customRoomQuotas,
      customRoomGenders,
      sortMode,
      noUjianPrefix,
      tahunAjaranFilter,
      gradeSessionMap,
      examTitle,
      assignments: nextAssignments,
      unassigned: nextUnassigned,
      updatedAt
    };
    const serialized = JSON.stringify(payload);
    localStorage.setItem(CONFIG_KEY, serialized);
    setLastUpdatedInfo(updatedAt);

    try {
      setSavingConfig(true);
      const { error } = await supabase
        .from('rapor_config')
        .upsert({ key: CONFIG_KEY, value: serialized }, { onConflict: 'key' });
      if (error) throw error;
      if (showToast) {
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Konfigurasi & pembagian ruang disimpan secara global.',
          showConfirmButton: false,
          timer: 2500
        });
      }
    } catch (err: any) {
      if (showToast) {
        Swal.fire(
          'Tersimpan Lokal',
          'Konfigurasi tersimpan di browser ini, namun gagal sinkron ke server: ' +
            (err?.message || 'Unknown error'),
          'warning'
        );
      }
    } finally {
      setSavingConfig(false);
    }
  };

  const handleAutoAssign = async () => {
    if (activeStudentsPool.length === 0) {
      Swal.fire('Oops', 'Data siswa aktif belum tersedia.', 'warning');
      return;
    }

    const totalRooms = Math.max(1, Math.min(100, Number(jumlahRuang) || 1));
    if (capacityStats.capTotal <= 0) {
      Swal.fire('Oops', 'Silakan isi quota kursi minimal pada salah satu ruang terlebih dahulu.', 'warning');
      return;
    }

    const compareStudent = (a: RawStudent, b: RawStudent) => {
      const ka = parseKelasOrder(a.rombel);
      const kb = parseKelasOrder(b.rombel);
      if (sortMode === 'tingkat-huruf') {
        if (ka.tingkat !== kb.tingkat) return ka.tingkat - kb.tingkat;
        const hCmp = ka.huruf.localeCompare(kb.huruf, 'id');
        if (hCmp !== 0) return hCmp;
      } else {
        const hCmp = ka.huruf.localeCompare(kb.huruf, 'id');
        if (hCmp !== 0) return hCmp;
        if (ka.tingkat !== kb.tingkat) return ka.tingkat - kb.tingkat;
      }
      return (a.nama || '').localeCompare(b.nama || '', 'id');
    };

    const byGradeGender: Record<GradeNumber, { L: RawStudent[]; P: RawStudent[] }> = {
      7: { L: [], P: [] },
      8: { L: [], P: [] },
      9: { L: [], P: [] }
    };
    const unknownStudents: { s: RawStudent; reason: string }[] = [];

    activeStudentsPool.forEach(s => {
      const g = normalizeGender(s.jenisKelamin);
      if (g === 'UNKNOWN') {
        unknownStudents.push({ s, reason: 'Jenis kelamin kosong/tidak dikenali' });
        return;
      }
      const { tingkat } = parseKelasOrder(s.rombel);
      if (tingkat === 7 || tingkat === 8 || tingkat === 9) {
        byGradeGender[tingkat][g].push(s);
      } else {
        unknownStudents.push({ s, reason: 'Tingkat kelas selain 7/8/9 tidak dikenali' });
      }
    });

    GRADE_NUMBERS.forEach(g => {
      byGradeGender[g].L.sort(compareStudent);
      byGradeGender[g].P.sort(compareStudent);
    });

    const lRoomNums: number[] = [];
    const pRoomNums: number[] = [];
    const campurRoomNums: number[] = [];
    for (let r = 1; r <= totalRooms; r++) {
      const mode = getRoomGenderMode(r);
      if (mode === 'L') lRoomNums.push(r);
      else if (mode === 'P') pRoomNums.push(r);
      else campurRoomNums.push(r);
    }

    const prefixClean = noUjianPrefix.trim();
    const assignedList: AssignedParticipant[] = [];
    const overflowList: {
      nisn: string;
      nama: string;
      rombel: string;
      jenisKelamin: string;
      reason: string;
    }[] = [];

    const pushAssigned = (
      s: RawStudent,
      rNum: number,
      seat: number,
      sesi: ExamSesi
    ) => {
      const genderCode: 'L' | 'P' = normalizeGender(s.jenisKelamin) === 'L' ? 'L' : 'P';
      const parsedKelas = parseKelasOrder(s.rombel);
      const rawFoto =
        s.rawMetadata?.['LINK FOTO TERBARU'] ||
        s.rawMetadata?.['LINK URL FOTO 1'] ||
        s.foto ||
        '';

      assignedList.push({
        nis: s.nis || '',
        nisn: s.nisn || s.nis || '',
        nama: s.nama || 'TANPA NAMA',
        jenisKelamin: genderCode,
        rombel: s.rombel || '-',
        tingkat: parsedKelas.tingkat,
        hurufKelas: parsedKelas.huruf,
        sesi,
        ruangNumber: rNum,
        ruang: `Ruang ${rNum}`,
        noKursi: seat,
        noUjian: '',
        foto: rawFoto
      });
    };

    const assignSingleDeskRooms = (
      students: RawStudent[],
      roomNumbers: number[],
      sesi: ExamSesi
    ): RawStudent[] => {
      let idx = 0;
      for (const rNum of roomNumbers) {
        const kursi = getRoomQuota(rNum);
        const quotaBangku = kursi <= 0 ? 0 : Math.ceil(kursi / 2);
        for (let seat = 1; seat <= quotaBangku && idx < students.length; seat++) {
          pushAssigned(students[idx++], rNum, seat, sesi);
        }
      }
      return students.slice(idx);
    };

    const assignPairedBersebelahan = (
      listA: RawStudent[],
      listB: RawStudent[],
      roomNumbers: number[],
      sesi: ExamSesi
    ): { remA: RawStudent[]; remB: RawStudent[] } => {
      let idxA = 0;
      let idxB = 0;

      for (const rNum of roomNumbers) {
        const quota = getRoomQuota(rNum);
        const remA = listA.length - idxA;
        const remB = listB.length - idxB;
        if (remA === 0 && remB === 0) break;
        if (quota <= 0) continue;

        let takeA = Math.min(remA, remA >= remB ? Math.ceil(quota / 2) : Math.floor(quota / 2));
        let takeB = Math.min(remB, quota - takeA);

        if (takeA + takeB < quota) {
          const extraA = Math.min(remA - takeA, quota - (takeA + takeB));
          takeA += extraA;
          const extraB = Math.min(remB - takeB, quota - (takeA + takeB));
          takeB += extraB;
        }

        const chunkA = listA.slice(idxA, idxA + takeA);
        const chunkB = listB.slice(idxB, idxB + takeB);
        idxA += takeA;
        idxB += takeB;

        const interleaved: RawStudent[] = [];
        const maxLen = Math.max(chunkA.length, chunkB.length);
        for (let i = 0; i < maxLen; i++) {
          if (i < chunkA.length) interleaved.push(chunkA[i]);
          if (i < chunkB.length) interleaved.push(chunkB[i]);
        }

        interleaved.forEach((student, sIdx) => {
          pushAssigned(student, rNum, sIdx + 1, sesi);
        });
      }

      return {
        remA: listA.slice(idxA),
        remB: listB.slice(idxB)
      };
    };

    const assignPairedCampurNoMixGender = (
      listAL: RawStudent[],
      listBL: RawStudent[],
      listAP: RawStudent[],
      listBP: RawStudent[],
      roomNumbers: number[],
      sesi: ExamSesi
    ): RawStudent[] => {
      type DeskPair = { left: RawStudent; right: RawStudent | null };

      const buildSameGenderDesks = (arrA: RawStudent[], arrB: RawStudent[]): DeskPair[] => {
        const desks: DeskPair[] = [];
        let iA = 0;
        let iB = 0;
        while (iA < arrA.length && iB < arrB.length) {
          desks.push({ left: arrA[iA++], right: arrB[iB++] });
        }
        const rest = [...arrA.slice(iA), ...arrB.slice(iB)];
        for (let i = 0; i < rest.length; i += 2) {
          desks.push({ left: rest[i], right: rest[i + 1] ?? null });
        }
        return desks;
      };

      const maleDesks = buildSameGenderDesks(listAL, listBL);
      const femaleDesks = buildSameGenderDesks(listAP, listBP);

      let totalRoomSlots = 0;
      let totalRoomChairs = 0;
      roomNumbers.forEach(rNum => {
        const q = getRoomQuota(rNum);
        if (q > 0) {
          totalRoomChairs += q;
          totalRoomSlots += Math.ceil(q / 2);
        }
      });

      const allDesks: DeskPair[] = [...maleDesks, ...femaleDesks];
      const totalStudents =
        listAL.length + listBL.length + listAP.length + listBP.length;

      if (allDesks.length > totalRoomSlots && totalStudents <= totalRoomChairs) {
        const lastMaleIdx = maleDesks.length - 1;
        const lastFemaleIdx = femaleDesks.length - 1;
        if (
          lastMaleIdx >= 0 &&
          lastFemaleIdx >= 0 &&
          maleDesks[lastMaleIdx].right === null &&
          femaleDesks[lastFemaleIdx].right === null
        ) {
          maleDesks[lastMaleIdx].right = femaleDesks[lastFemaleIdx].left;
          femaleDesks.pop();
        }
      }

      const finalDesks: DeskPair[] = [...maleDesks, ...femaleDesks];
      const queue = [...finalDesks];

      for (const rNum of roomNumbers) {
        const quota = getRoomQuota(rNum);
        if (quota <= 0 || queue.length === 0) continue;

        const pairDesksCount = Math.floor(quota / 2);
        for (let d = 1; d <= pairDesksCount && queue.length > 0; d++) {
          const desk = queue.shift()!;
          pushAssigned(desk.left, rNum, (d - 1) * 2 + 1, sesi);
          if (desk.right) {
            pushAssigned(desk.right, rNum, (d - 1) * 2 + 2, sesi);
          }
        }

        if (quota % 2 === 1 && queue.length > 0) {
          const oddIdx = queue.findIndex(item => item.right === null);
          if (oddIdx !== -1) {
            const singleDesk = queue.splice(oddIdx, 1)[0];
            pushAssigned(singleDesk.left, rNum, quota, sesi);
          } else {
            const frontDesk = queue[0];
            pushAssigned(frontDesk.left, rNum, quota, sesi);
            if (frontDesk.right) {
              frontDesk.left = frontDesk.right;
              frontDesk.right = null;
            } else {
              queue.shift();
            }
          }
        }
      }

      const leftover: RawStudent[] = [];
      queue.forEach(d => {
        leftover.push(d.left);
        if (d.right) leftover.push(d.right);
      });
      return leftover;
    };

    const allocateSession = (sesi: ExamSesi, gradesInSession: GradeNumber[]): RawStudent[] => {
      if (gradesInSession.length === 0) return [];
      if (gradesInSession.length === 1) {
        // 1 angkatan: duduk sendiri 1 siswa/bangku
        const g = gradesInSession[0];
        const remMale = assignSingleDeskRooms(byGradeGender[g].L, lRoomNums, sesi);
        const remFemale = assignSingleDeskRooms(byGradeGender[g].P, pRoomNums, sesi);
        const remCampur = [...remMale, ...remFemale].sort(compareStudent);
        return assignSingleDeskRooms(remCampur, campurRoomNums, sesi);
      }

      // >= 2 angkatan: 2 siswa/bangku bersebelahan (utamakan pasangan beda tingkat)
      const firstGrade = gradesInSession[0];
      const otherGrades = gradesInSession.slice(1);
      const listAL = byGradeGender[firstGrade].L;
      const listAP = byGradeGender[firstGrade].P;
      const listBL = otherGrades.flatMap(g => byGradeGender[g].L).sort(compareStudent);
      const listBP = otherGrades.flatMap(g => byGradeGender[g].P).sort(compareStudent);

      const remL = assignPairedBersebelahan(listAL, listBL, lRoomNums, sesi);
      const remP = assignPairedBersebelahan(listAP, listBP, pRoomNums, sesi);
      return assignPairedCampurNoMixGender(remL.remA, remL.remB, remP.remA, remP.remB, campurRoomNums, sesi);
    };

    const unplacedPagi = allocateSession('Pagi', pagiGrades);
    const unplacedSiang = allocateSession('Siang', siangGrades);

    unplacedPagi.forEach(s => {
      const g = normalizeGender(s.jenisKelamin);
      overflowList.push({
        nisn: s.nisn || s.nis || '-',
        nama: s.nama || '-',
        rombel: s.rombel || '-',
        jenisKelamin: s.jenisKelamin || '-',
        reason: `Melebihi kapasitas Sesi Pagi (${pagiGradesLabel} ${g})`
      });
    });

    unplacedSiang.forEach(s => {
      const g = normalizeGender(s.jenisKelamin);
      overflowList.push({
        nisn: s.nisn || s.nis || '-',
        nama: s.nama || '-',
        rombel: s.rombel || '-',
        jenisKelamin: s.jenisKelamin || '-',
        reason: `Melebihi kapasitas Sesi Siang (${siangGradesLabel} ${g})`
      });
    });

    unknownStudents.forEach(({ s, reason }) => {
      overflowList.push({
        nisn: s.nisn || s.nis || '-',
        nama: s.nama || '-',
        rombel: s.rombel || '-',
        jenisKelamin: s.jenisKelamin || '-',
        reason
      });
    });

    assignedList.sort((a, b) => {
      if (a.ruangNumber !== b.ruangNumber) return a.ruangNumber - b.ruangNumber;
      if (a.sesi !== b.sesi) return a.sesi === 'Pagi' ? -1 : 1;
      return a.noKursi - b.noKursi;
    });

    // Generate No. Ujian setelah urut ruang & kursi: [Awalan-]R.<ruang><L/P>-<tingkat>-<urut 3 digit per angkatan>
    const gradeCounter: Record<number, number> = { 7: 0, 8: 0, 9: 0 };
    assignedList.forEach(a => {
      const gradeKey = a.tingkat === 7 || a.tingkat === 8 || a.tingkat === 9 ? a.tingkat : 0;
      gradeCounter[gradeKey] = (gradeCounter[gradeKey] || 0) + 1;
      const roomPad = String(a.ruangNumber).padStart(2, '0');
      const genderCode = a.jenisKelamin; // 'L' | 'P'
      const seqPad = String(gradeCounter[gradeKey]).padStart(3, '0');
      const gradeSeq = gradeKey ? `${gradeKey}-${seqPad}` : seqPad;
      a.noUjian = prefixClean
        ? `${prefixClean}-R.${roomPad}${genderCode}-${gradeSeq}`
        : `R.${roomPad}${genderCode}-${gradeSeq}`;
    });

    setAssignments(assignedList);
    setUnassigned(overflowList);
    setFilterSesi('ALL');
    setFilterRuang('ALL');
    setFilterGender('ALL');
    setFilterTingkat('ALL');
    setFilterKelas('ALL');
    setSearchQuery('');

    await persistConfiguration(assignedList, overflowList, false);

    const pagiRuleDesc =
      pagiGrades.length === 0
        ? 'Kosong'
        : `${pagiGradesLong} duduk ${pagiPairMode ? 'bersebelahan (2/bangku)' : 'sendiri (1/bangku)'}`;
    const siangRuleDesc =
      siangGrades.length === 0
        ? 'Kosong'
        : `${siangGradesLong} duduk ${siangPairMode ? 'bersebelahan (2/bangku)' : 'sendiri (1/bangku)'}`;

    if (overflowList.length > 0) {
      Swal.fire(
        'Pembagian Selesai dengan Catatan',
        `Berhasil membagi <b>${assignedList.length}</b> siswa ke Sesi Pagi (${pagiGradesLabel}) & Sesi Siang (${siangGradesLabel}) dalam ${totalRooms} ruang, namun terdapat <b>${overflowList.length}</b> siswa belum mendapat ruang.`,
        'warning'
      );
    } else {
      Swal.fire(
        'Berhasil!',
        `Sebanyak ${assignedList.length} siswa aktif telah dibagi otomatis ke ${totalRooms} ruang (Pagi: ${pagiRuleDesc}; Siang: ${siangRuleDesc}; urut A–I).`,
        'success'
      );
    }
  };

  // Ringkasan per Ruang (menggabungkan Pagi & Siang) + daftar sheet print per sesi
  const roomOverviews = useMemo(() => {
    const totalRooms = Math.max(
      jumlahRuang,
      assignments.reduce((max, a) => Math.max(max, a.ruangNumber), 0)
    );
    const pagiByRoom: Record<number, AssignedParticipant[]> = {};
    const siangByRoom: Record<number, AssignedParticipant[]> = {};
    assignments.forEach(a => {
      const target = a.sesi === 'Pagi' ? pagiByRoom : siangByRoom;
      if (!target[a.ruangNumber]) target[a.ruangNumber] = [];
      target[a.ruangNumber].push(a);
    });

    const list: {
      ruangNumber: number;
      ruangName: string;
      gender: RoomGenderMode;
      genderLabel: string;
      quotaKursi: number;
      quotaPagi: number;
      quotaSiang: number;
      pagiPairMode: boolean;
      siangPairMode: boolean;
      pagiGradesLabel: string;
      siangGradesLabel: string;
      pagiStudents: AssignedParticipant[];
      siangStudents: AssignedParticipant[];
    }[] = [];

    for (let r = 1; r <= totalRooms; r++) {
      const mode = getRoomGenderMode(r);
      const quotaKursi = getRoomQuota(r);
      const quotaPagi = getRoomQuotaPagi(r);
      const quotaSiang = getRoomQuotaSiang(r);
      list.push({
        ruangNumber: r,
        ruangName: `Ruang ${r}`,
        gender: mode,
        genderLabel: getRoomGenderLabel(mode),
        quotaKursi,
        quotaPagi,
        quotaSiang,
        pagiPairMode,
        siangPairMode,
        pagiGradesLabel,
        siangGradesLabel,
        pagiStudents: (pagiByRoom[r] || []).slice().sort((a, b) => a.noKursi - b.noKursi),
        siangStudents: (siangByRoom[r] || []).slice().sort((a, b) => a.noKursi - b.noKursi)
      });
    }
    return list;
  }, [assignments, jumlahRuang, customRoomQuotas, customRoomGenders, pagiPairMode, siangPairMode, pagiGradesLabel, siangGradesLabel]);

  const roomSummaries = useMemo<RoomGroupPrintData[]>(() => {
    const list: RoomGroupPrintData[] = [];
    // Daftar Hadir dipisah sendiri per angkatan (Kelas 7, Kelas 8, Kelas 9) di tiap ruang & sesi
    const pushSplitByGrade = (
      r: typeof roomOverviews[number],
      sesi: ExamSesi,
      students: AssignedParticipant[],
      quota: number
    ) => {
      if (students.length === 0) return;
      const gradesPresent = Array.from(new Set(students.map(s => s.tingkat))).sort((a, b) => a - b);
      gradesPresent.forEach(t => {
        const gradeStudents = students.filter(s => s.tingkat === t);
        if (gradeStudents.length === 0) return;
        const gradeText = t >= 7 && t <= 9 ? `Kelas ${t}` : 'Lainnya';
        list.push({
          ruangNumber: r.ruangNumber,
          ruangName: r.ruangName,
          sesi,
          sesiLabel: `Sesi ${sesi} • ${gradeText}`,
          tingkat: t,
          gender: r.gender,
          genderLabel: r.genderLabel,
          quota,
          students: gradeStudents
        });
      });
    };

    roomOverviews.forEach(r => {
      pushSplitByGrade(r, 'Pagi', r.pagiStudents, r.quotaPagi);
      pushSplitByGrade(r, 'Siang', r.siangStudents, r.quotaSiang);
    });
    return list;
  }, [roomOverviews]);

  const availableKelasOptions = useMemo(() => {
    return Array.from(new Set(assignments.map(a => a.rombel).filter(Boolean))).sort((a, b) => {
      const pa = parseKelasOrder(a);
      const pb = parseKelasOrder(b);
      if (pa.tingkat !== pb.tingkat) return pa.tingkat - pb.tingkat;
      return pa.huruf.localeCompare(pb.huruf, 'id');
    });
  }, [assignments]);

  const filteredAssignments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return assignments.filter(a => {
      if (filterSesi !== 'ALL' && a.sesi !== filterSesi) return false;
      if (filterRuang !== 'ALL' && String(a.ruangNumber) !== filterRuang) return false;
      if (filterGender !== 'ALL' && a.jenisKelamin !== filterGender) return false;
      if (filterTingkat !== 'ALL' && String(a.tingkat) !== filterTingkat) return false;
      if (filterKelas !== 'ALL' && a.rombel !== filterKelas) return false;
      if (q) {
        const hit =
          (a.nama || '').toLowerCase().includes(q) ||
          (a.nisn || '').toLowerCase().includes(q) ||
          (a.noUjian || '').toLowerCase().includes(q) ||
          (a.rombel || '').toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [assignments, filterSesi, filterRuang, filterGender, filterTingkat, filterKelas, searchQuery]);

  useEffect(() => {
    setTablePage(1);
  }, [assignments.length, filterSesi, filterRuang, filterGender, filterTingkat, filterKelas, searchQuery]);

  const safeTablePage = Math.min(
    tablePage,
    Math.max(1, Math.ceil(filteredAssignments.length / tablePageSize))
  );
  const paginatedAssignments = useMemo(() => {
    const start = (safeTablePage - 1) * tablePageSize;
    return filteredAssignments.slice(start, start + tablePageSize);
  }, [filteredAssignments, safeTablePage, tablePageSize]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterSesi('ALL');
    setFilterRuang('ALL');
    setFilterGender('ALL');
    setFilterTingkat('ALL');
    setFilterKelas('ALL');
  };

  const handleExportExcel = () => {
    if (filteredAssignments.length === 0) {
      Swal.fire('Info', 'Tidak ada data peserta yang dapat di-export.', 'info');
      return;
    }

    const wb = XLSX.utils.book_new();

    // Sheet 1: Daftar Peserta (kolom NISN, KELAS, NO UJIAN, RUANG kompatibel dengan Generate Nopes & Nobang)
    const pesertaRows = filteredAssignments.map((p, idx) => ({
      NO: idx + 1,
      NISN: p.nisn,
      NIS: p.nis || '-',
      NAMA: p.nama,
      KELAS: p.rombel,
      JK: p.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan',
      SESI: p.sesi,
      RUANG: p.ruang,
      'NO KURSI': p.noKursi,
      'NO UJIAN': p.noUjian
    }));
    const wsPeserta = XLSX.utils.json_to_sheet(pesertaRows);
    wsPeserta['!cols'] = [
      { wch: 6 },
      { wch: 15 },
      { wch: 12 },
      { wch: 32 },
      { wch: 10 },
      { wch: 13 },
      { wch: 10 },
      { wch: 12 },
      { wch: 10 },
      { wch: 15 }
    ];
    XLSX.utils.book_append_sheet(wb, wsPeserta, 'Daftar Peserta');

    // Sheet 2: Rekap Per Ruang
    const rekapRows = roomOverviews.map(r => ({
      'NO RUANG': r.ruangNumber,
      'NAMA RUANG': r.ruangName,
      JENIS: r.genderLabel,
      [`KUOTA PAGI (${pagiPairMode ? 'KURSI' : 'BANGKU'})`]: r.quotaPagi,
      [`PAGI (${pagiGradesLabel.toUpperCase()})`]: r.pagiStudents.length,
      'KELAS PAGI': summarizeClasses(r.pagiStudents) || '-',
      [`KUOTA SIANG (${siangPairMode ? 'KURSI' : 'BANGKU'})`]: r.quotaSiang,
      [`SIANG (${siangGradesLabel.toUpperCase()})`]: r.siangStudents.length,
      'KELAS SIANG': summarizeClasses(r.siangStudents) || '-'
    }));
    const wsRekap = XLSX.utils.json_to_sheet(rekapRows);
    wsRekap['!cols'] = [
      { wch: 10 },
      { wch: 14 },
      { wch: 14 },
      { wch: 15 },
      { wch: 14 },
      { wch: 28 },
      { wch: 15 },
      { wch: 16 },
      { wch: 36 }
    ];
    XLSX.utils.book_append_sheet(wb, wsRekap, 'Rekap Ruang');

    const dateStr = new Date().toISOString().slice(0, 10);
    const suffix = filterRuang !== 'ALL' ? `_Ruang_${filterRuang}` : '_Semua_Ruang';
    XLSX.writeFile(wb, `Konfigurasi_Ruang_Ujian${suffix}_${dateStr}.xlsx`);
  };

  const openPrintModal = (roomNumber?: number, sesi?: 'ALL' | 'Pagi' | 'Siang') => {
    if (assignments.length === 0) {
      Swal.fire('Oops', 'Silakan klik "Bagi Ruang Otomatis" terlebih dahulu.', 'warning');
      return;
    }
    if (typeof roomNumber === 'number') {
      setPrintTargetRoom(String(roomNumber));
    } else if (filterRuang !== 'ALL') {
      setPrintTargetRoom(filterRuang);
    } else {
      setPrintTargetRoom('ALL');
    }
    if (sesi) {
      setPrintTargetSesi(sesi);
    } else if (filterSesi !== 'ALL') {
      setPrintTargetSesi(filterSesi);
    } else {
      setPrintTargetSesi('ALL');
    }
    if (!roomNumber && (filterTingkat === '7' || filterTingkat === '8' || filterTingkat === '9')) {
      setPrintTargetTingkat(filterTingkat);
    } else {
      setPrintTargetTingkat('ALL');
    }
    setShowPrintModal(true);
  };

  const handleLaunchPrint = () => {
    const selectedRooms = roomSummaries.filter(r => {
      if (r.students.length === 0) return false;
      if (printTargetRoom !== 'ALL' && String(r.ruangNumber) !== printTargetRoom) return false;
      if (printTargetSesi !== 'ALL' && r.sesi !== printTargetSesi) return false;
      if (printTargetTingkat !== 'ALL' && String(r.tingkat ?? '') !== printTargetTingkat) return false;
      return true;
    });

    if (selectedRooms.length === 0) {
      Swal.fire('Info', 'Ruang / sesi / angkatan yang dipilih belum memiliki peserta.', 'info');
      return;
    }

    const html = buildDaftarHadirHtml(
      selectedRooms,
      {
        examTitle,
        tahunAjaran: printTahunAjaran,
        mataPelajaran: printMapel,
        hariTanggal: printHariTanggal,
        waktuUjian: printWaktu,
        paperMode: printPaperMode,
        duplicateSingleOn2Up
      },
      window.location.origin
    );

    const win = window.open('', '_blank', 'width=1120,height=780');
    if (!win) {
      Swal.fire(
        'Pop-up Diblokir',
        'Izinkan pop-up browser agar jendela preview cetak Daftar Hadir dapat dibuka.',
        'warning'
      );
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  return (
    <div>
      {/* Header & Status Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', margin: '0 0 4px 0' }}>
            <i className="fas fa-door-open" style={{ color: '#0ea5e9', marginRight: '8px' }}></i>
            Konfigurasi & Pembagian Ruang Ujian
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
            Tentukan jumlah ruang dan quota kursi untuk membagi siswa aktif otomatis sesuai aturan ruang Ganjil/Genap dan urutan kelas A–I.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {lastUpdatedInfo && (
            <span style={{ fontSize: '12px', color: '#64748b', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '6px 10px', borderRadius: '6px' }}>
              <i className="fas fa-clock" style={{ marginRight: '5px' }}></i>
              Terakhir diperbarui: {lastUpdatedInfo}
            </span>
          )}
          <button
            type="button"
            onClick={handleRefreshStudents}
            disabled={loadingStudents || refreshingStudents}
            title="Tarik ulang data siswa aktif terbaru dari database"
            style={{
              background: '#f8fafc',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              padding: '8px 12px',
              fontWeight: 700,
              fontSize: '13px',
              cursor: loadingStudents || refreshingStudents ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <i className={`fas fa-sync-alt ${refreshingStudents ? 'fa-spin' : ''}`}></i>
            {refreshingStudents ? 'Menarik Data...' : 'Refresh Data Siswa'}
          </button>
          <button
            type="button"
            onClick={() => persistConfiguration(assignments, unassigned, true)}
            disabled={savingConfig}
            style={{
              background: '#0f766e',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 14px',
              fontWeight: 700,
              fontSize: '13px',
              cursor: savingConfig ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <i className={savingConfig ? 'fas fa-spinner fa-spin' : 'fas fa-save'}></i>
            Simpan Konfigurasi
          </button>
        </div>
      </div>

      {loadingStudents ? (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px', marginBottom: '18px' }}>
          <InlineLoading message="Menarik data siswa aktif & konfigurasi ruang..." />
        </div>
      ) : (
        <>

      {/* Ringkasan Aturan & Data Siswa Aktif */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '18px' }}>
        <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px 14px' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Total Siswa Aktif</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
            {loadingStudents ? 'Memuat...' : `${genderStats.total} Siswa`}
          </div>
          <div style={{ fontSize: '11.5px', color: '#475569', marginTop: '4px', lineHeight: 1.45 }}>
            <div><b>Pagi ({pagiGradesLabel}):</b> {genderStats.pagiTotal} (L: {genderStats.pagiL}, P: {genderStats.pagiP})</div>
            <div><b>Siang ({siangGradesLabel}):</b> {genderStats.siangTotal} (L: {genderStats.siangL}, P: {genderStats.siangP})</div>
            {(genderStats.unknown > 0 || genderStats.unknownGrade > 0) && (
              <div style={{ color: '#dc2626' }}>
                Data belum lengkap: {genderStats.unknown + genderStats.unknownGrade}
              </div>
            )}
          </div>
        </div>

        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '12px 14px' }}>
          <div style={{ fontSize: '12px', color: '#1d4ed8', fontWeight: 700 }}>
            <i className="fas fa-mars" style={{ marginRight: '5px' }}></i>
            Ruang Laki-laki (L) — {capacityStats.lRooms} Ruang
          </div>
          <div style={{ fontSize: '15.5px', fontWeight: 800, color: '#1e3a8a', marginTop: '3px' }}>
            Pagi: {capacityStats.capPagiL} {pagiPairMode ? 'Krs' : 'Bku'} &bull; Siang: {capacityStats.capSiangL} {siangPairMode ? 'Krs' : 'Bku'}
          </div>
          <div style={{ fontSize: '11.5px', marginTop: '5px', fontWeight: 600, lineHeight: 1.45 }}>
            <div style={{ color: capacityStats.capPagiL + capacityStats.capPagiCampur >= genderStats.pagiL ? '#15803d' : '#dc2626' }}>
              Pagi ({pagiGradesLabel}): {genderStats.pagiL}/{capacityStats.capPagiL}
              {capacityStats.capPagiL >= genderStats.pagiL
                ? ` (sisa ${capacityStats.capPagiL - genderStats.pagiL})`
                : ` (kurang ${genderStats.pagiL - capacityStats.capPagiL}${capacityStats.campurRooms > 0 ? ', pakai Campur' : '!'})`}
            </div>
            <div style={{ color: capacityStats.capSiangL + capacityStats.capSiangCampur >= genderStats.siangL ? '#15803d' : '#dc2626' }}>
              Siang ({siangGradesLabel}): {genderStats.siangL}/{capacityStats.capSiangL}
              {capacityStats.capSiangL >= genderStats.siangL
                ? ` (sisa ${capacityStats.capSiangL - genderStats.siangL})`
                : ` (kurang ${genderStats.siangL - capacityStats.capSiangL}${capacityStats.campurRooms > 0 ? ', pakai Campur' : '!'})`}
            </div>
          </div>
        </div>

        <div style={{ background: '#fdf2f8', border: '1px solid #fbcfe8', borderRadius: '8px', padding: '12px 14px' }}>
          <div style={{ fontSize: '12px', color: '#be185d', fontWeight: 700 }}>
            <i className="fas fa-venus" style={{ marginRight: '5px' }}></i>
            Ruang Perempuan (P) — {capacityStats.pRooms} Ruang
          </div>
          <div style={{ fontSize: '15.5px', fontWeight: 800, color: '#831843', marginTop: '3px' }}>
            Pagi: {capacityStats.capPagiP} {pagiPairMode ? 'Krs' : 'Bku'} &bull; Siang: {capacityStats.capSiangP} {siangPairMode ? 'Krs' : 'Bku'}
          </div>
          <div style={{ fontSize: '11.5px', marginTop: '5px', fontWeight: 600, lineHeight: 1.45 }}>
            <div style={{ color: capacityStats.capPagiP + capacityStats.capPagiCampur >= genderStats.pagiP ? '#15803d' : '#dc2626' }}>
              Pagi ({pagiGradesLabel}): {genderStats.pagiP}/{capacityStats.capPagiP}
              {capacityStats.capPagiP >= genderStats.pagiP
                ? ` (sisa ${capacityStats.capPagiP - genderStats.pagiP})`
                : ` (kurang ${genderStats.pagiP - capacityStats.capPagiP}${capacityStats.campurRooms > 0 ? ', pakai Campur' : '!'})`}
            </div>
            <div style={{ color: capacityStats.capSiangP + capacityStats.capSiangCampur >= genderStats.siangP ? '#15803d' : '#dc2626' }}>
              Siang ({siangGradesLabel}): {genderStats.siangP}/{capacityStats.capSiangP}
              {capacityStats.capSiangP >= genderStats.siangP
                ? ` (sisa ${capacityStats.capSiangP - genderStats.siangP})`
                : ` (kurang ${genderStats.siangP - capacityStats.capSiangP}${capacityStats.campurRooms > 0 ? ', pakai Campur' : '!'})`}
            </div>
          </div>
        </div>

        <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '8px', padding: '12px 14px' }}>
          <div style={{ fontSize: '12px', color: '#6d28d9', fontWeight: 700 }}>
            <i className="fas fa-users" style={{ marginRight: '5px' }}></i>
            {capacityStats.campurRooms > 0
              ? `Campur (${capacityStats.campurRooms} R: Pagi ${capacityStats.capPagiCampur} ${pagiPairMode ? 'Krs' : 'Bku'} • Siang ${capacityStats.capSiangCampur} ${siangPairMode ? 'Krs' : 'Bku'})`
              : 'Aturan Bangku & Ruang'}
          </div>
          <div style={{ fontSize: '11.5px', fontWeight: 700, color: capacityStats.capPagiTotal >= genderStats.pagiTotal && capacityStats.capSiangTotal >= genderStats.siangTotal ? '#15803d' : '#b45309', marginTop: '3px' }}>
            Total: Pagi {genderStats.pagiTotal}/{capacityStats.capPagiTotal} {pagiPairMode ? 'Krs' : 'Bku'} &bull; Siang {genderStats.siangTotal}/{capacityStats.capSiangTotal} {siangPairMode ? 'Krs' : 'Bku'}
          </div>
          <ul style={{ margin: '4px 0 0 0', paddingLeft: '16px', fontSize: '11px', color: '#4c1d95', lineHeight: 1.4 }}>
            <li>Input quota = jumlah <b>kursi</b> (1 bangku = 2 kursi)</li>
            <li><b>Pagi ({pagiGradesLabel}):</b> {pagiGrades.length === 0 ? 'tidak ada' : pagiPairMode ? '2 siswa/bangku' : '1 siswa/bangku'} &bull; <b>Siang ({siangGradesLabel}):</b> {siangGrades.length === 0 ? 'tidak ada' : siangPairMode ? '2 siswa/bangku' : '1 siswa/bangku'}</li>
            <li>Default Ganjil L / Genap P, urut kelas A–I</li>
          </ul>
        </div>
      </div>

      {/* Form Pengaturan Jumlah Ruang & Quota */}
      <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '16px', marginBottom: '18px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: '12px', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
              Jumlah Ruang Ujian
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={jumlahRuang}
              onChange={e => setJumlahRuang(Math.max(1, Math.min(100, parseInt(e.target.value, 10) || 1)))}
              style={{ width: '100%', padding: '9px 11px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 700, fontSize: '14px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
              Urutan Kelas (A–I)
            </label>
            <select
              value={sortMode}
              onChange={e => setSortMode(e.target.value as 'tingkat-huruf' | 'huruf-tingkat')}
              style={{ width: '100%', padding: '9px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: 'white' }}
            >
              <option value="tingkat-huruf">Tingkat lalu Kelas (7A–7I, 8A–8I, 9A–9I)</option>
              <option value="huruf-tingkat">Huruf A–I dulu (7A, 8A, 9A, 7B, 8B...)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
              Awalan No. Ujian (Opsional)
            </label>
            <input
              type="text"
              value={noUjianPrefix}
              onChange={e => setNoUjianPrefix(e.target.value)}
              placeholder="Contoh: U / SAS-26 (kosong = R.01L-7-001 / R.01P-9-001)"
              style={{ width: '100%', padding: '9px 11px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            />
          </div>

          {tahunAjaranOptions.length > 1 && (
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                Tahun Ajaran Siswa
              </label>
              <select
                value={tahunAjaranFilter}
                onChange={e => setTahunAjaranFilter(e.target.value)}
                style={{ width: '100%', padding: '9px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: 'white' }}
              >
                <option value="SEMUA">Semua Siswa Aktif</option>
                {tahunAjaranOptions.map(ta => (
                  <option key={ta} value={ta}>TA {ta}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <button
              type="button"
              onClick={handleAutoAssign}
              disabled={loadingStudents}
              style={{
                width: '100%',
                background: loadingStudents ? '#94a3b8' : 'linear-gradient(135deg, #0284c7, #0ea5e9)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '10px 16px',
                fontWeight: 800,
                fontSize: '14px',
                cursor: loadingStudents ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 2px 6px rgba(14,165,233,0.28)'
              }}
            >
              <i className="fas fa-magic"></i>
              Bagi Ruang Otomatis
            </button>
          </div>
        </div>

        {/* Pengaturan Sesi Pagi / Siang Per Angkatan */}
        <div style={{ marginTop: '12px', background: 'white', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#0f172a' }}>
              <i className="fas fa-clock" style={{ color: '#f59e0b', marginRight: '6px' }}></i>
              Sesi Masuk Angkatan:
            </span>
            {GRADE_NUMBERS.map(g => {
              const cur = gradeSessionMap[g];
              return (
                <div key={g} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#f8fafc', padding: '4px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>Kls {g}</span>
                  <div style={{ display: 'flex', borderRadius: '4px', overflow: 'hidden', border: '1px solid #cbd5e1', background: 'white' }}>
                    {(['Pagi', 'Siang'] as ExamSesi[]).map(opt => {
                      const active = cur === opt;
                      const activeBg = opt === 'Pagi' ? '#d97706' : '#4338ca';
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() =>
                            setGradeSessionMap(prev => ({
                              ...prev,
                              [g]: opt
                            }))
                          }
                          style={{
                            border: 'none',
                            padding: '3px 8px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            background: active ? activeBg : 'transparent',
                            color: active ? 'white' : '#475569'
                          }}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ fontSize: '11.5px', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span>
              <b style={{ color: '#b45309' }}>Pagi ({pagiGradesLabel}):</b>{' '}
              {pagiGrades.length === 0 ? 'Kosong' : pagiPairMode ? '2 siswa/bangku' : '1 siswa/bangku'}
            </span>
            <span>&bull;</span>
            <span>
              <b style={{ color: '#4338ca' }}>Siang ({siangGradesLabel}):</b>{' '}
              {siangGrades.length === 0 ? 'Kosong' : siangPairMode ? '2 siswa/bangku' : '1 siswa/bangku'}
            </span>
          </div>
        </div>

        {/* Quota Manual & Pengaturan Jenis (L / P / Campur) Per Ruang */}
        <div style={{ marginTop: '12px', background: 'white', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
            <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#0f172a' }}>
              <i className="fas fa-chair" style={{ color: '#0284c7', marginRight: '6px' }}></i>
              Quota Kursi &amp; Jenis Ruang Per Ruang (1 Bangku = 2 Kursi)
            </div>
            <div style={{ fontSize: '11.5px', color: '#64748b' }}>
              Pagi ({pagiGradesLabel}): <b style={{ color: '#b45309' }}>{capacityStats.capPagiTotal} {pagiPairMode ? 'Krs' : 'Bku'}</b> &bull; Siang ({siangGradesLabel}):{' '}
              <b style={{ color: '#1d4ed8' }}>L={capacityStats.capSiangL}</b>, <b style={{ color: '#be185d' }}>P={capacityStats.capSiangP}</b>
              {capacityStats.capSiangCampur > 0 && <>, <b style={{ color: '#6d28d9' }}>Campur={capacityStats.capSiangCampur}</b></>}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(158px, 1fr))', gap: '8px' }}>
            {Array.from({ length: jumlahRuang }, (_, i) => i + 1).map(rNum => {
              const mode = getRoomGenderMode(rNum);
              const kursi = getRoomQuota(rNum);
              const bangku = kursi <= 0 ? 0 : Math.ceil(kursi / 2);
              const qPagi = getRoomQuotaPagi(rNum);
              const qSiang = getRoomQuotaSiang(rNum);
              const tileStyle =
                mode === 'L'
                  ? { border: '#bfdbfe', bg: '#eff6ff', title: '#1d4ed8' }
                  : mode === 'P'
                  ? { border: '#fbcfe8', bg: '#fdf2f8', title: '#be185d' }
                  : { border: '#ddd6fe', bg: '#f5f3ff', title: '#6d28d9' };

              return (
                <div key={rNum} style={{ border: `1px solid ${tileStyle.border}`, borderRadius: '6px', padding: '7px 8px', background: tileStyle.bg }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px', gap: '4px' }}>
                    <span style={{ fontSize: '11.5px', fontWeight: 800, color: tileStyle.title }}>
                      Ruang {rNum}
                    </span>
                    <div style={{ display: 'flex', borderRadius: '4px', overflow: 'hidden', border: '1px solid #cbd5e1', background: 'white' }}>
                      {(['L', 'P', 'CAMPUR'] as RoomGenderMode[]).map(opt => {
                        const active = mode === opt;
                        const activeBg =
                          opt === 'L' ? '#2563eb' : opt === 'P' ? '#db2777' : '#7c3aed';
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() =>
                              setCustomRoomGenders(prev => {
                                const next = { ...prev };
                                const defaultMode: RoomGenderMode = rNum % 2 === 1 ? 'L' : 'P';
                                if (opt === defaultMode) delete next[rNum];
                                else next[rNum] = opt;
                                return next;
                              })
                            }
                            style={{
                              border: 'none',
                              padding: '2px 5px',
                              fontSize: '10px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              background: active ? activeBg : 'transparent',
                              color: active ? 'white' : '#475569'
                            }}
                          >
                            {opt === 'CAMPUR' ? 'Campur' : opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    placeholder="0"
                    value={customRoomQuotas[rNum] ?? ''}
                    onChange={e => {
                      const raw = e.target.value;
                      setCustomRoomQuotas(prev => {
                        const next = { ...prev };
                        if (raw === '') {
                          delete next[rNum];
                        } else {
                          const parsed = parseInt(raw, 10);
                          next[rNum] = Number.isNaN(parsed) ? 0 : Math.max(0, Math.min(100, parsed));
                        }
                        return next;
                      });
                    }}
                    style={{ width: '100%', padding: '4px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12.5px', fontWeight: 700, background: 'white' }}
                  />
                  <div style={{ fontSize: '10px', color: '#475569', marginTop: '3px', fontWeight: 600 }}>
                    {kursi > 0 ? `${bangku} bangku • Pagi ${qPagi} / Siang ${qSiang}` : 'Kosong / dilewati'}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ fontSize: '11.5px', color: '#64748b' }}>
              Pilih <b>L</b>, <b>P</b>, atau <b>Campur</b> tiap ruang (default: ganjil L, genap P) dan isi quota kursinya (kosong / <b>0</b> berarti dilewati).
            </span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {Object.keys(customRoomGenders).length > 0 && (
                <button
                  type="button"
                  onClick={async () => {
                    const res = await Swal.fire({
                      title: 'Reset Jenis Ruang (L/P)?',
                      text: 'Semua pengaturan custom L / P / Campur akan dikembalikan ke default (Ganjil = L, Genap = P).',
                      icon: 'warning',
                      showCancelButton: true,
                      confirmButtonText: 'Ya, Reset L/P',
                      cancelButtonText: 'Batal',
                      confirmButtonColor: '#dc2626'
                    });
                    if (res.isConfirmed) {
                      setCustomRoomGenders({});
                    }
                  }}
                  style={{ background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Reset L/P Default
                </button>
              )}
              {Object.keys(customRoomQuotas).length > 0 && (
                <button
                  type="button"
                  onClick={async () => {
                    const res = await Swal.fire({
                      title: 'Kosongkan Semua Quota Ruang?',
                      text: 'Semua angka quota kursi yang sudah diisi di tiap ruang akan dihapus.',
                      icon: 'warning',
                      showCancelButton: true,
                      confirmButtonText: 'Ya, Kosongkan',
                      cancelButtonText: 'Batal',
                      confirmButtonColor: '#dc2626'
                    });
                    if (res.isConfirmed) {
                      setCustomRoomQuotas({});
                    }
                  }}
                  style={{ background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Kosongkan Quota
                </button>
              )}
              <button
                type="button"
                onClick={() => persistConfiguration(assignments, unassigned, true)}
                disabled={savingConfig}
                style={{ background: '#0f766e', color: 'white', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: 700, cursor: savingConfig ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <i className={savingConfig ? 'fas fa-spinner fa-spin' : 'fas fa-save'}></i>
                Simpan Quota Ruang
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Peringatan Overflow / Belum Dapat Ruang */}
      {unassigned.length > 0 && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '14px', marginBottom: '18px' }}>
          <div style={{ fontWeight: 800, color: '#b91c1c', fontSize: '14px', marginBottom: '6px' }}>
            <i className="fas fa-exclamation-triangle" style={{ marginRight: '6px' }}></i>
            {unassigned.length} Siswa Belum Terbagi ke Ruang (Silakan tambah jumlah ruang atau perbesar quota)
          </div>
          <div style={{ maxHeight: '140px', overflowY: 'auto', fontSize: '12.5px', color: '#7f1d1d' }}>
            {unassigned.map((u, i) => (
              <div key={i} style={{ padding: '2px 0' }}>
                {i + 1}. <b>{u.nama}</b> ({u.rombel} • {u.jenisKelamin}) — {u.reason}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hasil Pembagian Ruang */}
      {assignments.length === 0 ? (
        <div style={{ padding: '42px 20px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
          <i className="fas fa-door-open" style={{ fontSize: '42px', color: '#cbd5e1', marginBottom: '12px', display: 'block' }}></i>
          <div style={{ fontWeight: 700, fontSize: '15px', color: '#334155', marginBottom: '4px' }}>
            Belum Ada Pembagian Ruang
          </div>
          <div style={{ fontSize: '13px' }}>
            Atur jumlah ruang dan quota kursi di atas, lalu klik <b>Bagi Ruang Otomatis</b>.
          </div>
        </div>
      ) : (
        <>
          {/* Ringkasan Card Per Ruang (Klik untuk filter ruang / cetak F5 langsung) */}
          <div style={{ marginBottom: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#334155' }}>
                Ringkasan Sebaran Per Ruang ({roomOverviews.filter(r => r.pagiStudents.length > 0 || r.siangStudents.length > 0).length} Ruang Terisi)
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleExportExcel}
                  style={{ background: '#16a34a', color: 'white', border: 'none', borderRadius: '6px', padding: '8px 14px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <i className="fas fa-file-excel"></i> Export Excel
                </button>
                <button
                  type="button"
                  onClick={() => openPrintModal()}
                  style={{ background: '#7c3aed', color: 'white', border: 'none', borderRadius: '6px', padding: '8px 14px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <i className="fas fa-print"></i> Cetak Daftar Hadir (F5)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const firstActive = roomOverviews.find(r => r.pagiStudents.length > 0 || r.siangStudents.length > 0);
                    const initialRoom =
                      filterRuang !== 'ALL'
                        ? Number(filterRuang)
                        : firstActive?.ruangNumber || 1;
                    setDenahRoomNumber(initialRoom);
                    setShowDenahModal(true);
                  }}
                  style={{ background: '#0f766e', color: 'white', border: 'none', borderRadius: '6px', padding: '8px 14px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <i className="fas fa-th"></i> Mapping Tempat Duduk
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '10px' }}>
              {roomOverviews.map(r => {
                const isSelected = filterRuang === String(r.ruangNumber);
                const totalAny = r.pagiStudents.length + r.siangStudents.length;
                const modeStyle =
                  r.gender === 'L'
                    ? { border: '#bfdbfe', bg: '#eff6ff', badgeBg: '#dbeafe', badgeText: '#1d4ed8' }
                    : r.gender === 'P'
                    ? { border: '#fbcfe8', bg: '#fdf2f8', badgeBg: '#fce7f3', badgeText: '#be185d' }
                    : { border: '#ddd6fe', bg: '#f5f3ff', badgeBg: '#ede9fe', badgeText: '#6d28d9' };
                const accentBorder = isSelected ? '#0284c7' : modeStyle.border;
                const accentBg = isSelected ? '#e0f2fe' : totalAny === 0 ? '#f8fafc' : modeStyle.bg;

                return (
                  <div
                    key={r.ruangNumber}
                    onClick={() =>
                      setFilterRuang(prev =>
                        prev === String(r.ruangNumber) ? 'ALL' : String(r.ruangNumber)
                      )
                    }
                    style={{
                      border: `1.5px solid ${accentBorder}`,
                      background: accentBg,
                      borderRadius: '8px',
                      padding: '10px 12px',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', gap: '4px' }}>
                      <span style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>
                        {r.ruangName}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {totalAny > 0 && (
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setDenahRoomNumber(r.ruangNumber);
                              setShowDenahModal(true);
                            }}
                            title={`Lihat & Cetak Denah Bangku ${r.ruangName}`}
                            style={{ background: 'white', color: '#0f766e', border: '1px solid #99f6e4', borderRadius: '4px', padding: '1px 6px', fontSize: '10.5px', fontWeight: 700, cursor: 'pointer' }}
                          >
                            <i className="fas fa-th" style={{ marginRight: '3px' }}></i>Denah
                          </button>
                        )}
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '999px',
                            background: modeStyle.badgeBg,
                            color: modeStyle.badgeText
                          }}
                        >
                          {r.genderLabel} • {r.quotaKursi} Krs ({r.quotaKursi > 0 ? Math.ceil(r.quotaKursi / 2) : 0} Bku)
                        </span>
                      </div>
                    </div>

                    <div style={{ fontSize: '11.5px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          <b style={{ color: '#b45309' }}>Pagi ({pagiGradesLabel}):</b> {r.pagiStudents.length}/{r.quotaPagi}{' '}
                          <span style={{ color: '#64748b', fontSize: '10.5px' }}>
                            {r.pagiStudents.length > 0 ? `(${summarizeClasses(r.pagiStudents)})` : '(Kosong)'}
                          </span>
                        </span>
                        {r.pagiStudents.length > 0 && (
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              openPrintModal(r.ruangNumber, 'Pagi');
                            }}
                            title={`Cetak Daftar Hadir F5 Pagi ${r.ruangName}`}
                            style={{ background: 'white', color: '#6d28d9', border: '1px solid #ddd6fe', borderRadius: '4px', padding: '1px 6px', fontSize: '10.5px', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
                          >
                            F5
                          </button>
                        )}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          <b style={{ color: '#4338ca' }}>Siang ({siangGradesLabel}):</b> {r.siangStudents.length}/{r.quotaSiang}{' '}
                          <span style={{ color: '#64748b', fontSize: '10.5px' }}>
                            {r.siangStudents.length > 0 ? `(${summarizeClasses(r.siangStudents)})` : '(Kosong)'}
                          </span>
                        </span>
                        {r.siangStudents.length > 0 && (
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              openPrintModal(r.ruangNumber, 'Siang');
                            }}
                            title={`Cetak Daftar Hadir F5 Siang ${r.ruangName}`}
                            style={{ background: 'white', color: '#6d28d9', border: '1px solid #ddd6fe', borderRadius: '4px', padding: '1px 6px', fontSize: '10.5px', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
                          >
                            F5
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Filter Bar */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', marginBottom: '14px', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
            <div style={{ flex: '1 1 210px' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari nama, NISN, atau no. ujian..."
                style={{ width: '100%', padding: '8px 11px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: 'white' }}
              />
            </div>

            <select
              value={filterSesi}
              onChange={e => setFilterSesi(e.target.value as 'ALL' | 'Pagi' | 'Siang')}
              style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: 'white' }}
            >
              <option value="ALL">Semua Sesi</option>
              <option value="Pagi">Sesi Pagi ({pagiGradesLong})</option>
              <option value="Siang">Sesi Siang ({siangGradesLong})</option>
            </select>

            <select
              value={filterRuang}
              onChange={e => setFilterRuang(e.target.value)}
              style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: 'white' }}
            >
              <option value="ALL">Semua Ruang</option>
              {roomOverviews
                .filter(r => r.pagiStudents.length > 0 || r.siangStudents.length > 0)
                .map(r => (
                  <option key={r.ruangNumber} value={String(r.ruangNumber)}>
                    {r.ruangName} ({r.genderLabel} • Pagi {r.pagiStudents.length} / Siang {r.siangStudents.length})
                  </option>
                ))}
            </select>

            <select
              value={filterGender}
              onChange={e => setFilterGender(e.target.value as 'ALL' | 'L' | 'P')}
              style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: 'white' }}
            >
              <option value="ALL">Semua Gender</option>
              <option value="L">Laki-laki (Ruang Ganjil)</option>
              <option value="P">Perempuan (Ruang Genap)</option>
            </select>

            <select
              value={filterTingkat}
              onChange={e => setFilterTingkat(e.target.value)}
              style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: 'white' }}
            >
              <option value="ALL">Semua Tingkat</option>
              <option value="7">Kelas 7</option>
              <option value="8">Kelas 8</option>
              <option value="9">Kelas 9</option>
            </select>

            <select
              value={filterKelas}
              onChange={e => setFilterKelas(e.target.value)}
              style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: 'white' }}
            >
              <option value="ALL">Semua Rombel</option>
              {availableKelasOptions.map(k => (
                <option key={k} value={k}>Kelas {k}</option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleResetFilters}
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer' }}
            >
              <i className="fas fa-undo" style={{ marginRight: '5px' }}></i>
              Reset
            </button>

            <div style={{ marginLeft: 'auto', fontSize: '12.5px', color: '#475569', fontWeight: 600 }}>
              Menampilkan <b>{filteredAssignments.length}</b> / {assignments.length} peserta
            </div>
          </div>

          {/* Tabel Peserta Terbagi */}
          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#334155', textAlign: 'left' }}>
                  <th style={{ padding: '11px 12px', width: '56px', textAlign: 'center' }}>No</th>
                  <th style={{ padding: '11px 12px' }}>Sesi</th>
                  <th style={{ padding: '11px 12px' }}>Ruang</th>
                  <th style={{ padding: '11px 12px', textAlign: 'center' }}>Kursi</th>
                  <th style={{ padding: '11px 12px' }}>No. Ujian</th>
                  <th style={{ padding: '11px 12px' }}>NISN</th>
                  <th style={{ padding: '11px 12px' }}>Nama Siswa</th>
                  <th style={{ padding: '11px 12px', textAlign: 'center' }}>Kelas</th>
                  <th style={{ padding: '11px 12px', textAlign: 'center' }}>JK</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssignments.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '28px', textAlign: 'center', color: '#64748b' }}>
                      Tidak ada peserta yang sesuai dengan filter.
                    </td>
                  </tr>
                ) : (
                  paginatedAssignments.map((p, idx) => {
                    const isOdd = p.jenisKelamin === 'L';
                    const isPagi = p.sesi === 'Pagi';
                    const rowNo = (safeTablePage - 1) * tablePageSize + idx + 1;
                    return (
                      <tr key={`${p.nisn}-${p.sesi}-${p.ruangNumber}-${p.noKursi}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '9px 12px', textAlign: 'center', color: '#64748b' }}>{rowNo}</td>
                        <td style={{ padding: '9px 12px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontWeight: 700,
                              fontSize: '11.5px',
                              background: isPagi ? '#fef3c7' : '#e0e7ff',
                              color: isPagi ? '#92400e' : '#3730a3'
                            }}
                          >
                            {p.sesi}
                          </span>
                        </td>
                        <td style={{ padding: '9px 12px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '3px 9px',
                              borderRadius: '6px',
                              fontWeight: 700,
                              fontSize: '12px',
                              background: isOdd ? '#dbeafe' : '#fce7f3',
                              color: isOdd ? '#1e40af' : '#9d174d'
                            }}
                          >
                            {p.ruang}
                          </span>
                        </td>
                        <td style={{ padding: '9px 12px', textAlign: 'center', fontWeight: 700, color: '#334155' }}>
                          {p.noKursi}
                        </td>
                        <td style={{ padding: '9px 12px' }}>
                          <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '4px', fontWeight: 700, fontSize: '12px' }}>
                            {p.noUjian}
                          </span>
                        </td>
                        <td style={{ padding: '9px 12px', color: '#475569' }}>{p.nisn}</td>
                        <td style={{ padding: '9px 12px', fontWeight: 600, color: '#0f172a' }}>{p.nama}</td>
                        <td style={{ padding: '9px 12px', textAlign: 'center', fontWeight: 700, color: '#334155' }}>{p.rombel}</td>
                        <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                          <span
                            style={{
                              fontSize: '11.5px',
                              fontWeight: 700,
                              color: isOdd ? '#2563eb' : '#db2777'
                            }}
                          >
                            {p.jenisKelamin}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <PaginationBar
            totalItems={filteredAssignments.length}
            currentPage={safeTablePage}
            pageSize={tablePageSize}
            onPageChange={setTablePage}
            onPageSizeChange={setTablePageSize}
          />
        </>
      )}

      {/* Modal Pengaturan Cetak Daftar Hadir F5 di Kertas F4 */}
      {showPrintModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div style={{ background: 'white', borderRadius: '12px', width: '100%', maxWidth: '540px', boxShadow: '0 20px 40px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <div style={{ background: '#6d28d9', color: 'white', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: '15px' }}>
                <i className="fas fa-print" style={{ marginRight: '8px' }}></i>
                Cetak Daftar Hadir Per Ruang (Ukuran F5)
              </div>
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                style={{ background: 'none', border: 'none', color: 'white', fontSize: '18px', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Pilih Ruang yang Dicetak
                  </label>
                  <select
                    value={printTargetRoom}
                    onChange={e => setPrintTargetRoom(e.target.value)}
                    style={{ width: '100%', padding: '9px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
                  >
                    <option value="ALL">
                      Semua Ruang Terisi ({roomOverviews.filter(r => r.pagiStudents.length > 0 || r.siangStudents.length > 0).length} Ruang)
                    </option>
                    {roomOverviews
                      .filter(r => r.pagiStudents.length > 0 || r.siangStudents.length > 0)
                      .map(r => (
                        <option key={r.ruangNumber} value={String(r.ruangNumber)}>
                          {r.ruangName} ({r.genderLabel} • Pagi {r.pagiStudents.length} / Siang {r.siangStudents.length})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Pilih Sesi
                  </label>
                  <select
                    value={printTargetSesi}
                    onChange={e => setPrintTargetSesi(e.target.value as 'ALL' | 'Pagi' | 'Siang')}
                    style={{ width: '100%', padding: '9px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
                  >
                    <option value="ALL">Semua Sesi (Pagi &amp; Siang)</option>
                    <option value="Pagi">Sesi Pagi ({pagiGradesLong})</option>
                    <option value="Siang">Sesi Siang ({siangGradesLong})</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Pilih Angkatan (Tiap Angkatan Dicetak Terpisah)
                </label>
                <select
                  value={printTargetTingkat}
                  onChange={e => setPrintTargetTingkat(e.target.value as 'ALL' | '7' | '8' | '9')}
                  style={{ width: '100%', padding: '9px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
                >
                  <option value="ALL">Semua Angkatan (Kelas 7, 8, 9 Sendiri-sendiri)</option>
                  <option value="7">Khusus Kelas 7</option>
                  <option value="8">Khusus Kelas 8</option>
                  <option value="9">Khusus Kelas 9</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Mode Kertas Cetak (F5 di Kertas F4)
                </label>
                <select
                  value={printPaperMode}
                  onChange={e => setPrintPaperMode(e.target.value as PrintPaperMode)}
                  style={{ width: '100%', padding: '9px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                >
                  <option value="f4-landscape-2up">
                    Langsung Kertas F4 Landscape (330×215 mm) — 2 Halaman F5 Portrait Kiri &amp; Kanan (Rekomendasi)
                  </option>
                  <option value="f4-portrait-2up">
                    Langsung Kertas F4 Portrait (215×330 mm) — 2 Halaman F5 Landscape Atas &amp; Bawah
                  </option>
                  <option value="f5-single">
                    Ukuran F5 Portrait Murni (165×215 mm) — 1 Halaman per Sheet
                  </option>
                </select>
                <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>
                  Dalam mode 2-halaman di kertas F4, satu lembar F4 memuat 2 lembar Daftar Hadir F5 dengan garis potong tengah dan kolom TTD Pengawas.
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Judul Ujian
                  </label>
                  <input
                    type="text"
                    value={examTitle}
                    onChange={e => setExamTitle(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Tahun Ajaran
                  </label>
                  <input
                    type="text"
                    value={printTahunAjaran}
                    onChange={e => setPrintTahunAjaran(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                    Mapel (Opsional)
                  </label>
                  <input
                    type="text"
                    value={printMapel}
                    onChange={e => setPrintMapel(e.target.value)}
                    placeholder="Kosong = titik-titik"
                    style={{ width: '100%', padding: '7px 9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                    Hari / Tgl (Opsional)
                  </label>
                  <input
                    type="text"
                    value={printHariTanggal}
                    onChange={e => setPrintHariTanggal(e.target.value)}
                    placeholder="Kosong = titik-titik"
                    style={{ width: '100%', padding: '7px 9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                    Waktu (Opsional)
                  </label>
                  <input
                    type="text"
                    value={printWaktu}
                    onChange={e => setPrintWaktu(e.target.value)}
                    placeholder="Kosong = titik-titik"
                    style={{ width: '100%', padding: '7px 9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px' }}
                  />
                </div>
              </div>

              {printTargetRoom !== 'ALL' && printPaperMode !== 'f5-single' && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#334155', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={duplicateSingleOn2Up}
                    onChange={e => setDuplicateSingleOn2Up(e.target.checked)}
                  />
                  Gandakan ruang yang sama ke sisi kedua kertas F4 (hemat potong)
                </label>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  style={{ padding: '9px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleLaunchPrint}
                  style={{ padding: '9px 18px', borderRadius: '6px', border: 'none', background: '#6d28d9', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '7px' }}
                >
                  <i className="fas fa-print"></i> Buka Preview &amp; Cetak
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Denah / Mapping Tempat Duduk Per Ruang */}
      {showDenahModal && (() => {
        const activeRooms = roomOverviews.filter(r => r.pagiStudents.length > 0 || r.siangStudents.length > 0);
        const currentRoom = roomOverviews.find(r => r.ruangNumber === denahRoomNumber) || activeRooms[0] || roomOverviews[0];
        if (!currentRoom) return null;

        const slots = buildDeskSlotsForRoom(currentRoom);
        const deskGrid = buildDeskGrid(slots, denahCols, denahPattern);

        const triggerDenahPrint = (printAll: boolean) => {
          const targets = printAll ? activeRooms : [currentRoom];
          if (targets.length === 0) {
            Swal.fire('Info', 'Belum ada ruang yang memiliki peserta.', 'info');
            return;
          }
          const html = buildDenahRuangHtml(
            targets,
            {
              examTitle,
              tahunAjaran: printTahunAjaran,
              cols: denahCols,
              pattern: denahPattern,
              sesiView: denahSesiView
            },
            window.location.origin
          );
          const win = window.open('', '_blank', 'width=1120,height=800');
          if (!win) {
            Swal.fire('Pop-up Diblokir', 'Izinkan pop-up browser agar preview cetak denah dapat dibuka.', 'warning');
            return;
          }
          win.document.open();
          win.document.write(html);
          win.document.close();
        };

        return (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.6)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px'
            }}
          >
            <div style={{ background: 'white', borderRadius: '12px', width: '100%', maxWidth: '1220px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 48px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
              <div style={{ background: '#0f766e', color: 'white', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '15.5px' }}>
                    <i className="fas fa-th" style={{ marginRight: '8px' }}></i>
                    Mapping &amp; Denah Tempat Duduk — {currentRoom.ruangName} ({currentRoom.genderLabel})
                  </div>
                  <div style={{ fontSize: '12px', color: '#ccfbf1', marginTop: '2px' }}>
                    Panduan posisi bangku untuk penempelan kartu Nobang &bull; Pagi ({currentRoom.pagiGradesLabel}): {currentRoom.pagiStudents.length} siswa • Siang ({currentRoom.siangGradesLabel}): {currentRoom.siangStudents.length} siswa
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDenahModal(false)}
                  style={{ background: 'none', border: 'none', color: 'white', fontSize: '22px', cursor: 'pointer', lineHeight: 1 }}
                >
                  &times;
                </button>
              </div>

              {/* Controls Bar */}
              <div style={{ padding: '12px 18px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'end' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>Pilih Ruang</label>
                  <select
                    value={currentRoom.ruangNumber}
                    onChange={e => setDenahRoomNumber(Number(e.target.value))}
                    style={{ padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 600, background: 'white' }}
                  >
                    {roomOverviews.map(r => (
                      <option key={r.ruangNumber} value={r.ruangNumber}>
                        {r.ruangName} ({r.genderLabel} • Pagi {r.pagiStudents.length} / Siang {r.siangStudents.length})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>Tampilan Sesi</label>
                  <select
                    value={denahSesiView}
                    onChange={e => setDenahSesiView(e.target.value as DenahSesiView)}
                    style={{ padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: 'white' }}
                  >
                    <option value="gabungan">Gabungan Pagi + Siang per Bangku</option>
                    <option value="pagi">Khusus Sesi Pagi ({pagiGradesLong})</option>
                    <option value="siang">Khusus Sesi Siang ({siangGradesLong})</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>Jumlah Banjar / Kolom</label>
                  <select
                    value={denahCols}
                    onChange={e => setDenahCols(Number(e.target.value))}
                    style={{ padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: 'white' }}
                  >
                    <option value={3}>3 Banjar Bangku</option>
                    <option value={4}>4 Banjar Bangku</option>
                    <option value={5}>5 Banjar Bangku</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>Pola Urut Nomor Bangku</label>
                  <select
                    value={denahPattern}
                    onChange={e => setDenahPattern(e.target.value as DenahOrderPattern)}
                    style={{ padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: 'white' }}
                  >
                    <option value="baris-kiri-kanan">Per Baris (Kiri &rarr; Kanan)</option>
                    <option value="zigzag-ular">Zig-Zag Ular (Depan &harr; Belakang)</option>
                    <option value="kolom-depan-belakang">Per Banjar (Depan &rarr; Belakang)</option>
                  </select>
                </div>

                <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => triggerDenahPrint(false)}
                    style={{ background: '#0284c7', color: 'white', border: 'none', borderRadius: '6px', padding: '8px 13px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <i className="fas fa-print"></i> Cetak {currentRoom.ruangName}
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerDenahPrint(true)}
                    style={{ background: '#6d28d9', color: 'white', border: 'none', borderRadius: '6px', padding: '8px 13px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <i className="fas fa-copy"></i> Cetak Semua Ruang ({activeRooms.length})
                  </button>
                </div>
              </div>

              {/* Live Visual Denah Canvas */}
              <div style={{ padding: '16px 18px', overflowY: 'auto', flex: 1 }}>
                {/* Bagian Depan Kelas */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'center', marginBottom: '14px' }}>
                  <div style={{ border: '2px solid #334155', background: '#e2e8f0', textAlign: 'center', padding: '8px', fontSize: '12px', fontWeight: 800, letterSpacing: '0.6px', borderRadius: '6px', color: '#0f172a' }}>
                    PAPAN TULIS / BAGIAN DEPAN RUANG
                  </div>
                  <div style={{ border: '2px solid #334155', background: '#f1f5f9', textAlign: 'center', padding: '8px 18px', fontSize: '12px', fontWeight: 700, borderRadius: '6px', color: '#334155' }}>
                    MEJA PENGAWAS
                  </div>
                </div>

                {deskGrid.length === 0 ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                    Ruang ini belum memiliki quota atau peserta.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${denahCols}, minmax(0, 1fr))`, gap: '10px' }}>
                    {deskGrid.flat().map((slot, cellIdx) => {
                      if (!slot) {
                        return <div key={`empty-${cellIdx}`} />;
                      }

                      const showPagi = denahSesiView === 'gabungan' || denahSesiView === 'pagi';
                      const showSiang = denahSesiView === 'gabungan' || denahSesiView === 'siang';

                      return (
                        <div
                          key={slot.deskNumber}
                          style={{ border: '1.5px solid #334155', borderRadius: '8px', overflow: 'hidden', background: 'white', display: 'flex', flexDirection: 'column', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', minWidth: 0 }}
                        >
                          <div style={{ background: '#0f172a', color: 'white', padding: '5px 8px', fontSize: '11.5px', fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>BANGKU {slot.deskNumber}</span>
                            <span style={{ fontSize: '10px', color: '#cbd5e1', fontWeight: 600 }}>
                              Kursi {2 * slot.deskNumber - 1}–{2 * slot.deskNumber}
                            </span>
                          </div>

                          {showPagi && (
                            currentRoom.pagiPairMode ? (
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: '#fffbeb', borderBottom: showSiang ? '1px dashed #cbd5e1' : 'none', minWidth: 0 }}>
                                <div style={{ padding: '6px 7px', borderRight: '1px solid #fde68a', minWidth: 0, overflow: 'hidden', textAlign: 'center' }}>
                                  <div style={{ fontSize: '9.5px', fontWeight: 800, color: '#b45309', marginBottom: '2px', textAlign: 'center' }}>
                                    Pagi Kiri ({2 * slot.deskNumber - 1})
                                  </div>
                                  {slot.pagiKiri ? (
                                    <>
                                      <div style={{ fontSize: '9.5px', fontWeight: 800, color: '#0369a1', letterSpacing: '-0.25px', overflowWrap: 'anywhere', wordBreak: 'break-word', lineHeight: 1.2, textAlign: 'center' }}>{slot.pagiKiri.noUjian}</div>
                                      <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#1e293b', marginTop: '2px', lineHeight: 1.2, textAlign: 'center', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} title={slot.pagiKiri.nama}>
                                        {slot.pagiKiri.nama}
                                      </div>
                                      <div style={{ fontSize: '9.5px', color: '#64748b', marginTop: '1px', textAlign: 'center' }}>{slot.pagiKiri.rombel} ({slot.pagiKiri.jenisKelamin})</div>
                                    </>
                                  ) : (
                                    <div style={{ fontSize: '10.5px', color: '#94a3b8', textAlign: 'center' }}>-</div>
                                  )}
                                </div>
                                <div style={{ padding: '6px 7px', minWidth: 0, overflow: 'hidden', textAlign: 'center' }}>
                                  <div style={{ fontSize: '9.5px', fontWeight: 800, color: '#b45309', marginBottom: '2px', textAlign: 'center' }}>
                                    Pagi Kanan ({2 * slot.deskNumber})
                                  </div>
                                  {slot.pagiKanan ? (
                                    <>
                                      <div style={{ fontSize: '9.5px', fontWeight: 800, color: '#0369a1', letterSpacing: '-0.25px', overflowWrap: 'anywhere', wordBreak: 'break-word', lineHeight: 1.2, textAlign: 'center' }}>{slot.pagiKanan.noUjian}</div>
                                      <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#1e293b', marginTop: '2px', lineHeight: 1.2, textAlign: 'center', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} title={slot.pagiKanan.nama}>
                                        {slot.pagiKanan.nama}
                                      </div>
                                      <div style={{ fontSize: '9.5px', color: '#64748b', marginTop: '1px', textAlign: 'center' }}>{slot.pagiKanan.rombel} ({slot.pagiKanan.jenisKelamin})</div>
                                    </>
                                  ) : (
                                    <div style={{ fontSize: '10.5px', color: '#94a3b8', textAlign: 'center' }}>-</div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div style={{ background: '#fffbeb', padding: '7px 8px', borderBottom: showSiang ? '1px dashed #cbd5e1' : 'none', minWidth: 0, overflow: 'hidden', textAlign: 'center' }}>
                                <div style={{ fontSize: '10px', fontWeight: 800, color: '#b45309', marginBottom: '2px', textAlign: 'center' }}>
                                  PAGI ({currentRoom.pagiGradesLabel} • Sendiri)
                                </div>
                                {slot.pagi ? (
                                  <>
                                    <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#0369a1', overflowWrap: 'anywhere', wordBreak: 'break-word', lineHeight: 1.2, textAlign: 'center' }}>{slot.pagi.noUjian}</div>
                                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#1e293b', marginTop: '2px', lineHeight: 1.25, textAlign: 'center', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} title={slot.pagi.nama}>
                                      {slot.pagi.nama}
                                    </div>
                                    <div style={{ fontSize: '10px', color: '#64748b', marginTop: '1px', textAlign: 'center' }}>Kelas {slot.pagi.rombel} ({slot.pagi.jenisKelamin})</div>
                                  </>
                                ) : (
                                  <div style={{ fontSize: '10.5px', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center' }}>Kosong</div>
                                )}
                              </div>
                            )
                          )}

                          {showSiang && (
                            currentRoom.siangPairMode ? (
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: '#f8fafc', flex: 1, minWidth: 0 }}>
                                <div style={{ padding: '6px 7px', borderRight: '1px solid #cbd5e1', minWidth: 0, overflow: 'hidden', textAlign: 'center' }}>
                                  <div style={{ fontSize: '9.5px', fontWeight: 800, color: '#4338ca', marginBottom: '2px', textAlign: 'center' }}>
                                    Siang Kiri ({2 * slot.deskNumber - 1})
                                  </div>
                                  {slot.siangKiri ? (
                                    <>
                                      <div style={{ fontSize: '9.5px', fontWeight: 800, color: '#0369a1', letterSpacing: '-0.25px', overflowWrap: 'anywhere', wordBreak: 'break-word', lineHeight: 1.2, textAlign: 'center' }}>{slot.siangKiri.noUjian}</div>
                                      <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#1e293b', marginTop: '2px', lineHeight: 1.2, textAlign: 'center', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} title={slot.siangKiri.nama}>
                                        {slot.siangKiri.nama}
                                      </div>
                                      <div style={{ fontSize: '9.5px', color: '#64748b', marginTop: '1px', textAlign: 'center' }}>{slot.siangKiri.rombel} ({slot.siangKiri.jenisKelamin})</div>
                                    </>
                                  ) : (
                                    <div style={{ fontSize: '10.5px', color: '#94a3b8', textAlign: 'center' }}>-</div>
                                  )}
                                </div>
                                <div style={{ padding: '6px 7px', minWidth: 0, overflow: 'hidden', textAlign: 'center' }}>
                                  <div style={{ fontSize: '9.5px', fontWeight: 800, color: '#4338ca', marginBottom: '2px', textAlign: 'center' }}>
                                    Siang Kanan ({2 * slot.deskNumber})
                                  </div>
                                  {slot.siangKanan ? (
                                    <>
                                      <div style={{ fontSize: '9.5px', fontWeight: 800, color: '#0369a1', letterSpacing: '-0.25px', overflowWrap: 'anywhere', wordBreak: 'break-word', lineHeight: 1.2, textAlign: 'center' }}>{slot.siangKanan.noUjian}</div>
                                      <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#1e293b', marginTop: '2px', lineHeight: 1.2, textAlign: 'center', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} title={slot.siangKanan.nama}>
                                        {slot.siangKanan.nama}
                                      </div>
                                      <div style={{ fontSize: '9.5px', color: '#64748b', marginTop: '1px', textAlign: 'center' }}>{slot.siangKanan.rombel} ({slot.siangKanan.jenisKelamin})</div>
                                    </>
                                  ) : (
                                    <div style={{ fontSize: '10.5px', color: '#94a3b8', textAlign: 'center' }}>-</div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div style={{ background: '#f8fafc', padding: '7px 8px', flex: 1, minWidth: 0, overflow: 'hidden', textAlign: 'center' }}>
                                <div style={{ fontSize: '10px', fontWeight: 800, color: '#4338ca', marginBottom: '2px', textAlign: 'center' }}>
                                  SIANG ({currentRoom.siangGradesLabel} • Sendiri)
                                </div>
                                {slot.siangKiri ? (
                                  <>
                                    <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#0369a1', overflowWrap: 'anywhere', wordBreak: 'break-word', lineHeight: 1.2, textAlign: 'center' }}>{slot.siangKiri.noUjian}</div>
                                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#1e293b', marginTop: '2px', lineHeight: 1.25, textAlign: 'center', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} title={slot.siangKiri.nama}>
                                      {slot.siangKiri.nama}
                                    </div>
                                    <div style={{ fontSize: '10px', color: '#64748b', marginTop: '1px', textAlign: 'center' }}>Kelas {slot.siangKiri.rombel} ({slot.siangKiri.jenisKelamin})</div>
                                  </>
                                ) : (
                                  <div style={{ fontSize: '10.5px', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center' }}>Kosong</div>
                                )}
                              </div>
                            )
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
        </>
      )}
    </div>
  );
}
