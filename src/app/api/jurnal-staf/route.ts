import { NextResponse } from 'next/server';
import { getJurnalStafDoc } from '@/lib/google-sheets';

export async function GET() {
  try {
    const doc = await getJurnalStafDoc();
    const sheet = doc.sheetsByTitle['Form Responses 1'];
    
    if (!sheet) {
      return NextResponse.json({ success: false, error: 'Tab Form Responses 1 tidak ditemukan' }, { status: 404 });
    }

    const rows = await sheet.getRows();
    
    // Parse the date to sort descending, or just reverse the array
    const data = rows.map((row) => ({
      rowNumber: row.rowNumber,
      timestamp: row.get('Timestamp') || '',
      namaStaf: row.get('NAMA STAF') || '',
      kegiatan: row.get('KEGIATAN') || '',
      tanggal: row.get('TANGGAL') || '',
      mulaiDari: row.get('MULAI DARI') || '',
      sampaiDengan: row.get('SAMPAI DENGAN') || '',
      keterangan: row.get('KETERANGAN') || '',
      fotoKegiatan: row.get('FOTO KEGIATAN') || '',
    })).reverse(); // terbaru di atas

    return NextResponse.json({ success: true, data }, {
      headers: { 'Cache-Control': 'no-store, no-cache' }
    });
  } catch (error: any) {
    console.error('Fetch Jurnal Staf Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal mengambil data dari Database' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      namaStaf,
      kegiatan,
      tanggal,
      mulaiDari,
      sampaiDengan,
      keterangan,
      fotoKegiatan
    } = body;

    const doc = await getJurnalStafDoc();
    const sheet = doc.sheetsByTitle['Form Responses 1'];
    
    if (!sheet) {
      return NextResponse.json({ success: false, error: 'Tab Form Responses 1 tidak ditemukan' }, { status: 404 });
    }

    const now = new Date();
    // Format timestamp DD/MM/YYYY HH:MM:SS
    const pad = (n: number) => n.toString().padStart(2, '0');
    const timestamp = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    await sheet.addRow({
      'Timestamp': timestamp,
      'NAMA STAF': namaStaf,
      'KEGIATAN': kegiatan,
      'TANGGAL': tanggal,
      'MULAI DARI': mulaiDari,
      'SAMPAI DENGAN': sampaiDengan,
      'KETERANGAN': keterangan,
      'FOTO KEGIATAN': fotoKegiatan || ''
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Submit Jurnal Staf Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal menyimpan data ke Database' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      rowNumber,
      timestamp,
      namaStaf,
      kegiatan,
      tanggal,
      mulaiDari,
      sampaiDengan,
      keterangan,
      fotoKegiatan
    } = body;

    if (!rowNumber && !timestamp) {
      return NextResponse.json({ success: false, error: 'Row number atau timestamp wajib disertakan' }, { status: 400 });
    }

    const doc = await getJurnalStafDoc();
    const sheet = doc.sheetsByTitle['Form Responses 1'];
    
    if (!sheet) {
      return NextResponse.json({ success: false, error: 'Tab Form Responses 1 tidak ditemukan' }, { status: 404 });
    }

    const rows = await sheet.getRows();
    let targetRow = null;

    if (rowNumber) {
      targetRow = rows.find(r => r.rowNumber === Number(rowNumber));
    }
    if (!targetRow && timestamp) {
      targetRow = rows.find(r => r.get('Timestamp') === timestamp);
    }

    if (!targetRow) {
      return NextResponse.json({ success: false, error: 'Baris data jurnal tidak ditemukan' }, { status: 404 });
    }

    if (namaStaf !== undefined) targetRow.set('NAMA STAF', namaStaf);
    if (kegiatan !== undefined) targetRow.set('KEGIATAN', kegiatan);
    if (tanggal !== undefined) targetRow.set('TANGGAL', tanggal);
    if (mulaiDari !== undefined) targetRow.set('MULAI DARI', mulaiDari);
    if (sampaiDengan !== undefined) targetRow.set('SAMPAI DENGAN', sampaiDengan);
    if (keterangan !== undefined) targetRow.set('KETERANGAN', keterangan);
    if (fotoKegiatan !== undefined) targetRow.set('FOTO KEGIATAN', fotoKegiatan);

    await targetRow.save();

    return NextResponse.json({ success: true, message: 'Jurnal kegiatan berhasil diperbarui' });
  } catch (error: any) {
    console.error('Update Jurnal Staf Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal memperbarui data: ' + error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    let rowNumber: any = null;
    let timestamp: any = null;

    const { searchParams } = new URL(request.url);
    rowNumber = searchParams.get('rowNumber');
    timestamp = searchParams.get('timestamp');

    if (!rowNumber && !timestamp) {
      try {
        const body = await request.json();
        rowNumber = body.rowNumber;
        timestamp = body.timestamp;
      } catch {}
    }

    if (!rowNumber && !timestamp) {
      return NextResponse.json({ success: false, error: 'Row number atau timestamp wajib disertakan' }, { status: 400 });
    }

    const doc = await getJurnalStafDoc();
    const sheet = doc.sheetsByTitle['Form Responses 1'];
    
    if (!sheet) {
      return NextResponse.json({ success: false, error: 'Tab Form Responses 1 tidak ditemukan' }, { status: 404 });
    }

    const rows = await sheet.getRows();
    let targetRow = null;

    if (rowNumber) {
      targetRow = rows.find(r => r.rowNumber === Number(rowNumber));
    }
    if (!targetRow && timestamp) {
      targetRow = rows.find(r => r.get('Timestamp') === timestamp);
    }

    if (!targetRow) {
      return NextResponse.json({ success: false, error: 'Baris data jurnal tidak ditemukan' }, { status: 404 });
    }

    await targetRow.delete();

    return NextResponse.json({ success: true, message: 'Jurnal kegiatan berhasil dihapus' });
  } catch (error: any) {
    console.error('Delete Jurnal Staf Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal menghapus data: ' + error.message }, { status: 500 });
  }
}
