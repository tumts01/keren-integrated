import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import * as xlsx from 'xlsx';

export const dynamic = 'force-dynamic';

const mapelsIndex = [
  { name: 'Alquran Hadis', col: 5 },
  { name: 'Akidah Akhlak', col: 6 },
  { name: 'Fikih', col: 7 },
  { name: 'Sejarah Kebudayaan Islam', col: 8 },
  { name: 'Bahasa Arab', col: 9 },
  { name: 'Pendidikan Pancasila', col: 10 },
  { name: 'Bahasa Indonesia', col: 11 },
  { name: 'Matematika', col: 12 },
  { name: 'Ilmu Pengetahuan Alam', col: 13 },
  { name: 'Ilmu Pengetahuan Sosial', col: 14 },
  { name: 'Bahasa Inggris', col: 15 },
  { name: 'Pendidikan Jasmani, Olah Raga dan Kesehatan', col: 16 },
  { name: 'Informatika', col: 17 },
  { name: 'Seni Budaya', col: 18 },
  { name: 'Bahasa Daerah', col: 19 },
  { name: 'KE-NU-AN', col: 20 }
];

function cleanNisn(val: unknown): string {
  if (val === undefined || val === null) return '';
  return String(val).replace(/^'/, '').trim();
}

function detectStudentColumns(data: unknown[][]): { nisnCol: number; namaCol: number } {
  let nisnCol = 2; // Default Kolom C
  let namaCol = 3; // Default Kolom D
  let foundNisn = false;
  let foundNama = false;

  const scanLimit = Math.min(data.length, 8);
  for (let r = 0; r < scanLimit; r++) {
    const row = data[r];
    if (!Array.isArray(row)) continue;
    for (let c = 0; c < Math.min(row.length, 8); c++) {
      const cell = String(row[c] ?? '').trim().toUpperCase();
      if (!foundNisn && cell === 'NISN') {
        nisnCol = c;
        foundNisn = true;
      }
      if (!foundNama && (cell === 'NAMA' || cell === 'NAMA SISWA' || cell === 'NAMA PESERTA DIDIK')) {
        namaCol = c;
        foundNama = true;
      }
    }
  }
  return { nisnCol, namaCol };
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('file') as File[];
    
    if (!files || files.length === 0) {
      return NextResponse.json({ success: false, error: 'No files provided' }, { status: 400 });
    }

    let totalSaved = 0;
    const errors: string[] = [];

    for (const file of files) {
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const wb = xlsx.read(buffer, { type: 'buffer' });
        const sheetName = wb.SheetNames[0];
        const sheet = wb.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json<any[]>(sheet, { header: 1 });

        const kelas = String(data[1]?.[1] || '').trim();
        const semester = String(data[1]?.[4] || '').trim();
        const tahun_ajaran = String(data[2]?.[4] || '').trim();

        if (!kelas || !semester || !tahun_ajaran) {
          errors.push(`File ${file.name}: Format tidak valid.`);
          continue;
        }

        const { nisnCol, namaCol } = detectStudentColumns(data);

        const mapelDataMap: Record<string, any[]> = {};
        mapelsIndex.forEach(m => { mapelDataMap[m.name] = []; });

        for (let i = 7; i < data.length; i++) {
          const row = data[i];
          if (!row) continue;

          const nisn = cleanNisn(row[nisnCol]);
          const nisnDigits = nisn.replace(/\D/g, '');
          const nama = String(row[namaCol] || '').trim();

          // Wajib ada NISN (berisi angka) & Nama; tidak lagi bergantung pada kolom NIS
          if (!nisnDigits || !nama) continue;

          mapelsIndex.forEach(m => {
            const val = row[m.col];
            if (val !== undefined && val !== null && val !== '') {
              mapelDataMap[m.name].push({ nisn: nisnDigits, nama, nilai: val });
            }
          });
        }

        const insertPayload = mapelsIndex.map(m => ({
          kelas,
          semester,
          tahun_ajaran,
          mata_pelajaran: m.name,
          data_nilai: mapelDataMap[m.name]
        })).filter(payload => payload.data_nilai.length > 0);

        // Delete existing
        await supabase
          .from('nilai_buku_induk')
          .delete()
          .match({ kelas, semester, tahun_ajaran });

        // Insert new
        if (insertPayload.length > 0) {
          const { error: insError } = await supabase
            .from('nilai_buku_induk')
            .insert(insertPayload);
          if (insError) throw insError;
          totalSaved += insertPayload.length;
        }
      } catch (err: any) {
        errors.push(`File ${file.name} gagal: ${err.message}`);
      }
    }

    if (errors.length > 0 && totalSaved === 0) {
      return NextResponse.json({ success: false, error: errors.join(', ') }, { status: 400 });
    }

    return NextResponse.json({ success: true, count: totalSaved, errors });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
