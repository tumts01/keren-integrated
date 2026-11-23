import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAllCachedDataInduk } from '@/lib/data-induk';
import {
  PKCategoryKey,
  PKScoreField,
  PKSemester,
  PK_CATEGORY_MAP,
  MAP_MINAT_BAKAT,
  PKMapelScores,
  createEmptyMapelScores,
  computeMapelAverage,
  computeProgramFinalScore,
  getCanonicalFieldStorage,
  getLayananUmumMapels,
  PK_LAYANAN_UMUM_STS_MAPEL,
  PK_LAYANAN_UMUM_SAS_MAPEL,
  getProgramSasStorageMapel,
  getProgramStsStorageMapel,
  getReadTahunAjaranCandidates,
  resolveMapelForKategori,
  toStorageTahunAjaran,
} from '@/lib/prosus-config';

export const dynamic = 'force-dynamic';

function normalizeSemester(raw: string | null | undefined): PKSemester {
  return String(raw || '').toLowerCase() === 'genap' ? 'Genap' : 'Ganjil';
}

function normalizeJK(raw: string): string {
  const s = String(raw || '').trim().toUpperCase();
  if (s === 'L' || s.startsWith('LAKI')) return 'L';
  if (s === 'P' || s.startsWith('PEREMPUAN')) return 'P';
  return s || '-';
}

function applyProgramScoreRow(
  dataNilai: any[],
  byInduk: Map<string, any>,
  byNama: Map<string, any>,
  prop: 'stsProgram' | 'sasProgram' | 'stsLayananUmum' | 'sasLayananUmum'
) {
  for (const entry of dataNilai) {
    const val = entry?.nilai !== undefined && entry?.nilai !== null ? String(entry.nilai).trim() : '';
    const entryInduk = String(entry?.induk || '').trim();
    const entryNama = String(entry?.nama || '').trim().toLowerCase();
    const target = (entryInduk && byInduk.get(entryInduk)) || (entryNama && byNama.get(entryNama));
    if (target) {
      target[prop] = val;
    }
  }
}

function deriveLegacyProgramScore(
  scoresByMapel: Record<string, PKMapelScores>,
  categoryMapelNames: string[],
  field: 'sts' | 'sas'
): string {
  const entries = categoryMapelNames
    .map((mName) => {
      const raw = String(scoresByMapel[mName]?.[field] ?? '').trim();
      if (!raw) return null;
      const num = Number(raw.replace(',', '.'));
      if (Number.isNaN(num) || num < 0) return null;
      return { raw, num };
    })
    .filter((item): item is { raw: string; num: number } => item !== null);

  if (entries.length === 1) return entries[0].raw;
  if (entries.length > 1) {
    const avg = entries.reduce((sum, item) => sum + item.num, 0) / entries.length;
    return String(Math.round(avg));
  }
  return '';
}

function extractStudentsForClass(rawRows: any[], kelas: string, tahunAjaran: string) {
  const targetKelas = kelas.trim().toUpperCase();
  const baseTA = tahunAjaran.replace(/\s*\((Ganjil|Genap)\)\s*$/i, '').trim();
  const students: { induk: string; nama: string; jk: string; nisn?: string }[] = [];

  for (const rawR of rawRows) {
    const meta = rawR.metadata || {};
    const status = String(meta['STATUS SISWA'] || '').trim().toUpperCase();
    // Filter only active students unless status is blank
    if (status && !status.includes('AKTIF')) continue;

    const ta7 = String(meta['TA KELAS 7'] || '').trim();
    const r7 = String(meta['ROMBEL KELAS 7'] || '').trim().toUpperCase();
    const ta8 = String(meta['TA KELAS 8'] || '').trim();
    const r8 = String(meta['ROMBEL KELAS 8'] || '').trim().toUpperCase();
    const ta9 = String(meta['TA KELAS 9'] || '').trim();
    const r9 = String(meta['ROMBEL KELAS 9'] || '').trim().toUpperCase();
    const taMain = String(meta['TAHUN AJARAN'] || '').trim();
    const rMain = String(meta['ROMBEL'] || '').trim().toUpperCase();

    let matched = false;
    if (ta7 && r7 && r7 === targetKelas && (!baseTA || ta7 === baseTA)) matched = true;
    if (ta8 && r8 && r8 === targetKelas && (!baseTA || ta8 === baseTA)) matched = true;
    if (ta9 && r9 && r9 === targetKelas && (!baseTA || ta9 === baseTA)) matched = true;
    if (!ta7 && !ta8 && !ta9 && rMain === targetKelas && (!baseTA || !taMain || taMain === baseTA)) {
      matched = true;
    }

    if (!matched) continue;

    const induk = String(rawR.id_siswa || meta['ID SISWA'] || '').trim();
    const nama = String(rawR.nama || meta['NAMA'] || '').trim();
    if (!induk && !nama) continue;

    students.push({
      induk,
      nama,
      jk: normalizeJK(meta['JENIS KELAMIN'] || ''),
      nisn: String(meta['NISN'] || '').trim(),
    });
  }

  students.sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
  return students;
}

function classifyLegacyRow(row: any): { field: PKScoreField; priority: number } | null {
  const tipe = String(row.tipe || '').trim().toLowerCase();
  const materi = String(row.materi || '').trim();
  const sub = String(row.sub_materi || '').trim().toUpperCase();

  if (tipe === 'sts') {
    const isCanonical = !materi && !sub;
    return { field: 'sts', priority: isCanonical ? 2 : 1 };
  }
  if (tipe === 'sas') {
    const isCanonical = !materi && !sub;
    return { field: 'sas', priority: isCanonical ? 2 : 1 };
  }
  if (tipe === 'materi_harian') {
    if (materi === 'Materi 1' && (sub === 'S1' || sub === '')) {
      return { field: 'm1', priority: sub === 'S1' ? 3 : 2 };
    }
    if (materi === 'Materi 2' && (sub === 'S1' || sub === '')) {
      return { field: 'm2', priority: sub === 'S1' ? 4 : 3 };
    }
    if (materi === 'Materi 1' && sub === 'S2') {
      // Legacy sub-materi layout: Materi 1 S2 maps to Materi 2
      return { field: 'm2', priority: 1 };
    }
    if (materi === 'Materi 3' && (sub === 'S1' || sub === '')) {
      return { field: 'm3', priority: sub === 'S1' ? 4 : 3 };
    }
    if (materi === 'Materi 1' && sub === 'S3') {
      // Legacy sub-materi layout: Materi 1 S3 maps to Materi 3
      return { field: 'm3', priority: 1 };
    }
  }
  return null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tahunAjaran = (searchParams.get('tahunAjaran') || '2026/2027').trim();
    const semester = normalizeSemester(searchParams.get('semester'));
    const kelas = (searchParams.get('kelas') || '').trim().toUpperCase();
    const rawKategori = (searchParams.get('kategori') || '').trim().toUpperCase();

    if (!kelas) {
      return NextResponse.json({ error: 'Parameter kelas wajib diisi' }, { status: 400 });
    }

    const kategoriKey = (
      PK_CATEGORY_MAP[rawKategori as PKCategoryKey]
        ? rawKategori
        : MAP_MINAT_BAKAT[kelas] || 'SAINS RISET'
    ) as PKCategoryKey;

    const categoryDef = PK_CATEGORY_MAP[kategoriKey];
    const layananUmumMapels = getLayananUmumMapels(kategoriKey);
    const allExpectedMapels = [...categoryDef.mapels, ...layananUmumMapels];
    const baseTA = tahunAjaran.replace(/\s*\((Ganjil|Genap)\)\s*$/i, '').trim();
    const taCandidates = getReadTahunAjaranCandidates(baseTA, semester);

    const [rawSiswa, pkRes, kelasRes] = await Promise.all([
      getAllCachedDataInduk(),
      supabase
        .from('nilai_pk')
        .select('*')
        .in('tahun_ajaran', taCandidates)
        .eq('kelas', kelas)
        .order('updated_at', { ascending: true }),
      supabase.from('data_kelas').select('metadata').limit(100),
    ]);

    if (pkRes.error) throw pkRes.error;

    let waliKelas = '';
    for (const kr of kelasRes.data || []) {
      const rombel = String(kr.metadata?.['ROMBEL'] || '').trim().toUpperCase();
      if (rombel === kelas) {
        waliKelas = String(kr.metadata?.['WALI KELAS'] || '').trim();
        break;
      }
    }

    const students = extractStudentsForClass(rawSiswa, kelas, baseTA);

    // Prepare score maps per student (kategori utama + layanan umum + STS/SAS program & LU + catatan pengajar)
    const studentMaps = students.map((st) => {
      const scoresByMapel: Record<string, PKMapelScores> = {};
      for (const m of allExpectedMapels) {
        scoresByMapel[m.name] = createEmptyMapelScores();
      }
      return {
        ...st,
        scoresByMapel,
        stsProgram: '',
        sasProgram: '',
        nilaiAkhirProgram: null as number | null,
        stsLayananUmum: '',
        sasLayananUmum: '',
        nilaiAkhirLayananUmum: null as number | null,
        catatan: '',
      };
    });

    const byInduk = new Map<string, (typeof studentMaps)[number]>();
    const byNama = new Map<string, (typeof studentMaps)[number]>();
    for (const st of studentMaps) {
      if (st.induk) byInduk.set(st.induk, st);
      if (st.nama) byNama.set(st.nama.toLowerCase(), st);
    }

    // Track highest priority per (mapel, field)
    const bestPriority = new Map<string, number>();
    const programStsMapel = getProgramStsStorageMapel(kategoriKey);
    const programSasMapel = getProgramSasStorageMapel(kategoriKey);
    let hasExplicitProgramStsRow = false;
    let hasExplicitProgramSasRow = false;
    let hasExplicitLuStsRow = false;
    let hasExplicitLuSasRow = false;

    for (const row of pkRes.data || []) {
      // Ensure Ganjil doesn't accidentally ingest rows explicitly marked Genap
      const rowMetaSem = String(row.metadata?.semester || '').toLowerCase();
      if (semester === 'Ganjil' && rowMetaSem === 'genap') continue;

      const rowMapelUpper = String(row.mata_pelajaran || '').trim().toUpperCase();
      const rowTipeLower = String(row.tipe || '').trim().toLowerCase();

      // Load Catatan Pengajar row if present
      if (rowTipeLower === 'catatan_pengajar') {
        const catatanEntries: any[] = Array.isArray(row.data_nilai) ? row.data_nilai : [];
        for (const entry of catatanEntries) {
          const val = String(entry?.catatan ?? entry?.nilai ?? '').trim();
          const entryInduk = String(entry?.induk || '').trim();
          const entryNama = String(entry?.nama || '').trim().toLowerCase();
          const target = (entryInduk && byInduk.get(entryInduk)) || (entryNama && byNama.get(entryNama));
          if (target) {
            target.catatan = val;
          }
        }
        continue;
      }

      // Load unified Program Khusus STS / SAS rows if present
      if (
        (rowMapelUpper === programStsMapel.toUpperCase() && rowTipeLower === 'sts') ||
        (rowMapelUpper === programSasMapel.toUpperCase() && rowTipeLower === 'sas')
      ) {
        const isSts = rowTipeLower === 'sts';
        if (isSts) hasExplicitProgramStsRow = true;
        else hasExplicitProgramSasRow = true;
        applyProgramScoreRow(
          Array.isArray(row.data_nilai) ? row.data_nilai : [],
          byInduk,
          byNama,
          isSts ? 'stsProgram' : 'sasProgram'
        );
        continue;
      }

      // Load unified Layanan Umum STS / SAS rows if present
      if (
        (rowMapelUpper === PK_LAYANAN_UMUM_STS_MAPEL && rowTipeLower === 'sts') ||
        (rowMapelUpper === PK_LAYANAN_UMUM_SAS_MAPEL && rowTipeLower === 'sas')
      ) {
        const isSts = rowTipeLower === 'sts';
        if (isSts) hasExplicitLuStsRow = true;
        else hasExplicitLuSasRow = true;
        applyProgramScoreRow(
          Array.isArray(row.data_nilai) ? row.data_nilai : [],
          byInduk,
          byNama,
          isSts ? 'stsLayananUmum' : 'sasLayananUmum'
        );
        continue;
      }

      const canonicalMapel = resolveMapelForKategori(kategoriKey, String(row.mata_pelajaran || ''));
      if (!canonicalMapel) continue;

      const classified = classifyLegacyRow(row);
      if (!classified) continue;

      const isCanonicalMapelName = row.mata_pelajaran === canonicalMapel.name ? 10 : 0;
      const effectivePriority = classified.priority + isCanonicalMapelName;
      const slotKey = `${canonicalMapel.name}::${classified.field}`;
      const prevPriority = bestPriority.get(slotKey) ?? -1;

      const dataNilai: any[] = Array.isArray(row.data_nilai) ? row.data_nilai : [];
      const hasAnyValue = dataNilai.some(
        (d) => d && d.nilai !== undefined && d.nilai !== null && String(d.nilai).trim() !== ''
      );

      // Don't let an empty higher-priority row wipe out an existing non-empty legacy row unless it has data
      if (effectivePriority < prevPriority) continue;
      if (effectivePriority === prevPriority && !hasAnyValue) continue;
      if (prevPriority >= 0 && !hasAnyValue) continue;

      bestPriority.set(slotKey, effectivePriority);

      for (const entry of dataNilai) {
        const val = entry?.nilai !== undefined && entry?.nilai !== null ? String(entry.nilai).trim() : '';
        if (!val) continue;
        const entryInduk = String(entry?.induk || '').trim();
        const entryNama = String(entry?.nama || '').trim().toLowerCase();
        const target = (entryInduk && byInduk.get(entryInduk)) || (entryNama && byNama.get(entryNama));
        if (target && target.scoresByMapel[canonicalMapel.name]) {
          target.scoresByMapel[canonicalMapel.name][classified.field] = val;
        }
      }
    }

    const categoryMapelNames = categoryDef.mapels.map((m) => m.name);
    const layananUmumMapelNames = layananUmumMapels.map((m) => m.name);

    for (const st of studentMaps) {
      if (!hasExplicitProgramStsRow) {
        st.stsProgram = deriveLegacyProgramScore(st.scoresByMapel, categoryMapelNames, 'sts');
      }
      if (!hasExplicitProgramSasRow) {
        st.sasProgram = deriveLegacyProgramScore(st.scoresByMapel, categoryMapelNames, 'sas');
      }
      if (!hasExplicitLuStsRow) {
        st.stsLayananUmum = deriveLegacyProgramScore(st.scoresByMapel, layananUmumMapelNames, 'sts');
      }
      if (!hasExplicitLuSasRow) {
        st.sasLayananUmum = deriveLegacyProgramScore(st.scoresByMapel, layananUmumMapelNames, 'sas');
      }

      for (const m of allExpectedMapels) {
        st.scoresByMapel[m.name].rata = computeMapelAverage(st.scoresByMapel[m.name]);
      }

      st.nilaiAkhirProgram = computeProgramFinalScore(
        categoryMapelNames,
        st.scoresByMapel,
        st.sasProgram
      );
      st.nilaiAkhirLayananUmum = computeProgramFinalScore(
        layananUmumMapelNames,
        st.scoresByMapel,
        st.sasLayananUmum
      );
    }

    return NextResponse.json({
      success: true,
      tahunAjaran: baseTA,
      semester,
      kelas,
      kategori: kategoriKey,
      kategoriLabel: categoryDef.label,
      waliKelas,
      mapels: categoryDef.mapels.map((m) => ({ name: m.name, shortName: m.shortName })),
      layananUmumMapels: layananUmumMapels.map((m) => ({ name: m.name, shortName: m.shortName })),
      students: studentMaps,
    });
  } catch (error: any) {
    console.error('PK Kategori GET Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Gagal memuat nilai Program Khusus' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const tahunAjaran = String(body.tahunAjaran || '2026/2027')
      .replace(/\s*\((Ganjil|Genap)\)\s*$/i, '')
      .trim();
    const semester = normalizeSemester(body.semester);
    const kelas = String(body.kelas || '').trim().toUpperCase();
    const kategoriKey = String(body.kategori || '').trim().toUpperCase() as PKCategoryKey;
    const rawMapel = String(body.mapel || '').trim();
    const field = String(body.field || '').trim();
    const guru = String(body.guru || 'Admin').trim();
    const dataNilai = Array.isArray(body.dataNilai) ? body.dataNilai : [];

    const isCatatanField = field === 'catatan';
    const isProgramAssessmentField = ['sts_program', 'sas_program', 'sts_lu', 'sas_lu'].includes(field);
    if (
      !kelas ||
      (!isCatatanField &&
        !isProgramAssessmentField &&
        (!rawMapel || !['m1', 'm2', 'm3', 'sts', 'sas'].includes(field)))
    ) {
      return NextResponse.json(
        { error: 'Parameter kelas, mapel, dan field nilai wajib valid' },
        { status: 400 }
      );
    }

    const storageTA = toStorageTahunAjaran(tahunAjaran, semester);
    const taCandidates = getReadTahunAjaranCandidates(tahunAjaran, semester);

    // Check existing rows for this (TA candidates, kelas)
    const { data: existingRows, error: fetchErr } = await supabase
      .from('nilai_pk')
      .select('id, tahun_ajaran, mata_pelajaran, tipe, materi, sub_materi, metadata')
      .in('tahun_ajaran', taCandidates)
      .eq('kelas', kelas);

    if (fetchErr) throw fetchErr;

    const now = new Date().toISOString();

    if (isCatatanField) {
      const sanitizedCatatan = dataNilai.map((item: any) => ({
        induk: String(item.induk || '').trim(),
        nama: String(item.nama || '').trim(),
        jk: normalizeJK(item.jk || ''),
        catatan: String(item.catatan ?? item.nilai ?? '').trim(),
      }));

      const existingCatatanRow = (existingRows || []).find((r: any) => {
        const rowMetaSem = String(r.metadata?.semester || '').toLowerCase();
        if (semester === 'Ganjil' && rowMetaSem === 'genap') return false;
        return String(r.tipe || '').trim().toLowerCase() === 'catatan_pengajar';
      });

      if (existingCatatanRow) {
        const { error: updateErr } = await supabase
          .from('nilai_pk')
          .update({
            tahun_ajaran: storageTA,
            mata_pelajaran: 'CATATAN_PENGAJAR',
            tipe: 'catatan_pengajar',
            materi: '',
            sub_materi: '',
            guru,
            data_nilai: sanitizedCatatan,
            metadata: { semester },
            updated_at: now,
          })
          .eq('id', existingCatatanRow.id);

        if (updateErr) throw updateErr;
      } else {
        const { error: insertErr } = await supabase.from('nilai_pk').insert({
          tahun_ajaran: storageTA,
          kelas,
          mata_pelajaran: 'CATATAN_PENGAJAR',
          tipe: 'catatan_pengajar',
          materi: '',
          sub_materi: '',
          guru,
          data_nilai: sanitizedCatatan,
          metadata: { semester },
          updated_at: now,
        });

        if (insertErr) throw insertErr;
      }

      return NextResponse.json({
        success: true,
        savedAt: now,
        mapel: 'CATATAN_PENGAJAR',
        field: 'catatan',
      });
    }

    if (isProgramAssessmentField) {
      const resolvedKategori = (
        PK_CATEGORY_MAP[kategoriKey]
          ? kategoriKey
          : MAP_MINAT_BAKAT[kelas] || 'SAINS RISET'
      ) as PKCategoryKey;
      const isLu = field === 'sts_lu' || field === 'sas_lu';
      const isSts = field === 'sts_program' || field === 'sts_lu';
      const targetTipe = isSts ? 'sts' : 'sas';
      const targetProgramMapel = isLu
        ? isSts
          ? PK_LAYANAN_UMUM_STS_MAPEL
          : PK_LAYANAN_UMUM_SAS_MAPEL
        : isSts
        ? getProgramStsStorageMapel(resolvedKategori)
        : getProgramSasStorageMapel(resolvedKategori);
      const targetMetadata = {
        semester,
        scope: isLu ? 'layanan_umum' : 'program',
        kategori: resolvedKategori,
      };

      const sanitizedProgramScores = dataNilai.map((item: any) => ({
        induk: String(item.induk || '').trim(),
        nama: String(item.nama || '').trim(),
        jk: normalizeJK(item.jk || ''),
        nilai: item.nilai !== undefined && item.nilai !== null ? String(item.nilai).trim() : '',
      }));

      const matchingProgramRows = (existingRows || []).filter((r: any) => {
        const rowMetaSem = String(r.metadata?.semester || '').toLowerCase();
        if (semester === 'Ganjil' && rowMetaSem === 'genap') return false;
        return (
          String(r.mata_pelajaran || '').trim().toUpperCase() === targetProgramMapel.toUpperCase() &&
          String(r.tipe || '').trim().toLowerCase() === targetTipe
        );
      });

      const exactProgramRow = matchingProgramRows.find(
        (r: any) => r.tahun_ajaran === storageTA
      );
      const targetProgramRow = exactProgramRow || matchingProgramRows[0];

      if (targetProgramRow) {
        const { error: updateErr } = await supabase
          .from('nilai_pk')
          .update({
            tahun_ajaran: storageTA,
            mata_pelajaran: targetProgramMapel,
            tipe: targetTipe,
            materi: '',
            sub_materi: '',
            guru,
            data_nilai: sanitizedProgramScores,
            metadata: targetMetadata,
            updated_at: now,
          })
          .eq('id', targetProgramRow.id);

        if (updateErr) throw updateErr;
      } else {
        const { error: insertErr } = await supabase.from('nilai_pk').insert({
          tahun_ajaran: storageTA,
          kelas,
          mata_pelajaran: targetProgramMapel,
          tipe: targetTipe,
          materi: '',
          sub_materi: '',
          guru,
          data_nilai: sanitizedProgramScores,
          metadata: targetMetadata,
          updated_at: now,
        });

        if (insertErr) throw insertErr;
      }

      return NextResponse.json({
        success: true,
        savedAt: now,
        mapel: targetProgramMapel,
        field,
      });
    }

    const canonicalMapel =
      PK_CATEGORY_MAP[kategoriKey]
        ? resolveMapelForKategori(kategoriKey, rawMapel)?.name || rawMapel
        : rawMapel;

    const targetStorage = getCanonicalFieldStorage(field as PKScoreField);

    const sanitizedDataNilai = dataNilai.map((item: any) => ({
      induk: String(item.induk || '').trim(),
      nama: String(item.nama || '').trim(),
      jk: normalizeJK(item.jk || ''),
      nilai: item.nilai !== undefined && item.nilai !== null ? String(item.nilai).trim() : '',
    }));
    const matchingRows = (existingRows || []).filter((r: any) => {
      const rowMetaSem = String(r.metadata?.semester || '').toLowerCase();
      if (semester === 'Ganjil' && rowMetaSem === 'genap') return false;
      if (PK_CATEGORY_MAP[kategoriKey]) {
        const resolved = resolveMapelForKategori(kategoriKey, String(r.mata_pelajaran || ''));
        if (!resolved || resolved.name !== canonicalMapel) return false;
      } else if (String(r.mata_pelajaran || '').trim().toLowerCase() !== canonicalMapel.toLowerCase()) {
        return false;
      }
      const cls = classifyLegacyRow(r);
      return cls?.field === field;
    });

    // Prefer updating exact canonical match; if none, migrate legacy match in-place so aliases don't shadow
    const exactRow = matchingRows.find(
      (r: any) =>
        r.tahun_ajaran === storageTA &&
        r.mata_pelajaran === canonicalMapel &&
        r.tipe === targetStorage.tipe &&
        r.materi === targetStorage.materi &&
        r.sub_materi === targetStorage.sub_materi
    );
    const targetRow = exactRow || matchingRows[0];

    if (targetRow) {
      const { error: updateErr } = await supabase
        .from('nilai_pk')
        .update({
          tahun_ajaran: storageTA,
          mata_pelajaran: canonicalMapel,
          tipe: targetStorage.tipe,
          materi: targetStorage.materi,
          sub_materi: targetStorage.sub_materi,
          guru,
          data_nilai: sanitizedDataNilai,
          metadata: { semester },
          updated_at: now,
        })
        .eq('id', targetRow.id);

      if (updateErr) throw updateErr;
    } else {
      const { error: insertErr } = await supabase.from('nilai_pk').insert({
        tahun_ajaran: storageTA,
        kelas,
        mata_pelajaran: canonicalMapel,
        tipe: targetStorage.tipe,
        materi: targetStorage.materi,
        sub_materi: targetStorage.sub_materi,
        guru,
        data_nilai: sanitizedDataNilai,
        metadata: { semester },
        updated_at: now,
      });

      if (insertErr) throw insertErr;
    }

    return NextResponse.json({
      success: true,
      savedAt: now,
      mapel: canonicalMapel,
      field,
    });
  } catch (error: any) {
    console.error('PK Kategori POST Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Gagal menyimpan nilai Program Khusus' },
      { status: 500 }
    );
  }
}
