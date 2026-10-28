'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import styles from '../rekap/Rekap.module.css';
import LoadingScreen from '@/components/LoadingScreen';

export const KELAS_PROGRAM_KHUSUS = [
  'Agama Tahfidh',
  'Olahraga & Seni',
  'Multilingual',
  'Sains Riset',
  'Keterampilan Kreatif Produktif',
] as const;

export type KelasPK = (typeof KELAS_PROGRAM_KHUSUS)[number];

export interface NilaiMapel {
  pai: number | '';
  qh: number | '';
  aa: number | '';
  fq: number | '';
  ski: number | '';
  ind: number | '';
  mat: number | '';
  ipas: number | '';
  sbk: number | '';
  bing: number | '';
  pjok: number | '';
}

export interface PemetaanItem {
  jenjangAsal: 'SD' | 'MI';
  pilihan1: string;
  pilihan2: string;
  pilihan3: string;
  pilihan4: string;
  pilihan5: string;
  nilai: NilaiMapel;
  poinPrestasi: number | '';
  kelasHasilManual?: string;
}

export interface CalonSiswaSPMB {
  id: number;
  rowNumber: number;
  nomorPendaftaran: string;
  timestamp: string;
  jalurPendaftaran: string;
  namaLengkap: string;
  nisn: string;
  jenisKelamin: string;
  asalSekolah: string;
  prestasiKeterangan: string;
  statusKelulusan: string;
  pemetaan: PemetaanItem;
}

export interface ComputedStudent extends CalonSiswaSPMB {
  genderNorm: 'L' | 'P';
  hasInput: boolean;
  nilaiAgama: number;
  poinPrestasiNum: number;
  rataRataRapor: number;
  nilaiKategori: Record<KelasPK, number>;
  skorKelas: Record<KelasPK, number>;
  assignedClass: KelasPK | '';
  assignedChoiceRank: number | null; // 1..5, or 0 for fallback, or -1 for manual
}

const KELAS_META: Record<
  KelasPK,
  { icon: string; color: string; bg: string; border: string; rumusLabel: string }
> = {
  'Agama Tahfidh': {
    icon: 'fa-quran',
    color: '#047857',
    bg: '#ecfdf5',
    border: '#a7f3d0',
    rumusLabel: 'Nilai Agama (SD: Pendidikan Agama Islam | MI: Rata-rata 4 Mapel Agama) + Poin Prestasi',
  },
  'Olahraga & Seni': {
    icon: 'fa-running',
    color: '#0369a1',
    bg: '#e0f2fe',
    border: '#bae6fd',
    rumusLabel: 'Pendidikan Jasmani, Olahraga, dan Kesehatan + Poin Prestasi',
  },
  Multilingual: {
    icon: 'fa-language',
    color: '#6d28d9',
    bg: '#f5f3ff',
    border: '#ddd6fe',
    rumusLabel: 'Rata-rata (Bahasa Indonesia + Bahasa Inggris) + Poin Prestasi',
  },
  'Sains Riset': {
    icon: 'fa-flask',
    color: '#b45309',
    bg: '#fffbeb',
    border: '#fde68a',
    rumusLabel: 'Rata-rata (Matematika + Ilmu Pengetahuan Alam dan Sosial) + Poin Prestasi',
  },
  'Keterampilan Kreatif Produktif': {
    icon: 'fa-palette',
    color: '#be185d',
    bg: '#fdf2f8',
    border: '#fbcfe8',
    rumusLabel: 'Seni Budaya dan Keterampilan + Poin Prestasi',
  },
};

function toNum(v: number | '' | string | undefined | null): number {
  if (v === '' || v === undefined || v === null) return 0;
  const n = Number(String(v).replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function normalizeKelasName(raw: string): KelasPK | '' {
  const s = (raw || '').trim().toLowerCase();
  if (!s) return '';
  for (const k of KELAS_PROGRAM_KHUSUS) {
    if (k.toLowerCase() === s) return k;
  }
  if (s.includes('agama') || s.includes('tahfid')) return 'Agama Tahfidh';
  if (s.includes('olahraga') || s.includes('seni')) return 'Olahraga & Seni';
  if (s.includes('multi') || s.includes('bahasa')) return 'Multilingual';
  if (s.includes('sains') || s.includes('riset')) return 'Sains Riset';
  if (s.includes('keterampilan') || s.includes('kreatif') || s.includes('produktif'))
    return 'Keterampilan Kreatif Produktif';
  return '';
}

function normalizeGender(jk: string): 'L' | 'P' {
  const s = (jk || '').trim().toLowerCase();
  if (s.startsWith('p') || s.includes('perempuan') || s.includes('wanita')) return 'P';
  return 'L';
}

export default function PemetaanKelasPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [students, setStudents] = useState<CalonSiswaSPMB[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirtyIds, setDirtyIds] = useState<Set<number>>(new Set());

  // Main Tabs: 'input' | 'hasil'
  const [activeTab, setActiveTab] = useState<'input' | 'hasil'>('input');

  // Pagination (Maksimal 15 baris per tabel)
  const PAGE_SIZE = 15;
  const [pageInput, setPageInput] = useState(1);
  const [pageHasil, setPageHasil] = useState(1);

  // Filters on Input Tab
  const [searchTerm, setSearchTerm] = useState('');
  const [filterJenjang, setFilterJenjang] = useState<'semua' | 'SD' | 'MI'>('semua');
  const [filterStatusInput, setFilterStatusInput] = useState<'semua' | 'sudah' | 'belum'>('semua');

  // Filters on Hasil Tab
  const [selectedKelasTab, setSelectedKelasTab] = useState<'semua' | KelasPK>('semua');
  const [onlyMapFilledStudents, setOnlyMapFilledStudents] = useState<boolean>(false);
  const [searchHasil, setSearchHasil] = useState('');

  // Reset page when filters change
  useEffect(() => {
    setPageInput(1);
  }, [searchTerm, filterJenjang, filterStatusInput]);

  useEffect(() => {
    setPageHasil(1);
  }, [selectedKelasTab, searchHasil, onlyMapFilledStudents]);

  // Modal Detail Input per Siswa
  const [editingStudentId, setEditingStudentId] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('keren_user_data');
    if (!userStr) {
      router.replace('/');
      return;
    }
    try {
      const user = JSON.parse(userStr);
      if (!user) {
        router.replace('/');
        return;
      }
      setIsAuthorized(true);
    } catch (e) {
      router.replace('/');
      return;
    }
    fetchData();
  }, [router]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/spmb/pemetaan');
      const json = await res.json();
      if (json.success) {
        setStudents(json.data || []);
        setDirtyIds(new Set());
      } else {
        Swal.fire('Gagal', json.error || 'Gagal memuat data calon siswa', 'error');
      }
    } catch (err: any) {
      Swal.fire('Error', 'Gagal menghubungi server: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Update field in local state
  const handleUpdatePemetaanField = (
    studentId: number,
    field: keyof PemetaanItem,
    value: any
  ) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id !== studentId) return s;
        const updatedPemetaan = {
          ...s.pemetaan,
          [field]: value,
        };

        const choiceFields: Array<'pilihan1' | 'pilihan2' | 'pilihan3' | 'pilihan4' | 'pilihan5'> = [
          'pilihan1',
          'pilihan2',
          'pilihan3',
          'pilihan4',
          'pilihan5',
        ];

        // Jika mengisi salah satu pilihan kelas, hapus pilihan kelas yang sama di pilihan lainnya agar tidak kembar
        if (choiceFields.includes(field as any) && value) {
          choiceFields.forEach((cf) => {
            if (cf !== field && updatedPemetaan[cf] === value) {
              updatedPemetaan[cf] = '';
            }
          });
        }

        // Auto-fill 5th choice if choices 1-4 are filled and unique
        if (
          field === 'pilihan1' ||
          field === 'pilihan2' ||
          field === 'pilihan3' ||
          field === 'pilihan4'
        ) {
          const chosen = [
            updatedPemetaan.pilihan1,
            updatedPemetaan.pilihan2,
            updatedPemetaan.pilihan3,
            updatedPemetaan.pilihan4,
          ].filter(Boolean);
          const uniqueChosen = new Set(chosen);
          if (uniqueChosen.size === 4 && !updatedPemetaan.pilihan5) {
            const remaining = KELAS_PROGRAM_KHUSUS.find((k) => !uniqueChosen.has(k));
            if (remaining) {
              updatedPemetaan.pilihan5 = remaining;
            }
          }
        }

        return {
          ...s,
          pemetaan: updatedPemetaan,
        };
      })
    );
    setDirtyIds((prev) => new Set(prev).add(studentId));
  };

  const handleUpdateNilaiField = (
    studentId: number,
    mapelKey: keyof NilaiMapel,
    rawVal: string
  ) => {
    let parsedVal: number | '' = '';
    if (rawVal.trim() !== '') {
      const num = Number(rawVal.replace(',', '.'));
      if (!isNaN(num)) {
        parsedVal = Math.min(100, Math.max(0, num));
      }
    }

    setStudents((prev) =>
      prev.map((s) => {
        if (s.id !== studentId) return s;
        return {
          ...s,
          pemetaan: {
            ...s.pemetaan,
            nilai: {
              ...s.pemetaan.nilai,
              [mapelKey]: parsedVal,
            },
          },
        };
      })
    );
    setDirtyIds((prev) => new Set(prev).add(studentId));
  };

  const handleUpdatePrestasi = (studentId: number, rawVal: string) => {
    let parsedVal: number | '' = '';
    if (rawVal.trim() !== '') {
      const num = Number(rawVal.replace(',', '.'));
      if (!isNaN(num)) {
        parsedVal = Math.max(0, num);
      }
    }
    handleUpdatePemetaanField(studentId, 'poinPrestasi', parsedVal);
  };

  // Save single student
  const handleSaveSingle = async (student: CalonSiswaSPMB, showToast = true) => {
    setSaving(true);
    try {
      const res = await fetch('/api/spmb/pemetaan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: student.id,
          pemetaan: student.pemetaan,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setDirtyIds((prev) => {
          const next = new Set(prev);
          next.delete(student.id);
          return next;
        });
        if (showToast) {
          Swal.fire({
            icon: 'success',
            title: 'Tersimpan!',
            text: `Data pemetaan ${student.namaLengkap} berhasil disimpan.`,
            timer: 1500,
            showConfirmButton: false,
          });
        }
      } else {
        Swal.fire('Gagal', json.error || 'Gagal menyimpan data', 'error');
      }
    } catch (err: any) {
      Swal.fire('Error', 'Gagal menghubungi server', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Save all modified students
  const handleSaveAllDirty = async () => {
    const toUpdate = students.filter((s) => dirtyIds.has(s.id));
    if (toUpdate.length === 0) {
      Swal.fire('Info', 'Tidak ada perubahan yang belum disimpan.', 'info');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/spmb/pemetaan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: toUpdate.map((s) => ({
            id: s.id,
            pemetaan: s.pemetaan,
          })),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setDirtyIds(new Set());
        Swal.fire({
          icon: 'success',
          title: 'Berhasil Disimpan!',
          text: `${json.updatedCount} data calon siswa berhasil diperbarui.`,
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        Swal.fire('Gagal', json.error || 'Gagal menyimpan perubahan', 'error');
      }
    } catch (err: any) {
      Swal.fire('Error', 'Gagal menghubungi server', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Compute scores and run the 5-Class Classification Algorithm
  const { computedStudents, classSummary } = useMemo(() => {
    // Step 1: Compute scores for each student
    const list: ComputedStudent[] = students.map((s) => {
      const p = s.pemetaan;
      const n = p.nilai;
      const genderNorm = normalizeGender(s.jenisKelamin);

      // Calculate Nilai Agama:
      // For SD -> Pendidikan Agama Islam
      // For MI -> Average of (Al-Qur'an Hadits + Akidah Akhlak + Fikih + Sejarah Kebudayaan Islam) / 4
      let nilaiAgama = 0;
      if (p.jenjangAsal === 'MI') {
        const qh = toNum(n.qh);
        const aa = toNum(n.aa);
        const fq = toNum(n.fq);
        const ski = toNum(n.ski);
        nilaiAgama = round2((qh + aa + fq + ski) / 4);
      } else {
        nilaiAgama = round2(toNum(n.pai));
      }

      const ind = toNum(n.ind);
      const mat = toNum(n.mat);
      const ipas = toNum(n.ipas);
      const sbk = toNum(n.sbk);
      const bing = toNum(n.bing);
      const pjok = toNum(n.pjok);
      const poinPrestasiNum = toNum(p.poinPrestasi);

      const nilaiKategori: Record<KelasPK, number> = {
        'Agama Tahfidh': nilaiAgama,
        'Olahraga & Seni': round2(pjok),
        Multilingual: round2((ind + bing) / 2),
        'Sains Riset': round2((mat + ipas) / 2),
        'Keterampilan Kreatif Produktif': round2(sbk),
      };

      const skorKelas: Record<KelasPK, number> = {
        'Agama Tahfidh': round2(nilaiKategori['Agama Tahfidh'] + poinPrestasiNum),
        'Olahraga & Seni': round2(nilaiKategori['Olahraga & Seni'] + poinPrestasiNum),
        Multilingual: round2(nilaiKategori['Multilingual'] + poinPrestasiNum),
        'Sains Riset': round2(nilaiKategori['Sains Riset'] + poinPrestasiNum),
        'Keterampilan Kreatif Produktif': round2(
          nilaiKategori['Keterampilan Kreatif Produktif'] + poinPrestasiNum
        ),
      };

      const rataRataRapor = round2((nilaiAgama + ind + mat + ipas + sbk + bing + pjok) / 7);

      const hasChoices = Boolean(
        p.pilihan1 || p.pilihan2 || p.pilihan3 || p.pilihan4 || p.pilihan5
      );
      const hasScores = [
        n.pai,
        n.qh,
        n.aa,
        n.fq,
        n.ski,
        n.ind,
        n.mat,
        n.ipas,
        n.sbk,
        n.bing,
        n.pjok,
      ].some((val) => val !== '' && val !== undefined && val !== null);

      return {
        ...s,
        genderNorm,
        hasInput: hasChoices || hasScores || Boolean(p.kelasHasilManual),
        nilaiAgama,
        poinPrestasiNum,
        rataRataRapor,
        nilaiKategori,
        skorKelas,
        assignedClass: '',
        assignedChoiceRank: null,
      };
    });

    // Step 2: Determine which students participate in the mapping pool
    const pool = onlyMapFilledStudents ? list.filter((s) => s.hasInput) : list;

    const males = pool.filter((s) => s.genderNorm === 'L');
    const females = pool.filter((s) => s.genderNorm === 'P');

    // Step 3: Calculate proportional gender quotas across the 5 classes
    // Base quota = floor(N / 5), remainder distributed to classes with highest 1st-choice demand
    const quotaL: Record<KelasPK, number> = {
      'Agama Tahfidh': 0,
      'Olahraga & Seni': 0,
      Multilingual: 0,
      'Sains Riset': 0,
      'Keterampilan Kreatif Produktif': 0,
    };
    const quotaP: Record<KelasPK, number> = {
      'Agama Tahfidh': 0,
      'Olahraga & Seni': 0,
      Multilingual: 0,
      'Sains Riset': 0,
      'Keterampilan Kreatif Produktif': 0,
    };

    const baseL = Math.floor(males.length / 5);
    const remL = males.length % 5;
    const demandL = [...KELAS_PROGRAM_KHUSUS].sort((a, b) => {
      const countA = males.filter((m) => m.pemetaan.pilihan1 === a).length;
      const countB = males.filter((m) => m.pemetaan.pilihan1 === b).length;
      return countB - countA;
    });
    const extraLClasses = new Set<KelasPK>(demandL.slice(0, remL));
    KELAS_PROGRAM_KHUSUS.forEach((k) => {
      quotaL[k] = baseL + (extraLClasses.has(k) ? 1 : 0);
    });

    const baseP = Math.floor(females.length / 5);
    const remP = females.length % 5;
    // Prioritize classes that didn't get extra L slot so total class size (L+P) stays balanced
    const demandP = [...KELAS_PROGRAM_KHUSUS].sort((a, b) => {
      const aHasExtraL = extraLClasses.has(a) ? 1 : 0;
      const bHasExtraL = extraLClasses.has(b) ? 1 : 0;
      if (aHasExtraL !== bHasExtraL) return aHasExtraL - bHasExtraL;
      const countA = females.filter((f) => f.pemetaan.pilihan1 === a).length;
      const countB = females.filter((f) => f.pemetaan.pilihan1 === b).length;
      return countB - countA;
    });
    const extraPClasses = new Set<KelasPK>(demandP.slice(0, remP));
    KELAS_PROGRAM_KHUSUS.forEach((k) => {
      quotaP[k] = baseP + (extraPClasses.has(k) ? 1 : 0);
    });

    // Step 4: Run placement per gender group
    const assignGroup = (group: ComputedStudent[], quotas: Record<KelasPK, number>) => {
      const remQuota: Record<KelasPK, number> = { ...quotas };
      const unassigned = new Set<number>(group.map((s) => s.id));
      const studentMap = new Map<number, ComputedStudent>();
      group.forEach((s) => studentMap.set(s.id, s));

      // 4A. Apply manual overrides first
      group.forEach((s) => {
        const manual = normalizeKelasName(s.pemetaan.kelasHasilManual || '');
        if (manual) {
          s.assignedClass = manual;
          s.assignedChoiceRank = -1; // Manual
          unassigned.delete(s.id);
          if (remQuota[manual] > 0) {
            remQuota[manual]--;
          }
        }
      });

      // 4B. Priority Choice Rounds: Pilihan 1 -> Pilihan 2 -> Pilihan 3 -> Pilihan 4 -> Pilihan 5
      const choiceKeys: Array<keyof PemetaanItem> = [
        'pilihan1',
        'pilihan2',
        'pilihan3',
        'pilihan4',
        'pilihan5',
      ];

      for (let roundIdx = 0; roundIdx < 5; roundIdx++) {
        const choiceKey = choiceKeys[roundIdx];
        const choiceRank = roundIdx + 1;

        for (const kelas of KELAS_PROGRAM_KHUSUS) {
          if (remQuota[kelas] <= 0) continue;

          // Find all unassigned students who chose `kelas` at `choiceKey`
          const candidates: ComputedStudent[] = [];
          unassigned.forEach((id) => {
            const st = studentMap.get(id)!;
            const chosenKelas = normalizeKelasName(String(st.pemetaan[choiceKey] || ''));
            if (chosenKelas === kelas) {
              candidates.push(st);
            }
          });

          if (candidates.length === 0) continue;

          // Sort candidates by:
          // 1. Skor Kelas (Nilai Kategori + Poin Prestasi) DESC
          // 2. Poin Prestasi DESC
          // 3. Rata-rata Rapor DESC
          // 4. ID ASC
          candidates.sort((a, b) => {
            const diffSkor = b.skorKelas[kelas] - a.skorKelas[kelas];
            if (diffSkor !== 0) return diffSkor;
            const diffPres = b.poinPrestasiNum - a.poinPrestasiNum;
            if (diffPres !== 0) return diffPres;
            const diffAvg = b.rataRataRapor - a.rataRataRapor;
            if (diffAvg !== 0) return diffAvg;
            return a.id - b.id;
          });

          const accepted = candidates.slice(0, remQuota[kelas]);
          accepted.forEach((st) => {
            st.assignedClass = kelas;
            st.assignedChoiceRank = choiceRank;
            unassigned.delete(st.id);
            remQuota[kelas]--;
          });
        }
      }

      // 4C. Fallback for any remaining unassigned students
      const remainingStudents = Array.from(unassigned).map((id) => studentMap.get(id)!);
      remainingStudents.sort((a, b) => {
        if (b.rataRataRapor !== a.rataRataRapor) return b.rataRataRapor - a.rataRataRapor;
        if (b.poinPrestasiNum !== a.poinPrestasiNum) return b.poinPrestasiNum - a.poinPrestasiNum;
        return a.id - b.id;
      });

      remainingStudents.forEach((st) => {
        // Available classes with remaining quota
        const availableClasses = KELAS_PROGRAM_KHUSUS.filter((k) => remQuota[k] > 0);
        const targetPool =
          availableClasses.length > 0 ? availableClasses : [...KELAS_PROGRAM_KHUSUS];

        // Pick class where student has the highest score
        let bestClass = targetPool[0];
        let bestScore = -1;
        targetPool.forEach((k) => {
          if (st.skorKelas[k] > bestScore) {
            bestScore = st.skorKelas[k];
            bestClass = k;
          }
        });

        st.assignedClass = bestClass;
        // Check if bestClass actually matches one of their choices
        const choices = [
          normalizeKelasName(st.pemetaan.pilihan1),
          normalizeKelasName(st.pemetaan.pilihan2),
          normalizeKelasName(st.pemetaan.pilihan3),
          normalizeKelasName(st.pemetaan.pilihan4),
          normalizeKelasName(st.pemetaan.pilihan5),
        ];
        const foundIdx = choices.indexOf(bestClass);
        st.assignedChoiceRank = foundIdx !== -1 ? foundIdx + 1 : 0;
        if (remQuota[bestClass] > 0) remQuota[bestClass]--;
      });
    };

    assignGroup(males, quotaL);
    assignGroup(females, quotaP);

    // Step 5: Build summary statistics per class
    const summary: Record<
      KelasPK,
      {
        total: number;
        laki: number;
        perempuan: number;
        quotaL: number;
        quotaP: number;
        avgSkor: number;
        pilihan1Count: number;
        pilihan2Count: number;
        pilihanLainCount: number;
      }
    > = {} as any;

    KELAS_PROGRAM_KHUSUS.forEach((k) => {
      const members = list.filter((s) => s.assignedClass === k);
      const laki = members.filter((m) => m.genderNorm === 'L').length;
      const perempuan = members.filter((m) => m.genderNorm === 'P').length;
      const sumSkor = members.reduce((acc, cur) => acc + cur.skorKelas[k], 0);
      summary[k] = {
        total: members.length,
        laki,
        perempuan,
        quotaL: quotaL[k],
        quotaP: quotaP[k],
        avgSkor: members.length > 0 ? round2(sumSkor / members.length) : 0,
        pilihan1Count: members.filter((m) => m.assignedChoiceRank === 1).length,
        pilihan2Count: members.filter((m) => m.assignedChoiceRank === 2).length,
        pilihanLainCount: members.filter(
          (m) => m.assignedChoiceRank !== 1 && m.assignedChoiceRank !== 2
        ).length,
      };
    });

    return { computedStudents: list, classSummary: summary };
  }, [students, onlyMapFilledStudents]);

  // Filtered list for Input Tab
  const filteredInputStudents = useMemo(() => {
    return computedStudents.filter((s) => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchNama = s.namaLengkap.toLowerCase().includes(q);
        const matchNo = s.nomorPendaftaran.toLowerCase().includes(q);
        const matchAsal = (s.asalSekolah || '').toLowerCase().includes(q);
        if (!matchNama && !matchNo && !matchAsal) return false;
      }
      if (filterJenjang !== 'semua' && s.pemetaan.jenjangAsal !== filterJenjang) {
        return false;
      }
      if (filterStatusInput === 'sudah' && !s.hasInput) return false;
      if (filterStatusInput === 'belum' && s.hasInput) return false;
      return true;
    });
  }, [computedStudents, searchTerm, filterJenjang, filterStatusInput]);

  // Filtered list for Hasil Tab
  const filteredHasilStudents = useMemo(() => {
    return computedStudents
      .filter((s) => {
        if (!s.assignedClass) return false;
        if (selectedKelasTab !== 'semua' && s.assignedClass !== selectedKelasTab) return false;
        if (searchHasil.trim()) {
          const q = searchHasil.toLowerCase().trim();
          const matchNama = s.namaLengkap.toLowerCase().includes(q);
          const matchNo = s.nomorPendaftaran.toLowerCase().includes(q);
          const matchAsal = (s.asalSekolah || '').toLowerCase().includes(q);
          if (!matchNama && !matchNo && !matchAsal) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.assignedClass !== b.assignedClass) {
          return (
            KELAS_PROGRAM_KHUSUS.indexOf(a.assignedClass as KelasPK) -
            KELAS_PROGRAM_KHUSUS.indexOf(b.assignedClass as KelasPK)
          );
        }
        const k = a.assignedClass as KelasPK;
        return b.skorKelas[k] - a.skorKelas[k];
      });
  }, [computedStudents, selectedKelasTab, searchHasil]);

  // Pagination calculations (Maks. 15 baris per tabel)
  const totalPagesInput = Math.max(1, Math.ceil(filteredInputStudents.length / PAGE_SIZE));
  const paginatedInputStudents = useMemo(() => {
    const start = (pageInput - 1) * PAGE_SIZE;
    return filteredInputStudents.slice(start, start + PAGE_SIZE);
  }, [filteredInputStudents, pageInput]);

  const totalPagesHasil = Math.max(1, Math.ceil(filteredHasilStudents.length / PAGE_SIZE));
  const paginatedHasilStudents = useMemo(() => {
    const start = (pageHasil - 1) * PAGE_SIZE;
    return filteredHasilStudents.slice(start, start + PAGE_SIZE);
  }, [filteredHasilStudents, pageHasil]);

  // Download Excel Template for Input
  const handleDownloadTemplate = () => {
    const rows = computedStudents.map((s, idx) => ({
      No: idx + 1,
      'ID Sistem': s.id,
      'Nomor Pendaftaran': s.nomorPendaftaran,
      'Nama Lengkap': s.namaLengkap,
      'Jenis Kelamin': s.jenisKelamin,
      'Asal Sekolah': s.asalSekolah,
      'Jenjang Asal (SD/MI)': s.pemetaan.jenjangAsal,
      'Catatan Prestasi Saat Daftar': s.prestasiKeterangan || '-',
      'Pilihan Kelas 1': s.pemetaan.pilihan1 || '',
      'Pilihan Kelas 2': s.pemetaan.pilihan2 || '',
      'Pilihan Kelas 3': s.pemetaan.pilihan3 || '',
      'Pilihan Kelas 4': s.pemetaan.pilihan4 || '',
      'Pilihan Kelas 5': s.pemetaan.pilihan5 || '',
      'Pendidikan Agama Islam (Khusus Siswa SD)': s.pemetaan.nilai.pai ?? '',
      "Al-Qur'an Hadits (Khusus Siswa MI)": s.pemetaan.nilai.qh ?? '',
      'Akidah Akhlak (Khusus Siswa MI)': s.pemetaan.nilai.aa ?? '',
      'Fikih (Khusus Siswa MI)': s.pemetaan.nilai.fq ?? '',
      'Sejarah Kebudayaan Islam (Khusus Siswa MI)': s.pemetaan.nilai.ski ?? '',
      'Bahasa Indonesia': s.pemetaan.nilai.ind ?? '',
      Matematika: s.pemetaan.nilai.mat ?? '',
      'Ilmu Pengetahuan Alam dan Sosial': s.pemetaan.nilai.ipas ?? '',
      'Seni Budaya dan Keterampilan': s.pemetaan.nilai.sbk ?? '',
      'Bahasa Inggris': s.pemetaan.nilai.bing ?? '',
      'Pendidikan Jasmani, Olahraga, dan Kesehatan': s.pemetaan.nilai.pjok ?? '',
      'Poin Prestasi': s.pemetaan.poinPrestasi ?? '',
    }));

    const panduanRows = [
      { Kategori: 'DAFTAR NAMA KELAS PROGRAM KHUSUS (Salin persis untuk Pilihan Kelas 1 - 5)', Keterangan: '' },
      { Kategori: '1. Agama Tahfidh', Keterangan: 'Kategori Nilai: Nilai Agama + Poin Prestasi' },
      { Kategori: '2. Olahraga & Seni', Keterangan: 'Kategori Nilai: Pendidikan Jasmani, Olahraga, dan Kesehatan + Poin Prestasi' },
      { Kategori: '3. Multilingual', Keterangan: 'Kategori Nilai: Rata-rata (Bahasa Indonesia + Bahasa Inggris) + Poin Prestasi' },
      { Kategori: '4. Sains Riset', Keterangan: 'Kategori Nilai: Rata-rata (Matematika + Ilmu Pengetahuan Alam dan Sosial) + Poin Prestasi' },
      { Kategori: '5. Keterampilan Kreatif Produktif', Keterangan: 'Kategori Nilai: Seni Budaya dan Keterampilan + Poin Prestasi' },
      { Kategori: '', Keterangan: '' },
      { Kategori: 'ATURAN POIN PRESTASI (Cukup Isi Total Skor Angka, Bisa Akumulasi > 5)', Keterangan: '' },
      { Kategori: '5', Keterangan: 'Tingkat Internasional' },
      { Kategori: '4', Keterangan: 'Tingkat Nasional' },
      { Kategori: '3', Keterangan: 'Tingkat Provinsi' },
      { Kategori: '2', Keterangan: 'Tingkat Kabupaten / Kota' },
      { Kategori: '1', Keterangan: 'Tingkat Kecamatan' },
      { Kategori: '0', Keterangan: 'Tidak Ada Prestasi' },
      { Kategori: '', Keterangan: '' },
      { Kategori: 'ATURAN NILAI AGAMA SD vs MI', Keterangan: '' },
      { Kategori: 'Siswa SD', Keterangan: 'Cukup isi kolom "Pendidikan Agama Islam (Khusus Siswa SD)"' },
      { Kategori: 'Siswa MI', Keterangan: 'Isi 4 kolom: Al-Qur\'an Hadits, Akidah Akhlak, Fikih, dan Sejarah Kebudayaan Islam (Sistem otomatis merata-rata)' },
    ];

    const wb = XLSX.utils.book_new();
    const wsData = XLSX.utils.json_to_sheet(rows);
    const wsPanduan = XLSX.utils.json_to_sheet(panduanRows);

    XLSX.utils.book_append_sheet(wb, wsData, 'Input Pemetaan SPMB');
    XLSX.utils.book_append_sheet(wb, wsPanduan, 'Panduan Pengisian');

    XLSX.writeFile(wb, 'Template_Input_Pemetaan_Kelas_SPMB.xlsx');
  };

  // Upload / Import Excel Template
  const handleUploadExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const dataBuffer = await file.arrayBuffer();
      const wb = XLSX.read(dataBuffer, { type: 'array' });
      const sheetName = wb.SheetNames[0];
      const sheet = wb.Sheets[sheetName];
      const jsonRows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (jsonRows.length === 0) {
        Swal.fire('Kosong', 'File Excel yang diunggah tidak berisi data.', 'warning');
        return;
      }

      const parseCellScore = (val: any): number | '' => {
        if (val === '' || val === null || val === undefined) return '';
        const n = Number(String(val).replace(',', '.'));
        return isNaN(n) ? '' : Math.min(100, Math.max(0, n));
      };

      const parseCellPrestasi = (val: any): number | '' => {
        if (val === '' || val === null || val === undefined) return '';
        const n = Number(String(val).replace(',', '.'));
        return isNaN(n) ? '' : Math.max(0, n);
      };

      const updates: Array<{ id: number; pemetaan: PemetaanItem }> = [];

      jsonRows.forEach((row) => {
        const idSistem = Number(row['ID Sistem'] || 0);
        const noReg = String(row['Nomor Pendaftaran'] || '').trim();
        const nama = String(row['Nama Lengkap'] || '').trim().toLowerCase();

        const targetStudent =
          students.find((s) => s.id === idSistem) ||
          students.find((s) => s.nomorPendaftaran === noReg) ||
          students.find((s) => s.namaLengkap.trim().toLowerCase() === nama);

        if (!targetStudent) return;

        const rawJenjang = String(row['Jenjang Asal (SD/MI)'] || '')
          .trim()
          .toUpperCase();
        const jenjangAsal: 'SD' | 'MI' =
          rawJenjang === 'MI'
            ? 'MI'
            : rawJenjang === 'SD'
            ? 'SD'
            : targetStudent.pemetaan.jenjangAsal;

        const p1 = normalizeKelasName(String(row['Pilihan Kelas 1'] || ''));
        const p2 = normalizeKelasName(String(row['Pilihan Kelas 2'] || ''));
        const p3 = normalizeKelasName(String(row['Pilihan Kelas 3'] || ''));
        const p4 = normalizeKelasName(String(row['Pilihan Kelas 4'] || ''));
        let p5 = normalizeKelasName(String(row['Pilihan Kelas 5'] || ''));

        const chosen4 = new Set([p1, p2, p3, p4].filter(Boolean));
        if (chosen4.size === 4 && !p5) {
          const rem = KELAS_PROGRAM_KHUSUS.find((k) => !chosen4.has(k));
          if (rem) p5 = rem;
        }

        const rawPrestasi =
          row['Poin Prestasi'] !== undefined && row['Poin Prestasi'] !== ''
            ? row['Poin Prestasi']
            : row['Poin Prestasi (0-5)'];

        const newPemetaan: PemetaanItem = {
          ...targetStudent.pemetaan,
          jenjangAsal,
          pilihan1: p1,
          pilihan2: p2,
          pilihan3: p3,
          pilihan4: p4,
          pilihan5: p5,
          nilai: {
            pai: parseCellScore(row['Pendidikan Agama Islam (Khusus Siswa SD)']),
            qh: parseCellScore(row["Al-Qur'an Hadits (Khusus Siswa MI)"]),
            aa: parseCellScore(row['Akidah Akhlak (Khusus Siswa MI)']),
            fq: parseCellScore(row['Fikih (Khusus Siswa MI)']),
            ski: parseCellScore(row['Sejarah Kebudayaan Islam (Khusus Siswa MI)']),
            ind: parseCellScore(row['Bahasa Indonesia']),
            mat: parseCellScore(row['Matematika']),
            ipas: parseCellScore(row['Ilmu Pengetahuan Alam dan Sosial']),
            sbk: parseCellScore(row['Seni Budaya dan Keterampilan']),
            bing: parseCellScore(row['Bahasa Inggris']),
            pjok: parseCellScore(row['Pendidikan Jasmani, Olahraga, dan Kesehatan']),
          },
          poinPrestasi: parseCellPrestasi(rawPrestasi),
        };

        updates.push({ id: targetStudent.id, pemetaan: newPemetaan });
      });

      if (updates.length === 0) {
        Swal.fire(
          'Tidak Cocok',
          'Tidak ditemukan data calon siswa yang cocok dengan isi file Excel.',
          'warning'
        );
        return;
      }

      Swal.fire({
        title: 'Menyimpan Data Excel...',
        text: `Memproses ${updates.length} data calon siswa...`,
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      const res = await fetch('/api/spmb/pemetaan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });
      const resJson = await res.json();

      if (resJson.success) {
        await fetchData();
        Swal.fire({
          icon: 'success',
          title: 'Import Berhasil!',
          text: `Berhasil mengimpor dan menyimpan data pemetaan untuk ${resJson.updatedCount} calon siswa.`,
        });
      } else {
        Swal.fire('Gagal', resJson.error || 'Gagal menyimpan data import', 'error');
      }
    } catch (err: any) {
      Swal.fire('Error', 'Gagal membaca file Excel: ' + err.message, 'error');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Export Final Classification Results to Excel
  const handleExportHasilExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Semua Siswa
    const allRows = computedStudents.map((s, idx) => {
      const k = s.assignedClass as KelasPK;
      return {
        No: idx + 1,
        'Nomor Pendaftaran': s.nomorPendaftaran,
        'Nama Lengkap': s.namaLengkap,
        'Jenis Kelamin': s.jenisKelamin,
        'Asal Sekolah': s.asalSekolah,
        Jenjang: s.pemetaan.jenjangAsal,
        'Kelas Hasil Pemetaan': s.assignedClass || 'Belum Dipetakan',
        'Diterima Pada Pilihan':
          s.assignedChoiceRank === -1
            ? 'Manual Override'
            : s.assignedChoiceRank && s.assignedChoiceRank > 0
            ? `Pilihan ${s.assignedChoiceRank}`
            : 'Penempatan Kuota Optimum',
        'Skor Kelas Diterima': k ? s.skorKelas[k] : 0,
        'Poin Prestasi': s.poinPrestasiNum,
        'Pilihan Kelas 1': s.pemetaan.pilihan1 || '-',
        'Pilihan Kelas 2': s.pemetaan.pilihan2 || '-',
        'Pilihan Kelas 3': s.pemetaan.pilihan3 || '-',
        'Pilihan Kelas 4': s.pemetaan.pilihan4 || '-',
        'Pilihan Kelas 5': s.pemetaan.pilihan5 || '-',
        'Nilai Agama (Konversi SD/MI)': s.nilaiAgama,
        'Bahasa Indonesia': toNum(s.pemetaan.nilai.ind),
        Matematika: toNum(s.pemetaan.nilai.mat),
        'Ilmu Pengetahuan Alam dan Sosial': toNum(s.pemetaan.nilai.ipas),
        'Seni Budaya dan Keterampilan': toNum(s.pemetaan.nilai.sbk),
        'Bahasa Inggris': toNum(s.pemetaan.nilai.bing),
        'Pendidikan Jasmani, Olahraga, dan Kesehatan': toNum(s.pemetaan.nilai.pjok),
        'Skor Agama Tahfidh': s.skorKelas['Agama Tahfidh'],
        'Skor Olahraga & Seni': s.skorKelas['Olahraga & Seni'],
        'Skor Multilingual': s.skorKelas['Multilingual'],
        'Skor Sains Riset': s.skorKelas['Sains Riset'],
        'Skor Keterampilan Kreatif Produktif': s.skorKelas['Keterampilan Kreatif Produktif'],
      };
    });

    const wsAll = XLSX.utils.json_to_sheet(allRows);
    XLSX.utils.book_append_sheet(wb, wsAll, 'Rekap Seluruh Siswa');

    // Sheet per Kelas Program Khusus
    KELAS_PROGRAM_KHUSUS.forEach((kelasName) => {
      const members = computedStudents
        .filter((s) => s.assignedClass === kelasName)
        .sort((a, b) => b.skorKelas[kelasName] - a.skorKelas[kelasName]);

      const classRows = members.map((s, idx) => ({
        Peringkat: idx + 1,
        'Nomor Pendaftaran': s.nomorPendaftaran,
        'Nama Lengkap': s.namaLengkap,
        'Jenis Kelamin': s.jenisKelamin,
        'Asal Sekolah': s.asalSekolah,
        Jenjang: s.pemetaan.jenjangAsal,
        'Kelas Program Khusus': kelasName,
        'Status Pilihan':
          s.assignedChoiceRank === -1
            ? 'Manual'
            : s.assignedChoiceRank && s.assignedChoiceRank > 0
            ? `Pilihan Ke-${s.assignedChoiceRank}`
            : 'Distribusi Kuota',
        'Nilai Kategori Mapel': s.nilaiKategori[kelasName],
        'Poin Prestasi': s.poinPrestasiNum,
        'Total Skor Akhir': s.skorKelas[kelasName],
      }));

      const wsClass = XLSX.utils.json_to_sheet(
        classRows.length > 0
          ? classRows
          : [{ Info: `Belum ada siswa di kelas ${kelasName}` }]
      );
      const safeSheetName = kelasName.slice(0, 30);
      XLSX.utils.book_append_sheet(wb, wsClass, safeSheetName);
    });

    XLSX.writeFile(wb, 'Hasil_Pemetaan_Kelas_Program_Khusus_SPMB.xlsx');
  };

  const editingStudent = useMemo(
    () => computedStudents.find((s) => s.id === editingStudentId) || null,
    [computedStudents, editingStudentId]
  );

  const totalLaki = computedStudents.filter((s) => s.genderNorm === 'L').length;
  const totalPerempuan = computedStudents.filter((s) => s.genderNorm === 'P').length;
  const totalSudahIsi = computedStudents.filter((s) => s.hasInput).length;

  if (!isAuthorized) {
    return <LoadingScreen message="Memverifikasi hak akses..." />;
  }

  return (
    <div className={styles.container}>
      {/* Hidden File Input for Excel Import */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".xlsx,.xls"
        style={{ display: 'none' }}
        onChange={handleUploadExcel}
      />

      {/* Header */}
      <div className={styles.header} style={{ flexWrap: 'wrap', gap: '16px' }}>
        <div className={styles.title}>
          <div className={styles.titleIcon}>
            <i className="fas fa-layer-group"></i>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span>Pemetaan Kelas SPMB (Program Khusus)</span>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexWrap: 'wrap',
                marginTop: '4px',
              }}
            >
              <span
                style={{
                  fontSize: '0.78rem',
                  background: '#f1f5f9',
                  color: '#334155',
                  padding: '2px 10px',
                  borderRadius: '12px',
                  fontWeight: 700,
                }}
              >
                Total Calon Siswa: {students.length}
              </span>
              <span
                style={{
                  fontSize: '0.78rem',
                  background: '#dbeafe',
                  color: '#1d4ed8',
                  padding: '2px 10px',
                  borderRadius: '12px',
                  fontWeight: 700,
                }}
              >
                Laki-laki: {totalLaki}
              </span>
              <span
                style={{
                  fontSize: '0.78rem',
                  background: '#fce7f3',
                  color: '#be185d',
                  padding: '2px 10px',
                  borderRadius: '12px',
                  fontWeight: 700,
                }}
              >
                Perempuan: {totalPerempuan}
              </span>
              <span
                style={{
                  fontSize: '0.78rem',
                  background: '#dcfce7',
                  color: '#15803d',
                  padding: '2px 10px',
                  borderRadius: '12px',
                  fontWeight: 700,
                }}
              >
                Sudah Diisi: {totalSudahIsi} / {students.length}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {dirtyIds.size > 0 && (
            <button
              type="button"
              onClick={handleSaveAllDirty}
              disabled={saving}
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: 'white',
                border: 'none',
                padding: '9px 16px',
                borderRadius: '10px',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 6px rgba(217, 119, 6, 0.3)',
              }}
            >
              <i className="fas fa-save"></i> Simpan Perubahan ({dirtyIds.size})
            </button>
          )}

          <button
            type="button"
            onClick={handleDownloadTemplate}
            style={{
              background: '#0284c7',
              color: 'white',
              border: 'none',
              padding: '9px 15px',
              borderRadius: '10px',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <i className="fas fa-file-download"></i> Template Excel
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              background: '#7c3aed',
              color: 'white',
              border: 'none',
              padding: '9px 15px',
              borderRadius: '10px',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <i className="fas fa-file-upload"></i> Import Excel
          </button>

          <button
            type="button"
            onClick={handleExportHasilExcel}
            style={{
              background: '#059669',
              color: 'white',
              border: 'none',
              padding: '9px 15px',
              borderRadius: '10px',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <i className="fas fa-file-excel"></i> Export Hasil Pemetaan
          </button>

          <Link
            href="/spmb/rekap"
            style={{
              background: '#f1f5f9',
              color: '#334155',
              border: '1px solid #cbd5e1',
              padding: '8px 14px',
              borderRadius: '10px',
              fontSize: '0.84rem',
              fontWeight: 700,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <i className="fas fa-arrow-left"></i> Rekap SPMB
          </Link>
        </div>
      </div>

      {/* Sub-menu Tabs SPMB */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '20px',
        borderBottom: '2px solid #e2e8f0',
        paddingBottom: '2px',
        overflowX: 'auto'
      }}>
        <Link
          href="/spmb/rekap"
          style={{
            padding: '10px 18px',
            fontSize: '0.92rem',
            fontWeight: 600,
            color: '#64748b',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap'
          }}
        >
          <i className="fas fa-list-alt"></i> Rekap Tabel Data Siswa
        </Link>
        <Link
          href="/spmb/pemantauan"
          style={{
            padding: '10px 18px',
            fontSize: '0.92rem',
            fontWeight: 600,
            color: '#64748b',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap'
          }}
        >
          <i className="fas fa-chart-pie"></i> Pemantauan Input &amp; Asal SD/MI
        </Link>
        <div
          style={{
            padding: '10px 18px',
            fontSize: '0.92rem',
            fontWeight: 700,
            color: '#059669',
            borderBottom: '3px solid #059669',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap',
            cursor: 'default'
          }}
        >
          <i className="fas fa-layer-group"></i> Pemetaan Kelas
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '10px',
          marginBottom: '20px',
          borderBottom: '2px solid #e2e8f0',
          paddingBottom: '10px',
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('input')}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            border: activeTab === 'input' ? 'none' : '1px solid #cbd5e1',
            background:
              activeTab === 'input'
                ? 'linear-gradient(135deg, #047857 0%, #059669 100%)'
                : 'white',
            color: activeTab === 'input' ? 'white' : '#475569',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: activeTab === 'input' ? '0 4px 10px rgba(4, 120, 87, 0.2)' : 'none',
          }}
        >
          <i className="fas fa-edit"></i> 1. Input Pilihan Peminatan & Nilai Rapor
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('hasil')}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            border: activeTab === 'hasil' ? 'none' : '1px solid #cbd5e1',
            background:
              activeTab === 'hasil'
                ? 'linear-gradient(135deg, #047857 0%, #059669 100%)'
                : 'white',
            color: activeTab === 'hasil' ? 'white' : '#475569',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: activeTab === 'hasil' ? '0 4px 10px rgba(4, 120, 87, 0.2)' : 'none',
          }}
        >
          <i className="fas fa-sitemap"></i> 2. Hasil Klasifikasi 5 Kelas Program Khusus
        </button>
      </div>

      {loading ? (
        <div className={styles.loadingState}>
          <i className={`fas fa-spinner ${styles.loadingSpinner}`}></i>
          Memuat data calon siswa SPMB...
        </div>
      ) : activeTab === 'input' ? (
        /* ==================== TAB 1: INPUT PILIHAN & NILAI ==================== */
        <>
          {/* Panduan Singkat Bar */}
          <div
            style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '16px',
              fontSize: '12.5px',
              color: '#166534',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '16px',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <b>Panduan Pengisian:</b> Pilih <b>Jenjang (SD/MI)</b>, urutkan{' '}
              <b>Pilihan Kelas 1 s/d 5</b>, masukkan nilai mata pelajaran (untuk siswa <b>MI</b>, 4
              mapel agama otomatis dirata-rata), dan isi <b>Poin Prestasi</b> dalam angka:{' '}
              <span
                style={{
                  background: '#dcfce7',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontWeight: 700,
                }}
              >
                5 = Internasional | 4 = Nasional | 3 = Provinsi | 2 = Kabupaten/Kota | 1 = Kecamatan
                | 0 = Tidak Ada
              </span>
            </div>
          </div>

          {/* Filter Bar */}
          <div
            style={{
              background: 'white',
              borderRadius: '14px',
              padding: '14px 18px',
              marginBottom: '16px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              alignItems: 'center',
            }}
          >
            <div style={{ flex: '1 1 260px', position: 'relative' }}>
              <i
                className="fas fa-search"
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                }}
              ></i>
              <input
                type="text"
                placeholder="Cari nama calon siswa, nomor pendaftaran, atau asal sekolah..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 34px',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <select
              value={filterJenjang}
              onChange={(e) => setFilterJenjang(e.target.value as any)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1.5px solid #cbd5e1',
                fontSize: '13px',
                fontWeight: 600,
                color: '#334155',
                cursor: 'pointer',
              }}
            >
              <option value="semua">Semua Jenjang (SD & MI)</option>
              <option value="SD">Khusus Siswa SD</option>
              <option value="MI">Khusus Siswa MI</option>
            </select>

            <select
              value={filterStatusInput}
              onChange={(e) => setFilterStatusInput(e.target.value as any)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1.5px solid #cbd5e1',
                fontSize: '13px',
                fontWeight: 600,
                color: '#334155',
                cursor: 'pointer',
              }}
            >
              <option value="semua">Semua Status Input</option>
              <option value="sudah">Sudah Diisi ({totalSudahIsi})</option>
              <option value="belum">Belum Diisi ({students.length - totalSudahIsi})</option>
            </select>

            <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#475569' }}>
              Menampilkan {filteredInputStudents.length} dari {students.length} siswa
            </span>
          </div>

          {/* Input Table */}
          <div className={styles.card}>
            <div
              className={styles.tableContainer}
              style={{
                maxHeight: '72vh',
                overflow: 'auto',
                position: 'relative',
              }}
            >
              <table
                className={styles.table}
                style={{
                  minWidth: '1650px',
                  borderCollapse: 'separate',
                  borderSpacing: 0,
                }}
              >
                <thead>
                  <tr>
                    <th
                      style={{
                        position: 'sticky',
                        top: 0,
                        zIndex: 15,
                        width: '38px',
                        minWidth: '38px',
                        textAlign: 'center',
                        padding: '10px 4px',
                        fontSize: '11px',
                        background: '#f8fafc',
                        boxShadow: 'inset 0 -2px 0 #cbd5e1',
                      }}
                    >
                      No
                    </th>
                    <th
                      style={{
                        position: 'sticky',
                        top: 0,
                        left: 0,
                        zIndex: 25,
                        background: '#f8fafc',
                        minWidth: '205px',
                        maxWidth: '215px',
                        whiteSpace: 'normal',
                        lineHeight: 1.25,
                        verticalAlign: 'middle',
                        padding: '10px 10px',
                        fontSize: '11.5px',
                        boxShadow: '2px 0 5px rgba(0,0,0,0.06), inset 0 -2px 0 #cbd5e1',
                      }}
                    >
                      Nama Calon Siswa & Asal Sekolah
                    </th>
                    <th
                      style={{
                        position: 'sticky',
                        top: 0,
                        zIndex: 15,
                        width: '68px',
                        minWidth: '68px',
                        maxWidth: '72px',
                        textAlign: 'center',
                        whiteSpace: 'normal',
                        lineHeight: 1.2,
                        verticalAlign: 'middle',
                        padding: '8px 4px',
                        fontSize: '11px',
                        background: '#f8fafc',
                        boxShadow: 'inset 0 -2px 0 #cbd5e1',
                      }}
                    >
                      Jenjang Asal
                    </th>
                    {[1, 2, 3, 4, 5].map((num) => (
                      <th
                        key={num}
                        style={{
                          position: 'sticky',
                          top: 0,
                          zIndex: 15,
                          minWidth: '138px',
                          width: '138px',
                          background: '#f0fdf4',
                          color: '#047857',
                          whiteSpace: 'normal',
                          lineHeight: 1.2,
                          verticalAlign: 'middle',
                          textAlign: 'center',
                          padding: '8px 6px',
                          fontSize: '11px',
                          boxShadow: 'inset 0 -2px 0 #a7f3d0',
                        }}
                      >
                        Pilihan Kelas {num}
                      </th>
                    ))}
                    <th
                      style={{
                        position: 'sticky',
                        top: 0,
                        zIndex: 15,
                        width: '84px',
                        minWidth: '84px',
                        maxWidth: '88px',
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        whiteSpace: 'normal',
                        wordBreak: 'break-word',
                        lineHeight: 1.2,
                        verticalAlign: 'middle',
                        textAlign: 'center',
                        padding: '8px 5px',
                        fontSize: '10.5px',
                        boxShadow: 'inset 0 -2px 0 #bfdbfe',
                      }}
                    >
                      Pendidikan Agama Islam
                      <div style={{ fontSize: '9.5px', fontWeight: 600, textTransform: 'none', marginTop: '2px' }}>
                        (Khusus Siswa SD)
                      </div>
                    </th>
                    <th
                      style={{
                        position: 'sticky',
                        top: 0,
                        zIndex: 15,
                        width: '82px',
                        minWidth: '82px',
                        maxWidth: '86px',
                        background: '#fefce8',
                        color: '#a16207',
                        whiteSpace: 'normal',
                        wordBreak: 'break-word',
                        lineHeight: 1.2,
                        verticalAlign: 'middle',
                        textAlign: 'center',
                        padding: '8px 5px',
                        fontSize: '10.5px',
                        boxShadow: 'inset 0 -2px 0 #fde68a',
                      }}
                    >
                      Al-Qur&apos;an Hadits
                      <div style={{ fontSize: '9.5px', fontWeight: 600, textTransform: 'none', marginTop: '2px' }}>
                        (Khusus Siswa MI)
                      </div>
                    </th>
                    <th
                      style={{
                        position: 'sticky',
                        top: 0,
                        zIndex: 15,
                        width: '82px',
                        minWidth: '82px',
                        maxWidth: '86px',
                        background: '#fefce8',
                        color: '#a16207',
                        whiteSpace: 'normal',
                        wordBreak: 'break-word',
                        lineHeight: 1.2,
                        verticalAlign: 'middle',
                        textAlign: 'center',
                        padding: '8px 5px',
                        fontSize: '10.5px',
                        boxShadow: 'inset 0 -2px 0 #fde68a',
                      }}
                    >
                      Akidah Akhlak
                      <div style={{ fontSize: '9.5px', fontWeight: 600, textTransform: 'none', marginTop: '2px' }}>
                        (Khusus Siswa MI)
                      </div>
                    </th>
                    <th
                      style={{
                        position: 'sticky',
                        top: 0,
                        zIndex: 15,
                        width: '78px',
                        minWidth: '78px',
                        maxWidth: '82px',
                        background: '#fefce8',
                        color: '#a16207',
                        whiteSpace: 'normal',
                        wordBreak: 'break-word',
                        lineHeight: 1.2,
                        verticalAlign: 'middle',
                        textAlign: 'center',
                        padding: '8px 5px',
                        fontSize: '10.5px',
                        boxShadow: 'inset 0 -2px 0 #fde68a',
                      }}
                    >
                      Fikih
                      <div style={{ fontSize: '9.5px', fontWeight: 600, textTransform: 'none', marginTop: '2px' }}>
                        (Khusus Siswa MI)
                      </div>
                    </th>
                    <th
                      style={{
                        position: 'sticky',
                        top: 0,
                        zIndex: 15,
                        width: '88px',
                        minWidth: '88px',
                        maxWidth: '92px',
                        background: '#fefce8',
                        color: '#a16207',
                        whiteSpace: 'normal',
                        wordBreak: 'break-word',
                        lineHeight: 1.2,
                        verticalAlign: 'middle',
                        textAlign: 'center',
                        padding: '8px 5px',
                        fontSize: '10.5px',
                        boxShadow: 'inset 0 -2px 0 #fde68a',
                      }}
                    >
                      Sejarah Kebudayaan Islam
                      <div style={{ fontSize: '9.5px', fontWeight: 600, textTransform: 'none', marginTop: '2px' }}>
                        (Khusus Siswa MI)
                      </div>
                    </th>
                    <th
                      style={{
                        position: 'sticky',
                        top: 0,
                        zIndex: 15,
                        width: '82px',
                        minWidth: '82px',
                        maxWidth: '86px',
                        background: '#ecfdf5',
                        color: '#047857',
                        whiteSpace: 'normal',
                        wordBreak: 'break-word',
                        lineHeight: 1.2,
                        verticalAlign: 'middle',
                        textAlign: 'center',
                        padding: '8px 5px',
                        fontSize: '10.5px',
                        boxShadow: 'inset 0 -2px 0 #a7f3d0',
                      }}
                    >
                      Nilai Agama Akhir
                      <div style={{ fontSize: '9.5px', fontWeight: 600, textTransform: 'none', marginTop: '2px' }}>
                        (SD / Rata-rata MI)
                      </div>
                    </th>
                    {[
                      'Bahasa Indonesia',
                      'Matematika',
                      'Ilmu Pengetahuan Alam dan Sosial',
                      'Seni Budaya dan Keterampilan',
                      'Bahasa Inggris',
                      'Pendidikan Jasmani, Olahraga, dan Kesehatan',
                    ].map((mapelLabel) => (
                      <th
                        key={mapelLabel}
                        style={{
                          position: 'sticky',
                          top: 0,
                          zIndex: 15,
                          width: '84px',
                          minWidth: '84px',
                          maxWidth: '90px',
                          background: '#f8fafc',
                          whiteSpace: 'normal',
                          wordBreak: 'break-word',
                          lineHeight: 1.2,
                          verticalAlign: 'middle',
                          textAlign: 'center',
                          padding: '8px 5px',
                          fontSize: '10.5px',
                          boxShadow: 'inset 0 -2px 0 #cbd5e1',
                        }}
                      >
                        {mapelLabel}
                      </th>
                    ))}
                    <th
                      style={{
                        position: 'sticky',
                        top: 0,
                        zIndex: 15,
                        width: '82px',
                        minWidth: '82px',
                        maxWidth: '88px',
                        background: '#fdf2f8',
                        color: '#be185d',
                        whiteSpace: 'normal',
                        wordBreak: 'break-word',
                        lineHeight: 1.2,
                        verticalAlign: 'middle',
                        textAlign: 'center',
                        padding: '8px 5px',
                        fontSize: '10.5px',
                        boxShadow: 'inset 0 -2px 0 #fbcfe8',
                      }}
                    >
                      Poin Prestasi
                      <div style={{ fontSize: '9.5px', fontWeight: 600, textTransform: 'none', marginTop: '2px' }}>
                        (Total Skor Angka)
                      </div>
                    </th>
                    <th
                      style={{
                        position: 'sticky',
                        top: 0,
                        zIndex: 15,
                        minWidth: '140px',
                        width: '140px',
                        textAlign: 'center',
                        whiteSpace: 'normal',
                        lineHeight: 1.2,
                        verticalAlign: 'middle',
                        padding: '8px 6px',
                        fontSize: '11px',
                        background: '#f8fafc',
                        boxShadow: 'inset 0 -2px 0 #cbd5e1',
                      }}
                    >
                      Hasil Kelas & Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedInputStudents.map((s, idx) => {
                    const isMI = s.pemetaan.jenjangAsal === 'MI';
                    const isDirty = dirtyIds.has(s.id);
                    const rowNumber = (pageInput - 1) * PAGE_SIZE + idx + 1;
                    return (
                      <tr
                        key={s.id}
                        style={{
                          background: isDirty ? '#fffbeb' : undefined,
                        }}
                      >
                        <td style={{ textAlign: 'center', fontWeight: 700, color: '#64748b', padding: '8px 4px' }}>
                          {rowNumber}
                        </td>

                        {/* Sticky Name Cell */}
                        <td
                          style={{
                            position: 'sticky',
                            left: 0,
                            zIndex: 5,
                            background: isDirty ? '#fffbeb' : 'white',
                            boxShadow: '2px 0 5px rgba(0,0,0,0.04)',
                            padding: '8px 10px',
                            minWidth: '205px',
                            maxWidth: '215px',
                          }}
                        >
                          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px', lineHeight: 1.3 }}>
                            {s.namaLengkap}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                            <span
                              style={{
                                fontSize: '10.5px',
                                fontWeight: 700,
                                padding: '1px 6px',
                                borderRadius: '4px',
                                background: s.genderNorm === 'L' ? '#dbeafe' : '#fce7f3',
                                color: s.genderNorm === 'L' ? '#1d4ed8' : '#be185d',
                              }}
                            >
                              {s.genderNorm === 'L' ? 'Laki-laki' : 'Perempuan'}
                            </span>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>
                              {s.asalSekolah || '-'}
                            </span>
                          </div>
                        </td>

                        {/* Jenjang SD / MI */}
                        <td style={{ textAlign: 'center', padding: '8px 4px' }}>
                          <select
                            value={s.pemetaan.jenjangAsal}
                            onChange={(e) =>
                              handleUpdatePemetaanField(
                                s.id,
                                'jenjangAsal',
                                e.target.value as 'SD' | 'MI'
                              )
                            }
                            style={{
                              padding: '5px 6px',
                              borderRadius: '6px',
                              fontWeight: 800,
                              fontSize: '11.5px',
                              border: '1.5px solid',
                              borderColor: isMI ? '#fde047' : '#93c5fd',
                              background: isMI ? '#fef9c3' : '#dbeafe',
                              color: isMI ? '#854d0e' : '#1e40af',
                              cursor: 'pointer',
                            }}
                          >
                            <option value="SD">SD</option>
                            <option value="MI">MI</option>
                          </select>
                        </td>

                        {/* Pilihan 1 - 5 (Pilihan yang sudah dipilih di nomor lain otomatis hilang dari opsi) */}
                        {(['pilihan1', 'pilihan2', 'pilihan3', 'pilihan4', 'pilihan5'] as const).map(
                          (pilKey, pIdx) => {
                            const otherChosen = new Set(
                              (['pilihan1', 'pilihan2', 'pilihan3', 'pilihan4', 'pilihan5'] as const)
                                .filter((k) => k !== pilKey)
                                .map((k) => s.pemetaan[k])
                                .filter(Boolean)
                            );
                            const availableOptions = KELAS_PROGRAM_KHUSUS.filter(
                              (k) => !otherChosen.has(k) || k === s.pemetaan[pilKey]
                            );
                            return (
                              <td key={pilKey} style={{ padding: '8px 5px' }}>
                                <select
                                  value={s.pemetaan[pilKey] || ''}
                                  onChange={(e) =>
                                    handleUpdatePemetaanField(s.id, pilKey, e.target.value)
                                  }
                                  style={{
                                    width: '100%',
                                    padding: '5px 6px',
                                    borderRadius: '6px',
                                    border: '1.5px solid #cbd5e1',
                                    fontSize: '11.5px',
                                    fontWeight: s.pemetaan[pilKey] ? 700 : 400,
                                    color: s.pemetaan[pilKey] ? '#0f172a' : '#94a3b8',
                                    background: s.pemetaan[pilKey] ? '#f8fafc' : 'white',
                                  }}
                                >
                                  <option value="">-- Pilihan {pIdx + 1} --</option>
                                  {availableOptions.map((k) => (
                                    <option key={k} value={k}>
                                      {k}
                                    </option>
                                  ))}
                                </select>
                              </td>
                            );
                          }
                        )}

                        {/* Pendidikan Agama Islam (Khusus SD) */}
                        <td style={{ background: isMI ? '#f8fafc' : '#eff6ff', textAlign: 'center', padding: '8px 4px' }}>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            disabled={isMI}
                            placeholder={isMI ? 'MI' : '0-100'}
                            value={isMI ? '' : s.pemetaan.nilai.pai}
                            onChange={(e) => handleUpdateNilaiField(s.id, 'pai', e.target.value)}
                            style={{
                              width: '66px',
                              padding: '5px 4px',
                              borderRadius: '6px',
                              border: '1.5px solid #cbd5e1',
                              fontSize: '12.5px',
                              fontWeight: 700,
                              textAlign: 'center',
                              background: isMI ? '#e2e8f0' : 'white',
                              color: isMI ? '#94a3b8' : '#0f172a',
                            }}
                          />
                        </td>

                        {/* 4 Mapel Agama MI: Al-Qur'an Hadits, Akidah Akhlak, Fikih, Sejarah Kebudayaan Islam */}
                        {(['qh', 'aa', 'fq', 'ski'] as const).map((mKey) => (
                          <td
                            key={mKey}
                            style={{ background: !isMI ? '#f8fafc' : '#fefce8', textAlign: 'center', padding: '8px 4px' }}
                          >
                            <input
                              type="number"
                              min={0}
                              max={100}
                              disabled={!isMI}
                              placeholder={!isMI ? 'SD' : '0-100'}
                              value={!isMI ? '' : s.pemetaan.nilai[mKey]}
                              onChange={(e) =>
                                handleUpdateNilaiField(s.id, mKey, e.target.value)
                              }
                              style={{
                                width: '66px',
                                padding: '5px 4px',
                                borderRadius: '6px',
                                border: '1.5px solid #cbd5e1',
                                fontSize: '12.5px',
                                fontWeight: 700,
                                textAlign: 'center',
                                background: !isMI ? '#e2e8f0' : 'white',
                                color: !isMI ? '#94a3b8' : '#0f172a',
                              }}
                            />
                          </td>
                        ))}

                        {/* Nilai Agama Konversi */}
                        <td
                          style={{
                            textAlign: 'center',
                            background: '#ecfdf5',
                            fontWeight: 800,
                            color: '#047857',
                            fontSize: '13px',
                            padding: '8px 4px',
                          }}
                        >
                          {s.nilaiAgama}
                        </td>

                        {/* Mapel Umum: Bahasa Indonesia, Matematika, Ilmu Pengetahuan Alam dan Sosial, Seni Budaya dan Keterampilan, Bahasa Inggris, Pendidikan Jasmani, Olahraga, dan Kesehatan */}
                        {(['ind', 'mat', 'ipas', 'sbk', 'bing', 'pjok'] as const).map((mKey) => (
                          <td key={mKey} style={{ textAlign: 'center', padding: '8px 4px' }}>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              placeholder="0-100"
                              value={s.pemetaan.nilai[mKey]}
                              onChange={(e) =>
                                handleUpdateNilaiField(s.id, mKey, e.target.value)
                              }
                              style={{
                                width: '66px',
                                padding: '5px 4px',
                                borderRadius: '6px',
                                border: '1.5px solid #cbd5e1',
                                fontSize: '12.5px',
                                fontWeight: 700,
                                textAlign: 'center',
                              }}
                            />
                          </td>
                        ))}

                        {/* Poin Prestasi */}
                        <td style={{ background: '#fdf2f8', textAlign: 'center', padding: '8px 4px' }}>
                          <input
                            type="number"
                            min={0}
                            placeholder="0"
                            value={s.pemetaan.poinPrestasi}
                            onChange={(e) => handleUpdatePrestasi(s.id, e.target.value)}
                            title="Skor per prestasi: 5=Internasional, 4=Nasional, 3=Provinsi, 2=Kabupaten/Kota, 1=Kecamatan (bisa dijumlahkan jika > 1 prestasi)"
                            style={{
                              width: '62px',
                              padding: '5px 4px',
                              borderRadius: '6px',
                              border: '1.5px solid #f472b6',
                              fontSize: '12.5px',
                              fontWeight: 800,
                              textAlign: 'center',
                              color: '#be185d',
                            }}
                          />
                          {s.prestasiKeterangan && (
                            <div
                              style={{
                                fontSize: '10px',
                                color: '#9d174d',
                                marginTop: '3px',
                                maxWidth: '78px',
                                marginInline: 'auto',
                                whiteSpace: 'normal',
                                lineHeight: 1.15,
                              }}
                              title={s.prestasiKeterangan}
                            >
                              Ket: {s.prestasiKeterangan}
                            </div>
                          )}
                        </td>

                        {/* Hasil Kelas & Aksi */}
                        <td style={{ textAlign: 'center', padding: '8px 6px' }}>
                          {s.assignedClass && (
                            <div
                              style={{
                                fontSize: '10.5px',
                                fontWeight: 800,
                                padding: '3px 6px',
                                borderRadius: '6px',
                                background: KELAS_META[s.assignedClass].bg,
                                color: KELAS_META[s.assignedClass].color,
                                border: `1px solid ${KELAS_META[s.assignedClass].border}`,
                                marginBottom: '5px',
                                whiteSpace: 'normal',
                                lineHeight: 1.2,
                              }}
                            >
                              {s.assignedClass}
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                            <button
                              type="button"
                              onClick={() => setEditingStudentId(s.id)}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                background: 'white',
                                color: '#334155',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                              title="Buka Form Input Detail Siswa"
                            >
                              <i className="fas fa-sliders-h"></i> Form
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveSingle(s, true)}
                              disabled={saving}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '6px',
                                border: 'none',
                                background: isDirty ? '#d97706' : '#059669',
                                color: 'white',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                              title="Simpan baris ini"
                            >
                              <i className="fas fa-check"></i> Simpan
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls for Input Table (Maks. 15 baris per halaman) */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 18px',
                borderTop: '1px solid #e2e8f0',
                background: '#f8fafc',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <div style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 600 }}>
                Menampilkan{' '}
                <b>
                  {filteredInputStudents.length === 0
                    ? 0
                    : (pageInput - 1) * PAGE_SIZE + 1}
                </b>
                -
                <b>
                  {Math.min(pageInput * PAGE_SIZE, filteredInputStudents.length)}
                </b>{' '}
                dari <b>{filteredInputStudents.length}</b> calon siswa (Maksimal 15 per halaman)
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setPageInput(1)}
                  disabled={pageInput === 1}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: pageInput === 1 ? '#f1f5f9' : 'white',
                    color: pageInput === 1 ? '#94a3b8' : '#334155',
                    cursor: pageInput === 1 ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}
                  title="Halaman Pertama"
                >
                  <i className="fas fa-angle-double-left"></i>
                </button>
                <button
                  type="button"
                  onClick={() => setPageInput((p) => Math.max(1, p - 1))}
                  disabled={pageInput === 1}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: pageInput === 1 ? '#f1f5f9' : 'white',
                    color: pageInput === 1 ? '#94a3b8' : '#334155',
                    cursor: pageInput === 1 ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}
                >
                  <i className="fas fa-chevron-left" style={{ marginRight: '4px' }}></i> Prev
                </button>

                <span
                  style={{
                    fontSize: '12.5px',
                    fontWeight: 700,
                    color: '#0f172a',
                    padding: '0 8px',
                  }}
                >
                  Hal. {pageInput} dari {totalPagesInput}
                </span>

                <button
                  type="button"
                  onClick={() => setPageInput((p) => Math.min(totalPagesInput, p + 1))}
                  disabled={pageInput >= totalPagesInput}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: pageInput >= totalPagesInput ? '#f1f5f9' : 'white',
                    color: pageInput >= totalPagesInput ? '#94a3b8' : '#334155',
                    cursor: pageInput >= totalPagesInput ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}
                >
                  Next <i className="fas fa-chevron-right" style={{ marginLeft: '4px' }}></i>
                </button>
                <button
                  type="button"
                  onClick={() => setPageInput(totalPagesInput)}
                  disabled={pageInput >= totalPagesInput}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: pageInput >= totalPagesInput ? '#f1f5f9' : 'white',
                    color: pageInput >= totalPagesInput ? '#94a3b8' : '#334155',
                    cursor: pageInput >= totalPagesInput ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}
                  title="Halaman Terakhir"
                >
                  <i className="fas fa-angle-double-right"></i>
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* ==================== TAB 2: HASIL KLASIFIKASI 5 KELAS ==================== */
        <>
          {/* Summary Cards for the 5 Classes */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(225px, 1fr))',
              gap: '14px',
              marginBottom: '20px',
            }}
          >
            {KELAS_PROGRAM_KHUSUS.map((kelas) => {
              const meta = KELAS_META[kelas];
              const stat = classSummary[kelas];
              const isSelected = selectedKelasTab === kelas;
              return (
                <div
                  key={kelas}
                  onClick={() =>
                    setSelectedKelasTab((prev) => (prev === kelas ? 'semua' : kelas))
                  }
                  style={{
                    background: 'white',
                    borderRadius: '14px',
                    padding: '16px',
                    border: isSelected ? `2.5px solid ${meta.color}` : '1px solid #e2e8f0',
                    boxShadow: isSelected
                      ? '0 8px 20px rgba(0, 0, 0, 0.08)'
                      : '0 2px 8px rgba(0, 0, 0, 0.03)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '10px',
                    }}
                  >
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        background: meta.bg,
                        color: meta.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.1rem',
                      }}
                    >
                      <i className={`fas ${meta.icon}`}></i>
                    </div>
                    <span
                      style={{
                        background: meta.bg,
                        color: meta.color,
                        border: `1px solid ${meta.border}`,
                        fontSize: '11.5px',
                        fontWeight: 800,
                        padding: '2px 10px',
                        borderRadius: '20px',
                      }}
                    >
                      Rata-rata Skor: {stat.avgSkor}
                    </span>
                  </div>

                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: '0.98rem',
                      color: '#0f172a',
                      marginBottom: '4px',
                    }}
                  >
                    {kelas}
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#64748b',
                      marginBottom: '12px',
                      lineHeight: 1.35,
                    }}
                  >
                    {meta.rumusLabel}
                  </div>

                  {/* Gender Ratio & Total */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: '10px',
                      borderTop: '1px dashed #e2e8f0',
                      fontSize: '12px',
                      fontWeight: 700,
                    }}
                  >
                    <span style={{ color: '#0f172a' }}>Total: {stat.total} Siswa</span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <span
                        style={{
                          background: '#dbeafe',
                          color: '#1d4ed8',
                          padding: '2px 7px',
                          borderRadius: '6px',
                          fontSize: '11px',
                        }}
                      >
                        L: {stat.laki}
                      </span>
                      <span
                        style={{
                          background: '#fce7f3',
                          color: '#be185d',
                          padding: '2px 7px',
                          borderRadius: '6px',
                          fontSize: '11px',
                        }}
                      >
                        P: {stat.perempuan}
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: '8px',
                      fontSize: '11px',
                      color: '#475569',
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>Pilihan 1: <b>{stat.pilihan1Count}</b></span>
                    <span>Pilihan 2: <b>{stat.pilihan2Count}</b></span>
                    <span>Lainnya: <b>{stat.pilihanLainCount}</b></span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Filter & Controls for Hasil Tab */}
          <div
            style={{
              background: 'white',
              borderRadius: '14px',
              padding: '14px 18px',
              marginBottom: '16px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setSelectedKelasTab('semua')}
                style={{
                  padding: '7px 14px',
                  borderRadius: '8px',
                  border: selectedKelasTab === 'semua' ? 'none' : '1px solid #cbd5e1',
                  background: selectedKelasTab === 'semua' ? '#0f172a' : 'white',
                  color: selectedKelasTab === 'semua' ? 'white' : '#475569',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Semua Kelas ({computedStudents.filter((s) => s.assignedClass).length})
              </button>
              {KELAS_PROGRAM_KHUSUS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setSelectedKelasTab(k)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '8px',
                    border:
                      selectedKelasTab === k
                        ? `1.5px solid ${KELAS_META[k].color}`
                        : '1px solid #cbd5e1',
                    background: selectedKelasTab === k ? KELAS_META[k].bg : 'white',
                    color: selectedKelasTab === k ? KELAS_META[k].color : '#475569',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {k} ({classSummary[k].total})
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  color: '#334155',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={onlyMapFilledStudents}
                  onChange={(e) => setOnlyMapFilledStudents(e.target.checked)}
                  style={{ width: '15px', height: '15px', accentColor: '#047857' }}
                />
                Hanya Petakan Siswa yang Sudah Diisi Nilai/Pilihan
              </label>

              <input
                type="text"
                placeholder="Cari siswa..."
                value={searchHasil}
                onChange={(e) => setSearchHasil(e.target.value)}
                style={{
                  padding: '7px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '12.5px',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Hasil Pemetaan Table */}
          <div className={styles.card}>
            <div
              className={styles.tableContainer}
              style={{
                maxHeight: '72vh',
                overflow: 'auto',
                position: 'relative',
              }}
            >
              <table
                className={styles.table}
                style={{
                  minWidth: '1300px',
                  borderCollapse: 'separate',
                  borderSpacing: 0,
                }}
              >
                <thead>
                  <tr>
                    {[
                      { label: 'No', width: '42px', align: 'center' as const },
                      { label: 'Nama Calon Siswa', width: '190px', align: 'left' as const },
                      { label: 'L/P', width: '80px', align: 'center' as const },
                      { label: 'Asal Sekolah (SD/MI)', width: '150px', align: 'left' as const },
                      { label: 'Kelas Hasil Pemetaan', width: '165px', align: 'left' as const },
                      { label: 'Diterima dari Pilihan', width: '110px', align: 'center' as const },
                      { label: 'Nilai Kategori Kelas', width: '90px', align: 'center' as const },
                      { label: 'Poin Prestasi', width: '80px', align: 'center' as const },
                      {
                        label: 'Total Skor Kelas',
                        width: '90px',
                        align: 'center' as const,
                        bg: '#ecfdf5',
                        color: '#047857',
                      },
                      { label: 'Daftar Urutan Pilihan (1 - 5)', width: '190px', align: 'left' as const },
                      { label: 'Rincian Skor di 5 Kelas Program Khusus', width: '230px', align: 'left' as const },
                      { label: 'Ubah Kelas Manual', width: '150px', align: 'center' as const },
                    ].map((col) => (
                      <th
                        key={col.label}
                        style={{
                          position: 'sticky',
                          top: 0,
                          zIndex: 15,
                          width: col.width,
                          minWidth: col.width,
                          textAlign: col.align,
                          background: col.bg || '#f8fafc',
                          color: col.color || '#475569',
                          whiteSpace: 'normal',
                          wordBreak: 'break-word',
                          lineHeight: 1.25,
                          verticalAlign: 'middle',
                          padding: '10px 8px',
                          fontSize: '11px',
                          boxShadow: 'inset 0 -2px 0 #cbd5e1',
                        }}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedHasilStudents.map((s, idx) => {
                    const k = s.assignedClass as KelasPK;
                    const meta = KELAS_META[k];
                    const rowNumber = (pageHasil - 1) * PAGE_SIZE + idx + 1;
                    return (
                      <tr key={s.id}>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: '#64748b' }}>
                          {rowNumber}
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{s.namaLengkap}</div>
                          <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                            {s.nomorPendaftaran} &bull; Jalur {s.jalurPendaftaran}
                          </div>
                        </td>
                        <td>
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              background: s.genderNorm === 'L' ? '#dbeafe' : '#fce7f3',
                              color: s.genderNorm === 'L' ? '#1d4ed8' : '#be185d',
                            }}
                          >
                            {s.genderNorm === 'L' ? 'Laki-laki' : 'Perempuan'}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: '12.5px' }}>
                            {s.asalSekolah || '-'}
                          </div>
                          <span
                            style={{
                              fontSize: '10.5px',
                              fontWeight: 800,
                              padding: '1px 6px',
                              borderRadius: '4px',
                              background: s.pemetaan.jenjangAsal === 'MI' ? '#fef9c3' : '#dbeafe',
                              color: s.pemetaan.jenjangAsal === 'MI' ? '#854d0e' : '#1e40af',
                            }}
                          >
                            Jenjang {s.pemetaan.jenjangAsal}
                          </span>
                        </td>
                        <td>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '5px 12px',
                              borderRadius: '8px',
                              fontSize: '12.5px',
                              fontWeight: 800,
                              background: meta.bg,
                              color: meta.color,
                              border: `1.5px solid ${meta.border}`,
                            }}
                          >
                            <i className={`fas ${meta.icon}`}></i>
                            {k}
                          </span>
                        </td>
                        <td>
                          {s.assignedChoiceRank === -1 ? (
                            <span
                              style={{
                                background: '#fef3c7',
                                color: '#b45309',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '11.5px',
                                fontWeight: 700,
                              }}
                            >
                              Manual Override
                            </span>
                          ) : s.assignedChoiceRank && s.assignedChoiceRank > 0 ? (
                            <span
                              style={{
                                background:
                                  s.assignedChoiceRank === 1
                                    ? '#dcfce7'
                                    : s.assignedChoiceRank === 2
                                    ? '#e0f2fe'
                                    : '#f1f5f9',
                                color:
                                  s.assignedChoiceRank === 1
                                    ? '#15803d'
                                    : s.assignedChoiceRank === 2
                                    ? '#0369a1'
                                    : '#475569',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '11.5px',
                                fontWeight: 800,
                              }}
                            >
                              Pilihan Ke-{s.assignedChoiceRank}
                            </span>
                          ) : (
                            <span
                              style={{
                                background: '#f1f5f9',
                                color: '#64748b',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 600,
                              }}
                            >
                              Distribusi Skor & Kuota
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 700 }}>
                          {s.nilaiKategori[k]}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: '#be185d' }}>
                          +{s.poinPrestasiNum}
                        </td>
                        <td
                          style={{
                            textAlign: 'center',
                            fontWeight: 800,
                            fontSize: '14px',
                            background: '#ecfdf5',
                            color: '#047857',
                          }}
                        >
                          {s.skorKelas[k]}
                        </td>
                        <td>
                          <div style={{ fontSize: '11px', color: '#475569', lineHeight: 1.4 }}>
                            {[
                              s.pemetaan.pilihan1,
                              s.pemetaan.pilihan2,
                              s.pemetaan.pilihan3,
                              s.pemetaan.pilihan4,
                              s.pemetaan.pilihan5,
                            ]
                              .filter(Boolean)
                              .map((p, i) => `${i + 1}. ${p}`)
                              .join(' | ') || <span style={{ color: '#94a3b8' }}>Belum memilih</span>}
                          </div>
                        </td>
                        <td>
                          <div
                            style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: '4px',
                              maxWidth: '280px',
                            }}
                          >
                            {KELAS_PROGRAM_KHUSUS.map((kelasItem) => (
                              <span
                                key={kelasItem}
                                style={{
                                  fontSize: '10.5px',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  background: kelasItem === k ? '#047857' : '#f1f5f9',
                                  color: kelasItem === k ? 'white' : '#475569',
                                  fontWeight: kelasItem === k ? 800 : 600,
                                }}
                              >
                                {kelasItem}: {s.skorKelas[kelasItem]}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <select
                            value={s.pemetaan.kelasHasilManual || ''}
                            onChange={async (e) => {
                              const val = e.target.value;
                              handleUpdatePemetaanField(s.id, 'kelasHasilManual', val);
                              const updatedStudent: CalonSiswaSPMB = {
                                ...s,
                                pemetaan: {
                                  ...s.pemetaan,
                                  kelasHasilManual: val,
                                },
                              };
                              await handleSaveSingle(updatedStudent, true);
                            }}
                            style={{
                              padding: '5px 8px',
                              borderRadius: '6px',
                              border: '1.5px solid #cbd5e1',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            <option value="">Otomatis Sistem</option>
                            {KELAS_PROGRAM_KHUSUS.map((kelasOpt) => (
                              <option key={kelasOpt} value={kelasOpt}>
                                Kunci ke: {kelasOpt}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls for Hasil Table (Maks. 15 baris per halaman) */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 18px',
                borderTop: '1px solid #e2e8f0',
                background: '#f8fafc',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <div style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 600 }}>
                Menampilkan{' '}
                <b>
                  {filteredHasilStudents.length === 0
                    ? 0
                    : (pageHasil - 1) * PAGE_SIZE + 1}
                </b>
                -
                <b>
                  {Math.min(pageHasil * PAGE_SIZE, filteredHasilStudents.length)}
                </b>{' '}
                dari <b>{filteredHasilStudents.length}</b> calon siswa (Maksimal 15 per halaman)
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setPageHasil(1)}
                  disabled={pageHasil === 1}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: pageHasil === 1 ? '#f1f5f9' : 'white',
                    color: pageHasil === 1 ? '#94a3b8' : '#334155',
                    cursor: pageHasil === 1 ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}
                  title="Halaman Pertama"
                >
                  <i className="fas fa-angle-double-left"></i>
                </button>
                <button
                  type="button"
                  onClick={() => setPageHasil((p) => Math.max(1, p - 1))}
                  disabled={pageHasil === 1}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: pageHasil === 1 ? '#f1f5f9' : 'white',
                    color: pageHasil === 1 ? '#94a3b8' : '#334155',
                    cursor: pageHasil === 1 ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}
                >
                  <i className="fas fa-chevron-left" style={{ marginRight: '4px' }}></i> Prev
                </button>

                <span
                  style={{
                    fontSize: '12.5px',
                    fontWeight: 700,
                    color: '#0f172a',
                    padding: '0 8px',
                  }}
                >
                  Hal. {pageHasil} dari {totalPagesHasil}
                </span>

                <button
                  type="button"
                  onClick={() => setPageHasil((p) => Math.min(totalPagesHasil, p + 1))}
                  disabled={pageHasil >= totalPagesHasil}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: pageHasil >= totalPagesHasil ? '#f1f5f9' : 'white',
                    color: pageHasil >= totalPagesHasil ? '#94a3b8' : '#334155',
                    cursor: pageHasil >= totalPagesHasil ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}
                >
                  Next <i className="fas fa-chevron-right" style={{ marginLeft: '4px' }}></i>
                </button>
                <button
                  type="button"
                  onClick={() => setPageHasil(totalPagesHasil)}
                  disabled={pageHasil >= totalPagesHasil}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: pageHasil >= totalPagesHasil ? '#f1f5f9' : 'white',
                    color: pageHasil >= totalPagesHasil ? '#94a3b8' : '#334155',
                    cursor: pageHasil >= totalPagesHasil ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}
                  title="Halaman Terakhir"
                >
                  <i className="fas fa-angle-double-right"></i>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ==================== MODAL INPUT DETAIL PER SISWA ==================== */}
      {editingStudent && (
        <div
          className={styles.modalOverlay}
          onClick={() => setEditingStudentId(null)}
          style={{ zIndex: 1000 }}
        >
          <div
            className={styles.modalContent}
            style={{
              maxWidth: '780px',
              height: 'auto',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: 0,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div>
                <div className={styles.modalTitle}>{editingStudent.namaLengkap}</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  {editingStudent.nomorPendaftaran} &bull; {editingStudent.jenisKelamin} &bull;{' '}
                  {editingStudent.asalSekolah}
                </div>
              </div>
              <button className={styles.closeBtn} onClick={() => setEditingStudentId(null)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div style={{ padding: '20px 24px' }}>
              {/* Jenjang Selector */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#f8fafc',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  marginBottom: '18px',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#0f172a' }}>
                    Jenjang Sekolah Asal (SD / MI)
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    Menentukan perhitungan Nilai Agama (SD = Pendidikan Agama Islam, MI = Rata-rata
                    4 Mapel Agama)
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(['SD', 'MI'] as const).map((j) => (
                    <button
                      key={j}
                      type="button"
                      onClick={() =>
                        handleUpdatePemetaanField(editingStudent.id, 'jenjangAsal', j)
                      }
                      style={{
                        padding: '7px 18px',
                        borderRadius: '8px',
                        border:
                          editingStudent.pemetaan.jenjangAsal === j
                            ? '2px solid #047857'
                            : '1px solid #cbd5e1',
                        background:
                          editingStudent.pemetaan.jenjangAsal === j ? '#ecfdf5' : 'white',
                        color:
                          editingStudent.pemetaan.jenjangAsal === j ? '#047857' : '#475569',
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      Siswa {j}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pilihan Kelas 1 - 5 */}
              <h4
                style={{
                  margin: '0 0 10px 0',
                  fontSize: '14px',
                  fontWeight: 800,
                  color: '#047857',
                }}
              >
                <i className="fas fa-list-ol" style={{ marginRight: '6px' }}></i>
                Pilihan Kelas Program Khusus (Urut Pilihan 1 s/d 5)
              </h4>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                  gap: '10px',
                  marginBottom: '20px',
                }}
              >
                {(['pilihan1', 'pilihan2', 'pilihan3', 'pilihan4', 'pilihan5'] as const).map(
                  (pilKey, idx) => {
                    const otherChosen = new Set(
                      (['pilihan1', 'pilihan2', 'pilihan3', 'pilihan4', 'pilihan5'] as const)
                        .filter((k) => k !== pilKey)
                        .map((k) => editingStudent.pemetaan[k])
                        .filter(Boolean)
                    );
                    const availableOptions = KELAS_PROGRAM_KHUSUS.filter(
                      (k) => !otherChosen.has(k) || k === editingStudent.pemetaan[pilKey]
                    );
                    return (
                      <div key={pilKey}>
                        <label
                          style={{
                            display: 'block',
                            fontSize: '12px',
                            fontWeight: 700,
                            color: '#334155',
                            marginBottom: '4px',
                          }}
                        >
                          Pilihan Ke-{idx + 1}
                        </label>
                        <select
                          value={editingStudent.pemetaan[pilKey] || ''}
                          onChange={(e) =>
                            handleUpdatePemetaanField(editingStudent.id, pilKey, e.target.value)
                          }
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            borderRadius: '8px',
                            border: '1.5px solid #cbd5e1',
                            fontSize: '13px',
                            fontWeight: 600,
                          }}
                        >
                          <option value="">-- Pilih Kelas --</option>
                          {availableOptions.map((k) => (
                            <option key={k} value={k}>
                              {k}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  }
                )}
              </div>

              {/* Nilai Mata Pelajaran */}
              <h4
                style={{
                  margin: '0 0 10px 0',
                  fontSize: '14px',
                  fontWeight: 800,
                  color: '#0369a1',
                }}
              >
                <i className="fas fa-book-open" style={{ marginRight: '6px' }}></i>
                Input Nilai Mata Pelajaran & Poin Prestasi
              </h4>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '12px',
                  marginBottom: '20px',
                }}
              >
                {editingStudent.pemetaan.jenjangAsal === 'SD' ? (
                  <div
                    style={{
                      background: '#eff6ff',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #bfdbfe',
                    }}
                  >
                    <label
                      style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#1e40af',
                        marginBottom: '4px',
                      }}
                    >
                      Pendidikan Agama Islam (Khusus Siswa SD)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={editingStudent.pemetaan.nilai.pai}
                      onChange={(e) =>
                        handleUpdateNilaiField(editingStudent.id, 'pai', e.target.value)
                      }
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '6px',
                        border: '1.5px solid #93c5fd',
                        fontSize: '13.5px',
                        fontWeight: 700,
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                ) : (
                  <>
                    {[
                      { key: 'qh' as const, label: "Al-Qur'an Hadits" },
                      { key: 'aa' as const, label: 'Akidah Akhlak' },
                      { key: 'fq' as const, label: 'Fikih' },
                      { key: 'ski' as const, label: 'Sejarah Kebudayaan Islam' },
                    ].map((m) => (
                      <div
                        key={m.key}
                        style={{
                          background: '#fefce8',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: '1px solid #fde047',
                        }}
                      >
                        <label
                          style={{
                            display: 'block',
                            fontSize: '12px',
                            fontWeight: 700,
                            color: '#854d0e',
                            marginBottom: '4px',
                          }}
                        >
                          {m.label} (Siswa MI)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={editingStudent.pemetaan.nilai[m.key]}
                          onChange={(e) =>
                            handleUpdateNilaiField(editingStudent.id, m.key, e.target.value)
                          }
                          style={{
                            width: '100%',
                            padding: '7px 10px',
                            borderRadius: '6px',
                            border: '1.5px solid #fde047',
                            fontSize: '13.5px',
                            fontWeight: 700,
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                    ))}
                    <div
                      style={{
                        background: '#ecfdf5',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #a7f3d0',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                      }}
                    >
                      <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#047857' }}>
                        Rata-rata Nilai Agama MI:
                      </span>
                      <span style={{ fontSize: '18px', fontWeight: 800, color: '#047857' }}>
                        {editingStudent.nilaiAgama}
                      </span>
                    </div>
                  </>
                )}

                {[
                  { key: 'ind' as const, label: 'Bahasa Indonesia' },
                  { key: 'mat' as const, label: 'Matematika' },
                  { key: 'ipas' as const, label: 'Ilmu Pengetahuan Alam dan Sosial' },
                  { key: 'sbk' as const, label: 'Seni Budaya dan Keterampilan' },
                  { key: 'bing' as const, label: 'Bahasa Inggris' },
                  {
                    key: 'pjok' as const,
                    label: 'Pendidikan Jasmani, Olahraga, dan Kesehatan',
                  },
                ].map((m) => (
                  <div
                    key={m.key}
                    style={{
                      background: '#f8fafc',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <label
                      style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#334155',
                        marginBottom: '4px',
                      }}
                    >
                      {m.label}
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={editingStudent.pemetaan.nilai[m.key]}
                      onChange={(e) =>
                        handleUpdateNilaiField(editingStudent.id, m.key, e.target.value)
                      }
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '6px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '13.5px',
                        fontWeight: 700,
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                ))}

                {/* Poin Prestasi */}
                <div
                  style={{
                    background: '#fdf2f8',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #fbcfe8',
                  }}
                >
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#be185d',
                      marginBottom: '4px',
                    }}
                  >
                    Poin Prestasi (Total Skor Angka)
                  </label>
                  <input
                    type="number"
                    min={0}
                    placeholder="Contoh: 0, 3, 7..."
                    value={editingStudent.pemetaan.poinPrestasi}
                    onChange={(e) => handleUpdatePrestasi(editingStudent.id, e.target.value)}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      border: '1.5px solid #f472b6',
                      fontSize: '13.5px',
                      fontWeight: 800,
                      color: '#be185d',
                      boxSizing: 'border-box',
                    }}
                  />
                  <div style={{ fontSize: '10.5px', color: '#9d174d', marginTop: '4px' }}>
                    Skor: 5=Internasional | 4=Nasional | 3=Provinsi | 2=Kab/Kota | 1=Kecamatan (Bisa akumulasi &gt; 5)
                  </div>
                </div>
              </div>

              {/* Preview Skor 5 Kelas */}
              <div
                style={{
                  background: '#f8fafc',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  border: '1px solid #e2e8f0',
                  marginBottom: '20px',
                }}
              >
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 800,
                    color: '#334155',
                    marginBottom: '8px',
                  }}
                >
                  Simulasi Skor Kategori Kelas (Nilai Kategori + Poin Prestasi):
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {KELAS_PROGRAM_KHUSUS.map((k) => (
                    <div
                      key={k}
                      style={{
                        background: KELAS_META[k].bg,
                        color: KELAS_META[k].color,
                        border: `1px solid ${KELAS_META[k].border}`,
                        padding: '6px 10px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 700,
                      }}
                    >
                      {k}: <b>{editingStudent.skorKelas[k]}</b>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setEditingStudentId(null)}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: 'white',
                    color: '#475569',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Tutup
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={async () => {
                    await handleSaveSingle(editingStudent, true);
                    setEditingStudentId(null);
                  }}
                  style={{
                    padding: '9px 22px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#047857',
                    color: 'white',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <i className="fas fa-save" style={{ marginRight: '6px' }}></i>
                  Simpan Data Siswa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
