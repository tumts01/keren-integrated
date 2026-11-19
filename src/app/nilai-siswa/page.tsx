'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Swal from 'sweetalert2';
import styles from './NilaiSiswa.module.css';
import { supabase } from '@/lib/supabase';
import {
  PK_CATEGORY_MAP,
  PK_SCORE_FIELDS,
  MAP_MINAT_BAKAT,
  PKCategoryKey,
  PKScoreField,
  PKSemester,
  PKMapelScores,
  PKDeskripsiConfig,
  PKDeskripsiProgramKey,
  PK_DESKRIPSI_CONFIG_KEY,
  PK_DESKRIPSI_PROGRAMS,
  PK_DESKRIPSI_TIERS,
  computeMapelAverage,
  createDefaultPKDeskripsiConfig,
  getLayananUmumMapels,
  resolvePKDeskripsi,
} from '@/lib/prosus-config';

interface PKStudentRow {
  induk: string;
  nama: string;
  jk: string;
  nisn?: string;
  scoresByMapel: Record<string, PKMapelScores>;
  catatan: string;
}

interface PKMapelHeader {
  name: string;
  shortName: string;
}

const KELAS_OPTIONS = [
  '7A', '7B', '7C', '7D', '7E', '7F', '7G', '7H', '7I',
  '8A', '8B', '8C', '8D', '8E', '8F', '8G', '8H', '8I',
];

const getPredikat = (scoreNum: number) => {
  if (scoreNum >= 90) {
    return { predikat: 'A', ket: 'Sangat Baik', deskripsi: 'Menunjukkan penguasaan materi dan keterampilan Program Khusus yang sangat baik dan melampaui capaian.' };
  }
  if (scoreNum >= 80) {
    return { predikat: 'B', ket: 'Baik', deskripsi: 'Menunjukkan penguasaan materi dan keterampilan Program Khusus yang baik sesuai target pembelajaran.' };
  }
  if (scoreNum >= 70) {
    return { predikat: 'C', ket: 'Cukup', deskripsi: 'Menunjukkan penguasaan materi Program Khusus yang cukup baik, perlu peningkatan latihan mandiri.' };
  }
  if (scoreNum > 0) {
    return { predikat: 'D', ket: 'Perlu Bimbingan', deskripsi: 'Memerlukan bimbingan lebih lanjut dalam memahami dan mempraktikkan materi Program Khusus.' };
  }
  return { predikat: '-', ket: '-', deskripsi: '-' };
};

export default function NilaiSiswaPage() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth(); // 0 = Jan, 6 = Jul
  const defaultTA = currentMonth >= 6 ? `${currentYear}/${currentYear + 1}` : `${currentYear - 1}/${currentYear}`;
  const taOptions = Array.from(new Set([
    '2025/2026',
    '2026/2027',
    defaultTA,
    `${currentYear}/${currentYear + 1}`,
    `${currentYear + 1}/${currentYear + 2}`,
  ])).sort();

  const [subTab, setSubTab] = useState<'input' | 'cetak'>('input');

  // Shared Filter States
  const [tahunAjaran, setTahunAjaran] = useState<string>(defaultTA);
  const [semester, setSemester] = useState<PKSemester>('Ganjil');
  const [kelas, setKelas] = useState<string>('');
  const [kategori, setKategori] = useState<PKCategoryKey>('SAINS RISET');
  const [focusedMapel, setFocusedMapel] = useState<string>('ALL');

  // Loaded Data States
  const [students, setStudents] = useState<PKStudentRow[]>([]);
  const [mapels, setMapels] = useState<PKMapelHeader[]>(PK_CATEGORY_MAP['SAINS RISET'].mapels);
  const [layananUmumMapels, setLayananUmumMapels] = useState<PKMapelHeader[]>(() =>
    getLayananUmumMapels('SAINS RISET').map((m) => ({ name: m.name, shortName: m.shortName }))
  );
  const [waliKelas, setWaliKelas] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // Auto-save Tracking
  const [savingCount, setSavingCount] = useState<number>(0);
  const [lastSavedAt, setLastSavedAt] = useState<string>('');
  const [saveError, setSaveError] = useState<string>('');
  const [dirtyCells, setDirtyCells] = useState<Record<string, boolean>>({});
  const [justSavedCells, setJustSavedCells] = useState<Record<string, boolean>>({});

  // Refs for race-free auto-save on quick row/column movement
  const studentsRef = useRef<PKStudentRow[]>([]);
  const lastSavedSnapshotRef = useRef<Record<string, string>>({});
  const saveQueuesRef = useRef<Record<string, Promise<void>>>({});
  const filterMetaRef = useRef({ tahunAjaran, semester, kelas, kategori });

  useEffect(() => {
    filterMetaRef.current = { tahunAjaran, semester, kelas, kategori };
  }, [tahunAjaran, semester, kelas, kategori]);

  // User & Cetak States
  const [profile, setProfile] = useState<any>(null);
  const [tanggalCetak, setTanggalCetak] = useState<string>(() => {
    return new Date().toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  });
  const [previewStudent, setPreviewStudent] = useState<PKStudentRow | null>(null);

  // Deskripsi Capaian Config States
  const [deskripsiConfig, setDeskripsiConfig] = useState<PKDeskripsiConfig>(() =>
    createDefaultPKDeskripsiConfig()
  );
  const [showDeskripsiModal, setShowDeskripsiModal] = useState<boolean>(false);
  const [draftDeskripsi, setDraftDeskripsi] = useState<PKDeskripsiConfig>(() =>
    createDefaultPKDeskripsiConfig()
  );
  const [activeDeskripsiProgram, setActiveDeskripsiProgram] =
    useState<PKDeskripsiProgramKey>('SAINS RISET');
  const [savingDeskripsi, setSavingDeskripsi] = useState<boolean>(false);

  useEffect(() => {
    try {
      const userStr = localStorage.getItem('keren_user_data');
      if (userStr) {
        setProfile(JSON.parse(userStr));
      }
    } catch {
      // ignore storage errors
    }

    const loadDeskripsiConfig = async () => {
      const defaults = createDefaultPKDeskripsiConfig();
      const mergeConfig = (raw: any): PKDeskripsiConfig => {
        const merged = { ...defaults };
        if (raw && typeof raw === 'object') {
          for (const prog of PK_DESKRIPSI_PROGRAMS) {
            if (raw[prog.key] && typeof raw[prog.key] === 'object') {
              merged[prog.key] = { ...defaults[prog.key], ...raw[prog.key] };
            }
          }
        }
        return merged;
      };

      try {
        const { data, error } = await supabase
          .from('rapor_config')
          .select('value')
          .eq('key', PK_DESKRIPSI_CONFIG_KEY)
          .maybeSingle();

        if (!error && data?.value) {
          const parsed = mergeConfig(JSON.parse(data.value));
          setDeskripsiConfig(parsed);
          try {
            localStorage.setItem(PK_DESKRIPSI_CONFIG_KEY, JSON.stringify(parsed));
          } catch {}
          return;
        }
      } catch {
        // fallback to localStorage
      }

      try {
        const localRaw = localStorage.getItem(PK_DESKRIPSI_CONFIG_KEY);
        if (localRaw) {
          setDeskripsiConfig(mergeConfig(JSON.parse(localRaw)));
        }
      } catch {}
    };

    loadDeskripsiConfig();
  }, []);

  const handleKelasChange = (newKelas: string) => {
    setKelas(newKelas);
    const autoKat = MAP_MINAT_BAKAT[newKelas.toUpperCase()];
    if (autoKat) {
      setKategori(autoKat);
    }
    setFocusedMapel('ALL');
  };

  const loadKategoriData = useCallback(async () => {
    if (!kelas) {
      setStudents([]);
      studentsRef.current = [];
      lastSavedSnapshotRef.current = {};
      setMapels(PK_CATEGORY_MAP[kategori].mapels);
      setLayananUmumMapels(
        getLayananUmumMapels(kategori).map((m) => ({ name: m.name, shortName: m.shortName }))
      );
      setDirtyCells({});
      setSaveError('');
      return;
    }

    setLoading(true);
    setSaveError('');
    try {
      const params = new URLSearchParams({
        tahunAjaran,
        semester,
        kelas,
        kategori,
      });
      const res = await fetch(`/api/nilai-siswa/pk/kategori?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal memuat data nilai Program Khusus');
      }

      const loadedStudents: PKStudentRow[] = (json.students || []).map((st: any) => ({
        ...st,
        catatan: String(st.catatan ?? ''),
      }));
      const loadedMapels: PKMapelHeader[] = json.mapels || PK_CATEGORY_MAP[kategori].mapels;
      const loadedLayananUmumMapels: PKMapelHeader[] =
        json.layananUmumMapels ||
        getLayananUmumMapels(kategori).map((m) => ({ name: m.name, shortName: m.shortName }));

      const snapshot: Record<string, string> = {};
      for (const st of loadedStudents) {
        for (const m of [...loadedMapels, ...loadedLayananUmumMapels]) {
          const sc = st.scoresByMapel[m.name];
          for (const f of PK_SCORE_FIELDS) {
            snapshot[`${st.induk}::${m.name}::${f.key}`] = String(sc?.[f.key] ?? '');
          }
        }
        snapshot[`${st.induk}::CATATAN_PENGAJAR::catatan`] = String(st.catatan ?? '');
      }

      lastSavedSnapshotRef.current = snapshot;
      studentsRef.current = loadedStudents;
      setStudents(loadedStudents);
      setMapels(loadedMapels);
      setLayananUmumMapels(loadedLayananUmumMapels);
      setWaliKelas(json.waliKelas || '');
      setDirtyCells({});
      setJustSavedCells({});
    } catch (err: any) {
      Swal.fire('Gagal Memuat Data', err?.message || 'Terjadi kesalahan saat mengambil data.', 'error');
    } finally {
      setLoading(false);
    }
  }, [tahunAjaran, semester, kelas, kategori]);

  useEffect(() => {
    loadKategoriData();
  }, [loadKategoriData]);

  // Enqueue a column save so fast sequential edits on the same column never overtake each other
  const persistColumnField = useCallback((mapelName: string, field: PKScoreField | 'catatan', triggerInduk?: string) => {
    const meta = filterMetaRef.current;
    if (!meta.kelas) return;

    const currentRows = studentsRef.current;
    if (currentRows.length === 0) return;

    const getRowFieldVal = (st: PKStudentRow): string =>
      field === 'catatan'
        ? String(st.catatan ?? '').trim()
        : String(st.scoresByMapel[mapelName]?.[field] ?? '').trim();

    // Check whether at least one cell in this column changed vs last saved snapshot
    let hasColumnDiff = false;
    const changedInduks: string[] = [];
    for (const st of currentRows) {
      const key = `${st.induk}::${mapelName}::${field}`;
      const curVal = getRowFieldVal(st);
      const prevVal = String(lastSavedSnapshotRef.current[key] ?? '').trim();
      if (curVal !== prevVal) {
        hasColumnDiff = true;
        changedInduks.push(st.induk);
      }
    }

    if (!hasColumnDiff) {
      if (triggerInduk) {
        const key = `${triggerInduk}::${mapelName}::${field}`;
        setDirtyCells((prev) => {
          if (!prev[key]) return prev;
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }
      return;
    }

    const queueKey = `${meta.tahunAjaran}::${meta.semester}::${meta.kelas}::${mapelName}::${field}`;
    const prevQueue = saveQueuesRef.current[queueKey] || Promise.resolve();

    const nextTask = prevQueue
      .catch(() => undefined)
      .then(async () => {
        // Re-read the latest values from ref at execution time
        const latestRows = studentsRef.current;
        const payloadNilai = latestRows.map((st) => ({
          induk: st.induk,
          nama: st.nama,
          jk: st.jk,
          nilai:
            field === 'catatan'
              ? String(st.catatan ?? '').trim()
              : String(st.scoresByMapel[mapelName]?.[field] ?? '').trim(),
        }));

        const snapshotCandidate: Record<string, string> = {};
        for (const item of payloadNilai) {
          snapshotCandidate[`${item.induk}::${mapelName}::${field}`] = item.nilai;
        }

        setSavingCount((c) => c + 1);
        setSaveError('');

        try {
          const res = await fetch('/api/nilai-siswa/pk/kategori', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tahunAjaran: meta.tahunAjaran,
              semester: meta.semester,
              kelas: meta.kelas,
              kategori: meta.kategori,
              mapel: mapelName,
              field,
              dataNilai: payloadNilai,
              guru: profile?.nama || profile?.username || 'Guru PK',
            }),
          });
          const json = await res.json();
          if (!res.ok || !json.success) {
            throw new Error(json.error || 'Gagal menyimpan');
          }

          Object.assign(lastSavedSnapshotRef.current, snapshotCandidate);

          setDirtyCells((prev) => {
            const next = { ...prev };
            for (const key of Object.keys(snapshotCandidate)) {
              const matched = studentsRef.current.find((s) => `${s.induk}::${mapelName}::${field}` === key);
              const latestVal = matched ? getRowFieldVal(matched) : '';
              if (latestVal === snapshotCandidate[key]) {
                delete next[key];
              }
            }
            return next;
          });

          if (changedInduks.length > 0) {
            const flashKeys = changedInduks.map((ind) => `${ind}::${mapelName}::${field}`);
            setJustSavedCells((prev) => {
              const next = { ...prev };
              for (const k of flashKeys) next[k] = true;
              return next;
            });
            setTimeout(() => {
              setJustSavedCells((prev) => {
                const next = { ...prev };
                for (const k of flashKeys) delete next[k];
                return next;
              });
            }, 1400);
          }

          setLastSavedAt(
            new Date().toLocaleTimeString('id-ID', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })
          );
        } catch (err: any) {
          setSaveError(err?.message || 'Gagal auto-save');
        } finally {
          setSavingCount((c) => Math.max(0, c - 1));
        }
      });

    saveQueuesRef.current[queueKey] = nextTask;
  }, [profile]);

  const normalizeScoreInput = (rawValue: string, trimTrailingDot = false): string => {
    const trimmed = rawValue.trim();
    if (!trimmed || trimmed === '-') return '';

    const cleaned = trimmed.replace(',', '.').replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    let normalized = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : cleaned;

    if (normalized !== '') {
      const num = Number(normalized);
      if (!Number.isNaN(num) && num > 100) {
        normalized = '100';
      }
    }

    if (trimTrailingDot) {
      normalized = normalized.replace(/\.+$/, '');
    }

    return normalized;
  };

  const handleCellChange = (rowIdx: number, mapelName: string, field: PKScoreField, rawValue: string) => {
    const normalized = normalizeScoreInput(rawValue, false);

    const updated = [...studentsRef.current];
    const targetStudent = updated[rowIdx];
    if (!targetStudent) return;

    const prevMapelScores = targetStudent.scoresByMapel[mapelName] || {
      m1: '', m2: '', m3: '', sts: '', sas: '', rata: null,
    };
    const nextMapelScores: PKMapelScores = {
      ...prevMapelScores,
      [field]: normalized,
    };
    nextMapelScores.rata = computeMapelAverage(nextMapelScores);

    updated[rowIdx] = {
      ...targetStudent,
      scoresByMapel: {
        ...targetStudent.scoresByMapel,
        [mapelName]: nextMapelScores,
      },
    };

    studentsRef.current = updated;
    setStudents(updated);

    const cellKey = `${targetStudent.induk}::${mapelName}::${field}`;
    const savedVal = String(lastSavedSnapshotRef.current[cellKey] ?? '').trim();
    const isNowDirty = normalized.trim() !== savedVal;
    setDirtyCells((prev) => {
      if (Boolean(prev[cellKey]) === isNowDirty) return prev;
      const next = { ...prev };
      if (isNowDirty) next[cellKey] = true;
      else delete next[cellKey];
      return next;
    });
  };

  const handleCellBlur = (rowIdx: number, mapelName: string, field: PKScoreField) => {
    const st = studentsRef.current[rowIdx];
    if (!st) return;

    // Trim trailing dot (e.g., "85." -> "85") before persisting
    const curVal = String(st.scoresByMapel[mapelName]?.[field] ?? '').trim();
    if (curVal.endsWith('.')) {
      handleCellChange(rowIdx, mapelName, field, curVal.slice(0, -1));
    }

    persistColumnField(mapelName, field, st.induk);
  };

  // Paste 1D/2D values directly from Excel (columns separated by tab, rows by newline)
  const handleCellPaste = (
    e: React.ClipboardEvent<HTMLInputElement>,
    tableMapels: PKMapelHeader[],
    startRowIdx: number,
    startFlatColIdx: number
  ) => {
    const rawText = e.clipboardData.getData('text/plain') || e.clipboardData.getData('text');
    if (!rawText) return;

    const rawLines = rawText.split(/\r\n|\n|\r/);
    if (rawLines.length > 1 && rawLines[rawLines.length - 1] === '') {
      rawLines.pop(); // Excel adds one trailing newline on copied blocks
    }

    const isMultiCell = rawLines.length > 1 || rawLines[0].includes('\t');
    if (!isMultiCell) {
      // Single-cell paste: let browser input + onChange handle normalization
      return;
    }

    e.preventDefault();

    const flatSlots: Array<{ mapelName: string; field: PKScoreField }> = [];
    for (const m of tableMapels) {
      for (const f of PK_SCORE_FIELDS) {
        flatSlots.push({ mapelName: m.name, field: f.key });
      }
    }

    const currentRows = studentsRef.current;
    if (currentRows.length === 0 || flatSlots.length === 0) return;

    const updated = [...currentRows];
    const touchedColumns = new Map<string, { mapelName: string; field: PKScoreField }>();
    const dirtyDiff: Record<string, boolean> = {};
    let appliedCells = 0;

    rawLines.forEach((line, rOffset) => {
      const targetRowIdx = startRowIdx + rOffset;
      if (targetRowIdx < 0 || targetRowIdx >= updated.length) return;

      const cols = line.split('\t');
      const targetStudent = updated[targetRowIdx];
      if (!targetStudent) return;

      let nextScoresByMapel = targetStudent.scoresByMapel;
      let rowModified = false;

      cols.forEach((rawCell, cOffset) => {
        const slot = flatSlots[startFlatColIdx + cOffset];
        if (!slot) return;

        const normalized = normalizeScoreInput(rawCell, true);
        if (!rowModified) {
          nextScoresByMapel = { ...targetStudent.scoresByMapel };
          rowModified = true;
        }

        const prevMapelScores = nextScoresByMapel[slot.mapelName] || {
          m1: '', m2: '', m3: '', sts: '', sas: '', rata: null,
        };
        const nextMapelScores: PKMapelScores = {
          ...prevMapelScores,
          [slot.field]: normalized,
        };
        nextMapelScores.rata = computeMapelAverage(nextMapelScores);
        nextScoresByMapel[slot.mapelName] = nextMapelScores;

        const cellKey = `${targetStudent.induk}::${slot.mapelName}::${slot.field}`;
        const savedVal = String(lastSavedSnapshotRef.current[cellKey] ?? '').trim();
        dirtyDiff[cellKey] = normalized.trim() !== savedVal;

        touchedColumns.set(`${slot.mapelName}::${slot.field}`, slot);
        appliedCells += 1;
      });

      if (rowModified) {
        updated[targetRowIdx] = {
          ...targetStudent,
          scoresByMapel: nextScoresByMapel,
        };
      }
    });

    if (appliedCells === 0) return;

    studentsRef.current = updated;
    setStudents(updated);

    setDirtyCells((prev) => {
      const next = { ...prev };
      for (const [k, isDirty] of Object.entries(dirtyDiff)) {
        if (isDirty) next[k] = true;
        else delete next[k];
      }
      return next;
    });

    touchedColumns.forEach(({ mapelName, field }) => {
      persistColumnField(mapelName, field);
    });

    Swal.fire({
      icon: 'success',
      title: `${appliedCells} sel nilai ditempel dari Excel`,
      text: `Auto-save ke ${touchedColumns.size} kolom nilai...`,
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 2200,
    });
  };

  const allMapels = [...mapels, ...layananUmumMapels];
  const visibleMapels = focusedMapel === 'ALL'
    ? mapels
    : focusedMapel === 'CATATAN'
    ? []
    : mapels.filter((m) => m.name === focusedMapel);
  const visibleLayananUmumMapels = focusedMapel === 'ALL'
    ? layananUmumMapels
    : focusedMapel === 'CATATAN'
    ? []
    : layananUmumMapels.filter((m) => m.name === focusedMapel);

  const handleCatatanChange = (rowIdx: number, value: string) => {
    const updated = [...studentsRef.current];
    const targetStudent = updated[rowIdx];
    if (!targetStudent) return;

    updated[rowIdx] = {
      ...targetStudent,
      catatan: value,
    };
    studentsRef.current = updated;
    setStudents(updated);

    const cellKey = `${targetStudent.induk}::CATATAN_PENGAJAR::catatan`;
    const savedVal = String(lastSavedSnapshotRef.current[cellKey] ?? '').trim();
    const isNowDirty = value.trim() !== savedVal;
    setDirtyCells((prev) => {
      if (Boolean(prev[cellKey]) === isNowDirty) return prev;
      const next = { ...prev };
      if (isNowDirty) next[cellKey] = true;
      else delete next[cellKey];
      return next;
    });
  };

  const handleCatatanBlur = (rowIdx: number) => {
    const st = studentsRef.current[rowIdx];
    if (!st) return;
    persistColumnField('CATATAN_PENGAJAR', 'catatan', st.induk);
  };

  const handleCatatanPaste = (
    e: React.ClipboardEvent<HTMLInputElement>,
    startRowIdx: number
  ) => {
    const rawText = e.clipboardData.getData('text/plain') || e.clipboardData.getData('text');
    if (!rawText) return;

    const rawLines = rawText.split(/\r\n|\n|\r/);
    if (rawLines.length > 1 && rawLines[rawLines.length - 1] === '') {
      rawLines.pop();
    }
    if (rawLines.length <= 1) return;

    e.preventDefault();

    const updated = [...studentsRef.current];
    const dirtyDiff: Record<string, boolean> = {};
    let applied = 0;

    rawLines.forEach((line, rOffset) => {
      const targetRowIdx = startRowIdx + rOffset;
      if (targetRowIdx < 0 || targetRowIdx >= updated.length) return;
      const firstColText = line.split('\t')[0].trim();
      const targetStudent = updated[targetRowIdx];
      if (!targetStudent) return;

      updated[targetRowIdx] = {
        ...targetStudent,
        catatan: firstColText,
      };
      const cellKey = `${targetStudent.induk}::CATATAN_PENGAJAR::catatan`;
      const savedVal = String(lastSavedSnapshotRef.current[cellKey] ?? '').trim();
      dirtyDiff[cellKey] = firstColText !== savedVal;
      applied += 1;
    });

    if (applied === 0) return;

    studentsRef.current = updated;
    setStudents(updated);
    setDirtyCells((prev) => {
      const next = { ...prev };
      for (const [k, isDirty] of Object.entries(dirtyDiff)) {
        if (isDirty) next[k] = true;
        else delete next[k];
      }
      return next;
    });
    persistColumnField('CATATAN_PENGAJAR', 'catatan');

    Swal.fire({
      icon: 'success',
      title: `${applied} catatan pengajar ditempel`,
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 2000,
    });
  };

  const openDeskripsiModal = () => {
    setDraftDeskripsi(JSON.parse(JSON.stringify(deskripsiConfig)));
    setActiveDeskripsiProgram(kategori);
    setShowDeskripsiModal(true);
  };

  const handleSaveDeskripsiConfig = async () => {
    setSavingDeskripsi(true);
    try {
      const serialized = JSON.stringify(draftDeskripsi);
      try {
        localStorage.setItem(PK_DESKRIPSI_CONFIG_KEY, serialized);
      } catch {}

      const { error } = await supabase
        .from('rapor_config')
        .upsert({ key: PK_DESKRIPSI_CONFIG_KEY, value: serialized }, { onConflict: 'key' });

      if (error) throw error;

      setDeskripsiConfig(draftDeskripsi);
      setShowDeskripsiModal(false);
      Swal.fire({
        icon: 'success',
        title: 'Pengaturan deskripsi berhasil disimpan',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000,
      });
    } catch (err: any) {
      Swal.fire('Gagal Menyimpan', err?.message || 'Gagal menyimpan pengaturan deskripsi.', 'error');
    } finally {
      setSavingDeskripsi(false);
    }
  };

  const handleCellKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    tableIdPrefix: string,
    rowIdx: number,
    flatColIdx: number,
    totalCols: number
  ) => {
    let nextRow = rowIdx;
    let nextCol = flatColIdx;

    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      nextRow = rowIdx + 1;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      nextRow = rowIdx - 1;
    } else if (e.key === 'ArrowRight') {
      const input = e.currentTarget;
      const atEnd =
        input.selectionStart === input.value.length &&
        input.selectionEnd === input.value.length;
      if (!atEnd && input.selectionStart !== 0) return;
      if (input.selectionEnd !== input.value.length && input.value !== '') return;
      e.preventDefault();
      nextCol = flatColIdx + 1;
    } else if (e.key === 'ArrowLeft') {
      const input = e.currentTarget;
      const atStart = input.selectionStart === 0 && input.selectionEnd === 0;
      if (!atStart && input.value !== '') return;
      e.preventDefault();
      nextCol = flatColIdx - 1;
    } else {
      return;
    }

    if (nextRow < 0 || nextRow >= students.length || nextCol < 0 || nextCol >= totalCols) {
      return;
    }

    const nextInput = document.querySelector<HTMLInputElement>(
      `input[data-cell-coord="${tableIdPrefix}-${nextRow}-${nextCol}"]`
    );
    if (nextInput) {
      nextInput.focus();
      nextInput.select();
    }
  };

  const retryPendingSaves = () => {
    const dirtyKeys = Object.keys(dirtyCells).filter((k) => dirtyCells[k]);
    const uniqueSlots = new Set<string>();
    for (const k of dirtyKeys) {
      const parts = k.split('::');
      if (parts.length === 3) {
        uniqueSlots.add(`${parts[1]}::${parts[2]}`);
      }
    }
    uniqueSlots.forEach((slot) => {
      const [mName, f] = slot.split('::') as [string, PKScoreField | 'catatan'];
      persistColumnField(mName, f);
    });
  };

  // --- CETAK RAPOR PK LOGIC ---
  const computeCategoryPKAverage = (st: PKStudentRow): number | null => {
    const avgs = mapels
      .map((m) => st.scoresByMapel[m.name]?.rata)
      .filter((v): v is number => v !== null && v !== undefined);
    if (avgs.length === 0) return null;
    return Math.round(avgs.reduce((a, b) => a + b, 0) / avgs.length);
  };

  const computeStudentOverallAverage = (st: PKStudentRow): number => {
    const pkAvg = computeCategoryPKAverage(st);
    const luAvgs = layananUmumMapels
      .map((m) => st.scoresByMapel[m.name]?.rata)
      .filter((v): v is number => v !== null && v !== undefined);
    const all3 = [pkAvg, ...luAvgs].filter((v): v is number => v !== null && v !== undefined);
    if (all3.length === 0) return 0;
    return Math.round(all3.reduce((a, b) => a + b, 0) / all3.length);
  };

  const escapeHtmlStr = (val: string): string =>
    String(val)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const generateRaporHtml = (s: PKStudentRow) => {
    const katDef = PK_CATEGORY_MAP[kategori];
    const walasName = waliKelas || profile?.nama || '........................................';

    const pkClassAvg = computeCategoryPKAverage(s);
    const raporItems: Array<{ namaMapel: string; rata: number | null; programKey: PKDeskripsiProgramKey }> = [
      {
        namaMapel: katDef?.label || kategori,
        rata: pkClassAvg,
        programKey: kategori,
      },
      ...layananUmumMapels.map((m) => ({
        namaMapel: m.name,
        rata: s.scoresByMapel[m.name]?.rata ?? null,
        programKey: m.name as PKDeskripsiProgramKey,
      })),
    ];

    const raporRowsHtml = raporItems
      .map((item, idx) => {
        const deskripsiText = resolvePKDeskripsi(deskripsiConfig, item.programKey, item.rata);
        return `
          <tr>
            <td style="border: 1px solid #000; padding: 7px 6px; text-align: center; vertical-align: top;">${idx + 1}</td>
            <td style="border: 1px solid #000; padding: 7px 8px; text-align: left; font-weight: bold; vertical-align: top;">${escapeHtmlStr(item.namaMapel)}</td>
            <td style="border: 1px solid #000; padding: 7px 6px; text-align: center; font-weight: bold; font-size: 10.5pt; vertical-align: top;">${item.rata !== null ? item.rata : '-'}</td>
            <td style="border: 1px solid #000; padding: 7px 8px; text-align: left; line-height: 1.4; vertical-align: top;">${escapeHtmlStr(deskripsiText)}</td>
          </tr>
        `;
      })
      .join('');

    const catatanFormatted = (s.catatan || '').trim()
      ? escapeHtmlStr(s.catatan.trim()).replace(/\r?\n/g, '<br/>')
      : '-';

    return `
      <div class="rapor-page" style="font-family: 'Times New Roman', Times, serif; padding: 15px 25px; color: #000; page-break-after: always; max-width: 820px; margin: 0 auto; background: #fff;">
        <!-- KOP MADRASAH -->
        <table style="width: 100%; border-bottom: 3px solid #000; margin-bottom: 12px; padding-bottom: 8px;">
          <tr>
            <td style="width: 75px; text-align: center; vertical-align: middle;">
              <img src="/logo.png" alt="Logo" style="width: 65px; height: 65px; object-fit: contain;" onerror="this.style.display='none'" />
            </td>
            <td style="text-align: center; vertical-align: middle;">
              <div style="font-size: 14pt; font-weight: bold; text-transform: uppercase;">MADRASAH TSANAWIYAH ALMAARIF 01 SINGOSARI</div>
              <div style="font-size: 11pt; font-weight: bold; margin: 2px 0;">PROGRAM KHUSUS (UNGGULAN &amp; MINAT BAKAT)</div>
              <div style="font-size: 9pt; color: #222;">
                Jl. Masjid No. 33 Singosari, Kab. Malang 65153 &nbsp;|&nbsp; Telp. 0341-458355
              </div>
            </td>
          </tr>
        </table>

        <div style="text-align: center; font-size: 12pt; font-weight: bold; margin-bottom: 14px; text-decoration: underline;">
          LAPORAN HASIL CAPAIAN BELAJAR PROGRAM KHUSUS
        </div>

        <!-- IDENTITAS SISWA -->
        <table style="width: 100%; font-size: 10.5pt; margin-bottom: 14px; border-collapse: collapse;">
          <tr>
            <td style="width: 18%; padding: 3px 0;">Nama Peserta Didik</td>
            <td style="width: 2%;">:</td>
            <td style="width: 35%; font-weight: bold;">${escapeHtmlStr(s.nama)}</td>
            <td style="width: 18%;">Kelas</td>
            <td style="width: 2%;">:</td>
            <td style="width: 25%; font-weight: bold;">${escapeHtmlStr(kelas)}</td>
          </tr>
          <tr>
            <td style="padding: 3px 0;">Nomor Induk</td>
            <td>:</td>
            <td>${escapeHtmlStr(s.induk || '-')}</td>
            <td>Semester</td>
            <td>:</td>
            <td>${escapeHtmlStr(semester)}</td>
          </tr>
          <tr>
            <td style="padding: 3px 0;">Kategori Program</td>
            <td>:</td>
            <td style="font-weight: bold;">${escapeHtmlStr(katDef?.label || kategori)} (${escapeHtmlStr(kategori)})</td>
            <td>Tahun Ajaran</td>
            <td>:</td>
            <td>${escapeHtmlStr(tahunAjaran)}</td>
          </tr>
        </table>

        <!-- TABEL CAPAIAN PROGRAM KHUSUS (3 MAPEL) -->
        <table style="width: 100%; border-collapse: collapse; font-size: 10pt; margin-bottom: 16px;">
          <thead>
            <tr style="background-color: #f1f5f9;">
              <th style="border: 1px solid #000; padding: 7px 6px; width: 34px; text-align: center;">No</th>
              <th style="border: 1px solid #000; padding: 7px 8px; width: 27%; text-align: left;">Mata Pelajaran</th>
              <th style="border: 1px solid #000; padding: 7px 6px; width: 78px; text-align: center;">Rata-Rata</th>
              <th style="border: 1px solid #000; padding: 7px 8px; text-align: left;">Deskripsi Capaian</th>
            </tr>
          </thead>
          <tbody>
            ${raporRowsHtml}
          </tbody>
        </table>

        <!-- TABEL CATATAN PENGAJAR -->
        <table style="width: 100%; border-collapse: collapse; font-size: 10pt; margin-bottom: 22px;">
          <thead>
            <tr style="background-color: #f1f5f9;">
              <th style="border: 1px solid #000; padding: 6px 8px; text-align: left;">Catatan Pengajar</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="border: 1px solid #000; padding: 9px 10px; line-height: 1.45; vertical-align: top;">${catatanFormatted}</td>
            </tr>
          </tbody>
        </table>

        <!-- TANDA TANGAN -->
        <table style="width: 100%; font-size: 10pt; text-align: center; margin-top: 10px;">
          <tr>
            <td style="width: 33%; vertical-align: top;">
              Mengetahui,<br/>
              Orang Tua / Wali Murid<br/><br/><br/><br/><br/>
              <b>( ........................................ )</b>
            </td>
            <td style="width: 33%; vertical-align: top;">
              Singosari, ${escapeHtmlStr(tanggalCetak)}<br/>
              Wali Kelas ${escapeHtmlStr(kelas)}<br/><br/><br/><br/><br/>
              <b><u>${escapeHtmlStr(walasName)}</u></b>
            </td>
            <td style="width: 33%; vertical-align: top;">
              Mengetahui,<br/>
              Kepala Madrasah<br/><br/><br/><br/><br/>
              <b><u>Dwi Retno Palupi, M.Pd.</u></b>
            </td>
          </tr>
        </table>
      </div>
    `;
  };

  const doPrint = (contentHtml: string, title: string) => {
    const printWin = window.open('', '_blank', 'width=920,height=720');
    if (!printWin) {
      Swal.fire('Pop-up Diblokir', 'Izinkan pop-up browser untuk mencetak rapor.', 'warning');
      return;
    }
    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            @page { size: A4 portrait; margin: 12mm; }
            body { margin: 0; padding: 0; background: #fff; }
            @media print {
              .rapor-page { page-break-after: always; }
              .rapor-page:last-child { page-break-after: auto; }
            }
          </style>
        </head>
        <body>${contentHtml}</body>
      </html>
    `);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => {
      printWin.print();
    }, 350);
  };

  const handlePrintAll = () => {
    if (students.length === 0) return;
    const allHtml = students.map((s) => generateRaporHtml(s)).join('');
    doPrint(allHtml, `Rapor PK ${kelas} - ${kategori} (${semester} ${tahunAjaran})`);
  };

  const handlePrintSingle = (s: PKStudentRow) => {
    doPrint(generateRaporHtml(s), `Rapor PK - ${s.nama}`);
  };

  const totalPendingDirty = Object.values(dirtyCells).filter(Boolean).length;

  const renderScoreMatrixTable = (
    tableMapels: PKMapelHeader[],
    tableIdPrefix: string,
    headerOffset = 0,
    includeCatatanCol = false
  ) => (
    <div className={styles.matrixWrapper}>
      <table className={styles.matrixTable}>
        <thead>
          <tr>
            <th rowSpan={tableMapels.length > 0 ? 2 : 1} className={`${styles.stickyCol} ${styles.stickyNo}`}>No</th>
            <th rowSpan={tableMapels.length > 0 ? 2 : 1} className={`${styles.stickyCol} ${styles.stickyNis}`}>NIS</th>
            <th rowSpan={tableMapels.length > 0 ? 2 : 1} className={`${styles.stickyCol} ${styles.stickyNama}`}>Nama Siswa</th>
            <th rowSpan={tableMapels.length > 0 ? 2 : 1} className={`${styles.stickyCol} ${styles.stickyJk}`}>L/P</th>
            {tableMapels.map((m, mIdx) => {
              const headerTint = styles[`groupHeader${(mIdx + headerOffset) % 4}` as keyof typeof styles] || styles.groupHeader0;
              return (
                <th
                  key={m.name}
                  colSpan={6}
                  className={`${headerTint} ${styles.groupEndCol}`}
                  title={m.name}
                >
                  {m.name}
                </th>
              );
            })}
            {includeCatatanCol && (
              <th
                rowSpan={tableMapels.length > 0 ? 2 : 1}
                style={{
                  minWidth: '240px',
                  background: '#fef3c7',
                  color: '#92400e',
                  borderBottom: '2px solid #cbd5e1',
                  textAlign: 'left',
                  padding: '8px 10px',
                }}
              >
                Catatan Pengajar
              </th>
            )}
          </tr>
          {tableMapels.length > 0 && (
            <tr>
              {tableMapels.map((m) => (
                <React.Fragment key={`${m.name}-sub`}>
                  {PK_SCORE_FIELDS.map((f) => (
                    <th
                      key={`${m.name}-${f.key}`}
                      className={styles.subHeaderCell}
                      title={f.label}
                    >
                      {f.label}
                    </th>
                  ))}
                  <th
                    className={`${styles.subHeaderAvg} ${styles.groupEndCol}`}
                    title="Rata-rata = 40% Rata-rata Materi (M1–M3) + 60% SAS"
                  >
                    NA
                  </th>
                </React.Fragment>
              ))}
            </tr>
          )}
        </thead>
        <tbody>
          {students.map((st, rowIdx) => {
            const totalCols = tableMapels.length * PK_SCORE_FIELDS.length;
            const catatanKey = `${st.induk}::CATATAN_PENGAJAR::catatan`;
            const isCatatanDirty = Boolean(dirtyCells[catatanKey]);
            const isCatatanJustSaved = Boolean(justSavedCells[catatanKey]);

            return (
              <tr key={st.induk || `${rowIdx}-${st.nama}`}>
                <td className={`${styles.stickyCol} ${styles.stickyNo}`}>{rowIdx + 1}</td>
                <td className={`${styles.stickyCol} ${styles.stickyNis}`} style={{ color: '#64748b' }}>
                  {st.induk || '-'}
                </td>
                <td className={`${styles.stickyCol} ${styles.stickyNama}`} style={{ fontWeight: 600, color: '#0f172a' }} title={st.nama}>
                  {st.nama}
                </td>
                <td className={`${styles.stickyCol} ${styles.stickyJk}`}>{st.jk}</td>

                {tableMapels.map((m, visMapelIdx) => {
                  const mScores = st.scoresByMapel[m.name] || {
                    m1: '', m2: '', m3: '', sts: '', sas: '', rata: null,
                  };
                  return (
                    <React.Fragment key={`${st.induk}-${m.name}`}>
                      {PK_SCORE_FIELDS.map((f, fIdx) => {
                        const flatColIdx = visMapelIdx * PK_SCORE_FIELDS.length + fIdx;
                        const cellKey = `${st.induk}::${m.name}::${f.key}`;
                        const isDirty = Boolean(dirtyCells[cellKey]);
                        const isJustSaved = Boolean(justSavedCells[cellKey]);

                        return (
                          <td key={cellKey} className={styles.scoreCell}>
                            <input
                              type="text"
                              inputMode="decimal"
                              data-cell-coord={`${tableIdPrefix}-${rowIdx}-${flatColIdx}`}
                              className={`${styles.cellInput} ${
                                isDirty
                                  ? styles.cellInputDirty
                                  : isJustSaved
                                  ? styles.cellInputJustSaved
                                  : ''
                              }`}
                              value={mScores[f.key] ?? ''}
                              onChange={(e) => handleCellChange(rowIdx, m.name, f.key, e.target.value)}
                              onBlur={() => handleCellBlur(rowIdx, m.name, f.key)}
                              onKeyDown={(e) => handleCellKeyDown(e, tableIdPrefix, rowIdx, flatColIdx, totalCols)}
                              onPaste={(e) => handleCellPaste(e, tableMapels, rowIdx, flatColIdx)}
                              onFocus={(e) => e.currentTarget.select()}
                              aria-label={`${st.nama} ${m.name} ${f.label}`}
                            />
                          </td>
                        );
                      })}
                      <td className={styles.avgCell}>
                        {mScores.rata !== null ? mScores.rata : '-'}
                      </td>
                    </React.Fragment>
                  );
                })}

                {includeCatatanCol && (
                  <td className={styles.scoreCell} style={{ padding: '4px 6px', minWidth: '240px' }}>
                    <input
                      type="text"
                      className={`${styles.cellInput} ${
                        isCatatanDirty
                          ? styles.cellInputDirty
                          : isCatatanJustSaved
                          ? styles.cellInputJustSaved
                          : ''
                      }`}
                      style={{ width: '100%', textAlign: 'left', padding: '4px 8px' }}
                      placeholder="Tulis catatan pengajar..."
                      value={st.catatan ?? ''}
                      onChange={(e) => handleCatatanChange(rowIdx, e.target.value)}
                      onBlur={() => handleCatatanBlur(rowIdx)}
                      onPaste={(e) => handleCatatanPaste(e, rowIdx)}
                      aria-label={`Catatan Pengajar ${st.nama}`}
                    />
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Nilai Siswa Program Khusus</h1>
      <p className={styles.subtitle}>
        Input langsung dan kelola nilai Program Khusus berdasarkan 5 kategori terpadu (Materi 1–3, STS, SAS) dengan auto-save.
      </p>

      {/* Main Sub-Tabs */}
      <div className={styles.tabContainer}>
        <button
          className={`${styles.tabBtn} ${subTab === 'input' ? styles.activeTab : ''}`}
          onClick={() => setSubTab('input')}
        >
          <span>📝</span> Input &amp; Kelola Nilai
        </button>
        <button
          className={`${styles.tabBtn} ${subTab === 'cetak' ? styles.activeTab : ''}`}
          onClick={() => setSubTab('cetak')}
        >
          <span>🖨️</span> Cetak Rapor PK
        </button>
      </div>

      {/* Shared Filter Bar */}
      <div className={styles.formGrid} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
        <div className={styles.formGroup}>
          <label>Tahun Ajaran</label>
          <select
            className={styles.select}
            value={tahunAjaran}
            onChange={(e) => setTahunAjaran(e.target.value)}
          >
            {taOptions.map((ta) => (
              <option key={ta} value={ta}>{ta}</option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label>Semester</label>
          <select
            className={styles.select}
            value={semester}
            onChange={(e) => setSemester(e.target.value as PKSemester)}
          >
            <option value="Ganjil">Ganjil</option>
            <option value="Genap">Genap</option>
          </select>
        </div>

        <div className={styles.formGroup}>
          <label>Kelas</label>
          <select
            className={styles.select}
            value={kelas}
            onChange={(e) => handleKelasChange(e.target.value)}
          >
            <option value="">-- Pilih Kelas --</option>
            {KELAS_OPTIONS.map((k) => (
              <option key={k} value={k}>
                {k}{MAP_MINAT_BAKAT[k] ? ` (${PK_CATEGORY_MAP[MAP_MINAT_BAKAT[k]].label})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label>Kategori Program Khusus</label>
          <div
            style={{
              padding: '9px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: kelas ? '#eff6ff' : '#f1f5f9',
              color: kelas ? '#1e40af' : '#64748b',
              fontWeight: 600,
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              minHeight: '41px',
            }}
          >
            {kelas ? (
              <>
                <span>{PK_CATEGORY_MAP[kategori].label}</span>
                <span
                  style={{
                    fontSize: '0.75rem',
                    background: '#dbeafe',
                    color: '#1d4ed8',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {PK_CATEGORY_MAP[kategori].mapels.length} Mapel
                  {layananUmumMapels.length > 0 ? ` + ${layananUmumMapels.length} LU` : ''}
                </span>
              </>
            ) : (
              <span>Otomatis mengikuti kelas</span>
            )}
          </div>
        </div>

        {subTab === 'cetak' && (
          <div className={styles.formGroup}>
            <label>Tanggal Cetak Rapor</label>
            <input
              type="text"
              className={styles.input}
              value={tanggalCetak}
              onChange={(e) => setTanggalCetak(e.target.value)}
              placeholder="Contoh: 20 Desember 2026"
            />
          </div>
        )}
      </div>

      {/* TAB 1: DIRECT INPUT & KELOLA NILAI */}
      {subTab === 'input' && (
        <div>
          {!kelas ? (
            <div
              style={{
                padding: '48px 24px',
                textAlign: 'center',
                background: '#f8fafc',
                borderRadius: '12px',
                border: '1px dashed #cbd5e1',
                color: '#475569',
              }}
            >
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                Pilih Kelas untuk Mulai Mengisi Nilai
              </div>
              <p style={{ margin: 0, fontSize: '0.92rem' }}>
                Kategori dan rincian mata pelajaran Program Khusus otomatis mengikuti kelas yang dipilih.
                Nilai lama tahun ajaran <b>2026/2027</b> otomatis tampil di semester <b>Ganjil</b>.
              </p>
            </div>
          ) : loading ? (
            <div
              style={{
                padding: '48px 24px',
                textAlign: 'center',
                background: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                color: '#64748b',
                fontWeight: 600,
              }}
            >
              Memuat daftar siswa dan rincian nilai {PK_CATEGORY_MAP[kategori].label} kelas {kelas}...
            </div>
          ) : students.length === 0 ? (
            <div
              style={{
                padding: '40px 24px',
                textAlign: 'center',
                background: '#fffbeb',
                borderRadius: '12px',
                border: '1px solid #fde68a',
                color: '#92400e',
              }}
            >
              Tidak ditemukan data siswa aktif untuk kelas <b>{kelas}</b> pada Tahun Ajaran <b>{tahunAjaran}</b>.
            </div>
          ) : (
            <>
              {/* Toolbar: Mapel Focus Pills + Deskripsi Button + Auto-save Status */}
              <div className={styles.matrixToolbar}>
                <div className={styles.mapelPills}>
                  <button
                    type="button"
                    className={`${styles.mapelPill} ${focusedMapel === 'ALL' ? styles.mapelPillActive : ''}`}
                    onClick={() => setFocusedMapel('ALL')}
                  >
                    Semua Mapel ({allMapels.length})
                  </button>
                  {allMapels.map((m) => (
                    <button
                      key={m.name}
                      type="button"
                      className={`${styles.mapelPill} ${focusedMapel === m.name ? styles.mapelPillActive : ''}`}
                      onClick={() => setFocusedMapel(m.name)}
                    >
                      {m.name}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`${styles.mapelPill} ${focusedMapel === 'CATATAN' ? styles.mapelPillActive : ''}`}
                    onClick={() => setFocusedMapel('CATATAN')}
                  >
                    💬 Catatan Pengajar
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={openDeskripsiModal}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: '1px solid #0ea5e9',
                      background: '#f0f9ff',
                      color: '#0369a1',
                      fontWeight: 600,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                    }}
                  >
                    📝 Atur Deskripsi Rapor
                  </button>
                  {savingCount > 0 ? (
                    <span className={`${styles.saveStatusBadge} ${styles.saveStatusSaving}`}>
                      ⏳ Menyimpan otomatis...
                    </span>
                  ) : saveError ? (
                    <button
                      type="button"
                      onClick={retryPendingSaves}
                      className={`${styles.saveStatusBadge} ${styles.saveStatusError}`}
                      style={{ cursor: 'pointer' }}
                    >
                      ⚠️ {saveError} (Klik untuk coba lagi)
                    </button>
                  ) : totalPendingDirty > 0 ? (
                    <button
                      type="button"
                      onClick={retryPendingSaves}
                      className={`${styles.saveStatusBadge} ${styles.saveStatusSaving}`}
                      style={{ cursor: 'pointer' }}
                    >
                      ✏️ {totalPendingDirty} perubahan menunggu pindah sel...
                    </button>
                  ) : lastSavedAt ? (
                    <span className={`${styles.saveStatusBadge} ${styles.saveStatusSaved}`}>
                      ✓ Tersimpan otomatis pukul {lastSavedAt}
                    </span>
                  ) : (
                    <span className={`${styles.saveStatusBadge} ${styles.saveStatusIdle}`}>
                      💾 Auto-save aktif (simpan saat pindah baris/kolom)
                    </span>
                  )}
                </div>
              </div>

              {/* Fokus Catatan Pengajar saja */}
              {focusedMapel === 'CATATAN' && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#92400e', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '6px', fontSize: '0.78rem' }}>💬</span>
                    Catatan Pengajar — Kelas {kelas} ({PK_CATEGORY_MAP[kategori].label})
                  </div>
                  {renderScoreMatrixTable([], 'catatan-only', 0, true)}
                </div>
              )}

              {/* Tabel A: Program Khusus Minat & Bakat (+ kolom Catatan Pengajar di akhir) */}
              {visibleMapels.length > 0 && (
                <div style={{ marginBottom: visibleLayananUmumMapels.length > 0 ? '24px' : 0 }}>
                  {layananUmumMapels.length > 0 && (
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: '6px', fontSize: '0.78rem' }}>A</span>
                      Program Khusus Minat &amp; Bakat — {PK_CATEGORY_MAP[kategori].label}
                    </div>
                  )}
                  {renderScoreMatrixTable(visibleMapels, 'utama', 0, focusedMapel === 'ALL')}
                </div>
              )}

              {/* Tabel B: Program Khusus Layanan Umum (Bahasa Arab & Bahasa Inggris) */}
              {visibleLayananUmumMapels.length > 0 && (
                <div style={{ marginTop: visibleMapels.length > 0 ? '6px' : 0 }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '6px', fontSize: '0.78rem' }}>B</span>
                    Program Khusus Layanan Umum — Bahasa Arab &amp; Bahasa Inggris
                    <span style={{ fontSize: '0.78rem', fontWeight: 500, color: '#64748b' }}>
                      (Nilai harian Materi 1–3, STS, SAS khusus layanan umum kelas {kelas})
                    </span>
                  </div>
                  {renderScoreMatrixTable(visibleLayananUmumMapels, 'layanan-umum', 2, false)}
                </div>
              )}

              <div style={{ marginTop: '10px', fontSize: '0.82rem', color: '#64748b', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <span>
                  Menampilkan <b>{students.length}</b> siswa · Kelas <b>{kelas}</b> · Semester <b>{semester}</b> · Tahun Ajaran <b>{tahunAjaran}</b> · NA = <b>40% Rata-rata Materi + 60% SAS</b>
                </span>
                <span>
                  Tips: Bisa langsung <b>Copy–Paste dari Excel</b> (termasuk kolom Catatan Pengajar) atau pakai <b>Tab / Enter / Panah</b>.
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 2: CETAK RAPOR PK */}
      {subTab === 'cetak' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ fontSize: '0.92rem', color: '#475569' }}>
              {kelas ? (
                <>
                  Rapor Kategori <b>{PK_CATEGORY_MAP[kategori].label}</b> — Kelas <b>{kelas}</b> ({semester} {tahunAjaran})
                </>
              ) : (
                'Pilih kelas pada filter di atas untuk melihat daftar rapor Program Khusus.'
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={openDeskripsiModal}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid #0ea5e9',
                  background: '#f0f9ff',
                  color: '#0369a1',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.88rem',
                }}
              >
                📝 Atur Deskripsi Capaian
              </button>
              <button
                type="button"
                className={styles.btnSubmit}
                onClick={loadKategoriData}
                disabled={loading || !kelas}
                style={{ backgroundColor: '#475569' }}
              >
                🔄 Muat Ulang
              </button>
              <button
                type="button"
                className={styles.btnSubmit}
                onClick={handlePrintAll}
                disabled={loading || students.length === 0}
              >
                🖨️ Cetak Semua Rapor ({students.length})
              </button>
            </div>
          </div>

          {!kelas ? null : loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              Memuat data rapor...
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: '45px', textAlign: 'center' }}>No</th>
                    <th style={{ width: '110px' }}>No Induk</th>
                    <th>Nama Siswa</th>
                    <th style={{ width: '55px', textAlign: 'center' }}>L/P</th>
                    <th style={{ textAlign: 'center' }} title={`Rata-rata gabungan ${PK_CATEGORY_MAP[kategori].label}`}>
                      {PK_CATEGORY_MAP[kategori].label}
                    </th>
                    {layananUmumMapels.map((m) => (
                      <th key={m.name} style={{ textAlign: 'center' }} title={m.name}>
                        {m.shortName}
                      </th>
                    ))}
                    <th style={{ minWidth: '180px' }}>Catatan Pengajar</th>
                    <th style={{ width: '190px', textAlign: 'center' }}>Aksi Cetak</th>
                  </tr>
                </thead>
                <tbody>
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan={7 + layananUmumMapels.length} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                        Tidak ada siswa aktif di kelas ini.
                      </td>
                    </tr>
                  ) : (
                    students.map((st, idx) => {
                      const pkAvg = computeCategoryPKAverage(st);
                      return (
                        <tr key={st.induk || idx}>
                          <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                          <td>{st.induk || '-'}</td>
                          <td style={{ fontWeight: 600 }}>{st.nama}</td>
                          <td style={{ textAlign: 'center' }}>{st.jk}</td>
                          <td style={{ textAlign: 'center', fontWeight: 700, color: '#1d4ed8' }}>
                            {pkAvg !== null ? pkAvg : '-'}
                          </td>
                          {layananUmumMapels.map((m) => {
                            const r = st.scoresByMapel[m.name]?.rata;
                            return (
                              <td key={m.name} style={{ textAlign: 'center', fontWeight: 600 }}>
                                {r !== null && r !== undefined ? r : '-'}
                              </td>
                            );
                          })}
                          <td style={{ fontSize: '0.84rem', color: st.catatan ? '#1e293b' : '#94a3b8', maxWidth: '260px' }}>
                            {st.catatan ? st.catatan : '-'}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={() => setPreviewStudent(st)}
                                style={{
                                  padding: '6px 10px',
                                  borderRadius: '6px',
                                  border: '1px solid #cbd5e1',
                                  background: '#fff',
                                  cursor: 'pointer',
                                  fontSize: '0.82rem',
                                  fontWeight: 600,
                                }}
                              >
                                👁️ Preview
                              </button>
                              <button
                                type="button"
                                onClick={() => handlePrintSingle(st)}
                                style={{
                                  padding: '6px 10px',
                                  borderRadius: '6px',
                                  border: 'none',
                                  background: '#2563eb',
                                  color: '#fff',
                                  cursor: 'pointer',
                                  fontSize: '0.82rem',
                                  fontWeight: 600,
                                }}
                              >
                                🖨️ Cetak
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Print Preview Modal */}
      {previewStudent && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setPreviewStudent(null)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '12px',
              maxWidth: '900px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              padding: '20px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a' }}>
                Preview Rapor PK — {previewStudent.nama}
              </h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className={styles.btnSubmit}
                  onClick={() => handlePrintSingle(previewStudent)}
                >
                  🖨️ Cetak
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewStudent(null)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Tutup
                </button>
              </div>
            </div>
            <div dangerouslySetInnerHTML={{ __html: generateRaporHtml(previewStudent) }} />
          </div>
        </div>
      )}

      {/* Modal Pengaturan Deskripsi Capaian (Per Program x Rentang Nilai) */}
      {showDeskripsiModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setShowDeskripsiModal(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              maxWidth: '920px',
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 24px 48px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: '14px 20px',
                borderBottom: '1px solid #e2e8f0',
                background: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 700, color: '#0f172a' }}>
                  📝 Pengaturan Deskripsi Capaian Rapor PK
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                  Atur teks deskripsi capaian yang otomatis tampil pada kolom Rapor sesuai Kategori Program &amp; rentang nilai Rata-Rata siswa.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDeskripsiModal(false)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: 'white',
                  cursor: 'pointer',
                  fontWeight: 700,
                  color: '#475569',
                }}
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Program Selector Pills */}
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Pilih Program / Mapel Rapor:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {PK_DESKRIPSI_PROGRAMS.map((prog) => {
                    const isActive = activeDeskripsiProgram === prog.key;
                    const isLU = prog.group === 'Program Khusus Layanan Umum';
                    return (
                      <button
                        key={prog.key}
                        type="button"
                        onClick={() => setActiveDeskripsiProgram(prog.key)}
                        style={{
                          padding: '7px 12px',
                          borderRadius: '8px',
                          border: `1.5px solid ${isActive ? (isLU ? '#16a34a' : '#0284c7') : '#cbd5e1'}`,
                          background: isActive ? (isLU ? '#dcfce7' : '#e0f2fe') : '#ffffff',
                          color: isActive ? (isLU ? '#15803d' : '#0369a1') : '#334155',
                          fontWeight: isActive ? 700 : 500,
                          fontSize: '0.83rem',
                          cursor: 'pointer',
                        }}
                      >
                        {prog.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4 Predicate Bracket Textareas */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '12px' }}>
                {PK_DESKRIPSI_TIERS.map((tier) => {
                  const val = draftDeskripsi[activeDeskripsiProgram]?.[tier.key] ?? '';
                  return (
                    <div
                      key={tier.key}
                      style={{
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        background: '#f8fafc',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0f172a' }}>
                          Nilai {tier.rangeLabel} ({tier.label})
                        </span>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '2px 7px',
                            borderRadius: '999px',
                            background: '#e2e8f0',
                            color: '#334155',
                          }}
                        >
                          Kategori {tier.key}
                        </span>
                      </div>
                      <textarea
                        rows={3}
                        value={val}
                        onChange={(e) => {
                          const newVal = e.target.value;
                          setDraftDeskripsi((prev) => ({
                            ...prev,
                            [activeDeskripsiProgram]: {
                              ...prev[activeDeskripsiProgram],
                              [tier.key]: newVal,
                            },
                          }));
                        }}
                        placeholder={`Masukkan deskripsi capaian untuk nilai ${tier.rangeLabel}...`}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.86rem',
                          lineHeight: 1.45,
                          resize: 'vertical',
                          background: '#ffffff',
                          fontFamily: 'inherit',
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                padding: '12px 20px',
                borderTop: '1px solid #e2e8f0',
                background: '#f8fafc',
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  const defaults = createDefaultPKDeskripsiConfig();
                  setDraftDeskripsi((prev) => ({
                    ...prev,
                    [activeDeskripsiProgram]: defaults[activeDeskripsiProgram],
                  }));
                }}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                ↺ Reset Bawaan Program Ini
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowDeskripsiModal(false)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveDeskripsiConfig}
                  disabled={savingDeskripsi}
                  className={styles.btnSubmit}
                >
                  {savingDeskripsi ? '⏳ Menyimpan...' : '💾 Simpan Pengaturan Deskripsi'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
