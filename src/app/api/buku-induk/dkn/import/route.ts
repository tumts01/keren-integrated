import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAllCachedDataInduk } from '@/lib/data-induk';
import * as xlsx from 'xlsx';
import { revalidateTag } from 'next/cache';
import { DKN_MAPELS, normalizeName } from '@/lib/dkn';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ success: false, error: 'File Excel tidak ditemukan' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const wb = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const rawRows = xlsx.utils.sheet_to_json<any[]>(ws, { header: 1 });

    if (!rawRows || rawRows.length === 0) {
      return NextResponse.json({ success: false, error: 'File Excel kosong' }, { status: 400 });
    }

    // 1. Fetch All Students from Cache
    const allStudents = await getAllCachedDataInduk();
    const studentMap = new Map<string, any>();

    allStudents.forEach((s: any) => {
      const meta = s.metadata || {};
      const nisn = String(meta['NISN'] || '').trim();
      const nis = String(meta['ID SISWA'] || s.id_siswa || '').trim();
      const nama = String(meta['NAMA'] || s.nama || '').trim();

      if (nisn) studentMap.set(`nisn:${nisn}`, s);
      if (nis) studentMap.set(`nis:${nis}`, s);
      if (nama) studentMap.set(`name:${normalizeName(nama)}`, s);
    });

    // 2. Detect Excel Format
    // Check if it's the official DKN layout (5 header rows, col 0 is NOMOR PESERTA)
    const isOfficialDknFormat = rawRows.length > 5 && (
      String(rawRows[0]?.[0] || '').toUpperCase().includes('NOMOR PESERTA') ||
      String(rawRows[2]?.[14] || '').toUpperCase() === 'NUM'
    );

    const updatesToApply: Array<{
      id: any;
      nomor_peserta: string;
      numMap: Record<string, number>;
    }> = [];

    const notFoundList: string[] = [];

    if (isOfficialDknFormat) {
      // Official DKN format: starts at row 5
      for (let i = 5; i < rawRows.length; i++) {
        const row = rawRows[i];
        if (!row || (!row[0] && !row[1] && !row[3])) continue;

        const nomor_peserta = String(row[0] || '').trim();
        const nisn = String(row[1] || '').trim();
        const nis = String(row[2] || '').split('/')[0]?.trim() || '';
        const nama = String(row[3] || '').trim();

        const student = studentMap.get(`nisn:${nisn}`) ||
          studentMap.get(`nis:${nis}`) ||
          studentMap.get(`name:${normalizeName(nama)}`);

        if (!student) {
          notFoundList.push(nama || nisn || `Baris ${i + 1}`);
          continue;
        }

        const numMap: Record<string, number> = {};
        DKN_MAPELS.forEach((m, idx) => {
          const colNum = 8 + (idx * 8) + 6; // Col index for NUM
          const numVal = row[colNum];
          if (numVal !== undefined && numVal !== null && numVal !== '' && !isNaN(Number(numVal))) {
            numMap[m.name] = Number(numVal);
          }
        });

        updatesToApply.push({
          id: student.id,
          nomor_peserta,
          numMap
        });
      }
    } else {
      // Flexible / simplified Excel format
      const headerRow = (rawRows[0] || []).map((h: any) => String(h || '').trim().toLowerCase());
      const colNisn = headerRow.findIndex(h => h.includes('nisn'));
      const colNis = headerRow.findIndex(h => h === 'nis' || h.includes('induk'));
      const colNama = headerRow.findIndex(h => h.includes('nama'));
      const colNoPes = headerRow.findIndex(h => h.includes('peserta') || h.includes('nopes'));

      // Map columns for subjects
      const subjectCols: Array<{ mapelName: string; colIdx: number }> = [];
      DKN_MAPELS.forEach(m => {
        const idx = headerRow.findIndex(h =>
          h.includes(m.name.toLowerCase()) ||
          h === m.short.toLowerCase() ||
          h.includes(m.key.toLowerCase())
        );
        if (idx !== -1) {
          subjectCols.push({ mapelName: m.name, colIdx: idx });
        }
      });

      for (let i = 1; i < rawRows.length; i++) {
        const row = rawRows[i];
        if (!row) continue;

        const nisn = colNisn !== -1 ? String(row[colNisn] || '').trim() : '';
        const nis = colNis !== -1 ? String(row[colNis] || '').trim() : '';
        const nama = colNama !== -1 ? String(row[colNama] || '').trim() : '';
        const nomor_peserta = colNoPes !== -1 ? String(row[colNoPes] || '').trim() : '';

        const student = (nisn ? studentMap.get(`nisn:${nisn}`) : null) ||
          (nis ? studentMap.get(`nis:${nis}`) : null) ||
          (nama ? studentMap.get(`name:${normalizeName(nama)}`) : null);

        if (!student) {
          if (nama || nisn || nis) notFoundList.push(nama || nisn || nis || `Baris ${i + 1}`);
          continue;
        }

        const numMap: Record<string, number> = {};
        subjectCols.forEach(sc => {
          const val = row[sc.colIdx];
          if (val !== undefined && val !== null && val !== '' && !isNaN(Number(val))) {
            numMap[sc.mapelName] = Number(val);
          }
        });

        updatesToApply.push({
          id: student.id,
          nomor_peserta,
          numMap
        });
      }
    }

    if (updatesToApply.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Tidak ada data siswa yang cocok ditemukan dalam file Excel'
      }, { status: 400 });
    }

    // 3. Batch Update in Supabase
    const { data: dbCurrent } = await supabase
      .from('data_induk')
      .select('id, metadata')
      .in('id', updatesToApply.map(u => u.id));

    const currentMap = new Map<any, any>();
    (dbCurrent || []).forEach(r => currentMap.set(r.id, r.metadata || {}));

    let updatedCount = 0;
    const errors: string[] = [];
    const chunkSize = 25;

    for (let i = 0; i < updatesToApply.length; i += chunkSize) {
      const chunk = updatesToApply.slice(i, i + chunkSize);
      const promises = chunk.map(async u => {
        const curMeta = currentMap.get(u.id) || {};
        const newMeta = { ...curMeta };

        if (u.nomor_peserta) {
          newMeta['NOMOR_PESERTA'] = u.nomor_peserta;
        }

        if (Object.keys(u.numMap).length > 0) {
          newMeta['NUM'] = { ...(newMeta['NUM'] || {}), ...u.numMap };
        }

        const { error: upErr } = await supabase
          .from('data_induk')
          .update({ metadata: newMeta })
          .eq('id', u.id);

        if (upErr) {
          errors.push(`Gagal update ID ${u.id}: ${upErr.message}`);
        } else {
          updatedCount++;
        }
      });

      await Promise.all(promises);
    }

    revalidateTag('data_induk', {} as any);

    return NextResponse.json({
      success: true,
      updatedCount,
      notFoundCount: notFoundList.length,
      notFoundSample: notFoundList.slice(0, 5),
      errors
    });

  } catch (error: any) {
    console.error('Error importing DKN Excel:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
