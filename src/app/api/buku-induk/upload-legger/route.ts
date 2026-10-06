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
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    if (action === 'save') {
      const body = await request.json();
      const payloadsToSave = body.payloads;

      if (!payloadsToSave || payloadsToSave.length === 0) {
        return NextResponse.json({ success: false, error: 'Tidak ada data untuk disimpan' }, { status: 400 });
      }

      let totalSaved = 0;

      for (const item of payloadsToSave) {
        const { kelas, semester, tahun_ajaran, insertPayload } = item;
        
        // Delete existing
        const { error: delError } = await supabase
          .from('nilai_buku_induk')
          .delete()
          .match({ kelas, semester, tahun_ajaran });
          
        if (delError) throw delError;

        // Insert new
        if (insertPayload && insertPayload.length > 0) {
          const { error: insError } = await supabase
            .from('nilai_buku_induk')
            .insert(insertPayload);
            
          if (insError) throw insError;
          totalSaved += insertPayload.length;
        }
      }

      return NextResponse.json({ success: true, count: totalSaved });
    } else {
      // Preview Mode
      const formData = await request.formData();
      const files = formData.getAll('file') as File[];
      
      if (!files || files.length === 0) {
        return NextResponse.json({ success: false, error: 'No files provided' }, { status: 400 });
      }

      const results = [];

      for (const file of files) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const wb = xlsx.read(buffer, { type: 'buffer' });
        const sheetName = wb.SheetNames[0];
        const sheet = wb.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json<any[]>(sheet, { header: 1 });

        const kelas = String(data[1]?.[1] || '').trim();
        const semester = String(data[1]?.[4] || '').trim();
        const tahun_ajaran = String(data[2]?.[4] || '').trim();

        if (!kelas || !semester || !tahun_ajaran) {
          results.push({ fileName: file.name, error: 'Format Excel tidak valid. Pastikan Kelas, Semester, dan Tahun Ajaran ada di posisinya.' });
          continue;
        }

        const mapelDataMap: Record<string, any[]> = {};
        mapelsIndex.forEach(m => { mapelDataMap[m.name] = []; });

        let siswaSet = new Set<string>();

        // Rows start at index 7 (Row 8)
        for (let i = 7; i < data.length; i++) {
          const row = data[i];
          if (!row || !row[1] || !row[3]) continue; // Skip empty rows

          const nis = String(row[1]).trim();
          const nama = String(row[3]).trim();

          mapelsIndex.forEach(m => {
            const val = row[m.col];
            if (val !== undefined && val !== null && val !== '') {
              mapelDataMap[m.name].push({ nis, nama, nilai: val });
              siswaSet.add(nis);
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

        results.push({
          fileName: file.name,
          kelas,
          semester,
          tahun_ajaran,
          siswaCount: siswaSet.size,
          insertPayload
        });
      }

      return NextResponse.json({ success: true, previews: results });
    }
  } catch (err: any) {
    console.error('Error uploading legger:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
