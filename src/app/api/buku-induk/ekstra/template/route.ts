import { NextResponse } from 'next/server';
import * as xlsx from 'xlsx';
import path from 'path';
import fs from 'fs';
import { getAllCachedDataInduk } from '@/lib/data-induk';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const kelas = url.searchParams.get('kelas');
    const semester = url.searchParams.get('semester');
    const ta = url.searchParams.get('ta');

    if (!kelas || !semester || !ta) {
      return NextResponse.json({ success: false, error: 'Parameter kelas, semester, dan ta wajib diisi' }, { status: 400 });
    }

    // 1. Fetch Students
    const allStudents = await getAllCachedDataInduk();
    const students = allStudents.filter((s: any) => {
      const meta = s.metadata || {};
      const history = [
        { ta: meta['TA KELAS 7'], r: meta['ROMBEL KELAS 7'] },
        { ta: meta['TA KELAS 8'], r: meta['ROMBEL KELAS 8'] },
        { ta: meta['TA KELAS 9'], r: meta['ROMBEL KELAS 9'] }
      ];
      const isCurrent = s.rombel && s.rombel.toUpperCase() === kelas.toUpperCase();
      const isHistory = history.some(h => h.ta === ta && h.r && h.r.toUpperCase() === kelas.toUpperCase());
      return isCurrent || isHistory;
    }).sort((a: any, b: any) => {
      const namaA = (a.nama || a.metadata?.['NAMA LENGKAP'] || '').toUpperCase();
      const namaB = (b.nama || b.metadata?.['NAMA LENGKAP'] || '').toUpperCase();
      return namaA.localeCompare(namaB);
    });

    if (students.length === 0) {
      return NextResponse.json({ success: false, error: `Tidak ada siswa aktif ditemukan di kelas ${kelas}` }, { status: 404 });
    }

    // 2. Read Template
    const templatePath = path.join(process.cwd(), 'public', 'LEGGER NILAI EKSTRAKURIKULER.xlsx');
    if (!fs.existsSync(templatePath)) {
      return NextResponse.json({ success: false, error: 'Template LEGGER NILAI EKSTRAKURIKULER.xlsx tidak ditemukan di folder public' }, { status: 500 });
    }

    const templateBuf = fs.readFileSync(templatePath);
    const wb = xlsx.read(templateBuf, { type: 'buffer' });
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];

    // Decode range to know how to extend it
    const range = xlsx.utils.decode_range(sheet['!ref'] || 'A1:G10');

    // 3. Set Metadata
    xlsx.utils.sheet_add_aoa(sheet, [
      [ 'Kelas:', kelas, null, 'Semester:', semester ],
      [ 'Madrasah:', 'MADRASAH TSANAWIYAH ALMAARIF 01 SINGOSARI', null, 'Tahun Ajaran:', ta ]
    ], { origin: 'A2' }); // A2 is row index 1

    // 4. Fill Students Data starting at row index 6 (A7)
    const rowData = students.map((s: any, idx: number) => {
      const meta = s.metadata || {};
      return [
        idx + 1,
        meta['NIS'] || '',
        meta['NISN'] || '',
        s.nama || meta['NAMA LENGKAP'] || '',
        meta['JENIS KELAMIN'] || '',
        '', // JENIS EKSTRA (To be filled by user)
        ''  // NILAI (To be filled by user)
      ];
    });

    xlsx.utils.sheet_add_aoa(sheet, rowData, { origin: 'A7' });

    // Update range if needed
    const newEndRow = 6 + rowData.length;
    if (newEndRow > range.e.r) {
      range.e.r = newEndRow;
      sheet['!ref'] = xlsx.utils.encode_range(range);
    }

    // 5. Write to Buffer and send
    const outBuf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(outBuf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="LEGGER_EKSTRA_${kelas}_${semester.toUpperCase()}.xlsx"`
      }
    });

  } catch (err: any) {
    console.error('Error generating ekstra template:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
