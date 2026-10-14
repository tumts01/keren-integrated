import { NextResponse } from 'next/server';
import { getAllCachedDataInduk } from '@/lib/data-induk';
import * as xlsx from 'xlsx';
import { DKN_MAPELS, formatNomorInduk } from '@/lib/dkn';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const reqTa = searchParams.get('ta') || '';
    const reqKelas = searchParams.get('kelas') || 'all';

    const allStudents = await getAllCachedDataInduk();

    const k9Students = allStudents.filter((s: any) => {
      const meta = s.metadata || {};
      const r9 = (meta['ROMBEL KELAS 9'] || '').trim();
      const currRombel = (meta['ROMBEL'] || '').trim();
      return r9.startsWith('9') || r9.startsWith('IX') || currRombel.startsWith('9') || currRombel.startsWith('IX');
    });

    let filtered = k9Students.filter((s: any) => {
      const meta = s.metadata || {};
      const studentTa = (meta['TA KELAS 9'] || meta['TAHUN AJARAN'] || '').trim();
      const studentRombel = (meta['ROMBEL KELAS 9'] || meta['ROMBEL'] || '').trim().toUpperCase();

      const matchTa = !reqTa || reqTa === 'all' || studentTa === reqTa;
      const matchKelas = !reqKelas || reqKelas === 'all' || studentRombel === reqKelas.toUpperCase();

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

    // Build Rows
    const headerRow = [
      'NO',
      'NISN',
      'NOMOR INDUK',
      'NAMA PESERTA',
      'ROMBEL',
      'NOMOR PESERTA',
      ...DKN_MAPELS.map(m => `NUM - ${m.name}`)
    ];

    const dataRows: any[][] = [headerRow];

    filtered.forEach((s: any, idx: number) => {
      const meta = s.metadata || {};
      const id_siswa = String(meta['ID SISWA'] || s.id_siswa || '').trim();
      const nisn = String(meta['NISN'] || '').trim();
      const nism = String(meta['NISM'] || '').trim();
      const nama = String(meta['NAMA'] || s.nama || '').trim();
      const rombel = String(meta['ROMBEL KELAS 9'] || meta['ROMBEL'] || '').trim().toUpperCase();
      const nomor_induk = formatNomorInduk(id_siswa, nism);
      const nomor_peserta = String(meta['NOMOR_PESERTA'] || meta['NOMOR PESERTA'] || '').trim();

      const mapelNums = DKN_MAPELS.map(m => {
        const val = meta['NUM']?.[m.name] ?? meta['NILAI_NUM']?.[m.name] ?? '';
        return val !== null && val !== undefined ? val : '';
      });

      dataRows.push([
        idx + 1,
        nisn,
        nomor_induk,
        nama,
        rombel,
        nomor_peserta,
        ...mapelNums
      ]);
    });

    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.aoa_to_sheet(dataRows);

    // Set column widths
    const colWidths = [
      { wch: 6 },  // NO
      { wch: 14 }, // NISN
      { wch: 22 }, // NOMOR INDUK
      { wch: 32 }, // NAMA PESERTA
      { wch: 10 }, // ROMBEL
      { wch: 25 }, // NOMOR PESERTA
      ...DKN_MAPELS.map(() => ({ wch: 14 })) // 16 MAPEL NUM
    ];
    ws['!cols'] = colWidths;

    xlsx.utils.book_append_sheet(wb, ws, 'Template NOPES & NUM');

    const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const cleanKelasName = reqKelas === 'all' ? 'Semua_Kelas' : reqKelas;

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Template_NOPES_NUM_${cleanKelasName}.xlsx"`
      }
    });

  } catch (error: any) {
    console.error('Error generating template:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
