import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import * as xlsx from 'xlsx';

export const dynamic = 'force-dynamic';

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
          errors.push(`File ${file.name}: Format tidak valid. Pastikan Kelas, Semester, dan Tahun Ajaran ada di posisinya.`);
          continue;
        }

        const dataEkstra: any[] = [];

        // Rows start at index 6 (Row 7)
        for (let i = 6; i < data.length; i++) {
          const row = data[i];
          if (!row || !row[1] || !row[3]) continue; // Skip empty rows

          const nis = String(row[1]).trim();
          const nama = String(row[3]).trim();
          const jenisEkstra = String(row[5] || '').trim();
          const nilai = String(row[6] || '').trim();

          if (jenisEkstra && nilai) {
            dataEkstra.push({ nis, nama, jenis_ekstra: jenisEkstra, nilai });
          }
        }

        if (dataEkstra.length === 0) {
          errors.push(`File ${file.name}: Tidak ada data nilai ekstra yang terisi.`);
          continue;
        }

        // Delete existing
        await supabase
          .from('ekstra_buku_induk')
          .delete()
          .match({ kelas, semester, tahun_ajaran });

        // Insert new
        const { error: insError } = await supabase
          .from('ekstra_buku_induk')
          .insert({
            kelas,
            semester,
            tahun_ajaran,
            data_ekstra: dataEkstra
          });

        if (insError) throw insError;
        totalSaved += dataEkstra.length;
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
