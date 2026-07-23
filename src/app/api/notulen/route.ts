import { NextResponse } from 'next/server';
import { getNotulenDoc } from '@/lib/google-sheets';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const doc = await getNotulenDoc();
    // Gunakan sheet pertama atau cari berdasarkan judul
    let sheet = doc.sheetsByTitle['notulen'] || doc.sheetsByTitle['Notulen'];
    
    if (!sheet) {
      // Fallback ke sheet pertama
      sheet = doc.sheetsByIndex[0];
      if (!sheet) {
        return NextResponse.json({ success: false, error: 'Sheet tidak ditemukan' }, { status: 404 });
      }
    }

    const rows = await sheet.getRows();
    const data = rows.map((row: any) => ({
      id: row.get('ID') || '',
      tanggal: row.get('Tanggal') || '',
      waktu: row.get('Waktu') || '',
      tempatRapat: row.get('Tempat Rapat') || '',
      agendaRapat: row.get('Agenda Rapat') || '',
      pimpinanRapat: row.get('Pimpinan Rapat') || '',
      dihadiriOleh: row.get('Dihadiri Oleh') || '',
      notulis: row.get('Notulis') || '',
      hasilNotulen: row.get('Hasil Notulen') || '',
      dokumentasi: row.get('Dokumentasi') || '',
    })).reverse(); // Balik urutan agar yang terbaru di atas

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('API Notulen GET Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

import { uploadFileToDrive } from '@/lib/google-drive';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const formData = await request.formData();
    
    const tanggal = formData.get('tanggal') as string;
    const waktu = formData.get('waktu') as string;
    const tempatRapat = formData.get('tempatRapat') as string;
    const agendaRapat = formData.get('agendaRapat') as string;
    const pimpinanRapat = formData.get('pimpinanRapat') as string;
    const dihadiriOleh = formData.get('dihadiriOleh') as string;
    const notulis = formData.get('notulis') as string;
    const hasilNotulen = formData.get('hasilNotulen') as string;
    
    const file = formData.get('dokumentasi') as File;
    let dokumentasiUrl = formData.get('dokumentasiUrl') as string || '';

    // Jika ada file gambar diupload
    if (file && file.size > 0) {
      const folderId = process.env.GOOGLE_DRIVE_PERSURATAN_FOLDER_ID || '';
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      const driveRes = await uploadFileToDrive(buffer, file.name, file.type, folderId);
      dokumentasiUrl = driveRes.webViewLink || '';
    }

    const doc = await getNotulenDoc();
    let sheet = doc.sheetsByTitle['notulen'] || doc.sheetsByTitle['Notulen'];
    if (!sheet) {
      sheet = doc.sheetsByIndex[0];
    }

    const id = Date.now().toString();

    // Pastikan header ada. Jika belum ada, set.
    try {
      await sheet.loadHeaderRow();
    } catch (e) {
      await sheet.setHeaderRow([
        'ID', 'Tanggal', 'Waktu', 'Tempat Rapat', 'Agenda Rapat', 
        'Pimpinan Rapat', 'Dihadiri Oleh', 'Notulis', 'Hasil Notulen', 'Dokumentasi'
      ]);
    }

    await sheet.addRow({
      'ID': id,
      'Tanggal': tanggal,
      'Waktu': waktu,
      'Tempat Rapat': tempatRapat,
      'Agenda Rapat': agendaRapat,
      'Pimpinan Rapat': pimpinanRapat,
      'Dihadiri Oleh': dihadiriOleh,
      'Notulis': notulis || session?.user?.name || 'Admin',
      'Hasil Notulen': hasilNotulen,
      'Dokumentasi': dokumentasiUrl
    });

    return NextResponse.json({ success: true, message: 'Notulen berhasil ditambahkan' });
  } catch (error: any) {
    console.error('API Notulen POST Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
