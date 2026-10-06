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

        let kelas = '';
        let semester = '';
        let tahun_ajaran = '';
        let headerRowIdx = -1;

        for (let i = 0; i < Math.min(data.length, 10); i++) {
          const rowStr = (data[i] || []).join(' ').toLowerCase();
          if (rowStr.includes('kelas:')) {
            const kIdx = data[i].findIndex(c => String(c).toLowerCase().includes('kelas:'));
            if (kIdx !== -1 && data[i][kIdx + 1]) kelas = String(data[i][kIdx + 1]).trim();
          }
          if (rowStr.includes('semester:')) {
            const sIdx = data[i].findIndex(c => String(c).toLowerCase().includes('semester:'));
            if (sIdx !== -1 && data[i][sIdx + 1]) semester = String(data[i][sIdx + 1]).trim();
          }
          if (rowStr.includes('tahun ajaran:')) {
            const tIdx = data[i].findIndex(c => String(c).toLowerCase().includes('tahun ajaran:'));
            if (tIdx !== -1 && data[i][tIdx + 1]) tahun_ajaran = String(data[i][tIdx + 1]).trim();
          }
          if (rowStr.includes('nis') && rowStr.includes('nama') && rowStr.includes('nilai')) {
            headerRowIdx = i;
          }
        }

        if (!kelas || !semester || !tahun_ajaran) {
          errors.push(`File ${file.name}: Format tidak valid. Pastikan Kelas, Semester, dan Tahun Ajaran ada di posisinya.`);
          continue;
        }

        const dataEkstra: any[] = [];
        const startIdx = headerRowIdx !== -1 ? headerRowIdx + 1 : 6;
        
        let nisCol = 1;
        let nisnCol = 2;
        let namaCol = 3;
        let ekstraCol = 5;
        let nilaiCol = 6;
        
        if (headerRowIdx !== -1) {
           const headers = data[headerRowIdx].map((h: any) => String(h || '').toLowerCase().trim());
           const findCol = (name: string) => headers.findIndex((h: string) => h.includes(name));
           nisCol = headers.findIndex((h: string) => h === 'nis') > -1 ? headers.findIndex((h: string) => h === 'nis') : 1;
           nisnCol = findCol('nisn') > -1 ? findCol('nisn') : 2;
           namaCol = findCol('nama') > -1 ? findCol('nama') : 3;
           ekstraCol = findCol('jenis ekstra') > -1 ? findCol('jenis ekstra') : 5;
           nilaiCol = findCol('nilai') > -1 ? findCol('nilai') : 6;
        }

        for (let i = startIdx; i < data.length; i++) {
          const row = data[i];
          if (!row) continue;
          
          let nis = String(row[nisCol] || '').trim();
          let nisn = String(row[nisnCol] || '').trim();
          let nama = String(row[namaCol] || '').trim();
          let jenisEkstra = String(row[ekstraCol] || '').trim();
          let nilai = String(row[nilaiCol] || '').trim();
          
          if (!nama || nama === 'undefined') continue;

          if (jenisEkstra && nilai && jenisEkstra !== 'undefined' && nilai !== 'undefined') {
            dataEkstra.push({ nis, nisn, nama, jenis_ekstra: jenisEkstra, nilai });
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
