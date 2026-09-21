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

        const getThumbUrl = (url: string) => {
          if (!url) return '';
          if (url.includes('drive.google.com')) {
            const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
            if (match && match[1]) {
              return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w400-h400`;
            }
          }
          return url;
        };

        foundStudent = {
          nisn: row.metadata?.['NISN'] || '',
          nis: row.metadata?.['ID SISWA'] || row.id_siswa || '',
          nama: row.metadata?.['NAMA'] || row.nama || '',
          kelas: rombel,
          status: (row.metadata?.['STATUS SISWA'] || '').toUpperCase().trim(),
          asalSekolah: row.metadata?.['ASAL SEKOLAH'] || '',
          namaAyah: row.metadata?.['NAMA AYAH KANDUNG'] || '',
          namaIbu: row.metadata?.['NAMA IBU KANDUNG'] || '',
          foto: getThumbUrl(row.metadata?.['FOTO SISWA'] || row.metadata?.['FOTO'] || row.metadata?.['PAS FOTO'] || ''),
          jenisKelamin: row.metadata?.['JENIS KELAMIN'] || '',
          noHp: row.metadata?.['NOMOR WHATSAPP'] || row.metadata?.['NO WA'] || row.metadata?.['NO. WA'] || row.metadata?.['NO. HP'] || '',
          domisili: row.metadata?.['DOMISILI'] || '',
          alamat: row.metadata?.['ALAMAT'] || '',
          tahunAjaran: row.metadata?.['TAHUN AJARAN'] || '2023/2024',
        };
        break;
      }
    }

    if (!foundStudent) {
      return NextResponse.json({ success: false, error: 'NISN tidak ditemukan di database' }, { status: 404 });
    }

    if (foundStudent.status !== 'AKTIF') {
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
