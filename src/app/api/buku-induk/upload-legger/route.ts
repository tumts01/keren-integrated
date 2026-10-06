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

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json<any[]>(sheet, { header: 1 });

    const kelas = String(data[1]?.[1] || '').trim();
    const semester = String(data[1]?.[4] || '').trim();
    const tahunAjaran = String(data[2]?.[4] || '').trim();

    if (!kelas || !semester || !tahunAjaran) {
      return NextResponse.json({ success: false, error: 'Format Excel tidak valid. Pastikan Kelas, Semester, dan Tahun Ajaran ada di posisinya.' }, { status: 400 });
    }

    // Collect data per mapel
    const mapelDataMap: Record<string, any[]> = {};
    mapelsIndex.forEach(m => {
      mapelDataMap[m.name] = [];
    });

    // Rows start at index 7 (Row 8)
    for (let i = 7; i < data.length; i++) {
      const row = data[i];
      if (!row || !row[1] || !row[3]) continue; // Skip empty rows (NIS or Nama missing)

      const nis = String(row[1]).trim();
      const nama = String(row[3]).trim();

      mapelsIndex.forEach(m => {
        const val = row[m.col];
        if (val !== undefined && val !== null && val !== '') {
          mapelDataMap[m.name].push({
            nis,
            nama,
            nilai: val
          });
        }
      });
    }

    // Delete existing records for this class/semester/ta
    const { error: delError } = await supabase
      .from('nilai_buku_induk')
      .delete()
      .match({ kelas, semester, tahun_ajaran: tahunAjaran });
      
    if (delError) {
      console.error('Delete error:', delError);
      return NextResponse.json({ success: false, error: 'Gagal menghapus data lama' }, { status: 500 });
    }

    // Insert new records
    const insertPayload = mapelsIndex.map(m => ({
      kelas,
      semester,
      tahun_ajaran: tahunAjaran,
      mata_pelajaran: m.name,
      data_nilai: mapelDataMap[m.name]
    })).filter(payload => payload.data_nilai.length > 0);

    if (insertPayload.length > 0) {
      const { error: insError } = await supabase
        .from('nilai_buku_induk')
        .insert(insertPayload);
        
      if (insError) {
        console.error('Insert error:', insError);
        return NextResponse.json({ success: false, error: 'Gagal menyimpan data baru' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, kelas, semester, count: insertPayload.length });
  } catch (err: any) {
    console.error('Error uploading legger:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
