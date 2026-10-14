import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAllCachedDataInduk } from '@/lib/data-induk';
import { revalidateTag } from 'next/cache';
import {
  DKN_MAPELS,
  parseTTL,
  formatGender,
  formatNomorInduk,
  normalizeName,
  getRombelVariations,
  calculateNR,
  calculateNM,
  DknStudentItem,
  DknMapelGrade
} from '@/lib/dkn';
import { getFallbackTemplateData } from '@/lib/dkn-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const reqTa = searchParams.get('ta') || '';
    const reqKelas = searchParams.get('kelas') || 'all';
    const search = (searchParams.get('search') || '').trim().toLowerCase();

    // 1. Fetch All Students from Cache
    const allStudents = await getAllCachedDataInduk();

    // 2. Filter for Kelas 9 Students
    const k9Students = allStudents.filter((s: any) => {
      const meta = s.metadata || {};
      const r9 = (meta['ROMBEL KELAS 9'] || '').trim();
      const currRombel = (meta['ROMBEL'] || '').trim();
      const ta9 = (meta['TA KELAS 9'] || '').trim();
      const currTa = (meta['TAHUN AJARAN'] || '').trim();

      const isK9 = r9.startsWith('9') || r9.startsWith('IX') || currRombel.startsWith('9') || currRombel.startsWith('IX');
      return isK9 || (ta9 && r9);
    });

    // 3. Extract unique available TAs and Classes
    const tasSet = new Set<string>();
    const kelasSet = new Set<string>();

    k9Students.forEach((s: any) => {
      const meta = s.metadata || {};
      const ta = meta['TA KELAS 9'] || meta['TAHUN AJARAN'];
      const rombel = meta['ROMBEL KELAS 9'] || meta['ROMBEL'];
      if (ta) tasSet.add(ta.trim());
      if (rombel && (rombel.startsWith('9') || rombel.startsWith('IX'))) {
        kelasSet.add(rombel.trim().toUpperCase());
      }
    });

    const availableTas = Array.from(tasSet).sort().reverse();
    const availableKelas = Array.from(kelasSet).sort();

    // Determine target TA
    let selectedTa = reqTa;
    if (!selectedTa || !availableTas.includes(selectedTa)) {
      // Default to the first available TA (e.g. 2026/2027 or 2025/2026)
      selectedTa = availableTas[0] || '2026/2027';
    }

    // 4. Filter students by selected TA and Kelas
    let filteredStudents = k9Students.filter((s: any) => {
      const meta = s.metadata || {};
      const studentTa = (meta['TA KELAS 9'] || meta['TAHUN AJARAN'] || '').trim();
      const studentRombel = (meta['ROMBEL KELAS 9'] || meta['ROMBEL'] || '').trim().toUpperCase();

      const matchTa = reqTa === 'all' || studentTa === selectedTa;
      const matchKelas = reqKelas === 'all' || studentRombel === reqKelas.toUpperCase();

      return matchTa && matchKelas;
    });

    // 5. Apply Search if present
    if (search) {
      filteredStudents = filteredStudents.filter((s: any) => {
        const meta = s.metadata || {};
        const nama = (meta['NAMA'] || s.nama || '').toLowerCase();
        const nisn = (meta['NISN'] || '').toLowerCase();
        const nis = (meta['ID SISWA'] || s.id_siswa || '').toLowerCase();
        const noPeserta = (meta['NOMOR_PESERTA'] || meta['NOMOR PESERTA'] || '').toLowerCase();
        return nama.includes(search) || nisn.includes(search) || nis.includes(search) || noPeserta.includes(search);
      });
    }

    // Sort students by rombel then name
    filteredStudents.sort((a: any, b: any) => {
      const rombelA = (a.metadata?.['ROMBEL KELAS 9'] || a.metadata?.['ROMBEL'] || '').toUpperCase();
      const rombelB = (b.metadata?.['ROMBEL KELAS 9'] || b.metadata?.['ROMBEL'] || '').toUpperCase();
      if (rombelA !== rombelB) return rombelA.localeCompare(rombelB);

      const namaA = (a.metadata?.['NAMA'] || a.nama || '').toUpperCase();
      const namaB = (b.metadata?.['NAMA'] || b.nama || '').toUpperCase();
      return namaA.localeCompare(namaB);
    });

    // 6. Collect history to fetch grades from `nilai_buku_induk`
    const allRombelsSet = new Set<string>();
    const allTasSet = new Set<string>();

    filteredStudents.forEach((s: any) => {
      const meta = s.metadata || {};
      const h7 = { ta: meta['TA KELAS 7'], rombel: meta['ROMBEL KELAS 7'] };
      const h8 = { ta: meta['TA KELAS 8'], rombel: meta['ROMBEL KELAS 8'] };
      const h9 = { ta: meta['TA KELAS 9'] || meta['TAHUN AJARAN'], rombel: meta['ROMBEL KELAS 9'] || meta['ROMBEL'] };

      [h7, h8, h9].forEach(h => {
        if (h.ta && h.rombel) {
          allTasSet.add(h.ta.trim());
          getRombelVariations(h.rombel).forEach(r => allRombelsSet.add(r));
        }
      });
    });

    let leggerRows: any[] = [];
    if (allRombelsSet.size > 0 && allTasSet.size > 0) {
      const { data: dbLegger, error: leggerErr } = await supabase
        .from('nilai_buku_induk')
        .select('*')
        .in('kelas', Array.from(allRombelsSet))
        .in('tahun_ajaran', Array.from(allTasSet));

      if (!leggerErr && dbLegger) {
        leggerRows = dbLegger;
      }
    }

    // 7. Load Template Fallback Data (from public/DKN.xlsx)
    const templateData = getFallbackTemplateData();

    // 8. Build DKN Student Objects
    const resultStudents: DknStudentItem[] = filteredStudents.map((s: any) => {
      const meta = s.metadata || {};
      const id_siswa = String(meta['ID SISWA'] || s.id_siswa || '').trim();
      const nisn = String(meta['NISN'] || '').trim();
      const nism = String(meta['NISM'] || '').trim();
      const nama = String(meta['NAMA'] || s.nama || '').trim();
      const rombel = String(meta['ROMBEL KELAS 9'] || meta['ROMBEL'] || '').trim().toUpperCase();
      const tahun_ajaran = String(meta['TA KELAS 9'] || meta['TAHUN AJARAN'] || '').trim();
      const status = String(meta['STATUS SISWA'] || 'AKTIF').trim().toUpperCase();

      const ttl = parseTTL(meta['TEMPAT, TANGGAL LAHIR']);
      const nomor_induk = formatNomorInduk(id_siswa, nism);
      const jenis_kelamin = formatGender(meta['JENIS KELAMIN']);
      const nama_ayah = String(meta['NAMA AYAH KANDUNG'] || meta['NAMA AYAH'] || meta['NAMA WALI'] || '').trim();

      // Find template fallback if available
      const templateItem = templateData.get(`nisn:${nisn}`) || templateData.get(`name:${normalizeName(nama)}`) || null;

      // Col A: Nomor Peserta
      const nomor_peserta = String(meta['NOMOR_PESERTA'] || meta['NOMOR PESERTA'] || templateItem?.nomor_peserta || '').trim();

      // History
      const h7 = { ta: meta['TA KELAS 7'], rombel: meta['ROMBEL KELAS 7'] };
      const h8 = { ta: meta['TA KELAS 8'], rombel: meta['ROMBEL KELAS 8'] };
      const h9 = { ta: meta['TA KELAS 9'] || meta['TAHUN AJARAN'], rombel: meta['ROMBEL KELAS 9'] || meta['ROMBEL'] };

      const r7Vars = h7.rombel ? getRombelVariations(h7.rombel) : [];
      const r8Vars = h8.rombel ? getRombelVariations(h8.rombel) : [];
      const r9Vars = h9.rombel ? getRombelVariations(h9.rombel) : [];

      // Helper to find grade in legger
      const findLeggerGrade = (ta: string | undefined, rombelVars: string[], semester: string, mapelName: string): number | null => {
        if (!ta || rombelVars.length === 0) return null;
        const matchingLegger = leggerRows.find(row =>
          row.tahun_ajaran === ta &&
          rombelVars.includes(row.kelas) &&
          row.semester?.toLowerCase() === semester.toLowerCase() &&
          row.mata_pelajaran?.toLowerCase() === mapelName.toLowerCase()
        );
        if (!matchingLegger || !matchingLegger.data_nilai) return null;

        const normStudent = normalizeName(nama);
        const match = matchingLegger.data_nilai.find((d: any) => {
          if (d.nis && (d.nis === id_siswa || d.nis === nism || (nism && nism.endsWith(d.nis)))) return true;
          if (d.nama && normalizeName(d.nama) === normStudent) return true;
          return false;
        });

        if (match && match.nilai !== undefined && match.nilai !== null && match.nilai !== '') {
          const val = Number(match.nilai);
          return isNaN(val) ? null : val;
        }
        return null;
      };

      // Calculate grades for each of the 16 mapels
      const grades: Record<string, DknMapelGrade> = {};
      let totalNM = 0;

      DKN_MAPELS.forEach(m => {
        const tplGrade = templateItem?.grades?.[m.name];

        // R1: 7 Ganjil
        let r1 = findLeggerGrade(h7.ta, r7Vars, 'Ganjil', m.name);
        if (r1 === null && tplGrade?.r1 !== undefined && tplGrade?.r1 !== null) r1 = tplGrade.r1;

        // R2: 7 Genap
        let r2 = findLeggerGrade(h7.ta, r7Vars, 'Genap', m.name);
        if (r2 === null && tplGrade?.r2 !== undefined && tplGrade?.r2 !== null) r2 = tplGrade.r2;

        // R3: 8 Ganjil
        let r3 = findLeggerGrade(h8.ta, r8Vars, 'Ganjil', m.name);
        if (r3 === null && tplGrade?.r3 !== undefined && tplGrade?.r3 !== null) r3 = tplGrade.r3;

        // R4: 8 Genap
        let r4 = findLeggerGrade(h8.ta, r8Vars, 'Genap', m.name);
        if (r4 === null && tplGrade?.r4 !== undefined && tplGrade?.r4 !== null) r4 = tplGrade.r4;

        // R5: 9 Ganjil
        let r5 = findLeggerGrade(h9.ta, r9Vars, 'Ganjil', m.name);
        if (r5 === null && tplGrade?.r5 !== undefined && tplGrade?.r5 !== null) r5 = tplGrade.r5;

        // NR: Average of R1..R5
        let nr = calculateNR(r1, r2, r3, r4, r5);
        if (nr === 0 && tplGrade?.nr) nr = tplGrade.nr;

        // NUM: Manual Input
        let num: number | null = null;
        const savedNum = meta['NUM']?.[m.name] ?? meta['NILAI_NUM']?.[m.name] ?? meta['NUM']?.[m.key];
        if (savedNum !== undefined && savedNum !== null && savedNum !== '' && !isNaN(Number(savedNum))) {
          num = Number(savedNum);
        } else if (tplGrade?.num !== undefined && tplGrade?.num !== null) {
          num = tplGrade.num;
        }

        // NM: Nilai Madrasah (60% NR + 40% NUM)
        let nm = calculateNM(nr, num);
        if (nm === 0 && tplGrade?.nm && (num !== null)) nm = tplGrade.nm;

        totalNM += nm;

        grades[m.name] = { r1, r2, r3, r4, r5, nr, num, nm };
      });

      const jumlah_nm = Number(totalNM.toFixed(2));
      const rata_rata_nm = Number((totalNM / DKN_MAPELS.length).toFixed(2));
      const status_lulus = templateItem?.status_lulus || 'LULUS';

      return {
        id: s.id,
        id_siswa,
        nisn,
        nomor_induk,
        nama,
        tempat_lahir: ttl.tempat || templateItem?.tempat_lahir || '',
        tanggal_lahir: ttl.tanggal || templateItem?.tanggal_lahir || '',
        jenis_kelamin: jenis_kelamin || templateItem?.jenis_kelamin || '',
        nama_ayah: nama_ayah || templateItem?.nama_ayah || '',
        nomor_peserta,
        rombel,
        tahun_ajaran,
        status,
        grades,
        jumlah_nm,
        rata_rata_nm,
        status_lulus
      };
    });

    return NextResponse.json({
      success: true,
      data: resultStudents,
      availableTas,
      availableKelas,
      currentTa: selectedTa,
      currentKelas: reqKelas,
      subjects: DKN_MAPELS
    });

  } catch (error: any) {
    console.error('Error fetching DKN data:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { updates } = body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ success: false, error: 'Tidak ada data pembaruan yang dikirim' }, { status: 400 });
    }

    // Extract student identifiers
    const studentIds = updates.map(u => u.id).filter(Boolean);
    const nisList = updates.map(u => u.id_siswa || u.nis).filter(Boolean);

    // Fetch existing records from data_induk
    let query = supabase.from('data_induk').select('id, id_siswa, metadata');
    if (studentIds.length > 0) {
      query = query.in('id', studentIds);
    } else {
      query = query.in('id_siswa', nisList);
    }

    const { data: existingRows, error: fetchErr } = await query;
    if (fetchErr) throw fetchErr;

    const rowMap = new Map<any, any>();
    (existingRows || []).forEach(r => {
      rowMap.set(String(r.id), r);
      if (r.id_siswa) rowMap.set(String(r.id_siswa), r);
    });

    let successCount = 0;
    const errors: string[] = [];

    // Process updates in chunks of 20
    const chunkSize = 20;
    for (let i = 0; i < updates.length; i += chunkSize) {
      const chunk = updates.slice(i, i + chunkSize);
      const updatePromises = chunk.map(async u => {
        const existing = rowMap.get(String(u.id)) || rowMap.get(String(u.id_siswa || u.nis));
        if (!existing) {
          errors.push(`Siswa ID ${u.id || u.nis} tidak ditemukan`);
          return;
        }

        const currentMeta = existing.metadata || {};
        const newMeta = { ...currentMeta };

        if (u.nomor_peserta !== undefined) {
          newMeta['NOMOR_PESERTA'] = String(u.nomor_peserta).trim();
        }

        if (u.num && typeof u.num === 'object') {
          newMeta['NUM'] = { ...(newMeta['NUM'] || {}), ...u.num };
        }

        const { error: upErr } = await supabase
          .from('data_induk')
          .update({ metadata: newMeta })
          .eq('id', existing.id);

        if (upErr) {
          errors.push(`Gagal update ID ${existing.id}: ${upErr.message}`);
        } else {
          successCount++;
        }
      });

      await Promise.all(updatePromises);
    }

    revalidateTag('data_induk', {} as any);

    return NextResponse.json({
      success: true,
      updatedCount: successCount,
      errors
    });

  } catch (error: any) {
    console.error('Error saving DKN updates:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
