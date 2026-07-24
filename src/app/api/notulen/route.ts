import { NextResponse } from 'next/server';
import { getNotulenDoc } from '@/lib/google-sheets';

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
    const formData = await request.formData();
    const action = formData.get('action') as string;
    
    if (action === 'update_dokumentasi') {
      const idToUpdate = formData.get('id') as string;
      const filesToUpdate = formData.getAll('dokumentasi') as File[];
      
      if (!idToUpdate || filesToUpdate.length === 0) {
        return NextResponse.json({ success: false, error: 'Data tidak lengkap' }, { status: 400 });
      }

      const doc = await getNotulenDoc();
      let sheet = doc.sheetsByTitle['notulen'] || doc.sheetsByTitle['Notulen'];
      if (!sheet) sheet = doc.sheetsByIndex[0];
      
      const rows = await sheet.getRows();
      const targetRow = rows.find((r: any) => r.get('ID') === idToUpdate);
      
      if (!targetRow) {
        return NextResponse.json({ success: false, error: 'Data notulen tidak ditemukan' }, { status: 404 });
      }
      
      const folderId = process.env.GOOGLE_DRIVE_PERSURATAN_FOLDER_ID || '';
      const urls: string[] = [];
      
      for (const file of filesToUpdate) {
        if (file.size > 0) {
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const driveRes = await uploadFileToDrive(buffer, file.name, file.type, folderId);
          if (driveRes.webViewLink) {
            urls.push(driveRes.webViewLink);
          }
        }
      }
      
      if (urls.length > 0) {
        const existingUrl = targetRow.get('Dokumentasi') || '';
        if (existingUrl) {
          targetRow.set('Dokumentasi', existingUrl + ' || ' + urls.join(' || '));
        } else {
          targetRow.set('Dokumentasi', urls.join(' || '));
        }
        await targetRow.save();
      }
      
      return NextResponse.json({ success: true, message: 'Dokumentasi berhasil ditambahkan' });
    }
    
    const tanggal = formData.get('tanggal') as string;
    const waktu = formData.get('waktu') as string;
    const tempatRapat = formData.get('tempatRapat') as string;
    const agendaRapat = formData.get('agendaRapat') as string;
    const pimpinanRapat = formData.get('pimpinanRapat') as string;
    const dihadiriOleh = formData.get('dihadiriOleh') as string;
    const notulis = formData.get('notulis') as string;
    const hasilNotulen = formData.get('hasilNotulen') as string;
    
    const files = formData.getAll('dokumentasi') as File[];
    let dokumentasiUrl = formData.get('dokumentasiUrl') as string || '';

    // Jika ada file gambar diupload
    if (files && files.length > 0) {
      const folderId = process.env.GOOGLE_DRIVE_PERSURATAN_FOLDER_ID || '';
      const urls: string[] = [];
      
      for (const file of files) {
        if (file.size > 0) {
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const driveRes = await uploadFileToDrive(buffer, file.name, file.type, folderId);
          if (driveRes.webViewLink) {
            urls.push(driveRes.webViewLink);
          }
        }
      }
      
      if (urls.length > 0) {
        // Jika sebelumnya ada dokumentasiUrl manual, tambahkan juga
        if (dokumentasiUrl) {
          dokumentasiUrl = dokumentasiUrl + ' || ' + urls.join(' || ');
        } else {
          dokumentasiUrl = urls.join(' || ');
        }
      }
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
      'Notulis': notulis || 'Admin',
      'Hasil Notulen': hasilNotulen,
      'Dokumentasi': dokumentasiUrl
    });

    return NextResponse.json({ success: true, message: 'Notulen berhasil ditambahkan' });
  } catch (error: any) {
    console.error('API Notulen POST Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
