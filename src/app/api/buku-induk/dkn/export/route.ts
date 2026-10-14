import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAllCachedDataInduk } from '@/lib/data-induk';
import * as xlsx from 'xlsx';
import path from 'path';
import fs from 'fs';
import {
  DKN_MAPELS,
  parseTTL,
  formatGender,
  formatNomorInduk,
  normalizeName,
  getRombelVariations,
  calculateNR,
  calculateNM
} from '@/lib/dkn';
import { getFallbackTemplateData } from '@/lib/dkn-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const reqTa = searchParams.get('ta') || '';
    const reqKelas = searchParams.get('kelas') || 'all';

    // 1. Fetch Students
    const allStudents = await getAllCachedDataInduk();

    const k9Students = allStudents.filter((s: any) => {
      const meta = s.metadata || {};
      const r9 = (meta['ROMBEL KELAS 9'] || '').trim();
      const currRombel = (meta['ROMBEL'] || '').trim();
      const isK9 = r9.startsWith('9') || r9.startsWith('IX') || currRombel.startsWith('9') || currRombel.startsWith('IX');
      return isK9;
    });

    const tasSet = new Set<string>();
    k9Students.forEach((s: any) => {
      const meta = s.metadata || {};
      const ta = meta['TA KELAS 9'] || meta['TAHUN AJARAN'];
      if (ta) tasSet.add(ta.trim());
    });
    const availableTas = Array.from(tasSet).sort().reverse();
    const selectedTa = reqTa && availableTas.includes(reqTa) ? reqTa : (availableTas[0] || '2026/2027');

    let filtered = k9Students.filter((s: any) => {
      const meta = s.metadata || {};
      const studentTa = (meta['TA KELAS 9'] || meta['TAHUN AJARAN'] || '').trim();
      const studentRombel = (meta['ROMBEL KELAS 9'] || meta['ROMBEL'] || '').trim().toUpperCase();

      const matchTa = reqTa === 'all' || studentTa === selectedTa;
      const matchKelas = reqKelas === 'all' || studentRombel === reqKelas.toUpperCase();

      return matchTa && matchKelas;
    });

    filtered.sort((a: any, b: any) => {
      const rombelA = (a.metadata?.['ROMBEL KELAS 9'] || a.metadata?.['ROMBEL'] || '').toUpperCase();
      const rombelB = (b.metadata?.['ROMBEL KELAS 9'] || b.metadata?.['ROMBEL'] || '').toUpperCase();
      if (rombelA !== rombelB) return rombelA.localeCompare(rombelB);

      const namaA = (a.metadata?.['NAMA'] || a.nama || '').toUpperCase();
      const namaB = (b.metadata?.['NAMA'] || b.nama || '').toUpperCase();
      return namaA.localeCompare(namaB);
    });

    // 2. Fetch Legger
    const allRombelsSet = new Set<string>();
    const allTasSet = new Set<string>();

    filtered.forEach((s: any) => {
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
      const { data: dbLegger } = await supabase
        .from('nilai_buku_induk')
        .select('*')
        .in('kelas', Array.from(allRombelsSet))
        .in('tahun_ajaran', Array.from(allTasSet));

      if (dbLegger) leggerRows = dbLegger;
    }

    const templateData = getFallbackTemplateData();

    // 3. Prepare Workbook using public/DKN.xlsx as base template
    const templatePath = path.join(process.cwd(), 'public', 'DKN.xlsx');
    let wb: xlsx.WorkBook;
    let ws: xlsx.WorkSheet;

    if (fs.existsSync(templatePath)) {
      wb = xlsx.readFile(templatePath);
      const sheetName = wb.SheetNames[0];
      ws = wb.Sheets[sheetName];

      // Clear existing student rows (from row index 5 onwards)
      const curRange = xlsx.utils.decode_range(ws['!ref'] || 'A1:EI301');
      for (let r = 5; r <= curRange.e.r; r++) {
        for (let c = 0; c <= curRange.e.c; c++) {
          delete ws[xlsx.utils.encode_cell({ r, c })];
        }
      }
    } else {
      // Build clean workbook from scratch if template file is absent
      wb = xlsx.utils.book_new();
      ws = {};
      wb.Sheets['Sheet1'] = ws;
      wb.SheetNames.push('Sheet1');
    }

    // 4. Fill Student Rows starting at row index 5
    filtered.forEach((s: any, rowIdx: number) => {
      const r = 5 + rowIdx;
      const meta = s.metadata || {};
      const id_siswa = String(meta['ID SISWA'] || s.id_siswa || '').trim();
      const nisn = String(meta['NISN'] || '').trim();
      const nism = String(meta['NISM'] || '').trim();
      const nama = String(meta['NAMA'] || s.nama || '').trim();
      const ttl = parseTTL(meta['TEMPAT, TANGGAL LAHIR']);
      const nomor_induk = formatNomorInduk(id_siswa, nism);
      const jenis_kelamin = formatGender(meta['JENIS KELAMIN']);
      const nama_ayah = String(meta['NAMA AYAH KANDUNG'] || meta['NAMA AYAH'] || meta['NAMA WALI'] || '').trim();

      const templateItem = templateData.get(`nisn:${nisn}`) || templateData.get(`name:${normalizeName(nama)}`) || null;
      const nomor_peserta = String(meta['NOMOR_PESERTA'] || meta['NOMOR PESERTA'] || templateItem?.nomor_peserta || '').trim();

      const h7 = { ta: meta['TA KELAS 7'], rombel: meta['ROMBEL KELAS 7'] };
      const h8 = { ta: meta['TA KELAS 8'], rombel: meta['ROMBEL KELAS 8'] };
      const h9 = { ta: meta['TA KELAS 9'] || meta['TAHUN AJARAN'], rombel: meta['ROMBEL KELAS 9'] || meta['ROMBEL'] };

      const r7Vars = h7.rombel ? getRombelVariations(h7.rombel) : [];
      const r8Vars = h8.rombel ? getRombelVariations(h8.rombel) : [];
      const r9Vars = h9.rombel ? getRombelVariations(h9.rombel) : [];

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

      // Set Student Info (Cols 0-7)
      const setCell = (c: number, val: any, type: 's' | 'n' = 's') => {
        const addr = xlsx.utils.encode_cell({ r, c });
        if (val === null || val === undefined || val === '') {
          delete ws[addr];
          return;
        }
        if (type === 'n') {
          ws[addr] = { t: 'n', v: Number(val) };
        } else {
          ws[addr] = { t: 's', v: String(val) };
        }
      };

      setCell(0, nomor_peserta, 's');
      setCell(1, nisn, 's');
      setCell(2, nomor_induk, 's');
      setCell(3, nama, 's');
      setCell(4, ttl.tempat || templateItem?.tempat_lahir || '', 's');
      setCell(5, ttl.tanggal || templateItem?.tanggal_lahir || '', 's');
      setCell(6, jenis_kelamin || templateItem?.jenis_kelamin || '', 's');
      setCell(7, nama_ayah || templateItem?.nama_ayah || '', 's');

      let totalNM = 0;

      // Fill Subject Grades (Cols 8-135)
      DKN_MAPELS.forEach((m, idx) => {
        const colStart = 8 + (idx * 8);
        const tplGrade = templateItem?.grades?.[m.name];
        const savedR = meta['R_GRADES']?.[m.name] || meta['DKN_R']?.[m.name] || {};

        let r1 = savedR.r1 !== undefined && savedR.r1 !== null && savedR.r1 !== '' ? Number(savedR.r1) : findLeggerGrade(h7.ta, r7Vars, 'Ganjil', m.name);
        if (r1 === null && tplGrade?.r1 !== undefined && tplGrade?.r1 !== null) r1 = tplGrade.r1;

        let r2 = savedR.r2 !== undefined && savedR.r2 !== null && savedR.r2 !== '' ? Number(savedR.r2) : findLeggerGrade(h7.ta, r7Vars, 'Genap', m.name);
        if (r2 === null && tplGrade?.r2 !== undefined && tplGrade?.r2 !== null) r2 = tplGrade.r2;

        let r3 = savedR.r3 !== undefined && savedR.r3 !== null && savedR.r3 !== '' ? Number(savedR.r3) : findLeggerGrade(h8.ta, r8Vars, 'Ganjil', m.name);
        if (r3 === null && tplGrade?.r3 !== undefined && tplGrade?.r3 !== null) r3 = tplGrade.r3;

        let r4 = savedR.r4 !== undefined && savedR.r4 !== null && savedR.r4 !== '' ? Number(savedR.r4) : findLeggerGrade(h8.ta, r8Vars, 'Genap', m.name);
        if (r4 === null && tplGrade?.r4 !== undefined && tplGrade?.r4 !== null) r4 = tplGrade.r4;

        let r5 = savedR.r5 !== undefined && savedR.r5 !== null && savedR.r5 !== '' ? Number(savedR.r5) : findLeggerGrade(h9.ta, r9Vars, 'Ganjil', m.name);
        if (r5 === null && tplGrade?.r5 !== undefined && tplGrade?.r5 !== null) r5 = tplGrade.r5;

        let nr = calculateNR(r1, r2, r3, r4, r5);
        if (nr === 0 && tplGrade?.nr) nr = tplGrade.nr;

        let num: number | null = null;
        const savedNum = meta['NUM']?.[m.name] ?? meta['NILAI_NUM']?.[m.name] ?? meta['NUM']?.[m.key];
        if (savedNum !== undefined && savedNum !== null && savedNum !== '' && !isNaN(Number(savedNum))) {
          num = Number(savedNum);
        } else if (tplGrade?.num !== undefined && tplGrade?.num !== null) {
          num = tplGrade.num;
        }

        let nm = calculateNM(nr, num);
        if (nm === 0 && tplGrade?.nm && num !== null) nm = tplGrade.nm;

        totalNM += nm;

        setCell(colStart + 0, r1, 'n');
        setCell(colStart + 1, r2, 'n');
        setCell(colStart + 2, r3, 'n');
        setCell(colStart + 3, r4, 'n');
        setCell(colStart + 4, r5, 'n');
        setCell(colStart + 5, nr, 'n');
        setCell(colStart + 6, num, 'n');
        setCell(colStart + 7, nm, 'n');
      });

      const jumlah_nm = Number(totalNM.toFixed(2));
      const rata_rata_nm = Number((totalNM / DKN_MAPELS.length).toFixed(2));
      const status_lulus = templateItem?.status_lulus || 'LULUS';

      setCell(136, jumlah_nm, 'n');
      setCell(137, rata_rata_nm, 'n');
      setCell(138, status_lulus, 's');
    });

    const endRow = Math.max(4, 4 + filtered.length);
    ws['!ref'] = xlsx.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: 138, r: endRow } });

    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const cleanKelasName = reqKelas === 'all' ? 'Semua_Kelas' : reqKelas;
    const cleanTaName = selectedTa.replace('/', '-');

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="DKN_${cleanKelasName}_${cleanTaName}.xlsx"`
      }
    });

  } catch (error: any) {
    console.error('Error exporting DKN:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
