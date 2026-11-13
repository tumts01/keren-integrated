'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Swal from 'sweetalert2';
import styles from './NilaiSiswa.module.css';
import {
  PK_CATEGORY_MAP,
  PK_SCORE_FIELDS,
  MAP_MINAT_BAKAT,
  PKCategoryKey,
  PKScoreField,
  PKSemester,
  PKMapelScores,
  computeMapelAverage,
} from '@/lib/prosus-config';

interface PKStudentRow {
  induk: string;
  nama: string;
  jk: string;
  nisn?: string;
  scoresByMapel: Record<string, PKMapelScores>;
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

  useEffect(() => {
    try {
      const userStr = localStorage.getItem('keren_user_data');
      if (userStr) {
        setProfile(JSON.parse(userStr));
      }
    } catch {
      // ignore storage errors
    }
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

      const loadedStudents: PKStudentRow[] = json.students || [];
      const loadedMapels: PKMapelHeader[] = json.mapels || PK_CATEGORY_MAP[kategori].mapels;

      const snapshot: Record<string, string> = {};
      for (const st of loadedStudents) {
        for (const m of loadedMapels) {
          const sc = st.scoresByMapel[m.name];
          for (const f of PK_SCORE_FIELDS) {
            snapshot[`${st.induk}::${m.name}::${f.key}`] = String(sc?.[f.key] ?? '');
          }
        }
      }

      lastSavedSnapshotRef.current = snapshot;
      studentsRef.current = loadedStudents;
      setStudents(loadedStudents);
      setMapels(loadedMapels);
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
  const persistColumnField = useCallback((mapelName: string, field: PKScoreField, triggerInduk?: string) => {
    const meta = filterMetaRef.current;
    if (!meta.kelas) return;

    const currentRows = studentsRef.current;
    if (currentRows.length === 0) return;

    // Check whether at least one cell in this column changed vs last saved snapshot
    let hasColumnDiff = false;
    const changedInduks: string[] = [];
    for (const st of currentRows) {
      const key = `${st.induk}::${mapelName}::${field}`;
      const curVal = String(st.scoresByMapel[mapelName]?.[field] ?? '').trim();
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
          nilai: String(st.scoresByMapel[mapelName]?.[field] ?? '').trim(),
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
              const latestVal = String(
                studentsRef.current.find((s) => `${s.induk}::${mapelName}::${field}` === key)?.scoresByMapel[mapelName]?.[field] ?? ''
              ).trim();
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

  const handleCellChange = (rowIdx: number, mapelName: string, field: PKScoreField, rawValue: string) => {
    // Allow digits, one dot/comma, up to 100
    const cleaned = rawValue.replace(',', '.').replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    let normalized = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : cleaned;

    if (normalized !== '') {
      const num = Number(normalized);
      if (!Number.isNaN(num) && num > 100) {
        normalized = '100';
      }
    }

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

  const visibleMapels = focusedMapel === 'ALL'
    ? mapels
    : mapels.filter((m) => m.name === focusedMapel);

  const handleCellKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
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
      `input[data-cell-coord="${nextRow}-${nextCol}"]`
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
      const [mName, f] = slot.split('::') as [string, PKScoreField];
      persistColumnField(mName, f);
    });
  };

  // --- CETAK RAPOR PK LOGIC ---
  const computeStudentOverallAverage = (st: PKStudentRow): number => {
    const avgs = mapels
      .map((m) => st.scoresByMapel[m.name]?.rata)
      .filter((v): v is number => v !== null && v !== undefined);
    if (avgs.length === 0) return 0;
    return Math.round(avgs.reduce((a, b) => a + b, 0) / avgs.length);
  };

  const generateRaporHtml = (s: PKStudentRow) => {
    const katDef = PK_CATEGORY_MAP[kategori];
    const overallAvg = computeStudentOverallAverage(s);
    const { predikat, ket, deskripsi } = getPredikat(overallAvg);
    const walasName = waliKelas || profile?.nama || '........................................';

    const mapelRowsHtml = mapels
      .map((m, idx) => {
        const sc = s.scoresByMapel[m.name] || { m1: '', m2: '', m3: '', sts: '', sas: '', rata: null };
        const rataNum = sc.rata ?? 0;
        const mapelPred = getPredikat(rataNum);
        return `
          <tr>
            <td style="border: 1px solid #000; padding: 6px; text-align: center;">${idx + 1}</td>
            <td style="border: 1px solid #000; padding: 6px; text-align: left; font-weight: 600;">${m.name}</td>
            <td style="border: 1px solid #000; padding: 6px; text-align: center;">${sc.m1 || '-'}</td>
            <td style="border: 1px solid #000; padding: 6px; text-align: center;">${sc.m2 || '-'}</td>
            <td style="border: 1px solid #000; padding: 6px; text-align: center;">${sc.m3 || '-'}</td>
            <td style="border: 1px solid #000; padding: 6px; text-align: center;">${sc.sts || '-'}</td>
            <td style="border: 1px solid #000; padding: 6px; text-align: center;">${sc.sas || '-'}</td>
            <td style="border: 1px solid #000; padding: 6px; text-align: center; font-weight: bold; background: #f8fafc;">${sc.rata !== null ? sc.rata : '-'}</td>
            <td style="border: 1px solid #000; padding: 6px; text-align: center; font-weight: bold;">${mapelPred.predikat}</td>
          </tr>
        `;
      })
      .join('');

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
            <td style="width: 35%; font-weight: bold;">${s.nama}</td>
            <td style="width: 18%;">Kelas</td>
            <td style="width: 2%;">:</td>
            <td style="width: 25%; font-weight: bold;">${kelas}</td>
          </tr>
          <tr>
            <td style="padding: 3px 0;">Nomor Induk</td>
            <td>:</td>
            <td>${s.induk || '-'}</td>
            <td>Semester</td>
            <td>:</td>
            <td>${semester}</td>
          </tr>
          <tr>
            <td style="padding: 3px 0;">Kategori Program</td>
            <td>:</td>
            <td style="font-weight: bold;">${katDef?.label || kategori} (${kategori})</td>
            <td>Tahun Ajaran</td>
            <td>:</td>
            <td>${tahunAjaran}</td>
          </tr>
        </table>

        <!-- TABEL RINCIAN NILAI MAPEL -->
        <table style="width: 100%; border-collapse: collapse; font-size: 10pt; margin-bottom: 14px;">
          <thead>
            <tr style="background-color: #f1f5f9;">
              <th style="border: 1px solid #000; padding: 6px; width: 32px; text-align: center;">No</th>
              <th style="border: 1px solid #000; padding: 6px; text-align: left;">Mata Pelajaran</th>
              <th style="border: 1px solid #000; padding: 6px; width: 58px; text-align: center;">Materi 1</th>
              <th style="border: 1px solid #000; padding: 6px; width: 58px; text-align: center;">Materi 2</th>
              <th style="border: 1px solid #000; padding: 6px; width: 58px; text-align: center;">Materi 3</th>
              <th style="border: 1px solid #000; padding: 6px; width: 52px; text-align: center;">STS</th>
              <th style="border: 1px solid #000; padding: 6px; width: 52px; text-align: center;">SAS</th>
              <th style="border: 1px solid #000; padding: 6px; width: 64px; text-align: center;">Rata-Rata</th>
              <th style="border: 1px solid #000; padding: 6px; width: 56px; text-align: center;">Predikat</th>
            </tr>
          </thead>
          <tbody>
            ${mapelRowsHtml}
          </tbody>
        </table>

        <!-- REKAP KESELURUHAN -->
        <table style="width: 100%; border-collapse: collapse; font-size: 10pt; margin-bottom: 14px;">
          <tr style="background-color: #f8fafc; font-weight: bold;">
            <td style="border: 1px solid #000; padding: 7px; width: 40%;">Nilai Akhir Keseluruhan Kategori</td>
            <td style="border: 1px solid #000; padding: 7px; text-align: center; font-size: 11pt;">${overallAvg > 0 ? overallAvg : '-'}</td>
            <td style="border: 1px solid #000; padding: 7px; text-align: center;">Predikat: ${predikat} (${ket})</td>
          </tr>
        </table>

        <!-- DESKRIPSI CAPAIAN -->
        <div style="border: 1px solid #000; padding: 8px 10px; font-size: 10pt; margin-bottom: 22px;">
          <b>Deskripsi Capaian Program Khusus:</b><br/>
          <span style="display: inline-block; margin-top: 4px; line-height: 1.4;">${deskripsi}</span>
        </div>

        <!-- TANDA TANGAN -->
        <table style="width: 100%; font-size: 10pt; text-align: center; margin-top: 10px;">
          <tr>
            <td style="width: 33%; vertical-align: top;">
              Mengetahui,<br/>
              Orang Tua / Wali Murid<br/><br/><br/><br/><br/>
              <b>( ........................................ )</b>
            </td>
            <td style="width: 33%; vertical-align: top;">
              Singosari, ${tanggalCetak}<br/>
              Wali Kelas ${kelas}<br/><br/><br/><br/><br/>
              <b><u>${walasName}</u></b>
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
              {/* Toolbar: Mapel Focus Pills + Auto-save Status */}
              <div className={styles.matrixToolbar}>
                <div className={styles.mapelPills}>
                  <button
                    type="button"
                    className={`${styles.mapelPill} ${focusedMapel === 'ALL' ? styles.mapelPillActive : ''}`}
                    onClick={() => setFocusedMapel('ALL')}
                  >
                    Semua Mapel ({mapels.length})
                  </button>
                  {mapels.map((m) => (
                    <button
                      key={m.name}
                      type="button"
                      className={`${styles.mapelPill} ${focusedMapel === m.name ? styles.mapelPillActive : ''}`}
                      onClick={() => setFocusedMapel(m.name)}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>

                <div>
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

              {/* Spreadsheet-style Matrix Table */}
              <div className={styles.matrixWrapper}>
                <table className={styles.matrixTable}>
                  <thead>
                    <tr>
                      <th rowSpan={2} className={`${styles.stickyCol} ${styles.stickyNo}`}>No</th>
                      <th rowSpan={2} className={`${styles.stickyCol} ${styles.stickyNis}`}>NIS</th>
                      <th rowSpan={2} className={`${styles.stickyCol} ${styles.stickyNama}`}>Nama Siswa</th>
                      <th rowSpan={2} className={`${styles.stickyCol} ${styles.stickyJk}`}>L/P</th>
                      {visibleMapels.map((m, mIdx) => {
                        const headerTint = styles[`groupHeader${mIdx % 4}` as keyof typeof styles] || styles.groupHeader0;
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
                    </tr>
                    <tr>
                      {visibleMapels.map((m) => (
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
                          <th className={`${styles.subHeaderAvg} ${styles.groupEndCol}`} title="Rata-rata / Nilai Akhir">
                            NA
                          </th>
                        </React.Fragment>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((st, rowIdx) => {
                      const totalCols = visibleMapels.length * PK_SCORE_FIELDS.length;
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

                          {visibleMapels.map((m, visMapelIdx) => {
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
                                        data-cell-coord={`${rowIdx}-${flatColIdx}`}
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
                                        onKeyDown={(e) => handleCellKeyDown(e, rowIdx, flatColIdx, totalCols)}
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
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: '10px', fontSize: '0.82rem', color: '#64748b', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <span>
                  Menampilkan <b>{students.length}</b> siswa · Kelas <b>{kelas}</b> · Semester <b>{semester}</b> · Tahun Ajaran <b>{tahunAjaran}</b>
                </span>
                <span>
                  Tips: Gunakan tombol <b>Tab</b>, <b>Enter</b>, atau <b>Panah</b> untuk berpindah kolom/baris — nilai langsung tersimpan otomatis.
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
            <div style={{ display: 'flex', gap: '8px' }}>
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
                    {mapels.map((m) => (
                      <th key={m.name} style={{ textAlign: 'center' }} title={m.name}>
                        {m.shortName}
                      </th>
                    ))}
                    <th style={{ width: '95px', textAlign: 'center' }}>Rata-rata</th>
                    <th style={{ width: '110px', textAlign: 'center' }}>Predikat</th>
                    <th style={{ width: '190px', textAlign: 'center' }}>Aksi Cetak</th>
                  </tr>
                </thead>
                <tbody>
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan={7 + mapels.length} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                        Tidak ada siswa aktif di kelas ini.
                      </td>
                    </tr>
                  ) : (
                    students.map((st, idx) => {
                      const avg = computeStudentOverallAverage(st);
                      const { predikat, ket } = getPredikat(avg);
                      return (
                        <tr key={st.induk || idx}>
                          <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                          <td>{st.induk || '-'}</td>
                          <td style={{ fontWeight: 600 }}>{st.nama}</td>
                          <td style={{ textAlign: 'center' }}>{st.jk}</td>
                          {mapels.map((m) => {
                            const r = st.scoresByMapel[m.name]?.rata;
                            return (
                              <td key={m.name} style={{ textAlign: 'center', fontWeight: 600 }}>
                                {r !== null && r !== undefined ? r : '-'}
                              </td>
                            );
                          })}
                          <td style={{ textAlign: 'center', fontWeight: 700, color: '#1d4ed8' }}>
                            {avg > 0 ? avg : '-'}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {predikat} ({ket})
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
    </div>
  );
}
