import { NextResponse } from 'next/server';
import { getAllCachedDataInduk } from '@/lib/data-induk';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { nisn } = await req.json();

    if (!nisn) {
      return NextResponse.json({ success: false, error: 'NISN tidak boleh kosong' }, { status: 400 });
    }

    const cleanInputNisn = String(nisn).trim().replace(/^0+/, '');

    // 1. Fetch Students
    let rawSiswa = await getAllCachedDataInduk();
    
    let foundStudent = null;

    for (const row of rawSiswa) {
      const rowNisn = String(row.metadata?.['NISN'] || '').trim().replace(/^0+/, '');
      
      if (rowNisn === cleanInputNisn) {
        // Find class
        let rombel = (row.metadata?.['ROMBEL KELAS 9'] || '').trim();
        if (!rombel) rombel = (row.metadata?.['ROMBEL KELAS 8'] || '').trim();
        if (!rombel) rombel = (row.metadata?.['ROMBEL KELAS 7'] || '').trim();
        if (!rombel) rombel = (row.metadata?.['ROMBEL'] || '').trim();

        foundStudent = {
          nisn: row.metadata?.['NISN'] || '',
          nis: row.metadata?.['ID SISWA'] || row.id_siswa || '',
          nama: row.metadata?.['NAMA'] || row.nama || '',
          kelas: rombel,
          status: (row.metadata?.['STATUS SISWA'] || '').toLowerCase().trim(),
          asalSekolah: row.metadata?.['ASAL SEKOLAH'] || '',
          namaAyah: row.metadata?.['NAMA AYAH KANDUNG'] || '',
          namaIbu: row.metadata?.['NAMA IBU KANDUNG'] || '',
        };
        break;
      }
    }

    if (!foundStudent) {
      return NextResponse.json({ success: false, error: 'NISN tidak ditemukan di database' }, { status: 404 });
    }

    if (foundStudent.status !== 'aktif') {
      return NextResponse.json({ success: false, error: 'Status siswa sudah tidak aktif' }, { status: 403 });
    }

    return NextResponse.json({ 
      success: true, 
      data: foundStudent,
      message: 'Berhasil login'
    });

  } catch (error: any) {
    console.error('Portal Auth Error:', error);
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan sistem' }, { status: 500 });
  }
}
