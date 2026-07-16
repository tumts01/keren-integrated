import { NextResponse } from 'next/server';
import { getIndukDoc } from '@/lib/google-sheets';

export async function GET() {
  try {
    const doc = await getIndukDoc();
    const sheetSiswa = doc.sheetsByTitle['DATABASE'];
    const sheetKelas = doc.sheetsByTitle['db_Kelas'];
    
    if (!sheetSiswa || !sheetKelas) {
      return NextResponse.json({ success: false, error: 'Tab DATABASE atau db_Kelas tidak ditemukan' }, { status: 404 });
    }

    const rowsSiswa = await sheetSiswa.getRows();
    const rowsKelas = await sheetKelas.getRows();

    // Map Wali Kelas
    const waliMap: Record<string, string> = {};
    rowsKelas.forEach(r => {
      const rombel = r.get('ROMBEL');
      if (rombel) {
        waliMap[rombel.trim().toUpperCase()] = r.get('WALI KELAS') || '';
      }
    });

    // Grouping and aggregating Siswa data
    const rombelStats: Record<string, {
      rombel: string,
      tingkat: string,
      tahunAjaran: string,
      lakiAktif: number,
      perempuanAktif: number,
      totalAktif: number
    }> = {};

    rowsSiswa.forEach(r => {
      const rombel = (r.get('ROMBEL') || '').trim().toUpperCase();
      const tahunAjaran = (r.get('TAHUN AJARAN') || '').trim();
      const status = (r.get('STATUS SISWA') || '').toLowerCase().trim();
      const jk = (r.get('JENIS KELAMIN') || '').toLowerCase();
      
      if (!rombel || !tahunAjaran) return;
      
      const key = `${tahunAjaran}__${rombel}`;
      
      // Init rombel if not exists
      if (!rombelStats[key]) {
        let tingkat = 'Lainnya';
        if (rombel.startsWith('7')) tingkat = '7';
        else if (rombel.startsWith('8')) tingkat = '8';
        else if (rombel.startsWith('9')) tingkat = '9';

        rombelStats[key] = {
          rombel,
          tingkat,
          tahunAjaran,
          lakiAktif: 0,
          perempuanAktif: 0,
          totalAktif: 0
        };
      }

      // Check active
      const isAktif = ['aktif', 'lulus'].includes(status);
      if (isAktif) {
        rombelStats[key].totalAktif++;
        if (jk.includes('laki')) rombelStats[key].lakiAktif++;
        if (jk.includes('perempuan')) rombelStats[key].perempuanAktif++;
      }
    });

    // Format to array and attach Wali Kelas
    const data = Object.values(rombelStats)
      .filter(r => r.totalAktif > 0) // Only show classes with active students, or show all? We will show all that have students
      .map(r => ({
        ...r,
        waliKelas: waliMap[r.rombel] || ''
      }));

    // Sort alphabetically by rombel
    data.sort((a, b) => a.rombel.localeCompare(b.rombel));

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Fetch Kelas Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal mengambil data dari Database' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { rombel, waliKelas } = body;

    if (!rombel) {
      return NextResponse.json({ success: false, error: 'Rombel wajib diisi' }, { status: 400 });
    }

    const doc = await getIndukDoc();
    const sheetKelas = doc.sheetsByTitle['db_Kelas'];
    
    if (!sheetKelas) {
      return NextResponse.json({ success: false, error: 'Tab db_Kelas tidak ditemukan' }, { status: 404 });
    }

    // Load header row if necessary, or just load rows
    const rowsKelas = await sheetKelas.getRows();
    
    // Cari apakah rombel sudah ada
    let foundRow = null;
    for (const r of rowsKelas) {
      if ((r.get('ROMBEL') || '').trim().toUpperCase() === rombel.trim().toUpperCase()) {
        foundRow = r;
        break;
      }
    }

    if (foundRow) {
      // Update
      foundRow.set('WALI KELAS', waliKelas);
      await foundRow.save();
    } else {
      // Create new
      await sheetKelas.addRow({
        'ROMBEL': rombel.trim().toUpperCase(),
        'WALI KELAS': waliKelas
      });
    }

    return NextResponse.json({ success: true, message: 'Wali Kelas berhasil disimpan' });
  } catch (error: any) {
    console.error('Update Wali Kelas Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal menyimpan data Wali Kelas' }, { status: 500 });
  }
}
